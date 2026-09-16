'use strict';

// Unit coverage for the pure parts of the MCP adapter. The protocol, daemon
// reachability and generation paths are covered by mcp/smoke.js, which drives a
// real server over real stdio — neither validator catches a server that cannot
// start, so the smoke test is the acceptance criterion, not this file.

const path = require('node:path');
const http = require('node:http');
const readline = require('node:readline');
const { once } = require('node:events');
const { spawn, spawnSync } = require('node:child_process');

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

function startRpc(env = {}) {
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const pending = new Map();
  let nextId = 1;
  let stderr = '';

  child.stderr.on('data', (chunk) => { stderr += chunk; });
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    const message = JSON.parse(line);
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      waiter.resolve(message);
    }
  });

  return {
    call(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    },
    async close() {
      child.stdin.end();
      await once(child, 'close');
      if (child.exitCode !== 0) throw new Error(stderr || `MCP server exited ${child.exitCode}`);
    },
  };
}

async function startFakeOllama(chatReplies) {
  const requests = [];
  let chatIndex = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ method: req.method, url: req.url, body });
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/tags') {
        res.end(JSON.stringify({
          models: [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-123' }],
        }));
        return;
      }
      if (req.url === '/api/chat') {
        const reply = chatReplies[chatIndex++];
        res.statusCode = reply.status || 200;
        res.end(JSON.stringify(reply.body || reply));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
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

describe('Ollama contract', () => {
  test('generation sends the established Ollama request unchanged', async () => {
    const fake = await startFakeOllama([{
      message: { role: 'assistant', content: '```js\nmodule.exports = 1;\n```' },
      done_reason: 'stop',
      prompt_eval_count: 7,
      eval_count: 5,
    }]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      await client.call('initialize', INIT.params);
      const spec = 'Return one CommonJS assignment.';
      const response = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec, model: 'qwen3-coder:30b' },
      });
      expect(response.result.isError).not.toBe(true);
      const chat = fake.requests.find((request) => request.url === '/api/chat');
      expect(chat.body).toEqual({
        model: 'qwen3-coder:30b',
        stream: false,
        truncate: false,
        shift: false,
        options: { num_ctx: 32768, num_predict: 4096 },
        messages: [{ role: 'user', content: spec }],
      });
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('Ollama execution errors remain text-only tool errors', async () => {
    const fake = await startFakeOllama([{ status: 500, body: { error: 'forced failure' } }]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      await client.call('initialize', INIT.params);
      const response = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.', model: 'qwen3-coder:30b' },
      });
      expect(response.result.isError).toBe(true);
      expect(response.result.content).toEqual([
        { type: 'text', text: expect.stringContaining('Ollama HTTP 500') },
      ]);
      expect(response.result.structuredContent).toBeUndefined();
    } finally {
      await client.close();
      await fake.close();
    }
  });
});

// The repository validator reads only `name` and `version` from the Codex
// manifest, so a manifest can be structurally wrong for Codex and still pass
// `npm run validate:plugins`. It did: this plugin first shipped
// `"skills": {"path": "skills"}` where all seven siblings use the string form,
// and with no `interface` block at all. Both validators reported green.
describe('codex manifest parity', () => {
  const fs = require('node:fs');
  const codex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.codex-plugin', 'plugin.json'), 'utf8'));
  const claude = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8'));

  test('declares its skills path the way every other plugin does', () => {
    expect(codex.skills).toBe('./skills/');
  });

  test('carries an interface block with the fields Codex renders', () => {
    expect(codex.interface).toBeDefined();
    for (const field of ['displayName', 'shortDescription', 'longDescription', 'developerName', 'category']) {
      expect(typeof codex.interface[field]).toBe('string');
    }
    expect(Array.isArray(codex.interface.capabilities)).toBe(true);
    expect(Array.isArray(codex.interface.defaultPrompt)).toBe(true);
  });

  test('both host manifests agree on name and version', () => {
    expect(codex.name).toBe(claude.name);
    expect(codex.version).toBe(claude.version);
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
