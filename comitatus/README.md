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

## Single source of truth

There is **one** skill under `skills/herdr/`, authored in plain ASCII. Codex
uses the identical files via the auto-provisioned copy. The codex manifest
`agents/openai.yaml` lives in the skill dir and is inert for claude.

## Uninstalling

The claude side uninstalls cleanly through Claude Code (`/plugin uninstall
comitatus@claude-domestique`). The **codex copy is not removed automatically** -
Claude Code fires no hook on uninstall, so the files this plugin wrote outside
its own directory persist.

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
