# manifest: fanout-comitatus

## spec

Add six composite verbs to the comitatus herd helper covering the mechanical steps of
`fan-out-trial.md`: `role`, `fanout`, `wait-all` (launch/message side) and `state`,
`fan-in`, `teardown` (git side). Each lands in a new module under
`comitatus/skills/herdr/scripts/`, self-contained and stdin-free like every existing verb.
Dispatch registration, `usage()`, `HELPER_VERBS`, and the SKILL.md verb line are one
atomic shared edit applied at fan-in — a test already forces those four lists to agree.
No existing verb's output shape changes.

## criteria

Observable, per verb.

### partition `fanout`

1. `roleLine({role, run})` returns exactly `read <rolesDir>/<role>.md and follow it. $RUN is <run>`,
   with `, $PARTITION is <p>` appended when `partition` is given and `, $HYPOTHESIS is <n>`
   when `hypothesis` is given. `rolesDir` defaults to `.pipeline/roles`.
2. The composed line is one line. It is delivered by path; the role file's text is never
   read or pasted into the message.
3. `roleCmd` resolves the role file against the **recipient's** `cwd` from `herdr agent list`
   and throws naming the missing path when it does not exist there. A role file that exists
   only in the operator's checkout is the runbook's own named failure.
4. `roleCmd` sends with `--reply` and returns the `sendCmd` result plus `{ role, line }`.
5. `fanoutCmd` preflights every derived handle against a live `herdr agent list` and throws
   before creating any worktree if one is taken.
6. `fanoutCmd` derives `task/<run>-<p>` branches off `task/<run>` by default, launches one
   codex agent `impl<p>` per partition, and sends it the implementer role line.
7. A failure on one partition does not abort the others: every partition gets a result row
   carrying either `worktree`/`delivery` or `error`.
8. `waitAllCmd` polls **one** `herdr agent list` per round for all handles, not one wait per
   handle, and returns a row per handle. A handle that times out does not throw and does not
   suppress the rows for handles that settled.
9. `waitAllCmd` defaults to `--status idle,done` and `--timeout 900000` — the runbook's values.

### partition `fanin`

10. `stateCmd` derives the runbook's "What git holds" table from refs on every call and
    persists nothing: `started`, `manifest`, per-partition `{branch, merged, blocked, probe}`,
    `logRow`, and a derived `phase` of `absent|started|partitioned|fanned-out|fanned-in|finished`.
11. `stateCmd` issues no writing git command — no `merge`, `branch -D`, `checkout`, `reset`, or `push`.
12. `faninCmd` refuses when `HEAD` is not `task/<run>`, naming the branch it found. `arch` owns
    the task branch; merging from a partition worktree is the runbook's prohibition.
13. `faninCmd` settles the architect (`waitCmd` on `idle,done`) **before** the first merge and
    refuses to merge at all if that wait times out.
14. `faninCmd` merges `task/<run>-<p>` in the order given (manifest order). On the first
    conflict it stops, leaves the merge in place, and returns the partition plus the
    `--diff-filter=U` paths; later partitions are not attempted.
15. `teardownCmd` without `--yes` destroys nothing and returns a plan.
16. `teardownCmd` skips a partition whose branch carries a `BLOCKED-*.md` that is uncommitted
    or committed-but-unmerged, giving the reason. `worktree remove --force` discards both
    without warning.
17. `teardownCmd --yes` runs `herdr worktree remove --workspace <ws> --force --json` then
    `git branch -D task/<run>-<p>`, in that order — `remove` does not delete the branch.

## partitions

### `fanout`

- **files**
  - `comitatus/skills/herdr/scripts/fanout.js`
  - `comitatus/__tests__/fanout.test.js`
- **tests**: `comitatus/__tests__/fanout.test.js`
- **depends_on**: none

Exports `roleLine`, `parseRole`, `roleCmd`, `parseFanout`, `fanoutCmd`, `parseWaitAll`, `waitAllCmd`.
Reads `sendCmd`/`fetchAgents` from `./herd.js` and `up` from `./up.js` by lazy `require`
inside the function that needs them — `herd.js` will require this module back at fan-in, and
a top-level cycle would leave one side holding a half-initialised `exports`.

### `fanin`

- **files**
  - `comitatus/skills/herdr/scripts/fanin.js`
  - `comitatus/__tests__/fanin.test.js`
- **tests**: `comitatus/__tests__/fanin.test.js`
- **depends_on**: none

Exports `parseState`, `stateCmd`, `derivePhase`, `parseFanin`, `faninCmd`, `parseTeardown`, `teardownCmd`.
Same lazy-require rule for `waitCmd` from `./herd.js`.

Both partitions branch off `task/fanout-comitatus` and can run concurrently. They share no
file, and neither imports the other.

## shared_files

Nobody edits these in a worktree. Every one of them is a list that a partition would have to
touch to be reachable, and three of them are cross-checked against each other by an existing
test, so a partial edit fails the suite in the worktree that made it.

| File | Change applied at fan-in |
| --- | --- |
| `comitatus/skills/herdr/scripts/herd.js` | lazy `require` of both modules inside `dispatch`; six `case` arms (`role`, `fanout`, `wait-all`, `state`, `fan-in`, `teardown`); six two-space verb entries in `usage()` |
| `comitatus/scripts/herd-setup.js` | split `HELPER_VERBS` into the baked-allow set and a gated set; add the six verbs, with `fan-in` and `teardown` **gated** (see risk) |
| `comitatus/__tests__/herd-setup.test.js` | update the "every dispatchable verb has an allow rule" and "SKILL.md advertises exactly the verbs" tests to assert allowed ∪ gated == `usage()` |
| `comitatus/skills/herdr/SKILL.md` | the `helper verbs:` line (line 21) plus a fan-out section documenting the six |
| `comitatus/__tests__/herd.test.js` | dispatch-level cases for the six verbs |
| `comitatus/README.md` | the verb lists at lines 32-33 and 163-164 |
| `comitatus/package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json` | one `node scripts/bump-version.js comitatus minor` — new features, bumped once after fan-in |

`herd-setup.js`, `herd.js`'s `usage()`, and `SKILL.md`'s verb line are a single unit.
`comitatus/__tests__/herd-setup.test.js:46` asserts `HELPER_VERBS` equals the verbs parsed out
of `usage()`, and `:59` asserts the SKILL.md line equals `HELPER_VERBS`. A partition that added
its verbs to any one of the three would fail that suite in its own worktree, which is why none
of them is partition work.

New modules must live under `comitatus/skills/herdr/scripts/`. `provisionStable` in
`hooks/herdr-orient.js` copies that directory wholesale into `~/.claude/comitatus`, so a
sibling module travels with the helper; one placed outside it would be absent at runtime while
passing every test here.

## risk notes

**Permission escalation through the baked allowlist.** `SAFE_ALLOW` deliberately omits
`git branch:*`, `git checkout:*`, `git reset:*`, `git push:*`, and `git worktree remove:*` —
`comitatus/__tests__/herd-setup.test.js:11` asserts they stay out. But `bakedHerdRules` maps
*every* `HELPER_VERB` to `Bash(node <base> <verb>:*)`, so adding `fan-in` and `teardown` to
that list hands an agent `git merge`, `git branch -D`, and `herdr worktree remove --force`
through the helper — the exact commands the allowlist refuses directly. Hence the gated set:
these two verbs dispatch but are not baked, so they prompt. `teardown` additionally defaults
to a plan and needs `--yes`, and refuses a partition holding an unmerged `BLOCKED` file.
This is the one deliberate departure from "every dispatchable verb has an allow rule", and
the test that enforces that rule has to be rewritten to name the exception rather than
deleted.

**Data loss at teardown.** `herdr worktree remove --force` discards uncommitted files
silently, and `git branch -D` discards commits. `BLOCKED-*.md` and `probe-*.md` are the
trial's evidence base and the only account of what was ruled out; the runbook keeps them on
purpose. Criteria 15-17 exist for this and are the highest-value tests in the set.

**Concurrency.** `fanoutCmd` is sequential per partition on purpose. `herdr worktree create`
resolves a source workspace from the invocation cwd and two concurrent creates off one base
have not been shown safe. `waitAllCmd` is the only place fan-out width shows up as
parallelism, and it parallelises *observation*, not mutation.

**No auth, no money, no data migration** in this change. Everything runs against a local
`herdr` socket and a local repository.

## red gate

56 new tests, all failing, none on an import or a syntax error. Each module is committed as a
stub that exports every named function and constant with a correctly-typed placeholder return
(`''`, `0`, `[]`, `{}`), so every failure prints an assertion and the value it got. Nothing in
either file passes: a test that passes the moment it is written has established nothing, so the
stub constants were blanked once `PHASES` turned out to satisfy its own test.

The existing suites are untouched: `herd.test.js`, `up.test.js`, `herd-setup.test.js`, and the
hooks suite are 209 passed, 209 total, which is the "no change to any existing verb's output
shape" half of done-when.

```
$ npx jest __tests__/fanout.test.js __tests__/fanin.test.js

Test Suites: 2 failed, 2 total
Tests:       56 failed, 56 total
```

Four representative failures, one per verb group. Grepping the full output for `TypeError`,
`ReferenceError`, `SyntaxError`, `Cannot find module`, and `Cannot read` returns nothing.

```
  ● roleLine › the architect form: role by path, then $RUN

    expect(received).toBe(expected) // Object.is equality

    Expected: "read .pipeline/roles/architect.md and follow it. $RUN is fanout-comitatus"
    Received: ""

       96 |   test('the architect form: role by path, then $RUN', () => {
       97 |     expect(f.roleLine({ role: 'architect', run: 'fanout-comitatus' }))
    >  98 |       .toBe('read .pipeline/roles/architect.md and follow it. $RUN is fanout-comitatus');

  ● fanoutCmd › a taken handle throws before any worktree is created

    expect(received).toThrow(expected)

    Expected pattern: /impl2/
    Received function did not throw

      336 |     expect(() => f.fanoutCmd(['--run', 'r7', '--partitions', 'auth,ui'],
      337 |       deps({ run: herd.run, env: { HERDR_PANE_ID: 'wA:p1' } })))
    > 338 |       .toThrow(/impl2/);

  ● stateCmd › reads refs and issues no writing git command

    expect(received).toContainEqual(expected) // deep equality

    Expected value: ["git", "rev-parse", "--verify", "--quiet", "task/r7"]
    Received array: []

      158 |     b.stateCmd(['--run', 'r7'], deps({ run: herd.run }));
    > 159 |     expect(herd.calls).toContainEqual(['git', 'rev-parse', '--verify', '--quiet', 'task/r7']);

  ● faninCmd › refuses when HEAD is not the task branch, naming what it found

    expect(received).toThrow(expected)

    Expected pattern: /task\/r7-auth/
    Received function did not throw

      191 |     const herd = gitHerd({ 'git rev-parse --abbrev-ref HEAD': 'task/r7-auth\n' });
      192 |     expect(() => b.faninCmd(['--run', 'r7', '--partitions', 'auth'], deps({ run: herd.run })))
    > 193 |       .toThrow(/task\/r7-auth/);
```

Two assertions in the set are the kind that a no-op stub would satisfy on its own — "issues no
writing git command" and "without `--yes` it destroys nothing". Both are paired inside one test
with a positive assertion about the calls that *should* have happened, so neither can pass
until the verb actually runs.
