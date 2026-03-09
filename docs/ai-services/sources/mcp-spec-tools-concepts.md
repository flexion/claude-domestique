# MCP Specification — Tools (Concepts)

> **Source:** Model Context Protocol. "Tools." MCP Documentation.
>
> **URL:** https://modelcontextprotocol.io/docs/concepts/tools
>
> **Retrieved:** 2026-03-08

## User Interaction Model

Tools in MCP are designed to be **model-controlled**, meaning that the language model can discover and invoke tools automatically based on its contextual understanding and the user's prompts.

## Protocol Messages

### Listing Tools (Discovery)

Clients send a `tools/list` request. Response contains an array of tool objects:

```json
{
  "tools": [
    {
      "name": "get_weather",
      "title": "Weather Information Provider",
      "description": "Get current weather information for a location",
      "inputSchema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "City name or zip code"
          }
        },
        "required": ["location"]
      }
    }
  ]
}
```

### Calling Tools (Invocation)

Clients send a `tools/call` request with `name` and `arguments`.

## Data Types

### Tool Definition

A tool definition includes:

- `name`: Unique identifier for the tool
- `title`: Optional human-readable name for display purposes
- `description`: Human-readable description of functionality
- `inputSchema`: JSON Schema defining expected parameters
- `outputSchema`: Optional JSON Schema defining expected output structure
- `annotations`: Optional properties describing tool behavior

### Tool Result

Tool results may contain **structured** or **unstructured** content.

- **Unstructured**: Returned in `content` field (text, image, audio, resource links, embedded resources)
- **Structured**: Returned as JSON in `structuredContent` field

### Output Schema

If an output schema is provided:
- Servers **MUST** provide structured results that conform to this schema
- Clients **SHOULD** validate structured results against this schema

Benefits:
- Enabling strict schema validation of responses
- Providing type information for better integration with programming languages
- Guiding clients and LLMs to properly parse and utilize the returned data
- Supporting better documentation and developer experience

## Error Handling

Two error reporting mechanisms:

1. **Protocol Errors**: Standard JSON-RPC errors (unknown tools, invalid arguments, server errors)
2. **Tool Execution Errors**: Reported in tool results with `isError: true` (API failures, invalid input data, business logic errors)

## Security

Servers MUST: validate all tool inputs, implement proper access controls, rate limit tool invocations, sanitize tool outputs.

Clients SHOULD: prompt for user confirmation on sensitive operations, show tool inputs to user before calling server, validate tool results before passing to LLM, implement timeouts, log tool usage for audit.
