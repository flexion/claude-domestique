# Session: Document AI-Managed Context Files

**Issue**: #58
**Branch**: issue/feature-58/document-ai-managed-context
**Type**: feature
**Created**: 2025-12-20
**Status**: in-progress

## Goal
Document that context/*.yml files are AI-managed, not intended for direct human editing.

## Approach
1. Update README with guidance that *.yml files are AI-managed
2. Add header comments to base context files
3. Add user-facing documentation to format-guide.md

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Updated README with AI-Managed Files section
- 2025-12-20: Added header comments to all 6 base context files
- 2025-12-20: Created format-guide.md with user-facing documentation
- 2025-12-20: All tests pass (mantra 85, memento 90, onus 51)

## Key Decisions
- Header comment format: `# AI-managed context file - optimized for token efficiency`
- Two-line header: first line explains what, second line explains how to modify

## Learnings
- None yet

## Files Changed
- README.md (added AI-Managed Files section)
- mantra/context/behavior.yml (header comment)
- mantra/context/format-guide.yml (header comment)
- mantra/context/context-format.yml (header comment)
- mantra/context/format-guide.md (new - user-facing docs)
- memento/context/sessions.yml (header comment)
- onus/context/git.yml (header comment)
- onus/context/work-items.yml (header comment)

## Next Steps
- [x] Add header comments to base context files (6 files)
- [x] Create format-guide.md with user-facing documentation
- [ ] Commit and create PR
