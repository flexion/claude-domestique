# custos

Packages the [herdr](https://herdr.dev) agent-orchestration skill as a
claude-domestique plugin. `custos` is Latin for "keeper/guardian" — one who
tends and guards the herd.

## What it does

- Ships the `herdr` skill (invoked `custos:herdr`) for controlling herdr from
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

## Provenance

Canonical herdr documentation lives upstream at herdr.dev. This plugin packages
a curated workflow skill over the `herdr` CLI; it does not reimplement herdr or
manage herdr's own codex integration (`~/.codex/herdr-agent-state.sh`).
