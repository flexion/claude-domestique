# Plugin Conformance Research

**Branch:** `chore/plugin-conformance-research`
**Started:** 2025-12-20
**Status:** In Progress

## Objective
Research whether claude-domestique plugins conform to Claude Code plugin standards and identify enhancement opportunities.

## Executive Summary

The plugins **largely conform** to Claude Code standards with **no blocking issues**. Key findings:
- **Manifests**: Valid but missing optional fields (hooks reference, metadata)
- **Hooks**: Well-implemented, correct patterns, proper output format
- **Commands**: Compliant with frontmatter and structure requirements
- **Context**: Working but uses custom loading (not standard plugin mechanism)

**Enhancement opportunities** include: Skills, custom agents, MCP servers, and potential new plugins.

---

## Conformance Analysis

### 1. Plugin Manifest (plugin.json) Conformance

| Field | memento | mantra | onus | Required? | Notes |
|-------|---------|--------|------|-----------|-------|
| `name` | `memento` | `mantra` | `onus` | Required | Names are kebab-case and unique |
| `version` | `0.1.13` | `0.1.6` | `0.1.4` | Optional | Proper semver format |
| `description` | Brief, clear | Brief, clear | Brief, clear | Optional | Good, action-oriented |
| `author` | Object | Object | Object | Optional | Missing `email`, `url` |
| `commands` | Array | Array | Array | Optional | Correct `./` relative paths |
| `hooks` | **Missing** | **Missing** | **Missing** | Optional | Uses default path discovery |
| `repository` | **Missing** | **Missing** | **Missing** | Optional | Good practice for source |
| `homepage` | **Missing** | **Missing** | **Missing** | Optional | Good for docs |
| `license` | **Missing** | **Missing** | **Missing** | Optional | Should add MIT |
| `keywords` | **Missing** | **Missing** | **Missing** | Optional | Helps discovery |
| `agents` | **Missing** | **Missing** | **Missing** | Optional | Opportunity |
| `skills` | **Missing** | **Missing** | **Missing** | Optional | Opportunity |

**Verdict**: **PASS** - All required fields present. Missing optional fields don't break functionality.

**Recommendations**:
1. Add explicit `"hooks": "./hooks/hooks.json"` for clarity
2. Add metadata fields: `repository`, `homepage`, `license`, `keywords`

### 2. Hook Implementation Conformance

| Aspect | memento | mantra | onus | Standard |
|--------|---------|--------|------|----------|
| Uses `${CLAUDE_PLUGIN_ROOT}` | Yes | Yes | Yes | Required |
| JSON stdin input | Yes | Yes | Yes | Required |
| JSON stdout output | Yes | Yes | Yes | Required |
| `systemMessage` field | Yes | Yes | Yes | Standard |
| `hookSpecificOutput` field | Yes | Yes | Yes | Standard |
| `additionalContext` for context injection | Yes | Yes | Yes | Correct |
| Shebang line | Yes | Yes | Yes | Required |
| Timeout specified | Yes (3-5s) | Yes (5s) | Yes (5-10s) | Optional |
| Exit code 0 on success | Yes | Yes | Yes | Required |

**Hook Event Coverage**:
| Hook Event | memento | mantra | onus |
|------------|---------|--------|------|
| SessionStart | `session-startup.js` | `context-refresh.js` | `work-item.js` |
| UserPromptSubmit | `session-startup.js` | `context-refresh.js` | `work-item.js` |
| PreToolUse | `verify-session.js` | - | - |
| PostToolUse | - | - | - |
| Stop | - | - | - |
| PermissionRequest | - | - | - |

**Verdict**: **PASS** - Excellent conformance. Hooks follow all patterns correctly.

**Notable**: memento's `verify-session.js` correctly uses PreToolUse with matcher for Edit|Write.

### 3. Command/Skill Structure Conformance

| Aspect | Conformance | Notes |
|--------|-------------|-------|
| Frontmatter with `description` | Yes | All commands have descriptions |
| `argument-hint` where relevant | Yes | `/mantra:init`, `/onus:init`, `/onus:fetch` have hints |
| Markdown body | Yes | Clear instructions |
| Uses `${CLAUDE_PLUGIN_ROOT}` | Yes | For script paths |
| Files in `commands/` directory | Yes | Standard location |

**Commands Inventory**:
- `/memento:init` - Initialize session directories
- `/memento:session` - Show/create session
- `/mantra:init` - Scaffold context files
- `/onus:init` - Configure work item integration
- `/onus:fetch` - Fetch issue details

**Verdict**: **PASS** - Commands are well-structured and documented.

### 4. Context System Analysis

**Current Implementation**:
- mantra loads context via custom code in `context-refresh.js`
- Uses `findYmlFiles()` to discover `.yml` files
- Loading order: base → sibling plugins → project → CLAUDE.md
- Sibling detection via `~/.claude/plugins/installed_plugins.json`

**Comparison to Standard**:
- Claude Code doesn't have a native "context file" plugin component
- Context loading is **custom** but follows reasonable patterns
- The two-tier pattern (yml for compact, md for detailed) is sound

**Verdict**: **PASS with notes** - Not a standard plugin component, but well-designed.

### 5. Directory Structure Conformance

```
memento/
├── .claude-plugin/plugin.json  ✅ Correct location
├── commands/                   ✅ Default location
├── context/                    ✅ Plugin ships context
├── hooks/                      ✅ Contains hooks.json + JS files
│   ├── hooks.json
│   ├── session-startup.js
│   └── verify-session.js
├── tools/                      ⚠️ Non-standard (but fine)
│   └── session.js
├── templates/                  ⚠️ Non-standard (but fine)
└── package.json
```

**Verdict**: **PASS** - Core structure is correct. Extra directories don't cause issues.

---

## Will It Work as Expected? (Functionality Assessment)

### memento - Session Persistence
| Feature | Implementation | Works? |
|---------|----------------|--------|
| Auto-detect session on startup | SessionStart hook reads branch metadata | Yes |
| Session file creation | `/memento:session create` command | Yes |
| Edit blocking without session | PreToolUse hook for Edit/Write | Yes |
| Branch-to-session mapping | `.claude/branches/` metadata | Yes |
| Context injection | Uses `additionalContext` correctly | Yes |

**Assessment**: Functionality matches README documentation.

### mantra - Context Refresh
| Feature | Implementation | Works? |
|---------|----------------|--------|
| Session start refresh | SessionStart hook injects context | Yes |
| Periodic refresh | UserPromptSubmit tracks count, refreshes at interval | Yes |
| Freshness indicator | `📍 Mantra: N/M` on every prompt | Yes |
| Base + project context loading | Custom loader finds all `.yml` | Yes |
| Sibling plugin detection | Registry-based discovery | Yes |
| CLAUDE.md fallback | Reads and warns about dual-context | Yes |

**Assessment**: Functionality matches README documentation.

### onus - Work Item Automation
| Feature | Implementation | Works? |
|---------|----------------|--------|
| Issue extraction from branch | `extractIssueFromBranch()` with patterns | Yes |
| Multi-platform support | GitHub, JIRA, Azure DevOps config | Yes |
| Work item caching | `~/.claude/onus/work-item-cache.json` | Yes |
| Commit format suggestions | Injected in context | Yes |
| Branch change detection | Tracks `currentBranch` in state | Yes (added #44) |

**Assessment**: Functionality matches README documentation.

### Inter-Plugin Coordination
| Feature | Works? | Notes |
|---------|--------|-------|
| Family detection | Yes | mantra finds siblings by marketplace |
| Context sharing | Yes | Sibling `.yml` files loaded |
| Session conventions | Yes | All plugins agree on 1:1:1 mapping |

---

## Enhancement Opportunities

### A. Improvements to Existing Plugins

#### 1. Add Skills (Model-Invoked)

Skills let Claude autonomously decide when to use specialized capabilities.

**memento skill idea**: `session-manager`
```yaml
---
name: session-manager
description: Manage Claude Code sessions. Use when creating, updating, or checking session status for the current branch.
allowed-tools: Read, Write, Edit, Bash
---
```

**onus skill idea**: `work-item-handler`
```yaml
---
name: work-item-handler
description: Fetch and manage work items from issue trackers. Use when user references issues, asks about requirements, or needs commit/PR formatting.
allowed-tools: Read, Bash, WebFetch
---
```

**Impact**: High - Claude would proactively use these without explicit commands
**Effort**: Medium - Need to write skill files and register in manifests

#### 2. Add Custom Agents (Subagents)

Agents are specialized subagents Claude can spawn.

**commit-helper agent**:
```markdown
---
name: commit-helper
description: Generate well-formatted commits with issue context. Invoke when user wants to commit changes.
tools: Read, Bash, Grep
model: haiku
---
```

**pr-generator agent**:
```markdown
---
name: pr-generator
description: Create pull requests with proper formatting, summaries, and test plans.
tools: Read, Bash, Grep, WebFetch
---
```

**Impact**: High - Specialized agents for common workflows
**Effort**: Medium

#### 3. Add MCP Server

An MCP server could provide tools for:
- Direct issue CRUD operations
- Session file management
- Work item status updates

**Impact**: Medium - Alternative to hooks for active operations
**Effort**: High - Need to implement MCP protocol

#### 4. Add Output Styles

Custom output styles for:
- Commit message format
- PR description template
- Session update format

**Impact**: Low-Medium - Standardizes output
**Effort**: Low

#### 5. Add PostToolUse Hooks

**Auto-update session after Write/Edit**:
- Track files changed
- Update "Files Changed" section of session

**Impact**: Medium - Reduces manual session updates
**Effort**: Low

### B. New Plugin Ideas

#### 1. "vigil" - Code Review Automation
> "Watching over your code."

- PreToolUse hook on Write/Edit for security checks
- Spell-checking for strings and comments
- Lint rule enforcement
- PostToolUse for quality analysis

**Mission alignment**: Handles "unglamorous work" of code review
**Effort**: Medium-High

#### 2. "relic" - Technical Debt Tracker
> "Honoring the past, planning the future."

- Detect TODO/FIXME comments
- Track tech debt in session files
- Suggest refactoring opportunities
- Hook into commits to flag debt changes

**Mission alignment**: Manages deferred work that "kills your flow"
**Effort**: Medium

#### 3. "herald" - Announcement/Changelog Generator
> "Proclaiming your achievements."

- Generate changelogs from commits
- Create release notes
- Update version files
- Announcement templates

**Mission alignment**: More "bureaucracy" automation
**Effort**: Low-Medium

#### 4. "cadence" - Development Workflow Enforcer
> "Keeping the rhythm."

- Enforce TDD workflow (test before impl)
- Block commits without tests
- Require documentation updates
- Sprint/iteration tracking

**Mission alignment**: Workflow discipline
**Effort**: Medium

---

## Prioritized Recommendations

### Quick Wins (Low Effort, High Impact)
1. **Add manifest metadata** - `hooks`, `repository`, `license`, `keywords`
2. **Add PostToolUse hook** - Auto-update session after file changes
3. **Add basic skills** - `session-manager`, `work-item-handler`

### Medium Term (Medium Effort, High Impact)
4. **Add commit-helper agent** - Specialized for generating commits
5. **Add pr-generator agent** - Specialized for creating PRs
6. **Create "herald" plugin** - Changelog/release notes automation

### Long Term (Higher Effort)
7. **Add MCP server** - Direct tool access for issue management
8. **Create "vigil" plugin** - Code review automation
9. **Add LSP integration** - Code intelligence for better suggestions

---

## Decisions Made
- Plugins conform to standards - no blocking changes needed
- Enhancement work should be issue-driven (create issues first)

## Next Steps
- [ ] Create issues for prioritized enhancements
- [ ] Start with quick wins (manifest improvements)
- [ ] Prototype skills for memento/onus

## Session Log
- 2025-12-20: Session created, completed conformance research
