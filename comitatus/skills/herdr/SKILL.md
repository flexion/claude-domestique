---
name: herdr
description: "Control herdr from inside it: manage git worktrees, workspaces, tabs and panes; start coding agents (claude/codex/opencode) with short handles; message agents by handle; and wait for state - all via CLI over a local unix socket. Use when running inside herdr (HERDR_ENV=1)."
---

# herdr - agent skill

before using this skill, check that `HERDR_ENV=1`. if it is not set to `1`, say you are not running inside a herdr-managed pane and stop. do not inspect or control the focused herdr pane from outside herdr.

you are running inside herdr, a terminal-native agent multiplexer. herdr gives you git worktrees, workspaces, tabs, and panes, and lets you start and drive coding agents in them - all from the cli. the `herdr` binary is in your PATH; its subcommands talk to the running herdr instance over a local socket.

if you need the raw protocol, read the [socket api docs](https://herdr.dev/docs/socket-api/). for the full flag-by-flag command surface, see [reference/cli.md](reference/cli.md).

## two rules that avoid most friction

1. **prefer native `herdr` verbs, addressed by handle.** `herdr agent send|read|get|wait <handle>` all resolve handles directly - no pane-id lookups, no JSON parsing. the helper exists only for what the natives don't cover.
2. **call the herd.js helper by its absolute path from your orientation** (the `node /abs/.../herd.js ...` line). the path is stable across comitatus updates and `/herd-setup` allowlists it once; a path built any other way (variables, relative) fails the permission matcher and prompts. every helper verb is self-contained - it runs `herdr` itself; nothing is piped and stdin is never read. codex agents use the stable `$HOME/.codex/skills/herdr/scripts/herd.js`.

helper verbs: `status | members | wait | send | send-wait-read | agent | up`.

## quickstart - the 80% path

create a worktree and put agents on it, one command (`HERD` below stands for the absolute helper path from your orientation - type it literally):

```bash
node HERD up --branch chore/my-slug --base origin/main \
  --claude sly --codex jay --opencode bob:ollama/qwen2.5:7b
```

`up` does it all in one process - `git fetch`, `worktree create`, and one labeled tab per agent (launch, name, readiness-wait) - and prints a JSON summary:

```json
{ "worktree": { "path": "…", "workspace_id": "wR" },
  "agents": [ { "handle": "sly", "model": "claude", "pane_id": "wR:p3", "tab": "wR:t2" } ] }
```

| flag | runs | glyph |
|---|---|---|
| `--claude <handle>` | `claude` | ◆ |
| `--codex <handle>` | `codex` | ◇ |
| `--opencode <handle>:<model>` | `opencode -m <model>` | ⬨ |

flag order is tab order. defaults: `--base origin/main`, `--timeout 45000` (ms, per-agent readiness wait). handles must be unique - `up` pre-checks `agent list` and refuses before creating the worktree if one is taken. one command also means one permission approval instead of one per step.

## concepts

herdr nests like this: **repo -> worktree -> workspace -> tab -> pane -> agent** - but only for repo-associated workspaces; a plain `workspace create` sits *outside* this tree (see `## naming` and gotchas).

- **worktree** - a git worktree (a branch checked out in its own directory). herdr can create, open, list, and remove them. herdr ties **one** workspace to a worktree (its anchor, `open_workspace_id`). the sidebar groups workspaces **by repo**: the repo's main checkout (`is_linked_worktree=false`) is the parent and its linked worktrees nest under it - this is the **only** hierarchy herdr renders, and it is keyed on `repo_root`, not on which workspace created it (verified).
- **workspace** - a project context, one or more tabs. usually labeled after the repo or the worktree.
- **tab** - a subcontext inside a workspace, one or more panes.
- **pane** - a real terminal split. runs a shell, an agent, a server, anything.
- **agent** - a coding agent (claude, codex, opencode, ...) running in a pane. each agent carries a **handle** in its `name` field (e.g. `fox`, `ivy`). you address agents by handle.
- **herd** - a *group of agents you treat as a team*: 1..n members, models mixed freely. a herd is a **logical roster, not a herdr object** - there is no `herd` command and no herd field on anything; it is **orthogonal** to the worktree->...->agent nesting above. a herd can run on a worktree, on the main checkout (a plain branch), or at any cwd; and a worktree can exist with **no** herd at all. members know the roster and message each other - and members of *other* herds - by handle (see the from/to protocol). "assigning a herd to work" just means launching its agents with their `cwd` at that work.
- **home repo / main checkout** - every herdr session is anchored to one repo, and you spin up and tend herds from its **main-checkout workspace** (the one you, reading this, are launched under). **exactly one repo per session** - a second repo means a second herdr session (`worktree create` always targets the home repo, and must be run from its main-checkout workspace). herdr labels the main checkout with the repo name and each worktree with its directory name - you leave both. only member handles are assigned - see `## naming`.

three facts that drive most workflows:

- **one workspace per worktree.** herdr groups a worktree's agents under its single workspace. run several agents on a worktree by giving each its own **tab** in that one workspace - separate `workspace create --cwd` workspaces get **no** repo association and float ungrouped, even at a repo root.
- **a worktree and its agents are linked by `cwd`, not by a stored mapping.** to find every agent in a worktree, list agents and filter on `cwd`. there is no tracking file.
- **`agent_status`** is detected automatically: `idle`, `working`, `blocked`, `done`, `unknown`. a fresh/ready agent is `idle`; one that **finished a task whose output you have not viewed** is `done` (a CLI `pane read` does *not* clear it - only focusing the pane in the UI does). `wait agent-status` matches **one exact state** (verified), so choose per situation: **launch/detect -> `idle`; a sibling finishing a task headlessly -> `done`; "free to receive a message" -> not `working` (i.e. `idle` *or* `done`).**

## ids

ids are short: workspace `w8`, tab `w8:t1`, pane `w8:p1`. they are opaque and **not durable** - they can change as things open and close. never reuse an old id; re-read the current one from `worktree list`, `workspace list`, `agent list`, or a create/start response. most commands print json, so parse ids out of the json rather than guessing.

## naming (worktree -> members)

a thin convention on top of herdr - herdr stores **none** of it. you assign exactly two things; every workspace/worktree label is left at herdr's default:

- **herd** - a group of agents on a worktree. **you don't label it.** when you `worktree create`, herdr already labels the worktree's workspace with the **worktree directory name** (`chore-my-slug`) - exactly what you want in the sidebar row. (the repo's main checkout is left at its default too: the repo name.)
- **member** - an agent in a herd. its **handle** is a short call-sign - `tim`, `jay`, `sly`, ... - claimed as the next unused entry from the pool in [reference/names.md](reference/names.md). the handle is the **addressable identity** (`agent send tim`), so it must stay short, unique, phonetically distinct, and stable across a model relaunch.

the agent's decorated **tab** label is `<handle> <glyph>` (`fox ◆`, `jay ◇`) - the glyph (claude `◆`, codex `◇`, opencode `⬨`) encodes the model. `up` and the helper's `agent` verb set it at launch; renaming later is `tab rename`. the handle and that tab label are the **only** labels you assign. the sidebar row is `<workspace> · <tab>` = `<worktree-name> · <handle> <glyph>`, which reads true with zero renaming.

rules that make it work:

- **member handles are globally unique - herdr enforces it** (`agent_name_taken`, across *all* workspaces). claim each handle against live `agent list`; size the member pool above your peak concurrent agent count.
- **handles are type-agnostic.** never encode the model in a handle; the tab glyph already shows it, and a type-free handle survives relaunching a member on another model.
- **phonetic distinctness for members.** they message each other by handle and weak local models mis-type look-alikes - avoid rhyming clusters.
- **only home-repo worktrees nest under the main checkout** in the sidebar; plain workspaces and other repos float separately.

## discover state

```bash
herdr pane list            # panes in your workspace; the focused one is yours
herdr agent list           # every detected agent: name, agent type, cwd, workspace_id, pane_id, status
herdr agent get jay        # one agent's full record, by handle
herdr worktree list --json # worktrees: branch, path, open_workspace_id
herdr workspace list       # workspaces and labels
```

## building blocks

these are the small, composable operations. chain them for bigger flows. `HERD` = the absolute helper path from your orientation.

### 1. new worktree on a new branch off fresh origin/main

> for the common case - create a worktree and launch a herd - use `node HERD up …` (see the quickstart). the steps below are the primitives it is built from.

`worktree create` uses your **local** `origin/main` and does **not** fetch. fetch first.

```bash
git fetch origin main
herdr worktree create --branch chore/my-slug --base origin/main --no-focus --json   # workspace auto-labels as "chore-my-slug"
```

the branch name carries the work item (`123456-slug`) or a chore (`chore/slug`). the new checkout lands at `~/.herdr/worktrees/<repo>/<branch-slug>` (slashes become dashes, lowercased); pass `--path` to override. grab the new workspace id from `result.worktree.open_workspace_id`.

### 2. worktree on an existing branch

two cases, and they use different commands (verified):

**the worktree already exists** (e.g. you closed its workspace and want it back) - reattach with `open`:

```bash
herdr worktree open --branch chore/existing-slug --no-focus --json   # or --path <dir>
```

**the branch exists but has no worktree yet** - `open` errors `worktree_not_found`, and `create --branch` refuses (it only makes *new* branches). add the worktree with git first, then open it:

```bash
git worktree add ~/.herdr/worktrees/<repo>/chore-existing-slug chore/existing-slug
herdr worktree open --path ~/.herdr/worktrees/<repo>/chore-existing-slug --no-focus --json
```

### 3. attach an agent to a worktree - one workspace, one tab per agent

herdr ties one workspace to a worktree, so keep all its agents in that **one** workspace and give each its own **tab** - that is what groups them under the worktree in the sidebar. one helper call per agent:

```bash
node HERD agent codex jay --workspace wR --cwd ~/.herdr/worktrees/<repo>/chore-my-slug
```

it runs the four primitives for you: `tab create` (decorated label) -> `agent start <handle> --tab <tab> --cwd <wt> --no-focus -- <argv>` (the handle is assigned **at launch** - no detect-then-rename) -> `pane close <tab-root>` (the leftover shell; the tab keeps the agent pane) -> `agent wait <handle> --status idle` (ready to seed). `agent start` without a placement flag splits the **active** tab - always go through the helper or pass `--tab`.

### 4. change a handle

`agent start` assigns the handle at launch; to change it later:

```bash
herdr agent rename sly sly2
```

the handle is also the pane label. the decorated **tab** label does **not** auto-update - `herdr tab rename <tab> "sly2 ◆"` to keep them in sync.

### 5. message another agent by handle

one call - it types, confirms the recipient's composer ingested the text, submits with the model-correct keys (codex needs two Enters), and confirms the recipient's turn started:

```bash
node HERD send jay "please rerun the failing test in src/api/" --reply
```

the result reports `"submitted":true|false` - `false` means the recipient never started a turn (resend). add `--reply` or `--fyi` to stamp the protocol flag (below). the raw primitives (`herdr agent send jay "..."` then `herdr pane send-keys <pane> Enter`) exist but race the recipient TUI's ingest - codex drops a blind Enter intermittently - so use the helper for anything that matters.

### 6. close agents on a worktree

one agent - close its tab (takes the pane with it). all of them - close the worktree's workspace:

```bash
herdr tab close wR:t2
herdr workspace close wR
```

### 7. remove a worktree

removes the git worktree, its directory, the workspace, and all its tabs/agents - then delete the branch separately:

```bash
herdr worktree remove --workspace wR --force --json
git branch -D chore/my-slug          # remove does NOT delete the branch
```

## composed flows

### spin up a paired reviewer in a fresh worktree

```bash
node HERD up --branch chore/review-x --base origin/main --claude sly --codex jay
node HERD send sly "review the diff on this branch; jay is cross-checking" --fyi
```

### tear a worktree down completely

```bash
WS=… # the worktree's workspace id, from `herdr worktree list --json`
herdr worktree remove --workspace "$WS" --force --json   # removes worktree, dir, workspace, all tabs/agents
git branch -D chore/review-x
```

### assign a herd to a worktree

step 1 (create the worktree) then step 3 per agent - or just `up`. the herd is simply the agents launched with that worktree's cwd. a herd does **not** require a worktree: launch agents at any cwd (most usefully the main checkout for a plain branch) - but a plain-branch herd shares the single repo checkout, so prefer a worktree when the herd needs its own branch.

### reassign a herd to a different worktree

an agent's **cwd is fixed at launch** - you cannot re-cwd a running agent. reassigning = **relaunching** on the new worktree. handles are preserved; conversation + protocol seeding are **not**. handles must be unique, so the old herd comes down first:

```bash
herdr workspace close <old-herd-ws>   # frees the handles
node HERD up --branch chore/new-slug --base origin/main --claude sly --codex jay
git worktree remove --force <old-wt-path>; git branch -D chore/old-slug   # optional: clear the husk
```

after a reassign the relaunched agents are **cold**: re-seed the protocol + roster (see below).

## agent-to-agent protocol (from/to)

a stateless convention for agents to message each other and reply, without scraping panes. no inbox, no acks - a reply is just a message back to the sender, arriving in the sender's pane as a normal turn.

**message format - one line, with a mandatory reply flag:**

```
[from <self> reply] <body>     # a one-line reply IS required
[from <self> fyi]   <body>     # no reply expected - do NOT reply
```

`<self>` is your handle; reply to `<self>` with `[from <you> ...] <answer>`. a newline submits the turn early, so keep every message to one line. `node HERD send` stamps the flag for you: `--reply` -> `[from <self> reply]`, `--fyi` -> `[from <self> fyi]`. it resolves `<self>` from the *executing* pane (`$HERDR_PANE_ID`, inherited by your subprocesses), so scripted sends stamp the right sender even when UI focus has drifted; pass `--from <self>` to override.

**send, and let the reply confirm:**

```bash
node HERD send jay "<body>" --reply
```

the helper verifies delivery mechanically (`"submitted":true`), and the `[from jay]` reply landing in your pane is the end-to-end confirmation; silence means resend. for a message that expects **no** reply (`[herd ...]`, a one-way note), send when the recipient is not `working`:

```bash
node HERD wait jay --status idle,done --timeout 30000   # "free to receive" = idle OR done
```

**receive / reply:** a message reaching you as `[from X] ...` is from teammate X. if it needs an answer, send X back a one-line `[from <self>] <answer>` the same way. if not, do nothing - there are no acks. reading the peer's pane is a diagnostic last resort, not the channel.

**one sender at a time per recipient.** two agents sending to the same recipient concurrently can interleave keystrokes in its composer. coordinate through the operator or the reply cycle; don't blind-broadcast simultaneously.

**don't message a `working` peer.** its in-flight turn is indistinguishable from your submit, so the helper's verification is optimistic there. wait for `idle,done` first (above).

**cross-herd is the same call.** handles resolve from the global `agent list`, so `send` reaches *any* agent (verified). the only requirement is knowing the target handle - rosters are per-herd, so an operator or an introduction message supplies outside handles.

**seeding (required):** a cold agent knows neither this protocol nor its own handle. before relying on it, message each agent once with its handle, the teammate handles, and this protocol. **promoting a solo agent into a herd counts as cold:** seed the incumbent too, then announce both with `[herd +<handle>]`. "it was already running" is not "it knows the protocol."

**membership / roster sync (join & leave):** directive form, distinct from `[from X]` so it is never relayed or replied to:

- join: `[herd +<handle>]` - recipient adds `<handle>` as a teammate
- leave: `[herd -<handle>]` - recipient drops `<handle>`

two complementary triggers:

- **peer detection (self-healing, primary).** when you are active, run `node HERD members --workspace <WS>` (one workspace = one herd; do *not* key on cwd - herds can share a checkout) and diff the handles against your roster. on a delta, update your roster and broadcast `[herd +H]` / `[herd -H]` to the other members. keying on handles (not panes) means a restart is not a false join/leave. this catches removals: the departed agent can't announce itself, but peers see it gone from the list.
- **operator broadcast (immediate).** the operator that adds/removes an agent may broadcast the change right away.

on receiving `[herd +H]`/`[herd -H]`: update your roster **idempotently**; do **not** reply and do **not** re-broadcast (every member detects independently; re-broadcasting causes O(N²) storms).

add sequence: seed the newcomer with the roster, then `[herd +new]`. remove sequence: `[herd -gone]`, then close the agent's tab (steps 6-7).

**pre-authorize the commands.** an agent that prompts for tool approval mid-protocol stalls the herd. every member needs its harness pre-authorized for the native `herdr` verbs and the helper's absolute path - claude via `/herd-setup`; other harnesses per their own config. weak local models also need an explicit "run these as real shell commands - do not print them" (the protocol is reliable between capable agents and best-effort with weak ones).

## lower-level pane / tab / workspace ops

you still have the raw multiplexer. full flags in [reference/cli.md](reference/cli.md).

```bash
herdr pane split --current --direction right --no-focus   # returns the new pane id as json
herdr pane run w9:p2 "npm run dev"                        # types the command + Enter
herdr wait output w9:p2 --match "ready" --timeout 30000
herdr agent read jay --source recent --lines 80           # read a pane by handle
herdr wait agent-status w9:p1 --status done --timeout 120000
```

- `--source visible` = current viewport; `--source recent` = scrollback as rendered; `--source recent-unwrapped` = recent text with soft wraps joined (what `wait output` should match against).
- tabs and workspaces: `herdr tab create|rename|focus|close`, `herdr workspace create|rename|focus|close`.

## gotchas

- **fetch before `worktree create`** - `--base origin/main` is the local ref; it is stale until you `git fetch origin main`.
- **`agent send` types literal text and no Enter** - the `ok` ack means *typed*, not *submitted*. `node HERD send` is the delivery path: it confirms composer ingest, submits model-correct keys, and confirms the turn started, reporting `"submitted"`.
- **`--status` comma lists are helper-only** - `node HERD wait jay --status idle,done` accepts a set; the native waits (`herdr wait agent-status <pane>`, `herdr agent wait <handle>`) take exactly one status - and only the pane form accepts `done`.
- **`agent start` without a placement flag splits the active tab** - always pass `--tab` (or go through the helper/`up`, which do).
- **opencode status needs the fix plugin** - herdr 0.7.0's managed opencode integration is out of date with opencode 1.17.8; the sibling plugin `~/.config/opencode/plugins/herdr-opencode-status-fix.js` restores correct working/idle/blocked reporting. without it, status waits on opencode panes are unreliable.
- **only the home repo's worktree tree nests; plain workspaces don't** - a `workspace create --cwd` workspace gets no repo association and floats ungrouped, even at a repo root. give each herd agent a *tab* in the herd's one workspace; make the herd a worktree to nest it under the repo.
- **workspace label vs tab truncation** - rows render `<workspace> · <tab>`; the long worktree-name label can truncate the tab label in the collapsed sidebar; the handle reappears on focus/widen. that label is herdr's default - don't rename it.
- **`worktree remove` keeps the branch** - it removes the worktree, directory, workspace, and all tabs/agents, but `git branch -D` is separate.
- **`open` reattaches, `create` makes new branches** - existing branch with no worktree -> `git worktree add` first, then `open` (home repo only).
- **one repo per herdr session** - `worktree create` always builds in the session's home repo regardless of cwd (verified). a second repo needs a second `herdr --session <name>`.
- **`worktree create`/`open` run from the repo's main-checkout workspace** - from a linked worktree they error `linked_worktree_source`; pass `--workspace <main-checkout-ws>` or run from there.
- **decorated labels are manual after launch** - `up`/`agent` set `<handle> <glyph>` at launch; a later handle rename does not update the tab label (`tab rename` to re-sync).
- **the helper path comes from your orientation** - a fixed, allowlistable location refreshed each session by the comitatus hook. call it by that absolute path; anything else (variables, `$CLAUDE_PLUGIN_ROOT`, relative paths) prompts or breaks.
- **cwd is the resolved path** - herdr stores an agent's `cwd` OS-resolved (macOS `/tmp` -> `/private/tmp`). when filtering `agent list` by cwd, compare against the resolved path or you'll see zero agents on a healthy herd.
- **ids are not durable** - re-read them; never reuse an old id.
- **read vs wait, and `recent` can lag** - `pane read` for output that already exists; `wait output` for output you expect next. `--source recent` can come back empty while a pane is freshly producing output; fall back to `--source visible` or `wait output` - do not read an empty `recent` as "nothing is there."
- **json output** - agent/workspace/pane commands print json; worktree commands need `--json`. `pane read` prints text; `send-text`/`send-keys`/`run` print nothing on success.
