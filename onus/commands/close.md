---
description: Close a work item
argument-hint: <issue-number> [reason]
---

# Close Work Item

Close an issue/work item on your configured platform.

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

Before closing, verify:

1. **Acceptance criteria met** - Check all criteria are addressed
2. **PR merged** - If code changes were involved
3. **Reason** - Completed, Won't Fix, Duplicate, etc.

## Platform Commands

### GitHub Issues

**Close as completed:**
```bash
gh issue close 42 --reason completed
```

**Close as not planned:**
```bash
gh issue close 42 --reason "not planned"
```

**Close with comment:**
```bash
gh issue close 42 --comment "Completed in PR #55"
```

### JIRA

Transition to Done/Closed status:
- Method: POST
- URL: `https://{host}/rest/api/3/issue/PROJ-123/transitions`
- Body: `{ "transition": { "id": "done-transition-id" } }`

To find transition IDs:
- GET `https://{host}/rest/api/3/issue/PROJ-123/transitions`

### Azure DevOps

Update state to Closed/Done:
- Method: PATCH
- URL: `https://dev.azure.com/{org}/{project}/_apis/wit/workitems/42?api-version=7.0`
- Body:
```json
[
  { "op": "add", "path": "/fields/System.State", "value": "Closed" }
]
```

## Close Reasons

| Reason | When to Use |
|--------|-------------|
| **Completed** | Work is done, acceptance criteria met |
| **Duplicate** | Same as another issue (link to original) |
| **Won't Fix** | Valid issue but won't be addressed |
| **Invalid** | Not a real issue or works as designed |
| **Stale** | No activity, no longer relevant |

## Example Interactions

### Close completed issue
```
User: /onus:close 42

Claude: Before closing #42, let me verify:
- PR #55 merged: Yes
- Acceptance criteria:
  - [x] User login works
  - [x] Error messages display
  - [x] Token stored securely

All criteria met. Closing as completed...
[Runs: gh issue close 42 --reason completed --comment "Completed in PR #55"]

Issue #42 closed.
```

### Close as duplicate
```
User: /onus:close 42 duplicate

Claude: Which issue is this a duplicate of?

User: #38

Claude: Closing as duplicate of #38...
[Runs: gh issue close 42 --comment "Duplicate of #38"]

Issue #42 closed as duplicate.
```

### Close won't fix
```
User: /onus:close 42 wontfix

Claude: Please provide a reason for not fixing:

User: Out of scope for current release

Claude: Closing as not planned...
[Runs: gh issue close 42 --reason "not planned" --comment "Out of scope for current release"]

Issue #42 closed as not planned.
```

## Verification Checklist

Before closing, Claude should verify:

- [ ] All acceptance criteria addressed (or explicitly descoped)
- [ ] Related PR merged (if applicable)
- [ ] No blocking issues remain
- [ ] Closing reason documented

## Reopening

If closed in error:

**GitHub:**
```bash
gh issue reopen 42
```

**JIRA/Azure:** Use transition/state change to reopen.

## Troubleshooting

**Can't close?**
- Check you have write permissions
- JIRA: Verify the "Close" transition is available from current state
- Some workflows require fields to be set before closing
