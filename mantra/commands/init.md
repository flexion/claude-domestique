---
description: Scaffold context files for periodic refresh
argument-hint: [--force]
---

# Initialize Context Refresh

Set up the `.claude/context/` directory structure for project-specific context extensions.

## Task

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/init.js` to scaffold the context directory in the current project.

The init script performs these actions:

1. **Create directory**: Creates `.claude/context/` if it doesn't exist
2. **Copy README**: Copies `templates/context/README.md` explaining how to extend context
3. **Handle CLAUDE.md** (if exists):
   - Backs up to `CLAUDE.md.backup`
   - Extracts project info to `project.yml`
   - Preserves full content in `legacy-claude-md.yml` (commented for reference)
4. **Create project.yml** (if no CLAUDE.md): Copies `templates/context/project.yml.example`

## What Gets Created

### Without CLAUDE.md

```
.claude/context/
├── README.md         # How to extend context
└── project.yml       # Project-specific context (from template)
```

### With CLAUDE.md

```
.claude/context/
├── README.md              # How to extend context
├── project.yml            # Extracted from CLAUDE.md
└── legacy-claude-md.yml   # Original content (commented)
```

Plus `CLAUDE.md.backup` in project root.

## Important Notes

- **Base context is automatic**: The plugin ships with behavior.yml, context-format.yml, and format-guide.yml. You don't need to create these.
- **Project extensions are additive**: Your `.claude/context/*.yml` files add to (not replace) the base context.
- **Never overwrites**: Existing files are not overwritten (skipped with message).
- **Sibling plugins**: If memento or onus are installed, their context is also loaded automatically.

## After Setup

1. Edit `.claude/context/project.yml` with your project details
2. Add additional context files as needed (`testing.yml`, `domain.yml`, etc.)
3. See `.claude/context/README.md` for format guidelines
4. Consider removing `CLAUDE.md` if you've migrated content (to avoid confusion)

## Context Loading Order

On refresh, context is loaded in this order:
1. **Base context** - Plugin's `context/*.yml` (behavior, format)
2. **Sibling plugins** - Context from memento/onus if installed
3. **Project extensions** - Your `.claude/context/*.yml`
4. **CLAUDE.md fallback** - If present (with warning about potential confusion)
