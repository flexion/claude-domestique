#!/usr/bin/env bash
#
# Setup Local Marketplace for claude-domestique Plugin
#
# This script:
# 1. Creates the local marketplace directory structure
# 2. Symlinks the plugin to make it available locally
# 3. Allows testing plugin changes without publishing
#
# Usage:
#   ./scripts/setup-local-marketplace.sh
#
# After running:
#   /plugin install claude-domestique@local
#   /plugin reload claude-domestique  (after making changes)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Plugin directory (absolute path to this repo)
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_NAME="claude-domestique"

# Local marketplace directory
MARKETPLACE_DIR="$HOME/.claude/marketplaces/local"
PLUGIN_LINK="$MARKETPLACE_DIR/$PLUGIN_NAME"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Setting up local marketplace for $PLUGIN_NAME${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Step 1: Verify plugin structure
echo -e "${YELLOW}1. Verifying plugin structure...${NC}"

if [ ! -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ]; then
    echo -e "${RED}✗ Error: Plugin manifest not found${NC}"
    echo -e "${RED}  Expected: $PLUGIN_DIR/.claude-plugin/plugin.json${NC}"
    exit 1
fi

if [ ! -d "$PLUGIN_DIR/commands" ]; then
    echo -e "${RED}✗ Error: Commands directory not found${NC}"
    echo -e "${RED}  Expected: $PLUGIN_DIR/commands/${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Plugin structure valid${NC}"
echo -e "  Plugin directory: $PLUGIN_DIR"
echo

# Step 2: Create marketplace directory
echo -e "${YELLOW}2. Creating local marketplace directory...${NC}"

if [ -d "$MARKETPLACE_DIR" ]; then
    echo -e "${GREEN}✓ Marketplace directory exists${NC}"
else
    mkdir -p "$MARKETPLACE_DIR"
    echo -e "${GREEN}✓ Created marketplace directory${NC}"
fi

echo -e "  Marketplace: $MARKETPLACE_DIR"
echo

# Step 3: Create or update symlink
echo -e "${YELLOW}3. Creating plugin symlink...${NC}"

if [ -L "$PLUGIN_LINK" ]; then
    # Symlink exists - check if it points to the right place
    CURRENT_TARGET=$(readlink "$PLUGIN_LINK")
    if [ "$CURRENT_TARGET" = "$PLUGIN_DIR" ]; then
        echo -e "${GREEN}✓ Symlink already points to correct location${NC}"
    else
        echo -e "${YELLOW}⚠ Symlink exists but points to: $CURRENT_TARGET${NC}"
        echo -e "${YELLOW}  Updating to: $PLUGIN_DIR${NC}"
        rm "$PLUGIN_LINK"
        ln -s "$PLUGIN_DIR" "$PLUGIN_LINK"
        echo -e "${GREEN}✓ Symlink updated${NC}"
    fi
elif [ -e "$PLUGIN_LINK" ]; then
    echo -e "${RED}✗ Error: $PLUGIN_LINK exists but is not a symlink${NC}"
    echo -e "${RED}  Please remove it manually and run this script again${NC}"
    exit 1
else
    ln -s "$PLUGIN_DIR" "$PLUGIN_LINK"
    echo -e "${GREEN}✓ Symlink created${NC}"
fi

echo -e "  Link: $PLUGIN_LINK → $PLUGIN_DIR"
echo

# Step 4: Verify symlink and extract version
echo -e "${YELLOW}4. Verifying installation...${NC}"

if [ -L "$PLUGIN_LINK" ] && [ -d "$PLUGIN_LINK" ]; then
    echo -e "${GREEN}✓ Symlink is valid${NC}"
else
    echo -e "${RED}✗ Error: Symlink verification failed${NC}"
    exit 1
fi

if [ -f "$PLUGIN_LINK/.claude-plugin/plugin.json" ]; then
    PLUGIN_VERSION=$(grep '"version"' "$PLUGIN_LINK/.claude-plugin/plugin.json" | sed 's/.*"version": "\(.*\)".*/\1/')
    echo -e "${GREEN}✓ Plugin manifest accessible${NC}"
    echo -e "  Version: $PLUGIN_VERSION"
else
    echo -e "${RED}✗ Error: Plugin manifest not accessible through symlink${NC}"
    exit 1
fi

echo

# Step 5: Create/update marketplace.json with current version
echo -e "${YELLOW}5. Updating marketplace metadata...${NC}"

MARKETPLACE_MANIFEST="$MARKETPLACE_DIR/.claude-plugin/marketplace.json"
MARKETPLACE_MANIFEST_DIR="$MARKETPLACE_DIR/.claude-plugin"

# Create .claude-plugin directory if it doesn't exist
if [ ! -d "$MARKETPLACE_MANIFEST_DIR" ]; then
    mkdir -p "$MARKETPLACE_MANIFEST_DIR"
    echo -e "${GREEN}✓ Created marketplace manifest directory${NC}"
fi

# Create/update marketplace.json with current version
cat > "$MARKETPLACE_MANIFEST" <<EOF
{
  "plugins": [
    {
      "name": "$PLUGIN_NAME",
      "version": "$PLUGIN_VERSION",
      "source": "local",
      "path": "$PLUGIN_NAME"
    }
  ]
}
EOF

echo -e "${GREEN}✓ Updated marketplace.json${NC}"
echo -e "  Version: $PLUGIN_VERSION"
echo -e "  Location: $MARKETPLACE_MANIFEST"
echo

# Step 6: Display usage instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Local marketplace setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo
echo -e "  ${BLUE}1. Install plugin in a test project:${NC}"
echo -e "     cd /path/to/test/project"
echo -e "     /plugin install $PLUGIN_NAME@local"
echo
echo -e "  ${BLUE}2. After making changes to the plugin:${NC}"
echo -e "     /plugin reload $PLUGIN_NAME"
echo
echo -e "  ${BLUE}3. Or reinstall if needed:${NC}"
echo -e "     /plugin uninstall $PLUGIN_NAME"
echo -e "     /plugin install $PLUGIN_NAME@local"
echo
echo -e "  ${BLUE}4. Test plugin commands:${NC}"
echo -e "     /$PLUGIN_NAME:next"
echo -e "     /$PLUGIN_NAME:create-session"
echo -e "     /$PLUGIN_NAME:check"
echo
echo -e "${YELLOW}Development workflow:${NC}"
echo -e "  1. Edit files in: $PLUGIN_DIR"
echo -e "  2. Reload plugin: /plugin reload $PLUGIN_NAME"
echo -e "  3. Test changes in your project"
echo -e "  4. Repeat"
echo
echo -e "${YELLOW}Marketplace structure:${NC}"
echo -e "  ~/.claude/marketplaces/local/"
echo -e "  └── $PLUGIN_NAME → $PLUGIN_DIR"
echo
