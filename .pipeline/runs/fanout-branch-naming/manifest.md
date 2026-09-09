# manifest: fanout-branch-naming

## spec

Replace the six independently-built `task/${run}` literals with one resolved value.
`--task-branch <name>` defaults to `task/<run>`; partition branches become
`<task-branch><sep><partition>` with `--partition-sep` defaulting to `-`; a `/`
separator is refused at parse time with git's own reason. `--run` narrows to naming
only `.pipeline/runs/<id>`.

## criteria

1. Every parser that today derives `task/${run}` returns a resolved `taskBranch` and
   `partitionSep`, defaulting to `task/<run>` and `-`. Four existing exact-shape
   assertions were extended by the architect to pin this.
2. `settled` asks git about `<task-branch><sep><partition>` under all three
   conventions: `chore/make-new-readme-api`, `76632-create-new-thing-api`, and the
   unchanged `task/r7-api`.
3. A run id and a branch name are independent: `--run readme-rewrite --task-branch
   76632-create-new-thing` reads `.pipeline/runs/readme-rewrite` on branch
   `76632-create-new-thing-api`.
4. `parseSettled`, `parseFanin`, `parseTeardown` and `parseFanout` each reject
   `--partition-sep /`, with a message naming why git refuses it.
5. A flat separator other than `-` is honoured (`--partition-sep --`).
6. `fan-in` compares HEAD against the **resolved** task branch, and its error names
   that branch.
7. `fan-in` merges the resolved partition branch.
8. `teardown` plans the resolved partition branch and workspace.
9. `state` discovers partitions by globbing the resolved task branch and recovers
   each partition name from it.
10. `state` accepts an optional `--partitions` that constrains discovery, so a
    human's sibling branch is not reported as a partition.
11. `fanout` uses the resolved task branch as both the default `--base` and the
    partition-branch stem; an explicit `--base` still wins.
12. `fanout` creates each partition worktree with the resolved branch and base.
13. `usage()` documents `--task-branch` and `--partition-sep`.
14. No existing verb's output shape changes; `npm run validate:plugins` passes; the
    implementer edits no test.

## partitions

### `naming` — all of it

- files: `comitatus/skills/herdr/scripts/fanin.js`,
  `comitatus/skills/herdr/scripts/fanout.js`,
  `comitatus/skills/herdr/scripts/herd.js`, plus any new module under
  `comitatus/skills/herdr/scripts/` the resolver wants
- tests: `comitatus/__tests__/fanin.test.js`, `comitatus/__tests__/fanout.test.js`,
  `comitatus/__tests__/herd.test.js`
- criteria: 1–14
- depends_on: none

**Width 1, deliberately.** The obvious split is `fanin.js` (four verbs) against
`fanout.js` (two sites), and the files are disjoint, so it looks like a clean pair.
It is not. Both halves must agree on the flag names, the default, the composition
`<task-branch><sep><partition>`, and the `/` refusal — and the whole point of the
change is that six independent copies of that logic is the defect, not the six
literals themselves. Two partitions would each write their own copy and both go
green, reproducing at width 2 exactly the bug being removed. Any honest split needs a
shared resolver module, which is a `shared_files` entry neither partition could test
against until it existed, which is a dependency, which the architect role resolves by
merging the partitions. So: one partition, and the resolver is the point of it.

That makes this the runbook's bug-fix path — one implementer as a tab in the task
worktree, no partition worktrees, no fan-in. `settled` therefore does not apply to
this run; completion is a commit on `chore/fanout-branch-naming` after the manifest
commit.

## shared_files

Nobody edits these in the partition. Applied by the orchestrator after the
implementer's commit, since at width 1 there is no fan-in to apply them at.

- `comitatus/package.json`, `comitatus/.claude-plugin/plugin.json`,
  `comitatus/.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
  `package-lock.json` — version bump, `node scripts/bump-version.js comitatus minor`
  then `npm install --package-lock-only`. Minor: two new flags. The lockfile is named
  here because run `orch-selfhost` omitted it and the reviewer caught it.
- `comitatus/skills/herdr/SKILL.md` — prose for the two flags and the `/` constraint.
  Not the partition's, because `usage()` and SKILL.md would otherwise drift as two
  descriptions of one surface written by two agents.
- `.pipeline/log.md` — the run's row.
- `.pipeline/backlog.md` and `.pipeline/backlog/branch-naming-conventions.md` — the
  backlog item's status moves to done when this lands.

## risk notes

- **data**: the highest risk in the change. `teardown` runs `worktree remove --force`
  and `git branch -D` on a name this run makes configurable, so a resolver that
  composes the wrong string destroys a branch nobody asked it to. Criterion 8 pins
  the planned name, and `teardown` still refuses without `--yes`. An implementer that
  cannot make criterion 8 pass must write BLOCKED rather than loosen it.
- **concurrency**: none new.
- **auth**: none. No new verb, so `/herd-setup`'s allowlist is unchanged — the flags
  ride inside verbs already baked or already gated.
- **money**: none.
- **back-compat**: every default is today's value, so the criterion that matters most
  is the one with no new test: the 290 existing tests must stay green untouched. A
  green suite with an edited existing assertion is not back-compat, which is why the
  four assertions the architect moved are named in criterion 1 and no others may
  move.

## failing output (red gate)

`cd comitatus && npx jest` on the manifest commit:

```
Test Suites: 3 failed, 3 passed, 6 total
Tests:       23 failed, 290 passed, 313 total
```

Baseline on `task/orch-selfhost`: 294 passed, 294 total. The 23 are this run's
criteria; 4 of the 294 moved into the failing set as the exact-shape parse
assertions the architect extended.

A throw is not an assertion — `unknown flag: --task-branch` names nothing and prints
no value. Both test files therefore wrap the not-yet-supported call so the diff shows
what came back:

```
● --task-branch and --partition-sep › a slashed prefix that is not task/: settled asks git about the right branch

    expect(received).toEqual(expected) // deep equality

    Expected: [{"blocked": undefined, "branch": "chore/make-new-readme-api",
                "commits": 2, "partition": "api", "status": "done"}]
    Received: {"threw": "unknown flag: --task-branch"}

      at toEqual (__tests__/fanin.test.js:321:34)
```

```
● --task-branch and --partition-sep › parseSettled rejects a / separator and says why git refuses it

    expect(received).toThrow(expected)

    Expected pattern: /cannot|refs are files|exists/i
    Received message: "unknown flag: --partition-sep"
```

The second needs no wrapper: it already fails on the *content* of the throw, which is
the assertion. Both print the value they got, which is what the gate is for.
