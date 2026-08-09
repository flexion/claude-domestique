'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateBundle } = require('../verify-release-evidence');

const roots = [];
function bundle(manualTrust, cells) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-evidence-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
    release: 'candidate-1',
    host_cells: cells || [
      { host: 'claude', version: '2.1.226', roles: ['minimum', 'current'] },
      { host: 'codex', version: '0.147.0', roles: ['minimum', 'current'] },
    ],
    manual_trust: manualTrust,
  }, null, 2));
  fs.writeFileSync(path.join(root, 'trial.json'), JSON.stringify({
    scenario_id: 'one', host: 'claude', host_version: '2.1.226', arm: 'guided',
    trial: 1, observations: { output: 'safe' }, state_changes: [], invariants: [], result: 'PASS',
  }, null, 2));
  return root;
}

const HASH = 'a'.repeat(64);
function validTrust(overrides = {}) {
  return {
    reviewed_hook_hash: HASH,
    approved_hook_hash: HASH,
    approved_via: '/hooks',
    before: { skipped: true },
    after: { sentinel: true },
    bypass_used: false,
    ...overrides,
  };
}

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

test('accepts a complete sanitized release bundle', () => {
  expect(validateBundle(bundle(validTrust()))).toEqual([]);
});

test.each([
  ['missing hash', { reviewed_hook_hash: undefined }, 'reviewed_hook_hash'],
  ['mismatched hash', { approved_hook_hash: 'b'.repeat(64) }, 'hashes do not match'],
  ['bypass execution', { bypass_used: true }, 'bypass cannot satisfy trust'],
  ['wrong approval surface', { approved_via: '--dangerously-bypass-hook-trust' }, 'approved_via must be /hooks'],
  ['missing before observation', { before: {} }, 'before.skipped'],
  ['missing after observation', { after: {} }, 'after.sentinel'],
])('rejects %s', (_label, overrides, message) => {
  expect(validateBundle(bundle(validTrust(overrides))).join('\n')).toContain(message);
});

test('rejects missing host/version roles', () => {
  const cells = [{ host: 'claude', version: '2.1.226', roles: ['minimum'] }];
  expect(validateBundle(bundle(validTrust(), cells)).join('\n')).toContain('missing host/version role codex:minimum');
  expect(validateBundle(bundle(validTrust(), cells)).join('\n')).toContain('missing host/version role claude:current');
});

test('rejects unsanitized secrets and absolute home paths', () => {
  const root = bundle(validTrust());
  fs.writeFileSync(path.join(root, 'leak.json'), JSON.stringify({
    scenario_id: 'leak', host: 'codex', host_version: '0.147.0', arm: 'guided', trial: 1,
    observations: { output: 'Authorization: Bearer secret-token at /Users/alice/project' },
    state_changes: [], invariants: [], result: 'PASS',
  }));
  const errors = validateBundle(root).join('\n');
  expect(errors).toContain('unsanitized');
});
