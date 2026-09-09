#!/usr/bin/env node
'use strict';

// STUB — partition `fanout` of run fanout-comitatus. Every function is exported
// with a correctly-typed placeholder return so the contract tests in
// __tests__/fanout.test.js fail on an assertion that prints what it got, rather
// than on a missing module. Replace each body; do not change a signature
// without changing the test that names it.
//
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

// STUB: __tests__/fanout.test.js names the values these carry. They are the
// runbook's own defaults, not preferences.
const DEFAULT_ROLES_DIR = '';
const DEFAULT_WAIT_TIMEOUT_MS = 0;
const DEFAULT_WAIT_INTERVAL_MS = 0;

// One line, always: a newline in a prompt submits the turn, so a two-line role
// assignment delivers half of itself. The role file is named by PATH and never
// read here — pasting its text is what makes a role assignment unauditable.
// eslint-disable-next-line no-unused-vars
function roleLine({ role, run, partition, hypothesis, rolesDir } = {}) {
  return '';
}

// role <handle> --role <name> --run <id> [--partition p] [--hypothesis n]
//              [--roles-dir d] [--from self]
// eslint-disable-next-line no-unused-vars
function parseRole(args) {
  return {};
}

// Resolves the role file against the RECIPIENT's cwd from `herdr agent list`,
// not the sender's. The runbook's own named failure is a task file that exists
// only in the operator's main checkout, and the recipient's cwd is the only
// place that can be checked from here.
// eslint-disable-next-line no-unused-vars
function roleCmd(args, deps) {
  return {};
}

// fanout --run <id> --partitions a,b [--base task/<id>] [--kind codex]
//        [--selector model=..,effort=..] [--role implementer]
//        [--handle-prefix impl] [--roles-dir d] [--timeout ms]
// eslint-disable-next-line no-unused-vars
function parseFanout(args) {
  return {};
}

// Sequential per partition on purpose: `herdr worktree create` resolves its
// source workspace from the invocation cwd, and two concurrent creates off one
// base have not been shown safe. Width shows up as parallelism in waitAllCmd.
//
// A partition that fails does not abort the rest. One taken handle or one dead
// codex should not cost the operator the partitions that would have come up.
// eslint-disable-next-line no-unused-vars
function fanoutCmd(args, deps) {
  return [];
}

// wait-all <h1,h2,...> [--status idle,done] [--timeout ms] [--interval ms]
// eslint-disable-next-line no-unused-vars
function parseWaitAll(args) {
  return {};
}

// ONE `herdr agent list` per round for the whole set, not one wait per handle:
// N waits cost N sockets and serialise on the slowest handle. Never throws on a
// timeout — the operator needs to see which handles settled and which did not,
// and an exception reports only the first failure.
// eslint-disable-next-line no-unused-vars
function waitAllCmd(args, deps) {
  return [];
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
