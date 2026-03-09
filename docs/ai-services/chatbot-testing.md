# Chatbot Integration — Multi-Turn Agent Behavior

> Part of [AI Services Framework](framework.md).
>
> Extends: **[Agent Behavior](agent-behavior.md)** and **[Response Accuracy](response-accuracy.md)** | Test type: **Behavioral (LLM in loop, multi-turn)**

**Verify that MCP tool quality demonstrated in single-turn isolation survives multi-turn conversational deployment**[^1] — where the agent maintains conversation history, resolves ambiguous references from prior turns, accumulates intent across messages, and presents results within an ongoing dialogue.

**High-quality chatbot integration** means the agent resolves conversational references into correct tool arguments,[^8] maintains tool selection accuracy as conversation history grows,[^2][^4] orchestrates multi-turn workflows without losing user intent,[^3] handles system prompt conflicts with tool descriptions gracefully,[^14] presents tool results appropriately for the conversational context,[^16] and recovers from infrastructure failures without hallucinating results.[^17]

**How to compare two outputs:** Run the same multi-turn conversation scripts against both configurations and measure: (1) coreference resolution rate (CRR) — did the agent resolve indirect references into correct tool arguments? (2) depth-adjusted success rate (DASR) — does tool selection accuracy hold at turn 15 as well as turn 1?[^4] (3) workflow completion rate (WCR) — did multi-turn workflows complete successfully? (4) reliability score — mean of function name recall and function argument recall.[^5] These require an LLM in the loop across multiple conversation turns — they are behavioral properties invisible to single-turn testing.[^1]

---

## What should be tested

1. **Coreference and anaphora resolution.** The agent must resolve conversational references ("that one," "the same query," "the other ADR") into concrete tool arguments. This directly corrupts tool arguments — producing a valid tool call with wrong values, which is harder to detect than a wrong tool selection. LLMs can produce hallucinations when resolving coreferences,[^7] and explicit coreference tracking improves agent performance by up to 18% over standard approaches.[^8]

2. **Multi-turn workflow orchestration.** Users build up requests across multiple messages. The agent must accumulate intent, know when enough context exists to act, and execute tools in the right order. "Better single-turn performance does not guarantee better multi-turn performance."[^1] FMs "can make mistakes in the order of the tool calls" even in single-turn;[^10] multi-turn workflows amplify this because ordering spans conversation turns.

3. **Context window pressure.** As conversation history grows, tool definitions compete with prior turns for the FM's attention. Performance is highest when relevant information appears at the beginning or end of context, but "degrades significantly" in the middle.[^2] Context length alone causes 13.9%–85% performance degradation, "independent of retrieval quality and without any distraction."[^4] Tool definitions can consume 50K–134K tokens;[^11] function definitions "count against the model's context limit."[^12]

4. **System prompt and tool description interaction.** Tool descriptions that work in isolation may collide with system prompts, other MCP servers' tools, or custom instructions. "If multiple tools have overlapping purposes or vague descriptions, models may call the wrong one or hesitate to call any at all."[^14]

5. **Tool result presentation.** The agent transforms tool results for the user — summarizing, formatting, and adapting detail level. A faithful, complete answer can still be useless if over-summarized, dumped as raw JSON, or disconnected from the conversational context. Grade "what the agent produced, not the path it took."[^16]

6. **Graceful degradation.** The agent must handle MCP server failures, timeouts, rate limits, and context window exhaustion without hallucinating results. Tool errors are "passed directly to the LLM for interpretation"[^17] — testing verifies the agent uses this information constructively. The MCP specification requires clients to "implement timeouts" and servers to "rate limit tool invocations."[^19]

---

## How to test

Chatbot integration testing is **entirely LLM-in-the-loop** and **multi-turn**.[^20] Every test requires running a multi-turn conversation with a real FM, making these the most expensive tests in the guidelines. "Don't run live LLM tests in CI. Too expensive, too slow, too flaky."[^20] Run on-demand and aggregate: "a single run tells us almost nothing but patterns tell us everything."[^21]

An empirical study of AI agent testing found that over 70% of testing effort focuses on deterministic components, while less than 5% addresses FM-based planning and approximately 1% covers prompts[^6] — the very components that chatbot integration testing exercises.

### Impact and effort summary

| Test | Impact on chatbot quality | Effort | Determinism |
|---|---|---|---|
| **1. Coreference resolution** | **Highest.** Silent argument corruption — the tool call looks valid but uses wrong values.[^7] | High. Multi-turn scenario execution with FM. Must seed prior turns with resolvable references. | Non-deterministic. Run 5+ times per scenario.[^21] |
| **2. Multi-turn workflows** | **High.** Intent accumulation and workflow sequencing — the core value proposition of a chatbot over a single-turn interface.[^1] | High. Scripted multi-message conversations with branching and interruption. | Non-deterministic. Workflow paths may vary. |
| **3. Context pressure** | **Moderate–High.** Invisible in single-turn tests. Performance degrades 13.9%–85% with context length.[^4] | Very high. Same scenario at multiple conversation depths, multiplying cost by depth count. | Non-deterministic. Degradation varies by run. |
| **4. System prompt interaction** | **Moderate.** Important with complex system prompts or multiple MCP servers.[^14] | Medium. Define realistic system prompt + tool definition combinations. Reuse single-turn scenarios. | Non-deterministic. Conflict severity varies by FM. |
| **5. Presentation quality** | **Moderate.** User experience, not factual correctness. Subjective grading.[^16] | Medium. Extend Response Accuracy scenarios with presentation rubric. FM-graded. | Non-deterministic. Subjective. |
| **6. Graceful degradation** | **Moderate.** Critical for production reliability.[^17] | Medium. Failure injection is deterministic; agent response grading is behavioral.[^20] | Hybrid. Controlled failures; non-deterministic response. |

**Practical implication:** Prioritize coreference resolution and multi-turn workflows — they catch the highest-impact chatbot-specific failures. Add context pressure testing before production deployment. System prompt interaction and presentation quality are important but secondary. "Adopt eval-driven development: Evaluate early and often."[^22]

### Designing multi-turn test scenarios

A multi-turn scenario is a scripted conversation — a sequence of user messages with expected agent behaviors at each turn. Microsoft ISE's production-tested approach uses an LLM-powered User Agent that simulates realistic multi-turn conversations following "scenario-specific instructions representing user intent and business context."[^5] Their "test case factory" generates hundreds of scenarios using templates with automated data injection.[^23]

**Scenario structure:**

| Component | Description | Example |
|---|---|---|
| **Conversation script** | Ordered list of user messages | Turn 1: "Create an ADR about PostgreSQL" → Turn 2: "We chose it for JSONB support" → Turn 3: "Check its quality" |
| **Turn-level assertions** | Expected behavior per turn | Turn 3: agent calls assess_adr_quality with the ID from turn 1's result |
| **Conversation-level assertions** | Expected outcome of the full conversation | ADR created AND quality assessed. All coreferences resolved. |
| **Context seed** (optional) | Prior conversation history to prepend | 10 turns of unrelated conversation to test context pressure |
| **System prompt** (optional) | Agent system prompt to test interaction | "Always confirm before creating records." |

Each trial should be isolated — "unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures."[^24]

**Scenario categories:**

1. **Coreference scenarios** — Short (2–4 turns). Seed a tool result in turn 1, reference it indirectly in turn 2. Assert correct argument resolution.
2. **Workflow scenarios** — Medium (3–6 turns). Incremental information or multi-step workflow. Assert correct tool sequence with accumulated context.
3. **Pressure scenarios** — Long (10–20 turns). Prepend realistic conversation history, then issue a standard tool-selection query. Compare accuracy against turn 1.
4. **Conflict scenarios** — Any length. Pair a system prompt with tool definitions that create tension. Assert graceful handling.
5. **Degradation scenarios** — Any length. Inject failures at specific turns. Assert clear reporting without hallucination.
6. **Interruption scenarios** — Medium (4–6 turns). Start a workflow, interrupt, resume. Assert prior context intact.

### Tier 1: Code-graded checks

Coreference resolution and workflow tool selection are code-gradeable — the expected argument values and tool names are known from the scenario definition. "Code-based grading is the best grading method if possible, as it is fast and highly reliable."[^25]

#### Coreference resolution grading

The expected argument value is known from the seeded tool result. Compare the agent's actual tool call arguments against the expected resolved values.

**Categories of references to test:**

| Reference type | Example | Resolution source |
|---|---|---|
| **Result reference** | "check the quality of that one" | Prior tool result (extract ID, name, etc.) |
| **Argument echo** | "same query but for Q4" | Prior tool call arguments (change one value) |
| **Implicit context** | "now make sure it's well-written" | Prior turn's result implies which resource |
| **Negation reference** | "the other one, not that one" | Prior results + exclusion logic |
| **Plural accumulation** | "check all three of those" | Multiple prior results |

```typescript
// Example: coreference grading
// Turn 1 tool result contained: { id: "adr-007", title: "Use PostgreSQL" }
// Turn 2 user message: "check the quality of that one"
// Expected: agent calls assess_adr_quality({ id: "adr-007" })

const actualArgs = capturedToolCall.arguments;
expect(actualArgs.id).toBe("adr-007"); // Coreference correctly resolved
```

#### Workflow tool sequence grading

Assert the correct tools were called with correct arguments across turns. Grade outcomes, not paths — "it's often better to grade what the agent produced, not the path it took."[^16]

**Patterns to test:**

| Pattern | Description | Key assertion |
|---|---|---|
| **Incremental specification** | User provides tool arguments across 2–4 messages | Agent calls the tool with complete, correct values |
| **Conditional branching** | "If the quality score is low, fix it" | Agent selects the next tool based on a prior result |
| **Iterative refinement** | "Change the context section" | Agent calls update tool with correct resource and only changed fields |
| **Workflow discovery** | "Help me create and review an ADR" | Agent identifies the correct multi-tool sequence |
| **Interruption recovery** | Unrelated question mid-workflow, then "back to the ADR" | Agent resumes with prior context intact |

#### Context pressure measurement

Run the same tool-selection scenario at different conversation depths. Compare accuracy against baseline (turn 1) to quantify degradation.

| Conversation depth | Expected behavior |
|---|---|
| Turn 1 (clean context) | Baseline — should match single-turn Agent Behavior results |
| Turn 5 (light history) | Tool selection should remain stable |
| Turn 10 (moderate history) | Watch for argument quality degradation |
| Turn 15+ (heavy history) | Watch for tool selection errors, hallucinated arguments, ignored tool results |

**Factors that accelerate context pressure:**

- **Verbose tool results.** Large JSON payloads consume disproportionate context.
- **Many tool calls per conversation.** Each adds both call and result to context.
- **Long system prompts.** Compete with tool definitions and history for context window space.
- **Stateless APIs.** The Messages API requires full conversational history each time,[^13] so context grows linearly with depth.

### Tier 2: FM-graded checks (on-demand)

Presentation quality, system prompt conflict severity, and graceful degradation require FM-based grading. These are non-deterministic and incur API costs — run on-demand, not per commit.[^20]

#### System prompt conflict testing

Define system prompt + tool definition combinations that create realistic tensions. Run tool selection scenarios with and without the conflicting system prompt. Compare tool selection accuracy and argument quality.

| Conflict type | Example | Failure mode |
|---|---|---|
| **Instruction conflict** | System prompt: "always confirm before creating records"; tool: "creates immediately" | Hesitation, unnecessary confirmation, or bypassed safeguard |
| **Naming collision** | Two MCP servers both expose a `query` tool | Wrong server's tool selected |
| **Priority ambiguity** | System prompt: "prefer simple answers"; tool: "provide comprehensive analysis" | Inconsistent detail levels |
| **Capability overlap** | System prompt gives built-in knowledge overlapping a tool | Answers from training data instead of calling tool |

#### Presentation quality grading

Grade on two dimensions beyond faithfulness/completeness:

- **Relevance to conversational context:** Does the answer connect to what the user asked, referencing prior conversation where appropriate?
- **Appropriate detail level:** Is detail proportional to the query? (Quick question → concise answer. Detailed request → comprehensive response.)

**Anti-patterns to flag:** over-summarization (critical information lost), under-summarization (raw JSON dumped), missing conversational framing ("Here are the results" without context), format inconsistency across turns.

#### Graceful degradation testing

Inject failures into the MCP transport layer and verify the agent's conversational response.

| Failure mode | Expected behavior | Anti-pattern |
|---|---|---|
| **MCP server unreachable** | Inform user, suggest retry | Hang, empty response, or hallucinated result |
| **Tool call timeout** | Inform user, offer retry | Silently drop request |
| **Rate limit exceeded** | Inform user, suggest waiting | Tight retry loop |
| **Context window full** | Summarize older turns; maintain tool definitions | Drop tool definitions or crash |
| **Malformed tool result** | Report unexpected response | Parse incorrectly, present wrong data |
| **Partial tool failure** | Report what succeeded and what failed | Hide partial result |

Microsoft ISE's error analysis approach — reviewing full conversation histories to identify "redundant calls, misinterpreted user intent, and workflow disruptions"[^23] — applies directly.

### Metrics

Extend the Agent Behavior metrics (SR, AE, AS) with chatbot-specific measures:

**Coreference Resolution Rate (CRR):** Fraction of conversational references resolved to the correct tool argument value.

```
CRR = (correctly resolved references) / (total references in scenario) × 100
```

**Workflow Completion Rate (WCR):** Fraction of multi-turn workflows where all required tools are called with correct arguments across all turns.

```
WCR = (completed workflows) / (total workflow scenarios) × 100
```

**Depth-Adjusted Success Rate (DASR):** Tool selection accuracy at a specific conversation depth, compared against baseline.

```
DASR(depth=N) = SR at turn N
Degradation = SR(turn 1) − SR(turn N)
```

**Presentation Score (PS):** FM-graded measure of result presentation quality (1–5 scale, relevance and appropriate detail).

**Reliability Score:** Mean of function name recall and function argument recall — Microsoft ISE's composite metric for automated multi-turn evaluation.[^5]

### When to run

| Test type | Trigger | Rationale |
|---|---|---|
| **Coreference scenarios** | Before releases that change tool schemas or response formats | Schema changes break reference resolution. |
| **Workflow scenarios** | Before releases that add or modify tools | New tools change workflow possibilities. |
| **Pressure scenarios** | Before production deployment; periodically as audit | Deployment-specific — depends on expected conversation lengths.[^2][^4] |
| **Conflict scenarios** | When changing system prompts or adding MCP servers | System prompt changes affect all tool interactions.[^14] |
| **Degradation scenarios** | Before production deployment | Standard reliability testing.[^17] |
| **Interruption scenarios** | Before releases that change multi-tool workflows | Interruption recovery depends on context management. |

---

## Evidence base

Unlike the other four guidelines, chatbot integration testing does **not** have a single primary empirical paper. Hasan et al. ("MCP Tool Descriptions Are Smelly!") evaluates single-turn tool selection only — it does not study multi-turn conversations, coreference resolution, or context pressure effects.

The evidence base draws from multiple sources:

- **Wang et al. (MINT, ICLR 2024)** — The primary empirical evidence that single-turn and multi-turn tool use are fundamentally different capabilities.[^1]
- **Liu et al. ("Lost in the Middle," TACL 2024)** — Positional degradation in long contexts, directly applicable to tool definitions buried in conversation history.[^2]
- **Du et al. (EMNLP Findings 2025)** — Context length alone degrades performance by 13.9%–85%, independent of information position.[^4]
- **Chatterjee & Agarwal (2025)** — Explicit coreference resolution improves agent performance by up to 18% over standard approaches.[^8]
- **Hasan et al. (2025, testing practices)** — Quantifies the testing gap: 70%+ effort on deterministic components, <5% on FM-based planning, ~1% on prompts.[^6]
- **Microsoft ISE** — Production-tested methodology for multi-turn chatbot evaluation with function calling.[^5]
- **Anthropic, OpenAI** — Official documentation on multi-turn tool use, context management, and tool description best practices.[^11][^12][^13][^14][^15]
- **Block Engineering** — Testing pyramid framework for AI agents.[^20][^21]

**Honest gaps:** No study provides controlled experiments measuring (a) coreference resolution accuracy specifically in tool-calling agents, (b) tool selection degradation as a function of conversation depth, or (c) system prompt / tool description interaction effects. The claims about these areas are grounded in adjacent evidence and architectural reasoning. Empirical measurement would strengthen the guidelines.

**Diagnostic flow:** When chatbot integration tests fail but single-turn tests pass, the problem is conversational — context pressure, coreference resolution, or workflow orchestration. When both fail, fix the single-turn failures first. Tool descriptions must be high quality for chatbot integration to succeed — "even small refinements to tool descriptions can yield dramatic improvements."[^15] Server results feed coreference resolution — inconsistent schemas or missing fields prevent reference resolution.[^17]

---

## Footnotes

[^1]: Wang, X. et al. (2024). "MINT: Evaluating LLMs in Multi-turn Interaction with Tools and Language Feedback." ICLR 2024. Key finding: "Better single-turn performance does not guarantee better multi-turn performance." Models gain 1–8% per tool-use turn. SIFT and RLHF "generally hurt multi-turn capabilities." ([source](https://arxiv.org/abs/2309.10691); local copy: `sources/wang-mint-multi-turn-interaction.md`)

[^2]: Liu, N.F. et al. (2024). "Lost in the Middle: How Language Models Use Long Contexts." TACL 2024. "Performance can degrade significantly when changing the position of relevant information." Performance is highest at the beginning or end of context; it degrades substantially in the middle. This holds even for explicitly long-context models. ([source](https://arxiv.org/abs/2307.03172); local copy: `sources/liu-lost-in-the-middle.md`)

[^3]: Wang, X. et al. (2024). MINT: Models gain 2–17% from natural language feedback per turn, demonstrating that multi-turn interaction adds value — but only when the agent correctly manages accumulated context. ([source](https://arxiv.org/abs/2309.10691); local copy: `sources/wang-mint-multi-turn-interaction.md`)

[^4]: Du, Y. et al. (2025). "Context Length Alone Hurts LLM Performance Despite Perfect Retrieval." Findings of EMNLP 2025. "The sheer length of the input alone can hurt LLM performance, independent of retrieval quality and without any distraction." Substantial declines of 13.9%–85% as input length increases, even within claimed context windows. ([source](https://aclanthology.org/2025.findings-emnlp.1264/); local copy: `sources/du-context-length-hurts-performance.md`)

[^5]: Microsoft ISE, "Taming Complexity: Intuitive Evaluation Framework for Agentic Chatbots in Business-Critical Environments." LLM-powered User Agent simulates realistic multi-turn conversations following "scenario-specific instructions representing user intent and business context." Reliability Score = mean of function name recall and function argument recall. ([source](https://devblogs.microsoft.com/ise/intuitive-evaluation-framework-for-agentic-chatbots/); local copy: `sources/microsoft-ise-chatbot-evaluation.md`)

[^6]: Hasan, M.M. et al. (2025). "An Empirical Study of Testing Practices in Open Source AI Agent Frameworks and Agentic Applications." Examined 39 frameworks and 439 applications: "Over 70% of testing focuses on deterministic components (tools and workflows)" while "less than 5% addresses the FM-based planning component" and "approximately 1% covers prompt testing." ([source](https://arxiv.org/abs/2509.19185); local copy: `sources/hasan-testing-practices-ai-agents.md`)

[^7]: Improving LLMs' Learning of Coreference Resolution (SIGdial 2025): Prompt-based LLMs surpass unsupervised systems but still underperform supervised models for coreference. LLMs produce hallucinations when resolving coreferences. ([source](https://aclanthology.org/2025.sigdial-1.25/))

[^8]: Chatterjee, M. & Agarwal, D. (2025). "Semantic Anchoring in Agentic Memory." Semantic anchoring — combining dependency parsing, discourse tagging, and coreference resolution — "improves factual recall and discourse coherence by up to 18% over strong RAG baselines." ([source](https://arxiv.org/abs/2508.12630); local copy: `sources/chatterjee-semantic-anchoring-agentic-memory.md`)

[^9]: Wang, X. et al. (2024). MINT: Models "generally benefit from repeated tool interactions, gaining 1–8% in performance for each successive turn of tool utilization." ([source](https://arxiv.org/abs/2309.10691); local copy: `sources/wang-mint-multi-turn-interaction.md`)

[^10]: OpenAI, "o3/o4-mini Function Calling Guide": "It can make mistakes in the order of the tool calls. To guard against these cases, it is recommended to explicitly outline the orders to accomplish certain tasks." ([source](https://developers.openai.com/cookbook/examples/o-series/o3o4-mini_prompting_guide); local copy: `sources/openai-o3-function-calling-guide.md`)

[^11]: Anthropic, "Introducing Advanced Tool Use": Tool definitions "can sometimes consume 50,000+ tokens before an agent reads a request." Anthropic internally observed definitions consuming 134K tokens prior to optimization. Dynamic tool discovery reduces this to ~8.7K tokens, "preserving 95% of context window" — "an 85% reduction in token usage." ([source](https://www.anthropic.com/engineering/advanced-tool-use); local copy: `sources/anthropic-advanced-tool-use.md`)

[^12]: OpenAI, "Function Calling": "Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means callable function definitions count against the model's context limit and are billed as input tokens." ([source](https://developers.openai.com/api/docs/guides/function-calling); local copy: `sources/openai-function-calling.md`)

[^13]: Anthropic, "Tool use with Claude": The Messages API is stateless — full conversational history must be sent each time. All prior tool calls and results must be preserved in the conversation history for multi-turn tool use. ([source](https://docs.anthropic.com/en/docs/build-with-claude/tool-use); local copy: `sources/anthropic-implement-tool-use.md`)

[^14]: OpenAI, "o3/o4-mini Function Calling Guide": "If multiple tools have overlapping purposes or vague descriptions, models may call the wrong one or hesitate to call any at all." Also: "any setup with fewer than ~100 tools and fewer than ~20 arguments per tool is considered in-distribution." ([source](https://developers.openai.com/cookbook/examples/o-series/o3o4-mini_prompting_guide); local copy: `sources/openai-o3-function-calling-guide.md`)

[^15]: Anthropic, "Writing Tools for Agents": "Even small refinements to tool descriptions can yield dramatic improvements." Developers should make implicit context explicit, including "specialized query formats, definitions of niche terminology, relationships between underlying resources." ([source](https://www.anthropic.com/engineering/writing-tools-for-agents); local copy: `sources/anthropic-writing-tools-for-agents.md`)

[^16]: Anthropic, "Demystifying Evals for AI Agents": "It's often better to grade what the agent produced, not the path it took." Also: "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^17]: MCP Specification, Tools (2025-06-18): Tool execution errors are "reported in tool results with `isError: true`" with error text passed directly to the LLM. ([source](https://modelcontextprotocol.io/specification/2025-06-18/server/tools); local copy: `sources/mcp-spec-tools-2025-06-18.md`)

[^18]: Anthropic, "How to Implement Tool Use": "By default, tool errors are passed back to Claude, which can then respond appropriately." ([source](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use); local copy: `sources/anthropic-implement-tool-use.md`)

[^19]: MCP Specification, Tools (2025-06-18), Security: Servers MUST "rate limit tool invocations." Clients SHOULD "prompt for user confirmation on sensitive operations," "validate tool results before passing to LLM," and "implement timeouts." ([source](https://modelcontextprotocol.io/specification/2025-06-18/server/tools); local copy: `sources/mcp-spec-tools-2025-06-18.md`)

[^20]: Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog. CI philosophy: "Don't run live LLM tests in CI. Too expensive, too slow, too flaky." Base layer: "fast, cheap, and completely deterministic." ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^21]: Jones, A. (2026). "Testing Pyramid for AI Agents." Upper layer: "A single run tells us almost nothing but patterns tell us everything." Benchmarks "run multiple times and aggregate results. Regression does not mean 'the output changed.' It means 'success rates dropped.'" ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^22]: OpenAI, "Evaluation Best Practices": "Adopt eval-driven development: Evaluate early and often. Write scoped tests at every stage." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)

[^23]: Microsoft ISE, "Taming Complexity": Ground truth generation uses a "test case factory" approach with "scenario templates with placeholders for business data" and "automated injection of real enterprise data." Error analysis reviews conversation histories to identify "redundant calls, misinterpreted user intent, and workflow disruptions." ([source](https://devblogs.microsoft.com/ise/intuitive-evaluation-framework-for-agentic-chatbots/); local copy: `sources/microsoft-ise-chatbot-evaluation.md`)

[^24]: Anthropic, "Demystifying Evals for AI Agents": "Each trial should be 'isolated' by starting from a clean environment. Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^25]: Anthropic, "Building Evals" cookbook: "Code-based grading is the best grading method if possible, as it is fast and highly reliable." ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)
