'use strict';

/**
 * Enum-exclusion mutation sweep over the entry loop.
 *
 * Exact-code-set assertions on hand-written fixtures catch deletion and
 * weakening, but not a weakening keyed on an enum value no fixture occupies:
 * `moves_surface === true && resolution !== 'ambiguous'` passed the whole suite
 * because the fixture carried `item_wrong`. Crossing every check against every
 * enum value with fixtures needs one fixture per reachable cell, which is more
 * than a hand-written corpus can carry.
 *
 * So the sweep is the test. For each emission site in the entry loop and each
 * value of the three closed entry enums, `add` is replaced by a no-op on entries
 * in that cell and the battery is re-run. A mutation the battery cannot see is a
 * survivor.
 *
 * A survivor is only meaningful if the cell is REACHABLE — excluding
 * `post_merge` from a check that only runs on `pre_merge` removes nothing, and
 * counting those inflates the number. Reachability is established by
 * construction rather than by reading the code: a battery of corruption recipes
 * is applied to an entry placed in the cell, and the cell is reachable for a code
 * if the UNMUTATED linter emits that code there.
 *
 * The assertion this supports is that the survivor set does not GROW. Asserting
 * zero would require the per-cell fixture corpus this exists to avoid.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SRC = path.join(__dirname, 'lint-boundary.js');
const FIX = path.join(__dirname, '..', 'schemas', 'fixtures');
const TRANS = path.join(__dirname, '..', 'schemas', 'transcriptions');

const VERIFIER = ['mechanical', 'independent_review', 'observation'];
const STAGE = ['pre_merge', 'post_merge', 'production'];
const OBLIGATION = ['must', 'watch'];
// Codes whose weakening lands next to a terminal decision: the gating predicate
// a terminal depends on, or a check whose absence lets a terminal fire wrongly.
const TERMINAL_ADJACENT = [
  'E_UNVERIFIED_GROUNDS_MUST', 'E_QUANTITY_NO_PROVENANCE', 'E_GAP_UNRESOLVED_NOT_SOUGHT',
  'E_MOVES_SURFACE_NOT_BOOLEAN', 'E_ENUM_PROVENANCE', 'E_HANDOFF_MISSING',
];
const CELLS = [
  ...VERIFIER.map((v) => ['verifier', v]),
  ...STAGE.map((v) => ['verification_stage', v]),
  ...OBLIGATION.map((v) => ['obligation', v]),
];

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Compile a source string into a module without touching the filesystem. */
function compile(src) {
  const mod = { exports: {} };
  // The shebang is legal in a script and not in a Function body.
  src = src.replace(/^#!.*\n/, '');
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', '__filename', '__dirname', src)(
    mod, mod.exports, require, SRC, path.dirname(SRC),
  );
  return mod.exports;
}

/**
 * The slice of the source that is the entry loop, so sites outside it — the
 * interpretation pass, the entails checks, the mandate sweep — are not counted
 * against an enum that does not apply to them.
 */
function entryLoopRange(src) {
  // The trailing newline matters. `entries.forEach((e, i) => {` also matches the
  // id-registration one-liner 21 lines earlier, and indexOf returns the FIRST
  // match — so the un-anchored version started the slice inside a different loop
  // and picked up an emission site where `e` does not exist.
  const open = src.indexOf('entries.forEach((e, i) => {\n');
  if (open < 0) throw new Error('entry loop not found; the sweep is anchored to it');
  const close = src.indexOf('\n  mandates.forEach(', open);
  if (close < 0) throw new Error('entry loop end not found');
  return [open, close];
}

/** Every `add('CODE'` emission inside the entry loop, by absolute offset. */
function sites(src) {
  const [open, close] = entryLoopRange(src);
  const slice = src.slice(open, close);
  const re = /add\('([EWX]_[A-Z_]+)',/g;
  const out = [];
  let m = re.exec(slice);
  while (m !== null) {
    out.push({ code: m[1], offset: open + m.index, length: m[0].length, text: m[0] });
    m = re.exec(slice);
  }
  assertRegexReachesEveryCode(slice, out);
  return out;
}

/**
 * The regex only finds `add('CODE',`. Two codes in this linter are emitted other
 * ways — one through an object literal in the reviewer reclassification, one
 * through `R.warn` / `R.exempt` only — so if the scanned range ever widens to
 * include them they would be SILENTLY SKIPPED rather than reported as uncovered.
 * That is the distinction this whole file exists to preserve, so it is asserted
 * rather than assumed: any code mentioned inside the range that the regex cannot
 * reach is a gap in the instrument, not in the checks.
 */
function assertRegexReachesEveryCode(slice, found) {
  const reachable = new Set(found.map((s) => s.code));
  const mentioned = new Set(
    [...slice.matchAll(/'([EWX]_[A-Z_]+)'/g)].map((m) => m[1]),
  );
  const missed = [...mentioned].filter((c) => !reachable.has(c)).sort();
  if (missed.length) {
    throw new Error(
      `${missed.length} code(s) are mentioned inside the scanned range but are not emitted through `
      + `add('CODE', — the sweep would skip them silently rather than report them as uncovered: `
      + `${missed.join(', ')}. Widen the site regex or narrow the range.`,
    );
  }
}

/**
 * Replace one `add(` with a call that is a no-op for entries in the given cell.
 * Surgical on purpose: rewriting the surrounding condition would need the
 * condition parsed, and every check guards differently.
 */
function mutate(src, site, field, value) {
  // SITE-COUNT-PRESERVING. An earlier form replaced the CALLEE —
  // `(cond ? (() => {}) : add)('CODE',` — which leaves `add)('` where the site
  // regex needs `add('`, so the mutated source re-derived one site fewer. Under
  // any oracle that asserts the site count, every mutation then read as caught by
  // a structural assertion about the harness rather than by a coverage test.
  // Prefixing the guard leaves the emission text intact.
  //
  // The property was named two rounds before it was violated: "weakening
  // E_NO_TRACE for watch, SITE-COUNT-PRESERVING, passes all tests". Stated, then
  // not checked — which is why assertPreserving below checks it.
  //
  // Scope, so the defect is not overstated: the form matters ONLY to an oracle
  // that reads the source text shape, meaning anything calling sites(). Verified
  // that both forms give identical verdicts under the coverage-only oracle, so
  // measurements taken there were never affected.
  const guarded = `(e && e[${JSON.stringify(field)}] === ${JSON.stringify(value)}) || add('${site.code}',`;
  const out = src.slice(0, site.offset) + guarded + src.slice(site.offset + site.length);
  assertPreserving(src, out, `${site.code}|${field}|${value}`);
  return out;
}

/**
 * A mutation that changes the number of emission sites is malformed, not a
 * finding. Aborting names the cause; counting it as "caught" hides it, and hid it
 * for two rounds across two agents.
 */
function assertPreserving(before, after, key) {
  const n = (s) => [...s.matchAll(/add\('([EWX]_[A-Z_]+)',/g)].length;
  const a = n(before);
  const b = n(after);
  if (a !== b) {
    throw new Error(
      `malformed mutation ${key}: the emission-site count changed ${a} -> ${b}, so the mutated source is `
      + 'not comparable to the original. A mutation must be site-count-preserving.',
    );
  }
}

// ---------------------------------------------------------------------------
// The battery. Approximates the suite's fixture assertions and is a superset of
// them: it compares the full (code, outcome) multiset per fixture rather than
// only the failure codes.
// ---------------------------------------------------------------------------

function corpus() {
  const files = [];
  for (const [dir, names] of [[FIX, fs.readdirSync(FIX)], [TRANS, fs.readdirSync(TRANS)]]) {
    for (const n of names) {
      if (!n.endsWith('.yaml') || n === 'index.yaml') continue;
      const doc = yaml.load(fs.readFileSync(path.join(dir, n), 'utf8'));
      if (doc && doc.entries) files.push({ name: n, doc });
    }
  }
  return files;
}

/** Corruption recipes, applied to one entry. Mechanical, not exhaustive. */
const RECIPES = [
  ['strip_statement', (e) => { delete e.statement; }],
  ['strip_observation', (e) => { delete e.observation; }],
  ['strip_decision', (e) => { delete e.decision; }],
  ['no_traces', (e) => { e.traces = []; }],
  ['bad_trace', (e) => { e.traces = ['NOPE']; }],
  ['self_trace', (e) => { e.traces = [e.id]; }],
  ['no_mandate', (e) => { e.mandate = []; }],
  ['alien_mandate', (e) => { e.mandate = ['not-declared']; }],
  ['undeclared_quant', (e) => { delete e.quantitative; }],
  ['nonbool_quant', (e) => { e.quantitative = 'yes'; }],
  ['quant_no_object', (e) => { e.quantitative = true; delete e.quantity; }],
  ['quant_incomplete', (e) => {
    e.quantitative = true;
    e.quantity = { value: '1', unit: 'u', filled_from: { kind: 'commit', ref: 'a' } };
  }],
  ['unquoted_value', (e) => {
    e.quantitative = true;
    e.quantity = {
      value: 1.1, unit: 'u', conditions: 'c', filled_from: { kind: 'commit', ref: 'a' },
    };
  }],
  ['quant_no_provenance', (e) => {
    e.quantitative = true;
    e.quantity = { value: '1', unit: 'u', conditions: 'c' };
  }],
  ['quant_assumed', (e) => {
    e.quantitative = true;
    e.quantity = {
      value: '1', unit: 'u', conditions: 'c', filled_from: 'unresolved',
    };
  }],
  ['strip_testrole', (e) => { delete e.test_role; }],
  ['strip_baseline', (e) => { delete e.baseline; }],
  ['mismatch_baseline', (e) => { e.test_role = 'preservation'; e.baseline = 'assertion_fail'; }],
  ['untyped_expected_error', (e) => {
    e.test_role = 'change';
    e.baseline = 'expected_error';
    delete e.error_code;
    delete e.error_pattern;
  }],
  ['forbidden_testrole', (e) => { e.test_role = 'change'; e.baseline = 'assertion_fail'; }],
  ['strip_handoff', (e) => { delete e.handoff; }],
  ['incomplete_handoff', (e) => {
    e.handoff = { owner: 'o', trigger: 't', verification_method: 'm', evidence_destination: 'd' };
  }],
  ['evidence_in_manifest', (e) => { e.evidence = [{ case_id: 'x' }]; }],
  ['not_a_mapping', (e, d, idx) => { d.entries[idx] = 'not a mapping'; }],
  ['no_id', (e) => { delete e.id; }],
  ['bad_verifier', (e) => { e.verifier = 'NOPE'; }],
  ['bad_stage', (e) => { e.verification_stage = 'NOPE'; }],
  ['bad_obligation', (e) => { e.obligation = 'NOPE'; }],
];

/**
 * Which (code, cell) pairs are reachable at all. Established by construction:
 * put an entry in the cell, apply each recipe, and see what the real linter
 * emits there.
 */
function reachable(lint, base) {
  const seen = new Set();
  for (const [field, value] of CELLS) {
    for (const [, recipe] of RECIPES) {
      const d = clone(base);
      // Index 0 keeps the probe in a fixed place; the other entries are left
      // alone so the manifest stays otherwise well-formed.
      const e = d.entries[0];
      e[field] = value;
      try {
        recipe(e, d, 0);
      } catch (err) { /* a recipe that cannot apply to this shape is not a probe */ }
      let records;
      try {
        records = lint(d);
      } catch (err) { continue; }
      for (const r of records) {
        if (r.outcome !== 'fail' && r.outcome !== 'provisional') continue;
        if (!String(r.at).startsWith('/entries/0')) continue;
        seen.add(`${r.code}|${field}|${value}`);
      }
    }
  }
  return seen;
}

/** One comparable string per fixture: the full outcome multiset. */
function signature(lint, files) {
  return files.map(({ name, doc }) => {
    let recs;
    try {
      recs = lint(clone(doc));
    } catch (err) { return `${name}:THREW:${err.message}`; }
    const pairs = recs.map((r) => `${r.code}=${r.outcome}`).sort();
    return `${name}:${pairs.join(',')}`;
  }).join('\n');
}

/**
 * A site outside the entry loop has no `e` in scope, so its mutated guard throws
 * ReferenceError — and because the guard is lazily evaluated it throws only when
 * it fires. A throw changes the signature, so the mutation reads as CAUGHT and
 * contributes zero survivors: a mis-anchored slice inflates the denominator and
 * hides itself. Both independent implementations of this sweep had that bug, in
 * opposite directions, and neither noticed.
 *
 * So the sweep asserts its own scope: no mutation may throw. This is the same
 * "passes for the wrong reason" shape the suite guards against elsewhere.
 */
function assertNoPhantomSites(src, all, files, baselineSig) {
  const phantom = [];
  for (const site of all) {
    for (const [field, value] of CELLS) {
      const sig = signature(compile(mutate(src, site, field, value)).lintBoundary, files);
      if (sig !== baselineSig && sig.includes(':THREW:')) {
        const why = sig.split(':THREW:')[1].split('\n')[0];
        phantom.push(`${site.code}|${field}|${value} -> ${why}`);
      }
    }
  }
  if (phantom.length) {
    throw new Error(
      `${phantom.length} mutation(s) threw rather than being evaluated, which means the entry-loop slice `
      + `includes an emission site with no \`e\` in scope:\n  ${phantom.slice(0, 5).join('\n  ')}`,
    );
  }
}

function sweep() {
  const src = fs.readFileSync(SRC, 'utf8');
  const real = compile(src);
  const files = corpus();
  const baselineSig = signature(real.lintBoundary, files);
  const reach = reachable(real.lintBoundary, files.find((f) => f.name === 'valid.yaml').doc);

  const all = sites(src);
  assertNoPhantomSites(src, all, files, baselineSig);

  const survivors = [];
  let total = 0;
  let vacuous = 0;

  for (const site of all) {
    for (const [field, value] of CELLS) {
      total += 1;
      const mutated = compile(mutate(src, site, field, value));
      if (signature(mutated.lintBoundary, files) === baselineSig) {
        const key = `${site.code}|${field}|${value}`;
        if (reach.has(key)) survivors.push(key);
        else vacuous += 1;
      }
    }
  }

  // Terminal-adjacent cells sort first: a blind spot on a check that ends a run
  // costs more than one on a check that earns another round.
  const priority = (key) => {
    const code = key.split('|')[0];
    if (code.startsWith('X_')) return 0;
    if (TERMINAL_ADJACENT.includes(code)) return 1;
    return 2;
  };
  const ranked = [...new Set(survivors)]
    .sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));

  return {
    sites: all.length,
    mutations: total,
    survivors: ranked,
    vacuous,
    byPriority: {
      terminal: ranked.filter((k) => priority(k) === 0).length,
      terminal_adjacent: ranked.filter((k) => priority(k) === 1).length,
      other: ranked.filter((k) => priority(k) === 2).length,
    },
  };
}

module.exports = {
  sweep, mutate, assertPreserving, entryLoopRange, sites, CELLS, RECIPES,
};
