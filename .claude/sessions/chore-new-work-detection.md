# Session: new-work-detection

**Branch**: chore/new-work-detection
**Type**: chore
**Created**: 2025-12-20
**Status**: complete

## Goal
Enhance memento's SessionStart hook to detect when a session is complete and warn that new work requires a new branch/session.

## Approach
1. Modify SessionStart hook to check session status
2. When status is "complete", inject warning message
3. Add tests for the new behavior

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Identified gap - Claude proceeded with new task on completed session branch
- 2025-12-20: Implemented complete session warning in SessionStart hook
- 2025-12-20: Added 2 tests for the new behavior (164/164 pass)
- 2025-12-20: Added TDD enforcement to behavior.yml and test.yml
- 2025-12-20: All tests pass (164 memento + 85 mantra)

## Key Decisions
- Use state-based detection (session status = complete) rather than NLP-based phrase detection
- Warning should be injected at SessionStart, not UserPromptSubmit

## Learnings
- Memento can't know when user starts new task vs. continuing current one
- Context guidance alone wasn't sufficient - need active warning
- TDD workflow must be enforced via MANDATORY-REREAD, not just documented

## Files Changed
- memento/hooks/session-startup.js
- memento/hooks/__tests__/session-startup.test.js
- mantra/context/behavior.yml
- mantra/context/test.yml

## Next Steps
- [x] Review current SessionStart hook implementation
- [x] Add status check and warning injection
- [x] Add tests for complete session warning
- [x] Run full test suite (164/164 pass)
- [x] Add TDD enforcement to context files
- [x] Bump versions (memento 0.1.19, mantra 0.1.8)
- [ ] Commit and PR
