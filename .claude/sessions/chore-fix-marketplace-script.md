# Session: Chore - Fix Marketplace Script

## Goal

Fix `scripts/setup-local-marketplace.sh` to use the correct Claude Code plugin architecture instead of assumed conventions.

## Problems Identified

| Issue | Script Does | Official Approach |
|-------|-------------|-------------------|
| Directory location | `~/.claude/marketplaces/local/` | Not a recognized location - must use `extraKnownMarketplaces` setting |
| Manifest location | `.claude-plugin/marketplace.json` | Should be `marketplace.json` at root (`.claude-plugin/` is for plugin manifests only) |
| `@local` notation | `/plugin install plugin@local` | Not documented - should use actual marketplace name from `name` field |

## Correct Architecture

### 1. Plugin manifest (already correct)
Location: `.claude-plugin/plugin.json` - this is correct

### 2. Marketplace manifest (NEW - at repo root)
Location: `marketplace.json` at repository root
```json
{
  "name": "local-dev",
  "owner": "Local Development",
  "plugins": [
    {
      "name": "claude-domestique",
      "source": "./",
      "version": "0.1.3"
    }
  ]
}
```

### 3. Register via settings
Location: `~/.claude/settings.local.json`
```json
{
  "extraKnownMarketplaces": [
    {
      "name": "local-dev",
      "source": {
        "type": "directory",
        "path": "/Users/dpuglielli/github/flexion/claude-domestique"
      }
    }
  ]
}
```

### 4. Install command
```
/plugin install claude-domestique@local-dev
```

## Implementation Plan

- [x] Create `marketplace.json` at repo root with correct structure
- [x] Rewrite `scripts/setup-local-marketplace.sh` to:
  - Create/update `~/.claude/settings.local.json` with `extraKnownMarketplaces`
  - Register the plugin directory as a local marketplace
  - Offer to remove the old `~/.claude/marketplaces/local/` approach
  - Update usage instructions
- [x] Test script execution
- [ ] Test installation in a target project

## Files Modified

- `scripts/setup-local-marketplace.sh` - complete rewrite
- `marketplace.json` (NEW) - created at repo root

## Files to Clean Up (manually)

- `~/.claude/marketplaces/local/` - old approach, can be removed

## Context

This chore was identified when attempting to install the plugin and receiving "unable to install plugin from /Users/dpuglielli/.claude/marketplaces/local" - the directory structure was based on assumptions rather than the official plugin architecture.

## Session Log

### 2025-12-02 - Session Created
- Identified problems with current marketplace script
- Documented correct architecture based on Claude Code plugin system
- Created implementation plan

### 2025-12-02 - Implementation Complete
- Created `marketplace.json` at repo root with correct structure
- Rewrote `scripts/setup-local-marketplace.sh`:
  - Now registers marketplace via `extraKnownMarketplaces` in `~/.claude/settings.local.json`
  - Uses `jq` when available for safe JSON manipulation, with sed fallback
  - Syncs version from plugin.json to marketplace.json
  - Offers interactive cleanup of old marketplace structure
  - Updated usage instructions to use `@local-dev` syntax
- Passed shellcheck validation
- Tested script execution successfully

## Next Steps

1. Test `/plugin install claude-domestique@local-dev` in a target project
2. Commit changes
