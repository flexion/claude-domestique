# Session: Hook Event Redesign

**Issue**: #73
**Branch**: issue/feature-73/hook-event-redesign
**Type**: feature
**Created**: 2025-12-21
**Status**: in-progress

## Goal
Redesign hook event architecture to favor prompt-based hooks over command-based hooks.

## Approach
1. Audit current hook implementations across all plugins (mantra, memento, onus)
2. Identify which hooks should remain command-based vs convert to prompt-based
3. Refactor eligible hooks
4. Update documentation and context files

## Session Log
- 2025-12-21: Session created, branch checked out from main
- 2025-12-21: Built compact reference library in docs/claude/ from official docs

## Key Decisions
- Build reference library before implementation to maintain fresh context
- Use compact YAML format optimized for AI consumption

## Learnings
- Only 5 hook events support prompt-based hooks: Stop, SubagentStop, UserPromptSubmit, PreToolUse, PermissionRequest
- SessionStart does NOT support prompt-based hooks (requires command)
- Current plugins all use SessionStart + UserPromptSubmit with command-based hooks
- All current hooks need file I/O, so command-based is technically required

## Files Changed
- docs/claude/hooks.yml - Hook events, types, context injection patterns
- docs/claude/plugins.yml - Plugin structure, manifest, namespacing
- docs/claude/commands.yml - Command types, frontmatter, arguments
- docs/claude/settings.yml - Config locations, permissions, env vars
- docs/claude/skills.yml - SKILL.md format, discovery, allowed-tools

## Next Steps
- [ ] Audit current hook implementations (mantra, memento, onus)
- [ ] Identify which hooks should remain command-based
- [ ] Refactor eligible command-based hooks to prompt-based
- [ ] Update documentation to reflect design guidance
- [ ] Add hook design guidelines to context files
