# Designing AI Services for Response Quality

Design principles for building AI tool services (MCP servers, agents, chatbots) that produce high-quality responses, grounded in empirical research.

**Audience:** Developers building MCP servers and chatbots, and architects evaluating existing designs.

**Core claim:** Response quality is the outcome of seven upstream design decisions. Each is independently designable and assessable.

**The causal chain:** Tool Description Quality → Agent Behavior → Server Correctness → Response Accuracy, with Chatbot Integration as a multi-turn overlay.

| Design Area | Primary Causal Chain Link | Also Affects |
|---|---|---|
| Tool Description Design | Discovery | Tool Selection |
| Parameter & Schema Design | Discovery + Invocation | Tool Selection |
| Error Message Design | Invocation | Tool Selection (recovery) |
| System Prompt Design | Tool Selection | Multi-Turn |
| Multi-Turn Conversation Design | Multi-Turn | Response Accuracy |
| Tool Set Architecture | Discovery | All downstream |
| Response Format Design | Invocation | Response Accuracy |

**How to use:** For builders — read the areas relevant to your current work, follow the design principles, use the assessment criteria to self-check. For evaluators — use the assessment criteria to score an existing system.

---

## 1. Tool Description Design

Tool descriptions are the root cause of most downstream quality issues. They are simultaneously a specification and a prompt instruction — the LLM reads them to decide what to do.[^1]

[^1]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "tool descriptions have a dual nature, functioning both as a requirement-like specification...and as a prompt-like instruction."

### Design Principles

**1. Purpose is the most critical component.** 44% of tools are smell-free on Purpose alone, but quality drops sharply when checking multiple components — down to just 2.9% across all five.[^2] Purpose must unambiguously state what the tool does and when to use it.

[^2]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "44% of tools are smell-free on Purpose alone...quality drops sharply when checking multiple components: 10.4% with Guidelines, 7.5% with Limitations, 3.0% with Parameters, and just 2.9% across all five."

**2. Usage Guidelines provide the highest-leverage behavioral cues.** Purpose + Guidelines alone can outperform full augmentation (67.50% vs 57.50% SR in Finance/GPT-4.1).[^3] Guidelines should include operational rules — domain-specific cues the LLM cannot infer from the tool name.[^4]

[^3]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "In Finance, the P+G configuration yields the highest SR of 67.50%, surpassing the full augmentation SR of 57.50%."
[^4]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "the Guidelines component provides critical operational cues (e.g., 'requested dates should include trading days' and 'set end_date one day later than expected')."

**3. Limitations must be concrete or absent.** Vague limitations degrade performance worse than no limitations at all — removing poorly written Limitations improved SR by 10 percentage points.[^5] Each limitation should name a specific constraint and cross-reference the alternative tool by name.

[^5]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Removing poorly written Limitations improved SR by 10 percentage points" in Finance/GPT-4.1.

**4. Examples are statistically dispensable.** Removing examples does not significantly degrade performance.[^6] FM-generated examples risk hallucination without execution traces.[^7] If you include examples, ensure they are derived from actual execution, not synthesized.

[^6]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Removing Examples does not significantly degrade performance (Cochran's Q, p > 0.20)."
[^7]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "the model cannot reliably generate factually grounded examples without execution traces, and doing so would risk introducing hallucinated or incorrect examples."

**5. Length is a trade-off, not a goal.** Augmented descriptions increase execution steps by 67.46% (median).[^8] Descriptions should be substantive (≥4 sentences) but concise. Optimize for the most impactful components (Purpose, Guidelines), not comprehensiveness.

[^8]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "augmented descriptions increase execution steps by 67.46% (median)" — Wilcoxon signed-rank, p < 0.001.

**6. Descriptions are domain-and-model-dependent.** No single configuration works universally.[^9] Test your specific descriptions against your specific model and domain. What improves Finance/GPT-4.1 may degrade Travel/Claude.

[^9]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "No single component combination consistently improves performance across all domains and models."

**7. Treat descriptions as first-class engineering artifacts.** Small refinements yield dramatic improvements — Claude Sonnet 3.5 achieved state-of-the-art SWE-bench performance after precise description refinements.[^10] Quality should be a blocking criterion for release.[^11]

[^10]: Anthropic, "Writing Tools for Agents" — "Even small refinements to tool descriptions can yield dramatic improvements...Claude Sonnet 3.5 achieved state-of-the-art performance on the SWE-bench Verified evaluation after we made precise refinements to tool descriptions."
[^11]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Treat tool descriptions as first-class engineering artifacts — quality should be a blocking criterion for release."

### Assessment Criteria

- Apply the six-component rubric (score ≥ 3 on each: Purpose, Usage Guidelines, Limitations, Parameter Explanation, Examples, Length)
- Check for inter-tool disambiguation (overlapping tools cross-reference each other)
- Verify length is ≥ 4 sentences but not gratuitously verbose
- 97.1% of descriptions have at least one smell — assume yours do too until proven otherwise[^12]

[^12]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "97.1% of tool descriptions contain at least one smell...Official servers (Anthropic, GitHub, PayPal) are statistically indistinguishable from community servers (all p-values > 0.17 with Bonferroni correction)."

---

## 2. Parameter & Schema Design

Parameters are how the LLM communicates intent to the server. Ambiguous parameters cause wrong arguments; missing output schemas prevent result validation. Both directions of the interface must be explicitly designed.

### Design Principles

**1. Every parameter needs four properties: type, meaning, behavioral effect, and required/default status.** Parameter Explanation has the highest inter-rater reliability (ICC 0.90) — it is the most objectively assessable component.[^1] Despite this clarity of standard, 84.3% of tools have opaque parameters.[^2]

[^1]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Parameter Explanation is the most objectively assessable component (ICC 0.90)."
[^2]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Opaque Parameters (84.3% prevalence)."

**2. Use specific, unambiguous parameter names.** Replace generic names with domain-specific ones. A parameter named `user` could mean a username, user ID, or user object — use `user_id` instead.[^3]

[^3]: Anthropic, "Writing Tools for Agents" — "Avoid ambiguity by clearly describing (and enforcing with strict data models) expected inputs and outputs."

**3. Enum parameters must list all valid values.** The LLM cannot guess valid options. Parameter descriptions that just repeat the property name provide no guidance. Every enum field should include the complete set of accepted values in its description.

**4. Declare output schemas.** Servers MUST conform to declared output schemas; clients SHOULD validate against them.[^4] Without output schemas, neither clients nor LLMs can reliably parse the returned data.

[^4]: MCP Specification (2025-06-18) — "Servers MUST conform to their declared output schemas...Without output schemas, clients and LLMs cannot reliably parse and utilize the returned data."

**5. Keep argument counts in-distribution.** Fewer than ~20 arguments per tool keeps the tool within the model's training distribution.[^5] Beyond this threshold, the model is more likely to omit required arguments or hallucinate parameter names.

[^5]: OpenAI, "o3/o4-mini Function Calling Guide" — "Any setup with fewer than ~100 tools and fewer than ~20 arguments per tool is considered in-distribution."

**6. Control parallel tool calling explicitly.** When tool ordering matters, disable parallel calls or explicitly outline the required sequence in the system prompt.[^6] Models may call tools in the wrong order when allowed to parallelize freely.

[^6]: OpenAI, "o3/o4-mini Function Calling Guide" — "It can make mistakes in the order of the tool calls. To guard against these cases, it is recommended to explicitly outline the orders to accomplish certain tasks."

### Assessment Criteria

- Every parameter has a `.describe()` annotation beyond the property name
- Enum parameters list valid values
- Output schemas are declared for all tools
- No tool exceeds ~20 parameters
- Ordering-sensitive tools document their sequencing requirements

---

## 3. Error Message Design

When a tool fails, the error message IS the LLM's only information for deciding what to do next. Error text is passed directly to the LLM for interpretation.[^1]

[^1]: Anthropic, "Implementing Tool Use" — "By default, tool errors are passed back to Claude, which can then respond appropriately."

### Design Principles

**1. Structure errors for non-human consumers.** Status codes and raw exceptions are insufficient for machine consumption.[^2] Use structured fields: problem type, causal input, detail, recovery suggestion. The consumer of your error is an LLM, not a developer reading logs.

[^2]: RFC 9457 (IETF), "Problem Details for HTTP APIs" — "HTTP status codes cannot always convey enough information about errors to be helpful. While humans using web browsers can often understand an HTML response content, non-human consumers of HTTP APIs have difficulty doing so."

**2. Every error must name four things: the problem, the input that caused it, why it failed, and what to try instead.** The recovery action is critical — it tells the LLM which tool to call next. Example: "ADR not found: no ADR with ID 'adr-99'. Use query_adrs to find available ADR IDs."

**3. Never expose internal implementation details.** Stack traces, raw exceptions, and opaque codes are anti-patterns. The LLM cannot act on `TypeError: Cannot read properties of undefined (reading 'map')`. It can act on "No results found for query 'xyz'. Broaden the search terms or use list_all to see available items."

**4. Error messages must exceed minimum information density.** Messages under 20 characters are almost certainly too terse to be actionable. A message like "Not found" gives the LLM no basis for recovery. "ADR not found: no ADR with ID 'adr-99'. Use query_adrs to find available ADR IDs." gives it a complete recovery path.

**5. Distinguish protocol errors from tool execution errors.** MCP defines two classes of errors with different semantics and recovery paths.[^3] Protocol errors (unknown tool, invalid arguments) indicate bugs in the calling code. Tool execution errors indicate runtime failures that the LLM may be able to recover from. Design tool execution errors to be recoverable; protocol errors should never reach the user.

[^3]: MCP Specification (2025-06-18) — Protocol errors use JSON-RPC error codes (unknown tools, invalid arguments); tool execution errors use `isError: true` with descriptive text like "Failed to fetch weather data: API rate limit exceeded."

### Assessment Criteria

- No error messages contain stack traces (regex: `/Error\s+at\s/`, `/at\s+\w+\s+\(/`)
- No raw exception types (regex: `/^(TypeError|ReferenceError|Error):/`)
- All error messages > 20 characters
- Error messages include a recovery action referencing a specific tool
- Tool execution errors use `isError: true` with structured detail

---

## 4. System Prompt Design

System prompts and tool definitions compete for the same context window and the same LLM attention. This section covers what the evidence supports — the interaction between system prompts and tool definitions.

### Design Principles

**1. Avoid capability overlap between system prompt and tool descriptions.** When the system prompt contains domain knowledge that overlaps with a tool's domain, the LLM may answer from the prompt instead of calling the tool. If a tool returns product pricing, the system prompt should not also contain a pricing table.

**2. Design for four conflict types.** (a) Instruction conflict: system prompt says "always respond in JSON" but a tool returns markdown. (b) Naming collision: two MCP servers both expose a `query` tool. (c) Priority ambiguity: system prompt says "be concise" but tool results are verbose. (d) Capability overlap: system prompt describes information that a tool returns. Each creates a different failure mode and requires different mitigation.

**3. System prompts consume context that tool definitions need.** Tool definitions can consume 50,000+ tokens before an agent reads a request — Anthropic internally observed up to 134K tokens.[^1] Callable function definitions count against the model's context limit and are billed as input tokens.[^2] Keep system prompts lean — behavioral instructions, not domain knowledge.

[^1]: Anthropic, "Introducing Advanced Tool Use" — Tool definitions "can sometimes consume 50,000+ tokens before an agent reads a request." Anthropic internally observed 134K tokens.
[^2]: OpenAI, "Function Calling" — "callable function definitions count against the model's context limit and are billed as input tokens."

**4. Explicitly outline tool-call ordering when it matters.** The system prompt is the right place to encode workflow sequencing, not the individual tool descriptions.[^3] When multiple tools must be called in a specific order, state the sequence explicitly: "To create a deployment, first call get_environments, then call create_release with the environment ID."

[^3]: OpenAI, "o3/o4-mini Function Calling Guide" — "It can make mistakes in the order of the tool calls. To guard against these cases, it is recommended to explicitly outline the orders to accomplish certain tasks."

**5. System prompt instructions should complement, not duplicate, tool descriptions.** Duplication wastes context tokens and creates a maintenance burden where changes must be synchronized. If a tool's Limitations section says "does not support date ranges before 2020," the system prompt should not repeat this constraint.

### Assessment Criteria

- No domain knowledge in the system prompt that duplicates a tool's output
- No naming collisions across MCP servers
- System prompt length is proportionate to tool definition footprint
- Ordering-sensitive workflows are documented in the system prompt
- System prompt instructions don't contradict tool description Guidelines or Limitations

---

## 5. Multi-Turn Conversation Design

Single-turn quality does not predict multi-turn quality.[^1] Context length alone causes 13.9–85% performance decline.[^2] Unresolved coreferences silently corrupt tool arguments — explicit coreference tracking improves agent performance by up to 18%.[^3]

[^1]: Wang et al., MINT (ICLR 2024) — "Better single-turn performance does not guarantee better multi-turn performance."
[^2]: Du et al., (EMNLP Findings 2025) — "The sheer length of the input alone can hurt LLM performance, independent of retrieval quality and without any distraction...13.9%–85% performance decline."
[^3]: Chatterjee & Agarwal (2025) — "Explicit coreference tracking improves agent performance by up to 18% over standard approaches."

### Design Principles

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

### Assessment Criteria

- Tool results are concise (no gratuitous detail that inflates context)
- Entity IDs from tool results are designed to be referenceable in follow-up turns
- System prompt + tool definitions fit within a reasonable fraction of context window
- The system has been tested at conversation depths of 1, 5, 10, and 15+ turns
- No naming collisions between tools that would confuse coreference resolution

---

## 6. Tool Set Architecture

Before any individual tool is designed, the tool set as a whole must be architected. The set's size, organization, and discoverability determine how much context the LLM has left for actual work.

### Design Principles

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

### Assessment Criteria

- Total tool definition token count is measured and budgeted
- No more than ~20 tools initially visible without dynamic discovery
- Overlapping tools cross-reference each other by name
- No tool handles multiple unrelated intents
- Tool set stays under ~100 tools / ~20 args per tool
- Dynamic discovery is implemented if definitions exceed 10K tokens

---

## 7. Response Format Design

Tool results are the raw material from which the LLM synthesizes the user's answer. The shape, consistency, and fidelity of results directly determine whether the response is faithful and complete. A malformed result degrades every subsequent FM decision.[^1]

[^1]: MCP Specification (2025-06-18) — tool results feed directly into the FM's context for the next iteration. Fowler, "ContractTest" — "the format of the data matters rather than the actual data." A malformed result degrades every subsequent decision because the LLM reasons over it as ground truth.

### Design Principles

**1. Result schemas must be consistent across tools.** When tools return data in unpredictable shapes, the LLM must guess how to parse each result. Use the same field names, nesting patterns, and data types for equivalent concepts across your entire tool set. The format of the data matters rather than the actual data.[^2]

[^2]: Fowler, "ContractTest" — "the format of the data matters rather than the actual data."

**2. Results must accurately reflect domain state.** The LLM reasons directly over tool results. Faithfulness scoring measures supported claims divided by total claims — a score of 1.0 means no hallucinations.[^3] But faithfulness evaluation only works if the tool results themselves are correct. Garbage in, faithful garbage out.

[^3]: RAGAS (Es et al., arXiv:2309.15217) — Faithfulness = supported claims / total claims. A score of 1.0 means no hallucinations — but only works if the tool results themselves are correct.

**3. Design results for both machine parsing and LLM synthesis.** Support JSON for programmatic validation and structured text for LLM reasoning. Avoid raw data dumps that force heavy transformation. A tool that returns a 500-row CSV when the user asked for a summary wastes context and degrades reasoning.

**4. Control result verbosity to manage context pressure.** Every token stays in context for the rest of the conversation, and context length alone causes 13.9–85% performance degradation.[^4] Return what the user needs, not everything the API provides. Use pagination (has_more/next_offset/total_count) for large result sets.

[^4]: Du et al., (EMNLP Findings 2025) — Context length alone causes 13.9%–85% performance degradation.

**5. Use the two-phase quality standard.** Phase 1 — Eligibility: does the response answer the query? Phase 2 — Grounding: is every claim traceable to a tool result? Both must pass.[^5] Design tool results so both checks are possible — results must contain enough information for the LLM to answer (eligibility) and enough specificity to verify claims against (grounding).

[^5]: Google DeepMind, FACTS Grounding — Two-phase evaluation: eligibility (does it answer the query?) then grounding (is it factually grounded?). Must pass both.

**6. Design for claim decomposition.** Tool results should contain discrete, verifiable facts — counts, IDs, statuses, dates, named entities. Ambiguous aggregations ("several," "many") undermine verification. Break responses into atomic claims and verify each against evidence.[^6]

[^6]: Anthropic, "Demystifying Evals for AI Agents" — Break responses into atomic claims and verify each against evidence. Grading approach: "Prefer deterministic graders where possible; use LLM graders where necessary."

### Assessment Criteria

- All tools declare output schemas and conform to them
- Equivalent concepts use the same field names and types across tools
- Result payloads are sized for context budget (no gratuitous fields)
- Large result sets use pagination
- Results contain discrete, verifiable facts (counts, IDs, statuses) not just narrative
- Non-deterministic fields (UUIDs, timestamps) follow predictable patterns
