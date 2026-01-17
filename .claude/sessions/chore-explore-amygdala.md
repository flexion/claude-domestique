# Session: Explore Amygdala

## Details
- **Branch**: chore/explore-amygdala
- **Type**: chore
- **Created**: 2026-01-17
- **Status**: in-progress

## Goal
Explore the idea of parsing session files to discover basic behaviors or habits that apply universally across all work. Like the real amygdala, these habits should:
- Use minimal context (low token cost)
- Apply automatically without conscious thought
- Be reflexive patterns learned from past sessions

## Concept
The amygdala in neuroscience handles rapid, automatic responses - fight/flight, emotional memory. This exploration asks: can we extract similar "reflexes" from session history?

Examples of potential "habits":
- Always check branch before committing
- Run tests after edits
- Update session logs at milestones
- Verify file exists before editing

## Approach
1. Analyze session file structure for patterns
2. Identify recurring behaviors across sessions
3. Design extraction mechanism
4. Prototype habit representation format
5. Consider injection strategy (low-context, universal)

## Session Log

### 2026-01-17 - Session Started
- Created branch and session file
- Initial concept: parse sessions for universal, low-context habits

### 2026-01-17 - Session Analysis Complete
- Analyzed 139 sessions across 2 projects (portal-D365: 89, Portal-D365-WebApp: 50)
- Discovered 10+ candidate universal habits with 60-100% frequency

## Discovered Habits (Sorted by Universality)

### Tier 1: Reflexive (100% frequency - truly automatic)
| Habit | Description | Token Cost |
|-------|-------------|------------|
| **Test before commit** | Run tests before any commit | ~10 tokens |
| **Track files changed** | Maintain explicit list of modified files | ~15 tokens |
| **Pre-impl context** | Read relevant files before changing them | ~10 tokens |

### Tier 2: Near-Reflexive (85-95% frequency)
| Habit | Description | Token Cost |
|-------|-------------|------------|
| **Build-lint-test order** | Verify in sequence: build → lint → test | ~15 tokens |
| **Root cause first** | Document root cause before fixing bugs | ~20 tokens |
| **Checklist progression** | Use `[x]` checkboxes to track work | ~10 tokens |
| **Type safety first** | Add types before implementation | ~15 tokens |

### Tier 3: Strong Habits (65-80% frequency)
| Habit | Description | Token Cost |
|-------|-------------|------------|
| **Evidence gathering** | Get data/logs/SQL to prove root cause | ~25 tokens |
| **Multi-phase breakdown** | Large features split into numbered phases | ~20 tokens |
| **Test plan before code** | Document test scenarios before implementing | ~25 tokens |
| **Session as live doc** | Update session during work, not after | ~15 tokens |
| **Reuse over create** | Find existing patterns before creating new | ~15 tokens |

### Tier 4: Project-Influenced (40-60% frequency)
| Habit | Description | Token Cost |
|-------|-------------|------------|
| **Backward compat notes** | Explicitly note BC impact of changes | ~20 tokens |
| **Message text review** | Craft user-facing messages carefully | ~15 tokens |
| **Redux for persistence** | State that survives navigation → Redux | ~20 tokens |

## Key Insight: Context-Elevation Sequence

A universal debugging workflow emerges across ALL sessions:
1. Problem observation (user report, test failure)
2. Reproduction (isolate scenario)
3. Evidence gathering (SQL, logs, API responses)
4. Root cause naming ("Root cause: ...")
5. Solution design (before code)
6. Implementation (with tests)
7. Verification (test run)

This is NOT enforced by tools but appears **consistently automatic**.

## Habit vs Rule Distinction

| Aspect | Habit (Amygdala) | Rule (Mantra) |
|--------|------------------|---------------|
| Context | Minimal (~10-25 tokens) | Rich (100+ tokens) |
| Trigger | Implicit/automatic | Explicit trigger condition |
| Scope | Universal | Project/domain-specific |
| Enforcement | Gentle reminder | Blocking requirement |
| Learning | Extracted from behavior | Authored by humans |

## Notes
- Key constraint: habits must be "breathing-level" automatic
- Should not require significant context to apply
- Think: what would Claude's muscle memory look like?
- **Finding**: The context-elevation sequence is the strongest candidate for automatic injection

## Recurring Problem Themes (Cross-Project)

### Tier 1: Universal Themes (Both Projects)
| Theme | Backend Freq | Frontend Freq | Description |
|-------|-------------|---------------|-------------|
| **Data Sync** | 18 | 10 | Systems diverge (Portal vs D365, API vs types) |
| **Null/Edge Cases** | 14 | 8 | Assumptions about non-null values fail |
| **Filter Scope** | 12 | 14 | Filters at wrong level or inconsistent rules |
| **State Complexity** | 11 | 12 | Multi-location state, orchestration timing |
| **Type Mismatches** | 9 | 8 | Entity models don't match reality |
| **Spec Ambiguity** | 5 | 6 | Requirements unclear → rework |

### Tier 2: Backend-Specific Themes
| Theme | Frequency | Root Causes |
|-------|-----------|-------------|
| **Status Transitions** | 12 | No state locking, race conditions, premature promotion |
| **Pricing Calc** | 8 | Multiple price fields, unclear precedence |
| **Hierarchy Aggregation** | 11 | Firm vs Planning, coverage allocation |
| **Time/Timezone** | 7 | LocalDateTime vs Instant, UTC vs Central |

### Tier 3: Frontend-Specific Themes
| Theme | Frequency | Root Causes |
|-------|-----------|-------------|
| **Redux Scatter** | 12 | Same state in 3+ locations, inconsistent updates |
| **CSS Specificity** | 4 | Utility class conflicts, trial-and-error |
| **Event Propagation** | 3 | Bubbling interferes with click handlers |

### Dominant Root Cause Clusters

1. **Orchestration Timing** - Wrong order of operations, lazy initialization, no locking
2. **Data Model Gaps** - Missing fields in ephemeral objects, dual representations
3. **Scope Boundaries** - Filters at wrong hierarchy level, incomplete conditions
4. **Concurrency** - Race conditions, no grace periods, stale data
5. **Contract Drift** - Backend changes without frontend type updates

### Problem → Habit Candidates

| Recurring Problem | Potential Habit |
|-------------------|-----------------|
| Type mismatches | "Types before implementation" |
| State scatter | "Single source of truth per concept" |
| Filter scope bugs | "Verify filter hierarchy level" |
| Race conditions | "Add grace period for async ops" |
| Null crashes | "Check null before stream()" |
| Orchestration bugs | "Verify operation order before mutation" |

## Corpus Files
- `/tmp/amygdala-corpus/portal-d365-all.md` (22,704 lines)
- `/tmp/amygdala-corpus/webapp-all.md` (8,140 lines)
- Total: 30,844 lines of session history

## Refined Definition

> **Amygdala**: Dynamically evolving behavioral roles that emerge from observed session patterns. Each role contains habits (reflexes) weighted by frequency and recency. Roles activate based on context recognition.

### Proposed Architecture: Roles → Habits

```
Amygdala
  └── Roles (context-activated behavioral modes)
        └── Habits (individual reflexes)
```

**Example Roles:**
```
┌─────────────────────────────────────────────────┐
│ DEBUGGER ROLE (activated by: error, bug, fail) │
│  - Reproduce first                             │
│  - Gather evidence (logs, SQL, API responses)  │
│  - Name root cause explicitly                  │
│  - Solution design before code                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ IMPLEMENTER ROLE (activated by: feature, add)  │
│  - Types before implementation                 │
│  - Test plan before code                       │
│  - Multi-phase breakdown                       │
│  - Reuse over create                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ COMMITTER ROLE (activated by: commit, PR)      │
│  - Test before commit                          │
│  - Build-lint-test order                       │
│  - Track files changed                         │
│  - Session update                              │
└─────────────────────────────────────────────────┘
```

### Hybrid Storage Model

```
~/.claude/amygdala/global.json       # Universal habits (Tier 1-2)
.claude/amygdala/habits.json         # Project-specific habits (Tier 3-4)
```

### Dynamic Evolution Concept

```javascript
{
  habit: "Check null before stream()",
  role: "implementer",
  confidence: 0.72,  // Appeared in 72% of relevant sessions
  trend: "rising",   // Frequency increasing over last 10 sessions
  lastSeen: "2026-01-15"
}
```

---

## Code Review Results (2026-01-17)

**Assessment**: Ready for architecture refinement, not yet ready for implementation planning.

### Important Issues to Address

#### 1. Missing Methodology Documentation
- How were frequency percentages calculated?
- Manual review vs automated pattern matching?
- What criteria determined a "match" for each habit?

**Action needed**: Document methodology before implementation

#### 2. Mantra Overlap Not Addressed
Several discovered habits already exist as mantra rules:

| Discovered Habit | Existing Mantra Rule |
|------------------|---------------------|
| "Test before commit" | `test: after-each-component` |
| "Root cause first" | `action: find-documented-evidence-before-fixing` |
| "Type safety first" | `defensive: required (security, data-integrity)` |
| "Pre-impl context" | `strategy: gather-context-upfront` |

**Action needed**: Define coexistence strategy
- What habits should NEVER overlap with mantra rules?
- Priority when both apply (which wins?)
- Complementary vs conflicting guidance examples

#### 3. Hybrid Architecture Needs Conflict Resolution
- What happens when global habit conflicts with project habit?
- Can project habits override global habits?
- How are project-specific habits identified vs global?

**Action needed**: Document conflict resolution before implementation

### Minor Issues / Suggestions

1. **Token Cost Estimates Need Validation** - Actually encode habits and count tokens
2. **Context-Elevation Sequence Deserves Elevation** - Consider as "meta-habit" or "workflow template"
3. **Problem-to-Habit Mapping is Reactive** - Add proactive habits that prevent problems
4. **Habit Staleness Not Addressed** - Need deprecation, confidence decay, recalculation triggers
5. **Only 2 Projects Analyzed** - Same org, same domain - "universal" not yet validated

### Strengths Noted

- ✅ Solid conceptual foundation (biological metaphor works)
- ✅ Rigorous data collection (139 sessions, 30K+ lines)
- ✅ Well-structured tier system
- ✅ Clear habit vs rule distinction
- ✅ Problem theme analysis adds depth

### What's Still Missing

1. Extraction algorithm design (session text → structured habits)
2. Injection mechanism (hook-based? different timing?)
3. Feedback loop (user corrections, good habit reporting)
4. Cross-project validation (different domains needed)
5. Storage format specification (JSON schema)

### Readiness Assessment

| Aspect | Status |
|--------|--------|
| Concept clarity | ✅ Ready |
| Data collection | ✅ Complete |
| Habit discovery | ✅ Complete (for 2 projects) |
| Architecture design | ⚠️ Needs more work |
| Extraction algorithm | ❌ Not started |
| Coexistence with Mantra | ⚠️ Needs documentation |
| Implementation plan | ❌ Not ready |

---

## Files Changed
- `docs/plans/2026-01-17-amygdala-design.md` - NEW: Complete design document

## Next Steps
1. ~~Review existing session files for pattern examples~~ ✅
2. ~~Define what qualifies as a "habit" vs a "rule"~~ ✅
3. ~~Discover problem themes across projects~~ ✅
4. ~~Request code review~~ ✅
5. ~~Brainstorm design decisions~~ ✅
6. ~~Define Amygdala/Mantra coexistence rules~~ ✅
7. ~~Design conflict resolution for hybrid architecture~~ ✅
8. ~~Write design document~~ ✅
9. ~~Create issue for Phase 1 implementation~~ ✅ → #126
10. Implement Phase 1 (manual curation) → issue/feature-126/amygdala-habits

## Brainstorming Decisions (2026-01-17)

- **Primary goals**: Cross-project learning, reduced rule maintenance
- **Near-term approach**: Manual curation via `/memento:amygdala add`
- **Long-term approach**: Batch analysis via `/memento:amygdala learn`
- **Architecture**: Amygdala as memento feature (not separate plugin)
- **Branding**: `/memento:amygdala` skill, `.claude/amygdala/` storage
- **Habit format**: Ultra-compact stimulus→response (~10-15 tokens each)
- **Injection**: Via memento's existing SessionStart hook (no mantra dependency)
- **Coexistence**: Habits reinforce mantra rules, don't override

## Design Document

Written to: `docs/plans/2026-01-17-amygdala-design.md`
