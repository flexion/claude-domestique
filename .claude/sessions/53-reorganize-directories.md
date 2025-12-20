# Session: Reorganize Non-Standard Plugin Directories

**Issue**: #53
**Branch**: issue/feature-53/reorganize-directories
**Type**: feature
**Created**: 2025-12-20
**Status**: in-progress

## Goal
Reorganize memento's non-standard `tools/` directory to follow plugin conventions by renaming to `scripts/`.

## Approach
1. Rename `memento/tools/` to `memento/scripts/`
2. Update all imports in hooks that reference `../tools/`
3. Update documentation referencing `tools/`
4. Verify tests pass
5. Check onus (already has `scripts/` - no changes needed)

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Renamed memento/tools/ to memento/scripts/
- 2025-12-20: Confirmed onus already uses scripts/ convention

## Key Decisions
- Keep templates/ as-is (not a standard plugin component, used for scaffolding)

## Learnings
- onus already follows the scripts/ convention

## Files Changed
- memento/tools/ → memento/scripts/ (renamed)
- memento/hooks/session-startup.js
- memento/hooks/verify-session.js
- memento/hooks/post-edit.js
- CLAUDE.md
- memento/ARCHITECTURE.md
- memento/scripts/__tests__/create-session.test.js
- memento/scripts/__tests__/get-session.test.js

## Next Steps
- [ ] Update imports in memento hooks (3 files)
- [ ] Update documentation references
- [ ] Run tests to verify
- [ ] Commit and create PR
