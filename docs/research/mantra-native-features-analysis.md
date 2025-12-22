# Analysis: mantra Goals vs Native Claude Code Features

## Executive Summary

**Key Discovery**: Claude Code's native features cover ~70% of mantra's goals. The remaining value is in sibling plugin discovery and YAML compactness. Most critically, **SessionStart fires with `source: "compact"` after compaction**, making periodic re-injection potentially unnecessary.

## mantra's Stated Goals

From README:
1. Context drift prevention (re-injection)
2. Session start refresh
3. Freshness indicator (`📍 Context: 12/20`)
4. Periodic refresh every N interactions
5. Base behavioral rules (skeptical-first, evidence-based)
6. Project extensions (`.claude/context/*.yml`)
7. Sibling plugin discovery
8. CLAUDE.md fallback
9. Lightweight (native hooks)

## Native Claude Code Capabilities

### Memory System (code.claude.com/docs/en/memory)

| Feature | Native Behavior |
|---------|-----------------|
| **CLAUDE.md loading** | Automatic at launch, hierarchical (enterprise → project → user → local) |
| **@import syntax** | Include other files: `@docs/conventions.md` |
| **`.claude/rules/*.md`** | Auto-discovered, supports subdirectories |
| **Path-scoped rules** | YAML frontmatter: `paths: src/**/*.ts` |
| **Symlinks** | Shared rules across projects |

### Status Line (code.claude.com/docs/en/statusline)

| Feature | Native Behavior |
|---------|-----------------|
| **Custom display** | Any script, ANSI colors supported |
| **Rich JSON input** | model, workspace, cost, context_window |
| **Context window info** | `current_usage.input_tokens`, `cache_read_input_tokens` |
| **Update frequency** | Every 300ms on message changes |

### Hook Events (code.claude.com/docs/en/hooks)

| Event | Purpose | Matchers |
|-------|---------|----------|
| **SessionStart** | Session lifecycle | `startup`, `resume`, `clear`, **`compact`** |
| **PreCompact** | Before compaction | `manual`, `auto` |
| **UserPromptSubmit** | Before processing prompt | None |
| **Stop** | Agent finished | None |

### Compaction Behavior

- Triggers at ~64-95% context usage
- Summarizes conversation, replaces old messages
- **SessionStart fires with `source: "compact"` AFTER compaction**
- Users report degradation after compaction ("dumber")

## Gap Analysis

| Goal | Native Coverage | mantra Adds Value? | Notes |
|------|-----------------|-------------------|-------|
| **Session start refresh** | YES (SessionStart hook) | NO | Native does this |
| **Post-compaction refresh** | YES (`source: "compact"`) | NO | SessionStart already fires |
| **Periodic re-injection** | UNNECESSARY | MAYBE | If SessionStart(compact) works, periodic is redundant |
| **Freshness indicator** | PARTIAL | YES | Status line can't track prompt count without state |
| **Behavioral rules** | YES (`~/.claude/rules/`) | NO | Just packaging |
| **Project extensions** | YES (`.claude/rules/`) | NO | Native has MORE features (path-scoping) |
| **Sibling plugin discovery** | NO | **YES** | Unique value |
| **YAML compactness** | NO (markdown only) | **YES** | Token efficiency |
| **Token estimation** | YES (status line JSON) | NO | Native has actual usage |

## Critical Insight: SessionStart(compact)

The hooks documentation shows SessionStart fires with multiple sources:
```json
{
  "hook_event_name": "SessionStart",
  "source": "compact"  // <-- AFTER compaction!
}
```

This means:
1. When auto-compact triggers → SessionStart(compact) fires
2. When `/compact` runs → SessionStart(compact) fires
3. mantra's SessionStart hook ALREADY handles this

**Implication**: Periodic re-injection (every N prompts) may be unnecessary. Context is re-injected when it matters most: after compaction.

## Proposed Architecture Revision

### Option A: Minimal Hook (Recommended)

```
Native Features:
├── ~/.claude/rules/behavior.md      ← Behavioral rules (native loading)
├── .claude/rules/*.md               ← Project rules (native, path-scoped)
├── ~/.claude/statusline.sh          ← Display script (native)
└── CLAUDE.md                        ← Project context (native)

mantra Hook (minimal):
├── SessionStart                     ← Inject sibling plugin context only
└── (remove UserPromptSubmit)        ← Not needed for periodic refresh
```

**What changes:**
1. Move behavioral rules to `~/.claude/rules/`
2. Use native status line for display
3. Keep hook only for sibling plugin discovery
4. Remove periodic refresh logic

### Option B: Status Line + Minimal Hook

```
~/.claude/statusline.sh              ← Shows context freshness
mantra/hooks/context-refresh.js      ← Writes state for statusline + sibling discovery
```

Status line script reads mantra's state file to display freshness.

### Option C: Keep Current Design

If periodic re-injection provides value BEYOND SessionStart(compact), keep current design but:
1. Validate the hypothesis: Does SessionStart(compact) actually fire with full context?
2. Add PreCompact hook to save critical state
3. Consider reducing refresh interval since SessionStart(compact) handles major drift

## Questions to Validate

1. **Does SessionStart(compact) re-inject CLAUDE.md?**
   - If yes, periodic refresh is redundant
   - If no, mantra's value is confirmed

2. **Is YAML compactness worth maintaining?**
   - `.claude/rules/` uses markdown (verbose)
   - `.claude/context/` uses YAML (compact)
   - Trade-off: token efficiency vs native features

3. **How often does compaction actually occur?**
   - If rare, periodic refresh has value
   - If frequent, SessionStart(compact) is sufficient

## Recommendation

**Short-term**: Validate whether SessionStart(compact) properly re-injects context.

**If yes (SessionStart handles it)**:
- Deprecate periodic refresh
- Move behavioral rules to native `~/.claude/rules/`
- Keep hook minimal (sibling discovery only)
- Use native status line for display

**If no (context lost after compact)**:
- Keep current design
- Add PreCompact hook to preserve critical context
- Consider adding custom instructions to compact: `/compact preserve behavioral rules`

## Sources

- [Status Line Configuration](https://code.claude.com/docs/en/statusline)
- [Memory Management](https://code.claude.com/docs/en/memory)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Context Compaction FAQ](https://claudelog.com/faqs/what-is-claude-code-auto-compact/)
- [PostCompact Feature Request](https://github.com/anthropics/claude-code/issues/3612)
- [Hook Events Feature Request](https://github.com/anthropics/claude-code/issues/3447)
