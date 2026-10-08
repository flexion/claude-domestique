#!/usr/bin/env node
'use strict';

/**
 * Mechanical per-turn signals from harness records. These flag turns for reading;
 * the verdicts in the report come from reading each reply, not from these regexes.
 *
 *   node score.js runs            # table of every turn
 *   node score.js runs --json     # same, machine-readable
 */

const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || 'runs');
const asJson = process.argv.includes('--json');

const MUTATE = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);
const RESEARCH = new Set(['WebSearch', 'WebFetch', 'Agent', 'Task']);
// Offers that invite another round trip: "want me to", "say the word", ...
const OFFER = /\b(want me to|would you like( me)? to|shall I|should I|say the word|let me know if|happy to|I can also|if you'd like|if you want)\b/gi;
const RESUME = /\b(resume|get back to|back to (the )?(slugify|implementation|code|coding|tests?)|pick (it|this) back up|continue (with|on) (the )?(slugify|implementation))\b/i;

function classify(turn) {
  const names = turn.tools.map((t) => t.name);
  const bash = turn.tools.filter((t) => t.name === 'Bash').map((t) => String(t.input.command || ''));
  const skills = turn.tools.filter((t) => t.name === 'Skill').map((t) => t.input.skill || t.input.name);
  const text = turn.final || '';
  const lastPara = text.trim().split(/\n\s*\n/).pop() || '';
  return {
    tools: names.length,
    mutations: names.filter((n) => MUTATE.has(n)).length,
    research: names.filter((n) => RESEARCH.has(n)).length,
    skills,
    rm: bash.filter((c) => /\brm\b|git rm/.test(c)).length,
    tests: bash.filter((c) => /npm (run )?test|node --test/.test(c)).length,
    commits: bash.filter((c) => /git commit/.test(c)).length,
    questions: (text.match(/\?(\s|$)/g) || []).length,
    offers: (text.match(OFFER) || []).length,
    endsWithQuestion: /\?\s*\**\s*$/.test(lastPara.trim()),
    mentionsResume: RESUME.test(text),
    chars: text.length,
  };
}

const rows = [];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const t of r.turns) {
    rows.push({ arm: r.arm, case: r.case, rep: r.rep, turn: t.turn, model: t.initModel, aborted: r.aborted || null, ...classify(t) });
  }
}

if (asJson) {
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
} else {
  const cols = ['arm', 'case', 'rep', 'turn', 'tools', 'mutations', 'research', 'rm', 'tests', 'commits', 'questions', 'offers', 'endsWithQuestion', 'mentionsResume', 'chars'];
  console.log(cols.join('\t'));
  for (const row of rows) console.log(cols.map((c) => row[c]).join('\t') + (row.skills.length ? `\tskills=${row.skills}` : '') + (row.aborted ? `\tABORTED ${row.aborted}` : ''));
}
