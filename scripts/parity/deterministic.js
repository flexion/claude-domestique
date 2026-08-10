'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { evaluateInvariant } = require('./invariants');
const { loadScenarios } = require('./scenarios');

function observationFromResponse(response) {
  const hookOutput = response && response.hookSpecificOutput ? response.hookSpecificOutput : {};
  return {
    output: JSON.stringify(response || {}),
    exit_status: 0,
    selected_skill: null,
    state_files: {},
    extra: { ...hookOutput, systemMessage: response && response.systemMessage },
  };
}

function runHook(root, scenario, workspace, home) {
  const plugin = scenario.hook.plugin;
  const payload = { ...scenario.hook.payload, hook_event_name: scenario.hook.event, cwd: workspace };
  if (plugin === 'mantra') {
    return require(path.join(root, 'mantra', 'hooks', 'behavior.js')).processInput(payload);
  }
  if (plugin === 'memento') {
    return require(path.join(root, 'memento', 'hooks', 'session-startup.js'))
      .processHook(payload, { homeDir: home });
  }
  if (plugin === 'onus') {
    return require(path.join(root, 'onus', 'hooks', 'work-item.js'))
      .processHook(payload, { homeDir: home });
  }
  if (plugin === 'comitatus') {
    const hook = require(path.join(root, 'comitatus', 'hooks', 'herdr-orient.js'));
    return hook.processSessionStart({
      env: { HERDR_ENV: '1' },
      skillDir: hook.SKILL_DIR,
      herdJsPath: hook.HERD_JS,
      codexHome: path.join(home, 'codex'),
      stableHome: null,
      directCodex: true,
    });
  }
  throw new Error(`unsupported deterministic hook plugin: ${plugin}`);
}

function expandInvariant(invariant, workspace) {
  const copy = { ...invariant };
  if (typeof copy.value === 'string') {
    copy.value = copy.value.replace('<WORKSPACE>', workspace);
  }
  return copy;
}

function assess(scenario, observation, workspace) {
  return scenario.invariants.map(invariant =>
    evaluateInvariant(expandInvariant(invariant, workspace), observation)
  );
}

function initializeBranch(workspace) {
  execFileSync('git', ['init', '-q', '-b', 'issue/feature-42/auth'], { cwd: workspace });
  execFileSync('git', ['add', '.'], { cwd: workspace });
  execFileSync('git', [
    '-c', 'user.name=Parity Fixture', '-c', 'user.email=parity@example.invalid',
    '-c', 'commit.gpgSign=false',
    'commit', '-q', '-m', 'fixture',
  ], { cwd: workspace });
}

function runHandoff(root, scenario, workspace, home) {
  initializeBranch(workspace);
  const hook = require(path.join(root, 'memento', 'hooks', 'session-startup.js'));
  const response = hook.processHook(
    { hook_event_name: 'SessionStart', source: 'startup', cwd: workspace },
    { homeDir: home }
  );
  const observation = observationFromResponse(response);
  const sessionPath = observation.extra.sessionPath;
  if (typeof sessionPath === 'string' && fs.existsSync(sessionPath)) {
    observation.output += `\n${fs.readFileSync(sessionPath, 'utf8')}`;
    observation.state_files[path.relative(workspace, sessionPath)] = fs.readFileSync(sessionPath, 'utf8');
  }
  return observation;
}

// An unknown id must fail rather than silently yield an empty set: an empty run
// reports pass and would read as coverage.
function filterScenarios(scenarios, requested) {
  if (typeof requested !== 'string' || requested.trim() === '') return scenarios;
  const wanted = requested.split(',').map(value => value.trim()).filter(Boolean);
  const available = new Set(scenarios.map(scenario => scenario.id));
  for (const id of wanted) {
    if (!available.has(id)) throw new Error(`unknown scenario id: ${id}`);
  }
  return scenarios.filter(scenario => wanted.includes(scenario.id));
}

function runDeterministic({ root, scenario: requested }) {
  const scenarioRoot = path.join(root, 'scenarios', 'parity');
  const scenarios = filterScenarios(loadScenarios(scenarioRoot), requested);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-deterministic-'));
  let hookPassed = 0;
  let handoffPassed = 0;
  const failures = [];
  const hookScenarios = scenarios.filter(scenario => scenario.class === 'hook');
  const handoffScenarios = scenarios.filter(scenario => scenario.class === 'handoff');

  try {
    for (const scenario of hookScenarios) {
      const workspace = path.join(temporary, scenario.id, 'workspace');
      const home = path.join(temporary, scenario.id, 'home');
      fs.mkdirSync(workspace, { recursive: true });
      fs.mkdirSync(home, { recursive: true });
      const fixture = path.join(scenarioRoot, 'fixtures', scenario.fixture);
      if (fs.existsSync(fixture)) fs.cpSync(fixture, workspace, { recursive: true });
      const observation = observationFromResponse(runHook(root, scenario, workspace, home));
      const results = assess(scenario, observation, workspace);
      if (results.every(result => result.pass)) hookPassed += 1;
      else failures.push({ scenario: scenario.id, results });
    }

    for (const scenario of handoffScenarios) {
      const workspace = path.join(temporary, scenario.id, 'workspace');
      const home = path.join(temporary, scenario.id, 'home');
      fs.mkdirSync(path.dirname(workspace), { recursive: true });
      fs.cpSync(path.join(scenarioRoot, 'fixtures', scenario.fixture), workspace, { recursive: true });
      fs.mkdirSync(home, { recursive: true });
      const canonicalWorkspace = fs.realpathSync(workspace);
      const observation = runHandoff(root, scenario, canonicalWorkspace, home);
      const results = assess(scenario, observation, canonicalWorkspace);
      if (results.every(result => result.pass)) handoffPassed += 1;
      else failures.push({ scenario: scenario.id, results, observation });
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }

  const pass = hookPassed === hookScenarios.length && handoffPassed === handoffScenarios.length;
  return {
    pass,
    model_invocations: 0,
    scenarios: scenarios.length,
    hooks: { passed: hookPassed, total: hookScenarios.length },
    handoffs: { passed: handoffPassed, total: handoffScenarios.length },
    failures,
    message: pass
      ? 'Deterministic parity checks passed; model-level parity was not evaluated.'
      : 'Deterministic parity checks failed; model-level parity was not evaluated.',
  };
}

function validateReleaseEnvironment({ env, isTTY, tempRoot }) {
  const errors = [];
  if (!env || env.PARITY_RELEASE !== '1') errors.push('PARITY_RELEASE=1');
  // Host authentication is no longer asserted from API-key environment variables.
  // Subscription logins carry no such variable, so authentication is proved by
  // probing each host's own status command during preflight instead.
  if (!isTTY) errors.push('interactive TTY');
  if (typeof tempRoot !== 'string' || tempRoot.trim() === '') errors.push('temporary root');
  // The credential, TTY, and opt-in checks are all satisfiable by a workflow that
  // exposes secrets and allocates a pseudo-TTY. The release gate is operator-run
  // by design, so refuse outright when a CI event is driving the run.
  if (env && env.GITHUB_EVENT_NAME) {
    errors.push(`no GitHub Actions event (observed ${env.GITHUB_EVENT_NAME})`);
  }
  return errors;
}

module.exports = { runDeterministic, validateReleaseEnvironment };
