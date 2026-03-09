# agent-artifex Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename `ai-services` to `agent-artifex`, broaden scope from testing-only to designing and testing AI tool sets and agents, add `design` skill with progressive disclosure, split testing into separate `test` skill, rename `architect` to `guide`.

**Architecture:** The existing `ai-services/` directory becomes `agent-artifex/`. All skill SKILL.md files are updated with new naming. A new `design` skill is created with 7 per-area reference files extracted from `docs/ai-services/design-for-quality.md`. The existing `implement` skill's testing content moves to a new `test` skill. `implement` is rewritten to cover applying design improvements. `assess` broadens to cover both design and testing gaps.

**Tech Stack:** Markdown skill files with YAML frontmatter. No build step — skills are pure markdown.

---

### Task 1: Create agent-artifex directory structure

**Files:**
- Create: `agent-artifex/.claude-plugin/plugin.json`
- Create: `agent-artifex/README.md`

**Step 1: Create plugin.json**

```json
{
  "name": "agent-artifex",
  "description": "Agent Artifex — designing and testing MCP servers, agents, chatbots, and tool-calling systems using evidence-based patterns from Anthropic, OpenAI, RAGAS, and academic research",
  "author": {
    "name": "Flexion"
  },
  "repository": "https://github.com/flexion/claude-repertoire",
  "homepage": "https://github.com/flexion/claude-repertoire",
  "license": "MIT",
  "keywords": [
    "design",
    "testing",
    "ai-services",
    "mcp",
    "agents",
    "chatbots",
    "evals",
    "flexion"
  ]
}
```

**Step 2: Create README.md**

Write the README based on the approved design document at `docs/plans/2026-03-09-agent-artifex-design.md`. Include:
- Plugin description (designing + testing AI tool sets and agents)
- Skill table (guide, foundations, learn, design, assess, implement)
- Flow diagram (guide → design → assess → implement; guide → foundations/learn)
- The causal chain diagram
- The 7 design areas
- The 5 testing areas
- Reference architecture (directory structure)
- Relationship to `claude-api:mcp-builder`
- Evidence base summary

Model the README structure on the existing `ai-services/README.md`.

**Step 3: Commit**

```bash
git add agent-artifex/.claude-plugin/plugin.json agent-artifex/README.md
git commit -m "chore - scaffold agent-artifex plugin structure"
```

---

### Task 2: Copy shared references

The shared reference files are unchanged in content. Copy them from `ai-services/references/` to `agent-artifex/references/`.

**Files:**
- Create: `agent-artifex/references/framework.md` (copy from `ai-services/references/framework.md`)
- Create: `agent-artifex/references/metrics.md` (copy from `ai-services/references/metrics.md`)
- Create: `agent-artifex/references/rubric.md` (copy from `ai-services/references/rubric.md`)
- Create: `agent-artifex/references/evidence.md` (copy from `ai-services/references/evidence.md`)

**Step 1: Copy the four reference files**

```bash
mkdir -p agent-artifex/references
cp ai-services/references/framework.md agent-artifex/references/
cp ai-services/references/metrics.md agent-artifex/references/
cp ai-services/references/rubric.md agent-artifex/references/
cp ai-services/references/evidence.md agent-artifex/references/
```

**Step 2: Update any internal references**

Search each file for `ai-services` and replace with `agent-artifex`. Search for skill name references like `ai-services:implement` and replace with `agent-artifex:implement` (etc. for all skills). Note: `architect` becomes `guide`.

**Step 3: Commit**

```bash
git add agent-artifex/references/
git commit -m "chore - copy shared references to agent-artifex"
```

---

### Task 3: Create the guide skill (renamed from architect)

**Files:**
- Create: `agent-artifex/skills/guide/SKILL.md`

**Step 1: Write SKILL.md**

Based on `ai-services/skills/architect/SKILL.md` but with these changes:
- Rename from `ai-services:architect` to `agent-artifex:guide`
- Update all skill cross-references (`ai-services:*` → `agent-artifex:*`, `architect` → `guide`)
- Add a fourth routing path: **Path 4: Designing** — routes to `agent-artifex:design` when user says "help me design my MCP server", "how should I structure my tools?", "what makes a good tool description?"
- Update the existing troubleshooting routing to reference `agent-artifex:design` where appropriate (e.g., "The FM picks the wrong tool" → `design` for description improvements + `implement` to apply them)
- Update the skill table to include all 6 skills (guide, foundations, learn, design, assess, implement)
- Update the YAML frontmatter `name` and `description` fields

The orienting question becomes:

> **"Are you learning about designing and testing AI services, assessing gaps in an existing project, designing a new system, or ready to implement improvements?"**

Routing paths:
1. **Learning** → `agent-artifex:foundations` (read) or `agent-artifex:learn` (interactive)
2. **Assessing** → `agent-artifex:assess` → `agent-artifex:implement`
3. **Designing** → `agent-artifex:design` → `agent-artifex:implement`
4. **Implementing** → `agent-artifex:implement`
5. **Troubleshooting** — symptom-based routing (same table as before, updated skill names, add design-related symptoms)

**Step 2: Commit**

```bash
git add agent-artifex/skills/guide/SKILL.md
git commit -m "chore - add agent-artifex guide skill"
```

---

### Task 4: Create the foundations skill

**Files:**
- Create: `agent-artifex/skills/foundations/SKILL.md`

**Step 1: Write SKILL.md**

Based on `ai-services/skills/foundations/SKILL.md` but with these changes:
- Rename from `ai-services:foundations` to `agent-artifex:foundations`
- Update all skill cross-references
- Add a new section: **"The Seven Design Areas"** summarizing the design principles from `docs/ai-services/design-for-quality.md` (one paragraph per area, pointing to `agent-artifex:design` for full detail)
- Update the "Five Testing Areas" section heading to distinguish from design areas
- Update shared reference paths from `ai-services/references/` to `agent-artifex/references/`
- Update the "Recommended Next Step" section to include `agent-artifex:design`

**Step 2: Commit**

```bash
git add agent-artifex/skills/foundations/SKILL.md
git commit -m "chore - add agent-artifex foundations skill"
```

---

### Task 5: Create the learn skill

**Files:**
- Create: `agent-artifex/skills/learn/SKILL.md`

**Step 1: Write SKILL.md**

Based on `ai-services/skills/learn/SKILL.md` but with these changes:
- Rename from `ai-services:learn` to `agent-artifex:learn`
- Update all skill cross-references
- Update the orienting question to include design:

> **"What's your experience with designing and testing AI systems — are you starting from scratch, or do you already have something built and want to improve it?"**

- Add design topics to Path A (Starting from Scratch): insert a step between "The Big Picture" and "Tool Description Quality" that introduces the 7 design areas and explains how design decisions cause downstream quality issues
- Add design topics to Path B (Filling Gaps): add rows for design-related gaps ("We built our MCP server but the FM picks the wrong tool" → design, "Our tool descriptions are a mess" → design)
- Add design topics to Path C (Deep Dive): add "Tool set architecture", "Error message design for LLMs", "System prompt and tool description interaction"
- Update shared reference paths
- Update "Recommended Next Step" to include `agent-artifex:design`

**Step 2: Commit**

```bash
git add agent-artifex/skills/learn/SKILL.md
git commit -m "chore - add agent-artifex learn skill"
```

---

### Task 6: Create design skill reference files (7 files)

Extract each section from `docs/ai-services/design-for-quality.md` into a per-area reference file. Each file should contain:
- The design principles (numbered, with footnotes)
- The assessment criteria
- Cross-references to related testing areas and the `implement` skill

**Files:**
- Create: `agent-artifex/skills/design/references/tool-descriptions.md`
- Create: `agent-artifex/skills/design/references/parameter-schema.md`
- Create: `agent-artifex/skills/design/references/error-messages.md`
- Create: `agent-artifex/skills/design/references/system-prompts.md`
- Create: `agent-artifex/skills/design/references/multi-turn.md`
- Create: `agent-artifex/skills/design/references/tool-set-architecture.md`
- Create: `agent-artifex/skills/design/references/response-format.md`

**Step 1: Extract each section**

For each of the 7 sections in `docs/ai-services/design-for-quality.md`:
- Copy the section content (design principles + assessment criteria) into the corresponding reference file
- Add a header: `# [Area Name] — Design Reference`
- Add a footer linking to the related testing area: "To test these design decisions → `agent-artifex:implement` (area: [testing area name])"
- Preserve all footnotes and evidence citations
- Add cross-references between related design areas (e.g., tool-descriptions.md should reference parameter-schema.md)

Source mapping:

| Section in design-for-quality.md | Reference file | Related testing area |
|---|---|---|
| 1. Tool Description Design | `tool-descriptions.md` | Tool Description Quality |
| 2. Parameter & Schema Design | `parameter-schema.md` | Tool Description Quality + Server Correctness |
| 3. Error Message Design | `error-messages.md` | Server Correctness |
| 4. System Prompt Design | `system-prompts.md` | Chatbot Integration |
| 5. Multi-Turn Conversation Design | `multi-turn.md` | Chatbot Integration |
| 6. Tool Set Architecture | `tool-set-architecture.md` | Tool Description Quality + Agent Behavior |
| 7. Response Format Design | `response-format.md` | Server Correctness + Response Accuracy |

**Step 2: Commit**

```bash
git add agent-artifex/skills/design/references/
git commit -m "chore - add design skill reference files"
```

---

### Task 7: Create the design skill SKILL.md

**Files:**
- Create: `agent-artifex/skills/design/SKILL.md`

**Step 1: Write SKILL.md**

This is a new skill. Structure it like `ai-services:implement` — an entry point that determines which design area applies, then loads the per-area reference file.

YAML frontmatter:
```yaml
---
name: agent-artifex:design
description: |
  Use when the user wants to design an MCP server, agent, chatbot, or tool-calling system for quality. This includes: designing tool descriptions, structuring parameters and schemas, writing error messages for LLM consumers, designing system prompts, planning multi-turn conversations, architecting tool sets, or designing response formats. Also use when someone says "how should I design", "what makes a good tool description", "how should I structure my errors", "design my MCP server", "how do I organize my tools", or any task where they want to follow evidence-based design principles before or while building.
---
```

Content structure:

1. **When to Use** — Design principles for quality. For scaffolding, use `claude-api:mcp-builder`. For testing what you've built, use `agent-artifex:implement`.

2. **On Invocation** — Determine what the user is building and which design area applies:
   - Building/modifying tool definitions → Tool Description Design
   - Defining parameters or schemas → Parameter & Schema Design
   - Designing error responses → Error Message Design
   - Writing system prompts → System Prompt Design
   - Building multi-turn experiences → Multi-Turn Conversation Design
   - Organizing a tool set → Tool Set Architecture
   - Designing tool result formats → Response Format Design

3. **Reference Files table** — List all 7 reference files with "read before designing" instruction

4. **Design by Area** — For each of the 7 areas, provide:
   - One-sentence description of what it covers
   - "Before designing, read:" → reference file path
   - 3-4 key principles (summary, not full content — that's in the reference)
   - Assessment criteria (brief checklist)
   - Related testing: which testing area validates these decisions

5. **The Causal Chain for Design** — Show how each design area maps to the causal chain:
   ```
   Tool Description Design ─┐
   Parameter & Schema Design ┤→ Discovery → Tool Selection → Invocation → Response
   Tool Set Architecture ────┘       ↑              ↑            ↑
   System Prompt Design ─────────────┘              │            │
   Error Message Design ────────────────────────────┘            │
   Response Format Design ──────────────────────────────────────┘
   Multi-Turn Conversation Design → overlay across all
   ```

6. **Cross-Cutting Principles** —
   - Domain-and-model-dependent: test your specific descriptions against your specific model
   - Context budget awareness: everything costs tokens
   - Design for the LLM consumer, not the human developer

7. **Recommended Next Step** — After designing → `agent-artifex:assess` to check for gaps, or `agent-artifex:implement` to apply and test

**Step 2: Commit**

```bash
git add agent-artifex/skills/design/SKILL.md
git commit -m "chore - add agent-artifex design skill"
```

---

### Task 8: Create the assess skill

**Files:**
- Create: `agent-artifex/skills/assess/SKILL.md`

**Step 1: Write SKILL.md**

Based on `ai-services/skills/assess/SKILL.md` but with these changes:
- Rename from `ai-services:assess` to `agent-artifex:assess`
- Update all skill cross-references
- **Broaden scope:** The assessment now covers both design quality AND testing gaps
- Update the YAML frontmatter `description` to include design assessment triggers: "how is my tool design?", "are my descriptions good enough?", "review my error messages", "is my system prompt well-designed?"

**Pass 1 (Inventory) changes:**
- Add question: "Have you followed design guidelines for your tool descriptions, error messages, and schemas?"
- Add codebase checks for design quality: description length, parameter annotations, error message structure, output schema presence, tool count, system prompt size

**Pass 2 (Gap Analysis) changes:**
- Add a design quality assessment section before the testing gap analysis
- For each of the 7 design areas, assess: Not designed / Partially designed / Well-designed
- Signals for design gaps mirror the assessment criteria from the design references

**Pass 3 (Prioritized Recommendations) changes:**
- Interleave design and testing recommendations by impact
- Default priority: design fixes first (they're cheaper and improve everything downstream), then testing
- Updated priority order:
  1. Tool description design improvements (highest impact, lowest cost)
  2. Error message design (fix for LLM recovery)
  3. Tool description quality structural checks (Tier 1 testing)
  4. Server correctness deterministic tests
  5. Parameter & schema design review
  6. Response accuracy Tier 1
  7. Agent behavior recorded replay
  8. Agent behavior live scenarios
  9. Response accuracy Tier 2
  10. Chatbot integration

**Output format changes:**
- Add "Design Quality" row to the assessment matrix alongside testing gaps
- Add design recommendations interleaved with testing recommendations

Update "Recommended Next Step":
- For design gaps → `agent-artifex:design` to learn the principles, then `agent-artifex:implement` to apply
- For testing gaps → `agent-artifex:implement`

**Step 2: Commit**

```bash
git add agent-artifex/skills/assess/SKILL.md
git commit -m "chore - add agent-artifex assess skill"
```

---

### Task 9: Rewrite the implement skill

**Files:**
- Create: `agent-artifex/skills/implement/SKILL.md`
- Create: `agent-artifex/skills/implement/references/tool-descriptions.md` (copy from `ai-services/skills/implement/references/tool-descriptions.md`)
- Create: `agent-artifex/skills/implement/references/server-correctness.md` (copy from `ai-services/skills/implement/references/server-correctness.md`)
- Create: `agent-artifex/skills/implement/references/agent-behavior.md` (copy from `ai-services/skills/implement/references/agent-behavior.md`)
- Create: `agent-artifex/skills/implement/references/response-accuracy.md` (copy from `ai-services/skills/implement/references/response-accuracy.md`)
- Create: `agent-artifex/skills/implement/references/chatbot-testing.md` (copy from `ai-services/skills/implement/references/chatbot-testing.md`)

**Step 1: Copy testing reference files**

```bash
mkdir -p agent-artifex/skills/implement/references
cp ai-services/skills/implement/references/*.md agent-artifex/skills/implement/references/
```

Update any `ai-services` references in the copied files to `agent-artifex`.

**Step 2: Write SKILL.md**

The `implement` skill is **broadened** — it now covers both applying design improvements AND writing tests. It is the "hands-on" skill that makes changes to actual code.

YAML frontmatter:
```yaml
---
name: agent-artifex:implement
description: |
  Use when the user wants to improve an existing MCP server, agent, chatbot, or tool-calling system. This includes: improving tool descriptions, fixing error messages, adding output schemas, writing tests, implementing quality checks, adding evals, setting up test harnesses, or any task where they say "help me improve", "fix my descriptions", "add tests", "write evals", "implement quality checks", "make my server better", "apply the design principles", or are ready to make code changes to improve quality. This skill covers both design application (making the code better) and test implementation (verifying the code is good). For scaffolding new projects, use claude-api:mcp-builder. For design principles without code changes, use agent-artifex:design.
---
```

Content structure:

1. **When to Use** — Hands-on improvement skill. Covers applying design principles to existing code AND writing tests. For scaffolding new projects → `claude-api:mcp-builder`. For principles without code changes → `agent-artifex:design`. For gap diagnosis → `agent-artifex:assess`.

2. **On Invocation** — Determine what the user needs:
   - **Design application:** Improving tool descriptions, fixing error messages, adding schemas, restructuring tool sets → read the corresponding `design/references/` file for principles, then apply
   - **Test implementation:** Writing quality checks, evals, test harnesses → read the corresponding `implement/references/` file for code patterns
   - **Both:** Improve the code AND add tests (the ideal flow)

3. **Reference Files** — Two tables:
   - Design references (for applying improvements): point to `agent-artifex/skills/design/references/`
   - Testing references (for writing tests): point to `agent-artifex/skills/implement/references/`

4. **Implementation by Area** — For each of the 5 testing areas, keep the existing content from `ai-services:implement` (the tables of what to implement, tier info, CI info, key principles, metrics, pass criteria)

5. **Design Application by Area** — For each of the 7 design areas, provide:
   - What to look for in existing code
   - What to change (concrete actions)
   - How to verify the improvement (assessment criteria from the design references)
   - Link to design reference for full principles

6. **Cross-Cutting Implementation Guidance** — Keep the existing CI vs on-demand table, when to run on-demand, minimum test coverage, causal chain for debugging

7. **Recommended Next Step** — After implementing → run tests, trace causal chain for failures, use `agent-artifex:assess` periodically

**Step 3: Commit**

```bash
git add agent-artifex/skills/implement/
git commit -m "chore - add agent-artifex implement skill"
```

---

### Task 10: Remove old ai-services directory

**Files:**
- Delete: `ai-services/` (entire directory)

**Step 1: Verify agent-artifex is complete**

Check that all files exist in `agent-artifex/`:
```bash
find agent-artifex -name "*.md" -o -name "*.json" | sort
```

Expected output:
```
agent-artifex/.claude-plugin/plugin.json
agent-artifex/README.md
agent-artifex/references/evidence.md
agent-artifex/references/framework.md
agent-artifex/references/metrics.md
agent-artifex/references/rubric.md
agent-artifex/skills/assess/SKILL.md
agent-artifex/skills/design/SKILL.md
agent-artifex/skills/design/references/error-messages.md
agent-artifex/skills/design/references/multi-turn.md
agent-artifex/skills/design/references/parameter-schema.md
agent-artifex/skills/design/references/response-format.md
agent-artifex/skills/design/references/system-prompts.md
agent-artifex/skills/design/references/tool-descriptions.md
agent-artifex/skills/design/references/tool-set-architecture.md
agent-artifex/skills/foundations/SKILL.md
agent-artifex/skills/guide/SKILL.md
agent-artifex/skills/implement/SKILL.md
agent-artifex/skills/implement/references/agent-behavior.md
agent-artifex/skills/implement/references/chatbot-testing.md
agent-artifex/skills/implement/references/response-accuracy.md
agent-artifex/skills/implement/references/server-correctness.md
agent-artifex/skills/implement/references/tool-descriptions.md
agent-artifex/skills/learn/SKILL.md
```

**Step 2: Remove ai-services directory**

```bash
rm -rf ai-services/
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore - remove old ai-services directory, replaced by agent-artifex"
```

---

### Task 11: Update docs references

**Files:**
- Modify: `docs/ai-services/README.md` — add note that the plugin has been renamed to `agent-artifex`
- Modify: `docs/plans/2026-03-09-agent-artifex-design.md` — update status to "Implemented"

**Step 1: Update docs/ai-services/README.md**

Add a note at the top:
```markdown
> **Note:** The plugin formerly known as `ai-services` has been renamed to `agent-artifex`. The source documents in this directory remain the canonical references. The plugin skills are in `agent-artifex/`.
```

**Step 2: Update design doc status**

Change `**Status:** Approved` to `**Status:** Implemented`

**Step 3: Commit**

```bash
git add docs/ai-services/README.md docs/plans/2026-03-09-agent-artifex-design.md
git commit -m "chore - update docs references for agent-artifex rename"
```

---

### Task 12: Update session file

**Files:**
- Modify: `.claude/sessions/chore-add-ai-skill.md`

**Step 1: Update session with completed work**

```markdown
# Session: add-ai-skill

## Details
- **Branch**: chore/add-ai-skill
- **Type**: chore
- **Created**: 2026-03-09
- **Status**: in-progress

## Goal
Rename ai-services plugin to agent-artifex. Broaden scope from testing-only to designing and testing AI tool sets and agents. Add design skill with 7 areas from design-for-quality.md. Rename architect to guide. Broaden implement to cover design application + testing.

## Session Log
- 2026-03-09: Session created
- 2026-03-09: Brainstormed and approved design (docs/plans/2026-03-09-agent-artifex-design.md)
- 2026-03-09: Created implementation plan (docs/plans/2026-03-09-agent-artifex-implementation.md)
- 2026-03-09: Implemented agent-artifex plugin (tasks 1-11)

## Next Steps
1. Install and test the plugin locally
2. Verify all skill invocations work
```

**Step 2: Commit**

```bash
git add .claude/sessions/chore-add-ai-skill.md
git commit -m "chore - update session file for agent-artifex"
```
