'use strict';

const path = require('path');
const { runDeterministic, validateReleaseEnvironment } = require('../parity/deterministic');
const { main } = require('../run-parity');

const ROOT = path.resolve(__dirname, '..', '..');

test('deterministic mode validates scenarios, hooks, and exact-path handoffs without models', () => {
  const report = runDeterministic({ root: ROOT });
  expect(report.pass).toBe(true);
  expect(report.model_invocations).toBe(0);
  expect(report.hooks).toEqual({ passed: 4, total: 4 });
  expect(report.handoffs).toEqual({ passed: 2, total: 2 });
  expect(report.message).toContain('model-level parity was not evaluated');
});

test('release mode requires explicit opt-in, both credentials, a TTY, and a temp root', () => {
  expect(validateReleaseEnvironment({ env: {}, isTTY: true, tempRoot: '/tmp/parity' })).toContain('PARITY_RELEASE=1');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1' }, isTTY: true, tempRoot: '/tmp/parity' })).toContain('CLAUDE_API_KEY');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1', CLAUDE_API_KEY: 'x', OPENAI_API_KEY: 'y' }, isTTY: false, tempRoot: '/tmp/parity' })).toContain('interactive TTY');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1', CLAUDE_API_KEY: 'x', OPENAI_API_KEY: 'y' }, isTTY: true })).toContain('temporary root');
  expect(validateReleaseEnvironment({ env: { PARITY_RELEASE: '1', CLAUDE_API_KEY: 'x', OPENAI_API_KEY: 'y' }, isTTY: true, tempRoot: '/tmp/parity' })).toEqual([]);
});

test('the CLI cannot enter release mode from credential-free CI', async () => {
  await expect(main(['--mode', 'release'], {})).rejects.toThrow(
    'release parity prerequisites missing'
  );
});
