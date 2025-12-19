# Context Module Format Guide

This document explains the claude-mantra context system - how to structure, write, and extend context files that keep Claude aligned with your project conventions.

## The Problem: Context Drift

Claude has excellent capabilities but suffers from "context drift" - as conversations grow longer, earlier guidance gets pushed out of the active context window. Even well-documented CLAUDE.md files get forgotten mid-session.

**Symptoms of context drift:**
- Claude stops following established conventions
- Repeats mistakes you've already corrected
- Forgets project-specific patterns
- Reverts to generic behaviors

## The Solution: Periodic Context Refresh

claude-mantra periodically re-injects key context files, reinforcing guidance throughout the session. Think of it as a "mantra" - repeated phrases to focus the mind.

## Two-Tier File Pattern

Each topic should have TWO files:

### Tier 1: YAML Files (`.yml`)
**Purpose:** Quick context refresh (loaded automatically)
**Characteristics:**
- Compact, token-efficient
- Rules and assertions only
- No examples or explanations
- Target: <1000 tokens per file

**Example:**
```yaml
# git.yml
branch: issue/feature-N/desc | chore/desc
commit: HEREDOC format, no attribution
no: emojis, co-authored-by
```

### Tier 2: Markdown Files (`.md`)
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
- All `*.yml` files from plugin base context
- All `*.yml` files from project `.claude/context/`
- Order: base first, then project (additive)

### On-Demand Loading
- `*.md` files loaded when Claude needs detailed examples
- Triggered by specific questions or complex scenarios

### CLAUDE.md Handling
- Read if present (for backward compatibility)
- **Warning:** Having both CLAUDE.md and `.claude/context/` can cause confusion
- Recommended: Migrate CLAUDE.md content to modular context files

## Writing Effective Context

### YAML Files (Compact Format)

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
- Examples (save for .md)
- Redundant information

### Markdown Files (Detailed Format)

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
│   └── context/           # Project extensions
│       ├── README.md      # How to use (this stays)
│       ├── project.yml    # Project-specific context
│       └── custom.yml     # Your custom extensions
└── CLAUDE.md              # Legacy (migrate to modular)
```

## Extension Examples

### Adding Project Context

Create `.claude/context/project.yml`:
```yaml
# Project-specific context
domain: e-commerce-platform
stack: typescript, react, postgres
patterns: repository-pattern, CQRS
conventions:
  naming: camelCase (code), kebab-case (files)
  testing: jest, react-testing-library
```

### Adding Custom Behavior

Create `.claude/context/team.yml`:
```yaml
# Team-specific preferences
code-review: required before merge
documentation: update README for new features
testing: minimum 80% coverage
```

## Best Practices

1. **Keep YAML files small** - Target <50 lines, <1000 tokens
2. **One topic per file** - Don't combine unrelated context
3. **Use the pairing pattern** - `topic.yml` + `topic.md`
4. **Update when conventions change** - Stale context causes drift
5. **Delete obsolete context** - Old rules confuse Claude
6. **Test your context** - Start fresh sessions to verify behavior
