# Amygdala Design

**Date:** 2026-01-17
**Status:** Ready for implementation
**Branch:** chore/explore-amygdala

## Overview

Amygdala is a feature within memento that extracts behavioral habits from session history and injects them as low-context reflexes. While memento handles *declarative memory* (what happened), amygdala handles *procedural memory* (how to behave).

**Neuroscience parallel:**
- Hippocampus/explicit memory → Memento (sessions, facts)
- Amygdala/implicit memory → Amygdala (habits, reflexes)

### Core Concept

```
Session files (memento) → Pattern extraction → Habits → Automatic injection
```

### Key Constraints

- Habits must be low-context (~10-15 tokens each)
- Habits are behavioral ("when X, do Y") not factual ("user prefers Z")
- Human-in-the-loop approval for all habit changes
- Works offline, no remote infrastructure
- Total habit injection: ~80-100 tokens

### What Amygdala is NOT

- Not a replacement for mantra rules (habits complement, don't replace)
- Not automatic/unsupervised learning (you approve all habits)
- Not a facts database (that's Claude /memory's job)

## Architecture

### Branding

- Skill namespace: `/memento:amygdala`
- Storage namespace: `.claude/amygdala/`
- Documentation: "Memento's Amygdala" feature

### Independence

Amygdala uses memento's existing injection hooks. No dependency on mantra.

```
mantra hooks  → inject rules (independent)
memento hooks → inject session context + amygdala habits (independent)
```

## Storage Structure

### Two-tier storage (global + project)

```
~/.claude/amygdala/
├── habits.md              # Global habits (travel with you)
└── learned/               # Future: analysis artifacts
    └── patterns.json      # Extracted patterns awaiting approval

<project>/.claude/amygdala/
├── habits.md              # Project-specific habits
└── learned/
    └── patterns.json      # Project-specific patterns
```

### Why markdown (not JSON)

- Human-readable and editable
- Easy to manually curate in near-term
- Git-friendly diffs
- Matches mantra rules convention
- Can include comments/context

### Loading order

1. Global habits (`~/.claude/amygdala/habits.md`)
2. Project habits (`.claude/amygdala/habits.md`)

Project habits are additive, not overriding. Both get injected.

### Gitignore considerations

- `habits.md` → committed (shared with team)
- `learned/` → gitignored (personal analysis artifacts)

## Habit Format

### Ultra-compact stimulus → response

```markdown
# Amygdala
error|bug|fail → reproduce → evidence → root-cause → fix
new-feature → types → test-plan → implement
about-to-code → check-existing-patterns
complex-task → break-into-phases → verify-each
commit → test → build → lint → commit
milestone → update-session
null-handling → check-null-before-stream
async-operation → add-grace-period
```

### Format specification

- Left side: trigger/stimulus (context words separated by `|`)
- Arrow `→`: implies automatic response
- Right side: action sequence (steps separated by `→`)

### Token budget

- Target: ~80-100 tokens for all habits
- ~8-10 habits × ~10-12 tokens = efficient injection

## Injection Mechanism

### Where

Memento's existing `SessionStart` hook

### When

Every session start (same as session file detection)

### Implementation

```javascript
// memento/hooks/session-start.js
const globalHabits = loadIfExists(path.join(os.homedir(), '.claude/amygdala/habits.md'));
const projectHabits = loadIfExists('.claude/amygdala/habits.md');

const amygdalaContext = [globalHabits, projectHabits]
  .filter(Boolean)
  .join('\n');

return {
  additionalContext: `
📂 Session: ${sessionPath}
${sessionGuidance}

${amygdalaContext ? `🧠 Amygdala\n${amygdalaContext}` : ''}
  `
};
```

### User sees

```
📂 Session: .claude/sessions/issue-feature-42.md
🧠 Amygdala
error|bug|fail → reproduce → evidence → root-cause → fix
commit → test → build → lint → commit
...
```

## Skills

### `/memento:amygdala`

Show current habits and status.

```
$ /memento:amygdala

🧠 Amygdala Status
Global habits: ~/.claude/amygdala/habits.md (8 habits)
Project habits: .claude/amygdala/habits.md (3 habits)

Current habits:
  error|bug|fail → reproduce → evidence → root-cause → fix
  commit → test → build → lint → commit
  ...
```

### `/memento:amygdala add "<verbose>"`

Takes verbose natural language, compacts to stimulus→response.

```
$ /memento:amygdala add "When I'm debugging a bug, I should always
  reproduce it first, then gather evidence like logs or SQL queries,
  then identify the root cause before writing any fix code"

Compacted:
  bug|debug → reproduce → evidence → root-cause → fix

Add to: (1) global  (2) project? 2
✓ Added to project habits
```

The skill handles:
- Extracting trigger words (bug, debug, commit, etc.)
- Identifying action sequence
- Compressing to `→` chain format
- Asking global vs project
- Writing to appropriate file

### `/memento:amygdala learn` (Phase 2)

Analyze recent sessions, suggest habits for approval.

```
$ /memento:amygdala learn

Analyzing 12 sessions...

Suggested habits (approve with 'y', skip with 'n'):

1. filter-bug → verify-hierarchy-level (appeared 8/12 sessions)
   [y/n]? y ✓ Added

2. state-issue → check-single-source-of-truth (appeared 6/12 sessions)
   [y/n]? n ✗ Skipped
```

### `/memento:amygdala prune` (Phase 2)

Review habits, remove stale ones.

## Coexistence with Mantra

### Key distinction

| Aspect | Mantra Rules | Amygdala Habits |
|--------|--------------|-----------------|
| Format | Rich YAML, BLOCKING requirements | Ultra-compact stimulus→response |
| Enforcement | "You MUST... STOP" - hard stops | Gentle reminder - no enforcement |
| Scope | Specific triggers, verification phrases | General behavioral nudges |
| Token cost | ~100-500 tokens per rule | ~10-15 tokens per habit |
| Purpose | Enforce compliance | Reinforce reflex |

### Example of complementary coexistence

```
MANTRA RULE (behavior.md):
  trigger: user reports error, bug
  priority: BLOCKING
  action: find-documented-evidence-before-fixing
  verify: "Consulting troubleshoot checklist"

AMYGDALA HABIT:
  bug|error → reproduce → evidence → root-cause → fix
```

- Mantra **enforces** the full process with verification
- Amygdala **reminds** of the sequence at a glance

### Coexistence rules

1. **Habits don't override rules** - Mantra BLOCKING requirements always win
2. **Habits are reminders** - Quick glance reference, not enforcement
3. **No duplicate enforcement** - If mantra has a rule, habit is just a nudge
4. **Different triggers** - Habits fire on context; rules fire on explicit user language

## Implementation Plan

### Phase 1: Near-term (manual curation) - ~3-4 hours

| Task | Effort | Files |
|------|--------|-------|
| Create storage structure | 15 min | `~/.claude/amygdala/habits.md` template |
| Add habit loading to SessionStart hook | 1 hour | `memento/hooks/session-start.js` |
| Create `/memento:amygdala` skill (show habits) | 30 min | `memento/commands/amygdala.md` |
| Create `/memento:amygdala add` skill (verbose→compact) | 1.5 hours | `memento/commands/amygdala-add.md` |
| Seed with discovered habits from analysis | 30 min | `habits.md` content |
| Tests | 30 min | `memento/__tests__/amygdala.test.js` |

### Phase 2: Long-term (automatic learning) - ~2-3 days

| Task | Effort |
|------|--------|
| `/memento:amygdala learn` - session analysis | 4-6 hours |
| Pattern extraction algorithm | 4-6 hours |
| Confidence scoring | 2 hours |
| `/memento:amygdala prune` - staleness detection | 2 hours |
| `learned/patterns.json` storage | 1 hour |

### Files to create/modify

```
memento/
├── hooks/
│   └── session-start.js    # MODIFY: add habit loading
├── commands/
│   ├── amygdala.md         # NEW: show habits
│   ├── amygdala-add.md     # NEW: add habit (verbose→compact)
│   ├── amygdala-learn.md   # NEW (phase 2): analyze sessions
│   └── amygdala-prune.md   # NEW (phase 2): remove stale
├── lib/
│   └── amygdala.js         # NEW: habit loading utilities
└── __tests__/
    └── amygdala.test.js    # NEW: tests
```

## Success Criteria

- [ ] Habits appear in session context with 🧠 emoji
- [ ] `/memento:amygdala` shows current habits
- [ ] `/memento:amygdala add "verbose"` compacts and saves
- [ ] Global habits work across projects
- [ ] Project habits are additive
- [ ] ~100 tokens total habit injection

## Research Summary

### Data analyzed

- 139 sessions across 2 projects (client-backend: 89, client-frontend: 50)
- 30,844 lines of session history
- Corpus saved to `/tmp/amygdala-corpus/`

### Discovered universal habits (Tier 1-2, 85-100% frequency)

- Test before commit
- Track files changed
- Pre-implementation context gathering
- Build → lint → test order
- Root cause documentation before fixing
- Type safety first

### Existing alternatives reviewed

- **Claude Diary** - Similar concept, focuses on knowledge not behaviors
- **Mem0** - Extracts facts/preferences, not action patterns
- **USER-LLM** - Model-level user embeddings, not user-controllable
- **CLAUDE.md** - Static rules, no learning loop

### Gap filled by Amygdala

Learned behavioral reflexes from session patterns with human-in-the-loop approval.

## Sources

- [Claude Diary by Lance Martin](https://rlancemartin.github.io/2025/12/01/claude_diary/)
- [Mem0 Chat History Guide](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025)
- [Claude Code Memory Docs](https://code.claude.com/docs/en/memory)
- [Claude Code Feature Request #87](https://github.com/anthropics/claude-code/issues/87)
- [USER-LLM Google Research](https://research.google/blog/user-llm-efficient-llm-contextualization-with-user-embeddings/)
