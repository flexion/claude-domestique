'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  EVIDENCE_FIELDS,
  sanitizeEvidence,
  writeEvidence,
} = require('../parity/evidence');

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');
const RELEASE_DATE = '2026-08-09';
const RELEASE = 'parity-v1';

const roots = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-evidence-'));
  roots.push(root);
  return root;
}

const unrelatedTranscript = [
  'User: unrelated billing question',
  `Assistant: ${'filler '.repeat(700)}`,
  'User: UNRELATED_TAIL_MARKER',
].join('\n');

function evidenceRecord() {
  return {
    scenario_id: 'stilus-review-positive',
    prompt: 'Review this draft for voice and correctness.',
    plugin_versions: { stilus: '1.4.2', memento: '2.0.1' },
    host: 'claude',
    host_version: '2.1.226',
    arm: 'guided',
    trial: 3,
    observations: {
      selected_skill: 'stilus:review',
      exit_status: 0,
      state_files: {
        '/Users/alice/project/.claude/sessions/issue-feature-42-auth.md': 'branch: issue/feature-42/auth\n',
      },
      // `extra` is an allowlisted open bag, so its contents must be REDACTED
      // rather than dropped. Everything secret-bearing lives here so the
      // redaction rules are genuinely exercised.
      extra: {
        command: 'ANTHROPIC_API_KEY=sk-ant-api03-EXAMPLE node run.js',
        shell_env: 'OPENAI_API_KEY=sk-EXAMPLE GITHUB_TOKEN=ghp_EXAMPLE CODEX_API_KEY=sk-EXAMPLE',
        env_object: {
          ANTHROPIC_API_KEY: 'sk-ant-api03-EXAMPLE',
          GH_TOKEN: 'github_pat_EXAMPLE',
        },
        headers: {
          'Authorization: Bearer EXAMPLE': 'request one',
          'authorization: basic ZXhhbXBsZQ==': 'request two',
        },
        loose_material: [
          'sk-ant-api03-EXAMPLE',
          'ghp_EXAMPLE',
          'github_pat_EXAMPLE',
          '{"GITHUB_TOKEN": "ghp_EXAMPLE"}',
          'AUTHORIZATION: BEARER EXAMPLE',
        ],
        paths: [
          '/Users/alice/secret/notes.md',
          '/home/alice/secret/notes.md',
          'C:\\Users\\alice\\secret\\notes.md',
          path.join(REPOSITORY_ROOT, 'scripts', 'parity', 'evidence.js'),
        ],
        nested: { deep: [{ deeper: { 'GH_TOKEN=ghp_EXAMPLE': 'key form' } }] },
        transcript: unrelatedTranscript,
      },
      // Not an allowlisted observation key: dropped outright, not redacted.
      raw_turns: 'User: DROPPED_OBSERVATION_MARKER unrelated conversation',
    },
    state_changes: [
      { path: '.claude/sessions/issue-feature-42-auth.md', change: 'created' },
      { path: '/Users/alice/project/.claude/branches/issue-feature-42-auth', change: 'modified' },
    ],
    invariants: [
      { type: 'report_has_voice_section', pass: true },
      { type: 'report_has_ai_perception', pass: false },
    ],
    infrastructure_failure: null,
    reviewed_hook_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    result: 'fail',
    env: { ANTHROPIC_API_KEY: 'sk-ant-api03-EXAMPLE' },
    raw_transcript: 'User: RAW_TRANSCRIPT_MARKER\nAssistant: unrelated advice',
    argv: ['node', 'runner.js', '--token', 'ghp_EXAMPLE'],
  };
}

function replacements() {
  return [{ find: REPOSITORY_ROOT, replace: '[REPO]' }];
}

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

test('exports the approved allowlist in the documented order', () => {
  expect(EVIDENCE_FIELDS).toEqual([
    'scenario_id', 'prompt', 'plugin_versions', 'host', 'host_version',
    'arm', 'trial', 'observations', 'state_changes', 'invariants',
    'infrastructure_failure', 'reviewed_hook_hash', 'result',
  ]);
});

test('keeps only allowlisted top-level fields', () => {
  const sanitized = sanitizeEvidence(evidenceRecord(), replacements());
  expect(Object.keys(sanitized).sort()).toEqual([...EVIDENCE_FIELDS].sort());
  expect(sanitized).not.toHaveProperty('env');
  expect(sanitized).not.toHaveProperty('raw_transcript');
  expect(sanitized).not.toHaveProperty('argv');
  expect(JSON.stringify(sanitized)).not.toContain('RAW_TRANSCRIPT_MARKER');
});

test('drops unknown top-level fields even when they hold no secret', () => {
  const sanitized = sanitizeEvidence({ scenario_id: 'a', notes: 'harmless' }, []);
  expect(sanitized).toEqual({ scenario_id: 'a' });
});

test('allowlists observation keys so unrelated history cannot ride inside observations', () => {
  const sanitized = sanitizeEvidence(evidenceRecord(), replacements());
  expect(Object.keys(sanitized.observations).sort())
    .toEqual(['exit_status', 'extra', 'selected_skill', 'state_files']);
  expect(sanitized.observations).not.toHaveProperty('raw_turns');
  expect(JSON.stringify(sanitized)).not.toContain('DROPPED_OBSERVATION_MARKER');
});

test('redacts a Windows user-home path and keeps the relative tail', () => {
  const sanitized = sanitizeEvidence(
    { scenario_id: 'a', prompt: 'C:\\Users\\alice\\secret\\notes.md' },
    [],
  );
  expect(sanitized.prompt).toBe('[REDACTED_HOME]\\secret\\notes.md');
});

test('removes every synthetic secret at every nesting depth', () => {
  const serialized = JSON.stringify(sanitizeEvidence(evidenceRecord(), replacements()));

  expect(serialized).not.toContain('EXAMPLE');
  expect(serialized).not.toContain('ZXhhbXBsZQ==');
  expect(serialized).not.toContain('sk-ant-');
  expect(serialized).not.toContain('sk-EX');
  expect(serialized).not.toContain('ghp_');
  expect(serialized).not.toContain('github_pat_');
  expect(serialized).not.toContain('/Users/alice');
  expect(serialized).not.toContain('/home/alice');
  expect(serialized).not.toContain(REPOSITORY_ROOT);
  expect(serialized).not.toContain('UNRELATED_TAIL_MARKER');
});

test('redacts secrets that appear in object keys', () => {
  const sanitized = sanitizeEvidence(evidenceRecord(), replacements());
  const headerKeys = Object.keys(sanitized.observations.extra.headers);
  expect(headerKeys).toHaveLength(2);
  for (const key of headerKeys) {
    expect(key).toContain('[REDACTED_AUTHORIZATION]');
    expect(key).not.toContain('EXAMPLE');
  }
  const deepKeys = Object.keys(sanitized.observations.extra.nested.deep[0].deeper);
  expect(deepKeys).toEqual(['GH_TOKEN=[REDACTED_TOKEN]']);
});

test('applies caller replacements before pattern rules and keeps the relative tail', () => {
  const sanitized = sanitizeEvidence(evidenceRecord(), replacements());
  expect(sanitized.observations.extra.paths).toEqual([
    '[REDACTED_HOME]/secret/notes.md',
    '[REDACTED_HOME]/secret/notes.md',
    '[REDACTED_HOME]\\secret\\notes.md',
    '[REPO]/scripts/parity/evidence.js',
  ]);
});

test('accepts replacements as a plain object and escapes regex metacharacters', () => {
  const sanitized = sanitizeEvidence(
    { scenario_id: 'a', observations: { extra: { home: '/tmp/host+home (1)/config' } } },
    { '/tmp/host+home (1)': '[HOST_HOME]' },
  );
  expect(sanitized.observations.extra.home).toBe('[HOST_HOME]/config');
});

test('truncates any single oversized string so a transcript cannot ride along', () => {
  const sanitized = sanitizeEvidence(evidenceRecord(), replacements());
  const transcript = sanitized.observations.extra.transcript;
  expect(transcript.endsWith('…[TRUNCATED]')).toBe(true);
  expect(transcript).toHaveLength(4000 + '…[TRUNCATED]'.length);
});

test('preserves every allowlisted value that carries no secret', () => {
  const sanitized = sanitizeEvidence(evidenceRecord(), replacements());
  expect(sanitized.scenario_id).toBe('stilus-review-positive');
  expect(sanitized.prompt).toBe('Review this draft for voice and correctness.');
  expect(sanitized.plugin_versions).toEqual({ stilus: '1.4.2', memento: '2.0.1' });
  expect(sanitized.host).toBe('claude');
  expect(sanitized.host_version).toBe('2.1.226');
  expect(sanitized.arm).toBe('guided');
  expect(sanitized.trial).toBe(3);
  expect(sanitized.observations.selected_skill).toBe('stilus:review');
  expect(sanitized.state_changes[0]).toEqual({
    path: '.claude/sessions/issue-feature-42-auth.md',
    change: 'created',
  });
  expect(sanitized.state_changes[1].change).toBe('modified');
  expect(sanitized.invariants).toEqual([
    { type: 'report_has_voice_section', pass: true },
    { type: 'report_has_ai_perception', pass: false },
  ]);
  expect(sanitized.infrastructure_failure).toBeNull();
  expect(sanitized.reviewed_hook_hash)
    .toBe('sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(sanitized.result).toBe('fail');
});

test('never mutates the caller record', () => {
  const record = evidenceRecord();
  const before = JSON.stringify(record);
  sanitizeEvidence(record, replacements());
  expect(JSON.stringify(record)).toBe(before);
});

test('writes sanitized JSON to the dated release directory', () => {
  const root = tempRoot();
  const written = writeEvidence({
    root,
    release: RELEASE,
    record: evidenceRecord(),
    replacements: replacements(),
    now: RELEASE_DATE,
  });

  const expectedDirectory = path.join(root, 'docs', 'release-evidence', `${RELEASE_DATE}-${RELEASE}`);
  expect(path.dirname(written)).toBe(expectedDirectory);
  expect(path.basename(written)).toBe('stilus-review-positive-claude-2.1.226-guided-trial3.json');

  const content = fs.readFileSync(written, 'utf8');
  const parsed = JSON.parse(content);
  expect(parsed.scenario_id).toBe('stilus-review-positive');
  expect(Object.keys(parsed).sort()).toEqual([...EVIDENCE_FIELDS].sort());
  expect(content).not.toContain('EXAMPLE');
  expect(content).not.toContain('ZXhhbXBsZQ==');
  expect(content).not.toContain('/Users/alice');
  expect(content).not.toContain(REPOSITORY_ROOT);
  expect(content).not.toContain('RAW_TRANSCRIPT_MARKER');

  const leftovers = fs.readdirSync(expectedDirectory).filter(name => name.includes('.tmp-'));
  expect(leftovers).toEqual([]);
});

test('prefers the record date over the injected clock', () => {
  const root = tempRoot();
  const record = evidenceRecord();
  record.date = '2026-07-01';
  const written = writeEvidence({
    root,
    release: RELEASE,
    record,
    replacements: replacements(),
    now: RELEASE_DATE,
  });
  expect(path.dirname(written))
    .toBe(path.join(root, 'docs', 'release-evidence', `2026-07-01-${RELEASE}`));
});

test('accepts an injected Date instance for the release directory', () => {
  const root = tempRoot();
  const written = writeEvidence({
    root,
    release: RELEASE,
    record: { scenario_id: 'a', host: 'codex', arm: 'control', trial: 1 },
    now: new Date('2026-05-04T12:00:00Z'),
  });
  expect(path.dirname(written))
    .toBe(path.join(root, 'docs', 'release-evidence', `2026-05-04-${RELEASE}`));
});

test('confines a path-traversal scenario id to the release directory', () => {
  const root = tempRoot();
  const written = writeEvidence({
    root,
    release: RELEASE,
    record: {
      scenario_id: '../../../../etc/passwd',
      host: 'claude/../..',
      arm: '..\\..',
      trial: '1/../2',
    },
    now: RELEASE_DATE,
  });

  const expectedDirectory = path.join(root, 'docs', 'release-evidence', `${RELEASE_DATE}-${RELEASE}`);
  expect(path.dirname(written)).toBe(expectedDirectory);
  expect(path.basename(written)).not.toContain('..');
  expect(path.basename(written)).not.toContain('/');
  expect(fs.existsSync(written)).toBe(true);
  expect(fs.readdirSync(expectedDirectory)).toHaveLength(1);
});

test('rejects a record without a scenario id', () => {
  const root = tempRoot();
  expect(() => writeEvidence({
    root,
    release: RELEASE,
    record: { host: 'claude', arm: 'guided', trial: 1 },
    now: RELEASE_DATE,
  })).toThrow(/scenario_id/);
});
