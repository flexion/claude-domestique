# Analysis: mantra Goals vs Native Claude Code Features

## Executive Summary

**Key Discovery**: Claude Code's native features cover ~70% of mantra's goals. The remaining value is in sibling plugin discovery and YAML compactness. Most critically, **SessionStart fires with `source: "compact"` after compaction**, making periodic re-injection potentially unnecessary.

## Flexion Fundamentals Alignment

mantra's unique value enables these Flexion fundamentals:

| Fundamental | How mantra Enables It |
|-------------|----------------------|
| **Be skeptical and curious** | Anti-sycophancy rules keep Claude questioning assumptions, not pattern-matching |
| **Never compromise on quality** | Consistent behavioral standards from turn 1 to turn 100, preventing drift |
| **Listen with humility** | Peer-not-subordinate stance enforced; Claude defers to evidence over agreement |

Native features provide *capability* (memory loading, status line). mantra provides *behavioral guardrails* that align Claude with how Flexion developers work.

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

## Goal-Focused Analysis

The question isn't "what can mantra do?" but "what delivers the Flexion fundamentals to the installed project?"

### What Actually Delivers Value

| Flexion Fundamental | What Delivers It | Simplest Implementation |
|---------------------|------------------|------------------------|
| **Be skeptical and curious** | Anti-sycophancy rules in `behavior.yml` | Rules content, not mechanism |
| **Never compromise on quality** | Consistent behavioral standards | Rules loaded at session start |
| **Listen with humility** | Peer-not-subordinate rules | Rules content, not refresh frequency |

**Key Insight**: The *content* (behavioral rules) delivers value. The *mechanism* (hooks, periodic refresh) is implementation overhead. A project gets the Flexion value by having the right rules loaded, not by having them refreshed every N prompts.

### Native Features That Deliver This

1. **`.claude/rules/*.md`** - Auto-loaded, hierarchical, path-scoped
2. **CLAUDE.md** - Auto-loaded at session start
3. **SessionStart(compact)** - Fires after compaction, enabling re-injection when needed

### What Remains Unique to mantra

1. **Sibling plugin discovery** - Loading context from memento/onus when co-installed
2. **YAML compactness** - ~89% token reduction vs markdown prose
3. **Curated behavioral rules** - The actual content that enforces skeptical-first, evidence-based behavior

## Simplest Architecture Recommendation

**Principle**: Use native features for loading; use plugin only for what native can't do.

### The Update Problem

When mantra ships improved behavioral rules, how do installed projects get updates?

| Approach | Update Mechanism | Pros | Cons |
|----------|-----------------|------|------|
| **CLAUDE.md instructions** | Points to plugin path | Automatic; keeps YML compact | Requires CLAUDE.md modification |
| **Symlink to plugin** | Automatic | No version tracking | Converts YML→MD; loses compactness |
| **Copy with version marker** | SessionStart checks version | Explicit control | Still needs hook; manual step |
| **PostInstall hook** | Runs on plugin update | Automatic | [Not implemented yet](https://github.com/anthropics/claude-code/issues/11240) |

### Discovery: CLAUDE.md Instruction Pattern

A working example from `portal-D365/CLAUDE.md` shows a simpler approach:

```markdown
## ⚠️ MANDATORY - Load Immediately (Every Session)

**YOU MUST read these files in parallel on EVERY session start using a single message with multiple Read tool calls:**

.claude/context/README.yml       - How to read compact YAML
.claude/context/sessions.yml     - Session workflow & branch tracking
.claude/context/git.yml          - Git workflow rules
.claude/context/behavior.yml     - AI behavior/preferences
.claude/context/test.yml         - Testing strategy
```

**How it works:**
1. CLAUDE.md is auto-loaded by native loading (no hooks)
2. CLAUDE.md contains instructions telling Claude to read YML files
3. Claude complies and reads the YML files at session start
4. YML content loaded into context (token-efficient format preserved)

**Key insight:** The "loading mechanism" IS Claude following instructions. No symlinks, no hooks, just CLAUDE.md telling Claude what to read.

### Recommended: Instruction-Based Distribution

**`/mantra:init` adds to project's CLAUDE.md:**

```markdown
## ⚠️ MANDATORY - Mantra Context (Load Every Session)

**Read these files at session start using parallel Read calls:**

~/.claude/plugins/mantra@claude-domestique/context/behavior.yml
~/.claude/plugins/mantra@claude-domestique/context/test.yml
~/.claude/plugins/mantra@claude-domestique/context/format-guide.yml
```

**Update mechanism:**
- Instructions point to plugin installation path
- When plugin updates, YML files at that path change
- Same instructions → new content loaded automatically

### Implementation: `/mantra:init` Skill

```javascript
// Get plugin installation path
const pluginsFile = path.join(os.homedir(), '.claude/plugins/installed_plugins.json');
const plugins = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
const mantraPlugin = plugins.find(p => p.name === 'mantra@claude-domestique');

// Read existing CLAUDE.md or create new
const claudeMdPath = path.join(cwd, 'CLAUDE.md');
let content = fs.existsSync(claudeMdPath) ? fs.readFileSync(claudeMdPath, 'utf8') : '';

// Check if mantra section already exists
if (content.includes('## ⚠️ MANDATORY - Mantra Context')) {
  console.log('✅ mantra already configured in CLAUDE.md');
  return;
}

// Add mantra section
const mantraSection = `
## ⚠️ MANDATORY - Mantra Context (Load Every Session)

**Read these files at session start using parallel Read calls:**

${mantraPlugin.path}/context/behavior.yml
${mantraPlugin.path}/context/test.yml
${mantraPlugin.path}/context/format-guide.yml
`;

content = mantraSection + '\n' + content;
fs.writeFileSync(claudeMdPath, content);

console.log('✅ mantra context instructions added to CLAUDE.md');
console.log('📍 YML files will auto-update when plugin updates');
```

### Why This Is Better Than Symlinks

| Aspect | Symlinks | CLAUDE.md Instructions |
|--------|----------|------------------------|
| **YML compactness** | ❌ Must convert to MD | ✅ Keep YML (89% token savings) |
| **Native loading** | ✅ Auto-discovered | ✅ Via CLAUDE.md |
| **Updates** | ✅ Automatic | ✅ Automatic |
| **Hooks needed** | ⚠️ Health check | ❌ None for loading |
| **Cross-platform** | ⚠️ Symlink issues | ✅ Just file paths |

### Architecture After Migration

```
Native (handles automatically):
├── CLAUDE.md                        ← Auto-loaded; contains read instructions
└── .claude/rules/*.md               ← Project rules (auto-loaded)

mantra (minimal plugin):
├── context/*.yml                    ← Curated behavioral rules (YML preserved!)
├── /mantra:init skill               ← Adds instructions to CLAUDE.md
└── SessionStart hook                ← Sibling discovery only (optional)
```

### Implementation Changes

| Current | Recommended | Rationale |
|---------|-------------|-----------|
| UserPromptSubmit hook for periodic refresh | **Remove** | CLAUDE.md instructions + SessionStart(compact) handles drift |
| Hook-based context injection | **CLAUDE.md instructions** | Claude reads YML files as instructed |
| Hook-based status display | **Native statusline** | Simpler, no hook overhead |
| Custom context loading | **CLAUDE.md instructions** | Native loading triggers instructions |

### Migration Path

1. **Immediate**: Update `/mantra:init` to add read instructions to CLAUDE.md
2. **Short-term**: Keep context/*.yml (no conversion needed!)
3. **Medium-term**: Simplify SessionStart hook to sibling discovery only
4. **Long-term**: Remove UserPromptSubmit hook entirely; CLAUDE.md instructions are sufficient

## Conclusion

mantra's job is to deliver skeptical-first, evidence-based behavioral guardrails to projects. The **content** delivers this value—the mechanism should be as simple as possible.

### The CLAUDE.md Instruction Pattern (Best of Both Worlds)

| Format | Token Efficiency | Native Loading | Update Mechanism |
|--------|-----------------|----------------|------------------|
| **YAML + Hook injection** | ✅ ~89% reduction | ❌ Requires hook | Hook injects on SessionStart |
| **Markdown + Symlinks** | ❌ Verbose | ✅ Auto-loaded | Symlink auto-updates |
| **YAML + CLAUDE.md instructions** | ✅ ~89% reduction | ✅ Via CLAUDE.md | ✅ Auto-updates |

**Discovery**: CLAUDE.md can instruct Claude to read YML files. This preserves token efficiency AND enables native loading AND auto-updates.

### Final Architecture

- **Keep**: Curated behavioral rules in YML format (token-efficient!)
- **New**: `/mantra:init` adds read instructions to project's CLAUDE.md
- **Delegate to native**: CLAUDE.md auto-loading triggers instructions
- **Remove**: UserPromptSubmit periodic refresh, custom hook-based injection

**The simplest reliable mantra:**
1. `/mantra:init` adds instructions to CLAUDE.md pointing to plugin's context/*.yml
2. Native CLAUDE.md loading triggers the instructions
3. Claude reads YML files as instructed (token-efficient)
4. Plugin updates automatically propagate (same paths, new content)
5. SessionStart hook only needed for sibling discovery (optional)

## Sources

- [Status Line Configuration](https://code.claude.com/docs/en/statusline)
- [Memory Management](https://code.claude.com/docs/en/memory)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Context Compaction FAQ](https://claudelog.com/faqs/what-is-claude-code-auto-compact/)
- [PostCompact Feature Request](https://github.com/anthropics/claude-code/issues/3612)
- [Hook Events Feature Request](https://github.com/anthropics/claude-code/issues/3447)
