# Response Accuracy — Implementation Reference

Read this file when implementing Response Accuracy tests. Contains the closed-loop harness, faithfulness/completeness formulas, claim decomposition, prompt templates, and multi-judge evaluation.

---

## The Closed-Loop Harness

Every response accuracy test follows five steps:

### Step 1: Seed data

Create known-state data before each test run. Every scenario needs a deterministic starting state — if data varies between runs, golden answers become invalid. Each trial must be isolated: "Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures."

### Step 2: Define the scenario

| Component | Description | Example |
|---|---|---|
| **User query** | Natural language request | "List all ADRs with status Accepted" |
| **Seed state** | Known data that must exist before the query | 3 ADRs: one Accepted, one Proposed, one Superseded |
| **Golden answer** | Expected facts the FM's response must contain | "1 ADR with status Accepted: ADR-007 'Use PostgreSQL'" |
| **Grading mode** | Code-based, FM-based, or both | Correctness: code-based. Faithfulness: FM-based. |

The golden answer serves dual purposes: exact-match target for Tier 1 and reference for claim-level comparison in Tier 2.

### Step 3: Execute the full loop

Run the complete MCP interaction: discovery (`tools/list`) → tool selection (FM decides) → invocation (`tools/call`) → synthesis (FM produces final answer). Do not short-circuit any phase.

### Step 4: Capture both layers

Record:
- **Tool results** — what the server actually returned (structured data)
- **FM's final answer** — what was synthesized for the user (natural language)

Both are needed. Correctness compares the final answer against the golden answer. Faithfulness compares the final answer against the **tool results** (not the seed data — the actual tool output, which may differ if the server has bugs).

### Step 5: Grade

Apply the appropriate grading method per test type.

---

## Grading Method Selection

| Test type | Best grading method | Rationale |
|---|---|---|
| Correctness (counts, IDs, statuses) | Code-based | Exact match. Deterministic. Fast. |
| Correctness (relationships, ordering) | Code-based or FM-based | Simple relationships are code-gradeable; complex inferences need NLI. |
| Faithfulness | FM-based | Requires claim decomposition and entailment judgment. |
| Completeness | FM-based | Requires comparing free-text claims against a reference answer. |
| Grounding traceability | FM-based | Requires attributing each claim to a specific tool result. |

---

## Tier 1: Code-Graded Correctness Checks (CI-Safe)

No LLM calls for grading (though the harness uses an FM to generate the response). Deterministic grading step. Run on every commit that changes tool logic or response-affecting code.

### What to extract and check

After the FM produces its final answer, extract structured claims and compare against golden answer values:

- **Counts:** "Found 3 ADRs" → extract the number, assert exact match
- **Identifiers:** "ADR-007" → assert string inclusion
- **Statuses:** "status: Accepted" → assert exact match against seed data
- **Named entities:** tool names, field values, enum values → assert presence
- **Negation consistency:** if the seed data has zero matches, assert the answer does not fabricate results

```typescript
const goldenAnswer = {
  count: 1,
  ids: ["ADR-007"],
  statuses: ["Accepted"],
  title: "Use PostgreSQL",
};

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

**Limitations:** Code-based grading catches structured errors only. It cannot detect hallucinated qualitative claims, omitted context, or fabricated relationships. Those require Tier 2.

---

## Tier 2: LLM-Graded Faithfulness and Completeness (On-Demand)

Non-deterministic, incurs API costs. Run on-demand, not per commit.

### Claim Decomposition

The core technique that makes faithfulness and completeness measurable. Breaks a natural-language response into individual factual statements that can be independently verified.

**Three-step process:**

1. **Decompose** the response into atomic claims — each claim asserts a single fact.
   - Example: "There are 3 ADRs, all with status Accepted, created in January 2026" decomposes into:
     - (a) "There are 3 ADRs"
     - (b) "All ADRs have status Accepted"
     - (c) "The ADRs were created in January 2026"

2. **Verify** each claim against the relevant evidence.

3. **Compute** the ratio of supported claims to total claims.

### Faithfulness Scoring

Measures whether the FM's response contains only claims supported by what the tools actually returned. The evidence base is the **tool results** (not the seed data, not the golden answer).

```
Faithfulness = (claims supported by tool results) / (total claims in response)
```

- Score of 1.0 = no hallucinations
- Any score below 1.0 = the FM added claims not present in tool output
- A response passes faithfulness if **all claims are SUPPORTED**. Any NOT_SUPPORTED or CONTRADICTED claim indicates hallucination.

**Faithfulness grading prompt:**

```
You are grading whether a response is faithful to the tool results it was given.

**Tool results (evidence):**
```json
{captured_tool_results}
```

**FM's response:**
{fm_final_answer}

**Claims (decomposed):**
{numbered_claims}

For each claim, respond with JSON:
{"claim_number": 1, "verdict": "SUPPORTED" | "NOT_SUPPORTED" | "CONTRADICTED", "evidence": "quote from tool results or 'none'"}
```

### Completeness Scoring

Measures whether the FM's response covers all relevant facts from the expected answer. The evidence base is the **golden answer** — decompose it into claims and check whether the FM's response covers each one.

```
Completeness = (golden claims covered by response) / (total golden claims)
```

This is the inverse direction from faithfulness: faithfulness checks "did the response hallucinate?", completeness checks "did the response omit?" Both can score 1.0 independently — a response can be perfectly faithful but incomplete, or perfectly complete but unfaithful.

**Prompts:**

**Decomposition prompt:**
```
Break the following response into individual factual claims. Each claim should assert exactly one fact. List them as a numbered array.
```

**Verification prompt:**
```
For each claim below, determine whether it is SUPPORTED, NOT SUPPORTED, or CONTRADICTED by the provided evidence. Respond with JSON.
```

### DeepMind FACTS Two-Phase Evaluation

For comprehensive evaluation, apply two phases:

1. **Eligibility phase:** Does the response adequately address the user's query? A response that is perfectly grounded but doesn't answer the question is useless. Grade: binary pass/fail.

2. **Grounding phase:** Is the response factually grounded in tool results? Apply faithfulness scoring. Grade: 0.0–1.0 ratio.

A response must pass **both** phases. This prevents a vague, safe response ("I found some ADRs") that is technically faithful but useless.

### Multi-Judge Evaluation

For high-stakes evaluation (pre-release, production readiness), use **2–3 LLMs from different model families** as independent graders.

**Aggregation:**
- For each claim, take the **majority verdict** across judges
- For overall faithfulness/completeness, compute the **mean** across judges
- Report both the mean and the **inter-judge agreement rate** — low agreement indicates ambiguous claims that may need clearer golden answers

---

## When to Run

| Test type | Trigger | Rationale |
|---|---|---|
| **Tier 1 correctness** | Every commit that changes tool logic, domain functions, or response formatting | Deterministic, near-zero cost. Catches the most damaging errors. |
| **Tier 2 faithfulness** | Before releases, when adding tools, periodically as a quality audit | Detects hallucination — the #1 trust killer. |
| **Tier 2 completeness** | Before releases, when modifying tool response schemas | Detects omissions. |
| **Full multi-judge** | Before major releases | Most expensive. Production readiness check. Mitigates single-model grading bias. |
