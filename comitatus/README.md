# comitatus

Packages the [herdr](https://herdr.dev) agent-orchestration skill for Claude Code
and Codex. `comitatus` is Latin for a retinue or band of
companions — the followers who travel and work together under one leader.

## Responsibilities: herdr vs. the skill vs. comitatus

Three layers cooperate. Keeping them distinct is what makes the plugin small and
keeps it from drifting when herdr changes.

| Layer | What it is | Owns | Does **not** own |
|-------|-----------|------|------------------|
| **herdr** | The terminal-native multiplexer binary (`herdr`), installed from [herdr.dev](https://herdr.dev). | The entire command surface and runtime: worktrees, workspaces, tabs, panes, and agents; `agent start/prompt/read/wait`, `worktree`/`tab`/`pane`/`workspace` verbs; agent **detection integrations** (`~/.codex/herdr-agent-state.sh` and friends) that read each agent's status. The authoritative source for flags — run `herdr <verb> --help`. | Any notion of a "herd" as a team, the roster/naming convention, or the agent-to-agent messaging protocol. |
| **herdr skill** (`comitatus:herdr`) | A curated workflow skill authored under `skills/herdr/`, invoked from inside a herdr pane. | The *conventions layer* herdr has no opinion on: the herd roster + short-handle naming, the `[from <self> reply\|fyi]` messaging protocol, worktree-herd setup patterns, and the `herd.js` composite verbs. Points at `herdr <verb> --help` for CLI flags rather than re-teaching them. | The herdr CLI itself (it calls it), and herdr's detection integrations. |
| **comitatus** (this plugin) | The Claude Code plugin that packages and delivers the skill. | Delivery + activation: the SessionStart hook that gates on `HERDR_ENV=1`, injects orientation, and syncs the skill into `~/.codex/skills/herdr/` for codex agents; the `/herd-setup` permission allow-list; the stable helper path. | herdr's binary, its integrations, and the skill's *content* semantics (it ships the files, it doesn't decide what they say). |

**Rule of thumb:** if it is a herdr command or agent-status mechanic, it belongs to
herdr; if it is "how a team of agents coordinates," it belongs to the skill; if it
is "get that skill in front of the right agent with the right permissions," it
belongs to comitatus.

## What comitatus ships

- The `herdr` skill (invoked `comitatus:herdr`) for driving herdr from inside it:
  worktrees, workspaces, tabs/panes, agents, messaging, and waiting on state —
  all over the `herdr` CLI.
- A SessionStart hook that is silent unless you are inside herdr (`HERDR_ENV=1`).
  Inside herdr it injects a short orientation and, if codex is installed, syncs
  the same skill into `~/.codex/skills/herdr/` so codex agents in the herd get it
  too.
- `herd.js`, a Node helper exposing composite verbs (`status`, `members`, `wait`,
  `send`, `send-wait-read`, `agent`, `up`) that each run `herdr` themselves — one
  static command in place of a pipe or a poll loop.
- `/herd-setup`, which merges a safe herdr/git allow-list into your settings to
  cut permission prompts.

## Installing

comitatus is a companion to [herdr](https://herdr.dev): on its own it does
nothing (see Behavior modes). Install herdr first, then the plugin.

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

Prefer **user** scope for comitatus. It activates on whether the session is
running inside a herdr pane (see Behavior modes), which has nothing to do with
which repo you opened - so "enabled everywhere" matches how herdr is actually
used. Project or local scope leaves comitatus silent in every herdr session you
launch from a different repo, which is rarely what you want. Reach for project
scope only if one repo is the sole place you ever drive herdr and you want
teammates to get it automatically. Note that scope only controls *when the hook
runs*; Codex support is a separate installation you make with
`codex plugin add comitatus@claude-domestique`.

## Behavior modes

comitatus keys off a single signal: the `HERDR_ENV=1` environment variable,
which herdr sets only inside the panes it spawns and which is inherited by
processes launched there. Whether herdr is *installed* is irrelevant - what
matters is whether the current session is running *inside* a herdr pane.

| Situation | `HERDR_ENV` | comitatus |
|-----------|-------------|-----------|
| Plain terminal, no herdr | unset | **Dormant** |
| Plain terminal, herdr installed but session not launched from a herdr pane | unset | **Dormant** |
| Inside a herdr pane | `1` | **Active** |

**Dormant** - the SessionStart hook returns immediately:

- No orientation injected, no `comitatus` status line, no files written.
- The `comitatus:herdr` skill is present in the catalog but self-gated: invoking
  it from outside a herdr pane makes it stop and report that you are not in a
  herdr-managed pane, so it will not reach into a live herdr from the wrong
  place.

**Active** - inside a herdr pane:

- Injects a short orientation telling the agent it is inside herdr, to use the
  `comitatus:herdr` skill, and the resolved `herd.js` helper path.
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

Driving a herd means many small `herdr` calls, and several recipes capture ids
with `$(...)`, pipe into `node <helper> ...`, or poll in a loop - shapes Claude
Code cannot statically analyze, so each one prompts. Two things reduce this to
near zero:

1. **Composite verbs.** `herd.js` exposes `status`, `members`, `wait`, `send`,
   `send-wait-read`, and `agent` verbs that run `herdr` themselves - one static
   command instead of a pipe or a `while` loop. (`up` already does this for
   spinning up a whole worktree.)
2. **`/herd-setup`.** Run it once to merge a safe allow-list into your
   `settings.json` (user scope by default; `--local` or `--project` to change).
   It allows the safe herdr verbs, `git fetch`, read-only `git status`/`branch`,
   and one rule **per helper verb** at the stable path.

**Call the helper by its absolute path.** The allow-rule matches
`node /Users/you/.claude/comitatus/skills/herdr/scripts/herd.js send ...` - the
exact absolute path your orientation prints. A call written through a shell
variable (`node "$H" ...`) still prompts, because the matcher cannot see through
the variable.

**What stays prompting, on purpose.** `/herd-setup` never allows `herdr pane run`
or `herdr pane send-keys` (raw shell / keystroke injection - the composite verbs
cover their safe uses), nor `git branch -D`, `git reset`, `git checkout`,
`git push`, or `git worktree remove`. It never bakes a blanket `herd.js:*` rule
(so a future verb is not auto-allowed), and it keeps the machine-specific baked
rules out of committed (`--project`) settings. (`herdr worktree remove` *is*
allowed: it tears down a herdr worktree, not git history.) Re-running is
idempotent and warns on `deny`/`ask` conflicts.

## Single source of truth

There is **one** skill under `skills/herdr/`, authored in plain ASCII. Codex and
Claude load those identical files from their own installed copy of the plugin.
Nothing is copied between hosts, so there is no fork and no shadow copy to keep
in sync.

## Uninstalling

The Claude side uninstalls cleanly through Claude Code (`/plugin uninstall
comitatus@claude-domestique`). Codex uninstalls with
`codex plugin remove comitatus@claude-domestique`. Uninstall Claude from each scope you enabled it at
(`--scope user|project|local`, mirroring how you installed it); `/plugin disable`
turns it off without removing it.

comitatus writes exactly one thing outside its plugin directory: a
version-independent copy of the skill at `~/.claude/comitatus/`, which exists so
the `herd.js` helper has a stable absolute path for the Claude permission
allowlist (see `/herd-setup`). Claude Code fires no hook on uninstall, so remove
it by hand if you want a clean slate:

```bash
rm -rf ~/.claude/comitatus
```

It is staged in a temp dir and swapped into place with an atomic rename, so an
agent never reads a half-written skill dir. A run interrupted by a hard kill
(SIGKILL) can rarely leave an inert staging dir like
`~/.claude/comitatus/skills/.herdr.tmp.<pid>.<n>`; it is harmless and safe to delete.

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

## Provenance

Canonical herdr documentation lives upstream at herdr.dev. This plugin packages
a curated workflow skill over the `herdr` CLI; it does not reimplement herdr or
manage herdr's own codex integration (`~/.codex/herdr-agent-state.sh`).
