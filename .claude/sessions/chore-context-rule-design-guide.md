# Session: Context Rule Design Guide

## Details
- **Branch**: chore/context-rule-design-guide
- **Type**: chore
- **Created**: 2025-12-27
- **Status**: in-progress

## Goal
Create a design guide document that explains how to write effective context rules for the claude-domestique plugin system. This will help contributors understand the two-tier pattern (yml + md), token efficiency principles, and best practices.

## Approach
1. Research existing context files to understand patterns
2. Draft the design guide structure
3. Write content covering key topics
4. Review and refine

## Session Log

### 2025-12-27 - Session Started
- Created branch and session file
- Chore: Create context rule design guide

### 2025-12-27 - Guide Created
- Created `mantra/context/rule-design.md` with comprehensive design guidance
- Covers: rule effectiveness hierarchy, format recommendations, companion doc structure
- Key insight: rules must trigger action, not just inform

### 2025-12-27 - Compact Rule Created
- Created `mantra/rules/rule-design.md` (compact version)
- Added MANDATORY-REREAD trigger for rule authoring
- Marked RULE STRUCTURE as BLOCKING REQUIREMENT

### 2025-12-27 - Precedence Reminder Added
- Added to shared/index.js in processUserPromptSubmit
- Every prompt now reminds: project rules > CLAUDE.md > plugin > base training
- Rebuilt shared into all plugins, all tests pass

## Notes
- Core principle: "You MUST" + "STOP" + verification > compact format
- Two-tier pattern: rules/ (compact, always loaded) + context/ (detailed, on-demand)
- Critical trigger: before-writing-rules, before-creating-context-files
- Precedence reminder reinforces rule authority on every prompt

## Files Changed
- .claude/sessions/chore-context-rule-design-guide.md (this file)
- mantra/context/rule-design.md (new - companion doc)
- mantra/rules/rule-design.md (new - compact rule)
- shared/index.js (added precedence reminder)
- mantra/lib/shared.js (rebuilt)
- memento/lib/shared.js (rebuilt)
- onus/lib/shared.js (rebuilt)

## Next Steps
1. Commit changes
