# Project Name Change

**Date:** 2025-11-16

## Previous Name
`session-workflow-plugin`

## New Name
`claude-domestique`

## Rationale

### The Domestique Metaphor
In professional cycling, a **domestique** is a rider who works for the benefit of their team and leader, sacrificing individual glory. They:
- **Carry water** - Handle logistics and unglamorous tasks
- **Shield from wind** - Reduce friction and obstacles
- **Scout ahead** - Find optimal paths and warn of dangers
- **Never seek credit** - Focus on team success, not personal glory

### How It Maps to This Plugin

| Domestique Role | Plugin Behavior |
|----------------|-----------------|
| Carries water | Manages sessions, git workflow, testing |
| Stays focused on goals | Strategic assessment, challenges assumptions |
| Does unglamorous work | Enforces discipline, blocks bad commits, updates documentation |
| No ego | Skeptical by default, no sycophantic praise, peer not subordinate |
| Never forgets position | Persistent memory across context resets |

### Why "claude-" Prefix
- **Discoverability** - Clear it's a Claude Code plugin in marketplace searches
- **Namespace** - Groups with other Claude plugins alphabetically
- **Standard pattern** - Follows common plugin naming (e.g., `claude-task-master`, `claude-flow`)

## What Changed

### Repository & Directory
- Directory: `session-workflow-plugin/` → `claude-domestique/`
- Repository: `github.com/dpuglielli/session-workflow-plugin` → `github.com/flexion/claude-domestique`

### Plugin Manifest
- Plugin name: `session-workflow` → `claude-domestique`
- Description: Enhanced to include domestique metaphor
- Keywords: Updated to reflect strategic partner role

### Documentation
- [CLAUDE.md](CLAUDE.md) - Updated bootstrap intro with metaphor
- [README.md](README.md) - Added metaphor explanation, updated all references
- [.claude/context/project.yml](.claude/context/project.yml) - Added metaphor field, updated name/repository

### Installation Commands
**Old:**
```bash
/plugin install session-workflow@local
```

**New:**
```bash
/plugin install claude-domestique@local
```

## Migration Impact

### For Users
If you previously installed `session-workflow`:
1. Uninstall old plugin: `/plugin uninstall session-workflow`
2. Install new plugin: `/plugin install claude-domestique@local`
3. No config changes needed - `.claude/config.json` remains compatible

### For Developers
All internal references updated:
- ✓ Plugin manifest name
- ✓ Repository URLs
- ✓ Documentation
- ✓ Context files
- ✓ Installation examples

No code changes needed - plugin is markdown/bash definitions, behavior unchanged.

## Name Persistence

This file serves as **authoritative record** of the name change for:
- Future Claude sessions (context loading)
- Team members picking up development
- GitHub issue/PR references
- Migration documentation

When resuming work, Claude should load this file to understand:
1. Current name is `claude-domestique`
2. Old name was `session-workflow-plugin`
3. Metaphor informs behavior and documentation style
4. All references have been updated

## Future References

**Always use:** `claude-domestique`

**Installation patterns:**
- Local: `claude-domestique@local`
- GitHub: `claude-domestique@github:flexion/claude-domestique`
- Marketplace: `claude-domestique` (when published)

**Metaphor in docs:**
When explaining plugin behavior, reference domestique role:
- "Carries the water" → workflow management
- "Stays focused" → strategic goals
- "No ego" → skeptical assessment, no sycophantic tone
- "Never forgets" → persistent sessions
