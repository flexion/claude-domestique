---
description: Scaffold context files for periodic refresh
argument-hint: [--force]
---

# Initialize Native Rules

Set up mantra's behavioral rules in your project using Claude Code's native `.claude/rules/` auto-loading.

## Task

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/init.js` to copy rule files to your project.

The init script performs these actions:

1. **Create directory**: Creates `.claude/rules/` if it doesn't exist
2. **Copy rules**: Copies frontmatter-only markdown files from plugin
3. **Detect legacy setup**: Warns about old `.claude/context/` if present
4. **Handle updates**: Use `--force` to update existing rules

## What Gets Created

```
.claude/rules/
├── behavior.md       # AI behavior (skeptical-first, assess-before-agree)
├── context-format.md # Context module format spec
├── format-guide.md   # Compact YAML conventions
└── test.md           # Testing conventions (TDD workflow)
```

## Rule File Format

Each rule file is a **frontmatter-only markdown file**:

```markdown
---
# Compact rules in YAML frontmatter
companion: behavior.md

assess-first: correctness, architecture, alternatives
stance: skeptical-default, find-problems-not-agreement
# ... more rules
---
```

No markdown body - just frontmatter containing compact YAML rules.

## How It Works

1. **Native loading**: Claude Code auto-loads `.claude/rules/*.md`
2. **Token efficient**: Frontmatter uses compact YAML (~89% token savings vs prose)
3. **On-demand details**: `companion:` key points to detailed examples
4. **No hooks**: Leverages native mechanism, no periodic injection needed

## After Setup

Rules are automatically loaded by Claude Code at session start. No additional configuration needed.

## Updating Rules

When the mantra plugin is updated with new rules:

```bash
/mantra:init --force
```

This overwrites existing rules with the latest versions.

## Migration from v0.1.x

If you have an older mantra setup with `.claude/context/`:

1. Your custom context files still work (additive)
2. Remove old hooks from `.claude/settings.json` if present
3. The new `.claude/rules/` is the primary mechanism

## Companion Files

Each rule file references a companion with detailed examples. When you need elaboration on a rule, read the companion file from the plugin's context directory.
