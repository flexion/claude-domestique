# fan-out trial log

One row per task. Ten honest rows before anything here gets automated — the
decision table is in `runs/*/fan-out-trial.md` under "What the log decides".

| id | type | width | wall min | human min | conflicts | red-gate fails | scope violations | blocked | reviewer hits | escalations | $ opus | $ sonnet | $ haiku | $ codex | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| orch-selfhost | feature | 2 | 38 | ~4 | 0 | 0 | 0 | 0 | 1 | 0 | ? | ? | — | ? | first run driven by an agent taking `orchestrator.md` rather than by hand. three defects, not the two in `task.md`: `fanout` was dead from the CLI, so fan-out ran on primitives. `fan-in` unusable by an orchestrator that is also the architect — bypassed, `DEFECT-fanin-selfwait.md`. models: opus/high arch+orch, 2× codex gpt-5.6-sol/medium impl, sonnet/high rev. |
| fanout-branch-naming | feature | 1 | 32 | ~2 | 0 | 0 | 2 | 0 | 1 | 0 | ? | ? | — | ? | width **1 on purpose**: the two candidate partitions had disjoint files but had to agree on one resolver, and two copies of it is the defect being removed. runbook bug-fix path — implementer as a tab in the task worktree, no partition worktrees, no fan-in, so `settled` did not apply and completion was a commit past the manifest. branch `chore/fanout-branch-naming` with run id `fanout-branch-naming`, exercising its own decoupling. reviewer hit was real and destructive-adjacent: `--partition-sep` read raw accepted `--base` and composed `task/r7--baseapi`, on the path that feeds `git branch -D`. **2 scope violations, both operator-initiated mid-run and neither routed through the manifest** — see below. models: opus/high arch+orch, codex gpt-5.6-sol/**high** impl (raised from medium: the change touches `teardown`'s destructive path). |

**wall min** is 05:50 → 06:28, from the `task.md` commit to the commit resolving the
reviewer's finding, read off `git log`. Teardown is not in it.

**human min** is an estimate, and the only estimated number in the row. The operator
sent three messages and read two reports; nothing measures how long that took, so it
is marked `~`. Every other column is counted.

**$ columns are unread, not zero.** Vendor dashboards are the budget meter and this
session cannot reach them. A zero here would be a false entry in the one column the
"one model dominates spend" decision depends on, so it stays `?` until someone reads
the dashboards for this window. `$ haiku` is `—` because no Haiku agent ran.

That `?` is not a special case for this table. It is the same three-valued rule the
rest of the repository already applies wherever a check might not have run:
`scripts/probe-skill.js` exits `0` fired, `1` did not, `2` **could not run**
(`AGENTS.md`), and `herd.js send` reports `observed | accepted | undeliverable`,
where `accepted` means *unknown* and is documented as neither a success nor a
failure. Collapsing "did not happen" and "was not measured" into one value is what
each of those exists to prevent, and a spend column is the same shape: `0` says the
model cost nothing, `?` says nobody looked. Fill it in rather than clearing it.

**reviewer hits: 1.** The Sonnet reviewer, reading only the manifest and the diff,
found that `package-lock.json` was modified and named nowhere in the manifest — an
orchestrator omission in `shared_files`, not a Codex defect. Cross-lineage review
earned its place on the first agent-driven run, and earned it on the one file no
partition could have flagged: an implementer only ever sees its own file list, so a
file belonging to nobody is invisible from inside a partition and invisible to the
orchestrator who forgot it. The table's `reviewer hits` column asks what a Sonnet
reviewer found in a Codex diff; the honest answer for this row is that it found
something in the orchestrator's own diff instead, which is a stronger reason to keep
the stage than the one the column was written to measure.

**red-gate fails: 0.** All 22 new tests failed on assertions that printed the value
they got. The `settled` tests needed typed stubs in `fanin.js` to get there; without
them they would have failed on a missing export, which is a red-gate fail and not a
red gate.

## The two scope violations in `fanout-branch-naming`

Counted as violations because the column asks what changed outside the owning
partition's file list, and both did. Neither was a worker exceeding its brief — the
operator initiated both directly in the implementer's session, which the column has
no way to express, so it is said here instead.

1. **`9fbd064` "chore - remove boundary artifacts"** — deletes 1559 lines across
   `boundary/agent-work-item-skill.yaml`, `boundary/gh-158.sketch.md`,
   `boundary/gh-158.yaml` and `boundary/gh-173.yaml`. Those four files exist on
   `main`, so merging this branch removes them from `main`. It landed *after* the
   review, so no reviewer saw it, and it is in no partition's file list.
2. **the fan-out skill split** — `comitatus/skills/fan-out/SKILL.md` plus seven role
   copies, `herdr/SKILL.md` cut by 84 lines, `comitatus/README.md`,
   `metadata/skill-catalog.json`, and a second version bump to `0.13.0` on top of
   this run's `0.12.0`. Uncommitted at the time this row was written. The
   orchestrator had held it as out-of-manifest; the operator overrode that, which is
   the operator's call to make.

What this row measures is therefore narrower than the branch: criteria 1–14 are met
and verified at `865e048` — comitatus 325/325, whole repo 776 tests across 19
suites, `validate:plugins` green, and the two target conventions exercised against
real refs rather than fakes. Everything after `865e048` on this branch is outside
that verification.

The process lesson is not "the operator broke the rules". It is that a frozen
manifest has no channel for the operator to *amend* it — the roles give the
orchestrator `fan-in` and `teardown` gates to ask permission upward, and nothing
going the other way. So an operator with new scope has exactly two options: a new
run, or typing into a worker's session. The second is faster, and it is why the run
record and the branch now disagree.

## Missing row

Run `fanout-comitatus` — the run that built `fanout`, `wait-all`, `state`, `fan-in`
and `teardown` — has no row, because this file did not exist until now. Its numbers
are not reconstructed here: guessing them would put two rows of different quality in
a table whose only value is that every row was filled honestly. What is known about
it is recorded where it was observed, in `runs/orch-selfhost/manifest.md` under
criterion 14: it shipped five verbs at 275/275 green with every one of them dead
from the command line.
