# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Meta Note: Self-Referential Project

This repository is the source code for memento, mantra, and onus plugins—and those same plugins are installed and running in this project. Keep these distinct:

| Concept | Source Code (what we develop) | Running Instance (what's active) |
|---------|------------------------------|----------------------------------|
| mantra context | `mantra/context/*.yml` | Injected via hooks on each prompt |
| memento sessions | `memento/templates/*.md` | `.claude/sessions/*.md` in each plugin dir |
| onus work items | `onus/hooks/work-item.js` | Tracking issues for this repo |

When modifying plugin behavior, you're changing the source. The running plugins won't pick up changes until reinstalled.

## Project Overview

**Claude Domestique** is a Claude Code plugin marketplace containing three plugins that work together to improve Claude Code sessions:

- **memento** - Session persistence: tracks work context across conversation resets
- **mantra** - Context refresh: periodically re-injects behavioral guidance to prevent drift
- **onus** - Work item automation: fetches issues from GitHub/JIRA/Azure DevOps, generates commits/PRs

Each plugin is independently installable but gains enhanced behavior when used together.

## Repository Structure

```
claude-domestique/
├── .claude-plugin/          # Marketplace root plugin config
├── mantra/                  # Context refresh plugin
├── memento/                 # Session persistence plugin
└── onus/                    # Work item automation plugin
```

Each plugin follows the same structure:
```
<plugin>/
├── .claude-plugin/plugin.json   # Plugin manifest
├── hooks/                       # Hook implementations (SessionStart, UserPromptSubmit)
├── context/                     # Base context files (*.yml) shipped with plugin
├── commands/                    # Skill commands (*.md)
├── templates/                   # Scaffolding templates
├── scripts/                     # Initialization scripts
└── package.json                 # Plugin dependencies
```

## Commands

Each plugin has its own test suite:

```bash
# mantra (uses Jest)
cd mantra && npm test

# memento (uses Jest)
cd memento && npm test

# onus (uses Jest)
cd onus && npm test
```

### Version Management

Bump plugin versions consistently across all config files:

```bash
node scripts/bump-version.js <plugin> <patch|minor|major>

# Examples:
node scripts/bump-version.js memento patch   # 0.1.10 → 0.1.11
node scripts/bump-version.js mantra minor    # 0.1.5 → 0.2.0
```

This updates `package.json`, `plugin.json`, and `marketplace.json` atomically.

## Architecture

### Hook Pattern

All three plugins use the same hook pattern:
1. Receive JSON input on stdin (includes `hook_event_name`, `cwd`, etc.)
2. Process based on event type (SessionStart or UserPromptSubmit)
3. Output JSON with `systemMessage` and `hookSpecificOutput`

Hook implementations live in `<plugin>/hooks/<hook-name>.js` with tests in `__tests__/`.

### Context System

Two-tier context pattern:
- `*.yml` - Compact rules, machine-optimized (~850 tokens vs ~7,750 for prose)
- `*.md` - Detailed examples, loaded on-demand

Context loading order: base (plugin) → sibling plugins → project extensions → CLAUDE.md

### Context Ownership

Each plugin owns specific context domains. When adding or modifying context, respect these boundaries:

| Plugin | Domain | Files |
|--------|--------|-------|
| **mantra** | AI behavior, format conventions | `behavior.yml`, `format-guide.yml`, `context-format.yml` |
| **memento** | Session management | `sessions.yml` |
| **onus** | Git operations, work items | `git.yml`, `work-items.yml` |

**Ownership rules:**
- Single source of truth: each concept defined in exactly one place
- Cross-references over duplication: reference other plugins' context rather than redefining
- Domain boundaries: commit/branch/PR formats → onus, session lifecycle → memento, behavioral rules → mantra

### Session Conventions

All plugins share these conventions:
- 1 session = 1 issue = 1 branch
- Branch format: `issue/feature-N/desc` or `chore/desc`
- Session files: `.claude/sessions/<branch-sanitized>.md`
- Branch metadata: `.claude/branches/<branch-sanitized>`

### Plugin Family Detection

mantra loads context from sibling plugins (memento, onus) when installed together, using the installed plugins registry at `~/.claude/plugins/installed_plugins.json`.

## Key Implementation Details

### State Management

Each plugin maintains state in `~/.claude/`:
- `mantra-state.json` - Interaction counter for refresh timing
- `memento-state.json` - Session update counter
- `onus/state.json` - Current issue tracking
- `onus/work-item-cache.json` - Cached issue details

### Branch Parsing

The `parseBranchName()` function in `memento/scripts/session.js` extracts issue numbers, types, and descriptions from branch names. Used by both memento and onus.

### Testing Approach

- All plugins use Jest
- Tests use dependency injection for paths/filesystem to enable isolated testing

## Git Conventions

Commits: `#N - verb description` or `chore - description` using HEREDOC format, no attribution
PRs: Title matches commit format, lowercase
