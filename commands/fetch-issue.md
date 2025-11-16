# Command: /fetch-issue

## Description
Fetch complete work-item details (issue, comments, attachments) from GitHub/Jira/Azure DevOps and store locally. Creates a complete offline copy with all images downloaded, enabling work without API roundtrips.

## Usage
```
/fetch-issue [issue-id]
```

**Arguments:**
- `issue-id` (optional) - Work item identifier (e.g., `29`, `PROJ-123`, `#456`)
  - If omitted, auto-detects from current branch name

## Implementation

When the user invokes `/fetch-issue`, follow these steps:

### Step 1: Detect Work Item

If `issue-id` provided:
- Use provided identifier
- Detect platform from format:
  - `PROJ-123` → Jira
  - `29` or `#29` → GitHub (try first) or Azure DevOps

If no `issue-id` provided:
- Get current branch: `git branch --show-current`
- Parse branch name for identifier:
  - `issue/feature-29/desc` → `29`
  - `feature/PROJ-123/desc` → `PROJ-123`
  - `feature/456/desc` → `456`
- If no identifier found, error: "No work item detected from branch"

### Step 2: Detect Platform

Based on identifier format:
- **Jira**: `[A-Z]+-\d+` (e.g., PROJ-123) - definite
- **GitHub**: Numeric, try GitHub API first
- **Azure DevOps**: If GitHub fails, try Azure DevOps API

### Step 3: Fetch Complete Work Item (GitHub)

For GitHub issues:

**3a. Detect Repository:**
```bash
git remote get-url origin | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git/\1/'
```
Example: `flexion/claude-domestique`

**3b. Fetch Issue:**
```bash
gh api repos/{owner}/{repo}/issues/{number} > metadata.json
```

Extract from response:
- `number` - Issue number
- `title` - Issue title
- `body` - Issue description (markdown)
- `state` - Issue state (open/closed)
- `labels` - Array of labels
- `milestone` - Milestone object
- `assignee` - Assignee object
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `html_url` - Issue URL

**3c. Fetch All Comments:**
```bash
gh api repos/{owner}/{repo}/issues/{number}/comments --paginate
```

Store all comments with:
- `user.login` - Comment author
- `created_at` - Comment timestamp
- `body` - Comment text (markdown)

### Step 4: Extract and Download Images

**4a. Extract Image URLs:**

Parse markdown (issue body + all comments) for image references:
- Markdown images: `![alt](url)`
- HTML images: `<img src="url">`
- GitHub-specific: `https://user-images.githubusercontent.com/...`
- Attachments: `https://github.com/.../files/...`

**4b. Create Attachments Directory:**
```bash
mkdir -p .claude/work-items/{issue-id}/attachments
```

**4c. Download Each Image:**
```bash
curl -L -o .claude/work-items/{issue-id}/attachments/{filename} {image-url}
```

Filename strategy:
- Preserve original filename if available
- For GitHub user-images: Use hash from URL
- Number duplicates: `image-1.png`, `image-2.png`

**4d. Track URL Mapping:**

Create mapping of original URL → local path:
```json
{
  "https://user-images.githubusercontent.com/.../image.png": "attachments/image.png"
}
```

### Step 5: Rewrite Markdown URLs

Replace all image URLs in markdown with local paths:

**Before:**
```markdown
![Screenshot](https://user-images.githubusercontent.com/123/image.png)
```

**After:**
```markdown
![Screenshot](attachments/image.png)
```

Apply to:
- Issue body markdown
- All comment markdown

### Step 6: Create Local Storage Structure

**6a. Create Directory:**
```bash
mkdir -p .claude/work-items/{issue-id}
```

**6b. Write issue.md:**
```markdown
# {issue-title}

**Issue:** #{number}
**State:** {state}
**Created:** {created_at}
**Updated:** {updated_at}
**URL:** {html_url}
**Labels:** {labels}
**Milestone:** {milestone}
**Assignee:** {assignee}

---

{body with local image refs}
```

**6c. Write comments.md:**
```markdown
# Comments on Issue #{number}

## Comment by {user} on {created_at}

{comment body with local image refs}

---

## Comment by {user} on {created_at}

{comment body with local image refs}

---
```

**6d. Write metadata.json:**

Store complete raw API response:
```json
{
  "issue": { /* full issue response */ },
  "comments": [ /* all comments */ ],
  "fetched_at": "2024-11-16T10:00:00Z",
  "platform": "github",
  "repository": "flexion/claude-domestique",
  "image_mapping": {
    "original_url": "local_path"
  }
}
```

**6e. Store attachments/ directory:**

All downloaded images/files in `attachments/` subdirectory.

### Step 7: Report Success

Display summary:
```
✓ Work item fetched successfully

Platform: GitHub
Issue: #29
Title: Phase 3C - Work-Item Automation
State: open
Repository: flexion/claude-domestique

Fetched:
✓ Issue body (1,234 chars)
✓ Comments (5 comments)
✓ Images (3 downloaded)
✓ Attachments (2 files)

Stored locally:
.claude/work-items/29/
  ├── issue.md (issue body with local image refs)
  ├── comments.md (5 comments chronologically)
  ├── attachments/ (5 files)
  │   ├── screenshot-1.png
  │   ├── screenshot-2.png
  │   ├── diagram.svg
  │   ├── attachment-1.pdf
  │   └── attachment-2.zip
  └── metadata.json (raw API response)

All images rewritten to local paths.
Work item available offline.
```

### Step 8: Future Platforms (Jira, Azure DevOps)

For Jira:
- If `.imdone/config.yml` exists: Use `imdone pull {issue-key}`
- Otherwise: Fetch via Jira REST API v3
- Download attachments from Jira
- Convert to same local structure

For Azure DevOps:
- Use `az boards work-item show --id {id}`
- Fetch work item details
- Download attachments
- Convert to same local structure

## Error Handling

### No Work Item Detected
```
Error: No work item detected.

Current branch: main

No work item identifier found in branch name.
Use: /fetch-issue <issue-id>

Examples:
  /fetch-issue 29           (GitHub issue #29)
  /fetch-issue PROJ-123     (Jira ticket PROJ-123)
  /fetch-issue 456          (Azure DevOps work item #456)
```

### Issue Not Found (GitHub)
```
Error: Issue not found.

Platform: GitHub
Repository: flexion/claude-domestique
Issue: #999

API Response: 404 Not Found

Possible causes:
- Issue doesn't exist
- Repository incorrect
- Access denied (private repo)

Verify: https://github.com/flexion/claude-domestique/issues/999
```

### Authentication Required
```
Error: GitHub API authentication required.

Authentication status:
✗ Not authenticated

To authenticate:
  gh auth login

Then retry: /fetch-issue
```

### Download Failed
```
Warning: Some images failed to download.

Issue: #29
Successfully downloaded: 3/5 images

Failed downloads:
✗ https://example.com/missing.png (404 Not Found)
✗ https://example.com/forbidden.png (403 Forbidden)

Work item saved with partial images.
URLs preserved for failed downloads.
```

### Rate Limit Exceeded
```
Error: GitHub API rate limit exceeded.

Rate limit status:
- Limit: 5000 requests/hour
- Remaining: 0
- Reset: 2024-11-16 15:30:00

Wait until rate limit resets, then retry.

Alternatively, use authenticated requests (higher limit):
  gh auth login
```

### Storage Error
```
Error: Failed to create local storage.

Directory: .claude/work-items/29/
Error: Permission denied

Check directory permissions:
  ls -la .claude/
  chmod -R u+w .claude/
```

## Examples

### Example 1: Fetch from Current Branch

**Branch:** `issue/feature-29/work-item-automation`

**Input:**
```
/fetch-issue
```

**Output:**
```
Detecting work item from branch...
✓ Detected: GitHub issue #29

Fetching from GitHub...
✓ Repository: flexion/claude-domestique
✓ Issue: Phase 3C - Work-Item Automation
✓ State: open

Fetching comments...
✓ 0 comments

Extracting images...
✓ Found 0 images

Storing locally...
✓ Created: .claude/work-items/29/issue.md
✓ Created: .claude/work-items/29/comments.md
✓ Created: .claude/work-items/29/metadata.json

Work item #29 fetched successfully.
Available offline at: .claude/work-items/29/
```

### Example 2: Fetch Explicit Issue with Images

**Input:**
```
/fetch-issue 123
```

**Output:**
```
Fetching GitHub issue #123...
✓ Repository: flexion/claude-domestique
✓ Issue: Add user authentication
✓ State: open

Fetching comments...
✓ 12 comments

Extracting images...
✓ Found 5 images in issue body
✓ Found 3 images in comments
✓ Total: 8 images to download

Downloading images...
✓ screenshot-login.png (124 KB)
✓ diagram-auth-flow.svg (45 KB)
✓ mockup-signup.png (256 KB)
✓ error-example.png (89 KB)
✓ database-schema.png (178 KB)
✓ api-response.png (67 KB)
✓ ui-wireframe.png (234 KB)
✓ test-results.png (156 KB)

Rewriting image URLs to local paths...
✓ Updated 8 image references

Storing locally...
✓ Created: .claude/work-items/123/issue.md
✓ Created: .claude/work-items/123/comments.md
✓ Created: .claude/work-items/123/attachments/ (8 files)
✓ Created: .claude/work-items/123/metadata.json

Work item #123 fetched successfully.
Downloaded 1.1 MB total.
All images accessible offline.
```

### Example 3: Fetch Jira Ticket (imdone available)

**Input:**
```
/fetch-issue PROJ-123
```

**Output:**
```
Detecting platform...
✓ Platform: Jira (project key detected)

Checking for imdone...
✓ Found: .imdone/config.yml
✓ Using imdone CLI for enhanced workflow

Fetching via imdone...
✓ imdone pull PROJ-123

Converting imdone markdown to local storage...
✓ Source: backlog/PROJ-123-implement-auth/issue-PROJ-123.md
✓ Extracted frontmatter metadata
✓ Extracted issue body
✓ Extracted comments from comments-PROJ-123.md

Downloading attachments...
✓ attachment-1.pdf (234 KB)
✓ screenshot.png (156 KB)

Storing locally...
✓ Created: .claude/work-items/PROJ-123/issue.md
✓ Created: .claude/work-items/PROJ-123/comments.md
✓ Created: .claude/work-items/PROJ-123/attachments/ (2 files)
✓ Created: .claude/work-items/PROJ-123/metadata.json

Work item PROJ-123 fetched successfully.
imdone markdown preserved for bidirectional sync.
```

### Example 4: Re-fetch to Update

**Input:**
```
/fetch-issue 29
```

**Scenario:** Work item already exists locally

**Output:**
```
Work item #29 already exists locally.

Local copy:
- Fetched: 2024-11-16 10:00:00
- Age: 2 hours ago

Re-fetch to update? (yes/no)

> yes

Fetching updated work item #29...
✓ Issue updated
✓ New comments: 2
✓ No new images

Updated locally:
✓ .claude/work-items/29/issue.md (updated)
✓ .claude/work-items/29/comments.md (2 new comments)
✓ .claude/work-items/29/metadata.json (updated)

Work item #29 refreshed.
Local copy is now current.
```

## Notes

- **Offline work**: After fetching, work item is fully accessible without API calls
- **Multimodal**: Claude can read downloaded images directly
- **Gitignored**: `.claude/work-items/` is excluded from version control
- **Re-fetchable**: Can re-run command to refresh/update local copy
- **Platform agnostic**: Same local structure for GitHub, Jira, Azure DevOps
- **Idempotent**: Safe to run multiple times (updates existing copy)
- **Rate limits**: Single fetch per work item, no ongoing API usage
- **Image formats**: Supports PNG, JPG, GIF, SVG, PDF, and other common formats
- **Large files**: Progress indicator for downloads >1MB
- **Parallel downloads**: Images downloaded concurrently for performance

## Integration

**Works with:**
- Issue detection skill (auto-detects from branch)
- Session auto-population (Phase 3)
- Work-item automation workflow
- GitHub, Jira (via imdone or REST API), Azure DevOps

**Prerequisites:**
- GitHub: `gh` CLI authenticated
- Jira: imdone CLI OR API token configured
- Azure DevOps: `az` CLI authenticated

**Benefits:**
- Complete offline work capability
- Claude can view all images (multimodal)
- No rate limit concerns after initial fetch
- Fast access to all work-item data
- Version-controlled workflow (gitignored cache)
