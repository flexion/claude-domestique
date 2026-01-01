---
description: Check acceptance criteria completion before commit/PR
argument-hint: [issue number or session file path]
---

# Validate Acceptance Criteria

Check whether all acceptance criteria from the issue have been addressed before creating a commit or PR.

## Task

**IMPORTANT: This skill implements the ACCEPTANCE CRITERIA rule from work-items.md**

Before committing or creating a PR, verify that all acceptance criteria have been met.

### Workflow

1. **Locate Criteria**
   Find acceptance criteria from one of these sources (in priority order):
   - Session file: `.claude/sessions/<branch>.md`
   - Cached work item: use `/onus:fetch` if needed
   - GitHub issue directly: `gh issue view <number>`

2. **Review Each Criterion**
   For each acceptance criterion:
   - Check if implementation addresses it
   - Look at relevant code changes
   - Verify tests exist if applicable

3. **Report Status**
   Present findings with clear status for each criterion

### Output Format

```
## Acceptance Criteria Validation

**Issue**: #[number] - [title]
**Branch**: [current branch]

### Criteria Status

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ | [criterion text] | [file:line or description] |
| ⚠️ | [criterion text] | [partial implementation note] |
| ❌ | [criterion text] | [not found or missing] |

### Summary
- Completed: X of Y
- [proceed/address issues before commit]

### Next Steps
[what needs to be done for incomplete items]
```

## Example

```
User: /onus:validate-criteria

Claude: ## Acceptance Criteria Validation

**Issue**: #42 - Add user authentication
**Branch**: issue/feature-42/auth

### Criteria Status

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ | Login form with email/password | src/components/LoginForm.tsx:15-80 |
| ✅ | JWT token handling | src/lib/auth.ts:20-45 |
| ✅ | Error messages for invalid credentials | src/components/LoginForm.tsx:35-50 |
| ⚠️ | Remember me checkbox | Implemented but not tested |
| ❌ | Password reset flow | Not started |

### Summary
- Completed: 3 of 5 (1 partial, 1 missing)
- Address issues before commit

### Next Steps
1. Add tests for "Remember me" functionality
2. Implement password reset flow or remove from scope
3. Update issue if scope changed
```

## When to Use

Invoke this skill:
- Before running `/onus:commit`
- Before running `/onus:pr`
- When unsure if work is complete
- During code review

## Notes

- Incomplete criteria doesn't always mean "don't commit"
- Partial implementations might be intentional (phased delivery)
- If scope changed, update the issue first
- Session file criteria and issue criteria should match
