# Session: chore/rule-trigger-verification

**Branch:** `chore/rule-trigger-verification`
**Type:** Chore
**Status:** complete

## Goal

Solve the problem where rules in context aren't being actively consulted at trigger points. Rules define triggers, but Claude doesn't reliably execute verification at those moments.

## Problem Statement

From user analysis:
1. Context loss from compaction: summaries don't explicitly note "session file still has placeholders"
2. No verification step: never read session file to check its state
3. Rule awareness vs. rule application: rules in context, but not actively consulted at trigger points
4. No thinking block verification at trigger moments

Root cause: Having rules in context isn't enough - need to actively consult them at the specified moments.

## Approach

MVP approach with two components:

1. **Session file validation before git commit** (checkpoint.js)
   - Read session file content before git commit
   - Check for placeholder text patterns
   - Inject specific, actionable warning if placeholders found

2. **Periodic session update reminder** (session-startup.js)
   - Every 5 prompts, inject a more prominent reminder
   - Asks: "Has anything happened worth recording?"
   - Prompts to capture key decisions, requirements, design changes, blockers

Key insight: UserPromptSubmit hooks can't see user prompt text, but PreToolUse hooks CAN see the exact tool being invoked. We use this for commit validation.

## Session Log

- Created branch and session file
- Reviewed existing rule-design guide (just added)
- Reviewed sessions.md and git.md rules - they have proper structure but no enforcement
- Explored hook system: learned UserPromptSubmit can't see prompt text, only tool usage
- Explored existing MANDATORY-REREAD patterns and precedence reminders
- Designed state-aware validation approach using PreToolUse hooks
- Implemented `validateSessionFile()` function in checkpoint.js
- Updated git commit case to check for placeholders and inject specific warnings
- Added comprehensive tests for validation functionality
- Added periodic session update reminder (every 5 prompts) to session-startup.js
- All tests pass (42 in memento)
- Bumped memento version 0.3.3 → 0.3.4

## Files Changed

- `memento/hooks/checkpoint.js` - Added validateSessionFile() function, state-aware git commit warnings, exports for testing
- `memento/hooks/__tests__/checkpoint.test.js` - New test file for checkpoint validation (10 tests)
- `memento/hooks/session-startup.js` - Added periodic session update reminder every 5 prompts
- `memento/package.json` - Version 0.3.4
- `memento/.claude-plugin/plugin.json` - Version 0.3.4
- `.claude-plugin/marketplace.json` - memento version 0.3.4

## Next Steps

- [x] Add validateSessionFile() function to checkpoint.js
- [x] Update git commit case to use validation
- [x] Add tests for session validation
- [x] Run tests to verify no regressions
- [x] Add periodic session update reminder to UserPromptSubmit
- [x] Bump memento patch version
- [ ] Commit changes
- [ ] Create PR

## Future Enhancements (not in this MVP)

- Add detection for `gh pr create` commands
- Add branch validation (warn if on main)
- Create gatekeeper.js in onus for git-specific enforcement
- Strengthen precedence reminder with action-oriented wording
