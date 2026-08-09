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

function argumentsFrom(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    values[token.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith('--')
      ? argv[++index]
      : true;
  }
  return values;
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
    const report = runDeterministic({ root: ROOT });
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
  const scenarios = loadScenarios(path.join(ROOT, 'scenarios', 'parity'))
    .filter(scenario => scenario.class === 'direct' || scenario.class === 'discovery' || scenario.class === 'handoff');
  const versions = {
    claude: ['2.1.226', args['claude-current'] || '2.1.226'],
    codex: ['0.147.0', args['codex-current'] || '0.147.0'],
  };
  const trust = await manualTrustCheckpoint({
    tempRoot: path.resolve(args['temp-root']),
    codexVersion: versions.codex[0],
  });
  const report = await runMatrix({
    scenarios,
    hosts: {
      claude: adapterFactory('@anthropic-ai/claude-code', createClaudeAdapter),
      codex: adapterFactory('@openai/codex', createCodexAdapter),
    },
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
      host_cells: hostCells(versions),
      manual_trust: trust,
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

module.exports = { argumentsFrom, main };
