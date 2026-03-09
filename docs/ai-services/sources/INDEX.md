# Source Index

Reference materials for the [AI Services Framework](../framework.md). Each source is a local copy of an authoritative document, downloaded for traceability. All assertions in the guideline documents are grounded in these sources.

---

## By topic

### MCP Tool Descriptions (Primary Research)

| Source | File | Key contribution |
|---|---|---|
| Hasan et al., "MCP Tool Descriptions Are Smelly!" (arXiv 2602.14878v1) | [`mcp-tool-description-smells.txt`](mcp-tool-description-smells.txt) | Full paper. Six-component rubric, smell taxonomy, augmentation experiments (+5.85pp SR, +15.12% AE). The primary empirical foundation for tool-description-quality, agent-behavior, server-correctness, and response-accuracy guidelines. |
| Briefing document (extracted findings, 56 footnotes) | [`briefing-mcp-tool-description-smells.md`](briefing-mcp-tool-description-smells.md) | Condensed findings from the paper with section-level citations. Useful for quick reference without reading the full 157K paper. |

### MCP Specification

| Source | File | Key contribution |
|---|---|---|
| MCP Specification, Tools — Protocol Revision 2025-06-18 | [`mcp-spec-tools-2025-06-18.md`](mcp-spec-tools-2025-06-18.md) | Output schema MUST/SHOULD requirements, error handling (`isError: true`), security requirements (timeouts, rate limiting, user consent). |
| MCP Documentation, Tools — Concepts | [`mcp-spec-tools-concepts.md`](mcp-spec-tools-concepts.md) | Tool definition structure (name, description, inputSchema, outputSchema, annotations), discovery via `tools/list`, invocation via `tools/call`. |

### Multi-Turn and Conversational AI

| Source | File | Key contribution |
|---|---|---|
| Wang et al., "MINT" (ICLR 2024) | [`wang-mint-multi-turn-interaction.md`](wang-mint-multi-turn-interaction.md) | "Better single-turn performance does not guarantee better multi-turn performance." 1–8% gain per tool-use turn. SIFT/RLHF hurt multi-turn capabilities. |
| Liu et al., "Lost in the Middle" (TACL 2024) | [`liu-lost-in-the-middle.md`](liu-lost-in-the-middle.md) | Seminal study on positional degradation. Performance highest at beginning/end of context, degrades significantly in the middle. Applies to tool definitions buried in conversation history. |
| Du et al., "Context Length Alone Hurts" (EMNLP Findings 2025) | [`du-context-length-hurts-performance.md`](du-context-length-hurts-performance.md) | Context length alone causes 13.9%–85% performance degradation, independent of position or retrieval quality. |
| Chatterjee & Agarwal, "Semantic Anchoring in Agentic Memory" (arXiv 2025) | [`chatterjee-semantic-anchoring-agentic-memory.md`](chatterjee-semantic-anchoring-agentic-memory.md) | Coreference resolution + discourse tagging improves agent factual recall by up to 18% over RAG baselines. |
| Microsoft ISE, "Evaluation Framework for Agentic Chatbots" | [`microsoft-ise-chatbot-evaluation.md`](microsoft-ise-chatbot-evaluation.md) | Production-tested multi-turn evaluation: simulated User Agent, function call accuracy (name/argument precision/recall), test case factory, tiered deployment. |

### Evaluation and Testing Methodology

| Source | File | Key contribution |
|---|---|---|
| Anthropic, "Demystifying Evals for AI Agents" | [`anthropic-demystifying-evals.md`](anthropic-demystifying-evals.md) | "Grade what the agent produced, not the path it took." Prefer deterministic graders; use LLM graders where necessary. Evaluation harness pattern. Trial isolation. |
| Anthropic, "Building Evals" cookbook | [`anthropic-building-evals.md`](anthropic-building-evals.md) | "Code-based grading is the best grading method if possible." Golden-answer pattern. Grading cost as perpetual expense. |
| OpenAI, "Evaluation Best Practices" | [`openai-evaluation-best-practices.md`](openai-evaluation-best-practices.md) | "Adopt eval-driven development." LLM-as-Judge approaches (pairwise, reference-guided). Architecture-specific eval needs (single-agent tool selection, multi-agent handoff). |
| Jones (2026), "Testing Pyramid for AI Agents" — Block Engineering | [`block-testing-pyramid-ai-agents.md`](block-testing-pyramid-ai-agents.md) | Four-layer pyramid by uncertainty tolerance. "Don't run live LLM tests in CI." Record/replay pattern (TestProvider keyed by input hash). "A single run tells us almost nothing but patterns tell us everything." |
| Hasan et al., "Testing Practices in AI Agent Frameworks" (arXiv 2025) | [`hasan-testing-practices-ai-agents.md`](hasan-testing-practices-ai-agents.md) | 70%+ testing on deterministic components, <5% on FM planning, ~1% on prompts. Quantifies the testing gap chatbot integration testing addresses. |

### Tool Use Implementation

| Source | File | Key contribution |
|---|---|---|
| Anthropic, "How to Implement Tool Use" | [`anthropic-implement-tool-use.md`](anthropic-implement-tool-use.md) | Tool error handling: `is_error: true` passes errors back to Claude. Tool result formatting. Multi-turn conversation history management. |
| Anthropic, "Writing Tools for Agents" | [`anthropic-writing-tools-for-agents.md`](anthropic-writing-tools-for-agents.md) | "Even small refinements to tool descriptions can yield dramatic improvements." SWE-bench evidence. Make implicit context explicit. |
| Anthropic, "Introducing Advanced Tool Use" | [`anthropic-advanced-tool-use.md`](anthropic-advanced-tool-use.md) | Tool definitions can consume 50K–134K tokens. Dynamic tool discovery with `defer_loading: true` — 85% token reduction. |
| OpenAI, "Function Calling" | [`openai-function-calling.md`](openai-function-calling.md) | Function definitions count against context limit. Multi-turn state management: preserve full interaction sequence. Parallel tool calls. |
| OpenAI, "o3/o4-mini Function Calling Guide" | [`openai-o3-function-calling-guide.md`](openai-o3-function-calling-guide.md) | <100 tools and <20 arguments per tool is "in-distribution." Overlapping descriptions cause wrong calls. Explicitly outline ordering for multi-step tasks. |

### Response Quality Metrics

| Source | File | Key contribution |
|---|---|---|
| RAGAS (Es et al., arXiv 2309.15217) | [`ragas-metrics.md`](ragas-metrics.md) | Faithfulness = supported claims / total claims. Context recall. Factual correctness (claim-level NLI). |
| Google DeepMind, FACTS Grounding | [`deepmind-facts-grounding.md`](deepmind-facts-grounding.md) | Two-phase evaluation: eligibility (does it answer the query?) then grounding (is it factually grounded?). Multi-judge methodology with frontier LLMs. |

### Software Engineering Foundations

| Source | File | Key contribution |
|---|---|---|
| Fowler, "ContractTest" | [`fowler-contract-test.md`](fowler-contract-test.md) | "The format of the data matters rather than the actual data." Contract tests verify response shape consistency. |
| RFC 9457 (IETF), "Problem Details for HTTP APIs" | [`rfc-9457-problem-details.md`](rfc-9457-problem-details.md) | Machine-readable error responses for non-human consumers. Principle applies to MCP tool errors consumed by FMs. |
| Jest, "Snapshot Testing" | [`jest-snapshot-testing.md`](jest-snapshot-testing.md) | "Snapshots can capture any serializable value and should be used anytime the goal is testing whether the output is correct." Golden-file pattern. |

---

## By citing guideline

Which sources are cited by which guideline. Useful for understanding each guideline's evidence base.

### [Tool Description Quality](../tool-description-quality.md)
- `mcp-tool-description-smells.txt` — Primary source (rubric, smells, augmentation)
- `mcp-spec-tools-2025-06-18.md` — Tool definition structure
- `mcp-spec-tools-concepts.md` — Discovery protocol
- `anthropic-demystifying-evals.md` — Grading methodology
- `anthropic-building-evals.md` — Code-based grading
- `block-testing-pyramid-ai-agents.md` — CI/CD philosophy
- `openai-evaluation-best-practices.md` — Calibration guidance

### [Agent Behavior](../agent-behavior.md)
- `mcp-tool-description-smells.txt` — Primary source (SR, AE, AS metrics, ablation study)
- `anthropic-demystifying-evals.md` — Grade outcomes, not paths
- `anthropic-building-evals.md` — Code-based grading
- `block-testing-pyramid-ai-agents.md` — Record/replay pattern, probabilistic testing
- `openai-evaluation-best-practices.md` — Architecture-specific evals

### [Server Correctness](../server-correctness.md)
- `mcp-spec-tools-2025-06-18.md` — Output schema MUST/SHOULD, error handling
- `mcp-spec-tools-concepts.md` — Tool result structure
- `anthropic-implement-tool-use.md` — Tool error handling
- `anthropic-demystifying-evals.md` — Grade outcomes
- `anthropic-building-evals.md` — Code-based grading
- `block-testing-pyramid-ai-agents.md` — Deterministic base layer
- `fowler-contract-test.md` — Contract test pattern
- `rfc-9457-problem-details.md` — Machine-readable errors
- `jest-snapshot-testing.md` — Golden-file pattern

### [Response Accuracy](../response-accuracy.md)
- `ragas-metrics.md` — Faithfulness, context recall, factual correctness
- `deepmind-facts-grounding.md` — Two-phase evaluation, multi-judge
- `anthropic-demystifying-evals.md` — Groundedness checks, coverage checks
- `anthropic-building-evals.md` — Golden-answer pattern, code-based grading
- `block-testing-pyramid-ai-agents.md` — Testing pyramid layers
- `openai-evaluation-best-practices.md` — Reference-based automated evals

### [Chatbot Integration](../chatbot-testing.md)
- `wang-mint-multi-turn-interaction.md` — Single-turn ≠ multi-turn performance
- `liu-lost-in-the-middle.md` — Positional degradation in long contexts
- `du-context-length-hurts-performance.md` — Context length as independent degradation factor
- `chatterjee-semantic-anchoring-agentic-memory.md` — Coreference resolution in agents
- `hasan-testing-practices-ai-agents.md` — Testing gap quantification
- `microsoft-ise-chatbot-evaluation.md` — Multi-turn evaluation methodology
- `anthropic-writing-tools-for-agents.md` — Tool description best practices
- `anthropic-advanced-tool-use.md` — Dynamic tool discovery, context pressure
- `anthropic-implement-tool-use.md` — Multi-turn tool use, error handling
- `anthropic-demystifying-evals.md` — Grading methodology, trial isolation
- `anthropic-building-evals.md` — Code-based grading
- `openai-function-calling.md` — Context window impact, multi-turn state
- `openai-o3-function-calling-guide.md` — Tool count limits, description clarity
- `openai-evaluation-best-practices.md` — Eval-driven development
- `block-testing-pyramid-ai-agents.md` — CI/CD philosophy, aggregation
- `mcp-spec-tools-2025-06-18.md` — Error handling, security requirements

---

## Authority tiers

Sources are grouped by the strength of evidence they provide. Higher-tier sources receive more weight when claims conflict.

### Tier 1 — Peer-reviewed research
Published in peer-reviewed venues. Empirical findings with methodology and reproducibility.

| Source | Venue | Status |
|---|---|---|
| Hasan et al., "MCP Tool Descriptions Are Smelly!" | arXiv 2602.14878v1 | Preprint (under review) |
| Wang et al., "MINT" | ICLR 2024 | Published |
| Liu et al., "Lost in the Middle" | TACL 2024 | Published |
| Du et al., "Context Length Alone Hurts" | EMNLP Findings 2025 | Published |
| RAGAS (Es et al.) | arXiv 2309.15217 | Preprint, widely adopted |
| Chatterjee & Agarwal, "Semantic Anchoring" | arXiv 2508.12630 | Preprint (under review) |
| Hasan et al., "Testing Practices" | arXiv 2509.19185 | Preprint |

### Tier 2 — Official documentation and specifications
From the organizations that build the tools. Authoritative for "how it works" and recommended practices.

| Source | Organization |
|---|---|
| MCP Specification (2025-06-18) | Model Context Protocol |
| MCP Documentation (Concepts) | Model Context Protocol |
| Anthropic tool use docs | Anthropic |
| Anthropic engineering blog posts (3) | Anthropic |
| OpenAI function calling docs | OpenAI |
| OpenAI cookbook (o3 guide) | OpenAI |
| RFC 9457 | IETF |

### Tier 3 — Industry engineering blogs and established practices
Production experience from reputable engineering teams. Valuable for practical guidance but not empirically controlled.

| Source | Organization |
|---|---|
| Block Engineering, "Testing Pyramid" | Block (Square) |
| Microsoft ISE, "Chatbot Evaluation" | Microsoft |
| Google DeepMind, FACTS Grounding | Google DeepMind |
| Fowler, "ContractTest" | Martin Fowler |
| Jest, "Snapshot Testing" | Jest/Meta |
