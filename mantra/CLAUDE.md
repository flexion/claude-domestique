# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mantra** is a behavioral rules plugin for Claude Code sessions. It provides curated rules that are auto-loaded via Claude Code's native `.claude/rules/` mechanism.

Tagline: "Consistent behavior from turn 1 to turn 100"

## Commands

```bash
npm test          # Run tests
```

## Architecture

Plugin type: **native rules** (`.claude/rules/` auto-loading)

Design goals:
- Native loading: leverages Claude Code's built-in rules mechanism
- Token efficient: compact YAML frontmatter (~89% reduction vs prose)
- On-demand details: companion MD files for elaboration
- No hooks: simpler architecture, no periodic injection

### Directory Structure

```
mantra/
├── rules/                # Frontmatter-only MD files (copied to project)
│   ├── behavior.md       # AI behavior rules
│   ├── test.md           # Testing conventions
│   └── ...
├── context/              # Companion docs (referenced on-demand)
│   ├── behavior.md       # Detailed examples for behavior
│   ├── test.md           # Detailed examples for testing
│   └── ...
├── scripts/init.js       # Init script (copies rules to project)
├── commands/init.md      # /mantra:init skill
└── bin/cli.js            # npx mantra CLI
```

### Rule File Format

Each rule file is a **frontmatter-only markdown file**:

```markdown
---
companion: behavior.md

assess-first: correctness, architecture, alternatives
stance: skeptical-default, find-problems-not-agreement
# ... compact YAML rules
---
```

### How Init Works

`/mantra:init` or `npx mantra init`:
1. Creates `.claude/rules/` in project
2. Copies `rules/*.md` files from plugin
3. Claude Code auto-loads these at session start

## Context System

Rules use a two-tier pattern:

| File Type | Purpose | Location |
|-----------|---------|----------|
| `rules/*.md` | Compact rules (frontmatter) | Copied to project |
| `context/*.md` | Detailed examples | Plugin directory (on-demand) |

## Git Conventions

**Branches:** `issue/feature-<N>/<desc>` or `chore/<desc>`

**Commits:** HEREDOC format, no attribution, no emojis
```bash
git commit -m "$(cat <<'EOF'
#N - verb desc

- change1
- change2
EOF
)"
```

**PRs:** Title matches commit format (`#N - lowercase desc` or `chore - lowercase desc`)
