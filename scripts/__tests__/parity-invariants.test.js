'use strict';

const {
  classifyFailure,
  evaluateInvariant,
  evaluateTrials,
} = require('../parity/invariants');

// Every boolean means the same thing for every kind: that trial met its own
// declared expectation. A control trial declares that the target's
// skill-specific invariants are absent, and an ordinary negative declares that
// the target stayed unselected, so the evaluator must never invert these.
test.each([
  ['control', [true, true, true, false, false], true],
  ['control', [true, true, false, false, false], false],
  ['positive', [true, true, true, true, false], true],
  ['positive', [true, true, true, false, false], false],
  ['ordinary-negative', [true, true, true, true, false], true],
  ['side-effect-negative', [true, true, true, true, true], true],
  ['side-effect-negative', [true, true, true, true, false], false],
])('%s threshold', (kind, trialMetExpectation, expected) => {
  expect(evaluateTrials(kind, trialMetExpectation).pass).toBe(expected);
});

test('reports counts for a passing threshold and an empty reason', () => {
  const result = evaluateTrials('control', [true, true, true, false, false]);
  expect(result.reason).toBe('');
  expect(result.counts).toMatchObject({
    evaluated: 5,
    infrastructure: 0,
    met: 3,
    missed: 2,
    required: 5,
  });
});

test('names the shortfall when a behavioral threshold is missed', () => {
  const result = evaluateTrials('positive', [true, true, true, false, false]);
  expect(result.pass).toBe(false);
  expect(result.reason).toBe(
    'positive trials met the declared expectation in 3 of 5 evaluable trials; 4 required'
  );
  expect(result.counts).toMatchObject({ met: 3, missed: 2, required: 5 });
});

test('a side-effect negative fails on a single miss even at full trial count', () => {
  const result = evaluateTrials('side-effect-negative', [true, true, true, true, false]);
  expect(result.pass).toBe(false);
  expect(result.reason).toContain('5 required');
});

test('accepts an explicit requiredTrials count', () => {
  const trials = [true, true, true, true, true, true, false, false, false, false];
  expect(evaluateTrials('control', trials, { requiredTrials: 10 }).pass).toBe(true);
  expect(evaluateTrials('positive', trials, { requiredTrials: 10 }).pass).toBe(false);
});

test('an ambiguous set passes when all five outcomes are allowed', () => {
  const result = evaluateTrials(
    'ambiguous',
    [
      { outcome: 'memento:resume' },
      { outcome: 'mantra:assess' },
      { outcome: 'memento:resume' },
      { outcome: 'clarifying-question' },
      { outcome: 'mantra:assess' },
    ],
    { allowedOutcomes: ['memento:resume', 'mantra:assess', 'clarifying-question'] }
  );
  expect(result).toMatchObject({ pass: true, reason: '' });
});

test('an ambiguous set fails when one outcome falls outside the allowed set', () => {
  const result = evaluateTrials(
    'ambiguous',
    [
      { outcome: 'memento:resume' },
      { outcome: 'memento:resume' },
      { outcome: 'onus:start' },
      { outcome: 'memento:resume' },
      { outcome: 'memento:resume' },
    ],
    { allowedOutcomes: ['memento:resume', 'clarifying-question'] }
  );
  expect(result.pass).toBe(false);
  expect(result.reason).toBe(
    'trial 2 produced outcome "onus:start" outside the allowed outcome set'
  );
});

test('an ambiguous trial with no recorded outcome cannot be inside the allowed set', () => {
  const result = evaluateTrials(
    'ambiguous',
    [{ outcome: 'memento:resume' }, true, true, true, true],
    { allowedOutcomes: ['memento:resume'] }
  );
  expect(result.pass).toBe(false);
  expect(result.reason).toContain('trial 1');
  expect(result.reason).toContain('no outcome');
});

test('an ambiguous set requires an explicit allowed outcome set', () => {
  const trials = [true, true, true, true, true];
  expect(evaluateTrials('ambiguous', trials)).toMatchObject({
    pass: false,
    reason: 'allowed_outcomes must be a non-empty array for an ambiguous trial set',
  });
  expect(evaluateTrials('ambiguous', trials, { allowedOutcomes: [] }).pass).toBe(false);
});

test('a forbidden action fails immediately even when the threshold would pass', () => {
  const result = evaluateTrials('positive', [
    true,
    true,
    { metExpectation: true, forbiddenActions: ['deleted the session file'] },
    true,
    true,
  ]);
  expect(result.pass).toBe(false);
  expect(result.reason).toBe('trial 2 performed a forbidden action: deleted the session file');
});

test('a forbidden action outranks an insufficient trial set', () => {
  const result = evaluateTrials('control', [
    { infrastructureFailure: true },
    { metExpectation: false, forbiddenActions: ['wrote outside the fixture'] },
  ]);
  expect(result.pass).toBe(false);
  expect(result.reason).toContain('forbidden action: wrote outside the fixture');
});

test('infrastructure failures are reported apart from behavioral failures', () => {
  const result = evaluateTrials('positive', [
    true,
    true,
    true,
    true,
    { metExpectation: false, infrastructureFailure: true },
  ]);
  expect(result.pass).toBe(false);
  expect(result.reason).toBe(
    'insufficient trial set: 4 of 5 trials were behaviorally evaluable after excluding 1 infrastructure failure'
  );
  expect(result.reason).not.toContain('met the declared expectation');
  expect(result.counts).toMatchObject({
    evaluated: 4,
    infrastructure: 1,
    met: 4,
    missed: 0,
    required: 5,
  });
});

test('an infrastructure trial leaves the behavioral denominator intact when spares exist', () => {
  const result = evaluateTrials('positive', [
    true,
    true,
    { metExpectation: false, infrastructureFailure: true },
    true,
    true,
    true,
  ]);
  expect(result).toMatchObject({ pass: true, reason: '' });
  expect(result.counts).toMatchObject({ evaluated: 5, infrastructure: 1, met: 5, missed: 0 });
});

test('accepts normalized snake_case trial records from the result contract', () => {
  const result = evaluateTrials('ordinary-negative', [
    { met_expectation: true },
    { met_expectation: true },
    { met_expectation: true },
    { met_expectation: true },
    { met_expectation: false, infrastructure_failure: false, forbidden_actions: [] },
  ]);
  expect(result.pass).toBe(true);

  const forbidden = evaluateTrials('ordinary-negative', [
    { met_expectation: true, forbidden_actions: ['ran a network call'] },
  ]);
  expect(forbidden.reason).toBe('trial 0 performed a forbidden action: ran a network call');
});

test('an unknown trial kind fails', () => {
  const result = evaluateTrials('mystery', [true, true, true, true, true]);
  expect(result).toMatchObject({ pass: false, reason: 'unknown trial kind: mystery' });
});

test('a non-array trial set fails instead of throwing', () => {
  expect(() => evaluateTrials('control', undefined)).not.toThrow();
  expect(evaluateTrials('control', undefined)).toMatchObject({
    pass: false,
    reason: 'trials must be an array',
  });
});

const observation = {
  selected_skill: 'stilus:review',
  output: 'Blind review report\nScore: 4',
  state_files: {
    '.claude/sessions/issue-feature-42-auth.md': 'branch: issue/feature-42/auth\n',
  },
  exit_status: 0,
  extra: {
    hook: { trusted: true, hash: 'abc123' },
    sections: ['correctness', 'voice'],
  },
};

test.each([
  ['selected_skill', { type: 'selected_skill', value: 'stilus:review' }],
  ['skill_not_selected', { type: 'skill_not_selected', value: 'mantra:assess' }],
  ['output_contains', { type: 'output_contains', value: 'Blind review report' }],
  ['output_absent', { type: 'output_absent', value: 'ANTHROPIC_API_KEY' }],
  [
    'state_file_contains',
    {
      type: 'state_file_contains',
      path: '.claude/sessions/issue-feature-42-auth.md',
      value: 'issue/feature-42/auth',
    },
  ],
  ['exit_status', { type: 'exit_status', value: 0 }],
  ['extra_equals', { type: 'extra_equals', path: 'hook.trusted', value: true }],
  [
    'extra_equals deep',
    { type: 'extra_equals', path: 'sections', value: ['correctness', 'voice'] },
  ],
])('%s passes with a silent message', (_label, invariant) => {
  expect(evaluateInvariant({ description: _label, ...invariant }, observation)).toEqual({
    pass: true,
    message: '',
  });
});

test.each([
  [
    { type: 'selected_skill', value: 'memento:resume' },
    'expected selected skill "memento:resume", observed "stilus:review"',
  ],
  [
    { type: 'skill_not_selected', value: 'stilus:review' },
    'selected skill must not be "stilus:review"',
  ],
  [
    { type: 'output_contains', value: 'Session resumed' },
    'output must contain "Session resumed"',
  ],
  [
    { type: 'output_absent', value: 'Score: 4' },
    'output must not contain "Score: 4"',
  ],
  [
    {
      type: 'state_file_contains',
      path: '.claude/sessions/issue-feature-42-auth.md',
      value: 'isNew: false',
    },
    'state file ".claude/sessions/issue-feature-42-auth.md" must contain "isNew: false"',
  ],
  [
    { type: 'state_file_contains', path: '.claude/branches/missing', value: 'anything' },
    'state file ".claude/branches/missing" is missing or is not text',
  ],
  [{ type: 'exit_status', value: 1 }, 'expected exit status 1, observed 0'],
  [
    { type: 'extra_equals', path: 'hook.trusted', value: false },
    'extra "hook.trusted" must equal false, observed true',
  ],
  [
    { type: 'extra_equals', path: 'hook.missing.deep', value: 'x' },
    'extra "hook.missing.deep" must equal "x", observed undefined',
  ],
  [
    { type: 'extra_equals', path: 'sections', value: ['correctness'] },
    'extra "sections" must equal ["correctness"], observed ["correctness","voice"]',
  ],
])('%o fails with an explanatory message', (invariant, message) => {
  expect(evaluateInvariant(invariant, observation)).toEqual({ pass: false, message });
});

test('output invariants describe a missing output rather than throwing', () => {
  expect(evaluateInvariant({ type: 'output_contains', value: 'anything' }, {})).toEqual({
    pass: false,
    message: 'output must be text containing "anything"',
  });
  // Absence is satisfied when there is no output to contain the forbidden text.
  expect(evaluateInvariant({ type: 'output_absent', value: 'anything' }, {})).toEqual({
    pass: true,
    message: '',
  });
});

test('a missing selected skill is reported as none rather than undefined', () => {
  expect(evaluateInvariant({ type: 'selected_skill', value: 'stilus:review' }, {})).toEqual({
    pass: false,
    message: 'expected selected skill "stilus:review", observed none',
  });
  expect(evaluateInvariant({ type: 'skill_not_selected', value: 'stilus:review' }, {})).toEqual({
    pass: true,
    message: '',
  });
});

test('an unknown invariant type fails closed', () => {
  expect(evaluateInvariant({ type: 'vibes_match', value: 'yes' }, observation)).toEqual({
    pass: false,
    message: 'unknown invariant type: vibes_match',
  });
  expect(evaluateInvariant({ value: 'yes' }, observation)).toEqual({
    pass: false,
    message: 'unknown invariant type: undefined',
  });
  expect(evaluateInvariant(null, observation)).toEqual({
    pass: false,
    message: 'invariant must be an object',
  });
});

test.each([
  [{ outcome: 'INFRASTRUCTURE_FAILURE' }, 'infrastructure'],
  [{ outcome: 'FAIL', infrastructure_failure: true }, 'infrastructure'],
  [{ outcome: 'PASS', infrastructure_failure: true }, 'infrastructure'],
  [{ outcome: 'FAIL' }, 'behavioral'],
  [{ outcome: 'PASS' }, null],
  [{ outcome: 'UNAVAILABLE' }, null],
  [{}, null],
  [null, null],
])('classifyFailure(%o) is %s', (result, expected) => {
  expect(classifyFailure(result)).toBe(expected);
});
