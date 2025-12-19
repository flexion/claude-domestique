# Chore: Plugin Documentation

## Goal
Document how the mantra plugin works for developers and contributors.

## Context
- Plugin structure now follows Claude Code plugin standard
- Need clear documentation of plugin internals
- Target audience: developers who want to understand or contribute

## Done
- [x] Create ARCHITECTURE.md with:
  - Plugin structure overview
  - Context loading behavior (consumer-only, no bundled context)
  - Hook behavior (SessionStart, UserPromptSubmit)
  - State management
  - Data flow diagram
  - Configuration options
  - Design decisions
- [x] Document VS Code visibility limitation (freshness indicator less visible than CLI)

## Key Findings Documented
- Plugin reads context only from consumer's `.claude/context/` directory
- No immutable plugin-bundled context is injected
- `/init` copies templates that then belong to consumer
- State stored in `~/.claude/mantra-state.json` (global, not per-project)
- VS Code extension doesn't prominently display `systemMessage` from hooks (platform limitation)

## Files Changed
- `ARCHITECTURE.md` - new file documenting plugin internals

## Next Steps
- Merge PR #8 when approved
