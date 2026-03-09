# System Prompt Design — Design Reference

System prompts and tool definitions compete for the same context window and the same LLM attention. This section covers what the evidence supports — the interaction between system prompts and tool definitions.

## Design Principles

**1. Avoid capability overlap between system prompt and tool descriptions.** When the system prompt contains domain knowledge that overlaps with a tool's domain, the LLM may answer from the prompt instead of calling the tool. If a tool returns product pricing, the system prompt should not also contain a pricing table.

**2. Design for four conflict types.** (a) Instruction conflict: system prompt says "always respond in JSON" but a tool returns markdown. (b) Naming collision: two MCP servers both expose a `query` tool. (c) Priority ambiguity: system prompt says "be concise" but tool results are verbose. (d) Capability overlap: system prompt describes information that a tool returns. Each creates a different failure mode and requires different mitigation.

**3. System prompts consume context that tool definitions need.** Tool definitions can consume 50,000+ tokens before an agent reads a request — Anthropic internally observed up to 134K tokens.[^1] Callable function definitions count against the model's context limit and are billed as input tokens.[^2] Keep system prompts lean — behavioral instructions, not domain knowledge.

[^1]: Anthropic, "Introducing Advanced Tool Use" — Tool definitions "can sometimes consume 50,000+ tokens before an agent reads a request." Anthropic internally observed 134K tokens.
[^2]: OpenAI, "Function Calling" — "callable function definitions count against the model's context limit and are billed as input tokens."

**4. Explicitly outline tool-call ordering when it matters.** The system prompt is the right place to encode workflow sequencing, not the individual tool descriptions.[^3] When multiple tools must be called in a specific order, state the sequence explicitly: "To create a deployment, first call get_environments, then call create_release with the environment ID."

[^3]: OpenAI, "o3/o4-mini Function Calling Guide" — "It can make mistakes in the order of the tool calls. To guard against these cases, it is recommended to explicitly outline the orders to accomplish certain tasks."

**5. System prompt instructions should complement, not duplicate, tool descriptions.** Duplication wastes context tokens and creates a maintenance burden where changes must be synchronized. If a tool's Limitations section says "does not support date ranges before 2020," the system prompt should not repeat this constraint.

## Assessment Criteria

- No domain knowledge in the system prompt that duplicates a tool's output
- No naming collisions across MCP servers
- System prompt length is proportionate to tool definition footprint
- Ordering-sensitive workflows are documented in the system prompt
- System prompt instructions don't contradict tool description Guidelines or Limitations

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Chatbot Integration)

**Related design areas:** [Tool Description Design](tool-descriptions.md) (prompt and descriptions must not conflict), [Tool Set Architecture](tool-set-architecture.md) (context budget shared between prompt and definitions), [Multi-Turn Conversation Design](multi-turn.md) (prompt length affects context pressure)
