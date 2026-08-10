'use strict';

// Stilus blind-review contract. The parity harness that once executed these
// scenarios against live hosts has been removed; this file keeps the part that
// still guards shipped behavior: that the review orchestrator and the blind
// summarizer describe a fail-closed fresh-context delegation, and never a
// sequential pass in a context that has already seen the intended point.

const fs = require('fs');
const path = require('path');

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');

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
