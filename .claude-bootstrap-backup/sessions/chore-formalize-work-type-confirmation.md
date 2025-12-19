# Session: Formalize Work Type Confirmation Requirement

## Objective
Add explicit requirement to confirm with user whether work should be a feature or chore before starting implementation.

## Context
Currently, the context files document the differences between features and chores, but don't require asking the user which type to use before starting work. This can lead to:
- Starting wrong branch type
- Using wrong commit format
- Wrong session structure
- Misalignment with user expectations

## Approach
Add confirmation requirement to:
1. `CLAUDE.md` - As a new mandatory checklist at the top
2. `.claude/context/behavior.yml` - In the implementation behavior section
3. `.claude/context/features.yml` - As a workflow pattern

## Implementation

### 1. CLAUDE.md
Add new checklist section before "Before ANY Implementation/Proposal Response":
```markdown
### Before Beginning Any New Work:
1. **ASSESS WORK TYPE** - Is this a feature (GitHub issue) or chore (internal)?
2. **CONFIRM WITH USER** - Ask: "Should this be a feature or chore?"
3. **PROCEED** - Use appropriate workflow (feature vs chore checklist)
```

### 2. behavior.yml
Add to implementation behavior:
```yaml
before-work: assess-type (feature|chore), confirm-with-user, use-appropriate-workflow
```

### 3. features.yml
Add workflow initiation pattern:
```yaml
initiation: assess-work-type → confirm-with-user → create-issue-or-branch → populate-session
```

## Files to Update
- `CLAUDE.md` - Add new mandatory checklist section
- `.claude/context/behavior.yml` - Add before-work pattern
- `.claude/context/features.yml` - Add initiation pattern

## Session Log

### 2025-11-16 - Session Created
- User identified gap in workflow documentation
- Confirmed this should be a chore (internal documentation)
- Created branch and session
- Ready to implement

### 2025-11-16 - Implementation Complete
**Actions:**
1. Updated `CLAUDE.md` - Added "Before Beginning Any New Work" checklist as first mandatory item
2. Updated `.claude/context/behavior.yml` - Added before-work pattern to implementation behavior
3. Updated `.claude/context/features.yml` - Added workflow initiation pattern with never-do rules
4. Updated `CLAUDE.md` - Clarified features REQUIRE pre-existing GitHub issue
5. Updated `.claude/context/features.yml` - Added REQUIRES-PRE-EXISTING-ISSUE, get-issue-number step
6. Updated `CLAUDE.md` - Added PREREQUISITE to "When Beginning Feature" checklist

**Changes Made:**
- CLAUDE.md: New section requires assessing type, confirming with user, getting issue number (if feature), waiting for answer
- CLAUDE.md: "When Beginning Feature" now has PREREQUISITE: issue must already exist
- behavior.yml: Added `before-work: assess-type (feature|chore), confirm-with-user, wait-for-answer, use-appropriate-workflow`
- features.yml: Added `REQUIRES-PRE-EXISTING-ISSUE`, `feature-requires: pre-existing-github-issue, issue-number, requirements-documented`
- features.yml: Added `never: create-feature-without-issue`

**Key Requirements:**
- Features MUST have pre-existing GitHub issue (cannot start without one)
- If user wants feature but no issue exists, must create issue first OR make it a chore
- Workflow asks for issue number when user confirms it's a feature
- This project uses GitHub issues (others may use Jira, Azure DevOps)

**Impact:**
- Every new work item now requires explicit user confirmation of type
- Features cannot be started without existing GitHub issue
- Prevents misalignment between user expectations and implementation
- Formalizes the distinction between features and chores at workflow start
- Ensures all features have documented requirements before implementation starts

## Next Steps

### Completed ✓
1. ✓ Update CLAUDE.md with new checklist
2. ✓ Update behavior.yml with before-work pattern
3. ✓ Update features.yml with initiation pattern

### Ready for Commit
- Commit session + code atomically
- Test by applying rule to next task (config schema)
