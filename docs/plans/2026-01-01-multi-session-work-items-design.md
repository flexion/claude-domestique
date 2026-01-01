# Multi-Session Work Items Design

**Date**: 2026-01-01
**Status**: Draft
**Branch**: chore/brainstorm-plugin-enhancements

## Problem Statement

The current plugin architecture assumes 1 issue = 1 branch = 1 session. This breaks down for:
- Large issues that need multiple PRs
- Iterative development with incremental PRs
- Team handoffs where multiple people work on the same issue
- Rework/revisions after initial PR is merged

## Design Summary

| Aspect | Decision |
|--------|----------|
| Relationship model | Phases (sequential) + Slices (parallel) |
| Session discovery | Auto-detect, prompt with options |
| Dependencies | Tracked in session file `Depends-on` field |
| Branching | Rebase from main after phase merges |
| Acceptance criteria | Issue-level, progressively checked |
| Issue closure | Explicit `/onus:close` with validation |
| Data storage | Session files only (no central index) |
| Backward compat | Existing sessions = phase 1, single phase |

## Core Concept

**New model:** 1 issue = N sessions, where sessions can be:
- **Phases** - Sequential work with dependencies (Phase 2 depends on Phase 1)
- **Slices** - Parallel work within a phase (can be done in any order)

**Example flow for issue #42 "Add authentication":**
```
Phase 1: Interfaces (must complete first)
  └── issue/feature-42-p1/interfaces

Phase 2: Implementation (parallel slices)
  ├── issue/feature-42-p2a/backend-auth
  └── issue/feature-42-p2b/frontend-auth

Phase 3: Integration tests
  └── issue/feature-42-p3/integration
```

**Branching convention:**
- `issue/<type>-<N>-p<phase>/description` for phases
- `issue/<type>-<N>-p<phase><letter>/description` for slices within a phase
- Each phase branches from merged main (rebase approach)

## Session File Structure

Each session file gains new metadata fields:

```markdown
# Session: Backend Authentication

## Details
- **Branch**: issue/feature-42-p2a/backend-auth
- **Issue**: #42
- **Type**: feature
- **Phase**: 2
- **Slice**: a
- **Status**: in-progress
- **Created**: 2026-01-01
- **Depends-on**:
  - issue/feature-42-p1/interfaces (complete)

## Goal
Implement JWT authentication for API endpoints.

## Acceptance Criteria (session-specific)
- [ ] POST /auth/login returns JWT token
- [ ] Middleware validates tokens on protected routes
- [ ] Token refresh endpoint working

## Session Log
...
```

**New fields:**
- `Issue`: Links to the parent work item
- `Phase`: Numeric ordering (1 = foundational, higher = later)
- `Slice`: Letter suffix for parallel work within a phase (a, b, c...)
- `Depends-on`: List of sessions that must complete first, with their status

**Session file naming:**
- Pattern: `issue-<type>-<N>-p<phase><slice>-<description>.md`
- Example: `issue-feature-42-p2a-backend-auth.md`

**Status values extended:**
- `pending` - Dependencies not yet complete
- `in-progress` - Active work
- `complete` - PR merged
- `blocked` - Waiting on external dependency

## Workflow & User Experience

### Starting work on an issue (first session)

```
User: /memento:start issue
Claude: What's the issue number?
User: 42
Claude: Fetching #42 "Add authentication"...

        No existing sessions for this issue.
        Creating: issue/feature-42-p1/add-auth

        Is this the only phase, or will there be more?
        (o)nly phase, (f)irst of multiple, (s)kip planning
```

### Adding a subsequent session

```
User: /memento:start issue
User: 42
Claude: Issue #42 has existing sessions:

        Phase 1: [complete] interfaces
        Phase 2: [in-progress] backend-auth (slice a)

        Add as:
        (p)hase 3 - sequential, after phase 2
        (s)lice - parallel with backend-auth (becomes p2b)
        (c)ancel

User: s
Claude: Description for this slice?
User: frontend auth
Claude: Creating: issue/feature-42-p2b/frontend-auth
        Depends-on: issue/feature-42-p1/interfaces
```

### Power-user shortcuts

- `/memento:start issue 42 --phase 2` - Skip prompts, create phase 2
- `/memento:start issue 42 --slice` - Add parallel slice to current phase

### Dependency warnings

```
Claude: Warning: Phase 1 (interfaces) is not yet complete.
        You can start this session, but may be blocked.
        Continue anyway? (y/n)
```

## Issue-Level Tracking & Closure

### Status dashboard (`/onus:status`)

```
Issue #42: Add authentication
Status: In Progress (2 of 3 phases complete)

Acceptance Criteria:
  [x] JWT token generation
  [x] Token validation middleware
  [x] Login endpoint
  [ ] Logout endpoint
  [ ] Password reset flow

Sessions:
  Phase 1: [complete] interfaces        PR #87 merged
  Phase 2: [complete] backend-auth      PR #91 merged
           [in-progress] frontend-auth  branch active
  Phase 3: [pending] integration        waiting on phase 2
```

### Closing an issue (`/onus:close 42`)

```
Claude: Checking issue #42...

        Sessions: 3 complete, 1 in-progress
        Warning: Session "frontend-auth" still in-progress

        Acceptance Criteria: 3/5 complete
        Warning: Unchecked items:
           - Logout endpoint
           - Password reset flow

        Close anyway? (y)es, (n)o, (m)ark remaining as won't-fix
```

### AC tracking across sessions

- AC lives on the issue (fetched from GitHub/JIRA)
- Each session can mark AC items as complete
- Onus syncs completions back to the issue tracker
- `/onus:validate-criteria` checks current state before any PR

**No auto-close:** The system never closes issues automatically. Users decide when work is truly done.

## Implementation Impact

### memento (session management)

- Session file template: add `Issue`, `Phase`, `Slice`, `Depends-on` fields
- `/memento:start`: detect existing sessions, prompt for phase/slice
- Session discovery: find all sessions for an issue by scanning `Issue:` field
- Branch creation: generate phase/slice naming convention
- Status tracking: add `pending`, `blocked` states
- Dependency validation: warn when starting work with incomplete dependencies

### onus (work item integration)

- `/onus:status`: aggregate view across all sessions for an issue
- `/onus:close`: validate sessions and AC before closing
- AC sync: track which items are complete, sync to issue tracker
- Work item cache: store session list per issue

### mantra (context refresh)

- No core changes needed
- Context injection continues per-session as today

### Shared module

- Session parsing: extract phase/slice from branch names
- Issue-session mapping: utility to find sessions by issue number

### Backward compatibility

- Existing sessions (no `Phase` field) treated as "phase 1, only phase"
- Single-session issues continue working unchanged
- New fields are optional; old session files remain valid

## Implementation Phases

1. **Phase 1: Data model** - Update session templates, add new fields, update parsers
2. **Phase 2: memento workflow** - Enhance `/memento:start` with detection and prompts
3. **Phase 3: onus integration** - Add `/onus:status` aggregation, `/onus:close` validation
4. **Phase 4: Documentation** - Update context files, add examples
