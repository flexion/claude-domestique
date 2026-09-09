# Fan-out trial kit (no orchestrator)
 
comitatus is the message bus. Git is the state machine. Tests are the contract. You are the orchestrator until `.pipeline/log.md` tells you which step to automate.
 
## Setup (once, ~20 min)
 
1. Confirm one command runs the suite and exits non-zero on failure (`make test`, `npm test`, `pytest`). That is the only plumbing required.
2. Install two CLIs: Claude Code and Codex CLI. Both are managed integrations, so `herdr` starts either by handle.
3. Run `/herd-setup` once per host to pre-authorize the `herdr` verbs and the helper path. An agent that stops for tool approval mid-run stalls the fan-out.
4. Point `.pipeline/roles/` at the six role files, which ship with the skill at `skills/agent-work-item/roles/` under this plugin's root — [`../skills/agent-work-item/roles/`](../skills/agent-work-item/roles/) relative to this document. Symlink them if the trial repository can, copy them if it cannot. Commit.
5. Add `.pipeline/runs/*/diff.patch` to `.gitignore`. It is the one artifact regenerable from two refs, so it is the one that should not land.
6. Start at fan-out width 2. Go wider only after five clean tasks.

Everything a run produces is namespaced under its task id and kept:

```
.pipeline/
  roles/            committed once, shared, from the plugin
  log.md            cumulative, one row per task — the point of the trial
  runs/<id>/        task.md, manifest.md, BLOCKED-*.md, probe-*.md, hypotheses.md, notes/
```

`<id>` is the task id, the same one in `task/<id>`. Without that directory every path collides: `probe-1.md` on every debug task, `BLOCKED-auth.md` on any two tasks sharing a partition name, `manifest.md` on all of them. Ten tasks of retained BLOCKED and probe files are the evidence base for the decision table at the end, and a path that overwrites itself is not evidence.

`HERD` below is the absolute helper path from your herdr orientation — type it literally; a path built from a variable fails the permission matcher. Role files are delivered by path, not pasted: `node HERD send <handle> "read .pipeline/roles/<role>.md and follow it" --reply`. `$RUN`, `$PARTITION` and `$HYPOTHESIS` are substituted into the message, not into the file. `$RUN` is the task id and every role needs it, since every path a role touches lives under `.pipeline/runs/$RUN/`.

Model roles

| Role | CLI | `--model` | Effort | Why |
| --- | --- | --- | --- | --- |
| Orchestrate, manifest, behavior tests | `claude` | `opus` (`claude-opus-5`) | `high`, `xhigh` on high-risk partitions | Best judgment per token; used only at the highest-leverage point |
| GREEN implementer | `codex` | `gpt-5.6-sol` | `medium`, `high` on high-risk partitions | Built for the sandboxed "make tests pass" loop with tools |
| Hypotheses, second-opinion review of the diff | `claude` | `sonnet` (`claude-sonnet-5`) | `high` | Different lineage than the Codex that wrote the code → uncorrelated blind spots, at a cheaper tier than the architect |
| Repo index, summaries, fixtures, lint/format | `claude` | `claude-haiku-4-5-20251001` | `low` | Lowest marginal cost for high-volume mechanical work |

Verified against Claude Code 2.1.263 and codex-cli 0.153.4. `claude --model` takes an alias (`opus`, `sonnet`) or a full name; Haiku has no alias, so it needs the dated name. Claude effort levels are `low, medium, high, xhigh, max`.

The two CLIs do not take effort the same way, which is why one flag pair cannot cover both:

```bash
claude --model opus --effort high
codex --model gpt-5.6-sol -c model_reasoning_effort=medium
```

Codex has no `--effort` flag — only the generic `-c <key>=<value>` override on `model_reasoning_effort`. Through the comitatus helper both collapse into one selector, which is the form to prefer because it also names the handle:

```bash
node HERD up --branch task/<id> --base origin/main \
  --claude arch:model=opus,effort=high \
  --codex impl:model=gpt-5.6-sol,effort=medium
```

A bare handle inherits whatever the CLI's ambient config resolves — `~/.codex/config.toml` is at `gpt-5.6-sol` / `medium` today, and Claude reads user, project, and org-managed settings, the last of which can pin a model you cannot change interactively. Neither is a choice you made, so name both explicitly on every launch and record them in `log.md`.

Two vendors cannot give every stage a reviewer of a different lineage than both the architect and the implementer. This table spends the one cross-lineage boundary it has on the code — a Claude reviewer against a Codex diff — and accepts that the architect and reviewer share a lineage. The reviewer is a fresh agent reading only the manifest and the diff, never the architect's reasoning, so a round is a new sample rather than the same model agreeing with itself.
 
## Runbook

Three facts shape every path below. **An agent's cwd is fixed at launch**, so an agent cannot move to another worktree — reassigning means relaunching. **herdr ties one workspace to one worktree**, so a partition that needs its own branch needs its own worktree. **Handles are globally unique** across every workspace, so claim each one against a live `herdr agent list` and free it with `herdr workspace close` before reusing it.

### Topology

Every role gets its own pane — an agent takes over its tab's root pane, so one tab is one agent. Worktrees are shared only where the role does not need its own branch, which git forces: the same branch cannot be checked out twice.

| Role | Worktree | Workspace | Why |
| --- | --- | --- | --- |
| `arch` | `task/<id>` | A | owns the task branch |
| `rev` | `task/<id>` | A, new tab | reads only; needs the tree `arch` built |
| `impl<p>` | `task/<id>-<p>` | one each | commits to its own branch, so it must be separate |
| `prb<n>` | `task/<id>-h<n>` | one each | same reason |
| mechanic | current worktree | current, new tabs | writes to distinct `notes/<dir>.md` paths |

The rule: **a role that commits to a distinct branch needs its own worktree; a role that only reads, or writes non-conflicting paths, gets a tab.** At width 2 that is three worktrees, three workspaces, four agents.

Where two agents do share a worktree, they must not write it at the same time. `arch` and `rev` are safe because `rev` is read-only and waits; `arch` and `impl` on the bug-fix path are safe because they are sequential. Two concurrent writers in one tree is not a configuration this runbook has.

### Feature
1. Stand up the task worktree first — `task.md` has to live inside it, or the architect cannot read a file that exists only in your main checkout:
   ```bash
   node HERD up --branch task/<id> --base origin/main --claude arch:model=opus,effort=high
   ```
2. In that worktree, write `.pipeline/runs/<id>/task.md` — type, one-paragraph goal, done-when (observable), risk (low/high) — commit it, then start the architect:
   ```bash
   node HERD send arch "read .pipeline/roles/architect.md and follow it. \$RUN is <id>" --reply
   ```
   Output: `.pipeline/runs/<id>/manifest.md` + failing tests. Run the suite yourself; confirm failures are assertions, not imports. Commit.
3. Per partition, one worktree branched off the task branch, with its own implementer:
   ```bash
   node HERD up --branch task/<id>-<p> --base task/<id> --codex impl<p>:model=gpt-5.6-sol,effort=medium
   node HERD send impl<p> "read .pipeline/roles/implementer.md and follow it. \$RUN is <id>, \$PARTITION is <p>" --reply
   ```
   Panes, not terminals — each partition is its own workspace in the sidebar under this repo. Each implementer commits when its partition tests are green. Wait on them together rather than watching: `node HERD wait impl<p> --status idle,done --timeout 900000`.
4. Fan-in: settle `arch` first with `node HERD wait arch --status idle,done` — the merge writes the tree `arch` is living in, and merging under a running agent is the same hazard as diffing under one. Then on the task branch, `git merge task/<id>-<p>` in manifest order. Run the full suite. Conflict → `node HERD send impl<p> "<conflict>; re-run your partition tests" --reply` in the smaller partition's worktree only. Do not merge from a partition worktree; `arch` owns the task branch.
5. Review from a fresh agent on the task worktree, never from `arch` and never from an implementer. `rev` shares that tree, so settle `arch` before writing the diff — a diff taken while `arch` is still editing describes a tree that has already moved:
   ```bash
   node HERD wait arch --status idle,done --timeout 300000
   git diff main...task/<id> > .pipeline/runs/<id>/diff.patch
   node HERD agent claude rev:model=sonnet,effort=high --workspace <task-ws> --cwd <task-path>
   node HERD send rev "read .pipeline/roles/reviewer.md and follow it. \$RUN is <id>" --reply
   ```
   Only if it flags something, add one Opus agent at `effort=xhigh` on the flagged files. One escalation, then stop: reaching the cap does not turn an unresolved finding into a pass, so an open finding at that point is yours to decide.
6. Commit `log.md` with its new row. Tear down: `herdr worktree remove --workspace <ws> --force --json` per partition, then `git branch -D task/<id>-<p>` — remove does not delete the branch. Check for uncommitted `BLOCKED-*` files first; `--force` discards them without warning.
### Bug fix
Steps 1–2, with the architect writing only the repro test. Then one `impl` codex agent in the task worktree itself — add it as a tab with `node HERD agent`, no partition worktrees. These two share a tree, so they run in sequence: wait for `arch` to finish and commit the repro test before starting `impl`. Then steps 5–6.
 
### Debug (cause unknown)
1. `arch` writes the best repro test it can, even if partial.
2. Add a Sonnet agent to the task workspace and send it `roles/hypotheses.md` with `$RUN` → `.pipeline/runs/<id>/hypotheses.md`.
3. Top 2–3 hypotheses, one worktree and one codex prober each, off the task branch:
   ```bash
   node HERD up --branch task/<id>-h<n> --base task/<id> --codex prb<n>:model=gpt-5.6-sol,effort=medium
   node HERD send prb<n> "read .pipeline/roles/probe.md and follow it. \$RUN is <id>, \$HYPOTHESIS is <n>" --reply
   ```
   First CONFIRMED wins. Each prober commits its own `probe-<n>.md` on its own hypothesis branch, so collect them onto the task branch before closing anything — a committed file on a branch you are about to delete is still lost:
   ```bash
   git cherry-pick task/<id>-h<n>   # per hypothesis, REFUTED ones included
   ```
   That record is the only account of what was ruled out. Then close the losing workspaces to free their handles, and `git branch -D task/<id>-h<n>`.
4. Continue as bug fix from the winning worktree.
### Analysis
No new branches, so run it in the worktree you are already in. Add one Haiku agent per relevant directory as tabs in the current workspace, each summarizing into `.pipeline/runs/<id>/notes/<dir>.md`. Then send `arch` the question; it answers reading only that `notes/` directory plus files it names.

These mechanics share one tree, so scope each to its own directory and tell it not to format or lint on this path. `roles/mechanic.md` permits formatting, and a formatter run by one mechanic rewrites files the others are mid-read.

### What git holds

Git is the state machine in the literal sense: which step you are on is never stored anywhere, it is read off the repository. That is why the "do not build yet" list names a run journal — git already is one.

| State | How git says it |
| --- | --- |
| task started | `task/<id>` exists |
| partitioned, tests written | `runs/<id>/manifest.md` committed on it |
| partition `<p>` green | `task/<id>-<p>` has a commit and its tests pass |
| partition `<p>` blocked | `runs/<id>/BLOCKED-<p>.md` committed on it |
| fanned in | `task/<id>-<p>` merged into `task/<id>` |
| hypothesis ruled out | `runs/<id>/probe-<n>.md` committed, REFUTED |
| task finished | `log.md` row committed, partition branches deleted |

The claim only holds if the artifacts are committed, so commit each one as it is produced: the manifest, every BLOCKED, every probe result, and the `log.md` row. A `.pipeline/` file that exists only in a worktree is not state — `herdr worktree remove --force` and `workspace close` both discard it silently, and both are steps in this runbook. `runs/<id>/diff.patch` is the exception: it is regenerable from two refs, so it is gitignored.

`runs/<id>/` merges to `main` with the task and stays there. That is deliberate: a partition that blocks twice on the same cause is only visible if the first `BLOCKED` is still readable, and a hypothesis refuted in task 3 should not be re-probed in task 12. Nothing prunes it — the directory is small text and the retention is the point.

The payoff is recovery. Close every pane, reboot, come back the next day: `git branch --list 'task/<id>*'` and `git log` say exactly where you stopped and what is left to merge. Nothing was lost with the terminal because nothing was ever in the terminal.

One question git cannot answer is whether anyone is still working — that is liveness, and it lives in herdr. `herdr agent list` for that, never a file.

### What actually crosses the bus
Messages carry role assignment, conflicts, and questions. They do not carry state — a worker's verdict goes in a commit or a committed `BLOCKED-$PARTITION.md`, because a message is not durable and a pane is not a record. A worker that writes BLOCKED also sends one line saying so, since nothing polls the filesystem for you.

On an unattended codex launch, `herdr agent read <handle>` before the first send. Codex can open on a blocking update menu that herdr still reports as ready, and the first prompt lands in the menu instead of the composer.
 
## Role files

The six role prompts live with the skill that owns them, at
`skills/agent-work-item/roles/` under this plugin's root. Each names the CLI and
effort it expects to run under. Deliver one by path rather than pasting its text:

```bash
node HERD send <handle> "read <plugin>/skills/agent-work-item/roles/<role>.md and follow it" --reply
```

| Role | File | Runs as |
| --- | --- | --- |
| architect | `roles/architect.md` | `claude --model opus --effort high` |
| implementer | `roles/implementer.md` | `codex --model gpt-5.6-sol -c model_reasoning_effort=medium` |
| reviewer | `roles/reviewer.md` | `claude --model sonnet --effort high` |
| hypotheses | `roles/hypotheses.md` | `claude --model sonnet --effort high` |
| probe | `roles/probe.md` | `codex --model gpt-5.6-sol -c model_reasoning_effort=medium` |
| mechanic | `roles/mechanic.md` | `claude --model claude-haiku-4-5-20251001 --effort low` |

`.pipeline/roles/` in the trial repository can be symlinks or copies of these. Copy
them only if the trial needs to diverge, and note the divergence in `log.md` —
otherwise a row measures a prompt nobody else has.

## log.md
 
```
| id | type | width | wall min | human min | conflicts | red-gate fails | scope violations | blocked | reviewer hits | escalations | $ opus | $ sonnet | $ haiku | $ codex | notes |
```
 
Fill it honestly for ten tasks before touching automation.
 
## What the log decides
 
| Signal after ~10 tasks | Build |
|---|---|
| conflicts ≥ 2 | Either drop to width 1–2 for that repo, or write the partitioner. Not before. |
| red-gate fails > 0 | A script that runs the new tests and rejects non-assertion failures. ~20 lines. |
| scope violations > 0 | Pre-commit hook rejecting files outside `$PARTITION`. ~10 lines. |
| human min > model min | A shell function for the step you repeat most, almost always worktree create/merge/remove. |
| reviewer hits the Sonnet reviewer found in a Codex diff | Keep cross-lineage review. Zero in 10 tasks → drop it and let the architect review. |
| escalations resolved nothing | Drop the Opus escalation from step 5; Sonnet's finding was the whole answer. |
| one model dominates spend | Swap that stage down a tier, or its effort down one level, and check the log again. |
| blocked > 0 | Read the BLOCKED files. Usually the manifest was wrong, not the worker. Fix the architect prompt. |
 
## Do not build yet
 
Adapters, run journal, sandbox, budget meter, partitioner, escalation policy. Worktrees on your machine with you watching is the sandbox. Vendor dashboards are the budget meter. Your hand-written partitions are the training data for the partitioner if you ever need one.
 
