# Function Calling — OpenAI Developer Documentation

> **Source:** OpenAI. "Function Calling." OpenAI API Documentation.
>
> **URL:** https://developers.openai.com/api/docs/guides/function-calling
>
> **Retrieved:** 2026-03-08

## Multi-Turn State Management

The API requires preserving the complete interaction sequence in multi-turn conversations:
- Original user prompts
- Model responses with tool calls
- Tool execution results

Each interaction layer must be appended sequentially with `call_id` references before requesting the next model response.

## Parallel Tool Calls

> "The model may choose to call multiple functions in a single turn. You can prevent this by setting `parallel_tool_calls` to `false`, which ensures exactly zero or one tool is called."

## Context Window Impact

> "Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means callable function definitions count against the model's context limit and are billed as input tokens."

Management guidance: limit initially available functions to under 20, use tool search for deferred loading, or employ fine-tuning to reduce token overhead.

## Relevance to MCP Chatbot Testing

This source establishes that function/tool definitions consume context window tokens and compete with conversation history. The requirement to preserve the complete interaction sequence means context grows linearly with conversation depth. This directly supports testing for context pressure degradation in multi-turn chatbot conversations.
