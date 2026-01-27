---
description: Create a new work item on issue tracker
argument-hint: [title]
---

# Create Work Item

Create a new issue/work item on your configured platform (GitHub, JIRA, or Azure DevOps).

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

**IMPORTANT: Gather information before creating.**

Before creating the work item, ask the user for:

### 1. Title (required)
A concise summary of the issue/feature/task.

### 2. Type (optional)
- **feature** - New functionality
- **bug** - Something isn't working
- **task** - General work item
- **chore** - Maintenance/cleanup

### 3. Description (optional)
Detailed description of the work item. Ask if they want to include:
- Problem statement
- Acceptance criteria
- Technical notes

### 4. Labels (optional)
Tags to categorize the work item.

## Platform Commands

### GitHub Issues

```bash
gh issue create --title "Title here" --body "Description here" --label "bug,priority:high"
```

To create interactively:
```bash
gh issue create
```

### JIRA

Use WebFetch with the JIRA REST API:
- Method: POST
- URL: `https://{host}/rest/api/3/issue`
- Headers: `Authorization: Basic {JIRA_TOKEN}`, `Content-Type: application/json`
- Body:
```json
{
  "fields": {
    "project": { "key": "PROJ" },
    "summary": "Title here",
    "description": { "type": "doc", "version": 1, "content": [...] },
    "issuetype": { "name": "Task" }
  }
}
```

### Azure DevOps

Use WebFetch with the Azure DevOps API:
- Method: POST
- URL: `https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$Task?api-version=7.0`
- Headers: `Authorization: Basic {AZURE_DEVOPS_TOKEN}`, `Content-Type: application/json-patch+json`
- Body: JSON Patch format

## After Creation

1. Note the new issue number/key
2. Suggest creating a branch: `git checkout -b issue/feature-{N}/{slug}`
3. Offer to fetch the full issue details: `/onus:fetch {N}`

## Example Interaction

```
User: /onus:create

Claude: I'll help you create a new work item. What's the title?

User: Add dark mode support

Claude: Got it. What type of work item is this?
- feature (new functionality)
- bug (something broken)
- task (general work)

User: feature

Claude: Would you like to add a description or acceptance criteria?

User: Yes - should support system preference detection

Claude: Creating the issue now...
[Creates issue via gh issue create]

Created issue #87: Add dark mode support
Suggested branch: git checkout -b issue/feature-87/add-dark-mode-support
```

## Troubleshooting

**Permission denied?**
- GitHub: Ensure `GITHUB_TOKEN` has `repo` scope
- JIRA: Ensure token has project write access
- Azure: Ensure PAT has Work Items (Read, Write) scope

**Wrong project?**
- Check `.claude/config.json` for platform configuration
- Run `/onus:init` to reconfigure
