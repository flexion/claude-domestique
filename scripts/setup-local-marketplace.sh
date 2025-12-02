#!/usr/bin/env bash
#
# Setup Local Marketplace for claude-domestique Plugin
#
# This script registers the plugin directory as a local marketplace
# in Claude Code's settings, enabling local development and testing.
#
# Usage:
#   ./scripts/setup-local-marketplace.sh
#
# After running:
#   /plugin install claude-domestique@local-dev
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
MARKETPLACE_NAME="local-dev"

# Claude settings location
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"

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

if [ ! -f "$PLUGIN_DIR/marketplace.json" ]; then
    echo -e "${RED}✗ Error: Marketplace manifest not found${NC}"
    echo -e "${RED}  Expected: $PLUGIN_DIR/marketplace.json${NC}"
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

# Step 2: Ensure Claude directory exists
echo -e "${YELLOW}2. Checking Claude configuration directory...${NC}"

if [ ! -d "$CLAUDE_DIR" ]; then
    mkdir -p "$CLAUDE_DIR"
    echo -e "${GREEN}✓ Created Claude directory${NC}"
else
    echo -e "${GREEN}✓ Claude directory exists${NC}"
fi

echo -e "  Location: $CLAUDE_DIR"
echo

# Step 3: Update settings.local.json with extraKnownMarketplaces
echo -e "${YELLOW}3. Registering local marketplace in settings...${NC}"

if [ -f "$SETTINGS_FILE" ]; then
    # Check if jq is available for JSON manipulation
    if command -v jq &> /dev/null; then
        # Check if extraKnownMarketplaces exists
        if jq -e '.extraKnownMarketplaces' "$SETTINGS_FILE" > /dev/null 2>&1; then
            # Check if local-dev marketplace already exists
            if jq -e ".extraKnownMarketplaces[] | select(.name == \"$MARKETPLACE_NAME\")" "$SETTINGS_FILE" > /dev/null 2>&1; then
                # Update existing entry
                jq --arg name "$MARKETPLACE_NAME" --arg path "$PLUGIN_DIR" \
                    '(.extraKnownMarketplaces[] | select(.name == $name)) |= {name: $name, source: {type: "directory", path: $path}}' \
                    "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
                echo -e "${GREEN}✓ Updated existing marketplace entry${NC}"
            else
                # Add to existing array
                jq --arg name "$MARKETPLACE_NAME" --arg path "$PLUGIN_DIR" \
                    '.extraKnownMarketplaces += [{name: $name, source: {type: "directory", path: $path}}]' \
                    "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
                echo -e "${GREEN}✓ Added marketplace to existing settings${NC}"
            fi
        else
            # Add extraKnownMarketplaces array
            jq --arg name "$MARKETPLACE_NAME" --arg path "$PLUGIN_DIR" \
                '. + {extraKnownMarketplaces: [{name: $name, source: {type: "directory", path: $path}}]}' \
                "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
            echo -e "${GREEN}✓ Added extraKnownMarketplaces to settings${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ jq not installed - creating new settings file${NC}"
        echo -e "${YELLOW}  (existing settings will be backed up)${NC}"
        cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup"
        cat > "$SETTINGS_FILE" <<EOF
{
  "extraKnownMarketplaces": [
    {
      "name": "$MARKETPLACE_NAME",
      "source": {
        "type": "directory",
        "path": "$PLUGIN_DIR"
      }
    }
  ]
}
EOF
        echo -e "${GREEN}✓ Created new settings file (backup at $SETTINGS_FILE.backup)${NC}"
    fi
else
    # Create new settings file
    cat > "$SETTINGS_FILE" <<EOF
{
  "extraKnownMarketplaces": [
    {
      "name": "$MARKETPLACE_NAME",
      "source": {
        "type": "directory",
        "path": "$PLUGIN_DIR"
      }
    }
  ]
}
EOF
    echo -e "${GREEN}✓ Created settings file${NC}"
fi

echo -e "  Settings: $SETTINGS_FILE"
echo

# Step 4: Sync marketplace.json version with plugin.json
echo -e "${YELLOW}4. Syncing marketplace.json version...${NC}"

if command -v jq &> /dev/null; then
    jq --arg version "$PLUGIN_VERSION" \
        '.plugins[0].version = $version' \
        "$PLUGIN_DIR/marketplace.json" > "$PLUGIN_DIR/marketplace.json.tmp" && \
        mv "$PLUGIN_DIR/marketplace.json.tmp" "$PLUGIN_DIR/marketplace.json"
    echo -e "${GREEN}✓ Updated marketplace.json version to $PLUGIN_VERSION${NC}"
else
    # Fallback to sed
    sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$PLUGIN_VERSION\"/" "$PLUGIN_DIR/marketplace.json"
    rm -f "$PLUGIN_DIR/marketplace.json.bak"
    echo -e "${GREEN}✓ Updated marketplace.json version to $PLUGIN_VERSION${NC}"
fi
echo

# Step 5: Clean up old marketplace structure (if exists)
echo -e "${YELLOW}5. Cleaning up old marketplace structure...${NC}"

OLD_MARKETPLACE="$HOME/.claude/marketplaces/local"
if [ -d "$OLD_MARKETPLACE" ]; then
    echo -e "${YELLOW}  Found old marketplace at: $OLD_MARKETPLACE${NC}"
    read -p "  Remove old marketplace structure? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$OLD_MARKETPLACE"
        echo -e "${GREEN}✓ Removed old marketplace structure${NC}"

        # Remove parent if empty
        if [ -d "$HOME/.claude/marketplaces" ] && [ -z "$(ls -A "$HOME/.claude/marketplaces")" ]; then
            rmdir "$HOME/.claude/marketplaces"
            echo -e "${GREEN}✓ Removed empty marketplaces directory${NC}"
        fi
    else
        echo -e "${YELLOW}  Skipped cleanup${NC}"
    fi
else
    echo -e "${GREEN}✓ No old marketplace structure found${NC}"
fi
echo

# Step 6: Verify configuration
echo -e "${YELLOW}6. Verifying configuration...${NC}"

echo -e "  Checking settings file..."
if [ -f "$SETTINGS_FILE" ]; then
    if command -v jq &> /dev/null; then
        if jq -e ".extraKnownMarketplaces[] | select(.name == \"$MARKETPLACE_NAME\")" "$SETTINGS_FILE" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Marketplace '$MARKETPLACE_NAME' registered${NC}"
        else
            echo -e "${RED}✗ Marketplace not found in settings${NC}"
            exit 1
        fi
    else
        if grep -q "$MARKETPLACE_NAME" "$SETTINGS_FILE"; then
            echo -e "${GREEN}✓ Marketplace '$MARKETPLACE_NAME' appears to be registered${NC}"
        else
            echo -e "${RED}✗ Marketplace not found in settings${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}✗ Settings file not found${NC}"
    exit 1
fi
echo

# Step 7: Display usage instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Local marketplace setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo
echo -e "  ${BLUE}1. Install plugin in a project:${NC}"
echo -e "     cd /path/to/your/project"
echo -e "     /plugin install $PLUGIN_NAME@$MARKETPLACE_NAME"
echo
echo -e "  ${BLUE}2. After making changes to the plugin:${NC}"
echo -e "     /plugin reload $PLUGIN_NAME"
echo
echo -e "  ${BLUE}3. Or reinstall if needed:${NC}"
echo -e "     /plugin uninstall $PLUGIN_NAME"
echo -e "     /plugin install $PLUGIN_NAME@$MARKETPLACE_NAME"
echo
echo -e "${YELLOW}Development workflow:${NC}"
echo -e "  1. Edit files in: $PLUGIN_DIR"
echo -e "  2. Reload plugin: /plugin reload $PLUGIN_NAME"
echo -e "  3. Test changes in your project"
echo -e "  4. Repeat"
echo
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Settings: $SETTINGS_FILE"
echo -e "  Marketplace: $MARKETPLACE_NAME"
echo -e "  Plugin: $PLUGIN_DIR"
echo
