# Introducing Advanced Tool Use on the Claude Developer Console — Anthropic Engineering

> **Source:** Anthropic. "Introducing Advanced Tool Use on the Claude Developer Console." Anthropic Engineering Blog.
>
> **URL:** https://www.anthropic.com/engineering/advanced-tool-use
>
> **Retrieved:** 2026-03-08

## Dynamic Tool Discovery

Loading all tool definitions upfront creates massive context overhead. Tool definitions "can sometimes consume 50,000+ tokens before an agent reads a request." At Anthropic internally, definitions consumed 134K tokens prior to optimization.

## Tool Search Tool

Enables on-demand discovery rather than upfront loading. "Claude only sees the tools it actually needs for the current task." Tools marked with `defer_loading: true` are discoverable without consuming context initially.

## Efficiency Gains

- Traditional setup: ~77K tokens consumed before work begins
- Tool Search approach: ~8.7K tokens, "preserving 95% of context window"
- **85% reduction in token usage**

## Caching Benefit

"Doesn't break prompt caching because deferred tools are excluded from the initial prompt entirely. They're only added to context after Claude searches for them."

## When to Use

Best ROI when:
- Tool definitions consume >10K tokens
- Experiencing tool selection accuracy issues
- Building systems with multiple MCP servers
- Access to 10+ tools

Less beneficial for small tool libraries (<10 tools) or when all tools are "used frequently in every session."

## Relevance to MCP Chatbot Testing

This source quantifies the context pressure problem: tool definitions can consume 50K–134K tokens. In a multi-turn chatbot, this competes with conversation history for context window space. Dynamic tool loading is a mitigation strategy, but it introduces its own testable behavior — does the agent correctly discover and load tools mid-conversation? Testing should cover both approaches: static (all tools loaded upfront, pressure from history) and dynamic (tools loaded on demand, pressure from discovery accuracy).
