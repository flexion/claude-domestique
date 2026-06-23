---
name: herdr
description: "Control herdr from inside it: manage git worktrees, workspaces, tabs and panes; start coding agents (claude/codex/opencode) with short handles; message agents by handle; and wait for state - all via CLI over a local unix socket. Use when running inside herdr (HERDR_ENV=1)."
---

# herdr - agent skill

before using this skill, check that `HERDR_ENV=1`. if it is not set to `1`, say you are not running inside a herdr-managed pane and stop. do not inspect or control the focused herdr pane from outside herdr.

you are running inside herdr, a terminal-native agent multiplexer. herdr gives you git worktrees, workspaces, tabs, and panes, and lets you start and drive coding agents in them - all from the cli. the `herdr` binary is in your PATH; its subcommands talk to the running herdr instance over a local unix socket.

if you need the raw protocol, read the [socket api docs](https://herdr.dev/docs/socket-api/). for the full flag-by-flag command surface, see [reference/cli.md](reference/cli.md).

## quickstart - the 80% path

create a worktree and put one claude agent on it. `H` is the herd.js helper path from your herdr orientation (the `H=...` line); concepts, naming, and the rest are below.

```bash
H=...                                   # paste from your herdr orientation
git fetch origin main                   # --base origin/main is a local ref; refresh it first
OUT=$(herdr worktree create --branch chore/my-slug --base origin/main --no-focus --json)
WS=$(echo "$OUT"   | node "$H" field result.worktree.open_workspace_id)
ROOT=$(echo "$OUT" | node "$H" field result.root_pane.pane_id)

herdr tab rename "${WS}:t1" "fox ◆"     # the only label you set: handle + model glyph
herdr pane run "$ROOT" "claude"
herdr wait agent-status "$ROOT" --status idle --timeout 40000
herdr agent rename "$ROOT" fox          # fox is now addressable: herdr agent send fox "..."
```

that is one worktree, one agent. add more agents (a tab each), message them, and tear down with the building blocks below.

## concepts

herdr nests like this: **repo -> worktree -> workspace -> tab -> pane -> agent** - but only for repo-associated workspaces; a plain `workspace create` sits *outside* this tree (see `## naming` and gotchas).

- **worktree** - a git worktree (a branch checked out in its own directory). herdr can create, open, list, and remove them. herdr ties **one** workspace to a worktree (its anchor, `open_workspace_id`). the sidebar groups workspaces **by repo**: the repo's main checkout (`is_linked_worktree=false`) is the parent and its linked worktrees nest under it - this is the **only** hierarchy herdr renders, and it is keyed on `repo_root`, not on which workspace created it (verified).
- **workspace** - a project context, one or more tabs. usually labeled after the repo or the agent running in it.
- **tab** - a subcontext inside a workspace, one or more panes.
- **pane** - a real terminal split. runs a shell, an agent, a server, anything.
- **agent** - a coding agent (claude, codex, opencode, ...) running in a pane. each agent carries a **handle** in its `name` field (e.g. `fox`, `ivy`). you address agents by handle.
- **herd** - a *group of agents you treat as a team*: 1..n members, models mixed freely (claude, codex, opencode/local, ...). a herd is a **logical roster, not a herdr object** - there is no `herd` command and no herd field on anything; it is **orthogonal** to the worktree->...->agent nesting above. a herd can run on a worktree, on the main checkout (a plain branch), or at any cwd; and a worktree can exist with **no** herd at all. members know the roster and message each other - and members of *other* herds - by handle (see the from/to protocol). "assigning a herd to work" just means launching its agents with their `cwd` at that work (a worktree dir or a branch checkout).
- **home repo / main checkout** - every herdr session is anchored to one repo, and you spin up and tend herds from its **main-checkout workspace** (the one you, reading this, are launched under). **exactly one repo per session** - the main checkout is the single anchor every worktree nests under; a second repo means a second herdr session (`worktree create` always targets the home repo, and must be run from its main-checkout workspace). nothing here is named by convention: herdr labels the main checkout with the repo name and each worktree with its directory name - you leave both. only member handles are assigned - see `## naming` below.

three facts that drive most workflows:

- **one workspace per worktree.** herdr groups a worktree's agents under its single workspace. run several agents on a worktree by giving each its own **tab** in that one workspace - separate `workspace create --cwd` workspaces get **no repo association** (no `worktree` field) and float ungrouped, even at a repo root.
- **a worktree and its agents are linked by `cwd`, not by a stored mapping.** to find every agent in a worktree, list agents and filter on `cwd`. there is no tracking file.
- **`agent_status`** is detected automatically: `idle`, `working`, `blocked`, `done`, `unknown`. a fresh/ready agent is `idle`; one that **finished a task whose output you have not viewed** is `done` (a CLI `pane read` does *not* clear it - only focusing the pane in the UI does). `wait agent-status` matches **one exact state** (verified), so choose per situation: **launch/detect -> `idle`; a sibling finishing a task headlessly -> `done`; "free to receive a message" -> not `working` (i.e. `idle` *or* `done`).**

## ids

ids are short: workspace `w8`, tab `w8:t1`, pane `w8:p1`. they are opaque and **not durable** - they can change as things open and close. never reuse an old id; re-read the current one from `worktree list`, `workspace list`, `agent list`, or a create/start response. most commands print json, so parse ids out of the json rather than guessing.

## naming (worktree -> members)

a thin convention on top of herdr - herdr stores **none** of it. you assign exactly two things; every workspace/worktree label is left at herdr's default:

- **herd** - a group of agents on a worktree. **you don't label it.** when you `worktree create`, herdr already labels the worktree's workspace with the **worktree directory name** (`chore-comitatus-fixes`) - exactly what you want in the sidebar row. (the repo's main checkout is left at its default too: herdr labels it the repo name, `claude-domestique`.)
- **member** - an agent in a herd. its **handle** is a short call-sign - `tim`, `jay`, `sly`, ... - claimed as the next unused entry from the pool in [reference/names.md](reference/names.md), set with `agent rename <pane> <handle>`. the handle is the **addressable identity** (`agent send tim`), so it must stay short, unique, phonetically distinct, and stable across a model relaunch.

the agent's decorated **tab** label is `<handle> <glyph>` (`fox ◆`, `jay ◇`), set with `tab rename` (the glyph - claude `◆`, codex `◇`, opencode `⬨` - encodes the model). the handle and that tab label are the **only** labels you assign; workspace and worktree labels are herdr's defaults and are never renamed. the sidebar row is `<workspace> · <tab>` = `<worktree-name> · <handle> <glyph>`, which reads true with zero renaming.

**why members are the exception.** a member handle is an identity you *route messages to*, so it has to be assigned and stable. a workspace label, by contrast, herdr already derives correctly from the worktree - there is nothing to assign, so don't.

**addressing.** a member is reached by its flat handle - `agent send fox`. herdr has **no hierarchical addressing**; for humans you may write `<repo>/<worktree>/<member>` (e.g. `claude-domestique/chore-comitatus-fixes/fox`), but only the handle is real.

rules that make it work:

- **member handles are globally unique - herdr enforces it.** a duplicate `agent start` is rejected (`agent_name_taken`, verified), across *all* workspaces. claim each handle against live `agent list`; size the member pool above your peak concurrent agent count.
- **a worktree name is long and can truncate the tab label.** rows render `<workspace> · <tab>`, so the worktree-name workspace label can push the decorated `<handle> <glyph>` tab label off the collapsed sidebar - the handle reappears on focus/widen. that is the trade for a label that names the worktree unambiguously, and it costs no renaming.
- **handles are type-agnostic.** never encode the model in a handle; the tab glyph already shows it, and a type-free handle survives relaunching a member on another model.
- **only home-repo worktrees nest under the main checkout.** a herd appears *under* the repo's main checkout in the panel only when it's a linked worktree of the session's repo; plain workspaces and any other repo float separately (the `<repo>/<worktree>/...` path still names them, they just don't nest visually).
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
herdr worktree create --branch chore/my-slug --base origin/main --no-focus --json   # workspace auto-labels as "chore-my-slug" (the worktree dir)
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
# H = the herd.js helper. take it from your herdr orientation's `H=...` line; it is
# version-pinned on the claude side, so re-read it each session and don't persist it.
# codex agents use the stable path: H="$HOME/.codex/skills/herdr/scripts/herd.js"
H="${H:?set H from your herdr orientation (the 'Roster/state helper' line)}"
WT=~/.herdr/worktrees/<repo>/chore-my-slug
WS=wR            # worktree's open_workspace_id from step 1
ROOT1=wR:p1      # worktree's root_pane from step 1

# no workspace rename: herdr already labeled "$WS" with the worktree dir name ("chore-my-slug")
herdr tab rename "${WS}:t1" "sly ◆"    # the ONLY label you set: the decorated <handle> <glyph> tab label

# agent 1 in the worktree's root pane (tab 1)
herdr pane run "$ROOT1" "claude"
herdr wait agent-status "$ROOT1" --status idle --timeout 40000
herdr agent rename "$ROOT1" sly

# each additional agent: a new tab, run the model in its root pane, detect, name
T=$(herdr tab create --workspace "$WS" --cwd "$WT" --label "jay ◇" --no-focus)
ROOT=$(echo "$T" | node "$H" field result.root_pane.pane_id)
herdr pane run "$ROOT" "codex"
herdr wait agent-status "$ROOT" --status idle --timeout 40000
herdr agent rename "$ROOT" jay
```

| model | `pane run` argv | glyph | tab label |
|---|---|---|---|
| claude | `claude` | ◆ | `sly ◆` |
| codex | `codex` | ◇ | `jay ◇` |
| opencode + qwen2.5:7b | `opencode -m ollama/qwen2.5:7b` | ⬨ | `bob ⬨` |

- `--cwd "$WT"` on `tab create` keeps each agent's working dir on the worktree (association is by cwd).
- `agent rename` needs the agent **detected first**; that is what `wait agent-status` ensures.
- the decorated `<handle> <glyph>` format lives on the **tab** label; the workspace label is a separate axis (the worktree name - see `## naming`).
- `agent start <handle> --cwd "$WT" --workspace <ws> -- <argv>` is an escape hatch for an ad-hoc agent pane, but it does not give the clean one-tab-per-agent grouping - prefer tabs. see reference/cli.md.

### 4. assign or change a handle

step 3 sets the handle with `herdr agent rename <pane> <handle>`. to change it later, rename again:

```bash
herdr agent rename sly sly2
```

the handle is also the pane label. the decorated **tab** label (step 3) does **not** auto-update - `herdr tab rename <tab> "sly2 ◆"` if you want it to match.

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

herdr tab rename "${WS}:t1" "sly ◆"    # workspace "$WS" is already labeled "chore-review-x" by herdr

# sly = claude in tab 1 (the worktree's root pane)
herdr pane run "$ROOT1" "claude"
herdr wait agent-status "$ROOT1" --status idle --timeout 40000
herdr agent rename "$ROOT1" sly

# jay = codex in a second tab of the same workspace
T=$(herdr tab create --workspace "$WS" --cwd "$WT" --label "jay ◇" --no-focus)
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

the common case: assign a herd to its own **worktree** (isolated branch + dir). that is just step 1 (create the worktree) then step 3 (attach each agent as a tab): agent 1 in the worktree's root tab, each additional agent in its own `tab create --workspace <ws> --cwd <wt>`. nothing extra - the herd is simply the agents you launched with that worktree's cwd. herdr already labels the workspace with the worktree name, so all you assign is each member's **handle** plus its decorated `<handle> <glyph>` tab label (see `## naming`); the step-3 recipe's `tab rename` / `agent rename` are where those land.

a herd does **not** require a worktree. launch one at any cwd - most usefully the **main checkout** (a plain branch): `herdr workspace create --cwd <repo>`, then attach agents there. caveat: a plain-branch herd shares the **single** repo checkout, so "reassign to a different branch" is a global `git checkout` with no isolation - prefer a worktree when you want a herd pinned to its own branch without disturbing other work.

### reassign a herd to a different worktree

an agent's **cwd is fixed at launch**, and herdr keys worktree-association on cwd - you cannot re-cwd a running agent. so reassigning a herd = **relaunching** it on the new worktree. handles are preserved; conversation + protocol seeding are **not**. handles must be unique, so the old herd comes down before the new one comes up.

```bash
git fetch origin main
NEW=$(herdr worktree create --branch chore/new-slug --base origin/main --no-focus --json)   # workspace auto-labels as "chore-new-slug"
WS=$(echo "$NEW"    | node "$H" field result.worktree.open_workspace_id)
WT=$(echo "$NEW"    | node "$H" field result.worktree.path)
ROOT1=$(echo "$NEW" | node "$H" field result.root_pane.pane_id)

herdr workspace close <old-herd-ws>            # take the OLD herd down -> frees the handles (sly/jay/tim)

# rebuild each agent on the new worktree, reusing the SAME handles (the assign / step-3 recipe):
herdr tab rename "${WS}:t1" "sly ◆"; herdr pane run "$ROOT1" "claude"
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

**seeding (required):** a cold agent knows neither this protocol nor its own handle. before relying on it, message each agent once with its handle, the teammate handles, and this protocol. they are not born knowing it. **promoting a solo agent into a herd counts as cold:** an agent you started alone - no handle, no protocol - does not become a herd member just because you added a second agent next to it. the moment a herd forms, seed the incumbent too (handle, roster, protocol), not only the newcomer, then announce both with `[herd +<handle>]`. "it was already running" is not "it knows the protocol."

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
- **only the home repo's worktree tree nests; plain workspaces don't** - the sidebar nests exactly one repo group (main checkout -> its linked worktrees -> tabs), keyed on `repo_root`. a `workspace create --cwd` workspace gets **no** repo association and floats ungrouped, even at a repo root. give each agent in a herd a *tab* in the herd's one workspace; make the herd a worktree if you want it to nest under the repo's main checkout.
- **workspace label vs tab truncation** - agent rows render as `<workspace> · <tab>`, and herdr labels a worktree's workspace with its (long) directory name, so the decorated `<handle> <glyph>` tab label can truncate in the collapsed sidebar; the handle reappears on focus/widen. that label is herdr's default - you don't rename it (see `## naming`).
- **`worktree remove` keeps the branch** - it removes the git worktree, its directory, the workspace, and all that workspace's tabs/agents, but not the branch (`git branch -D` separately).
- **`open` reattaches, `create` makes new branches** - `worktree open` opens a workspace on a worktree that *already exists* (errors `worktree_not_found` otherwise, **including** any worktree of a repo this session does not track); `worktree create --branch` only makes a *new* branch (errors if it exists). existing branch with no worktree -> `git worktree add` first, then `open` (only works for the home repo).
- **one repo per herdr session** - `worktree create` ignores the CLI cwd and always builds in the session's home/launch repo (verified: invoking it with cwd set to a different repo still produced a home-repo worktree). there is no way to manage a second repo's worktrees from one session; launch a separate `herdr --session <name>` inside that repo - that *is* a second session.
- **`worktree create`/`open` run from the repo's main-checkout workspace** - invoked from inside a linked worktree they error `linked_worktree_source` ("new and open worktree actions start from the repo parent workspace"). pass `--workspace <main-checkout-ws>` (or run from there); the CLI cwd does not select the source workspace, the flag does.
- **detect before `agent rename`** - a model launched with `pane run` is only renameable once herdr detects it. `herdr wait agent-status <pane> --status idle` first, or the rename misses the target.
- **decorated labels are manual** - `sly ◆` style labels are set with `tab rename`, not auto-derived. renaming the handle does not update the tab label; re-`tab rename` to keep them in sync.
- **the herd.js helper path comes from your orientation, not an env var** - `$CLAUDE_PLUGIN_ROOT` is not set in your shell, so don't build the path from it (it silently yields a broken `/skills/.../herd.js`). copy `H` from the `H=...` line in your herdr orientation. the claude-side path is version-pinned and moves on every comitatus update, so re-read it each session - a persisted path breaks after an upgrade. codex agents use the stable `$HOME/.codex/skills/herdr/scripts/herd.js`.
- **`agent start` needs both `--cwd` and `--workspace`** - the ad-hoc escape hatch (vs the default `pane run` in a tab) takes `--cwd <worktree-path>` for the working dir (the cwd association `agent list` uses) and `--workspace <id>` for pane placement; they are independent. `--workspace` alone leaves the agent on *your* cwd, editing the wrong tree.
- **cwd is the resolved path** - herdr stores an agent's `cwd` OS-resolved, so a symlinked root differs from what you launched with (macOS `/tmp` -> `/private/tmp`). when you filter `agent list` by cwd to find a herd, compare against the resolved path (`cd <dir>; pwd -P`), not the string you passed, or you'll see zero agents on a herd that is running fine.
- **ids are not durable** - re-read them; never reuse an old id.
- **read vs wait, and `recent` can lag** - `pane read` for output that already exists; `wait output` for output you expect next. `pane read --source recent` can come back **empty while a pane is still freshly producing output** (the scrollback render has not caught up); fall back to `--source visible` (the live viewport) or `wait output --match <text>` for the line you expect - do not read an empty `recent` as "nothing is there."
- **json output** - agent/workspace/pane commands print json; worktree commands print json with `--json`. `pane read` prints text; `send-text`/`send-keys`/`run` print nothing on success.
