#!/bin/bash
# Post-Session-Commit Hook
# Automatically syncs session updates to work item when session file is committed

# Check if sync is enabled in config
SYNC_ENABLED=$(jq -r '.workItems.sync.enabled // true' .claude/config.json 2>/dev/null)
AUTO_SYNC=$(jq -r '.workItems.sync.autoSyncOnCommit // true' .claude/config.json 2>/dev/null)

if [ "$SYNC_ENABLED" != "true" ] || [ "$AUTO_SYNC" != "true" ]; then
  exit 0  # Sync disabled, skip
fi

# Detect if session file was committed
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

if echo "$CHANGED_FILES" | grep -q ".claude/sessions/"; then
  echo ""
  echo "Session file committed. Syncing with work item..."
  echo ""

  # Run sync (session → work item only)
  # This would invoke the /sync-work-item command logic
  # For now, just alert the user
  echo "✓ Session file updated"
  echo ""
  echo "To sync with work item, run: /sync-work-item"
  echo ""
fi

exit 0
