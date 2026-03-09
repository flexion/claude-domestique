# How to Implement Tool Use — Anthropic

> **Source:** Anthropic. "How to Implement Tool Use." Claude Platform Documentation.
>
> **URL:** https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use
>
> **Retrieved:** 2026-03-08

## Tool Error Handling

Tool errors are indicated by setting `is_error: true` in the tool result block:

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: File not found",
  "is_error": true
}
```

> "By default, tool errors are passed back to Claude, which can then respond appropriately."

Claude receives the error message and can attempt alternative approaches or ask for clarification.

## Tool Result Formatting

Tool results must be sent in a user message with:
- `tool_use_id`: Matches the `id` from the corresponding tool use block
- `content`: Can be a string, list of content blocks (text, image, document types), or omitted for empty results
- `is_error` (optional): Boolean indicating if the tool execution failed

**Critical rule:** Tool result blocks must come FIRST in the content array; any text must come AFTER all tool results.

## Intercepting Tool Errors

The documentation provides guidance for detecting errors before they reach Claude — either raising an exception to stop the loop, or logging and continuing to let Claude handle it.
