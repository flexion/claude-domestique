'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runScenario } = require('../parity/run');

const roots = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-runner-'));
  roots.push(root);
  return root;
}

function scenario(overrides = {}) {
  return {
    id: 'skill-positive',
    class: 'discovery',
    prompt: 'Use the appropriate skill.',
    fixture: 'discovery/catalog',
    target_skill: 'stilus:review',
    expectation: 'positive',
    control: { ablate_description: true },
    invariants: [{ type: 'selected_skill', value: 'stilus:review', description: 'selected' }],
    forbidden: [],
    ...overrides,
  };
}

function adapter(results = []) {
  const calls = [];
  return {
    calls,
    install: async options => { calls.push({ type: 'install', options }); return { ok: true }; },
    run: async options => {
      calls.push({ type: 'run', options });
      return results.length > 0 ? results.shift() : {
        scenario_id: options.scenarioId,
        host: options.host,
        host_version: options.hostVersion,
        arm: options.arm,
        trial: options.trial,
        outcome: 'PASS',
        observations: { selected_skill: options.arm === 'guided' ? 'stilus:review' : null, output: '', exit_status: 0, state_files: {}, extra: {} },
        state_changes: [],
        invariants: [],
      };
    },
  };
}

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

test('discovery runs five control and five guided trials with isolated paths and control versions', async () => {
  const host = adapter();
  const report = await runScenario({
    scenario: scenario(),
    hosts: { claude: host },
    versions: { claude: ['2.1.226'] },
    tempRoot: tempRoot(),
    release: true,
  });
  const runs = host.calls.filter(call => call.type === 'run');
  expect(runs).toHaveLength(10);
  expect(runs.filter(call => call.options.arm === 'control')).toHaveLength(5);
  expect(new Set(runs.map(call => call.options.home)).size).toBe(10);
  expect(new Set(runs.map(call => call.options.cwd)).size).toBe(10);
  expect(new Set(runs.map(call => call.options.requestId)).size).toBe(10);
  expect(new Set(runs.map(call => call.options.canary)).size).toBe(10);
  expect(runs.filter(call => call.options.arm === 'control').every(call =>
    call.options.controlVersion.startsWith('0.0.0-control.'))).toBe(true);
  expect(report.pass).toBe(true);
});

test('direct and hook scenarios run once per host version', async () => {
  for (const behaviorClass of ['direct', 'hook']) {
    const host = adapter();
    await runScenario({
      scenario: scenario({ class: behaviorClass, invocation: { claude: '/stilus:review', codex: '$stilus:review' } }),
      hosts: { claude: host },
      versions: { claude: ['minimum', 'current'] },
      tempRoot: tempRoot(),
      release: true,
    });
    expect(host.calls.filter(call => call.type === 'run')).toHaveLength(2);
  }
});

test('one infrastructure failure is retried but behavioral failure is not', async () => {
  const infrastructure = { outcome: 'INFRASTRUCTURE_FAILURE', infrastructure_failure: { kind: 'timeout', detail: 'timeout' }, observations: {}, state_changes: [], invariants: [] };
  const success = { outcome: 'PASS', observations: { selected_skill: 'stilus:review' }, state_changes: [], invariants: [] };
  const infraHost = adapter([infrastructure, success]);
  await runScenario({ scenario: scenario({ class: 'direct' }), hosts: { claude: infraHost }, versions: { claude: ['v'] }, tempRoot: tempRoot(), release: true });
  expect(infraHost.calls.filter(call => call.type === 'run')).toHaveLength(2);

  const failed = { outcome: 'FAIL', observations: { selected_skill: null }, state_changes: [], invariants: [] };
  const behaviorHost = adapter([failed, success]);
  await runScenario({ scenario: scenario({ class: 'direct' }), hosts: { claude: behaviorHost }, versions: { claude: ['v'] }, tempRoot: tempRoot(), release: true });
  expect(behaviorHost.calls.filter(call => call.type === 'run')).toHaveLength(1);
});

test('a forbidden action short-circuits the remaining trials', async () => {
  const bad = { outcome: 'PASS', observations: { selected_skill: 'stilus:review' }, forbidden_actions: ['edited prose'], state_changes: [], invariants: [] };
  const host = adapter([bad]);
  const report = await runScenario({ scenario: scenario(), hosts: { claude: host }, versions: { claude: ['v'] }, tempRoot: tempRoot(), release: true });
  expect(host.calls.filter(call => call.type === 'run')).toHaveLength(1);
  expect(report.pass).toBe(false);
  expect(report.reason).toContain('forbidden action');
});

test('UNAVAILABLE passes an allowed degraded scenario but fails a full-parity scenario', async () => {
  const unavailable = { outcome: 'UNAVAILABLE', observations: {}, state_changes: [], invariants: [] };
  const degraded = await runScenario({ scenario: scenario({ class: 'isolation', allow_unavailable: true }), hosts: { codex: adapter([unavailable]) }, versions: { codex: ['v'] }, tempRoot: tempRoot(), release: true });
  expect(degraded.pass).toBe(true);
  const full = await runScenario({ scenario: scenario({ class: 'isolation', allow_unavailable: false }), hosts: { codex: adapter([unavailable]) }, versions: { codex: ['v'] }, tempRoot: tempRoot(), release: true });
  expect(full.pass).toBe(false);
});
