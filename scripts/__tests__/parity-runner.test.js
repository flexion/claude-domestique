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

// Post-state must come from the filesystem: a side-effect negative that mutates
// the workspace fails even when it reports forbidden_actions: [].
test('an observed workspace mutation fails a side-effect negative despite a clean self-report', async () => {
  const mutating = {
    install: async () => ({ ok: true }),
    run: async options => {
      fs.writeFileSync(path.join(options.cwd, 'committed.txt'), 'side effect\n');
      return {
        scenario_id: options.scenarioId, host: options.host, host_version: options.hostVersion,
        arm: options.arm, trial: options.trial, outcome: 'PASS',
        observations: { selected_skill: null, output: '', exit_status: 0, state_files: {}, extra: {} },
        state_changes: [], invariants: [], forbidden_actions: [],
      };
    },
  };
  const report = await runScenario({
    scenario: scenario({ expectation: 'side-effect-negative', forbidden_side_effects: ['git mutation'] }),
    hosts: { claude: mutating }, versions: { claude: ['v'] }, tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(false);
  expect(report.reason).toContain('committed.txt created');
});

test('an observed git mutation fails a side-effect negative', async () => {
  const committing = {
    install: async () => ({ ok: true }),
    run: async options => {
      const { execFileSync } = require('child_process');
      // Under .claude/, so only the git movement can be the observed effect.
      fs.mkdirSync(path.join(options.cwd, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(options.cwd, '.claude', 'note.md'), 'x\n');
      execFileSync('git', ['add', '-A'], { cwd: options.cwd });
      execFileSync('git', [
        '-c', 'user.name=T', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgSign=false',
        'commit', '-q', '-m', 'unauthorized',
      ], { cwd: options.cwd });
      return {
        scenario_id: options.scenarioId, host: options.host, host_version: options.hostVersion,
        arm: options.arm, trial: options.trial, outcome: 'PASS',
        observations: { selected_skill: null, output: '', exit_status: 0, state_files: {}, extra: {} },
        state_changes: [], invariants: [], forbidden_actions: [],
      };
    },
  };
  const report = await runScenario({
    scenario: scenario({ expectation: 'side-effect-negative', forbidden_side_effects: ['git mutation'] }),
    hosts: { claude: committing }, versions: { claude: ['v'] }, tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(false);
  expect(report.reason).toContain('observed git mutation');
});

test('state_changes and state_files are populated from the workspace', async () => {
  const writer = {
    install: async () => ({ ok: true }),
    run: async options => {
      fs.writeFileSync(path.join(options.cwd, 'report.md'), 'generated\n');
      return {
        scenario_id: options.scenarioId, host: options.host, host_version: options.hostVersion,
        arm: options.arm, trial: options.trial, outcome: 'PASS',
        observations: { selected_skill: 'stilus:review', output: '', exit_status: 0, state_files: {}, extra: {} },
        state_changes: [], invariants: [],
      };
    },
  };
  const report = await runScenario({
    scenario: scenario({ class: 'direct', invocation: { claude: '/stilus:review', codex: '$stilus:review' } }),
    hosts: { claude: writer }, versions: { claude: ['v'] }, tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(true);
  const [result] = report.results;
  expect(result.state_changes).toEqual(expect.arrayContaining([{ path: 'report.md', change: 'created' }]));
  expect(result.observations.state_files['report.md']).toBe('generated\n');
});

const HANDOFF = {
  id: 'claude-writes-codex-reads',
  class: 'handoff',
  prompt: 'Resume the exact saved session and report its unique marker.',
  fixture: 'handoff/issue-feature-42-auth',
  invariants: [],
  forbidden: [],
  handoff: { writer: 'claude', reader: 'codex' },
};

function handoffHost({ write = false, echo = false } = {}) {
  return {
    install: async () => ({ ok: true }),
    run: async options => {
      const marker = /PARITY-HANDOFF-[0-9a-f-]+/i.exec(options.prompt);
      const sessionPath = path.join(options.cwd, '.claude', 'sessions', 'issue-feature-42-auth.md');
      if (write && marker) {
        fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
        fs.appendFileSync(sessionPath, `\n${marker[0]}\n`);
      }
      const recorded = fs.existsSync(sessionPath) ? fs.readFileSync(sessionPath, 'utf8') : '';
      return {
        scenario_id: options.scenarioId, host: options.host, host_version: options.hostVersion,
        arm: options.arm, trial: options.trial, outcome: 'PASS',
        observations: {
          selected_skill: 'memento:resume',
          output: echo ? recorded : 'no session content',
          exit_status: 0, state_files: {}, extra: {},
        },
        state_changes: [], invariants: [],
      };
    },
  };
}

// The transition is real: the writing host must put the marker on disk and the
// reading host must recover it from the same workspace.
test('a handoff runs the writing host then the reading host over one workspace', async () => {
  const report = await runScenario({
    scenario: HANDOFF,
    hosts: { claude: handoffHost({ write: true }), codex: handoffHost({ echo: true }) },
    versions: { claude: ['2.1.226'], codex: ['0.147.0'] },
    tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(true);
  expect(report.assessments.map(entry => entry.role)).toEqual(['writer', 'reader']);
  expect(report.assessments[0].host).toBe('claude');
  expect(report.assessments[1].host).toBe('codex');
});

test('a handoff fails when the writing host never records the marker', async () => {
  const report = await runScenario({
    scenario: HANDOFF,
    hosts: { claude: handoffHost({ write: false }), codex: handoffHost({ echo: true }) },
    versions: { claude: ['2.1.226'], codex: ['0.147.0'] },
    tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(false);
  expect(report.reason).toContain('did not record');
});

test('a handoff fails when the reading host does not report the written marker', async () => {
  const report = await runScenario({
    scenario: HANDOFF,
    hosts: { claude: handoffHost({ write: true }), codex: handoffHost({ echo: false }) },
    versions: { claude: ['2.1.226'], codex: ['0.147.0'] },
    tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(false);
  expect(report.reason).toContain('did not recover the exact session');
});

test('a handoff fails when an adapter for either direction is missing', async () => {
  const report = await runScenario({
    scenario: HANDOFF,
    hosts: { claude: handoffHost({ write: true }) },
    versions: { claude: ['2.1.226'] },
    tempRoot: tempRoot(), release: true,
  });
  expect(report.pass).toBe(false);
  expect(report.reason).toContain('requires adapters for both claude and codex');
});
