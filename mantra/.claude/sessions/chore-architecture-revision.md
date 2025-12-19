# Chore: Architecture Revision

## Goal
Rework context loading architecture to separate base behavior (plugin-provided) from project extensions.

## Context
- ARCHITECTURE.md was just created in PR #8
- User wanted to restructure context system with clear separation of concerns

## Architecture Changes

### New Structure
```
mantra/
├── context/                      # Plugin's base context (shipped with plugin)
│   ├── behavior.yml              # Base AI behavior rules
│   ├── behavior.md               # Detailed behavior guide
│   ├── context-format.yml        # Spec for .claude/context format
│   ├── context-format.md         # Detailed format documentation
│   └── format-guide.yml          # Compact YAML format reference
│
├── templates/context/            # Init templates
│   ├── README.md                 # How/why to extend behavior
│   └── project.yml.example       # Stubbed example extension
│
├── scripts/
│   ├── init.js                   # NEW: Initialize project context
│   └── context-refresh.js        # Hook implementation
│
└── .claude/
    └── hooks/
        └── context-refresh.js    # Hook (finds plugin root via __dirname)
```

### Loading Order
1. **Base context** - `<plugin-root>/context/*.yml` (always loaded)
2. **Project extensions** - `<project>/.claude/context/*.yml` (additive)
3. **CLAUDE.md** - Included with warning if both exist

### Key Decisions
- Base context lives at plugin root `context/`
- Hook finds plugin root via `__dirname` relative path
- Project extensions are additive (don't override base)
- Init script backs up CLAUDE.md and attempts basic decomposition
- CLAUDE.md supported but warns about potential confusion

## Session Log

### 2024-12-16 - Config and Documentation Consistency
- Fixed `.claude/config.json`: changed interval from 50 to 20
- Updated documentation referencing "50 interactions" to "20 interactions"

### 2024-12-16 - Architecture Rework
- Created `context/` at plugin root with base behavior files
- Created `context-format.yml` and `context-format.md` (new spec files)
- Created `templates/context/` with README and example extension
- Created `scripts/init.js` with CLAUDE.md decomposition logic
- Updated hook to load base context first, then project extensions
- Updated tests for new API (50 tests passing)

### 2024-12-16 - Sibling Plugin Discovery
- Added sibling plugin discovery: reads `~/.claude/plugins/installed_plugins.json`
- Filters siblings by `projectPath === cwd` (only project-scoped plugins)
- Only loads from plugin family: mantra, memento, onus
- Loads context from sibling plugins' `context/` directories
- Loading order: base → siblings → project → CLAUDE.md
- Removed duplicate `scripts/context-refresh.js` (hook only in `.claude/hooks/`)
- Added 8 new tests (58 total passing)

### 2024-12-16 - Documentation Updates
- Updated ARCHITECTURE.md with complete architecture (loading order, sibling discovery)
- Updated README.md (features, init behavior, context structure, interoperability)
- Updated ROADMAP.md (current state, marked plugin discovery as implemented)
- Updated commands/init.md (rewrote to match scripts/init.js behavior)
- Updated FORMAT.md (directory structure with base/project separation)
- Updated CLAUDE.md (architecture section, context system)

## Files Changed
- `.claude/config.json` - interval: 50 → 20
- `.claude/context/README.md` - updated refresh interval reference
- `.claude/sessions/chore-plugin-design.md` - updated 3 interval references
- `.claude/sessions/2-session-start-hook.md` - updated default interval reference
- `context/behavior.yml` - NEW (copied from .claude/context/)
- `context/behavior.md` - NEW (copied from .claude/context/)
- `context/format-guide.yml` - NEW (copied from .claude/context/)
- `context/context-format.yml` - NEW (spec for context format)
- `context/context-format.md` - NEW (detailed format guide)
- `templates/context/README.md` - NEW (extension instructions)
- `templates/context/project.yml.example` - NEW (example template)
- `scripts/init.js` - NEW (project initialization)
- `.claude/hooks/context-refresh.js` - Updated for base+project loading
- `.claude/hooks/__tests__/context-refresh.test.js` - Updated tests
- `ARCHITECTURE.md` - Updated with full architecture documentation
- `README.md` - Updated features, init, context structure, interoperability
- `ROADMAP.md` - Updated current state, marked plugin discovery as done
- `commands/init.md` - Rewrote to match scripts/init.js behavior
- `FORMAT.md` - Updated directory structure for base/project separation
- `CLAUDE.md` - Updated architecture and context system sections

## Todo
- [x] Fix refresh interval in config.json (50 → 20)
- [x] Update documentation to reflect 20 as default
- [x] Create plugin root context/ directory
- [x] Create context-format.yml and context-format.md
- [x] Create templates/context/ with README and example
- [x] Create scripts/init.js
- [x] Update hook to load base + project context
- [x] Update tests
- [x] Add sibling plugin discovery
- [x] Create PR (#9)
- [x] Update documentation files (ARCHITECTURE.md, README.md, ROADMAP.md, commands/init.md, FORMAT.md, CLAUDE.md)

## Next Steps
- Waiting for PR review
