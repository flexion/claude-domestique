# Session: Create onus init command

## Details
- **Branch**: chore/onus-create-config
- **Type**: chore
- **Created**: 2025-12-26
- **Status**: complete

## Goal
Create the `/onus:init` skill command to expose the init.js functionality.

## Session Log

### 2025-12-26 - Session Started
- Created branch chore/onus-create-config from main
- Discovered `onus/scripts/init.js` exists but no skill command

### 2025-12-26 - Implementation
- Created `onus/commands/init.md` skill command
- Registered command in `onus/.claude-plugin/plugin.json`
- Updated commitFormat/branchFormat to type-based maps (issue vs chore)
- Updated `onus/scripts/init.js` DEFAULT_CONFIG
- Updated `onus/templates/config/config.json.example`
- Bumped onus version to 0.2.2
- All 59 tests pass

## Files Changed
- `onus/commands/init.md` (created)
- `onus/.claude-plugin/plugin.json` (added init command, version bump)
- `onus/scripts/init.js` (type-based format maps)
- `onus/templates/config/config.json.example` (updated formats)
- `onus/package.json` (version bump)
- `.claude-plugin/marketplace.json` (version bump)
