# Session: Extract skills from rules/context files

**Issue:** #113
**Branch:** `issue/feature-113/extract-skills`
**Type:** feature
**Status:** in-progress

## Goal

Extract user-invocable skills from rules/context files that currently exist only as behavioral guidance. Make these workflows explicitly triggerable rather than relying on Claude to remember them.

## Acceptance Criteria

- [ ] Each skill has `commands/*.md` for explicit invocation
- [ ] Complex skills have `skills/*/SKILL.md` for proactive use
- [ ] Skills reference existing rules/context rather than duplicating
- [ ] Documentation updated with new skill list

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
  - All tests pass (59 onus tests)

## Key Decisions

- None yet

## Files Changed

- `onus/commands/commit.md` (created)
- `onus/commands/pr.md` (created)
- `memento/skills/resume/SKILL.md` (created)
- `onus/.claude-plugin/plugin.json` (updated commands array)
- `onus/package.json` (version 0.2.6)
- `memento/.claude-plugin/plugin.json` (added start.md to commands, version 0.3.5)
- `memento/package.json` (version 0.3.5)
- `.claude-plugin/marketplace.json` (onus 0.2.6, memento 0.3.5)

## Next Steps

- [x] Plan implementation approach
- [x] Decide which skills to implement first (Phase 1 only)
- [x] Create `/onus:commit` command
- [x] Create `/onus:pr` command
- [x] Create `/memento:resume` skill
- [x] Update plugin.json and bump version
- [x] Run tests
- [ ] Commit changes
- [ ] Create PR
- [ ] Create follow-up issue for Phase 2/3 skills
