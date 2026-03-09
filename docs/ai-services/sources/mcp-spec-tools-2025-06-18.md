# MCP Specification: Tools — Protocol Revision 2025-06-18

> **Source:** https://modelcontextprotocol.io/specification/2025-06-18/server/tools
>
> **Retrieved:** 2026-03-08

## Key Excerpts

### Output Schema

> "Tools may also provide an output schema for validation of structured results.
> If an output schema is provided:
> - Servers **MUST** provide structured results that conform to this schema.
> - Clients **SHOULD** validate structured results against this schema."

Benefits of output schemas:
> - "Enabling strict schema validation of responses"
> - "Providing type information for better integration with programming languages"
> - "Guiding clients and LLMs to properly parse and utilize the returned data"
> - "Supporting better documentation and developer experience"

### Error Handling

Two error reporting mechanisms:

1. **Protocol Errors**: Standard JSON-RPC errors (unknown tools, invalid arguments, server errors)
2. **Tool Execution Errors**: Reported in tool results with `isError: true` (API failures, invalid input data, business logic errors)

Example tool execution error:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Failed to fetch weather data: API rate limit exceeded"
      }
    ],
    "isError": true
  }
}
```

### Tool Definition Structure

A tool definition includes:
- `name`: Unique identifier for the tool
- `title`: Optional human-readable name
- `description`: Human-readable description of functionality
- `inputSchema`: JSON Schema defining expected parameters
- `outputSchema`: Optional JSON Schema defining expected output structure
- `annotations`: Optional properties describing tool behavior
