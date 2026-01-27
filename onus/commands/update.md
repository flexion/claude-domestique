---
description: Update work item (add comment, change status, edit fields)
argument-hint: <issue-number> [action]
---

# Update Work Item

Update an existing issue/work item on your configured platform.

## Task

### Load Project Rules

Before proceeding, check for project-level rules that may override onus defaults:

1. **Scan for project rules**
   ```bash
   find .claude/rules -name '*.md' 2>/dev/null
   ```

2. **If files found**, read any that relate to work items, issues, or the specific platform (match by filename, e.g. `work-items.md`, `jira.md`, or by frontmatter `domain:` / `type:` fields)

3. **Check for companion context** — if a rule file's frontmatter contains a `companion:` field, also read that file from `.claude/context/`

4. **State the source**
   - "Using project rules from .claude/rules/{filename}" OR
   - "No project rules found, using onus defaults"

5. **Apply precedence**: project rules override plugin defaults

Determine what the user wants to update:

### Actions

1. **Add comment** - Post a progress update or note
2. **Change status** - Move to different state (In Progress, Done, etc.)
3. **Edit fields** - Update title, description, labels, assignee
4. **Check off criteria** - Mark acceptance criteria as done

## Platform Commands

### GitHub Issues

**Add comment:**
```bash
gh issue comment 42 --body "Comment text here"
```

**Change status (close/reopen):**
```bash
gh issue close 42
gh issue reopen 42
```

**Edit fields:**
```bash
gh issue edit 42 --title "New title"
gh issue edit 42 --body "New description"
gh issue edit 42 --add-label "in-progress"
gh issue edit 42 --remove-label "needs-triage"
gh issue edit 42 --add-assignee "@me"
```

### JIRA

**Add comment:**
- Method: POST
- URL: `https://{host}/rest/api/3/issue/PROJ-123/comment`
- Body: `{ "body": { "type": "doc", "version": 1, "content": [...] } }`

**Change status (transition):**
- Method: POST
- URL: `https://{host}/rest/api/3/issue/PROJ-123/transitions`
- Body: `{ "transition": { "id": "31" } }`

**Edit fields:**
- Method: PUT
- URL: `https://{host}/rest/api/3/issue/PROJ-123`
- Body: `{ "fields": { "summary": "New title" } }`

### Azure DevOps

**Add comment:**
- Method: POST
- URL: `https://dev.azure.com/{org}/{project}/_apis/wit/workitems/42/comments?api-version=7.0-preview.3`
- Body: `{ "text": "Comment here" }`

**Update fields:**
- Method: PATCH
- URL: `https://dev.azure.com/{org}/{project}/_apis/wit/workitems/42?api-version=7.0`
- Body: JSON Patch operations

## Example Interactions

### Adding a comment
```
User: /onus:update 42 comment

Claude: What would you like to comment on issue #42?

User: Completed the API integration, moving to frontend work

Claude: Adding comment...
[Runs: gh issue comment 42 --body "..."]

Comment added to #42.
```

### Changing status
```
User: /onus:update 42 status

Claude: What status should I set for #42?
Current: Open
Options: In Progress, Done, Won't Fix

User: In Progress

Claude: For GitHub Issues, I'll add a label. Adding 'in-progress' label...
[Runs: gh issue edit 42 --add-label "in-progress"]
```

### Checking off acceptance criteria
```
User: /onus:update 42 criteria

Claude: Which acceptance criteria have been completed?
Current criteria for #42:
- [ ] User can log in with email/password
- [ ] Form validates input
- [ ] Token stored securely

User: The first two are done

Claude: I'll add a comment documenting progress...
[Runs: gh issue comment 42 --body "Progress update: ..."]
```

## Bulk Updates

To update multiple issues:
```bash
# Close all issues with a label
gh issue list --label "duplicate" --json number -q '.[].number' | xargs -I {} gh issue close {}
```

## Troubleshooting

**Can't transition issue (JIRA)?**
- Check available transitions: GET `/rest/api/3/issue/PROJ-123/transitions`
- Ensure you have permission for that transition

**Comment failed?**
- Verify issue exists and you have write access
- Check authentication token is valid
