---
name: herd-setup
description: >-
  Use when herdr or git commands trigger repeated permission prompts inside a herd, or when the user asks to allowlist, pre-approve, or stop being prompted for herdr verbs.
argument-hint: "[--local | --project]"
---

# herd-setup

This skill configures Claude Code's command allowlist. Codex users should not run
the script: Codex uses its own approval policy, and the installed `herdr` skill
works directly without editing Claude settings.

For Claude Code, merge a curated allow-list of safe herdr workflow commands into
`settings.json`, so routine herdr driving and the `herd.js` composite verbs stop
prompting. Arbitrary-exec primitives (`herdr pane run`, `herdr pane send-keys`)
and destructive git verbs (`git branch -D`, `reset`, force-push) remain excluded.

## Run it

Resolve `../../scripts/herd-setup.js` relative to this `SKILL.md`. Default is
**user** scope (`~/.claude/settings.json`), recommended because herdr is used
across repositories and the helper-path rule is machine-specific:

```bash
node <resolved-plugin-root>/scripts/herd-setup.js
```

Add `--local` for `~/.claude/settings.local.json` (machine, gitignored), or
`--project` for `.claude/settings.json` (committed, team-wide).

## What it adds

- Safe herdr verbs: `agent list/get/read/send/rename/wait`, `pane read`, `wait`,
  and the `tab`/`workspace`/`worktree` lifecycle (including `worktree remove`).
- `git fetch`, read-only `git status`/`git branch`.
- One rule **per helper verb** at the stable path, e.g.
  `Bash(node <home>/.claude/comitatus/skills/herdr/scripts/herd.js send:*)` -
  so `status`/`members`/`wait`/`send`/`send-wait-read`/`agent`/`up` run
  prompt-free, but ONLY when you call the helper by the **absolute path** shown
  in your herdr orientation (shell variables and relative paths defeat the
  permission matcher).

## What it will NOT add

- `herdr pane run` / `herdr pane send-keys` - raw shell / keystroke injection. The
  composite verbs cover their legitimate uses with fixed arguments.
- `git branch -D`, `git reset`, `git checkout`, `git push`, `git worktree remove`
  - irreversible or history-changing.
- A blanket `node .../herd.js:*` - rules are per-verb, so a future verb is not
  auto-allowed.
- The machine-specific baked rules under `--project` (they embed your home path).

Re-running is safe and idempotent. It warns if any rule it would add is shadowed
by an existing `deny`/`ask` entry.
