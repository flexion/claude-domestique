# Session: Hook Event Redesign

**Issue**: #73
**Branch**: issue/feature-73/hook-event-redesign
**Type**: feature
**Created**: 2025-12-21
**Status**: in-progress

## Goal
Redesign hook event architecture with appropriate separation of concerns between hooks, skills, and commands.

## Approach
1. Build reference library from official Claude Code docs
2. Audit current hook implementations (mantra, memento, onus)
3. Analyze determinism requirements for each operation
4. Design architecture that uses right tool for each job
5. Create feature issues for implementation (no implementation in this effort)

## Session Log
- 2025-12-21: Session created, branch checked out from main
- 2025-12-21: Built compact reference library in docs/claude/ from official docs
- 2025-12-21: Deep analysis of hooks vs skills vs commands architecture
- 2025-12-21: Created architecture-proposal.md with redesign recommendations
- 2025-12-21: Detailed mantra breakdown - simplified status line with size reporting
- 2025-12-21: Detailed memento breakdown - event-driven, PreCompact hook, knowledge-driven skill
- 2025-12-21: Fixed session file naming inconsistency (docs now match code: branch-sanitized)
- 2025-12-21: Completed onus breakdown with full CRUD requirements
- 2025-12-21: Added Design Principles section (independence, context ownership, single responsibility)
- 2025-12-21: Added Minimal Code Principle (hooks delegate to skills ASAP, skills receive goals not tasks)
- 2025-12-21: Updated all plugin recommendations with minimal hook specs (~30-50 LOC targets)

## Key Decisions
- Build reference library before implementation to maintain fresh context
- Use compact YAML format optimized for AI consumption
- Command hooks remain necessary for context injection (no auto-load)
- Split: hooks for deterministic ops, skills for judgment, commands for user control
- Session file naming: `<branch-sanitized>.md` (slashes replaced with dashes)

### Design Principles (added)
- **Plugin Independence**: Each plugin MUST function standalone; siblings enhance but never require
- **Context Injection Ownership**: Each plugin injects own context; mantra aggregates when present
- **Single Responsibility**: memento=sessions, onus=work items, mantra=context refresh
- **Minimal Code**: Hooks <50 LOC, delegate to skills immediately
- **Goal-focused Skills**: Skills receive GOAL ("help developer resume work") not task ("create file")

### Plugin Specifics
- **mantra** (~30 LOC hook): counter, refresh check → skill handles context loading
- **memento** (~40 LOC hook): branch, session path, exists check → skill handles content
- **onus** (~50 LOC hook): branch, issue key, platform, downloaded check → skill handles CRUD

### Onus Requirements (expanded)
- Full CRUD on work items (GitHub, Azure DevOps, JIRA)
- Download complete work items (comments, images, attachments) to ~/.claude/onus/work-items/
- Manual refresh only (no automatic re-fetch)
- Storage outside repo (prevent sensitive info leakage)
- Configurable formats (branch, commit, PR) with sensible defaults
- No attribution to Claude, recommend SSH/GPG signing

## Learnings

### Hook Capabilities
- Only 5 events support prompt-based hooks: Stop, SubagentStop, UserPromptSubmit, PreToolUse, PermissionRequest
- SessionStart does NOT support prompt-based hooks
- Prompt hooks return `{decision, reason}` - for decisions, NOT context injection
- Our use case (context injection) requires command-based hooks

### Cross-Tool Communication
- Hooks CANNOT directly invoke skills or slash commands
- Hooks can SUGGEST commands in additionalContext (indirect)
- Hook context might trigger skill discovery (unreliable)

### Determinism Spectrum
- Command hook: exact same output every time
- Slash command + bash: deterministic data + LLM interpretation
- Slash command: LLM-interpreted
- Skill: auto-triggered, least deterministic

### Context Loading
- Claude Code does NOT auto-load context/*.yml files
- Hooks must inject context - mantra's reason for existing

## Files Changed
- docs/claude/architecture-proposal.md - Complete redesign proposal with all principles
- docs/claude/hooks.yml - Hook events, types, context injection patterns
- docs/claude/plugins.yml - Plugin structure, manifest, namespacing
- docs/claude/commands.yml - Command types, frontmatter, arguments
- docs/claude/settings.yml - Config locations, permissions, env vars
- docs/claude/skills.yml - SKILL.md format, discovery, allowed-tools
- CLAUDE.md - Fixed session file naming convention
- README.md (root, memento, onus, mantra) - Fixed session file examples
- memento/.claude/context/project.yml - Fixed session file naming

## Next Steps
- [x] Create GitHub issue for mantra redesign → #74
- [x] Create GitHub issue for memento redesign → #75
- [x] Create GitHub issue for onus redesign → #76
- [ ] Commit architecture-proposal.md updates
- [ ] Close #73 after PR merged
