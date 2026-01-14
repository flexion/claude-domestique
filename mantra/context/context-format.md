# Context Module Format Guide

This document explains the mantra context system - how to structure, write, and extend context files that keep Claude aligned with your project conventions.

## The Problem: Context Drift

Claude has excellent capabilities but suffers from "context drift" - as conversations grow longer, earlier guidance gets pushed out of the active context window. Even well-documented CLAUDE.md files get forgotten mid-session.

**Symptoms of context drift:**
- Claude stops following established conventions
- Repeats mistakes you've already corrected
- Forgets project-specific patterns
- Reverts to generic behaviors

## The Solution: Periodic Context Refresh

mantra periodically re-injects key context files, reinforcing guidance throughout the session. Think of it as a "mantra" - repeated phrases to focus the mind.

## Two-Tier File Pattern

Each topic should have TWO files:

### Tier 1: Rule Files (`rules/*.md`)
**Purpose:** Quick context refresh (loaded automatically)
**Format:** YAML frontmatter in markdown files
**Characteristics:**
- Compact, token-efficient frontmatter
- Rules and assertions only
- No examples or explanations in frontmatter
- Target: <1000 tokens per file

**Example:**
```markdown
---
# git.md - Compact Reference
companion: context/git.md

branch: issue/feature-N/desc | chore/desc
commit: HEREDOC format, no attribution
no: emojis, co-authored-by
---
```

### Tier 2: Companion Docs (`context/*.md`)
**Purpose:** Deep reference (loaded on-demand)
**Characteristics:**
- Detailed examples
- Edge cases and troubleshooting
- Templates and patterns
- Human-readable documentation

**Example:**
```markdown
# Git Workflow Guide

## Commit Format
Use HEREDOC for multi-line commit messages:
\`\`\`bash
git commit -m "$(cat <<'EOF'
#3 - add user authentication

- Implement login endpoint
- Add session management
EOF
)"
\`\`\`
```

## Loading Behavior

### Automatic Loading (Every Refresh)
- All `rules/*.md` files (frontmatter extracted)
- Order: base first, then project (additive)

### On-Demand Loading
- `context/*.md` files loaded when Claude needs detailed examples
- Triggered by specific questions or complex scenarios

### CLAUDE.md Handling
- Read if present (for backward compatibility)
- **Warning:** Having both CLAUDE.md and `.claude/rules/` can cause confusion
- Recommended: Migrate CLAUDE.md content to modular rule files

## Writing Effective Context

### Rule Files (Compact Frontmatter)

**Operators:**
- `→` flow/sequence: `hook → inject → refresh`
- `>` priority: `unit > integration > e2e`
- `|` alternatives: `feature | chore`
- `:` key-value pairs

**Do:**
- Shortest phrasing possible
- One fact per line
- Key-value structure
- Use operators instead of prose

**Don't:**
- Complete sentences
- Explanations or rationale
- Examples (save for context/*.md)
- Redundant information

### Companion Docs (Detailed Format)

**Include:**
- Step-by-step examples
- Edge cases and exceptions
- Troubleshooting guides
- Templates for common tasks
- Rationale for rules

## Directory Structure

```
your-project/
├── .claude/
│   ├── rules/             # Project rule overrides
│   │   └── *.md           # Custom rules with YAML frontmatter
│   └── context/           # Project companion docs
│       └── *.md           # Detailed examples
└── CLAUDE.md              # Legacy (migrate to modular)
```

## Extension Examples

### Adding Project Rules

Create `.claude/rules/project.md`:
```markdown
---
# Project-specific rules
domain: e-commerce-platform
stack: typescript, react, postgres
patterns: repository-pattern, CQRS
naming: camelCase (code), kebab-case (files)
testing: jest, react-testing-library
---
```

### Adding Custom Behavior

Create `.claude/rules/team.md`:
```markdown
---
# Team-specific preferences
code-review: required before merge
documentation: update README for new features
testing: minimum 80% coverage
---
```

## Best Practices

1. **Keep frontmatter small** - Target <50 lines, <1000 tokens
2. **One topic per file** - Don't combine unrelated context
3. **Use the pairing pattern** - `rules/topic.md` + `context/topic.md`
4. **Update when conventions change** - Stale context causes drift
5. **Delete obsolete context** - Old rules confuse Claude
6. **Test your context** - Start fresh sessions to verify behavior
