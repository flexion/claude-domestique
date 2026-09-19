# Vernaculus Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured latency and input-composition telemetry to Vernaculus generation and refinement without changing the Ollama request or delegation behavior.

**Architecture:** The existing `ollama_generate` and `ollama_refine` tools keep their inputs, human-readable content, and existing structured fields. The adapter adds one nested `telemetry` object assembled from pre-call estimates, in-memory session metadata, wall time, and Ollama's response metrics. A fake loopback Ollama server proves the outgoing request stays unchanged; the live smoke test checks the selected Qwen3 model.

**Tech Stack:** Node.js 24, CommonJS, newline-delimited JSON-RPC over stdio, `node:http`, root Jest 29, Vernaculus Jest 30, Ollama `/api/tags` and `/api/chat`.

**Spec:** `docs/superpowers/specs/2026-09-16-vernaculus-observability-design.md`

## Global Constraints

- Keep Node.js at `>=24`, CommonJS modules, two-space indentation, semicolons, and trailing newlines.
- Add no runtime dependency to Vernaculus.
- Measure the first pass against `qwen3-coder:30b` and record the live digest.
- Do not change prompts, model selection, inference settings, residency, chunking policy, skill guidance, human-readable results, or execution-error shapes.
- Preserve every existing structured result field and add one required `telemetry` object.
- Components that do not apply to a call are `0`; missing Ollama timing values are `null`.
- Keep derived rates outside the server.
- Preserve unrelated changes and the untracked exploratory files under `tmp/`.
- Commit commands below are proposed checkpoints. Run them only when the current user has explicitly authorized implementation commits.

---

### Task 1: Establish the baseline and fake-daemon contract harness

**Files:**
- Modify: `vernaculus/__tests__/server.test.js:8-25`
- Modify: `.claude/sessions/chore-explore-local-model-integration.md`

**Interfaces:**
- Consumes: the current MCP methods `initialize` and `tools/call`; `OLLAMA_HOST` selects the fake endpoint.
- Produces: `startRpc(env)` with `call(method, params)` and `close()`; `startFakeOllama(replies)` with `url`, captured `requests`, and `close()`.

- [ ] **Step 1: Capture the pre-instrumentation live baseline**

Run from `vernaculus/` with local-daemon access:

```bash
npm run smoke:generate
```

Expected: the inventory names `qwen3-coder:30b` as the default, generation and refinement pass, and the draft header records model, wall seconds, prompt tokens, output tokens, and digest. Confirm the model is `qwen3-coder:30b`; stop if another model was selected.

Record the command, model tag, digest, generation seconds, prompt/output counts, and refinement result in the session log using `apply_patch`. Do not edit the MCP server before this step completes.

- [ ] **Step 2: Add an asynchronous MCP test client**

Extend the imports and add this helper beside the existing synchronous `rpc` helper:

```js
const http = require('node:http');
const readline = require('node:readline');
const { once } = require('node:events');
const { spawn, spawnSync } = require('node:child_process');

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
```

Keep `spawnSync` in the destructured import because existing unit tests still use it.

- [ ] **Step 3: Add a fake Ollama HTTP endpoint**

Add a helper that returns deterministic inventory and chat results while retaining the received bodies:

```js
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
```

- [ ] **Step 4: Prove the current outgoing Ollama payload**

Add a Jest test that initializes the server, calls generation, and compares the captured `/api/chat` request exactly:

```js
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
```

Add a second contract assertion with a fake chat reply of
`{ status: 500, body: { error: 'forced failure' } }`. Assert the tool response
has `isError: true`, one text content block containing `Ollama HTTP 500`, and no
`structuredContent`. This freezes the execution-error shape before telemetry is
added.

- [ ] **Step 5: Run the focused test**

Run:

```bash
cd vernaculus && npm test -- --runInBand
```

Expected: all tests pass without access to the real Ollama daemon. The new test uses only the fake loopback endpoint.

- [ ] **Step 6: Checkpoint the harness if commits are authorized**

```bash
git add .claude/sessions/chore-explore-local-model-integration.md vernaculus/__tests__/server.test.js
```

Invoke `onus:commit` for validation and use the suggested title
`chore - add vernaculus observability harness`. Do not run this checkpoint
unless the user has authorized implementation commits.

### Task 2: Add telemetry to generation and refinement

**Files:**
- Modify: `vernaculus/__tests__/server.test.js`
- Modify: `vernaculus/mcp/server.js:65-68,212-237,251-332,471-537`

**Interfaces:**
- Consumes: Ollama duration fields in nanoseconds; existing `estimateTokens`; retained session messages.
- Produces: `telemetry.call`, `telemetry.round`, `telemetry.done_reason`, `telemetry.timing_ms`, and `telemetry.input_tokens_estimate` on both draft tools.

- [ ] **Step 1: Write failing generation and refinement telemetry assertions**

Use fake replies with fixed metrics:

```js
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
```

Assert the generation result contains:

```js
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
```

Call generation with a non-empty `inline_context` and a temporary context file,
then assert the `spec`, `inline_context`, and `files` estimates are positive.
Call `ollama_refine` with the returned session and assert `call: 'refine'`,
`round: 1`, and `null` for all four omitted Ollama durations. Assert generation
reports `history` and `diagnosis` as `0`; refinement reports positive `history`,
`diagnosis`, and `files` estimates and reports `spec` and `inline_context` as
`0`.

Add two focused fake-daemon cases for the successful edge shapes:

- an empty assistant content with `done_reason: 'stop'` must retain
  `empty: true` and include generation telemetry; and
- a non-empty assistant content with `done_reason: 'length'` must retain
  `truncated: true` and include generation telemetry with
  `done_reason: 'length'`.

Re-run the Task 1 HTTP 500 assertion after the implementation; it must still
return text-only `isError` without telemetry.

- [ ] **Step 2: Add failing output-schema assertions**

Extend the existing schema test so both draft tools require `telemetry`. Assert nested required arrays contain every approved field:

```js
const telemetry = gen.outputSchema.properties.telemetry;
expect(gen.outputSchema.required).toContain('telemetry');
expect(telemetry.required).toEqual([
  'call', 'round', 'done_reason', 'timing_ms', 'input_tokens_estimate',
]);
expect(telemetry.properties.timing_ms.required).toEqual([
  'wall', 'ollama_total', 'model_load', 'prompt_eval', 'generation',
]);
expect(telemetry.properties.input_tokens_estimate.required).toEqual([
  'spec', 'inline_context', 'files', 'history', 'diagnosis', 'total',
]);
```

- [ ] **Step 3: Run the tests to verify they fail for the intended reason**

Run:

```bash
cd vernaculus && npm test -- --runInBand
```

Expected: FAIL because `telemetry` is absent. The unchanged-payload test from Task 1 must still pass.

- [ ] **Step 4: Add conversion and component helpers**

Add beside `estimateTokens`:

```js
function nsToMs(value) {
  return typeof value === 'number' ? value / 1e6 : null;
}

function estimateInput(parts = {}) {
  const values = {
    spec: estimateTokens(parts.spec || ''),
    inline_context: estimateTokens(parts.inlineContext || ''),
    files: estimateTokens(parts.files || ''),
    history: estimateTokens(parts.history || ''),
    diagnosis: estimateTokens(parts.diagnosis || ''),
  };
  return { ...values, total: Object.values(values).reduce((sum, value) => sum + value, 0) };
}
```

Pass already-rendered strings to this helper. For example, generation's inline component is `Context:\n${args.inline_context}`, not the raw value without its heading.

- [ ] **Step 5: Preserve Ollama timing fields and refinement rounds**

Extend `generate`'s return without changing its request body:

```js
timingMs: {
  ollama_total: nsToMs(data.total_duration),
  model_load: nsToMs(data.load_duration),
  prompt_eval: nsToMs(data.prompt_eval_duration),
  generation: nsToMs(data.eval_duration),
},
```

Change `rememberSession` to accept `round` and store it next to the existing fields:

```js
function rememberSession(id, model, messages, digest, round) {
  if (SESSIONS.size >= MAX_SESSIONS) SESSIONS.delete(SESSIONS.keys().next().value);
  SESSIONS.set(id, {
    model, digest, messages: messages.slice(-MAX_TURNS * 2), round, at: Date.now(),
  });
}
```

Generation stores round `0`. Refinement calculates `const round = session.round + 1` and stores that value after the response.

- [ ] **Step 6: Assemble telemetry without changing rendered text**

Start a wall timer as the first statement inside each draft-tool branch. Build generation estimates from `args.spec`, the rendered inline-context block, and `fileText`. Build refinement estimates from retained message content joined with `\n\n`, `fileText`, and `args.diagnosis`.

Extend `renderResult` to accept `call`, `round`, `wallStarted`, and `inputEstimate`, then add only this structured field:

```js
telemetry: {
  call,
  round,
  done_reason: result.doneReason ?? null,
  timing_ms: {
    wall: Date.now() - wallStarted,
    ...result.timingMs,
  },
  input_tokens_estimate: inputEstimate,
},
```

Do not add telemetry lines to `head` or otherwise change `out.text`.

- [ ] **Step 7: Declare the exact nested output schema**

Add `telemetry` to `DRAFT_OUTPUT_SCHEMA.properties` with:

```js
telemetry: {
  type: 'object',
  properties: {
    call: { type: 'string', enum: ['generate', 'refine'] },
    round: { type: 'integer', minimum: 0 },
    done_reason: { type: ['string', 'null'] },
    timing_ms: {
      type: 'object',
      properties: {
        wall: { type: 'number', minimum: 0 },
        ollama_total: { type: ['number', 'null'], minimum: 0 },
        model_load: { type: ['number', 'null'], minimum: 0 },
        prompt_eval: { type: ['number', 'null'], minimum: 0 },
        generation: { type: ['number', 'null'], minimum: 0 },
      },
      required: ['wall', 'ollama_total', 'model_load', 'prompt_eval', 'generation'],
    },
    input_tokens_estimate: {
      type: 'object',
      properties: {
        spec: { type: 'integer', minimum: 0 },
        inline_context: { type: 'integer', minimum: 0 },
        files: { type: 'integer', minimum: 0 },
        history: { type: 'integer', minimum: 0 },
        diagnosis: { type: 'integer', minimum: 0 },
        total: { type: 'integer', minimum: 0 },
      },
      required: ['spec', 'inline_context', 'files', 'history', 'diagnosis', 'total'],
    },
  },
  required: ['call', 'round', 'done_reason', 'timing_ms', 'input_tokens_estimate'],
},
```

Add `telemetry` to `DRAFT_OUTPUT_SCHEMA.required`. Keep the same schema object on both draft tools.

- [ ] **Step 8: Run the focused tests**

Run:

```bash
cd vernaculus && npm test -- --runInBand
```

Expected: PASS. Confirm the unchanged-payload assertion still passes.

- [ ] **Step 9: Checkpoint the server and tests if commits are authorized**

```bash
git add vernaculus/mcp/server.js vernaculus/__tests__/server.test.js
```

Invoke `onus:commit` for validation and use the suggested title
`chore - instrument vernaculus model calls`. Do not run this checkpoint unless
the user has authorized implementation commits.

### Task 3: Exercise telemetry through the live smoke test and document it

**Files:**
- Modify: `vernaculus/mcp/smoke.js:138-177`
- Modify: `vernaculus/README.md:48-102`
- Modify: `.claude/sessions/chore-explore-local-model-integration.md`

**Interfaces:**
- Consumes: the Task 2 telemetry result and optional `VERNACULUS_SMOKE_MODEL` environment variable.
- Produces: live assertions for both rounds and operator-facing field documentation.

- [ ] **Step 1: Make the smoke model explicit when requested**

Add:

```js
const SMOKE_MODEL = process.env.VERNACULUS_SMOKE_MODEL;
```

Construct generation arguments without sending an undefined model:

```js
const generateArgs = { spec };
if (SMOKE_MODEL) generateArgs.model = SMOKE_MODEL;
```

Pass `generateArgs` to `ollama_generate`. Keep default-model smoke behavior when the environment variable is absent.

- [ ] **Step 2: Assert live generation telemetry**

After the existing structured-content checks, add checks for the selected model, round, timing, and component sum:

```js
check('generation telemetry identifies the call and round',
  st && st.telemetry.call === 'generate' && st.telemetry.round === 0,
  st && `${st.telemetry.call} round ${st.telemetry.round}`);
check('generation telemetry carries Ollama timings',
  st && Object.values(st.telemetry.timing_ms).every((value) => typeof value === 'number'),
  st && JSON.stringify(st.telemetry.timing_ms));
check('generation input estimates sum to total',
  st && Object.entries(st.telemetry.input_tokens_estimate)
    .filter(([name]) => name !== 'total')
    .reduce((sum, [, value]) => sum + value, 0)
    === st.telemetry.input_tokens_estimate.total);
```

When `SMOKE_MODEL` is set, assert `st.model === SMOKE_MODEL`.

- [ ] **Step 3: Assert live refinement telemetry**

Read `refined.result.structuredContent` and check `call === 'refine'`, `round === 1`, a matching session, the same model digest, and numeric timing fields.

- [ ] **Step 4: Run protocol and live smoke tests**

Run:

```bash
cd vernaculus && npm run smoke
VERNACULUS_SMOKE_MODEL=qwen3-coder:30b npm run smoke:generate
```

Expected: both commands exit `0`; the live run reports `qwen3-coder:30b`, a non-empty digest, generation round `0`, refinement round `1`, and numeric phase timings.

Compare the live run with Task 1. Record the new timing fields and the approximate structured-result telemetry size in the session log. Do not claim a performance improvement; this pass measures overhead.

Calculate the added result cost as bytes, not an inferred token count:

```js
const telemetryBytes = Buffer.byteLength(JSON.stringify(st.telemetry), 'utf8');
console.log(`generation telemetry: ${telemetryBytes} bytes`);
```

Record that value beside the before-and-after timings. It is a serialization
size only; do not present it as Claude or Codex token usage.

- [ ] **Step 5: Document the observability contract**

Add a short `## Observability` section to `vernaculus/README.md` after the verification section. Document the field groups, units, estimate-versus-authoritative distinction, digest requirement, and the fact that Claude/Codex cost and correctness remain outside MCP visibility. Preserve the existing registration guidance at lines 33-46.

- [ ] **Step 6: Run focused regression tests**

Run:

```bash
npm run test:vernaculus
npm run validate:plugins
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 7: Checkpoint smoke, documentation, and session if commits are authorized**

```bash
git add .claude/sessions/chore-explore-local-model-integration.md vernaculus/mcp/smoke.js vernaculus/README.md
```

Invoke `onus:commit` for validation and use the suggested title
`chore - document vernaculus telemetry`. Do not run this checkpoint unless the
user has authorized implementation commits.

### Task 4: Enable the required Vernaculus version bump and run release validation

**Files:**
- Create: `scripts/__tests__/bump-version.test.js`
- Modify: `scripts/bump-version.js:17`
- Modify: `package.json:12-21`
- Modify by script: `vernaculus/package.json`
- Modify by script: `vernaculus/.claude-plugin/plugin.json`
- Modify by script: `vernaculus/.codex-plugin/plugin.json`
- Modify by script: `.claude-plugin/marketplace.json`
- Modify mechanically: `package-lock.json`

**Interfaces:**
- Consumes: `node scripts/bump-version.js vernaculus minor`.
- Produces: Vernaculus version `0.2.0` synchronized across package metadata, both host manifests, marketplace metadata, and the workspace lockfile.

- [ ] **Step 1: Add a failing fixture test for the version script**

Create this complete fixture test. It copies the real script into a temporary
repository, builds the minimum supported file layout, runs `vernaculus minor`,
and checks every metadata target:

```js
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = path.join(__dirname, '..', 'bump-version.js');

function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

test('bumps Vernaculus across package, host, and marketplace metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-'));
  try {
    const script = path.join(root, 'scripts', 'bump-version.js');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(SOURCE, script);
    writeJson(root, 'vernaculus/package.json', { name: 'vernaculus', version: '0.1.0' });
    writeJson(root, 'vernaculus/.claude-plugin/plugin.json', {
      name: 'vernaculus', version: '0.1.0',
    });
    writeJson(root, 'vernaculus/.codex-plugin/plugin.json', {
      name: 'vernaculus', version: '0.1.0',
    });
    writeJson(root, '.claude-plugin/marketplace.json', {
      plugins: [{ name: 'vernaculus', version: '0.1.0' }],
    });

    const result = spawnSync(process.execPath, [script, 'vernaculus', 'minor'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    for (const file of [
      'vernaculus/package.json',
      'vernaculus/.claude-plugin/plugin.json',
      'vernaculus/.codex-plugin/plugin.json',
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).version).toBe('0.2.0');
    }
    const marketplace = JSON.parse(fs.readFileSync(
      path.join(root, '.claude-plugin/marketplace.json'), 'utf8',
    ));
    expect(marketplace.plugins[0].version).toBe('0.2.0');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
```

Add `scripts/__tests__/bump-version.test.js` to the explicit Jest file lists in
both `test:scripts` and `test:coverage:scripts` in the root `package.json`.

- [ ] **Step 2: Run the test to verify the unsupported-plugin failure**

Run:

```bash
npx jest scripts/__tests__/bump-version.test.js --runInBand
```

Expected: FAIL because the script reports `Unknown plugin: vernaculus`.

- [ ] **Step 3: Add Vernaculus to the supported plugin list**

Change the constant to:

```js
const PLUGINS = [
  'mantra', 'memento', 'onus', 'agent-artifex', 'comitatus', 'stilus', 'modus', 'vernaculus',
];
```

- [ ] **Step 4: Run the script test and script suite**

Run:

```bash
npx jest scripts/__tests__/bump-version.test.js --runInBand
npm run test:scripts
```

Expected: both commands pass.

- [ ] **Step 5: Apply the required minor bump once**

Run:

```bash
node scripts/bump-version.js vernaculus minor
npm install --package-lock-only --ignore-scripts
```

Expected: the bump script reports `0.1.0 → 0.2.0`. Inspect `package-lock.json` and retain only the expected workspace metadata update.

- [ ] **Step 6: Run repository validation**

Run:

```bash
npm test
npm run validate:plugins
npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate . --strict
npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate vernaculus --strict
```

Then run the repository's isolated Codex marketplace smoke procedure from `AGENTS.md`, adding `vernaculus@<marketplace-name>` from source. Expected: all commands exit `0`.

- [ ] **Step 7: Review scope and update the session**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm that `vernaculus/skills/delegate-to-local-model/SKILL.md` is unchanged, no `tmp/` artifact is staged, the README registration guidance remains present, and the session lists every modified file and validation result.

- [ ] **Step 8: Commit the completed implementation if authorized**

Use `onus:commit` and the repository's chore format. Stage the server, tests, smoke harness, README, version tooling, metadata, lockfile, plan, and session. Suggested title:

```text
chore - instrument vernaculus model calls
```
