# Session: Chore - Fix Marketplace Script

## Goal

Fix `scripts/setup-local-marketplace.sh` to use the correct Claude Code plugin architecture instead of assumed conventions.

## Problems Identified (Original)

| Issue | Script Does | Official Approach |
|-------|-------------|-------------------|
| Directory location | `~/.claude/marketplaces/local/` | Not a recognized location |
| Manifest location | repo root | Should be in `.claude-plugin/` |
| Owner format | String | Must be object with `name` and `email` |
| Registration | `extraKnownMarketplaces` | `/plugin` → Add Marketplace → directory path |

## Correct Architecture (Revised)

### 1. Plugin manifest (already correct)
Location: `.claude-plugin/plugin.json` - this is correct

### 2. Marketplace manifest (in .claude-plugin/)
Location: `.claude-plugin/marketplace.json`
```json
{
  "name": "local-dev",
  "owner": {
    "name": "Local Development",
    "email": "dev@localhost"
  },
  "plugins": [
    {
      "name": "claude-domestique",
      "source": "./",
      "version": "0.1.3"
    }
  ]
}
```

Note: `owner` must be an object with `name` and `email`, not a string.

### 3. Register via /plugin command
In Claude Code:
1. Run `/plugin`
2. Select "Add Marketplace"
3. Enter the plugin directory path (e.g., `/Users/dpuglielli/github/flexion/claude-domestique`)

### 4. Install
Select the plugin from the marketplace UI and install.

## Implementation Plan

- [x] Create `.claude-plugin/marketplace.json` with correct structure
- [x] Rewrite `scripts/setup-local-marketplace.sh` to:
  - Create/update `.claude-plugin/marketplace.json`
  - Sync version from plugin.json
  - Offer cleanup of old configurations (root marketplace.json, extraKnownMarketplaces, ~/.claude/marketplaces/)
  - Provide instructions for `/plugin` → Add Marketplace workflow
- [x] Test script execution
- [ ] Test installation in a target project

## Files Modified

- `scripts/setup-local-marketplace.sh` - complete rewrite
- `.claude-plugin/marketplace.json` (NEW) - marketplace manifest
- `.claude-plugin/plugin.json` - (check for changes)
- `marketplace.json` (DELETED) - moved to .claude-plugin/

## Files to Clean Up (script handles interactively)

- `marketplace.json` at repo root - old location
- `~/.claude/marketplaces/local/` - old approach
- `~/.claude/settings.local.json` - if only contains extraKnownMarketplaces
- `extraKnownMarketplaces` in `~/.claude/settings.json`

## Context

This chore was identified when attempting to install the plugin and receiving "unable to install plugin from /Users/dpuglielli/.claude/marketplaces/local" - the directory structure was based on assumptions rather than the official plugin architecture.

## Session Log

### 2025-12-02 - Session Created
- Identified problems with current marketplace script
- Documented correct architecture based on Claude Code plugin system
- Created implementation plan

### 2025-12-02 - Implementation Complete (First Attempt)
- Created `marketplace.json` at repo root with correct structure
- Rewrote `scripts/setup-local-marketplace.sh`:
  - Now registers marketplace via `extraKnownMarketplaces` in `~/.claude/settings.local.json`
  - Uses `jq` when available for safe JSON manipulation, with sed fallback
  - Syncs version from plugin.json to marketplace.json
  - Offers interactive cleanup of old marketplace structure
  - Updated usage instructions to use `@local-dev` syntax
- Passed shellcheck validation
- Tested script execution successfully

### 2025-12-06 - Architecture Pivot
- Discovered correct approach differs from initial implementation:
  - Marketplace manifest belongs in `.claude-plugin/`, not repo root
  - `owner` must be object `{"name": "...", "email": "..."}`, not string
  - Registration via `/plugin` → Add Marketplace → directory path, not `extraKnownMarketplaces`
- Rewrote script with correct approach:
  - Creates `.claude-plugin/marketplace.json` with proper owner format
  - Provides instructions for `/plugin` → Add Marketplace workflow
  - Offers cleanup of old configurations (root marketplace.json, extraKnownMarketplaces, etc.)
- Updated ROADMAP.md to reflect #38 completion (context-refresh agent)
- Updated session documentation to match current implementation

## Next Steps

1. Test installation via `/plugin` → Add Marketplace in a target project
2. Run shellcheck on updated script
3. Commit changes
