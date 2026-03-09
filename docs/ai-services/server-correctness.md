# Server Correctness — Invocation

> Part of [AI Services Framework](framework.md).
>
> MCP Spec Term: **Invocation** | Test type: **Deterministic**

**Relay the FM's tool call to the MCP Server and execute domain logic**[^1] so that a structured result is returned and appended to the FM's context for the next Tool Selection iteration.

**High-quality invocation** means the server returns structured, predictable results that the FM can reason about.[^2] Error messages tell the FM exactly what went wrong and which tool to try next.[^3] Result schemas are consistent across tools so the FM doesn't have to guess at the shape of the data.[^4]

**How to compare two outputs:** Given the same tool call with the same arguments, compare the results: (1) schema consistency — does the result shape match the documented output?[^5] (2) error actionability — does an error message name the correct recovery tool?[^6] (3) FM recovery rate — when the FM receives the error, does it successfully recover? The first two are deterministic and testable without an LLM. The third requires running the error through a Tool Selection iteration to see if the FM can act on it.

---

## What should be tested

1. **Schema consistency.** Tool results should have predictable, documented shapes. The MCP specification supports output schemas that servers "MUST" conform to and clients "SHOULD" validate against.[^2] Without output schemas, clients and LLMs cannot reliably parse and utilize returned data.[^4]

2. **Error actionability.** Error messages should name what went wrong and suggest recovery. MCP distinguishes protocol errors (JSON-RPC) from tool execution errors (`isError: true`), where the error text is passed directly to the LLM for interpretation.[^3] RFC 9457 establishes the IETF standard for machine-readable error responses: "HTTP status codes cannot always convey enough information about errors to be helpful...non-human consumers of HTTP APIs have difficulty" with opaque errors.[^7] Tool results are appended to FM context and directly influence the next Tool Selection iteration[^8] — an opaque error message degrades subsequent tool selection quality.

3. **FM recovery rate.** When the FM receives an error, does it successfully recover by calling a different tool or adjusting arguments? This requires running the error through a Tool Selection iteration. Anthropic recommends grading agents on "what the agent produced, not the path it took"[^9] — recovery success is an outcome metric.

4. **Result fidelity.** Tool results should accurately reflect the domain state. Our behavioral tests use the golden-file pattern[^10] — capturing known-good responses and detecting deviations — to verify this deterministically. Contract tests "check the contract of external service calls" to ensure "the format of the data matters rather than the actual data."[^5]

---

## How to test

Testing server correctness uses two tiers: **deterministic checks** that run on every commit (CI-safe, no LLM, near-zero cost), and **FM recovery testing** that runs on-demand (requires LLM calls, non-deterministic).[^12] Both tiers operate on tool results returned by the MCP `tools/call` protocol call.[^13]

### Impact and effort summary

| Test | Impact on response quality | Effort | Evidence |
|---|---|---|---|
| **1. Schema validation** | **High.** Without output schemas, "clients and LLMs cannot reliably parse and utilize the returned data."[^4] Schema violations silently corrupt every downstream decision — the FM reasons over malformed data without knowing it's malformed. | Near-zero. JSON Schema validation is deterministic and fast. Requires the server to declare `outputSchema` per tool. | MCP spec MUST/SHOULD[^2] |
| **2. Error structure** | **High.** Tool error text is "passed directly to the LLM for interpretation"[^3] — an opaque error degrades the FM's next Tool Selection iteration.[^8] RFC 9457's principle applies by analogy: non-human consumers need structured, actionable error details, not opaque codes.[^6] | Low. String assertions on error text. Requires defining error-path test cases per tool. | MCP spec[^3], RFC 9457[^6], Anthropic[^14] |
| **3. Result fidelity** | **High.** Tool results feed directly into FM context for synthesis.[^8] A result that misrepresents domain state (wrong counts, missing relationships, stale data) causes the FM to produce a faithful-but-incorrect answer — the hardest failure mode to detect downstream. | Low–Medium. Requires seeding known domain state and maintaining golden files. The golden files need updating when domain logic changes intentionally. | Fowler ContractTest[^5], Jest snapshot[^10] |
| **4. Error-path coverage** | **Moderate.** Ensures the server handles invalid inputs gracefully rather than crashing or returning unstructured exceptions. Without this, a single unexpected input from the FM can break the interaction loop. | Low. One invalid-input and one not-found test case per tool. | MCP spec error handling[^3], Anthropic[^14] |
| **5. FM recovery rate** | **Moderate — but uniquely diagnostic.** The only test that measures whether error messages are actually useful to an FM, not just structurally present. A well-structured error that the FM can't act on is still a failure. | High. Requires LLM calls and full Tool Selection iteration. Non-deterministic. | Anthropic "grade outcomes"[^9], Block "probabilistic" layer[^15] |

**Practical implication:** Schema validation, error structure, and result fidelity form the deterministic base — they are cheap, fast, and catch the majority of invocation defects.[^12] Error-path coverage extends this to negative cases. Reserve FM recovery testing for when error-path tests pass but downstream Agent Behavior or Response Accuracy tests show regressions involving error recovery. Anthropic recommends: "Code-based grading is the best grading method if possible, as it is fast and highly reliable."[^16]

### Retrieving tool results

Call `tools/call` on your MCP server with `name` and `arguments`. The response contains `content` (unstructured text), optionally `structuredContent` (typed JSON), and `isError` (boolean).[^13]

```typescript
// TypeScript (using @modelcontextprotocol/sdk)
const result = await client.callTool({
  name: "tool_name",
  arguments: { /* valid input */ },
});

// Inspect the response
result.content;           // Array of { type: "text", text: string }
result.structuredContent; // Typed JSON object (if outputSchema declared)
result.isError;           // boolean — true if tool execution failed
```

```python
# Python (using mcp SDK)
result = await session.call_tool("tool_name", arguments={"key": "value"})

result.content            # List of content blocks
result.structuredContent  # Dict (if outputSchema declared)
result.isError            # bool
```

### Tier 1: Deterministic checks (CI)

These tests require no LLM calls. They are fast, cheap, and fully deterministic — run them on every commit.[^12]

#### 1. Schema validation

If a tool declares an `outputSchema`, the MCP specification requires that servers "MUST provide structured results that conform to this schema" and clients "SHOULD validate structured results against this schema."[^2] This is a direct, testable contract.

**Pass criteria:**
- Every tool that declares an `outputSchema` returns `structuredContent` that validates against that schema
- Required fields are present with correct types
- No extra fields outside the schema (if `additionalProperties: false`)

**How to validate:** Use a JSON Schema validator library for your language (e.g., `ajv` for JavaScript/TypeScript, `jsonschema` for Python, `gojsonschema` for Go). Feed the tool's `outputSchema` as the schema and `structuredContent` as the instance.

```typescript
// Example: validate structuredContent against declared outputSchema
import Ajv from "ajv";
const ajv = new Ajv();

for (const tool of tools) {
  const outputSchema = (tool as Record<string, unknown>).outputSchema;
  if (!outputSchema) continue; // skip tools without outputSchema

  const validate = ajv.compile(outputSchema);
  const result = await client.callTool({
    name: tool.name,
    arguments: { /* valid test input */ },
  });

  expect(result.isError).toBe(false);
  expect(validate(result.structuredContent),
    `${tool.name} structuredContent must conform to outputSchema: ${JSON.stringify(validate.errors)}`
  ).toBe(true);
}
```

#### 2. Error structure

When a tool returns `isError: true`, the error text in `content` is passed directly to the LLM for interpretation.[^3] The LLM uses this text to decide what to do next — call a different tool, adjust arguments, or inform the user.[^14] An opaque error message ("Error: 500") degrades the FM's next decision.

RFC 9457 establishes the principle that non-human API consumers need structured error details to determine corrective actions.[^6] While RFC 9457 is an HTTP standard, the principle applies directly to MCP tool errors: the FM is a non-human consumer that needs to understand what went wrong and what to do about it.

**Pass criteria:**
- Error text names the specific problem (not just an error code or generic message)
- Error text indicates which input or condition caused the failure
- Error text suggests a recovery action where applicable (e.g., "use query_adrs to find the correct ID")
- No stack traces or internal implementation details leak to the FM

**Anti-patterns to flag:**
- Raw exception messages (e.g., `TypeError: Cannot read property 'x' of undefined`)
- Stack traces (match `/Error\s+at\s/` or `/at\s+\w+\s+\(/`)
- Opaque codes without explanation (e.g., `Error: E_NOT_FOUND`)
- Generic messages that give no diagnostic value (e.g., `Something went wrong`)

```typescript
// Example: assert error messages are actionable, not opaque
const invalidResult = await client.callTool({
  name: "tool_name",
  arguments: { id: "nonexistent-id" },
});

expect(invalidResult.isError).toBe(true);

const errorText = (invalidResult.content as Array<{ text: string }>)[0].text;

// Should name the problem
expect(errorText.length).toBeGreaterThan(20);

// Should NOT contain stack traces
expect(errorText).not.toMatch(/Error\s+at\s/);
expect(errorText).not.toMatch(/at\s+\w+\s+\(/);

// Should NOT be a raw exception class name
expect(errorText).not.toMatch(/^(TypeError|ReferenceError|Error):/);
```

#### 3. Result fidelity (golden-file pattern)

Seed known domain state, call the tool, and compare `structuredContent` against a captured known-good response.[^10] Assert field presence, types, and relationships — not exact values for non-deterministic fields like timestamps or generated IDs.[^5]

This is the contract test principle applied to MCP tool results: "the format of the data matters rather than the actual data."[^5] Snapshot tests "can capture any serializable value and should be used anytime the goal is testing whether the output is correct."[^10]

**Pass criteria:**
- All expected fields are present in the response
- Field types match expectations (string, number, array, etc.)
- Relationships between fields are correct (e.g., a count field matches the length of a list field)
- Enum fields contain valid values
- Non-deterministic fields (IDs, timestamps) match expected patterns (e.g., UUID format, ISO 8601)

**How to handle non-deterministic fields:** Use property matchers or structural assertions instead of exact-value comparisons. Assert the shape and type, not the specific generated value.

```typescript
// Example: golden-file test for a query tool
// 1. Seed known state
await client.callTool({
  name: "create_item",
  arguments: { title: "Test Item", status: "active" },
});

// 2. Call the tool under test
const result = await client.callTool({
  name: "query_items",
  arguments: { status: "active" },
});

// 3. Assert structure and relationships, not exact values
const output = result.structuredContent as Record<string, unknown>;
expect(output["total"]).toBe(1);

const items = output["items"] as Array<Record<string, unknown>>;
expect(items).toHaveLength(1);
expect(items[0]["title"]).toBe("Test Item");
expect(items[0]["status"]).toBe("active");
expect(items[0]["id"]).toMatch(/^[0-9a-f-]{36}$/); // UUID pattern, not exact value
expect(items[0]["createdAt"]).toMatch(/^\d{4}-\d{2}-\d{2}/); // ISO date pattern
```

#### 4. Error-path coverage

For each tool, test at least one invalid-input scenario and one not-found scenario. Assert that the server returns `isError: true` with actionable error text — not a crash, not an unhandled exception, not a successful response with wrong data.[^3]

**Pass criteria:**
- Invalid inputs return `isError: true` (not a protocol error or crash)
- Not-found conditions return `isError: true` with a message naming the missing resource
- Required-field omissions return `isError: true` naming the missing field
- The server does not return a success response for invalid inputs

```typescript
// Example: error-path coverage for a tool requiring an ID
const scenarios = [
  {
    name: "nonexistent ID",
    args: { id: "00000000-0000-0000-0000-000000000000" },
    expectPattern: /not found|does not exist/i,
  },
  {
    name: "malformed ID",
    args: { id: "not-a-uuid" },
    expectPattern: /invalid|malformed/i,
  },
];

for (const scenario of scenarios) {
  const result = await client.callTool({
    name: "get_item",
    arguments: scenario.args,
  });

  expect(result.isError, `${scenario.name} should return isError`).toBe(true);

  const errorText = (result.content as Array<{ text: string }>)[0].text;
  expect(errorText).toMatch(scenario.expectPattern);
  expect(errorText).not.toMatch(/Error\s+at\s/); // no stack traces
}
```

### Tier 2: FM recovery rate (on-demand)

This test requires an LLM in the loop. It measures whether the FM can successfully recover from a tool error — calling a different tool, adjusting arguments, or providing a useful answer to the user.[^9] It is non-deterministic and incurs API costs — run it on-demand, not per commit.[^12]

**This test crosses into Agent Behavior territory.** It exercises the Tool Selection → Invocation loop with a real FM, which is the subject of [Agent Behavior](agent-behavior.md). The distinction is that FM recovery rate tests a *specific server error response* as input, while Agent Behavior tests the *full prompt-to-answer flow*. Use this test to diagnose whether a specific error message is useful to the FM, not to measure overall agent performance.

**How to test:**
1. Call the tool with inputs that produce an error (reuse error-path scenarios from Tier 1)
2. Feed the error response into an FM with the tool definitions and a user query that would have required the failed tool
3. Observe whether the FM: (a) calls a different tool that resolves the query, (b) retries with corrected arguments, or (c) provides a useful explanation to the user
4. Grade the outcome, not the path — "it's often better to grade what the agent produced, not the path it took"[^9]

**Pass criteria:**
- The FM does not hallucinate a successful result from an error
- The FM takes a recovery action (different tool, adjusted args, or informative response)
- Run multiple times and aggregate — "a single run tells us almost nothing but patterns tell us everything"[^15]

---

## Evidence base

Hasan et al. treat invocation as a pass-through phase — "the MCP client validates parameters, seeks user consent for sensitive actions, and executes the call through the appropriate server."[^11] The paper does **not** directly study execution result quality, error message design, or schema consistency. Its metrics (SR, AE, AS) measure the *downstream effects* of invocation quality on tool selection, but do not isolate invocation as an independent variable.

**This is a gap in the paper.** Our server correctness tests are grounded in other authoritative sources:
- **MCP specification** (2025-06-18) — output schema MUST/SHOULD requirements for structured results[^2]
- **RFC 9457** (IETF) — machine-readable problem details for non-human API consumers[^7]
- **Fowler, "ContractTest"** — contract tests verify response format consistency[^5]
- **Anthropic, "Demystifying Evals"** — grade outcomes, not tool-call sequences[^9]

---

## Footnotes

[^1]: Hasan et al. §3.1, point (3): "Execution — The FM issues a tool-call instruction. For this, the MCP client validates parameters, seeks user consent for sensitive actions, and executes the call through the appropriate server."

[^2]: MCP Specification, Tools (2025-06-18): "Tools may also provide an output schema for validation of structured results. If an output schema is provided: Servers **MUST** provide structured results that conform to this schema. Clients **SHOULD** validate structured results against this schema." ([source](https://modelcontextprotocol.io/specification/2025-06-18/server/tools); local copy: `sources/mcp-spec-tools-2025-06-18.md`)

[^3]: MCP Specification, Tools (2025-06-18), Error Handling: Tool execution errors are "reported in tool results with `isError: true`" with error text passed directly to the LLM. Anthropic, "How to Implement Tool Use": "When a tool throws an exception, the tool runner catches it and returns the error to Claude as a tool result with `is_error: true`...tool errors are passed back to Claude, which can then respond appropriately." ([MCP spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), local copy: `sources/mcp-spec-tools-2025-06-18.md`; [Anthropic docs](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use), local copy: `sources/anthropic-implement-tool-use.md`)

[^4]: MCP Specification, Tools (2025-06-18): Output schemas help by "Guiding clients and LLMs to properly parse and utilize the returned data" — implying that without them, LLMs cannot reliably do so. ([source](https://modelcontextprotocol.io/specification/2025-06-18/server/tools); local copy: `sources/mcp-spec-tools-2025-06-18.md`)

[^5]: Fowler, M. "ContractTest": "Contract tests check the contract of external service calls...the format of the data matters rather than the actual data." ([source](https://martinfowler.com/bliki/ContractTest.html); local copy: `sources/fowler-contract-test.md`)

[^6]: RFC 9457 (IETF): "HTTP status codes cannot always convey enough information about errors to be helpful. While humans using web browsers can often understand an HTML response content, non-human consumers of HTTP APIs have difficulty doing so." Problem details provide machine-readable error structure with `type`, `status`, `title`, `detail`, and `instance` fields. ([source](https://www.rfc-editor.org/rfc/rfc9457.html); local copy: `sources/rfc-9457-problem-details.md`)

[^7]: RFC 9457 (IETF), "Problem Details for HTTP APIs": Defines a standard JSON format for machine-readable error responses. "This document defines a 'problem detail' to carry machine-readable details of errors in HTTP response content to avoid the need to define new error response formats for HTTP APIs." ([source](https://www.rfc-editor.org/rfc/rfc9457.html); local copy: `sources/rfc-9457-problem-details.md`)

[^8]: Hasan et al. §3.1/Figure 1: After invocation, "the agent returns the tool response to the FM, which synthesizes the final answer for the user" — tool results feed directly into the next Tool Selection iteration's context.

[^9]: Anthropic, "Demystifying Evals for AI Agents": "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid...it's often better to grade what the agent produced, not the path it took." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^10]: Jest, "Snapshot Testing": "Snapshot tests are a very useful tool whenever you want to make sure your UI does not change unexpectedly." Scope extends beyond UI: "Snapshots can capture any serializable value and should be used anytime the goal is testing whether the output is correct." The golden-file pattern captures known-good output and detects deviations. ([source](https://jestjs.io/docs/snapshot-testing); local copy: `sources/jest-snapshot-testing.md`)

[^11]: Hasan et al. §3.1, point (3): "the MCP client validates parameters, seeks user consent for sensitive actions, and executes the call through the appropriate server"

[^12]: Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog. Base layer: "fast, cheap, and completely deterministic." CI philosophy: "Don't run live LLM tests in CI. Too expensive, too slow, too flaky." ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^13]: MCP Specification, Tools (2025-06-18): `tools/call` returns a result containing `content` (text/image/audio blocks), optionally `structuredContent` (typed JSON), and `isError` (boolean). ([spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), local copy: `sources/mcp-spec-tools-2025-06-18.md`; [concepts](https://modelcontextprotocol.io/docs/concepts/tools), local copy: `sources/mcp-spec-tools-concepts.md`)

[^14]: Anthropic, "How to Implement Tool Use": "By default, tool errors are passed back to Claude, which can then respond appropriately." Claude receives the error message and can attempt alternative approaches or ask for clarification. ([source](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use); local copy: `sources/anthropic-implement-tool-use.md`)

[^15]: Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog: "A single run tells us almost nothing but patterns tell us everything." Benchmarks "run multiple times and aggregate results. Regression does not mean 'the output changed.' It means 'success rates dropped.'" ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^16]: Anthropic, "Building Evals" cookbook: "Code-based grading is the best grading method if possible, as it is fast and highly reliable." ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)
