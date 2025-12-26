# Session: chore/enhance-context-companions

## Details
- **Branch**: chore/enhance-context-companions
- **Type**: Chore
- **Status**: in-progress
- **Created**: 2025-12-26

## Goal
Enhance mantra's companion markdown files (behavior.md, test.md) with detailed examples and patterns discovered in portal-D365's context files. These enhancements make the plugins more useful for general projects.

## Approach
1. Enhance `mantra/context/behavior.md` with:
   - When-to-discuss-vs-build decision tree
   - `// CHANGED` bug fix pattern
   - Critical assessment protocol examples

2. Enhance `mantra/context/test.md` with:
   - FIRST principles elaboration
   - Anti-patterns section
   - Test doubles strategy clarification

3. Consider adding work item language guidelines to onus

## Session Log
- 2025-12-26: Created branch, analyzed portal-D365 context files for generalizable patterns
- 2025-12-26: Enhanced behavior.md with discuss-vs-build decision tree, CHANGED comment example, speculation clarification, and "what is simple" definition
- 2025-12-26: Enhanced test.md with full FIRST principles elaboration and anti-patterns section (big bang, testing impl details, complex setup, one assertion)
- 2025-12-26: Added key patterns to compact rules (speculation clarification, simple-means, FIRST principles, anti-patterns)

## Next Steps
- [x] Read current behavior.md and test.md
- [x] Enhance behavior.md with new patterns
- [x] Enhance test.md with FIRST principles and anti-patterns
- [x] Add key patterns to compact rules
- [x] Review changes and commit

## Files Changed
- mantra/context/behavior.md - Added discussion/build decision tree, speculation clarification, "what is simple" definition, CHANGED comment example
- mantra/context/test.md - Added FIRST principles section, anti-patterns section
- mantra/rules/behavior.md - Added speculation and simple-means to compact rules
- mantra/rules/test.md - Added FIRST principles and anti-patterns sections to compact rules
