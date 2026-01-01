# Session: Extract Phase 2 skills

## Details
- **Issue**: #117
- **Branch**: issue/feature-117/phase-2-skills
- **Type**: feature
- **Created**: 2026-01-01
- **Status**: complete

## Objective
Extract Phase 2 skills from rules/context files. Follow-up to #113 (Phase 1).

## Acceptance Criteria
- [x] Each skill has `commands/*.md` for explicit invocation
- [x] Skills reference existing rules/context rather than duplicating
- [x] Plugin versions bumped appropriately
- [x] Tests pass

## Proposed Skills

### mantra plugin
1. `/mantra:assess` - Structured critical assessment (from behavior.md)
2. `/mantra:troubleshoot` - Evidence-based debugging (from behavior.md)

### onus plugin
3. `/onus:validate-criteria` - Acceptance criteria checker (from work-items.md)
4. `/onus:status` - Work item dashboard

## Technical Approach
- Read source behavior.md and work-items.md for skill content
- Create command files referencing rules rather than duplicating
- Each skill includes: Task, Output Format, Example, When to Use
- Updated rules to reference skills with `skill:` field
- Streamlined rules to reduce redundancy (detailed content now in skills)

## Session Log

### 2026-01-01 - Session Started
- Created branch and session file from issue #117
- Prior work: Completed #115 (session complete before commit) and closed #113 (Phase 1 skills)
- Created this issue (#117) as follow-up for Phase 2 skills

### 2026-01-01 - Bug Fix (statusline)
- Fixed statusline.js showing "chore" instead of issue number
- Root cause: regex `\d{5,6}` only matched 5-6 digit numbers (Azure DevOps)
- Fix: Changed to `\d{1,6}` to match GitHub issue numbers (1-6 digits)

### 2026-01-01 - Bug Fix (commitFormat)
- Fixed onus hook crash: `TypeError: cfg.commitFormat.replace is not a function`
- Root cause: Project config has `commitFormat` as object `{issue:..., chore:...}` but code expected string
- Fix: Added `getCommitFormat()` helper to handle both string and object formats
- Bumped onus version 0.2.7 → 0.2.8

### 2026-01-01 - Phase 2 Skills Complete
- Created 4 skills:
  - `/mantra:assess` - Structured critical assessment
  - `/mantra:troubleshoot` - Evidence-based debugging
  - `/onus:validate-criteria` - Acceptance criteria checker
  - `/onus:status` - Work item dashboard
- Bumped mantra 0.3.2 → 0.4.0, onus 0.2.8 → 0.3.0
- Updated rules to reference skills, removed redundant content
- Updated READMEs with new commands
- All tests pass (mantra 25, memento 42, onus 65)

## Key Decisions
- Fixed statusline bug as part of this issue (discovered while working on it)
- Fixed onus commitFormat bug (blocking issue, prevents plugin from loading)
- Rules reference skills via `skill:` field to reduce duplication
- Streamlined rules to reduce initial context token usage

## Learnings
- statusline.js was originally written for Azure DevOps (5-6 digit IDs)
- GitHub issues use smaller numbers, need broader pattern
- Skills can contain detailed procedural content; rules just need trigger/action/skill-reference

## Files Changed
- .claude/statusline.js - Fixed extractWorkItemId regex
- onus/hooks/work-item.js - Added getCommitFormat() helper
- onus/hooks/__tests__/work-item.test.js - Added tests for getCommitFormat
- mantra/commands/assess.md - New skill
- mantra/commands/troubleshoot.md - New skill
- onus/commands/validate-criteria.md - New skill
- onus/commands/status.md - New skill
- mantra/rules/behavior.md - Streamlined, added skill references
- onus/rules/work-items.md - Streamlined, added skill references
- mantra/README.md - Added new commands
- onus/README.md - Added new commands
- mantra/package.json, mantra/.claude-plugin/plugin.json - Version 0.4.0
- onus/package.json, onus/.claude-plugin/plugin.json - Version 0.3.0
- .claude-plugin/marketplace.json - Updated versions

## Next Steps
1. Commit all changes
2. Create PR
