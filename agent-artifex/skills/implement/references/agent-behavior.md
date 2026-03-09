# Agent Behavior — Implementation Reference

Read this file when implementing Agent Behavior (Tool Selection) tests. Contains metrics formulas, scenario design patterns, statistical guidance, and the recorded replay strategy.

---

## Metrics

Compute three metrics per scenario run, then aggregate across runs.

### Success Rate (SR)

Binary pass/fail — did the FM complete the task (all evaluators pass)?

```
SR = (tasks where all evaluators pass) / (total tasks) × 100
```

### Average Evaluator (AE)

Fraction of evaluators that pass per task, averaged across all tasks. Captures partial credit — an FM that satisfies 3 of 4 evaluators is meaningfully better than one that satisfies 0.

```
AE = (1/N) × Σ (evaluators_passed_i / total_evaluators_i)
```

### Average Steps (AS)

Count of Tool Selection→Invocation loops per task, averaged across tasks. A cost proxy — more steps means more FM calls and more tokens.

```
AS = (1/N) × Σ steps_i
```

### Key evidence numbers

- Augmented descriptions: +5.85pp SR (McNemar's test, p = 0.02), +15.12% AE (Wilcoxon, p < 0.01), +67.46% AS median increase (Wilcoxon, p < 0.001)
- 68–78% of tasks require more steps with augmented descriptions; only 19–20% of increased-step tasks achieve final success
- MCP-Universe benchmark: 231 tasks, 6 domains, 202 tools, ~3.3 evaluators per task
- Cost: 200–300M tokens per full benchmark run per model ($75–600 USD depending on provider)

---

## Statistical Guidance

Agent behavior is non-deterministic — a single run tells you almost nothing, but patterns tell you everything.

- **Run count:** At least 5–10 times per scenario. Report median and interquartile range.
- **For SR (binary):** Use McNemar's test in its chi-squared formulation to compare two configurations.
- **For AE and AS (continuous):** Use the Wilcoxon signed-rank test.
- **Report effect sizes, not just p-values.** A statistically significant 0.5pp improvement may not be practically meaningful.

---

## Scenario Design

Each scenario defines an input, expected behavior, and success criteria.

### Scenario structure

| Component | Description | Example |
|---|---|---|
| **User query** | Natural language request, as the user would phrase it | "What was the third-quarter income of Apple for 2025?" |
| **Expected tool call** | Tool name and argument values the FM should select | `get_financial_statement(ticker="AAPL", financial_type="quarterly_income_statement")` |
| **Expected sequence** (optional) | For multi-step workflows, the ordered list of tool calls | 1. `create_adr(...)` → 2. `assess_adr_quality(id)` |
| **Evaluators** | One or more assertions that verify the outcome | SR: all evaluators pass. AE: fraction of evaluators that pass. |
| **Ground truth** (optional) | Expected final answer or key facts it must contain | "Apple's Q3 2025 net income was $X billion" |

### Five scenario categories

1. **Single-tool queries** — One tool is clearly correct. Tests basic tool selection. Example: "What was the third-quarter income of Apple for 2025?"

2. **Multi-step workflows** — The FM must chain 2+ tools in sequence. Tests sequencing and context carry-forward. Example: 1. `create_adr(...)` → 2. `assess_adr_quality(id)`

3. **Ambiguous queries** — Multiple tools could plausibly apply. Tests disambiguation driven by description quality. **These are the highest-value scenarios** because they directly exercise the Usage Guidelines and Limitations components.

4. **Negative cases** — Queries that should NOT trigger any tool call (the FM should answer directly). Tests whether the FM knows when to stop.

5. **Edge-case arguments** — Queries requiring specific argument formatting (date formats, enum values). Tests whether Parameter Explanation guides the FM to correct values.

### How many scenarios

Aim for at least 3–5 scenarios per tool (covering categories 1–5 above), plus 2–3 multi-tool workflow scenarios. A 5-tool server benefits from 20–30 scenarios.

---

## Recorded Scenario Replay (Regression Detection)

Record live interactions once, replay deterministically to detect regressions. CI-safe after initial recording.

### How it works

1. **Recording mode:** Run scenarios live against real MCP servers and a real FM. Capture the full interaction trace: user query, tool definitions, FM tool selection decisions, tool call arguments, tool results, and FM final answer.

2. **Replay mode:** Replay the recorded FM decisions deterministically. Assert on tool call sequences and interaction flow, not exact text outputs.

3. **Regression detection:** When tool descriptions or server behavior changes, re-run recorded scenarios. If a previously-passing scenario now fails (different tool selected, different arguments), it flags a regression.

### TestProvider pattern

Use a TestProvider keyed by input message hash — the same FM context produces the same recorded response. Record scenarios after each live evaluation pass. Build a growing corpus that runs cheaply on every commit.

### Key limitation

Recorded replays detect **regressions only**, not improvements. New scenarios or changed tool definitions require fresh live recordings. This supplements live evaluation, not replaces it.

**Regression means "success rates dropped," not "the output changed."**

---

## Live FM Evaluation (On-Demand)

Full behavioral evaluation — scenarios executed with a real FM making real decisions.

### Running the evaluation

For each scenario:

1. **Initialize** a clean MCP client/server pair and FM session. Each trial must be isolated — unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures.

2. **Send** the user query to the FM with tool definitions from `tools/list`.

3. **Loop** until the FM produces a final text answer (or a step limit is reached):
   - FM selects a tool → execute `tools/call` → append result to FM context

4. **Grade** the outcome:
   - Did the FM select the expected tool(s)? (SR component)
   - Were the arguments correct? (AE component)
   - How many loops did it take? (AS)

### Grading tool selection and arguments

**Tool selection accuracy — use code-based grading:** Compare the tool name against the expected tool name. Fast and deterministic.

**Argument quality — use a combination:**
- **Code-based:** Check required parameters are present, types are correct, enum values are valid.
- **FM-based:** For free-text arguments where exact match is impossible, use an LLM grader with a reference-guided approach and clear rubrics.

**Grade outcomes, not paths.** Don't assert exact tool call sequences. "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid." Focus on whether the final result is correct and the intermediate steps were reasonable.

---

## Multi-Model Stability Testing

Select **2–3 models from different families** (e.g., one from OpenAI, one from Anthropic, one open-weight). Run the full scenario suite against each. Compare SR, AE, and AS across models.

- A smaller model with augmented descriptions can match or surpass a larger model
- A description that works well for one model but fails for another indicates model-specific sensitivity that may require tailored descriptions
- **When to run:** Before major releases only. Cost multiplies by model count.

---

## Component Ablation (Description Optimization)

Research activity for teams actively optimizing descriptions. Not routine testing.

- Fix Purpose as always-present (it defines what the tool does)
- Test combinations: P+G, P+L, P+E, P+PEx, P+G+L+PEx (all minus Examples), fully augmented
- Key finding: Removing Examples does not significantly degrade performance (Cochran's Q, p > 0.20)
- Domain-dependent: Purpose + Guidelines alone can outperform full augmentation (67.50% vs. 57.50% in Finance/GPT-4.1)

---

## When to Run

| Test type | Trigger | Rationale |
|---|---|---|
| **Recorded replay** | Every commit that changes tool descriptions or server logic | Deterministic after recording. Catches regressions cheaply. |
| **Live FM evaluation** | Before releases, when adding tools, periodically as a quality audit | The only test that measures actual FM behavior. Aggregate across runs. |
| **Multi-model stability** | Before major releases | Validates descriptions work across FM families. Cost scales with model count. |
| **Component ablation** | When actively optimizing descriptions | Research activity, not routine. No single combination works universally. |
