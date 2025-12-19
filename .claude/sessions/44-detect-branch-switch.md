# Session: Detect Branch Switch Mid-Session

**Issue**: #44
**Branch**: issue/feature-44/detect-branch-switch
**Type**: feature
**Created**: 2025-12-19
**Status**: in-progress

## Goal
Detect when a user switches git branches mid-session and refresh plugin context accordingly. Currently all three plugins (memento, mantra, onus) only detect the branch at SessionStart, causing stale context if the user switches branches.

## Approach
1. Check current branch vs saved branch in UserPromptSubmit hook
2. If different, trigger a refresh that re-detects branch and updates context
3. Could be a shared utility across the plugin family

## Session Log
- 2025-12-19: Session created, reviewed issue #44
- 2025-12-19: Explored all three plugins - found only onus needs fixing
- 2025-12-19: Implemented branch change detection in onus UserPromptSubmit
- 2025-12-19: Added "branch switched" indicator to status message
- 2025-12-19: Added 2 new tests, all 51 onus tests pass
- 2025-12-19: Fixed memento NaN/undefined bug in loadProjectConfig
- 2025-12-19: All 90 memento tests pass, bumped both versions

## Key Decisions
- Only onus needed fixing (memento re-detects every call, mantra has no branch logic)
- Added branch change detection at start of processUserPromptSubmit
- Shows "branch switched" indicator when branch changes mid-session
- Creates placeholder work item when switching to a branch with new issue

## Learnings
- memento already handles branch switches (re-detects every hook call)
- mantra doesn't care about branches (project-wide context refresh)
- onus was the only plugin caching branch in state without re-checking
- loadProjectConfig bug: returning undefined values overwrites defaults when spread

## Files Changed
- onus/hooks/work-item.js - Added branch change detection in UserPromptSubmit
- onus/hooks/__tests__/work-item.test.js - Added 2 tests for branchChanged indicator
- memento/hooks/session-startup.js - Fixed loadProjectConfig to not return undefined values

## Next Steps
- [x] Explore current plugin implementations to understand branch detection
- [x] Design shared utility or per-plugin approach
- [x] Implement branch change detection in UserPromptSubmit
- [x] Run onus tests (51 pass)
- [x] Fix memento NaN/undefined bug
- [x] Bump onus and memento versions
- [ ] Commit version bumps and memento fix
