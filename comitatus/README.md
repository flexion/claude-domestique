# comitatus

Packages [herdr](https://herdr.dev) agent orchestration, local agent mail and Teams
chat messaging for Claude Code and Codex. `comitatus` is Latin for a retinue or band of
companions — the followers who travel and work together under one leader.

## Responsibilities: herdr vs. the skill vs. comitatus

Three layers cooperate. Keeping them distinct is what makes the plugin small and
keeps it from drifting when herdr changes.

| Layer | What it is | Owns | Does **not** own |
|-------|-----------|------|------------------|
| **herdr** | The terminal-native multiplexer binary (`herdr`), installed from [herdr.dev](https://herdr.dev). | The entire command surface and runtime: worktrees, workspaces, tabs, panes, and agents; `agent start/prompt/read/wait`, `worktree`/`tab`/`pane`/`workspace` verbs; agent **detection integrations** (`~/.codex/herdr-agent-state.sh` and friends) that read each agent's status. The authoritative source for flags — run `herdr <verb> --help`. | Any notion of a "herd" as a team, the roster/naming convention, or the agent-to-agent messaging protocol. |
| **herdr skill** (`comitatus:herdr`) | A curated workflow skill authored under `skills/herdr/`, invoked from inside a herdr pane. | The *conventions layer* herdr has no opinion on: the herd roster + short-handle naming, the `[from <self> reply\|fyi #<id>]` messaging protocol and how to read a send result, the briefing template, and launch, worktree and teardown sequences composed from native `herdr` and `git` commands. Points at `herdr <verb> --help` for CLI flags rather than re-teaching them. | The herdr CLI itself (it calls it), and herdr's detection integrations. There is no helper script. |
| **comitatus** (this plugin) | The Claude Code and Codex plugin that packages and delivers the skill. | Delivery + activation: the SessionStart hook that gates on `HERDR_ENV=1`, injects orientation, and reports whether comitatus is installed as a Codex plugin; the `/herd-setup` permission allow-list. The orientation hook writes nothing; the mail hook writes only under `~/.comitatus` (see [Mail](#mail)); `/herd-setup` edits a settings file only when you run it. | herdr's binary, its integrations, and the skill's *content* semantics (it ships the files, it doesn't decide what they say). |

**Rule of thumb:** if it is a herdr command or agent-status mechanic, it belongs to
herdr; if it is "how a team of agents coordinates," it belongs to the skill; if it
is "get that skill in front of the right agent with the right permissions," it
belongs to comitatus.

## What comitatus ships

- The `herdr` skill (invoked `comitatus:herdr`) for driving herdr from inside it:
  worktrees, workspaces, tabs/panes, agents, messaging, and waiting on state —
  all over the `herdr` CLI.
  It also carries the multi-agent rules: one writer per tree, evidence-based
  completion, ordered integration, and cleanup that adjudicates rather than
  sweeps. 1.0.0 removed the `comitatus:fan-out` skill, its role files, and its
  run verbs; git and the native `herdr` verbs carry that state now.
- A SessionStart hook that injects herdr orientation only inside herdr
  (`HERDR_ENV=1`), plus a one-line `comitatus:teams` pointer in every session.
  Inside herdr it injects a short orientation naming the native verbs and the
  skill. It writes nothing anywhere — a codex agent gets the skill by installing
  the plugin, and the orientation reports whether it has.
- `/herd-setup`, which merges a safe allow-list of native herdr and read-only
  git commands into your Claude settings, and lists the Codex prefix rules for
  you to add yourself.
- The `teams` skill (`comitatus:teams`) for explicit chat send/receive. Sends use
  the installed Graph PowerShell commands with independent process-scoped sign-in;
  reads can also use a Microsoft 365 connector.

2.0.0 removed the `herd.js` and `up.js` helper scripts. See
[Changes in 2.0.0](#changes-in-200) for what each helper behavior became.

## Installing

The herdr workflows require [herdr](https://herdr.dev). Local mail and Teams
messaging also work outside herdr; Teams requires PowerShell and the Microsoft
Graph authentication module, and under Codex a writable `~/.mg` and sandbox network
access (see [Teams chat messaging](#teams-chat-messaging)).

### 1. Install herdr and its agent integrations

Install the herdr binary from [herdr.dev](https://herdr.dev) (and keep it current
with `herdr update`). Then install herdr's integration for each agent you will
run in a herd - this is how herdr detects and drives an agent (status,
messaging), and the codex integration is what wires codex into herdr at runtime:

```bash
herdr integration install claude
herdr integration install codex     # for codex agents in a herd
herdr integration status            # verify (--outdated-only flags stale ones)
```

**Why this matters.** Without the integration installed and current, herdr cannot
reliably read an agent's `agent_status`, so `herdr agent wait --until <state>` and
the push-first messaging the skill depends on silently break. The codex integration
is herdr's *own* codex hookup (e.g. `~/.codex/herdr-agent-state.sh`) and is
**distinct from** the comitatus plugin: herdr's integration makes codex
participate in the herd; comitatus delivers the skill that tells codex how to
drive herdr. You need both, and you install each one yourself — comitatus never
writes into `~/.codex` and never touches herdr's integration files.

### 2. Install the comitatus plugin

Claude Code:

```bash
/plugin marketplace add flexion/claude-domestique
/plugin install comitatus@claude-domestique
```

Codex:

```bash
codex plugin marketplace add flexion/claude-domestique
codex plugin add comitatus@claude-domestique
```

No init step—the skill and hook load in a new session. Claude users may run
`/reload-plugins` to pick up an installation immediately.

On Codex the skill is available as soon as the plugin installs, but the
`SessionStart` hook is not: Codex holds plugin hooks until you review and trust
them via `/hooks` in a new thread. (Hooks are on by default; the
`[features] hooks` setting in `~/.codex/config.toml` only matters if they were
turned off.) Until you trust them you can invoke the herdr skill by hand, but you
will not get the automatic in-herd orientation or the status line.

### Install at the user level (recommended)

Claude Code can enable a plugin at three scopes, each recorded in a different
settings file:

| Scope | Settings file | Enabled in |
|-------|---------------|------------|
| **user** (recommended) | `~/.claude/settings.json` | every session, every repo |
| project | `.claude/settings.json` (committed) | sessions started in that repo, for the whole team |
| local | `.claude/settings.local.json` (gitignored) | sessions started in that repo, you only |

`/plugin install` defaults to **user** scope; add `--scope project` or
`--scope local` to change it. Precedence is local > project > user (a managed/IT
scope overrides all).

Prefer **user** scope for comitatus. Its herdr orientation activates on whether the session is
running inside a herdr pane (see Behavior modes), which has nothing to do with
which repo you opened - so "enabled everywhere" matches how herdr is actually
used. Project or local scope leaves comitatus silent in every herdr session you
launch from a different repo, which is rarely what you want. Reach for project
scope only if one repo is the sole place you ever drive herdr and you want
teammates to get it automatically. Note that scope only controls *when the hook
runs*; Codex support is a separate installation you make with
`codex plugin add comitatus@claude-domestique`.

## Behavior modes

The herdr orientation keys off a single signal: the `HERDR_ENV=1` environment variable,
which herdr sets only inside the panes it spawns and which is inherited by
processes launched there. Whether herdr is *installed* is irrelevant - what
matters is whether the current session is running *inside* a herdr pane.
This table covers herdr orientation. Mail is on in every session unless
`COMITATUS_ALIAS=off` (see [Mail](#mail)); Teams messaging is explicitly invoked through its skill. From
2.4.0 the SessionStart hook injects one line pointing at `comitatus:teams` in every
session, inside herdr or not.

| Situation | `HERDR_ENV` | comitatus |
|-----------|-------------|-----------|
| Plain terminal, no herdr | unset | **Dormant** |
| Plain terminal, herdr installed but session not launched from a herdr pane | unset | **Dormant** |
| Inside a herdr pane | `1` | **Active** |

**Dormant** - the SessionStart hook skips herdr orientation:

- No herdr orientation injected, no `comitatus` status line, no files written.
  The orientation hook injects only the one-line `comitatus:teams` pointer; mail
  runs separately (see [Mail](#mail)).
- The `comitatus:herdr` skill is present in the catalog but self-gated: invoking
  it from outside a herdr pane makes it stop and report that you are not in a
  herdr-managed pane, so it will not reach into a live herdr from the wrong
  place.

**Active** - inside a herdr pane:

- Injects a short orientation telling the agent it is inside herdr, to use the
  `comitatus:herdr` skill, and which native `herdr agent` verbs carry messages.
- Shows the `📍 Comitatus: herdr` status line, suffixed `(codex: installed)` or
  `(codex: not installed)` to report whether comitatus is installed as a Codex
  plugin — so you can tell at a glance whether codex peers in this herd can see
  the `herdr` skill.
- Reports the same in the injected orientation, including the
  `codex plugin add comitatus@claude-domestique` command when it is missing.
- Un-gates the `comitatus:herdr` skill so the current agent can orchestrate the herd.

Each host installs comitatus for itself. The hook only **reports** Codex install
status; it never writes into `~/.codex`.

Installing herdr does not wake comitatus up; launching Claude *from within* herdr
does. For testing, you can force the active path with `HERDR_ENV=1 claude` from a
normal terminal.

## Permissions (cutting prompt friction)

Driving a herd means many small `herdr` calls, and each harness approves them its
own way. Removing the helper scripts did not remove approvals: every native
command needs a grant of its own.

**Claude Code: `/herd-setup`.** Run it once to merge an allow-list into
`settings.json` (user scope by default; `--local` or `--project` to change). It
allows the read, messaging, wait and lifecycle verbs, `git fetch`, `git remote`,
and read-only `git status`/`branch`. No rule names a machine-specific path, so
every scope gets the same list.

**What stays prompting, on purpose.** `/herd-setup` never allows:
- `herdr agent start`. Arguments after `--` reach the agent CLI unchanged and can
  carry permission-bypass flags, so each launch is a human approval.
- `herdr pane run`, `pane send-keys` and `agent send-keys`, which are raw shell
  and keystroke injection.
- `git branch -D`, `git reset`, `git checkout`, `git push`, `git merge` and
  `git worktree remove`.
- Any `node` or interpreter rule.

`herdr worktree remove` *is* allowed, because it tears down a herdr worktree,
not git history. Re-running is idempotent, warns on `deny`/`ask` conflicts, and
never removes a rule.

**Codex.** Commands that match no rule in `$CODEX_HOME/rules/default.rules` run
in a sandbox that blocks the herdr socket, and fail with
`Operation not permitted`. `/herd-setup` lists the prefix rules a member needs
(`herdr agent prompt|list|get|read|wait`); add them yourself. Rules for these
verbs carry no version path and no message body, so they survive upgrades.

## Single source of truth

Each skill has one canonical copy under `skills/`. Codex and
Claude load those identical files from their own installed copy of the plugin.
Nothing is copied between hosts, so there is no fork and no shadow copy to keep
in sync.

## Uninstalling

The Claude side uninstalls cleanly through Claude Code (`/plugin uninstall
comitatus@claude-domestique`). Codex uninstalls with
`codex plugin remove comitatus@claude-domestique`. Uninstall Claude from each scope you enabled it at
(`--scope user|project|local`, mirroring how you installed it); `/plugin disable`
turns it off without removing it.

Since 2.0.0 the orientation hook writes nothing outside the plugin directory. `/herd-setup` edits a settings file when you run it, and since 2.3.0 the mail hook keeps its roll, mailboxes and state under `~/.comitatus` (or `$COMITATUS_HOME`); remove that directory to clear them. Versions 0.x
and 1.x provisioned a copy of the skill at `~/.claude/comitatus/` to give the
`herd.js` helper a stable path. 2.0.0 neither updates nor deletes that copy, and
nothing reads it any more. Remove it by hand if you want a clean slate:

```bash
rm -rf ~/.claude/comitatus
```

Nothing is ever written into `~/.codex`. Earlier versions of comitatus
content-hash-synced the skill into `~/.codex/skills/herdr/` so codex agents could
see it before comitatus was installable as a Codex plugin. That path is gone. If
you ran one of those versions, remove the leftover copy — the `.comitatus-hash`
marker inside confirms comitatus wrote it:

```bash
rm -rf ~/.codex/skills/herdr
```

This plugin does not touch `~/.codex/hooks.json` or herdr's own
`~/.codex/herdr-agent-state.sh`, so nothing else needs cleanup.

## Mail

From 2.3.0, every Claude and Codex session with comitatus installed publishes a discovery card and exchanges best-effort durable mail through the comitatus hooks, inside herdr or not. (2.1 and 2.2 required `COMITATUS_HANDLE`.) The `comitatus:mail` skill covers finding, sending and doorbells.

```text
<root>/roll/<participant>.json     card: who, where, status, live routes
<root>/mail/<participant>/         drop: senders write <id>.json here
<root>/state/<participant>/        recently delivered ids, and the alias file
```

`<root>` is `$COMITATUS_HOME`, or `~/.comitatus` under the account home. A participant is the agent kind, its settings home and its conversation id, so it survives `--resume`. Hooks deliver waiting mail at session start, prompt submission, after each tool call and at turn end. A content-free doorbell (herdr pane, Claude socket or `codex queue`) wakes an idle recipient.

**Two names.** A participant's **handle** (`fg6avs`) is derived from its participant key: six characters, never `0`, `o`, `1` or `l`, stable for the session and across `--resume`. It goes in `from` and anywhere a name is resolved later. Its **alias** (`tim`) is an optional human label that can change at any time and need not be unique. Received mail renders as `from=fg6avs (tim)`, with the alias looked up on the roll.

| Setting | Effect |
| --- | --- |
| nothing | participates; inside herdr the alias follows the herdr member name, otherwise there is none |
| `COMITATUS_ALIAS=<name>` | participates with that alias at session start |
| `COMITATUS_HANDLE=<name>` | deprecated synonym: sets the alias, not the handle |
| `COMITATUS_ALIAS=off` (or `COMITATUS_HANDLE=off` when `COMITATUS_ALIAS` is unset) | the mail hooks stay silent and write nothing |

An agent renames itself by writing a call-sign (`^[a-z][a-z0-9-]{0,31}$`) to `<root>/state/<participant>/alias`. That file wins over the environment, and the next hook event publishes it. Inside herdr, the hook asks `herdr agent get <pane>` for the member name at session start and at every turn boundary (not per tool call). The first name it sees fills an empty alias, and a later herdr rename replaces the alias when it is observed. Changes are tracked at turn boundaries, so an alias written between a herdr rename and the next lookup is overwritten, and a rename and back between two lookups goes unnoticed.

Each session start sweeps the roll. It removes cards whose host process has exited, and cards not republished within 7 days. It also removes a participant's mailbox and state once that participant has had no card and no activity for 7 days: first mail past its TTL (which pickup would drop unread anyway), then the mailbox if it is empty, then the state. Every participant has a lock file, `<root>/state/<participant>.lock`. Its own hooks hold it while they run, and the sweep changes nothing of a participant without holding it, so a session that resumes mid-sweep keeps its card, mail, alias and delivered ids. A session resumed after its directories were reclaimed starts fresh, with its alias reseeded from the environment or herdr.

**Known limits:**
- No disk flush, no exactly-once delivery, no delivery receipt, and no sender authentication within one OS user.
- A crash at the wrong moment can lose a message.
- Handles are not guaranteed unique (about 30 bits). If two cards share one, a sender prefers the newer.
- A Codex sender needs write access to `<root>/mail`; see `/herd-setup`.
- A Codex sandbox cannot ring a Claude socket. That mail then arrives on the recipient's next turn.
- Untested on Linux.

Setting `COMITATUS_ALIAS=off` stops a session from publishing, but does not remove a card it already published. To withdraw one immediately, delete its card, drop and state:

```bash
rm -rf <root>/roll/<participant>.json <root>/mail/<participant> <root>/state/<participant>
```

## Teams chat messaging

From 2.2.0, `comitatus:teams` provides explicit send/receive commands for an
existing Teams chat through `Microsoft.Graph.Authentication`. See the
[Teams skill](skills/teams/SKILL.md) for setup and usage.

From 2.4.0 every send goes through the Graph PowerShell commands. The skill
tells agents not to send through the Microsoft 365 connector's
`teams_send_chat_message`, which has not been granted `ChatMessage.Send`. Reads can
use the connector: the skill calls `get_granted_scopes`, and reads with
`read_resource` when `Chat.Read` or `Chat.ReadWrite` is granted. The PowerShell
route gained a module check that asks before installing, guidance on finding the
tenant ID and which Teams links carry a chat ID, a single-script pattern for shells
that run one command per call, a one-line scope check in place of a context dump,
and a quiet disconnect.

Each agent signs in independently in a private PowerShell process using
`-ContextScope Process`. Tenant and decoded chat IDs are supplied at runtime as
`COMITATUS_TEAMS_TENANT_ID` and `COMITATUS_TEAMS_CHAT_ID`; no conversation destination
ships with the plugin. The skill composes `Import-Module`, `Connect-MgGraph`,
`Invoke-MgGraphRequest` and `Disconnect-MgGraph` directly: no comitatus runtime
helper or plugin-cache path is needed. Examples send plain text, read a page or a
specific message, and retain Graph message IDs and pagination links. They do not
connect Teams to the local mail hooks or automatically wake an agent.

The implementation uses the same Graph PowerShell path demonstrated by a
three-message exchange between two independent clients. Offline tests execute the
skill's actual PowerShell examples with SDK commands stubbed when `pwsh` is
available; they do not authenticate or post to Teams. The Microsoft
Graph Command Line Tools application can carry broader existing consent than the
two chat scopes requested; process isolation does not narrow that consent.

### Codex sandbox requirements

Under Codex's `workspace-write` sandbox, Teams sign-in fails until two settings
are granted:

- **`~/.mg` as a writable root.** `Connect-MgGraph` writes
  `~/.mg/mg.authrecord.json` even with `-ContextScope Process`; the sandbox denies
  it (`Access to the path '.../.mg/mg.authrecord.json' is denied`). Create the
  folder once with `mkdir -p ~/.mg`.
- **Network access.** The sandbox blocks network by default, so Graph and the
  sign-in endpoint are unreachable.

In `$CODEX_HOME/config.toml` (usually `~/.codex/config.toml`), with your home
directory written out:

```toml
[sandbox_workspace_write]
writable_roots = ["/Users/<you>/.mg"]
network_access = true
```

Or per launch: `codex --add-dir ~/.mg -c sandbox_workspace_write.network_access=true`.
In a herd, pass those after `--` to `herdr agent start`. Both settings widen the
sandbox for every command the agent runs. Codex agents should also run PowerShell
with `-NonInteractive -File`: an interactive `pwsh` loads PSReadLine, which writes
its history file outside the workspace and is denied.

Verified with `codex sandbox` on codex-cli 0.166.0: writing to `~/.mg` is denied
without the writable root and allowed with it, and Graph is unreachable without
`network_access` while sign-in reaches the device-code prompt with it.

Other notes from the #209 live test: a device code expires after 120 seconds, so
relay it at once; a message link carries both the chat and tenant IDs; and a
conversation signs in once in a background script that serves request files
instead of signing in per message.

## Changes in 2.0.0

2.0.0 removed `skills/herdr/scripts/herd.js` and `up.js`. The skill now composes
native `herdr` (0.9.5 or later) and `git` commands. What each helper behavior
became:

| 1.x helper behavior | 2.0.0 | Retained or changed |
| --- | --- | --- |
| `status`, `members` | `herdr agent list` / `agent get`, filtered by `workspace_id` | Changed: native JSON instead of helper output. |
| `send`: sender stamp, `reply`/`fyi`, random `#id` | The envelope is a protocol convention you type. The sender is your assigned handle; the id is one you pick. | Retained as convention. The helper no longer infers the sender from `HERDR_PANE_ID`. |
| `send`: per-recipient filesystem lock | herdr's own per-terminal submission queue | Changed: no lock. herdr 0.9.5 serializes text plus Enter on Unix and Windows. The lock also paced senders through observation and echo reads; that pacing is gone. |
| `send`: `delivery: accepted/observed/undeliverable`, `evidence: turn-start` | Native exit status and error codes, read with the table in `reference/protocol.md` | Deliberately changed. `agent_blocked` fell through to `accepted` although nothing was sent, and `turn-start` could match a turn already running. `accepted` for `agent_prompt_stalled` meant submitted but unobserved; the protocol now spells out that it leaves processing unknown. |
| `send`: echo corroboration (three reads) | A required `herdr agent read` after a stall or timeout, before any resend | Changed: a read can show that a line arrived or is stuck; a line that is not visible leaves the outcome unknown. |
| `send`: one retry of `agent_pane_busy`/`agent_not_ready` | One manual retry, documented | Retained as guidance. |
| `send --force` | None | Removed. It never bypassed herdr's own blocked rejection. |
| `seed` | A one-line briefing template sent with `agent prompt`, confirmed by the recipient's reply | Changed: the old `--wait` "turn finished" report proved nothing about the seed. The template adds the workspace id. |
| `broadcast`, `sync` | One `agent prompt` per recipient; roster checked against `agent list` by handle within the workspace | Retained. There is no global fallback when no workspace is given: the workspace is always named. |
| `withdraw` | Handoff, **wait for the successor's reply**, then `[herd -self]` | Changed: 1.x announced departure without waiting for the handoff reply and did not check that the lead was a live member. |
| `agent`, `up`: selectors (`model=`, `effort=`, `mode=`, `sandbox=`, `approval=`), `--arg` | Agent CLI arguments after `herdr agent start ... --` | Changed: the documented defaults (`claude-opus-5-5`; `gpt-6.1-sol` with `--no-daemon`) are examples, not enforced. Duplicate-setting checks and per-kind refusals are gone; the agent CLI validates its own arguments. |
| `--env` parsing (refused duplicates, control characters) | `herdr tab create --env KEY=VALUE` | Changed: herdr accepts a broader grammar, and a later duplicate replaces an earlier one. |
| Withholding `--env` values from error output | None | Not retained. Native errors can echo the command, so the skill says not to put secrets in `--env` or launch arguments. |
| Outer `agent_pane_busy` retry (10 s window, 400 ms) | herdr's own startup retry (Unix shell-init only, 2 s window) | Changed: narrower, notably on Windows. |
| Final wait for `idle`/`done` after start | `herdr agent wait <h> --until idle --until done`, a documented step | Retained as a step. Native start alone accepts a Codex in `unknown`. |
| Role labels `<handle>-<role> <glyph>` | `tab create --label` | Retained as naming convention. |
| `up`: check handles, fetch remote base, resolve source workspace, create worktree, launch, close root tab | The same steps, documented as a sequence | Retained, including checking every handle before anything is created. Not transactional, as before: a failure leaves earlier pieces in place for you to inspect. |
| Exit 0 with a JSON result even on failed delivery | Native exit codes | Changed: a rejected or stalled prompt is now a nonzero exit. |
| Hook: stable copy under `~/.claude/comitatus`, helper path in orientation | Orientation names the native verbs; nothing is copied | Changed. The old copy is left in place for you to delete. |
| `/herd-setup`: per-verb `node .../herd.js` rules | Native verb rules only | Changed. Old rules stay in your settings until you remove them. |

## Provenance

Canonical herdr documentation lives upstream at herdr.dev. This plugin packages
a curated workflow skill over the `herdr` CLI; it does not reimplement herdr or
manage herdr's own codex integration (`~/.codex/herdr-agent-state.sh`).
