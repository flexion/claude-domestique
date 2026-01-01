---
description: Start new work with branch and session creation
argument-hint: [issue|chore]
---

# Start New Work

Interactive workflow to begin new work with proper branch and session setup.

## Task

### Step 1: Determine work type

If no argument provided, ask the user:
"What type of work are you starting?
1. **issue** - Work tied to a tracked issue (GitHub, JIRA, Azure DevOps)
2. **chore** - Maintenance work without an issue number"

### If "issue" (work item):

1. Ask for the issue identifier (e.g., #42, PROJ-123)

2. If user doesn't know the ID, help them find it:
   ```bash
   # GitHub - list recent open issues
   gh issue list --state open --limit 10

   # Or search by keywords
   gh issue list --search "keyword"
   ```

3. Fetch issue details:
   ```bash
   gh issue view <number> --json number,title,body,state,labels
   ```

4. Extract from issue:
   - Title → goal
   - Description → context
   - Labels → determine type (feature, bug, fix)
   - Acceptance criteria (checkboxes in body)

5. Generate branch name:
   - Format: `issue/<type>-<number>/<slug>`
   - Slug: lowercase, hyphens, max 30 chars
   - Example: `issue/feature-42/user-authentication`

6. Create branch and session:
   ```bash
   git fetch origin
   git checkout -b issue/<type>-<number>/<slug> origin/main
   ```

7. Create session file primed with issue data:
   - **Issue**: #<number>
   - **Goal**: <issue title>
   - **Acceptance Criteria**: (from issue body checkboxes)
   - **Session Log**: Session created from issue #<number>

### If "chore" (maintenance work):

1. Ask for a short description (1-5 words):
   "What are you working on? (e.g., 'update dependencies', 'fix linting')"

2. Optionally ask for goal:
   "What's the objective? (press Enter to skip)"

3. Generate branch name:
   - Format: `chore/<slug>`
   - Example: `chore/update-dependencies`

4. Create branch and session:
   ```bash
   git fetch origin
   git checkout -b chore/<slug> origin/main
   ```

5. Create session file with chore template:
   - **Type**: chore
   - **Goal**: <user description or "Maintenance work">
   - **Session Log**: Session created for chore

### Step 2: Confirm setup

Display the created session file and confirm:
- Branch name created
- Session file path
- Goal and acceptance criteria (if available)

Ask: "Does this look correct? Update the session file if you need to refine the goal or approach."

## Examples

**Starting from an issue:**
```
User: /memento:start issue
Claude: What's the issue number?
User: 42
Claude: Fetching issue #42... "Add user authentication"
        Creating branch: issue/feature-42/user-authentication
        Session file: .claude/sessions/42-user-authentication.md

        Goal: Add user authentication
        Acceptance Criteria:
        - [ ] Login form with email/password
        - [ ] Form validation
        - [ ] Secure token storage
```

**Starting a chore:**
```
User: /memento:start chore
Claude: What are you working on?
User: update npm dependencies
Claude: Creating branch: chore/update-npm-dependencies
        Session file: .claude/sessions/chore-update-npm-dependencies.md
```

## Templates

Templates are checked in this order (first found wins):
1. `.claude/templates/` - Project-level overrides
2. `memento/templates/` - Plugin defaults

Available templates:
- `feature.md` - For feature issues (enhancements, new functionality)
- `fix.md` - For bug fixes
- `chore.md` - For maintenance work without an issue

To customize templates for your project, copy the defaults to `.claude/templates/` and modify.

## Integration with onus

If onus plugin is installed, issue details may already be cached at:
`~/.claude/onus/work-item-cache.json`

Check cache before fetching to avoid redundant API calls.
