# Session: chore/cleanup-stale-yml-references

## Details
- **Type**: Chore
- **Branch**: `chore/cleanup-stale-yml-references`
- **Created**: 2026-01-14

## Goal
Remove stale references to `.yml` context files throughout documentation. The project migrated from `context/*.yml` to `rules/*.md` but documentation still referenced the old pattern.

## Session Log
- 2026-01-14: Identified stale yml references in CLAUDE.md, FORMAT.md, shared code, and companion docs
- 2026-01-14: Updated CLAUDE.md - meta table, plugin structure, context system, ownership table
- 2026-01-14: Rewrote mantra/FORMAT.md to reflect rules/*.md pattern
- 2026-01-14: Updated context/context-format.md and context/format-guide.md
- 2026-01-14: Updated context/test.md and context/rule-design.md
- 2026-01-14: Updated all skill files (work-item-handler, session-manager, resume)
- 2026-01-14: Updated rules/context-format.md and rules/behavior.md
- 2026-01-14: Note: shared/index.js keeps findYmlFiles() for backwards compatibility

## Files Changed
- CLAUDE.md
- mantra/FORMAT.md
- mantra/context/context-format.md
- mantra/context/format-guide.md
- mantra/context/test.md
- mantra/context/rule-design.md
- mantra/rules/context-format.md
- mantra/rules/behavior.md
- onus/skills/work-item-handler/SKILL.md
- memento/skills/session-manager/SKILL.md
- memento/skills/resume/SKILL.md

## Next Steps
- [x] Update documentation files
- [x] Update skill files
- [x] Update rules files
- [ ] Commit and merge
