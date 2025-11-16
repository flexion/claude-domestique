# Issue Detector Skill

## Description
Automatically detects work-item identifiers (GitHub issues, Jira tickets, Azure DevOps work items) from branch names and validates them via appropriate APIs. Enables work-item automation by identifying which issue/ticket the current work relates to.

## Trigger Conditions

This skill auto-invokes when:

1. **Session Start** - Automatically at the beginning of any new session
   - Detects issue from current branch
   - Validates issue exists
   - Caches issue details for session

2. **Branch Switch** - When switching branches
   - Re-detects issue from new branch
   - Updates cached issue details
   - Reports if issue changes

3. **Manual Request** - When user says:
   - "detect issue"
   - "what issue?"
   - "which work item?"
   - "what ticket am I working on?"

4. **Session Creation** - When creating new session file
   - Detects issue to auto-populate session
   - Only if branch name matches work-item pattern

## Actions

When triggered, perform the following steps:

### Step 1: Get Current Branch

Retrieve the current Git branch name:

```bash
git branch --show-current
```

**Examples:**
- `issue/feature-29/work-item-automation`
- `feature/PROJ-123/implement-auth`
- `feature/456/add-caching`
- `main` (no issue - skip detection)

**Exit early if:**
- Branch is `main`, `master`, `develop` (no issue tracking)
- Branch doesn't match any work-item pattern
- Not a Git repository

### Step 2: Parse Branch Name

Extract work-item identifier from branch name using pattern matching:

**GitHub Pattern:**
- Pattern: `issue/feature-N/description` OR `feature/N/description`
- Extract: numeric portion
- Example: `issue/feature-29/desc` → `29`

**Jira Pattern:**
- Pattern: `feature/PROJECT-N/description` OR `PROJECT-N/description`
- Extract: PROJECT-N format
- Example: `feature/PROJ-123/desc` → `PROJ-123`

**Azure DevOps Pattern:**
- Pattern: `feature/N/description` (numeric only)
- Extract: numeric portion
- Example: `feature/456/desc` → `456`

**Regex Patterns:**
```
GitHub:    issue/feature-(\d+)/   OR   feature/(\d+)/
Jira:      ([A-Z]+-\d+)
Azure:     feature/(\d+)/
```

**Note on ambiguity:**
- Both GitHub and Azure DevOps can use numeric identifiers
- Will need API validation to disambiguate

### Step 3: Detect Platform

Determine which platform based on identifier format:

**Detection Logic:**
1. **Jira** (highest confidence):
   - Format: `PROJECT-123` (uppercase letters, dash, number)
   - Regex: `^[A-Z]+-\d+$`
   - Platform: Jira (unambiguous)

2. **GitHub or Azure DevOps** (requires disambiguation):
   - Format: `#29` or `29` (numeric only)
   - Need to check which API responds

**Platform Detection Steps:**
```
IF identifier matches /^[A-Z]+-\d+$/
  → Jira (definite)
ELSE IF identifier matches /^\d+$/
  → Check GitHub API first (more common)
  → If GitHub fails, try Azure DevOps API
  → Report which platform responded
```

### Step 4: Validate Issue Exists

Call appropriate API to validate issue/work-item exists:

#### GitHub Validation

**API Call:**
```bash
gh api repos/:owner/:repo/issues/:number
```

**How to get owner/repo:**
- From git remote: `git remote get-url origin`
- Parse: `git@github.com:flexion/claude-domestique.git` → `flexion/claude-domestique`

**Success Response:**
```json
{
  "number": 29,
  "title": "Phase 3C - Work-Item Automation",
  "state": "open",
  "html_url": "https://github.com/flexion/claude-domestique/issues/29"
}
```

**Error Response:**
- 404: Issue not found
- 401: Authentication required (run `gh auth login`)
- 403: Rate limit exceeded

#### Jira Validation

**API Call (REST API v3):**
```bash
curl -H "Authorization: Bearer $JIRA_API_TOKEN" \
     https://company.atlassian.net/rest/api/3/issue/PROJ-123
```

**Alternative (imdone CLI - if available):**
```bash
imdone pull PROJ-123
```

**Success Response:**
```json
{
  "key": "PROJ-123",
  "fields": {
    "summary": "Implement authentication",
    "status": {"name": "In Progress"},
    "issuetype": {"name": "Story"}
  }
}
```

**Error Response:**
- 404: Issue not found
- 401: Authentication required
- imdone not installed (fall back to REST API)

**Detection Strategy:**
- Check if `.imdone/config.yml` exists → use imdone CLI
- Otherwise → use Jira REST API
- Report which method used

#### Azure DevOps Validation

**API Call:**
```bash
az boards work-item show --id 456
```

**Prerequisites:**
- Azure CLI installed (`az` command available)
- Authenticated: `az login`
- Project configured

**Success Response:**
```json
{
  "id": 456,
  "fields": {
    "System.Title": "Add caching layer",
    "System.State": "Active",
    "System.WorkItemType": "User Story"
  }
}
```

**Error Response:**
- Work item not found
- Not authenticated
- Azure CLI not installed

### Step 5: Cache Detection Result

Store detected issue details for session use:

**Cache Location:**
- In-memory for current session
- Optionally: `.claude/cache/issue-detection.json`

**Cached Data:**
```json
{
  "branch": "issue/feature-29/work-item-automation",
  "identifier": "29",
  "platform": "github",
  "validated": true,
  "details": {
    "number": 29,
    "title": "Phase 3C - Work-Item Automation",
    "state": "open",
    "url": "https://github.com/flexion/claude-domestique/issues/29"
  },
  "cached_at": "2024-11-16T10:00:00Z"
}
```

**Cache Invalidation:**
- When branch changes
- When user requests manual re-detection
- After 1 hour (stale data)

### Step 6: Report Results

Display detection results to user:

**Success (GitHub):**
```
Issue detected from branch:
✓ Platform: GitHub
✓ Issue: #29
✓ Title: Phase 3C - Work-Item Automation
✓ State: open
✓ URL: https://github.com/flexion/claude-domestique/issues/29

Branch: issue/feature-29/work-item-automation
```

**Success (Jira):**
```
Issue detected from branch:
✓ Platform: Jira
✓ Issue: PROJ-123
✓ Summary: Implement authentication
✓ Status: In Progress
✓ Type: Story

Branch: feature/PROJ-123/implement-auth
```

**Success (Azure DevOps):**
```
Work item detected from branch:
✓ Platform: Azure DevOps
✓ Work Item: #456
✓ Title: Add caching layer
✓ State: Active
✓ Type: User Story

Branch: feature/456/add-caching
```

**No Issue Detected:**
```
No work-item detected from branch.

Current branch: main

This is expected for main/master/develop branches.
No work-item tracking for this branch.
```

**Validation Failed:**
```
Work-item identifier detected but validation failed:
✗ Platform: GitHub (attempted)
✗ Issue: #999
✗ Error: Issue not found (404)

Branch: issue/feature-999/nonexistent

Possible causes:
- Issue doesn't exist
- API authentication required (run: gh auth login)
- Network connectivity issue

Suggestion: Verify issue number and API access.
```

## Configuration

Projects can configure issue detection in `.claude/config.json`:

```json
{
  "workItems": {
    "platform": "github",
    "autoDetect": true,
    "cacheResults": true,
    "github": {
      "repo": "owner/repo"
    },
    "jira": {
      "host": "https://company.atlassian.net",
      "project": "PROJ",
      "method": "rest_api",
      "imdone": {
        "enabled": false
      }
    },
    "azure_devops": {
      "organization": "myorg",
      "project": "MyProject"
    }
  }
}
```

**Fields:**
- `platform` (string, optional) - Explicit platform ("github" | "jira" | "azure_devops")
  - If not set, auto-detect from identifier format
- `autoDetect` (boolean, default: true) - Auto-detect at session start
- `cacheResults` (boolean, default: true) - Cache detection results
- `github.repo` (string, optional) - Override repo (auto-detected from git remote by default)
- `jira.host` (string) - Jira instance URL
- `jira.project` (string) - Jira project key
- `jira.method` (string) - "rest_api" or "imdone"
- `jira.imdone.enabled` (boolean) - Use imdone CLI instead of REST API
- `azure_devops.organization` (string) - Azure DevOps organization
- `azure_devops.project` (string) - Azure DevOps project name

## Error Handling

### No Git Repository
**Scenario**: Not in a Git repository

**Action**:
- Skip detection silently
- Don't report error
- Return: "No Git repository detected"

### Branch Pattern Doesn't Match
**Scenario**: Branch name doesn't match any work-item pattern

**Action**:
- Report: "No work-item detected from branch name"
- Suggest: "Branch doesn't follow work-item naming pattern"
- Don't fail operation
- Return: No issue detected (expected for non-feature branches)

### API Authentication Failed
**Scenario**: API requires authentication

**Action**:
- Report: "API authentication failed"
- Suggest platform-specific auth:
  - GitHub: "Run: gh auth login"
  - Jira: "Configure Jira API token"
  - Azure DevOps: "Run: az login"
- Cache failure (don't retry immediately)
- Return: Validation failed

### Issue Not Found
**Scenario**: Issue identifier valid but doesn't exist

**Action**:
- Report: "Issue not found via API"
- Suggest: "Verify issue number is correct"
- Cache negative result (prevent repeated API calls)
- Return: Validation failed

### Multiple Platforms Ambiguous
**Scenario**: Numeric ID could be GitHub or Azure DevOps

**Action**:
- Try GitHub first (more common)
- If GitHub 404, try Azure DevOps
- Report which platform responded
- Cache platform for future use

### API Rate Limit
**Scenario**: API rate limit exceeded

**Action**:
- Report: "API rate limit exceeded"
- Use cached result if available
- Suggest: "Wait before retrying"
- Don't retry automatically

### Tool Not Available
**Scenario**: Required tool not installed (gh, az, imdone)

**Action**:
- Report: "Tool not available: [tool name]"
- Suggest installation:
  - gh: "Install GitHub CLI: https://cli.github.com"
  - az: "Install Azure CLI: https://aka.ms/azure-cli"
  - imdone: "Install: npm i -g imdone-cli"
- Fall back if alternative available (e.g., Jira REST API instead of imdone)
- Return: Validation failed

## Examples

### Example 1: GitHub Issue Detection (Success)

**Branch:** `issue/feature-29/work-item-automation`

**Detection Process:**
1. Parse branch: Extract `29`
2. Detect platform: Numeric → try GitHub first
3. Validate: `gh api repos/flexion/claude-domestique/issues/29`
4. Success: Issue exists
5. Cache result

**Output:**
```
Issue detected from branch:
✓ Platform: GitHub
✓ Issue: #29
✓ Title: Phase 3C - Work-Item Automation
✓ State: open
✓ URL: https://github.com/flexion/claude-domestique/issues/29

Branch: issue/feature-29/work-item-automation
Cached for session.
```

### Example 2: Jira Ticket Detection (Success with imdone)

**Branch:** `feature/PROJ-123/implement-auth`

**Configuration:**
```json
{
  "workItems": {
    "jira": {
      "imdone": {
        "enabled": true
      }
    }
  }
}
```

**Detection Process:**
1. Parse branch: Extract `PROJ-123`
2. Detect platform: `PROJ-123` format → Jira (definite)
3. Check: `.imdone/config.yml` exists → use imdone
4. Validate: `imdone pull PROJ-123`
5. Success: Issue fetched as markdown
6. Cache result

**Output:**
```
Issue detected from branch:
✓ Platform: Jira (via imdone CLI)
✓ Issue: PROJ-123
✓ Summary: Implement user authentication
✓ Status: In Progress
✓ Type: Story
✓ Markdown: backlog/PROJ-123-implement-auth/issue-PROJ-123.md

Branch: feature/PROJ-123/implement-auth
Cached for session.
```

### Example 3: Azure DevOps Work Item (GitHub 404, Azure Success)

**Branch:** `feature/456/add-caching`

**Detection Process:**
1. Parse branch: Extract `456`
2. Detect platform: Numeric → try GitHub first
3. GitHub validation: `gh api repos/.../issues/456` → 404 Not Found
4. Try Azure DevOps: `az boards work-item show --id 456`
5. Success: Work item exists
6. Cache result (platform: azure_devops)

**Output:**
```
Work item detected from branch:
✓ Platform: Azure DevOps (GitHub check failed, Azure succeeded)
✓ Work Item: #456
✓ Title: Add caching layer
✓ State: Active
✓ Type: User Story

Branch: feature/456/add-caching
Cached for session (platform disambiguated: azure_devops).
```

### Example 4: No Issue (Main Branch)

**Branch:** `main`

**Detection Process:**
1. Branch is `main` → skip detection

**Output:**
```
No work-item detected from branch.

Current branch: main

This is expected for main/master/develop branches.
No work-item tracking for this branch.
```

### Example 5: Issue Not Found

**Branch:** `issue/feature-999/nonexistent`

**Detection Process:**
1. Parse branch: Extract `999`
2. Detect platform: Numeric → try GitHub
3. Validate: `gh api repos/flexion/claude-domestique/issues/999` → 404
4. Try Azure DevOps: Not configured
5. Failure: Issue doesn't exist

**Output:**
```
Work-item identifier detected but validation failed:
✗ Platform: GitHub (attempted)
✗ Issue: #999
✗ Error: Issue not found (404)

Branch: issue/feature-999/nonexistent

Possible causes:
- Issue doesn't exist in repository
- Issue number incorrect
- API authentication required

Suggestion:
- Verify issue number: https://github.com/flexion/claude-domestique/issues
- Check authentication: gh auth status
```

### Example 6: Authentication Required

**Branch:** `feature/PROJ-123/implement-auth`

**Detection Process:**
1. Parse branch: Extract `PROJ-123`
2. Detect platform: Jira
3. Validate: REST API call → 401 Unauthorized
4. imdone not configured
5. Failure: Authentication required

**Output:**
```
Work-item identifier detected but validation failed:
✗ Platform: Jira
✗ Issue: PROJ-123
✗ Error: Authentication required (401)

Branch: feature/PROJ-123/implement-auth

Jira API authentication not configured.

Options:
1. Configure Jira API token in config
2. Install and configure imdone CLI: npm i -g imdone-cli && imdone login
3. Set explicit platform in config if this isn't actually a Jira ticket

Suggestion: Configure Jira access or use explicit platform setting.
```

## Integration

**Works with:**
- Git (branch name parsing)
- GitHub API (via `gh` CLI)
- Jira API (via REST API or imdone CLI)
- Azure DevOps API (via `az` CLI)
- Branch metadata system (stores detected issue)
- Session files (issue details for auto-population)
- Work-item automation workflow

**Required Tools:**
- Git (always available)
- `gh` CLI for GitHub (install: https://cli.github.com)
- Jira API token OR imdone CLI for Jira
- `az` CLI for Azure DevOps (install: https://aka.ms/azure-cli)

**Benefits:**
- **Automatic**: Detects issue without manual input
- **Multi-platform**: Works with GitHub, Jira, Azure DevOps
- **Smart**: Disambiguates numeric IDs across platforms
- **Cached**: Avoids repeated API calls
- **Flexible**: Supports both REST API and imdone CLI for Jira
- **Resilient**: Gracefully handles missing tools, auth failures
- **Transparent**: Clear reporting of detection process
- **Foundation**: Enables work-item automation (auto-populate sessions)

## Notes

- This skill is the **foundation** for work-item automation
- Detects which issue/ticket is being worked on
- Next phase will use detection results to auto-populate sessions
- Platform auto-detection reduces configuration burden
- Caching reduces API calls (important for rate limits)
- Ambiguous numeric IDs handled by trying multiple platforms
- imdone support is optional (Jira REST API is fallback)
- Works with all three major work-item platforms
- Designed for zero-config (auto-detects from git remote)
- Configuration available for complex scenarios (multiple orgs, projects)

## Future Enhancements

**Phase 2 (GitHub Integration):**
- Use detection results to fetch full issue details
- Auto-populate session file from issue data

**Phase 3 (Auto-Populate):**
- Generate session file from detected issue
- Map issue fields to session structure

**Phase 4 (Jira Integration):**
- Full Jira REST API integration
- imdone CLI integration for enhanced workflow

**Phase 5 (Azure DevOps Integration):**
- Full Azure DevOps API integration
- Work item field mapping

**Phase 6 (Bidirectional Sync):**
- Session updates → issue comments
- Issue changes → session alerts
