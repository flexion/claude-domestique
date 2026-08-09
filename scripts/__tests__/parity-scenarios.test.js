'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadScenarios, validateScenario } = require('../parity/scenarios');

const SCENARIO_SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'scenarios',
  'parity',
  'scenario.schema.json'
);
const RESULT_SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'scenarios',
  'parity',
  'result.schema.json'
);

const roots = [];

function scenarioRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-scenarios-'));
  roots.push(root);
  return root;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeScenario(root, relativePath, scenario) {
  write(root, relativePath, JSON.stringify(scenario, null, 2) + '\n');
}

function readSchema(schemaPath) {
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function invariant(type, description) {
  return { type, description };
}

const VALID = {
  direct: {
    id: 'stilus-review-direct',
    class: 'direct',
    prompt: 'Review docs/example.md for correctness and voice.',
    fixture: 'direct/stilus-review',
    invariants: [invariant('report_section', 'The report names every review dimension.')],
    forbidden: ['edits the reviewed prose'],
    target_skill: 'stilus:review',
    invocation: {
      claude: '/stilus:review docs/example.md',
      codex: '/stilus:review docs/example.md',
    },
  },
  discovery: {
    id: 'memento-resume-positive',
    class: 'discovery',
    prompt: 'Continue this session.',
    fixture: 'discovery/memento-resume',
    invariants: [invariant('selected_skill', 'The host selects memento:resume.')],
    forbidden: ['creates a second session file'],
    target_skill: 'memento:resume',
    expectation: 'positive',
    control: { ablate_description: true },
  },
  handoff: {
    id: 'claude-writes-codex-reads',
    class: 'handoff',
    prompt: 'What is the current state of this session?',
    fixture: 'handoff/issue-feature-42-auth',
    invariants: [invariant('state_file', 'The reader opens the exact session path.')],
    forbidden: ['searches for an alternative session filename'],
    handoff: { writer: 'claude', reader: 'codex' },
  },
  hook: {
    id: 'memento-session-start-hook',
    class: 'hook',
    prompt: 'Start work on this branch.',
    fixture: 'hook/memento-session-start',
    invariants: [invariant('hook_sentinel', 'The response reports isNew: false.')],
    forbidden: ['writes diagnostics to stdout'],
    hook: {
      plugin: 'memento',
      event: 'SessionStart',
      payload: { source: 'startup' },
    },
  },
  isolation: {
    id: 'stilus-review-summary-isolation',
    class: 'isolation',
    prompt: 'Review this draft and report the takeaway an AI reader receives.',
    fixture: 'isolation/stilus-review-summary',
    invariants: [invariant('attestation', 'The attestation request ID matches the delegation.')],
    forbidden: ['runs review-summary in the orchestrator context'],
    isolation: { attestation_schema: 'stilus/review-summary/attestation.json' },
  },
};

function valid(behaviorClass, overrides = {}) {
  return Object.assign({}, VALID[behaviorClass], overrides);
}

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

test.each(Object.keys(VALID))('accepts a fully specified %s scenario', behaviorClass => {
  expect(validateScenario(valid(behaviorClass))).toEqual([]);
});

test('rejects a scenario with no id', () => {
  const scenario = valid('direct');
  delete scenario.id;
  expect(validateScenario(scenario)).toEqual(['id must be a non-empty string']);
  expect(validateScenario(valid('direct', { id: '   ' }))).toEqual([
    'id must be a non-empty string',
  ]);
});

test('rejects an unknown behavior class', () => {
  expect(validateScenario(valid('direct', { class: 'benchmark' }))).toContain(
    'class must be one of direct, discovery, handoff, hook, isolation'
  );
});

test('rejects an empty prompt or fixture', () => {
  const errors = validateScenario(valid('direct', { prompt: '', fixture: '  ' }));
  expect(errors).toContain('prompt must be a non-empty string');
  expect(errors).toContain('fixture must be a non-empty string');
});

test('requires invariants and forbidden behavior to be arrays', () => {
  const scenario = valid('direct');
  delete scenario.invariants;
  delete scenario.forbidden;
  const errors = validateScenario(scenario);
  expect(errors).toContain('invariants must be an array');
  expect(errors).toContain('forbidden must be an array');
});

test('requires each invariant to declare a type and a description', () => {
  const errors = validateScenario(
    valid('direct', { invariants: [{ type: 'selected_skill' }, invariant('', 'no type')] })
  );
  expect(errors).toContain('invariants[0] must declare a non-empty type and description');
  expect(errors).toContain('invariants[1] must declare a non-empty type and description');
});

test('requires each forbidden behavior to be a non-empty string', () => {
  expect(validateScenario(valid('direct', { forbidden: [''] }))).toContain(
    'forbidden[0] must be a non-empty string'
  );
});

test('rejects a discovery scenario with no target skill', () => {
  const scenario = valid('discovery');
  delete scenario.target_skill;
  expect(validateScenario(scenario)).toEqual(['target_skill must be a non-empty string']);
});

test('rejects a discovery scenario with an absent control declaration', () => {
  const scenario = valid('discovery');
  delete scenario.control;
  expect(validateScenario(scenario)).toEqual(['control must declare ablate_description: true']);
});

test.each([
  ['a non-object control', 'always'],
  ['an unablated control', { ablate_description: false }],
])('rejects a discovery scenario with %s', (_label, control) => {
  expect(validateScenario(valid('discovery', { control }))).toEqual([
    'control must declare ablate_description: true',
  ]);
});

test('rejects a discovery scenario with an absent or unknown expectation', () => {
  const scenario = valid('discovery');
  delete scenario.expectation;
  expect(validateScenario(scenario)).toEqual([
    'expectation must be one of ambiguous, ordinary-negative, positive, side-effect-negative',
  ]);
  expect(validateScenario(valid('discovery', { expectation: 'maybe' }))).toEqual([
    'expectation must be one of ambiguous, ordinary-negative, positive, side-effect-negative',
  ]);
});

test('ambiguous discovery requires an explicit allowed outcome set', () => {
  const errors = validateScenario({
    id: 'memento-neighbor',
    class: 'discovery',
    expectation: 'ambiguous',
    target_skill: 'memento:resume',
    prompt: 'What is next?',
    control: { ablate_description: true },
    invariants: [],
  });
  expect(errors).toContain('allowed_outcomes must be a non-empty array');
});

test('accepts ambiguous discovery once allowed outcomes are declared', () => {
  const scenario = valid('discovery', {
    expectation: 'ambiguous',
    allowed_outcomes: ['selects memento:resume', 'asks a clarifying question'],
  });
  expect(validateScenario(scenario)).toEqual([]);
  expect(validateScenario(valid('discovery', { expectation: 'ambiguous', allowed_outcomes: [] })))
    .toEqual(['allowed_outcomes must be a non-empty array']);
});

test('side-effect-negative discovery requires forbidden side effects', () => {
  expect(validateScenario(valid('discovery', { expectation: 'side-effect-negative' }))).toEqual([
    'forbidden_side_effects must be a non-empty array',
  ]);
  const scenario = valid('discovery', {
    expectation: 'side-effect-negative',
    forbidden_side_effects: ['creates a pull request'],
  });
  expect(validateScenario(scenario)).toEqual([]);
});

test('requires direct scenarios to declare both host invocations and a target skill', () => {
  const scenario = valid('direct');
  delete scenario.invocation;
  delete scenario.target_skill;
  const errors = validateScenario(scenario);
  expect(errors).toContain('invocation must declare claude and codex syntax');
  expect(errors).toContain('target_skill must be a non-empty string');
  expect(validateScenario(valid('direct', { invocation: { claude: '/stilus:review' } }))).toEqual([
    'invocation must declare claude and codex syntax',
  ]);
});

test('requires hook scenarios to declare a plugin, event, and payload', () => {
  const scenario = valid('hook');
  delete scenario.hook;
  expect(validateScenario(scenario)).toEqual(['hook must declare plugin, event, and payload']);
  expect(validateScenario(valid('hook', { hook: { plugin: 'memento', event: 'SessionStart' } })))
    .toEqual(['hook must declare plugin, event, and payload']);
  expect(
    validateScenario(
      valid('hook', { hook: { plugin: 'memento', event: '', payload: { source: 'startup' } } })
    )
  ).toEqual(['hook must declare plugin, event, and payload']);
});

test('requires handoff scenarios to name two distinct known hosts', () => {
  const scenario = valid('handoff');
  delete scenario.handoff;
  expect(validateScenario(scenario)).toEqual([
    'handoff must declare distinct writer and reader hosts',
  ]);
  expect(validateScenario(valid('handoff', { handoff: { writer: 'codex', reader: 'codex' } })))
    .toEqual(['handoff must declare distinct writer and reader hosts']);
  expect(validateScenario(valid('handoff', { handoff: { writer: 'claude', reader: 'gemini' } })))
    .toEqual(['handoff must declare distinct writer and reader hosts']);
  expect(validateScenario(valid('handoff', { handoff: { writer: 'codex', reader: 'claude' } })))
    .toEqual([]);
});

test('requires isolation scenarios to declare an attestation schema', () => {
  const scenario = valid('isolation');
  delete scenario.isolation;
  expect(validateScenario(scenario)).toEqual(['isolation must declare attestation_schema']);
  expect(validateScenario(valid('isolation', { isolation: { attestation_schema: '  ' } }))).toEqual([
    'isolation must declare attestation_schema',
  ]);
});

test('aggregates every problem instead of failing fast', () => {
  expect(validateScenario({ class: 'discovery' })).toEqual([
    'id must be a non-empty string',
    'prompt must be a non-empty string',
    'fixture must be a non-empty string',
    'invariants must be an array',
    'forbidden must be an array',
    'target_skill must be a non-empty string',
    'control must declare ablate_description: true',
    'expectation must be one of ambiguous, ordinary-negative, positive, side-effect-negative',
  ]);
});

test.each([[null], [undefined], ['discovery'], [[]], [7]])(
  'returns one explanatory error for non-object input: %p',
  input => {
    expect(() => validateScenario(input)).not.toThrow();
    expect(validateScenario(input)).toEqual(['scenario must be an object']);
  }
);

test('loadScenarios returns every scenario sorted by id', () => {
  const root = scenarioRoot();
  writeScenario(root, 'discovery/zeta.json', valid('discovery', { id: 'zeta-discovery' }));
  writeScenario(root, 'alpha.json', valid('direct', { id: 'alpha-direct' }));
  writeScenario(root, 'hook/nested/mid.json', valid('hook', { id: 'mid-hook' }));

  expect(loadScenarios(root).map(scenario => scenario.id)).toEqual([
    'alpha-direct',
    'mid-hook',
    'zeta-discovery',
  ]);
});

test('loadScenarios skips schema files and the top-level fixtures directory', () => {
  const root = scenarioRoot();
  writeScenario(root, 'direct/only.json', valid('direct'));
  write(root, 'scenario.schema.json', '{ "not": "a scenario" }\n');
  write(root, 'result.schema.json', '{ "not": "a scenario" }\n');
  write(root, 'fixtures/handoff/.claude/branches/issue-feature-42-auth', 'branch metadata\n');
  write(root, 'fixtures/handoff/package.json', '{ "name": "fixture" }\n');

  expect(loadScenarios(root).map(scenario => scenario.id)).toEqual(['stilus-review-direct']);
});

test('loadScenarios reports duplicate scenario ids', () => {
  const root = scenarioRoot();
  writeScenario(root, 'first.json', valid('direct'));
  writeScenario(root, 'nested/second.json', valid('discovery', { id: 'stilus-review-direct' }));

  expect(() => loadScenarios(root)).toThrow('stilus-review-direct: duplicate scenario id');
});

test('loadScenarios prefixes structural problems with the scenario file path', () => {
  const root = scenarioRoot();
  const scenario = valid('discovery');
  delete scenario.target_skill;
  writeScenario(root, 'discovery/broken.json', scenario);

  expect(() => loadScenarios(root)).toThrow(
    'discovery/broken.json: target_skill must be a non-empty string'
  );
});

test('loadScenarios aggregates malformed JSON instead of throwing a parse error', () => {
  const root = scenarioRoot();
  write(root, 'unparsable.json', '{ "id": "truncated"\n');
  writeScenario(root, 'valid.json', valid('direct'));

  let message = '';
  try {
    loadScenarios(root);
  } catch (error) {
    message = error.message;
  }
  expect(message).toContain('unparsable.json: invalid JSON');
  expect(message).not.toContain('Unexpected');
});

test('loadScenarios reports a non-object scenario document', () => {
  const root = scenarioRoot();
  write(root, 'list.json', '[]\n');
  expect(() => loadScenarios(root)).toThrow('list.json: scenario must be an object');
});

test('loadScenarios lists every problem in one aggregated error', () => {
  const root = scenarioRoot();
  write(root, 'unparsable.json', '{\n');
  const scenario = valid('discovery');
  delete scenario.control;
  writeScenario(root, 'discovery/no-control.json', scenario);
  writeScenario(root, 'a.json', valid('direct'));
  writeScenario(root, 'b.json', valid('direct'));

  let message = '';
  try {
    loadScenarios(root);
  } catch (error) {
    message = error.message;
  }
  const problems = message.split('\n').filter(Boolean);
  expect(problems).toHaveLength(3);
  expect(problems[0]).toBe('stilus-review-direct: duplicate scenario id');
  expect(problems[1]).toBe(
    'discovery/no-control.json: control must declare ablate_description: true'
  );
  expect(problems[2]).toMatch(/^unparsable\.json: invalid JSON \(/);
});

test('loadScenarios returns an empty list for a missing root', () => {
  const root = scenarioRoot();
  expect(loadScenarios(path.join(root, 'absent'))).toEqual([]);
});

test('both contract schemas parse as JSON Schema draft 2020-12 documents', () => {
  for (const schemaPath of [SCENARIO_SCHEMA_PATH, RESULT_SCHEMA_PATH]) {
    const schema = readSchema(schemaPath);
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.type).toBe('object');
    expect(Array.isArray(schema.required)).toBe(true);
  }
});

test('the scenario schema required array matches the validator', () => {
  const schema = readSchema(SCENARIO_SCHEMA_PATH);
  expect(schema.required).toEqual(['id', 'class', 'prompt', 'fixture', 'invariants', 'forbidden']);

  for (const field of schema.required) {
    const scenario = valid('direct');
    delete scenario[field];
    expect(validateScenario(scenario).length).toBeGreaterThan(0);
  }
});

test('the scenario schema class enum matches the validator', () => {
  const schema = readSchema(SCENARIO_SCHEMA_PATH);
  const classes = schema.properties.class.enum;
  expect(classes.slice().sort()).toEqual(Object.keys(VALID).sort());

  const message = `class must be one of ${classes.slice().sort().join(', ')}`;
  expect(validateScenario(valid('direct', { class: 'benchmark' }))).toContain(message);
  for (const behaviorClass of classes) {
    expect(validateScenario(valid(behaviorClass))).not.toContain(message);
  }
});

test('the scenario schema conditional blocks cover every conditional class', () => {
  const schema = readSchema(SCENARIO_SCHEMA_PATH);
  const guardedClasses = schema.allOf
    .map(block => block.if && block.if.properties && block.if.properties.class)
    .filter(Boolean)
    .map(constraint => constraint.const)
    .filter(Boolean);
  expect(new Set(guardedClasses)).toEqual(
    new Set(['direct', 'discovery', 'handoff', 'hook', 'isolation'])
  );
});

test('the result schema pins the release-gate result contract', () => {
  const schema = readSchema(RESULT_SCHEMA_PATH);
  expect(schema.required).toEqual([
    'scenario_id',
    'host',
    'host_version',
    'arm',
    'trial',
    'outcome',
    'observations',
    'state_changes',
    'invariants',
  ]);
  expect(schema.properties.host.enum).toEqual(['claude', 'codex']);
  expect(schema.properties.arm.enum).toEqual(['control', 'guided']);
  expect(schema.properties.trial.type).toBe('integer');
  expect(schema.properties.trial.minimum).toBe(1);
  expect(schema.properties.outcome.enum).toEqual([
    'PASS',
    'FAIL',
    'UNAVAILABLE',
    'INFRASTRUCTURE_FAILURE',
  ]);

  for (const optional of [
    'infrastructure_failure',
    'reviewed_hook_hash',
    'plugin_versions',
    'prompt',
    'extra',
  ]) {
    expect(schema.properties[optional]).toBeDefined();
    expect(schema.required).not.toContain(optional);
  }
});
