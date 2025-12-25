# Session: memento-reliability-hooks

## Details
- **Branch**: issue/feature-87/memento-reliability-hooks
- **Type**: feature
- **Created**: 2025-12-25
- **Status**: in-progress

## Goal
Simplify context management across all three plugins to use native `.claude/rules/` auto-loading with version detection for outdated rules.

## Approach
- Convert YAML context files to frontmatter-only markdown rules
- Create init scripts that copy rules/context/templates to project
- Add MD5 hash-based version detection to hooks
- Warn on SessionStart if rules are outdated

## Session Log
- 2025-12-25: Session created
- 2025-12-25: Created memento rules file structure (sessions.md)
- 2025-12-25: Created memento init script with version hashing
- 2025-12-25: Added version detection to memento hooks (rulesHash, contextHash, templatesHash)
- 2025-12-25: Updated mantra to include contextHash in version detection
- 2025-12-25: Applied same pattern to onus plugin:
  - Created onus/rules/git.md and onus/rules/work-items.md (frontmatter rules)
  - Deleted onus/context/git.yml and onus/context/work-items.yml
  - Updated onus/scripts/init.js to copy rules/context with version hashing
  - Added version detection to onus/hooks/work-item.js
  - Created onus init tests
- 2025-12-25: Created issue #99 for hook-based context injection refactor

## Key Decisions
- Use MD5 hashes to detect outdated rules (rulesHash, contextHash, templatesHash)
- Version file stores hashes for comparison against plugin source
- Legacy detection: warn only if existing config exists without version file
- Future work (#99): hook-based context injection for transparent loading

## Files Changed
- memento/rules/sessions.md (created)
- memento/scripts/init.js (created)
- memento/hooks/session-startup.js (version detection added)
- mantra/scripts/init.js (contextHash added)
- mantra/hooks/session-monitor.js (contextHash detection added)
- onus/rules/git.md (created)
- onus/rules/work-items.md (created)
- onus/context/git.yml (deleted)
- onus/context/work-items.yml (deleted)
- onus/scripts/init.js (rules copying added)
- onus/hooks/work-item.js (version detection added)
- onus/scripts/__tests__/init.test.js (created)

## Next Steps
- [ ] Commit all changes
- [ ] Create PR for review
- [ ] Work on #99 for hook-based transparent context loading
