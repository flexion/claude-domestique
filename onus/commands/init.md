---
description: Initialize onus configuration for a project
argument-hint: "[--platform github|jira|azure] [--force]"
---

# Initialize Onus Configuration

Set up `.claude/config.json` with onus configuration for work item tracking.

## Task

Run the init script to create or update the configuration:

```bash
node /Users/dpuglielli/.claude/plugins/cache/claude-domestique/onus/<version>/scripts/init.js
```

The script auto-detects GitHub owner/repo from the git remote.

## Platforms

Specify the work item platform (defaults to `github`):

- **github** - GitHub Issues (auto-detected from git remote)
- **jira** - JIRA (requires manual host/project configuration)
- **azure** - Azure DevOps (requires manual org/project configuration)

## What It Does

1. Detects GitHub owner/repo from git remote URL
2. Creates `.claude/config.json` with onus section
3. Sets default commit/branch formats
4. Preserves existing config sections (merges, doesn't overwrite)

## Generated Config

```json
{
  "onus": {
    "platform": "github",
    "github": {
      "owner": "<detected>",
      "repo": "<detected>"
    },
    "commitFormat": {
      "issue": "{number} - {verb} {description}",
      "chore": "chore - {description}"
    },
    "branchFormat": {
      "issue": "issue/{type}-{number}/{slug}",
      "chore": "chore/{slug}"
    }
  }
}
```

## Options

- `--force` - Overwrite existing onus config
- `--platform <name>` - Set work item platform (github, jira, azure)

## After Initialization

For JIRA or Azure DevOps, manually edit `.claude/config.json` to add:

**JIRA:**
```json
"jira": {
  "host": "your-company.atlassian.net",
  "project": "PROJ"
}
```

**Azure DevOps:**
```json
"azure": {
  "org": "your-org",
  "project": "your-project"
}
```

## Troubleshooting

**"Configuration already exists"**
- Use `--force` to overwrite
- Or manually edit `.claude/config.json`

**Owner/repo not detected**
- Ensure you're in a git repository
- Check that `git remote get-url origin` returns a valid URL
- For non-GitHub VCS, manually set the github section after init
