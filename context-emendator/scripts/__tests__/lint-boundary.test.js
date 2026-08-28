'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { lintBoundary, lintEvidence, load } = require('../lint-boundary');

const FIX = path.join(__dirname, '..', '..', 'schemas', 'fixtures');
const at = (n) => path.join(FIX, n);
const bCodes = (n) => lintBoundary(load(at(n))).map((f) => f.code).sort();
const eCodes = (n) => lintEvidence(load(at('valid.yaml')), load(at(n))).map((f) => f.code).sort();

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
    expect(lintBoundary(yaml.load(renamed)).map((f) => f.code)).toEqual([]);
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
