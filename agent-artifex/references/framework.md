# AI Testing Framework — Shared Reference

## The Causal Chain

The true quality of an MCP tool service is the quality of the response the user receives. Everything else is in service of that outcome.

```
Tool Description Quality → Agent Behavior → Server Correctness → Response Accuracy
     (Discovery)            (Tool Selection)    (Invocation)         (full loop)
      leading                 leading              leading              OUTCOME
```

Description quality shapes tool selection. Tool selection determines which server logic runs. Server results feed the FM's synthesis. But a system can score well on the first three and still produce a hallucinated answer — or score poorly on description rubrics and still deliver accurate responses.

**Chatbot Integration** extends Agent Behavior and Response Accuracy into multi-turn conversational contexts — testing coreference resolution, context pressure, workflow orchestration, system prompt interaction, presentation quality, and graceful degradation.

**Response Accuracy is the only measure the user experiences.** The other four are leading indicators that diagnose *why* response accuracy is high or low.

### Diagnostic flow

When response accuracy is low, trace backward through the chain:
1. Did the FM pick the right tool? → Agent Behavior
2. Were the arguments correct? → Agent Behavior (argument quality)
3. Did the server return correct results? → Server Correctness
4. Did the FM synthesize faithfully? → Response Accuracy Tier 2

When chatbot tests fail but single-turn tests pass → the problem is conversational (context pressure, coreference, orchestration). When both fail → fix single-turn first.

---

## The Testing Pyramid

The AI agent testing pyramid replaces traditional unit/integration/e2e layers with layers of **uncertainty tolerance** — from deterministic at the base to probabilistic at the top.

### Base Layer: Deterministic (CI-safe, every commit)

- **Tool Description Quality** — Rubric component markers, sentence counting, parameter description checks, inter-tool disambiguation, limitation quality guards. No LLM calls. Near-zero cost.
- **Server Correctness** — Schema validation (outputSchema → structuredContent), error structure assertions, golden-file/snapshot tests, error-path coverage. Mock providers, no LLM calls.

### Middle Layer: Recorded Replay (CI-safe after recording)

Record live FM interactions once, replay deterministically to detect regressions. Uses a **TestProvider pattern** keyed by input message hash — the same FM context produces the same recorded response.

- **Recording mode:** Run scenarios live against real MCP servers and a real FM. Capture the full interaction trace: user query, tool definitions, FM decisions, arguments, tool results, final answer.
- **Replay mode:** Replay the recorded FM decisions deterministically. Assert on tool call sequences and interaction flow, not exact text outputs.
- **Regression = "success rates dropped," not "the output changed."**
- **Limitation:** Detects regressions only, not improvements. New scenarios require fresh recordings.

### Upper Layer: Probabilistic (on-demand)

- **Agent Behavior** — LLM in the loop for tool selection. Run 5–10 times per scenario and aggregate. "A single run tells us almost nothing but patterns tell us everything."
- **Response Accuracy** — Full end-to-end: seed data, run the loop, verify against ground truth. Most expensive single-turn test. Two-tier grading: code-based (Tier 1, CI-safe) and LLM-graded (Tier 2, on-demand).
- **Chatbot Integration** — Multi-turn conversations at varying depths. Most expensive overall.

### Key principles

- **"Don't run live LLM tests in CI. Too expensive, too slow, too flaky. CI validates the deterministic layers. Humans validate the rest when it matters."** — Block Engineering
- **"Prefer deterministic graders where possible; use LLM graders where necessary."** — Anthropic
- **"Adopt eval-driven development: Evaluate early and often. Write scoped tests at every stage."** — OpenAI

---

## The Two-Tier Grading Model

This model applies across all testing areas, not just Response Accuracy:

| Tier | Grading | Determinism | Cost | CI/CD | Catches |
|---|---|---|---|---|---|
| **Tier 1** | Code-based (regex, exact match, schema validation) | Fully deterministic | Near zero | Every commit | Structural defects, format violations, exact-value errors |
| **Tier 2** | LLM-graded (rubric scoring, claim decomposition, NLI) | Non-deterministic | LLM API costs | On-demand | Semantic quality, hallucination, omission, subjective quality |

**Per area:**
- Tool Description Quality: Tier 1 = structural checks; Tier 2 = FM-scored rubric with multi-model jury
- Server Correctness: Tier 1 = schema + error + golden-file; Tier 2 = FM recovery rate
- Agent Behavior: Tier 1 = recorded replay; Tier 2 = live FM evaluation
- Response Accuracy: Tier 1 = code-graded correctness; Tier 2 = faithfulness + completeness
- Chatbot Integration: Tier 1 = code-graded coreference + workflow; Tier 2 = FM-graded presentation + conflict + degradation

---

## The Five Testing Areas — Summary

| Area | MCP Spec Term | What it tests | Test type | Role | CI cost |
|---|---|---|---|---|---|
| **Tool Description Quality** | Discovery | Description clarity, rubric compliance, disambiguation | Structural (no LLM) | Leading indicator | Near zero |
| **Agent Behavior** | Tool Selection | Tool choice, argument quality, step efficiency | Behavioral (LLM in loop) | Leading indicator | LLM API costs |
| **Server Correctness** | Invocation | Schema conformance, error actionability, result fidelity | Deterministic | Leading indicator | Near zero |
| **Response Accuracy** | Full loop | Faithfulness, completeness, correctness of final answer | End-to-end (LLM + ground truth) | **Outcome** | LLM API costs × full loop |
| **Chatbot Integration** | Multi-turn | Coreference, context pressure, workflows, degradation | Behavioral (multi-turn) | **Integration layer** | LLM API costs × depth |

---

## Impact and Effort

| Area | Impact on response quality | Evidence | CI/CD |
|---|---|---|---|
| Tool Description Quality | **High — only phase with empirical measurement.** +5.85pp SR, +15.12% AE. | Hasan et al. RQ-2 | Every commit |
| Agent Behavior | **High — inseparable from description quality.** Selection accuracy measured as consequence of description quality. | Hasan et al. RQ-2, RQ-3 | On-demand |
| Server Correctness | **Assumed high — unmeasured but architecturally critical.** Tool results feed directly into FM context; malformed results degrade every subsequent decision. | MCP Spec, Fowler | Every commit |
| Response Accuracy | **This IS the outcome.** The only measure the user experiences. | Anthropic | On-demand |
| Chatbot Integration | **High — invisible to single-turn tests.** Context pressure causes 13.9%–85% degradation. Coreference tracking improves performance up to 18%. | Wang/MINT, Du et al., Chatterjee | On-demand |

**The impact of description quality is domain-and-model-dependent — no single component combination consistently improves performance across all domains and models.** This reinforces the need for end-to-end testing rather than relying on any single leading indicator.

---

## Minimum Test Coverage

| Area | Minimum |
|---|---|
| Tool Description Quality | All tools (Tier 1 structural checks iterate automatically) |
| Server Correctness | 3 cases per tool (happy path, invalid input, not-found) |
| Agent Behavior | 3–5 scenarios per tool + 2–3 multi-tool workflows |
| Response Accuracy | 1 closed-loop scenario per critical user journey |
| Chatbot Integration | 2–3 coreference + 1 workflow + 1 pressure scenario |
