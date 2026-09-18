#!/usr/bin/env node
'use strict';

// THROWAWAY FEASIBILITY PROBE — not a plugin, not a design.
//
// Question: does a test-feedback loop make a local model converge on THIS
// repository's real code, and how long does it take?
//
// Method: blank one real function out of up.js, hand qwen3 the real Jest test
// file that covers it plus the rest of the module, run the real test command,
// feed failures back, loop. Record attempts-to-green and wall clock.
//
// The control is parseSelector, which qwen3:30b already wrote correctly from a
// prose spec in the earlier probe. If the loop cannot hold that, nothing else
// here means anything.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const http = require('node:http');

const REPO = path.resolve(__dirname, '..');
const SANDBOX = path.join(__dirname, 'probe-sandbox');
const SRC_REL = 'comitatus/skills/herdr/scripts/up.js';
const TEST_REL = 'comitatus/__tests__/up.test.js';

const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.PROBE_MODEL || 'qwen3:30b-32k';
const MAX_ATTEMPTS = Number(process.env.PROBE_ATTEMPTS || 3);

const TARGETS = ['parseSelector', 'makeAgent', 'parseArgs'];

// --- locating a function in source -----------------------------------------

// Brace-match from `function NAME(` to its closing brace. Good enough for this
// file, which has no strings or comments containing unbalanced braces inside
// the three target functions.
function findFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`cannot find function ${name}`);
  let depth = 0;
  let i = source.indexOf('{', start);
  const bodyStart = i;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1, text: source.slice(start, i + 1), bodyStart };
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

// --- sandbox ----------------------------------------------------------------

function buildSandbox() {
  fs.rmSync(SANDBOX, { recursive: true, force: true });
  const scripts = path.join(SANDBOX, 'comitatus/skills/herdr/scripts');
  const tests = path.join(SANDBOX, 'comitatus/__tests__');
  fs.mkdirSync(scripts, { recursive: true });
  fs.mkdirSync(tests, { recursive: true });
  fs.cpSync(path.join(REPO, 'comitatus/skills/herdr/scripts'), scripts, { recursive: true });
  fs.copyFileSync(path.join(REPO, TEST_REL), path.join(tests, 'up.test.js'));
}

function runTests() {
  try {
    const out = execFileSync(
      'npx',
      ['jest', '--rootDir', SANDBOX, '--testMatch', '**/up.test.js', '--silent'],
      { cwd: REPO, encoding: 'utf8', stdio: 'pipe', timeout: 120000 },
    );
    return { passed: true, output: out };
  } catch (e) {
    // Jest writes results to stderr even on success paths; keep both.
    return { passed: false, output: `${e.stdout || ''}\n${e.stderr || ''}`.trim() };
  }
}

// --- model ------------------------------------------------------------------

// node:http, not fetch. A non-streaming 30B generation regularly runs past
// undici's 300s headers timeout, which surfaces as a bare `fetch failed` and
// looks exactly like a model failure. It is not one.
function chat(messages) {
  const body = JSON.stringify({ model: MODEL, stream: false, think: false, messages });
  const url = new URL('/api/chat', OLLAMA);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, (res) => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { out += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`ollama HTTP ${res.statusCode}: ${out.slice(0, 300)}`));
        try {
          const data = JSON.parse(out);
          resolve((data.message && data.message.content) || '');
        } catch (e) {
          reject(new Error(`unparseable ollama response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(0);
    req.end(body);
  });
}

function extractCode(text, name) {
  // Prefer a fenced block; fall back to the raw text if the model skipped fences.
  const fences = [...text.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const block of fences) {
    if (block.includes(`function ${name}(`)) return block.trim();
  }
  if (text.includes(`function ${name}(`)) return text.trim();
  return null;
}

// --- one task ---------------------------------------------------------------

async function probe(name) {
  buildSandbox();
  const srcPath = path.join(SANDBOX, SRC_REL);
  const original = fs.readFileSync(srcPath, 'utf8');
  const fn = findFunction(original, name);
  const testFile = fs.readFileSync(path.join(SANDBOX, TEST_REL), 'utf8');

  // The module with the target removed. This is the context the model sees —
  // every sibling function, every comment, the real conventions.
  const stripped = original.slice(0, fn.start)
    + `function ${name}(/* SIGNATURE AND BODY REMOVED - YOU WRITE THIS */) {\n  throw new Error('not implemented');\n}`
    + original.slice(fn.end);

  const brief = [
    `Write the JavaScript function \`${name}\` for the CommonJS module below.`,
    '',
    'The module is shown with that one function removed. Every other function,',
    'comment and convention in it is real and must be respected. The Jest test',
    'file that follows is the specification: your function must make it pass.',
    '',
    `Reply with ONLY a single fenced \`\`\`js block containing the complete`,
    `\`function ${name}(...) { ... }\` declaration. No prose, no explanation,`,
    'no other functions, no require statements.',
    '',
    `=== MODULE (${SRC_REL}) ===`,
    stripped,
    '',
    `=== TEST (${TEST_REL}) ===`,
    testFile,
  ].join('\n');

  const messages = [{ role: 'user', content: brief }];
  const started = Date.now();
  const log = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    const answer = await chat(messages);
    const genSecs = (Date.now() - t0) / 1000;
    const code = extractCode(answer, name);

    if (!code) {
      log.push({ attempt, genSecs, result: 'no-code-returned' });
      messages.push({ role: 'assistant', content: answer });
      messages.push({
        role: 'user',
        content: `You did not return a \`\`\`js block containing \`function ${name}(\`. Return only that block.`,
      });
      continue;
    }

    fs.writeFileSync(srcPath, stripped.replace(
      `function ${name}(/* SIGNATURE AND BODY REMOVED - YOU WRITE THIS */) {\n  throw new Error('not implemented');\n}`,
      code,
    ));

    const { passed, output } = runTests();
    log.push({ attempt, genSecs, result: passed ? 'green' : 'red' });
    if (passed) {
      return { name, passed: true, attempts: attempt, totalSecs: (Date.now() - started) / 1000, log };
    }

    // The failure output IS the next brief. This is the whole hypothesis.
    const failure = output.split('\n').slice(0, 120).join('\n');
    messages.push({ role: 'assistant', content: answer });
    messages.push({
      role: 'user',
      content: `That failed the test suite. Fix it and return the complete \`function ${name}\` again in a single \`\`\`js block.\n\n=== TEST OUTPUT ===\n${failure}`,
    });
  }

  return { name, passed: false, attempts: MAX_ATTEMPTS, totalSecs: (Date.now() - started) / 1000, log };
}

// --- main -------------------------------------------------------------------

(async () => {
  // Baseline: the untouched sandbox must be green, or every result below is noise.
  buildSandbox();
  const baseline = runTests();
  if (!baseline.passed) {
    console.error('BASELINE FAILED - the unmodified sandbox does not pass. Probe aborted.\n');
    console.error(baseline.output.split('\n').slice(0, 40).join('\n'));
    process.exit(1);
  }
  console.log(`baseline green | model=${MODEL} | max attempts=${MAX_ATTEMPTS}\n`);

  const results = [];
  for (const name of TARGETS) {
    process.stdout.write(`${name} ... `);
    try {
      const r = await probe(name);
      results.push(r);
      console.log(`${r.passed ? 'GREEN' : 'RED'} after ${r.attempts} attempt(s), ${r.totalSecs.toFixed(1)}s`);
      for (const l of r.log) console.log(`    #${l.attempt} ${l.result} (gen ${l.genSecs.toFixed(1)}s)`);
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      results.push({ name, passed: false, error: e.message });
    }
  }

  console.log('\n--- summary ---');
  for (const r of results) {
    console.log(`${r.passed ? 'PASS' : 'FAIL'}\t${r.name}\tattempts=${r.attempts ?? '-'}\t${(r.totalSecs ?? 0).toFixed(1)}s`);
  }
  fs.writeFileSync(path.join(__dirname, 'probe-results.json'), JSON.stringify(results, null, 2));
  console.log('\nwrote tmp/probe-results.json');
})();
