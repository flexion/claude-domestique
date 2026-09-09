#!/usr/bin/env node
'use strict';

// STUB — partition `fanin` of run fanout-comitatus. Every function is exported
// with a correctly-typed placeholder return so the contract tests in
// __tests__/fanin.test.js fail on an assertion that prints what it got, rather
// than on a missing module. Replace each body; do not change a signature
// without changing the test that names it.
//
// This module owns the git side of fan-out-trial.md. Git is the state machine in
// the literal sense: which step a run is on is never stored anywhere, it is read
// off the refs. `state` therefore derives its whole answer on every call and
// persists nothing — a cached copy would be the run journal the runbook's "do
// not build yet" list refuses.
//
// Nothing here reads stdin. Every git and herdr invocation goes through
// deps.run so a test can assert the exact argv.
//
// Require ./herd.js LAZILY (for waitCmd), inside the function that needs it:
// herd.js requires this module back from its dispatch.

const PHASES = Object.freeze(
  ['absent', 'started', 'partitioned', 'fanned-out', 'fanned-in', 'finished']);

function lines(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function required(value, flag) {
  if (!value) throw new Error(`${flag} is required`);
  return value;
}

function positiveNumber(value, flag) {
  const number = Number(required(value, flag));
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return number;
}

function parsePartitions(value) {
  return required(value, '--partitions').split(',').map((part) => part.trim()).filter(Boolean);
}

function regexpEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// state --run <id>
// eslint-disable-next-line no-unused-vars
function parseState(args) {
  const out = { run: undefined };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run') out.run = args[++i];
    else throw new Error(`unknown flag: ${args[i]}`);
  }
  required(out.run, '--run');
  return out;
}

// Read-only by construction. `stateCmd` must issue no merge, branch -D,
// checkout, reset, or push: a verb the operator runs to find out where they are
// cannot be a verb that moves them.
// eslint-disable-next-line no-unused-vars
function stateCmd(args, deps) {
  const cfg = parseState(args);
  const taskBranch = `task/${cfg.run}`;
  try {
    deps.run('git', ['rev-parse', '--verify', '--quiet', taskBranch]);
  } catch {
    const absent = {
      run: cfg.run,
      started: false,
      manifest: false,
      partitions: [],
      logRow: false,
    };
    return { ...absent, phase: derivePhase(absent) };
  }

  const runPath = `.pipeline/runs/${cfg.run}`;
  const taskFiles = lines(deps.run(
    'git', ['ls-tree', '-r', '--name-only', taskBranch, '--', runPath]));
  const manifest = taskFiles.includes(`${runPath}/manifest.md`);
  const branches = lines(deps.run(
    'git', ['branch', '--list', `${taskBranch}-*`, '--format=%(refname:short)']));
  const merged = new Set(lines(deps.run(
    'git', ['branch', '--merged', taskBranch, '--list', `${taskBranch}-*`, '--format=%(refname:short)'])));
  const partitions = branches.map((branch) => {
    const branchFiles = lines(deps.run(
      'git', ['ls-tree', '-r', '--name-only', branch, '--', runPath]));
    return {
      name: branch.slice(`${taskBranch}-`.length),
      branch,
      merged: merged.has(branch),
      blocked: branchFiles.some((file) => /\/BLOCKED-[^/]+\.md$/.test(file)),
      probe: branchFiles.some((file) => /\/probe-[^/]+\.md$/.test(file)),
    };
  });
  let log = '';
  try {
    log = deps.run('git', ['show', `${taskBranch}:.pipeline/log.md`]);
  } catch {
    // A task may be active before the cumulative log exists.
  }
  const row = new RegExp(`^\\|\\s*${regexpEscape(cfg.run)}\\s*\\|`, 'm');
  const facts = {
    run: cfg.run,
    started: true,
    manifest,
    partitions,
    logRow: row.test(String(log || '')),
  };
  return { ...facts, phase: derivePhase(facts) };
}

// The single derived answer to "which step am I on", from the facts stateCmd
// already collected. Separate so it is testable without a git mock.
// eslint-disable-next-line no-unused-vars
function derivePhase(facts) {
  if (!facts.started) return PHASES[0];
  if (!facts.manifest) return PHASES[1];
  if (facts.logRow) return PHASES[5];
  if (!facts.partitions || facts.partitions.length === 0) return PHASES[2];
  if (facts.partitions.every((partition) => partition.merged)) return PHASES[4];
  return PHASES[3];
}

// STUB — partition `settle` of run orch-selfhost. `parseSettled` and
// `settledCmd` below are placeholders with the right return TYPES so the
// contract tests in __tests__/fanin.test.js fail on an assertion that prints
// what they got, rather than on a missing export. Replace both bodies.
//
// settled --run <id> --partitions a,b
//
// The question `wait-all` cannot answer. An agent reads `idle` between its own
// turns, so a set of idle handles is not a set of finished partitions — it is
// the single most common way a run is declared complete early. This asks git
// instead: a commit on the partition branch, or a committed BLOCKED-<p>.md, is
// durable evidence; a status is a sample of a pane.
//
// Read-only by the same rule as stateCmd, and for a stronger reason: this verb
// is what a caller polls in a loop, so it must be safe to call at any moment
// during a partition's own commit.
// eslint-disable-next-line no-unused-vars
function parseSettled(args) {
  const out = { run: undefined, partitions: undefined };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = () => args[++i];
    if (flag === '--run') out.run = value();
    else if (flag === '--partitions') out.partitions = parsePartitions(value());
    else throw new Error(`unknown flag: ${flag}`);
  }
  required(out.run, '--run');
  if (!out.partitions) throw new Error('--partitions is required');
  return out;
}

// eslint-disable-next-line no-unused-vars
function settledCmd(args, deps) {
  const cfg = parseSettled(args);
  const taskBranch = `task/${cfg.run}`;
  try {
    deps.run('git', ['rev-parse', '--verify', '--quiet', taskBranch]);
  } catch {
    throw new Error(`task branch does not exist: ${taskBranch}`);
  }

  const runPath = `.pipeline/runs/${cfg.run}`;
  return cfg.partitions.map((partition) => {
    const branch = `${taskBranch}-${partition}`;
    try {
      deps.run('git', ['rev-parse', '--verify', '--quiet', branch]);
    } catch {
      return { partition, branch, status: 'working', commits: 0, reason: 'no branch' };
    }

    const commits = Number(String(
      deps.run('git', ['rev-list', '--count', `${taskBranch}..${branch}`])).trim());
    const branchFiles = lines(deps.run(
      'git', ['ls-tree', '-r', '--name-only', branch, '--', runPath]));
    const blocked = `BLOCKED-${partition}.md`;
    const isBlocked = branchFiles.includes(`${runPath}/${blocked}`);
    return {
      partition,
      branch,
      status: isBlocked ? 'blocked' : commits > 0 ? 'done' : 'working',
      commits,
      blocked: isBlocked ? blocked : undefined,
    };
  });
}

// fan-in --run <id> --partitions a,b [--wait-handle arch] [--timeout ms] [--dry-run]
// eslint-disable-next-line no-unused-vars
function parseFanin(args) {
  const out = {
    run: undefined,
    partitions: undefined,
    waitHandle: 'arch',
    timeout: 300000,
    dryRun: false,
  };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = () => {
      const next = args[++i];
      if (next === undefined) throw new Error(`missing value for ${flag}`);
      return next;
    };
    if (flag === '--run') out.run = value();
    else if (flag === '--partitions') out.partitions = parsePartitions(value());
    else if (flag === '--wait-handle') out.waitHandle = value();
    else if (flag === '--timeout') out.timeout = positiveNumber(value(), flag);
    else if (flag === '--dry-run') out.dryRun = true;
    else throw new Error(`unknown flag: ${flag}`);
  }
  required(out.run, '--run');
  if (!out.partitions) throw new Error('--partitions is required');
  return out;
}

// Two refusals before the first merge, both from the runbook:
//   - HEAD must be task/<run>. `arch` owns the task branch and merging from a
//     partition worktree is prohibited.
//   - `arch` must be settled. Merging under a running agent rewrites the tree it
//     is living in — the same hazard as diffing under one.
//
// On the first conflict: stop, leave the merge in place for the implementer to
// resolve, and report the conflicted paths. Later partitions are not attempted;
// merging past a conflict buries which partition caused it.
// eslint-disable-next-line no-unused-vars
function faninCmd(args, deps) {
  const cfg = parseFanin(args);
  const taskBranch = `task/${cfg.run}`;
  const currentBranch = String(
    deps.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  if (currentBranch !== taskBranch) {
    throw new Error(`fan-in must run on ${taskBranch}; found ${currentBranch || '(detached HEAD)'}`);
  }

  const { waitCmd } = require('./herd.js');
  try {
    waitCmd([cfg.waitHandle, '--status', 'idle,done', '--timeout', String(cfg.timeout)], deps);
  } catch (error) {
    throw new Error(`cannot fan in while ${cfg.waitHandle} is unsettled: ${error.message}`);
  }

  const plan = cfg.partitions.map((partition) => `${taskBranch}-${partition}`);
  if (cfg.dryRun) return { run: cfg.run, plan, dryRun: true };

  const merged = [];
  for (let i = 0; i < cfg.partitions.length; i++) {
    const partition = cfg.partitions[i];
    const branch = plan[i];
    try {
      deps.run('git', ['merge', '--no-edit', branch]);
      merged.push(branch);
    } catch (error) {
      const files = lines(deps.run('git', ['diff', '--name-only', '--diff-filter=U']));
      if (files.length === 0) throw error;
      return {
        run: cfg.run,
        merged,
        conflict: { partition, branch, files },
      };
    }
  }
  return { run: cfg.run, merged, conflict: undefined };
}

// teardown --run <id> --partitions a,b [--yes]
// eslint-disable-next-line no-unused-vars
function parseTeardown(args) {
  const out = { run: undefined, partitions: undefined, yes: false };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = () => {
      const next = args[++i];
      if (next === undefined) throw new Error(`missing value for ${flag}`);
      return next;
    };
    if (flag === '--run') out.run = value();
    else if (flag === '--partitions') out.partitions = parsePartitions(value());
    else if (flag === '--yes') out.yes = true;
    else throw new Error(`unknown flag: ${flag}`);
  }
  required(out.run, '--run');
  if (!out.partitions) throw new Error('--partitions is required');
  return out;
}

// Destroys nothing without --yes. `herdr worktree remove --force` discards
// uncommitted files silently and `git branch -D` discards commits, and
// BLOCKED-*.md and probe-*.md are the trial's whole evidence base — a partition
// holding one that is uncommitted, or committed but not yet merged into the task
// branch, is skipped with a reason rather than destroyed.
//
// Order matters: remove the worktree, THEN delete the branch. `worktree remove`
// does not delete the branch, and a branch still checked out cannot be deleted.
// eslint-disable-next-line no-unused-vars
function teardownCmd(args, deps) {
  const cfg = parseTeardown(args);
  const taskBranch = `task/${cfg.run}`;
  const data = JSON.parse(deps.run('herdr', ['worktree', 'list', '--json']));
  const worktrees = (data && data.result && data.result.worktrees) || [];
  const merged = new Set(lines(deps.run(
    'git', ['branch', '--merged', taskBranch, '--list', `${taskBranch}-*`, '--format=%(refname:short)'])));
  const runPath = `.pipeline/runs/${cfg.run}`;

  return cfg.partitions.map((partition) => {
    const branch = `${taskBranch}-${partition}`;
    const worktree = worktrees.find((item) => item && item.branch === branch);
    const workspace = worktree && worktree.open_workspace_id;
    const result = { partition, branch, workspace, action: 'skipped', reason: undefined };
    if (!worktree || !workspace) {
      result.reason = 'no live worktree';
      return result;
    }

    const dirty = lines(deps.run(
      'git', ['-C', worktree.path, 'status', '--porcelain', '--', '.pipeline']));
    const dirtyBlocked = dirty.map((line) => line.slice(3).trim())
      .find((file) => /(^|\/)BLOCKED-[^/]+\.md$/.test(file));
    if (dirtyBlocked) {
      result.reason = `uncommitted ${dirtyBlocked.split('/').pop()}`;
      return result;
    }

    const branchFiles = lines(deps.run(
      'git', ['ls-tree', '-r', '--name-only', branch, '--', runPath]));
    const blocked = branchFiles.find((file) => /\/BLOCKED-[^/]+\.md$/.test(file));
    if (blocked && !merged.has(branch)) {
      result.reason = `unmerged ${blocked.split('/').pop()}`;
      return result;
    }

    if (!cfg.yes) {
      result.action = 'planned';
      return result;
    }
    deps.run('herdr', ['worktree', 'remove', '--workspace', workspace, '--force', '--json']);
    deps.run('git', ['branch', '-D', branch]);
    result.action = 'removed';
    return result;
  });
}

module.exports = {
  PHASES,
  parseState,
  stateCmd,
  derivePhase,
  parseSettled,
  settledCmd,
  parseFanin,
  faninCmd,
  parseTeardown,
  teardownCmd,
};
