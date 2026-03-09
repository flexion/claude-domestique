# Writing Tools for Agents — Anthropic Engineering

> **Source:** Anthropic. "Writing Tools for Agents." Anthropic Engineering Blog.
>
> **URL:** https://www.anthropic.com/engineering/writing-tools-for-agents
>
> **Retrieved:** 2026-03-08

## Key Excerpts

### Tool Description Importance

> "We now come to one of the most effective methods for improving tools: prompt-engineering your tool descriptions and specs."

> "When writing tool descriptions and specs, think of how you would describe your tool to a new hire on your team."

### Implicit Context

Developers should make implicit context explicit, including "specialized query formats, definitions of niche terminology, relationships between underlying resources."

### Ambiguity and Naming

Avoid ambiguity through "clearly describing (and enforcing with strict data models) expected inputs and outputs." Use unambiguous parameter naming — replace generic terms like `user` with specific ones like `user_id`.

### Performance Evidence

> "Claude Sonnet 3.5 achieved state-of-the-art performance on the SWE-bench Verified evaluation after we made precise refinements to tool descriptions, dramatically reducing error rates and improving task completion."

> "Even small refinements to tool descriptions can yield dramatic improvements."

## Relevance to MCP Chatbot Testing

This source establishes that tool descriptions are the highest-leverage optimization point for agent tool use. In a chatbot context, this interacts with context pressure — well-crafted descriptions may mitigate degradation at depth, while verbose descriptions may accelerate it by consuming more context window.
