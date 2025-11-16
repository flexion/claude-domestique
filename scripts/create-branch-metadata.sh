#!/bin/bash
# Script to create branch metadata file for Claude session tracking

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
    echo -e "${RED}Error: Not in a git repository or detached HEAD state${NC}"
    exit 1
fi

# Sanitize branch name for filename (replace / with -)
BRANCH_FILE=$(echo "$CURRENT_BRANCH" | tr '/' '-')

# Path to branch metadata file
BRANCH_METADATA=".claude/branches/${BRANCH_FILE}"

echo -e "${GREEN}Creating branch metadata for: ${CURRENT_BRANCH}${NC}"
echo ""

# Check if metadata already exists
if [ -f "$BRANCH_METADATA" ]; then
    echo -e "${YELLOW}Warning: Branch metadata already exists at $BRANCH_METADATA${NC}"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Determine type and details based on branch name
if [[ "$CURRENT_BRANCH" =~ issue/feature-([0-9]+)/(.*) ]]; then
    ISSUE_NUM="${BASH_REMATCH[1]}"
    DESCRIPTION="${BASH_REMATCH[2]}"
    TYPE="issue"
    SESSION_FILE="${ISSUE_NUM}-${DESCRIPTION}.md"

    echo "Detected issue branch:"
    echo "  Issue #: ${ISSUE_NUM}"
    echo "  Description: ${DESCRIPTION}"

elif [[ "$CURRENT_BRANCH" =~ chore/(.*) ]]; then
    CHORE_NAME="${BASH_REMATCH[1]}"
    TYPE="chore"
    SESSION_FILE="chore-${CHORE_NAME}.md"
    DESCRIPTION="${CHORE_NAME//-/ }"  # Replace hyphens with spaces

    echo "Detected chore branch:"
    echo "  Name: ${CHORE_NAME}"

else
    echo -e "${YELLOW}Non-standard branch name. Please provide details:${NC}"
    read -p "Type (issue/chore/feature): " TYPE
    read -p "Description: " DESCRIPTION
    read -p "Session file name (e.g., my-session.md): " SESSION_FILE
fi

# Get or confirm session file
echo ""
read -p "Session file [${SESSION_FILE}]: " INPUT_SESSION
if [ -n "$INPUT_SESSION" ]; then
    SESSION_FILE="$INPUT_SESSION"
fi

# Get status
echo ""
echo "Status options: planning, in-progress, testing, pr-created, completed"
read -p "Current status [in-progress]: " STATUS
if [ -z "$STATUS" ]; then
    STATUS="in-progress"
fi

# Get parent branch
read -p "Parent branch [main]: " PARENT
if [ -z "$PARENT" ]; then
    PARENT="main"
fi

# Create the metadata file
cat > "$BRANCH_METADATA" << EOF
# Branch Metadata
branch: $CURRENT_BRANCH
session: $SESSION_FILE
type: $TYPE
status: $STATUS
created: $(date +%Y-%m-%d)
last-updated: $(date +%Y-%m-%d)
description: $DESCRIPTION
parent: $PARENT
EOF

# Add issue number if it's an issue branch
if [ "$TYPE" = "issue" ] && [ -n "$ISSUE_NUM" ]; then
    echo "issue: $ISSUE_NUM" >> "$BRANCH_METADATA"
fi

# Add current work section
cat >> "$BRANCH_METADATA" << EOF

## Current Work
TODO: Describe current work here

## Next Steps
TODO: List next steps
EOF

echo ""
echo -e "${GREEN}✓ Branch metadata created at: $BRANCH_METADATA${NC}"

# Create session file if it doesn't exist
SESSION_PATH=".claude/sessions/${SESSION_FILE}"
if [ ! -f "$SESSION_PATH" ]; then
    echo ""
    read -p "Session file doesn't exist. Create it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$TYPE" = "issue" ]; then
            cat > "$SESSION_PATH" << EOF
# Session: Issue #${ISSUE_NUM} - ${DESCRIPTION}

## Issue Details
- **Issue Number**: #${ISSUE_NUM}
- **Branch**: $CURRENT_BRANCH
- **Created**: $(date +%Y-%m-%d)
- **Status**: $STATUS

## Objective
TODO: Describe the objective

## Implementation Plan
TODO: List implementation steps

## Session Log

### $(date +%Y-%m-%d) - Session Started
- Created branch metadata
- Started work on issue #${ISSUE_NUM}
EOF
        else
            cat > "$SESSION_PATH" << EOF
# Chore: ${DESCRIPTION}

## Chore Details
- **Type**: Chore (No GitHub Issue)
- **Branch**: $CURRENT_BRANCH
- **Created**: $(date +%Y-%m-%d)
- **Status**: $STATUS

## Objective
TODO: Describe the objective

## Implementation Plan
TODO: List implementation steps

## Session Log

### $(date +%Y-%m-%d) - Session Started
- Created branch metadata
- Started work on ${DESCRIPTION}
EOF
        fi
        echo -e "${GREEN}✓ Session file created at: $SESSION_PATH${NC}"
    fi
fi

echo ""
echo "To check the current session, run:"
echo "  .claude/tools/get-current-session.sh"