# Session: Hook-based Context Injection

**Issue**: #99
**Branch**: issue/feature-99/hook-based-context-injection
**Type**: feature
**Created**: 2025-12-25
**Status**: in-progress

## Goal
Refactor all three plugins (mantra, memento, onus) to support transparent context loading via hooks, eliminating the need for users to run `/init` commands.

## Approach
1. Implement hook-based context injection using `additionalContext` in hook output
2. Use two-tier context pattern: compact rules auto-loaded, companion docs lazy-loaded
3. Add periodic refresh every N prompts to prevent drift
4. Keep init commands optional for users who prefer explicit files
5. Maintain version detection warnings for outdated copied files

## Session Log
- 2025-12-25: Session created
- 2025-12-25: Completed hooks research - documented all 10 hook events, inbound/outbound data structures, context injection patterns
- 2025-12-25: Created shared module with centralized context loading utilities
- 2025-12-25: Implemented hook-based context injection in mantra with periodic refresh
- 2025-12-25: Updated memento and onus to use shared module
- 2025-12-25: Removed /init commands from all plugins - now zero config
- 2025-12-25: Updated documentation (CLAUDE.md files)
- 2025-12-25: All 127 tests passing (removed 60 init-related tests)
- 2025-12-25: Added shared handleUserPromptSubmit with standardized status line format (#N ✓)
- 2025-12-25: Removed dead code (checkOutdated, checkVersionStatus, version file handling) - 112 tests passing
- 2025-12-25: Unified shared module - plugins now provide { pluginName, pluginRoot } with optional callbacks
- 2025-12-25: Simplified tests to only cover plugin-specific logic
- 2025-12-25: Added comprehensive shared module tests (28 tests)
- 2025-12-25: All 94 tests passing (shared: 28, mantra: 25, memento: 11, onus: 30)

## Key Decisions
- Use `additionalContext` field in hook output for context injection (not `systemMessage`)
- Created `@claude-domestique/shared` module for centralized utilities
- npm workspaces + bundling pattern: shared code bundled into each plugin's `lib/shared.js`
- Inject plugin rules only when no project rules exist (avoid duplication with native loading)
- Periodic refresh every 10 prompts for context drift prevention
- Unified hook handler: plugins provide `{ pluginName, pluginRoot, onSessionStart?, onUserPromptSubmit? }`
- Plugin tests only cover plugin-specific logic, shared module tests cover core functionality

## Learnings
- `systemMessage` → UI display only; `additionalContext` → injected into Claude's context
- SessionStart fires with `source: "compact"` after compaction - may reduce need for periodic refresh
- Multiple hooks' `additionalContext` values are concatenated
- Exit code 0 + JSON enables structured responses; exit code 2 blocks with error
- Jest mocks don't apply to bundled modules - need to mock the bundled path separately
- Callback pattern allows plugins to augment shared behavior while keeping core logic centralized

## Files Changed
- `docs/research/hooks-context-injection.md` - comprehensive hooks research
- `shared/index.js` - unified hook handler (runHook, processHook, loadPluginContext)
- `shared/__tests__/index.test.js` - shared module tests
- `shared/package.json` - added jest devDependency
- `package.json` - added test:shared script
- `mantra/hooks/session-monitor.js` - uses shared module with callbacks for context analysis
- `mantra/hooks/__tests__/session-monitor.test.js` - simplified to test plugin-specific logic
- `memento/hooks/session-startup.js` - uses shared module with callbacks for session handling
- `memento/hooks/__tests__/session-startup.test.js` - simplified tests
- `onus/hooks/work-item.js` - uses shared module with callbacks for work item tracking
- `onus/hooks/__tests__/work-item.test.js` - simplified tests

## Next Steps
- [x] Analyze current hook implementations across all three plugins
- [x] Design shared utility for context loading
- [x] Implement hook-based injection in mantra
- [x] Update memento to use shared module
- [x] Update onus to use shared module
- [x] Remove /init commands (now zero config)
- [x] Update documentation (CLAUDE.md files)
- [x] Create unified shared module with callback pattern
- [x] Simplify plugin tests to cover only plugin-specific logic
- [x] Add shared module tests
- [x] Run all tests (94 passing)
- [x] Commit changes (abec184)
