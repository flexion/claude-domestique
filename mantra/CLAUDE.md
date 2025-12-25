# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mantra** is a behavioral rules plugin for Claude Code sessions. Rules are automatically injected via hooks - zero configuration required.

Tagline: "Consistent behavior from turn 1 to turn 100"

## Commands

```bash
npm test          # Run tests
```

## Architecture

Plugin type: **hook-based injection** (auto-injected via SessionStart/UserPromptSubmit hooks)

Design goals:
- Zero config: rules injected automatically, no setup required
- Token efficient: compact YAML frontmatter (~89% reduction vs prose)
- On-demand details: companion MD files for elaboration
- Drift prevention: periodic refresh every 10 prompts

### Directory Structure

```
mantra/
├── rules/                # Frontmatter-only MD files (auto-injected)
│   ├── behavior.md       # AI behavior rules
│   ├── test.md           # Testing conventions
│   └── ...
├── context/              # Companion docs (referenced on-demand)
│   ├── behavior.md       # Detailed examples for behavior
│   ├── test.md           # Detailed examples for testing
│   └── ...
├── hooks/                # Hook implementations
│   └── session-monitor.js
├── lib/                  # Bundled shared utilities
│   └── shared.js
└── commands/
    └── make-rule.md      # /mantra:make-rule skill
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

### How It Works

1. On SessionStart, hook reads `rules/*.md` frontmatter
2. Injects as `additionalContext` in hook response
3. On UserPromptSubmit, refreshes context every 10 prompts
4. Companion docs path provided for lazy loading

## Context System

Rules use a two-tier pattern:

| File Type | Purpose | Location |
|-----------|---------|----------|
| `rules/*.md` | Compact rules (frontmatter) | Auto-injected via hooks |
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
