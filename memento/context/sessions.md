# Session Workflow

## Overview

Sessions are the long-term memory system for Claude projects. They persist work context across conversation resets, branch switches, and team handoffs.

**Core Concept**: 1 Session = 1 Issue = 1 Branch = 1 Branch Metadata File

## The Problem Sessions Solve

**Without sessions:**
- Context lost when conversation reset
- Can't remember what was tried or decided
- No handoff mechanism for teammates
- Work scattered across conversations

**With sessions:**
- Persistent memory across conversations
- Decisions and learnings documented
- Teammates can read session and continue work
- Work traceable to issues/PRs

## Directory Structure

```
.claude/
├── sessions/           # Session files (rich, detailed)
│   ├── 123-add-auth.md
│   ├── 456-fix-bug.md
│   └── chore-update-deps.md
├── branches/           # Branch metadata (compact, mapping)
│   ├── issue-feature-123-add-auth
│   └── chore-update-deps
├── templates/          # Session templates
│   ├── feature.md
│   ├── fix.md
│   └── chore.md
└── tools/              # Session management tools
    ├── session.js          # Core module
    ├── create-session.js   # Create session
    └── get-session.js      # Find session
```

## Session Files

**Location**: `.claude/sessions/`

**Naming**:
- Feature/Fix with issue: `<IssueNumber>-<desc>.md` (e.g., `123-add-authentication.md`)
- Chore: `chore-<desc>.md` (e.g., `chore-update-deps.md`)

**Content Structure**:
- Details (issue, branch, type, created, status)
- Objective/Goal
- Session Log (timestamped entries)
- Key Decisions (with rationale)
- Learnings
- Files Changed
- Next Steps

## Branch Metadata Files

**Location**: `.claude/branches/`

**Naming**: Branch name with `/` → `-`
- `issue/feature-123/add-auth` → `issue-feature-123-add-auth`
- `chore/update-deps` → `chore-update-deps`

**Content** (compact, ~10 lines):
```
# Branch Metadata
branch: issue/feature-123/add-authentication
session: 123-add-authentication.md
type: feature
status: in-progress
created: 2024-01-15
last-updated: 2024-01-17
description: add-authentication
parent: main
issue: 123

## Current Work
Implementing JWT authentication system

## Next Steps
Create PR for authentication implementation
```

## Tools

### Finding Current Session

**Purpose**: Determine current session from branch

**Steps**:
1. Get current branch: `git branch --show-current`
2. Sanitize branch name: replace `/` with `-`
3. Read `.claude/branches/<sanitized-branch>` for session mapping
4. Read `.claude/sessions/<session-file>.md` for full context

**Example**:
```bash
# On branch issue/feature-123/add-authentication
# Check: .claude/branches/issue-feature-123-add-authentication
# Contains: session: 123-add-authentication.md
# Read: .claude/sessions/123-add-authentication.md
```

### Creating a Session

**Purpose**: Create branch metadata and session file

**Method**: Use the `/session` slash command after creating a branch

**Steps**:
```bash
# 1. Create branch
git checkout -b issue/feature-123/add-authentication

# 2. Create session (use /session command in Claude)
/session

# Creates:
# - .claude/branches/issue-feature-123-add-authentication
# - .claude/sessions/123-add-authentication.md
```

### Updating Sessions

Session updates are **collaborative** between Claude and the user:
- Claude edits the session file directly using the Edit tool
- User reviews changes in git diff or IDE
- Both can add log entries, decisions, learnings

This keeps session maintenance flexible and conversational rather than forcing a rigid CLI interface.

## Workflow

### Workflow Checkpoints

Two mandatory checkpoints ensure proper session tracking:

#### Pre-Analysis Checkpoint

**When**: User mentions starting new work ("start a chore", "implement feature", "fix bug")

**Check**: Are we on main/master branch?

**If yes**: STOP before any exploration or analysis. Ask:
> "Should I create a branch and session file before we start?"

**Why**: Prevents analysis work from being lost if conversation resets. Session tracks decisions made during exploration.

**Example**:
```
User: "Let's start a chore to fix the config"
Claude: [Checks branch - on main]
Claude: "I notice we're on main. Should I create a branch and session file before we start exploring?"
User: "Yes"
Claude: [Creates branch, creates session, THEN starts analysis]
```

#### Pre-Implementation Checkpoint

**When**: ExitPlanMode is used and plan is approved

**Before any code edits**: STOP and verify:
1. Not on main branch (if so, create branch)
2. Session file exists (if not, create it)
3. Update session Approach section with the approved plan
4. THEN proceed with implementation

**Why**: Ensures the approved plan is captured in the session before implementation begins.

**Example**:
```
[Plan approved via ExitPlanMode]
Claude: [Checks branch - on feature branch ✓]
Claude: [Checks session - exists ✓]
Claude: [Updates session Approach section with plan]
Claude: [THEN creates todo list and starts coding]
```

### Starting New Work

**Option 1: Use the start command (recommended)**

```bash
/memento:start
```

Claude will:
1. Ask if this is an issue or chore
2. For issues: help find the issue ID, fetch details, create branch with correct format
3. For chores: gather description, create branch
4. Create session file primed with issue/chore details
5. You're ready to work

**Option 2: Manual branch creation**

```bash
# 1. Create branch
git checkout -b issue/feature-123/add-authentication

# 2. Start Claude - session is auto-created on first prompt
claude

# Session file created automatically with template
```

### During Work

**Update session after**:
- Beginning work (document approach)
- After milestone (what completed, decisions made)
- Before pausing (capture current state)
- When blocked (document blocker)
- Before commit (document changes)

Claude edits the session file directly. User can ask "update session" or Claude can proactively suggest updates at natural checkpoints.

### Resuming Work

> **The `memento:resume` skill is proactively invoked when user asks "what's next?" or "where was I?"**

**Claude must**:
1. Get current branch: `git branch --show-current`
2. Read `.claude/branches/<sanitized-branch>` to find session file
3. Read the session file
4. Display: Goal, Approach, Next Steps, recent Session Log entries

**NEVER guess** current branch - always check.

### Completing Work (Before PR)

**Before pushing for PR**, finalize the session file:

1. **Update status**: Change `in-progress` → `complete`
2. **Mark acceptance criteria**: Check off completed items `- [x]`
3. **Final Session Log entry**: Add completion summary
4. **Files Changed**: Ensure all modified files are listed
5. **Commit session WITH code**: Atomic commit

```bash
# Update session status to complete (Claude edits directly)
# Then commit session + code together (atomic)
git add .claude/sessions/123-add-authentication.md src/
git commit -m "#123 - add authentication system"

# Create PR
gh pr create --base main --fill
```

The session file serves as documentation of what was done, why, and how—valuable context for PR reviewers.

## Key Patterns

### Session as Memory

When conversation resets or context window fills:
1. Start new conversation
2. Run `get-session.js`
3. Read session file
4. Full context restored

### Branch-Session Coupling

```
Branch switch → Session switch (automatic)
```

Metadata file maps branch to session, enabling automatic context loading.

### Branch Switch Detection

When you switch branches mid-conversation, memento automatically:

1. **Detects the switch** on the next prompt
2. **Looks for existing session** for the new branch
3. **Guides Claude to**:
   - Read existing session if found
   - Handle misnamed files (offer rename)
   - Create new session if none exists

**Misnamed File Handling**: If a session file references the current branch but has the wrong filename, memento detects this and offers to rename it for consistency.

**Possible Session Matching**: When no exact session exists, memento scores existing sessions by issue number and description word matches, suggesting likely candidates.

### Session Population Triggers

memento detects events that warrant session updates and injects reminders:

| Trigger | When | Reminder |
|---------|------|----------|
| **Todos changed** | TodoWrite tool used | Update Session Log and Next Steps |
| **Plan approved** | ExitPlanMode used | Immediately update Approach section with plan |
| **Context checkpoint** | Context usage > 80% | Save state before compaction |

These triggers ensure critical information is captured before it might be lost.

### Atomic Commits

```bash
# Session update + code changes = single commit
git add .claude/sessions/123-add-auth.md src/
git commit -m "..."
```

Session is versioned WITH the code it describes.

### Handoffs

```
Teammate: git checkout issue/feature-123/add-auth
→ Run get-session.js
→ Read session file
→ Full context of what was done, why, what's next
```

## Best Practices

### Update Frequently
Don't wait until commit - update throughout work.

### Document Decisions
WHY you chose an approach, not just WHAT you implemented.

### Capture Learnings
What did you learn? What surprised you? What would you do differently?

### Keep It Real
Session is truth - don't embellish or hide failures.

### Commit Together
Session + code = atomic commit. They version together.

## Branch Naming Patterns

The tools support multiple platforms:

| Platform | Pattern | Session File |
|----------|---------|--------------|
| GitHub | `issue/feature-N/desc` | `N-desc.md` |
| Jira | `feature/PROJ-123/desc` | `PROJ-123-desc.md` |
| Azure DevOps | `feature/456/desc` | `456-desc.md` |
| No issue | `chore/desc` | `chore-desc.md` |
