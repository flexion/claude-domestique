# Command: /create-session

## Description
Create a new session file and branch metadata for the current branch. Automatically detects whether this is a chore or feature and uses the appropriate template.

## Usage
```
/create-session
```

No arguments required. The command detects the branch type and guides you through setup.

## Implementation

When the user invokes `/create-session`, follow these steps:

1. **Check if Session Already Exists**
   ```bash
   ./scripts/get-current-session.sh
   ```

   If a session exists, warn the user:
   ```
   Session already exists: <session-file>

   Do you want to overwrite it? (yes/no)
   ```

2. **Detect Current Branch**
   ```bash
   git branch --show-current
   ```

3. **Determine Branch Type**

   **Feature Branch Pattern:** `issue/feature-<N>/<description>`
   - Extract issue number: `<N>`
   - Extract description: `<description>`
   - Session file: `<N>-<description>.md`
   - Use feature template

   **Chore Branch Pattern:** `chore/<description>`
   - Extract description: `<description>`
   - Session file: `chore-<description>.md`
   - Use chore template

   **Non-Standard Branch:**
   - Ask user: "Is this a feature or chore?"
   - If feature, prompt for issue number
   - If chore, prompt for description

4. **For Feature Branches - Gather Information**

   Ask the user:
   ```
   GitHub issue URL (optional):
   ```

   This will be used to populate the session template.

5. **Create Session File**

   Use the appropriate template:
   - **Feature:** `.claude/templates/feature-session.md.template`
   - **Chore:** Create focused chore session structure

   Replace placeholders:
   - `{{ISSUE_NUMBER}}` - Issue number
   - `{{TITLE}}` - Issue title (or description)
   - `{{GITHUB_URL}}` - GitHub issue URL
   - `{{DESCRIPTION}}` - Branch description
   - `{{DATE}}` - Current date (YYYY-MM-DD)

6. **Create Branch Metadata**

   Create file at `.claude/branches/<sanitized-branch-name>`:
   ```
   type: issue  # or "chore"
   session: .claude/sessions/<session-file>.md
   status: in-progress
   description: <description>
   github_url: <url>  # for features only
   issue_number: <N>  # for features only
   parent_branch: main
   created: <date>
   ```

7. **Display Confirmation**
   ```
   ✓ Session created: .claude/sessions/<session-file>.md
   ✓ Branch metadata created: .claude/branches/<sanitized-branch>

   Next steps:
   1. Populate the session file with your objective and approach
   2. Commit the session file before starting work
   3. Use /next to see your next steps

   To commit:
     git add .claude/sessions/<session-file>.md .claude/branches/<sanitized-branch>
     git commit -m "#<N> - create session for <description>"  # for features
     git commit -m "chore - create session for <description>"  # for chores
   ```

## Error Handling

### Already on Main Branch
```
Error: Cannot create session on main branch.

Create a feature or chore branch first:
  Feature: git checkout -b issue/feature-<N>/<description>
  Chore: git checkout -b chore/<description>
```

### Not in Git Repository
```
Error: Not in a git repository.

This command requires a git-tracked project.
```

### Session Already Exists (Without Overwrite)
```
Session already exists: <session-file>

Use /next to see current session's next steps.
```

## Examples

### Example 1: Feature Branch

**Branch:** `issue/feature-8/basic-commands`

**Input:**
```
/create-session
```

**Interaction:**
```
Creating session for feature branch: issue/feature-8/basic-commands

Detected:
  Issue #: 8
  Description: basic-commands

GitHub issue URL (optional): https://github.com/flexion/claude-domestique/issues/8

✓ Session created: .claude/sessions/8-basic-commands.md
✓ Branch metadata created: .claude/branches/issue-feature-8-basic-commands

Next steps:
1. Populate the session file with your objective and approach
2. Commit the session file before starting work
3. Use /next to see your next steps

To commit:
  git add .claude/sessions/8-basic-commands.md .claude/branches/issue-feature-8-basic-commands
  git commit -m "#8 - create session for basic commands feature"
```

### Example 2: Chore Branch

**Branch:** `chore/update-docs`

**Input:**
```
/create-session
```

**Interaction:**
```
Creating session for chore branch: chore/update-docs

Detected:
  Description: update-docs

✓ Session created: .claude/sessions/chore-update-docs.md
✓ Branch metadata created: .claude/branches/chore-update-docs

Next steps:
1. Document what you're doing and why in the session file
2. Commit the session file before starting work
3. Use /next to see your next steps

To commit:
  git add .claude/sessions/chore-update-docs.md .claude/branches/chore-update-docs
  git commit -m "chore - create session for update docs"
```

### Example 3: Non-Standard Branch

**Branch:** `my-custom-branch`

**Input:**
```
/create-session
```

**Interaction:**
```
Creating session for branch: my-custom-branch

This is not a standard branch name (feature or chore pattern).

Is this a feature (GitHub issue) or chore (internal work)? feature

GitHub issue number: 12

Description: custom-branch

GitHub issue URL (optional): https://github.com/flexion/claude-domestique/issues/12

✓ Session created: .claude/sessions/12-custom-branch.md
✓ Branch metadata created: .claude/branches/my-custom-branch

Note: Consider using standard branch naming:
  Features: issue/feature-<N>/<desc>
  Chores: chore/<desc>
```

## Session Templates

### Feature Session Template
The feature template (`.claude/templates/feature-session.md.template`) includes:
- Issue details (number, title, URL)
- Objective
- Requirements
- Technical approach
- Implementation plan
- Session log
- Key decisions
- Learnings
- Files created
- Next steps

### Chore Session Template
A chore session uses a simpler structure:
```markdown
# Session: Chore - {{TITLE}}

## Objective
[What are we doing and why]

## Approach
[How we'll do it]

## Session Log

### {{DATE}} - Session Created
- Created chore branch
- Initialized session
- Ready to begin work

**Next:** [First task]

## Files Modified
- [List files as work progresses]

## Next Steps
1. [Task 1]
2. [Task 2]
```

## Notes

- This command creates files but doesn't commit them - user must commit manually
- Session and branch metadata should be committed together (atomically)
- The command can be run by scripts/create-branch-metadata.sh or directly as a slash command
- Template placeholders are replaced with actual values during creation
