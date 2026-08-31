'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  lintBoundary, lintInterpretationPair, lintEvidence, load, failures, warnings,
  provisionals, abstentions, fired, isTerminal, isWarning, CODES, TERMINAL, WARNING,
  TERMINAL_TRIGGER, ABSENCE_TRIGGERED,
} = require('../lint-boundary');

const FIX = path.join(__dirname, '..', '..', 'tests', 'fixtures');
const at = (n) => path.join(FIX, n);

// The linter records outcomes, not only failures, so a positive fixture can
// assert which checks ran. These helpers narrow to failures; the outcome suite
// below asserts on the rest.
const bCodes = (n) => failures(lintBoundary(load(at(n)))).map((f) => f.code).sort();
const eCodes = (n) => failures(lintEvidence(load(at('valid.yaml')), load(at(n)))).map((f) => f.code).sort();
const outcomes = (n, o) => [...new Set(
  lintBoundary(load(at(n))).filter((r) => r.outcome === o).map((r) => r.code),
)].sort();

describe('boundary pass — stages 2 and 3, before the freeze', () => {
  test('the valid manifest is clean', () => {
    expect(bCodes('valid.yaml')).toEqual([]);
  });

  // The load-bearing regression. An earlier version decided whether a trace
  // pointed at a registry invariant by matching /^INV-\d+$/, so renaming an id
  // flipped the verdict on byte-identical content. Provenance is now declared in
  // registry_selections, and this test is what stops that from coming back.
  test('a verdict does not depend on how an id is spelled', () => {
    const src = fs.readFileSync(at('valid.yaml'), 'utf8');
    const renamed = src.replace(/INV-2/g, 'RES-2');
    expect(renamed).not.toEqual(src);
    expect(failures(lintBoundary(yaml.load(renamed))).map((f) => f.code)).toEqual([]);
  });

  const cases = [
    ['bad-observation_must.yaml', ['E_HANDOFF_MISSING', 'E_OBSERVATION_MUST']],
    ['bad-handoff_missing.yaml', ['E_HANDOFF_MISSING']],
    ['bad-baseline_mismatch.yaml', ['E_BASELINE_ROLE_MISMATCH']],
    ['bad-expected_error_untyped.yaml', ['E_EXPECTED_ERROR_UNTYPED']],
    ['bad-testrole_forbidden.yaml', ['E_TESTROLE_FORBIDDEN']],
    ['bad-orphan_and_unanchored.yaml', ['E_ORPHAN_ENTRY', 'E_UNANCHORED_MANDATE']],
    ['bad-self_trace.yaml', ['E_NO_UPSTREAM_TRACE', 'E_SELF_TRACE']],
    ['bad-no_upstream_trace.yaml', ['E_NO_UPSTREAM_TRACE']],
    ['bad-entails_undeclared.yaml', ['E_ENTAILS_UNDECLARED']],
    ['bad-entails_alien_key.yaml', ['E_ENTAILS_ALIEN_KEY']],
    ['bad-duplicate_id.yaml', ['E_DUPLICATE_ID', 'E_TRACE_UNRESOLVED']],
    ['bad-missing_top_field.yaml', ['E_MISSING_TOP_FIELD']],
    ['bad-unsupported_schema.yaml', ['E_UNSUPPORTED_SCHEMA']],
    ['bad-selection_not_an_entry.yaml', ['E_SELECTION_NOT_AN_ENTRY']],
    ['bad-quantitative_undeclared.yaml', ['E_QUANTITATIVE_UNDECLARED']],
    ['bad-quantity_incomplete.yaml', ['E_QUANTITY_INCOMPLETE']],
    ['bad-unquoted_quantity.yaml', ['E_UNQUOTED_QUANTITY']],
    ['bad-evidence_in_manifest.yaml', ['E_EVIDENCE_IN_MANIFEST']],
    // Non-gating, so it reports no failure — the warning itself is asserted below.
    ['bad-no_floor.yaml', []],
    // The three terminal codes get hand-written fixtures rather than mutations,
    // because their consequence is ending a run: an exact code set is the claim
    // that nothing else fired and nothing else is being ended for.
    // Provisional, so it is not a failure: an unanchored reading halts the spend
    // and routes to the reviewer rather than ending the run. Asserted below.
    ['bad-item_unanchored.yaml', []],
    ['bad-correction_moves_surface.yaml', ['X_CORRECTION_CHANGES_SCOPE']],
    ['bad-gap_unresolvable.yaml', ['X_GAP_UNRESOLVABLE']],
    // Two occurrences, and asserted as two: AC-1 and AC-4 both trace only C1.
    ['bad-unverified_grounds_must.yaml',
      ['E_UNVERIFIED_GROUNDS_MUST', 'E_UNVERIFIED_GROUNDS_MUST']],
  ];
  test.each(cases)('%s reports exactly %p', (file, expected) => {
    expect(bCodes(file)).toEqual([...expected].sort());
  });

  // The floor is supposed to be SELECTED from a pinned registry rather than
  // authored for the issue, and nothing checked that it ever was. An empty
  // registry_selections read exactly like a satisfied one, so a manifest whose
  // obligations are entirely self-authored passed with no signal — the silent
  // half of the three-outcome rule the scripts in this plugin are held to.
  const warnCodes = (n) => warnings(lintBoundary(load(at(n)))).map((w) => w.code);

  test('a manifest that selects no floor says so', () => {
    expect(warnCodes('bad-no_floor.yaml')).toEqual(['W_NO_FLOOR']);
  });

  test('a manifest that selects a floor does not', () => {
    expect(warnCodes('valid.yaml')).not.toContain('W_NO_FLOOR');
  });

  // Guards the skeleton's input rather than any logic here. A failure would stop
  // the run at the boundary stage, so the gate and the handoff it is supposed to
  // prove would never be reached — and the skeleton suite would fail somewhere
  // far less obvious than this.
  test('the walking skeleton freezes a boundary that carries no failure', () => {
    expect(bCodes('walking-skeleton.yaml')).toEqual([]);
    expect(warnCodes('walking-skeleton.yaml')).toEqual(['W_NO_FLOOR']);
  });

  // The prefix is the contract: E_ retryable, W_ warning, X_ terminal. Asserting
  // the partition is what stops a code being quietly reclassified — a terminal
  // demoted to retryable spins a cap, and a retryable promoted to terminal ends a
  // run on something an authoring round would have fixed.
  test('the three code prefixes partition the registry', () => {
    const byPrefix = (p) => CODES.filter((c) => c.startsWith(p)).sort();
    expect(byPrefix('X_')).toEqual(TERMINAL.slice().sort());
    expect(byPrefix('W_')).toEqual(WARNING.slice().sort());
    expect(byPrefix('E_').length + TERMINAL.length + WARNING.length).toBe(CODES.length);
    TERMINAL.forEach((c) => expect(isTerminal(c)).toBe(true));
    WARNING.forEach((c) => expect(isWarning(c)).toBe(true));
    expect(isTerminal('E_NO_TRACE')).toBe(false);
    expect(isTerminal('W_ANCHOR_DISJOINT')).toBe(false);
  });
});

// The reconstruction. Work items are unrefined, incorrect, and incomplete, so
// this block is what the rest of the boundary descends from — and a wrong
// reconstruction passes every gate after it. These are the rules that make the
// interpretation checkable rather than decorative.
describe('interpretation — the item is evidence, not a specification', () => {
  const mut = (f) => {
    const d = clone(load(at('valid.yaml')));
    f(d.interpretation, d);
    return track([...new Set(failures(lintBoundary(d)).map((x) => x.code))].sort());
  };

  test('a filled gap must cite what it was filled from', () => {
    expect(mut((i) => { i.gaps[0].filled_from = { kind: 'log_query' }; }))
      .toEqual(['E_SUPPORT_NO_REF']);
    expect(mut((i) => { i.gaps[0].filled_from = { kind: 'vibes', ref: 'x' }; }))
      .toEqual(['E_ENUM_SUPPORT_KIND']);
  });

  test('a stated claim must point at where the item says it', () => {
    expect(mut((i) => { i.claim_provenance.C1.support = [{ kind: 'repo_path', ref: 'a.py' }]; }))
      .toEqual(['E_STATED_NO_LOCATOR']);
  });

  // Assumption injection: an inference whose only support is the item it was not
  // in cites nothing. RubricBench calls the judged version False Precision Bias.
  test('an inference must cite something outside the item', () => {
    expect(mut((i) => { i.goal.support = [{ kind: 'item_locator', ref: 'description#1' }]; }))
      .toEqual(['E_INFERRED_NO_EXTERNAL_SUPPORT']);
  });

  test('a contradicted claim must have a correction saying what the repo shows instead', () => {
    expect(mut((i) => { i.corrections = []; })).toEqual(['E_CONTRADICTED_NO_CORRECTION']);
    expect(mut((i) => { i.corrections[0].about = 'C1'; }))
      .toEqual(['E_CONTRADICTED_NO_CORRECTION']);
    expect(mut((i) => { i.corrections[0].about = 'NOPE'; }))
      .toEqual(['E_CONTRADICTED_NO_CORRECTION', 'E_CORRECTION_ALIEN_TARGET']);
  });

  test('moves_surface is declared, never defaulted', () => {
    expect(mut((i) => { delete i.corrections[0].moves_surface; }))
      .toEqual(['E_MOVES_SURFACE_NOT_BOOLEAN']);
  });

  test('every claim declares its provenance, and no key invents one', () => {
    expect(mut((i) => { delete i.claim_provenance.C3; }))
      .toEqual(['E_CLAIM_PROVENANCE_UNDECLARED']);
    expect(mut((i, d) => { i.claim_provenance.C9 = clone(i.claim_provenance.C1); }))
      .toEqual(['E_CLAIM_PROVENANCE_ALIEN_KEY']);
  });

  test.each(['goal', 'problem', 'claim_provenance', 'corrections', 'gaps'])(
    'deleting interpretation.%s is reported', (k) => {
      expect(mut((i) => { delete i[k]; })).toContain('E_INTERPRETATION_MISSING_PART');
    },
  );

  test('a goal with no statement is not a goal', () => {
    expect(mut((i) => { i.goal.statement = '   '; })).toEqual(['E_EMPTY_STATEMENT']);
  });

  // A `stated` that cites badly is a fixable slip. Letting it also suppress the
  // anchor would let a retryable failure decide a terminal one.
  test('a badly-cited stated claim is retryable, not terminal', () => {
    const codes = mut((i) => { i.claim_provenance.C1.support = []; });
    expect(codes).toContain('E_NO_SUPPORT');
    expect(codes).not.toContain('X_ITEM_UNANCHORED');
  });

  test('unresolved must mean established unsettleable, not not-yet-filled', () => {
    // The literal used to do double duty, so an honest first-draft placeholder
    // ended the run with no round available to replace it.
    const codes = mut((i) => { i.gaps[0] = { element: 'e', filled_from: 'unresolved' }; });
    expect(codes).toContain('E_GAP_UNRESOLVED_NOT_SOUGHT');
    expect(codes).not.toContain('X_GAP_UNRESOLVABLE');
  });

  // RubricBench :1278 — False Precision Bias. This is the check that makes it
  // mechanical; gaps[] alone was a parallel record that enforced nothing.
  describe('a quantity cites its origin at the point of use', () => {
    const q = (f) => {
      const d = clone(load(at('valid.yaml')));
      const e = d.entries.find((x) => x.quantitative === true);
      f(e.quantity);
      return track([...new Set(failures(lintBoundary(d)).map((x) => x.code))].sort());
    };

    test('a threshold with no declared origin is reported', () => {
      expect(q((x) => { delete x.filled_from; })).toEqual(['E_QUANTITY_NO_PROVENANCE']);
      expect(q((x) => { x.filled_from = { kind: 'vibes', ref: 'x' }; }))
        .toEqual(['E_QUANTITY_NO_PROVENANCE']);
      expect(q((x) => { x.filled_from = { kind: 'repo_path' }; }))
        .toEqual(['E_QUANTITY_NO_PROVENANCE']);
    });

    test('a threshold declared to come from nothing is terminal', () => {
      expect(q((x) => { x.filled_from = 'unresolved'; })).toEqual(['X_QUANTITY_ASSUMED']);
    });

    // The regression guard on the sentence hugh falsified: emptying gaps[] used to
    // leave AC-1's 240 standing and the manifest clean.
    test('emptying gaps[] no longer leaves a threshold unaccounted for', () => {
      const d = clone(load(at('valid.yaml')));
      d.interpretation.gaps = [];
      const e = d.entries.find((x) => x.quantitative === true);
      expect(e.quantity.value).toBe('240');
      expect(e.quantity.filled_from).toBeDefined();
      delete e.quantity.filled_from;
      expect(track([...new Set(failures(lintBoundary(d)).map((x) => x.code))]))
        .toContain('E_QUANTITY_NO_PROVENANCE');
    });
  });
});

// A terminal conclusion may not be drawn from a document that has retryable
// defects. This was one check-shaped guard that missed the next case; it is now
// one policy over a whole pass.
describe('terminal findings are suppressed while anything is still fixable', () => {
  test('four capitalisation typos no longer end the run', () => {
    const d = clone(load(at('valid.yaml')));
    const i = d.interpretation;
    i.goal.provenance = 'Inferred';
    i.problem.provenance = 'Stated';
    i.claim_provenance.C1.provenance = 'Stated';
    i.claim_provenance.C3.provenance = 'Contradicted';
    const records = lintBoundary(d);
    const codes = track(fired(records).map((x) => x.code));
    expect(codes).toContain('E_ENUM_PROVENANCE');
    expect(codes.filter(isTerminal)).toEqual([]);
    // Suppressed, not absent. An absent check reads like a passing one.
    const held = records.filter((r) => r.code === 'X_RECONSTRUCTION_UNANCHORED');
    expect(held.map((r) => r.outcome)).toEqual(['exempt']);
    expect(held[0].message).toContain('terminal conclusion withheld');
  });

  // X_ITEM_UNANCHORED and X_MOVES_SURFACE_DISPUTED are pair-pass only, so they
  // have no trigger reachable from a single manifest.
  test.each(TERMINAL.filter((c) => c !== 'X_MOVES_SURFACE_DISPUTED' && c !== 'X_ITEM_UNANCHORED'))(
    '%s is suppressed when a retryable finding is present', (code) => {
      // Every terminal condition, crossed with one unrelated retryable defect.
      const trigger = {
        X_RECONSTRUCTION_UNANCHORED: (d) => {
          d.interpretation.problem.provenance = 'inferred';
          d.interpretation.problem.support = [{ kind: 'repo_path', ref: 'a.py' }];
          d.interpretation.claim_provenance.C1.provenance = 'inferred';
          d.interpretation.claim_provenance.C1.support = [{ kind: 'commit', ref: 'abc' }];
        },
        X_CORRECTION_CHANGES_SCOPE: (d) => { d.interpretation.corrections[0].moves_surface = true; },
        X_GAP_UNRESOLVABLE: (d) => {
          d.interpretation.gaps[0] = {
            element: 'e', filled_from: 'unresolved', sought: [{ kind: 'commit', ref: 'abc' }],
          };
        },
        X_QUANTITY_ASSUMED: (d) => {
          d.entries.find((x) => x.quantitative === true).quantity.filled_from = 'unresolved';
        },
      }[code];

      const alone = clone(load(at('valid.yaml')));
      trigger(alone);
      expect(track(fired(lintBoundary(alone)).map((x) => x.code))).toContain(code);

      const withDefect = clone(load(at('valid.yaml')));
      trigger(withDefect);
      delete withDefect.entries[0].decision; // one unrelated retryable finding
      const codes = track(fired(lintBoundary(withDefect)).map((x) => x.code));
      expect(codes).toContain('E_ENTRY_MISSING_FIELD');
      expect(codes).not.toContain(code);
    },
  );
});

// Stage 3. The Boundary-reviewer reconstructs the item without seeing the
// Author's reconstruction, so the two are comparable. Only the mechanical half of
// the comparison is here: whether they read the same parts of the item.
describe('two blind reconstructions', () => {
  const interp = (locator) => ({
    goal: { statement: 'g', provenance: 'inferred', support: [{ kind: 'repo_path', ref: 'a.py' }] },
    problem: {
      statement: 'p',
      provenance: 'stated',
      support: [{ kind: 'item_locator', ref: locator }],
    },
    claim_provenance: {},
    corrections: [],
    gaps: [],
  });
  const pCodes = (a, b) => track(failures(lintInterpretationPair(a, b)).map((x) => x.code));
  const pWarn = (a, b) => track(warnings(lintInterpretationPair(a, b)).map((x) => x.code));

  test('a shared locator is not a divergence', () => {
    expect(pCodes(interp('description#1'), interp('description#1'))).toEqual([]);
  });

  // This check refutes or abstains; it must never pass. `pass` was read one stage
  // up as "the two readings are anchored together", and a locator is checked for
  // presence and never for resolution, so overlap is not evidence that either
  // side read anything.
  test('the check never reports concurrence, at any overlap', () => {
    const outcomesFor = (a, b) => lintInterpretationPair(a, b)
      .filter((r) => r.code === 'W_ANCHOR_DISJOINT')
      .map((r) => r.outcome);
    const many = (locs) => {
      const i = interp(locs[0]);
      i.claim_provenance = Object.fromEntries(locs.slice(1).map((l, n) => [`C${n + 1}`, {
        provenance: 'stated', support: [{ kind: 'item_locator', ref: l }],
      }]));
      return i;
    };
    // Three distinct states, three distinct words. `exempt` means there was
    // nothing to compare; `abstain` means a real comparison refuted nothing.
    // Recording both as `exempt` made the comparison branch deletable with the
    // suite green — the same collapse as toEqual([]) on a positive fixture, in
    // outcome form.
    expect(outcomesFor(interp('description#1'), interp('description#1'))).toEqual(['exempt']);
    expect(outcomesFor(many(['description#1', 'description#2']), many(['description#1', 'comment#5'])))
      .toEqual(['abstain']);
    expect(outcomesFor(interp('description#1'), interp('comment#7'))).toEqual(['warn']);
    // No configuration of the inputs produces a pass.
    const combos = [['description#1', 'description#1'], ['description#1', 'comment#7']];
    combos.forEach(([x, y]) => {
      expect(outcomesFor(interp(x), interp(y))).not.toContain('pass');
    });
  });

  // The guard on the collapse itself: if `abstain` is merged back into `exempt`,
  // or the comparison branch is made unreachable by widening the degenerate one,
  // this is the assertion that notices.
  test('a real comparison that refutes nothing is recorded as having happened', () => {
    const many = (locs) => {
      const i = interp(locs[0]);
      i.claim_provenance = Object.fromEntries(locs.slice(1).map((l, n) => [`C${n + 1}`, {
        provenance: 'stated', support: [{ kind: 'item_locator', ref: l }],
      }]));
      return i;
    };
    const records = lintInterpretationPair(
      many(['description#1', 'description#2']),
      many(['description#1', 'comment#5']),
    );
    const a = abstentions(records).filter((r) => r.code === 'W_ANCHOR_DISJOINT');
    expect(a).toHaveLength(1);
    expect(a[0].message).toContain('out of 2 and 2 locators');
    // And it is not any of the other outcomes.
    ['exempt', 'pass', 'warn', 'fail'].forEach((o) => {
      expect(records.filter((r) => r.code === 'W_ANCHOR_DISJOINT' && r.outcome === o)).toEqual([]);
    });
  });

  // Two semantically opposite readings, both citing the same default locator, used
  // to come back with an affirmative pass — the manufactured-agreement failure
  // reproduced inside the check built to detect it.
  test('opposite readings on one shared locator are not reported as agreement', () => {
    const reading = (statement) => {
      const i = interp('description#1');
      i.problem.statement = statement;
      return i;
    };
    const records = lintInterpretationPair(
      reading('exports are too slow for large accounts'),
      reading('the retry button double-submits and corrupts the manifest'),
    );
    const w = records.filter((r) => r.code === 'W_ANCHOR_DISJOINT');
    expect(w.map((r) => r.outcome)).toEqual(['exempt']);
    expect(w[0].message).toContain('cannot');
    expect(failures(records)).toEqual([]);
  });

  // A disjoint reading has no authoring remedy, and locator overlap is not reading
  // agreement in either direction. So it is recorded and non-gating: it requires
  // the semantic differential test rather than standing in for it.
  test('no locator in common is a warning, not a failure', () => {
    expect(pWarn(interp('description#1'), interp('comment#4'))).toEqual(['W_ANCHOR_DISJOINT']);
    expect(pCodes(interp('description#1'), interp('comment#4'))).toEqual([]);
  });

  // The check used to scan only `stated`, so it self-exempted on exactly the
  // unrefined items the design is built for — the more of an item that is
  // uncorroborated, the more likely the comparison silently had no domain.
  test('stated_unverified parts are compared too', () => {
    const un = (loc) => {
      const i = interp(loc);
      i.problem.provenance = 'stated_unverified';
      return i;
    };
    expect(pWarn(un('description#1'), un('comment#7'))).toEqual(['W_ANCHOR_DISJOINT']);
    expect(pWarn(un('description#1'), un('description#1'))).toEqual([]);
  });

  // The counterweight moves_surface did not have. Nothing compared the two sides,
  // so a terminal only ever fired from one side's own declaration.
  describe('moves_surface is compared across the two sides', () => {
    const withCorrection = (moves) => {
      const i = interp('description#1');
      i.corrections = [{
        about: 'goal',
        item_assertion: 'x',
        repo_finding: 'y',
        resolution: 'item_wrong',
        support: [{ kind: 'repo_path', ref: 'a.py' }],
        moves_surface: moves,
      }];
      return i;
    };

    test.each([[false, true], [true, false]])(
      'author %p against reviewer %p is disputed in both directions', (av, bv) => {
        expect(pCodes(withCorrection(av), withCorrection(bv)))
          .toContain('X_MOVES_SURFACE_DISPUTED');
      },
    );

    test('agreement in either direction is not disputed', () => {
      expect(pCodes(withCorrection(false), withCorrection(false)))
        .not.toContain('X_MOVES_SURFACE_DISPUTED');
      expect(pCodes(withCorrection(true), withCorrection(true)))
        .not.toContain('X_MOVES_SURFACE_DISPUTED');
    });

    // A reviewer that never rediscovers the contradiction has not agreed about
    // its scope, so the comparison must record no domain rather than a pass.
    test('a reviewer with no corrections is exempt, not agreement', () => {
      const records = lintInterpretationPair(withCorrection(true), interp('description#1'));
      const d = records.filter((r) => r.code === 'X_MOVES_SURFACE_DISPUTED');
      expect(d.map((r) => r.outcome)).toEqual(['exempt']);
    });
  });

  // Agreement is not correctness. This check can only refute, and a side with no
  // locator at all is a defect on that side rather than a disjoint reading.
  test('a side that cites nothing is exempted, not silently agreed with', () => {
    const bare = interp('description#1');
    bare.problem.provenance = 'inferred';
    bare.problem.support = [{ kind: 'repo_path', ref: 'a.py' }];
    const records = lintInterpretationPair(interp('description#1'), bare);
    const disjoint = records.filter((r) => r.code === 'W_ANCHOR_DISJOINT');
    expect(disjoint.map((r) => r.outcome)).toEqual(['exempt']);
    // A bad reviewer reconstruction is a reviewer problem. It used to end the run
    // as X_ITEM_UNANCHORED, with a message blaming the item for having no owner.
    expect(track(failures(records).map((r) => r.code)))
      .toEqual(['E_REVIEWER_RECONSTRUCTION_UNUSABLE']);
  });

  test('no terminal code can be reached from the reviewer side', () => {
    const bad = interp('description#1');
    bad.problem.provenance = 'inferred';
    bad.problem.support = [{ kind: 'repo_path', ref: 'a.py' }];
    bad.corrections = [{
      about: 'goal',
      item_assertion: 'x',
      repo_finding: 'y',
      resolution: 'ambiguous',
      support: [{ kind: 'repo_path', ref: 'a.py' }],
      moves_surface: true,
    }];
    bad.gaps = [{ element: 'e', filled_from: 'unresolved', sought: [{ kind: 'commit', ref: 'abc' }] }];
    const reviewerSide = lintInterpretationPair(interp('description#1'), bad)
      .filter((r) => String(r.at).startsWith('/reviewer') && r.outcome === 'fail');
    expect(reviewerSide.length).toBeGreaterThan(0);
    reviewerSide.forEach((r) => expect(isTerminal(r.code)).toBe(false));
  });

  // The reviewer's side has no claims[], so the claim cross-checks are exempt
  // rather than absent — an absent check reads exactly like a passing one.
  test('the reviewer side lints under the same rules, with the claim checks exempt', () => {
    const records = lintInterpretationPair(interp('description#1'), interp('description#1'));
    const exempt = records.filter((r) => r.outcome === 'exempt').map((r) => r.code);
    expect(exempt).toContain('E_CLAIM_PROVENANCE_UNDECLARED');
    expect(failures(records)).toEqual([]);
  });

  test('a malformed reviewer reconstruction is a finding, not a pass', () => {
    const broken = interp('description#1');
    delete broken.gaps;
    expect(track(failures(lintInterpretationPair(interp('description#1'), broken))
      .map((r) => r.code))).toContain('E_INTERPRETATION_MISSING_PART');
    expect(track(failures(lintInterpretationPair(interp('description#1'), 'nope'))
      .map((r) => r.code))).toContain('E_INTERPRETATION_NOT_A_MAPPING');
  });
});

// The mechanism that hid the spelling bug: toEqual([]) cannot tell "every check
// ran and passed" from "a check never ran". A per-issue entry wearing a
// registry-shaped id was exempted from the self-trace rule, and the exemption
// read exactly like approval. Positive fixtures now assert a positive set.
describe('evaluated, not merely not-failed', () => {
  test('the valid manifest evaluates the checks it is meant to', () => {
    expect(outcomes('valid.yaml', 'pass')).toEqual(expect.arrayContaining([
      'E_ENUM_VERIFIER', 'E_ENUM_STAGE', 'E_ENUM_OBLIGATION',
      'E_HANDOFF_INCOMPLETE', 'E_NO_TRACE', 'E_ENTAILS_UNRESOLVED',
      'E_TESTROLE_REQUIRED', 'E_BASELINE_REQUIRED', 'E_UNKNOWN_MANDATE',
      'E_QUANTITY_MISSING', 'E_NONGOALS_EMPTY', 'E_OBSERVATION_MUST',
      'E_ENTRY_MISSING_FIELD',
    ]));
  });

  test('every exemption in the valid manifest is visible and named', () => {
    // INV-2 self-traces and is declared registry-selected. Silence here is what
    // let an undeclared per-issue entry through before. E_LOCATOR_UNRESOLVED joins
    // it when no addressable part list is supplied: the check has no domain, and
    // saying so is the difference between a declared limit and a silent pass.
    expect(outcomes('valid.yaml', 'exempt'))
      .toEqual(['E_LOCATOR_UNRESOLVED', 'E_SELF_TRACE']);
  });

  test('an entry that is not registry-selected gets no exemption, it gets a failure', () => {
    // Scoped to the claim: E_SELF_TRACE specifically is not exempted here. The
    // no-domain exemptions are a different subject and asserting their absence
    // would make this test about something it is not about.
    expect(outcomes('bad-self_trace.yaml', 'exempt')).not.toContain('E_SELF_TRACE');
    expect(bCodes('bad-self_trace.yaml')).toContain('E_SELF_TRACE');
  });
});

describe('evidence pass — stage 5, once tests exist', () => {
  test('the valid evidence map is clean against the valid manifest', () => {
    expect(eCodes('valid-evidence.yaml')).toEqual([]);
  });

  const cases = [
    ['bad-ev_no_probe.yaml', ['E_NO_SENSITIVITY_PROBE']],
    ['bad-ev_baseline_conflict.yaml', ['E_EDGE_BASELINE_CONFLICT']],
    ['bad-ev_missing_edge.yaml', ['E_NO_EVIDENCE_EDGE']],
    ['bad-ev_nongating.yaml', ['E_EDGE_ON_NONGATING', 'E_NO_EVIDENCE_EDGE']],
  ];
  test.each(cases)('%s reports exactly %p', (file, expected) => {
    expect(eCodes(file)).toEqual([...expected].sort());
  });
});

describe('the YAML typing hazard is real and the loader cannot fix it', () => {
  // An earlier version of this suite claimed three tests "prove NO, on, off and
  // 1.10 survive as strings". That was false twice over: js-yaml 5.2.3 resolves
  // identically with and without the CORE_SCHEMA option, so those tests did not
  // discriminate, and the 1.10 case quoted its own input and asserted a tautology.
  const withOpt = (s) => yaml.load(s, { schema: yaml.CORE_SCHEMA });
  const without = (s) => yaml.load(s);

  test.each([['a: NO'], ['a: on'], ['a: off'], ['a: 1.10']])(
    'the CORE_SCHEMA option changes nothing for %s, so asserting it proves nothing',
    (src) => {
      expect(withOpt(src)).toEqual(without(src));
    },
  );

  test('an unquoted 1.10 really does become 1.1 — the hazard is unmitigated in the loader', () => {
    expect(without('value: 1.10').value).toBe(1.1);
    expect(withOpt('value: 1.10').value).toBe(1.1);
  });

  test('the linter is what mitigates it, by requiring the quoted form', () => {
    expect(bCodes('bad-unquoted_quantity.yaml')).toEqual(['E_UNQUOTED_QUANTITY']);
    expect(load(at('valid.yaml')).entries.find((e) => e.id === 'AC-1').quantity.value)
      .toBe('240');
  });
});

// ---------------------------------------------------------------------------
// Generated coverage. Hand-written negatives share the blind spot of whoever
// wrote the rules: 22 of them missed the same defect 9 of them missed. These
// suites enumerate the closed spaces instead, and the last one asserts that no
// check in the linter is deletable without a test failing.
// ---------------------------------------------------------------------------

const LB = lintBoundary;
const LE = lintEvidence;

const clone = (o) => JSON.parse(JSON.stringify(o));
const V = () => clone(load(at('valid.yaml')));
const EV = () => clone(load(at('valid-evidence.yaml')));
const fCodes = (doc) => [...new Set(failures(LB(doc)).map((x) => x.code))].sort();
const evCodes = (b, e) => [...new Set(failures(LE(b, e)).map((x) => x.code))].sort();

// Everything the suite exercises, for the necessity assertion at the end.
const exercised = new Set();
const track = (codes) => { codes.forEach((c) => exercised.add(c)); return codes; };

describe('generated — closed enums are total', () => {
  const fields = [
    ['verifier', 'E_ENUM_VERIFIER'],
    ['verification_stage', 'E_ENUM_STAGE'],
    ['obligation', 'E_ENUM_OBLIGATION'],
  ];
  test.each(fields)('an out-of-domain %s reports %s', (field, code) => {
    const d = V();
    d.entries[0][field] = 'NOT_A_MEMBER';
    expect(track(fCodes(d))).toContain(code);
  });

  test('every cell of the 18-cell cross-product is decided', () => {
    const undecided = [];
    for (const verifier of ['mechanical', 'independent_review', 'observation']) {
      for (const stage of ['pre_merge', 'post_merge', 'production']) {
        for (const obligation of ['must', 'watch']) {
          const d = V();
          const e = d.entries[0];
          Object.assign(e, { verifier, verification_stage: stage, obligation });
          delete e.test_role; delete e.baseline; delete e.handoff;
          const codes = track(fCodes(d));
          const gating = verifier === 'mechanical' && stage === 'pre_merge' && obligation === 'must';
          const later = stage === 'post_merge' || stage === 'production';
          const expectFail = gating
            || (verifier === 'observation' && obligation === 'must')
            || (later && obligation === 'must');
          const failed = codes.length > 0;
          if (failed !== expectFail) undecided.push(`${verifier}/${stage}/${obligation} -> ${codes.join(',') || 'clean'}`);
        }
      }
    }
    expect(undecided).toEqual([]);
  });
});

describe('generated — required fields are all enforced', () => {
  const top = ['schema_version', 'tracker', 'item', 'registry_revision', 'mandates',
    'non_goals', 'interpretation', 'claims', 'coupling', 'entails', 'entries',
    'registry_selections'];
  test.each(top)('deleting /%s reports a missing-field error', (k) => {
    const d = V();
    delete d[k];
    expect(track(fCodes(d)).length).toBeGreaterThan(0);
  });

  test.each(['statement', 'observation', 'decision'])(
    'deleting entry.%s reports E_ENTRY_MISSING_FIELD', (k) => {
      const d = V();
      delete d.entries[0][k];
      expect(track(fCodes(d))).toContain('E_ENTRY_MISSING_FIELD');
    },
  );

  const handoff = ['owner', 'trigger', 'verification_method', 'evidence_destination', 'failure_transition'];
  test.each(handoff)('deleting handoff.%s reports E_HANDOFF_INCOMPLETE', (k) => {
    const d = V();
    const e = d.entries.find((x) => x.handoff);
    delete e.handoff[k];
    expect(track(fCodes(d))).toContain('E_HANDOFF_INCOMPLETE');
  });
});

describe('generated — the remaining codes', () => {
  test('malformed inputs and edge shapes', () => {
    track(fCodes(null));
    track(fCodes({ ...V(), schema_version: 42 }));
    track(fCodes({ ...V(), entries: [] }));
    track(fCodes((() => { const d = V(); d.entries[0] = 'not a mapping'; return d; })()));
    track(fCodes((() => { const d = V(); delete d.entries[0].id; return d; })()));
    track(fCodes((() => { const d = V(); d.entries[0].traces = []; return d; })()));
    track(fCodes((() => { const d = V(); d.entries[0].traces = ['NOPE']; return d; })()));
    track(fCodes((() => { const d = V(); d.entries[0].mandate = ['not-declared']; return d; })()));
    track(fCodes((() => { const d = V(); d.non_goals = []; return d; })()));
    track(fCodes((() => { const d = V(); d.entails['CPL-1'] = 'NOPE'; return d; })()));
    track(fCodes((() => { const d = V(); d.entries[0].quantitative = 'yes'; return d; })()));
    track(fCodes((() => {
      const d = V(); const e = d.entries.find((x) => x.quantitative === true);
      delete e.quantity; return d;
    })()));
    track(fCodes((() => { const d = V(); d.interpretation = 'not a mapping'; return d; })()));
    track(fCodes((() => { const d = V(); d.interpretation.goal = 'not a mapping'; return d; })()));
    track(fCodes((() => { const d = V(); d.interpretation.goal.provenance = 'rumour'; return d; })()));
    track(fCodes((() => { const d = V(); delete d.interpretation.corrections[0].item_assertion; return d; })()));
    track(fCodes((() => { const d = V(); d.interpretation.corrections[0].resolution = 'meh'; return d; })()));
    track(fCodes((() => { const d = V(); delete d.interpretation.gaps[0].element; return d; })()));
    track(fCodes((() => { const d = V(); d.interpretation.gaps[0] = 'not a mapping'; return d; })()));
    track(fCodes((() => { const d = V(); d.interpretation.corrections[0] = 'not a mapping'; return d; })()));
    const b = V();
    track(evCodes(b, null));
    track(evCodes(b, (() => { const e = EV(); delete e.boundary_digest; return e; })()));
    track(evCodes(b, (() => { const e = EV(); delete e.edges[0].entry; return e; })()));
    track(evCodes(b, (() => { const e = EV(); e.edges[0].entry = 'NOPE'; return e; })()));
    track(evCodes(b, (() => { const e = EV(); delete e.edges[0].case_id; return e; })()));
    expect(true).toBe(true);
  });
});

// A weakening keyed on a value no fixture carries evades an exact-code-set
// assertion: `moves_surface === true && resolution !== 'ambiguous'` passed all 95
// tests, because the fixture carries `item_wrong`. Generated cells have no
// unoccupied regions to hide in.
describe('generated — terminal checks against every value they could be keyed on', () => {
  const RESOLUTION = ['item_wrong', 'repo_changed_since', 'ambiguous'];
  const PROVENANCE = ['stated', 'stated_unverified', 'inferred', 'contradicted'];

  const cross = [];
  for (const resolution of RESOLUTION) for (const moves of [true, false]) cross.push([resolution, moves]);

  test.each(cross)('a correction with resolution %s and moves_surface %p is decided', (resolution, moves) => {
    const d = V();
    const c = d.interpretation.corrections[0];
    c.resolution = resolution;
    c.moves_surface = moves;
    const codes = track(fCodes(d));
    // Terminal exactly when the surface moves, at every resolution value.
    expect(codes.includes('X_CORRECTION_CHANGES_SCOPE')).toBe(moves);
  });

  test.each(PROVENANCE)('the anchor is decided at provenance %s on every part', (p) => {
    const d = V();
    d.interpretation.goal.provenance = p;
    d.interpretation.problem.provenance = p;
    Object.values(d.interpretation.claim_provenance).forEach((v) => { v.provenance = p; });
    const records = lintBoundary(d);
    track(failures(records).map((x) => x.code));
    // Anchored iff the item is declared to say something, at every value.
    const anchored = p === 'stated' || p === 'stated_unverified';
    const anchor = records.filter((r) => r.code === 'X_RECONSTRUCTION_UNANCHORED');
    expect(anchor.length).toBe(1);
    expect(anchor[0].outcome === 'pass').toBe(anchored);
  });

  test.each(['unresolved', 'pointer', 'absent'])('filled_from %s is decided on a gap', (kind) => {
    const d = V();
    const g = d.interpretation.gaps[0];
    if (kind === 'unresolved') {
      g.filled_from = 'unresolved';
      g.sought = [{ kind: 'commit', ref: 'abc' }];
    } else if (kind === 'absent') delete g.filled_from;
    const codes = track(fCodes(d));
    expect(codes.includes('X_GAP_UNRESOLVABLE')).toBe(kind === 'unresolved');
    expect(codes.includes('E_GAP_INCOMPLETE')).toBe(kind === 'absent');
  });

  test.each(['unresolved', 'pointer', 'absent'])('quantity.filled_from %s is decided', (kind) => {
    const d = V();
    const q = d.entries.find((x) => x.quantitative === true).quantity;
    if (kind === 'unresolved') q.filled_from = 'unresolved';
    else if (kind === 'absent') delete q.filled_from;
    const codes = track(fCodes(d));
    expect(codes.includes('X_QUANTITY_ASSUMED')).toBe(kind === 'unresolved');
    expect(codes.includes('E_QUANTITY_NO_PROVENANCE')).toBe(kind === 'absent');
  });
});

// A terminal's trigger decides whether it survives moving between artifacts. The
// classification is declared in TERMINAL_TRIGGER; these tests are what make it a
// claim about behaviour rather than a comment.
describe('portability — assertions travel, absences do not', () => {
  const side = (interp, over) => ({
    goal: { statement: 'g', provenance: 'inferred', support: [{ kind: 'repo_path', ref: 'a.py' }] },
    problem: {
      statement: 'p',
      provenance: 'stated',
      support: [{ kind: 'item_locator', ref: 'description#1' }],
    },
    claim_provenance: {},
    corrections: [],
    gaps: [],
    ...interp,
    ...over,
  });
  const anchoredSide = () => side({});
  const unanchoredSide = () => side({
    problem: {
      statement: 'p', provenance: 'inferred', support: [{ kind: 'repo_path', ref: 'a.py' }],
    },
  });
  const assertionSide = () => side({
    gaps: [{ element: 'e', filled_from: 'unresolved', sought: [{ kind: 'commit', ref: 'abc' }] }],
  });

  test('every terminal code declares a trigger, and only those two values exist', () => {
    expect(Object.keys(TERMINAL_TRIGGER).sort()).toEqual(TERMINAL.slice().sort());
    Object.values(TERMINAL_TRIGGER).forEach((t) => expect(['assertion', 'absence']).toContain(t));
    expect(ABSENCE_TRIGGERED.sort()).toEqual(['X_ITEM_UNANCHORED', 'X_RECONSTRUCTION_UNANCHORED']);
  });

  // 1. An assertion stays terminal on the author's side.
  test('an assertion on the author side is terminal', () => {
    const d = clone(load(at('valid.yaml')));
    d.interpretation.gaps[0] = {
      element: 'e', filled_from: 'unresolved', sought: [{ kind: 'commit', ref: 'abc' }],
    };
    expect(track(failures(lintBoundary(d)).map((x) => x.code))).toContain('X_GAP_UNRESOLVABLE');
  });

  // 2. The same assertion, same content, on the reviewer's side: recorded, not a
  //    stop, and NOT converted into a reviewer defect — it is an input to compare.
  test('the same assertion on the reviewer side is a recorded finding', () => {
    const records = lintInterpretationPair(anchoredSide(), assertionSide());
    const g = records.filter((r) => r.code === 'X_GAP_UNRESOLVABLE');
    expect(g.map((r) => r.outcome)).toEqual(['warn']);
    expect(failures(records).map((r) => r.code)).not.toContain('E_REVIEWER_RECONSTRUCTION_UNUSABLE');
  });

  // 3. An absence on the author's side is provisional, never terminal alone.
  test('an absence on the author side is provisional, not terminal', () => {
    const records = lintBoundary(load(at('bad-item_unanchored.yaml')));
    expect(failures(records)).toEqual([]);
    const p = provisionals(records);
    expect(p.map((r) => r.code)).toEqual(['X_RECONSTRUCTION_UNANCHORED']);
    expect(p[0].message).toContain('provisional');
    track(p.map((r) => r.code));
  });

  // 4. An absence on the reviewer's side is a statement about the reviewer.
  test('an absence on the reviewer side is a reviewer defect', () => {
    const records = lintInterpretationPair(anchoredSide(), unanchoredSide());
    expect(track(failures(records).map((r) => r.code)))
      .toContain('E_REVIEWER_RECONSTRUCTION_UNUSABLE');
    expect(failures(records).map((r) => r.code).filter(isTerminal)).toEqual([]);
  });

  // 5. Corroborated by two blind readings, the absence becomes an item property.
  //    This is the resolution the design specified, evaluated, and never reached.
  test('two independent absences corroborate into an item property', () => {
    const both = lintInterpretationPair(unanchoredSide(), unanchoredSide());
    expect(track(failures(both).map((r) => r.code))).toContain('X_ITEM_UNANCHORED');

    const authorOnly = lintInterpretationPair(unanchoredSide(), anchoredSide());
    const codes = track(failures(authorOnly).map((r) => r.code));
    expect(codes).toContain('E_AUTHOR_RECONSTRUCTION_INADEQUATE');
    expect(codes).not.toContain('X_ITEM_UNANCHORED');

    expect(track(failures(lintInterpretationPair(anchoredSide(), anchoredSide()))
      .map((r) => r.code))).not.toContain('X_ITEM_UNANCHORED');
  });
});

// Two cells hugh's sweep flagged as terminal-adjacent and unoccupied by any
// fixture: an exclusion mutation keyed on either survived the whole suite.
describe('terminal-adjacent enum cells the fixtures do not occupy', () => {
  // Asserting the code appears ANYWHERE in the document is not the claim: other
  // entries produce it, so the assertion passes while the entry under test is
  // silently excluded. The finding has to be located at the entry in the cell.
  const firedAt = (d, id) => track(fired(lintBoundary(d))
    .filter((x) => String(x.at).includes(`(${id})`))
    .map((x) => x.code));

  test('X_QUANTITY_ASSUMED fires at every stage and verifier a quantity can sit on', () => {
    const cells = [
      ['mechanical', 'pre_merge', 'must'],
      ['mechanical', 'production', 'must'],
      ['independent_review', 'post_merge', 'must'],
      ['observation', 'production', 'watch'],
    ];
    cells.forEach(([verifier, verification_stage, obligation]) => {
      const d = clone(load(at('valid.yaml')));
      const e = d.entries.find((x) => x.id === 'W-1');
      Object.assign(e, { verifier, verification_stage, obligation });
      delete e.test_role; delete e.baseline;
      if (verification_stage !== 'pre_merge' && obligation === 'must') {
        e.handoff = {
          owner: 'o', trigger: 't', verification_method: 'm',
          evidence_destination: 'd', failure_transition: 'f',
        };
      }
      if (verifier === 'mechanical' && verification_stage === 'pre_merge' && obligation === 'must') {
        e.test_role = 'change'; e.baseline = 'assertion_fail';
      }
      e.quantitative = true;
      e.quantity = { value: '1', unit: 'u', conditions: 'c', filled_from: 'unresolved' };
      expect(firedAt(d, 'W-1')).toContain('X_QUANTITY_ASSUMED');
    });
  });

  test('E_UNVERIFIED_GROUNDS_MUST fires on every must, not only pre-merge mechanical ones', () => {
    const musts = [
      ['mechanical', 'pre_merge'],
      ['mechanical', 'production'],
      ['independent_review', 'post_merge'],
      ['independent_review', 'pre_merge'],
    ];
    musts.forEach(([verifier, verification_stage]) => {
      const d = clone(load(at('valid.yaml')));
      d.interpretation.claim_provenance.C1.provenance = 'stated_unverified';
      const e = d.entries.find((x) => x.id === 'AC-7');
      Object.assign(e, { verifier, verification_stage, traces: ['C1'] });
      if (verification_stage === 'pre_merge') {
        delete e.handoff;
        if (verifier === 'mechanical') { e.test_role = 'change'; e.baseline = 'assertion_fail'; }
      }
      expect(firedAt(d, 'AC-7')).toContain('E_UNVERIFIED_GROUNDS_MUST');
    });
  });
});

// Two checks whose PRODUCTION input needs infrastructure that does not exist, and
// whose check-and-test half needed neither. Both were written off as "blocked on
// infrastructure" for two rounds; both passes already took a second artifact, so
// the list is threaded in as a parameter — a fixture here, the adapter and the
// runner in production. The infrastructure later feeds an already-tested check
// rather than arriving alongside an untested one.
describe('resolution, not just presence — parameterized now, fed later', () => {
  const partsOf = (n) => yaml.load(fs.readFileSync(at(n), 'utf8')).parts;
  const casesOf = (n) => yaml.load(fs.readFileSync(at(n), 'utf8')).cases;
  const PARTS = () => partsOf('valid-item-parts.yaml');
  const CASES = () => casesOf('valid-collected-cases.yaml');

  test('the positive fixtures are clean against their supplied lists', () => {
    const b = load(at('valid.yaml'));
    expect(failures(lintBoundary(b, { itemParts: PARTS() }))).toEqual([]);
    expect(failures(lintEvidence(b, load(at('valid-evidence.yaml')), { collectedCases: CASES() })))
      .toEqual([]);
  });

  // This is L1: a fabricated citation on a two-paragraph item used to lint
  // completely clean, and closing it was said to need the tracker adapter.
  test('a fabricated locator is caught today', () => {
    const d = clone(load(at('valid.yaml')));
    d.interpretation.problem.support = [
      { kind: 'item_locator', ref: 'description#4093' },
      { kind: 'log_query', ref: 'q' },
    ];
    const codes = track(failures(lintBoundary(d, { itemParts: PARTS() })).map((x) => x.code));
    expect(codes).toEqual(['E_LOCATOR_UNRESOLVED']);
    // And without the list it is exactly as invisible as it was.
    expect(failures(lintBoundary(d))).toEqual([]);
  });

  test('a phantom test-case id is caught today', () => {
    const b = load(at('valid.yaml'));
    const ev = clone(load(at('valid-evidence.yaml')));
    ev.edges[0].case_id = 'tests/nope.py::test_phantom';
    expect(track(failures(lintEvidence(b, ev, { collectedCases: CASES() })).map((x) => x.code)))
      .toEqual(['E_EDGE_CASE_NOT_COLLECTED']);
    expect(failures(lintEvidence(b, ev))).toEqual([]);
  });

  // An absent list is DECLARED no-domain, never a silent skip. Without this the
  // two checks would read as passing on every existing call site.
  test('an absent list is recorded as no-domain, not as a pass', () => {
    const noParts = lintBoundary(load(at('valid.yaml')))
      .filter((r) => r.code === 'E_LOCATOR_UNRESOLVED');
    expect(noParts.length).toBeGreaterThan(0);
    noParts.forEach((r) => {
      expect(r.outcome).toBe('exempt');
      expect(r.message).toContain('tracker adapter');
    });

    const noCases = lintEvidence(load(at('valid.yaml')), load(at('valid-evidence.yaml')))
      .filter((r) => r.code === 'E_EDGE_CASE_NOT_COLLECTED');
    expect(noCases.length).toBeGreaterThan(0);
    noCases.forEach((r) => {
      expect(r.outcome).toBe('exempt');
      expect(r.message).toContain("runner's input");
    });
  });

  // The circularity is real and bounded: the author writes both lists today, so
  // the check catches a slip rather than a lie. In production the lists arrive
  // from the adapter and the runner, and the check becomes non-circular without
  // being rewritten — which is the whole point of parameterizing rather than
  // waiting.
  test('the reviewer side resolves against the same list', () => {
    const side = (loc) => ({
      goal: { statement: 'g', provenance: 'inferred', support: [{ kind: 'repo_path', ref: 'a.py' }] },
      problem: {
        statement: 'p', provenance: 'stated', support: [{ kind: 'item_locator', ref: loc }],
      },
      claim_provenance: {}, corrections: [], gaps: [],
    });
    const good = lintInterpretationPair(side('description#1'), side('description#2'),
      { itemParts: PARTS() });
    expect(failures(good).map((r) => r.code)).toEqual([]);

    const bad = lintInterpretationPair(side('description#1'), side('comment#4093'),
      { itemParts: PARTS() });
    expect(track(failures(bad).map((r) => r.code))).toContain('E_LOCATOR_UNRESOLVED');
  });

  // Explicitly NOT closed by this: two sides both citing a VALID description#1 is
  // still degenerate, which is why the abstain branch exists and why there is no
  // diversity metric.
  test('resolution does not rescue the degenerate overlap case', () => {
    const side = (statement) => ({
      goal: { statement: 'g', provenance: 'inferred', support: [{ kind: 'repo_path', ref: 'a.py' }] },
      problem: {
        statement, provenance: 'stated', support: [{ kind: 'item_locator', ref: 'description#1' }],
      },
      claim_provenance: {}, corrections: [], gaps: [],
    });
    const records = lintInterpretationPair(
      side('exports are too slow for large accounts'),
      side('the retry button double-submits'),
      { itemParts: PARTS() },
    );
    expect(failures(records)).toEqual([]);
    expect(records.filter((r) => r.code === 'W_ANCHOR_DISJOINT').map((r) => r.outcome))
      .toEqual(['exempt']);
  });
});

// Caller-shape errors are not exemptions. `Array.isArray(x) ? … : null` made
// not-supplied and supplied-in-the-wrong-shape mean the same thing, so passing the
// loaded document instead of its parts array bought no resolution and no signal —
// the same collapse these passes exist to prevent, built into the signature while
// fixing another instance of it.
describe('a wrong-shaped supplied list is a caller error, not no-domain', () => {
  const b = () => load(at('valid.yaml'));

  test.each([
    ['the whole document', () => lintBoundary(b(), { itemParts: b() })],
    ['a bare string', () => lintBoundary(b(), { itemParts: 'description#1' })],
    ['an object', () => lintBoundary(b(), { itemParts: { parts: [] } })],
    ['collectedCases as an object', () => lintEvidence(b(), load(at('valid-evidence.yaml')), { collectedCases: {} })],
  ])('%s throws rather than silently exempting', (_label, fn) => {
    expect(fn).toThrow(TypeError);
  });

  test('omitting the list is still legal and still declared', () => {
    expect(() => lintBoundary(b())).not.toThrow();
    expect(() => lintBoundary(b(), {})).not.toThrow();
    expect(() => lintBoundary(b(), { itemParts: null })).not.toThrow();
  });
});

// E_PARSE lives only in the CLI, which is why it was emitted and never registered
// — the same "emitted but not asserted" gap the CODES registry closed everywhere
// else, in the one path outside the three passes.
describe('the CLI reports a file that will not parse', () => {
  test('a malformed document is E_PARSE and a non-zero exit', () => {
    const cli = path.join(__dirname, '..', 'lint-boundary.js');
    const bad = path.join(__dirname, '..', '..', 'tests', 'malformed', 'not-yaml.yaml');
    const r = require('child_process').spawnSync(process.execPath, [cli, bad], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('E_PARSE');
    expect(CODES).toContain('E_PARSE');
    track(['E_PARSE']);
  });
});

// The seven genuinely-uncovered cells the offset experiment found, after 30 of the
// original 37 turned out to be vacuous — cells where the code cannot fire at all,
// so no test could catch a mutation there. These seven CAN fire and nothing
// exercised them: two checks that run outside the gating cell, crossed with the
// cells the fixture corpus never occupies.
describe('checks that run outside the gating cell, in the cells nothing occupied', () => {
  const firedAt = (d, id) => track(fired(lintBoundary(d))
    .filter((x) => String(x.at).includes(`(${id})`))
    .map((x) => x.code));

  // E_SELF_TRACE fires on any entry, not only a gating one. The corpus only ever
  // self-traced INV-2, which is mechanical + pre_merge + must.
  test.each([
    ['independent_review', 'post_merge', 'must'],
    ['observation', 'production', 'watch'],
    ['independent_review', 'production', 'must'],
    ['mechanical', 'production', 'watch'],
  ])('a self-trace on %s/%s/%s is reported', (verifier, verification_stage, obligation) => {
    const d = clone(load(at('valid.yaml')));
    const e = d.entries.find((x) => x.id === 'W-1');
    Object.assign(e, { verifier, verification_stage, obligation, traces: [e.id] });
    if (obligation === 'must' && verification_stage !== 'pre_merge') {
      e.handoff = {
        owner: 'o', trigger: 't', verification_method: 'm',
        evidence_destination: 'd', failure_transition: 'f',
      };
    }
    expect(firedAt(d, 'W-1')).toContain('E_SELF_TRACE');
  });

  // E_HANDOFF_INCOMPLETE fires for any verifier, and the corpus only carried
  // incomplete handoffs on mechanical and independent_review entries.
  test.each(['mechanical', 'independent_review', 'observation'])(
    'an incomplete handoff on a %s entry is reported', (verifier) => {
      const d = clone(load(at('valid.yaml')));
      const e = d.entries.find((x) => x.id === 'AC-7');
      Object.assign(e, { verifier, obligation: 'must' });
      e.handoff = {
        owner: 'o', trigger: 't', verification_method: 'm', evidence_destination: 'd',
      };
      expect(firedAt(d, 'AC-7')).toContain('E_HANDOFF_INCOMPLETE');
    },
  );
});

describe('necessity — no check is deletable without a test failing', () => {
  test('every declared code fires on some input', () => {
    // Re-run the hand-written fixtures so their codes count as exercised too.
    for (const n of fs.readdirSync(FIX)) {
      if (!n.endsWith('.yaml')) continue;
      if (n.startsWith('bad-ev_') || n === 'valid-evidence.yaml') {
        track(evCodes(load(at('valid.yaml')), load(at(n))));
      } else {
        track(fired(LB(load(at(n)))).map((x) => x.code));
      }
    }
    const never = CODES.filter((c) => !exercised.has(c));
    expect(never).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Provenance. Every fixture above was written by whoever wrote the rules, and one
// of them defeated two rules by accident. These are transcriptions of cases that
// predate the schema, with a declared verdict — including `unrepresentable`, which
// is where a finding about the schema itself can live.
// ---------------------------------------------------------------------------

const TRANS = path.join(__dirname, '..', '..', 'tests', 'transcriptions');
const register = load(path.join(TRANS, 'index.yaml')).transcriptions;

describe('transcriptions — cases authored before the rules', () => {
  test('the register is non-empty and every entry declares a verdict', () => {
    expect(register.length).toBeGreaterThan(0);
    register.forEach((t) => {
      expect(['representable', 'unrepresentable']).toContain(t.verdict);
    });
  });

  const representable = register.filter((t) => t.verdict === 'representable');
  test.each(representable.map((t) => [t.file, t.evidence]))(
    '%s lints clean, manifest and evidence', (file, evidence) => {
      const b = load(path.join(TRANS, file));
      expect(failures(lintBoundary(b)).map((f) => f.code)).toEqual([]);
      if (evidence) {
        expect(failures(lintEvidence(b, load(path.join(TRANS, evidence)))).map((f) => f.code))
          .toEqual([]);
      }
    },
  );

  test.each(representable.map((t) => [t.file]))(
    '%s reaches handoff_pending because a production must remains', (file) => {
      const b = load(path.join(TRANS, file));
      const open = b.entries.filter((e) => e.obligation === 'must'
        && (e.verification_stage === 'post_merge' || e.verification_stage === 'production'));
      expect(open.length).toBeGreaterThan(0);
    },
  );

  // An unrepresentable case must state a reason and a consequence, and must NOT be
  // quietly linted clean — a schema gap that passes the linter is the failure mode
  // this verdict exists to make visible.
  const unrepresentable = register.filter((t) => t.verdict === 'unrepresentable');
  test('at least one unrepresentable case is on record', () => {
    expect(unrepresentable.length).toBeGreaterThan(0);
  });

  test.each(unrepresentable.map((t) => [t.file, t]))(
    '%s declares a reason and a consequence', (file, t) => {
      expect(typeof t.reason).toBe('string');
      expect(t.reason.length).toBeGreaterThan(40);
      expect(typeof t.consequence).toBe('string');
    },
  );

  test('the unrepresentable case lints clean, which is exactly the problem', () => {
    // The linter cannot see the gap: every field is well-formed and the obligation
    // is mis-encoded rather than malformed. This assertion records that the schema
    // accepts a boundary it should reject, so the finding cannot be lost.
    const b = load(path.join(TRANS, 'BUG-4471-external-attestation.yaml'));
    expect(failures(lintBoundary(b)).map((f) => f.code)).toEqual([]);
  });
});

describe('tracker independence', () => {
  // The linter must not interpret an item reference. A key shape that means
  // something to one tracker has to mean nothing here, or the schema is
  // Jira-shaped with a generic label on it.
  const shapes = [
    ['jira', 'WI-1234'],
    ['github-issues', 'org/repo#4471'],
    ['azure-boards', '12345'],
    ['beads', 'domestique-l4l'],
    ['some-tracker-nobody-has-written-yet', '::opaque::'],
  ];
  test.each(shapes)('a %s reference of the form %s lints clean', (tracker, item) => {
    const d = clone(load(at('valid.yaml')));
    d.tracker = tracker;
    d.item = item;
    expect(fCodes(d)).toEqual([]);
  });

  test('both the adapter name and the reference are required', () => {
    for (const k of ['tracker', 'item']) {
      const d = clone(load(at('valid.yaml')));
      delete d[k];
      expect(fCodes(d)).toContain('E_MISSING_TOP_FIELD');
    }
  });
});
