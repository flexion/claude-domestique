# Error Message Design — Design Reference

When a tool fails, the error message IS the LLM's only information for deciding what to do next. Error text is passed directly to the LLM for interpretation.[^1]

[^1]: Anthropic, "Implementing Tool Use" — "By default, tool errors are passed back to Claude, which can then respond appropriately."

## Design Principles

**1. Structure errors for non-human consumers.** Status codes and raw exceptions are insufficient for machine consumption.[^2] Use structured fields: problem type, causal input, detail, recovery suggestion. The consumer of your error is an LLM, not a developer reading logs.

[^2]: RFC 9457 (IETF), "Problem Details for HTTP APIs" — "HTTP status codes cannot always convey enough information about errors to be helpful. While humans using web browsers can often understand an HTML response content, non-human consumers of HTTP APIs have difficulty doing so."

**2. Every error must name four things: the problem, the input that caused it, why it failed, and what to try instead.** The recovery action is critical — it tells the LLM which tool to call next. Example: "ADR not found: no ADR with ID 'adr-99'. Use query_adrs to find available ADR IDs."

**3. Never expose internal implementation details.** Stack traces, raw exceptions, and opaque codes are anti-patterns. The LLM cannot act on `TypeError: Cannot read properties of undefined (reading 'map')`. It can act on "No results found for query 'xyz'. Broaden the search terms or use list_all to see available items."

**4. Error messages must exceed minimum information density.** Messages under 20 characters are almost certainly too terse to be actionable. A message like "Not found" gives the LLM no basis for recovery. "ADR not found: no ADR with ID 'adr-99'. Use query_adrs to find available ADR IDs." gives it a complete recovery path.

**5. Distinguish protocol errors from tool execution errors.** MCP defines two classes of errors with different semantics and recovery paths.[^3] Protocol errors (unknown tool, invalid arguments) indicate bugs in the calling code. Tool execution errors indicate runtime failures that the LLM may be able to recover from. Design tool execution errors to be recoverable; protocol errors should never reach the user.

[^3]: MCP Specification (2025-06-18) — Protocol errors use JSON-RPC error codes (unknown tools, invalid arguments); tool execution errors use `isError: true` with descriptive text like "Failed to fetch weather data: API rate limit exceeded."

## Assessment Criteria

- No error messages contain stack traces (regex: `/Error\s+at\s/`, `/at\s+\w+\s+\(/`)
- No raw exception types (regex: `/^(TypeError|ReferenceError|Error):/`)
- All error messages > 20 characters
- Error messages include a recovery action referencing a specific tool
- Tool execution errors use `isError: true` with structured detail

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Server Correctness)

**Related design areas:** [Tool Description Design](tool-descriptions.md) (error recovery references tools by name), [Response Format Design](response-format.md) (error structure is a response format concern)
