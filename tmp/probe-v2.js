#!/usr/bin/env node
'use strict';

// THROWAWAY FEASIBILITY PROBE, v2.
//
// v1 produced 1-of-3 and that number is void. Three mechanical faults, all mine:
//
//   1. `think: false` did not disable thinking. It broke the template's channel
//      separation and dumped raw chain-of-thought into message.content. Omitting
//      the parameter is the correct way to get a clean answer.
//   2. The effective context was 16,386 tokens, not the 32,768 the tag
//      advertises, because OLLAMA_NUM_PARALLEL split it. Measured with a canary.
//   3. The retry loop APPENDED each failed draft plus 120 lines of Jest output to
//      the message array. Past the ceiling, Ollama truncates from the FRONT — so
//      every retry deleted the test file it was being graded against. `parseArgs`
//      wrote `missing value for --branch` instead of `--branch is required`
//      because by then it could no longer see the assertion. The loop was
//      destroying the specification it was supposed to enforce.
//
// And it tested `qwen3:30b`, the general instruct MoE, not `qwen3-coder:30b`.
//
// v2: real coding model, no think param, NUM_PARALLEL=2, and a retry that
// REPLACES the prior attempt instead of accumulating it — so the brief is
// byte-identical on every attempt and the window never grows.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SANDBOX = path.join(__dirname, 'probe-v2-sandbox');
const SRC_REL = 'comitatus/skills/herdr/scripts/up.js';
const TEST_REL = 'comitatus/__tests__/up.test.js';

const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.PROBE_MODEL || 'qwen3-coder:30b';
const MAX_ATTEMPTS = Number(process.env.PROBE_ATTEMPTS || 3);
const NUM_CTX = Number(process.env.PROBE_NUM_CTX || 32768);
// Budget rule (ned, source-verified): rendered input + generated output <= C-1.
// num_predict bounds the output half so the sum is knowable in advance rather
// than discovered by overflowing. Thinking tokens, where a model emits them,
// count inside this budget.
const NUM_PREDICT = Number(process.env.PROBE_NUM_PREDICT || 4096);
const INPUT_BUDGET = NUM_CTX - NUM_PREDICT - 1;
const TARGETS = (process.env.PROBE_TARGETS || 'parseSelector,makeAgent,parseArgs').split(',');

const STUB = (n) => `function ${n}(/* SIGNATURE AND BODY REMOVED - YOU WRITE THIS */) {\n  throw new Error('not implemented');\n}`;

function findFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`cannot find function ${name}`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return { start, end: i + 1 };
  }
  throw new Error(`unbalanced braces in ${name}`);
}

function buildSandbox() {
  fs.rmSync(SANDBOX, { recursive: true, force: true });
  fs.mkdirSync(path.join(SANDBOX, 'comitatus/skills/herdr/scripts'), { recursive: true });
  fs.mkdirSync(path.join(SANDBOX, 'comitatus/__tests__'), { recursive: true });
  fs.cpSync(path.join(REPO, 'comitatus/skills/herdr/scripts'), path.join(SANDBOX, 'comitatus/skills/herdr/scripts'), { recursive: true });
  fs.copyFileSync(path.join(REPO, TEST_REL), path.join(SANDBOX, TEST_REL));
}

function runTests() {
  try {
    execFileSync('npx', ['jest', '--rootDir', SANDBOX, '--testMatch', '**/up.test.js', '--silent'],
      { cwd: REPO, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
    return { passed: true, output: '' };
  } catch (e) {
    return { passed: false, output: `${e.stdout || ''}\n${e.stderr || ''}`.trim() };
  }
}

// node:http, not fetch: a non-streaming 30B generation outlives undici's 300s
// headers timeout, which surfaces as a bare `fetch failed` and is
// indistinguishable from the model producing nothing.
function chat(messages) {
  // NOTE: no `think` key. Sending think:false broke channel separation in v1.
  //
  // num_ctx is set EXPLICITLY. Ollama defaults to 4096 for a stock tag with no
  // custom Modelfile, and silently truncates from the front past that - which is
  // exactly the fault that voided v1, just arriving by a different route.
  //
  // truncate:false + shift:false disable BOTH pruning layers, so an oversized
  // prompt returns HTTP 400 `exceed_context_size_error` (with n_prompt_tokens and
  // n_ctx) instead of being silently compacted. Without this, Ollama retains
  // C - max(floor((C-K)/2),1) tokens - C=32768,K=4 gives exactly the 16386 this
  // probe measured earlier - keeping the first K plus the tail and dropping the
  // middle, with no flag in the response to say it happened. A starved model is
  // otherwise indistinguishable from an incapable one, which is the single fault
  // that produced every wrong number in v1.
  // Source (ned, ollama v0.34.0): llm/llama_server.go:279-330, :317 (WARN
  // "truncating input prompt"); server/prompt.go:76-77 (DEBUG message pruning);
  // server/routes.go:130-189 (options.num_ctx precedence).
  const body = JSON.stringify({
    model: MODEL, stream: false, messages,
    truncate: false,
    shift: false,
    options: { num_ctx: NUM_CTX, num_predict: NUM_PREDICT },
  });
  const url = new URL('/api/chat', OLLAMA);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, (res) => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { out += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`ollama HTTP ${res.statusCode}: ${out.slice(0, 300)}`));
        try {
          const j = JSON.parse(out);
          resolve({
            text: (j.message && j.message.content) || '',
            promptTokens: j.prompt_eval_count,
            evalTokens: j.eval_count,
          });
        } catch (e) { reject(new Error(`unparseable response: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(0);
    req.end(body);
  });
}

function extractCode(text, name) {
  const fences = [...text.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const b of fences) if (b.includes(`function ${name}(`)) return b.trim();
  if (text.includes(`function ${name}(`)) return text.trim();
  return null;
}

function buildBrief(name, stripped, testFile, failure) {
  return [
    `Write the JavaScript function \`${name}\` for the CommonJS module below.`,
    '',
    'The module is shown with that one function removed. Every other function,',
    'comment and convention in it is real and must be respected. The Jest test',
    'file that follows is the specification: your function must make it pass.',
    'Error message strings are asserted exactly - match them character for character.',
    '',
    'Reply with ONLY a single fenced ```js block containing the complete',
    `\`function ${name}(...) { ... }\` declaration. No prose, no other functions.`,
    ...(failure ? ['', '=== YOUR PREVIOUS ATTEMPT FAILED THESE TESTS ===', failure] : []),
    '',
    `=== MODULE (${SRC_REL}) ===`,
    stripped,
    '',
    `=== TEST (${TEST_REL}) ===`,
    testFile,
  ].join('\n');
}

async function probe(name) {
  buildSandbox();
  const srcPath = path.join(SANDBOX, SRC_REL);
  const original = fs.readFileSync(srcPath, 'utf8');
  const fn = findFunction(original, name);
  const testFile = fs.readFileSync(path.join(SANDBOX, TEST_REL), 'utf8');
  const stripped = original.slice(0, fn.start) + STUB(name) + original.slice(fn.end);

  const started = Date.now();
  const log = [];
  let failure = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // THE v1 FIX: one fresh single-turn message per attempt. The failure summary
    // REPLACES the previous one rather than stacking, so the prompt stays a fixed
    // size and the test file never falls off the front of the window.
    const brief = buildBrief(name, stripped, testFile, failure);
    const t0 = Date.now();
    const { text, promptTokens, evalTokens } = await chat([{ role: 'user', content: brief }]);
    const genSecs = (Date.now() - t0) / 1000;

    // The chars/4.2 heuristic that used to live here was itself a guess, and it
    // is what let me report "effective context is 16384" as a measurement when it
    // was an inference from a badly-designed canary. The server now refuses
    // oversized prompts outright (truncate:false -> HTTP 400), so detection is
    // exact and belongs there, not in an estimate here. What remains is a real
    // measurement against the real budget, reported rather than assumed.
    if (promptTokens && promptTokens > INPUT_BUDGET) {
      throw new Error(
        `OVER BUDGET: ${promptTokens} rendered input tokens > ${INPUT_BUDGET} `
        + `(num_ctx ${NUM_CTX} - num_predict ${NUM_PREDICT} - 1).`,
      );
    }

    const code = extractCode(text, name);

    if (!code) {
      log.push({ attempt, genSecs, promptTokens, evalTokens, result: 'no-code-returned' });
      failure = 'You did not return a ```js block containing the function declaration.';
      continue;
    }

    fs.writeFileSync(srcPath, stripped.replace(STUB(name), code));
    const { passed, output } = runTests();
    log.push({ attempt, genSecs, promptTokens, evalTokens, result: passed ? 'green' : 'red' });
    if (passed) return { name, passed: true, attempts: attempt, totalSecs: (Date.now() - started) / 1000, log };

    // v2.1 FIX. The previous filter kept only lines matching /✕|Expected|Received|●/,
    // which are the failure HEADERS. The actual diff lines - `-   "glyph": "◆"` -
    // match none of those patterns and were dropped, so the model was told THAT a
    // test failed and that one line differed, never WHAT differed. Attempts 2 and 3
    // were blind re-rolls: 38.0/37.6/37.6s, 195/178/184 tokens, same answer.
    //
    // Send the failure block whole. The brief is ~12k of a 32k window, so there is
    // room; bound it by lines rather than by pattern so nothing silently vanishes.
    const lines = output.split('\n');
    const end = lines.findIndex((l) => /^Test Suites:/.test(l));
    failure = lines.slice(0, end > 0 ? end : 160).slice(0, 160).join('\n');
  }
  return { name, passed: false, attempts: MAX_ATTEMPTS, totalSecs: (Date.now() - started) / 1000, log };
}

(async () => {
  buildSandbox();
  const baseline = runTests();
  if (!baseline.passed) {
    console.error('BASELINE FAILED - unmodified sandbox does not pass. Aborted.');
    process.exit(1);
  }
  const names = await new Promise((res, rej) => {
    http.get(`${OLLAMA}/api/tags`, (r) => { let o = ''; r.on('data', (c) => { o += c; }); r.on('end', () => res(JSON.parse(o).models.map((m) => m.name))); }).on('error', rej);
  });
  if (!names.includes(MODEL)) {
    console.error(`Model "${MODEL}" is not installed. Installed: ${names.join(', ')}`);
    process.exit(1);
  }
  console.log(`baseline green | model=${MODEL} | attempts<=${MAX_ATTEMPTS} | no think param | non-accumulating retry\n`);

  const results = [];
  for (const name of TARGETS) {
    process.stdout.write(`${name} ... `);
    try {
      const r = await probe(name);
      results.push(r);
      console.log(`${r.passed ? 'GREEN' : 'RED'} after ${r.attempts} attempt(s), ${r.totalSecs.toFixed(1)}s`);
      for (const l of r.log) {
        console.log(`    #${l.attempt} ${l.result} (gen ${l.genSecs.toFixed(1)}s, prompt ${l.promptTokens} tok, out ${l.evalTokens} tok)`);
      }
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      results.push({ name, passed: false, error: e.message });
    }
  }

  console.log('\n--- summary ---');
  for (const r of results) console.log(`${r.passed ? 'PASS' : 'FAIL'}\t${r.name}\tattempts=${r.attempts ?? '-'}\t${(r.totalSecs ?? 0).toFixed(1)}s`);
  fs.writeFileSync(path.join(__dirname, 'probe-v2-results.json'), JSON.stringify(results, null, 2));
})();
