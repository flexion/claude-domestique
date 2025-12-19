# Session: Issue #2 - Session Helper Tools

## Details
- **Issue**: [#2](https://github.com/flexion/claude-domestique/tree/main/memento/issues/2)
- **Branch**: issue/feature-2/session-tools
- **Created**: 2025-12-07
- **Status**: in-progress

## Objective
Build JavaScript tools for session creation, tracking, and updating. These tools give Claude persistent memory across conversation resets.

## Implementation Plan

### Directory Structure
```
.claude/
├── sessions/           # Session files (rich, detailed markdown)
├── branches/           # Branch metadata (compact, mapping)
└── tools/              # Session management tools (JavaScript)
    ├── session.js          # Core module (shared utilities)
    ├── create-session.js   # Create branch metadata + session file
    └── get-session.js      # Find session from current branch
```

### Tools to Build

1. **session.js** - Core module
   - Git branch detection
   - Branch name parsing (feature/X, chore/X, fix/X, issue/feature-N/X)
   - Path utilities
   - Template loading

2. **create-session.js** - Session initialization
   - Parse current branch name
   - Detect session type (feature, chore, bug)
   - Create branch metadata file
   - Create session file from template

3. **get-session.js** - Session discovery
   - Read current branch
   - Find branch metadata
   - Return session file path and status

4. **Session updates** - Collaborative (Claude + user)
   - Claude edits session files directly
   - User reviews changes
   - No separate tool needed

## Session Log

### 2025-12-07 - Session Started
- Created GitHub issue #2
- Created branch: issue/feature-2/session-tools
- Reviewed reference implementation in claude-domestique
- Identified gap: no update-session tool exists
- Created directory structure: sessions/, branches/, tools/
- Updated ROADMAP.md with tool specifications

- [2025-12-07 15:01] Implemented all four session tools
- [2025-12-07 15:02] Completed all four session tools: session.js, create-session.js, get-session.js, update-session.js
- [2025-12-07 15:08] Created session templates (feature.md, fix.md, chore.md) and context files (sessions.yml, session-workflow.md)
- [2025-12-07 15:15] Removed update-session.js - session updates should be collaborative (Claude edits directly, user reviews)
- [2025-12-07 15:22] Added session auto-loading to context-refresh hook - session file now injected on startup
- [2025-12-07 15:35] Created tests for all JS tools (37 tests passing)
## Key Decisions

### 1. Multi-platform support for issue trackers
**Decision**: Support GitHub, Jira, and Azure DevOps with auto-detection
**Rationale**: Different teams use different issue trackers; tool should be flexible

### 2. Branch naming patterns by platform
| Platform | Pattern | Identifier | Session File |
|----------|---------|------------|--------------|
| GitHub | `issue/feature-N/desc` | `#N` | `N-desc.md` |
| Jira | `feature/PROJ-123/desc` | `PROJ-123` | `PROJ-123-desc.md` |
| Azure DevOps | `feature/456/desc` | `#456` | `456-desc.md` |
| No issue | `chore/desc` | none | `chore-desc.md` |

### 3. Auto-detection logic
- `PROJ-123` pattern → Jira
- Numeric only → GitHub or Azure DevOps
- No number → Non-issue work (chore, feature)

### 4. Fallback behavior
If branch pattern doesn't match, use sanitized branch name as session filename


### JavaScript-only implementation
  - **Rationale**: Node is a requirement of Claude CLI, all tools can be invoked directly

### 5. Collaborative session updates
**Decision**: Remove update-session.js, Claude edits session files directly
**Rationale**: Session maintenance should be collaborative between Claude and user; a CLI wrapper adds friction without value for Claude's workflow

## Learnings
- Reference scripts are bash; we need JavaScript for Claude CLI compatibility
- claude-domestique has work-items.yml with full platform config spec
- CLI tools for session updates add overhead; direct editing is more flexible

## Files Changed
- .claude/sessions/2-session-tools.md (this file)
- .claude/branches/issue-feature-2-session-tools
- ROADMAP.md

- .claude/tools/session.js
- .claude/tools/create-session.js
- .claude/tools/get-session.js
- .claude/templates/feature.md
- .claude/templates/fix.md
- .claude/templates/chore.md
- .claude/context/sessions.yml
- .claude/context/session-workflow.md
- .claude/hooks/context-refresh.js (added session auto-loading)
- .claude/tools/__tests__/session.test.js
- .claude/tools/__tests__/create-session.test.js
- .claude/tools/__tests__/get-session.test.js
- package.json
## Next Steps
1. ~~Update ROADMAP.md with detailed tool specifications~~ ✓
2. ~~Implement session.js core module~~ ✓
3. ~~Implement create-session.js~~ ✓
4. ~~Implement get-session.js~~ ✓
5. ~~Create session templates (feature, chore, bug)~~ ✓
6. ~~Create session context files (sessions.yml + session-workflow.md)~~ ✓
7. ~~Implement integration hooks (auto-load session on startup)~~ ✓

**Phase 2 Complete!** Ready for PR or continue to Phase 3 (polish).
