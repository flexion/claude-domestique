# Session: PR Template Handling for onus:pr

## Details
- **Issue**: #124
- **Branch**: issue/feature-124/pr-template-handling
- **Type**: feature
- **Created**: 2026-01-14
- **Status**: complete

## Objective
Make `/onus:pr` check for project PR templates before providing the example format, ensuring project conventions are respected by default.

## Requirements
- [x] Check for PR templates first (glob `.github/pull_request_template.md` and `.github/PULL_REQUEST_TEMPLATE/*.md`)
- [x] Handle multiple templates - infer from context (session Type field, branch conventions) or ask user if ambiguous
- [x] Fallback to generic format only when no project templates exist

## Technical Approach
1. Insert "Locate PR Template" section before "Generate PR Body" in the skill
2. Determine work type from branch name pattern (feature/fix/chore)
3. Search for templates in priority order: type-specific → generic
4. Make PR body generation conditional on template presence
5. Update examples to show template detection flow

## Session Log

### 2026-01-14 - Session Started
- Created branch and session file from issue #124
- Issue describes problem: skill provides example format that's "complete enough" causing project templates to be skipped

### 2026-01-14 - Implementation Complete
- Added "Locate PR Template" section with 4-step detection logic
- Made "Generate PR Body" conditional (template vs fallback)
- Updated example interaction to show template detection output
- Added fallback example for no-template case

## Key Decisions
- Check for templates first, only disambiguate when multiple found
- Use `.claude/config.json` branchFormat for type inference (keeps onus self-contained)
- Don't depend on memento session files (plugins are independent)

## Learnings
- onus already has config.json with branchFormat - reuse existing patterns
- Skill files are instructions, not code - keep them flexible, not prescriptive

## Files Changed
- onus/commands/pr.md
- onus/package.json (version bump)
- onus/.claude-plugin/plugin.json (version bump)
- .claude-plugin/marketplace.json (version bump)

## Next Steps
None - implementation complete
