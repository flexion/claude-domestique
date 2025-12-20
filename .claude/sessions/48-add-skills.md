# Session: Add Skills to Memento and Onus

**Issue**: #48
**Branch**: issue/feature-48/add-skills
**Type**: feature
**Created**: 2025-12-20
**Status**: complete

## Goal
Add model-invoked skills to memento and onus plugins, allowing Claude to autonomously decide when to use session management and work item capabilities.

## Approach
1. Create memento/skills/session-manager/SKILL.md
2. Create onus/skills/work-item-handler/SKILL.md
3. Update plugin.json manifests with skills path
4. Test skill invocation

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Created session-manager skill for memento
- 2025-12-20: Created work-item-handler skill for onus
- 2025-12-20: Updated plugin.json manifests with skills path
- 2025-12-20: Revised skills to reference context files (avoid duplication)
- 2025-12-20: Further refined skills to reference both .yml and .md context tiers
- 2025-12-20: Bumped versions (memento 0.1.14, onus 0.1.6)

## Key Decisions
- Skills complement (not replace) context system
- Skills are for user-facing capabilities Claude can proactively invoke
- Skills reference context files rather than duplicating rules

## Learnings
- Skills should be lean and reference context files, not duplicate them
- Need "What This Skill Does NOT Do" sections to prevent scope creep
- Two-tier context (yml rules + md examples) means skills just orchestrate

## Files Changed
- memento/skills/session-manager/SKILL.md (new)
- onus/skills/work-item-handler/SKILL.md (new)
- memento/.claude-plugin/plugin.json
- memento/package.json
- onus/.claude-plugin/plugin.json
- onus/package.json
- .claude-plugin/marketplace.json

## Next Steps
- [x] Create memento session-manager skill
- [x] Create onus work-item-handler skill
- [x] Update plugin.json manifests
- [x] Commit and create PR → PR #60
