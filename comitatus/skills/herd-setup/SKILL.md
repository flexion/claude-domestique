---
name: herd-setup
description: >-
  Use when herdr or git commands trigger repeated permission prompts inside a herd, or when the user asks to allowlist, pre-approve, or stop being prompted for herdr verbs.
argument-hint: "[--local | --project]"
---

# herd-setup

This skill configures Claude Code's command allowlist for native `herdr` verbs. It changes settings only when the user runs it, and it never removes an existing rule.

## Claude Code

Resolve `../../scripts/herd-setup.js` relative to this `SKILL.md` and run it:

```bash
node <resolved-plugin-root>/scripts/herd-setup.js
```

| Scope | Flag | File |
| --- | --- | --- |
| User (default) | none | `~/.claude/settings.json` |
| Machine, gitignored | `--local` | `~/.claude/settings.local.json` |
| Team-wide, committed | `--project` | `.claude/settings.json` |

Every scope gets the same rules, because no rule names a machine-specific path.

**It adds:**
- **Read and inspect:**
  - `agent list/get/read/explain`
  - `pane list/get/current/read/wait-output`
  - `tab list`, `workspace list`, `worktree list`
  - `herdr status`, `integration status`
- **Messaging and waits:** `agent prompt`, `agent wait`, `agent rename`.
- **Lifecycle:** `tab create/rename/focus/close`, `workspace create/close`, `worktree create/open/remove`.
- **git:** `git fetch`, `git remote`, and read-only `git status` and `git branch`.

**It never adds:**
- **`herdr agent start`.** Arguments after `--` reach the agent CLI unchanged and can include permission-bypass flags, so each launch stays a human approval.
- **`herdr pane run`, `herdr pane send-keys`, `herdr agent send-keys`.** These are raw shell and keystroke injection.
- **`git branch -D`, `git reset`, `git checkout`, `git push`, `git merge`, `git worktree remove`.** These are irreversible or change history.
- **Any `node`, interpreter, or helper-script rule.**

Re-running is idempotent. It warns when a rule it adds is shadowed by an existing `deny` or `ask` entry.

**Upgrading from comitatus 1.x:** the old per-verb rules for the 1.x helper script (`herd.js`) stay in your settings, because the script never deletes rules. 2.0.0 no longer ships or updates the file they point to, though an old copy may still sit on disk. Remove the rules by hand.

## Codex

Do not run the script for Codex. Codex reads its own rules from `$CODEX_HOME/rules/default.rules`. Commands without a matching rule run in a sandbox that blocks the herdr socket, so they fail with `Operation not permitted`. Show the user these lines to add themselves; never edit the file for them.

```text
prefix_rule(pattern=["herdr", "agent", "prompt"], decision="allow")
prefix_rule(pattern=["herdr", "agent", "list"], decision="allow")
prefix_rule(pattern=["herdr", "agent", "get"], decision="allow")
prefix_rule(pattern=["herdr", "agent", "read"], decision="allow")
prefix_rule(pattern=["herdr", "agent", "wait"], decision="allow")
```

- **Launching agents:** an agent that launches others may also need `["herdr", "tab"]`, `["herdr", "worktree"]` and `["herdr", "workspace"]`.
- **Old 1.x rules:** rules that name a versioned `.../comitatus/<version>/skills/herdr/scripts/herd.js` path are obsolete, and the user can remove them by hand.
- **No message bodies:** a rule saved with a message body inside it matches only that one message, so it is safe to delete.
