#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline/promises');
const { createClaudeAdapter } = require('./parity/hosts/claude');
const { createCodexAdapter } = require('./parity/hosts/codex');
const { runDeterministic, validateReleaseEnvironment } = require('./parity/deterministic');
const { execute } = require('./parity/process');
const { writeEvidence } = require('./parity/evidence');
const { runMatrix } = require('./parity/run');
const { loadScenarios } = require('./parity/scenarios');
const { validateBundle } = require('./verify-release-evidence');

const ROOT = path.resolve(__dirname, '..');

const KNOWN_OPTIONS = Object.freeze([
  'mode', 'release', 'temp-root', 'claude-current', 'codex-current', 'scenario',
]);

// Unknown options used to be collected and ignored. A misspelled
// --claude-current then fell through to its default, silently rerunning the
// minimum binary while the manifest still stamped a "current" role on it.
function argumentsFrom(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    if (!KNOWN_OPTIONS.includes(name)) {
      throw new Error(`unknown parity option: --${name}`);
    }
    values[name] = argv[index + 1] && !argv[index + 1].startsWith('--')
      ? argv[++index]
      : true;
  }
  return values;
}

function parseVersion(text) {
  if (typeof text !== 'string') return null;
  const match = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/.exec(text);
  return match ? match[1] : null;
}

// The declared floor is only meaningful if the binary reports it. A mismatch
// would record a host_version the execution never used.
function assertObservedVersion(host, declared, output) {
  const observed = parseVersion(output);
  if (!observed) {
    throw new Error(`${host} did not report a parsable version: ${JSON.stringify(String(output).slice(0, 80))}`);
  }
  if (observed !== declared) {
    throw new Error(`${host} reported version ${observed} but the matrix declared ${declared}`);
  }
  return observed;
}

function selectScenarios(scenarios, requested) {
  if (typeof requested !== 'string' || requested.trim() === '') return scenarios;
  const wanted = requested.split(',').map(value => value.trim()).filter(Boolean);
  const available = new Set(scenarios.map(scenario => scenario.id));
  for (const id of wanted) {
    if (!available.has(id)) throw new Error(`unknown scenario id: ${id}`);
  }
  return scenarios.filter(scenario => wanted.includes(scenario.id));
}

function adapterFactory(packageName, createAdapter) {
  return version => createAdapter({
    execute,
    binary: 'npx',
    prefixArgs: ['--yes', `${packageName}@${version}`],
  });
}

async function manualTrustCheckpoint({ tempRoot, codexVersion }) {
  const codexHome = path.join(tempRoot, 'manual-trust', 'codex-home');
  fs.mkdirSync(codexHome, { recursive: true });
  const adapter = adapterFactory('@openai/codex', createCodexAdapter)(codexVersion);
  const installed = await adapter.install({
    marketplace: ROOT,
    marketplaceName: 'claude-domestique',
    plugins: ['memento'],
    home: codexHome,
    cwd: ROOT,
  });
  if (!installed.ok) throw new Error('manual trust fixture installation failed');
  const hookPath = path.join(ROOT, 'memento', 'hooks', 'hooks.json');
  const reviewedHookHash = crypto.createHash('sha256').update(fs.readFileSync(hookPath)).digest('hex');
  const recordPath = path.join(tempRoot, 'manual-trust.json');
  console.log(JSON.stringify({
    status: 'manual_trust_required',
    codex_home: codexHome,
    reviewed_hook_hash: reviewedHookHash,
    next_command: `CODEX_HOME=${codexHome} npx --yes @openai/codex@${codexVersion}`,
    record_path: recordPath,
  }, null, 2));
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await terminal.question('Complete the before/after /hooks procedure, write the trust record, then press Enter. ');
  } finally {
    terminal.close();
  }
  if (!fs.existsSync(recordPath)) throw new Error(`manual trust record missing: ${recordPath}`);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (record.reviewed_hook_hash !== reviewedHookHash || record.approved_hook_hash !== reviewedHookHash ||
    record.approved_via !== '/hooks' || !record.before || record.before.skipped !== true ||
    !record.after || record.after.sentinel !== true || record.bypass_used !== false) {
    throw new Error('manual trust record does not prove the hash-linked /hooks transition');
  }
  return record;
}

const TRUST_FIELDS = Object.freeze([
  'reviewed_hook_hash', 'approved_hook_hash', 'approved_via', 'before', 'after', 'bypass_used',
]);

function trustRecord(trust) {
  const record = {};
  for (const field of TRUST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(trust, field)) record[field] = trust[field];
  }
  return record;
}

function hostCells(versions) {
  const cells = [];
  for (const host of ['claude', 'codex']) {
    const roles = [['minimum', versions[host][0]], ['current', versions[host][1]]];
    for (const [role, version] of roles) {
      let cell = cells.find(entry => entry.host === host && entry.version === version);
      if (!cell) {
        cell = { host, version, roles: [] };
        cells.push(cell);
      }
      cell.roles.push(role);
    }
  }
  return cells;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const args = argumentsFrom(argv);
  const mode = args.mode || 'deterministic';
  if (mode === 'deterministic') {
    const report = runDeterministic({ root: ROOT, scenario: args.scenario });
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
    return report;
  }
  if (mode !== 'release') throw new Error(`unknown parity mode: ${mode}`);

  const errors = validateReleaseEnvironment({
    env,
    isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    tempRoot: args['temp-root'],
  });
  if (errors.length > 0) {
    throw new Error(`release parity prerequisites missing: ${errors.join(', ')}`);
  }
  fs.mkdirSync(args['temp-root'], { recursive: true });
  if (typeof args.release !== 'string' || args.release.trim() === '') {
    throw new Error('--release <label> is required');
  }
  // 'hook' belongs in the release matrix: the plan requires direct and hook
  // scenarios to run once per host/version, not only in deterministic mode.
  const RELEASE_CLASSES = ['direct', 'discovery', 'handoff', 'hook'];
  const scenarios = selectScenarios(
    loadScenarios(path.join(ROOT, 'scenarios', 'parity'))
      .filter(scenario => RELEASE_CLASSES.includes(scenario.class)),
    args.scenario,
  );
  if (scenarios.length === 0) throw new Error('no scenarios selected for the release matrix');
  const versions = {
    claude: ['2.1.226', args['claude-current'] || '2.1.226'],
    codex: ['0.147.0', args['codex-current'] || '0.147.0'],
  };
  const hostFactories = {
    claude: adapterFactory('@anthropic-ai/claude-code', createClaudeAdapter),
    codex: adapterFactory('@openai/codex', createCodexAdapter),
  };
  const cells = hostCells(versions);
  for (const cell of cells) {
    const probe = await execute(
      'npx',
      ['--yes', `${cell.host === 'claude' ? '@anthropic-ai/claude-code' : '@openai/codex'}@${cell.version}`, '--version'],
      { env: process.env, cwd: ROOT },
    );
    cell.observed_version = assertObservedVersion(cell.host, cell.version, `${probe.stdout || ''}${probe.stderr || ''}`);
  }
  const trust = await manualTrustCheckpoint({
    tempRoot: path.resolve(args['temp-root']),
    codexVersion: versions.codex[0],
  });
  const report = await runMatrix({
    scenarios,
    hosts: hostFactories,
    versions,
    tempRoot: path.resolve(args['temp-root']),
    release: true,
  });
  let bundleDirectory = null;
  for (const scenarioReport of report.reports) {
    for (const assessment of scenarioReport.assessments || []) {
      const record = {
        ...assessment.result,
        result: assessment.metExpectation ? 'PASS' : 'FAIL',
      };
      const written = writeEvidence({ root: ROOT, release: args.release, record });
      bundleDirectory = path.dirname(written);
    }
  }
  if (bundleDirectory) {
    fs.writeFileSync(path.join(bundleDirectory, 'manifest.json'), `${JSON.stringify({
      release: args.release,
      host_cells: cells,
      // Allowlist the operator-authored record. It is hand-written JSON, so an
      // extra api_key or absolute home path would otherwise reach the retained
      // bundle unsanitized.
      manual_trust: trustRecord(trust),
    }, null, 2)}\n`);
    const evidenceErrors = validateBundle(bundleDirectory);
    if (evidenceErrors.length > 0) {
      throw new Error(`release evidence validation failed: ${evidenceErrors.join('; ')}`);
    }
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
  return report;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  KNOWN_OPTIONS,
  argumentsFrom,
  assertObservedVersion,
  main,
  parseVersion,
  selectScenarios,
  trustRecord,
};
