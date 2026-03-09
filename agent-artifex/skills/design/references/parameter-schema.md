# Parameter & Schema Design — Design Reference

Parameters are how the LLM communicates intent to the server. Ambiguous parameters cause wrong arguments; missing output schemas prevent result validation. Both directions of the interface must be explicitly designed.

## Design Principles

**1. Every parameter needs four properties: type, meaning, behavioral effect, and required/default status.** Parameter Explanation has the highest inter-rater reliability (ICC 0.90) — it is the most objectively assessable component.[^1] Despite this clarity of standard, 84.3% of tools have opaque parameters.[^2]

[^1]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Parameter Explanation is the most objectively assessable component (ICC 0.90)."
[^2]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Opaque Parameters (84.3% prevalence)."

**2. Use specific, unambiguous parameter names.** Replace generic names with domain-specific ones. A parameter named `user` could mean a username, user ID, or user object — use `user_id` instead.[^3]

[^3]: Anthropic, "Writing Tools for Agents" — "Avoid ambiguity by clearly describing (and enforcing with strict data models) expected inputs and outputs."

**3. Enum parameters must list all valid values.** The LLM cannot guess valid options. Parameter descriptions that just repeat the property name provide no guidance. Every enum field should include the complete set of accepted values in its description.

**4. Declare output schemas.** Servers MUST conform to declared output schemas; clients SHOULD validate against them.[^4] Without output schemas, neither clients nor LLMs can reliably parse the returned data.

[^4]: MCP Specification (2025-06-18) — "Servers MUST conform to their declared output schemas...Without output schemas, clients and LLMs cannot reliably parse and utilize the returned data."

**5. Keep argument counts in-distribution.** Fewer than ~20 arguments per tool keeps the tool within the model's training distribution.[^5] Beyond this threshold, the model is more likely to omit required arguments or hallucinate parameter names.

[^5]: OpenAI, "o3/o4-mini Function Calling Guide" — "Any setup with fewer than ~100 tools and fewer than ~20 arguments per tool is considered in-distribution."

**6. Control parallel tool calling explicitly.** When tool ordering matters, disable parallel calls or explicitly outline the required sequence in the system prompt.[^6] Models may call tools in the wrong order when allowed to parallelize freely.

[^6]: OpenAI, "o3/o4-mini Function Calling Guide" — "It can make mistakes in the order of the tool calls. To guard against these cases, it is recommended to explicitly outline the orders to accomplish certain tasks."

## Assessment Criteria

- Every parameter has a `.describe()` annotation beyond the property name
- Enum parameters list valid values
- Output schemas are declared for all tools
- No tool exceeds ~20 parameters
- Ordering-sensitive tools document their sequencing requirements

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Tool Description Quality + Server Correctness)

**Related design areas:** [Tool Description Design](tool-descriptions.md) (parameters are a component of descriptions), [Response Format Design](response-format.md) (output schemas define response shape)
