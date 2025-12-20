# Session: Post Tool Use Hook

**Issue**: #47
**Branch**: issue/feature-47/post-tool-use-hook
**Type**: feature
**Created**: 2025-12-20
**Status**: in-progress

## Goal
Add a PostToolUse hook to memento that automatically updates the session file's "Files Changed" section after Edit/Write operations.

## Approach
1. Create `hooks/post-edit.js` in memento
2. Hook triggers on PostToolUse for Edit and Write tools
3. Extracts file path from `tool_input.file_path`
4. Appends to "Files Changed" section if not already listed
5. Handle missing session gracefully (no error)

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Researched PostToolUse hook format (receives tool_name, tool_input, tool_response)
- 2025-12-20: Created hooks/post-edit.js with session update logic
- 2025-12-20: Added comprehensive tests (20 new tests, all passing)
- 2025-12-20: Updated hooks.json with PostToolUse configuration
- 2025-12-20: Added root package.json with unified test/coverage commands
- 2025-12-20: Added GitHub Actions PR check workflow with coverage thresholds

## Key Decisions
- Use fs.realpathSync to normalize paths (handles macOS symlinks in temp dirs)
- Skip tracking .claude/* files to avoid recursive updates
- Return hookSpecificOutput.additionalContext to notify Claude of updates

## Learnings
- PostToolUse hooks receive tool_input.file_path for Edit/Write tools
- macOS temp directories use symlinks (/var/folders/...) which break path.relative
- Need to create test files on disk when using fs.realpathSync in shouldTrackFile

## Files Changed
- memento/hooks/post-edit.js (new)
- memento/hooks/hooks.json (updated)
- memento/hooks/__tests__/post-edit.test.js (new)
- memento/package.json (coverage thresholds)
- package.json (new - root)
- .gitignore (coverage/)
- .github/workflows/pr-check.yml (new)
- mantra/package.json (test:coverage)
- mantra/jest.config.js (new)
- onus/jest.config.js (new)

## Next Steps
- [x] Research PostToolUse hook format
- [x] Create hooks/post-edit.js
- [x] Add tests
- [x] Update hooks.json with hook configuration
- [ ] Commit and create PR
