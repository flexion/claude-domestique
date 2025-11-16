#!/bin/bash
# Install git hooks for claude-domestique development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Installing git hooks..."

# Get the git hooks directory
HOOKS_DIR=".git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
    echo -e "${YELLOW}Warning: .git/hooks directory not found${NC}"
    echo "Are you in the repository root?"
    exit 1
fi

# Install pre-commit hook
if [ -f "hooks/pre-commit" ]; then
    cp hooks/pre-commit "$HOOKS_DIR/pre-commit"
    chmod +x "$HOOKS_DIR/pre-commit"
    echo -e "${GREEN}✓ Installed pre-commit hook${NC}"
else
    echo -e "${YELLOW}Warning: hooks/pre-commit not found${NC}"
fi

echo ""
echo -e "${GREEN}Git hooks installed successfully!${NC}"
echo ""
echo "The following hooks are now active:"
echo "  - pre-commit: Runs shellcheck on shell scripts"
echo ""
echo "To bypass hooks (not recommended):"
echo "  git commit --no-verify"
