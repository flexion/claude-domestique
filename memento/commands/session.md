---
description: Show current session status or create a new session
argument-hint: [create]
---

# Session Management

Show or manage the current session.

## Task

Based on the argument provided:

### No argument (default): Show session status
1. Get current branch: `git branch --show-current`
2. Sanitize branch name (replace `/` with `-`) to find metadata file
3. Check if `.claude/branches/<sanitized-branch>` exists
4. If metadata exists, read it to find session file path
5. Read `.claude/sessions/<session>.md` and display:
   - Branch and session file path
   - Current status
   - Next steps section
   - Recent log entries (last 2-3)
6. If no session found:
   - Show current branch
   - Suggest: "Run `/session create` to create a session for this branch"

### "create": Create session for current branch
1. Get current branch: `git branch --show-current`
2. Refuse if on main/master branch
3. Parse branch name to extract:
   - Type (feature, fix, chore)
   - Issue ID if present (e.g., #123, PROJ-456)
   - Description slug
4. Create `.claude/sessions/` and `.claude/branches/` directories if needed
5. Generate session filename: `<issue>-<desc>.md` or `<type>-<desc>.md`
6. Sanitize branch name for metadata: replace `/` with `-`
7. Create branch metadata file at `.claude/branches/<sanitized-branch>`:
   ```
   session: <session-filename>
   status: in-progress
   ```
8. Create session file at `.claude/sessions/<session-filename>` with template:
   ```markdown
   # Session: <description>

   **Issue**: <issue-id or N/A>
   **Branch**: <branch-name>
   **Type**: <type>
   **Created**: <today's date>
   **Status**: in-progress

   ## Goal
   [Describe the objective]

   ## Approach
   [Describe the implementation approach]

   ## Session Log
   - <date>: Session created

   ## Key Decisions
   - None yet

   ## Learnings
   - None yet

   ## Files Changed
   - None yet

   ## Next Steps
   - [ ] Define goal and approach
   ```
9. Display the new session file
10. Remind user to update Goal and Approach sections
