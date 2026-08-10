'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runDeterministic, validateReleaseEnvironment } = require('../parity/deterministic');
const {
  KNOWN_OPTIONS,
  findInstalledHookConfig,
  assertObservedVersion,
  main,
  parseVersion,
  trustRecord,
} = require('../run-parity');

const ROOT = path.resolve(__dirname, '..', '..');

test('deterministic mode validates scenarios, hooks, and exact-path handoffs without models', () => {
  const report = runDeterministic({ root: ROOT });
  expect(report.pass).toBe(true);
  expect(report.model_invocations).toBe(0);
  expect(report.hooks).toEqual({ passed: 4, total: 4 });
  expect(report.handoffs).toEqual({ passed: 2, total: 2 });
  expect(report.message).toContain('model-level parity was not evaluated');
});

// Authentication is deliberately NOT asserted here any more. A subscription login
// carries no API-key variable, so requiring one made the gate unrunnable for
// CLI-subscription operators. Authentication is proved at preflight by probing
// each host's own status command inside a seeded isolated home.
test('release mode requires explicit opt-in, a TTY, and a temp root', () => {
  expect(validateReleaseEnvironment({ env: {}, isTTY: true, tempRoot: '/tmp/parity' })).toContain('PARITY_RELEASE=1');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1' }, isTTY: false, tempRoot: '/tmp/parity' })).toContain('interactive TTY');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1' }, isTTY: true })).toContain('temporary root');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1' }, isTTY: true, tempRoot: '/tmp/parity' })).toEqual([]);
});

test('an API key is neither required nor rejected', () => {
  expect(validateReleaseEnvironment({
    env: { PARITY_RELEASE: '1', CLAUDE_API_KEY: 'x', OPENAI_API_KEY: 'y' },
    isTTY: true, tempRoot: '/tmp/parity',
  })).toEqual([]);
});

test('the CLI cannot enter release mode from credential-free CI', async () => {
  await expect(main(['--mode', 'release'], {})).rejects.toThrow(
    'release parity prerequisites missing'
  );
});

// A misspelled optional flag used to fall through to its default. For
// --claude-current that silently reran the minimum binary while the manifest
// still stamped both the minimum and current role labels, so the bundle claimed
// a current-version cell that never executed.
test('rejects an unknown flag instead of silently defaulting it', async () => {
  await expect(main(['--mode', 'deterministic', '--claude-currnt', '2.1.300'], {}))
    .rejects.toThrow('unknown parity option: --claude-currnt');
  await expect(main(['--nonsense'], {})).rejects.toThrow('unknown parity option: --nonsense');
});

test('accepts every documented flag', async () => {
  const report = await main(['--mode', 'deterministic'], {});
  expect(report.pass).toBe(true);
  for (const flag of ['release', 'temp-root', 'claude-current', 'codex-current', 'scenario']) {
    expect(KNOWN_OPTIONS).toContain(flag);
  }
  expect(KNOWN_OPTIONS).toContain('mode');
});

test('--scenario narrows the deterministic scenario set', async () => {
  const all = await main(['--mode', 'deterministic'], {});
  const one = await main(['--mode', 'deterministic', '--scenario', 'stilus-review-positive'], {});
  expect(one.scenarios).toBe(1);
  expect(one.scenarios).toBeLessThan(all.scenarios);
  expect(one.pass).toBe(true);
});

test('--scenario accepts a comma-separated list', async () => {
  const two = await main(
    ['--mode', 'deterministic', '--scenario', 'stilus-review-positive,onus-commit-negative'],
    {},
  );
  expect(two.scenarios).toBe(2);
});

test('--scenario rejects an unknown id rather than running an empty matrix', async () => {
  await expect(main(['--mode', 'deterministic', '--scenario', 'no-such-scenario'], {}))
    .rejects.toThrow('unknown scenario id: no-such-scenario');
});

test('parseVersion reads the version a host binary actually reports', () => {
  expect(parseVersion('2.1.226 (Claude Code)')).toBe('2.1.226');
  expect(parseVersion('codex-cli 0.147.0')).toBe('0.147.0');
  expect(parseVersion('0.147.0\n')).toBe('0.147.0');
  expect(parseVersion('no version here')).toBe(null);
  expect(parseVersion('')).toBe(null);
});

// A declared floor that the binary does not report makes the evidence a lie, so
// the mismatch must abort the run rather than be recorded.
test('assertObservedVersion rejects a binary that does not report the declared version', () => {
  expect(() => assertObservedVersion('claude', '2.1.226', '2.1.226 (Claude Code)')).not.toThrow();
  expect(() => assertObservedVersion('codex', '0.147.0', 'codex-cli 0.147.0')).not.toThrow();
  expect(() => assertObservedVersion('claude', '2.1.226', '2.1.100 (Claude Code)'))
    .toThrow('claude reported version 2.1.100 but the matrix declared 2.1.226');
  expect(() => assertObservedVersion('codex', '0.147.0', 'garbage'))
    .toThrow('codex did not report a parsable version');
});

// The trust record is hand-written by the operator, so extra fields must not
// reach the retained manifest.
test('trustRecord allowlists the operator-authored trust fields', () => {
  const record = trustRecord({
    reviewed_hook_hash: 'a'.repeat(64),
    approved_hook_hash: 'a'.repeat(64),
    approved_via: '/hooks',
    before: { skipped: true },
    after: { sentinel: true },
    bypass_used: false,
    api_key: 'sk-ant-secret',
    codex_home: '/Users/alice/.codex',
  });
  expect(Object.keys(record).sort()).toEqual([
    'after', 'approved_hook_hash', 'approved_via', 'before', 'bypass_used', 'reviewed_hook_hash',
  ]);
  expect(JSON.stringify(record)).not.toContain('sk-ant-secret');
  expect(JSON.stringify(record)).not.toContain('/Users/alice');
});

// Credentials, opt-in, and a pseudo-TTY are all reachable from a workflow, so the
// GitHub event itself has to be disqualifying: the gate is operator-run by design.
test('release mode refuses to run under any GitHub Actions event', () => {
  const ready = { PARITY_RELEASE: '1', CLAUDE_API_KEY: 'x', OPENAI_API_KEY: 'y' };
  expect(validateReleaseEnvironment({ env: ready, isTTY: true, tempRoot: '/tmp/p' })).toEqual([]);
  for (const event of ['pull_request', 'push', 'workflow_dispatch']) {
    expect(validateReleaseEnvironment({
      env: { ...ready, GITHUB_EVENT_NAME: event }, isTTY: true, tempRoot: '/tmp/p',
    })).toContain(`no GitHub Actions event (observed ${event})`);
  }
});

test('the CLI refuses release mode from a fully provisioned pull_request job', async () => {
  await expect(main(['--mode', 'release', '--release', 'r', '--temp-root', '/tmp/p'], {
    PARITY_RELEASE: '1', GITHUB_EVENT_NAME: 'pull_request',
  })).rejects.toThrow('no GitHub Actions event');
});

// Never fall back to the working-tree copy: /hooks reviews what was installed.
test('findInstalledHookConfig locates the installed hook config and never guesses', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-trust-'));
  try {
    expect(findInstalledHookConfig(home, 'memento')).toBe(null);
    const installed = path.join(home, 'plugins', 'memento', 'hooks', 'hooks.json');
    fs.mkdirSync(path.dirname(installed), { recursive: true });
    fs.writeFileSync(installed, '{}');
    expect(findInstalledHookConfig(home, 'memento')).toBe(installed);
    // A hooks.json belonging to another plugin must not satisfy the lookup.
    expect(findInstalledHookConfig(home, 'onus')).toBe(null);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
