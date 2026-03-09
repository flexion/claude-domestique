# Agent Behavior — Tool Selection

> Part of [AI Services Framework](framework.md).
>
> MCP Spec Term: **Tool Selection** | Test type: **Behavioral (LLM in loop)**

**Present the user query, tool definitions, and prior tool results to the FM**[^1] so that it can decide whether to call a tool or answer the user, and if calling a tool, select the right one with correct arguments.[^2]

**High-quality tool selection** means the FM picks the right tool on the first try, constructs valid arguments without hallucinating parameter values, and sequences multi-step workflows correctly.[^3] It also means the FM knows when to stop calling tools and answer the user, avoiding unnecessary execution steps.[^4]

**How to compare two outputs:** Run the same set of user queries against both configurations and measure: (1) task success rate (SR) — did the FM complete the task?[^5] (2) average evaluator score (AE) — how well did intermediate steps execute?[^6] (3) average steps (AS) — how many Tool Selection→Invocation loops were needed?[^7] The higher-quality output has a higher SR, higher AE, and fewer steps to reach the same outcome. These require an LLM in the loop — they are behavioral properties that can only be observed by running scenarios.

---

## What should be tested

1. **Tool selection accuracy.** Given a user query, does the FM select the correct tool? This is the primary behavioral test.[^8]

2. **Argument quality.** Are required parameters present with valid values? Are no hallucinated parameters included? The paper traces a real-world failure to a missing date-format specification in the tool description — the FM defaulted to overly broad queries because the parameter constraints were unspecified.[^9]

3. **Step efficiency.** Count Tool Selection→Invocation loops per task. Augmented descriptions increase steps by 67.46% (median), with 68–78% of tasks requiring more steps than baseline.[^10] Only 19–20% of tasks with increased steps achieve final success.[^11]

4. **Multi-model stability.** Test with multiple model tiers. A smaller model with augmented descriptions can match or surpass a larger model — the paper shows Qwen3-Next-80B matching Qwen3-Coder-480B in Finance, Repository Management, and Location Navigation.[^12]

5. **Component ablation sensitivity.** Purpose + Guidelines alone can outperform full augmentation in some domains (67.50% vs. 57.50% SR in Finance/GPT-4.1).[^13] No single component combination works universally.[^14]

## How to test

Agent behavior testing is **entirely LLM-in-the-loop** — there is no deterministic structural tier as in Tool Description Quality or Server Correctness.[^21] Every test requires running the FM against scenarios, making them non-deterministic and more expensive. However, the recording/replay pattern from Block Engineering's middle pyramid layer offers a middle ground: record live interactions once, then replay deterministically to detect regressions.[^22]

Both Anthropic and Block advise against running these tests in CI: "Don't run live LLM tests in CI. Too expensive, too slow, too flaky."[^23] Instead, run them on-demand and aggregate results across multiple runs — "a single run tells us almost nothing but patterns tell us everything."[^24]

### Impact and effort summary

| Test | Impact on agent behavior | Effort | Evidence |
|---|---|---|---|
| **1. Tool selection accuracy** | **Highest.** The primary metric — directly measured by the paper. Augmentation yields +5.85pp SR (p = 0.02).[^16] This is what the user experiences: did the agent pick the right tool? | High. Full scenario execution with FM. Must run multiple times per scenario and aggregate.[^24] 200–300M tokens per full benchmark run per model.[^25] | Hasan et al. §5.2[^16], Block[^24] |
| **2. Argument quality** | **High.** Traced to real failures — missing date-format specification caused the FM to default to overly broad queries.[^9] Measurable via the Average Evaluator score, which improved +15.12% with augmentation.[^17] | High. Same as tool selection — argument quality is measured as part of the same scenario run. Partial credit grading requires multi-evaluator setup.[^26] | Hasan et al. §2[^9], §5.2[^17] |
| **3. Step efficiency** | **Moderate.** More steps ≠ failure, but 68–78% of tasks require more steps with augmented descriptions, and only 19–20% of increased-step tasks achieve final success.[^11] Steps are a cost proxy — higher AS means higher token spend.[^27] | Low incremental. Step counts are a byproduct of scenario execution — no additional LLM calls needed beyond tests 1 and 2. | Hasan et al. §5.2[^10][^11] |
| **4. Multi-model stability** | **Moderate.** Important for production (you don't control which FM the client uses). A smaller model with augmented descriptions can match a larger one.[^12] But the paper shows no single combination works universally.[^14] | Very high. Cost scales as N models × N scenarios × N runs. Each model may require different API keys, pricing, and configuration. | Hasan et al. §6.3[^12], §5.3[^14] |
| **5. Component ablation sensitivity** | **Low for most teams.** Research-oriented — useful for optimizing descriptions, not routine testing. No single component combination consistently improves performance across all domains and models.[^14] | Very high. Requires separate benchmark runs per component configuration (25 runs in the paper's study).[^28] Only justified when actively optimizing descriptions. | Hasan et al. §5.3[^14], §4.5.4[^28] |

**Practical implication:** Tests 1–3 are measured in the same scenario run — you don't pay separately for step efficiency. Focus investment on designing good scenarios and running them multiple times. Reserve multi-model stability for pre-release validation and ablation for description optimization campaigns. OpenAI recommends: "Adopt eval-driven development: Evaluate early and often. Write scoped tests at every stage."[^29]

### Designing test scenarios

The paper uses the MCP-Universe benchmark (231 tasks across 6 domains, 202 tools),[^25] but a developer building their own MCP server needs to write scenarios for their domain. A scenario is the unit of agent behavior evaluation — each scenario defines an input, expected behavior, and success criteria.

**Scenario structure** (derived from the paper's benchmark design[^25] and Anthropic's evaluation harness pattern[^30]):

| Component | Description | Example |
|---|---|---|
| **User query** | Natural language request, as the user would phrase it | "What was the third-quarter income of Apple for 2025?" |
| **Expected tool call** | Tool name and argument values the FM should select | `get_financial_statement(ticker="AAPL", financial_type="quarterly_income_statement")` |
| **Expected sequence** (optional) | For multi-step workflows, the ordered list of tool calls | 1. `create_adr(...)` → 2. `assess_adr_quality(id)` |
| **Evaluators** | One or more assertions that verify the outcome | SR: all evaluators pass. AE: fraction of evaluators that pass. |
| **Ground truth** (optional) | Expected final answer or key facts it must contain | "Apple's Q3 2025 net income was $X billion" |

**Scenario categories** to cover:

1. **Single-tool queries** — one tool is clearly correct. Tests basic tool selection.
2. **Multi-step workflows** — the FM must chain 2+ tools in sequence. Tests sequencing and context carry-forward.
3. **Ambiguous queries** — multiple tools could plausibly apply. Tests disambiguation driven by description quality. These are the highest-value scenarios because they directly exercise the Usage Guidelines and Limitations components.[^19]
4. **Negative cases** — queries that should NOT trigger any tool call (the FM should answer directly). Tests whether the FM knows when to stop.
5. **Edge-case arguments** — queries requiring specific argument formatting (date formats, enum values). Tests whether Parameter Explanation guides the FM to correct values.[^9]

**How many scenarios:** The paper uses 231 tasks with an average of 3.3 evaluators per task.[^25] For a single MCP server, aim for at least 3–5 scenarios per tool (covering categories 1–5 above), plus 2–3 multi-tool workflow scenarios if your tools are designed to compose. The total depends on your tool count, but even a 5-tool server benefits from 20–30 scenarios.

### Metrics and measurement

Compute three metrics per scenario run, then aggregate across runs:[^5][^6][^7]

**Success Rate (SR):** Binary pass/fail — did the FM complete the task (all evaluators pass)? Aggregate as percentage across scenarios.

```
SR = (tasks where all evaluators pass) / (total tasks) × 100
```

**Average Evaluator (AE):** Fraction of evaluators that pass per task, averaged across all tasks. Captures partial credit — an FM that satisfies 3 of 4 evaluators is meaningfully better than one that satisfies 0.[^26]

```
AE = (1/N) × Σ (evaluators_passed_i / total_evaluators_i)
```

**Average Steps (AS):** Count of Tool Selection→Invocation loops per task, averaged across tasks. A cost proxy — more steps means more FM calls and more tokens.

```
AS = (1/N) × Σ steps_i
```

**Statistical guidance:** Agent behavior is non-deterministic — a single run tells you almost nothing.[^24] Run each scenario at least 5–10 times and report the median and interquartile range. When comparing two configurations (e.g., baseline vs. augmented descriptions):
- For SR (binary): use McNemar's test in its chi-squared formulation, as the paper does (p = 0.02 for the +5.85pp improvement).[^16]
- For AE and AS (continuous): use the Wilcoxon signed-rank test, as the paper does (p < 0.01 for AE, p < 0.001 for AS).[^31]
- Report effect sizes, not just p-values — a statistically significant 0.5pp improvement may not be practically meaningful.

### Recorded scenario replay (regression detection)

Block Engineering's middle pyramid layer — "Reproducible Reality" — provides a way to make LLM-in-the-loop tests deterministic after first recording.[^22] This is the closest to a CI-safe tier for agent behavior testing.

**How it works:**

1. **Recording mode:** Run scenarios live against real MCP servers and a real FM. Capture the full interaction trace: user query, tool definitions sent to the FM, FM's tool selection decisions, tool call arguments, tool results, and the FM's final answer.
2. **Replay mode:** On subsequent runs, replay the recorded FM decisions deterministically. The test asserts on "tool call sequences and interaction flow," not exact text outputs.[^22]
3. **Regression detection:** When tool descriptions or server behavior changes, re-run recorded scenarios. If a previously-passing scenario now fails (the FM selects a different tool or produces different arguments), it flags a regression.

**What this tests:** Recorded replay does not test whether the FM makes *good* decisions — that was established during the original live run. It tests whether *changes to your system* break previously-working interactions. This maps to Block's insight that regression means "success rates dropped," not "the output changed."[^24]

**Recording strategy:** Use a TestProvider pattern keyed by input message hash[^22] — the same FM context produces the same recorded response. Record scenarios after each live evaluation pass. Build a growing corpus of recorded interactions that run cheaply on every commit.

**Limitation:** Recorded replays cannot detect improvements — only regressions. New scenarios or changed tool definitions require fresh live recordings. This is a supplement to live evaluation, not a replacement.

### Live FM evaluation (on-demand)

This is the full behavioral evaluation — scenarios executed with a real FM making real decisions. This maps to Block's upper pyramid layer: "Probabilistic Performance."[^32]

#### Running the evaluation

For each scenario in your test suite:

1. **Initialize** a clean MCP client/server pair and FM session. Each trial should be isolated — "unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures."[^30]
2. **Send** the user query to the FM with tool definitions from `tools/list`.
3. **Loop** until the FM produces a final text answer (or a step limit is reached):
   - FM selects a tool → execute `tools/call` → append result to FM context
4. **Grade** the outcome using your scenario's evaluators:
   - Did the FM select the expected tool(s)? (SR component)
   - Were the arguments correct? (AE component)
   - How many loops did it take? (AS)

Grade outcomes, not paths: "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid."[^33] Focus on whether the final result is correct and the intermediate steps were reasonable — "it's often better to grade what the agent produced, not the path it took."[^33]

#### Grading tool selection and arguments

For tool selection accuracy, use code-based grading where possible — compare the tool name against the expected tool name. This is fast and deterministic.[^34]

For argument quality, use a combination:
- **Code-based:** Check required parameters are present, types are correct, enum values are valid. "Code-based grading is the best grading method if possible, as it is fast and highly reliable."[^34]
- **FM-based:** For free-text arguments where exact match is impossible, use an LLM grader to assess whether the argument conveys the correct intent. Use a reference-guided grading approach with clear rubrics.[^35]

OpenAI's architecture-specific guidance directly applies: use "Evaluations that test whether the agent is able to select the correct tool to use" for tool selection, and "Evaluations that verify the agent calls the tool with the correct arguments" for argument quality.[^36]

#### Multi-model stability testing

Test with multiple FM tiers to verify that your tool descriptions work across the models your users might deploy. The paper demonstrates that a smaller model with augmented descriptions can match a larger model[^12] — but also that no single description configuration works universally across all models.[^14]

**Recommended approach:** Select 2–3 models from different families (e.g., one from OpenAI, one from Anthropic, one open-weight). Run your full scenario suite against each. Compare SR, AE, and AS across models. A description that works well for one model but fails for another indicates model-specific sensitivity that may require tailored descriptions.

**When to run:** Before major releases only. Multi-model testing multiplies cost by the number of models tested. It answers the question: "Will our tool descriptions work for users running different FMs?" This is a production readiness check, not a development-cycle test.

#### Component ablation (description optimization)

This is a research activity for teams actively optimizing their tool descriptions. Run your scenario suite against different component configurations to identify the most impactful components for your domain.[^28]

The paper's ablation methodology: fix Purpose as always-present (it defines what the tool does), then test combinations — P+G, P+L, P+E, P+PEx, P+G+L+PEx (all minus Examples), and fully augmented.[^28] Compare SR, AE, and AS across configurations.

**Key finding to validate for your domain:** Removing Examples does not significantly degrade performance in the paper's results (Cochran's Q test, p > 0.20).[^20] If this holds for your domain, you can save context window space. But compact variants like Purpose + Guidelines outperform full augmentation in some domains (67.50% vs. 57.50% in Finance/GPT-4.1)[^13] — the optimal configuration is domain-dependent.

**When to run:** Only during description optimization campaigns — when you're actively tuning descriptions for a specific model/domain combination. Not routine testing.

### When to run

| Test type | Trigger | Rationale |
|---|---|---|
| **Recorded replay** | Every commit that changes tool descriptions or server logic | Deterministic after recording. Catches regressions cheaply.[^22] |
| **Live FM evaluation** | Before releases, when adding tools, periodically as a quality audit | The only test that measures actual FM behavior. Aggregate across runs.[^24] |
| **Multi-model stability** | Before major releases | Validates descriptions work across FM families. Cost scales with model count.[^12] |
| **Component ablation** | When actively optimizing descriptions | Research activity, not routine testing. No single combination works universally.[^14] |

---

## Evidence base

Hasan et al. evaluate tool selection quality using three metrics from the MCP-Universe benchmark:[^15]

- **Success Rate (SR):** Binary per-task outcome. Augmentation yields +5.85pp median improvement (McNemar's test, p = 0.02).[^16]
- **Average Evaluator (AE):** Measures quality of intermediate execution steps. Augmentation improves AE by +15.12%.[^17]
- **Average Steps (AS):** Count of Tool Selection→Invocation loops. Augmentation increases AS by +67.46% (median).[^18]

The ablation study (RQ-3) reveals that the **Guidelines component provides critical operational cues** — behavioral instructions like "requested dates should include trading days" that directly improve the FM's reasoning.[^19] The **Examples component is statistically dispensable** (Cochran's Q test, p > 0.20 across all configurations).[^20]

---

## Footnotes

[^1]: Hasan et al. §3.1, point (2): "Planning — The client embeds these descriptions in the FM's context along with the user query."

[^2]: Hasan et al. §3.1, point (2): "Using its language reasoning, the FM selects the correct tool and infers the tool's arguments"

[^3]: Hasan et al. §1: "the FM may select the wrong tool, supply invalid or suboptimal arguments, or take unnecessary interaction steps"

[^4]: Hasan et al. §5.2: "68–78% of tasks require more steps than the baseline. Among these tasks with increased AS, roughly half (41–55%) show improved AE; however, only 19–20% of all tasks achieve the final success"

[^5]: Hasan et al. §4.5.1: SR is a binary per-task metric from MCP-Universe benchmark.

[^6]: Hasan et al. §4.5.1: AE measures "higher-quality intermediate execution step completion."

[^7]: Hasan et al. §4.5.1: AS counts the number of Tool Selection→Invocation loops per task.

[^8]: Hasan et al. §1: "the FM selects the correct tool" is the primary planning outcome the paper measures.

[^9]: Hasan et al. §2: "This is not a model bug; it is a specification problem in the tool description" — referring to a missing date format that caused the FM to use overly broad queries.

[^10]: Hasan et al. §5.2: "the average number of execution steps increases by 67.46% (median)...68–78% of tasks require more steps than the baseline"

[^11]: Hasan et al. §5.2: "only 19–20% of all tasks achieve the final success"

[^12]: Hasan et al. §6.3: "the smaller-sized Qwen3-Next-80B-A3B-Instruct model, when equipped with augmented tool descriptions, achieves performance parity with or even surpasses the significantly larger Qwen3-Coder-480B-A35B"

[^13]: Hasan et al. §5.3/Table 7: Finance (GPT-4.1) — P+G: 67.50%, FR: 57.50%.

[^14]: Hasan et al. §5.3: "no single combination of MCP tool description components consistently yields improved performance across all domains and models"

[^15]: Hasan et al. §4.5.1: MCP-Universe benchmark provides SR, AE, and AS as evaluation metrics.

[^16]: Hasan et al. §5.2: "Augmented tool descriptions yield a statistically significant increase of 5.85 percentage points in task success rate"; McNemar's test p = 0.02.

[^17]: Hasan et al. §5.2: "increasing the Average Evaluator score by 15.12%"

[^18]: Hasan et al. §5.2: "the average number of execution steps increases by 67.46% (median)"

[^19]: Hasan et al. §5.3: "the Guidelines component provides critical operational cues such as 'requested dates should include trading days' and 'set end_date one day later than expected since the tool returns the previous day's closing price.' These explicit behavioral instructions help the model reason correctly"

[^20]: Hasan et al. §5.3: "Cochran's Q test consistently yields p > 0.20, indicating no statistically significant differences among the three configurations. This result suggests that the inclusion or removal of the Examples component does not materially affect task success rates"

[^21]: Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog. The pyramid layers represent "how much uncertainty you're willing to tolerate." Agent behavior testing sits in the upper layers — probabilistic performance and vibes/judgment — not the deterministic base. ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^22]: Jones, A. (2026). "Testing Pyramid for AI Agents." Middle layer: "Record reality once, replay forever." Recording mode captures full MCP interactions; playback replays deterministically. Assertions focus on "tool call sequences and interaction flow, not exact outputs." TestProvider pattern: "records/replays keyed by input message hash." ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^23]: Jones, A. (2026). "Testing Pyramid for AI Agents." CI philosophy: "Don't run live LLM tests in CI. Too expensive, too slow, too flaky. CI validates the deterministic layers. Humans validate the rest when it matters." ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^24]: Jones, A. (2026). "Testing Pyramid for AI Agents." Upper layer: "A single run tells us almost nothing but patterns tell us everything." Regression means "success rates dropped," not "the output changed." Benchmarks "run multiple times and aggregate results." ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^25]: Hasan et al. §4.5.1: "We use the MCP-Universe benchmark...It includes 231 complex real-world tasks across six domains, while providing a total of 202 tools." Each task evaluated by "at least one evaluator, with an average of 3.3 evaluators per task." Cost: "Running the entire benchmark for one round with one FM can cost us around 200 to 300 million tokens, which translates to 75 to 600 USD, depending on the model provider."

[^26]: Anthropic, "Demystifying Evals for AI Agents": "For tasks with multiple components, build in partial credit. A support agent that correctly identifies the problem and verifies the customer but fails to process a refund is meaningfully better than one that fails immediately." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^27]: Hasan et al. §5.2: "the aggregated increase in AS represents a cost-performance trade-off: where agents expend more computational effort to achieve greater partial progress and a higher likelihood of final completion." Also §6.3: "teams should implement budgeted policies before enabling full augmentation, allowing higher caps in domains where SR gains justify the overhead."

[^28]: Hasan et al. §4.5.4: Ablation study evaluates "five (model, domain) combinations" with "five component configurations for each pair, resulting in a total of 25 runs." Purpose is fixed in all combinations "because it defines the core functionality of the tool."

[^29]: OpenAI, "Evaluation Best Practices": "Adopt eval-driven development: Evaluate early and often. Write scoped tests at every stage." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)

[^30]: Anthropic, "Demystifying Evals for AI Agents": "An evaluation harness is the infrastructure that runs evals end-to-end. It provides instructions and tools, runs tasks concurrently, records all the steps, grades outputs, and aggregates results." Also: "Each trial should be 'isolated' by starting from a clean environment. Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^31]: Hasan et al. §5.2: "McNemar's test confirms that the 5.85 percentage point improvement in SR is statistically significant (with p = 0.02)." For AE: "the Wilcoxon signed-rank test confirms that this improvement in AE is statistically significant (with p < 0.01)." For AS: "three of the four evaluated models show a statistically significant increase in AS (with p < 0.001 at the Wilcoxon signed-rank test)."

[^32]: Jones, A. (2026). "Testing Pyramid for AI Agents." Upper layer: "Structured benchmarks: task completion, tool selection appropriateness, expected artifact production." Three evaluation runs per task at the top layer; majority result smooths randomness. ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^33]: Anthropic, "Demystifying Evals for AI Agents": "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid and results in overly brittle tests, as agents regularly find valid approaches that eval designers didn't anticipate." Also: "it's often better to grade what the agent produced, not the path it took." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^34]: Anthropic, "Building Evals" cookbook: "Code-based grading is the best grading method if possible, as it is fast and highly reliable." Uses string matching and regex patterns for structured outputs. ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)

[^35]: OpenAI, "Evaluation Best Practices": LLM-as-Judge approaches include "pairwise comparison, single answer grading, reference-guided grading." Challenges: "Position bias (response order), verbosity bias (preferring longer responses)." Mitigation: "LLMs are better at discriminating between options. Therefore, evaluations should focus on tasks like pairwise comparisons, classification, or scoring against specific criteria instead of open-ended generation." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)

[^36]: OpenAI, "Evaluation Best Practices": Architecture-specific evaluation for single-agent (tool-using) systems: "Evaluations that test whether the agent is able to select the correct tool to use" and "Evaluations that verify the agent calls the tool with the correct arguments." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)
