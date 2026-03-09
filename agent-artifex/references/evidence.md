# AI Testing Evidence Base — Shared Reference

## Key Empirical Findings

### Tool Description Quality (Hasan et al.)

- **97.1%** of tool descriptions contain at least one smell.
- Most prevalent smells: **Unstated Limitations (89.8%)**, Missing Usage Guidelines (89.3%), Opaque Parameters (84.3%).
- Only **2.9%** of descriptions are smell-free across all five non-length components.
- **44%** are smell-free on Purpose alone — quality drops sharply when checking multiple components.
- Official servers (Anthropic, GitHub, PayPal) are statistically indistinguishable from community servers (all p-values > 0.17 with Bonferroni correction).

### Description Augmentation Impact (Hasan et al.)

- **+5.85 percentage points** SR improvement (McNemar's test, p = 0.02).
- **+15.12%** AE improvement (Wilcoxon signed-rank, p < 0.01).
- **+67.46%** AS increase (median) — more steps as a cost trade-off (Wilcoxon, p < 0.001).
- 68–78% of tasks require more steps with augmentation; only 19–20% of increased-step tasks achieve final success.
- A smaller model with augmented descriptions can match or surpass a larger model (Qwen3-Next-80B matching Qwen3-Coder-480B in Finance, Repo Management, Location Navigation).

### Component Ablation (Hasan et al.)

- **No single component combination consistently improves performance** across all domains and models.
- Purpose + Guidelines alone can outperform full augmentation: **67.50% vs. 57.50%** SR in Finance/GPT-4.1.
- Removing Examples does not significantly degrade performance (Cochran's Q, p > 0.20).
- Removing vague Limitations improved SR by **10pp** in one domain — poor-quality Limitations are worse than none.
- The **Guidelines component provides critical operational cues** (e.g., "requested dates should include trading days").

### Multi-Turn Degradation

- **"Better single-turn performance does not guarantee better multi-turn performance."** (Wang et al., MINT, ICLR 2024)
- Context length alone causes **13.9%–85% performance degradation**, independent of retrieval quality and without any distraction. (Du et al., EMNLP Findings 2025)
- Performance is highest when relevant information appears at the beginning or end of context; **degrades significantly in the middle**. (Liu et al., "Lost in the Middle," TACL 2024)
- Explicit coreference tracking improves agent performance by **up to 18%** over standard approaches. (Chatterjee & Agarwal, 2025)
- Tool definitions can consume **50K–134K tokens**; function definitions "count against the model's context limit." (Anthropic, OpenAI)

### Testing Practice Gaps

- Over **70%** of testing effort focuses on deterministic components (tools and workflows). (Hasan et al., testing practices study)
- Less than **5%** addresses FM-based planning; approximately **1%** covers prompts.
- FMs "can make mistakes in the order of the tool calls" even in single-turn. (OpenAI)

### Benchmark Scale

- MCP-Universe benchmark: **231 tasks**, 6 domains, **202 tools**, ~3.3 evaluators per task.
- Cost per full benchmark run per model: **200–300M tokens** ($75–600 USD depending on provider).

---

## Source Index

| Source | What it provides |
|---|---|
| **Hasan et al.** — "MCP Tool Descriptions Are Smelly!" (arXiv 2602.14878v1) | Six-component rubric, smell prevalence, augmentation impact, ablation study |
| **MCP Specification** (2025-06-18) | Protocol requirements: outputSchema MUST/SHOULD, error handling, tool definitions |
| **Anthropic** — "Demystifying Evals for AI Agents" | Grading hierarchy, outcome grading, partial credit, isolation, groundedness/coverage checks |
| **Anthropic** — "Building Evals" cookbook | Closed-loop harness pattern, code-based grading, golden answer methodology |
| **Anthropic** — "Writing Tools for Agents" | Description refinement impact, implicit context, tool design principles |
| **Anthropic** — "Introducing Advanced Tool Use" | Token consumption (50K–134K), dynamic tool discovery, context optimization |
| **OpenAI** — "Evaluation Best Practices" | Eval-driven development, LLM-as-Judge, reference-guided grading, calibration |
| **OpenAI** — "Function Calling" / "o3/o4-mini Guide" | Function definitions count against context, ordering mistakes, overlapping tool guidance |
| **RAGAS** (Es et al., arXiv:2309.15217) | Faithfulness, context recall, factual correctness metrics |
| **Google DeepMind** — FACTS Grounding | Two-phase evaluation (eligibility + grounding), multi-judge methodology |
| **Block Engineering** — "Testing Pyramid for AI Agents" (Jones, 2026) | Uncertainty tolerance layers, recorded replay, TestProvider, CI philosophy |
| **RFC 9457** (IETF) — "Problem Details for HTTP APIs" | Machine-readable error structure for non-human consumers |
| **Fowler** — "ContractTest" | Contract tests: format matters, not exact data |
| **Wang et al.** — MINT (ICLR 2024) | Single-turn ≠ multi-turn; models gain 1–8% per tool-use turn |
| **Liu et al.** — "Lost in the Middle" (TACL 2024) | Positional degradation in long contexts |
| **Du et al.** — (EMNLP Findings 2025) | Context length alone hurts: 13.9%–85% degradation |
| **Chatterjee & Agarwal** (2025) | Semantic anchoring: coreference resolution +18% improvement |
| **Hasan et al.** — "Testing Practices in AI Agent Frameworks" (2025) | 70% deterministic, <5% FM planning, ~1% prompts |
| **Microsoft ISE** — "Evaluation Framework for Agentic Chatbots" | User Agent simulation, Reliability Score, test case factory, error analysis |
| **Jest** — "Snapshot Testing" | Golden-file pattern: capture known-good, detect deviations |

Full source documents: `docs/ai-services/sources/`
