# Command: /sync-work-item

## Description
Synchronize session changes with the work item (GitHub issue, Jira ticket, Azure DevOps work item) and check for work-item updates. Enables bidirectional sync to keep session and work item in sync.

## Usage
```
/sync-work-item [--direction <session-to-work-item|work-item-to-session|both>]
```

**Arguments:**
- `--direction` (optional) - Sync direction:
  - `session-to-work-item` - Only push session updates to work item (post comment)
  - `work-item-to-session` - Only check work item for updates (alert in session)
  - `both` - Bidirectional sync (default)

**Default behavior:** Bidirectional sync (both directions)

## Implementation

When the user invokes `/sync-work-item`, follow these steps:

### Step 1: Detect Current Work Item

Use issue-detector logic:
- Get current branch: `git branch --show-current`
- Parse branch name to extract identifier
- Detect platform (GitHub, Jira, Azure DevOps)

If no work item detected:
```
Error: No work item detected from branch.

Current branch: <branch-name>

This command requires a branch with work-item identifier.
```

### Step 2: Load Session File

Get current session:
```bash
./scripts/get-current-session.sh
```

Read session file to extract:
- Latest session log entry
- Key decisions made
- Learnings captured
- Files created
- Current status/progress

### Step 3: Session → Work Item Sync

If `--direction` is `session-to-work-item` or `both`:

**3a. Detect Session Changes**

Check if session file changed since last sync:
- Read `.claude/work-items/<id>/metadata.json` → `last_synced_at`
- Compare with session file's last modified time
- If session unchanged, skip this direction

**3b. Extract Session Updates**

From session file, extract recent changes:
- Latest session log entry (since last sync)
- New key decisions
- New learnings
- New files created
- Status changes

**3c. Format Sync Comment**

Create comment for work item:

**GitHub format:**
```markdown
## Session Update

**Session:** <session-file>
**Branch:** <branch-name>
**Updated:** <timestamp>

### Recent Progress
<latest session log entry>

### Key Decisions
<new decisions since last sync>

### Learnings
<new learnings since last sync>

### Files Created/Modified
<new files since last sync>

---
*Synced from session file by claude-domestique*
```

**Jira format:**
```
Session Update

Session: <session-file>
Branch: <branch-name>
Updated: <timestamp>

h3. Recent Progress
<latest session log entry>

h3. Key Decisions
<new decisions>

h3. Learnings
<new learnings>

h3. Files Created/Modified
<new files>

---
_Synced from session file by claude-domestique_
```

**Azure DevOps format:**
```html
<h2>Session Update</h2>
<p><strong>Session:</strong> <session-file></p>
<p><strong>Branch:</strong> <branch-name></p>
<p><strong>Updated:</strong> <timestamp></p>

<h3>Recent Progress</h3>
<latest session log entry>

<h3>Key Decisions</h3>
<new decisions>

<h3>Learnings</h3>
<new learnings>

<h3>Files Created/Modified</h3>
<new files>

<hr>
<em>Synced from session file by claude-domestique</em>
```

**3d. Post Comment to Work Item**

**GitHub:**
```bash
gh api repos/{owner}/{repo}/issues/{number}/comments \
  -X POST \
  -f body="<formatted comment>"
```

**Jira (REST API):**
```bash
curl -X POST \
  -H "Authorization: Bearer $JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  https://$JIRA_HOST/rest/api/3/issue/$ISSUE_KEY/comment \
  -d '{"body": {"type": "doc", "version": 1, "content": [<ADF content>]}}'
```

**Jira (imdone CLI):**
```bash
imdone push  # Syncs local changes back to Jira
```

**Azure DevOps:**
```bash
az boards work-item update \
  --id $WORK_ITEM_ID \
  --discussion "<formatted comment>"
```

**3e. Update Sync Metadata**

Update `.claude/work-items/<id>/metadata.json`:
```json
{
  "last_synced_at": "<timestamp>",
  "last_sync_direction": "session-to-work-item",
  "last_comment_id": "<comment-id>",
  "session_version": "<git-commit-hash>"
}
```

### Step 4: Work Item → Session Sync

If `--direction` is `work-item-to-session` or `both`:

**4a. Fetch Work Item Updates**

Re-fetch work item from API:
- GitHub: `gh api repos/{owner}/{repo}/issues/{number}`
- Jira: Jira REST API or `imdone pull`
- Azure DevOps: `az boards work-item show --id {id}`

**4b. Detect Work Item Changes**

Compare with cached data in `.claude/work-items/<id>/`:
- Has issue status changed? (open → closed, In Progress → Done, etc.)
- Are there new comments? (compare comment count/timestamps)
- Have labels/tags changed?
- Has priority changed?
- Has assignee changed?

**4c. Alert Session File**

If changes detected, add alert to session log:

```markdown
### <timestamp> - Work Item Updated Externally

**Changes detected in work item:**
- **Status changed**: In Progress → Done
- **New comments**: 2 comments added by <users>
- **Label added**: "needs-review"

**Actions:**
- Review new comments in work item
- Update session status to match
- Consider closing this session if work complete

**Work Item:** <url>

Run `/fetch-issue` to refresh local copy.
```

**4d. Update Local Cache**

Update `.claude/work-items/<id>/` with latest data:
- Refresh `issue.md` with new content
- Append new comments to `comments.md`
- Update `metadata.json` with new status/fields

**4e. Update Sync Metadata**

```json
{
  "last_synced_at": "<timestamp>",
  "last_sync_direction": "work-item-to-session",
  "work_item_version": "<issue-updated-timestamp>"
}
```

### Step 5: Status Synchronization

**5a. Session Complete → Close Work Item**

If session status indicates completion:
- Check session for completion markers:
  - "Session complete" in log
  - All items in Implementation Plan checked
  - Next Steps says "Complete" or "Merge PR"

Prompt user:
```
Session appears complete.

Close work item? (yes/no)
> yes

Closing work item...
```

**GitHub:**
```bash
gh api repos/{owner}/{repo}/issues/{number} \
  -X PATCH \
  -f state=closed
```

**Jira:**
```bash
# Transition to Done/Closed state
curl -X POST \
  -H "Authorization: Bearer $JIRA_API_TOKEN" \
  https://$JIRA_HOST/rest/api/3/issue/$ISSUE_KEY/transitions \
  -d '{"transition": {"id": "31"}}'  # ID for "Done" transition
```

**Azure DevOps:**
```bash
az boards work-item update \
  --id $WORK_ITEM_ID \
  --state "Closed"
```

**5b. Work Item Closed → Mark Session Complete**

If work item status is closed/done:
- Alert in session (already done in Step 4c)
- Optionally update session status in branch metadata

### Step 6: Conflict Detection

If both session and work item changed since last sync:

**Detect conflicts:**
- Session updated: new log entries
- Work item updated: status changed or new comments

**Alert user:**
```
⚠️  Sync Conflict Detected

Both session and work item have been updated since last sync.

Session changes:
- New log entry: "Completed Phase 4"
- New decision: "Use REST API for Jira"

Work item changes:
- Status changed: In Progress → Review
- New comment by @user: "Please add tests"

Recommended action:
1. Review work-item updates: <url>
2. Resolve conflicts manually
3. Run /sync-work-item again

Conflict resolution:
- Last Write Wins: Continue with sync (may overwrite changes)
- Manual Resolution: Update session with work-item changes, then sync
```

### Step 7: Report Results

Display sync summary:

**Bidirectional sync (both directions):**
```
✓ Work item synchronized

Platform: GitHub
Issue: #29
Direction: Bidirectional

Session → Work Item:
✓ Posted session update comment
  - Latest progress: "Phase 4 complete"
  - Key decisions: 2 new decisions
  - Learnings: 1 new learning
  - Files created: 3 files
✓ Comment posted: https://github.com/.../issues/29#issuecomment-123

Work Item → Session:
✓ Checked for updates
✓ No changes detected
✓ Local cache up to date

Last synced: 2024-11-16 14:30:00
Next sync: Run /sync-work-item or commit session file
```

**Session → Work Item only:**
```
✓ Session updates synced to work item

Platform: Jira
Issue: PROJ-123
Direction: Session → Work Item

Posted session update:
✓ Latest progress: "Implemented authentication"
✓ Key decisions: 1 new decision
✓ Learnings: 2 new learnings

Comment URL: https://company.atlassian.net/browse/PROJ-123

Last synced: 2024-11-16 14:30:00
```

**Work Item → Session only:**
```
✓ Work item checked for updates

Platform: Azure DevOps
Work Item: #456
Direction: Work Item → Session

Changes detected:
⚠ Status changed: Active → Resolved
⚠ New comment by John Doe: "Looks good, merging"

Session updated:
✓ Alert added to session log
✓ Local cache refreshed
✓ Status change noted

Review work item: https://dev.azure.com/.../workitems/edit/456

Last synced: 2024-11-16 14:30:00
```

## Automatic Sync (Post-Commit Hook Integration)

When session file is committed, automatically sync:

**Post-commit hook (`.claude/hooks/post-session-commit.sh`):**
```bash
#!/bin/bash

# Detect if session file was committed
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

if echo "$CHANGED_FILES" | grep -q ".claude/sessions/"; then
  echo "Session file committed. Syncing with work item..."

  # Run sync (session → work item only)
  /sync-work-item --direction session-to-work-item
fi
```

**Configuration (`.claude/config.json`):**
```json
{
  "workItems": {
    "sync": {
      "enabled": true,
      "autoSyncOnCommit": true,
      "direction": "session-to-work-item",
      "conflictResolution": "alert"
    }
  }
}
```

## Error Handling

### No Work Item Detected
```
Error: No work item detected from branch.

Current branch: main

Cannot sync without work-item identifier.
Create work-item branch: git checkout -b issue/feature-<N>/<desc>
```

### Work Item Not Found
```
Error: Work item not found.

Issue: #999
Platform: GitHub

Work item doesn't exist or is not accessible.
Verify issue number and API access.
```

### API Authentication Failed
```
Error: API authentication failed.

Platform: Jira
Error: 401 Unauthorized

Configure authentication:
- Jira: Set JIRA_API_TOKEN environment variable
- GitHub: Run gh auth login
- Azure DevOps: Run az login
```

### Sync Conflict
```
⚠️  Sync Conflict Detected

Both session and work item updated since last sync.

Resolution options:
1. Review changes and resolve manually
2. Continue sync (last write wins)
3. Skip sync for now

Choose option (1/2/3):
```

### Post Comment Failed
```
Error: Failed to post comment to work item.

Issue: #29
Platform: GitHub
Error: 403 Forbidden

Possible causes:
- Insufficient permissions (need write access)
- Rate limit exceeded
- Issue is locked

Session updates not synced to work item.
```

## Examples

### Example 1: Bidirectional Sync (Default)

**Input:**
```
/sync-work-item
```

**Output:**
```
Detecting work item from branch...
✓ Detected: GitHub issue #29

Loading session file...
✓ Session: 29-work-item-automation.md

Syncing session → work item...
✓ Extracted session updates
✓ Formatted comment (234 chars)
✓ Posted comment: https://github.com/flexion/claude-domestique/issues/29#issuecomment-456

Syncing work item → session...
✓ Fetched latest work item data
✓ No changes detected
✓ Local cache up to date

✓ Work item synchronized (bidirectional)

Last synced: 2024-11-16 14:30:00
```

### Example 2: Session → Work Item Only

**Input:**
```
/sync-work-item --direction session-to-work-item
```

**Output:**
```
Detecting work item...
✓ Jira issue PROJ-123

Syncing session → work item...
✓ Session updates extracted
✓ Posted comment to Jira

Comment:
---
Session Update

Recent Progress:
- Implemented user authentication
- Added JWT token validation
- Created login endpoint

Key Decisions:
- Decision 1: Use bcrypt for password hashing
- Decision 2: JWT tokens expire after 24 hours

---

✓ Comment posted to PROJ-123

Last synced: 2024-11-16 14:30:00
```

### Example 3: Work Item → Session Only

**Input:**
```
/sync-work-item --direction work-item-to-session
```

**Output:**
```
Detecting work item...
✓ Azure DevOps work item #456

Checking for work-item updates...
✓ Fetched latest work item

Changes detected:
⚠ Status changed: Active → Resolved
⚠ Comment by John Doe: "Code review complete, looks good!"

Updating session...
✓ Added alert to session log
✓ Refreshed local cache

Session alert added:
---
Work Item Updated Externally

Status changed: Active → Resolved
New comment by John Doe

Review work item for details.
---

✓ Session updated with work-item changes

Last synced: 2024-11-16 14:30:00
```

### Example 4: Conflict Detection

**Input:**
```
/sync-work-item
```

**Output:**
```
Detecting work item...
✓ GitHub issue #29

Checking for changes...
⚠️  Sync Conflict Detected

Session changes:
- New log entry: "Phase 4 complete - Jira integration"
- New decision: "Use REST API as primary method"

Work item changes:
- Label added: "needs-documentation"
- Comment by @user: "Please add API docs"

Conflict resolution options:
1. Review and resolve manually
2. Continue sync (post session update, alert about work-item changes)
3. Skip sync

Choose option: 2

Continuing with sync...
✓ Posted session update to work item
✓ Added work-item change alert to session

✓ Sync complete with conflicts noted

Review both session and work item to resolve conflicts.
```

### Example 5: Auto-Sync on Commit

**Scenario:** User commits session file

**Git commit:**
```bash
git commit -m "#29 - complete Phase 4"
```

**Post-commit hook output:**
```
Session file committed. Syncing with work item...

Detecting work item...
✓ GitHub issue #29

Syncing session → work item...
✓ Posted session update
✓ Comment: https://github.com/.../issues/29#issuecomment-789

✓ Auto-sync complete
```

## Notes

- **Automatic sync on commit**: Configured via `.claude/config.json`
- **Conflict resolution**: Alerts user, doesn't force overwrites
- **Platform-agnostic**: Works with GitHub, Jira (REST + imdone), Azure DevOps
- **Selective sync**: Can sync one direction only
- **Status synchronization**: Can close work items when session complete
- **Safe defaults**: Always alerts on conflicts, requires user confirmation for destructive actions
- **Metadata tracking**: Stores sync state in `.claude/work-items/<id>/metadata.json`

## Integration

**Works with:**
- Issue detection skill (detects work item)
- `/fetch-issue` command (refreshes local cache)
- Session files (extracts updates)
- Git hooks (auto-sync on commit)
- All three platforms (GitHub, Jira, Azure DevOps)

**Benefits:**
- **Automatic updates**: Work items stay in sync with development progress
- **Transparent communication**: Team sees progress without manual updates
- **Status tracking**: Work items reflect actual state
- **Conflict detection**: Prevents lost updates
- **Flexible**: Manual or automatic sync, configurable direction
