# Session: Rename /plugin-init to /domestique-init

**Type:** Chore
**Branch:** chore/rename-to-domestique-init
**Created:** 2025-11-16
**Status:** In Progress

## Objective

Rename the `/plugin-init` command to `/domestique-init` to better align with the project's identity and branding. The name "domestique-init" better reflects the plugin's purpose as "Claude Domestique."

## Context

The command was originally named `/plugin-init` during initial development (feature #10). Now that the project identity is more established as "Claude Domestique," the command name should reflect this branding.

## Scope

1. Rename command file: `commands/plugin-init.md` → `commands/domestique-init.md`
2. Update all references across the codebase:
   - Documentation files
   - Session files
   - Other commands that reference it
   - Scripts
   - ROADMAP.md
3. Update command content to use new name consistently

## Implementation Plan

### Phase 1: Rename Command File
- Move `commands/plugin-init.md` to `commands/domestique-init.md`
- Update all internal references within the command file

### Phase 2: Update References
- Update all files that reference `/plugin-init`:
  - Documentation (docs/)
  - Session files (.claude/sessions/)
  - Other commands (commands/)
  - Scripts (scripts/)
  - ROADMAP.md
  - PROJECT-STATUS.md
  - CORE-PURPOSE-REVIEW.md

### Phase 3: Validation
- Verify no remaining references to old name
- Test command in a test project

## Files to Update

Based on grep results, these files contain references:
- docs/installation.md
- PROJECT-STATUS.md
- scripts/migrate-bootstrap.sh
- .claude/sessions/chore-dogfood-migration-tools.md
- ROADMAP.md
- skills/context-loader/SKILL.md
- CORE-PURPOSE-REVIEW.md
- docs/testing/phase-2-testing-guide.md
- .claude/sessions/chore-phase-2-testing.md
- commands/check.md
- .claude/sessions/16-config-aware-check.md
- commands/plugin-init.md (rename)
- .claude/branches/issue-feature-10-plugin-init
- .claude/sessions/10-plugin-init.md

## Completion Summary

### Files Updated

1. **Command File Renamed**: `commands/plugin-init.md` → `commands/domestique-init.md`
2. **Documentation Updated**:
   - `docs/installation.md` - All 4 references
   - `docs/testing/phase-2-testing-guide.md` - All 8 references
3. **Commands Updated**:
   - `commands/check.md` - All 4 references
4. **Session Files Updated**:
   - `.claude/sessions/10-plugin-init.md` - Historical record (all references)
   - `.claude/sessions/16-config-aware-check.md` - All references
   - `.claude/sessions/chore-dogfood-migration-tools.md` - 2 references
   - `.claude/sessions/chore-phase-2-testing.md` - All 6 references
5. **Skills Updated**:
   - `skills/context-loader/SKILL.md` - All 3 references
6. **Scripts Updated**:
   - `scripts/migrate-bootstrap.sh` - 1 reference
7. **Project Documentation Updated**:
   - `ROADMAP.md` - 1 reference
   - `PROJECT-STATUS.md` - 1 reference
   - `CORE-PURPOSE-REVIEW.md` - 3 references

### Verification

All instances of `plugin-init` replaced with `domestique-init` (excluding backup directory).
Total files modified: 14 files

### Method

Used `sed -i '' 's/plugin-init/domestique-init/g'` for bulk replacement across all files.
