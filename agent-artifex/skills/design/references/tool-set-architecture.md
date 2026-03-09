# Tool Set Architecture — Design Reference

Before any individual tool is designed, the tool set as a whole must be architected. The set's size, organization, and discoverability determine how much context the LLM has left for actual work.

## Design Principles

**1. Tool definitions are expensive — budget them.** Anthropic observed definitions consuming 50K–134K tokens before the agent reads the request.[^1] Every definition counts against the context limit and is billed as input tokens.[^2] Measure your total tool definition footprint in tokens and track it as a first-class metric.

[^1]: Anthropic, "Introducing Advanced Tool Use" — "tool definitions can sometimes consume 50,000+ tokens before an agent reads a request." Internally observed up to 134K tokens.
[^2]: OpenAI, "Function Calling" — "callable function definitions count against the model's context limit and are billed as input tokens."

**2. Stay within model distribution limits.** Any setup with fewer than ~100 tools and fewer than ~20 arguments per tool is considered in-distribution.[^3] Beyond these limits, expect degradation in tool selection accuracy, argument inference, and ordering.

[^3]: OpenAI, "o3/o4-mini Function Calling Guide" — "Any setup with fewer than ~100 tools and fewer than ~20 arguments per tool is considered in-distribution."

**3. Use dynamic discovery for large tool sets.** Dynamic tool loading reduces token consumption by 85% — from ~77K to ~8.7K tokens — preserving 95% of context window.[^4] Use dynamic discovery when: definitions exceed 10K tokens, selection accuracy degrades, you have multiple MCP servers, or you expose 10+ tools.

[^4]: Anthropic, "Introducing Advanced Tool Use" — "From ~77K tokens (traditional) to ~8.7K tokens (tool search), preserving 95% of context window."

**4. Limit initially available tools.** Keep under 20 tools visible at any given time.[^5] Beyond this threshold, the LLM spends disproportionate attention parsing definitions rather than reasoning about the task. Use deferred loading to make additional tools available on demand.

[^5]: OpenAI, "Function Calling" — "limit initially available functions to under 20, use tool search for deferred loading, or employ fine-tuning to reduce token overhead."

**5. Disambiguate overlapping tools explicitly.** Tools with related functionality must cross-reference each other by name in their Limitations sections.[^6] If your server exposes both `search_documents` and `query_knowledge_base`, each description must state when to use the other.

[^6]: OpenAI, "o3/o4-mini Function Calling Guide" — "If multiple tools have overlapping purposes or vague descriptions, models may call the wrong one or hesitate to call any at all."

**6. Design tools for API coverage, not workflow coupling.** API coverage tools — where each tool maps to one capability — compose more flexibly than workflow tools that bundle multiple steps. Workflow tools reduce step count but close off options. Prefer granular tools that the LLM can compose into workflows over monolithic tools that embed assumptions about usage patterns.

**7. One intent per tool.** Avoid mega-tools that handle multiple unrelated operations via a mode parameter. The LLM selects better when tool boundaries match intent boundaries. A tool that creates, reads, updates, and deletes via a `mode` parameter should be four separate tools.

## Assessment Criteria

- Total tool definition token count is measured and budgeted
- No more than ~20 tools initially visible without dynamic discovery
- Overlapping tools cross-reference each other by name
- No tool handles multiple unrelated intents
- Tool set stays under ~100 tools / ~20 args per tool
- Dynamic discovery is implemented if definitions exceed 10K tokens

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Tool Description Quality + Agent Behavior)

**Related design areas:** [Tool Description Design](tool-descriptions.md) (individual tool quality within the set), [System Prompt Design](system-prompts.md) (context budget shared between prompt and definitions), [Multi-Turn Conversation Design](multi-turn.md) (dynamic loading mitigates context pressure)
