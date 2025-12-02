# Session: Issue #38 - Extract Context Refresh into Dedicated Agent

## Issue Details
- **Number**: #38
- **Title**: Extract context refresh into dedicated agent
- **Created**: 2024-12-02
- **Status**: In Progress
- **URL**: https://github.com/flexion/claude-domestique/issues/38

## Objective

Extract the periodic context refresh functionality from the `context-loader` skill into a dedicated agent for better separation of concerns and improved reliability.

## Requirements

### Core Components
1. **context-refresh agent** - New agent that monitors and triggers periodic refresh
2. **Refactored context-loader skill** - Remove periodic refresh, keep loading logic
3. **Agent-skill invocation** - Agent calls skill for actual loading
4. **Configuration respect** - Honor `periodicRefresh.enabled` and `periodicRefresh.interval`

### Agent Responsibilities
- Track interaction count (internal state)
- Trigger refresh at configured interval (default: 50)
- Skip if recently refreshed (within last 10 interactions)
- Report refresh results
- Handle per-project configuration

### Skill Responsibilities (after refactor)
- Load context at session start
- Handle manual refresh requests ("refresh context")
- Two-tier loading (plugin core + project custom)
- Report what was loaded

## Technical Approach

### Step 1: Create context-refresh agent
Create `agents/context-refresh/AGENT.md` with:
- Trigger conditions (interaction count threshold)
- State tracking (interaction counter)
- Invocation of context-loader skill
- Configuration handling

### Step 2: Refactor context-loader skill
Remove from `skills/context-loader/SKILL.md`:
- Periodic refresh trigger conditions
- Interaction count tracking
- Periodic refresh examples

Keep:
- Session start loading
- Manual refresh triggers
- Two-tier loading logic
- All loading steps

### Step 3: Ensure integration
- Agent invokes skill (not duplicate logic)
- Configuration stays in `context.periodicRefresh`
- No regression in loading behavior

## Implementation Plan

- [ ] Create `agents/context-refresh/AGENT.md`
- [ ] Remove periodic refresh from `skills/context-loader/SKILL.md`
- [ ] Verify skill still handles session start and manual refresh
- [ ] Test agent triggers at correct interval
- [ ] Test configuration options (enable/disable, interval)
- [ ] Integration test in test project

## Dependencies
- `skills/context-loader/SKILL.md` - Current implementation
- `.claude/config.json` - Configuration location

## Success Criteria
- [ ] Agent created at `agents/context-refresh/AGENT.md`
- [ ] Periodic refresh removed from context-loader skill
- [ ] Agent invokes skill for loading (no duplication)
- [ ] Configuration honored (enabled, interval)
- [ ] No regression in context loading
- [ ] Integration tested

## Session Log

### 2024-12-02 - Session Created
**Actions:**
1. Created GitHub issue #38 with requirements
2. Evaluated ROADMAP - aligns with Phase 3B improvements
3. Created feature branch: issue/feature-38/context-refresh-agent
4. Created branch metadata and session file
5. Documented objective, requirements, approach

**Key findings:**
- Context-loader skill currently mixes loading and periodic refresh
- Agent pattern better suited for state tracking (interaction count)
- Separation improves reliability and clarity

### 2024-12-02 - Implemented Context-Refresh Agent
**Actions:**
1. Created `agents/context-refresh.md` with:
   - Trigger conditions (interaction threshold)
   - State tracking (interaction_count, last_refresh_at, refresh_interval)
   - Agent invokes context-loader skill for actual loading
   - Configuration handling (enabled, interval)
   - Examples for normal refresh, skip, disabled, custom interval
   - Error handling for missing config, skill failures
2. Refactored `skills/context-loader/SKILL.md`:
   - Removed periodic refresh from trigger conditions
   - Added "Agent Invocation" trigger condition
   - Removed periodicRefresh from configuration section
   - Updated Example 4 to show agent-triggered refresh
   - Updated Integration section (added context-refresh agent)
   - Removed "Periodic Refresh Benefits" notes section
   - Added reference to context-refresh agent in Notes

**Key decisions:**
- Agent handles scheduling/state, skill handles loading logic
- Configuration stays in `context.periodicRefresh` (read by agent)
- Skill can still be triggered manually or by agent

**Files modified:**
- agents/context-refresh.md (created)
- skills/context-loader/SKILL.md (refactored)

### 2024-12-02 - Version Bump and PR
**Actions:**
1. Bumped plugin version from 0.1.2 to 0.1.3
2. Created PR for merge to main

### 2024-12-02 - Reduced Default Interval
**Actions:**
1. Changed default refresh interval from 50 to 20 interactions
2. Updated all examples and documentation to reflect new default

**Reason:** 50 interactions may be too late to catch drift; 20 provides more frequent reinforcement

### 2024-12-02 - Added Testable Node.js Implementation
**Actions:**
1. Created `src/context-refresh-tracker.js` with core logic:
   - `checkRefresh()` - main function, tracks interactions and returns action
   - `readState()` / `writeState()` - file-based state persistence
   - `readConfig()` - reads from `.claude/config.json`
   - `resetState()` - clears state for testing/session start
   - `recordManualRefresh()` - handles manual "refresh context" commands
   - CLI entry point for direct invocation
2. Created `src/context-refresh-tracker.test.js` with 14 unit tests:
   - checkRefresh behavior (4 tests)
   - configuration handling (5 tests)
   - state management (3 tests)
   - recordManualRefresh (2 tests)
3. Created `hooks/prompt-submit/check-refresh.js` hook:
   - Calls tracker on each user message
   - Outputs refresh message when needed
4. Created `package.json` with Jest test runner
5. Added `.claude/state/` to `.gitignore`
6. All 14 tests pass

**Key decisions:**
- Node.js over Bash (guaranteed available, better JSON handling, testable)
- File-based state in `.claude/state/refresh-tracker.json`
- Markdown agent spec becomes documentation, Node.js is implementation

**Files created:**
- `src/context-refresh-tracker.js`
- `src/context-refresh-tracker.test.js`
- `hooks/prompt-submit/check-refresh.js`
- `package.json`

### 2024-12-02 - Registered Hook in Plugin Manifest
**Actions:**
1. Investigated Claude Code hook system
   - Hooks declared in plugin.json under `hooks` field
   - Node.js hooks supported via `#!/usr/bin/env node` shebang
   - Hooks invoked via shell execution with JSON stdin
   - Exit code 0 = success, exit code 2 = blocking error
2. Added `hooks` configuration to `.claude-plugin/plugin.json`:
   - Registered `UserPromptSubmit` hook
   - Points to `./hooks/prompt-submit/check-refresh.js`
3. Tested hook locally:
   - Ran 21 interactions, confirmed refresh triggers at interaction 20
   - Output shows refresh message with next refresh target

**Key findings:**
- Claude Code discovers hooks from plugin.json during plugin installation
- Hook paths are relative to plugin root
- UserPromptSubmit fires on every user message submission

## Key Decisions

### Decision 1: Separation of Concerns
**Choice:** Agent handles scheduling, skill handles loading
**Reason:** Agent pattern better for state tracking (interaction count), skill pattern better for auto-invoke on triggers
**Impact:** Clean separation, each component has single responsibility

### Decision 2: Configuration Location
**Choice:** Keep `periodicRefresh` config in `context` section
**Reason:** Logically related to context, agent reads same config location
**Impact:** No config migration needed

## Learnings

- Skills are best for reactive auto-invoke (trigger words, session start)
- Agents are best for proactive monitoring (interaction counting, state tracking)
- Agent-skill composition allows reuse of loading logic

## Files Created

- `agents/context-refresh.md` - Agent behavioral specification (documentation)
- `src/context-refresh-tracker.js` - Core logic (testable implementation)
- `src/context-refresh-tracker.test.js` - Unit tests (14 tests)
- `hooks/prompt-submit/check-refresh.js` - Hook integration
- `package.json` - Node.js project config with Jest

## Files Modified

- `skills/context-loader/SKILL.md` - Removed periodic refresh, added agent invocation
- `.claude-plugin/plugin.json` - Version bump to 0.1.3, added hooks configuration
- `.gitignore` - Added `.claude/state/` for runtime state

## Next Steps
1. Merge PR after review
2. Integration test in test project (install plugin, run 20+ interactions)
3. Verify hook triggers at correct interval
