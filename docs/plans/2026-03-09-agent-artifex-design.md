# Design: agent-artifex Plugin

**Date:** 2026-03-09
**Status:** Implemented
**Branch:** chore/add-ai-skill

## Summary

Rename `ai-services` to `agent-artifex` and broaden scope from testing-only to designing and testing AI tool sets and agents. The name follows the classical Latin naming convention of the other domestique plugins (memento, mantra, onus). "Artifex" means craftsman/maker — one who builds tools and agents.

## Skills

Six skills organized into three tracks: routing, education, and operational.

| Skill | Type | Description |
|---|---|---|
| `agent-artifex:guide` | Router | One question, routes to the right skill |
| `agent-artifex:foundations` | Reference | Big-picture framework overview (design + testing) |
| `agent-artifex:learn` | Socratic | Interactive teaching through dialogue |
| `agent-artifex:design` | Principles | 7 design areas, progressive disclosure per area |
| `agent-artifex:assess` | Diagnostic | Audit existing systems for design + testing gaps |
| `agent-artifex:implement` | Operational | Apply design improvements + write tests |

## Flow

```
guide → design (principles) → assess (gaps) → implement (fix + test)
      → foundations / learn (education)
```

## Design Skill — 7 Areas (Progressive Disclosure)

Each area is loaded on demand via per-area reference files. Content sourced from `docs/ai-services/design-for-quality.md`.

1. **Tool Description Design** — Purpose, guidelines, limitations, examples, length, domain-model dependency
2. **Parameter & Schema Design** — Type/meaning/effect/default, naming, enums, output schemas, argument counts, parallel calling
3. **Error Message Design** — Structured errors for LLM consumers, four-part pattern, no stack traces, recovery actions
4. **System Prompt Design** — Capability overlap, conflict types, context budget, ordering, complementarity
5. **Multi-Turn Conversation Design** — Context pressure, coreference, depth degradation, interaction sequence preservation
6. **Tool Set Architecture** — Token budgeting, distribution limits, dynamic discovery, disambiguation, API coverage, one intent per tool
7. **Response Format Design** — Schema consistency, domain fidelity, machine+LLM parsing, verbosity control, claim decomposition

## Testing Areas (in implement skill)

Existing testing content from `ai-services:implement`, reorganized:

1. **Tool Description Quality** — Structural checks, rubric scoring
2. **Server Correctness** — Schema validation, error structure, golden-file tests
3. **Agent Behavior** — Tool selection scenarios, SR/AE/AS metrics
4. **Response Accuracy** — Faithfulness, completeness, claim decomposition
5. **Chatbot Integration** — Coreference, context pressure, workflows, degradation

## Relationship to claude-api:mcp-builder

Complementary, not overlapping:

- **claude-api:mcp-builder** — Scaffolds MCP servers (boilerplate, project structure, tool/resource/prompt definitions)
- **agent-artifex:design** — Design principles for quality
- **agent-artifex:implement** — Applies design principles to existing code + writes tests

## Directory Structure

```
agent-artifex/
├── .claude-plugin/plugin.json
├── references/                    # Shared across skills
│   ├── framework.md
│   ├── metrics.md
│   ├── rubric.md
│   └── evidence.md
├── skills/
│   ├── guide/SKILL.md
│   ├── foundations/SKILL.md
│   ├── learn/SKILL.md
│   ├── design/
│   │   ├── SKILL.md
│   │   └── references/           # Per-area design guidance
│   │       ├── tool-descriptions.md
│   │       ├── parameter-schema.md
│   │       ├── error-messages.md
│   │       ├── system-prompts.md
│   │       ├── multi-turn.md
│   │       ├── tool-set-architecture.md
│   │       └── response-format.md
│   ├── assess/SKILL.md
│   └── implement/
│       ├── SKILL.md
│       └── references/           # Per-area code patterns + test patterns
│           ├── tool-descriptions.md
│           ├── server-correctness.md
│           ├── agent-behavior.md
│           ├── response-accuracy.md
│           └── chatbot-testing.md
```

## Content Sources

| Target | Source |
|---|---|
| Design references (7 files) | `docs/ai-services/design-for-quality.md` (split by section) |
| Testing references (5 files) | Existing `ai-services/skills/implement/references/` |
| Shared references | Existing `ai-services/references/` |
| Skill SKILL.md files | Existing `ai-services/skills/*/SKILL.md` (renamed, updated) |

## Evidence Base

The framework draws from: Hasan et al. (tool description quality), MCP Specification, Anthropic (evals, tool use, advanced tool use), OpenAI (evaluation best practices, function calling), RAGAS (faithfulness/completeness), Google DeepMind (FACTS Grounding), Block Engineering (testing pyramid), Wang et al./MINT (multi-turn), Du et al. (context degradation), Chatterjee & Agarwal (coreference), RFC 9457 (error structure), Fowler (contract testing), Microsoft ISE (chatbot evaluation).
