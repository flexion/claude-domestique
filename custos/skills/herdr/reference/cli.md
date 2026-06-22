# herdr cli - full command reference

flag-by-flag surface for the herdr socket cli. the [SKILL.md](../SKILL.md) covers the common
worktree-and-agent flows; this file is a flag-by-flag lookup of the commands this skill uses - it is
**not** every subcommand (some `server`/`channel` admin verbs, e.g. `channel show`, `server
agent-manifests`, are omitted). usage lines are taken from `herdr <family> --help` on the running binary.

## output conventions

- agent, workspace, tab, and pane query commands print json by default.
- worktree commands print human text unless you pass `--json`.
- `pane read` prints text (or ansi with `--format ansi` / `--ansi`).
- `pane send-text`, `pane send-keys`, `pane run` print nothing on success; `agent send` returns a JSON ack (`{"id":"cli:agent:send","result":{"type":"ok"}}`).
- ids are opaque and non-durable (`w8`, `w8:t1`, `w8:p1`). re-read them; never reuse an old id.

## worktree

```
herdr worktree list   [--workspace ID | --cwd PATH] [--json]
herdr worktree create [--workspace ID | --cwd PATH] [--branch NAME] [--base REF] [--path PATH] [--label TEXT] [--focus] [--no-focus] [--json]
herdr worktree open   [--workspace ID | --cwd PATH] (--path PATH | --branch NAME) [--label TEXT] [--focus] [--no-focus] [--json]
herdr worktree remove --workspace ID [--force] [--json]
```

- `create --branch` always creates a **new** branch (`git worktree add -b`); it errors if the
  branch already exists. `create --base REF` resolves the **local** ref and does not fetch; run
  `git fetch origin main` first for a fresh `origin/main`.
- `open` opens a workspace on a worktree that **already exists** (by `--path` or `--branch`); it
  errors `worktree_not_found` if no worktree exists for the branch. for an existing branch with no
  worktree, run `git worktree add <path> <branch>` first, then `open --path <path>`. open's json
  includes `result.already_open`.
- default checkout path: `~/.herdr/worktrees/<repo>/<branch-slug>` (branch slashes -> dashes,
  lowercased). `--path` overrides.
- `remove` deletes the git worktree, its directory, and the one named workspace. it does **not**
  close sibling workspaces sharing the cwd, and does **not** delete the branch.

json fields:
- `worktree list` -> `result.worktrees[]`: `branch`, `path`, `open_workspace_id`,
  `is_linked_worktree`, `is_prunable`, `label`. plus `result.source` (repo_root, source_workspace_id).
- `worktree create` -> `result.worktree.path`, `result.worktree.open_workspace_id`,
  `result.workspace.workspace_id`, `result.root_pane.pane_id`, `result.tab.tab_id`.
- `worktree remove` -> `result.path`, `result.workspace_id`, `result.forced`.

## agent

```
herdr agent list
herdr agent get    <target>
herdr agent read   <target> [--source visible|recent|recent-unwrapped] [--lines N] [--format text|ansi] [--ansi]
herdr agent send   <target> <text>
herdr agent rename <target> <name>|--clear
herdr agent focus  <target>
herdr agent wait   <target> --status idle|working|blocked|unknown [--timeout MS]
herdr agent attach <target> [--takeover]
herdr agent start  <name> [--cwd PATH] [--workspace ID] [--tab ID] [--split right|down] [--env KEY=VALUE] [--focus|--no-focus] -- <argv...>
herdr agent explain <target> [--json]
herdr agent explain --file PATH --agent LABEL [--json]
```

- a `<target>` accepts terminal ids, unique agent names (handles), detected/reported agent labels,
  and legacy pane ids.
- `agent start <name>`: the `<name>` positional becomes the agent's handle (`result.agent.name`).
  the argv after `--` is the program to launch. the two location flags are **independent**:
  `--cwd <path>` sets the agent's working directory (the worktree association that `agent list`
  and cwd-filters depend on), and `--workspace <id>` only places the pane in that workspace. pass
  **both** to bind an agent to a worktree. with neither, the agent inherits the caller's cwd and
  current workspace; with `--workspace` only, the pane is placed but the cwd is still the caller's.
- `agent send` writes literal text only - no Enter; submit with `pane send-keys <pane> Enter`. the
  Enter is dropped only while the agent is `working` (`idle` and `done` both accept it), so for a
  reply-expecting message just send and let the reply confirm (resend on silence) - pre-check
  not-`working` only for no-reply messages. a fresh agent is `idle`; one that finished an **unviewed**
  turn is `done` (UI focus can clear it to `idle`). see the from/to protocol in SKILL.md.
- codex-specific: long `agent send` / `pane send-text` text may enter the codex TUI as bracketed
  paste, and a single Enter may not submit it. keep protocol messages short and one-line; if a
  long codex send goes silent, send one extra Enter or retry as shorter one-line chunks.
- `agent rename <target> <handle>` sets the handle (also the pane label); `--clear` removes it.
  the rename target must already be **detected** as an agent - `wait agent-status <pane> --status
  idle` after launching with `pane run`, or the rename misses.

two ways to launch an agent:
- **default (one workspace per worktree, one tab per agent)** - give each agent its own tab in
  the worktree's workspace: `tab create --workspace <ws> --cwd <wt> --label "<decorated>"`, then
  `pane run <root-pane> "<argv>"`, `wait agent-status idle`, `agent rename <pane> <handle>`. this
  keeps the worktree's agents grouped under one sidebar node. see SKILL.md step 3.
- **`agent start` (ad-hoc extra pane)** - adds a *named* agent pane to an existing workspace.
  pass `--cwd <worktree-path>` (the working-dir association) **and** `--workspace <id>` (pane
  placement); they are independent. `--workspace` only leaves the agent on the caller's cwd. does
  not give the clean one-tab-per-agent grouping.

model launch argv:
- claude: `claude`
- codex: `codex`
- opencode + a local ollama model: `opencode -m ollama/qwen2.5:7b`
  (`opencode models` lists ids; format is `provider/model`.)

decorated tab-label glyphs (from the legacy spawn convention): claude `◆`, codex `◇`,
opencode `⬨`. format is `<handle> <glyph> <agent-type>`, set with `tab rename`. keep the
workspace label short - rows render as `<workspace> · <tab>`.

json fields (`agent list` -> `result.agents[]`): `name` (handle), `agent` (integration type:
claude/codex/opencode/...), `agent_status`, `cwd`, `foreground_cwd`, `workspace_id`, `tab_id`,
`pane_id`, `terminal_id`, `focused`, `revision`, `agent_session`.

## workspace

```
herdr workspace list
herdr workspace create [--cwd PATH] [--label TEXT] [--env KEY=VALUE] [--focus] [--no-focus]
herdr workspace get    <workspace_id>
herdr workspace focus  <workspace_id>
herdr workspace rename <workspace_id> <label>
herdr workspace close  <workspace_id>
```

- `create --cwd <path>` opens a **plain** workspace rooted at that directory. it gets **no** repo
  association (no `worktree` field) and does **not** nest - even at a repo root or worktree path it
  floats ungrouped (verified). to put an agent on a worktree that nests under the repo, use `worktree
  create`/`open`, then add tabs.
- json: `create` -> `result.workspace.workspace_id`, `result.tab.tab_id`, `result.root_pane.pane_id`.

## tab

```
herdr tab list   [--workspace <workspace_id>]
herdr tab create [--workspace <workspace_id>] [--cwd PATH] [--label TEXT] [--env KEY=VALUE] [--focus] [--no-focus]
herdr tab get    <tab_id>
herdr tab focus  <tab_id>
herdr tab rename <tab_id> <label>
herdr tab close  <tab_id>
```

- json: `create` -> `result.tab.tab_id`, `result.root_pane.pane_id`.

## pane

```
herdr pane list         [--workspace <workspace_id>]
herdr pane current      [--pane ID|--current]
herdr pane get          <pane_id>
herdr pane layout       [--pane ID|--current]
herdr pane process-info [--pane ID|--current]
herdr pane neighbor     --direction left|right|up|down [--pane ID|--current]
herdr pane edges        [--pane ID|--current]
herdr pane focus        --direction left|right|up|down [--pane ID|--current]
herdr pane resize       --direction left|right|up|down [--amount FLOAT] [--pane ID|--current]
herdr pane zoom         [<pane_id>|--pane ID|--current] [--toggle|--on|--off]
herdr pane rename       <pane_id> <label>|--clear
herdr pane read         <pane_id> [--source visible|recent|recent-unwrapped] [--lines N] [--format text|ansi] [--ansi]
herdr pane split        [<pane_id>|--pane ID|--current] --direction right|down [--ratio FLOAT] [--cwd PATH] [--env KEY=VALUE] [--focus] [--no-focus]
herdr pane swap         --direction left|right|up|down [--pane ID|--current]
herdr pane swap         --source-pane ID --target-pane ID
herdr pane move         <pane_id> --tab <tab_id> --split right|down [--target-pane ID] [--ratio FLOAT] [--focus|--no-focus]
herdr pane move         <pane_id> --new-tab [--workspace ID] [--label TEXT] [--focus|--no-focus]
herdr pane move         <pane_id> --new-workspace [--label TEXT] [--tab-label TEXT] [--focus|--no-focus]
herdr pane close        <pane_id>
herdr pane send-text    <pane_id> <text>
herdr pane send-keys    <pane_id> <key> [key ...]
herdr pane run          <pane_id> <command>
```

- `pane split` -> new pane id at `result.pane.pane_id`.
- `pane run` sends the text and then a real Enter in one request. `pane send-text` sends text with
  no Enter; `pane send-keys` sends keys (e.g. `Enter`).
- read sources: `visible` = viewport, `recent` = scrollback as rendered, `recent-unwrapped` = recent
  text with soft wraps joined (the transcript `wait output --source recent` matches against).

agent-detection plumbing (rarely needed by hand; integrations emit these):

```
herdr pane report-agent         <pane_id> --source ID --agent LABEL --state idle|working|blocked|unknown [--message TEXT] [--custom-status TEXT] [--seq N] [--agent-session-id ID] [--agent-session-path PATH]
herdr pane report-agent-session <pane_id> --source ID --agent LABEL [--seq N] [--agent-session-id ID] [--agent-session-path PATH]
herdr pane release-agent        <pane_id> --source ID --agent LABEL [--seq N]
herdr pane report-metadata      <pane_id> --source ID [--agent LABEL] [--applies-to-source ID] [--title TEXT|--clear-title] [--display-agent TEXT|--clear-display-agent] [--custom-status TEXT|--clear-custom-status] [--state-label STATUS=TEXT] [--clear-state-labels] [--seq N] [--ttl-ms N]
```

## wait

```
herdr wait output       <pane_id> --match <text> [--source visible|recent|recent-unwrapped] [--lines N] [--timeout MS] [--regex] [--raw]
herdr wait agent-status <pane_id> --status idle|working|blocked|done|unknown [--timeout MS]
```

- on timeout the exit code is `1`.
- `wait output --source recent` matches the unwrapped transcript, so pane width and soft wrapping do
  not break matches.

## notification

```
herdr notification show <title> [--body TEXT] [--position top-left|top-right|bottom-left|bottom-right] [--sound none|done|request]
```

## integration

manage the built-in agent integrations herdr uses to detect and drive agents.

```
herdr integration install   <pi|omp|claude|codex|copilot|devin|droid|kimi|opencode|kilo|hermes|qodercli|cursor>
herdr integration uninstall <same set>
herdr integration status [--outdated-only]
```

- install the integration for an agent before relying on herdr to detect its status (e.g.
  `herdr integration install opencode`).

## session

```
herdr session list   [--json]
herdr session attach <name>
herdr session stop   <name> [--json]   # use 'default' to target the default session
herdr session delete <name> [--json]
```

## config / channel / server (top-level)

```
herdr config reset-keys              # back up config.toml, remove custom keybindings
herdr server reload-config           # reload config.toml in the running server
herdr server stop                    # stop the running server via the api socket
herdr channel set <stable|preview>   # choose update channel
herdr status [server|client]         # show client/server status
herdr update [--handoff]             # download and install the latest version
```

## json parsing pattern

the established pattern (matches the SKILL.md recipes) is a `python3 -c` one-liner reading stdin:

```bash
herdr agent list | python3 -c 'import sys,json; d=json.load(sys.stdin); print([a.get("name") or a["agent"] for a in d["result"]["agents"]])'
```

pass shell values as argv (not string interpolation) to keep quoting sane:

```bash
herdr agent list | python3 -c 'import sys,json; wt=sys.argv[1]; d=json.load(sys.stdin); print("\n".join(a["workspace_id"] for a in d["result"]["agents"] if a.get("cwd")==wt))' "$WORKTREE_PATH"
```
