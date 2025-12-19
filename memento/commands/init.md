---
description: Initialize session management infrastructure
---

# Initialize Session Management

Set up session management directories for this project.

## Task

1. Check if `.claude/sessions/` directory exists
2. If it exists, inform the user session management is already initialized
3. Create required directories:
   - `.claude/sessions/` - session files
   - `.claude/branches/` - branch-to-session mapping

Note: Tools run from the plugin, templates are read from the plugin. No files are copied to the consumer project.

## After Setup

Remind the user:
1. Session infrastructure is ready
2. Create a branch for your work: `git checkout -b feature/my-feature`
3. Create a session: `/session`
4. The SessionStart hook will auto-detect sessions on startup
5. If using mantra plugin, session workflow context is auto-loaded
