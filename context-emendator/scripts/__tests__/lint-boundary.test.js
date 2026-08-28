'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  lintBoundary, lintEvidence, load, failures, CODES,
} = require('../lint-boundary');

const FIX = path.join(__dirname, '..', '..', 'schemas', 'fixtures');
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
  ];
  test.each(cases)('%s reports exactly %p', (file, expected) => {
    expect(bCodes(file)).toEqual([...expected].sort());
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

  test('the one exemption in the valid manifest is visible as an exemption', () => {
    // INV-2 self-traces and is declared registry-selected. Silence here is what
    // let an undeclared per-issue entry through before.
    expect(outcomes('valid.yaml', 'exempt')).toEqual(['E_SELF_TRACE']);
  });

  test('an entry that is not registry-selected gets no exemption, it gets a failure', () => {
    expect(outcomes('bad-self_trace.yaml', 'exempt')).toEqual([]);
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
  const top = ['schema_version', 'issue', 'registry_revision', 'mandates', 'non_goals',
    'claims', 'coupling', 'entails', 'entries', 'registry_selections'];
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
    const b = V();
    track(evCodes(b, null));
    track(evCodes(b, (() => { const e = EV(); delete e.boundary_digest; return e; })()));
    track(evCodes(b, (() => { const e = EV(); delete e.edges[0].entry; return e; })()));
    track(evCodes(b, (() => { const e = EV(); e.edges[0].entry = 'NOPE'; return e; })()));
    track(evCodes(b, (() => { const e = EV(); delete e.edges[0].case_id; return e; })()));
    expect(true).toBe(true);
  });
});

describe('necessity — no check is deletable without a test failing', () => {
  test('every declared code fires on some input', () => {
    // Re-run the hand-written fixtures so their codes count as exercised too.
    for (const n of fs.readdirSync(FIX)) {
      if (!n.endsWith('.yaml')) continue;
      if (n.startsWith('bad-ev_') || n === 'valid-evidence.yaml') {
        track(evCodes(load(at('valid.yaml')), load(at(n))));
      } else {
        track(failures(LB(load(at(n)))).map((x) => x.code));
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

const TRANS = path.join(__dirname, '..', '..', 'schemas', 'transcriptions');
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
