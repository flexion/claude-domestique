#!/usr/bin/env node
'use strict';

// THROWAWAY HARNESS — reproduces the skill's "3 of 3 with a diagnosis" claim.
//
// The claim is about a CALLER reading the failing draft and naming a cause, so
// the diagnosis cannot be scripted: a strong agent has to write each one after
// reading that run's actual draft. This file is only the mechanical half —
// build the sandbox, install a draft, run the real suite, report what failed.
// Generation and refinement go through the vernaculus MCP tools, which is the
// path the claim is about.
//
//   prep    <target>          blank the target, print the paths to pass as `files`
//   install <target> <file>   install a draft, run the suite, report
//   show    <target>          print the currently installed draft

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SANDBOX = path.join(__dirname, 'repro-sandbox');
const SRC_REL = 'comitatus/skills/herdr/scripts/up.js';
const TEST_REL = 'comitatus/__tests__/up.test.js';
const STUB = (n) => `function ${n}(/* SIGNATURE AND BODY REMOVED - YOU WRITE THIS */) {\n  throw new Error('not implemented');\n}`;

function findFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`cannot find function ${name}`);
  let depth = 0;
  let i = source.indexOf('{', start);
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return { start, end: i + 1 }; }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

function prep(target) {
  fs.rmSync(SANDBOX, { recursive: true, force: true });
  fs.mkdirSync(path.join(SANDBOX, 'comitatus/skills/herdr/scripts'), { recursive: true });
  fs.mkdirSync(path.join(SANDBOX, 'comitatus/__tests__'), { recursive: true });
  fs.cpSync(path.join(REPO, 'comitatus/skills/herdr/scripts'),
    path.join(SANDBOX, 'comitatus/skills/herdr/scripts'), { recursive: true });
  fs.copyFileSync(path.join(REPO, TEST_REL), path.join(SANDBOX, TEST_REL));

  const src = path.join(SANDBOX, SRC_REL);
  const original = fs.readFileSync(src, 'utf8');
  const fn = findFunction(original, target);
  fs.writeFileSync(src, original.slice(0, fn.start) + STUB(target) + original.slice(fn.end));
  // Keep the pristine copy so `install` can always rebuild from a known base.
  fs.writeFileSync(path.join(SANDBOX, '.original.js'), original);
  console.log(path.relative(REPO, src));
  console.log(path.relative(REPO, path.join(SANDBOX, TEST_REL)));
}

function install(target, codeFile) {
  const src = path.join(SANDBOX, SRC_REL);
  const original = fs.readFileSync(path.join(SANDBOX, '.original.js'), 'utf8');
  const fn = findFunction(original, target);
  const code = fs.readFileSync(codeFile, 'utf8').trim();
  fs.writeFileSync(src, original.slice(0, fn.start) + code + original.slice(fn.end));

  let output = '';
  let passed = false;
  try {
    execFileSync('npx', ['jest', '--rootDir', SANDBOX, '--testMatch', '**/up.test.js'],
      { cwd: REPO, encoding: 'utf8', stdio: 'pipe', timeout: 180000 });
    passed = true;
  } catch (e) { output = `${e.stdout || ''}\n${e.stderr || ''}`; }

  if (passed) { console.log('GREEN'); return; }
  const failing = [...output.matchAll(/✕ (.+)/g)].map((m) => m[1].trim().replace(/\s*\(\d+\s*ms\)$/, ''));
  console.log(`RED (${failing.length} failing)`);
  failing.forEach((f) => console.log(`  x ${f}`));
  // The assertion detail, which is what a diagnosis is written from.
  const detail = output.split('\n')
    .filter((l) => /●|Expected|Received|at Object|toThrow|toEqual|toBe\b/.test(l))
    .slice(0, 40).join('\n');
  console.log('\n--- detail ---\n' + detail.slice(0, 3000));
}

function show(target) {
  const original = fs.readFileSync(path.join(SANDBOX, '.original.js'), 'utf8');
  const fn = findFunction(original, target);
  const current = fs.readFileSync(path.join(SANDBOX, SRC_REL), 'utf8');
  const cur = findFunction(current, target);
  console.log(current.slice(cur.start, cur.end));
  console.log('\n--- reference implementation (not shown to the model) ---');
  console.log(original.slice(fn.start, fn.end));
}

const [cmd, target, arg] = process.argv.slice(2);
if (cmd === 'prep') prep(target);
else if (cmd === 'install') install(target, arg);
else if (cmd === 'show') show(target);
else { console.error('usage: prep|install|show <target> [codeFile]'); process.exit(1); }
