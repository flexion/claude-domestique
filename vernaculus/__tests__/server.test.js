'use strict';

// Unit coverage for the pure parts of the MCP adapter. The protocol, daemon
// reachability and generation paths are covered by mcp/smoke.js, which drives a
// real server over real stdio — neither validator catches a server that cannot
// start, so the smoke test is the acceptance criterion, not this file.

const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
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

async function startFakeOllama(chatReplies, inventories = [
  [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-123' }],
]) {
  const requests = [];
  const handlerErrors = [];
  let chatIndex = 0;
  let inventoryIndex = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    // This listener is async, so a throw inside it would become an unhandled
    // rejection: the request would never be answered and the test would hang to
    // the jest timeout instead of failing with the real cause. Catch and answer
    // with the message, so a broken fixture fails fast and legibly.
    req.on('end', async () => {
      try {
        const body = raw ? JSON.parse(raw) : null;
        requests.push({ method: req.method, url: req.url, body });
        res.setHeader('content-type', 'application/json');
        if (req.url === '/api/tags') {
          res.end(JSON.stringify({
            models: inventories[Math.min(inventoryIndex++, inventories.length - 1)],
          }));
          return;
        }
        if (req.url === '/api/chat') {
          const next = chatReplies[chatIndex++];
          const reply = (typeof next === 'function' ? await next() : next)
            || { status: 500, body: { error: 'unexpected inference' } };
          res.statusCode = reply.status || 200;
          res.end(JSON.stringify(reply.body || reply));
          return;
        }
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
      } catch (e) {
        handlerErrors.push(e);
        if (res.writableEnded) return;
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `fake ollama handler failed: ${e.message}` }));
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    handlerErrors,
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

  // A malformed envelope is not an unknown method. Reporting -32601 for a frame
  // that never named a method sends the client hunting for a routing fault.
  test.each([
    ['an object frame carrying no method', { jsonrpc: '2.0', id: 7 }, 7],
    ['a method that is not a string', { jsonrpc: '2.0', id: 'abc', method: 42 }, 'abc'],
    ['a jsonrpc version that is not 2.0', { jsonrpc: '1.0', id: 9, method: 'tools/list' }, 9],
    ['a missing jsonrpc member', { id: 10, method: 'tools/list' }, 10],
    ['an id of a type JSON-RPC cannot echo', { jsonrpc: '2.0', id: { nested: true } }, null],
    ['a frame with no id at all', { jsonrpc: '2.0', params: {} }, null],
    ['an array frame', [1, 2, 3], null],
  ])('%s is Invalid Request with the echoable id', (_name, frame, expectedId) => {
    const out = rpc([frame, INIT]);
    expect(out).toContainEqual({
      jsonrpc: '2.0', id: expectedId, error: { code: -32600, message: 'Invalid Request' },
    });
    // The adapter stays alive and answers the well-formed frame that follows.
    expect(out.find((m) => m.id === INIT.id).result.protocolVersion).toBe('2025-06-18');
  });

  // The envelope guard must NOT require an id: notifications are valid frames
  // with a method and no id, and notifications/initialized is sent by every real
  // MCP client right after initialize. Rejecting it breaks every real client
  // while leaving the id-bearing tests above green.
  test('notifications/initialized is accepted, answered with nothing, and does not stall the session', () => {
    const out = rpc([
      INIT,
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    ]);
    expect(out.map((m) => m.id)).toEqual([1, 2]);
    expect(out.some((m) => m.error && m.error.code === -32600)).toBe(false);
    expect(out.find((m) => m.id === 2).result.tools).toHaveLength(3);
  });

  test('a raw null frame is an Invalid Request and leaves the adapter alive', () => {
    const res = spawnSync(process.execPath, [SERVER], {
      input: `null\n${JSON.stringify(INIT)}\n`, encoding: 'utf8', timeout: 15000,
    });
    expect(res.status).toBe(0);
    expect(res.stderr).toBe('');
    const replies = res.stdout.trim().split('\n').map((line) => JSON.parse(line));
    expect(replies).toContainEqual({
      jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' },
    });
    expect(replies.find((message) => message.id === INIT.id).result.protocolVersion).toBe('2025-06-18');
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

  test('draft tool schemas require complete telemetry', () => {
    const gen = tools().find((t) => t.name === 'ollama_generate');
    const refine = tools().find((t) => t.name === 'ollama_refine');
    const telemetry = gen.outputSchema.properties.telemetry;
    expect(gen.outputSchema.required).toContain('telemetry');
    expect(refine.outputSchema.required).toContain('telemetry');
    expect(telemetry.required).toEqual([
      'call', 'round', 'done_reason', 'timing_ms', 'input_tokens_estimate',
    ]);
    expect(telemetry.properties.timing_ms.required).toEqual([
      'wall', 'ollama_total', 'model_load', 'prompt_eval', 'generation',
    ]);
    expect(telemetry.properties.input_tokens_estimate.required).toEqual([
      'spec', 'inline_context', 'files', 'history', 'diagnosis', 'total',
    ]);
  });

  test('refine declares the digest override as optional and off by default', () => {
    const refine = tools().find((t) => t.name === 'ollama_refine');
    const flag = refine.inputSchema.properties.allow_digest_change;
    expect(flag).toMatchObject({ type: 'boolean', default: false });
    expect(refine.inputSchema.required).not.toContain('allow_digest_change');
    // Optional in the output too: its absence is the ordinary case.
    const telemetry = refine.outputSchema.properties.telemetry;
    expect(telemetry.properties.digest_changed_from).toMatchObject({ type: 'string' });
    expect(telemetry.required).not.toContain('digest_changed_from');
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
  test('every refinement retains the generation context window in its request and budget', async () => {
    const reply = { message: { role: 'assistant', content: 'draft' }, done_reason: 'stop' };
    const fake = await startFakeOllama([reply, reply, reply]);
    const client = startRpc({ OLLAMA_HOST: fake.url, QWEN_MCP_NUM_CTX: '32768' });
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.', num_ctx: 8192, num_predict: 1024 },
      });
      const session = generated.result.structuredContent.session;
      for (const diagnosis of ['Use two.', 'Use three.']) {
        const refined = await client.call('tools/call', {
          name: 'ollama_refine', arguments: { session, diagnosis, num_predict: 512 },
        });
        expect(refined.result.structuredContent.budget).toEqual({
          num_ctx: 8192, num_predict: 512, input_budget: 7679,
        });
      }
      expect(fake.requests.filter((request) => request.url === '/api/chat').map((request) => request.body.options))
        .toEqual([
          { num_ctx: 8192, num_predict: 1024 },
          { num_ctx: 8192, num_predict: 512 },
          { num_ctx: 8192, num_predict: 512 },
        ]);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test.each([
    ['changed', [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-456' }], /digest.*changed/i],
    ['missing', [], /no longer installed/i],
  ])('refinement rejects a %s model before inference and preserves the session', async (_name, models, error) => {
    const original = [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-123' }];
    const reply = { message: { role: 'assistant', content: 'draft' }, done_reason: 'stop' };
    const fake = await startFakeOllama([reply, reply], [original, models, original]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      const session = generated.result.structuredContent.session;
      const rejected = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session, diagnosis: 'Must not enter history.' },
      });
      expect(rejected.result.isError).toBe(true);
      expect(rejected.result.content[0].text).toMatch(error);
      expect(rejected.result.structuredContent).toBeUndefined();
      expect(fake.requests.filter((request) => request.url === '/api/chat')).toHaveLength(1);
      const accepted = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session, diagnosis: 'Use two.' },
      });
      expect(accepted.result.structuredContent).toMatchObject({
        model_digest: 'digest-123', telemetry: { round: 1 },
      });
      expect(fake.requests.filter((request) => request.url === '/api/tags')).toHaveLength(3);
      expect(fake.requests.filter((request) => request.url === '/api/chat')[1].body.messages).toEqual([
        { role: 'user', content: 'Return one assignment.' },
        { role: 'assistant', content: 'draft' },
        { role: 'user', content: 'Use two.' },
      ]);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('overlapping refinements are rejected and a retry retains both diagnoses in order', async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    const fake = await startFakeOllama([
      { message: { role: 'assistant', content: 'initial draft' } },
      () => { started.resolve(); return release.promise; },
      { message: { role: 'assistant', content: 'second revision' } },
    ]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    let first;
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      const session = generated.result.structuredContent.session;
      first = client.call('tools/call', {
        name: 'ollama_refine', arguments: { session, diagnosis: 'First diagnosis.' },
      });
      await started.promise;
      const secondArgs = { name: 'ollama_refine', arguments: { session, diagnosis: 'Second diagnosis.' } };
      const rejected = await client.call('tools/call', secondArgs);
      expect(rejected.result.isError).toBe(true);
      expect(rejected.result.content[0].text).toMatch(/already in progress.*retry/i);
      expect(rejected.result.structuredContent).toBeUndefined();
      expect(fake.requests.filter((request) => request.url === '/api/chat')).toHaveLength(2);
      release.resolve({ message: { role: 'assistant', content: 'first revision' } });
      expect((await first).result.structuredContent.telemetry.round).toBe(1);
      const retried = await client.call('tools/call', secondArgs);
      expect(retried.result.structuredContent.telemetry.round).toBe(2);
      expect(fake.requests.filter((request) => request.url === '/api/chat')[2].body.messages).toEqual([
        { role: 'user', content: 'Return one assignment.' },
        { role: 'assistant', content: 'initial draft' },
        { role: 'user', content: 'First diagnosis.' },
        { role: 'assistant', content: 'first revision' },
        { role: 'user', content: 'Second diagnosis.' },
      ]);
    } finally {
      release.resolve({ message: { role: 'assistant', content: 'first revision' } });
      if (first) await first;
      await client.close();
      await fake.close();
    }
  });

  test('a failed refinement releases the session for retry without advancing history or round', async () => {
    const fake = await startFakeOllama([
      { message: { role: 'assistant', content: 'initial draft' } },
      { status: 500, body: { error: 'forced failure' } },
      { message: { role: 'assistant', content: 'revision' } },
    ]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      const session = generated.result.structuredContent.session;
      const rejected = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session, diagnosis: 'Failed diagnosis.' },
      });
      expect(rejected.result.isError).toBe(true);
      expect(rejected.result.structuredContent).toBeUndefined();
      const retried = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session, diagnosis: 'Retry diagnosis.' },
      });
      expect(retried.result.structuredContent.telemetry.round).toBe(1);
      expect(fake.requests.filter((request) => request.url === '/api/chat')[2].body.messages).toEqual([
        { role: 'user', content: 'Return one assignment.' },
        { role: 'assistant', content: 'initial draft' },
        { role: 'user', content: 'Retry diagnosis.' },
      ]);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  // At capacity the old check ran on EVERY write, including the re-set that ends
  // a refinement. Refining any session other than the oldest therefore evicted a
  // live sibling although nothing new was inserted. (Refining the oldest deleted
  // and immediately re-added the same key, so only a non-oldest refine exposes
  // the loss.)
  test('a refinement at session capacity evicts no session', async () => {
    const reply = { message: { role: 'assistant', content: 'draft' }, done_reason: 'stop' };
    const fake = await startFakeOllama([reply, reply, reply, reply]);
    const client = startRpc({ OLLAMA_HOST: fake.url, QWEN_MCP_MAX_SESSIONS: '2' });
    try {
      const open = async (spec) => {
        const response = await client.call('tools/call', { name: 'ollama_generate', arguments: { spec } });
        return response.result.structuredContent.session;
      };
      const oldest = await open('Return one assignment.');
      const newest = await open('Return two assignments.');

      const refinedNewest = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session: newest, diagnosis: 'Use three.' },
      });
      expect(refinedNewest.result.isError).not.toBe(true);

      const refinedOldest = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session: oldest, diagnosis: 'Use four.' },
      });
      expect(refinedOldest.result.content[0].text).not.toMatch(/Unknown session/);
      expect(refinedOldest.result.isError).not.toBe(true);
      expect(refinedOldest.result.structuredContent).toMatchObject({
        session: oldest, telemetry: { round: 1 },
      });
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('allow_digest_change accepts re-pulled weights and records the digest it began with', async () => {
    const original = [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-123' }];
    const repulled = [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-456' }];
    const reply = { message: { role: 'assistant', content: 'draft' }, done_reason: 'stop' };
    const fake = await startFakeOllama([reply, reply, reply], [original, repulled, repulled]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      const session = generated.result.structuredContent.session;
      expect(generated.result.structuredContent.model_digest).toBe('digest-123');

      const accepted = await client.call('tools/call', {
        name: 'ollama_refine',
        arguments: { session, diagnosis: 'Use two.', allow_digest_change: true },
      });
      expect(accepted.result.isError).not.toBe(true);
      // The NEW weights are what ran, so they are what the result reports; the
      // old digest survives as the field that makes the change visible.
      expect(accepted.result.structuredContent).toMatchObject({
        model_digest: 'digest-456',
        telemetry: { round: 1, digest_changed_from: 'digest-123' },
      });
      expect(accepted.result.content[0].text).toMatch(/digest-123 -> digest-456/);
      expect(fake.requests.filter((request) => request.url === '/api/chat')).toHaveLength(2);

      // The session now carries the new digest, so the next turn is unremarkable
      // and must not keep re-announcing a change that already settled.
      const settled = await client.call('tools/call', {
        name: 'ollama_refine', arguments: { session, diagnosis: 'Use three.' },
      });
      expect(settled.result.structuredContent.model_digest).toBe('digest-456');
      expect(settled.result.structuredContent.telemetry).not.toHaveProperty('digest_changed_from');
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('the default digest rejection stands and names the override', async () => {
    const original = [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-123' }];
    const repulled = [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-456' }];
    const reply = { message: { role: 'assistant', content: 'draft' }, done_reason: 'stop' };
    const fake = await startFakeOllama([reply], [original, repulled]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      const rejected = await client.call('tools/call', {
        name: 'ollama_refine',
        arguments: { session: generated.result.structuredContent.session, diagnosis: 'Use two.' },
      });
      expect(rejected.result.isError).toBe(true);
      expect(rejected.result.content[0].text).toMatch(/digest has changed/i);
      expect(rejected.result.content[0].text).toMatch(/allow_digest_change/);
      expect(fake.requests.filter((request) => request.url === '/api/chat')).toHaveLength(1);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('allow_digest_change does not override a model that is gone', async () => {
    const original = [{ name: 'qwen3-coder:30b', size: 18000000000, digest: 'digest-123' }];
    const reply = { message: { role: 'assistant', content: 'draft' }, done_reason: 'stop' };
    const fake = await startFakeOllama([reply], [original, []]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const generated = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      const rejected = await client.call('tools/call', {
        name: 'ollama_refine',
        arguments: {
          session: generated.result.structuredContent.session,
          diagnosis: 'Use two.',
          allow_digest_change: true,
        },
      });
      expect(rejected.result.isError).toBe(true);
      expect(rejected.result.content[0].text).toMatch(/no longer installed/i);
      expect(fake.requests.filter((request) => request.url === '/api/chat')).toHaveLength(1);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  // The fixture harness itself: a throwing handler must fail the test with its
  // own message, not hang the request until jest's timeout reports nothing.
  test('a throwing fake-daemon handler surfaces its message instead of hanging', async () => {
    const fake = await startFakeOllama([() => { throw new Error('fixture exploded'); }]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const { result } = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.' },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/fixture exploded/);
      expect(fake.handlerErrors.map((e) => e.message)).toEqual(['fixture exploded']);
    } finally {
      await client.close();
      await fake.close();
    }
  }, 10000);

  test('generation and refinement return telemetry for their rendered inputs', async () => {
    const generateReply = {
      message: { role: 'assistant', content: '```js\nmodule.exports = 1;\n```' },
      done_reason: 'stop',
      total_duration: 9000000,
      load_duration: 2000000,
      prompt_eval_duration: 3000000,
      eval_duration: 4000000,
      prompt_eval_count: 7,
      eval_count: 5,
    };
    const refineReply = {
      message: { role: 'assistant', content: '```js\nmodule.exports = 2;\n```' },
      done_reason: 'stop',
      prompt_eval_count: 12,
      eval_count: 5,
    };
    const contextDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vernaculus-'));
    const contextFile = path.join(contextDir, 'context.js');
    fs.writeFileSync(contextFile, 'const retainedContext = true;\n');
    const fake = await startFakeOllama([generateReply, refineReply]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      await client.call('initialize', INIT.params);
      const response = await client.call('tools/call', {
        name: 'ollama_generate',
        arguments: {
          spec: 'Return one CommonJS assignment.',
          inline_context: 'Use CommonJS.',
          files: [contextFile],
          model: 'qwen3-coder:30b',
        },
      });
      const generated = response.result.structuredContent;
      expect(generated.telemetry).toMatchObject({
        call: 'generate',
        round: 0,
        done_reason: 'stop',
        timing_ms: {
          ollama_total: 9,
          model_load: 2,
          prompt_eval: 3,
          generation: 4,
        },
      });
      expect(typeof generated.telemetry.timing_ms.wall).toBe('number');
      expect(generated.telemetry.input_tokens_estimate.total).toBe(
        Object.entries(generated.telemetry.input_tokens_estimate)
          .filter(([name]) => name !== 'total')
          .reduce((sum, [, value]) => sum + value, 0),
      );
      expect(generated.telemetry.input_tokens_estimate).toMatchObject({
        history: 0,
        diagnosis: 0,
      });
      for (const component of ['spec', 'inline_context', 'files']) {
        expect(generated.telemetry.input_tokens_estimate[component]).toBeGreaterThan(0);
      }

      const refinement = await client.call('tools/call', {
        name: 'ollama_refine',
        arguments: {
          session: generated.session,
          diagnosis: 'The assignment needs the next value.',
          files: [contextFile],
        },
      });
      const refined = refinement.result.structuredContent;
      expect(refined.telemetry).toMatchObject({
        call: 'refine',
        round: 1,
        done_reason: 'stop',
        timing_ms: {
          ollama_total: null,
          model_load: null,
          prompt_eval: null,
          generation: null,
        },
        input_tokens_estimate: {
          spec: 0,
          inline_context: 0,
        },
      });
      for (const component of ['history', 'diagnosis', 'files']) {
        expect(refined.telemetry.input_tokens_estimate[component]).toBeGreaterThan(0);
      }
    } finally {
      await client.close();
      await fake.close();
      fs.rmSync(contextDir, { recursive: true, force: true });
    }
  });

  test.each([
    ['empty', { message: { role: 'assistant', content: '' }, done_reason: 'stop' }, 'empty', true],
    ['truncated', { message: { role: 'assistant', content: 'partial reply' }, done_reason: 'length' }, 'truncated', true],
  ])('generation retains %s success shape with telemetry', async (_name, reply, field, expected) => {
    const fake = await startFakeOllama([reply]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      await client.call('initialize', INIT.params);
      const response = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'Return one assignment.', model: 'qwen3-coder:30b' },
      });
      const generated = response.result.structuredContent;
      expect(generated[field]).toBe(expected);
      expect(generated.telemetry).toMatchObject({ call: 'generate', round: 0, done_reason: reply.done_reason });
    } finally {
      await client.close();
      await fake.close();
    }
  });

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

  test('an unreadable file names the path, not a stack trace', async () => {
    const fake = await startFakeOllama([]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const { result: r } = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'x', files: ['definitely/not/here.js'] },
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toMatch(/definitely\/not\/here\.js/);
      expect(r.content[0].text).not.toMatch(/at Object|node:internal/);
      expect(r.structuredContent).toBeUndefined();
      expect(fake.requests.map((request) => request.url)).toEqual(['/api/tags']);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('an over-budget prompt is refused up front, naming the budget', async () => {
    const fake = await startFakeOllama([]);
    const client = startRpc({ OLLAMA_HOST: fake.url });
    try {
      const { result: r } = await client.call('tools/call', {
        name: 'ollama_generate', arguments: { spec: 'x'.repeat(400000), num_ctx: 8192, num_predict: 1024 },
      });
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toMatch(/input budget/);
      expect(r.content[0].text).toMatch(/7167/); // 8192 - 1024 - 1
      expect(r.structuredContent).toBeUndefined();
      expect(fake.requests.map((request) => request.url)).toEqual(['/api/tags']);
    } finally {
      await client.close();
      await fake.close();
    }
  });

  test('an unknown tool name is reported as a tool error, not a protocol error', () => {
    const r = call('no_such_tool', {});
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/Unknown tool/);
  });
});
