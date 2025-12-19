# Session Workflow

## Overview

Sessions are the long-term memory system for Claude projects. They persist work context across conversation resets, branch switches, and team handoffs.

**Core Concept**: 1 Session = 1 Issue = 1 Branch = 1 Branch Metadata File

## The Problem Sessions Solve

**Without sessions:**
- Context lost when conversation reset
- Can't remember what was tried or decided
- No handoff mechanism for teammates
- Work scattered across conversations

**With sessions:**
- Persistent memory across conversations
- Decisions and learnings documented
- Teammates can read session and continue work
- Work traceable to issues/PRs

## Directory Structure

```
.claude/
├── sessions/           # Session files (rich, detailed)
│   ├── 123-add-refresh.md
│   ├── 456-fix-drift.md
│   └── chore-plugin-design.md
└── branches/           # Branch metadata (compact, mapping)
    ├── issue-feature-123-add-refresh
    ├── issue-feature-456-fix-drift
    └── chore-plugin-design
```

## Session Files

**Location**: `.claude/sessions/`

**Naming**:
- Feature: `<IssueNumber>-<desc>.md` (e.g., `123-add-context-refresh.md`)
- Chore: `chore-<desc>.md` (e.g., `chore-plugin-design.md`)

**Content Structure**:

### Feature Session Template
```markdown
# Session: Issue #123 - Add Context Refresh

## Issue Details
- Issue Number: #123
- Title: Add context refresh mechanism
- Created: 2024-12-07
- Status: In Progress
- GitHub URL: https://github.com/flexion/claude-mantra/issues/123

## Objective
Implement periodic context refresh to prevent Claude drift

## Requirements
- Track interaction count
- Trigger refresh at configurable interval
- Inject context via UserPromptSubmit hook
- Make refresh visible to user

## Technical Approach
- Use Claude Code hooks system
- Store state in memory (per-session)
- Read context files from .claude/context/
- Output structured JSON for injection

## Session Log

### 2024-12-07 - Session Created
- Created branch: issue/feature-123/add-context-refresh
- Reviewed existing hook patterns
- Decided on UserPromptSubmit approach

## Key Decisions
1. Hook vs MCP → chose hook (simpler, native to Claude Code)
2. State storage: in-memory (resets each session, acceptable)

## Learnings
- Claude Code hooks use structured JSON output
- additionalContext field injects into conversation

## Files Changed
- `src/hooks/context-refresh.js` - Main hook implementation
- `src/config/defaults.json` - Default configuration

## Next Steps
1. Implement basic hook
2. Add configuration support
3. Test refresh cycle
```

### Chore Session Template
```markdown
# Session: Plugin Design

## Goal
Design the claude-mantra plugin architecture

## Approach
1. Review existing context-refresh agent
2. Determine plugin type (hook/MCP/skill)
3. Design context structure
4. Plan implementation

## Session Log

### 2024-12-07 - Session Created
- Created branch: chore/plugin-design
- Read ideas.txt and context-refresh.md
- Discussed architecture questions

## Next Steps
1. Deep architecture discussion
2. Design context drift indicator
3. Design refresh mechanism
```

## Branch Metadata Files

**Location**: `.claude/branches/`

**Naming**: Branch name with `/` → `-`
- `issue/feature-123/add-refresh` → `issue-feature-123-add-refresh`
- `chore/plugin-design` → `chore-plugin-design`

**Content** (ultra-compact, 3-5 lines):
```
# Branch Metadata
branch: issue/feature-123/add-context-refresh
session: 123-add-context-refresh.md
type: issue
status: in-progress
created: 2024-12-07
last-updated: 2024-12-07
description: add-context-refresh
parent: main
issue: 123

## Current Work
Implementing context refresh hook

## Next Steps
Design hook architecture
```

## Workflow

### Starting New Work

```bash
# Create branch
git checkout -b issue/feature-123/add-context-refresh

# Create session file manually or via tool
# Session file created with template
```

### During Work

**Update session after**:
- Beginning work (document approach)
- After milestone (what completed, decisions made)
- Before pausing (capture current state)
- When blocked (document blocker)
- Before commit (document changes)

**Don't wait** until the end - session is continuous documentation.

### Resuming Work

**User asks**: "What's next?"

**Claude must**:
1. Run `git branch --show-current` (authoritative)
2. Read `.claude/branches/<branch-sanitized>` (verify mapping)
3. Read `.claude/sessions/<session-file>.md` (find "Next Steps")

**NEVER guess** current branch - always check.

### Completing Work

```bash
# Update session with completion
# Commit session + code together (atomic)
git add .claude/sessions/123-add-context-refresh.md
git add src/

git commit -m "$(cat <<'EOF'
#123 - add context refresh hook

- Implement UserPromptSubmit hook
- Add interaction counter
- Create configuration support
- Add tests
EOF
)"

# Create PR
gh pr create --base main --fill

# After merge: mark session complete
```

## Key Patterns

### Session as Memory

When conversation resets or context window fills:
1. Start new conversation
2. Read session file
3. Full context restored
4. Quality of work maintained

### Branch-Session Coupling

```
Branch switch → Session switch (automatic)
```

Metadata file maps branch to session, enabling automatic context loading.

### Atomic Commits

```bash
# Session update + code changes = single commit
git add .claude/sessions/123-add-refresh.md src/
git commit -m "..."
```

Session is versioned WITH the code it describes.

### Handoffs

```
Teammate: git checkout issue/feature-123/add-refresh
→ Read .claude/sessions/123-add-context-refresh.md
→ Full context of what was done, why, what's next
```

## Benefits

### For AI
- Persistent memory across conversations
- Context never lost
- Decisions and rationale preserved
- Pattern learning from past work

### For Developers
- Readable documentation of work
- Handoff mechanism
- Traceability to issues
- Git-versioned context

### For Teams
- Shared understanding of work
- Onboarding artifact
- Historical record
- Knowledge retention

## Best Practices

### Update Frequently
Don't wait until commit - update throughout work.

### Document Decisions
WHY you chose an approach, not just WHAT you implemented.

### Capture Learnings
What did you learn? What surprised you? What would you do differently?

### Keep It Real
Session is truth - don't embellish or hide failures.

### Commit Together
Session + code = atomic commit. They version together.
