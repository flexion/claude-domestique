#!/usr/bin/env node
'use strict';

/**
 * Same-case multi-turn comparison for issue #181: baseline mantra versus revised
 * mantra, each loaded with --plugin-dir into an isolated Claude run.
 *
 *   node harness.js --arm baseline --plugin /tmp/base/mantra --reps 3 --out runs
 *   node harness.js --arm revised  --plugin /tmp/rev/mantra  --reps 3 --out runs
 *
 * Every turn is a real `claude -p` call; turns after the first resume the session
 * with --resume, so the hook fires again on each prompt exactly as it does live.
 * --setting-sources project keeps the developer's enabled plugins (including an
 * installed mantra) out of both arms; --strict-mcp-config keeps MCP servers out.
 * Each conversation gets a fresh fixture repository.
 */

const { spawnSync, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ARM = arg('arm');
const PLUGIN = arg('plugin');
const REPS = Number(arg('reps', '3'));
const OUT = path.resolve(arg('out', 'runs'));
const MODEL = arg('model', 'opus');
const ONLY = arg('cases');
const CONCURRENCY = Number(arg('concurrency', '4'));
if (!ARM || !PLUGIN) {
  process.stderr.write('usage: --arm <name> --plugin <mantra dir> [--reps n] [--out dir] [--cases A,B]\n');
  process.exit(2);
}

const FIXTURE = {
  'package.json': JSON.stringify({ name: 'strkit', version: '1.0.0', private: true,
    scripts: { test: 'node --test' } }, null, 2) + '\n',
  'src/str.js': "'use strict';\n\nfunction trim(s) {\n  return s.trim();\n}\n\nmodule.exports = { trim };\n",
  'test/str.test.js': "'use strict';\n\nconst test = require('node:test');\nconst assert = require('node:assert');\nconst { trim } = require('../src/str');\n\ntest('trim', () => {\n  assert.strictEqual(trim('  a  '), 'a');\n});\n",
  'ISSUE.md': '# Issue 6: add slugify\n\nAdd `slugify(str)` to `src/str.js`: lowercase, trim, replace runs of\nnon-alphanumeric characters with a single `-`, and strip leading/trailing `-`.\nCover it with tests in `test/str.test.js`.\n',
  'config.json': '{ "port": 8080 }\n',
  'config.old.json': '{ "port": 3000 }\n',
  'legacy/config.json': '{ "port": 3000, "legacy": true }\n',
  'README.md': '# strkit\n\nString helpers. Configuration lives in `config.json`.\nThe previous setup used `legacy/config.json`.\n',
};

const CASES = {
  A: {
    name: 'discussion pause mid-task, then explicit resume',
    turns: [
      'Start on ISSUE.md: write the failing tests for slugify first, and stop there so I can look at them.',
      'Let\'s pause the coding. I want to think through something else with you: how should we tell when a work item is actually done, versus when it needs a human judgment call? Just discuss it with me.',
      'So would you say a passing test suite is never sufficient on its own to call something done?',
      'Good. Okay, go ahead and implement slugify now.',
    ],
  },
  B: {
    name: 'observation about a possible approach',
    turns: [
      'Implement ISSUE.md: add slugify with tests and run them.',
      'Thinking out loud: some teams consult a second model, or an outside reviewer, before making judgment calls on edge cases like this. Might be relevant to how we work someday.',
    ],
  },
  C: {
    name: 'direct action request',
    turns: [
      'Add a truncate(str, n) function to src/str.js that cuts the string to n characters and appends an ellipsis character when it cuts. Add tests and run them.',
    ],
  },
  D: {
    name: 'consequential ambiguity, then answer retained',
    turns: [
      'Delete the old config file, it is dead.',
      'The one under legacy/.',
      'And remove the mention of it from the README too.',
    ],
  },
  E: {
    name: 'standing authorization and constraints retained',
    turns: [
      'Ground rules for this session: you may edit anything under src/ and test/ and run npm test without checking with me; do not make any git commits; use single quotes. First, add capitalize(str) to src/str.js with a test.',
      'Now add a reverse(str) helper the same way.',
      'And a countWords(str) helper.',
    ],
  },
};

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r181-fx-'));
  for (const [rel, body] of Object.entries(FIXTURE)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  const g = (...a) => spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
  g('init', '-q');
  g('add', '.');
  g('-c', 'user.name=fixture', '-c', 'user.email=f@x', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
  return dir;
}

function runTurn(cwd, prompt, sessionId) {
  return new Promise((resolve) => {
    const args = [
      '--setting-sources', 'project',
      '--strict-mcp-config',
      '--plugin-dir', path.resolve(PLUGIN),
      '--model', MODEL,
      '--permission-mode', 'bypassPermissions',
      '--output-format', 'stream-json',
      '--verbose',
    ];
    if (sessionId) args.push('--resume', sessionId);
    args.push('-p', prompt);
    const child = spawn('claude', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

function parseTurn(raw) {
  const events = raw.split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  const tools = [];
  const texts = [];
  const hookContexts = [];
  let result = null;
  let initModel = null;
  for (const e of events) {
    if (e.type === 'system' && e.subtype === 'init') initModel = e.model;
    if (e.type === 'assistant' && e.message && Array.isArray(e.message.content)) {
      for (const c of e.message.content) {
        if (c.type === 'tool_use') tools.push({ name: c.name, input: c.input });
        if (c.type === 'text' && c.text.trim()) texts.push(c.text);
      }
    }
    if (e.type === 'system' && e.subtype === 'hook_response' && e.output) {
      try {
        const o = JSON.parse(e.output);
        const ctx = o.hookSpecificOutput && o.hookSpecificOutput.additionalContext;
        if (ctx) hookContexts.push({ event: e.hook_event, sha: crypto.createHash('sha256').update(ctx).digest('hex').slice(0, 12) });
      } catch { /* non-JSON hook output */ }
    }
    if (e.type === 'result') result = e;
  }
  return {
    initModel,
    sessionId: result && result.session_id,
    final: result && result.result,
    isError: result ? result.is_error : true,
    numTurns: result && result.num_turns,
    costUsd: result && result.total_cost_usd,
    texts,
    tools,
    hookContexts,
  };
}

async function runConversation(caseId, rep) {
  const spec = CASES[caseId];
  const cwd = makeFixture();
  const record = { arm: ARM, case: caseId, caseName: spec.name, rep, model: MODEL, plugin: path.resolve(PLUGIN), cwd, turns: [] };
  let sessionId = null;
  for (let t = 0; t < spec.turns.length; t++) {
    const prompt = spec.turns[t];
    const r = await runTurn(cwd, prompt, sessionId);
    const parsed = parseTurn(r.out);
    const rawDir = path.join(OUT, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });
    const rawFile = path.join(rawDir, `${ARM}-${caseId}-${rep}-t${t + 1}.jsonl`);
    fs.writeFileSync(rawFile, r.out);
    record.turns.push({ turn: t + 1, prompt, exitCode: r.code, stderr: r.err.slice(0, 2000), raw: path.relative(OUT, rawFile), ...parsed });
    process.stderr.write(`${ARM} ${caseId}#${rep} turn ${t + 1}: ${parsed.tools.map((x) => x.name).join(',') || '-'}\n`);
    // A turn that failed, or resumed into a different session, would make every
    // later turn a fresh conversation that looks like a resumed one. Stop instead.
    if (r.code !== 0 || parsed.isError || !parsed.sessionId || (sessionId && parsed.sessionId !== sessionId)) {
      record.aborted = `turn ${t + 1}: exit ${r.code}, isError ${parsed.isError}, session ${parsed.sessionId} (expected ${sessionId || 'new'})`;
      break;
    }
    if (!sessionId) sessionId = parsed.sessionId;
  }
  record.gitLog = spawnSync('git', ['-C', cwd, 'log', '--oneline'], { encoding: 'utf8' }).stdout;
  record.gitStatus = spawnSync('git', ['-C', cwd, 'status', '--porcelain'], { encoding: 'utf8' }).stdout;
  record.diff = spawnSync('git', ['-C', cwd, 'diff', 'HEAD'], { encoding: 'utf8' }).stdout;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${ARM}-${caseId}-${rep}.json`), JSON.stringify(record, null, 2));
}

async function main() {
  const ids = ONLY ? ONLY.split(',') : Object.keys(CASES);
  const jobs = [];
  for (let rep = 1; rep <= REPS; rep++) for (const id of ids) jobs.push([id, rep]);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const [id, rep] = jobs[next++];
      await runConversation(id, rep);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

if (require.main === module) main();

module.exports = { CASES, FIXTURE, parseTurn };
