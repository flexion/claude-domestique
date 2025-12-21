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

## Design Principles

### Plugin Independence
Each plugin MUST function standalone. Sibling plugins enhance but are never required.

| Plugin | Standalone Behavior | Enhanced by |
|--------|---------------------|-------------|
| mantra | Injects own context, tracks refresh | - |
| memento | Detects branch, manages sessions | mantra (periodic refresh) |
| onus | Detects work items, CRUD operations | mantra (context refresh), memento (session integration) |

### Context Injection Ownership
- **Each plugin injects its own context** when running standalone
- **Mantra aggregates** sibling context when installed (enhancement, not requirement)
- If mantra is present: mantra collects context from all plugins and injects together
- If mantra is absent: each plugin injects its own context/*.yml files

### Single Responsibility
| Plugin | Owns | Does NOT own |
|--------|------|--------------|
| mantra | Context refresh, behavior guidance | Sessions, work items |
| memento | Session files, branch→session mapping | Issue numbers, commit formats |
| onus | Work items, issue numbers, commit/PR formats | Session content |

Memento creates sessions for ALL branches — it doesn't distinguish between `issue/feature-73/...` and `chore/whatever`. Everything gets a session.

### Minimal Code Principle
**Hooks delegate to skills as soon as possible.**

Hook responsibilities (ONLY):
1. Intercept the event
2. Do ONLY what ABSOLUTELY MUST be deterministic (counter increment, file existence check)
3. Hand off to skill immediately

Skill responsibilities:
- Receive the GOAL, not just the task
- Optimize for the outcome, not myopic sub-tasks

**Example - Wrong (task-focused):**
```
Skill: "Create a session file for branch X"
→ Claude creates file mechanically
```

**Example - Right (goal-focused):**
```
Skill: "Help developer resume work efficiently after interruption.
       Current branch: X. Session file: Y (exists/missing)."
→ Claude understands PURPOSE and can make intelligent decisions
```

**Target:** Hooks should be <50 LOC each. All intelligence lives in skills.

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

### onus - Hybrid (Hook + Skill)

**Purpose:** Full work item integration layer for Claude Code sessions.

**Core Principle:** When onus is installed, it owns all tooling integration. Memento maintains lightweight git awareness for standalone use, but defers to onus when present.

**Use Cases:**
- Full CRUD operations on work items (read, create, update, delete)
- Download complete work items (title, body, comments, images, attachments)
- Reference downloaded work items throughout session without API calls
- Know active work item at all times, including surprise branch switches
- Generate properly formatted branches, commits, and PRs

**Supported Platforms:**
- GitHub Issues
- Azure DevOps Boards
- JIRA Issues
- (Configurable per project via `/onus:init`)

**Work Item Storage:**
- Download location: `~/.claude/onus/work-items/{project}/{key}/`
- NOT in source repo (prevents leaking sensitive info)
- Manual refresh only (user controls when to re-fetch)
- Full content: title, body, comments, images, attachments

**Configurable Formats (with defaults):**
| Format | Default | Override via |
|--------|---------|--------------|
| Branch naming | `issue/feature-{N}/{slug}` | `.claude/config.json` |
| Commit title | `#{N} - {verb} {desc}` | `.claude/config.json` |
| Commit body | Bullet list | `.claude/config.json` |
| PR title | `#{N} - {desc}` | `.claude/config.json` |
| PR body | Summary + Test plan | `.claude/config.json` |

**Commit Requirements:**
- No attribution to Claude (no co-authored-by, no AI mentions)
- Recommend SSH/GPG signing (surface in init and context)

**Plugin Relationships:**

Memento-Onus:
- Memento standalone: branch detection, session creation for ALL branches
- Memento + onus: no change — memento doesn't know about onus
- Memento does NOT delegate to onus; they operate independently
- Onus adds work item awareness; memento adds session persistence

Onus-Mantra:
- Onus standalone: injects own context/*.yml, detects work items
- Onus + mantra: mantra aggregates onus context with others (enhancement)
- Onus does NOT depend on mantra for context injection

**Deterministic (Hook):**

| Behavior | Event | Implementation |
|----------|-------|----------------|
| Get current branch | All events | `git rev-parse --abbrev-ref HEAD` |
| Get git root | SessionStart | `git rev-parse --show-toplevel` |
| Extract issue from branch | All events | Configurable regex patterns |
| Detect platform | All events | From project config or pattern match |
| Check staged changes | UserPromptSubmit | `git diff --cached --name-only` |
| Detect branch switch | UserPromptSubmit | Compare current vs saved |
| Load project config | SessionStart | `.claude/config.json` |
| Check for downloaded work item | All events | `~/.claude/onus/work-items/{project}/{key}/` |
| Load/save state | All events | `~/.claude/onus/state.json` |
| Generate status line | All events | Exact format output |

**Non-Deterministic (Skill):**

| Behavior | Trigger | Skill |
|----------|---------|-------|
| Download work item (full) | `/onus:fetch {N}` | work-item-handler |
| Refresh work item | `/onus:fetch {N} --refresh` | work-item-handler |
| Create work item | `/onus:create` | work-item-handler |
| Update work item | `/onus:update {N}` | work-item-handler |
| Close/delete work item | `/onus:close {N}` | work-item-handler |
| Suggest commit message | Staged changes + work item context | work-item-handler |
| Generate branch name | New work item or `/onus:branch` | work-item-handler |
| Format PR | `/onus:pr` or commit flow | work-item-handler |
| Track acceptance criteria | Code changes vs AC checklist | work-item-handler |

**Status Line:**
```
📋 Onus: 73 (downloaded) | staged
📋 Onus: 73 (not downloaded) → /onus:fetch 73
📋 Onus: PROJ-123 (jira, downloaded 2h ago)
📋 Onus: no work item → /onus:fetch or /onus:create
```

**Init Flow (`/onus:init`):**
1. Detect or ask: GitHub / Azure DevOps / JIRA
2. Configure authentication (token location, etc.)
3. Set format overrides (branch, commit, PR)
4. Recommend SSH/GPG commit signing
5. Write to `.claude/config.json`

**Recommendation:**
- Hook: Detection only (branch, root, switch, downloaded-check)
- Skill: All CRUD operations, formatting, suggestions

## Specific Recommendations

### mantra
**Minimal Hook → Skill Handoff**

Hook (~30 LOC):
```
SessionStart/UserPromptSubmit:
  1. Increment counter
  2. Check if refresh due (counter % interval === 0)
  3. Return: { counter, refreshDue, contextPaths[] }
  → Skill handles context loading and injection
```

Skill goal:
```
"Keep Claude aligned with project conventions throughout long sessions.
 Prevent context drift where Claude forgets guidance as conversation grows.
 Counter: N. Refresh due: yes/no. Context locations: [paths]."
```

Skill responsibilities:
- Load and inject context/*.yml files
- Aggregate sibling plugin context when present
- Load verbose *.md files on-demand when Claude needs examples
- Detect behavior drift and reinforce guidance

### memento
**Minimal Hook → Skill Handoff**

Hook (~40 LOC):
```
SessionStart/UserPromptSubmit:
  1. Get current branch
  2. Get git root
  3. Calculate session path
  4. Check if session exists
  5. Detect branch switch (compare to saved)
  6. Return: { branch, gitRoot, sessionPath, exists, switched }
  → Skill handles session creation, content, updates
```

Skill goal:
```
"Help developer resume work efficiently after any interruption.
 Preserve working context so knowledge isn't lost when conversation resets.
 Branch: X. Session: Y (exists/missing/switched). Git root: Z."
```

Skill responsibilities:
- Create new sessions with meaningful structure (not just template)
- Populate with inferred goal based on branch name
- Update with requirements, decisions, debugging findings
- Read session for resumption context
- Respond to PreCompact signal to preserve context before reset

### onus
**Minimal Hook → Skill Handoff**

Hook (~50 LOC):
```
SessionStart/UserPromptSubmit:
  1. Get current branch
  2. Extract issue key from branch (regex)
  3. Detect platform (github/jira/azure from key format)
  4. Check if work item downloaded (~/.claude/onus/work-items/{project}/{key}/)
  5. Check staged changes (git diff --cached)
  6. Return: { branch, issueKey, platform, downloaded, staged }
  → Skill handles everything else
```

Skill goal:
```
"Connect developer's work to the tracking system (GitHub/JIRA/Azure).
 Ensure commits, branches, and PRs follow project conventions.
 Keep work item context available without repeated API calls.
 Issue: N. Platform: X. Downloaded: yes/no. Staged: yes/no."
```

Skill responsibilities:
- CRUD operations on work items (fetch, create, update, close)
- Download complete work items (title, body, comments, images, attachments)
- Format commits/branches/PRs according to project config
- Suggest commit messages based on staged changes + work item
- Track acceptance criteria progress

Commands:
- `/onus:fetch {N}` - download full work item
- `/onus:create` - create new work item
- `/onus:update {N}` - update work item
- `/onus:close {N}` - close work item
- `/onus:init` - configure project (platform, auth, formats)

Storage:
- Work items: `~/.claude/onus/work-items/{project}/{key}/`
  - `item.json` - title, body, status, labels
  - `comments.json` - all comments
  - `attachments/` - downloaded images/files
- State: `~/.claude/onus/state.json`
- Config: `.claude/config.json` (in project)

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

- **Hook LOC targets:** mantra ~30, memento ~40, onus ~50 (vs current ~500 each)
- **Skills receive goals**, not tasks — Claude optimizes for outcomes
- **Clear separation:** hooks detect, skills decide and act
- **Independence verified:** each plugin works standalone
- **Less code = less maintenance** — intelligence lives in skills, not hooks
