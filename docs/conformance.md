# Plugin Conformance Decisions

This document records deliberate decisions about conformance to official Claude Code plugin patterns. Each pattern is either adopted, documented as a divergence with rationale, or marked as our innovation.

## Pattern Status Summary

| Pattern | Status | Notes |
|---------|--------|-------|
| Hook implementation (Node.js) | ✅ Adopted | Claude Code requires Node.js |
| Commands (`commands/*.md`) | ✅ Aligned | Same pattern |
| Plugin manifest | ✅ Aligned | Same `.claude-plugin/plugin.json` |
| Portable paths (`${CLAUDE_PLUGIN_ROOT}`) | ✅ Adopted | Used in hooks.json |
| Agents directory | 🔄 Adopt when needed | Will use for #48 |
| Skills directory | 🔄 Adopt when needed | Will use for #48 |
| Config format (YAML vs frontmatter) | 📝 Divergent | Token-efficient choice |
| Context system (two-tier yml/md) | 🆕 Innovation | No official equivalent |
| Session persistence | 🆕 Innovation | No official equivalent |

---

## Detailed Decisions

### 1. Hook Implementation: Node.js

**Decision:** Keep Node.js

**Rationale:**
- Claude Code CLI is an npm package requiring Node.js
- Using Node.js adds zero additional dependencies
- Our hooks do JSON parsing, state management, file I/O — natural in Node.js
- Consistent toolchain across all plugins

**Official approach:** Shell/Python scripts
**Our approach:** Node.js scripts
**Trade-off:** Slightly less portable, but more powerful and dependency-free for Claude Code users

---

### 2. Commands Directory

**Decision:** Already aligned

**Pattern:** `commands/*.md` with YAML frontmatter

Both official plugins and claude-domestique use this pattern. No changes needed.

---

### 3. Agents Directory

**Decision:** ✅ Adopt when needed

**Pattern:** `agents/*.md` with frontmatter (name, description, model, tools)

**Rationale:** Agents are model-invoked for specialized tasks. Hooks are for automated injection. Different purposes, both valuable.

**Plan:** Will adopt this pattern in #48 and #49/#50 for:
- `memento/agents/session-manager.md`
- `onus/agents/commit-helper.md`
- `onus/agents/pr-generator.md`

**Frontmatter format:**
```yaml
---
name: agent-name
description: When to invoke this agent
model: haiku|sonnet|opus
tools: Read, Bash, Edit, etc.
---

System prompt content here...
```

---

### 4. Skills Directory

**Decision:** ✅ Adopt for user-facing capabilities

**Pattern:** `skills/*/SKILL.md` with trigger descriptions

**Rationale:** Skills and context serve different purposes:
- Skills = "Claude, help me with X" (model decides when relevant, user-visible)
- Context = "Claude, remember these rules" (auto-injected, invisible)

**Action needed:** Identify what current context content should migrate to skills.

**Plan:** Will adopt in #48 for:
- `memento/skills/session-manager/SKILL.md`
- `onus/skills/work-item-handler/SKILL.md`

These complement (not replace) our context system.

---

### 5. Portable Paths (`${CLAUDE_PLUGIN_ROOT}`)

**Decision:** ✅ Already conformant

**Audit results:**
- ✅ `hooks.json` files use `${CLAUDE_PLUGIN_ROOT}` for command paths
- ✅ JS files use `__dirname` for runtime path resolution (correct)

**Distinction:**
- `${CLAUDE_PLUGIN_ROOT}` is a template variable expanded by Claude Code in config files (config-time)
- `__dirname` is the Node.js runtime path, appropriate for running code (runtime)

No changes needed.

---

### 6. Config Format: YAML vs Markdown Frontmatter

**Decision:** ✅ Keep pure YAML for context; adopt frontmatter for agents/skills

**Rationale:**

| Aspect | Pure YAML | Markdown + Frontmatter |
|--------|-----------|------------------------|
| Token efficiency | Better (~850 vs ~7,750) | Worse |
| Human editing | Requires learning format | More familiar |
| Use case | Machine-injected context | User-visible components |

**Our approach:**
- `context/*.yml` — Compact, token-efficient, auto-injected, **AI-managed**
- `context/*.md` — Detailed examples, loaded on-demand
- `agents/*.md`, `skills/*.md` — Frontmatter pattern (matches official)

**Key insight:** Context files are meant to be managed by Claude, not hand-edited by users. Users describe changes in natural language; Claude writes the token-efficient YAML.

**Follow-up:** #58 to document this for users.

---

### 7. Context System (Two-Tier yml/md)

**Decision:** Our innovation — no official equivalent

**What we provide:**
- `context/*.yml` — Compact rules, machine-optimized
- `context/*.md` — Detailed examples, human-readable

**Why it matters:**
- Prevents context drift in long conversations
- ~89% token reduction vs prose
- Periodic refresh via mantra plugin

**Official plugins lack:** Any equivalent context management system. This is our differentiator.

---

### 8. Session Persistence

**Decision:** Our innovation — no official equivalent

**What memento provides:**
- Branch ↔ session mapping
- Work context tracking (goal, approach, log, decisions)
- Cross-conversation persistence

**Official plugins lack:** Any session tracking mechanism. This fills a gap in the ecosystem.

---

## Implementation Tracker

| Pattern | Issue | Status |
|---------|-------|--------|
| Agents directory | #48, #49, #50 | Pending |
| Skills directory | #48 | Pending |
| Document AI-managed context | #58 | Pending |
| All others | N/A | Complete |

---

## References

- [Official plugins](https://github.com/anthropics/claude-code/tree/main/plugins)
- [plugin-dev toolkit](https://github.com/anthropics/claude-code/tree/main/plugins/plugin-dev)
- Research session: `.claude/sessions/chore-research-official-plugins.md`
