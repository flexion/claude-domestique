# Session: Repair onus config init

## Details
- **Branch**: chore/onus-config-init
- **Type**: chore
- **Created**: 2025-12-26
- **Status**: in-progress

## Goal
Create the missing `onus/scripts/init.js` with auto-detection utilities that enable zero-config operation while supporting explicit configuration when needed.

## Approach (revised)
1. Create `onus/scripts/init.js` with utility functions:
   - `detectGitRemote(cwd)` - Parse git remote URL to detect platform
   - `buildDefaultConfig(detected, overrides)` - Generate config object
   - `hasExistingConfig(projectPath)` - Check if config exists
   - `init(projectPath, options)` - Main entry, writes `.claude/config.json`

2. Create `onus/scripts/__tests__/init.test.js` with test coverage

3. Run tests to verify

## Key Decisions
- **Minimal stub + auto-detection**: Zero-config by default, auto-detects GitHub/Azure from git remote
- **No interactive wizard**: Keep it simple, users edit config manually if needed
- **No skill command**: Just the script with programmatic API

## Session Log

### 2025-12-26 - Session Started
- Created branch chore/onus-config-init from main
- Plan developed and approved (see ~/.claude/plans/cheerful-enchanting-dawn.md)

### 2025-12-26 - Implementation Complete
- Re-analyzed options, chose minimal stub approach (no interactive wizard)
- Revised approach: VCS is always GitHub, work item platform is explicit
- Created `onus/scripts/init.js` with:
  - `detectGitRemote()` - extracts owner/repo from GitHub remote (including enterprise)
  - `buildDefaultConfig(platform, detected, overrides)` - builds config for explicit platform
  - `hasExistingConfig()` - checks if `.claude/config.json` has onus section
  - `init()` - writes config file, defaults to github, supports jira/azure
- Supported platforms: github (default), jira, azure
- Created comprehensive tests (28 new tests, all pass)
- Total: 59 tests passing

## Notes
- `onus/index.js:10` imports `{ init, detectGitRemote, buildDefaultConfig }` - now satisfied
- VCS assumed to be GitHub (including enterprise)
- Work item platform must be explicitly set (defaults to github)

## Files Changed
- `onus/scripts/init.js` (created)
- `onus/scripts/__tests__/init.test.js` (created)

## Next Steps
1. Commit changes
2. Create PR
