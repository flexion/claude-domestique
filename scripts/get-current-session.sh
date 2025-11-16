#!/bin/bash
# Script to get the current session file based on git branch

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
    echo "Error: Not in a git repository or detached HEAD state"
    exit 1
fi

# Sanitize branch name for filename (replace / with -)
BRANCH_FILE=$(echo "$CURRENT_BRANCH" | tr '/' '-')

# Path to branch metadata file
BRANCH_METADATA=".claude/branches/${BRANCH_FILE}"

echo "Current branch: $CURRENT_BRANCH"
echo "Branch file: $BRANCH_METADATA"
echo ""

if [ -f "$BRANCH_METADATA" ]; then
    # Extract session file from metadata
    SESSION=$(grep "^session:" "$BRANCH_METADATA" | cut -d' ' -f2)
    SESSION_PATH=".claude/sessions/${SESSION}"

    echo "✓ Branch metadata found"
    echo "Session file: $SESSION_PATH"

    if [ -f "$SESSION_PATH" ]; then
        echo "✓ Session file exists"
        echo ""
        echo "Session details:"
        grep "^" "$BRANCH_METADATA" | grep -E "^(type|status|description):"
    else
        echo "✗ Session file not found: $SESSION_PATH"
    fi
else
    echo "✗ No branch metadata found"
    echo ""
    echo "To create branch metadata, run:"
    echo "  echo 'session: <session-file>.md' > $BRANCH_METADATA"
    echo ""

    # Try to guess session based on branch name
    if [[ "$CURRENT_BRANCH" =~ issue/feature-([0-9]+)/.* ]]; then
        ISSUE_NUM="${BASH_REMATCH[1]}"
        echo "Branch appears to be for issue #${ISSUE_NUM}"
        echo "Looking for session files matching: ${ISSUE_NUM}-*.md"
        ls -la .claude/sessions/${ISSUE_NUM}-*.md 2>/dev/null || echo "No matching session found"
    elif [[ "$CURRENT_BRANCH" =~ chore/(.*) ]]; then
        CHORE_NAME="${BASH_REMATCH[1]}"
        echo "Branch appears to be a chore: ${CHORE_NAME}"
        echo "Looking for session file: chore-${CHORE_NAME}.md"
        ls -la ".claude/sessions/chore-${CHORE_NAME}.md" 2>/dev/null || echo "No matching session found"
    fi
fi