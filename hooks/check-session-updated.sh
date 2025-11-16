#!/bin/bash
# Pre-commit hook: Enforce session file updates
#
# This hook ensures that session files are updated before commits,
# preventing context drift by maintaining up-to-date session documentation.
#
# Used by pre-commit framework: https://pre-commit.com/
#
# Usage: Runs automatically via pre-commit framework
# Override: git commit --no-verify

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo -e "${RED}ERROR: Could not determine current branch${NC}"
  exit 1
fi

# Sanitize branch name (/ → -)
SANITIZED_BRANCH=$(echo "$CURRENT_BRANCH" | tr '/' '-')

# Get branch metadata file
BRANCH_METADATA_FILE=".claude/branches/$SANITIZED_BRANCH"

if [ ! -f "$BRANCH_METADATA_FILE" ]; then
  # No branch metadata - skip session check (e.g., main branch, hotfix branches)
  exit 0
fi

# Extract session file from metadata
SESSION_FILE=$(grep '^session:' "$BRANCH_METADATA_FILE" | awk '{print $2}')

if [ -z "$SESSION_FILE" ]; then
  echo -e "${RED}ERROR: No session file found in branch metadata${NC}"
  echo "Metadata file: $BRANCH_METADATA_FILE"
  exit 1
fi

SESSION_PATH=".claude/sessions/$SESSION_FILE"

if [ ! -f "$SESSION_PATH" ]; then
  echo -e "${RED}ERROR: Session file not found${NC}"
  echo "Expected: $SESSION_PATH"
  echo ""
  echo "The branch metadata references a session file that doesn't exist."
  echo "Create the session file or update the branch metadata."
  exit 1
fi

# Check if session file is in staged changes
if git diff --cached --name-only | grep -q "^$SESSION_PATH$"; then
  echo -e "${GREEN}✓ Session file updated: $SESSION_FILE${NC}"
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  COMMIT BLOCKED: Session file not updated${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Branch: $CURRENT_BRANCH"
  echo "Session: $SESSION_FILE"
  echo ""
  echo -e "${YELLOW}Required action:${NC}"
  echo "  Update session file before committing:"
  echo "  1. Document what you've completed"
  echo "  2. Add key decisions made"
  echo "  3. Capture learnings"
  echo "  4. Update next steps"
  echo ""
  echo "  Then stage the session file:"
  echo "    git add $SESSION_PATH"
  echo ""
  echo -e "${YELLOW}Emergency override (use sparingly):${NC}"
  echo "    git commit --no-verify"
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
