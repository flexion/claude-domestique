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
  // Every declared host cell needs a trial behind it, so a complete bundle
  // carries both hosts.
  fs.writeFileSync(path.join(root, 'trial-claude.json'), JSON.stringify({
    scenario_id: 'one', host: 'claude', host_version: '2.1.226', arm: 'guided',
    trial: 1, observations: { output: 'safe' }, state_changes: [], invariants: [], result: 'PASS',
  }, null, 2));
  fs.writeFileSync(path.join(root, 'trial-codex.json'), JSON.stringify({
    scenario_id: 'one', host: 'codex', host_version: '0.147.0', arm: 'guided',
    trial: 1, observations: { output: 'safe' }, state_changes: [], invariants: [], result: 'PASS',
  }, null, 2));
  return root;
}

function writeTrial(root, name, overrides) {
  fs.writeFileSync(path.join(root, name), JSON.stringify({
    scenario_id: 'one', host: 'claude', host_version: '2.1.226', arm: 'guided',
    trial: 1, observations: { output: 'safe' }, state_changes: [], invariants: [], result: 'PASS',
    ...overrides,
  }, null, 2));
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

// A manifest can assert every host role while no trial ever ran. Accepting that
// would let the gate certify a bundle that proves nothing.
test('rejects a bundle whose manifest claims roles but holds no trial evidence', () => {
  const root = bundle(validTrust());
  for (const name of fs.readdirSync(root)) {
    if (name !== 'manifest.json') fs.rmSync(path.join(root, name));
  }
  expect(validateBundle(root)).toContain(
    'bundle contains no trial evidence; a manifest alone cannot support a parity claim'
  );
});

// A behavioral failure remains a failed release result; it cannot be retained
// as passing evidence.
test('rejects a retained trial whose result is not PASS', () => {
  const root = bundle(validTrust());
  writeTrial(root, 'trial-claude.json', { result: 'FAIL' });
  expect(validateBundle(root)).toContain(
    'trial-claude.json: trial result is "FAIL"; every retained trial must be PASS'
  );
});

test('rejects a declared host cell with no matching trial', () => {
  const root = bundle(validTrust());
  fs.rmSync(path.join(root, 'trial-codex.json'));
  expect(validateBundle(root)).toContain('host cell codex:0.147.0 has no trial evidence');
});

test('rejects a trial that cannot be attributed to a host cell', () => {
  const root = bundle(validTrust());
  writeTrial(root, 'trial-claude.json', { host: '' });
  expect(validateBundle(root)).toContain(
    'trial-claude.json: host is required to attribute the trial to a host cell'
  );
});
