# Session: context-md-reference

## Details
- **Branch**: chore/context-md-reference
- **Type**: chore
- **Created**: 2025-12-22
- **Status**: complete

## Goal
Add standardized `companion:` key to yml files that reference their companion md files.

## Session Log
- 2025-12-22: Session created
- 2025-12-22: Documented convention in context-format.yml, applied to 8 yml files
- 2025-12-22: All 158 tests pass, PR #83 created

## Files Changed
- `mantra/context/context-format.yml` - Added companion-key convention to spec
- `mantra/context/behavior.yml` - Added companion: behavior.md
- `mantra/context/format-guide.yml` - Added companion: format-guide.md
- `mantra/context/test.yml` - Added companion: test.md
- `memento/context/sessions.yml` - Added companion: sessions.md
- `onus/context/git.yml` - Added companion: git.md
- `onus/context/work-items.yml` - Added companion: work-items.md
- `.claude/context/test.yml` - Added companion: test.md

## Next Steps
1. Merge PR #83
