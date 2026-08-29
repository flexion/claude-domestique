'use strict';

/**
 * A fast conservative pre-filter, and NOT a coverage measurement.
 *
 * The reasoning that built it was sound. Exact-code-set assertions on hand-written
 * fixtures catch a check being deleted or weakened on a value some fixture carries,
 * and cannot catch a weakening keyed on a value no fixture carries —
 * `moves_surface === true && resolution !== 'ambiguous'` passed the entire suite
 * because the one fixture carried `item_wrong`. Closing that class with fixtures
 * needs one per reachable cell, which a hand-written corpus cannot carry.
 *
 * Measured against the coverage suite: 132 fixture-corpus survivors versus 137
 * real ones, overlapping in 100. The totals nearly agree while the sets do not, so
 * this filter has 32 false positives AND 37 false negatives. It is NOT
 * conservative — 37 cells it reports as covered actually survive — and its list is
 * a partial queue rather than a complete or empty one.
 *
 * The oracle must exclude THIS FILE. Using `npx jest modus` makes the
 * sweep part of its own ground truth and returns a unanimous zero.
 */

const fs = require('fs');
const path = require('path');
const { sweep } = require('../mutation-sweep');

const BASELINE = path.join(__dirname, '..', '..', 'tests', 'mutation-baseline.json');

describe('enum-exclusion mutation sweep over the entry loop', () => {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  let result;

  beforeAll(() => { result = sweep(); }, 60000);

  test('the sweep still covers the same surface', () => {
    // A change in sites means an emission moved out of the entry loop or the
    // anchors this sweep depends on changed shape. Either way the numbers below
    // stop being comparable, so it fails rather than silently measuring less.
    expect(result.sites).toBe(baseline.sites);
    expect(result.mutations).toBe(baseline.mutations);
  });

  // The denominator was wrong twice, in opposite directions, and hid itself: a
  // mis-anchored slice picks up emission sites with no `e` in scope, their
  // mutated guards throw, a throw fails the battery, and the mutation reads as
  // CAUGHT. sweep() now throws rather than reporting, so this asserts the shape
  // of that failure rather than the count.
  test('the slice is scoped to the entry loop, and says so if it is not', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'lint-boundary.js'), 'utf8',
    );
    // The one-liner that registers ids matches the same text without the newline.
    expect(src.indexOf('entries.forEach((e, i) => {'))
      .toBeLessThan(src.indexOf('entries.forEach((e, i) => {\n'));
    expect(result.sites).toBe(28);
  });

  test('no new mutation survives', () => {
    const known = new Set(baseline.survivors);
    const fresh = result.survivors.filter((s) => !known.has(s));
    // A new survivor is a check that was weakened, or a new check that landed
    // with no fixture occupying its cells.
    expect(fresh).toEqual([]);
  });

  test('the survivor set does not grow', () => {
    expect(result.survivors.length).toBeLessThanOrEqual(baseline.survivor_count);
  });

  // Ratchet rather than hold. Holding lets a check be reworked without its blind
  // spots ever shrinking; per-bucket non-growth also stops a terminal blind spot
  // being traded for two cheap ones while the total falls.
  test('no priority bucket grows, so coverage ratchets instead of drifting', () => {
    const b = baseline.by_priority_fixture_corpus_only;
    expect(result.byPriority.terminal).toBeLessThanOrEqual(b.terminal);
    expect(result.byPriority.terminal_adjacent).toBeLessThanOrEqual(b.terminal_adjacent);
    expect(result.byPriority.other).toBeLessThanOrEqual(b.other);
  });

  test('survivors are ranked so terminal-adjacent cells are read first', () => {
    const rank = (k) => (k.startsWith('X_') ? 0 : 2);
    const ranks = result.survivors.map(rank);
    expect(ranks).toEqual(ranks.slice().sort((a, b) => a - b));
  });

  // The number is recorded WITH its measured bias, because for three rounds it was
  // quoted as a coverage figure by two readers and it never was one.
  test('the baseline states what it measures and what it does not', () => {
    expect(baseline.note).toContain('does not GROW');
    expect(baseline.note).toContain('BOTH directions');
    expect(baseline.measured_against).toContain('fixtures');
    // Both error directions are recorded and neither is zero. The first attempt at
    // this measurement used an oracle containing the instrument and returned a
    // unanimous zero — the most convincing and least informative result available.
    const o = baseline.offset_experiment;
    expect(o.oracle).toContain('ONLY');
    expect(o.false_positives_fast_only).toBeGreaterThan(0);
    expect(o.false_negatives_real_only).toBeGreaterThan(0);
    expect(o.in_both + o.false_positives_fast_only).toBe(o.fixture_corpus_survivors);
    expect(o.in_both + o.false_negatives_real_only).toBe(o.real_oracle_survivors);
    // 30 of the 37 are vacuous — the code cannot fire in that cell, so nothing
    // could catch a mutation there. Comparing a reachability-filtered set against
    // an unfiltered one is what made 7 look like 37.
    expect(o.false_negatives_vacuous + o.false_negatives_genuine)
      .toBe(o.false_negatives_real_only);
    expect(o.false_negatives_genuine).toBe(0);
    expect(o.harness).toContain('four guards');
    // 137 is kept as a sound checkpoint rather than retired: it was measured
    // twice against the coverage-only oracle, which the mutation-form defect
    // could not affect. Retiring it would attach a wrong reason to a right
    // conclusion, which is the thing this review kept pruning out.
    expect(o.provenance).toContain('137 — SUPERSEDED BUT SOUND');
    expect(o.provenance).toContain('0 — INVALID');
    expect(o.caution).toContain('not comparable');
    expect(baseline.do_not).toContain('partial queue');
    // The top-level summaries drifted from offset_experiment once already: do_not
    // still claimed 37 misses after the genuine count had been corrected to 7, and
    // the priority bucket was read as a real-suite count when it is a fast-battery
    // one. Tie them to the detail so they cannot drift again.
    expect(baseline.do_not).toContain(String(o.false_negatives_genuine));
    const bp = baseline.by_priority_fixture_corpus_only;
    expect(bp._note).toContain('FAST-BATTERY');
    expect(bp.terminal_real).toBe(0);
    expect(bp.terminal + bp.terminal_adjacent + bp.other)
      .toBe(o.fixture_corpus_survivors);
  });

  // The two cells that were terminal-adjacent and unoccupied are hand-covered in
  // the main suite. This asserts the sweep agrees that the terminal codes are not
  // accumulating new blind spots.
  test('no terminal code gains a new blind spot', () => {
    const terminalSurvivors = (list) => list.filter((s) => s.startsWith('X_')).sort();
    expect(terminalSurvivors(result.survivors))
      .toEqual(terminalSurvivors(baseline.survivors));
  });
});

// The sweep and the offset harness both need a negative control, and neither had
// one. The document they were reviewed against requires exactly this of every
// preservation obligation: pass-on-base plus pass-on-head proves nothing without
// a probe the test must fail against. A measurement harness must first measure a
// case whose answer it already knows.
describe('the offset harness refuses to run against a broken oracle', () => {
  const { negativeControl, ORACLE } = require('../mutation-offset');

  test('a sane oracle proceeds', () => {
    expect(negativeControl(() => true)).toEqual({ ok: true });
  });

  test('an oracle that fails the null mutation aborts with the cause named', () => {
    const r = negativeControl(() => false);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('null mutation reads as CAUGHT');
    expect(r.message).toContain('stale');
    expect(r.message).toContain("sweep's own suite");
  });

  // Failure mode 2 is not caught by the null mutation, so the oracle must also be
  // named. Both guards are required and neither subsumes the other.
  test('the oracle names one suite and excludes the sweep', () => {
    expect(ORACLE.join(' ')).toContain('lint-boundary.test.js');
    expect(ORACLE.join(' ')).not.toContain('mutation-sweep');
  });
});

// Attribution is the primary guard, because it asks WHY the oracle said caught
// rather than which file it consulted. It automates the manual step that
// diagnosed the first bad run — "8 failures, all eight the sweep's own suite and
// not one coverage test" — and because it checks a property rather than a list it
// covers modes nobody enumerated.
describe('a caught verdict must be attributable to a coverage test', () => {
  const { attribute, COVERAGE_FILES } = require('../mutation-offset');
  const report = (files) => JSON.stringify({
    testResults: files.map(([name, failed]) => ({
      name: `/repo/modus/scripts/__tests__/${name}`,
      assertionResults: [{ status: failed ? 'failed' : 'passed' }],
    })),
  });

  test('no failures at all is a survivor, and is fine', () => {
    const a = attribute(report([['lint-boundary.test.js', false]]));
    expect(a).toMatchObject({ ok: true, caught: false });
  });

  test('a failure in a coverage file is a legitimate catch', () => {
    const a = attribute(report([['lint-boundary.test.js', true]]));
    expect(a).toMatchObject({ ok: true, caught: true });
  });

  // The exact shape of the first bad run: every failure in the instrument's own
  // suite, none in coverage, reported as caught.
  test('failures only in the instrument own suite abort', () => {
    const a = attribute(report([['mutation-sweep.test.js', true]]));
    expect(a.ok).toBe(false);
    expect(a.reason).toContain('none of them a coverage file');
  });

  test('an unparseable report is not silently a survivor', () => {
    expect(attribute('not json').ok).toBe(false);
  });

  test('the coverage set names the suite that measures the checks', () => {
    expect(COVERAGE_FILES).toContain('lint-boundary.test.js');
    expect(COVERAGE_FILES).not.toContain('mutation-sweep.test.js');
  });
});

// (a) A malformed mutation is an error, not a finding.
describe('mutations must be site-count-preserving', () => {
  const { assertPreserving } = require('../mutation-sweep');
  const src = "add('E_ONE', a); add('E_TWO', b);";

  test('the preserving form passes', () => {
    expect(() => assertPreserving(src, "(x) || add('E_ONE', a); add('E_TWO', b);", 'k')).not.toThrow();
  });

  test('the callee-replacing form that hid mode 3 aborts', () => {
    expect(() => assertPreserving(src, "(x ? f : add)('E_ONE', a); add('E_TWO', b);", 'k'))
      .toThrow(/site-count-preserving/);
  });
});
