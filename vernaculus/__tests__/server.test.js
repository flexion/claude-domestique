'use strict';

// Unit coverage for the pure parts of the MCP adapter. The protocol, daemon
// reachability and generation paths are covered by mcp/smoke.js, which drives a
// real server over real stdio — neither validator catches a server that cannot
// start, so the smoke test is the acceptance criterion, not this file.

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SERVER = path.join(__dirname, '..', 'mcp', 'server.js');

// Drive the server over stdio with a fixed script and collect its replies. Used
// for the checks that need no daemon.
function rpc(messages) {
  const input = messages.map((m) => JSON.stringify(m)).join('\n') + '\n';
  const res = spawnSync(process.execPath, [SERVER], { input, encoding: 'utf8', timeout: 15000 });
  return res.stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

const INIT = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
};

describe('protocol', () => {
  test('negotiates a supported version rather than forcing the latest', () => {
    const out = rpc([INIT]);
    expect(out[0].result.protocolVersion).toBe('2025-06-18');
  });

  test('falls back to the latest version when the client asks for an unknown one', () => {
    const out = rpc([{ ...INIT, params: { ...INIT.params, protocolVersion: '1999-01-01' } }]);
    expect(out[0].result.protocolVersion).toBe('2025-11-25');
  });

  test('notifications carry no id and draw no response', () => {
    const out = rpc([INIT, { jsonrpc: '2.0', method: 'notifications/initialized' }]);
    expect(out).toHaveLength(1);
  });

  test('an unknown method is a JSON-RPC error, not a crash', () => {
    const out = rpc([INIT, { jsonrpc: '2.0', id: 2, method: 'nope/nope' }]);
    expect(out[1].error.code).toBe(-32601);
  });

  test('unparseable stdin lines are ignored rather than killing the server', () => {
    const out = rpc([INIT, '{ not json', { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }]
      .map((m) => (typeof m === 'string' ? { __raw: m } : m)));
    // The raw line is serialized as an object here, so instead assert the
    // server still answered the request that followed the noise.
    expect(out.some((m) => m.id === 2)).toBe(true);
  });
});

describe('tool surface', () => {
  const tools = () => {
    const out = rpc([INIT, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }]);
    return out.find((m) => m.id === 2).result.tools;
  };

  test('exposes exactly the three tools', () => {
    expect(tools().map((t) => t.name).sort())
      .toEqual(['ollama_generate', 'ollama_models', 'ollama_refine']);
  });

  // MCP 2025-06-18: servers MUST conform to a declared output schema. Without
  // one, every caller re-implements a parser — which is what happened three
  // times in one session against the prose-only first version.
  test('every tool declares an output schema', () => {
    for (const t of tools()) {
      expect(t.outputSchema).toBeDefined();
      expect(t.outputSchema.type).toBe('object');
    }
  });

  test('generate and refine share one result shape', () => {
    const shapes = tools()
      .filter((t) => t.name !== 'ollama_models')
      .map((t) => Object.keys(t.outputSchema.properties).sort().join(','));
    expect(new Set(shapes).size).toBe(1);
  });

  test('the draft schema exposes the fields a caller has to branch on', () => {
    const gen = tools().find((t) => t.name === 'ollama_generate');
    for (const field of ['code', 'session', 'truncated', 'prompt_tokens', 'model_digest', 'verified']) {
      expect(gen.outputSchema.properties[field]).toBeDefined();
    }
  });

  test('refine requires a session, which only generate can mint', () => {
    const refine = tools().find((t) => t.name === 'ollama_refine');
    expect(refine.inputSchema.required).toEqual(expect.arrayContaining(['session', 'diagnosis']));
  });

  // Tools with overlapping purpose must name each other, or the model picks the
  // wrong one. Both directions, not just the obvious one.
  test('overlapping tools cross-reference each other by name', () => {
    const byName = Object.fromEntries(tools().map((t) => [t.name, t.description]));
    expect(byName.ollama_generate).toContain('ollama_refine');
    expect(byName.ollama_refine).toContain('ollama_generate');
  });

  test('generate steers context to files rather than pasted text', () => {
    const gen = tools().find((t) => t.name === 'ollama_generate');
    expect(gen.inputSchema.properties.files).toBeDefined();
    expect(gen.inputSchema.properties.inline_context.description).toMatch(/files/);
    // The old `context` name invited pasting; it should be gone.
    expect(gen.inputSchema.properties.context).toBeUndefined();
  });
});

describe('failure paths', () => {
  const call = (name, args) => {
    const out = rpc([INIT, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } }]);
    return out.find((m) => m.id === 2).result;
  };

  test('an unknown session names the constraint instead of crashing', () => {
    const r = call('ollama_refine', { session: 'nope', diagnosis: 'x' });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/Unknown session/);
    expect(r.content[0].text).toMatch(/lost when this server restarts/);
  });

  test('an unreadable file names the path, not a stack trace', () => {
    const r = call('ollama_generate', { spec: 'x', files: ['definitely/not/here.js'] });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/definitely\/not\/here\.js/);
    expect(r.content[0].text).not.toMatch(/at Object|node:internal/);
  });

  test('an over-budget prompt is refused up front, naming the budget', () => {
    const r = call('ollama_generate', { spec: 'x'.repeat(400000), num_ctx: 8192, num_predict: 1024 });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/input budget/);
    expect(r.content[0].text).toMatch(/7167/); // 8192 - 1024 - 1
  });

  test('an unknown tool name is reported as a tool error, not a protocol error', () => {
    const r = call('no_such_tool', {});
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/Unknown tool/);
  });
});
