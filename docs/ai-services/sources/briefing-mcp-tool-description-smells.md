# Briefing: MCP Tool Description Smells — What Matters Most

> **Source:** Hasan et al., "Model Context Protocol (MCP) Tool Descriptions Are Smelly! Towards Improving AI Agent Efficiency with Augmented MCP Tool Descriptions" ([arXiv 2602.14878v1](https://arxiv.org/html/2602.14878v1))
>
> **Scope:** 856 tools across 103 MCP servers. Evaluation via MCP-Universe benchmark (231 tasks, 6 domains, 4 models).

---

## The Headline Numbers

| Finding | Value |
|---------|-------|
| Tools with at least one description smell | **97.1%** [^1] |
| Tools fully smell-free across all components | **2.9%** [^2] |
| Success rate improvement from augmentation (median) | **+5.85 pp** [^3] |
| Average Evaluator score improvement | **+15.12%** [^4] |
| Execution step increase from augmentation (median) | **+67.46%** [^5] |
| Cases where augmentation caused regression | **16.67%** [^6] |
| Official vs. community server quality difference | **None** (p > 0.17 on all components) [^7] |

[^1]: Abstract: "we find that 97.1% of the analyzed tool descriptions contain at least one smell"
[^2]: §5.1: "Only 2.9% of MCP tool descriptions are fully smell-free"
[^3]: §5.2/Abstract: "Augmented tool descriptions yield a statistically significant increase of 5.85 percentage points in task success rate across domain-model combinations"
[^4]: §5.2/Abstract: "increasing the Average Evaluator score by 15.12%, reflecting higher-quality intermediate execution step completion"
[^5]: §5.2/Abstract: "the average number of execution steps increases by 67.46% (median), indicating that agents expend significantly more interaction steps with richer descriptions"
[^6]: §5.2/Abstract: "causing regressions in 16.67% of cases in the MCP Universe benchmark"
[^7]: §5.1/Table 3: "none of the components show statistically significant differences between official and community servers; all raw p-values exceed 0.17 and all corrected p-values equal 1.0"

---

## HIGH-IMPACT FINDINGS (Positive)

### 1. Tool descriptions are the primary semantic interface — not a formality

Tool descriptions have a **dual nature**: they are simultaneously a requirement-like specification and a prompt-like instruction.[^8] A missing date format specification caused an LLM to default to broader-than-needed queries — the paper explicitly calls this out as a specification problem, not a model problem.[^9]

[^8]: §1: "the tool description...embodies a dual nature, as it serves as (i) a requirement-like specification that defines the tool's expected behavior and parameter constraints, and (ii) a prompt-like instruction that shapes the model's contextual reasoning and decision-making"
[^9]: §2: "This is not a model bug; it is a specification problem in the tool description"

**Implication for our tests:** Every structural test we write against tool descriptions is testing a prompt engineering surface, not just documentation.

### 2. Purpose is the single most important component

44% of tools are smell-free on Purpose alone, but this drops sharply as more components are considered.[^10] Purpose is retained in every ablation configuration as a fixed anchor.[^11]

[^10]: §5.1/Table 2: "44.0% for Purpose alone...the proportion declines to 7.5% when analyzing tools that combine Purpose, Guidelines, and Limitations components...and drops to a mere 2.9% when all five components in the description are required to be smell-free"
[^11]: §4.5.4: "We include Purpose in all combinations because it defines what the tool does, and without it, the FM cannot correctly infer the tool's intent or functionality"

**Implication for our tests:** Purpose quality should be the highest-weighted structural test. Our `description-length.test.ts` and `disambiguation.test.ts` partially cover this.

### 3. Purpose + Guidelines can outperform full augmentation

In Finance/GPT-4.1, the compact combination of Purpose + Guidelines achieved **67.50% SR** vs. **57.50% SR** for fully augmented descriptions — a 10pp improvement with fewer tokens.[^12] The paper traces this to the Guidelines component providing precise behavioral cues.[^13]

[^12]: §5.3/Table 7: Finance (GPT-4.1) — P+G: 67.50%, FR: 57.50%
[^13]: §5.3: "the Guidelines component provides critical operational cues such as 'requested dates should include trading days' and 'set end_date one day later than expected since the tool returns the previous day's closing price.' These explicit behavioral instructions help the model reason correctly"

**Implication for our tests:** We should test that our descriptions have strong Purpose and Guidelines components, not just that they're long enough.

### 4. Augmented descriptions enable smaller models to match larger ones

The paper demonstrates that a smaller model with augmented descriptions can match or surpass a significantly larger model.[^14]

[^14]: §6.3: "the smaller-sized Qwen3-Next-80B-A3B-Instruct model, when equipped with augmented tool descriptions, achieves performance parity with or even surpasses the significantly larger Qwen3-Coder-480B-A35B in domains such as Finance, Repository Management, and Location Navigation"

**Implication for our tests:** Our eval suite should test with multiple model tiers, not just the strongest model. Description quality matters more for weaker models.

### 5. The six-component rubric is empirically validated

The paper's rubric aligns exactly with our existing Tool Description Rubric in CLAUDE.md. The six components were derived from a systematic process: official MCP docs, 15 community sources, and open coding with inter-rater agreement of Jaccard 0.92.[^15]

| Paper Component | Our Rubric Component | Smell if Score < 3 |
|---|---|---|
| Purpose | Purpose | Unclear Purpose (56%) [^16] |
| Usage Guidelines | Guidelines | Missing Usage Guidance (89.3%) [^17] |
| Limitations | Limitations | Unstated Limitation (89.8%) [^18] |
| Parameter Explanation | Parameter explanation | Opaque Parameters (84.3%) [^19] |
| Length and Completeness | Length/completeness | Underspecified or Incomplete (79.1%) [^20] |
| Examples | Examples | Exemplar Issues (77.9%) [^21] |

[^15]: §4.1: "mean Jaccard similarity = 0.92" across 15 sources identified via LLM-assisted survey
[^16]: §5.1/Figure 7: Unclear Purpose affects 56% of 856 tools
[^17]: §5.1/Figure 7: Missing Usage Guidelines affects 89.3% of tools
[^18]: §5.1/Figure 7: "the most widespread smell categories are Unstated Limitations (89.8%)"
[^19]: §5.1/Figure 7: Opaque Parameters affects 84.3% of tools
[^20]: §5.1/Figure 7: Underspecified or Incomplete affects 79.1% of tools
[^21]: §5.1/Figure 7: Exemplar Issues affects 77.9% of tools

Our rubric is not arbitrary — it maps 1:1 to the empirically-derived smell taxonomy.

---

## HIGH-IMPACT FINDINGS (Negative / Cautionary)

### 6. Examples are the least impactful component — removing them doesn't hurt

Statistical tests show no significant difference when Examples are removed.[^22] This contradicts traditional few-shot prompting wisdom but aligns with Anthropic's own guidance.[^23]

[^22]: §5.3: "Cochran's Q test consistently yields p > 0.20, indicating no statistically significant differences among the three configurations. This result suggests that the inclusion or removal of the Examples component does not materially affect task success rates"
[^23]: §5.3: "which affirms Anthropic's suggestion to put less emphasis on examples, but contradicts the traditional benefit of few-shot examples in the prompts (Brown et al., 2020) of MCP tool descriptions"

**Implication for our tests:** Our rubric requires examples, but the paper suggests they add token cost without measurable benefit. We should reconsider whether examples in tool descriptions are worth the context window cost, or at minimum deprioritize them in quality scoring.

### 7. Limitations can actively hurt performance when poorly written

FM-generated Limitations contained confusing, self-referential statements that diluted useful guidance.[^24] When Limitations were removed (P+G only), performance improved by 10pp in one domain.[^25]

[^24]: §5.3: "the Limitations component of the same tool includes vague or self-referential statements such as 'this contradiction requires disambiguation before relying on intraday availability', which can introduce uncertainty into the model's reasoning"
[^25]: §5.3: "When combined with other components, such ambiguity dilutes otherwise useful guidance and lowers performance relative to the single-component configuration"

**Implication for our tests:** We should test not just for the *presence* of limitations but for their *quality*. Vague limitations ("results may vary") are worse than no limitations at all. Our `content-extraction.test.ts` should verify limitations are concrete and actionable.

### 8. More description = more execution steps (67.46% increase)

Augmentation creates a steep cost funnel: most tasks require more steps, but only a fraction achieve final success.[^26]

[^26]: §5.2: "68–78% of tasks require more steps than the baseline. Among these tasks with increased AS, roughly half (41–55%) show improved AE; however, only 19–20% of all tasks achieve the final success"

**Implication for our tests:** We should add token budget tests that enforce description conciseness. Our `token-budget.test.ts` exists but should be calibrated against the paper's findings about diminishing returns.

### 9. No single component combination works universally

The ablation study's most important finding is that context matters more than any fixed recipe.[^27]

| Domain/Model | Best Configuration | SR |
|---|---|---|
| Finance / GPT-4.1 | Purpose + Guidelines | 67.50% |
| Location Nav / GPT-4.1 | Full augmentation | 31.00% |
| Repo Mgmt / Qwen3-Coder | P+G+L+PEx (no examples) | 21.21% |
| 3D Design / Qwen3-Coder | Purpose + Examples | 26.32% |
| Web Searching / GLM-4.5 | Full or P+PEx (tied) | 18.18% |

[^27]: §5.3/RQ-3 Findings: "no single combination of MCP tool description components consistently yields improved performance across all domains and models"

**Implication for our tests:** Our eval suite should not assume one description style fits all tools. The behavioral evals should test tool selection accuracy under different description configurations.

### 10. Official servers are just as bad as community servers

Mann-Whitney U tests with Bonferroni correction found zero significant differences between official (Anthropic, GitHub, PayPal) and community servers.[^28]

[^28]: §5.1/Table 3: "none of the components show statistically significant differences between official and community servers; all raw p-values exceed 0.17 and all corrected p-values equal 1.0"

**Implication for our tests:** We cannot rely on upstream examples as quality benchmarks. Our own rubric enforcement is the quality floor.

---

## THE SMELL PREVALENCE HIERARCHY

Ordered by how commonly the smell appears (most to least), from §5.1/Figure 7:

1. **Unstated Limitations** — 89.8% of tools [^18]
2. **Missing Usage Guidelines** — 89.3% [^17]
3. **Opaque Parameters** — 84.3% [^19]
4. **Underspecified or Incomplete** — 79.1% [^20]
5. **Exemplar Issues** — 77.9% [^21]
6. **Unclear Purpose** — 56.0% [^16]

The cumulative smell-free dropoff is dramatic (§5.1/Table 2):

| Components smell-free | % of tools |
|---|---|
| Purpose only | 44.0% |
| + Guidelines | 10.4% |
| + Limitations | 7.5% |
| + Parameters | 3.0% |
| + Examples (all five) | 2.9% |

---

## THE COMPLETE RUBRIC (from Appendix A)

### Scoring: 5-point Likert scale per component. Score < 3 = smell detected.[^29]

[^29]: §4.1.4: "scores in the smelly zone (Score < 3) directly indicate a corresponding smell"

**1. Purpose (What the tool does)** [^30]
- 5: Clearly explains function, behavior, and return data with precise language.
- 4: Explains function and behavior with minor ambiguity.
- 3: Basic explanation present but lacks behavioral details.
- 2: Vague or incomplete purpose statement.
- 1: Purpose unclear or missing.

**2. Usage Guidelines (When to use or not use)** [^31]
- 5: Explicitly states appropriate use cases and when not to use; includes disambiguation if the tool name is ambiguous.
- 4: States when to use with minimal guidance on when not to use.
- 3: Implies usage context but lacks explicit boundaries.
- 2: Usage context unclear or overly generic.
- 1: No usage guidance provided.

**3. Limitations (Caveats and boundaries)** [^32]
- 5: Clearly states what the tool does not return, scope boundaries, and important constraints.
- 4: Mentions main limitations but misses some edge cases.
- 3: Vague or incomplete limitation statements.
- 2: Minimal or implied limitations only.
- 1: No limitations or caveats mentioned.

**4. Parameter Explanation (Input clarity)** [^33]
- 5: Every parameter is explained with type, meaning, behavioral effect, and required/default status.
- 4: Most parameters are explained with minor omissions.
- 3: Basic parameter information is present but lacks behavioral impact.
- 2: Parameters are listed without meaningful explanation.
- 1: Parameters are not explained or only provided in schema form.

**5. Examples (Description vs. example balance)** [^34]
- 5: Description is self-sufficient; examples supplement rather than replace the explanation.
- 4: Mostly descriptive with minor reliance on examples.
- 3: Even mix of description and examples.
- 2: Over-relies on examples with minimal prose.
- 1: Only examples are provided with no descriptive explanation.

**6. Length and Completeness** [^35]
- 5: Four or more sentences of substantive, well-structured prose covering all aspects.
- 4: Three to four sentences with good coverage.
- 3: Two to three sentences that are somewhat complete.
- 2: One to two sentences that are too brief.
- 1: Single phrase or fragment.

[^30]: Appendix A.1, rubric item 1
[^31]: Appendix A.1, rubric item 2
[^32]: Appendix A.1, rubric item 3
[^33]: Appendix A.1, rubric item 4
[^34]: Appendix A.1, rubric item 5
[^35]: Appendix A.1, rubric item 6

### Labeling Rules [^36]
- **Bad** if: any dimension scores below 3, OR examples replace the description.
- **Good** only if: all six dimensions score 3+ AND all component requirements are satisfied.

[^36]: Appendix A.1, Output Format: "Bad if: any of the six dimensions score below 3"

---

## RECOMMENDATIONS FROM THE PAPER

### For MCP Developers (Us)
1. **Treat tool descriptions as first-class engineering artifacts** — quality should be a blocking criterion for release.[^37]
2. **Integrate rubric-based smell detection into CI** — automated scanners should detect smells.[^38]
3. **Prioritize high-leverage components** — Purpose and Guidelines first, then selectively add others only where they demonstrably help.[^39]
4. **Use FM-based augmentation as refinement, not blind generation** — FM-generated text can introduce confusion, especially in Limitations.[^40]

[^37]: §6.1: "teams should therefore treat descriptions as first-class engineering artifacts...consider tool description quality as a blocking criterion for release"
[^38]: §6.1: "56% of tools suffer from Unclear Purpose and 89.3% lack Usage Guidance, effectively rendering them as stubs rather than functional specifications"
[^39]: §6.1: "developers should first identify and optimize the most impactful components for their tools that convey critical semantic intent with minimal text. Only after establishing these core elements should additional components...be introduced selectively"
[^40]: §6.1: "blindly relying on FMs can lead to verbose descriptions that unnecessarily consume the context window...FMs can sometimes produce confusing instructions in some components, e.g., in the Limitations of the get_historical_stock_prices tool"

### For the MCP Protocol (Ecosystem)
5. **Move from monolithic description to structured schema** — dedicated JSON fields for each component would enable dynamic assembly at runtime.[^41]
6. **Registries should integrate quality scoring** — smell summaries and quality badges, analogous to npm security advisories.[^42]

[^41]: §6.2: "The current MCP specification treats the tool description as a monolithic text blob, obscuring distinct semantic elements...by introducing dedicated fields for each component...protocol designers can empower agents to dynamically assemble the most effective description profile at runtime"
[^42]: §6.2: "these diagnostics can function similarly to security advisories in registries such as npm, encouraging developers to submit higher-quality descriptions"

### For MCP Users (Agent Builders)
7. **Treat descriptions as mutable client-side configurations** — override defaults at runtime without modifying server code.[^43]
8. **Enforce explicit resource caps with augmented descriptions** — budget execution steps per domain based on expected ROI.[^44]

[^43]: §6.3: "MCP users can override the default tool description at runtime without modifying server code"
[^44]: §6.3: "while augmented descriptions boost the overall Success Rate (SR) by 5.85 percentage points, they simultaneously inflate the Average Steps (AS) by 67.46%...teams should implement budgeted policies before enabling full augmentation"

---

## METHODOLOGICAL DETAILS FOR TEST DESIGN

### Smell Detection Formula [^45]
```
Smell Detected ⟺ (1/N) × Σ(Score_i) < 3
```
Where N = number of evaluator models (paper uses N=3 from different model families).

[^45]: §4.3.3, formula for smell identification with threshold at score 3

### Multi-Model Jury [^46]
Paper uses `gpt-4.1-mini`, `claude-haiku-3.5`, `qwen3-30b-a3b` — three models from three families to avoid single-model bias. ICC(2,1) agreement ranges from 0.62 (Examples) to 0.90 (Parameter Explanation).

[^46]: §4.3.2: "three distinct FMs from three disparate families...ensure that our evaluation measures the quality of the description without any preferences specific to a single model architecture"

### Augmentation Process (3 stages) [^47]
1. **Initial augmentation** of 5 components via FM (excluding Examples — can't generate grounded examples without execution traces).[^48]
2. **Manual execution** of tools to collect authentic input/output pairs (at least 2 tasks per tool: one success, one error/edge case).
3. **Final consolidation** merging augmented text with real execution traces into structured JSON with 5 explicit fields.

[^47]: §4.4: Three-stage augmentation process described in §4.4.1, §4.4.2, §4.4.3
[^48]: §4.4.1: "the model cannot reliably generate factually grounded examples without execution traces, and doing so would risk introducing hallucinated or incorrect examples"

### Statistical Methods [^49]
- Mann-Whitney U with Bonferroni correction (official vs. community comparison)
- Wilcoxon signed-rank test (before/after augmentation quality scores, AE and AS changes)
- McNemar's test (augmentation impact on SR; p = 0.02)
- Cochran's Q test (ablation comparisons; p > 0.20)
- Pearson's Chi-Square with phi coefficient (configuration correspondence; phi 0.511-0.909)
- ICC(2,1) (inter-rater reliability; 0.62-0.90)

[^49]: Statistical methods described across §4.3.2 (ICC), §5.1 (Mann-Whitney U), §5.2 (Wilcoxon, McNemar's), §5.3 (Chi-Square, Cochran's Q)

---

## GAPS AND LIMITATIONS ACKNOWLEDGED

1. Dataset may exclude proprietary/internal MCP servers.[^50]
2. Evaluation limited to MCP-Universe subset (202 of 856 tools).[^51]
3. Context window constraints forced partial augmentation for smaller models.[^52]
4. Baseline comparisons for 3 of 4 models use aggregate metrics from prior work (not paired per-task data).[^53]
5. Ablation covers only 25 runs (5 domain-model pairs x 5 configurations) — not exhaustive permutations.[^54]
6. Different Google Search MCP server used vs. original benchmark — may explain null results in Web Searching domain.[^55]
7. Examples component has lowest inter-rater reliability (ICC = 0.62, moderate).[^56]

[^50]: §7.1: "potentially excludes MCP servers that have not yet been evaluated or documented in the literature"
[^51]: §7.1: "MCP-Universe covers 202 tools drawn from 18 MCP servers, which represent a strict subset of the full corpus"
[^52]: §7.1: "we exclude the Parameter Explanation and Examples components to avoid context overflow"
[^53]: §7.3: "comparisons for these models rely on aggregate baseline metrics reported in prior work, which may differ from our execution environment"
[^54]: §7.3: "we do not evaluate all possible permutations of components, as each combination would require a separate benchmark run"
[^55]: §7.3: "Differences in the underlying API platform may impact absolute performance in the Web Searching domain...may also explain the lack of performance improvement"
[^56]: §4.3.2/Table 1: Examples ICC(2,1) = 0.62 (moderate reliability vs. 0.76-0.90 for other components)
