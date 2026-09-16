#!/usr/bin/env node
'use strict';

// Drives server.js over real stdio. This is the check neither validator
// performs: `plugin validate --strict` accepted a fixture whose command was a
// binary that does not exist, so "validates green" says nothing about whether
// the server starts, speaks the protocol, or reaches its daemon.
//
//   node tmp/qwen-mcp/smoke.js            # protocol + inventory only, fast
//   node tmp/qwen-mcp/smoke.js --generate # adds one real generation call

const { spawn } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');

const SMOKE_MODEL = process.env.VERNACULUS_SMOKE_MODEL;

const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

const pending = new Map();
let nextId = 1;

readline.createInterface({ input: child.stdout }).on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return console.error('unparseable:', line);
  }
  const resolve = pending.get(msg.id);
  if (resolve) {
    pending.delete(msg.id);
    resolve(msg);
  }
});

function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    // A local 30B model can take minutes for a first token, so the ceiling is
    // generous — but unref the timer, or four pending ones hold the event loop
    // open long after every check has passed and the run only looks hung.
    const timer = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${method} timed out`));
    }, 600000);
    timer.unref();
    pending.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke', version: '0' },
  });
  check('initialize', init.result && init.result.protocolVersion === '2025-06-18',
    `negotiated ${init.result && init.result.protocolVersion}`);

  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const list = await rpc('tools/list', {});
  const tools = list.result.tools || [];
  const names = tools.map((t) => t.name);
  check('tools/list', names.length === 3 && names.includes('ollama_refine'), names.join(', '));
  // MCP 2025-06-18: servers MUST conform to a declared outputSchema. Without one,
  // every caller re-implements a parser - which is what happened three times in
  // one session with v1's prose-only results.
  const noSchema = tools.filter((t) => !t.outputSchema).map((t) => t.name);
  check('every tool declares an outputSchema', noSchema.length === 0,
    noSchema.length ? `missing: ${noSchema.join(', ')}` : 'all three');
  const draftTools = tools.filter((t) => t.name !== 'ollama_models');
  const shapes = draftTools.map((t) => JSON.stringify(Object.keys(t.outputSchema.properties).sort()));
  check('generate and refine share one result shape', new Set(shapes).size === 1,
    `${draftTools.length} tools, ${new Set(shapes).size} shape(s)`);

  const models = await rpc('tools/call', { name: 'ollama_models', arguments: {} });
  const inventory = models.result.content[0].text;
  const mStruct = models.result.structuredContent;
  check('ollama_models returns structuredContent',
    Boolean(mStruct) && Array.isArray(mStruct.models) && mStruct.count === mStruct.models.length,
    mStruct ? `${mStruct.count} models, default ${mStruct.default_model}` : 'none');
  check('ollama_models reaches the daemon', !models.result.isError, inventory.split('\n')[1] || inventory);
  check('ollama_models names the resolved default',
    inventory.includes('default for ollama_generate:'),
    (inventory.split('\n').find((l) => l.startsWith('default for')) || '').slice(0, 80));

  // NOTE: this tag must be one that is NOT installed. The previous version used
  // `qwen3-coder:30b`, which was absent when written and later pulled - at which
  // point the test silently started generating instead of testing the error
  // path, and reported a FAIL whose cause was the fixture, not the server.
  const bad = await rpc('tools/call', {
    name: 'ollama_generate',
    arguments: { spec: 'x', model: 'definitely-not-installed:0b' },
  });
  const msg = bad.result.content[0].text;
  check('missing tag fails with live inventory, not a stack trace',
    bad.result.isError && msg.includes('not installed') && msg.includes('Installed:'),
    msg.slice(0, 90));

  // Defect 3: files are read locally rather than pasted by the caller.
  const badFile = await rpc('tools/call', {
    name: 'ollama_generate',
    arguments: { spec: 'x', files: ['no/such/file.js'] },
  });
  check('unreadable file fails with the path, not a stack trace',
    badFile.result.isError && badFile.result.content[0].text.includes('no such file'),
    badFile.result.content[0].text.slice(0, 80));

  // Defects 4-6: oversize is refused up front rather than silently compacted.
  const huge = await rpc('tools/call', {
    name: 'ollama_generate',
    arguments: { spec: 'x'.repeat(400000), num_ctx: 8192, num_predict: 1024 },
  });
  const hugeMsg = huge.result.content[0].text;
  check('over-budget prompt is refused, naming the budget',
    huge.result.isError && /input budget/.test(hugeMsg),
    hugeMsg.slice(0, 110));

  // Defect 1: an unknown session is a clear message, not a crash.
  const noSess = await rpc('tools/call', {
    name: 'ollama_refine',
    arguments: { session: 'nope', diagnosis: 'x' },
  });
  check('unknown session fails clearly',
    noSess.result.isError && noSess.result.content[0].text.includes('Unknown session'),
    noSess.result.content[0].text.slice(0, 80));

  if (process.argv.includes('--generate')) {
    const spec = 'Write a CommonJS function parseSelector(spec) that splits on the FIRST colon only, '
      + "returning {handle, model}; model is null when there is no colon. Model values may contain "
      + "colons, so 'bob:ollama/qwen2.5:7b' gives handle 'bob', model 'ollama/qwen2.5:7b'. "
      + 'Reject a handle that is not lowercase a-z. Output only code.';
    const generateArgs = { spec };
    if (SMOKE_MODEL) generateArgs.model = SMOKE_MODEL;
    const gen = await rpc('tools/call', {
      name: 'ollama_generate',
      arguments: generateArgs,
    });
    const draft = gen.result.content[0].text;
    check('ollama_generate returns a labelled draft', !gen.result.isError && draft.startsWith('[unverified draft'));
    // Defect 2: the caller can now budget and detect truncation.
    check('draft reports token counts', /tokens: prompt \d+ \/ output \d+/.test(draft),
      (draft.split('\n').find((l) => l.startsWith('tokens:')) || '').slice(0, 80));

    // Defect 1, the whole point: a session round-trip.
    const session = (draft.match(/^session: (\S+)/m) || [])[1];
    check('draft carries a session id', Boolean(session), session);
    const st = gen.result.structuredContent;
    check('draft returns structuredContent with extracted code',
      Boolean(st) && typeof st.code === 'string' && st.code.length > 0,
      st ? `code ${st.code ? st.code.length : 0} chars, session ${st.session}` : 'none');
    check('structured session matches the rendered one', st && st.session === session, st && st.session);
    check('structured carries token counts and a digest',
      st && typeof st.prompt_tokens === 'number' && typeof st.output_tokens === 'number' && Boolean(st.model_digest),
      st ? `prompt ${st.prompt_tokens}, out ${st.output_tokens}, digest ${(st.model_digest || '').slice(0, 12)}` : 'none');
    check('structured flags are booleans', st && typeof st.truncated === 'boolean' && st.verified === false,
      st ? `truncated=${st.truncated} verified=${st.verified}` : 'none');
    if (SMOKE_MODEL) {
      check('structured model matches VERNACULUS_SMOKE_MODEL', st && st.model === SMOKE_MODEL,
        st && st.model);
    }
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
    const telemetryBytes = st && Buffer.byteLength(JSON.stringify(st.telemetry), 'utf8');
    console.log(`generation telemetry: ${telemetryBytes} bytes`);
    if (session) {
      const refined = await rpc('tools/call', {
        name: 'ollama_refine',
        arguments: { session, diagnosis: 'Rename the function to parseSelectorV2. Change nothing else.' },
      });
      const text = refined.result.content[0].text;
      check('ollama_refine continues the session',
        !refined.result.isError && text.includes('parseSelectorV2'),
        text.split('\n')[0]);
      const refinedStructured = refined.result.structuredContent;
      check('refinement telemetry identifies the session and round',
        refinedStructured && refinedStructured.telemetry.call === 'refine'
          && refinedStructured.telemetry.round === 1 && refinedStructured.session === session,
        refinedStructured && `${refinedStructured.telemetry.call} round ${refinedStructured.telemetry.round}`);
      check('refinement telemetry keeps the model digest',
        refinedStructured && refinedStructured.model_digest === st.model_digest,
        refinedStructured && (refinedStructured.model_digest || '').slice(0, 12));
      check('refinement telemetry carries Ollama timings',
        refinedStructured && Object.values(refinedStructured.telemetry.timing_ms)
          .every((value) => typeof value === 'number'),
        refinedStructured && JSON.stringify(refinedStructured.telemetry.timing_ms));
    }
    console.log(`\n${draft}\n`);
  }

  child.kill();
})().catch((e) => {
  console.error('smoke failed:', e.message);
  child.kill();
  process.exit(1);
});
