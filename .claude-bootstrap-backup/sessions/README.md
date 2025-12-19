# Session Files

Session files track work state across context resets and provide shared knowledge for the team.

## Purpose

- **Long-term memory:** Persist state when conversation context resets
- **Team handoff:** Other developers can read sessions to understand work
- **Documentation:** Sessions document decisions, blockers, and context
- **Traceability:** Map work to GitHub issues/discussions

## Format

```markdown
# Chore: <Description>

## Objective
What are we trying to accomplish?

## Approach
How are we approaching this?

## What's Been Done
- [x] Completed item
- [x] Another completed item

## Next Steps
- [ ] TODO item
- [ ] Another TODO

## Context & Decisions
Important context, decisions made, blockers encountered

## Files Changed
- path/to/file1
- path/to/file2
```

## Naming Convention

- **Chores:** `chore-<description>.md`
- **Example:** `chore-implement-phase-1-core-structure.md`

## Workflow

### Create Session
```bash
# Create branch
git checkout -b chore/implement-phase-1-scripts

# Create session
.claude/tools/create-branch-metadata.sh

# This creates:
# - .claude/branches/chore-implement-phase-1-scripts
# - .claude/sessions/chore-implement-phase-1-scripts.md
```

### Update Session
During work, update the session file:
- Mark completed items in "What's Been Done"
- Update "Next Steps"
- Add context/decisions as discovered

### Commit Session
Sessions are committed WITH code changes (atomic commits):
```bash
# Stage both code and session
git add commands/next.md
git add .claude/sessions/chore-implement-phase-1-scripts.md

# Commit together
git commit -m "chore - implement /next command"
```

## Why Sessions Are In Git

**Shared Knowledge:**
- Team members see what was done and why
- New developers understand context
- Decisions are documented
- Blockers are visible

**Continuity:**
- Work survives context resets
- Can pause and resume weeks later
- Multiple people can contribute
- History is preserved

**Not Gitignored:**
Unlike personal preferences (which might go in `.claude/personal/`), sessions are shared team knowledge and belong in version control.
