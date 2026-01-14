---
name: resume
description: |
  Resume work from the current session. Use this skill when:
  - User asks "what's next?" or "where was I?"
  - User starts a new conversation on a feature branch
  - User returns after a break and needs context
  - User asks about current work status
---

# Resume Work

Load and display session context to resume work after a break or new conversation.

## When to Use This Skill

Proactively invoke when user:
- Asks "what's next?", "where was I?", "what was I working on?"
- Starts a conversation on a non-main branch without context
- Returns from a break and seems to need orientation
- Asks about current task, issue, or progress

## Context Files (Auto-Injected)

- **rules/sessions.md**: Rules for session workflow
- **context/sessions.md**: Session file structure and patterns

Read these files for complete session management guidance.

## Quick Reference

### Load Session

1. Get current branch:
   ```bash
   git branch --show-current
   ```

2. Sanitize branch name (replace `/` with `-`)

3. Read session file:
   ```
   .claude/sessions/<sanitized-branch>.md
   ```

### Display Context

Show the user:
1. **Goal** - What we're trying to accomplish
2. **Approach** - How we planned to do it
3. **Next Steps** - What's remaining (focus here)
4. **Recent Session Log** - Last 2-3 entries for context

### Example Output

```
Resuming session for issue/feature-42/auth

Goal: Add user authentication to the application

Approach: JWT-based auth with httpOnly cookies

Next Steps:
- [ ] Add logout endpoint
- [ ] Implement token refresh
- [x] Create login form

Recent activity:
- 2024-01-15: Implemented login form and JWT handling
- 2024-01-14: Set up auth middleware
```

## What This Skill Does NOT Do

- Create new sessions (use `/memento:session create`)
- Update session content (edit directly or use hooks)
- Handle branch switching (handled by session-manager)

## Key Rules (from rules/sessions.md)

1. **Never guess branch** - always `git branch --show-current`
2. **Session = Branch = Issue** - 1:1:1 mapping
3. **Read session FIRST** on resume - before any other action
