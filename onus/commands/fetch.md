---
description: Fetch work item details from issue tracker
argument-hint: <issue-number>
---

# Fetch Work Item Details

Fetch issue/work item details from your configured platform (GitHub, JIRA, or Azure DevOps).

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

To fetch issue details, use the appropriate command based on your platform:

### GitHub Issues

Use the GitHub CLI (recommended):
```bash
gh issue view 42 --json number,title,body,state,labels,assignees
```

### JIRA

Use WebFetch with the JIRA REST API:
- URL: `https://{host}/rest/api/3/issue/PROJ-123`
- Headers: `Authorization: Basic {JIRA_TOKEN}`

Extract title, description, status, and acceptance criteria from the response.

### Azure DevOps

Use WebFetch with the Azure DevOps API:
- URL: `https://dev.azure.com/{org}/{project}/_apis/wit/workitems/42?api-version=7.0`
- Headers: `Authorization: Basic {AZURE_DEVOPS_TOKEN}`

Extract title, description, state, and work item type from the response.

## What to Extract

When fetching an issue, capture:

1. **Key/Number**: Issue identifier
2. **Title**: Summary of the issue
3. **Description**: Full description (may contain acceptance criteria)
4. **Status**: Current state (Open, In Progress, etc.)
5. **Type**: Bug, Feature, Task, etc.
6. **Labels/Tags**: Classification
7. **Assignee**: Who's working on it
8. **Acceptance Criteria**: Checkboxes or definition of done

## Caching

After fetching, the issue details are cached locally in `~/.claude/onus/work-item-cache.json`.

The cache:
- Persists across sessions
- Auto-expires after 1 hour
- Can be refreshed with `/fetch` at any time

## Example Response

```yaml
Issue #42
Title: Implement user authentication
Type: feature
Status: In Progress
Labels: auth, security, priority:high

Description:
Add email/password authentication to the application.

Acceptance Criteria:
- [ ] Login form with email and password fields
- [ ] Form validation with error messages
- [ ] Secure token storage (httpOnly cookies)
- [ ] Auto-logout on token expiry
- [ ] "Remember me" functionality

Commit format: #42 - {verb} {description}
```

## Integration with Session

After fetching, the issue context is:
1. Cached locally for quick access
2. Injected on session start
3. Available for commit message suggestions
4. Used for PR description generation

## Troubleshooting

**Issue not found?**
- Check the issue number is correct
- Verify platform configuration in `.claude/config.json`
- Ensure authentication token is set

**Authentication failed?**
- GitHub: `export GITHUB_TOKEN=ghp_...` ([Create PAT](https://github.com/settings/tokens))
- JIRA: `export JIRA_TOKEN=$(echo -n "email:api_token" | base64)` ([Get API token](https://id.atlassian.com/manage-profile/security/api-tokens))
- Azure: `export AZURE_DEVOPS_TOKEN=$(echo -n ":pat" | base64)` ([Create PAT](https://dev.azure.com/_usersSettings/tokens))

**Stale data?**
- Run `/fetch` again to refresh the cache
- Cache expires after 1 hour automatically
