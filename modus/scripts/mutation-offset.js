#!/usr/bin/env node
'use strict';

/**
 * Measures the fast battery in `mutation-sweep.js` against the real coverage
 * suite, and exists as a committed harness because the ad-hoc version of it
 * produced a confident, unanimous, entirely wrong number.
 *
 * THE NULL MUTATION RUNS FIRST. The source is written back unchanged, the oracle
 * is invoked, and the result must be SURVIVED. If an unmutated file reads as
 * caught then the oracle has zero discriminating power and every subsequent
 * result is meaningless, so this aborts rather than reporting. That guard is a
 * negative control, which is the same thing this repository's own boundary schema
 * requires of every preservation obligation — `negative_control` or `mutation`,
 * because pass-on-base plus pass-on-head proves nothing. The sweep needed one and
 * did not have one, while it was being reviewed against the document that
 * mandates them.
 *
 * TWO DISTINCT WAYS THE ORACLE BREAKS, both measured:
 *
 *   1. Stale baseline -> CONSTANT oracle. `mutation-baseline.json` out of step
 *      with the linter makes the sweep's own test fail with no mutation applied,
 *      so every cell reads as caught. Unanimity is then not strong detection, it
 *      is no detection. The null mutation catches this on iteration one.
 *
 *   2. Instrument inside the oracle -> SELF-REFERENTIAL oracle. Including
 *      `mutation-sweep.test.js` means mutating the linter changes what the sweep
 *      itself computes, so the verdict reflects the instrument's shifted state
 *      rather than the coverage suite's. Verified to disagree with the coverage
 *      oracle even when the baseline is consistent, so the null mutation does NOT
 *      catch it. Naming the oracle explicitly is what catches this.
 *
 * Both guards are therefore required and neither subsumes the other.
 *
 * Run from the repository root, on an isolated copy:
 *   cp -R modus /tmp/iso && ln -s "$PWD/node_modules" /tmp/iso/
 *   cd /tmp/iso && node modus/scripts/mutation-offset.js
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const SRC = path.join(__dirname, 'lint-boundary.js');
const ms = require('./mutation-sweep');

// The coverage suite ONLY. Adding the sweep's own suite makes the instrument part
// of its own ground truth; see failure mode 2 above.
const ORACLE = ['jest', 'modus/scripts/__tests__/lint-boundary.test.js', '--silent'];

// Which test files count as coverage. A "caught" verdict is only meaningful if a
// test IN THIS SET failed; anything else means the oracle objected for a reason
// unrelated to whether the check is covered.
const COVERAGE_FILES = ['lint-boundary.test.js'];

/**
 * ATTRIBUTION, and the primary guard of the four.
 *
 * The other three ask WHICH oracle was consulted, or whether it can discriminate
 * at all. This asks WHY it said caught — and it is the automation of the manual
 * step that diagnosed the first bad run: "8 failures, all eight the sweep's own
 * suite and not one coverage test." Because it checks a property rather than
 * consulting a list, it catches a stale baseline, a malformed mutation, and
 * failure modes nobody has enumerated. The named-oracle guard is a denylist that
 * has to be maintained; this is not.
 */
function attribute(raw) {
  let report;
  try { report = JSON.parse(raw); } catch (e) { return { ok: false, reason: 'oracle produced no parseable report' }; }
  const failing = (report.testResults || [])
    .filter((f) => (f.assertionResults || []).some((a) => a.status === 'failed'))
    .map((f) => path.basename(f.name || f.testFilePath || ''));
  if (failing.length === 0) return { ok: true, caught: false, failing };
  const attributable = failing.filter((f) => COVERAGE_FILES.includes(f));
  if (attributable.length === 0) {
    return {
      ok: false,
      caught: true,
      failing,
      reason: `the oracle reported failures only in [${failing.join(', ')}], none of them a coverage file. `
        + 'A mutation "caught" by something other than a coverage test is not evidence the check is covered.',
    };
  }
  return { ok: true, caught: true, failing };
}

/**
 * The guard, separated so it can be tested against a stub oracle instead of only
 * by running 224 mutations. A harness must first measure a case whose answer it
 * already knows.
 */
function negativeControl(oracle) {
  if (oracle()) return { ok: true };
  return {
    ok: false,
    message: 'ABORT: the null mutation reads as CAUGHT.\n'
      + 'The unmutated source fails the oracle, so the oracle cannot distinguish anything and every\n'
      + 'result after this point would be meaningless. Usual cause: mutation-baseline.json is stale\n'
      + "relative to the linter, or the oracle includes the sweep's own suite.\n"
      + `Oracle: npx ${ORACLE.join(' ')}\n`,
  };
}

function run(argv) {
  const ORIG = fs.readFileSync(SRC, 'utf8');
  const HASH = crypto.createHash('sha256').update(ORIG).digest('hex');
  const restore = () => { try { fs.writeFileSync(SRC, ORIG); } catch (e) { /* best effort */ } };
  process.on('exit', restore);
  process.on('SIGINT', () => { restore(); process.exit(130); });
  process.on('SIGTERM', () => { restore(); process.exit(143); });

  // Returns { survived, attribution } so a caught verdict can be checked for WHY.
  const probe = () => {
    const r = cp.spawnSync('npx', [...ORACLE, '--json'], { encoding: 'utf8' });
    const a = attribute(r.stdout || '');
    return { survived: r.status === 0, attribution: a };
  };
  const oracle = () => probe().survived;

  // ---- negative control ----------------------------------------------------
  fs.writeFileSync(SRC, ORIG);
  const control = negativeControl(oracle);
  if (!control.ok) {
    process.stderr.write(control.message);
    return 2;
  }
  process.stdout.write('negative control: unmutated source SURVIVES the oracle — proceeding\n');

  const fast = new Set(ms.sweep().survivors);
  const [open] = [ORIG.indexOf('entries.forEach((e, i) => {\n')];
  const close = ORIG.indexOf('\n  mandates.forEach(', open);
  const sites = [...ORIG.slice(open, close).matchAll(/add\('([EWX]_[A-Z_]+)',/g)]
    .map((m) => ({ code: m[1], offset: open + m.index, length: m[0].length }));

  const real = [];
  const seen = new Set();
  let n = 0;
  for (const site of sites) {
    for (const [field, value] of ms.CELLS) {
      const key = `${site.code}|${field}|${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const g = `(e && e[${JSON.stringify(field)}] === ${JSON.stringify(value)}) || add('${site.code}',`;
      ms.assertPreserving(ORIG, ORIG.slice(0, site.offset) + g + ORIG.slice(site.offset + site.length), key);
      fs.writeFileSync(SRC, ORIG.slice(0, site.offset) + g + ORIG.slice(site.offset + site.length));
      const { survived, attribution } = probe();
      if (survived) real.push(key);
      else if (!attribution.ok) {
        restore();
        process.stderr.write(`ABORT at ${key}: ${attribution.reason}\n`);
        return 3;
      }
      n += 1;
      if (argv.includes('--verbose') && n % 40 === 0) {
        process.stdout.write(`  ${n} cells, ${real.length} surviving\n`);
      }
    }
  }
  restore();

  const realSet = new Set(real);
  const fastOnly = [...fast].filter((k) => !realSet.has(k));
  const realOnly = real.filter((k) => !fast.has(k));
  const identical = crypto.createHash('sha256')
    .update(fs.readFileSync(SRC, 'utf8')).digest('hex') === HASH;

  process.stdout.write([
    '',
    `restored byte-identical: ${identical}`,
    `cells:                   ${n}`,
    `fast-battery survivors:  ${fast.size}`,
    `real-oracle survivors:   ${real.length}`,
    `in both:                 ${[...fast].filter((k) => realSet.has(k)).length}`,
    `fast-only:               ${fastOnly.length}`,
    `real-only (RAW):         ${realOnly.length}`,
    '',
    'The raw real-only count is NOT a gap count. The fast list is reachability-filtered',
    'and this one is not, so cells where the check cannot fire at all appear as',
    'mismatches. Filter by reachability before reporting: doing so once turned 37',
    'apparent gaps into 30 vacuous and 7 genuine.',
    '',
  ].join('\n'));
  return identical ? 0 : 1;
}

module.exports = {
  run, negativeControl, attribute, ORACLE, COVERAGE_FILES,
};

if (require.main === module) process.exit(run(process.argv.slice(2)));
