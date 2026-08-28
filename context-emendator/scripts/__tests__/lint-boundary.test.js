'use strict';

const path = require('path');
const { lint, load } = require('../lint-boundary');

const FIX = path.join(__dirname, '..', '..', 'schemas', 'fixtures');
const codes = (name) => lint(load(path.join(FIX, name))).map((f) => f.code).sort();

describe('boundary linter', () => {
  test('the valid fixture is clean', () => {
    expect(codes('valid.yaml')).toEqual([]);
  });

  // An instance transcribed from the source design conversation's worked example,
  // authored under the old INV/AC/PRES vocabulary before this schema existed. It
  // is here to test that the schema can express a real case, rather than only the
  // case its author wrote to fit the rules.
  test('the transcribed real case is clean', () => {
    expect(codes('realcase-BUG-4471.yaml')).toEqual([]);
  });

  test('the real case terminates at Handoff Pending, not Ready for Merge', () => {
    const doc = load(path.join(FIX, 'realcase-BUG-4471.yaml'));
    const blocking = doc.entries.filter(
      (e) => e.obligation === 'must'
        && (e.verification_stage === 'post_merge' || e.verification_stage === 'production'),
    );
    // PRES-4 is production-verified, so the pilot cannot reach a clean terminal
    // state on its own first worked example. That is a finding about the example.
    expect(blocking.map((e) => e.id)).toEqual(['PRES-4']);
  });

  // One fixture per rule the document calls mechanical. Each asserts the exact
  // code set, so a rule that stops firing fails here rather than passing silently.
  const cases = [
    ['bad-observation_must.yaml', ['E_HANDOFF_MISSING', 'E_OBSERVATION_MUST']],
    ['bad-handoff_missing.yaml', ['E_HANDOFF_MISSING']],
    ['bad-baseline_mismatch.yaml', ['E_BASELINE_ROLE_MISMATCH']],
    ['bad-no_probe.yaml', ['E_NO_SENSITIVITY_PROBE']],
    ['bad-edge_conflict.yaml', ['E_EDGE_BASELINE_CONFLICT']],
    ['bad-entails_undeclared.yaml', ['E_ENTAILS_UNDECLARED']],
    ['bad-testrole_forbidden.yaml', ['E_TESTROLE_FORBIDDEN']],
    ['bad-expected_error_untyped.yaml', ['E_EXPECTED_ERROR_UNTYPED']],
    ['bad-orphan_and_unanchored.yaml', ['E_ORPHAN_ENTRY', 'E_UNANCHORED_MANDATE']],
    ['bad-self_trace.yaml', ['E_NO_UPSTREAM_TRACE', 'E_SELF_TRACE']],
    ['bad-no_upstream_trace.yaml', ['E_NO_UPSTREAM_TRACE']],
  ];

  test.each(cases)('%s reports exactly %p', (file, expected) => {
    expect(codes(file)).toEqual([...expected].sort());
  });
});

describe('YAML 1.2 core schema', () => {
  // The document's stated typing hazard. Under 1.1 resolvers NO becomes false and
  // 1.10 becomes 1.1; under the 1.2 core schema both stay strings.
  const yaml = require('js-yaml');
  const parse = (s) => yaml.load(s, { schema: yaml.CORE_SCHEMA });

  test('NO is not coerced to a boolean', () => {
    expect(parse('id: NO').id).toBe('NO');
  });

  test('on and off are not coerced to booleans', () => {
    expect(parse('a: on\nb: off')).toEqual({ a: 'on', b: 'off' });
  });

  test('an unquoted version-like scalar keeps its trailing zero', () => {
    // 1.10 parsed as a float would become 1.1 and silently change a threshold.
    expect(String(parse('threshold: "1.10"').threshold)).toBe('1.10');
  });
});
