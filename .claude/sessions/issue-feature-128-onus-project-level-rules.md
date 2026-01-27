# Session: onus commands read project-level rules

## Details
- **Issue**: #128
- **Branch**: issue/feature-128/onus-project-level-rules
- **Type**: feature
- **Created**: 2026-01-27
- **Status**: complete

## Objective
All onus commands should read project-level rules before executing, so project-specific work item and git conventions are applied automatically.

## Requirements
- Before executing, each onus command checks for project-level rules in `.claude/rules/`
- If a matching rule file has a `companion:` field, also read the companion context file
- Project rules override onus defaults (project > plugin)
- Backward compatible: no project rules = unchanged behavior
- Affected commands: /onus:fetch, /onus:create, /onus:update, /onus:close, /onus:commit, /onus:pr

## Technical Approach
Markdown-only changes — added a "Load Project Rules" section to each affected onus command/skill file. Three domain variants: git (commit, pr), work-item (fetch, create, update, close), and cross-domain (status, validate-criteria). No JS, hooks, or shared library changes.

## Session Log

### 2026-01-27 - Session Started
- Created branch and session file

### 2026-01-27 - Implementation Complete
- Added Load Project Rules section to 9 command/skill files
- Code review caught: IMPORTANT notes should come after rules loading (fixed)
- Code review caught: use `find` instead of `ls` for nested dirs, add concrete heuristic (fixed)
- Bumped onus version 0.3.4 → 0.3.5
- All 65 tests pass

## Key Decisions
- Load Project Rules section placed before IMPORTANT notes so project rules are loaded before default checklists
- Used `find .claude/rules -name '*.md'` to support nested rule directories
- Added concrete relevance heuristic (filename match + frontmatter domain/type fields)

## Files Changed
- onus/commands/commit.md — git domain rules loading
- onus/commands/pr.md — git domain rules loading
- onus/commands/fetch.md — work-item domain rules loading
- onus/commands/create.md — work-item domain rules loading
- onus/commands/update.md — work-item domain rules loading
- onus/commands/close.md — work-item domain rules loading
- onus/commands/status.md — cross-domain rules loading
- onus/commands/validate-criteria.md — work-item domain rules loading
- onus/skills/work-item-handler/SKILL.md — work-item domain rules loading
- onus/package.json — version bump 0.3.5
- onus/.claude-plugin/plugin.json — version bump 0.3.5
- .claude-plugin/marketplace.json — version bump 0.3.5

## Next Steps
- None — ready for PR and merge
