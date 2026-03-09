# AI Testing Metrics — Shared Reference

## Agent Behavior Metrics

### Success Rate (SR)

Binary pass/fail — did the FM complete the task (all evaluators pass)?

```
SR = (tasks where all evaluators pass) / (total tasks) × 100
```

### Average Evaluator (AE)

Fraction of evaluators that pass per task, averaged across all tasks. Captures partial credit.

```
AE = (1/N) × Σ (evaluators_passed_i / total_evaluators_i)
```

### Average Steps (AS)

Count of Tool Selection→Invocation loops per task, averaged across tasks. A cost proxy.

```
AS = (1/N) × Σ steps_i
```

### Statistical guidance

- **Run count:** 5–10 times per scenario. Report median and interquartile range.
- **Comparing SR (binary):** McNemar's test in chi-squared formulation.
- **Comparing AE and AS (continuous):** Wilcoxon signed-rank test.
- **Report effect sizes, not just p-values.** A statistically significant 0.5pp improvement may not be practically meaningful.

---

## Response Accuracy Metrics

### Faithfulness

Does the response contain only claims supported by what the tools returned?

```
Faithfulness = (claims supported by tool results) / (total claims in response)
```

- Evidence base: **tool results** (what the server actually returned)
- Score of 1.0 = no hallucinations
- Checks: "did the response hallucinate?"

### Completeness

Does the response cover all relevant facts from the expected answer?

```
Completeness = (golden claims covered by response) / (total golden claims)
```

- Evidence base: **golden answer** (expected facts)
- Checks: "did the response omit?"

**Faithfulness and completeness are independent dimensions.** A response can be perfectly faithful but incomplete (omits facts), or perfectly complete but unfaithful (adds hallucinated facts).

### Claim Decomposition

The core technique that makes faithfulness and completeness measurable. Three steps:

1. **Decompose** the response into atomic claims — each asserts a single fact.
   - Example: "There are 3 ADRs, all with status Accepted, created in January 2026" →
     - (a) "There are 3 ADRs"
     - (b) "All ADRs have status Accepted"
     - (c) "The ADRs were created in January 2026"
2. **Verify** each claim against the relevant evidence (tool results for faithfulness, golden answer for completeness).
3. **Compute** the ratio of supported claims to total claims.

### DeepMind FACTS Two-Phase Evaluation

1. **Eligibility phase:** Does the response adequately address the user's query? Binary pass/fail. A perfectly grounded but off-topic response is useless.
2. **Grounding phase:** Is the response factually grounded in tool results? Faithfulness score 0.0–1.0.

A response must pass **both** phases.

### Multi-Judge Evaluation

For high-stakes evaluation, use 2–3 LLMs from different model families as independent graders.

- Per claim: take the **majority verdict** across judges
- Overall score: compute the **mean** across judges
- Report **inter-judge agreement rate** — low agreement = ambiguous claims needing clearer golden answers

### Grading Method Selection

| Test type | Best grading method | Rationale |
|---|---|---|
| Correctness (counts, IDs, statuses) | Code-based | Exact match. Deterministic. Fast. |
| Correctness (relationships, ordering) | Code-based or FM-based | Simple = code; complex inferences = NLI. |
| Faithfulness | FM-based | Requires claim decomposition + entailment. |
| Completeness | FM-based | Requires comparing free-text claims against reference. |
| Grounding traceability | FM-based | Requires attributing each claim to a specific tool result. |

---

## Chatbot-Specific Metrics

### Coreference Resolution Rate (CRR)

```
CRR = (correctly resolved references) / (total references in scenario) × 100
```

### Workflow Completion Rate (WCR)

```
WCR = (completed workflows) / (total workflow scenarios) × 100
```

### Depth-Adjusted Success Rate (DASR)

```
DASR(depth=N) = SR at turn N
Degradation = SR(turn 1) − SR(turn N)
```

### Presentation Score (PS)

FM-graded measure of result presentation quality (1–5 scale). Grade on relevance to conversational context and appropriate detail level.

### Reliability Score

Microsoft ISE's composite metric for automated multi-turn evaluation.

```
Reliability = (function_name_recall + function_argument_recall) / 2
```

---

## Tool Description Quality Metrics

### Smell Detection (Multi-Model Jury)

```
Smell Detected ⟺ (1/N) × Σ Score_i < 3
```

Use **three LLMs from at least two different provider families**. Compute the arithmetic mean per component per tool.

**Inter-rater reliability reference (ICC(2,1)):** Purpose 0.82, Guidelines 0.85, Limitations 0.84, Parameter Explanation 0.90, Length 0.76, Examples 0.62. Five of six components achieve "good reliability" (0.75–0.90).
