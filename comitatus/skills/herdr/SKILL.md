---
name: herdr
description: >-
  Use when running inside herdr (HERDR_ENV=1) to manage its worktrees,
  workspaces, panes, coding agents, messages, or state, or to launch, brief,
  message, or coordinate a herd of agents.
---

# herdr

Before using this skill, check that `HERDR_ENV=1`. If it is not, say you are not running inside a herdr-managed pane and stop. Do not inspect or control herdr from outside it.

herdr is a terminal multiplexer for coding agents. The `herdr` binary is on your PATH and talks to the running herdr over a local socket. This skill uses only native `herdr` and `git` commands. There is no helper script.

| Layer | Owns |
| --- | --- |
| herdr | Terminal input, agent identity, startup, readiness and state waits, prompt submission and its serialization |
| git | Branches, worktrees, fetches, merges |
| this skill | Decisions and sequencing: roster, naming, the message protocol, launch and teardown order, what counts as evidence |

For flags, run `herdr <family> --help` (for example `herdr agent prompt --help`). The help text is authoritative and this skill does not repeat it.

**Supported herdr: 0.9.5 or later.** The skill relies on these native behaviors:
- `agent prompt` rejects a blocked agent with `agent_blocked` before typing anything.
- `agent prompt` queues the text and Enter as one submission per terminal, so concurrent prompts do not interleave.
- `agent prompt --wait` reports `agent_prompt_stalled` when no activity follows.
- `agent start` waits for interactive readiness.
- `tab create --env` sets environment variables for the launched process.

Check the version with `herdr --version`.

The message protocol, briefing template, membership and withdrawal rules are in [reference/protocol.md](reference/protocol.md). Read it before messaging another agent.

## Quick reference

| Task | Command |
| --- | --- |
| Who is running, and where | `herdr agent list` (JSON: `name`, `workspace_id`, `agent_status`, `pane_id`, `cwd`) |
| One agent | `herdr agent get <handle>` |
| Why an agent reads as that state | `herdr agent explain <handle>` |
| Worktrees and the main-checkout workspace | `herdr worktree list --json` |
| Workspaces, tabs, panes | `herdr workspace list`, `herdr tab list --workspace <ws>`, `herdr pane list --workspace <ws>` |
| Send one message | `herdr agent prompt <handle> "<one line>"` |
| Wait for a state | `herdr agent wait <handle> --until idle --until done --timeout <ms>` |
| See what an agent shows | `herdr agent read <handle> --source recent-unwrapped --lines 40` |
| Wait for output | `herdr pane wait-output <pane> --match "<text>" --timeout <ms>` |
| Rename an agent | `herdr agent rename <handle> <new>` |
| Close one agent, or a whole workspace | `herdr tab close <tab>`, `herdr workspace close <ws>` |

Take every id from a command's JSON response or a fresh list. Ids such as `w8`, `w8:t1` and `w8:p1` are not durable, so never reuse an old one.

## Concepts

herdr nests **repo -> worktree -> workspace -> tab -> pane -> agent**.

- **One workspace per worktree.** herdr opens one workspace for each worktree and groups the sidebar by repo. Give each agent its own tab in that workspace. A `workspace create --cwd` workspace has no repo association and floats ungrouped.
- **A herd is a roster, not a herdr object.** It is the set of handles that know each other and the protocol. There is no `herd` command. A herd usually lives in one workspace, and the briefing names that workspace.
- **A handle is the agent's addressable identity**, set at launch with `agent start <handle>`. herdr enforces global uniqueness and rejects a duplicate with `agent_name_taken`.
- **`agent_status`** is one of `idle`, `working`, `blocked`, `done` or `unknown`, detected by herdr.
  - A ready agent is usually `idle`; Codex can settle in `done`.
  - `done` means finished, with output not yet viewed in the UI. A CLI `agent read` does not clear it.
  - `blocked` means herdr detected a modal or permission prompt.
- **cwd is fixed at launch** and stored resolved; on macOS, `/tmp` becomes `/private/tmp`. Compare resolved paths when filtering by cwd.
- **One repo per herdr session.** `worktree create` targets the session's home repo and must run with the main-checkout workspace as its source.

## Naming

You assign only two names:
- **The member handle:** the next unused call-sign from [reference/names.md](reference/names.md).
- **The agent's tab label:** `<handle> <glyph>`. The glyph is ◆ for claude, ◇ for codex and ⬨ for opencode, and shows the agent kind, not the model. To show a role, use `<handle>-<role> <glyph>`, for example `jay-verify ◇`. The handle stays `jay`; the role is label text only.

Leave workspace labels at herdr's defaults: the worktree directory name, or the repo name for the main checkout. Handles are type-agnostic and phonetically distinct, so they survive a relaunch on another model. A later `agent rename` does not update the tab label, so run `herdr tab rename` to keep them in step.

## Launch one agent

Each step's input comes from the previous step's output. Run them as separate commands.

1. **Check the handle is free.** Run `herdr agent list` and confirm no agent has that `name`.
2. **Create its tab** in the target workspace:
   ```text
   herdr tab create --workspace <ws> --cwd <path> --label "jay ◇" --no-focus
   ```
   Take `result.tab.tab_id` and `result.root_pane.pane_id` from the response. Add `--env KEY=VALUE` per variable when the agent needs one, for example `--env BEADS_ACTOR=jay` or `--env CODEX_HOME=<path>`.
3. **Start the agent** in that root pane. Arguments after `--` go to the agent CLI unchanged:
   ```text
   herdr agent start jay --kind codex --pane <root-pane> --timeout 45000 -- --no-daemon --model gpt-6.1-sol
   ```
   Success means herdr detected the expected agent in that terminal and found it ready for input. herdr already retries the shell-initialization race on Unix.
4. **Wait for a settled state** when your next step depends on it:
   ```text
   herdr agent wait jay --until idle --until done --timeout 45000
   ```
   `agent start` can accept an interactive Codex whose state is still `unknown`. This wait is the stricter check.
5. **Read before the first message on an unattended Codex launch:** `herdr agent read jay --source visible`. A Codex menu can read as `idle` while it owns the keyboard. Two have been seen:
   - **"Update available":** `herdr agent send-keys jay 2` skips the update.
   - **"Hooks need review":** trusting hooks is the human's decision. Ask them, or press `Escape` to continue without trusting.

   Do not send keys to a menu you do not recognize; ask the human.
6. **Brief the agent** with the template in [reference/protocol.md](reference/protocol.md#briefing-a-cold-agent). The agent is not part of the herd until its reply arrives.

### Launch arguments

Nothing is enforced; append what you choose after `--`.

**1.x defaults.** The old `up.js` passed these automatically. Pass them yourself to keep that behavior:

| Kind | Arguments |
| --- | --- |
| claude | `--model claude-opus-5-5` |
| codex | `--no-daemon --model gpt-6.1-sol` |
| opencode | none: `-m <provider/model>` was always required |

**Opt-in examples.** 1.x never passed these by default. Effort and permissions were inherited from each CLI's own config unless asked for:

| Kind | Examples | Notes |
| --- | --- | --- |
| claude | `--effort high`, `--permission-mode <mode>`, `--add-dir <second-checkout>` | Effort levels: `low`, `medium`, `high`, `xhigh`, `max`. Org-managed settings can pin a model, which makes `--model` the only lever. |
| codex | `-c model_reasoning_effort=high`, `-c sandbox_mode="<mode>"`, `-c approval_policy="<policy>"`, `--add-dir <second-checkout>` | Codex has no effort flag; use `-c`. `--no-daemon` does not stop `codex queue` from reaching the session. |
| opencode | | Run `herdr integration install opencode` once, or its status waits are unreliable. |

A permission mode, sandbox or approval setting changes what the agent may do unasked. Choose one per task; it is not a compatibility default.

The CLI validates its own arguments. Nothing checks for a setting you passed twice, so the agent CLI decides which one wins. `tab create --env` accepts later duplicates, which replace earlier ones.

**Do not put secrets in `--env` or in launch arguments.** They appear in your command line, in your transcript, and in any error herdr prints. Give the agent secrets through its own config or a local `.env` file it reads.

## A new worktree with a herd

1. **Check every handle first.** Run `herdr agent list` and confirm none of the planned handles is taken, before anything is created.
2. **Refresh the base when it is remote-tracking.** `git remote` lists remotes. A base such as `origin/main` whose first segment is a remote needs `git fetch origin main`. A slash alone does not make a base remote: `task/my-slug` is a local branch, so it needs no fetch.
3. **Find the main-checkout workspace:** `herdr worktree list --cwd <your cwd> --json`, then read `result.source.source_workspace_id`. This works from the main checkout or from inside a linked worktree.
4. **Create the worktree:**
   ```text
   herdr worktree create --workspace <source-ws> --branch chore/my-slug --base origin/main --no-focus --json
   ```
   Take `result.worktree.path`, `result.worktree.open_workspace_id` and `result.tab.tab_id`, the root shell tab.
5. **Launch each agent** with the steps above, using the new workspace and path.
6. **Close the root shell tab** once every agent tab exists: `herdr tab close <root-tab>`.

**This is not transactional.** If a step fails:
1. Inspect `herdr worktree list --json` and `herdr agent list`.
2. Reuse what is healthy, and close or remove what is not.
3. Then continue from the failed step.

Never relaunch blind. A half-finished launch can hold a handle, a tab or a worktree.

For an existing branch, the commands differ:
- **The worktree exists:** `herdr worktree open --branch <b> --no-focus --json`.
- **The branch has no worktree:** `git worktree add <path> <b>`, then `herdr worktree open --path <path> --no-focus --json`.

## Paired worktrees: one workbench, one application

A project can keep its agents in a workbench worktree and give them access to a separate application worktree. The workbench holds the plans, sessions and task notes; the application holds the source. The project's own guidance owns this topology. The generic pattern is:

1. Create or open the workbench worktree with herdr. Its workspace is the herd's only workspace.
2. Create the application worktree with plain git: `git -C <app-repo> worktree add <app-path> -b <branch> <base>`. It needs no herdr workspace.
3. Launch every agent in the workbench workspace with `--cwd <workbench-path>`, and grant the application path:
   - claude: `-- --add-dir <app-path>`
   - codex: `-- --add-dir <app-path>`
4. Name both paths in the briefing, along with which agent writes in the application tree.

Do not open a second herdr workspace for the application worktree. The agents stay in one roster in one workspace, and nothing requires one worktree per task.

## Rules for multi-agent work

- **One writer per tree.** An agent writes only where its task says. Anything another tree needs goes to that tree's owner as a message.
- **A timeout or stall is not proof of non-delivery, and an accepted prompt is not proof of processing.** The interpretation table is in [reference/protocol.md](reference/protocol.md#reading-a-send-result). Never resend blind.
- **Idle, a finished wait, an echo in the pane, or a commit is not completion.** Completion is the agent's reply plus the stated criteria checked: tests run, evidence read.
- **Durable content goes in files.** A message is typed into a terminal and is not stored by herdr. Put briefs, findings and decisions in a file in the shared worktree, and send a one-line message naming the path.
- **Integrate in a stated order, in the target tree, by its owner.**
  - Start from a clean tree and index.
  - Merge one branch at a time.
  - On a conflict, the target tree's owner resolves it or runs `git merge --abort`.
- **Cleanup adjudicates; it does not sweep.**
  1. Before removing a worktree or branch, read `git -C <tree> status --short` and `git log <target>..<branch>`.
  2. Integrate, preserve or discard each piece, and say in one line what you discard and why.
  3. Use `--force` and `git branch -D` only for that named discard.

## Teardown

```text
herdr tab close <tab>
herdr workspace close <ws>
herdr worktree remove --workspace <ws> --json
git branch -d <branch>
```

- `herdr tab close <tab>` closes one agent.
- `herdr workspace close <ws>` closes every agent in a workspace.
- `herdr worktree remove` removes the worktree, its directory, its workspace and all its tabs. It keeps the branch; `git branch -d` deletes it.
- Leave `--force` off. `git worktree remove` refuses a dirty tree without it, and `git branch -d` refuses an unmerged branch.

To reassign a herd to another worktree, relaunch it there, since cwd is fixed at launch. Close the old workspace first so the handles are free, then brief again. Relaunched agents are cold.

## Permissions

Removing the helper does not remove approvals. Every native command needs its own grant. Each harness grants commands differently:

- **Claude Code:** run `/herd-setup`. It adds one allow rule per safe native verb.
  - It deliberately leaves `herdr agent start`, `herdr pane run` and `herdr pane send-keys` prompting. Launch arguments after `--` can carry permission-bypass flags, so each launch is a human approval.
- **Codex:** commands run in a sandbox that blocks the herdr socket. A denied command fails with `PermissionDenied` / `Operation not permitted` and does not always prompt. That error most likely means no rule covers the command: tell the human which command failed. Do not retry it, and do not route it through another script.
  - The human can add prefix rules to `$CODEX_HOME/rules/default.rules`. A member needs only the messaging and observation verbs:
    ```text
    prefix_rule(pattern=["herdr", "agent", "prompt"], decision="allow")
    prefix_rule(pattern=["herdr", "agent", "list"], decision="allow")
    prefix_rule(pattern=["herdr", "agent", "get"], decision="allow")
    prefix_rule(pattern=["herdr", "agent", "read"], decision="allow")
    prefix_rule(pattern=["herdr", "agent", "wait"], decision="allow")
    ```
    A launcher may also need `["herdr", "tab"]`, `["herdr", "worktree"]` and `["herdr", "workspace"]`.
  - Never save a rule that includes a message body. It matches that one message only.
- **Other harnesses:** pre-authorize the same verbs in their own configuration.

Weak local models also need an explicit instruction to run the commands as real shell commands and not print them.

## Gotchas

- **`worktree create` does not fetch.** `--base origin/main` resolves your local ref.
- **`agent prompt` types and submits** with the agent's own submit keys. It does not track turns. With `--wait`, an already-running turn can satisfy the wait.
- **`agent wait` takes one `--until` per state.** Without `--until` it matches `idle`, `done` or `blocked`, and without `--timeout` it waits forever.
- **`agent start` needs a pane at a shell prompt.** It takes the pane over and does not create one.
- **`blocked` only covers modals herdr detects.** An undetected menu reads as ready and swallows typed text. Read the pane when a send stalls.
- **`--source recent` can come back empty** while a pane is redrawing. Retry with `--source visible`, or use `pane wait-output`.
- **`worktree create` and `open` from a linked worktree** fail with `linked_worktree_source` unless you pass `--workspace <main-checkout-ws>`.
- **Shell quoting is yours.** The message is one shell argument on one physical line. Use single quotes in POSIX shells and PowerShell. Use double quotes, with that shell's escapes, in `cmd.exe`.
