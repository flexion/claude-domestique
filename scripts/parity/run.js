'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createControlCopy } = require('./control-copy');
const { evaluateInvariant, evaluateTrials } = require('./invariants');

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');

function safe(value) {
  return String(value).replace(/[^0-9A-Za-z._-]/g, '-');
}

function initializeFixtureGit(cwd) {
  if (fs.existsSync(path.join(cwd, '.git'))) return;
  execFileSync('git', ['init', '-q', '-b', 'issue/feature-42/auth'], { cwd });
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync('git', [
    '-c', 'user.name=Parity Fixture', '-c', 'user.email=parity@example.invalid',
    '-c', 'commit.gpgSign=false', 'commit', '-q', '--allow-empty', '-m', 'fixture',
  ], { cwd });
}

function defaultPrepare({ root, scenario, host, version, arm, trial, attempt, requestId }) {
  const base = path.join(root, safe(scenario.id), safe(host), safe(version), arm, `trial-${trial}-attempt-${attempt}-${requestId}`);
  const home = path.join(base, 'home');
  const cwd = path.join(base, 'workspace');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(cwd, { recursive: true });
  const fixture = path.join(REPOSITORY_ROOT, 'scenarios', 'parity', 'fixtures', scenario.fixture);
  if (fs.existsSync(fixture)) fs.cpSync(fixture, cwd, { recursive: true });
  initializeFixtureGit(cwd);

  let preObservations = null;
  if (scenario.class === 'handoff') {
    const hook = require(path.join(REPOSITORY_ROOT, 'memento', 'hooks', 'session-startup.js'));
    const response = hook.processHook(
      { hook_event_name: 'SessionStart', source: 'startup', cwd: fs.realpathSync(cwd) },
      { homeDir: home }
    );
    preObservations = {
      extra: {
        ...(response.hookSpecificOutput || {}),
        systemMessage: response.systemMessage,
      },
    };
  }

  const marketplace = path.join(base, 'marketplace');
  const marketplaceDirectory = path.join(marketplace, '.claude-plugin');
  fs.mkdirSync(marketplaceDirectory, { recursive: true });
  const catalogPath = path.join(REPOSITORY_ROOT, '.claude-plugin', 'marketplace.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const target = typeof scenario.target_skill === 'string' ? scenario.target_skill.split(':') : [];
  const targetPlugin = target[0];
  const targetSkill = target[1];
  for (const plugin of catalog.plugins) {
    const source = path.join(REPOSITORY_ROOT, plugin.name);
    const destination = path.join(marketplace, plugin.name);
    if (arm === 'control' && plugin.name === targetPlugin) {
      createControlCopy({
        pluginRoot: source,
        skillName: targetSkill,
        destination,
        runId: `${safe(scenario.id)}-${safe(host)}-${safe(version)}-${trial}-${requestId}`,
      });
      const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8'));
      plugin.version = manifest.version;
    } else {
      fs.symlinkSync(source, destination, 'dir');
    }
  }
  fs.writeFileSync(
    path.join(marketplaceDirectory, 'marketplace.json'),
    `${JSON.stringify(catalog, null, 2)}\n`
  );
  return {
    home,
    cwd,
    marketplace,
    plugins: catalog.plugins.map(plugin => plugin.name),
    pluginVersions: Object.fromEntries(catalog.plugins.map(plugin => [plugin.name, plugin.version])),
    preObservations,
  };
}

function normalizedInstallFailure(options, failure) {
  return {
    scenario_id: options.scenarioId,
    host: options.host,
    host_version: options.hostVersion,
    arm: options.arm,
    trial: options.trial,
    outcome: 'INFRASTRUCTURE_FAILURE',
    observations: {},
    state_changes: [],
    invariants: [],
    infrastructure_failure: failure || { kind: 'install_failure', detail: 'plugin installation failed' },
  };
}

function trialAssessment(scenario, arm, result, workspace) {
  const canonicalWorkspace = fs.realpathSync(workspace);
  const evaluated = (scenario.invariants || []).map(original => {
    const invariant = { ...original };
    if (typeof invariant.value === 'string') {
      invariant.value = invariant.value.replace('<WORKSPACE>', canonicalWorkspace);
    }
    return {
    type: invariant.type,
    ...evaluateInvariant(invariant, result.observations),
    };
  });
  result.invariants = evaluated;

  if (result.outcome === 'UNAVAILABLE') {
    return { metExpectation: scenario.allow_unavailable === true, outcome: 'UNAVAILABLE' };
  }
  if (result.outcome !== 'PASS') return { metExpectation: false, outcome: result.outcome };

  if (arm === 'control') {
    return {
      metExpectation: !result.observations || result.observations.selected_skill !== scenario.target_skill,
      outcome: result.selection_outcome || (result.observations && result.observations.selection_outcome) || 'none',
    };
  }
  if (scenario.expectation === 'ambiguous') {
    return {
      metExpectation: true,
      outcome: result.selection_outcome || (result.observations && result.observations.selection_outcome) ||
        (result.observations && result.observations.selected_skill
          ? `selected:${result.observations.selected_skill}`
          : 'none'),
    };
  }
  return { metExpectation: evaluated.every(item => item.pass), outcome: result.outcome };
}

function versionsFor(host, versions) {
  const entries = versions[host] || [];
  const seen = new Set();
  return entries.filter(entry => {
    const value = typeof entry === 'string' ? entry : entry.version;
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

async function runScenario(options) {
  const {
    scenario, hosts, versions, tempRoot, release = false,
    prepareTrial = defaultPrepare, uuid = crypto.randomUUID,
  } = options;
  if (!release) throw new Error('model scenarios require explicit release mode');

  const results = [];
  const assessments = [];
  const cells = [];
  for (const host of Object.keys(hosts).sort()) {
    for (const versionEntry of versionsFor(host, versions)) {
      cells.push({ host, version: typeof versionEntry === 'string' ? versionEntry : versionEntry.version });
    }
  }
  const arms = scenario.class === 'discovery' ? ['control', 'guided'] : ['guided'];
  const trialCount = scenario.class === 'discovery' ? 5 : 1;

  for (const cell of cells) {
    const adapter = typeof hosts[cell.host] === 'function'
      ? hosts[cell.host](cell.version)
      : hosts[cell.host];
    for (const arm of arms) {
      const armTrials = [];
      for (let trial = 1; trial <= trialCount; trial += 1) {
        let finalResult;
        let finalWorkspace;
        const infrastructureAttempts = [];
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          const requestId = uuid();
          const canary = uuid();
          const prepared = await prepareTrial({
            root: tempRoot, scenario, host: cell.host, version: cell.version,
            arm, trial, attempt, requestId,
          });
          const runId = `${safe(scenario.id)}-${safe(cell.host)}-${safe(cell.version)}-${arm}-${trial}-${requestId}`;
          const runOptions = {
            scenarioId: scenario.id,
            host: cell.host,
            hostVersion: cell.version,
            arm,
            trial,
            prompt: `${scenario.class === 'direct' && scenario.invocation
              ? scenario.invocation[cell.host]
              : scenario.prompt}\n\nEvaluation protocol: on the final line, write PARITY_RESULT followed by one compact JSON object with selected_skill (the fully qualified skill actually used, or null), outcome (selected:<skill>, selected:neighbor, clarify, or none), and forbidden_actions (an array naming any external or repository mutation performed).`,
            cwd: prepared.cwd,
            home: prepared.home,
            marketplace: prepared.marketplace,
            plugins: prepared.plugins || ['agent-artifex', 'comitatus', 'mantra', 'memento', 'onus', 'stilus'],
            pluginVersions: prepared.pluginVersions || {},
            requestId,
            canary,
            controlVersion: arm === 'control' ? `0.0.0-control.${safe(runId)}` : null,
          };
          const installed = await adapter.install(runOptions);
          let result = installed && installed.ok === false
            ? normalizedInstallFailure(runOptions, installed.infrastructure_failure)
            : await adapter.run(runOptions);
          if (result.outcome === 'INFRASTRUCTURE_FAILURE' && attempt === 1) {
            infrastructureAttempts.push(result.infrastructure_failure);
            continue;
          }
          if (infrastructureAttempts.length > 0) result.infrastructure_attempts = infrastructureAttempts;
          if (!result.plugin_versions) result.plugin_versions = runOptions.pluginVersions;
          result.prompt = runOptions.prompt;
          if (prepared.preObservations) {
            result.observations = {
              ...result.observations,
              ...prepared.preObservations,
              extra: {
                ...(result.observations && result.observations.extra),
                ...(prepared.preObservations.extra || {}),
              },
            };
          }
          finalResult = result;
          finalWorkspace = prepared.cwd;
          break;
        }
        results.push(finalResult);
        const forbidden = Array.isArray(finalResult.forbidden_actions)
          ? finalResult.forbidden_actions.filter(Boolean)
          : [];
        const assessment = trialAssessment(scenario, arm, finalResult, finalWorkspace);
        const trialRecord = { ...assessment, forbiddenActions: forbidden, result: finalResult };
        assessments.push({ host: cell.host, version: cell.version, arm, trial, ...trialRecord });
        armTrials.push(trialRecord);
        if (forbidden.length > 0) {
          return {
            pass: false,
            reason: `trial ${trial} performed a forbidden action: ${forbidden[0]}`,
            results,
            assessments,
          };
        }
      }

      let evaluation;
      if (scenario.class === 'discovery') {
        evaluation = evaluateTrials(arm === 'control' ? 'control' : scenario.expectation, armTrials, {
          allowedOutcomes: scenario.allowed_outcomes,
        });
      } else {
        const failures = armTrials.filter(trial => !trial.metExpectation);
        evaluation = { pass: failures.length === 0, reason: failures.length ? 'scenario expectation failed' : '' };
      }
      if (!evaluation.pass) {
        return { pass: false, reason: evaluation.reason, results, assessments };
      }
    }
  }

  return { pass: true, reason: '', results, assessments };
}

async function runMatrix(options) {
  const reports = [];
  for (const scenario of [...options.scenarios].sort((left, right) => left.id.localeCompare(right.id))) {
    reports.push(await runScenario({ ...options, scenario }));
  }
  return { pass: reports.every(report => report.pass), reports };
}

module.exports = { runMatrix, runScenario };
