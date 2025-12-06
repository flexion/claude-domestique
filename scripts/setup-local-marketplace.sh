#!/usr/bin/env bash
#
# Setup Local Marketplace for claude-domestique Plugin
#
# This script prepares the plugin for local development by:
# 1. Creating/updating .claude-plugin/marketplace.json
# 2. Syncing version from plugin.json
# 3. Providing instructions to add the marketplace in Claude Code
#
# Usage:
#   ./scripts/setup-local-marketplace.sh
#
# After running, add the marketplace in Claude Code:
#   /plugin → Add Marketplace → enter the plugin directory path
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
MARKETPLACE_NAME="local-dev"
MARKETPLACE_FILE="$PLUGIN_DIR/.claude-plugin/marketplace.json"

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

# Extract version from plugin.json
PLUGIN_VERSION=$(grep '"version"' "$PLUGIN_DIR/.claude-plugin/plugin.json" | sed 's/.*"version": *"\([^"]*\)".*/\1/')

echo -e "${GREEN}✓ Plugin structure valid${NC}"
echo -e "  Plugin directory: $PLUGIN_DIR"
echo -e "  Version: $PLUGIN_VERSION"
echo

# Step 2: Create/update marketplace.json
echo -e "${YELLOW}2. Creating marketplace manifest...${NC}"

# marketplace.json must be in .claude-plugin/ directory
# owner must be an object with name and email
cat > "$MARKETPLACE_FILE" <<EOF
{
  "name": "$MARKETPLACE_NAME",
  "owner": {
    "name": "Local Development",
    "email": "dev@localhost"
  },
  "plugins": [
    {
      "name": "$PLUGIN_NAME",
      "source": "./",
      "version": "$PLUGIN_VERSION"
    }
  ]
}
EOF

echo -e "${GREEN}✓ Created marketplace manifest${NC}"
echo -e "  Location: $MARKETPLACE_FILE"
echo -e "  Version: $PLUGIN_VERSION"
echo

# Step 3: Clean up old configurations (if exists)
echo -e "${YELLOW}3. Cleaning up old configurations...${NC}"

CLEANUP_DONE=false

# Clean up old ~/.claude/marketplaces/local directory
OLD_MARKETPLACE="$HOME/.claude/marketplaces/local"
if [ -d "$OLD_MARKETPLACE" ]; then
    echo -e "${YELLOW}  Found old marketplace at: $OLD_MARKETPLACE${NC}"
    read -p "  Remove old marketplace structure? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$OLD_MARKETPLACE"
        echo -e "${GREEN}✓ Removed old marketplace structure${NC}"
        CLEANUP_DONE=true

        # Remove parent if empty
        if [ -d "$HOME/.claude/marketplaces" ] && [ -z "$(ls -A "$HOME/.claude/marketplaces")" ]; then
            rmdir "$HOME/.claude/marketplaces"
            echo -e "${GREEN}✓ Removed empty marketplaces directory${NC}"
        fi
    else
        echo -e "${YELLOW}  Skipped cleanup${NC}"
    fi
fi

# Clean up old marketplace.json at repo root (wrong location)
OLD_MARKETPLACE_JSON="$PLUGIN_DIR/marketplace.json"
if [ -f "$OLD_MARKETPLACE_JSON" ]; then
    echo -e "${YELLOW}  Found old marketplace.json at repo root${NC}"
    read -p "  Remove old marketplace.json? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$OLD_MARKETPLACE_JSON"
        echo -e "${GREEN}✓ Removed old marketplace.json${NC}"
        CLEANUP_DONE=true
    else
        echo -e "${YELLOW}  Skipped cleanup${NC}"
    fi
fi

# Clean up extraKnownMarketplaces from settings.json if it references local-dev
SETTINGS_FILE="$HOME/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ] && command -v jq &> /dev/null; then
    if jq -e ".extraKnownMarketplaces.\"$MARKETPLACE_NAME\"" "$SETTINGS_FILE" > /dev/null 2>&1; then
        echo -e "${YELLOW}  Found extraKnownMarketplaces in settings.json${NC}"
        read -p "  Remove extraKnownMarketplaces entry? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            jq "del(.extraKnownMarketplaces.\"$MARKETPLACE_NAME\")" "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
            # Remove extraKnownMarketplaces entirely if empty
            if jq -e '.extraKnownMarketplaces | length == 0' "$SETTINGS_FILE.tmp" > /dev/null 2>&1; then
                jq 'del(.extraKnownMarketplaces)' "$SETTINGS_FILE.tmp" > "$SETTINGS_FILE"
                rm -f "$SETTINGS_FILE.tmp"
            else
                mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
            fi
            echo -e "${GREEN}✓ Removed extraKnownMarketplaces entry${NC}"
            CLEANUP_DONE=true
        else
            echo -e "${YELLOW}  Skipped cleanup${NC}"
        fi
    fi
fi

# Clean up old settings.local.json if it only has extraKnownMarketplaces
OLD_SETTINGS="$HOME/.claude/settings.local.json"
if [ -f "$OLD_SETTINGS" ] && command -v jq &> /dev/null; then
    KEY_COUNT=$(jq 'keys | length' "$OLD_SETTINGS")
    if [ "$KEY_COUNT" = "1" ] && jq -e '.extraKnownMarketplaces' "$OLD_SETTINGS" > /dev/null 2>&1; then
        echo -e "${YELLOW}  Found old settings.local.json with only extraKnownMarketplaces${NC}"
        read -p "  Remove old settings.local.json? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f "$OLD_SETTINGS"
            echo -e "${GREEN}✓ Removed old settings.local.json${NC}"
            CLEANUP_DONE=true
        else
            echo -e "${YELLOW}  Skipped cleanup${NC}"
        fi
    fi
fi

if [ "$CLEANUP_DONE" = false ]; then
    echo -e "${GREEN}✓ No old configurations found${NC}"
fi
echo

# Step 4: Display usage instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Local marketplace setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${YELLOW}To install the plugin:${NC}"
echo
echo -e "  ${BLUE}1. In Claude Code, run:${NC}"
echo -e "     /plugin"
echo
echo -e "  ${BLUE}2. Select:${NC}"
echo -e "     Add Marketplace"
echo
echo -e "  ${BLUE}3. Enter the plugin directory path:${NC}"
echo -e "     $PLUGIN_DIR"
echo
echo -e "  ${BLUE}4. Select the plugin and install${NC}"
echo
echo -e "${YELLOW}After making changes to the plugin:${NC}"
echo -e "  /plugin reload $PLUGIN_NAME"
echo
echo -e "${YELLOW}Plugin location:${NC}"
echo -e "  $PLUGIN_DIR"
echo
