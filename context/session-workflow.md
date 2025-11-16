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
└── branches/           # Branch metadata (compact, mapping)
    ├── issue-feature-123-add-auth
    ├── issue-feature-456-fix-bug
    └── chore-update-deps
```

## Session Files

**Location**: `.claude/sessions/`

**Naming**:
- Feature: `<IssueNumber>-<desc>.md` (e.g., `123-add-authentication.md`)
- Chore: `chore-<desc>.md` (e.g., `chore-update-dependencies.md`)

**Content Structure**:

### Feature Session Template
```markdown
# Session: Issue #123 - Add Authentication

## Issue Details
- Issue Number: #123
- Title: Add authentication system
- Created: 2024-01-15
- Status: In Progress
- GitHub URL: https://github.com/org/repo/issues/123

## Objective
Implement JWT-based authentication for API endpoints

## Requirements
- User login with email/password
- JWT token generation
- Token validation middleware
- Logout functionality

## Technical Approach
- Use jsonwebtoken library
- Store tokens in HTTP-only cookies
- Middleware checks token on protected routes
- Hash passwords with bcrypt

## Session Log

### 2024-01-15 - Session Created
- Created branch: issue/feature-123/add-authentication
- Reviewed existing auth patterns in codebase
- Decided on JWT approach over session-based

### 2024-01-16 - Authentication Core Implemented
- Created JWT generation utility
- Implemented login endpoint
- Added password hashing
- Created 15 unit tests

**Decisions:**
- Use HTTP-only cookies (more secure than localStorage)
- 24-hour token expiration
- Refresh token mechanism deferred to future issue

**Learnings:**
- bcrypt rounds: 10 is standard, higher = slower but more secure
- JWT secret must be environment variable, never hardcoded

### 2024-01-17 - Middleware and Testing
- Created authentication middleware
- Added integration tests
- Fixed token validation edge cases
- Ready for PR

## Key Decisions
1. HTTP-only cookies vs localStorage → chose cookies (XSS protection)
2. Token expiration: 24 hours (balance of security and UX)
3. Error messages: generic "Invalid credentials" (don't leak user existence)

## Learnings
- JWT payload is NOT encrypted, only signed
- bcrypt automatically handles salt generation
- Express middleware order matters for auth

## Files Changed
- `src/auth/jwt.ts` - Token generation and validation
- `src/auth/middleware.ts` - Authentication middleware
- `src/controllers/auth.controller.ts` - Login/logout endpoints
- `tests/auth/` - 15 unit tests, 5 integration tests

## Next Steps
1. Create PR with authentication implementation
2. Address PR feedback
3. Merge to main
4. Close issue #123
```

### Chore Session Template
```markdown
# Session: Update Dependencies

## Goal
Update project dependencies to latest stable versions

## Approach
1. Update package.json with latest versions
2. Run npm update
3. Run test suite to verify compatibility
4. Fix any breaking changes

## Session Log

### 2024-01-15 - Dependencies Updated
- Updated framework from v1.5 to v2.0
- Updated test library from v2.0 to v3.1
- All tests passing

**Breaking Changes:**
- Framework v2.0 changed middleware signature
- Updated 3 middleware functions

## Next Steps
1. Commit changes
2. Create PR
3. Merge after approval
```

## Branch Metadata Files

**Location**: `.claude/branches/`

**Naming**: Branch name with `/` → `-`
- `issue/feature-123/add-auth` → `issue-feature-123-add-auth`
- `chore/update-deps` → `chore-update-deps`

**Content** (ultra-compact, 3-5 lines):
```
# Branch Metadata
branch: issue/feature-123/add-authentication
session: 123-add-authentication.md
type: issue
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

## Workflow

### Starting New Work

```bash
# Create branch
git checkout -b issue/feature-123/add-authentication

# Create metadata and session
.claude/tools/create-branch-metadata.sh

# Start working
# Session file auto-created with template
```

### During Work

**Update session after**:
- Beginning work (document approach)
- After milestone (what completed, decisions made)
- Before pausing (capture current state)
- When blocked (document blocker)
- Before commit (document changes)

**Don't wait** until the end - session is continuous documentation.

### Resuming Work

**User asks**: "What's next?"

**Claude must**:
1. Run `git branch --show-current` (authoritative)
2. Run `.claude/tools/get-current-session.sh` (verify mapping)
3. Read `.claude/sessions/<session-file>.md` (find "Next Steps")

**NEVER guess** current branch - always check.

### Completing Work

```bash
# Update session with completion
# Commit session + code together (atomic)
git add .claude/sessions/123-add-authentication.md
git add src/

git commit -m "$(cat <<'EOF'
#123 - add authentication system
- Implement JWT generation
- Add login endpoint
- Create middleware
- Add tests
EOF
)"

# Create PR
gh pr create --base main --fill

# After merge: mark session complete
```

## Key Patterns

### Session as Memory

When conversation resets or context window fills:
1. Start new conversation
2. Read session file
3. Full context restored
4. Quality of work maintained

### Branch-Session Coupling

```
Branch switch → Session switch (automatic)
```

Metadata file maps branch to session, enabling automatic context loading.

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
→ Read .claude/sessions/123-add-authentication.md
→ Full context of what was done, why, what's next
```

## Tools

### get-current-session.sh

**Purpose**: Determine current session from branch

**Usage**:
```bash
.claude/tools/get-current-session.sh
# Output:
# Branch: issue/feature-123/add-authentication
# Session: .claude/sessions/123-add-authentication.md
```

### create-branch-metadata.sh

**Purpose**: Create branch metadata and session file

**Usage**:
```bash
# After creating branch
.claude/tools/create-branch-metadata.sh

# Creates:
# - .claude/branches/<branch-sanitized>
# - .claude/sessions/<session-file>.md
```

## Benefits

### For AI
- Persistent memory across conversations
- Context never lost
- Decisions and rationale preserved
- Pattern learning from past work

### For Developers
- Readable documentation of work
- Handoff mechanism
- Traceability to issues
- Git-versioned context

### For Teams
- Shared understanding of work
- Onboarding artifact
- Historical record
- Knowledge retention

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
