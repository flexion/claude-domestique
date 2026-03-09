# Server Correctness — Implementation Reference

Read this file when implementing Server Correctness (Invocation) tests. Contains schema validation patterns, error structure assertions, golden-file testing, and FM recovery testing.

---

## Retrieving Tool Results

Call `tools/call` on your MCP server. The response contains:

- `content` — Array of `{ type: "text", text: string }` (unstructured text)
- `structuredContent` — Typed JSON object (if `outputSchema` declared)
- `isError` — boolean; `true` if tool execution failed

```typescript
// TypeScript (@modelcontextprotocol/sdk)
const result = await client.callTool({
  name: "tool_name",
  arguments: { /* valid input */ },
});

result.content;           // Array of { type: "text", text: string }
result.structuredContent; // Typed JSON object (if outputSchema declared)
result.isError;           // boolean
```

```python
# Python (mcp SDK)
result = await session.call_tool("tool_name", arguments={"key": "value"})

result.content            # List of content blocks
result.structuredContent  # Dict (if outputSchema declared)
result.isError            # bool
```

---

## Tier 1: Deterministic Checks (CI)

No LLM calls. Fast, cheap, fully deterministic. Run on every commit.

### 1. Schema Validation

If a tool declares an `outputSchema`, the MCP specification requires: servers **MUST** provide structured results that conform to this schema; clients **SHOULD** validate against this schema.

**Pass criteria:**
- Every tool with `outputSchema` returns `structuredContent` that validates against that schema
- Required fields are present with correct types
- No extra fields outside the schema (if `additionalProperties: false`)

```typescript
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

```python
from jsonschema import validate, ValidationError

for tool in tools:
    output_schema = getattr(tool, 'outputSchema', None)
    if not output_schema:
        continue

    result = await session.call_tool(tool.name, arguments={...})
    assert not result.isError
    validate(instance=result.structuredContent, schema=output_schema)
```

### 2. Error Structure

When a tool returns `isError: true`, the error text in `content` is passed directly to the LLM for interpretation. The LLM uses this text to decide what to do next. An opaque error degrades the FM's next decision.

The RFC 9457 principle applies: non-human consumers (including FMs) need structured, actionable error details to determine corrective actions, not opaque codes or generic messages.

**Pass criteria:**
- Error text names the specific problem (not just an error code)
- Error text indicates which input or condition caused the failure
- Error text suggests a recovery action where applicable
- No stack traces or internal implementation details leak to the FM

**Anti-pattern regex patterns:**

```typescript
const invalidResult = await client.callTool({
  name: "tool_name",
  arguments: { id: "nonexistent-id" },
});

expect(invalidResult.isError).toBe(true);

const errorText = (invalidResult.content as Array<{ text: string }>)[0].text;

// Should be descriptive, not opaque
expect(errorText.length).toBeGreaterThan(20);

// Should NOT contain stack traces
expect(errorText).not.toMatch(/Error\s+at\s/);
expect(errorText).not.toMatch(/at\s+\w+\s+\(/);

// Should NOT be a raw exception class name
expect(errorText).not.toMatch(/^(TypeError|ReferenceError|Error):/);

// Should NOT be opaque codes without explanation
expect(errorText).not.toMatch(/^E_[A-Z_]+$/);
expect(errorText).not.toMatch(/^Error: \d{3}$/);
```

### 3. Result Fidelity (Golden-File Pattern)

Seed known domain state, call the tool, and compare `structuredContent` against a captured known-good response. Assert field presence, types, and relationships — not exact values for non-deterministic fields.

Contract test principle: "the format of the data matters rather than the actual data."

**Pass criteria:**
- All expected fields are present in the response
- Field types match expectations (string, number, array, etc.)
- Relationships between fields are correct (e.g., a count field matches the length of a list field)
- Enum fields contain valid values
- Non-deterministic fields (IDs, timestamps) match expected patterns

```typescript
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

// Non-deterministic fields: assert pattern, not value
expect(items[0]["id"]).toMatch(/^[0-9a-f-]{36}$/);           // UUID format
expect(items[0]["createdAt"]).toMatch(/^\d{4}-\d{2}-\d{2}/);  // ISO 8601 date

// Relationship assertion: count matches array length
expect(output["total"]).toBe(items.length);
```

### 4. Error-Path Coverage

For each tool, test at least one invalid-input scenario and one not-found scenario.

**Pass criteria:**
- Invalid inputs return `isError: true` (not a protocol error or crash)
- Not-found conditions return `isError: true` with a message naming the missing resource
- Required-field omissions return `isError: true` naming the missing field
- The server does not return a success response for invalid inputs

```typescript
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
  expect(errorText).not.toMatch(/Error\s+at\s/);  // no stack traces
}
```

---

## Tier 2: FM Recovery Rate (On-Demand)

Tests whether the FM can successfully recover from a tool error. Requires an LLM in the loop. Run on-demand, not per commit.

This crosses into Agent Behavior territory — it exercises the Tool Selection→Invocation loop. The distinction: FM recovery tests a *specific server error response*, while Agent Behavior tests the *full prompt-to-answer flow*.

### Four-step procedure

1. **Call the tool** with inputs that produce an error (reuse error-path scenarios from Tier 1)
2. **Feed the error response** into an FM with the tool definitions and a user query that would have required the failed tool
3. **Observe** whether the FM:
   - (a) calls a different tool that resolves the query
   - (b) retries with corrected arguments
   - (c) provides a useful explanation to the user
4. **Grade the outcome, not the path**

**Pass criteria:**
- The FM does not hallucinate a successful result from an error
- The FM takes a recovery action (different tool, adjusted args, or informative response)
- Run 5+ times and aggregate — a single run tells you almost nothing

---

## When to Run

| Test type | Trigger | Rationale |
|---|---|---|
| **Schema validation** | Every commit | Deterministic, near-zero cost. Catches format regressions. |
| **Error structure** | Every commit | Deterministic. Prevents opaque errors from reaching the FM. |
| **Result fidelity** | Every commit | Catches silent changes to result shapes. |
| **Error-path coverage** | Every commit | Prevents crashes on unexpected input. |
| **FM recovery rate** | When error-path tests pass but downstream tests regress | Diagnoses whether error messages are useful to the FM. |
