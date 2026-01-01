# Session: Session complete before commit, not after PR

## Details
- **Issue**: #115
- **Branch**: issue/feature-115/session-complete-before-commit
- **Type**: enhancement
- **Created**: 2026-01-01
- **Status**: complete

## Objective
Mark session "complete" BEFORE the final commit, not after PR creation. This eliminates orphaned uncommitted session changes and ensures a clean working directory after PR creation.

## Acceptance Criteria
- [x] `/onus:commit` prompts to mark session complete before commit
- [x] `/onus:pr` does not update session after PR creation
- [x] `sessions.md` rule documents: complete before commit, no post-PR updates
- [x] `sessions.md` context updated with new completion workflow
- [x] READMEs updated if they reference the old workflow (verified: no changes needed)
- [x] PR number not tracked in session (discoverable via `gh pr view`)
- [x] Clean working directory after PR creation (result of above changes)

## Technical Approach
1. Update `memento/rules/sessions.md` - Change "before-push" → "before-final-commit", add no-post-PR rule
2. Update `memento/context/sessions.md` - Update "Completing Work" section with new workflow
3. Update `onus/commands/commit.md` - Add session completion prompt before final commit
4. Update `onus/commands/pr.md` - Verify session already complete, no post-PR updates

## Session Log

### 2026-01-01 - Session Started
- Created branch and session file from issue #115
- Issue identified: current workflow leaves uncommitted session changes after PR creation

### 2026-01-01 - Implementation Complete
- Updated memento/rules/sessions.md: changed "before-push" → "before final commit", added no-post-PR rule
- Updated memento/context/sessions.md: rewrote "Completing Work" section with new workflow
- Updated onus/commands/commit.md: added session completion check step
- Updated onus/commands/pr.md: added session status verification, clarified no post-PR updates
- Verified READMEs don't reference post-PR session updates (no changes needed)

## Key Decisions
- Session marked complete BEFORE final commit (not before push) - clearer timing
- PR number explicitly not stored in session - use `gh pr view` instead
- Added explicit "clean working directory" expectation after PR creation

## Learnings
- Current docs already said "before PR" but timing was ambiguous
- READMEs don't actually reference post-PR session updates - no changes needed

## Files Changed
- memento/rules/sessions.md - COMPLETION section rewritten
- memento/context/sessions.md - "Completing Work" section rewritten
- onus/commands/commit.md - Added session completion check step
- onus/commands/pr.md - Added session status verification, no post-PR updates
- memento version bump: 0.3.5 → 0.3.6
- onus version bump: 0.2.6 → 0.2.7

## Next Steps
1. Commit changes
2. Create PR
