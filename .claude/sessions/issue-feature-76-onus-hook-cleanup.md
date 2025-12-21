# Session: onus-hook-cleanup

## Details
- **Branch**: issue/feature-76/onus-hook-cleanup
- **Type**: feature
- **Created**: 2025-12-21
- **Issue**: #76
- **Status**: in-progress

## Goal
Minimal cleanup + CRUD commands for onus. Issue #76 originally asked for skill delegation pattern, but PR #80 proved that doesn't work (same as #75). Taking pragmatic approach:

1. **Minimal hook cleanup** - Align status line format with memento (NEW →, SWITCHED →)
2. **CRUD commands** - Add `/onus:create`, `/onus:update`, `/onus:close` as user-invocable commands

Not doing:
- Hook reduction to ~50 LOC (skill delegation doesn't work)
- Automatic skill handoff from hook

## Session Log
- 2025-12-21: Session created
- 2025-12-21: Chose minimal cleanup + CRUD commands approach
- 2025-12-21: Implemented changes:
  - Updated status line format (NEW →, SWITCHED →, aligned with memento)
  - Created `/onus:create` command for creating work items
  - Created `/onus:update` command for updating/commenting
  - Created `/onus:close` command for closing work items
  - Updated plugin.json with new commands
  - 52 tests passing

## Files Changed
- `onus/hooks/work-item.js` - Updated status line format
- `onus/hooks/__tests__/work-item.test.js` - Updated tests for new format
- `onus/commands/create.md` - New command
- `onus/commands/update.md` - New command
- `onus/commands/close.md` - New command
- `onus/.claude-plugin/plugin.json` - Registered new commands

## Acceptance Criteria Addressed
From issue #76:
- [x] Remove counter-based reminders (n/a - onus didn't have counter logic)
- [x] Works standalone (without mantra/memento)
- [x] Tests updated for new architecture
- [x] Status line updated (NEW →, SWITCHED →)
- [x] CRUD commands: create, update, close

Not addressed (due to skill delegation limitation):
- [ ] Hook reduced to ~50 LOC (637 LOC - skill delegation doesn't work)
- [ ] PreCompact hook (event not available yet)

## Next Steps
1. Ready to commit
