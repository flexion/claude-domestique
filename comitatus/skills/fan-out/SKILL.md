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

comitatus is the message bus. Git is the state machine. Tests are the contract.
There is no orchestrator *process* — a named agent takes `orchestrator.md` and
drives the run. That is deliberate.

## Which position you hold

**Work out which position you are in before acting on anything below.** More
than one agent in a run reads this skill, and they are not interchangeable.

- **Were you sent a role file** — a message naming `<something>/<role>.md` to
  read and follow? Then you are that role, **that file governs**, and this skill
  is background for the verbs it names. Do not adopt any other position here.
- **Did you take `architect.md` and then `orchestrator.md`?** You own the task
  branch and its worktree. You write there; the restrictions below are not
  yours.
- **Did you load this skill yourself to start a run, holding no role file?**
  You are the **launcher**, described next.
- **None of the above** — you opened this out of curiosity, or to answer a
  question about how fan-out works. Read on, but do not create worktrees or
  launch agents for a run nobody asked you to start.

### The launcher

The launcher sets a run up and then gets out of the tree. It:

- creates the task worktree, writes and commits `task.md`, and starts the
  architect — all before any other agent is live;
- then **reads, decides, and approves**: answering what `orchestrator.md`
  escalates, authorizing `fan-in` and `teardown`, and calling the run finished.

Once the architect is running, the launcher **does not write to the task
worktree or to any partition worktree** — no edits, no commits, no merges, no
`git` state changes. It takes no role file and owns no branch. Its cwd is the
main checkout, the one tree nobody else is working in.

That boundary is the rule the topology enforces everywhere else: **one writer
per tree**. An agent's view of its worktree is whatever it last read, so a
launcher that "just fixes one thing" in the task tree is a second writer racing
the orchestrator, and the loser is overwritten silently. If something needs
changing, send it to the agent that owns that tree.

Before the first run: one command must run the suite and exit non-zero on
failure, both CLIs (Claude Code, Codex) must be installed, and `/herd-setup`
must have been run once on this host — an agent that stops for tool approval
mid-run stalls the fan-out. Start at width 2 and go wider only after several
clean tasks.

## Role files

The packaged role copies are in [`roles/`](roles/):
[`architect.md`](roles/architect.md), [`hypotheses.md`](roles/hypotheses.md),
[`implementer.md`](roles/implementer.md), [`mechanic.md`](roles/mechanic.md),
[`orchestrator.md`](roles/orchestrator.md), [`probe.md`](roles/probe.md), and
[`reviewer.md`](roles/reviewer.md).

In a repository that has `.pipeline/roles`, the helper's default already reads
those and you pass nothing. Everywhere else, **take the roles directory from
your herdr orientation** — the comitatus hook provisions these files next to
the helper and prints the absolute path, the same fixed location that survives
a comitatus update. Pass it as `--roles-dir`:

```text
node HERD role tim --role implementer --run my-task --partition auth \
  --roles-dir /abs/path/from/your/orientation
```

Type the path the orientation gave you, literally. `role` resolves
`--roles-dir` against the **recipient's** cwd, so a relative path means the
recipient's worktree, which is exactly where the packaged roles are not. If
your orientation has no roles line, the copy did not land: read the files out
of this skill directory instead of guessing a plugin cache path, which moves on
every update.

Deliver role files by path so the recipient reads the exact file; never paste a
role into a prompt.

## Naming

Two things get names, and the split matters:

- **The handle is a bare call-sign** from the pool in the herdr skill's
  `reference/names.md` — `tim`, `jay`, `sly`. It is the addressable identity
  (`node HERD send tim ...`), it is globally unique across every workspace, and
  it carries **no** part and no model. That is what lets you relaunch a member
  on another model, or hand it a different role, without renaming the thing
  everyone addresses it by.
- **The tab label carries the part**: `<handle>-<role> <glyph>`, so the sidebar
  row reads `chore-my-slug · tim-impl ◇`. The glyph is the agent kind (claude
  `◆`, codex `◇`, opencode `⬨`). Set it at launch with the `role=` selector key.

```text
node HERD up --branch <task-branch> --base <base> \
  --claude sly:model=opus,effort=xhigh,role=arch
```

`role=` is label-only — it never reaches the agent's CLI args. `fanout` applies
it for you (`--role-tag`, default `impl`) and claims the next free call-signs
from the pool, so you do not name implementers by hand.

| Part | Tab tag | Role file |
| --- | --- | --- |
| architect | `arch` | `architect.md` |
| implementer | `impl` | `implementer.md` |
| reviewer | `rev` | `reviewer.md` |
| hypotheses | `hyp` | `hypotheses.md` |
| prober | `prb` | `probe.md` |
| mechanic | `mech` | `mechanic.md` |

Worktree and workspace labels are left at herdr's defaults — it already names a
worktree's workspace after the worktree directory. You assign the handle and
the tab label, nothing else.

## Who runs what

| Part | CLI | `--model` | Effort | Why |
| --- | --- | --- | --- | --- |
| Orchestrate, manifest, behavior tests | `claude` | `opus` | `xhigh`, `max` where correctness outweighs cost | Anthropic's recommended level for coding and agentic work, at the highest-leverage point |
| GREEN implementer | `codex` | `gpt-5.6-sol` | `medium`, `high` on high-risk partitions | OpenAI's recommended level for routine development; escalate for ambiguity or expensive mistakes |
| Hypotheses, review of the diff | `claude` | `sonnet` | `high` | Different lineage than the Codex that wrote the code → uncorrelated blind spots, cheaper than the architect |
| Hypothesis prober | `codex` | `gpt-5.6-sol` | `high` | OpenAI escalates for difficult debugging, which is the debug recipe's premise |
| Repo index, summaries, fixtures, lint | `claude` | `sonnet` | `low` | Turning a capable model down beats reaching for a smaller one, and keeps the run on one fewer model |

Claude effort levels are `low, medium, high, xhigh, max`; Codex has no effort
flag at all, only `-c model_reasoning_effort=`. The helper's selector collapses
both into one form, which is why it is the one to use.

**Name the model and effort on every launch.** A bare handle inherits whatever
the CLI's ambient config resolves — `~/.codex/config.toml`, or Claude's user,
project, and org-managed settings, the last of which can pin a model you cannot
change interactively. Neither is a choice you made.

Two vendors cannot give every part a reviewer of a different lineage than both
the architect and the implementer. This table spends its one cross-lineage
boundary on the code — a Claude reviewer against a Codex diff — and accepts
that architect and reviewer share a lineage. The reviewer is a fresh agent
reading only the manifest and the diff, never the architect's reasoning, so a
round is a new sample rather than the same model agreeing with itself.

## Topology

Three facts shape every path below. **An agent's cwd is fixed at launch**, so
reassigning means relaunching. **herdr ties one workspace to one worktree**, so
a part that needs its own branch needs its own worktree. **Handles are globally
unique**, so claim each against a live `herdr agent list` and free it with
`herdr workspace close` before reusing it.

| Part | Worktree | Workspace | Why |
| --- | --- | --- | --- |
| architect | `<task-branch>` | A | owns the task branch |
| reviewer | `<task-branch>` | A, new tab | reads only; needs the tree the architect built |
| implementer | `<partition-branch>` | one each | commits to its own branch |
| prober | one per hypothesis, off `<task-branch>` | one each | same reason |
| orchestrator | `<task-branch>` | A — the architect's own pane | needs the task branch for fan-in |
| mechanic | current worktree | current, new tabs | writes to distinct `notes/<dir>.md` paths |

The rule: **a part that commits to a distinct branch needs its own worktree; a
part that only reads, or writes non-conflicting paths, gets a tab.** At width 2
that is three worktrees, three workspaces, four agents.

Where two agents share a worktree they must not write it at the same time. The
architect and reviewer are safe because the reviewer is read-only and waits;
the architect and implementer on the bug-fix path are safe because they are
sequential. Two concurrent writers in one tree is not a configuration this
runbook has.

## Branch naming

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

**Notation for the rest of this document.** `<task-branch>` is whatever the
consuming project passed to `--task-branch`, and `<partition-branch>` is
`<task-branch><sep><p>`. They are written as placeholders on purpose: the
`task/<id>` shape is this kit's *default*, not a convention any repository is
obliged to adopt. A repository that names branches `chore/make-new-readme` or
`76632-create-new-thing` passes `--task-branch` once and reads every command
below with its own names substituted. Pass the same `--task-branch` and
`--partition-sep` to every verb in a run — they resolve independently, and two
of them disagreeing is a silent wrong branch rather than an error.

## Recipe: feature

1. Stand up the task worktree **first** — `task.md` has to live inside it, or
   the architect cannot read a file that exists only in your main checkout:

   ```text
   node HERD up --branch <task-branch> --base <base> \
     --claude sly:model=opus,effort=xhigh,role=arch
   ```

   Under the default naming that is `--branch task/<id>`; a project with its own
   convention substitutes its own name and passes it to every verb below as
   `--task-branch <task-branch>`. The run id and the branch need not match.

2. In that worktree write `.pipeline/runs/<id>/task.md` — type, one-paragraph
   goal, observable done-when, risk — commit it, then start the architect:

   ```text
   node HERD role sly --role architect --run <id>
   ```

   This is the launcher's last write to this tree.

   Output: `manifest.md` plus failing tests, committed, and then the architect
   **stops** — that role ends at the red gate.

3. Verify the red gate yourself, then hand the same agent its second role:

   ```text
   node HERD role sly --role orchestrator --run <id>
   ```

   Run the suite and confirm every new failure is an assertion naming the value
   it got, not an import or syntax error. That check is the launcher's, not the
   architect's — an architect that grades its own failing tests and proceeds is
   what the gate exists to catch. Only once it passes does `sly` become the
   orchestrator: same agent, same pane, same worktree, same task branch it
   already owns. Everything from here is driven by `sly`, not by you.

4. Fan out — one worktree, one implementer, and one dispatched role per
   partition, in one call:

   ```text
   node HERD fanout --run <id> --partitions auth,ui
   node HERD wait-all tim,jay
   ```

   Do **not** reach for `up --base <task-branch>` here. `up` always runs
   `git fetch origin <base>`, which fails `couldn't find remote ref` on a task
   branch that exists only locally. `fanout` uses `herdr worktree create`, which
   takes a local base and does not fetch.

   `wait-all` polls one `agent list` per round, but **status is not the
   completion signal**. An agent reads `idle` between its own turns. Confirm
   against git with `node HERD settled --run <id> --partitions auth,ui`.
   Declaring a run finished off a transient `idle` is the most common way to
   lose a partition's work.

5. Fan in from the task branch, in manifest order:

   ```text
   node HERD fan-in --run <id> --partitions auth,ui --wait-handle sly
   ```

   It settles the architect first — merging under a running agent rewrites the
   tree that agent is living in. At the first conflict it stops and names the
   partition and paths; send those to that partition's implementer and re-wait.
   Do not resolve conflicts yourself and do not merge from a partition worktree.

6. Apply the manifest's `shared_files` — they are the orchestrator's precisely
   because no partition may touch them — then run the full suite.

7. Review from a **fresh** agent on the task worktree, never the architect and
   never an implementer:

   ```text
   node HERD wait sly --status idle,done --timeout 300000
   git diff <base>...<task-branch> > .pipeline/runs/<id>/diff.patch
   node HERD agent claude gus:model=sonnet,effort=high,role=rev \
     --workspace <task-ws> --cwd <task-path>
   node HERD role gus --role reviewer --run <id>
   ```

   Settle the architect before writing the diff: a diff taken while it is still
   editing describes a tree that has already moved. Route each finding to the
   implementer whose partition owns the file. One escalation past the review,
   then stop — reaching the cap does not turn an unresolved finding into a pass.

8. Append the `.pipeline/log.md` row and commit it. Then tear down:

   ```text
   node HERD teardown --run <id> --partitions auth,ui        # plans only
   node HERD teardown --run <id> --partitions auth,ui --yes
   ```

## Recipe: bug fix

Steps 1–2, with the architect writing only the repro test. Then **one**
implementer in the task worktree itself, added as a tab — no partition
worktrees, no fan-in:

```text
node HERD agent codex tim:model=gpt-5.6-sol,effort=medium,role=impl \
  --workspace <task-ws> --cwd <task-path>
```

These two share a tree, so they run in sequence: wait for the architect to
finish and commit the repro test before starting the implementer. Then steps
6–7.

## Recipe: debug (cause unknown)

1. The architect writes the best repro test it can, even if partial.
2. Add a Sonnet agent to the task workspace with `role=hyp` and send it
   `hypotheses.md` → `.pipeline/runs/<id>/hypotheses.md`.
3. Top 2–3 hypotheses, one worktree and one prober each, off the task branch:

   ```text
   node HERD up --branch <task-branch><sep>h<n> --base <task-branch> \
     --codex jay:model=gpt-5.6-sol,effort=high,role=prb
   node HERD role jay --role probe --run <id> --hypothesis <n>
   ```

   First CONFIRMED wins. Each prober commits its own `probe-<n>.md` on its own
   hypothesis branch, so collect them onto the task branch before closing
   anything — a committed file on a branch you are about to delete is still
   lost:

   ```text
   git cherry-pick <task-branch><sep>h<n>   # per hypothesis, REFUTED ones included
   ```

   That record is the only account of what was ruled out. Then close the losing
   workspaces to free their handles and delete the hypothesis branches.
4. Continue as a bug fix from the winning worktree.

## Recipe: analysis

No new branches, so run it in the worktree you are already in. Add one mechanic
per relevant directory as tabs in the current workspace, each summarizing into
`.pipeline/runs/<id>/notes/<dir>.md`:

```text
node HERD agent claude tim:model=sonnet,effort=low,role=mech \
  --workspace <ws> --cwd <path>
```

Then send the architect the question; it answers reading only that `notes/`
directory plus files it names.

These mechanics share one tree, so scope each to its own directory and tell it
not to format or lint on this path — `mechanic.md` permits formatting, and a
formatter run by one mechanic rewrites files the others are mid-read.

## What git holds

Which step you are on is never stored anywhere; it is read off the repository.

| State | How git says it |
| --- | --- |
| task started | `<task-branch>` exists |
| partitioned, tests written | `runs/<id>/manifest.md` committed on it |
| partition `<p>` green | `<partition-branch>` has a commit and its tests pass |
| partition `<p>` blocked | `runs/<id>/BLOCKED-<p>.md` committed on it |
| fanned in | `<partition-branch>` merged into `<task-branch>` |
| hypothesis ruled out | `runs/<id>/probe-<n>.md` committed, REFUTED |
| task finished | `log.md` row committed, partition branches deleted |

The claim only holds if the artifacts are committed, so commit each as it is
produced. A `.pipeline/` file that exists only in a worktree is not state —
`worktree remove --force` and `workspace close` both discard it silently, and
both are steps in this runbook. `runs/<id>/diff.patch` is the exception: it is
regenerable from two refs, so gitignore it.

`runs/<id>/` merges to `main` with the task and stays there. A partition that
blocks twice on the same cause is only visible if the first `BLOCKED` is still
readable, and a hypothesis refuted in task 3 should not be re-probed in task 12.

The payoff is recovery: close every pane, reboot, come back tomorrow, and
`node HERD state --run <id>` still answers, because the answer was never in a
terminal. Phase is `absent | started | partitioned | fanned-out | fanned-in |
finished`.

The one question git cannot answer is whether anyone is still working. That is
liveness, and it lives in `herdr agent list` — never in a file.

## What crosses the bus

Messages carry role assignment, conflicts, and questions. They do not carry
state: a worker's verdict goes in a commit or a committed
`BLOCKED-<partition>.md`, because a message is not durable and a pane is not a
record. A worker that writes BLOCKED also sends one line saying so, since
nothing polls the filesystem for you.

On an unattended codex launch, `herdr agent read <handle>` before the first
send. Codex can open on a blocking update menu that herdr still reports as
ready, and the first prompt lands in the menu instead of the composer.

## Teardown detail

Teardown plans by default and requires `--yes` to remove anything. Uncommitted
or unmerged `BLOCKED-*.md` and `probe-*.md` evidence causes a partition to be
skipped rather than destroyed — `--force` discards both without warning.
Removal order is fixed: worktree first, then branch, because `remove` does not
delete the branch and a branch still checked out cannot be deleted.
