---
description: Allowlist the safe herdr/git verbs to cut permission prompts
argument-hint: "[--local | --project]"
---

# herd-setup

Merge a curated allow-list of safe herdr workflow commands into your Claude Code
`settings.json`, so routine herdr driving and the `herd.js` composite verbs stop
prompting. Arbitrary-exec primitives (`herdr pane run`, `herdr pane send-keys`)
and destructive git verbs (`git branch -D`, `reset`, force-push) are deliberately
left OUT and keep prompting.

## Run it

Default = **user** scope (`~/.claude/settings.json`), recommended (herdr is used
across repos, and the baked helper-path rule is machine-specific):

```bash
node "$(node -p "require(process.env.HOME + '/.claude/plugins/installed_plugins.json').plugins['comitatus@claude-domestique'][0].installPath")/scripts/herd-setup.js"
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
