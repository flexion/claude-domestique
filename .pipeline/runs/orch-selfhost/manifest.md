# manifest: orch-selfhost

## spec

Fix the two comitatus helper defects the first real fan-out run surfaced. `up` must
fetch only when `--base` names a configured remote, and create from a local ref with
no fetch at all. A new read-only `settled` verb must answer "is this partition
actually done" from refs — a commit on the partition branch, or a committed
`BLOCKED-<p>.md` — because an agent reads `idle` between its own turns.

## criteria

1. `up --base task/<id>` (local-only base) creates the worktree and issues **no**
   `git fetch`.
2. `up --base main` (no slash) is treated as a local ref, not shorthand for
   `origin/main`; no fetch.
3. `up --base origin/dev` still runs `git fetch origin dev`, before `worktree create`.
4. `up --base upstream/main` fetches from `upstream` — remoteness is decided against
   `git remote`, not against the literal prefix `origin/`.
5. `up --base origin/release/2.0` fetches branch `release/2.0` (only the first
   segment is the remote).
6. `settled --run <id> --partitions a,b` returns one row per partition **in the order
   given**: `{ partition, branch, status, commits, blocked?, reason? }`.
7. `status` is `done` when the partition branch has ≥1 commit the task branch does
   not (`git rev-list --count task/<id>..task/<id>-<p>`), `working` when it has none.
8. `status` is `blocked` when `.pipeline/runs/<id>/BLOCKED-<p>.md` is committed on the
   partition branch, and `blocked` outranks `done` — the commit that carried the
   BLOCKED file must not read as success.
9. A `BLOCKED-*.md` naming a *different* partition does not block this one.
10. A partition branch that does not exist is `working` with `reason: 'no branch'`,
    not an exception — fan-out can report a partition whose worktree failed.
11. A missing `task/<id>` throws, naming the branch.
12. `settled` issues only read-only git commands: no `merge|branch -D|checkout|reset|
    push|commit|rebase|switch`, no `fetch`, and no `herdr` call at all.
13. `settled` is dispatchable from `herd.js`, documented in `usage()`, and baked by
    `/herd-setup` (read-only, and polled in a loop — a prompt there stalls the wait
    it exists to answer).
14. A verb in `fanout.js`/`fanin.js` that requires `herd.js` back works when
    `herd.js` is the **CLI entry**, not only when it is required as a library. The
    regression test spawns `node herd.js <verb>` in a child process.
15. No existing verb's output shape changes. `state`'s row shape is untouched.
16. `cd comitatus && npm test` green; `npm run validate:plugins` green from the root.

## partitions

### `up` — defect 1, the conditional fetch

- files: `comitatus/skills/herdr/scripts/up.js`
- tests: `comitatus/__tests__/up.test.js`
- criteria: 1–5
- depends_on: none

The decision point is `up()`'s "refresh the local base ref" block. Split `--base` at
the first `/`; if that first segment appears in `git remote`, fetch `<remote>
<rest-of-base>`; otherwise fetch nothing and pass the base through to `worktree
create` unchanged. `git remote` is issued once, after the handle pre-flight and
before the fetch — `dynMatchers()` in the test file already answers it, and the
exact-call-sequence test pins that position.

### `settle` — defect 2, the git-derived settle check

- files: `comitatus/skills/herdr/scripts/fanin.js` (replace the `parseSettled` /
  `settledCmd` stubs), `comitatus/skills/herdr/scripts/herd.js` (dispatch case +
  `usage()` entry), `comitatus/scripts/herd-setup.js` (`HELPER_VERBS`),
  `comitatus/skills/herdr/SKILL.md` (the `helper verbs:` line, and a `settled`
  section beside `state`)
- tests: `comitatus/__tests__/fanin.test.js`, `comitatus/__tests__/herd.test.js`,
  `comitatus/__tests__/herd-setup.test.js`
- criteria: 6–14
- depends_on: none

SKILL.md is this partition's file, not a shared one: `herd-setup.test.js` holds the
skill's `helper verbs:` line equal to `DISPATCHABLE_VERBS`, so adding the verb to
`HELPER_VERBS` turns that existing test red until the doc line is updated. That test
is green right now and will go red the moment the implementer starts — expected, and
part of this partition's green.

Criterion 14 is a third defect, found by this run's own orchestrator when `fanout`
died before it could reach defect 1:

```
$ node H fanout --run orch-selfhost --partitions up,settle
herd: herd.fetchAgents is not a function
```

`herd.js` calls `main()` at require time, on the line **above** its `module.exports`
assignment. `fanout.js` and `fanin.js` require `herd.js` back for `fetchAgents` and
`waitCmd`, so as the CLI entry they read exports as it stood mid-load: `role`,
`fanout`, `wait-all` and `fan-in` all fail. `state` and `teardown` survive only
because neither reaches back.

Run 1 shipped these five verbs at **275 passed / 275 total, 6 suites green**, with
every one of them dead from the command line. The suite could not see it: every test
requires `herd.js` as a library, where `module.exports` is fully assigned before
anything reads it, and the CLI is the only path the fan-out surface is ever used
through. That is why criterion 14 pins the child process specifically — a
library-require test is what hid this, so repeating one would hide it again.

The lazy `require('./herd.js')` inside each function, which run 1 added deliberately
and documented in both modules' headers, is aimed at the wrong half of the problem.
Lazy requires fix a load-order **cycle** — neither module holds a stale reference to
the other at import time. They do nothing about an entry module that runs its main
before it finishes exporting, because the function body still resolves
`herd.fetchAgents` against exports that were never assigned. Moving
`module.exports` above `if (require.main === module) main()` is the fix; the lazy
requires can stay.

## shared_files

Nobody edits these in a worktree. Applied on the task branch at fan-in.

- `comitatus/package.json`, `comitatus/.claude-plugin/plugin.json`,
  `comitatus/.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json` — version
  bump, all four written by `node scripts/bump-version.js comitatus minor` (minor:
  `settled` is a new verb). Both partitions would otherwise touch the same four
  files for one bump.
- `package-lock.json` — the lockfile's `comitatus` version entry, synced with
  `npm install --package-lock-only` after the bump. **Added after the review.** The
  reviewer's one finding was that this file is modified in the diff and named
  nowhere in the manifest, which was correct: `bump-version.js` moves
  `comitatus/package.json`, so the lock goes stale the moment it runs, and the
  architect role's own shared_files definition lists lockfiles first. Naming the
  four manifests and not the fifth file the same command implies is the omission,
  not the edit.
- `.gitignore` — `.pipeline/runs/*/diff.patch`, which the runbook's setup step 5
  calls for and this repository never had. Written after `diff.patch` was generated,
  so it is not in the diff the reviewer read; recorded here for the same reason as
  the lockfile.
- `comitatus/skills/herdr/SKILL.md`, prose only — the line describing `up` as doing
  "`git fetch`, `worktree create`, …" needs a clause for the local-base case. Applied
  after `settle` merges, so its verb-line edit is not disturbed.
- `.pipeline/log.md` — the run's row.

## risk notes

- **auth**: none. No credential, token, or permission decision changes. `settled`
  joins the baked allowlist, which is a widening of `/herd-setup`'s pre-authorization
  — justified only because the verb is provably read-only, which criterion 12 is the
  test for. If that test is weakened, the allowlist entry is no longer earned.
- **data**: `settled` must never write. It is polled in a loop, sometimes while an
  implementer is mid-commit; a stray `git checkout` or index write there corrupts a
  partition's work in a worktree the caller does not own.
- **concurrency**: `up`'s fetch removal is the fix for a real fan-out deadlock, not a
  cleanup. Two partitions call `up` sequentially off the same local base; a fetch that
  fails takes both worktrees with it.
- **money**: none.

## failing output (red gate)

`cd comitatus && npx jest` on the manifest commit:

```
Test Suites: 4 failed, 2 passed, 6 total
Tests:       22 failed, 272 passed, 294 total
```

Baseline before these tests: 275 passed, 275 total, 6 suites. The 22 failures are
the two partitions' criteria; the 3 that dropped out of "passed" are existing tests
whose expectations moved (the `up` exact-call-sequence, and the two fan-out verb
lists in `herd.test.js`).

Every failure is an assertion, with the value it got:

```
● up › a local-only base creates the worktree with no fetch attempted

    expect(received).toEqual(expected) // deep equality

    - Array []
    + Array [
    +   Array [
    +     "git",
    +     "fetch",
    +     "origin",
    +     "task/r7",
    +   ],
    + ]

      at Object.toEqual (__tests__/up.test.js:413:28)
```

That received value is defect 1 verbatim: `git fetch origin task/r7`, the call that
dies on `couldn't find remote ref` for a branch that exists only locally.

```
● settledCmd › a commit ahead of the task branch is done; no commit is still working

    expect(received).toEqual(expected) // deep equality

    - Array [
    -   Object { "blocked": undefined, "branch": "task/r7-auth", "commits": 2,
    -            "partition": "auth", "status": "done" },
    -   Object { "blocked": undefined, "branch": "task/r7-ui", "commits": 0,
    -            "partition": "ui", "status": "working" },
    - ]
    + Array []

      at Object.toEqual (__tests__/fanin.test.js:208:8)
```

```
● parseSettled › --run is required

    expect(received).toThrow(expected)
    Expected pattern: /--run is required/
    Received function did not throw

      at Object.toThrow (__tests__/fanin.test.js:178:60)
```

`Array []` and "did not throw" are the stub's typed placeholders in `fanin.js` doing
their job: the assertion names the gap instead of the module failing to load.

```
● herd.js main wiring (child process) › a verb that requires herd.js back reaches
  herdr, not a half-loaded exports object

    expect(received).not.toMatch(expected)

    Expected pattern: not /is not a function/
    Received string:      "herd: herd.fetchAgents is not a function
    "

      at Object.toMatch (__tests__/herd.test.js:1051:38)
```

That received string is criterion 14's defect as the operator meets it: not a stack
trace, the one line `herd.js` prints before exiting 1.

Full list of the 22:

```
● bakedHerdRules › the read-only and launch fan-out verbs ARE baked
● dispatch (self-contained verbs) › each fan-out verb reaches its own module, and argument errors come from there
● dispatch (self-contained verbs) › the fan-out verbs are routed, not silently unknown
● parseSettled › run and partitions in the order given
● parseSettled › --run is required
● parseSettled › --partitions is required
● parseSettled › an unknown flag throws rather than being ignored
● parseSettled › a flag missing its value throws
● settledCmd › a commit ahead of the task branch is done; no commit is still working
● settledCmd › a committed BLOCKED-<p>.md is blocked, and outranks the commit that carried it
● settledCmd › a BLOCKED file naming a different partition does not block this one
● settledCmd › a partition branch that does not exist yet is working, with a reason
● settledCmd › rows come back in the order asked, not alphabetical
● settledCmd › a missing task branch is an error, not a set of working partitions
● settledCmd › answers from refs alone and issues no writing git command
● up › single claude agent: exact call sequence and result
● up › a local-only base creates the worktree with no fetch attempted
● up › a base with no slash is a local ref, not shorthand for origin/<base>
● up › a non-origin remote base fetches from that remote
● usage / --help › usage lists every fan-out verb (the done-when for --help)
● usage / --help › usage says settled answers from refs, not from agent status
● herd.js main wiring (child process) › a verb that requires herd.js back reaches herdr, not a half-loaded exports object
```
