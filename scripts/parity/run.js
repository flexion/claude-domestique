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

const MAX_CAPTURED_FILE_BYTES = 65536;

// Post-state is collected from the filesystem so a forbidden action does not rest
// on the model's self-report. `.git` internals are skipped; git movement is
// tracked separately through rev-parse.
function snapshotWorkspace(cwd) {
  const files = new Map();
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git') continue;
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      files.set(
        path.relative(cwd, absolute),
        crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'),
      );
    }
  };
  if (fs.existsSync(cwd)) walk(cwd);
  return files;
}

function gitSnapshot(cwd) {
  const read = args => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  try {
    return { head: read(['rev-parse', 'HEAD']), branch: read(['rev-parse', '--abbrev-ref', 'HEAD']) };
  } catch (error) {
    return null;
  }
}

function diffState(before, after) {
  const changes = [];
  for (const [file, hash] of after) {
    if (!before.has(file)) changes.push({ path: file, change: 'created' });
    else if (before.get(file) !== hash) changes.push({ path: file, change: 'modified' });
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changes.push({ path: file, change: 'removed' });
  }
  return changes.sort((left, right) => left.path.localeCompare(right.path));
}

function captureStateFiles(cwd, changes, scenario) {
  const wanted = new Set(changes.map(change => change.path));
  for (const invariant of scenario.invariants || []) {
    if (invariant.type === 'state_file_contains' && typeof invariant.path === 'string') {
      wanted.add(invariant.path);
    }
  }
  const files = {};
  for (const relative of wanted) {
    try {
      const absolute = path.join(cwd, relative);
      const stats = fs.statSync(absolute);
      if (stats.isFile() && stats.size <= MAX_CAPTURED_FILE_BYTES) {
        files[relative] = fs.readFileSync(absolute, 'utf8');
      }
    } catch (error) {
      continue;
    }
  }
  return files;
}

// A side-effect negative must avoid the effect, not merely decline to admit it.
// Session bookkeeping under .claude/ is expected and is not a side effect.
function observedSideEffects(scenario, { changes, gitBefore, gitAfter }) {
  if (scenario.expectation !== 'side-effect-negative') return [];
  const observed = [];
  if (gitBefore && gitAfter && gitBefore.head !== gitAfter.head) {
    observed.push(`observed git mutation: HEAD moved ${gitBefore.head.slice(0, 7)} -> ${gitAfter.head.slice(0, 7)}`);
  }
  if (gitBefore && gitAfter && gitBefore.branch !== gitAfter.branch) {
    observed.push(`observed git mutation: branch changed ${gitBefore.branch} -> ${gitAfter.branch}`);
  }
  for (const change of changes) {
    if (change.path.startsWith('.claude/')) continue;
    if (change.change === 'created' || change.change === 'modified' || change.change === 'removed') {
      observed.push(`observed workspace mutation: ${change.path} ${change.change}`);
    }
  }
  return observed;
}

function applyPostState(result, scenario, cwd, snapshots) {
  const after = snapshotWorkspace(cwd);
  const gitAfter = gitSnapshot(cwd);
  const changes = diffState(snapshots.files, after);
  result.state_changes = changes;
  result.observations = {
    ...result.observations,
    state_files: {
      ...(result.observations && result.observations.state_files),
      ...captureStateFiles(cwd, changes, scenario),
    },
  };
  return observedSideEffects(scenario, { changes, gitBefore: snapshots.git, gitAfter });
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
  };
}

// The hook contract is read from the copy installed for this trial, not from the
// repository working tree, so the assertion covers what the host actually loaded.
function installedSessionStart(marketplace, cwd, home) {
  const hookPath = path.join(marketplace, 'memento', 'hooks', 'session-startup.js');
  if (!fs.existsSync(hookPath)) return null;
  const hook = require(hookPath);
  const response = hook.processHook(
    { hook_event_name: 'SessionStart', source: 'startup', cwd: fs.realpathSync(cwd) },
    { homeDir: home },
  );
  return {
    ...(response.hookSpecificOutput || {}),
    systemMessage: response.systemMessage,
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

// A handoff is two real host invocations over one shared workspace: the writing
// host records a marker through its own session workflow, then the reading host
// starts on the same fixture branch and must recover that exact session. Running
// one host and synthesizing the other half would assert nothing about a
// cross-host transition.
async function runHandoff(options) {
  const {
    scenario, hosts, versions, tempRoot,
    prepareTrial = defaultPrepare, uuid = crypto.randomUUID,
  } = options;
  const { writer, reader } = scenario.handoff || {};
  const results = [];
  const assessments = [];
  if (!hosts[writer] || !hosts[reader]) {
    return {
      pass: false,
      reason: `handoff ${scenario.id} requires adapters for both ${writer} and ${reader}`,
      results,
      assessments,
    };
  }

  const adapterFor = (host, version) => (typeof hosts[host] === 'function' ? hosts[host](version) : hosts[host]);
  const writerVersions = versionsFor(writer, versions);
  const readerVersions = versionsFor(reader, versions);
  const pairs = Math.max(writerVersions.length, readerVersions.length);

  for (let index = 0; index < pairs; index += 1) {
    const asVersion = entry => (typeof entry === 'string' ? entry : entry.version);
    const writerVersion = asVersion(writerVersions[Math.min(index, writerVersions.length - 1)]);
    const readerVersion = asVersion(readerVersions[Math.min(index, readerVersions.length - 1)]);
    const requestId = uuid();
    const marker = `PARITY-HANDOFF-${requestId}`;

    // One workspace, two homes: the hosts share project state and nothing else.
    const writePrepared = await prepareTrial({
      root: tempRoot, scenario, host: writer, version: writerVersion,
      arm: 'guided', trial: 1, attempt: 1, requestId: `${requestId}-write`,
    });
    const writeOptions = {
      scenarioId: scenario.id, host: writer, hostVersion: writerVersion, arm: 'guided', trial: 1,
      prompt: `Record progress in the session for the current branch, including this exact marker on its own line: ${marker}\n\nUse the normal session workflow. Do not create a session file under any other name.`,
      cwd: writePrepared.cwd, home: writePrepared.home, marketplace: writePrepared.marketplace,
      plugins: writePrepared.plugins, pluginVersions: writePrepared.pluginVersions,
      requestId: `${requestId}-write`, canary: uuid(), controlVersion: null,
    };
    const writeInstalled = await adapterFor(writer, writerVersion).install(writeOptions);
    const writeResult = writeInstalled && writeInstalled.ok === false
      ? normalizedInstallFailure(writeOptions, writeInstalled.infrastructure_failure)
      : await adapterFor(writer, writerVersion).run(writeOptions);
    writeResult.prompt = writeOptions.prompt;
    results.push(writeResult);
    assessments.push({
      host: writer, version: writerVersion, arm: 'guided', trial: 1, role: 'writer',
      metExpectation: writeResult.outcome === 'PASS', outcome: writeResult.outcome,
      forbiddenActions: [], result: writeResult,
    });
    if (writeResult.outcome !== 'PASS') {
      return { pass: false, reason: `handoff writer ${writer} did not complete: ${writeResult.outcome}`, results, assessments };
    }

    // The write half must be observable on disk before the read half runs;
    // otherwise the reader could "pass" against fixture content alone.
    const sessionPath = path.join(writePrepared.cwd, '.claude', 'sessions', 'issue-feature-42-auth.md');
    const written = fs.existsSync(sessionPath) ? fs.readFileSync(sessionPath, 'utf8') : '';
    if (!written.includes(marker)) {
      return {
        pass: false,
        reason: `handoff writer ${writer} did not record ${marker} at the exact session path`,
        results,
        assessments,
      };
    }

    const readHome = path.join(path.dirname(writePrepared.home), `reader-${safe(reader)}-home`);
    fs.mkdirSync(readHome, { recursive: true });
    const readOptions = {
      scenarioId: scenario.id, host: reader, hostVersion: readerVersion, arm: 'guided', trial: 1,
      prompt: `${scenario.prompt}\n\nEvaluation protocol: on the final line, write PARITY_RESULT followed by one compact JSON object with selected_skill, outcome, and forbidden_actions.`,
      cwd: writePrepared.cwd, home: readHome, marketplace: writePrepared.marketplace,
      plugins: writePrepared.plugins, pluginVersions: writePrepared.pluginVersions,
      requestId: `${requestId}-read`, canary: uuid(), controlVersion: null,
    };
    const snapshots = { files: snapshotWorkspace(writePrepared.cwd), git: gitSnapshot(writePrepared.cwd) };
    const readInstalled = await adapterFor(reader, readerVersion).install(readOptions);
    const readResult = readInstalled && readInstalled.ok === false
      ? normalizedInstallFailure(readOptions, readInstalled.infrastructure_failure)
      : await adapterFor(reader, readerVersion).run(readOptions);
    readResult.prompt = readOptions.prompt;
    readResult.observed_side_effects = applyPostState(readResult, scenario, writePrepared.cwd, snapshots);

    const hookObservation = installedSessionStart(writePrepared.marketplace, writePrepared.cwd, readHome);
    if (hookObservation) {
      readResult.observations = {
        ...readResult.observations,
        extra: { ...(readResult.observations && readResult.observations.extra), ...hookObservation },
      };
    }

    const handoffScenario = {
      ...scenario,
      invariants: [
        ...(scenario.invariants || []),
        {
          type: 'output_contains',
          description: 'The reading host reports the marker the writing host recorded.',
          value: marker,
        },
      ],
    };
    const assessment = trialAssessment(handoffScenario, 'guided', readResult, writePrepared.cwd);
    const forbidden = [
      ...(Array.isArray(readResult.forbidden_actions) ? readResult.forbidden_actions.filter(Boolean) : []),
      ...(readResult.observed_side_effects || []),
    ];
    results.push(readResult);
    assessments.push({
      host: reader, version: readerVersion, arm: 'guided', trial: 1, role: 'reader',
      ...assessment, forbiddenActions: forbidden, result: readResult,
    });
    if (forbidden.length > 0) {
      return { pass: false, reason: `handoff reader performed a forbidden action: ${forbidden[0]}`, results, assessments };
    }
    if (!assessment.metExpectation) {
      return { pass: false, reason: `handoff ${writer}->${reader} did not recover the exact session`, results, assessments };
    }
  }

  return { pass: true, reason: '', results, assessments };
}

async function runScenario(options) {
  const {
    scenario, hosts, versions, tempRoot, release = false,
    prepareTrial = defaultPrepare, uuid = crypto.randomUUID,
  } = options;
  if (!release) throw new Error('model scenarios require explicit release mode');
  if (scenario.class === 'handoff') return runHandoff(options);

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
          const snapshots = { files: snapshotWorkspace(prepared.cwd), git: gitSnapshot(prepared.cwd) };
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
          result.observed_side_effects = applyPostState(result, scenario, prepared.cwd, snapshots);
          finalResult = result;
          finalWorkspace = prepared.cwd;
          break;
        }
        results.push(finalResult);
        const forbidden = [
          ...(Array.isArray(finalResult.forbidden_actions) ? finalResult.forbidden_actions.filter(Boolean) : []),
          ...(finalResult.observed_side_effects || []),
        ];
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

module.exports = { diffState, observedSideEffects, runHandoff, runMatrix, runScenario, snapshotWorkspace };
