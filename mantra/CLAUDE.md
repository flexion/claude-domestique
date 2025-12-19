# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mantra** is a periodic context refresh plugin for Claude Code sessions. It addresses the problem of "context drift" where Claude gradually forgets project guidance as conversations grow longer.

Tagline: "I told you. You agreed. You forgot. Repeat."

## Commands

When package.json exists:
```bash
npm test          # Run tests
npm run lint      # Lint code
npm run type-check # TypeScript checking
npm run format    # Format code
```

## Architecture

Plugin type: **hook** (SessionStart + UserPromptSubmit events)

Design goals:
- Unobtrusive: minimal interference with actual work
- Narrow scope: context refresh only
- Fast refresh with obvious acknowledgment
- Token-aware: don't overwhelm context with reinforcement

**Context loading order**: base → sibling plugins → project extensions → CLAUDE.md

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

## Context System

Context uses a two-tier pattern:

| File Type | Purpose | Target |
|-----------|---------|--------|
| `*.yml` | Compact assertions, rules | Machine (Claude) |
| `*.md` | Detailed examples, templates | Human & Claude deep-dive |

**Base context** (shipped with plugin in `context/`):
- `behavior.yml` - AI behavior rules (skeptical-first, evidence-based)
- `context-format.yml` - Context format specification
- `format-guide.yml` - Compact YAML conventions

**Project context** (your `.claude/context/`):
- `project.yml` - Project-specific context (domain, architecture)
- `git.yml` - Git conventions (HEREDOC commits, no attribution)
- `sessions.yml` - Session management (branch-session mapping)

## Session Management

1 session = 1 issue = 1 branch = 1 metadata file

**Locations:**
- `.claude/sessions/` - Detailed session files (goal, log, next steps)
- `.claude/branches/` - Ultra-compact branch metadata (maps branch to session)

**"What's next?" workflow:**
1. `git branch --show-current`
2. Read `.claude/branches/<branch-sanitized>`
3. Read `.claude/sessions/<session-file>.md` for Next Steps

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

## Behavior Expectations

- Assess-first: evaluate correctness, architecture, alternatives, risks before agreement
- Skeptical default: find problems, don't seek agreement
- Evidence-based troubleshooting: minimum 3 documented examples, no guessing
- Update session files: after milestones, before pauses, before commits
