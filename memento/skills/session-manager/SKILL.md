---
name: session-manager
description: >-
  Use when coordinating the current branch session across creation, resumption,
  progress updates, and pre-commit lifecycle management.
---

# Session Manager

Relative plugin paths in this skill are resolved from this `SKILL.md`.

Manage work sessions that persist context across conversation resets.

## When to Use This Skill

Proactively invoke when user:
- Asks about current work context
- Switches branches and needs session context
- Wants to create or update a session
- Is resuming work or asking "what's next?"

## Context Files (Auto-Injected)

- **`../../rules/sessions.md`**: Rules for session workflow (BLOCKING requirements)
- **`../../context/sessions.md`**: Detailed examples and patterns

Read these files for complete guidance. This skill provides quick reference only.

## Quick Reference

### Check Session Status
```bash
git branch --show-current
# Sanitize: replace / with -
# Read: .claude/branches/<sanitized>
# Read: .claude/sessions/<session>.md → focus on Next Steps
```

### Create Session
Use `memento:session create` command.

### Update Session
Edit session file directly. Update triggers:
- Beginning work
- After milestone
- Before pause
- Before commit (atomic with code)

## Key Rules (from `../../rules/sessions.md`)

1. **Never guess current branch** — always `git branch --show-current`
2. **Session = Branch = Issue** (1:1:1 mapping)
3. **Atomic commits** — session + code together
4. **BLOCKING**: No source edits without active session

## What This Skill Does NOT Do

- Define session file format (see `../../context/sessions.md`)
- Define workflow patterns (see `../../rules/sessions.md`)
- Handle git operations through the Onus plugin when it is installed
