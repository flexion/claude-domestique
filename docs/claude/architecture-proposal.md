# Hook Architecture Redesign Proposal

## Core Principle: Right Tool for the Job

| Need | Tool | Why |
|------|------|-----|
| Exact same output every time | Command hook (JS) | Deterministic execution |
| File I/O, git commands, state | Command hook (JS) | External system access |
| Judgment calls, interpretation | Skill or Slash Command | LLM flexibility |
| Decision gates (allow/block) | Prompt hook | Haiku-evaluated decisions |
| User-initiated complex ops | Slash Command | Explicit control |
| Auto-triggered complex ops | Skill | Context-based discovery |

## Current Problem

All three plugins use command hooks for EVERYTHING:
- State management ✓ (correct)
- File reading ✓ (correct)
- Context building ✓ (correct)
- Complex logic (session creation, issue formatting) ✗ (could be skills)

### Duplication
- Each plugin has ~500 LOC doing similar things
- All three run in parallel on each prompt
- No coordination between hooks

## Proposed Separation

### Layer 1: Command Hooks (Deterministic)
Minimal JS that does ONLY what requires determinism:

```
SessionStart:
  - Reset counters
  - Detect branch
  - Check file existence
  - Return: paths, status, minimal context

UserPromptSubmit:
  - Increment counters
  - Check for changes (branch switch, staged files)
  - Return: status line only
```

### Layer 2: Context Files (Static)
Claude Code loads `context/*.yml` files. Let the platform do the work.

**Question**: Does Claude Code auto-load plugin context files?
- If YES: Remove context injection from hooks
- If NO: Keep in hooks but simplify (single pass)

### Layer 3: Skills (LLM-Invoked)
For operations requiring judgment:

```
memento:session-manager
  - Create session with appropriate template
  - Update session with progress
  - Triggered by: "session created", "update reminder"

onus:work-item-handler
  - Format work item context
  - Suggest commit message
  - Triggered by: "issue #N", "staged changes"
```

### Layer 4: Slash Commands (User-Invoked)
For explicit user control:

```
/memento:session update
/onus:fetch 123
/mantra:refresh
```

## Hook → Skill Communication

Hooks cannot invoke skills directly. But hooks CAN:

1. **Inject trigger context** that matches skill description
2. **Suggest commands** in additionalContext

Example flow:
```
Hook outputs: "📂 Session: path/to/session.md\nNew session created."

Skill description: "Manage sessions. Use when a new session is created..."

Claude sees context → matches skill → invokes skill
```

This is INDIRECT but works if:
- Skill descriptions are specific
- Hook context contains trigger keywords

## Determinism Spectrum

```
Most Deterministic                              Least Deterministic
     │                                                    │
     ▼                                                    ▼
Command Hook ─────── Slash+Bash ─────── Slash ─────── Skill
     │                    │               │              │
  exact output      deterministic     interpreted    auto-triggered
  every time        data + LLM        by LLM        by context
```

## Plugin Behavior Analysis

### mantra - Hybrid (Hook + Skill)

**Purpose:** Override default Claude behaviors for better coding partnership.

**Two-Tier Content Model:**
- Tier 1 (yml): Compact rules - always injected, deterministic
- Tier 2 (md): Verbose examples - on-demand, non-deterministic

| Behavior | Determinism | Tool |
|----------|-------------|------|
| Track interaction count | **YES** - exact counter | Hook |
| Reset counter on session start | **YES** - must reset to 0 | Hook |
| Read context/*.yml files | **YES** - exact content | Hook |
| Aggregate sibling plugin context | **YES** - exact content | Hook |
| Report context size by location | **YES** - byte counts | Hook |
| Decide WHEN to refresh | **YES** - count % 5 === 0 (fixed) | Hook |
| Detect behavior drift | **NO** - judgment required | Skill |
| Load verbose *.md files | **NO** - on-demand | Skill |

**Simplified Status Line:**
```
📍 Mantra: (1/5): mantra(423), memento(231), onus(121), project(43)
         count/interval  ───── size in bytes per source ─────
```

**Changes from Current:**
- Remove configurable interval (hardcode to 5)
- Add size reporting by source location
- Add drift-detection skill for md loading

**Recommendation:**
- Hook: Inject compact yml, report sizes, fixed interval
- Skill: Detect drift, load verbose md on-demand

### memento - Hybrid (Hook + Skill)

**Purpose:** Persist working context to survive interruptions and enable knowledge transfer.

**Use Cases:**
- Context full → developer clears it
- Accidental close
- Transfer to another developer (git commit)
- Historical lookup of requirements, design, troubles, implementation

**Deterministic (Hook):**

| Behavior | Event | Implementation |
|----------|-------|----------------|
| Detect current branch | SessionStart, UserPromptSubmit | `git rev-parse` |
| Get git root | SessionStart | `git rev-parse --show-toplevel` |
| Calculate session file path | All events | `{gitRoot}/.claude/sessions/{branch}.md` |
| Check if session exists | All events | `fs.existsSync` |
| Detect branch switch | UserPromptSubmit | Compare current vs previous |
| Create empty session file | SessionStart (if missing) | Minimal template |
| Report session status | All events | Status line |
| Trigger pre-compaction save | PreCompact | Signal to skill |
| Read session for resumption | SessionStart (resume) | Inject Next Steps |

**Non-Deterministic (Skill):**

| Behavior | Trigger |
|----------|---------|
| Populate new session with goal/approach | New session created |
| Update with requirements | User provides/changes requirements |
| Update with design decisions | Decision made during work |
| Update with architecture notes | Architectural choices |
| Update with debugging findings | Problem solved |
| Update with compromises/tradeoffs | Tradeoff made |
| Update with work plan (Next Steps) | Plan changes |
| Update before compaction | PreCompact signal |

**Status Line:**
```
📂 Memento: 73-hook-event-redesign.md (2h ago)
📂 Memento: NEW → 73-hook-event-redesign.md
📂 Memento: SWITCHED → chore-update-deps.md
```

**Changes from Current:**
- Remove counter-based reminder (wrong model)
- Add PreCompact hook for pre-compaction persistence
- Event-driven detection, not interval-based
- Skill handles all content decisions

**Recommendation:**
- Hook: Event-driven detection + status reporting
- Skill: Knowledge-driven persistence + intelligent updates

### onus - Mixed (Hook + Skill)

| Behavior | Determinism | Tool |
|----------|-------------|------|
| Detect current branch | **YES** - exact branch name | Hook |
| Extract issue from branch | **YES** - pattern matching | Hook |
| Detect platform (github/jira) | **YES** - deterministic | Hook |
| Check for staged changes | **YES** - boolean | Hook |
| Load/save work item cache | **YES** - exact data | Hook |
| Return issue number | **YES** - exact number | Hook |
| Create placeholder work item | **MAYBE** - could be smarter | Could be skill |
| Format work item context | **MAYBE** - could adapt | Could be skill |
| Fetch issue from GitHub/JIRA | **NO** - external API | Skill |
| Suggest commit message | **NO** - context-aware | Skill |
| Track acceptance criteria | **NO** - requires judgment | Skill |

**Recommendation:**
- Hook: Branch detection + issue extraction + cache management
- Skill: Issue fetching, context formatting, commit suggestions

## Specific Recommendations

### mantra
**Hybrid: Hook + Skill**

Hook changes:
- Remove configurable refresh interval (hardcode to 5)
- Add size reporting per source: `mantra(423), memento(231), onus(121), project(43)`
- Keep yml injection deterministic
- Simplify: remove config file loading for interval

New skill:
- `context-refresh` skill for on-demand md loading
- Triggers on drift detection or explicit request
- Loads verbose examples when Claude needs detail

### memento
**Hybrid: Hook + Skill**

Hook changes:
- Remove counter-based reminder (wrong model for purpose)
- Add PreCompact event hook for pre-compaction persistence
- Event-driven: detect branch, session existence, branch switch
- Status line shows: filename + last modified time

New/enhanced skill:
- Populate new sessions with inferred goal/approach
- Update session with requirements, decisions, debugging findings
- Respond to PreCompact signal to preserve context
- Knowledge-driven, not interval-driven

### onus
**Split: hook + skill**
- Hook: Extract issue from branch, check cache, return status line
- Skill: Format work item context, suggest commits (already `/onus:fetch`)
- Hook suggests: "Use /onus:fetch to load issue details"
- Skill handles API calls, formatting, suggestions

## Implementation Questions

1. ~~Does Claude Code auto-load context/*.yml?~~
   - **ANSWERED: NO.** Claude Code does not auto-load context files.
   - Hooks must inject context. Mantra's core purpose remains necessary.

2. Can we consolidate to fewer hooks?
   - Single SessionStart hook that coordinates?
   - Risk: Loses plugin independence
   - **Consideration:** Keep separate but make each leaner

3. Skill discovery reliability?
   - How reliably does context trigger skill?
   - Need testing
   - **Mitigation:** Use specific trigger keywords in hook output

## Metrics for Success

- Fewer LOC in hooks (target: 50% reduction for memento/onus)
- Clearer separation of concerns (deterministic vs judgment)
- Skills handle judgment, hooks handle data
- Reduced parallel execution overhead
- Better user experience (smarter suggestions)
