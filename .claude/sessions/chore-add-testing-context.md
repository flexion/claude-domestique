# Session: Add Testing Context Files

**Branch**: chore/add-testing-context
**Type**: chore
**Created**: 2025-12-20
**Status**: in-progress

## Goal
Create testing context files (test.yml and test.md) to define testing conventions for Claude Code guidance:
- Base conventions in mantra (framework-agnostic, any project)
- Project-specific extensions in .claude/context/ (claude-domestique specific)

## Session Log
- 2025-12-20: Created base testing context in mantra/context/ (test.yml, test.md)
- 2025-12-20: Removed project-specific references from base context (framework-agnostic)
- 2025-12-20: Added TDD workflow, coverage guidelines, core principles
- 2025-12-20: Created project-specific testing context in .claude/context/ (test.yml, test.md)
- 2025-12-20: Fixed incorrect node:test references - all plugins use Jest
- 2025-12-20: Updated CLAUDE.md testing section
- 2025-12-20: Added parameterized tests guidance to base context
- 2025-12-20: Review found 6 issues; fixed all:
  - Fixed async syntax error in test.md
  - Removed stale node-test reference
  - Clarified unit vs integration boundary
  - Added async testing patterns
  - Added error testing patterns
  - Deduplicated project test.md

## Files Changed
- mantra/context/test.yml - base testing conventions
- mantra/context/test.md - base testing examples
- .claude/context/test.yml - project-specific testing context
- .claude/context/test.md - project-specific testing examples
- .claude/context/project.yml - reference to test.yml
- CLAUDE.md - fixed testing framework info

## Key Conventions Added
- Independent/deterministic/simple-first principles
- TDD workflow: test → implement → run → coverage → next chunk
- Unit vs integration test boundaries
- DI pattern for testability
- Parameterized tests to reduce duplication
- Coverage report reuse
- Targeted tests during development

## Review Findings

### Issues Found
1. **Syntax error**: test.md line 136 missing `async` keyword with `await`
2. **Stale reference**: project test.yml still mentions node-test (line 44-45)
3. **Unit vs Integration confusion**: yml says "no OS resources" but examples use temp dirs
4. **Missing topics**: async testing, error testing, test doubles terminology, snapshot guidance
5. **Duplication**: setupGitRepo and temp dir patterns copied to project file instead of referenced
6. **DI example inconsistency**: shows fs injection pattern but test uses real fs

### Recommendations
1. Fix async syntax error in base test.md
2. Remove node-test from project test.yml
3. Clarify: temp dir tests = integration tests, pure function tests = unit tests
4. Add async/error testing section to base
5. Deduplicate project file - reference base instead of copying
6. Add test doubles terminology section

## Future Ideas (not now)
Potential testing skills considered but deferred:
- `/test-scaffold` - generate test file for a function/module
- `/test-coverage` - analyze coverage and suggest gaps
- `/test-review` - review test quality against guidelines

## Next Steps
- [x] Fix async syntax error (test.md line 136)
- [x] Remove node-test reference (project test.yml)
- [x] Clarify unit vs integration boundary in yml
- [x] Add async testing patterns to base
- [x] Add error testing patterns to base
- [x] Deduplicate project test.md (reference base)
- [x] Commit changes
- [x] Create PR: https://github.com/flexion/claude-domestique/pull/66
