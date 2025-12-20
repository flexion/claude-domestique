# Session Management

Manage the current session file.

## Arguments

- **(none)**: Show session status
- **create**: Create session (auto-created by hook, rarely needed)
- **update**: Update session with recent progress
- **complete**: Mark session as complete

## Actions

### No argument: Show status
1. Get branch: `git branch --show-current`
2. Find session: `.claude/sessions/<branch-sanitized>.md`
3. Display: status, next steps, recent log

### update: Log progress
1. Read the session file
2. Update these sections:
   - **Session Log**: Add today's date and what was accomplished
   - **Files Changed**: List any new files modified
   - **Next Steps**: Update based on current state
3. Write the updated file

### complete: Mark done
1. Change **Status** to `complete`
2. Add final log entry
3. Clear Next Steps or mark all done
