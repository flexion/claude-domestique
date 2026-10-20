# Configuration Templates

This directory contains template configuration files for onus.

## config.json.example

Template for `.onus/config.json`, which configures work item integration. Settings are top-level keys; Claude Code and Codex both read this file. A legacy `onus` section in `.claude/config.json` is read only when `.onus/config.json` is absent.

### Usage

Copy to your project and customize:

```bash
mkdir -p /path/to/project/.onus
cp config.json.example /path/to/project/.onus/config.json
```

Or run the init command from the project root, which auto-detects settings:

```bash
cd /path/to/project && node <onus-plugin-root>/scripts/init.js
```

To move settings out of a legacy `.claude/config.json`, run it with `--migrate`.

### Platform Configuration

#### GitHub Issues

```json
{
  "platform": "github",
  "github": {
    "owner": "your-org",
    "repo": "your-repo"
  }
}
```

Set `GITHUB_TOKEN` environment variable for API access.

#### JIRA

```json
{
  "platform": "jira",
  "jira": {
    "host": "your-company.atlassian.net",
    "project": "PROJ"
  }
}
```

Set `JIRA_TOKEN` environment variable (base64 encoded `email:api_token`).

#### Azure DevOps

```json
{
  "platform": "azure",
  "azure": {
    "org": "your-org",
    "project": "your-project"
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
