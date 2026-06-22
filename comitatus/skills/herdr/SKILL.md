---
name: herdr
description: "Control herdr from inside it: manage git worktrees, workspaces, tabs and panes; start coding agents (claude/codex/opencode) with short handles; message agents by handle; and wait for state - all via CLI over a local unix socket. Use when running inside herdr (HERDR_ENV=1)."
---

# herdr - agent skill

before using this skill, check that `HERDR_ENV=1`. if it is not set to `1`, say you are not running inside a herdr-managed pane and stop. do not inspect or control the focused herdr pane from outside herdr.

you are running inside herdr, a terminal-native agent multiplexer. herdr gives you git worktrees, workspaces, tabs, and panes, and lets you start and drive coding agents in them - all from the cli. the `herdr` binary is in your PATH; its subcommands talk to the running herdr instance over a local unix socket.

if you need the raw protocol, read the [socket api docs](https://herdr.dev/docs/socket-api/). for the full flag-by-flag command surface, see [reference/cli.md](reference/cli.md).

## concepts

herdr nests like this: **repo -> worktree -> workspace -> tab -> pane -> agent** - but only for repo-associated workspaces; a plain `workspace create` sits *outside* this tree (see `## naming` and gotchas).

- **worktree** - a git worktree (a branch checked out in its own directory). herdr can create, open, list, and remove them. herdr ties **one** workspace to a worktree (its anchor, `open_workspace_id`). the sidebar groups workspaces **by repo**: the repo's main checkout (`is_linked_worktree=false`) is the parent and its linked worktrees nest under it - this is the **only** hierarchy herdr renders, and it is keyed on `repo_root`, not on which workspace created it (verified).
- **workspace** - a project context, one or more tabs. usually labeled after the repo or the agent running in it.
- **tab** - a subcontext inside a workspace, one or more panes.
- **pane** - a real terminal split. runs a shell, an agent, a server, anything.
- **agent** - a coding agent (claude, codex, opencode, ...) running in a pane. each agent carries a **handle** in its `name` field (e.g. `fox`, `ivy`). you address agents by handle.
- **herd** - a *group of agents you treat as a team*: 1..n members, models mixed freely (claude, codex, opencode/local, ...). a herd is a **logical roster, not a herdr object** - there is no `herd` command and no herd field on anything; it is **orthogonal** to the worktree->...->agent nesting above. a herd can run on a worktree, on the main checkout (a plain branch), or at any cwd; and a worktree can exist with **no** herd at all. members know the roster and message each other - and members of *other* herds - by handle (see the from/to protocol). "assigning a herd to work" just means launching its agents with their `cwd` at that work (a worktree dir or a branch checkout).
- **herder** - the top-level orchestrator (a workspace; you, reading this, are one) that spins up and tends herds. **exactly one per herdr session** - it is the session's home repo (the single main-checkout anchor every worktree-herd nests under). a second repo means a second herdr session, i.e. a second herder; you cannot manage two repos from one session (`worktree create` always targets the home repo). herder and herd are **labeled descriptively** (by repo and by task); only member handles come from a name pool - all convention, no herdr enforcement - see `## naming` below.

three facts that drive most workflows:

- **one workspace per worktree.** herdr groups a worktree's agents under its single workspace. run several agents on a worktree by giving each its own **tab** in that one workspace - separate `workspace create --cwd` workspaces get **no repo association** (no `worktree` field) and float ungrouped, even at a repo root.
- **a worktree and its agents are linked by `cwd`, not by a stored mapping.** to find every agent in a worktree, list agents and filter on `cwd`. there is no tracking file.
- **`agent_status`** is detected automatically: `idle`, `working`, `blocked`, `done`, `unknown`. a fresh/ready agent is `idle`; one that **finished a task whose output you have not viewed** is `done` (a CLI `pane read` does *not* clear it - only focusing the pane in the UI does). `wait agent-status` matches **one exact state** (verified), so choose per situation: **launch/detect -> `idle`; a sibling finishing a task headlessly -> `done`; "free to receive a message" -> not `working` (i.e. `idle` *or* `done`).**

## ids

ids are short: workspace `w8`, tab `w8:t1`, pane `w8:p1`. they are opaque and **not durable** - they can change as things open and close. never reuse an old id; re-read the current one from `worktree list`, `workspace list`, `agent list`, or a create/start response. most commands print json, so parse ids out of the json rather than guessing.

## naming (repo -> task -> members)

a convention layered on top of herdr - herdr stores **none** of it. three tiers; the first two are **labeled descriptively** (after what they are / do), the third draws a call-sign from a pool in [reference/names.md](reference/names.md):

- **herder** - the top-level orchestrator workspace, **one per herdr session** (the home repo's main checkout; a second repo = a second session = a second herder). label it with a short **repo tag** - `claude-dom`, ... - via `workspace rename <ws> "<repo-tag>"`.
- **herd** - a managed group of agents. label its workspace with a short **task tag** that says what the group is doing - `comitatus`, `terraform`, ... - derived from the branch, unique among live herd workspaces.
- **member** - an agent in a herd. its **handle** is a short call-sign - `tim`, `jay`, `sly`, ... - claimed as the next unused pool entry, set with `agent rename <pane> <handle>`.

**why only members get pooled names.** a herd/herder label answers "what / where": the sidebar row is `<workspace> · <tab>` and the branch is **not** in it, so the workspace label is your only at-a-glance "what is this group doing" field - a task/repo tag spends it well, an arbitrary noun wastes it. a member handle is different: it is the **addressable identity** (`agent send tim`), so it must stay short, unique, phonetically distinct, and stable across a model relaunch - none of which a task name (many members per task) can be. so members draw from a pool; herds and herders are named after their work.

**picking a task / repo tag.** a short, readable abbreviation of the branch (herd) or repo (herder) - judgment, not an algorithm: `chore/comitatus-fixes -> comitatus`, `chore/refactor-terraform -> terraform`, `issue/feature-3/add-socius -> socius`. keep it **<= ~10 chars** (see the labels rule) and unique among live herds; on a genuine collision qualify one (`tf-refac` / `api-refac`), though their repo groups already separate them in the sidebar.

**fully-qualified vs addressable.** a member's full identity is written `<repo>/<task>/<member>` (e.g. `claude-domestique/comitatus/fox`) for humans and docs. but herdr has **no hierarchical addressing**: the only thing it stores or routes is the flat member handle, and you reach the agent with `agent send fox`. the `<repo>/` and `<task>/` segments are operator bookkeeping (which herder owns which herd is convention, not herdr state), not part of the address.

rules that make it work:

- **member handles are globally unique - herdr enforces it.** a duplicate `agent start` is rejected (`agent_name_taken`, verified), across *all* workspaces. claim each handle against live `agent list`; size the member pool above your peak concurrent agent count.
- **labels <= ~10 chars.** rows render `<workspace> · <tab>`, so a long herder/herd label truncates the member's decorated tab label - abbreviate the task/repo tag to fit.
- **handles are type-agnostic.** never encode the model in a handle; the tab already shows `◆ claude` / `◇ codex`, and a type-free handle survives relaunching a member on another model.
- **labels track the work.** a herd's label follows its task: reassign the herd to a new branch and you **relabel** it to the new task tag (`workspace rename`). the work is still found via cwd, not the label - but the label is kept descriptive on purpose, so the sidebar always reads true.
- **only home-repo worktrees nest under the herder.** a herd appears *under* the herder in the panel only when it's a linked worktree of the session's repo; plain workspaces and any other repo float separately (logical-only herds - the `<repo>/<task>/...` path still names them, they just don't nest visually).
- **phonetic distinctness for members.** they message each other by handle in the from/to protocol and weak local models mis-type look-alikes - avoid rhyming clusters.

## discover state

```bash
herdr pane list            # panes in your workspace; the focused one is yours
herdr agent list           # every detected agent: name, agent type, cwd, workspace_id, pane_id, status
herdr worktree list --json # worktrees: branch, path, open_workspace_id
herdr workspace list       # workspaces and labels
```

## building blocks

these are the small, composable operations. chain them for bigger flows.

### 1. new worktree on a new branch off fresh origin/main

`worktree create` uses your **local** `origin/main` and does **not** fetch. fetch first.

```bash
git fetch origin main
herdr worktree create --branch chore/my-slug --base origin/main --label "my slug" --no-focus --json
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

### 3. attach agents to the worktree - one workspace, one tab per agent

herdr ties one workspace to a worktree, so keep all its agents in that **one** workspace and give each its own **tab**. that is what groups them under the worktree in the sidebar (a separate workspace per agent scatters them). per agent: run the model in a tab's root pane, wait for herdr to detect it, set the handle.

agent 1 runs in the worktree's root pane (from step 1, tab `<ws>:t1`). each additional agent gets a new tab in the same workspace:

```bash
H="$CLAUDE_PLUGIN_ROOT/skills/herdr/scripts/herd.js"   # codex: H="$HOME/.codex/skills/herdr/scripts/herd.js"
WT=~/.herdr/worktrees/<repo>/chore-my-slug
WS=wR            # worktree's open_workspace_id from step 1
ROOT1=wR:p1      # worktree's root_pane from step 1

herdr workspace rename "$WS" "my-slug"        # keep this SHORT (see gotchas): rows render "<workspace> · <tab>"
herdr tab rename "${WS}:t1" "sly ◆ claude"    # tab label carries the decorated <handle> <glyph> <type>

# agent 1 in the worktree's root pane (tab 1)
herdr pane run "$ROOT1" "claude"
herdr wait agent-status "$ROOT1" --status idle --timeout 40000
herdr agent rename "$ROOT1" sly

# each additional agent: a new tab, run the model in its root pane, detect, name
T=$(herdr tab create --workspace "$WS" --cwd "$WT" --label "jay ◇ codex" --no-focus)
ROOT=$(echo "$T" | node "$H" field result.root_pane.pane_id)
herdr pane run "$ROOT" "codex"
herdr wait agent-status "$ROOT" --status idle --timeout 40000
herdr agent rename "$ROOT" jay
```

| model | `pane run` argv | glyph | tab label |
|---|---|---|---|
| claude | `claude` | ◆ | `sly ◆ claude` |
| codex | `codex` | ◇ | `jay ◇ codex` |
| opencode + qwen2.5:7b | `opencode -m ollama/qwen2.5:7b` | ⬨ | `bob ⬨ opencode` |

- `--cwd "$WT"` on `tab create` keeps each agent's working dir on the worktree (association is by cwd).
- `agent rename` needs the agent **detected first**; that is what `wait agent-status` ensures.
- the decorated `<handle> <glyph> <type>` format lives on the **tab** label. keep the workspace label short, or rows truncate.
- `agent start <handle> --cwd "$WT" --workspace <ws> -- <argv>` is an escape hatch for an ad-hoc agent pane, but it does not give the clean one-tab-per-agent grouping - prefer tabs. see reference/cli.md.

### 4. assign or change a handle

step 3 sets the handle with `herdr agent rename <pane> <handle>`. to change it later, rename again:

```bash
herdr agent rename sly sly2
```

the handle is also the pane label. the decorated **tab** label (step 3) does **not** auto-update - `herdr tab rename <tab> "sly2 ◆ claude"` if you want it to match.

### 5. message another agent by handle

`agent send` writes literal text and does **not** press Enter. send, then submit - the recipient's reply confirms it landed:

```bash
PANE=$(herdr agent list | node "$H" pane jay)
herdr agent send jay "please rerun the failing test in src/api/"
herdr pane send-keys "$PANE" Enter
```

the Enter is dropped only if `jay` was mid-generation (`working`); if no reply comes back, resend. for replies, seeding, roster, and how to handle no-reply messages, see the from/to protocol below.

### 6. close agents on a worktree

one agent - close its tab (takes the pane with it):

```bash
herdr tab close wR:t2
```

all of them - close the worktree's workspace (takes every tab with it):

```bash
herdr workspace close wR
```

### 7. remove a worktree

with every agent in the worktree's one workspace, one herdr command removes the git worktree, its directory, the workspace, and all its tabs/agents - then delete the branch separately:

```bash
herdr worktree remove --workspace wR --force --json
git branch -D chore/my-slug          # remove does NOT delete the branch
```

## composed flows

### spin up a paired reviewer in a fresh worktree

```bash
git fetch origin main
OUT=$(herdr worktree create --branch chore/review-x --base origin/main --no-focus --json)
WT=$(echo "$OUT"    | node "$H" field result.worktree.path)
WS=$(echo "$OUT"    | node "$H" field result.worktree.open_workspace_id)
ROOT1=$(echo "$OUT" | node "$H" field result.root_pane.pane_id)

herdr workspace rename "$WS" "review-x"
herdr tab rename "${WS}:t1" "sly ◆ claude"

# sly = claude in tab 1 (the worktree's root pane)
herdr pane run "$ROOT1" "claude"
herdr wait agent-status "$ROOT1" --status idle --timeout 40000
herdr agent rename "$ROOT1" sly

# jay = codex in a second tab of the same workspace
T=$(herdr tab create --workspace "$WS" --cwd "$WT" --label "jay ◇ codex" --no-focus)
ROOT2=$(echo "$T" | node "$H" field result.root_pane.pane_id)
herdr pane run "$ROOT2" "codex"
herdr wait agent-status "$ROOT2" --status idle --timeout 40000
herdr agent rename "$ROOT2" jay

# sly reviews; jay cross-checks
herdr agent send sly "review the diff on this branch; jay is cross-checking"
herdr pane send-keys "$ROOT1" Enter
```

### tear a worktree down completely

```bash
WT=~/.herdr/worktrees/<repo>/chore-review-x
WS=$(herdr worktree list --json | python3 -c 'import sys,json; wt=sys.argv[1]; print(next(w["open_workspace_id"] for w in json.load(sys.stdin)["result"]["worktrees"] if w["path"]==wt))' "$WT")   # (worktree-by-path search; herd.js covers handles/fields, not array search)
herdr worktree remove --workspace "$WS" --force --json   # removes worktree, dir, workspace, all tabs/agents
git branch -D chore/review-x
```

### assign a herd to a worktree

the common case: assign a herd to its own **worktree** (isolated branch + dir). that is just step 1 (create the worktree) then step 3 (attach each agent as a tab): agent 1 in the worktree's root tab, each additional agent in its own `tab create --workspace <ws> --cwd <wt>`. nothing extra - the herd is simply the agents you launched with that worktree's cwd. name the workspace with a **task tag** and each member with a **handle** from the pool (see `## naming`); the step-3 recipe's `workspace rename` / `tab rename` / `agent rename` are where those names land.

a herd does **not** require a worktree. launch one at any cwd - most usefully the **main checkout** (a plain branch): `herdr workspace create --cwd <repo>`, then attach agents there. caveat: a plain-branch herd shares the **single** repo checkout, so "reassign to a different branch" is a global `git checkout` with no isolation - prefer a worktree when you want a herd pinned to its own branch without disturbing other work.

### reassign a herd to a different worktree

an agent's **cwd is fixed at launch**, and herdr keys worktree-association on cwd - you cannot re-cwd a running agent. so reassigning a herd = **relaunching** it on the new worktree. handles are preserved; conversation + protocol seeding are **not**. handles must be unique, so the old herd comes down before the new one comes up.

```bash
git fetch origin main
NEW=$(herdr worktree create --branch chore/new-slug --base origin/main --label "new-slug" --no-focus --json)
WS=$(echo "$NEW"    | node "$H" field result.worktree.open_workspace_id)
WT=$(echo "$NEW"    | node "$H" field result.worktree.path)
ROOT1=$(echo "$NEW" | node "$H" field result.root_pane.pane_id)

herdr workspace close <old-herd-ws>            # take the OLD herd down -> frees the handles (sly/jay/tim)

# rebuild each agent on the new worktree, reusing the SAME handles (the assign / step-3 recipe):
herdr tab rename "${WS}:t1" "sly ◆ claude"; herdr pane run "$ROOT1" "claude"
herdr wait agent-status "$ROOT1" --status idle --timeout 45000; herdr agent rename "$ROOT1" sly
# jay -> tab create + pane run "codex" + rename jay ;  tim -> tab create + "claude --model haiku" + rename tim

git worktree remove --force <old-wt-path>; git branch -D chore/old-slug   # optional: clear the empty husk
```

after a reassign the relaunched agents are **cold**: if it was a from/to herd, re-seed the protocol + roster - a `[herd ...]` broadcast can't reach the dead old handles, and the new agents don't know the protocol yet.

## agent-to-agent protocol (from/to)

a stateless convention for agents to message each other and reply, without scraping panes. no inbox, no acks - a reply is just a message back to the sender, and it arrives in the sender's pane as a normal turn.

**message format - one line:**

```
[from <self>] <body>
```

`<self>` is your handle; a newline submits the turn early, so keep every message to one line.

**send to teammate `<to>`:**

```bash
TO=jay
TO_PANE=$(herdr agent list | node "$H" pane "$TO")
herdr agent send "$TO" "[from <self>] <body>"
herdr pane send-keys "$TO_PANE" Enter
```

**push and let the reply confirm - don't pre-check.** the Enter is dropped only if the recipient was `working`; its `[from <to>]` reply landing in your pane means it arrived, and *no* reply means resend. only a message that expects **no** reply (e.g. a `[herd ...]` directive) has nothing to confirm it - then send when the recipient is not `working`, or read its pane to verify:

```bash
# optional pre-check (no-reply messages, or to skip a likely-dropped send): poll until it leaves `working`
while [ "$(herdr agent list | node "$H" status "$TO_PANE")" = working ]; do sleep 1; done
```

**receive / reply:** a message reaching you as `[from X] ...` is from teammate X. if it needs an answer, reply by sending X back a one-line `[from <self>] <answer>` the same way. if no answer is needed, do nothing - there are no acks. X's reply arrives in *your* pane as a turn; if nothing arrives the send failed (resend) - reading the peer's pane is a diagnostic last resort, not the channel.

**cross-herd is the same call.** `agent send <handle>` resolves the handle from the global `agent list`, so it reaches *any* agent - same herd or not (verified: an agent in one herd messaged a member of another by handle and it landed). the only extra requirement for reaching another herd is **knowing the target handle**: rosters are per-herd, so an operator (or an explicit introduction message) must supply the outside handle before an agent can address it.

**seeding (required):** a cold agent knows neither this protocol nor its own handle. before relying on it, message each agent once with its handle, the teammate handles, and this protocol. they are not born knowing it.

**membership / roster sync (join & leave):** keep every agent's roster current as members come and go. directive form, distinct from `[from X]` so it is never relayed or replied to (handle-only - the pane is resolved at send time, so it survives restarts):

- join: `[herd +<handle>]` - recipient adds `<handle>` as a teammate
- leave: `[herd -<handle>]` - recipient drops `<handle>`

two complementary triggers:

- **peer detection (self-healing, primary).** whenever you are active (before a send, or when checking on the herd), run `herdr agent list | node "$H" members --workspace <WS>` (one workspace = one herd; do *not* key on cwd - herds can share a checkout, which would merge them), and diff the set of **handles** against your roster. on a delta, update your own roster and broadcast it (`[herd +H]` / `[herd -H]`) to the other current members. keying on the handle (not the pane) means a *restart* - which changes a pane but not membership - is not a false join/leave. this is what catches a **removal**: the departed agent can't announce itself, but its peers notice it vanished from `agent list` and propagate `[herd -<gone>]`.
- **operator broadcast (immediate).** the operator that adds/removes an agent may also broadcast the change right away so the herd converges without waiting for the next poll.

on receiving `[herd +H]`/`[herd -H]`: update your roster **idempotently** (ignore if no change); do **not** reply, and do **not** re-broadcast - every member detects independently, so re-broadcasting only causes O(N²) storms.

seed the rule into every orientation: "periodically reconcile your roster against `herdr agent list` (handles sharing your `workspace_id`) and announce any add/remove as `[herd +H]`/`[herd -H]`; on a `[herd ...]` directive, update your roster and do not reply or relay it." add sequence: seed the newcomer with the roster, then `[herd +new]`. remove sequence: `[herd -gone]`, then close the agent's tab (steps 6-7).

**delivery reliability (validated by testing):**

- **the reply, or its absence, is the signal.** push the message and let the reply confirm it - a `[from <to>]` turn landing in your pane means it arrived; nothing landing means the Enter dropped (the recipient was `working`), so resend. you don't pre-check the recipient for reply-expecting messages.
- **no-reply messages need a check.** a directive that expects no reply (`[herd ...]`, a one-way note) has nothing to confirm delivery, so send it when the recipient is not `working` (poll) or read its pane to verify - reliable `agent_status` is what makes the poll checkable, so a broken integration (see the opencode status fix) breaks it. (roster directives tolerate drops anyway: peer-detection re-discovers a missed add/remove.)
- **pre-authorize `herdr`.** an agent that prompts for per-command tool approval before running `herdr ...` stalls mid-protocol. allowlist `herdr` in each agent's tool-permission config (the legacy herdr-mate pre-authorized its send wrapper for exactly this).
- **weak local models narrate, not execute.** small models (e.g. qwen2.5:7b) print the CLI as text instead of running it; they need an explicit "run these as real shell commands - do not print," and often a capable peer to coach them. the protocol is reliable between capable agents (claude/codex) and best-effort with weak ones.

## lower-level pane / tab / workspace ops

you still have the raw multiplexer when you need it. full flags in [reference/cli.md](reference/cli.md).

split and run, then wait for output:

```bash
NEW=$(herdr pane split --current --direction right --no-focus | node "$H" field result.pane.pane_id)
herdr pane run "$NEW" "npm run dev"
herdr wait output "$NEW" --match "ready" --timeout 30000
herdr pane read "$NEW" --source recent --lines 20
```

read another pane / wait for an agent:

```bash
herdr pane read w9:p1 --source recent --lines 80
herdr wait agent-status w9:p1 --status done --timeout 120000   # a sibling finishing a task (unviewed) lands on `done`; use `idle` only for launch/detect
```

- `--source visible` = current viewport; `--source recent` = scrollback as rendered; `--source recent-unwrapped` = recent text with soft wraps joined (this is what `wait output --source recent` matches against).
- tabs and workspaces: `herdr tab create|rename|focus|close`, `herdr workspace create|rename|focus|close`. see reference.

## gotchas

- **fetch before `worktree create`** - `--base origin/main` is the local ref; it is stale until you `git fetch origin main`.
- **`agent send` has no Enter, and the Enter drops only while the target is `working`** - send + `pane send-keys <pane> Enter` and let the reply confirm it landed (resend on silence); only for a no-reply message poll until the target is not `working` first, or verify by reading its pane. don't blindly double-tap. (full recipe in the from/to protocol section.)
- **codex TUI paste gotcha** - a long `send-text` / `agent send` into a codex TUI may be ingested as a bracketed paste that a single Enter does not submit. keep protocol messages one line and short. if you deliberately send a long codex message and silence follows, send one extra Enter or retry as shorter one-line chunks.
- **opencode status needs the fix plugin** - herdr 0.7.0's managed opencode integration is out of date with opencode 1.17.8 (object-form `session.status` + fire-and-forget idle), so opencode agents get stuck `working` / never report state right. the sibling plugin `~/.config/opencode/plugins/herdr-opencode-status-fix.js` restores correct working/idle/blocked reporting. without it, `wait agent-status` on an opencode pane is unreliable.
- **only the home repo's worktree tree nests; plain workspaces don't** - the sidebar nests exactly one repo group (main checkout -> its linked worktrees -> tabs), keyed on `repo_root`. a `workspace create --cwd` workspace gets **no** repo association and floats ungrouped, even at a repo root. give each agent in a herd a *tab* in the herd's one workspace; make the herd a worktree if you want it to nest under the herder.
- **keep the workspace label short** - agent rows render as `<workspace> · <tab>`, so a long workspace label truncates the decorated tab label; keep the task/repo tag <= ~10 chars.
- **`worktree remove` keeps the branch** - it removes the git worktree, its directory, the workspace, and all that workspace's tabs/agents, but not the branch (`git branch -D` separately).
- **`open` reattaches, `create` makes new branches** - `worktree open` opens a workspace on a worktree that *already exists* (errors `worktree_not_found` otherwise, **including** any worktree of a repo this session does not track); `worktree create --branch` only makes a *new* branch (errors if it exists). existing branch with no worktree -> `git worktree add` first, then `open` (only works for the home repo).
- **one repo per herdr session** - `worktree create` ignores the CLI cwd and always builds in the session's home/launch repo (verified: invoking it with cwd set to a different repo still produced a home-repo worktree). there is no way to manage a second repo's worktrees from one session; launch a separate `herdr --session <name>` inside that repo - that *is* a second herder.
- **detect before `agent rename`** - a model launched with `pane run` is only renameable once herdr detects it. `herdr wait agent-status <pane> --status idle` first, or the rename misses the target.
- **decorated labels are manual** - `sly ◆ claude` style labels are set with `tab rename`, not auto-derived. renaming the handle does not update the tab label; re-`tab rename` to keep them in sync.
- **`agent start` needs both `--cwd` and `--workspace`** - the ad-hoc escape hatch (vs the default `pane run` in a tab) takes `--cwd <worktree-path>` for the working dir (the cwd association `agent list` uses) and `--workspace <id>` for pane placement; they are independent. `--workspace` alone leaves the agent on *your* cwd, editing the wrong tree.
- **cwd is the resolved path** - herdr stores an agent's `cwd` OS-resolved, so a symlinked root differs from what you launched with (macOS `/tmp` -> `/private/tmp`). when you filter `agent list` by cwd to find a herd, compare against the resolved path (`cd <dir>; pwd -P`), not the string you passed, or you'll see zero agents on a herd that is running fine.
- **ids are not durable** - re-read them; never reuse an old id.
- **read vs wait** - `pane read` for output that already exists; `wait output` for output you expect next.
- **json output** - agent/workspace/pane commands print json; worktree commands print json with `--json`. `pane read` prints text; `send-text`/`send-keys`/`run` print nothing on success.
