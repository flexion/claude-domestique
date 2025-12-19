# Session: Issue #2 - Add SessionStart Hook

## Issue Details
- Issue Number: #2
- Title: Add SessionStart hook for context refresh on session start
- Created: 2024-12-07
- Status: In Progress
- GitHub URL: https://github.com/flexion/claude-mantra/issues/2

## Objective
Add a SessionStart hook that injects context immediately when a session starts, resumes, clears, or compacts.

## Problem
Currently, context refresh only triggers every N prompts (default 20). Claude starts sessions without guidance and must wait for the refresh interval.

## Requirements
- SessionStart hook triggers on session start/resume/clear/compact
- Injects `.claude/context/*.yml` files (same as UserPromptSubmit refresh)
- Falls back to CLAUDE.md if no context files
- Resets interaction counter on session start
- Tests added
- README updated

## Technical Approach
- Add SessionStart to `.claude/settings.json` hooks config
- Modify `context-refresh.js` to handle both event types
- SessionStart input includes `source` field: "startup" | "resume" | "clear" | "compact"
- On SessionStart, always inject context and reset counter to 0

## Session Log

### 2024-12-07 - Session Created
- Created branch: issue/feature-2/session-start-hook
- Created GitHub issue #2

### 2024-12-07 - Implementation Complete
- Refactored `context-refresh.js` to handle both SessionStart and UserPromptSubmit events
- Added `processSessionStart()` function that always injects context and resets counter
- Added `processUserPromptSubmit()` function (extracted from original `processHook`)
- Added `buildContextContent()` helper to share context building logic
- Added routing in `processHook()` based on `hook_event_name`
- Updated `.claude/settings.json` to register SessionStart hook
- Added 12 new tests for SessionStart behavior (36 total)
- Updated README with SessionStart feature

## Key Decisions
1. **Same script handles both events** - Simpler than two separate scripts
2. **Reset counter on session start** - Ensures fresh start, counter begins at 0
3. **Include source in refresh reason** - Shows "session startup", "session resume", etc.
4. **Always inject on SessionStart** - No waiting for interval

## Files Changed
- `.claude/hooks/context-refresh.js` - Added SessionStart handling
- `.claude/hooks/__tests__/context-refresh.test.js` - Added SessionStart tests
- `.claude/settings.json` - Added SessionStart hook config
- `README.md` - Updated features and usage

## Next Steps
1. Commit and create PR
