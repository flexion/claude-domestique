#!/usr/bin/env node
'use strict';

/**
 * Reference linter for the boundary bundle. The specification was one document and is
 * now split by vertical slice; each pass below is specified by a different one:
 *
 *   docs/reconstructing-the-item.md    the interpretation contract
 *   docs/the-boundary-bundle.md        the manifest and the freeze
 *   docs/discharging-the-boundary.md   the evidence map
 *   docs/autonomous-workitem-workflow.md  the index, code prefixes, and stop states
 *
 * Three passes, because the artifacts are authored a slice apart:
 *
 *   lintBoundary(doc)                    the boundary bundle, before the freeze
 *   lintInterpretationPair(a, b)         two blind reconstructions
 *   lintEvidence(boundary, ev)           once tests exist
 *
 * Work items are unrefined, incorrect, and incomplete. The `interpretation`
 * block is the reconstruction of goal, problem, and obligations that the rest of
 * the boundary descends from, and it is linted here because every stage after it
 * verifies against it: a faithful implementation of a wrong reconstruction passes
 * every gate.
 *
 * Three code prefixes, and the suite asserts they partition the registry:
 *
 *   E_   retryable   the Author can fix it; earns another lint round
 *   W_   warning     recorded, non-gating, has no available remedy
 *   X_   terminal    the run stops; no authoring round can change it
 *
 * Outcomes are fail | pass | exempt | warn | provisional | abstain. `provisional` halts
 * spending without ending the run, and exists for exactly one case: see
 * TERMINAL_TRIGGER below.
 *
 * Two policies protect the terminal class:
 *
 *   A terminal conclusion may not be drawn from a document that has retryable
 *   defects. Four capitalisation typos on provenance values used to produce a
 *   terminal stop, because the enum check returned before the anchor was
 *   counted. Suppression is uniform over a pass rather than per-check, since the
 *   next such pair would otherwise need its own guard.
 *
 *   A terminal conclusion drawn from an ABSENCE needs a second, independent
 *   reconstruction before it ends anything, because one artifact cannot tell
 *   "the item states nothing" from "this reading found nothing".
 *
 * Evidence edges are NOT fields of the frozen manifest. An earlier version put
 * them there, which meant three checks demanded data that could not exist when
 * the linter ran and the bundle froze before it was authored.
 *
 * Provenance is declared, never inferred. An earlier version decided whether a
 * trace pointed at a registry invariant by matching /^INV-\d+$/, which made the
 * claim unfalsifiable and let both trace rules be defeated by renaming an id.
 *
 * Rules that need meaning are not here: handoff feasibility, entailment, and
 * "names no implementation" belong to a model actor by the document's own
 * definition of "no model".
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SUPPORTED_SCHEMA = [1];
const VERIFIER = ['mechanical', 'independent_review', 'observation'];
const STAGE = ['pre_merge', 'post_merge', 'production'];
const OBLIGATION = ['must', 'watch'];
const TEST_ROLE = ['change', 'preservation'];
const BASELINE = ['assertion_fail', 'expected_error', 'pass'];
const PROBE_KIND = ['negative_control', 'mutation'];
const HANDOFF_FIELDS = [
  'owner', 'trigger', 'verification_method', 'evidence_destination', 'failure_transition',
];
const BASELINE_ROLE = {
  assertion_fail: 'change', expected_error: 'change', pass: 'preservation',
};
const REQUIRED_TOP = [
  // `tracker` names the adapter, `item` is its opaque reference. Neither is
  // interpreted here: the workflow is not bound to a tracker, so an id shape that
  // means something to Jira must mean nothing to this linter.
  'schema_version', 'tracker', 'item', 'registry_revision', 'mandates', 'non_goals',
  'interpretation', 'claims', 'coupling', 'entails', 'entries', 'registry_selections',
];

// The reconstruction. `stated` means the item says it and resolution corroborated
// it; `stated_unverified` means the item says it and resolution could neither
// corroborate nor contradict it; `inferred` means the repository, logs, or history
// supply it; `contradicted` means the item asserts it and the repository shows
// otherwise. The fourth member came out of transcribing the pre-schema worked
// example, which carried "regression since ~July — unverified secondhand" and had
// nowhere to put the second half of that sentence.
const PROVENANCE = ['stated', 'stated_unverified', 'inferred', 'contradicted'];
const SUPPORT_KIND = ['item_locator', 'repo_path', 'log_query', 'commit', 'registry_entry'];
const RESOLUTION = ['item_wrong', 'repo_changed_since', 'ambiguous'];
const INTERPRETATION_PARTS = ['goal', 'problem', 'claim_provenance', 'corrections', 'gaps'];
// `moves_surface` is deliberately absent: a legitimate `false` is falsy, and the
// boolean check below reports its absence with a message that says what to do.
const CORRECTION_FIELDS = ['about', 'item_assertion', 'repo_finding', 'resolution', 'support'];
const GAP_FIELDS = ['element', 'filled_from'];

// Terminal findings end the run. Every one of them is a consequence of something
// the Author declared, not a judgment this script made.
const TERMINAL = [
  'X_RECONSTRUCTION_UNANCHORED', 'X_ITEM_UNANCHORED', 'X_CORRECTION_CHANGES_SCOPE',
  'X_GAP_UNRESOLVABLE', 'X_QUANTITY_ASSUMED', 'X_MOVES_SURFACE_DISPUTED',
];
// Recorded and non-gating. A warning has no available remedy, so making it a
// failure would spin a lint round on something no round can change, and making
// it terminal would stop a run on a signal that only refutes.
const WARNING = ['W_ANCHOR_DISJOINT', 'W_NO_FLOOR'];

/**
 * Every terminal code declares what it fires ON, and the property is decidable
 * from the source rather than from a judgment about what the code is "about":
 *
 *   assertion  the Author wrote a value — `moves_surface: true`,
 *              `filled_from: 'unresolved'`, two written values differing
 *   absence    nothing was written — `anyStated === false`
 *
 * That difference is what decides portability between artifacts. An assertion is
 * attributable, so it means the same thing wherever it is found and stays
 * terminal on either side. An absence is not: "the item states nothing" and
 * "this reconstructor found nothing" are indistinguishable from one artifact, so
 * an absence found on one side is a claim about that side until a second,
 * independent reconstruction corroborates it.
 *
 * An earlier version of this split keyed on "adequacy versus item property",
 * which classified the same codes correctly by accident and was undecidable from
 * the source. The tell was that it called `X_ITEM_UNANCHORED` an adequacy code
 * while its own name, its message, and the failure-mode table all called it a
 * property of the item. That was a naming bug: the two readings are now two
 * codes, and each name is accurate.
 *
 * The classification below is a declaration. The suite tests it against
 * behaviour rather than trusting it, because an assertion in a comment is the
 * same shape as the exemption that hid a bug for two commits.
 */
const TERMINAL_TRIGGER = {
  X_RECONSTRUCTION_UNANCHORED: 'absence',
  X_ITEM_UNANCHORED: 'absence',
  X_CORRECTION_CHANGES_SCOPE: 'assertion',
  X_GAP_UNRESOLVABLE: 'assertion',
  X_QUANTITY_ASSUMED: 'assertion',
  X_MOVES_SURFACE_DISPUTED: 'assertion',
};
const ABSENCE_TRIGGERED = Object.keys(TERMINAL_TRIGGER)
  .filter((k) => TERMINAL_TRIGGER[k] === 'absence');
const isTerminal = (code) => TERMINAL.includes(code);
const isWarning = (code) => WARNING.includes(code);

/**
 * A terminal conclusion may not be drawn from a document that has retryable
 * defects. Applied once over a whole pass rather than inside each check, because
 * the defect it fixes was a check-shaped guard that missed the next case.
 */
function suppressTerminals(records) {
  const retryable = records.filter((x) => x.outcome === 'fail' && x.code.startsWith('E_'));
  if (retryable.length === 0) return records;
  const codes = [...new Set(retryable.map((x) => x.code))].join(', ');
  // `provisional` is included: routing to stage 3 is a decision about the run,
  // and it must not be taken on a document that is still broken either.
  return records.map((x) => ((x.outcome === 'fail' || x.outcome === 'provisional') && isTerminal(x.code)
    ? {
      ...x,
      outcome: 'exempt',
      message: `${x.message} — terminal conclusion withheld: this pass carries ${retryable.length} `
        + `retryable finding(s) (${codes}), and a run may not stop on a document that still has fixable defects`,
    }
    : x));
}

function load(file) {
  // js-yaml 5.x already resolves under the 1.2 core schema, so passing the
  // schema explicitly changes nothing — see the YAML tests, which assert that
  // rather than pretending otherwise. It does NOT preserve comments, and it
  // does NOT keep `1.10` as a string: unquoted, that becomes the number 1.1.
  // The quantity rules below require quoting because the loader cannot help.
  return yaml.load(fs.readFileSync(file, 'utf8'), { filename: file });
}

const isGating = (e) => e.verifier === 'mechanical'
  && e.verification_stage === 'pre_merge'
  && e.obligation === 'must';

/**
 * Every code this linter can emit. The suite asserts that each one fires on some
 * fixture, which is what stops a check from being deletable — an earlier version
 * emitted 45 codes and asserted 24, and eight check sites could be removed with
 * no test failing.
 */
const CODES = [
  'E_NOT_A_MAPPING', 'E_MISSING_TOP_FIELD', 'E_UNSUPPORTED_SCHEMA', 'E_NONGOALS_EMPTY',
  'E_NO_ENTRIES', 'E_NO_ID', 'E_DUPLICATE_ID', 'E_SELECTION_NOT_AN_ENTRY', 'W_NO_FLOOR',
  'E_ENTRY_NOT_A_MAPPING', 'E_ENTRY_MISSING_FIELD', 'E_ENUM_VERIFIER', 'E_ENUM_STAGE',
  'E_ENUM_OBLIGATION', 'E_OBSERVATION_MUST', 'E_HANDOFF_MISSING', 'E_HANDOFF_INCOMPLETE',
  'E_QUANTITATIVE_UNDECLARED', 'E_QUANTITATIVE_NOT_BOOLEAN', 'E_QUANTITY_MISSING',
  'E_QUANTITY_INCOMPLETE', 'E_UNQUOTED_QUANTITY', 'E_TESTROLE_REQUIRED',
  'E_BASELINE_REQUIRED', 'E_BASELINE_ROLE_MISMATCH', 'E_EXPECTED_ERROR_UNTYPED',
  'E_TESTROLE_FORBIDDEN', 'E_EVIDENCE_IN_MANIFEST', 'E_ORPHAN_ENTRY', 'E_UNKNOWN_MANDATE',
  'E_NO_TRACE', 'E_TRACE_UNRESOLVED', 'E_SELF_TRACE', 'E_NO_UPSTREAM_TRACE',
  'E_UNANCHORED_MANDATE', 'E_ENTAILS_UNDECLARED', 'E_ENTAILS_UNRESOLVED',
  'E_ENTAILS_ALIEN_KEY',
  // interpretation, inside the boundary pass
  'E_INTERPRETATION_NOT_A_MAPPING', 'E_INTERPRETATION_MISSING_PART',
  'E_PROVENANCED_NOT_A_MAPPING', 'E_EMPTY_STATEMENT', 'E_ENUM_PROVENANCE', 'E_NO_SUPPORT',
  'E_ENUM_SUPPORT_KIND', 'E_SUPPORT_NO_REF', 'E_STATED_NO_LOCATOR',
  'E_INFERRED_NO_EXTERNAL_SUPPORT', 'E_CONTRADICTED_NO_CORRECTION',
  'E_CORRECTION_INCOMPLETE', 'E_ENUM_RESOLUTION', 'E_CORRECTION_ALIEN_TARGET',
  'E_MOVES_SURFACE_NOT_BOOLEAN', 'E_GAP_INCOMPLETE', 'E_CLAIM_PROVENANCE_UNDECLARED',
  'E_CLAIM_PROVENANCE_ALIEN_KEY', 'E_UNVERIFIED_GROUNDS_MUST', 'E_GAP_UNRESOLVED_NOT_SOUGHT',
  'E_AUTHOR_RECONSTRUCTION_INADEQUATE',
  'E_QUANTITY_NO_PROVENANCE', 'E_REVIEWER_RECONSTRUCTION_UNUSABLE', 'E_LOCATOR_UNRESOLVED',
  'X_RECONSTRUCTION_UNANCHORED', 'X_ITEM_UNANCHORED', 'X_CORRECTION_CHANGES_SCOPE',
  'X_GAP_UNRESOLVABLE', 'X_QUANTITY_ASSUMED',
  // interpretation-pair pass
  'W_ANCHOR_DISJOINT', 'X_MOVES_SURFACE_DISPUTED',
  // evidence pass
  'E_NO_BOUNDARY_DIGEST', 'E_EDGE_NO_ENTRY', 'E_EDGE_UNKNOWN_ENTRY', 'E_EDGE_ON_NONGATING',
  'E_EDGE_NO_CASE_ID', 'E_NO_EVIDENCE_EDGE', 'E_NO_SENSITIVITY_PROBE',
  'E_EDGE_BASELINE_CONFLICT', 'E_EDGE_CASE_NOT_COLLECTED',
  // CLI only: a file that will not parse never reaches a pass. It was emitted
  // here and absent from this registry, which is the exact gap the registry
  // exists to close.
  'E_PARSE',
];

/** Records outcomes, not just failures. A check that ran and passed is visible. */
function recorder() {
  const r = [];
  return {
    all: r,
    // outcome is 'fail' | 'pass' | 'exempt' | 'warn'
    add: (code, at, message) => r.push({ code, at, outcome: 'fail', message }),
    ok: (code, at) => r.push({ code, at, outcome: 'pass' }),
    exempt: (code, at, message) => r.push({ code, at, outcome: 'exempt', message }),
    warn: (code, at, message) => r.push({ code, at, outcome: 'warn', message }),
    // Halts spending, does not end the run. Reserved for an absence that a second
    // independent reconstruction can still corroborate or refute.
    provisional: (code, at, message) => r.push({ code, at, outcome: 'provisional', message }),
    // The check had a domain, ran, and refuted nothing. Distinct from `exempt`,
    // which means there was nothing to compare, and from `pass`, which for a
    // refute-only check would assert something it cannot establish. Without this
    // third word the two states collapse and the comparison branch becomes
    // deletable with the suite green.
    abstain: (code, at, message) => r.push({ code, at, outcome: 'abstain', message }),
  };
}

const failures = (records) => records.filter((x) => x.outcome === 'fail');
const warnings = (records) => records.filter((x) => x.outcome === 'warn');
const provisionals = (records) => records.filter((x) => x.outcome === 'provisional');
const abstentions = (records) => records.filter((x) => x.outcome === 'abstain');
// A code FIRED if it reported something. `pass` and `exempt` are not firing, which
// is what keeps the necessity assertion from being satisfiable by a check that
// only ever agrees.
const FIRED = ['fail', 'warn', 'provisional'];
const fired = (records) => records.filter((x) => FIRED.includes(x.outcome));

/**
 * The reconstruction, linted with one set of rules and two producers: the Author
 * writes one into the manifest at stage 2, and the Boundary-reviewer writes a
 * standalone one at stage 3 without seeing the Author's. One shape, so the two
 * are comparable.
 *
 * `claimIds` is null for a standalone interpretation, which has no `claims[]` to
 * cross-check against. Those checks record `exempt` rather than silently not
 * running, because an absent check reads exactly like a passing one.
 *
 * `terminals: false` is the reviewer's side. Its X_ conditions become one
 * retryable code, because a reviewer that reconstructs badly is a reviewer
 * problem and must not stop the run with a reason code blaming the item.
 */
function lintInterpretation(Router, interp, claimIds, base, terminals = true, absenceIsDefect = true,
  itemParts = null) {
  // Local, so the terminal policies below act on this side's findings only.
  const R = recorder();
  const { add, ok } = R;
  const standalone = claimIds === null;
  // Not-supplied and supplied-in-the-wrong-shape must not collapse to the same
  // value. `Array.isArray(x) ? … : null` made both mean no-domain, so passing the
  // loaded document instead of its parts array silently bought no locator
  // resolution and no signal — the same defect this whole pass exists to prevent,
  // built into the signature while fixing another instance of it. A caller error
  // is not an exemption.
  if (itemParts !== null && itemParts !== undefined && !Array.isArray(itemParts)) {
    throw new TypeError(
      `itemParts must be an array of addressable part ids or omitted; received ${
        Array.isArray(itemParts) ? 'array' : typeof itemParts
      }. Omitting it declares no-domain; passing the wrong shape would silently do the same.`,
    );
  }
  const parts = Array.isArray(itemParts) ? new Set(itemParts.map(String)) : null;
  const finish = (result) => {
    // Portability, by trigger. An assertion means the same thing wherever it is
    // found; an absence is a claim about the artifact that found it.
    const out = R.all.map((x) => {
      if (x.outcome !== 'fail' || !isTerminal(x.code)) return x;
      const absence = ABSENCE_TRIGGERED.includes(x.code);
      if (!absence) {
        if (terminals) return x;
        return {
          ...x,
          outcome: 'warn',
          message: `${x.message} — recorded from the reviewer's side, where an assertion is a finding to `
            + 'be compared rather than an authority to stop the run',
        };
      }
      if (!terminals) {
        // Only a defect if the other side DID anchor. When neither side anchored,
        // the reviewer's absence is the corroboration the cross-side check
        // consumes — calling it a reviewer failure would make it a retryable
        // finding, which would then suppress the very conclusion it corroborates.
        if (!absenceIsDefect) {
          return {
            ...x,
            outcome: 'warn',
            message: `${x.message} — recorded from the reviewer's side, where it corroborates the same `
              + 'absence on the Author\'s side rather than indicting either reading',
          };
        }
        return {
          code: 'E_REVIEWER_RECONSTRUCTION_UNUSABLE',
          at: x.at,
          outcome: 'fail',
          message: `the reviewer's own reconstruction triggers ${x.code} (${x.message}); the Author anchored `
            + 'and the reviewer did not, so this is a statement about the reviewer and it retries with a fresh one',
        };
      }
      // Author's side. Provisional rather than terminal: the artifact that
      // distinguishes "the item states nothing" from "this reconstructor found
      // nothing" is the reviewer's independent reconstruction, and an earlier
      // version ended the run at stage 2 with that artifact specified, evaluated,
      // and ordered out of reach.
      return {
        ...x,
        outcome: 'provisional',
        message: `${x.message} — provisional: this halts the mechanism spend and routes straight to the `
          + 'independent reconstruction, which is the only thing that can tell an unanchored item from an '
          + 'unanchored reading of it',
      };
    });
    out.forEach((x) => Router.all.push(x));
    return result;
  };

  if (!interp || typeof interp !== 'object' || Array.isArray(interp)) {
    add('E_INTERPRETATION_NOT_A_MAPPING', base, 'interpretation is not a mapping');
    return finish({ unverified: new Set() });
  }
  INTERPRETATION_PARTS.forEach((k) => {
    if (interp[k] === undefined || interp[k] === null) {
      add('E_INTERPRETATION_MISSING_PART', `${base}/${k}`, `interpretation has no ${k}`);
    } else ok('E_INTERPRETATION_MISSING_PART', `${base}/${k}`);
  });

  let anyStated = false;
  const contradicted = [];
  const unverified = new Set();

  // goal, problem, and every claim_provenance value share this shape
  const provenanced = (obj, at, id, needStatement) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      add('E_PROVENANCED_NOT_A_MAPPING', at, `${id} is not a mapping`);
      return;
    }
    if (needStatement) {
      if (typeof obj.statement === 'string' && obj.statement.trim() !== '') {
        ok('E_EMPTY_STATEMENT', at);
      } else add('E_EMPTY_STATEMENT', at, `${id} needs a non-empty statement`);
    }
    const p = obj.provenance;
    if (!PROVENANCE.includes(p)) {
      add('E_ENUM_PROVENANCE', at, `provenance must be one of ${PROVENANCE.join(' | ')}`);
      return;
    }
    ok('E_ENUM_PROVENANCE', at);
    // Counted before the support checks run, and on purpose: a `stated` that
    // cites badly is a fixable slip, and letting it also suppress the anchor
    // means a retryable failure decides a terminal one.
    if (p === 'stated' || p === 'stated_unverified') anyStated = true;
    if (p === 'stated_unverified') unverified.add(id);
    if (p === 'contradicted') contradicted.push(id);

    const sup = Array.isArray(obj.support) ? obj.support : [];
    if (sup.length === 0) {
      add('E_NO_SUPPORT', at, `${id} declares provenance ${p} and cites nothing`);
    } else ok('E_NO_SUPPORT', at);

    let locators = 0;
    let external = 0;
    sup.forEach((s, j) => {
      const sat = `${at}/support/${j}`;
      if (!s || typeof s !== 'object' || !SUPPORT_KIND.includes(s.kind)) {
        add('E_ENUM_SUPPORT_KIND', sat, `support.kind must be one of ${SUPPORT_KIND.join(' | ')}`);
        return;
      }
      ok('E_ENUM_SUPPORT_KIND', sat);
      if (!s.ref) {
        add('E_SUPPORT_NO_REF', sat, 'support carries a kind and no ref, which cites nothing');
        return;
      }
      ok('E_SUPPORT_NO_REF', sat);
      if (s.kind === 'item_locator') {
        locators += 1;
        // Resolution, not just presence. The part list is supplied by the caller —
        // by a fixture here, by the tracker adapter in production — so the check
        // is written and tested now and gets its non-circular input later without
        // being rewritten. Absent list means declared no-domain, never a silent skip.
        if (parts === null) {
          R.exempt('E_LOCATOR_UNRESOLVED', sat,
            'no addressable part list was supplied, so a locator can be checked for presence but not for '
            + 'resolution; this is the tracker adapter\'s input and its absence is declared rather than assumed');
        } else if (parts.has(String(s.ref))) {
          ok('E_LOCATOR_UNRESOLVED', sat);
        } else {
          add('E_LOCATOR_UNRESOLVED', sat,
            `${s.ref} is not an addressable part of this item (${[...parts].slice(0, 6).join(', ')}`
            + `${parts.size > 6 ? ', …' : ''}), so this citation points at nothing`);
        }
      } else external += 1;
    });

    if (p === 'stated' || p === 'stated_unverified') {
      if (locators > 0) ok('E_STATED_NO_LOCATOR', at);
      else add('E_STATED_NO_LOCATOR', at, `${id} is declared ${p}, so it must cite an item_locator saying where`);
    }
    // `stated_unverified` requires no external support on purpose: the absence of
    // corroborating evidence is what the value means. What it cannot do is ground
    // a must, which the entry loop enforces.
    if (p === 'inferred' || p === 'contradicted') {
      if (external > 0) ok('E_INFERRED_NO_EXTERNAL_SUPPORT', at);
      else {
        add('E_INFERRED_NO_EXTERNAL_SUPPORT', at,
          `${id} is declared ${p} and its only support is the item it was not in, which cites nothing`);
      }
    }
  };

  provenanced(interp.goal, `${base}/goal`, 'goal', true);
  provenanced(interp.problem, `${base}/problem`, 'problem', true);

  const cp = interp.claim_provenance && typeof interp.claim_provenance === 'object'
    && !Array.isArray(interp.claim_provenance) ? interp.claim_provenance : {};
  Object.keys(cp).forEach((k) => {
    const at = `${base}/claim_provenance/${k === '' ? '""' : k}`;
    if (standalone) {
      R.exempt('E_CLAIM_PROVENANCE_ALIEN_KEY', at,
        'standalone interpretation carries no claims[] to resolve this key against');
    } else if (claimIds.has(k)) ok('E_CLAIM_PROVENANCE_ALIEN_KEY', at);
    else {
      add('E_CLAIM_PROVENANCE_ALIEN_KEY', at,
        `${k === '' ? 'empty key' : k} is not a claim id; a typo here would otherwise read as declared provenance`);
    }
    provenanced(cp[k], at, k, false);
  });
  if (standalone) {
    R.exempt('E_CLAIM_PROVENANCE_UNDECLARED', base,
      'standalone interpretation has no claims[], so there is nothing to be undeclared');
  } else {
    claimIds.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(cp, id)) {
        ok('E_CLAIM_PROVENANCE_UNDECLARED', `${base}/claim_provenance/${id}`);
      } else {
        add('E_CLAIM_PROVENANCE_UNDECLARED', `${base}/claim_provenance`,
          `claim ${id} declares no provenance, so whether the item said it is unrecorded`);
      }
    });
  }

  const corrections = Array.isArray(interp.corrections) ? interp.corrections : [];
  const correctionTargets = new Set();
  corrections.forEach((c, i) => {
    const at = `${base}/corrections/${i}`;
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      add('E_CORRECTION_INCOMPLETE', at, 'correction is not a mapping');
      return;
    }
    const missing = CORRECTION_FIELDS.filter((k) => c[k] === undefined || c[k] === null || c[k] === '');
    if (missing.length) add('E_CORRECTION_INCOMPLETE', at, `correction missing: ${missing.join(', ')}`);
    else ok('E_CORRECTION_INCOMPLETE', at);

    if (RESOLUTION.includes(c.resolution)) ok('E_ENUM_RESOLUTION', at);
    else add('E_ENUM_RESOLUTION', at, `resolution must be one of ${RESOLUTION.join(' | ')}`);

    if (c.about !== undefined && c.about !== null) {
      const resolves = c.about === 'goal' || c.about === 'problem'
        || (standalone ? false : claimIds.has(c.about));
      if (standalone && c.about !== 'goal' && c.about !== 'problem') {
        R.exempt('E_CORRECTION_ALIEN_TARGET', at,
          'standalone interpretation carries no claims[] to resolve this target against');
        correctionTargets.add(c.about);
      } else if (resolves) {
        correctionTargets.add(c.about);
        ok('E_CORRECTION_ALIEN_TARGET', at);
      } else {
        add('E_CORRECTION_ALIEN_TARGET', at,
          `correction is about ${c.about}, which is neither goal, problem, nor a claim id`);
      }
    }

    if (c.moves_surface === true) {
      add('X_CORRECTION_CHANGES_SCOPE', at,
        `the item asserts "${c.item_assertion}" and the repository shows otherwise; correcting it moves the `
        + 'change surface, so what gets built is no longer what the item asked for and the choice has an owner');
    } else if (c.moves_surface === false) {
      ok('X_CORRECTION_CHANGES_SCOPE', at);
    } else {
      add('E_MOVES_SURFACE_NOT_BOOLEAN', at, 'correction must declare moves_surface: true | false');
    }
  });
  contradicted.forEach((id) => {
    const at = `${base} (${id})`;
    if (correctionTargets.has(id)) ok('E_CONTRADICTED_NO_CORRECTION', at);
    else {
      add('E_CONTRADICTED_NO_CORRECTION', at,
        `${id} is declared contradicted and no correction is about it, so what the repository says instead `
        + 'is unrecorded and nobody can tell whether the correction changes the scope');
    }
  });

  const gaps = Array.isArray(interp.gaps) ? interp.gaps : [];
  gaps.forEach((g, i) => {
    const at = `${base}/gaps/${i}`;
    if (!g || typeof g !== 'object' || Array.isArray(g)) {
      add('E_GAP_INCOMPLETE', at, 'gap is not a mapping');
      return;
    }
    const missing = GAP_FIELDS.filter((k) => g[k] === undefined || g[k] === null || g[k] === '');
    if (missing.length) add('E_GAP_INCOMPLETE', at, `gap missing: ${missing.join(', ')}`);
    else ok('E_GAP_INCOMPLETE', at);

    if (g.filled_from === 'unresolved') {
      // `unresolved` has to mean ESTABLISHED unsettleable, never "not filled in
      // yet". Requiring the search makes a first-draft placeholder a retryable
      // finding, which the suppression policy then stops from ending the run.
      const sought = Array.isArray(g.sought) ? g.sought : [];
      const usable = sought.filter((s) => s && SUPPORT_KIND.includes(s.kind) && s.ref);
      if (usable.length === 0) {
        add('E_GAP_UNRESOLVED_NOT_SOUGHT', at,
          `${g.element} is declared unresolved, which must mean established unsettleable rather than not `
          + 'yet filled in; sought[] must name at least one typed pointer that was checked and did not settle it');
      } else {
        ok('E_GAP_UNRESOLVED_NOT_SOUGHT', at);
        add('X_GAP_UNRESOLVABLE', at,
          `the item does not supply ${g.element}, and ${usable.length} checked source(s) do not settle it; `
          + 'filling it anyway injects an assumption into an obligation the run then verifies against');
      }
    } else if (g.filled_from !== undefined && g.filled_from !== null) {
      ok('X_GAP_UNRESOLVABLE', at);
      // A filled gap cites where the fill came from, under the same typing as
      // any other support pointer.
      const s = g.filled_from;
      if (!s || typeof s !== 'object' || !SUPPORT_KIND.includes(s.kind)) {
        add('E_ENUM_SUPPORT_KIND', `${at}/filled_from`,
          `filled_from must be the literal unresolved or a support pointer with kind of ${SUPPORT_KIND.join(' | ')}`);
      } else if (!s.ref) {
        add('E_SUPPORT_NO_REF', `${at}/filled_from`, 'filled_from carries a kind and no ref, which cites nothing');
      } else {
        ok('E_ENUM_SUPPORT_KIND', `${at}/filled_from`);
        ok('E_SUPPORT_NO_REF', `${at}/filled_from`);
      }
    }
  });

  // The sharp one. If nothing in the reconstruction is declared as something the
  // item actually says, the run reconstructed a feature from the repository and
  // labelled it with a work item.
  if (anyStated) ok('X_RECONSTRUCTION_UNANCHORED', base);
  else {
    add('X_RECONSTRUCTION_UNANCHORED', base,
      'nothing in this reconstruction is declared stated or stated_unverified, so no part of it is anchored '
      + 'in what the item says — which is either an item with no recoverable goal or a reading that failed '
      + 'to find one, and this artifact alone cannot tell those apart');
  }
  return finish({ unverified });
}

/**
 * Stage 3. Two reconstructions of the same item, the second written without
 * sight of the first. The reviewer's side is linted here under the same rules —
 * the Author's was already linted in the boundary pass — and then compared.
 *
 * Only the mechanical half of the comparison lives here: whether the two sides
 * read the same parts of the item as the requirement. Whether they MEAN the same
 * thing is semantic and belongs to the reviewer. And the check can only refute:
 * a shared locator is not evidence that either reading is right.
 */
function lintInterpretationPair(a, b, opts = {}) {
  const R = recorder();

  // Scans `stated` AND `stated_unverified`. Both mean "the item says it" and both
  // require an item_locator; scanning only `stated` disabled this check on
  // exactly the unrefined items it exists for, and self-exempted with a rationale
  // that did not hold.
  const locators = (interp) => {
    const out = new Set();
    const scan = (o) => {
      if (!o || typeof o !== 'object') return;
      if (o.provenance !== 'stated' && o.provenance !== 'stated_unverified') return;
      (Array.isArray(o.support) ? o.support : []).forEach((s) => {
        if (s && s.kind === 'item_locator' && s.ref) out.add(String(s.ref));
      });
    };
    if (!interp || typeof interp !== 'object') return out;
    scan(interp.goal);
    scan(interp.problem);
    const cp = interp.claim_provenance;
    if (cp && typeof cp === 'object' && !Array.isArray(cp)) Object.values(cp).forEach(scan);
    return out;
  };
  // Resolve the Author's provisional absence. This is the whole reason the
  // reviewer reconstructs blind, and until now the answer was computed, recorded
  // as a pass, and consumed by nothing.
  const anchored = (interp) => {
    if (!interp || typeof interp !== 'object') return false;
    const yes = (o) => !!o && typeof o === 'object'
      && (o.provenance === 'stated' || o.provenance === 'stated_unverified');
    const cp = interp.claim_provenance;
    const claims = cp && typeof cp === 'object' && !Array.isArray(cp) ? Object.values(cp) : [];
    return yes(interp.goal) || yes(interp.problem) || claims.some(yes);
  };
  const authorAnchored = anchored(a);
  const reviewerAnchored = anchored(b);

  // Lint the reviewer's side. null: no claims[] to resolve against. false: its
  // terminals belong to the reviewer, not to the item. The last argument is what
  // makes an absence there a defect or a corroboration.
  lintInterpretation(R, b, null, '/reviewer', false, authorAnchored, opts.itemParts || null);

  if (!authorAnchored && !reviewerAnchored) {
    R.add('X_ITEM_UNANCHORED', '/',
      'two independent reconstructions, cross-family and blind to each other, both found nothing the item '
      + 'states; the absence is corroborated and is a property of the item rather than of either reading, so '
      + 'the goal has an owner and it is not this run');
  } else if (!authorAnchored && reviewerAnchored) {
    R.add('E_AUTHOR_RECONSTRUCTION_INADEQUATE', '/',
      'the reviewer anchored its reconstruction in the item where the Author did not, so the Author\'s '
      + 'absence was a reading failure rather than an item property; re-author against the reviewer\'s locators');
  } else R.ok('X_ITEM_UNANCHORED', '/');

  const A = locators(a);
  const B = locators(b);
  // This check REFUTES or ABSTAINS. It never passes.
  //
  // A locator is checked for presence and never for resolution — nothing here
  // reads the item — so overlap is not evidence that either side read anything.
  // Recording `pass` was the one affirmatively misleading outcome available: the
  // stage read it as "the two readings are anchored together", and two
  // semantically opposite reconstructions both citing `description#1` produced
  // exactly that. The manufactured-agreement failure, reproduced inside the check
  // built to detect it.
  const shared = [...A].filter((x) => B.has(x));
  if (A.size === 0 || B.size === 0) {
    R.exempt('W_ANCHOR_DISJOINT', '/',
      'at least one side declares nothing the item says, so there is no locator set to compare; the '
      + 'finding on that side is its own, and this comparison has no domain');
  } else if (A.size === 1 && B.size === 1 && shared.length === 1) {
    // The same condition as the branch above, widened rather than a new rule:
    // one locator each, identical, is a set with no discriminating power. A
    // single shared default string is the cheapest possible false concurrence.
    R.exempt('W_ANCHOR_DISJOINT', '/',
      `both reconstructions rest on the single locator ${shared[0]} and nothing else, so the sets cannot `
      + 'discriminate: identical readings and opposite readings are indistinguishable here. Nothing is '
      + 'established either way and the semantic divergence test is the whole signal');
  } else if (shared.length > 0) {
    // A real comparison over two discriminating sets, which refuted nothing. That
    // is a different state from having nothing to compare, and recording both as
    // `exempt` made this branch deletable with the whole suite green.
    R.abstain('W_ANCHOR_DISJOINT', '/',
      `the two reconstructions cite ${shared.join(', ')} in common out of ${A.size} and ${B.size} locators, `
      + 'which refutes a disjoint reading and establishes nothing about whether they read it the same way; '
      + 'only the semantic divergence test does that');
  } else {
    // Warning, not failure: no authoring round can fix a disjoint reading, and
    // locator overlap is not reading agreement in either direction.
    R.warn('W_ANCHOR_DISJOINT', '/',
      `the two reconstructions cite no item locator in common (${[...A].join(', ')} vs ${[...B].join(', ')}), `
      + 'so they may be reading different parts of the item as the requirement; this refutes overlap and '
      + 'establishes nothing on its own, so the semantic divergence test decides');
  }

  // The counterweight moves_surface did not have. Nothing compared the two sides,
  // so the terminal only ever fired from one side's own declaration and the
  // common case — a blind reviewer that never rediscovers the contradiction —
  // was clean.
  const byTarget = (interp) => {
    const m = new Map();
    const cs = interp && typeof interp === 'object' && Array.isArray(interp.corrections)
      ? interp.corrections : [];
    cs.forEach((c) => {
      if (c && typeof c === 'object' && c.about !== undefined && typeof c.moves_surface === 'boolean') {
        m.set(c.about, c.moves_surface);
      }
    });
    return m;
  };
  const MA = byTarget(a);
  const MB = byTarget(b);
  const disputed = [...MA.keys()].filter((k) => MB.has(k) && MB.get(k) !== MA.get(k));
  if (MA.size === 0 || MB.size === 0) {
    R.exempt('X_MOVES_SURFACE_DISPUTED', '/',
      'one side declares no correction with a boolean moves_surface, so there is no pair to compare; a '
      + 'reviewer that does not rediscover the contradiction is not agreement about its scope');
  } else if (disputed.length > 0) {
    R.add('X_MOVES_SURFACE_DISPUTED', '/',
      `the two reconstructions disagree about whether correcting ${disputed.join(', ')} moves the change `
      + 'surface; the declaration is self-serving to under-report and this is the only thing that checks it');
  } else R.ok('X_MOVES_SURFACE_DISPUTED', '/');

  return suppressTerminals(R.all);
}

function lintBoundary(doc, opts = {}) {
  const R = recorder();
  const f = R.all;
  const add = R.add;
  const ok = R.ok;

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    add('E_NOT_A_MAPPING', '/', 'boundary did not parse to a mapping');
    return f;
  }

  REQUIRED_TOP.forEach((k) => {
    if (doc[k] === undefined || doc[k] === null) {
      add('E_MISSING_TOP_FIELD', `/${k}`, `required manifest field ${k} is absent`);
    }
  });
  if (doc.schema_version !== undefined && !SUPPORTED_SCHEMA.includes(doc.schema_version)) {
    add('E_UNSUPPORTED_SCHEMA', '/schema_version',
      `schema_version ${doc.schema_version} is not one this linter knows (${SUPPORTED_SCHEMA.join(', ')})`);
  }

  const arr = (v) => (Array.isArray(v) ? v : []);
  const entries = arr(doc.entries);
  const mandates = arr(doc.mandates);
  const coupling = arr(doc.coupling);
  const claims = arr(doc.claims);
  const selections = arr(doc.registry_selections);
  const entails = doc.entails && typeof doc.entails === 'object' && !Array.isArray(doc.entails)
    ? doc.entails : {};

  if (!Array.isArray(doc.non_goals) || doc.non_goals.length === 0) {
    add('E_NONGOALS_EMPTY', '/non_goals', 'non-goals must be present and non-empty');
  } else ok('E_NONGOALS_EMPTY', '/non_goals');
  if (entries.length === 0) add('E_NO_ENTRIES', '/entries', 'boundary has no entries');

  // ids live in one namespace because traces resolve across all three
  const seen = new Map();
  const claimIds = new Set();
  const couplingIds = new Set();
  const entryIds = new Set();
  const note = (id, kind, at) => {
    if (id === undefined || id === null || id === '') {
      add('E_NO_ID', at, `${kind} has no id`);
      return;
    }
    if (seen.has(id)) {
      add('E_DUPLICATE_ID', at,
        `id ${id} is already used by ${seen.get(id)}; every resolution check keys on ids`);
    } else {
      seen.set(id, `${kind} at ${at}`);
    }
  };
  claims.forEach((c, i) => { note(c && c.id, 'claim', `/claims/${i}`); if (c && c.id) claimIds.add(c.id); });
  coupling.forEach((c, i) => { note(c && c.id, 'coupling edge', `/coupling/${i}`); if (c && c.id) couplingIds.add(c.id); });
  entries.forEach((e, i) => { note(e && e.id, 'entry', `/entries/${i}`); if (e && e.id) entryIds.add(e.id); });

  // declared provenance: a selection must be an entry, since selecting a floor
  // invariant means it appears as an obligation
  const selected = new Set(selections);
  selections.forEach((id, i) => {
    if (!entryIds.has(id)) {
      add('E_SELECTION_NOT_AN_ENTRY', `/registry_selections/${i}`,
        `${id} is declared registry-selected but is not an entry id`);
    }
  });

  // The floor is selected, not authored — and nothing checked that it ever was.
  // An empty selection list read exactly like a satisfied one, so a manifest
  // whose obligations are entirely self-authored passed in silence, and
  // `registry_revision: "none"` passed with it because a revision and a word
  // meaning "there isn't one" are both just strings.
  //
  // Warning rather than failure, and the distinction is the W_ contract: where
  // no registry exists there is no remedy, so a retryable finding would spin an
  // authoring round on something no round can fix. What the document cannot be
  // allowed to do is stay quiet about it.
  if (selections.length === 0) {
    R.warn('W_NO_FLOOR', '/registry_selections',
      'no entry is declared registry-selected, so every obligation here was authored for this item '
      + 'and the manifest carries no floor; the grounding for a selected floor does not apply to this '
      + 'boundary, and an empty list is not a claim that none was available');
  } else ok('W_NO_FLOOR', '/registry_selections');

  // After claim ids exist, because claim_provenance resolves against them.
  // Absence is already E_MISSING_TOP_FIELD, so only a present value is linted.
  let unverifiedClaims = new Set();
  if (doc.interpretation !== undefined && doc.interpretation !== null) {
    ({ unverified: unverifiedClaims } = lintInterpretation(
      R, doc.interpretation, claimIds, '/interpretation', true, true, opts.itemParts || null,
    ));
  }

  const mandatesUsed = new Set();

  entries.forEach((e, i) => {
    const at = `/entries/${i}${e && e.id ? ` (${e.id})` : ''}`;
    if (!e || typeof e !== 'object') {
      add('E_ENTRY_NOT_A_MAPPING', at, 'entry is not a mapping');
      return;
    }
['statement', 'observation', 'decision'].forEach((k) => {
      if (e[k]) ok('E_ENTRY_MISSING_FIELD', `${at}/${k}`);
      else add('E_ENTRY_MISSING_FIELD', at, `entry has no ${k}`);
    });

if (VERIFIER.includes(e.verifier)) ok('E_ENUM_VERIFIER', at);
    else add('E_ENUM_VERIFIER', at, `verifier must be one of ${VERIFIER.join(' | ')}`);
    if (STAGE.includes(e.verification_stage)) ok('E_ENUM_STAGE', at);
    else add('E_ENUM_STAGE', at, `verification_stage must be one of ${STAGE.join(' | ')}`);
    if (OBLIGATION.includes(e.obligation)) ok('E_ENUM_OBLIGATION', at);
    else add('E_ENUM_OBLIGATION', at, `obligation must be one of ${OBLIGATION.join(' | ')}`);

    if (!(e.verifier === 'observation' && e.obligation === 'must')) ok('E_OBSERVATION_MUST', at);
    else {
      add('E_OBSERVATION_MUST', at,
        'observation + must cannot gate; author it as watch or supply a mechanical / independent_review proxy');
    }

    const later = e.verification_stage === 'post_merge' || e.verification_stage === 'production';
    if (later && e.obligation === 'must') {
      if (!e.handoff || typeof e.handoff !== 'object') {
        add('E_HANDOFF_MISSING', at, `${e.verification_stage} + must requires a handoff object`);
      } else {
const missing = HANDOFF_FIELDS.filter((k) => !e.handoff[k]);
        if (missing.length) add('E_HANDOFF_INCOMPLETE', at, `handoff missing: ${missing.join(', ')}`);
        else ok('E_HANDOFF_INCOMPLETE', at);
      }
    }

    // quantities. `quantitative` is declared because no script can read a
    // statement and decide whether it asserts a number.
    if (e.quantitative === undefined) {
      add('E_QUANTITATIVE_UNDECLARED', at,
        'entry must declare quantitative: true | false');
    } else if (e.quantitative === true) {
      const q = e.quantity;
      if (!q || typeof q !== 'object') {
        add('E_QUANTITY_MISSING', at, 'quantitative entry requires a quantity object');
      } else {
        ok('E_QUANTITY_MISSING', at);
        ['value', 'unit', 'conditions'].forEach((k) => {
          if (q[k] === undefined || q[k] === '') {
            add('E_QUANTITY_INCOMPLETE', at, `quantity missing ${k}`);
          }
        });
        // The loader turns an unquoted 1.10 into 1.1 and silently changes a
        // threshold. It cannot be configured out, so require the string form.
        if (q.value !== undefined && typeof q.value !== 'string') {
          add('E_UNQUOTED_QUANTITY', at,
            `quantity.value must be a quoted string; ${JSON.stringify(q.value)} was parsed as ${typeof q.value}, `
            + 'and an unquoted 1.10 becomes 1.1');
        }
        // Provenance at the point of use. A gaps[] entry elsewhere in the manifest
        // proved nothing: emptying gaps[] left the threshold standing and clean,
        // so the parallel record was decorative and False Precision Bias
        // (RubricBench :1278) had no mechanical counterpart.
        const src = q.filled_from;
        if (src === 'unresolved') {
          add('X_QUANTITY_ASSUMED', at,
            `quantity.value ${JSON.stringify(q.value)} is declared to come from nothing that settles it, so `
            + 'the threshold this entry gates on is an assumption; the number has an owner');
        } else if (!src || typeof src !== 'object' || !SUPPORT_KIND.includes(src.kind) || !src.ref) {
          add('E_QUANTITY_NO_PROVENANCE', at,
            'a quantitative entry must declare quantity.filled_from as a typed support pointer or the literal '
            + `unresolved; without it ${JSON.stringify(q.value)} cites nothing at the point it is used`);
        } else {
          ok('E_QUANTITY_NO_PROVENANCE', at);
          ok('X_QUANTITY_ASSUMED', at);
        }
      }
    } else if (e.quantitative !== false) {
      add('E_QUANTITATIVE_NOT_BOOLEAN', at, 'quantitative must be true or false');
    }

    if (isGating(e)) {
      if (TEST_ROLE.includes(e.test_role)) ok('E_TESTROLE_REQUIRED', at);
      else add('E_TESTROLE_REQUIRED', at, `mechanical + pre_merge + must requires test_role of ${TEST_ROLE.join(' | ')}`);
      if (BASELINE.includes(e.baseline)) ok('E_BASELINE_REQUIRED', at);
      else add('E_BASELINE_REQUIRED', at, `mechanical + pre_merge + must requires baseline of ${BASELINE.join(' | ')}`);
      if (BASELINE.includes(e.baseline) && TEST_ROLE.includes(e.test_role)
          && BASELINE_ROLE[e.baseline] !== e.test_role) {
        add('E_BASELINE_ROLE_MISMATCH', at,
          `baseline ${e.baseline} is only legal with test_role ${BASELINE_ROLE[e.baseline]}`);
      }
      if (e.baseline === 'expected_error' && (!e.error_code || !e.error_pattern)) {
        add('E_EXPECTED_ERROR_UNTYPED', at, 'baseline expected_error requires error_code and error_pattern');
      }
    } else if (e.test_role !== undefined || e.baseline !== undefined) {
      add('E_TESTROLE_FORBIDDEN', at,
        'test_role and baseline are only meaningful on mechanical + pre_merge + must');
    }
    if (e.evidence !== undefined) {
      add('E_EVIDENCE_IN_MANIFEST', at,
        'evidence edges are a stage-4 artifact and cannot be fields of a manifest frozen at stage 3');
    }

    const m = Array.isArray(e.mandate) ? e.mandate : [];
    if (m.length === 0) add('E_ORPHAN_ENTRY', at, 'entry maps to no mandate');
    m.forEach((name) => {
      mandatesUsed.add(name);
      if (!mandates.includes(name)) add('E_UNKNOWN_MANDATE', at, `mandate ${name} is not declared in /mandates`);
      else ok('E_UNKNOWN_MANDATE', at);
    });

    // traces anchor an obligation to a requirement stated outside the boundary
    const tr = Array.isArray(e.traces) ? e.traces : [];
    if (tr.length === 0) add('E_NO_TRACE', at, 'entry has no traces'); else ok('E_NO_TRACE', at);
    let upstream = 0;
    const uncorroborated = [];
    tr.forEach((t) => {
      const self = t === e.id;
      const isSelection = selected.has(t);
      if (!claimIds.has(t) && !couplingIds.has(t) && !entryIds.has(t)) {
        add('E_TRACE_UNRESOLVED', at, `trace ${t} resolves to no claim, coupling edge, or entry`);
        return;
      }
      if (self && !isSelection) {
        add('E_SELF_TRACE', at,
          `trace ${t} is the entry's own id and the entry is not declared registry-selected, so it anchors nothing`);
        return;
      }
      if (self && isSelection) {
        // Visible on purpose. When this exemption was silent it read exactly like
        // approval, which is how a per-issue entry wearing a registry-shaped id
        // passed two rules unnoticed.
        R.exempt('E_SELF_TRACE', at,
          `self-trace exempted because ${t} is declared in registry_selections`);
      } else {
        ok('E_SELF_TRACE', at);
      }
      if (claimIds.has(t) || couplingIds.has(t) || (self && isSelection)) upstream += 1;
      // A claim the resolution pass could neither corroborate nor contradict is
      // still an anchor; it is just not one a gating obligation can rest on.
      if (claimIds.has(t) && unverifiedClaims.has(t)) uncorroborated.push(t);
    });
    if (tr.length > 0 && upstream === 0) {
      add('E_NO_UPSTREAM_TRACE', at,
        'at least one trace must reach a claim, a coupling edge, or this entry as a declared registry '
        + 'selection; tracing only other obligations records a relationship and does not anchor');
    }
    // Provenance constrains the obligation graph. The predicate is "cites an
    // uncorroborated claim at all", not "has no corroborated anchor": the weaker
    // form was defeated by adding one coupling-edge trace, and coupling traces are
    // the normal case rather than an exotic one. A coupling edge is a different
    // anchor, not corroboration of the claim.
    if (e.obligation === 'must') {
      if (uncorroborated.length === 0) ok('E_UNVERIFIED_GROUNDS_MUST', at);
      else {
        add('E_UNVERIFIED_GROUNDS_MUST', at,
          `this must traces ${uncorroborated.join(', ')}, declared stated_unverified, so it gates partly on an `
          + 'item assertion nothing corroborates; verify the claim, drop the trace if a coupling edge is the '
          + 'real anchor, or author the obligation as watch');
      }
    }
  });

  mandates.forEach((name) => {
    if (!mandatesUsed.has(name)) add('E_UNANCHORED_MANDATE', '/mandates', `mandate ${name} has no entry`);
  });

  // entails: every coupling edge covered, and no key outside the coupling space
  coupling.forEach((c, i) => {
    if (!c || !c.id) return;
    const at = `/coupling/${i} (${c.id})`;
    if (!(c.id in entails)) {
      add('E_ENTAILS_UNDECLARED', at, `coupling edge ${c.id} is neither mapped in /entails nor marked uncovered`);
      return;
    }
    const target = entails[c.id];
    if (target !== 'uncovered' && !entryIds.has(target)) {
      add('E_ENTAILS_UNRESOLVED', at, `/entails/${c.id} points at ${target}, which is not an entry id`);
    } else ok('E_ENTAILS_UNRESOLVED', at);
  });
  Object.keys(entails).forEach((k) => {
    if (!couplingIds.has(k)) {
      add('E_ENTAILS_ALIEN_KEY', `/entails/${k === '' ? '""' : k}`,
        `${k === '' ? 'empty key' : k} is not a coupling edge id; a typo here would otherwise read as coverage`);
    }
  });

  return suppressTerminals(f);
}

/** Stage 5. Runs once tests exist, against the frozen boundary. */
function lintEvidence(boundary, ev, opts = {}) {
  const R = recorder();
  const f = R.all;
  const add = R.add;
  const ok = R.ok;
  if (!ev || typeof ev !== 'object') {
    add('E_NOT_A_MAPPING', '/', 'evidence did not parse to a mapping');
    return f;
  }
  const entries = Array.isArray(boundary.entries) ? boundary.entries : [];
  const byId = new Map(entries.filter((e) => e && e.id).map((e) => [e.id, e]));
  const gating = entries.filter((e) => e && isGating(e));
  const edges = Array.isArray(ev.edges) ? ev.edges : [];
  if (opts.collectedCases !== null && opts.collectedCases !== undefined
      && !Array.isArray(opts.collectedCases)) {
    throw new TypeError(
      'collectedCases must be an array of collected test case ids or omitted; omitting it declares '
      + 'no-domain, and passing the wrong shape would silently do the same.',
    );
  }
  const collected = Array.isArray(opts.collectedCases) ? new Set(opts.collectedCases.map(String)) : null;

  if (!ev.boundary_digest) {
    add('E_NO_BOUNDARY_DIGEST', '/boundary_digest',
      'evidence must name the frozen bundle digest it was written against');
  } else ok('E_NO_BOUNDARY_DIGEST', '/boundary_digest');

  const covered = new Set();
  const caseBaselines = new Map();
  edges.forEach((edge, i) => {
    const at = `/edges/${i}`;
    if (!edge || !edge.entry) { add('E_EDGE_NO_ENTRY', at, 'edge names no entry'); return; }
    if (!byId.has(edge.entry)) {
      add('E_EDGE_UNKNOWN_ENTRY', at, `edge names ${edge.entry}, which is not an entry in the boundary`);
      return;
    }
    const e = byId.get(edge.entry);
    if (!isGating(e)) {
      add('E_EDGE_ON_NONGATING', at,
        `${edge.entry} is not mechanical + pre_merge + must, so it takes no test evidence`);
      return;
    }
    if (!edge.case_id) {
      add('E_EDGE_NO_CASE_ID', at, 'edge must name a collected test case id, not a file');
      return;
    }
    ok('E_EDGE_NO_CASE_ID', at);
    // Collectability. The list of ids the runner actually collected is supplied by
    // the caller — a fixture here, the runner in production — so the membership
    // check exists and is tested before the runner does.
    if (collected === null) {
      R.exempt('E_EDGE_CASE_NOT_COLLECTED', at,
        'no collected-case list was supplied, so an edge can be checked for naming a case id but not for '
        + "naming one that exists; this is the runner's input and its absence is declared rather than assumed");
    } else if (collected.has(String(edge.case_id))) {
      ok('E_EDGE_CASE_NOT_COLLECTED', at);
    } else {
      add('E_EDGE_CASE_NOT_COLLECTED', at,
        `${edge.case_id} is not a case the runner collected, so this entry's evidence is a phantom: the `
        + 'gate would report a pass for a test that never ran');
    }
    covered.add(edge.entry);
    if (!caseBaselines.has(edge.case_id)) caseBaselines.set(edge.case_id, []);
    caseBaselines.get(edge.case_id).push({ at, baseline: e.baseline });

    if (e.test_role === 'preservation'
        && (!edge.probe || !PROBE_KIND.includes(edge.probe.kind) || !edge.probe.ref)) {
      add('E_NO_SENSITIVITY_PROBE', at,
        `${edge.entry} is preservation, so the edge requires probe.kind of ${PROBE_KIND.join(' | ')} with a ref, `
        + 'or the entry must be reclassified as independent_review');
    } else if (e.test_role === 'preservation') {
      ok('E_NO_SENSITIVITY_PROBE', at);
    }
  });

  gating.forEach((e) => {
    if (!covered.has(e.id)) {
      add('E_NO_EVIDENCE_EDGE', `/edges (${e.id})`, `gating entry ${e.id} has no evidence edge`);
    }
  });

  for (const [caseId, list] of caseBaselines) {
    const distinct = [...new Set(list.map((x) => x.baseline))];
    if (distinct.length > 1) {
      add('E_EDGE_BASELINE_CONFLICT', list.map((x) => x.at).join(', '),
        `test case ${caseId} carries conflicting baselines: ${distinct.join(', ')}`);
    }
  }
  return f;
}

function main(argv) {
  const args = argv.slice(2);
  const evIdx = args.indexOf('--evidence');
  const evFile = evIdx >= 0 ? args[evIdx + 1] : null;
  const files = evIdx >= 0 ? args.slice(0, evIdx) : args;
  if (files.length === 0) {
    process.stderr.write('usage: lint-boundary.js <boundary.yaml> [...] [--evidence <evidence.yaml>]\n');
    return 2;
  }
  let bad = 0;
  for (const file of files) {
    let findings;
    let warned = [];
    let doc = null;
    try {
      doc = load(file);
      const records = lintBoundary(doc);
      findings = failures(records);
      warned = warnings(records);
      if (evFile && files.length === 1) findings = findings.concat(failures(lintEvidence(doc, load(evFile))));
    } catch (err) {
      findings = [{ code: 'E_PARSE', at: '/', message: err.message }];
    }
    const name = path.basename(file);
    for (const w of warned) process.stdout.write(`warn  ${name}  ${w.code}  ${w.at}\n        ${w.message}\n`);
    if (findings.length === 0) process.stdout.write(`ok    ${name}\n`);
    else {
      bad += 1;
      const term = findings.filter((x) => isTerminal(x.code)).length;
      process.stdout.write(`FAIL  ${name}  (${findings.length}${term ? `, ${term} terminal` : ''})\n`);
      for (const x of findings) {
        // Terminal findings are marked because the caller's response differs: a
        // fixable finding earns another lint round, a terminal one ends the run.
        process.stdout.write(`        ${isTerminal(x.code) ? 'TERMINAL ' : ''}${x.code}  ${x.at}\n`);
        process.stdout.write(`          ${x.message}\n`);
      }
    }
  }
  return bad === 0 ? 0 : 1;
}

module.exports = {
  lintBoundary, lintInterpretationPair, lintEvidence, load, isGating, failures,
  warnings, provisionals, abstentions, fired, isTerminal, isWarning, suppressTerminals,
  CODES, TERMINAL, WARNING, TERMINAL_TRIGGER, ABSENCE_TRIGGERED,
};

if (require.main === module) process.exit(main(process.argv));
