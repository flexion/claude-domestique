# comitatus

Packages the [herdr](https://herdr.dev) agent-orchestration skill as a
claude-domestique plugin. `comitatus` is Latin for a retinue or band of
companions — the followers who travel and work together under one leader.

## What it does

- Ships the `herdr` skill (invoked `comitatus:herdr`) for controlling herdr from
  inside it: worktrees, workspaces, tabs/panes, agents, messaging, waiting on
  state — all via the `herdr` CLI.
- A SessionStart hook that is silent unless you are inside herdr
  (`HERDR_ENV=1`). Inside herdr it injects a short orientation and, if codex is
  installed, copies the same skill into `~/.codex/skills/herdr/` so codex agents
  in the herd get it too.
- `herd.js`, a small Node helper for roster/state queries (pane by handle, herd
  members, agent status, JSON field extraction).

## Installing

```bash
/plugin marketplace add flexion/claude-domestique
/plugin install comitatus@claude-domestique
```

No init step - the skill and hook load on the next session (or run
`/reload-plugins` to pick them up immediately).

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
runs* - the codex copy is always machine-global at `~/.codex` regardless of
scope.

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
- Nothing is copied into `~/.codex` (the codex check never runs - the
  `HERDR_ENV` gate precedes it).
- The `comitatus:herdr` skill is present in the catalog but self-gated: invoking
  it from outside a herdr pane makes it stop and report that you are not in a
  herdr-managed pane, so it will not reach into a live herdr from the wrong
  place.

**Active** - inside a herdr pane:

- Injects a short orientation telling the agent it is inside herdr, to use the
  `comitatus:herdr` skill, and the resolved `herd.js` helper path.
- Shows the `📍 comitatus: herdr` status line (`(codex synced)` when it just
  refreshed the codex copy).
- If `~/.codex/` exists, content-hash-syncs the skill into
  `~/.codex/skills/herdr/` so codex agents in the herd get the identical skill
  (atomic, idempotent - no-op when already current).
- Un-gates the `comitatus:herdr` skill so Claude can orchestrate the herd.

Installing herdr does not wake comitatus up; launching Claude *from within* herdr
does. For testing, you can force the active path with `HERDR_ENV=1 claude` from a
normal terminal.

## Single source of truth

There is **one** skill under `skills/herdr/`, authored in plain ASCII. Codex
uses the identical files via the auto-provisioned copy. The codex manifest
`agents/openai.yaml` lives in the skill dir and is inert for claude.

## Uninstalling

The claude side uninstalls cleanly through Claude Code (`/plugin uninstall
comitatus@claude-domestique`). Uninstall from each scope you enabled it at
(`--scope user|project|local`, mirroring how you installed it); `/plugin disable`
turns it off without removing it. The **codex copy is not removed
automatically** - Claude Code fires no hook on uninstall, so the files this
plugin wrote outside its own directory persist.

If you provisioned codex (ran a session inside herdr with codex installed), the
only thing left behind is the auto-provisioned skill copy at
`~/.codex/skills/herdr/`. Remove it by hand:

```bash
rm -rf ~/.codex/skills/herdr
```

That directory contains a `.comitatus-hash` marker file; its presence confirms
the copy was provisioned by comitatus and is safe to delete. comitatus only ever
provisions into `~/.codex` - the single, machine-global codex home - so there is
no per-project copy to track down. This plugin does not touch
`~/.codex/hooks.json` or herdr's own `~/.codex/herdr-agent-state.sh`, so nothing
else needs cleanup.

Provisioning is staged in a temp dir and swapped into place with an atomic
rename, so a codex agent never sees a half-written skill dir. A provision
interrupted by a hard kill (SIGKILL) can rarely leave an inert staging dir like
`~/.codex/skills/.herdr.tmp.<pid>.<n>`; it is harmless and safe to delete.

## Provenance

Canonical herdr documentation lives upstream at herdr.dev. This plugin packages
a curated workflow skill over the `herdr` CLI; it does not reimplement herdr or
manage herdr's own codex integration (`~/.codex/herdr-agent-state.sh`).
