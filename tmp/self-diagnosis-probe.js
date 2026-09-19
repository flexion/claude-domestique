#!/usr/bin/env node
'use strict';

// THROWAWAY EXPERIMENT — not a plugin, not a design.
//
// Question: can the local model name the CAUSE of its own failure?
//
// The repository's measurements bracket this. Feeding back RAW TEST OUTPUT does
// not work (one function failed nine consecutive automated retries). Feeding
// back a human-written diagnosis naming the cause does (1 of 3 -> 3 of 3).
// Nobody has tested the middle: ask the model to articulate the cause itself,
// then hand its own words back.
//
// It matters because the diagnosis is CALLER work — the strong agent reading
// failures and thinking — which is the exact cost delegation is supposed to
// save. Break-even is already a ~340-token function. If the local model can
// produce its own cause, the expensive half moves off the caller.
//
// Design: one cold draft per run, then three arms branching from that SAME
// draft and the SAME failure output, so the arms are paired rather than
// confounded by draft variation.
//
//   raw     — the known-failing condition: here is the output, fix it.
//   self    — call 1 asks for the cause and forbids code; call 2 hands the
//             model its own stated cause and asks for the rewrite.
//   oracle  — a human-written cause, as a strong caller would write it. This is
//             the ceiling: it should reproduce the measured 3-of-3 result.
//
// Scope: makeAgent only. It is the one cell measured to have room — it fails on
// exactly one test, and that test is the repository's twice-recorded ordering
// defect. parseSelector may be out of reach for this model at any prompt shape
// and would add noise, not signal.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const M = require(path.join(REPO, 'tmp/ab-contract-probe.js'));

const TARGET = 'makeAgent';
const RUNS = Number(process.env.PROBE_RUNS || 3);
const CODE_ONLY = 'Reply with ONLY a single fenced ```js block containing the complete '
  + `\`function ${TARGET}(...) { ... }\` declaration. No prose, no explanation, `
  + 'no other functions, no require statements.';

// Written after reading the failing test, which is exactly what the calling
// agent does. Names the mechanism and its location, not the symptom.
// First attempt at this was written from the failing test WITHOUT reading the
// model's draft, and asserted an ordering defect. The draft's ordering is
// correct; the defect is the thrown message. A diagnosis written from the
// symptom alone named the wrong cause, the model applied it faithfully, and the
// real defect survived — the same failure mode the skill records for
// underspecified diagnoses, committed here by the caller rather than the model.
const ORACLE_CAUSE = `Your check order is already correct — the missing-model check does precede the effort check. The defect is the MESSAGE TEXT. When opencode has no model you throw \`--opencode selector needs a value (or drop the trailing ":")\`. The test \`opencode without a model throws\` asserts \`.toThrow(/<handle>:<model>/)\`, so the thrown message must literally contain the substring \`<handle>:<model>\`. Your message does not contain it. Change that one thrown message so it names the required selector form \`<handle>:<model>\`, and leave the ordering alone.`;

function runTests(sandbox) {
  try {
    execFileSync('npx', ['jest', '--rootDir', sandbox, '--testMatch', '**/up.test.js'],
      { cwd: REPO, encoding: 'utf8', stdio: 'pipe', timeout: 180000 });
    return { passed: true, output: '' };
  } catch (e) {
    return { passed: false, output: `${e.stdout || ''}\n${e.stderr || ''}`.trim() };
  }
}

function failingTests(output) {
  return [...output.matchAll(/✕ (.+)/g)].map((m) => m[1].trim().replace(/\s*\(\d+\s*ms\)$/, ''));
}

// Jest output carries the whole suite; the model only needs the failures.
function trimOutput(output) {
  const lines = output.split('\n');
  const start = lines.findIndex((l) => l.includes('●') || l.includes('✕'));
  return (start < 0 ? lines : lines.slice(start)).join('\n').slice(0, 6000);
}

function install(sandbox, stripped, code) {
  fs.writeFileSync(path.join(sandbox, M.SRC_REL), stripped.replace(M.STUB(TARGET), code));
}

async function ask(messages) {
  const res = await M.chat(messages);
  return (res.message && res.message.content) || '';
}

async function gradeArm(name, stripped, messages, record) {
  const answer = await ask(messages);
  const { code } = M.extractCode(answer, TARGET);
  if (!code) return { arm: name, ...record, format: false, passed: false, failing: ['no code returned'] };
  M.buildSandbox();
  install(M.SANDBOX, stripped, code);
  const { passed, output } = runTests(M.SANDBOX);
  return { arm: name, ...record, format: true, passed, failing: passed ? [] : failingTests(output) };
}

async function main() {
  const results = [];

  for (let run = 1; run <= RUNS; run++) {
    // --- the shared cold draft -----------------------------------------------
    M.buildSandbox();
    const srcPath = path.join(M.SANDBOX, M.SRC_REL);
    const original = fs.readFileSync(srcPath, 'utf8');
    const fn = M.findFunction(original, TARGET);
    const testFile = fs.readFileSync(path.join(M.SANDBOX, M.TEST_REL), 'utf8');
    const stripped = original.slice(0, fn.start) + M.STUB(TARGET) + original.slice(fn.end);
    const brief = M.buildPrompt(TARGET, stripped, testFile, false);

    const draftReply = await ask([{ role: 'user', content: brief }]);
    const { code: draft } = M.extractCode(draftReply, TARGET);
    if (!draft) { console.log(`run${run}: cold draft produced no code — skipped`); continue; }

    install(M.SANDBOX, stripped, draft);
    const cold = runTests(M.SANDBOX);
    console.log(`run${run} cold: ${cold.passed ? 'GREEN' : `red (${failingTests(cold.output).join('; ')})`}`);
    if (cold.passed) { console.log('  cold draft already green — nothing to diagnose'); continue; }

    const failureText = trimOutput(cold.output);
    const base = [
      { role: 'user', content: brief },
      { role: 'assistant', content: draftReply },
    ];

    // --- arm: raw ------------------------------------------------------------
    const raw = await gradeArm('raw', stripped, [...base, {
      role: 'user',
      content: `The Jest suite failed. Here is the output.\n\n${failureText}\n\n${CODE_ONLY}`,
    }], { run });

    // --- arm: self -----------------------------------------------------------
    const causeReply = await ask([...base, {
      role: 'user',
      content: `The Jest suite failed. Here is the output.\n\n${failureText}\n\n`
        + 'Do NOT write any code yet. In one short paragraph, state the CAUSE: the specific '
        + 'thing in YOUR implementation that produces this failure — the mechanism and where '
        + 'it is. A failing assertion states a symptom; say why it happens.',
    }]);
    const self = await gradeArm('self', stripped, [...base, {
      role: 'user',
      content: `The Jest suite failed. Here is the output.\n\n${failureText}\n\n`
        + 'Do NOT write any code yet. State the CAUSE of this failure.',
    }, { role: 'assistant', content: causeReply }, {
      role: 'user', content: `Now rewrite the function applying that cause. ${CODE_ONLY}`,
    }], { run, selfCause: causeReply.trim().slice(0, 800) });

    // --- arm: oracle ---------------------------------------------------------
    const oracle = await gradeArm('oracle', stripped, [...base, {
      role: 'user',
      content: `The Jest suite failed. Here is the output.\n\n${failureText}\n\n`
        + `${ORACLE_CAUSE}\n\n${CODE_ONLY}`,
    }], { run });

    for (const r of [raw, self, oracle]) {
      results.push(r);
      console.log(`  ${r.arm.padEnd(7)} ${r.passed ? 'GREEN' : `red  (${r.failing.join('; ')})`}`);
    }
    fs.writeFileSync(path.join(__dirname, 'self-diagnosis-results.json'),
      `${JSON.stringify(results, null, 2)}\n`);
  }

  const tally = {};
  for (const r of results) {
    tally[r.arm] = tally[r.arm] || { green: 0, n: 0 };
    tally[r.arm].n += 1;
    if (r.passed) tally[r.arm].green += 1;
  }
  console.log('\n=== SUMMARY ===');
  for (const [arm, t] of Object.entries(tally)) console.log(`${arm.padEnd(8)} ${t.green}/${t.n} green`);
  console.log('\n=== WHAT THE MODEL SAID ITS CAUSE WAS ===');
  for (const r of results.filter((x) => x.arm === 'self')) {
    console.log(`\n--- run${r.run} (${r.passed ? 'GREEN' : 'red'}) ---\n${r.selfCause}`);
  }
  fs.writeFileSync(path.join(__dirname, 'self-diagnosis-results.json'),
    `${JSON.stringify({ tally, results }, null, 2)}\n`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
