# Configuration Templates

This directory contains template configuration files for onus.

## config.json.example

Template for `.claude/config.json` that configures work item integration.

### Usage

Copy to your project and customize:

```bash
cp config.json.example /path/to/project/.claude/config.json
```

Or run the init command which auto-detects settings:

```bash
node scripts/init.js /path/to/project
```

### Platform Configuration

#### GitHub Issues

```json
{
  "onus": {
    "platform": "github",
    "github": {
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

Set `GITHUB_TOKEN` environment variable for API access.

#### JIRA

```json
{
  "onus": {
    "platform": "jira",
    "jira": {
      "host": "your-company.atlassian.net",
      "project": "PROJ"
    }
  }
}
```

Set `JIRA_TOKEN` environment variable (base64 encoded `email:api_token`).

#### Azure DevOps

```json
{
  "onus": {
    "platform": "azure",
    "azure": {
      "org": "your-org",
      "project": "your-project"
    }
  }
}
```

Set `AZURE_DEVOPS_TOKEN` environment variable (base64 encoded `:pat_token`).

### Customizing Formats

#### Commit Message Format

Default: `{number} - {verb} {description}`

Placeholders:
- `{number}` - Issue number
- `{verb}` - Action verb (add, fix, update, etc.)
- `{description}` - Brief description

Examples:
- `{number} - {verb} {description}` → `#42 - add user login form`
- `[{number}] {verb}: {description}` → `[42] add: user login form`
- `{verb}({number}): {description}` → `add(42): user login form`

#### Branch Name Format

Default: `issue/{type}-{number}/{slug}`

Placeholders:
- `{type}` - Issue type (feature, bug, fix, chore)
- `{number}` - Issue number
- `{slug}` - URL-friendly description

Examples:
- `issue/{type}-{number}/{slug}` → `issue/feature-42/user-login`
- `{type}/{number}-{slug}` → `feature/42-user-login`
- `{number}/{slug}` → `42/user-login`
