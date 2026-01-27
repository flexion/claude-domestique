---
description: Show current work item status and session overview
argument-hint:
---

# Work Item Status

Display a dashboard view of the current work item, session, and git state.

## Task

### Load Project Rules

Before proceeding, check for project-level rules that may override onus defaults:

1. **Scan for project rules**
   ```bash
   find .claude/rules -name '*.md' 2>/dev/null
   ```

2. **If files found**, read any that relate to git, commits, work items, issues, or session management (match by filename, e.g. `git.md`, `work-items.md`, or by frontmatter `domain:` / `type:` fields)

3. **Check for companion context** — if a rule file's frontmatter contains a `companion:` field, also read that file from `.claude/context/`

4. **State the source**
   - "Using project rules from .claude/rules/{filename}" OR
   - "No project rules found, using onus defaults"

5. **Apply precedence**: project rules override plugin defaults

Show a consolidated view of:
1. Current work item (from branch/cache)
2. Session file status (from memento)
3. Git state (branch, staged changes, commits)

### Workflow

1. **Detect Current Context**
   ```bash
   git branch --show-current
   git status --short
   ```

2. **Load Work Item**
   - Check onus state file: `~/.claude/onus/state.json`
   - Load cached details: `~/.claude/onus/work-item-cache.json`
   - If not cached, show placeholder with fetch suggestion

3. **Load Session**
   - Check `.claude/sessions/<branch>.md`
   - Extract key sections: Goal, Status, Next Steps

4. **Show Git Status**
   - Uncommitted changes
   - Commits ahead/behind remote
   - Staged files

### Output Format

```
## Work Item Dashboard

### Current Work Item
- **Issue**: #[number] - [title]
- **Type**: [feature/bug/chore]
- **Status**: [open/in-progress/in-review]
- **URL**: [link if available]

### Session
- **File**: .claude/sessions/[filename].md
- **Status**: [in-progress/complete]
- **Last Updated**: [timestamp or "unknown"]

### Acceptance Criteria
- [ ] [criterion 1]
- [x] [criterion 2 - completed]
- [ ] [criterion 3]

### Git State
- **Branch**: [branch name]
- **Remote**: [ahead/behind status]
- **Staged**: [number of files or "none"]
- **Modified**: [number of files or "none"]

### Quick Actions
- `/onus:fetch` - Refresh issue details
- `/onus:commit` - Commit staged changes
- `/onus:pr` - Create pull request
- `/onus:validate-criteria` - Check criteria completion
```

## Example

```
User: /onus:status

Claude: ## Work Item Dashboard

### Current Work Item
- **Issue**: #42 - Add user authentication
- **Type**: feature
- **Status**: open
- **URL**: https://github.com/org/repo/issues/42

### Session
- **File**: .claude/sessions/issue-feature-42-auth.md
- **Status**: in-progress
- **Last Updated**: 2024-01-15

### Acceptance Criteria
- [x] Login form with email/password
- [x] JWT token handling
- [ ] Remember me checkbox
- [ ] Password reset flow

### Git State
- **Branch**: issue/feature-42/auth
- **Remote**: 2 commits ahead
- **Staged**: none
- **Modified**: 3 files

### Quick Actions
- `/onus:commit` - Commit your changes
- `/onus:validate-criteria` - 2 of 4 criteria remaining
```

## When to Use

Invoke this skill:
- At the start of a work session
- When resuming work after a break
- When unsure of current state
- Before creating a commit or PR

## Notes

- If no work item is detected, shows guidance for starting work
- Stale cache data is marked with a warning
- Session file absence suggests running `/memento:start`
