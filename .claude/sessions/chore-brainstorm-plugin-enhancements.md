# Session: Brainstorm Plugin Enhancements

## Details
- **Branch**: chore/brainstorm-plugin-enhancements
- **Type**: chore
- **Created**: 2026-01-01
- **Status**: complete

## Goal
Brainstorm and design enhancements to existing plugins (memento, mantra, onus) through collaborative dialogue.

## Approach
1. Review current plugin capabilities
2. Identify pain points and improvement opportunities
3. Design enhancements through iterative Q&A
4. Document final design

## Session Log

### 2026-01-01 - Session Started
- Created branch and session file
- Beginning brainstorming workflow for plugin enhancements

### 2026-01-01 - Brainstorming Complete
- Explored cross-plugin integration opportunities
- Identified key gap: 1:1 issue-session constraint too limiting
- Designed multi-session work items feature through Q&A
- Created implementation plan with 13 tasks across 4 phases
- Created GitHub issue #120 for tracking implementation

## Key Decisions

| Decision | Choice |
|----------|--------|
| Focus area | Cross-plugin: multi-session work items |
| Relationship model | Phases (sequential) + Slices (parallel) |
| Session discovery | Auto-detect existing sessions, prompt user |
| Dependencies | Tracked in session file `Depends-on` field |
| Branching strategy | Rebase from main after phase merges |
| Acceptance criteria | Issue-level only, progressively checked |
| Issue closure | Explicit `/onus:close` with validation |
| Data storage | Session files only (no central index) |

## Files Changed
- .claude/sessions/chore-brainstorm-plugin-enhancements.md
- docs/plans/2026-01-01-multi-session-work-items-design.md
- docs/plans/2026-01-01-multi-session-implementation.md

## Next Steps
1. Start implementation via issue #120 (multi-session work items)
