#!/usr/bin/env node
'use strict';

// THROWAWAY EXPERIMENT — not a plugin, not a design.
//
// Question: does front-loading a structured task contract into a COLD call
// improve a local model's first draft, given that the full Jest suite is
// already in the prompt either way?
//
// This is the premise under the proposed vernaculus contract-first schema. The
// existing measurement (1 of 3 cold, 3 of 3 after a diagnosis naming the cause)
// says a diagnosis works AFTER a failure. Nobody has tested whether the same
// information, supplied BEFORE the first attempt, does anything at all.
//
// Design: both conditions receive an identical prompt — the module with one
// function blanked, plus the complete real Jest test file. Condition B adds a
// contract block whose every claim is derivable from that same test file.
// B therefore adds NO information, only structure and salience. If B wins,
// structure is doing the work. If it does not, the contract is theatre.
//
// Single shot only. No retries: retries are a different, already-measured
// condition.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const http = require('node:http');

const REPO = path.resolve(__dirname, '..');
// Outside the repo: a sandbox holding a copy of a real test file trips the
// root suite's orphaned-test guard, which scans the working tree.
const SANDBOX = path.join(os.tmpdir(), 'vernaculus-ab-sandbox');
const SRC_REL = 'comitatus/skills/herdr/scripts/up.js';
const TEST_REL = 'comitatus/__tests__/up.test.js';

const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.PROBE_MODEL || 'qwen3-coder:30b';
const RUNS = Number(process.env.PROBE_RUNS || 3);
const NUM_CTX = Number(process.env.PROBE_NUM_CTX || 32768);
const NUM_PREDICT = Number(process.env.PROBE_NUM_PREDICT || 4096);

const TARGETS = ['parseSelector', 'makeAgent', 'parseArgs'];

// --- the contracts ----------------------------------------------------------
//
// Discipline applied while writing these: every line is derivable from
// up.test.js, which BOTH conditions already receive in full. Orderings are
// stated only where a test actually pins them — inventing an ordering the
// tests do not assert would be leaking an implementation, not stating a
// contract. Nothing here describes HOW to compute anything.

const CONTRACTS = {
  parseSelector: `SIGNATURE
  function parseSelector(kind, spec)

BEHAVIOUR
  - A selector is "handle" or "handle:<selector>".
  - Named keys are model=, effort= and role=. They are order-independent.
  - A bare suffix with no key= is a model, so "sly:opus" means model=opus.
  - A model value may itself contain colons, e.g. "ollama/qwen2.5:7b".
  - role= is label-only and must never reach the CLI argument vector.

MUST NOT
  - Silently ignore an unknown selector key.
  - Accept an empty selector value.
  - Pass a value containing shell metacharacters through to any caller.

EXACT ERROR TEXT (asserted by regex, character for character)
  - unknown selector key
  - needs a value
  - unsafe characters`,

  makeAgent: `SIGNATURE
  function makeAgent(kind, spec)

BEHAVIOUR
  - kind is one of claude, codex, opencode. Anything else throws.
  - claude: model= becomes --model, effort= becomes --effort.
  - codex:  model= becomes --model, effort= becomes a -c config override,
            NOT a flag.
  - opencode: model= becomes -m and is REQUIRED; effort= is refused outright.
  - With no selector, model and effort are both null and no extra args are
    produced.
  - role= decorates the label only and never reaches the CLI args.

ORDER OF CHECKS (only the ordering the suite actually pins)
  - For opencode, a selector carrying no model throws the missing-model error
    EVEN WHEN effort= is also present. The effort rejection applies only when a
    model IS present. Getting these two the wrong way round makes the wrong
    error win.

MUST NOT
  - Silently drop opencode's effort= instead of refusing it.
  - Let a value containing shell metacharacters reach the arg vector, for any
    kind, in either model= or effort=.

EXACT ERROR TEXT (asserted by regex, character for character)
  - <handle>:<model>
  - opencode cannot set effort
  - unsafe characters
  - unknown selector key
  - needs a value
  - unknown agent kind: <the kind that was passed>`,

  parseArgs: `SIGNATURE
  function parseArgs(argv)

BEHAVIOUR
  - Returns a config carrying branch, base, timeout, agents and optionally
    sourceWorkspace.
  - Defaults: base is "origin/main", timeout is 45000.
  - --base, --timeout and --source-workspace override or supply those fields.
  - sourceWorkspace is undefined when --source-workspace is absent. Not null,
    not an empty string.
  - Agents are collected in FLAG ORDER, so the handles come back in the order
    their flags appeared on the command line.

ORDER OF CHECKS (only the ordering the suite actually pins)
  - A flag missing its value is reported while scanning the arguments, BEFORE
    any required-field check runs. parseArgs(['--branch']) must report the
    missing value for --branch, not that --branch is required.

MUST NOT
  - Accept two agents with the same handle.
  - Accept an unknown flag.

EXACT ERROR TEXT (asserted by regex, character for character)
  - --branch is required
  - at least one agent
  - duplicate handle
  - unknown flag
  - missing value for --branch`,
};

// --- locating a function in source -----------------------------------------

function findFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`cannot find function ${name}`);
  let depth = 0;
  let i = source.indexOf('{', start);
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
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
    execFileSync(
      'npx',
      ['jest', '--rootDir', SANDBOX, '--testMatch', '**/up.test.js', '--silent'],
      { cwd: REPO, encoding: 'utf8', stdio: 'pipe', timeout: 120000 },
    );
    return true;
  } catch {
    return false;
  }
}

// --- model ------------------------------------------------------------------

// node:http, not fetch: a non-streaming 30B generation outlives undici's 300s
// header timeout and surfaces as a bare `fetch failed`.
function post(pathname, payload) {
  const body = JSON.stringify(payload);
  const url = new URL(pathname, OLLAMA);
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
        try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(`unparseable: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(0);
    req.end(body);
  });
}

function getJson(pathname) {
  const url = new URL(pathname, OLLAMA);
  return new Promise((resolve, reject) => {
    http.get({ hostname: url.hostname, port: url.port, path: url.pathname }, (res) => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { out += c; });
      res.on('end', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function chat(messages) {
  return post('/api/chat', {
    model: MODEL,
    stream: false,
    think: false,
    messages,
    // Deterministic as Ollama allows, and explicit about context so the result
    // does not depend on the host's detected VRAM.
    options: {
      temperature: 0,
      seed: 42,
      num_ctx: NUM_CTX,
      num_predict: NUM_PREDICT,
      truncate: false,
      shift: false,
    },
  });
}

function extractCode(text, name) {
  const fences = [...text.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const block of fences) {
    if (block.includes(`function ${name}(`)) return { code: block.trim(), fenced: true };
  }
  if (text.includes(`function ${name}(`)) return { code: text.trim(), fenced: false };
  return { code: null, fenced: false };
}

// --- one trial --------------------------------------------------------------

const STUB = (name) => `function ${name}(/* SIGNATURE AND BODY REMOVED - YOU WRITE THIS */) {\n  throw new Error('not implemented');\n}`;

function buildPrompt(name, stripped, testFile, withContract) {
  const head = [
    `Write the JavaScript function \`${name}\` for the CommonJS module below.`,
    '',
    'The module is shown with that one function removed. Every other function,',
    'comment and convention in it is real and must be respected. The Jest test',
    'file that follows is the specification: your function must make it pass.',
    '',
    'Reply with ONLY a single fenced ```js block containing the complete',
    `\`function ${name}(...) { ... }\` declaration. No prose, no explanation,`,
    'no other functions, no require statements.',
  ];

  const contract = withContract
    ? ['', '=== TASK CONTRACT ===', CONTRACTS[name]]
    : [];

  return [
    ...head,
    ...contract,
    '',
    `=== MODULE (${SRC_REL}) ===`,
    stripped,
    '',
    `=== TEST (${TEST_REL}) ===`,
    testFile,
  ].join('\n');
}

async function trial(name, withContract, run) {
  buildSandbox();
  const srcPath = path.join(SANDBOX, SRC_REL);
  const original = fs.readFileSync(srcPath, 'utf8');
  const fn = findFunction(original, name);
  const testFile = fs.readFileSync(path.join(SANDBOX, TEST_REL), 'utf8');
  const stripped = original.slice(0, fn.start) + STUB(name) + original.slice(fn.end);

  const prompt = buildPrompt(name, stripped, testFile, withContract);
  const t0 = Date.now();
  const res = await chat([{ role: 'user', content: prompt }]);
  const genSecs = (Date.now() - t0) / 1000;
  const answer = (res.message && res.message.content) || '';
  const { code, fenced } = extractCode(answer, name);

  const record = {
    target: name,
    condition: withContract ? 'contract' : 'plain',
    run,
    genSecs: Number(genSecs.toFixed(2)),
    promptTokens: res.prompt_eval_count ?? null,
    outputTokens: res.eval_count ?? null,
    doneReason: res.done_reason ?? null,
    // Format and behaviour graded separately, so a fencing failure is never
    // mistaken for a logic failure.
    format: Boolean(code) && fenced,
    extracted: Boolean(code),
    behaviour: false,
  };

  if (!code) {
    record.note = 'no function declaration found in reply';
    return record;
  }

  fs.writeFileSync(srcPath, stripped.replace(STUB(name), code));
  record.behaviour = runTests();
  return record;
}

// --- main -------------------------------------------------------------------

async function main() {
  const tags = await getJson('/api/tags');
  const entry = (tags.models || []).find((m) => m.name === MODEL);
  if (!entry) throw new Error(`model ${MODEL} is not installed`);

  const meta = {
    model: MODEL,
    digest: entry.digest,
    num_ctx: NUM_CTX,
    num_predict: NUM_PREDICT,
    temperature: 0,
    seed: 42,
    runs: RUNS,
    startedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(meta));

  const results = [];
  for (const name of TARGETS) {
    for (let run = 1; run <= RUNS; run++) {
      // Interleaved per run so any daemon drift hits both conditions alike.
      for (const withContract of [false, true]) {
        const r = await trial(name, withContract, run);
        results.push(r);
        console.log(
          `${r.target.padEnd(14)} ${r.condition.padEnd(9)} run${run}  `
          + `format=${r.format ? 'ok ' : 'BAD'} behaviour=${r.behaviour ? 'GREEN' : 'red  '}  `
          + `${r.genSecs}s  in=${r.promptTokens} out=${r.outputTokens}`,
        );
        fs.writeFileSync(
          path.join(__dirname, 'ab-results.json'),
          `${JSON.stringify({ meta, results }, null, 2)}\n`,
        );
      }
    }
  }

  const summary = {};
  for (const r of results) {
    const key = `${r.target}/${r.condition}`;
    summary[key] = summary[key] || { green: 0, formatBad: 0, n: 0 };
    summary[key].n += 1;
    if (r.behaviour) summary[key].green += 1;
    if (!r.format) summary[key].formatBad += 1;
  }
  console.log('\n=== SUMMARY (green/n, format failures) ===');
  for (const [key, s] of Object.entries(summary)) {
    console.log(`${key.padEnd(26)} ${s.green}/${s.n} green, ${s.formatBad} format failures`);
  }
  fs.writeFileSync(
    path.join(__dirname, 'ab-results.json'),
    `${JSON.stringify({ meta, results, summary }, null, 2)}\n`,
  );
}

// Only run when invoked directly, so the failure-detail probe can reuse the
// prompt construction without kicking off a full 18-generation sweep.
if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = {
  CONTRACTS, buildPrompt, buildSandbox, findFunction, chat, extractCode, STUB, SANDBOX, SRC_REL, TEST_REL,
};
