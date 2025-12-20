# Session: memento-status-on-main

## Details
- **Branch**: chore/memento-status-on-main
- **Type**: chore
- **Created**: 2025-12-20
- **Status**: in-progress

## Goal
1. Show memento status on main/master branches (like onus does)
2. Fix sibling plugin discovery bug (user-scoped plugins not discovered)

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Updated memento hook to show status on main/master branches
- 2025-12-20: Updated tests for new behavior
- 2025-12-20: Tests pass
- 2025-12-20: Discovered major bug: memento/context/sessions.yml not being injected
- 2025-12-20: Root cause: mantra's `findSiblingPlugins` checks `installation.projectPath === cwd` but user-scoped plugins don't have `projectPath` field

## Key Decisions
- Show "No session (main)" on main/master instead of empty message (consistency with onus)
- Show "No session (not a git repo)" when not in git repo

## Bug Found
**mantra/hooks/context-refresh.js line 221:**
```javascript
if (installation.projectPath === cwd) {
```
User-scoped plugins have `scope: "user"` but no `projectPath`, so this is always false.

**Fix needed:** User-scoped plugins should apply to all projects. Only check `projectPath` for project-scoped plugins.

## Files Changed
- memento/hooks/session-startup.js - Show status on main/master
- memento/hooks/__tests__/session-startup.test.js - Updated tests
- mantra/hooks/context-refresh.js - Fix user-scoped sibling discovery
- mantra/hooks/__tests__/context-refresh.test.js - Add test for user-scoped

## Next Steps
1. Bump versions (memento patch, mantra patch)
2. Commit with session file
