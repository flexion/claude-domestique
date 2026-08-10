---
name: session
description: >-
  Use when the user asks about the session file for the current branch, wants to see session status, asks to create a session for a branch that has none, wants recent progress recorded in the session log, or says the work is finished and the session should be closed out.
argument-hint: "[create|update|complete]"
---

# Session Management

Show or manage the current session.

## Task

Based on the argument provided:

### No argument (default): Show session status
1. Get current branch: `git branch --show-current`
2. Sanitize branch name (replace `/` with `-`)
3. Read `.claude/sessions/<sanitized-branch>.md`. The optional
   `.claude/branches/<sanitized-branch>` metadata file records status but is not
   needed to locate the session
4. Display:
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
5. Sanitize the branch name by replacing `/` with `-`. **This sanitized branch name
   is the session filename.** Do not generate a name from the issue or description:
   `memento/hooks/session-startup.js` and `memento/rules/sessions.md` both resolve
   sessions as `.claude/sessions/<sanitized-branch>.md`, and so do `resume` and the
   Onus `commit`, `pr`, and `status` skills. A generated name such as `42-auth.md`
   is invisible to every one of them.
6. Create branch metadata file at `.claude/branches/<sanitized-branch>`:
   ```
   session: <sanitized-branch>.md
   status: in-progress
   ```
7. Create session file at `.claude/sessions/<sanitized-branch>.md` with template:
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
8. Display the new session file
9. Remind user to update Goal and Approach sections

### "update": Record progress in the session log

Restores the behaviour `memento/rules/sessions.md` refers to under UPDATE
TRIGGERS (after a milestone, before a commit, when blocked, or on reminder).

1. Resolve the session file for the current branch as in "No argument" above
2. If no session exists, say so and offer to create one — do not silently create it
3. Update these sections in place, leaving the rest of the file untouched:
   - **Session Log**: append a dated entry describing what was accomplished
   - **Files Changed**: add newly touched files, without removing prior entries
   - **Key Decisions** / **Learnings**: append only if something new was decided or learned
   - **Next Steps**: rewrite to reflect the current state
4. Write the file and show the user the sections you changed

### "complete": Close out the session

Runs before the final commit of a branch, not after the PR is opened.

1. Resolve the session file for the current branch
2. Set **Status** to `complete`
3. Append a final dated Session Log entry summarising the outcome
4. Mark remaining Next Steps done, or clear them if they are no longer relevant
5. Update `.claude/branches/<sanitized-branch>` metadata so `status: complete`
6. Show the user the completed session file
