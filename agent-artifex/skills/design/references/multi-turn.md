# Multi-Turn Conversation Design — Design Reference

Single-turn quality does not predict multi-turn quality.[^1] Context length alone causes 13.9–85% performance decline.[^2] Unresolved coreferences silently corrupt tool arguments — explicit coreference tracking improves agent performance by up to 18%.[^3]

[^1]: Wang et al., MINT (ICLR 2024) — "Better single-turn performance does not guarantee better multi-turn performance."
[^2]: Du et al., (EMNLP Findings 2025) — "The sheer length of the input alone can hurt LLM performance, independent of retrieval quality and without any distraction...13.9%–85% performance decline."
[^3]: Chatterjee & Agarwal (2025) — "Explicit coreference tracking improves agent performance by up to 18% over standard approaches."

## Design Principles

**1. Design for context pressure from the start.** Context length alone hurts performance independent of retrieval quality and without any distraction — performance drops even with whitespace or masked irrelevant tokens.[^4] This is not a problem you can defer to optimization; it must inform the initial design.

[^4]: Du et al., (EMNLP Findings 2025) — "Performance drops even with whitespace/masked irrelevant tokens, forcing models to attend only to relevant information."

**2. Manage the four factors that accelerate context pressure.** (a) Verbose tool results: every token returned stays in context. (b) Many tool calls per conversation: each adds request + response. (c) Long system prompts. (d) Stateless APIs requiring full history each turn. Each factor is independently controllable. Prioritize reducing tool result verbosity — it compounds with every subsequent turn.

**3. Position critical information at the beginning or end of context.** Performance follows a U-shaped curve — highest when relevant information appears at the beginning or end of context, degrading significantly in the middle.[^5] This persists even in models designed for long contexts. When designing tool results that will be referenced later in the conversation, front-load the most important data.

[^5]: Liu et al., "Lost in the Middle" (TACL 2024) — "Performance is highest when relevant information appears at the beginning or end of context; degrades significantly in the middle."

**4. Design explicitly for coreference resolution.** LLMs hallucinate when resolving indirect references across turns. Standard RAG systems neglect syntactic dependencies, discourse relations, and coreference links.[^6] Design tool schemas so entity IDs from prior results can be unambiguously referenced — return stable identifiers, not just display names.

[^6]: Chatterjee & Agarwal (2025) — "Standard RAG systems neglect syntactic dependencies, discourse relations, and coreference links. Semantic anchoring...improves factual recall and discourse coherence by up to 18%."

**5. Expect multi-turn to require different optimization than single-turn.** Models gain 1–8% performance per successive tool-use turn with natural language feedback.[^7] But training techniques designed for single-turn improvement can hurt multi-turn capabilities.[^8] Validate your optimization choices against multi-turn benchmarks, not just single-turn metrics.

[^7]: Wang et al., MINT (ICLR 2024) — "Models gain 1–8% performance per successive tool-use turn" with natural language feedback.
[^8]: Wang et al., MINT (ICLR 2024) — "SIFT and RLHF generally hurt multi-turn capabilities."

**6. Design for conversation depth degradation.** Measure the same task at turns 1, 5, 10, 15+. Performance will degrade — the question is how fast and whether your mitigations are sufficient. Mitigations: summarize prior context, truncate verbose results, use dynamic tool loading to shed unused definitions at later turns.

**7. Preserve the full interaction sequence.** User prompts, model responses with tool calls, tool execution results — each with call ID references.[^9] Breaking this chain corrupts reasoning about prior actions. Never summarize away a tool call/result pair that the model may need to reference.

[^9]: OpenAI, "Function Calling" — Complete interaction sequence must be preserved: original user prompts, model responses with tool calls, tool execution results, each appended sequentially with `call_id` references.

## Assessment Criteria

- Tool results are concise (no gratuitous detail that inflates context)
- Entity IDs from tool results are designed to be referenceable in follow-up turns
- System prompt + tool definitions fit within a reasonable fraction of context window
- The system has been tested at conversation depths of 1, 5, 10, and 15+ turns
- No naming collisions between tools that would confuse coreference resolution

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Chatbot Integration)

**Related design areas:** [System Prompt Design](system-prompts.md) (prompt length contributes to context pressure), [Response Format Design](response-format.md) (result verbosity drives context growth), [Tool Set Architecture](tool-set-architecture.md) (dynamic loading mitigates context pressure)
