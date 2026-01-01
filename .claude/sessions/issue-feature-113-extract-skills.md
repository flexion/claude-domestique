# Session: Extract skills from rules/context files

**Issue:** #113
**Branch:** `issue/feature-113/extract-skills`
**Type:** feature
**Status:** complete

## Goal

Extract user-invocable skills from rules/context files that currently exist only as behavioral guidance. Make these workflows explicitly triggerable rather than relying on Claude to remember them.

## Acceptance Criteria

- [x] Each skill has `commands/*.md` for explicit invocation
- [x] Complex skills have `skills/*/SKILL.md` for proactive use
- [x] Skills reference existing rules/context rather than duplicating
- [x] Documentation updated with new skill list

## Proposed Skills

### High Priority (Core Workflows)
1. `/onus:commit` - Guided commit with validation (from git.md)
2. `/onus:pr` - Guided PR creation (from git.md)
3. `/memento:resume` - Resume from last context
4. `/memento:update` - Explicit session checkpoint

### Medium Priority (Specialized)
5. `/mantra:assess` - Structured critical assessment (from behavior.md)
6. `/onus:validate-criteria` - Acceptance criteria checker (from work-items.md)
7. `/mantra:troubleshoot` - Evidence-based debugging (from behavior.md)
8. `/onus:status` - Work item dashboard

## Approach

**Phase 1 Only** - 3 high-priority skills, follow-up issues for rest.

1. `/onus:commit` - command in `onus/commands/commit.md`
   - References `git.md` COMMIT CHECKLIST
   - Steps: run tests → validate session → generate message → commit

2. `/onus:pr` - command in `onus/commands/pr.md`
   - References `git.md` PR CHECKLIST
   - Steps: run tests → validate title → generate body from session → create PR

3. `/memento:resume` - complex skill in `memento/skills/resume/SKILL.md`
   - Frontmatter with proactive triggers
   - Load session → show goal/approach/next steps

Key pattern: Skills reference rules, never duplicate content.

## Session Log

- 2026-01-01: Session created, issue fetched, branch created
- 2026-01-01: Implemented Phase 1 skills:
  - Created `/onus:commit` command
  - Created `/onus:pr` command
  - Created `/memento:resume` skill
  - Updated onus plugin.json, bumped version to 0.2.6
  - Fixed missing `start.md` registration in memento, bumped to 0.3.5
  - All tests pass (59 onus, 42 memento)
- 2026-01-01: Created PR #114, pushed to origin
- 2026-01-01: Discovered workflow issue - session updates after PR leave dirty state
  - Created issue #115 for "complete before commit" pattern
  - Decision: session marked complete before commit, PR discoverable via `gh pr view`
- 2026-01-01: Updated READMEs with new commands/skills
- 2026-01-01: Updated rules and context to reference new skills:
  - Simplified `git.md` rule to reference `/onus:commit` and `/onus:pr`
  - Updated `sessions.md` rule to reference `memento:resume` skill
  - Added command callouts in context companion docs
- 2026-01-01: Updated issue #115 with full documentation scope

## Key Decisions

- Phase 1 only: 3 high-priority skills, defer rest to follow-up issue
- Commands for explicit invocation (`/onus:commit`, `/onus:pr`), skills for proactive use (`memento:resume`)
- Session marked complete before commit, not after PR (avoids dirty working directory)
- Rules simplified to reference commands, keeping conventions as quick reference

## Files Changed

- `onus/commands/commit.md` (created)
- `onus/commands/pr.md` (created)
- `memento/skills/resume/SKILL.md` (created)
- `onus/.claude-plugin/plugin.json` (updated commands array)
- `onus/package.json` (version 0.2.6)
- `memento/.claude-plugin/plugin.json` (added start.md to commands, version 0.3.5)
- `memento/package.json` (version 0.3.5)
- `.claude-plugin/marketplace.json` (onus 0.2.6, memento 0.3.5)
- `README.md` (added new commands)
- `onus/README.md` (added commit, pr commands)
- `memento/README.md` (added Skills section with resume)
- `onus/rules/git.md` (simplified to reference commands)
- `memento/rules/sessions.md` (updated RESUMPTION to reference skill)
- `onus/context/git.md` (added command callouts)
- `memento/context/sessions.md` (added skill callout)

## Next Steps

- [x] Plan implementation approach
- [x] Decide which skills to implement first (Phase 1 only)
- [x] Create `/onus:commit` command
- [x] Create `/onus:pr` command
- [x] Create `/memento:resume` skill
- [x] Update plugin.json and bump version
- [x] Run tests
- [x] Commit and create PR (#114)
- [x] Update READMEs
- [x] Update rules and context to reference new skills
- [x] Create follow-up issue for session workflow (#115)

Phase 2/3 skills deferred - not tracked in this session.
