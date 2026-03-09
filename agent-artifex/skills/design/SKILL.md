---
name: agent-artifex:design
description: |
  Use when the user wants to design an MCP server, agent, chatbot, or tool-calling system for quality. This includes: designing tool descriptions, structuring parameters and schemas, writing error messages for LLM consumers, designing system prompts, planning multi-turn conversations, architecting tool sets, or designing response formats. Also use when someone says "how should I design", "what makes a good tool description", "how should I structure my errors", "design my MCP server", "how do I organize my tools", or any task where they want to follow evidence-based design principles before or while building.
---

# agent-artifex:design — AI Services Design Principles

## When to Use

Design principles for building quality AI services. For scaffolding new MCP servers, use `claude-api:mcp-builder`. For testing what you have built, use `agent-artifex:implement`. For diagnosing gaps, use `agent-artifex:assess`.

## Shared References

| Reference | When to read |
|-----------|-------------|
| `agent-artifex/references/framework.md` | Causal chain, testing pyramid, two-tier model |
| `agent-artifex/references/rubric.md` | Six-component rubric for tool description scoring |
| `agent-artifex/references/evidence.md` | Key empirical numbers and source citations |

## On Invocation

Determine what the user is building and which design area applies:

- Building or modifying tool definitions → **Tool Description Design**
- Defining parameters or schemas → **Parameter & Schema Design**
- Designing error responses → **Error Message Design**
- Writing system prompts → **System Prompt Design**
- Building multi-turn experiences → **Multi-Turn Conversation Design**
- Organizing a tool set → **Tool Set Architecture**
- Designing tool result formats → **Response Format Design**

## Reference Files

Read the relevant file before designing.

| Design Area | Reference File | What it contains |
|-------------|---------------|-----------------|
| Tool Description Design | `references/tool-descriptions.md` | 7 principles with evidence, rubric assessment criteria |
| Parameter & Schema Design | `references/parameter-schema.md` | 6 principles: type/meaning/effect, naming, enums, output schemas, arg counts, parallel calling |
| Error Message Design | `references/error-messages.md` | 5 principles: structured errors, four-part pattern, no internals, minimum density, protocol vs execution |
| System Prompt Design | `references/system-prompts.md` | 5 principles: capability overlap, conflict types, context budget, ordering, complementarity |
| Multi-Turn Conversation Design | `references/multi-turn.md` | 7 principles: context pressure, four factors, positioning, coreference, optimization, degradation, sequence preservation |
| Tool Set Architecture | `references/tool-set-architecture.md` | 7 principles: token budgeting, distribution limits, dynamic discovery, visibility limits, disambiguation, API coverage, one intent |
| Response Format Design | `references/response-format.md` | 6 principles: schema consistency, domain fidelity, dual parsing, verbosity control, two-phase quality, claim decomposition |

## Design by Area

### Tool Description Design

Design tool descriptions that maximize correct tool selection and invocation.

**Before designing, read:** `references/tool-descriptions.md`

**Key principles:**
- Purpose is the most critical component (44% smell-free on Purpose alone, drops to 2.9% across all five).
- Usage Guidelines provide the highest-leverage behavioral cues (P+G alone outperformed full augmentation in Finance).
- Limitations must be concrete or absent (vague limitations degrade SR by 10pp).

**Assessment checklist:**
- [ ] Purpose statement clearly names what the tool does and when to use it
- [ ] Usage Guidelines cover the most common behavioral misuse patterns
- [ ] Limitations are specific and actionable, not vague disclaimers
- [ ] Examples demonstrate non-obvious parameter combinations
- [ ] Description is self-contained — an LLM can select the tool without external context

### Parameter & Schema Design

Design parameters and schemas that minimize invocation errors and ambiguity.

**Before designing, read:** `references/parameter-schema.md`

**Key principles:**
- Every parameter needs type, meaning, behavioral effect, and required/default status.
- Declare output schemas (MCP spec: servers MUST conform).
- Keep under ~20 arguments per tool (in-distribution threshold).

**Assessment checklist:**
- [ ] Each parameter documents its type, meaning, and effect on behavior
- [ ] Required vs optional is explicit with sensible defaults
- [ ] Enums are used where the valid set is closed
- [ ] Output schema is declared and consistent
- [ ] Argument count stays within the ~20 threshold

### Error Message Design

Design error messages that help LLMs recover without human intervention.

**Before designing, read:** `references/error-messages.md`

**Key principles:**
- Structure errors for LLM consumers, not human developers.
- Every error must name: the problem, the causal input, why it failed, what to try instead.
- Never expose stack traces or raw exceptions.

**Assessment checklist:**
- [ ] Errors follow the four-part pattern (problem, cause, reason, remedy)
- [ ] No stack traces or internal implementation details leak through
- [ ] Error density is sufficient for recovery but not overwhelming
- [ ] Protocol-level and execution-level errors are distinguished

### System Prompt Design

Design system prompts that complement tool descriptions without conflicting.

**Before designing, read:** `references/system-prompts.md`

**Key principles:**
- Avoid capability overlap between system prompt and tool descriptions.
- System prompts consume context that tool definitions need (50K-134K tokens for tool defs).
- Explicitly outline tool-call ordering when it matters.

**Assessment checklist:**
- [ ] No capability claims in the system prompt that duplicate tool descriptions
- [ ] Context budget accounts for both system prompt and tool definition tokens
- [ ] Tool-call ordering is specified where sequence matters
- [ ] Conflict types (contradictions, ambiguities) have been audited

### Multi-Turn Conversation Design

Design multi-turn interactions that maintain quality as conversations grow.

**Before designing, read:** `references/multi-turn.md`

**Key principles:**
- Design for context pressure from the start (13.9-85% performance decline from length alone).
- Design explicitly for coreference resolution (up to 18% improvement from explicit tracking).
- Measure the same task at turns 1, 5, 10, 15+.

**Assessment checklist:**
- [ ] Performance is measured across conversation lengths, not just at turn 1
- [ ] Coreference is tracked explicitly rather than relying on implicit resolution
- [ ] Context growth is bounded or managed actively
- [ ] Degradation points are identified and mitigated

### Tool Set Architecture

Design tool sets that scale without overwhelming the model's selection ability.

**Before designing, read:** `references/tool-set-architecture.md`

**Key principles:**
- Tool definitions are expensive — budget them (50K-134K tokens observed).
- Use dynamic discovery for large tool sets (85% token reduction).
- Disambiguate overlapping tools explicitly by cross-referencing in Limitations.

**Assessment checklist:**
- [ ] Total tool definition token cost has been measured
- [ ] Dynamic discovery is used when the tool set exceeds visibility limits
- [ ] Overlapping tools are cross-referenced with explicit disambiguation
- [ ] Each tool maps to one intent (no multi-purpose tools)
- [ ] API coverage is validated against the underlying service

### Response Format Design

Design tool result formats that maximize downstream usefulness.

**Before designing, read:** `references/response-format.md`

**Key principles:**
- Result schemas must be consistent across tools.
- Control result verbosity to manage context pressure.
- Design for claim decomposition — discrete, verifiable facts, not ambiguous aggregations.

**Assessment checklist:**
- [ ] Schema structure is consistent across all tools in the set
- [ ] Results use domain-appropriate fidelity levels
- [ ] Verbosity is controlled to avoid unnecessary context consumption
- [ ] Claims are decomposed into discrete, verifiable facts

## The Causal Chain for Design

Each design area maps to a specific link in the tool-use pipeline:

```
Tool Description Design ─────┐
Parameter & Schema Design ───┤→ Discovery → Tool Selection → Invocation → Response
Tool Set Architecture ───────┘       ↑              ↑            ↑
System Prompt Design ────────────────┘              │            │
Error Message Design ───────────────────────────────┘            │
Response Format Design ─────────────────────────────────────────┘
Multi-Turn Conversation Design → overlay across all links
```

## Cross-Cutting Principles

1. **Impact is domain-and-model-dependent.** No single configuration works universally. Test your specific descriptions against your specific model.
2. **Context budget awareness.** Everything costs tokens. Tool definitions, system prompts, and tool results all compete for the same context window.
3. **Design for the LLM consumer.** The LLM reads your descriptions, interprets your errors, and synthesizes your results. Design for it, not for human developers reading logs.

## Recommended Next Step

- After designing, use `agent-artifex:assess` to check for gaps.
- Ready to apply improvements, use `agent-artifex:implement`.
