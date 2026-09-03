#!/usr/bin/env node
/**
 * Pass 11 — the two checks that do not exist anywhere else.
 *
 * A pass artifact, not a plugin script. Promoting the prose half into modus is
 * `domestique-13n`, which is open because `modus/prompts/boundary-prose.md`
 * credits a script with these checks and no script performs them.
 *
 * 1. PROSE. Word caps on `statement`, `observation` and `decision`, and the closed
 *    banned-word list for `decision`. Both are specified in boundary-prose.md and
 *    enforced by nobody, so pass 10 verified them by hand.
 *
 * 2. ENTAILS SEMANTICS. Every coupling edge whose hazard says something must
 *    BECOME true, mapped to an entry declared `test_role: preservation`. A
 *    preservation test passes on base and head, so it cannot witness a change that
 *    was supposed to happen. This is OB-6's pass-10 defect: CPL-4's hazard read
 *    "needs the version bumped" and the entry it mapped to only compared four files
 *    for agreement, which four unbumped files satisfy.
 *
 *    Reports candidates. The verb list cannot decide intent, so a hit is a question
 *    for a reader and not a verdict. A miss is not a clearance either — this is a
 *    cheap net under a judgment, which is why the sensitivity question is still
 *    asked of every entry.
 *
 * Usage: node docs/passes/pass11/check-boundary.js boundary/gh-173.yaml
 */

const fs = require('fs');
const path = require('path');
const yaml = require(path.join(__dirname, '../../../node_modules/js-yaml'));

const CAP = { statement: 20, observation: 25, decision: 15 };

// Closed, and copied from boundary-prose.md rather than paraphrased. An earlier
// version of that list ended "and so on, etc.", which read as an open list and
// could not be run.
const BANNED = `usable reasonable appropriate sufficient adequate proper clean correct good
sensible robust generally typically mostly usually largely better faster
clearer simpler stronger`.split(/\s+/).filter(Boolean);
const BANNED_PHRASES = ['as needed', 'where appropriate', 'as applicable', 'and so on'];

// Verbs that assert something must come to be. A hazard phrased this way is not
// witnessed by a test that passes on both revisions.
const BECOMES = [
  'bumped', 'bump', 'added', 'add', 'implemented', 'implement', 'recorded', 'record',
  'produced', 'produce', 'created', 'create', 'needs', 'requires', 'must be', 'has not',
  'does not exist', 'is planned', 'incremented', 'increment',
];

const words = (s) => String(s).trim().split(/\s+/).length;

function main() {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('usage: check-boundary.js <boundary.yaml>\n');
    process.exit(2);
  }
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  const findings = [];
  const notes = [];

  // 1. prose
  const entries = Array.isArray(doc.entries) ? doc.entries : [];
  entries.forEach((e) => {
    Object.keys(CAP).forEach((f) => {
      if (e[f] === undefined) return;
      const n = words(e[f]);
      if (n > CAP[f]) findings.push(`PROSE_CAP  ${e.id}.${f} is ${n} words, cap ${CAP[f]}`);
    });
    const dec = String(e.decision || '').toLowerCase();
    BANNED.forEach((w) => {
      if (new RegExp(`\\b${w}\\b`).test(dec)) findings.push(`PROSE_BANNED  ${e.id}.decision contains "${w}"`);
    });
    BANNED_PHRASES.forEach((p) => {
      if (dec.includes(p)) findings.push(`PROSE_BANNED  ${e.id}.decision contains "${p}"`);
    });
  });
  ['goal', 'problem'].forEach((k) => {
    const s = doc.interpretation && doc.interpretation[k] && doc.interpretation[k].statement;
    if (s && words(s) > CAP.statement) {
      findings.push(`PROSE_CAP  interpretation.${k}.statement is ${words(s)} words, cap ${CAP.statement}`);
    }
  });

  // 2. entails semantics
  const byId = new Map(entries.map((e) => [e.id, e]));
  const coupling = Array.isArray(doc.coupling) ? doc.coupling : [];
  const entails = doc.entails && typeof doc.entails === 'object' ? doc.entails : {};
  coupling.forEach((c) => {
    if (!c || !c.id) return;
    const target = entails[c.id];
    if (!target || target === 'uncovered') return;
    const entry = byId.get(target);
    if (!entry) return;
    const hazard = String(c.target || '').toLowerCase();
    const hit = BECOMES.filter((v) => hazard.includes(v));
    if (hit.length && entry.test_role === 'preservation') {
      notes.push(
        `ENTAILS_SEMANTICS  ${c.id} -> ${target}: hazard says "${hit.join('", "')}" `
        + 'but the entry is test_role: preservation, which passes on base and head',
      );
    }
  });

  const out = [];
  if (findings.length) out.push(...findings);
  if (notes.length) out.push(...notes);
  process.stdout.write(out.length ? `${out.join('\n')}\n` : 'clean: prose caps, banned words, entails semantics\n');
  process.stdout.write(`checked ${entries.length} entries, ${coupling.length} coupling edges\n`);
  process.exit(findings.length ? 1 : 0);
}

main();
