# Session: Update Session Completion Guidance

**Branch**: chore/update-session-completion-guidance
**Type**: chore
**Created**: 2025-12-20
**Status**: complete

## Goal
Add guidance to memento context about when to mark sessions complete - specifically that it should happen BEFORE the final commit, not after PR merge.

## Lesson Learned
After PR merge, feature branch changes can't be pushed. So session status must be updated before the final commit/push.

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Added Session Completion section to sessions.yml

## Files Changed
- memento/context/sessions.yml - add completion timing guidance
- .claude/context/project.yml - add version bumping guidance

## Next Steps
- [x] Update sessions.yml with completion timing
- [x] Run tests (162/162 pass)
- [x] Mark session complete
- [x] Commit and PR
