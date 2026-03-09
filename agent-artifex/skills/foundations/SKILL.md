---
name: foundations
description: |
  Use when the user asks "what is the AI testing framework?", "what are the design principles?", "explain the 7 design areas", "explain MCP testing", "what are the testing areas?", "what's the testing pyramid for AI?", "how do the testing layers relate?", "what should I test in my MCP server?", "overview of AI agent design and testing", or needs a comprehensive reference overview of the AI design and testing guidelines. Also use when someone is new to designing or testing AI systems and wants the big picture before diving into implementation.
---

# agent-artifex:foundations — AI Services Design & Testing Framework Reference

## When to Use

Reference overview of the AI design and testing framework. Read this when you need the big picture — what the framework covers, how the pieces fit together, and what the key principles are. For interactive learning, use `agent-artifex:learn`. For implementation guidance, use `agent-artifex:implement`.

## Shared References

For detailed content referenced throughout this skill, read:

| Reference | What it contains |
|---|---|
| `agent-artifex/references/framework.md` | Causal chain, testing pyramid (3 layers + recorded replay), two-tier grading model, diagnostic flow, impact/effort table |
| `agent-artifex/references/metrics.md` | All formulas: SR/AE/AS, Faithfulness/Completeness, CRR/WCR/DASR, claim decomposition, multi-judge methodology, grading method selection |
| `agent-artifex/references/rubric.md` | Six-component rubric (5-point scale), labeling rules, component notes, structural detection markers |
| `agent-artifex/references/evidence.md` | Key empirical numbers, source index, benchmark scale |

---

## The Framework in One Sentence

Design the full causal chain for quality — from tool descriptions through agent behavior and server correctness to the response the user actually receives — then test each link with the right level of investment.

---

## The Causal Chain

```
Tool Description Quality → Agent Behavior → Server Correctness → Response Accuracy
     (Discovery)            (Tool Selection)    (Invocation)         (full loop)
      leading                 leading              leading              OUTCOME
```

Description quality shapes tool selection. Tool selection determines which server logic runs. Server results feed the FM's synthesis. But a system can score well on the first three and still produce a hallucinated answer. **Response Accuracy is the only measure the user experiences.** The other three are leading indicators.

**Chatbot Integration** extends Agent Behavior and Response Accuracy into multi-turn contexts — testing coreference resolution, context pressure, workflow orchestration, and graceful degradation.

When response accuracy is low, trace backward: Did the FM pick the right tool? Were arguments correct? Did the server return correct results? Did the FM synthesize faithfully?

---

## The Seven Design Areas

### Tool Description Design

Tool descriptions are simultaneously specifications and prompt instructions — they tell both developers and LLMs what a tool does. Purpose is the most critical component; a vague or missing purpose statement means the LLM cannot reliably select the tool. Usage Guidelines provide the highest-leverage behavioral cues, shaping when and how the agent invokes the tool. Limitations must be concrete and actionable or absent entirely — vague limitations actively degrade performance (−10pp SR in one domain).

### Parameter & Schema Design

Every parameter needs four things declared: type, meaning, behavioral effect, and required/default status. Without these, the LLM guesses at argument values, often incorrectly. Declare output schemas so downstream consumers and the LLM itself know what to expect from results. Keep tools under approximately 20 arguments — beyond that threshold, argument quality degrades sharply as the LLM struggles to populate large parameter sets correctly.

### Error Message Design

Error text is the LLM's only information for recovery — it cannot read stack traces, inspect logs, or ask a human. Structure every error with four elements: problem type (what category of failure), causal input (which argument or condition triggered it), detail (what specifically went wrong), and recovery suggestion (what the caller should do differently). Never expose stack traces or internal implementation details.

### System Prompt Design

Avoid restating capabilities already expressed in tool descriptions — duplication creates conflict opportunities and wastes context. Design for four conflict types: direct contradiction, partial overlap, ambiguous precedence, and implicit assumption mismatch. System prompts consume context window space that tool definitions also need, so keep them focused on behavioral guidance that cannot live in tool metadata.

### Multi-Turn Conversation Design

Context length alone causes 13.9–85% performance decline across benchmarks. Design for context pressure (degradation as conversation grows), coreference resolution (tracking references like "that one" or "the previous result" across turns), and depth degradation (accuracy loss at turn 15 vs turn 1) from the start — not as afterthoughts. Single-turn testing misses these failure modes entirely.

### Tool Set Architecture

Tool definitions consume 50K–134K tokens of context window. Stay under approximately 100 tools and approximately 20 arguments per tool. For larger tool sets, use dynamic discovery patterns that surface relevant tools based on the current task rather than loading everything at once. Disambiguate overlapping tools explicitly — when two tools could plausibly handle the same request, the LLM's selection becomes unreliable.

### Response Format Design

Result schemas must be consistent across tools — inconsistent structures force the LLM to learn per-tool parsing patterns, increasing synthesis errors. Design results for dual consumption: machine parsing (structured fields, predictable types) and LLM synthesis (human-readable values, meaningful field names). Control verbosity to manage context pressure — oversized results crowd out conversation history in the context window.

For detailed design principles and assessment criteria → `agent-artifex:design`

---

## The Five Testing Areas

| Area | MCP Spec Term | What it tests | Test type | Role |
|---|---|---|---|---|
| **Tool Description Quality** | Discovery | Description clarity, rubric compliance, disambiguation | Structural (no LLM) | Leading indicator |
| **Agent Behavior** | Tool Selection | Tool choice, argument quality, step efficiency | Behavioral (LLM in loop) | Leading indicator |
| **Server Correctness** | Invocation | Schema conformance, error actionability, result fidelity | Deterministic | Leading indicator |
| **Response Accuracy** | Full loop | Faithfulness, completeness, correctness | End-to-end (LLM + ground truth) | **Outcome** |
| **Chatbot Integration** | Multi-turn | Coreference, context pressure, workflows, degradation | Behavioral (multi-turn) | **Integration layer** |

---

## The Testing Pyramid

Three layers of uncertainty tolerance. Read `agent-artifex/references/framework.md` for full detail including the recorded replay pattern (TestProvider, recording vs replay mode).

### Base Layer: Deterministic (CI-safe, every commit)

- **Tool Description Quality** — Structural checks: sentence counting, rubric component markers (regex), parameter descriptions, inter-tool disambiguation, limitation quality guards. No LLM calls. Near-zero cost.
- **Server Correctness** — Schema validation (`outputSchema` → `structuredContent`), error structure assertions (no stack traces, actionable messages per RFC 9457), golden-file/snapshot tests, error-path coverage. No LLM calls.

### Middle Layer: Recorded Replay (CI-safe after recording)

Record live FM interactions once, replay deterministically. Uses a TestProvider pattern keyed by input message hash. Catches regressions cheaply — "regression means success rates dropped, not the output changed." Detects regressions only, not improvements.

### Upper Layer: Probabilistic (on-demand)

- **Agent Behavior** — LLM in the loop for tool selection. Run 5–10 times, aggregate. "A single run tells us almost nothing but patterns tell us everything."
- **Response Accuracy** — Full end-to-end with ground truth verification. Two-tier grading.
- **Chatbot Integration** — Multi-turn conversations at varying depths. Most expensive.

**"Don't run live LLM tests in CI. Too expensive, too slow, too flaky."** — Block Engineering

---

## Impact and Effort

| Area | Impact | Key evidence | CI/CD |
|---|---|---|---|
| Tool Description Quality | **High — only phase with empirical measurement.** | +5.85pp SR (p=0.02), +15.12% AE. 97.1% of descriptions have smells. | Every commit |
| Server Correctness | **Architecturally critical.** Malformed results degrade every subsequent FM decision. | MCP spec MUST/SHOULD; RFC 9457 principle | Every commit |
| Agent Behavior | **High — inseparable from description quality.** | 68–78% of tasks need more steps with augmentation; only 19–20% succeed | On-demand |
| Response Accuracy | **This IS the outcome.** | The only measure the user experiences | On-demand |
| Chatbot Integration | **High — invisible to single-turn tests.** | 13.9%–85% context degradation; +18% from coreference tracking | On-demand |

Impact is domain-and-model-dependent — no single component combination consistently improves performance across all domains and models. This reinforces the need for end-to-end testing.

---

## Key Concepts

### Six-Component Rubric (Tool Description Quality)

Every tool description scored on: **Purpose, Usage Guidelines, Limitations, Parameter Explanation, Examples vs Description, Length and Completeness**. Score ≥ 3 on all six = no smells. 97.1% have at least one smell. Limitations is uniquely dangerous — vague Limitations are worse than none (−10pp SR in one domain). Parameter Explanation is most objectively assessable (ICC 0.90). Read `agent-artifex/references/rubric.md` for the full 5-point rubric table and labeling rules.

### Two-Tier Grading Model

Applies across all areas, not just Response Accuracy:
- **Tier 1 (code-based):** Deterministic, CI-safe. Regex, exact match, schema validation.
- **Tier 2 (LLM-graded):** Non-deterministic, on-demand. Rubric scoring, claim decomposition, NLI.

### Three Agent Behavior Metrics

Read `agent-artifex/references/metrics.md` for formulas and statistical guidance.
- **SR** = (tasks where all evaluators pass) / (total tasks) × 100
- **AE** = (1/N) × Σ (evaluators_passed_i / total_evaluators_i)
- **AS** = (1/N) × Σ steps_i

Compare with McNemar's test (SR) or Wilcoxon signed-rank (AE, AS). Run 5–10 times, report median and IQR.

### Faithfulness and Completeness (Response Accuracy)

Two independent dimensions, measured via **claim decomposition** — breaking responses into atomic facts and verifying each against evidence.
- **Faithfulness** = supported claims / total claims (evidence: tool results). Checks hallucination.
- **Completeness** = golden claims covered / total golden claims (evidence: golden answer). Checks omission.

A response can be perfectly faithful but incomplete, or vice versa. DeepMind FACTS adds a two-phase evaluation: eligibility (does it answer the query?) then grounding (is it factually grounded?).

### The Closed-Loop Harness (Response Accuracy)

Seed data → Define scenario (query + seed state + golden answer + grading mode) → Execute full MCP loop → Capture both layers (tool results + FM answer) → Grade. Every response accuracy test follows this five-step pattern.

### Chatbot-Specific Metrics

Read `agent-artifex/references/metrics.md` for formulas.
- **CRR** — Coreference Resolution Rate: are indirect references ("that one") resolved correctly?
- **DASR** — Depth-Adjusted Success Rate: does accuracy hold at turn 15 vs turn 1?
- **WCR** — Workflow Completion Rate: do multi-turn workflows complete?
- **Reliability Score** — Mean of function name recall and function argument recall (Microsoft ISE)

---

## Evidence Base

Read `agent-artifex/references/evidence.md` for the full source index and key numbers.

The framework draws from: Hasan et al. (description quality), MCP Specification, Anthropic (evals, tool use), OpenAI (evaluation best practices), RAGAS (faithfulness/completeness), Google DeepMind (FACTS Grounding), Block Engineering (testing pyramid), Wang et al./MINT (multi-turn), Du et al. (context degradation), Chatterjee & Agarwal (coreference), RFC 9457 (error structure), Fowler (contract testing), Microsoft ISE (chatbot evaluation).

Full source documents: `docs/ai-services/sources/`

---

## Recommended Next Step

- To learn about design principles → `agent-artifex:design`
- To learn interactively → `agent-artifex:learn`
- To assess your project's testing gaps → `agent-artifex:assess`
- To start writing tests → `agent-artifex:implement`
