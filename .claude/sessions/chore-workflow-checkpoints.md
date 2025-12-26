# Session: Implement workflow checkpoints

## Details
- **Branch**: chore/workflow-checkpoints
- **Type**: chore
- **Created**: 2025-12-26
- **Status**: in-progress

## Goal
Implement two workflow checkpoints to ensure proper branch/session setup before analysis and implementation:
1. **Pre-analysis checkpoint**: Before exploring/planning, check if on correct branch
2. **Pre-implementation checkpoint**: After plan approval, verify session updated

## Problem Statement
When starting new work, Claude should:
- Notice if on main branch when user mentions "start a chore/issue"
- Ask if user wants to create branch + session BEFORE any analysis
- After plan approval, immediately update session with Approach

Currently this doesn't happen - analysis starts on main with no session tracking.

## Approach
1. Add PRE-ANALYSIS CHECKPOINT to memento/rules/sessions.md
2. Add PRE-IMPLEMENTATION CHECKPOINT to memento/rules/sessions.md
3. Update companion context (memento/context/sessions.md) with detailed explanations
4. Test the behavior

## Session Log

### 2025-12-26 - Session Started
- Created branch chore/workflow-checkpoints
- Identified failure mode: jumped to analysis without branch/session setup

### 2025-12-26 - Implemented Checkpoints (Rules)
- Added PRE-ANALYSIS CHECKPOINT section to memento/rules/sessions.md
  - Triggers when user mentions "start/begin/work on" + issue/chore/feature
  - Checks if on main/master branch
  - Asks before proceeding with analysis
- Added PRE-IMPLEMENTATION CHECKPOINT section to memento/rules/sessions.md
  - Triggers on ExitPlanMode (plan approved)
  - Verifies branch exists, session exists, updates Approach section
- Updated memento/context/sessions.md with detailed examples and explanations

### 2025-12-26 - Implemented Hook-Based Checkpoints
- Researched PostToolUse hook - can match specific tools
- Created memento/hooks/checkpoint.js to handle checkpoint events
- Updated memento/hooks/hooks.json with new hooks:
  - PostToolUse: ExitPlanMode, EnterPlanMode, Task, TodoWrite
  - PreToolUse: Bash(git commit*)
- Skipped PR events (too noisy per user feedback)

## Key Decisions
- **Hook vs Rules**: Rules alone weren't reliable (I failed to follow them). Hooks provide automatic reminders.
- **PostToolUse for Task**: Capture findings after agent completes, not intent before
- **Skip PR events**: Commit checkpoints yes, PR events no (too noisy)
- **Significant agents only**: Only remind for Plan/Explore agents, not quick searches

## Notes
- Both checkpoints are marked as "BLOCKING REQUIREMENT" in rules
- Hooks inject additionalContext reminders
- Pre-analysis uses AskUserQuestion pattern (rule-based)
- Pre-implementation is automatic (hook-based)

## Files Changed
- memento/rules/sessions.md (added 2 checkpoint sections)
- memento/context/sessions.md (added Workflow Checkpoints section)
- memento/hooks/hooks.json (added PostToolUse, PreToolUse hooks)
- memento/hooks/checkpoint.js (new - checkpoint handler)

## Next Steps
1. Run tests to verify no regressions
2. Commit changes
