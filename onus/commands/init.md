---
description: Initialize onus configuration for a project
argument-hint: "[--platform github|jira|azure] [--force]"
---

# Initialize Onus Configuration

Set up `.claude/config.json` with onus configuration for work item tracking.

## Task

### Step 1: Detect Existing Commit Patterns

Before creating config, analyze recent commits to detect existing conventions:

```bash
git log --oneline -30
```

Look for these common patterns:

| Pattern | Example | Format String |
|---------|---------|---------------|
| Issue number prefix | `#42 - add feature` | `{number} - {description}` |
| Conventional commits | `feat(auth): add login` | `{type}({scope}): {description}` |
| JIRA style | `[PROJ-123] fix bug` | `[{project}-{number}] {description}` |
| Semantic | `fix: resolve issue` | `{type}: {description}` |
| Chore prefix | `chore - update deps` | `chore - {description}` |

If a clear pattern emerges (>50% of commits), note it for Step 3.

### Step 2: Run Init Script

Run the init script to create base configuration:

```bash
node ~/.claude/plugins/cache/claude-domestique/onus/*/scripts/init.js
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

### Step 3: Update Config with Detected Patterns

If Step 1 detected a different commit pattern, update `.claude/config.json`:

**Conventional Commits detected:**
```json
"commitFormat": {
  "issue": "{type}({scope}): {description} (#{number})",
  "chore": "chore: {description}"
}
```

**JIRA style detected:**
```json
"commitFormat": {
  "issue": "[{project}-{number}] {description}",
  "chore": "chore: {description}"
}
```

**No clear pattern:** Keep the defaults - they follow common GitHub conventions.

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
