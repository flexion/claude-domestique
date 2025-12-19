# Session: plugin-format

## Details
- **Branch**: chore/plugin-format
- **Type**: chore
- **Created**: 2025-12-16
- **Status**: in-progress

## Goal
Convert memento to plugin format matching mantra structure for distribution via the plugin system.

## Approach
1. Create `.claude-plugin/` directory with plugin.json and marketplace.json
2. Reorganize assets into plugin-friendly structure:
   - `hooks/hooks.json` - hook definitions
   - `scripts/` - session startup hook script
   - `templates/` - session templates (already exist)
   - `examples/context/` - sessions.yml and sessions.md for installation
3. Create `/session` command for manual session operations
4. Update package.json metadata
5. Test plugin installation locally

## Plugin Structure (target)
```
.claude-plugin/
├── plugin.json         # Plugin metadata
└── marketplace.json    # Marketplace registration
commands/
└── session.md          # /session slash command
hooks/
└── hooks.json          # SessionStart hook config
scripts/
└── session-startup.js  # Auto-load session on startup
templates/              # Session templates
tools/                  # Session management tools
examples/
└── context/
    ├── sessions.yml    # Compact reference
    └── sessions.md     # Detailed workflow guide
```

## Session Log

### 2025-12-16 - Session Started
- Created branch and session file
- Explored mantra plugin structure
- Key files: plugin.json, marketplace.json, hooks/hooks.json, commands/*.md

### 2025-12-16 - Plugin Structure Created
- Created .claude-plugin/plugin.json and marketplace.json
- Created hooks/hooks.json with SessionStart hook
- Created scripts/session-startup.js (self-contained session detection)
- Copied tools/ and templates/ to plugin root
- Created examples/context/ with sessions.yml and sessions.md
- Created commands/session.md slash command
- Updated package.json with repo/author metadata

### 2025-12-16 - Commands Refined
- Renamed session.md to init.md for `/memento:init` command
- Created separate session.md for `/memento:session` status command
- Updated plugin.json to reference both commands
- init copies: tools, templates, and context files (sessions.yml, sessions.md)

### 2025-12-16 - README Updated
- Added Installation section (marketplace and local)
- Added Usage section (create session, check status, auto-detection)
- Added Commands table

### 2025-12-16 - Periodic Session Updates
- Refactored session-startup.js to handle both SessionStart and UserPromptSubmit
- Added UserPromptSubmit hook to hooks.json
- Every 10 interactions, prompts Claude to update the session file
- Configurable via `.claude/config.json` with `session.updateInterval`

## Notes
- Plugin hooks use `${CLAUDE_PLUGIN_ROOT}` for script paths
- marketplace.json wraps plugin for multi-plugin repos
- commands are markdown files with prompts
- scripts/session-startup.js is self-contained (doesn't depend on .claude/tools/)

## Files Changed
- .claude-plugin/plugin.json (new)
- .claude-plugin/marketplace.json (new)
- hooks/hooks.json (new, updated with UserPromptSubmit)
- scripts/session-startup.js (new, refactored for periodic updates)
- commands/init.md (new)
- commands/session.md (new)
- tools/ (copied from .claude/tools/)
- templates/ (copied from .claude/templates/)
- examples/context/sessions.yml (new)
- examples/context/sessions.md (new)
- package.json (updated)
- README.md (updated with installation/usage)

## Next Steps
1. Test plugin installation locally
2. Create PR for review
3. Merge to main
