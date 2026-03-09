# o3/o4-mini Function Calling Guide — OpenAI Cookbook

> **Source:** OpenAI. "o3/o4-mini Prompting Guide." OpenAI Cookbook.
>
> **URL:** https://developers.openai.com/cookbook/examples/o-series/o3o4-mini_prompting_guide
>
> **Retrieved:** 2026-03-08

## Tool Set Size

> "Any setup with fewer than ~100 tools and fewer than ~20 arguments per tool is considered in-distribution."

## Function Description Clarity

> "If multiple tools have overlapping purposes or vague descriptions, models may call the wrong one or hesitate to call any at all."

## Multi-Step Task Ordering

> "It can make mistakes in the order of the tool calls. To guard against these cases, it is recommended to explicitly outline the orders to accomplish certain tasks."

## Relevance to MCP Chatbot Testing

This source provides specific thresholds for tool-count-related degradation and confirms that overlapping tool descriptions cause selection failures. In a chatbot context, tools from multiple MCP servers may introduce overlapping purposes that the server developers cannot control. The ordering guidance supports testing multi-step workflows where the agent must sequence tool calls correctly across conversation turns.
