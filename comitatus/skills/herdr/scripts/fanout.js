#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// This module owns the launch/message side of fan-out-trial.md: composing a role
// line, standing up one worktree+implementer per partition, and observing them
// all settle. The git side (state, fan-in, teardown) is fanin.js.
//
// Like every verb in herd.js, nothing here reads stdin and nothing takes a shell
// variable: each function fetches the herdr state it needs through deps.run.
//
// Require ./herd.js and ./up.js LAZILY, inside the function that needs them.
// herd.js requires this module back from its dispatch, and a top-level cycle
// leaves whichever side loaded second holding a half-initialised exports object.

// These are the runbook's own defaults, not preferences.
const DEFAULT_ROLES_DIR = '.pipeline/roles';
const DEFAULT_WAIT_TIMEOUT_MS = 900000;
const DEFAULT_WAIT_INTERVAL_MS = 2000;

function requiredText(value, name) {
  if (value === undefined || value === '' || /^--/.test(String(value))) {
    throw new Error(`${name} needs a value`);
  }
  const text = String(value);
  if (/\r|\n/.test(text)) throw new Error(`${name} must be one line`);
  return text;
}

function positiveNumber(value, name) {
  const number = Number(requiredText(value, name));
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return number;
}

function agents(data) {
  return (data && data.result && data.result.agents) || [];
}

function fetchAgents(deps) {
  const herd = require('./herd.js');
  return herd.fetchAgents(deps);
}

// One line, always: a newline in a prompt submits the turn, so a two-line role
// assignment delivers half of itself. The role file is named by PATH and never
// read here — pasting its text is what makes a role assignment unauditable.
function roleLine({ role, run, partition, hypothesis, rolesDir } = {}) {
  role = requiredText(role, 'role');
  run = requiredText(run, 'run');
  rolesDir = rolesDir === undefined ? DEFAULT_ROLES_DIR : requiredText(rolesDir, 'rolesDir');
  const parts = [`read ${path.posix.join(rolesDir, `${role}.md`)} and follow it. $RUN is ${run}`];
  if (partition !== undefined) {
    parts.push(`$PARTITION is ${requiredText(partition, 'partition')}`);
  }
  if (hypothesis !== undefined) {
    parts.push(`$HYPOTHESIS is ${requiredText(hypothesis, 'hypothesis')}`);
  }
  return parts.join(', ');
}

// role <handle> --role <name> --run <id> [--partition p] [--hypothesis n]
//              [--roles-dir d] [--from self]
function parseRole(args) {
  const out = {
    handle: args[0],
    role: undefined,
    run: undefined,
    partition: undefined,
    hypothesis: undefined,
    rolesDir: DEFAULT_ROLES_DIR,
    from: undefined,
  };
  if (!out.handle || out.handle.startsWith('--')) throw new Error('role needs a handle');
  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    const need = () => requiredText(args[++i], flag);
    if (flag === '--role') out.role = need();
    else if (flag === '--run') out.run = need();
    else if (flag === '--partition') out.partition = need();
    else if (flag === '--hypothesis') out.hypothesis = need();
    else if (flag === '--roles-dir') out.rolesDir = need();
    else if (flag === '--from') out.from = need();
    else throw new Error(`unknown flag: ${flag}`);
  }
  if (!out.role) throw new Error('--role is required');
  if (!out.run) throw new Error('--run is required');
  return out;
}

// Resolves the role file against the RECIPIENT's cwd from `herdr agent list`,
// not the sender's. The runbook's own named failure is a task file that exists
// only in the operator's main checkout, and the recipient's cwd is the only
// place that can be checked from here.
function roleCmd(args, deps) {
  const cfg = parseRole(args);
  const target = agents(fetchAgents(deps)).find((agent) => agent && agent.name === cfg.handle);
  if (!target) throw new Error(`no agent: ${cfg.handle}`);
  const rolePath = path.resolve(target.cwd, cfg.rolesDir, `${cfg.role}.md`);
  if (!fs.existsSync(rolePath)) throw new Error(`role file not found in recipient cwd: ${rolePath}`);

  const line = roleLine(cfg);
  const sendArgs = [cfg.handle, line, '--reply'];
  if (cfg.from) sendArgs.push('--from', cfg.from);
  const { sendCmd } = require('./herd.js');
  return { ...sendCmd(sendArgs, deps), role: cfg.role, line };
}

// fanout --run <id> --partitions a,b [--base task/<id>] [--kind codex]
//        [--selector model=..,effort=..] [--role implementer]
//        [--handle-prefix impl] [--roles-dir d] [--timeout ms]
function parseFanout(args) {
  const out = {
    run: undefined,
    partitions: undefined,
    base: undefined,
    kind: 'codex',
    selector: 'model=gpt-5.6-sol,effort=medium',
    role: 'implementer',
    prefix: 'impl',
    rolesDir: DEFAULT_ROLES_DIR,
    timeout: 45000,
  };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const need = () => requiredText(args[++i], flag);
    if (flag === '--run') out.run = need();
    else if (flag === '--partitions') out.partitions = need().split(',').filter(Boolean);
    else if (flag === '--base') out.base = need();
    else if (flag === '--kind') out.kind = need();
    else if (flag === '--selector') out.selector = need();
    else if (flag === '--role') out.role = need();
    else if (flag === '--handle-prefix') out.prefix = need();
    else if (flag === '--roles-dir') out.rolesDir = need();
    else if (flag === '--timeout') out.timeout = positiveNumber(args[++i], flag);
    else throw new Error(`unknown flag: ${flag}`);
  }
  if (!out.run) throw new Error('--run is required');
  if (!out.partitions || out.partitions.length === 0) throw new Error('--partitions is required');
  const duplicate = out.partitions.find((partition, i) => out.partitions.indexOf(partition) !== i);
  if (duplicate) throw new Error(`duplicate partition: ${duplicate}`);
  out.base = out.base || `task/${out.run}`;
  return out;
}

// Sequential per partition on purpose: `herdr worktree create` resolves its
// source workspace from the invocation cwd, and two concurrent creates off one
// base have not been shown safe. Width shows up as parallelism in waitAllCmd.
//
// A partition that fails does not abort the rest. One taken handle or one dead
// codex should not cost the operator the partitions that would have come up.
function fanoutCmd(args, deps) {
  const cfg = parseFanout(args);
  const requests = cfg.partitions.map((partition, i) => ({
    partition,
    handle: `${cfg.prefix}${i + 1}`,
    branch: `task/${cfg.run}-${partition}`,
  }));

  const taken = new Set(agents(fetchAgents(deps)).map((agent) => agent && agent.name).filter(Boolean));
  const collision = requests.find(({ handle }) => taken.has(handle));
  if (collision) throw new Error(`handle already taken: ${collision.handle}`);

  const { up } = require('./up.js');
  return requests.map((request) => {
    try {
      const launch = up([
        '--branch', request.branch,
        '--base', cfg.base,
        `--${cfg.kind}`, `${request.handle}:${cfg.selector}`,
        '--timeout', String(cfg.timeout),
      ], deps);
      const delivery = roleCmd([
        request.handle,
        '--role', cfg.role,
        '--run', cfg.run,
        '--partition', request.partition,
        '--roles-dir', cfg.rolesDir,
      ], deps);
      return {
        ...request,
        worktree: launch.worktree,
        agent: launch.agents[0],
        delivery: delivery.delivery,
      };
    } catch (error) {
      return { ...request, error: error.message };
    }
  });
}

// wait-all <h1,h2,...> [--status idle,done] [--timeout ms] [--interval ms]
function parseWaitAll(args) {
  const out = {
    handles: undefined,
    statuses: ['idle', 'done'],
    timeout: DEFAULT_WAIT_TIMEOUT_MS,
    interval: DEFAULT_WAIT_INTERVAL_MS,
  };
  let i = 0;
  if (args[0] && !args[0].startsWith('--')) {
    out.handles = args[0].split(',').filter(Boolean);
    i = 1;
  }
  for (; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--status') {
      out.statuses = requiredText(args[++i], flag).split(',').filter(Boolean);
    } else if (flag === '--timeout') {
      out.timeout = positiveNumber(args[++i], flag);
    } else if (flag === '--interval') {
      out.interval = positiveNumber(args[++i], flag);
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }
  }
  if (!out.handles || out.handles.length === 0) throw new Error('wait-all needs at least one handle');
  return out;
}

// ONE `herdr agent list` per round for the whole set, not one wait per handle:
// N waits cost N sockets and serialise on the slowest handle. Never throws on a
// timeout — the operator needs to see which handles settled and which did not,
// and an exception reports only the first failure.
function waitAllCmd(args, deps) {
  const cfg = parseWaitAll(args);
  const now = deps.now || Date.now;
  const sleep = deps.sleep || ((ms) => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
  });
  const deadline = now() + cfg.timeout;
  let rows;
  for (;;) {
    const byHandle = new Map(agents(fetchAgents(deps)).map((agent) => [agent.name, agent]));
    rows = cfg.handles.map((handle) => {
      const agent = byHandle.get(handle);
      const status = agent && agent.agent_status;
      return { handle, status, settled: cfg.statuses.includes(status) };
    });
    if (rows.every(({ settled }) => settled) || now() >= deadline) return rows;
    sleep(cfg.interval);
  }
}

module.exports = {
  DEFAULT_ROLES_DIR,
  DEFAULT_WAIT_TIMEOUT_MS,
  DEFAULT_WAIT_INTERVAL_MS,
  roleLine,
  parseRole,
  roleCmd,
  parseFanout,
  fanoutCmd,
  parseWaitAll,
  waitAllCmd,
};
