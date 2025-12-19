# Session: refactor-architecture

## Details
- **Branch**: chore/refactor-architecture
- **Type**: chore
- **Created**: 2025-12-16
- **Status**: ready-for-review

## Goal
Align memento architecture with mantra pattern. Eliminate duplication, establish single source of truth for tools/templates/context.

## Current State (problems)
- Duplicated tools: `.claude/tools/` and `tools/`
- Duplicated templates: `.claude/templates/` and `templates/`
- Duplicated context: `.claude/context/sessions.*` and `examples/context/sessions.*`
- Hook implementation in `scripts/` instead of `.claude/hooks/`

## Target Architecture
```
memento/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── context/                       # Base context (shipped with plugin)
│   ├── sessions.yml              # Compact reference
│   └── sessions.md               # Detailed guide
├── templates/                     # Session file templates (shipped)
│   ├── feature.md
│   ├── chore.md
│   └── fix.md
├── tools/                         # Session tools (shipped)
│   ├── session.js
│   ├── create-session.js
│   └── get-session.js
├── commands/
│   ├── init.md
│   └── session.md
├── hooks/
│   ├── hooks.json
│   └── session-startup.js        # Hook implementation (at plugin root)
└── ARCHITECTURE.md
```

## Approach
1. Create `context/` with sessions.yml and sessions.md from .claude/context/
2. Remove `.claude/tools/` (keep only root `tools/`)
3. Remove `.claude/templates/` (keep only root `templates/`)
4. Move `scripts/session-startup.js` to `.claude/hooks/`
5. Remove `examples/context/` (redundant with `context/`)
6. Update hook paths in `hooks/hooks.json`
7. Create ARCHITECTURE.md documenting the structure
8. Update paths in commands and any references

## Session Log

### 2025-12-16 - Session Started
- Created branch and session file
- Reviewed mantra ARCHITECTURE.md as reference
- Identified duplication issues and target structure

### 2025-12-16 - Architecture Refactoring Complete
- Created `context/` directory with sessions.yml and sessions.md
- Updated init.md to reference `context/` instead of `examples/context/`
- Removed duplicate `.claude/tools/` directory (kept root `tools/`)
- Moved `__tests__/` to root `tools/__tests__/` and updated test paths
- Removed duplicate `.claude/templates/` directory
- Moved `scripts/session-startup.js` to `.claude/hooks/session-startup.js`
- Removed empty `scripts/` directory
- Updated `hooks/hooks.json` to use new hook path
- Removed redundant `examples/` directory
- Created comprehensive ARCHITECTURE.md
- Verified all tests pass (37 tests)

### 2025-12-16 - Simplified to Run Tools from Plugin Root
- Updated session.js to use `__dirname` for templates (plugin root)
- Tools now run from plugin, operate on consumer's `process.cwd()`
- Simplified init.md - only creates `.claude/sessions/` and `.claude/branches/`
- No files copied to consumer projects anymore
- Updated ARCHITECTURE.md with new data flow diagram
- Added design decision explaining why tools run from plugin root
- Removed `.claude/templates` symlink (no longer needed)
- All 37 tests still pass

### 2025-12-17 - Aligned with mantra Plugin Structure
- Moved `session-startup.js` from `.claude/hooks/` to `hooks/` (plugin root)
- Updated `hooks/hooks.json` to use `${CLAUDE_PLUGIN_ROOT}/hooks/session-startup.js`
- Removed duplicate context files from `.claude/context/` (sessions.md, sessions.yml, git.md, git.yml)
- Kept project-specific context in `.claude/context/` (project.yml, README.md)
- Structure now matches mantra pattern: hooks at plugin root, not nested in .claude/
- All 37 tests still pass

## Notes
- `.claude/sessions/` and `.claude/branches/` are runtime data, not shipped
- Base context files (yml) are auto-loaded by mantra
- Detailed guides (md) are available on-demand
- `.claude/context/` in this repo contains sibling plugin context (mantra) plus memento's sessions context

## Files Changed
- context/sessions.yml (new - base context)
- context/sessions.md (new - detailed guide)
- commands/init.md (simplified - only creates directories)
- tools/session.js (updated - uses __dirname for templates)
- tools/__tests__/create-session.test.js (moved, updated paths)
- tools/__tests__/get-session.test.js (moved, updated paths)
- tools/__tests__/session.test.js (moved, updated comments)
- hooks/hooks.json (updated hook command path)
- hooks/session-startup.js (moved from .claude/hooks/ to plugin root)
- ARCHITECTURE.md (new, updated with plugin-root design)
- Removed: .claude/tools/, .claude/templates/, scripts/, examples/, .claude/hooks/
- Removed: .claude/context/sessions.*, .claude/context/git.* (duplicates of plugin context)

## Next Steps
1. Run tests to verify everything works
2. Create PR for review
3. Merge to main
