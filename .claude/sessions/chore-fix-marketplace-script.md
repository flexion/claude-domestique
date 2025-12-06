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
- Committed and pushed marketplace script fix

### 2025-12-06 - Context Refresh Agent Fix
- Analyzed context-refresh agent to assess if Claude will respect it
- Found critical issues:
  - Hook was outputting plain text (suggestions) not structured JSON (enforcement)
  - Agent was not registered in plugin.json `agents` field
  - No mechanism to verify Claude actually loaded context
- Researched Claude Code hook capabilities via documentation:
  - Hooks CAN return structured JSON with `hookSpecificOutput.additionalContext`
  - This gets injected into conversation as mandatory context, not displayed text
  - Plugin manifest supports `agents` field for agent discovery
- Rewrote `hooks/prompt-submit/check-refresh.js`:
  - Now outputs structured JSON with `hookSpecificOutput.additionalContext`
  - Injects MANDATORY instruction for Claude to read context files
  - Includes countdown context on every interaction (subtle reminder)
- Added `"agents": "./agents"` to plugin.json
- Updated agent documentation to reflect new architecture
- All 19 tests still pass
- Committed structured JSON hook fix

### 2025-12-06 - Simplified Refresh Instruction
- Identified path resolution issue: plugin paths (`context/*.yml`) won't resolve in installed projects
- Simplified to project-relative paths only (`.claude/context/*.yml`)
- Removed countdown clutter between refreshes (silent until refresh needed)
- Numbered list for clarity
- Cleaned up unused imports
- All 19 tests still pass
- Committed simplified refresh instruction

### 2025-12-06 - Version Bump to 0.2.0
- Bumped version in plugin.json, marketplace.json, package.json
- Minor version bump reflects significant changes:
  - Structured JSON hook output (enforcement vs suggestion)
  - Agent registration in plugin manifest
  - Simplified refresh instruction with project-relative paths

### 2025-12-06 - Plugin Installation Fixes (0.2.1)
- Fixed plugin validation errors discovered during installation in target project:
  - **agents field**: Changed from `"agents": "./agents"` (directory) to `"agents": ["./agents/context-refresh.md"]` (array of .md files)
  - **hook path**: Changed from `./hooks/prompt-submit/check-refresh.js` to `${CLAUDE_PLUGIN_ROOT}/hooks/prompt-submit/check-refresh.js` for cross-project resolution
- Bumped version to 0.2.1 in plugin.json and marketplace.json
- Key learnings:
  - Plugin `agents` field must be array of `.md` file paths, not a directory
  - Hook command paths must use `${CLAUDE_PLUGIN_ROOT}` environment variable to resolve correctly when plugin is installed in other projects

## Next Steps

1. Commit and push 0.2.1 fixes
2. Test plugin update in target project
3. Create PR for this chore branch
