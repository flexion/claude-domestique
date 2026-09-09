---
name: fan-out
description: >-
  Use when coordinating a task as one architect and multiple implementers on
  separate herdr branches, with durable run state and ordered fan-in.
---

# fan-out

This is the runbook for partitioning one task across an architect and N
implementers. Load `comitatus:herdr` first: it provides the herdr prerequisite,
helper path, roster protocol, and worktree conventions. This skill supplies the
fan-out workflow and its role files.

The packaged role copies are in [`roles/`](roles/):
[`architect.md`](roles/architect.md), [`hypotheses.md`](roles/hypotheses.md),
[`implementer.md`](roles/implementer.md), [`mechanic.md`](roles/mechanic.md),
[`orchestrator.md`](roles/orchestrator.md), [`probe.md`](roles/probe.md), and
[`reviewer.md`](roles/reviewer.md). When the plugin is deployed, use that
installed directory as `--roles-dir` for `role`; in a repository that has
`.pipeline/roles`, the helper's default remains the repository-local roles.
Deliver role files by path so the recipient reads the exact file; never paste a
role into a prompt.

## Run lifecycle

Six helper verbs cover the mechanical steps: partition a task, launch one agent
per partition on its own branch, wait on them together, inspect state, merge in
order, and tear down without losing evidence.

`--run <id>` names `.pipeline/runs/<id>`. By default it also names branches:
`task/<id>` for the architect and `task/<id>-<partition>` for each implementer.
The run id and task branch are independent:

```text
node HERD settled --run readme-rewrite \
  --task-branch 76632-create-new-thing --partitions api
```

`--task-branch <name>` and `--partition-sep <sep>` are accepted by `fanout`,
`state`, `settled`, `fan-in`, and `teardown`. They default to `task/<run>` and
`-`; pass the same pair to every verb in a run. Partition branches are
`<task-branch><separator><partition>`.

The separator cannot be `/`: Git refs are files, so a branch cannot also be a
directory. Use a flat separator (`-`, `--`, `.`, `_`). The option is rejected at
parse time before any worktree is created.

`state` is the only verb that finds partitions rather than receiving them. It
globs `<task-branch><separator>*`; pass `--partitions` when a human-created
sibling branch could otherwise look like a partition.

## Deliver roles and launch

```text
node HERD role arch --role architect --run my-task
node HERD role impl1 --role implementer --run my-task --partition auth
node HERD fanout --run my-task --partitions auth,ui
```

The role path resolves against the recipient's cwd. A role file missing there is
an error; `--roles-dir` overrides `.pipeline/roles`. `fanout` checks handle
collisions before creating the first worktree and reports a failed partition in
its own row so other partitions can still launch.

## Wait and inspect

Wait on all implementers together:

```text
node HERD wait-all impl1,impl2 --status idle,done --timeout 900000
```

An idle agent may still be between turns. `settled` uses Git refs instead: a
partition is `done` when its branch is ahead of the task branch, `blocked` when
it commits `BLOCKED-<partition>.md`, and `working` otherwise.

`state` derives phase from refs and stores no journal:

```text
node HERD state --run my-task
```

Its phase is `absent | started | partitioned | fanned-out | fanned-in | finished`.

## Fan-in and teardown

Merge in manifest order from the task branch only:

```text
node HERD fan-in --run my-task --partitions auth,ui
```

It refuses unless `HEAD` is the resolved task branch and the architect is
settled. At the first conflict it stops and reports the partition and paths;
leave conflict resolution to the owning implementer.

Teardown plans by default and requires `--yes` to remove anything:

```text
node HERD teardown --run my-task --partitions auth,ui
node HERD teardown --run my-task --partitions auth,ui --yes
```

Uncommitted or unmerged `BLOCKED-*.md` and `probe-*.md` evidence causes a
partition to be skipped. Removal order is worktree first, branch second.
