---
description: Set up work item integration configuration
argument-hint: [target-dir]
---

# Initialize Work Item Integration

Set up the `.claude/config.json` with work item integration settings for this project.

## Task

**IMPORTANT: Ask the user before configuring.**

Before creating the configuration, ask the user the following questions:

### 1. Which platform do you use for work items/issues?

Options:
- **GitHub Issues** - Issues tracked in GitHub repository
- **JIRA** - Atlassian JIRA for issue tracking
- **Azure DevOps** - Azure DevOps work items

### 2. Platform-specific details:

**If GitHub:**
- Owner/organization name (e.g., `flexion`)
- Repository name (e.g., `onus`)

**If JIRA:**
- JIRA host (e.g., `company.atlassian.net`)
- Project key (e.g., `PROJ`)

**If Azure DevOps:**
- Organization name
- Project name

### 3. After gathering answers:

Create or update `.claude/config.json` with the user's choices:

```json
{
  "onus": {
    "platform": "<user-choice>",
    "<platform>": {
      // platform-specific settings from user
    },
    "commitFormat": "#{number} - {verb} {description}",
    "branchFormat": "issue/{type}-{number}/{slug}"
  }
}
```

## Example Interaction

```
Claude: Which platform do you use for tracking work items?
- GitHub Issues
- JIRA
- Azure DevOps

User: JIRA

Claude: What is your JIRA host? (e.g., company.atlassian.net)

User: acme.atlassian.net

Claude: What is your JIRA project key? (e.g., PROJ)

User: ACME

Claude: I'll create the configuration now...
[Creates .claude/config.json with JIRA settings]
```

## What Gets Created

```json
{
  "onus": {
    "platform": "jira",
    "jira": {
      "host": "acme.atlassian.net",
      "project": "ACME"
    },
    "commitFormat": "#{number} - {verb} {description}",
    "branchFormat": "issue/{type}-{number}/{slug}"
  }
}
```

## Important Notes

- **Never overwrites**: If onus config exists, show current config and ask if they want to update
- **Merges with existing**: Other config.json settings are preserved
- Create `.claude/` directory if it doesn't exist

## After Setup

Remind the user to set up authentication:
- GitHub: `export GITHUB_TOKEN=ghp_...` ([Create PAT](https://github.com/settings/tokens) with `repo` scope)
- JIRA: `export JIRA_TOKEN=$(echo -n "email:api_token" | base64)` ([Get API token](https://id.atlassian.com/manage-profile/security/api-tokens))
- Azure: `export AZURE_DEVOPS_TOKEN=$(echo -n ":pat" | base64)` ([Create PAT](https://dev.azure.com/_usersSettings/tokens) with Work Items Read)
