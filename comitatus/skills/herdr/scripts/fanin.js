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

// STUB: the ordered vocabulary derivePhase draws from, lowest step first.
// __tests__/fanin.test.js names the six values.
const PHASES = Object.freeze([]);

// state --run <id>
// eslint-disable-next-line no-unused-vars
function parseState(args) {
  return {};
}

// Read-only by construction. `stateCmd` must issue no merge, branch -D,
// checkout, reset, or push: a verb the operator runs to find out where they are
// cannot be a verb that moves them.
// eslint-disable-next-line no-unused-vars
function stateCmd(args, deps) {
  return {};
}

// The single derived answer to "which step am I on", from the facts stateCmd
// already collected. Separate so it is testable without a git mock.
// eslint-disable-next-line no-unused-vars
function derivePhase(facts) {
  return '';
}

// fan-in --run <id> --partitions a,b [--wait-handle arch] [--timeout ms] [--dry-run]
// eslint-disable-next-line no-unused-vars
function parseFanin(args) {
  return {};
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
  return {};
}

// teardown --run <id> --partitions a,b [--yes]
// eslint-disable-next-line no-unused-vars
function parseTeardown(args) {
  return {};
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
  return [];
}

module.exports = {
  PHASES,
  parseState,
  stateCmd,
  derivePhase,
  parseFanin,
  faninCmd,
  parseTeardown,
  teardownCmd,
};
