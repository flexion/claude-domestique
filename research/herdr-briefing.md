# herdr capability briefing (docs + local verification)

Sources: herdr.dev/docs (concepts, agents, session-state, configuration, socket-api, plugins, marketplace, quick-start), verified against the locally installed `herdr 0.7.1` CLI on 2026-07-02. Items marked **(verified local)** were confirmed against the real binary; everything else is from docs.

## Object model

repo → worktree → workspace → tab → pane → agent. A pane is a real terminal owned by a background server; clients detach/reattach freely. A session is a persistent server namespace (default plus named sessions via `--session`). Agent states are semantic: `idle`, `working`, `blocked`, `done`, `unknown` — they drive waits, notifications, and sidebar rollups.

## State authority (why status is trustworthy for us)

Each pane has ONE status authority. For agents with installed integrations (lifecycle hooks), the integration is authoritative; otherwise herdr pattern-matches the live bottom-buffer screen snapshot against TOML manifests (auto-updated from herdr.dev without restart). **(verified local)** claude (v7), codex (v6), opencode (v7) integrations are all current on this machine — our herd's `agent_status` is hook-reported, not screen-scraped. `herdr agent explain <target>` debugs detection. Custom manifests: `~/.config/herdr/agent-detection/<agent>.toml`.

## CLI surface most relevant to comitatus (verified local, 0.7.1)

Targets accept **handles**, terminal ids, agent labels, and legacy pane ids — pane-id resolution is rarely needed:

- `herdr agent get <handle>` → full JSON: agent_status, pane_id, cwd, workspace_id, tab_id, session ref. **(verified local)**
- `herdr agent send <handle> <text>` — types literal text, NO Enter ("agent send writes literal text; use pane run when you want command text plus Enter" — from `agent --help`).
- `herdr agent wait <handle> --status <idle|working|blocked|unknown> [--timeout MS]` — server-side blocking wait **by handle**. Note: `done` is NOT in this list; `herdr wait agent-status <pane> --status <…|done|…>` (by pane) does accept `done`.
- `herdr agent start <name> [--cwd PATH] [--workspace ID] [--tab ID] [--split right|down] [--env K=V] [--no-focus] -- <argv…>` — creates the pane, runs argv, and assigns the agent name in ONE command (collapses pane run + wait + rename).
- `herdr agent read <handle> [--source visible|recent|recent-unwrapped] [--lines N]` — read a pane by handle.
- `herdr wait output <pane> --match <text> [--regex] [--source …] [--timeout MS]` — block until text appears in a pane. This is the native primitive for confirming a typed message reached a slow composer BEFORE pressing Enter.
- `herdr pane send-keys <pane> <key>…` / `send-text` / `run` (run = text + Enter).
- `herdr worktree create|open|list|remove [--json]`; `remove --workspace <id> --force` removes worktree + dir + workspace + all tabs/agents (branch survives).
- `herdr notification show <title> [--body …] [--sound none|done|request]`.
- `herdr plugin install <owner>/<repo>[/subdir]` / `link <path>` / `list --json` / `action list|invoke` / `pane open|focus|close` / `log list`. **(verified local — full plugin subsystem present in 0.7.1)**

## Socket API beyond the CLI

Newline-delimited JSON over `~/.config/herdr/herdr.sock` (env `HERDR_SOCKET_PATH`; named sessions under `~/.config/herdr/sessions/<name>/`). Adds over the CLI:

- **`events.subscribe`** (filters: type, pane_id, agent_status) and **`events.wait`** (one-shot). Event types include `pane.agent_status_changed`, `pane.output_matched`, `pane.agent_detected`, `pane.exited`, `worktree.created|opened|removed`, workspace/pane lifecycle. The CLI has no `events` verb in 0.7.1 — subscriptions are socket-only.
- `pane.wait_for_output`, `pane.process_info`, `layout.export` / `layout.apply` (portable BSP layout trees).
- `pane.report_agent` / `report_metadata` — plugins can report agent state or display-only status labels.

Every process herdr launches inherits `HERDR_SOCKET_PATH`, `HERDR_ENV=1`, `HERDR_WORKSPACE_ID`, `HERDR_TAB_ID`, `HERDR_PANE_ID` (comitatus already uses `HERDR_PANE_ID` for sender identity — sound).

## Plugin system (the native extension mechanism)

A herdr plugin is a GitHub repo (or local dir) with `herdr-plugin.toml`: `id`, `name`, `version`, `min_herdr_version` (required), `platforms`, plus `[[build]]` (run at install), `[[actions]]` (callable entrypoints, any language), `[[events]]` (hooks: `on = "<event>"` → command), `[[panes]]` (TUI panes: overlay/split/tab/zoomed), `[[link_handlers]]` (URL regex → action). Runtime env gives plugins `HERDR_PLUGIN_ROOT/CONFIG_DIR/STATE_DIR`, `HERDR_PLUGIN_CONTEXT_JSON` (workspace/tab/pane/worktree/agent context), `HERDR_PLUGIN_EVENT_JSON` for hooks, and `HERDR_BIN_PATH`. "The entire Herdr CLI is the plugin API." Install: `herdr plugin install owner/repo`; dev loop: `herdr plugin link <path>`. Marketplace = automatic index of the GitHub topic `herdr-plugin`, refreshed every 30 min, unreviewed.

**Open question (spike needed):** whether `herdr plugin action invoke <id>` can carry arbitrary arguments (e.g. handle + message). Docs describe actions as context-driven (`HERDR_PLUGIN_CONTEXT_JSON`), not argv-driven. If args don't pass, plugin actions suit UI/keybinding/event flows, not an agent CLI — which changes how we'd package a messaging verb.

## Session state / persistence

- Detach/reattach: everything survives (server keeps running).
- Server restart: structure/cwd/layout restored; processes die. **Native agent session restore is on by default** — supported integrations (claude ≥v6 `claude --resume <id>`, codex ≥v5, …) relaunch agents into their native conversation sessions across restarts. Directly relevant: a herd survives a herdr restart with conversations intact — "reassign = relaunch cold" applies to re-cwd, not to restarts.
- Live handoff (experimental): `herdr update --handoff` keeps panes alive across server replacement.
- Pane screen history replay: off by default (may persist secrets to `session-history.json`).

## Notifications

`[ui.toast]` config: delivery `off|herdr|terminal|system`, `delay_seconds` suppression, per-OS backends (macOS: terminal-notifier/AppleScript). Socket `notification.show` responses report `shown|disabled|rate_limited|no_foreground_client|busy` — programmatic operator alerts are rate-limited and best-effort.

## Facts that invalidate current comitatus assumptions

1. `herdr agent wait <handle>` exists — waiting does not require pane-id resolution or client-side polling (single status only; no `done` in the agent-wait status set, unlike `wait agent-status`).
2. `herdr agent start` collapses tab-pane-run-wait-rename into one command that also names the agent (placement via `--tab` needs a spike for the tab-per-agent convention).
3. `herdr wait output --match` can deterministically confirm composer ingest before submitting — the Enter race does not need blind retry loops.
4. `herdr agent get <handle>` returns single-agent JSON — the `herdr agent list | node herd.js <extract>` pipe is unnecessary for single-target queries.
5. The plugin system is present in stable 0.7.1 and is herdr's own answer to "stable, versioned, agent-agnostic helper distribution" — which comitatus currently hand-rolls with 201 lines of hashing/atomic-rename provisioning.
6. Socket `events.subscribe` enables event-driven messaging (deliver-on-idle) instead of status polling.
