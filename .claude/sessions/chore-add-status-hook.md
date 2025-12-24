# Session: Add Status Hook

**Issue**: N/A (chore)
**Branch**: chore/add-status-hook
**Type**: chore
**Created**: 2025-12-24
**Status**: complete

## Goal
Enhance mantra's statusline feature with model/cost display, hash tracking for update detection, and improved documentation.

## Approach
1. Research the Status event JSON structure (done)
2. Clarify the distinction between hooks and statusLine mechanisms (done)
3. Add tests for statusline.js (done)
4. Improve statusline.js with cost/model display (done)
5. Track statusline.js hash in version file (done)
6. Warn on SessionStart if statusline is outdated (done)
7. Document statusLine configuration and IDE compatibility (done)

## Session Log
- 2025-12-24: Session created
- 2025-12-24: Researched "Status" hook event
- 2025-12-24: Clarified distinction: Status is not a hook, but a statusLine command mechanism
- 2025-12-24: Added 17 tests for statusline.js
- 2025-12-24: Enhanced statusline.js with model and cost display
- 2025-12-24: Updated init.js to track statusline.js hash in .mantra-version.json
- 2025-12-24: Updated status.js to check statusline hash and warn if outdated
- 2025-12-24: Added 2 tests for statusline outdated warnings
- 2025-12-24: Updated README.md with statusline documentation and IDE compatibility
- 2025-12-24: All 56 tests passing

## Key Decisions
- "Status" is NOT a hook you register in `hooks` array
- "Status" IS a special event sent to `statusLine` command
- statusLine command receives `hook_event_name: "Status"` via statusLine config, not hooks config
- Statusline is CLI-only; VS Code extension GUI doesn't support it (but integrated terminal does)
- Hash tracking enables warning users when plugin updates are available

## Learnings
- Two distinct mechanisms in Claude Code:
  1. **Hooks** (`hooks` in settings.json): 10 events (SessionStart, UserPromptSubmit, etc.)
  2. **StatusLine** (`statusLine` in settings.json): Separate mechanism, sends `hook_event_name: "Status"`
- statusLine command receives rich JSON: session_id, model, workspace, cost, context_window
- context_window.current_usage provides real token counts (not estimates)
- First line of stdout becomes the statusline display text

## Files Changed
- `mantra/scripts/statusline.js` - Enhanced with model/cost display
- `mantra/scripts/init.js` - Added statusline.js hash tracking
- `mantra/hooks/status.js` - Added statusline outdated detection
- `mantra/hooks/__tests__/status.test.js` - Added 2 tests for statusline outdated
- `mantra/scripts/__tests__/statusline.test.js` - New file, 17 tests
- `mantra/README.md` - Enhanced statusline documentation with IDE compatibility

## Next Steps
- [x] All tasks complete
- [ ] Ready for commit and PR
