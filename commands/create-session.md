# Command: /create-session

## Description
Create a new session file and branch metadata for the current branch. Automatically detects whether this is a chore or feature and uses the appropriate template. For feature branches with work items (GitHub issues, Jira tickets, Azure DevOps work items), can auto-populate the session from the work item data.

## Usage
```
/create-session [--auto]
```

**Arguments:**
- `--auto` (optional) - Auto-populate session from work item (GitHub/Jira/Azure DevOps)

**Default behavior:** Creates session template for manual population
**With --auto:** Fetches work item and auto-populates session

## Implementation

When the user invokes `/create-session`, follow these steps:

### Standard Workflow (Manual Population)

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

3. **Check for --auto Flag**

   If `--auto` provided AND branch contains work-item identifier:
   - Skip to **Auto-Population Workflow** (see below)

   Otherwise, continue with manual template creation.

4. **Determine Branch Type**

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

### Auto-Population Workflow (With --auto Flag)

When `/create-session --auto` is invoked:

1. **Detect Work Item from Branch**

   Use issue-detector skill logic:
   - Parse branch name to extract identifier
   - `issue/feature-29/desc` → `29`
   - `feature/PROJ-123/desc` → `PROJ-123`
   - `feature/456/desc` → `456`

   If no work-item detected:
   ```
   Error: Cannot auto-populate session.

   No work item detected from branch name.
   Branch: <branch-name>

   Use standard creation: /create-session
   Or create work-item branch: git checkout -b issue/feature-<N>/<desc>
   ```

2. **Check if Work Item Already Fetched**

   Check for `.claude/work-items/<id>/`:
   - If exists: Use cached data
   - If missing: Fetch work item first

3. **Fetch Work Item (if needed)**

   Run `/fetch-issue` logic:
   ```
   Work item not found locally.
   Fetching issue #29 from GitHub...

   ✓ Fetched issue data
   ✓ Downloaded attachments
   ✓ Stored locally
   ```

4. **Load Work Item Data**

   Read local work-item files:
   - `.claude/work-items/<id>/issue.md` - Issue content
   - `.claude/work-items/<id>/comments.md` - Comments
   - `.claude/work-items/<id>/metadata.json` - Metadata

5. **Parse and Map to Session Structure**

   **From issue.md:**
   - Extract title (first H1) → Session title
   - Extract body content → Objectives/Requirements

   **Parse issue body for sections:**
   - Look for `## Objective` → Session objective
   - Look for `## Requirements` → Session requirements
   - Look for `## Technical Approach` → Session technical approach
   - Look for `## Success Criteria` → Session success criteria

   **From metadata.json:**
   - `issue.number` → Issue number
   - `issue.html_url` → GitHub URL
   - `issue.state` → Status
   - `issue.labels` → Tags
   - `issue.milestone` → Milestone
   - `issue.created_at` → Created date

   **From comments.md:**
   - Include as "Discussion" section (optional)

6. **Generate Populated Session File**

   Create session with auto-populated content:

   ```markdown
   # Session: Issue #<N> - <Title>

   ## Issue Details
   - **Issue Number**: #<N>
   - **Title**: <title>
   - **Created**: <created_at>
   - **Status**: <state>
   - **GitHub URL**: <html_url>

   ## Objective

   <parsed from issue body or default text>

   **Addresses**: <from issue labels or body>

   ## Requirements

   <parsed from issue ## Requirements section or issue body>

   ## Technical Approach

   <parsed from issue ## Technical Approach section if present>

   ## Implementation Plan

   <parsed from issue checklist items or create default>

   ## Session Log

   ### <date> - Session Created (Auto-Populated)
   - Detected issue #<N> from branch
   - Fetched complete work-item data from GitHub
   - Auto-populated session from issue content
   - Ready to begin implementation

   **Next**: <first item from implementation plan or "Begin implementation">

   ## Key Decisions

   _(To be populated as implementation progresses)_

   ## Learnings

   _(To be populated as implementation progresses)_

   ## Files Created

   _(To be populated as implementation progresses)_

   ## Next Steps

   <parsed from issue checklist or create from requirements>
   ```

7. **Create Branch Metadata**

   Same as manual workflow:
   ```
   type: issue
   session: <session-file>.md
   status: in-progress
   description: <description>
   issue_number: <N>
   parent_branch: main
   created: <date>
   ```

8. **Display Success**

   ```
   ✓ Session auto-populated from GitHub issue #29

   Created:
   ✓ Session: .claude/sessions/29-work-item-automation.md
   ✓ Branch metadata: .claude/branches/issue-feature-29-work-item-automation

   Auto-populated from work item:
   - Title: Phase 3C - Work-Item Automation
   - Objective: Automate GitHub/Azure DevOps work-item maintenance
   - Requirements: 5 core components, 5 key features
   - Technical Approach: 5-phase implementation plan
   - Success Criteria: 5 criteria

   Session is ready to use.

   Next steps:
   1. Review the auto-populated session
   2. Adjust objectives/approach if needed
   3. Commit session file
   4. Begin work

   To commit:
     git add .claude/sessions/29-work-item-automation.md .claude/branches/issue-feature-29-work-item-automation
     git commit -m "#29 - auto-populate session from GitHub issue"
   ```

## Auto-Population Mapping Details

### Parsing Issue Body for Sections

Look for markdown headings in issue body:

**Pattern 1: Standard Sections**
```markdown
## Objective
<content>

## Requirements
<content>

## Technical Approach
<content>
```

Extract each section and map directly to session.

**Pattern 2: No Structured Sections**

If issue body doesn't have standard sections:
- First paragraph → Objective
- Remaining content → Requirements
- Technical Approach: "_(To be determined during implementation)_"

**Pattern 3: Checklist Items**

Convert checklist to implementation plan:
```markdown
- [ ] Task 1
- [ ] Task 2
```

Becomes:
```markdown
## Implementation Plan
- [ ] Task 1
- [ ] Task 2
```

And also:
```markdown
## Next Steps
1. Task 1
2. Task 2
```

### Field Mapping Reference

| Source | Destination | Example |
|--------|-------------|---------|
| `issue.title` | Session H1 title | "Session: Issue #29 - Phase 3C" |
| `issue.number` | Issue Details | "#29" |
| `issue.html_url` | Issue Details | GitHub URL |
| `issue.body` (## Objective) | Objective section | Parsed content |
| `issue.body` (## Requirements) | Requirements section | Parsed list |
| `issue.body` (## Technical Approach) | Technical Approach | Parsed content |
| `issue.body` (checklist items) | Implementation Plan + Next Steps | Converted |
| `issue.labels` | Addresses/Tags | "Core Purpose #2" |
| `issue.created_at` | Issue Details | "2025-11-16" |
| `issue.state` | Status | "open" |
| `comments` (if any) | Discussion section (optional) | Comments list |

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

### Example 4: Auto-Population from GitHub Issue

**Branch:** `issue/feature-29/work-item-automation`

**Input:**
```
/create-session --auto
```

**Interaction:**
```
Detecting work item from branch...
✓ Detected: GitHub issue #29

Checking for local work-item data...
✓ Found: .claude/work-items/29/

Auto-populating session from GitHub issue #29...

Parsed from issue:
✓ Title: Phase 3C - Work-Item Automation
✓ Objective: Automate GitHub/Azure DevOps work-item maintenance
✓ Requirements: 5 core components extracted
✓ Technical Approach: 5-phase implementation plan
✓ Success Criteria: 5 criteria

✓ Session created: .claude/sessions/29-work-item-automation.md
✓ Branch metadata created: .claude/branches/issue-feature-29-work-item-automation

Session auto-populated with:
- Complete objective from issue
- All requirements (core components + key features)
- 5-phase technical approach
- Implementation plan with phases
- Success criteria checklist
- Initial session log entry

Session is ready to use. No manual editing required.

Next steps:
1. Review auto-populated session (optional)
2. Commit session file
3. Begin implementation

To commit:
  git add .claude/sessions/29-work-item-automation.md .claude/branches/issue-feature-29-work-item-automation
  git commit -m "#29 - auto-populate session from GitHub issue"
```

**Result:** Session file is fully populated and ready for use without any manual editing.

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
