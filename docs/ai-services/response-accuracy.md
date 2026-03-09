# Response Accuracy

> Part of [AI Services Framework](framework.md).
>
> Test type: **End-to-end (LLM + ground truth)** | Role: **Outcome measure**

This is the only end-to-end test in the guidelines. It exercises the full interaction loop — from user prompt through discovery, tool selection, invocation, and synthesis — then verifies the answer the user actually receives. The other three guidelines test segments of the loop in isolation; this one tests what the user experiences.

Response accuracy is not a distinct MCP protocol phase — the spec and the paper both acknowledge response synthesis[^2] but neither names it as a phase or provides metrics for it. It is, however, the **scoreboard**: a system can score well on description rubrics, tool selection accuracy, and schema consistency, and still produce a hallucinated answer.

**High-quality responses** accurately represent what the tools returned — correct counts, correct statuses, correct relationships — without hallucinating details that weren't in the tool results or omitting details that were.[^3] The user can trust the answer because it is traceable to tool output.[^4]

**How to compare two outputs:** Seed the repository with known data, run the full loop, and compare the FM's answer against ground truth.[^5] Measure: (1) faithfulness — does the answer contain only claims supported by tool results?[^3] (2) completeness — are all relevant details from tool results included?[^6] (3) correctness — are counts, statuses, and relationships accurate?[^7] These require a closed-loop test: known input data, real tool execution, and verification of the final answer against expected values.[^5]

---

## What should be tested

1. **Faithfulness.** The final answer should contain only claims supported by tool results. No hallucinated details. The RAGAS framework defines faithfulness as the ratio of claims supported by context to total claims: `Faithfulness = |supported claims| / |total claims|`.[^3] Anthropic recommends "groundedness checks [to] verify that claims are supported by retrieved sources."[^4]

2. **Completeness.** All relevant details from tool results should be represented in the final answer. RAGAS measures this via context recall — whether the context "contains all the information required to produce the ideal output."[^6]

3. **Correctness.** Counts, statuses, identifiers, and relationships should exactly match tool output. RAGAS Factual Correctness compares claims against a reference answer using precision, recall, and F1.[^7]

4. **Grounding traceability.** Each claim in the final answer should be traceable to a specific tool result. This is verifiable by seeding known data and checking the answer against expected values.[^5] Anthropic recommends using "a golden answer" as ground truth — "a mandatory exact match, or an example of a perfect answer meant to give a grader a point of comparison."[^8]

## How to test

Response accuracy is the **only end-to-end test** in the guidelines — it exercises the full interaction loop and verifies the answer the user actually receives. Unlike agent behavior testing (entirely LLM-in-the-loop) or tool description quality (entirely deterministic), response accuracy has a **hybrid testing model**: some checks are code-gradeable and CI-safe, while others require LLM grading and run on-demand.[^12]

The critical difference from the other three guidelines: response accuracy testing requires a **closed-loop harness** — seeded data, a running MCP server, a real FM, and a grading pipeline. The harness structure follows Anthropic's eval pattern: input prompt, model output, golden answer, score.[^5]

### Impact and effort summary

| Test | Impact on response accuracy | Effort | Evidence |
|---|---|---|---|
| **1. Correctness (structured)** | **Highest practical impact.** Catches the most obvious and damaging errors — wrong counts, wrong IDs, wrong statuses. These are the errors users notice immediately and that erode trust fastest. | Low. Code-based grading: exact match, regex, numeric comparison. Deterministic, CI-safe. "Code-based grading is the best grading method if possible, as it is fast and highly reliable."[^12] | Anthropic Building Evals[^12], RAGAS Factual Correctness[^7] |
| **2. Faithfulness** | **Highest conceptual impact.** The defining property of a trustworthy response — no hallucinated claims. A response that adds facts not in the tool results is unfaithful regardless of how correct its other claims are.[^3] | High. Requires claim decomposition + NLI via LLM. Non-deterministic. "Grading is a cost you will incur every time you re-run your eval, in perpetuity."[^13] | RAGAS Faithfulness[^3], Anthropic Groundedness[^4] |
| **3. Completeness** | **Moderate.** Missing details may be acceptable in some contexts (a summary need not include every field), but critical omissions mislead. Coverage checks "define key facts a good answer must include."[^4] | High. Requires decomposing the golden answer into claims and checking each against the FM's response via LLM.[^14] | RAGAS Context Recall[^6], Anthropic Coverage[^4] |
| **4. Grounding traceability** | **Moderate — diagnostic rather than standalone.** Overlaps with faithfulness (both check claim support), but adds attribution: *which* tool result supports *which* claim. Most valuable when debugging faithfulness failures. | Medium–High. Requires LLM to attribute each claim to a specific tool result. Effort scales with the number of tool calls in the scenario.[^15] | DeepMind FACTS Grounding[^11], Anthropic Groundedness[^4] |

**Practical implication:** Invest in Tier 1 correctness checks first — they catch the most damaging errors at near-zero cost and run on every commit. Reserve Tier 2 faithfulness and completeness for on-demand validation. When Tier 1 passes but users report inaccurate answers, Tier 2 diagnoses whether the FM is hallucinating (faithfulness) or omitting (completeness). Anthropic recommends: "Prefer deterministic graders where possible; use LLM graders where necessary."[^16]

### Constructing the closed-loop harness

Every response accuracy test follows the same five-step closed-loop pattern, derived from Anthropic's evaluation structure[^5] and the RAGAS evaluation pipeline[^3]:

**Step 1: Seed data.** Create known-state data in your repository or database before each test run. Every scenario needs a deterministic starting state — if the data varies between runs, golden answers become invalid. Each trial should be isolated: "Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures."[^17]

**Step 2: Define the scenario.** Each scenario specifies:

| Component | Description | Example |
|---|---|---|
| **User query** | Natural language request | "List all ADRs with status Accepted" |
| **Seed state** | Known data that must exist before the query | 3 ADRs: one Accepted, one Proposed, one Superseded |
| **Golden answer** | Expected facts the FM's response must contain | "1 ADR with status Accepted: ADR-007 'Use PostgreSQL'" |
| **Grading mode** | Code-based, FM-based, or both | Correctness: code-based (count = 1, ID = ADR-007). Faithfulness: FM-based. |

The golden answer serves dual purposes: "a mandatory exact match, or an example of a perfect answer meant to give a grader a point of comparison."[^8] For Tier 1 tests, extract specific checkable values (counts, IDs, statuses). For Tier 2 tests, the golden answer provides the reference for claim-level comparison.

**Step 3: Execute the full loop.** Run the complete MCP interaction: discovery (`tools/list`) → tool selection (FM decides) → invocation (`tools/call`) → synthesis (FM produces final answer). Do not short-circuit any phase — this is an end-to-end test.

**Step 4: Capture both layers.** Record:
- The **tool results** — what the server actually returned (structured data)
- The **FM's final answer** — what was synthesized for the user (natural language)

Both are needed for grading. Correctness compares the final answer against the golden answer. Faithfulness compares the final answer against the tool results (not the seed data — the actual tool output, which may differ if the server has bugs).

**Step 5: Grade.** Apply the appropriate grading method for each test type (see Tier 1 and Tier 2 below).

### Grading method selection

Each test type maps to an optimal grading method, following Anthropic's hierarchy[^12] and OpenAI's guidance that "LLMs are better at discriminating between options"[^18]:

| Test type | Best grading method | Rationale |
|---|---|---|
| Correctness (counts, IDs, statuses) | Code-based | Exact match. Deterministic. Fast. |
| Correctness (relationships, ordering) | Code-based or FM-based | Simple relationships are code-gradeable; complex inferences need NLI. |
| Faithfulness | FM-based | Requires claim decomposition and entailment judgment — no code shortcut. |
| Completeness | FM-based | Requires comparing free-text claims against a reference answer. |
| Grounding traceability | FM-based | Requires attributing each claim to a specific tool result. |

### Tier 1: Code-graded correctness checks (CI-safe)

These tests require no LLM calls for grading (though the harness itself uses an FM to generate the response). The grading step is deterministic — run on every commit that changes tool logic or response-affecting code.[^19]

**What to extract and check:** After the FM produces its final answer, extract structured claims and compare against golden answer values:

- **Counts:** "Found 3 ADRs" → extract the number, assert exact match
- **Identifiers:** "ADR-007" → assert string inclusion
- **Statuses:** "status: Accepted" → assert exact match against seed data
- **Named entities:** tool names, field values, enum values → assert presence
- **Negation consistency:** if the seed data has zero matches, assert the answer does not fabricate results

```typescript
// Example: correctness checks against a golden answer
const goldenAnswer = {
  count: 1,
  ids: ["ADR-007"],
  statuses: ["Accepted"],
  title: "Use PostgreSQL",
};

// Extract claims from FM response (simple regex/string matching)
const response = fmFinalAnswer;

// Count check
const countMatch = response.match(/(\d+)\s+ADR/i);
expect(Number(countMatch?.[1])).toBe(goldenAnswer.count);

// ID check
for (const id of goldenAnswer.ids) {
  expect(response).toContain(id);
}

// Status check
for (const status of goldenAnswer.statuses) {
  expect(response.toLowerCase()).toContain(status.toLowerCase());
}
```

```python
# Python equivalent
import re

golden_answer = {
    "count": 1,
    "ids": ["ADR-007"],
    "statuses": ["Accepted"],
    "title": "Use PostgreSQL",
}

# Count check
count_match = re.search(r"(\d+)\s+ADR", response, re.IGNORECASE)
assert int(count_match.group(1)) == golden_answer["count"]

# ID check
for id in golden_answer["ids"]:
    assert id in response

# Status check
for status in golden_answer["statuses"]:
    assert status.lower() in response.lower()
```

**Limitations of Tier 1:** Code-based grading only catches structured errors. It cannot detect hallucinated qualitative claims ("the decision was controversial"), omitted context ("this supersedes ADR-003"), or fabricated relationships. These require Tier 2.

### Tier 2: LLM-graded faithfulness and completeness (on-demand)

These tests use LLMs to evaluate semantic properties of the FM's response. They are non-deterministic and incur API costs — run on-demand, not per commit.[^19]

#### Claim decomposition

Claim decomposition is the core technique that makes faithfulness and completeness measurable.[^3] It breaks a natural-language response into individual factual statements that can be independently verified.

**How it works** (from RAGAS[^3] and DeepMind FACTS[^11]):

1. **Decompose the response** into atomic claims — each claim asserts a single fact. Example: "There are 3 ADRs, all with status Accepted, created in January 2026" decomposes into: (a) "There are 3 ADRs," (b) "All ADRs have status Accepted," (c) "The ADRs were created in January 2026."
2. **Verify each claim** against the relevant evidence (tool results for faithfulness, golden answer for completeness).
3. **Compute the ratio** of supported claims to total claims.

Use an LLM to perform both decomposition and verification. The prompt structure:

> **Decomposition prompt:** "Break the following response into individual factual claims. Each claim should assert exactly one fact. List them as a numbered array."
>
> **Verification prompt:** "For each claim below, determine whether it is SUPPORTED, NOT SUPPORTED, or CONTRADICTED by the provided evidence. Respond with JSON."

#### Faithfulness scoring

Faithfulness measures whether the FM's response contains only claims supported by what the tools actually returned.[^3] The evidence base is the **tool results** captured in Step 4 of the harness — not the seed data, not the golden answer.

```
Faithfulness = (claims supported by tool results) / (total claims in response)
```

A faithfulness score of 1.0 means no hallucinations. Any score below 1.0 indicates the FM added claims not present in tool output. Anthropic's groundedness checks serve the same purpose: "verify that claims are supported by retrieved sources."[^4]

**Prompt structure for faithfulness grading:**

> You are grading whether a response is faithful to the tool results it was given.
>
> **Tool results (evidence):**
> ```json
> {captured_tool_results}
> ```
>
> **FM's response:**
> {fm_final_answer}
>
> **Claims (decomposed):**
> {numbered_claims}
>
> For each claim, respond with JSON: `{"claim_number": 1, "verdict": "SUPPORTED" | "NOT_SUPPORTED" | "CONTRADICTED", "evidence": "quote from tool results or 'none'"}`

**Pass/fail criteria:** A response passes faithfulness if all claims are SUPPORTED. Any NOT_SUPPORTED or CONTRADICTED claim indicates hallucination. For graded scoring, compute the ratio.

#### Completeness scoring

Completeness measures whether the FM's response covers all relevant facts from the expected answer.[^6] The evidence base is the **golden answer** — decompose it into claims and check whether the FM's response covers each one.

```
Completeness = (golden claims covered by response) / (total golden claims)
```

This is the inverse direction from faithfulness: faithfulness checks "did the response hallucinate?", completeness checks "did the response omit?"[^14] Both can score 1.0 independently — a response can be perfectly faithful but incomplete (omits facts), or perfectly complete but unfaithful (adds hallucinated facts).

#### Two-phase evaluation (from DeepMind FACTS)

Apply DeepMind's two-phase pattern for comprehensive evaluation[^11]:

1. **Eligibility phase:** Does the response adequately address the user's query? A response that is perfectly grounded but doesn't answer the question is useless. Grade: binary pass/fail.
2. **Grounding phase:** Is the response factually grounded in tool results? Apply faithfulness scoring. Grade: 0.0–1.0 ratio.

A response must pass both phases. This prevents a common failure mode: an FM that produces a vague, safe response ("I found some ADRs") that is technically faithful but useless.

#### Multi-judge evaluation

For high-stakes evaluation (pre-release, production readiness), use 2–3 LLMs from different model families as independent graders, following DeepMind's multi-judge methodology.[^11] This mitigates bias toward any single model family.

**Aggregation:** For each claim, take the majority verdict across judges. For the overall faithfulness/completeness score, compute the mean across judges. Report both the mean and the inter-judge agreement rate — low agreement indicates ambiguous claims that may need clearer golden answers.

### When to run

| Test type | Trigger | Rationale |
|---|---|---|
| **Tier 1 correctness** | Every commit that changes tool logic, domain functions, or response formatting | Deterministic, near-zero cost. Catches the most damaging errors.[^12] |
| **Tier 2 faithfulness** | Before releases, when adding tools, periodically as a quality audit | The scoreboard test. Detects hallucination — the #1 trust killer.[^3] |
| **Tier 2 completeness** | Before releases, when modifying tool response schemas | Detects omissions. "Coverage checks define key facts a good answer must include."[^4] |
| **Full multi-judge** | Before major releases | Most expensive. Production readiness check. Mitigates single-model grading bias.[^11] |

---

## Evidence base

Hasan et al. do **not** measure response faithfulness, completeness, or correctness. The paper's evaluation stops at the task-level Success Rate (SR) and intermediate-step Average Evaluator (AE) score — both of which assess whether the FM *called the right tools with the right arguments*, not whether it *accurately synthesized the results into a truthful answer*.[^9]

The paper acknowledges that "the FM then synthesizes the final answer from the returned data"[^2] but provides no metrics for synthesis quality. Its FM-generated Limitations example — where "vague or self-referential statements" degraded performance[^10] — demonstrates that FMs can produce misleading text even when working from structured data, underscoring the need for faithfulness testing.

**This is a gap in the paper.** Our response-accuracy tests are grounded in other authoritative sources:
- **RAGAS** (Es et al., arXiv:2309.15217) — faithfulness, context recall, and factual correctness metrics for RAG evaluation[^3]
- **Anthropic, "Demystifying Evals"** — groundedness checks, coverage checks, and golden-answer comparison[^4][^8]
- **Google DeepMind, FACTS Grounding** — multi-judge factual attribution benchmark[^11]
- **OpenAI, "Evaluation Best Practices"** — reference-based automated evals against known ground truth[^5]

---

## Footnotes

[^1]: Hasan et al. §3.1, point (3): "The FM then synthesizes the final answer from the returned data."

[^2]: Hasan et al. §3.1, point (3): "The FM then synthesizes the final answer from the returned data."

[^3]: Es, S. et al. (2023), "RAGAS: Automated Evaluation of Retrieval Augmented Generation," arXiv:2309.15217. Faithfulness = (number of claims supported by context) / (total claims in response). "A response is considered faithful if all its claims can be supported by the retrieved context." ([paper](https://arxiv.org/abs/2309.15217); [docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/); local copy: `sources/ragas-metrics.md`)

[^4]: Anthropic, "Demystifying Evals for AI Agents": "Groundedness checks verify that claims are supported by retrieved sources, coverage checks define key facts a good answer must include, and source quality checks confirm the consulted sources are authoritative." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^5]: Anthropic, "Building Evals" cookbook: Evaluation uses "the input column contains variable inputs...there's output from running the input through the model, a 'golden answer' to compare against the model output, and a score generated by grading methods." OpenAI, "Evaluation Best Practices": "Automated LLM evals can be reference-based: you compare outputs to a known ground truth during experimentation, regression testing, and stress-testing." ([Anthropic](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb), local copy: `sources/anthropic-building-evals.md`; [OpenAI](https://platform.openai.com/docs/guides/evaluation-best-practices), local copy: `sources/openai-evaluation-best-practices.md`)

[^6]: RAGAS, Context Recall: Measures "how many of the relevant documents (or pieces of information) were successfully retrieved." ([docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/); local copy: `sources/ragas-metrics.md`)

[^7]: RAGAS, Factual Correctness: "Compares and evaluates the factual accuracy of the generated response with the reference." Uses claim-level decomposition with NLI to compute Precision, Recall, and F1. ([docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/factual_correctness/); local copy: `sources/ragas-metrics.md`)

[^8]: Anthropic, "Building Evals" cookbook: A "golden answer" serves as ground truth — "a mandatory exact match, or an example of a perfect answer meant to give a grader a point of comparison." ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)

[^9]: Hasan et al. §4.5.1: The benchmark evaluates SR (task completion) and AE (intermediate step quality), not response synthesis quality.

[^10]: Hasan et al. §5.3: "the Limitations component of the same tool includes vague or self-referential statements such as 'this contradiction requires disambiguation before relying on intraday availability', which can introduce uncertainty into the model's reasoning"

[^11]: Google DeepMind, FACTS Grounding benchmark: Measures whether LLM responses are "fully attributable to that document, with no hallucinations." Uses three frontier LLM judges in a two-phase evaluation: eligibility (does it answer the query?) then grounding (is it factually grounded in the source?). ([source](https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/); local copy: `sources/deepmind-facts-grounding.md`)

[^12]: Anthropic, "Building Evals" cookbook: "Code-based grading is the best grading method if possible, as it is fast and highly reliable." Uses string matching and regex patterns for structured outputs. Code-based grading is the foundation of Tier 1 correctness checks. ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)

[^13]: Anthropic, "Building Evals" cookbook: "Grading is a cost you will incur every time you re-run your eval, in perpetuity" — making automation prioritized over manual review. Best practices: "design automatable evals through clever structure, prioritize question volume over individual quality, and test model-based graders empirically before deployment." ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)

[^14]: RAGAS, Context Recall: Breaks down reference answers into individual claims, then determines whether each claim can be supported by retrieved contexts. Formula: (Number of supported claims) / (Total reference claims). Output: 0–1. "Requires reference data for comparison — essential for scenarios where missing relevant information is a significant concern." ([docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/); local copy: `sources/ragas-metrics.md`)

[^15]: Anthropic, "Demystifying Evals for AI Agents": "An LLM can flag unsupported claims and gaps in coverage but also verify the open-ended synthesis for coherence and completeness." Grounding traceability extends this by attributing each claim to its source tool result. ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^16]: Anthropic, "Demystifying Evals for AI Agents": "Prefer deterministic graders where possible; use LLM graders where necessary." Grader types ranked: code-based (fast, cheap, objective, reproducible), model-based (flexible, scalable, but non-deterministic and expensive), human (gold standard but expensive and slow). ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^17]: Anthropic, "Demystifying Evals for AI Agents": "Each trial should be 'isolated' by starting from a clean environment. Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^18]: OpenAI, "Evaluation Best Practices": "LLMs are better at discriminating between options. Therefore, evaluations should focus on tasks like pairwise comparisons, classification, or scoring against specific criteria instead of open-ended generation." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)

[^19]: Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog. Base layer: "fast, cheap, and completely deterministic." CI philosophy: "Don't run live LLM tests in CI. Too expensive, too slow, too flaky." Tier 1 correctness checks belong in the deterministic base; Tier 2 faithfulness/completeness belong in the probabilistic upper layers. ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)
