---
description: Initialize session management infrastructure
argument-hint: [--force]
---

# Initialize Session Management

Set up memento's session rules and templates using Claude Code's native `.claude/rules/` auto-loading.

## Task

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/init.js` to copy session management files to your project.

The init script performs these actions:

1. **Create directories**: Creates `.claude/rules/`, `.claude/context/`, `.claude/templates/`, `.claude/sessions/`, `.claude/branches/`
2. **Copy rules**: Copies frontmatter-only markdown files for native loading
3. **Copy context**: Copies companion documentation
4. **Copy templates**: Copies session templates (feature.md, fix.md, chore.md)
5. **Write version**: Creates `.memento-version.json` for update detection

## What Gets Created

```
.claude/
├── rules/
│   └── sessions.md       # Session conventions (native auto-load)
├── context/
│   └── sessions.md       # Detailed session workflow docs
├── templates/
│   ├── feature.md        # Feature session template
│   ├── fix.md            # Bug fix session template
│   └── chore.md          # Chore session template
├── sessions/             # Session files (created by hook/skill)
└── branches/             # Branch metadata (created by hook/skill)
```

## How It Works

1. **Native loading**: Claude Code auto-loads `.claude/rules/*.md`
2. **Session templates**: Templates in `.claude/templates/` used for new sessions
3. **Hook detection**: SessionStart hook warns when rules are outdated
4. **Version tracking**: `.memento-version.json` enables update detection

## After Setup

Create a branch and session:
1. `git checkout -b feature/my-feature`
2. `/memento:session create`

## Updating

When the memento plugin is updated:

```bash
/memento:init --force
```

This overwrites existing rules and templates with the latest versions.
