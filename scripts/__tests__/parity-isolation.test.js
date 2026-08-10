'use strict';

const fs = require('fs');
const path = require('path');
const { loadScenarios, validateScenario } = require('../parity/scenarios');
const { validateIsolation } = require('../parity/isolation');

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');
const SCENARIOS_ROOT = path.join(REPOSITORY_ROOT, 'scenarios', 'parity');
const ISOLATION_SCENARIOS_ROOT = path.join(SCENARIOS_ROOT, 'isolation');
const FIXTURE_ROOT = path.join(SCENARIOS_ROOT, 'fixtures', 'isolation-baseline');

const REVIEW_SUMMARY_SKILL = path.join(
  REPOSITORY_ROOT,
  'stilus',
  'skills',
  'review-summary',
  'SKILL.md'
);
const REVIEW_SUMMARY_AGENT = path.join(REPOSITORY_ROOT, 'stilus', 'agents', 'review-summary.md');
const REVIEW_SKILL = path.join(REPOSITORY_ROOT, 'stilus', 'skills', 'review', 'SKILL.md');
const REVIEWING_CONTEXT = path.join(REPOSITORY_ROOT, 'stilus', 'context', 'reviewing.md');

// Every fail-closed reason the approved design lists for discarding a blind pass.
const FAIL_CLOSED_REASONS = [
  'delegation fails',
  'the attestation is absent or malformed',
  'the request ID does not match',
  'received_fields contains anything else',
  'any forbidden-context flag is true',
  'the current canary is reported',
];

const ORCHESTRATOR_PHRASES = [
  'spawn_agent',
  'UUID v4',
  'AI perception: UNAVAILABLE',
  'parent-only',
  'place the canary beside that parent-only block',
  'never put the canary in the delegation payload',
  'Generate a new UUID v4 request ID and a new UUID v4 isolation canary',
  'new for every pass',
  'Validate the attestation before reading or using the summary',
  'omitted from aggregation',
  'neither raises nor lowers',
  'never counted as a pass',
  ...FAIL_CLOSED_REASONS,
];

// A permissive current-context fallback for the blind pass, as opposed to the
// prohibition of one. Sentences carrying a negation state the rule; sentences
// without one describe doing it.
const FALLBACK_CONTEXT =
  /\b(falls? back|fallback|current context|parent context|orchestrator context|same context|existing context|separate context)\b/i;
// Deliberately narrow. A bare "no" or "not" also appears in permissive prose
// ("if no subagent is available, run it here"), so only phrases that negate the
// action itself count as a prohibition.
const NEGATED =
  /\b(never|do not|does not|must not|may not|cannot|can't|is not|are not|without|instead of|forbidden|rejects?|refuses?|discards?)\b/i;

const CURRENT_REQUEST_ID = 'req-current';
const CURRENT_CANARY = '7d9c57c4-02b7-4b11-a59c-4950957511c3';
const STALE_REQUEST_ID = 'req-previous';

// The attestation object exactly as the approved design prints it in
// docs/superpowers/specs/2026-08-09-cross-host-parity-open-issues-design.md.
const APPROVED_ATTESTATION = {
  isolation: {
    request_id: '<exact delegated request ID>',
    received_fields: ['prose'],
    forbidden_context: {
      purpose: false,
      audience: false,
      intended_point: false,
      voice_profile: false,
      rubric: false,
      prior_findings: false,
    },
    canary_seen: false,
    observed_canary: null,
  },
};

const COLD_READER_ITEMS = [
  'The point, in one sentence',
  'Key claims',
  'What you would tell someone',
  'Where you stalled',
];

const FORBIDDEN_FIELDS = [
  'purpose',
  'audience',
  'intended_point',
  'voice_profile',
  'rubric',
  'prior_findings',
];

const ISOLATION_SCENARIO_IDS = [
  'isolation-context-leakage',
  'isolation-fresh-context',
  'isolation-malformed-attestation',
  'isolation-spawn-failure',
  'isolation-stale-request-id',
  'isolation-unavailable',
];

function forbiddenContext(overrides = {}) {
  const flags = {};
  for (const field of FORBIDDEN_FIELDS) flags[field] = false;
  return Object.assign(flags, overrides);
}

function attestation(overrides = {}, extra = {}) {
  const isolation = Object.assign(
    {
      request_id: CURRENT_REQUEST_ID,
      received_fields: ['prose'],
      forbidden_context: forbiddenContext(),
      canary_seen: false,
      observed_canary: null,
    },
    overrides
  );
  return Object.assign({ isolation }, extra);
}

function validate(result, requestId = CURRENT_REQUEST_ID, canary = CURRENT_CANARY) {
  return validateIsolation(result, requestId, canary);
}

function readScenario(id) {
  return JSON.parse(fs.readFileSync(path.join(ISOLATION_SCENARIOS_ROOT, `${id}.json`), 'utf8'));
}

// A later phase rewrites every skill description to a policy, so content
// assertions read the body below the frontmatter and never the description.
function body(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  if (!content.startsWith('---\n')) return content;
  const closing = /\n---(?:\n|$)/.exec(content.slice(4));
  if (!closing) return content;
  return content.slice(4 + closing.index + closing[0].length);
}

// Collapses formatting so a phrase assertion survives rewrapping and backticks.
function normalize(text) {
  return text.replace(/`/g, '').replace(/\s+/g, ' ');
}

function paragraphs(text) {
  return text.split(/\n\s*\n/);
}

function sentences(paragraph) {
  return paragraph
    .split('\n')
    .reduce((parts, line) => parts.concat(line.split(/(?<=[.!?])\s+/)), [])
    .map(part => part.trim())
    .filter(Boolean);
}

function currentContextFallbacks(text) {
  const violations = [];
  for (const paragraph of paragraphs(text)) {
    if (!/review-summary|blind summar/i.test(paragraph)) continue;
    for (const sentence of sentences(paragraph)) {
      if (!FALLBACK_CONTEXT.test(sentence)) continue;
      if (NEGATED.test(sentence)) continue;
      violations.push(sentence);
    }
  }
  return violations;
}

function firstJsonBlock(text) {
  const match = /```json\n([\s\S]*?)\n```/.exec(text);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return { unparsable: error.message };
  }
}

test('accepts the approved clean attestation', () => {
  const clean = {
    isolation: {
      request_id: 'req-current',
      received_fields: ['prose'],
      forbidden_context: {
        purpose: false,
        audience: false,
        intended_point: false,
        voice_profile: false,
        rubric: false,
        prior_findings: false,
      },
      canary_seen: false,
      observed_canary: null,
    },
  };
  expect(validateIsolation(clean, 'req-current', CURRENT_CANARY)).toEqual({ ok: true });
});

test('accepts a path-only delegation and ignores unrelated result content', () => {
  const result = attestation(
    { received_fields: ['path'] },
    { summary: 'The point is that a thermostat schedule beats a better guess.' }
  );
  expect(validate(result)).toEqual({ ok: true });
});

test('fails closed when the delegation tool is absent and nothing came back', () => {
  for (const missing of [undefined, null, '', 0, false, [], 'no Agent tool available']) {
    const outcome = validate(missing);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/result must be an object/);
  }
});

test('fails closed on a spawn failure envelope that carries no attestation', () => {
  const outcome = validate({ error: 'spawn_agent failed: no capacity for a new agent thread' });
  expect(outcome.ok).toBe(false);
  expect(outcome.reason).toMatch(/attestation absent/);
});

test('fails closed when the attestation is missing from an otherwise complete summary', () => {
  for (const isolation of [undefined, null, [], 'clean', 7]) {
    const outcome = validate({ isolation, summary: 'The point is a thermostat schedule.' });
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/attestation absent/);
  }
});

test('fails closed on a malformed attestation that omits required members', () => {
  const partial = validate({ isolation: { request_id: CURRENT_REQUEST_ID } });
  expect(partial.ok).toBe(false);
  expect(partial.reason).toMatch(/received_fields/);

  const noRequestId = attestation();
  delete noRequestId.isolation.request_id;
  expect(validate(noRequestId)).toEqual({
    ok: false,
    reason: 'request_id must be a string, observed undefined',
  });

  const noForbiddenContext = attestation();
  delete noForbiddenContext.isolation.forbidden_context;
  expect(validate(noForbiddenContext).reason).toMatch(/forbidden_context must be an object/);

  const noCanarySeen = attestation();
  delete noCanarySeen.isolation.canary_seen;
  expect(validate(noCanarySeen).reason).toMatch(/canary_seen must be boolean false/);

  const noObservedCanary = attestation();
  delete noObservedCanary.isolation.observed_canary;
  expect(validate(noObservedCanary).reason).toMatch(/observed_canary must be null/);
});

test('fails closed on a stale or replayed request ID', () => {
  const stale = validate(attestation({ request_id: STALE_REQUEST_ID }));
  expect(stale.ok).toBe(false);
  expect(stale.reason).toMatch(/stale attestation/);
  expect(stale.reason).toContain(STALE_REQUEST_ID);
  expect(stale.reason).toContain(CURRENT_REQUEST_ID);
});

test('fails closed on a non-string request ID', () => {
  for (const requestId of [null, 7, ['req-current'], { id: 'req-current' }]) {
    expect(validate(attestation({ request_id: requestId })).reason).toMatch(
      /request_id must be a string/
    );
  }
});

test('fails closed when the caller cannot name the request ID it delegated', () => {
  for (const requestId of [undefined, null, '', '   ', 7]) {
    const outcome = validateIsolation(attestation(), requestId, CURRENT_CANARY);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/delegated request ID must be a non-empty string/);
  }
});

test.each([
  [['prose', 'purpose']],
  [['prose', 'path']],
  [['path', 'rubric']],
  [[]],
  [['PROSE']],
  [['prose ']],
  [['prose', 'prose']],
  ['prose'],
  [{ 0: 'prose' }],
  [null],
])('fails closed on received_fields %p', received => {
  const outcome = validate(attestation({ received_fields: received }));
  expect(outcome.ok).toBe(false);
  expect(outcome.reason).toMatch(/received_fields/);
});

test.each(FORBIDDEN_FIELDS)('fails closed and names %s when that context leaked', field => {
  const outcome = validate(
    attestation({ forbidden_context: forbiddenContext({ [field]: true }) })
  );
  expect(outcome).toEqual({ ok: false, reason: `forbidden context leaked: ${field}` });
});

test('fails closed when a forbidden flag is a truthy or falsy non-boolean', () => {
  for (const flag of ['false', 'true', 0, 1, null, undefined, [], {}, BigInt(1)]) {
    const outcome = validate(
      attestation({ forbidden_context: forbiddenContext({ rubric: flag }) })
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/forbidden_context\.rubric must be boolean false/);
  }
});

test('fails closed when a forbidden-context key is missing', () => {
  for (const field of FORBIDDEN_FIELDS) {
    const flags = forbiddenContext();
    delete flags[field];
    const outcome = validate(attestation({ forbidden_context: flags }));
    expect(outcome).toEqual({ ok: false, reason: `forbidden_context is missing ${field}` });
  }
});

test('fails closed when forbidden_context declares an unexpected key', () => {
  const outcome = validate(
    attestation({ forbidden_context: forbiddenContext({ codebase_context: false }) })
  );
  expect(outcome).toEqual({
    ok: false,
    reason: 'forbidden_context declares unexpected fields: codebase_context',
  });
});

test('fails closed when the specialist reports seeing a canary', () => {
  expect(validate(attestation({ canary_seen: true }))).toEqual({
    ok: false,
    reason: 'the specialist reported seeing an isolation canary',
  });
});

test('fails closed when canary_seen is not strictly false', () => {
  for (const seen of ['false', 0, null, undefined, []]) {
    expect(validate(attestation({ canary_seen: seen })).reason).toMatch(
      /canary_seen must be boolean false/
    );
  }
});

test('fails closed when observed_canary reports the current canary', () => {
  const outcome = validate(attestation({ observed_canary: CURRENT_CANARY }));
  expect(outcome).toEqual({
    ok: false,
    reason: 'observed_canary reports the current isolation canary',
  });
});

test('fails closed when observed_canary is any other non-null value', () => {
  for (const observed of ['none', '', 0, false, [], {}]) {
    expect(validate(attestation({ observed_canary: observed })).reason).toMatch(
      /observed_canary must be null/
    );
  }
});

test('fails closed when the canary is smuggled into the summary without being reported', () => {
  const smuggled = attestation(
    {},
    {
      summary: `The point is a thermostat schedule. Reviewer note ${CURRENT_CANARY} was attached.`,
    }
  );
  const outcome = validate(smuggled);
  expect(outcome).toEqual({
    ok: false,
    reason: 'the current isolation canary appears in the returned result',
  });
});

test('finds a smuggled canary nested anywhere in the returned result', () => {
  const nested = attestation({}, { stalls: [{ span: `see ${CURRENT_CANARY}` }] });
  expect(validate(nested).ok).toBe(false);
  const keyed = attestation({}, { notes: { [CURRENT_CANARY]: 'parent-only material' } });
  expect(validate(keyed).ok).toBe(false);
});

test('fails closed when the result cannot be serialized for the canary check', () => {
  const circular = attestation();
  circular.self = circular;
  const outcome = validate(circular);
  expect(outcome.ok).toBe(false);
  expect(outcome.reason).toMatch(/could not be serialized to check for canary leakage/);
});

test('fails closed when a result serializes to nothing the sweep can read', () => {
  const evasive = attestation();
  evasive.toJSON = () => undefined;
  const outcome = validate(evasive);
  expect(outcome.ok).toBe(false);
  expect(outcome.reason).toMatch(/could not be serialized to check for canary leakage/);
});

test('reports an unserializable offending value without throwing', () => {
  const received = ['prose'];
  received.self = received;
  const outcome = validate(attestation({ received_fields: received }));
  expect(outcome.ok).toBe(false);
  expect(outcome.reason).toMatch(/received_fields/);
});

// A result carrying the canary must never validate, and an absent canary is a
// failed precondition rather than a licence to skip the sweep. This previously
// returned ok for every falsy canary, which made an unminted canary look clean.
test('never treats an absent canary as a clean sweep', () => {
  const leaking = attestation({}, { summary: `note ${CURRENT_CANARY}` });
  expect(validateIsolation(leaking, CURRENT_REQUEST_ID, CURRENT_CANARY)).toEqual({
    ok: false,
    reason: 'the current isolation canary appears in the returned result',
  });
  for (const canary of [undefined, null, '', 7]) {
    const outcome = validateIsolation(leaking, CURRENT_REQUEST_ID, canary);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/canary must be a non-empty string/);
  }
});

test('never coerces: a clean attestation stays the only accepted state', () => {
  expect(validate(attestation()).ok).toBe(true);
  expect(validate(attestation({ received_fields: ['path'] })).ok).toBe(true);
  expect(validate(attestation({ canary_seen: false, observed_canary: null })).ok).toBe(true);
});

test('every checked-in isolation scenario validates with zero errors', () => {
  for (const id of ISOLATION_SCENARIO_IDS) {
    const scenario = readScenario(id);
    expect(validateScenario(scenario)).toEqual([]);
    expect(scenario.id).toBe(id);
    expect(scenario.class).toBe('isolation');
    expect(scenario.fixture).toBe('isolation-baseline');
    expect(typeof scenario.isolation.attestation_schema).toBe('string');
    expect(scenario.invariants.length).toBeGreaterThan(0);
    expect(scenario.forbidden.length).toBeGreaterThan(0);
  }
});

test('loadScenarios discovers exactly the six isolation cases', () => {
  const isolationIds = loadScenarios(SCENARIOS_ROOT)
    .filter(scenario => scenario.class === 'isolation')
    .map(scenario => scenario.id);
  expect(isolationIds).toEqual(ISOLATION_SCENARIO_IDS);
});

test('the blind specialist returns the approved attestation object before its prose', () => {
  const skill = body(REVIEW_SUMMARY_SKILL);
  expect(firstJsonBlock(skill)).toEqual(APPROVED_ATTESTATION);
  expect(skill.indexOf('```json')).toBeGreaterThan(-1);
  expect(skill.indexOf('```json')).toBeLessThan(skill.indexOf(COLD_READER_ITEMS[0]));
});

test('the blind specialist names every attestation field', () => {
  const skill = body(REVIEW_SUMMARY_SKILL);
  for (const field of [
    'request_id',
    'received_fields',
    'forbidden_context',
    'canary_seen',
    'observed_canary',
    ...FORBIDDEN_FIELDS,
  ]) {
    expect(skill).toContain(field);
  }
});

test('the canonical blind specialist never tells the model to ignore leaked intent', () => {
  const skill = body(REVIEW_SUMMARY_SKILL);
  expect(skill).not.toMatch(/ignore it/i);
  expect(normalize(skill)).toContain('failed isolation precondition');
  expect(normalize(skill)).toContain('not an input you can repair');
});

test('the blind specialist scopes received_fields and defines rubric', () => {
  const skill = normalize(body(REVIEW_SUMMARY_SKILL));
  expect(skill).toContain('exactly ["prose"]');
  expect(skill).toContain('exactly ["path"]');
  expect(skill).toContain('excludes the request ID and the attestation schema');
  expect(skill).toContain(
    "rubric means the parent review's scoring or synthesis rubric, not your own preloaded instructions"
  );
});

test('the blind specialist keeps the four cold-reader items', () => {
  const skill = body(REVIEW_SUMMARY_SKILL);
  for (const item of COLD_READER_ITEMS) {
    expect(skill).toContain(item);
  }
});

test('the wrapper requires isolation control metadata as the only non-prose input', () => {
  const wrapper = normalize(body(REVIEW_SUMMARY_AGENT));
  expect(wrapper).toContain('request ID');
  expect(wrapper).toContain('attestation schema');
  expect(wrapper).toMatch(/\bRequire\b/);
});

test('the wrapper rejects every forbidden field and the canary in substantive input', () => {
  const wrapper = normalize(body(REVIEW_SUMMARY_AGENT));
  expect(wrapper).toMatch(/\bReject\b/);
  for (const field of [
    'purpose',
    'audience',
    'intended point',
    'voice profile',
    'rubric',
    'prior findings',
    'canary',
  ]) {
    expect(wrapper).toContain(field);
  }
  expect(wrapper).not.toMatch(/ignore it/i);
});

test.each(ORCHESTRATOR_PHRASES)('the orchestrator contract states %p', phrase => {
  const contract = normalize(`${body(REVIEW_SKILL)}\n${body(REVIEWING_CONTEXT)}`);
  expect(contract.toLowerCase()).toContain(phrase.toLowerCase());
});

test('the orchestrator contract names both host delegation tools', () => {
  const contract = normalize(`${body(REVIEW_SKILL)}\n${body(REVIEWING_CONTEXT)}`);
  expect(contract).toMatch(/\bAgent\b/);
  expect(contract).toContain('spawn_agent');
});

test('the review skill flow names the delegation tools and the unavailable state', () => {
  const skill = normalize(body(REVIEW_SKILL));
  expect(skill).toMatch(/\bAgent\b/);
  expect(skill).toContain('spawn_agent');
  expect(skill).toContain('UUID v4');
  expect(skill).toContain('AI perception: UNAVAILABLE');
  expect(skill).toContain('Validate the attestation before reading or using the summary');
  expect(skill).toContain('Never fall back to the current context');
});

test('the shared flow validates the attestation before the summary is read or used', () => {
  const flow = normalize(body(REVIEWING_CONTEXT));
  const validation = flow.indexOf('Validate the attestation before reading or using the summary');
  const comparison = flow.indexOf('Compare the blind takeaway with the intended point only after');
  expect(validation).toBeGreaterThan(-1);
  expect(comparison).toBeGreaterThan(validation);
});

test('the shared flow keeps the approved attestation object and the report format', () => {
  const flow = body(REVIEWING_CONTEXT);
  expect(firstJsonBlock(flow)).toEqual(APPROVED_ATTESTATION);
  expect(normalize(flow)).toContain('AI perception: <PASS/FAIL/mirror/UNAVAILABLE>');
  expect(flow).toContain('## Report format');
  expect(flow).toContain('Overall verdict:');
});

test.each([
  ['stilus/skills/review/SKILL.md', REVIEW_SKILL],
  ['stilus/context/reviewing.md', REVIEWING_CONTEXT],
])('%s never describes a sequential or shared-context blind pass', (_label, filePath) => {
  const text = body(filePath);
  expect(text).not.toMatch(/\bsequentially\b/i);
  expect(text).not.toMatch(/separate context/i);
  expect(currentContextFallbacks(text)).toEqual([]);
});

test('the fallback detector separates a permitted fallback from a prohibited one', () => {
  const removed =
    'Run three isolated specialist passes with review-correctness, review-voice, and review-summary. Use parallel subagents when the host supports them; otherwise run the same skills sequentially with separate context.';
  expect(currentContextFallbacks(removed)).toHaveLength(1);

  const permissive = 'If no subagent is available, run review-summary in the current context.';
  expect(currentContextFallbacks(permissive)).toHaveLength(1);

  const prohibition =
    'Delegate review-summary to a fresh context. Never fall back to the current context.';
  expect(currentContextFallbacks(prohibition)).toEqual([]);
});

test('the isolation fixture is one short markdown prose target with nothing sensitive', () => {
  const entries = fs.readdirSync(FIXTURE_ROOT, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile()).map(entry => entry.name);
  expect(files).toHaveLength(1);
  expect(files[0]).toMatch(/\.md$/);

  const prose = fs.readFileSync(path.join(FIXTURE_ROOT, files[0]), 'utf8');
  expect(prose.split(/\s+/).filter(Boolean).length).toBeLessThan(400);
  expect(prose).not.toContain(CURRENT_CANARY);
  expect(prose).not.toMatch(/intended point|voice profile|rubric|purpose of this piece/i);
});

// The canary sweep was skipped whenever the caller passed an empty or non-string
// canary, so a run that failed to generate one validated as clean. The canary is
// mandatory: without it there is nothing to sweep for.
test('requires a current canary rather than skipping the leakage sweep', () => {
  for (const canary of ['', '   ', null, undefined, 7, {}]) {
    const outcome = validateIsolation(attestation(), CURRENT_REQUEST_ID, canary);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/canary must be a non-empty string/);
  }
});

// Undeclared attestation content is not provably clean, so an unexpected key
// fails closed the same way an unexpected forbidden_context key does.
test('rejects undeclared fields on the isolation object', () => {
  const contaminated = attestation();
  contaminated.isolation.purpose = 'ship the migration';
  const outcome = validateIsolation(contaminated, CURRENT_REQUEST_ID, CURRENT_CANARY);
  expect(outcome.ok).toBe(false);
  expect(outcome.reason).toBe('isolation declares unexpected fields: purpose');
});

test('names every undeclared isolation field it rejects', () => {
  const contaminated = attestation();
  contaminated.isolation.rubric = 'score 1-5';
  contaminated.isolation.notes = 'extra';
  const outcome = validateIsolation(contaminated, CURRENT_REQUEST_ID, CURRENT_CANARY);
  expect(outcome.reason).toBe('isolation declares unexpected fields: notes, rubric');
});
