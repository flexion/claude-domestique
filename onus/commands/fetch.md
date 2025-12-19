---
description: Fetch work item details from issue tracker
argument-hint: <issue-number>
---

# Fetch Work Item Details

Fetch issue/work item details from your configured platform (GitHub, JIRA, or Azure DevOps).

## Task

To fetch issue details, use the appropriate command based on your platform:

### GitHub Issues

```bash
# Fetch issue #42
gh issue view 42 --json number,title,body,state,labels,assignees
```

Or via API:
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/issues/42"
```

### JIRA

```bash
curl -H "Authorization: Basic $JIRA_TOKEN" \
  "https://{host}/rest/api/3/issue/PROJ-123"
```

### Azure DevOps

```bash
curl -H "Authorization: Basic $AZURE_DEVOPS_TOKEN" \
  "https://dev.azure.com/{org}/{project}/_apis/wit/workitems/42?api-version=7.0"
```

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
- GitHub: `export GITHUB_TOKEN=ghp_...`
- JIRA: `export JIRA_TOKEN=$(echo -n email:api_token | base64)`
- Azure: `export AZURE_DEVOPS_TOKEN=$(echo -n :pat_token | base64)`

**Stale data?**
- Run `/fetch` again to refresh the cache
- Cache expires after 1 hour automatically
