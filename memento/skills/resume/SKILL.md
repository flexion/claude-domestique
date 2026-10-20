---
name: resume
description: >-
  Use when returning to an existing branch session after a break or in a new
  conversation and needing its saved context and next action.
---

# Resume Work

Relative plugin paths in this skill are resolved from this `SKILL.md`.

Load and display session context to resume work after a break or new conversation.

## When to Use This Skill

Proactively invoke when user:
- Asks "what's next?", "where was I?", "what was I working on?"
- Starts a conversation on a non-main branch without context
- Returns from a break and seems to need orientation
- Asks about current task, issue, or progress

## Context Files (Auto-Injected)

- **`../../rules/sessions.md`**: Rules for session workflow
- **`../../context/sessions.md`**: Session file structure and patterns

Read these files for complete session management guidance.

## Quick Reference

### Load Session

1. Get current branch:
   ```bash
   git branch --show-current
   ```

2. Sanitize branch name (replace `/` with `-`)

3. Read the session file. Resolve each path you need on its own. Session file: use the injected `📂 Session:` path if its filename is `<sanitized-branch>.md` for the current branch (`git branch --show-current`, every `/` replaced by `-`). Branch metadata file: use the injected `🗂️ Branch metadata:` path if its filename is `<sanitized-branch>` (no `.md`). A same-branch prompt injects only the session path, and an injected path for another branch is stale, for example after a `git checkout` earlier in the same turn. Whenever a path you need has no current-branch injection, run memento's resolver with Node: `scripts/resolve-session.js` in the memento plugin, i.e. `../../scripts/resolve-session.js` relative to the directory containing this SKILL.md. (On Claude Code that directory is `${CLAUDE_SKILL_DIR}`, so the command is `node "${CLAUDE_SKILL_DIR}/../../scripts/resolve-session.js"`.) It prints one JSON object with `sessionPath`, `sessionExists`, `branchMetadataPath`, `legacy`, `migrationCommand`, and `warnings`; take the missing path from it and show the user any `warnings`. If `legacy` is true, the session is at the old `.claude/sessions/` location: use it, and offer the resolver's `migrationCommand` to move it, copied verbatim, character for character, in a code block. Do not shorten it, re-quote it, make its paths relative, or drop `git -C`: it is quoted and anchored to the repository root so it is safe to run from any directory. Do not run it unasked. Exit 1 means there is no git repository or no current branch.

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

- Create new sessions (use `memento:session create`)
- Update session content (edit directly or use hooks)
- Handle branch switching (handled by the `SessionStart` and `UserPromptSubmit` hooks)

## Key Rules (from `../../rules/sessions.md`)

1. **Never guess branch** - always `git branch --show-current`
2. **Session = Branch = Issue** - 1:1:1 mapping
3. **Read session FIRST** on resume - before any other action
