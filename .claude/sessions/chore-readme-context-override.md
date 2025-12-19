# Session: README Context Override Documentation

**Issue**: N/A (chore)
**Branch**: chore/readme-context-override
**Type**: chore
**Created**: 2025-12-19
**Status**: in-progress

## Goal
Document how to override default plugin context in target projects. This is critical for users to understand the two-tier system: plugin-provided base context vs project-specific extensions.

## Approach
Update the main README.md with clear guidance on:
1. What context the plugins provide by default
2. When/why to add project-specific context
3. How to override or extend base context
4. Examples of common override scenarios

## Session Log
- 2025-12-19: Session created
- 2025-12-19: Added "Context System" section to README.md

## Key Decisions
- Placed section after "Shared Conventions" and before "License"
- Used tables for clarity (base context, when to add, file format patterns)
- Included concrete examples for git, test, and deploy overrides

## Learnings
- Portal-D365 context directory was a good reference for real-world patterns

## Files Changed
- README.md - Added comprehensive "Context System" section (~130 lines)

## Next Steps
- [x] Review current README.md structure
- [x] Add "Context Override" section explaining the pattern
- [x] Include examples (project.yml, test.yml, git.yml overrides)
- [x] Document loading order (plugin → project → CLAUDE.md)
- [ ] Commit changes
