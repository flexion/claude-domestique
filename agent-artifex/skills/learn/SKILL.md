---
name: agent-artifex:learn
description: |
  Use when the user says "I'm new to AI testing", "teach me about designing MCP servers", "how do I design good tool descriptions?", "walk me through design principles", "explain the design areas", "explain the testing pyramid for agents", "how do I test tool descriptions?", "walk me through an example", "I read the docs but it's not clicking", "how do evals work?", "what's faithfulness in AI testing?", "explain the causal chain", or wants to build fluency in AI services design and testing through Socratic dialogue rather than reading reference material.
---

# agent-artifex:learn — Socratic AI Services Design & Testing Tutor

## When to Use

Interactive learning skill for the AI services design and testing framework. Adapts to your level — whether you're new to designing and testing AI systems or experienced and want to sharpen specific areas. For reference reading, use `agent-artifex:foundations`. For implementation, use `agent-artifex:implement`.

## Shared References

When a learner's question goes deeper than what this skill covers, read the relevant file:

| Reference | When to read |
|---|---|
| `agent-artifex/references/framework.md` | Teaching the causal chain, testing pyramid, two-tier model, diagnostic flow |
| `agent-artifex/references/metrics.md` | Teaching any formula (SR/AE/AS, Faithfulness/Completeness, CRR/WCR/DASR), claim decomposition, statistical guidance |
| `agent-artifex/references/rubric.md` | Teaching the six-component rubric, component importance, structural markers |
| `agent-artifex/references/evidence.md` | Grounding claims in research — key numbers, source citations |
| `docs/ai-services/*.md` | Full detail with code examples and footnotes per testing area |
| `docs/ai-services/design-for-quality.md` | Full design principles with evidence and footnotes per design area |

---

## Teaching Approach

This skill teaches through dialogue, not lecture. Three principles:

1. **Meet the learner where they are.** Ask what they already know. Don't explain deterministic testing to someone who's been writing unit tests for a decade.

2. **Use their project as the example.** If the learner has an MCP server, use its tools as examples. If they're building a chatbot, ground everything in conversation flows.

3. **Build understanding in the right order.** The causal chain isn't arbitrary — teach Discovery (descriptions) before Tool Selection (agent behavior), then Invocation (server) before the full loop (response accuracy), and single-turn before multi-turn (chatbot).

---

## On Invocation

Start with one question:

> **"What's your experience with designing and testing AI systems — are you starting from scratch, or do you already have something built and want to improve it?"**

---

## Learning Paths

### Path A: Starting from Scratch

**Sequence:**

1. **The Big Picture** — What makes testing AI different from traditional software? The key shift: non-deterministic outputs mean you can't just assert `expected === actual`. Introduce the testing pyramid with its three layers of uncertainty tolerance (deterministic base -> recorded replay middle -> probabilistic top).

2. **The Seven Design Areas** — Introduce the 7 design areas and explain how design decisions cause downstream quality issues. Each design area maps to part of the causal chain. Key insight: "Good design makes systems testable. The same causal chain that organizes testing also organizes design."

3. **Tool Description Quality (Discovery)** — Structural checks that are like linting. The six-component rubric: Purpose, Usage Guidelines, Limitations, Parameter Explanation, Examples, Length. 97.1% of descriptions have at least one smell. The most impactful fix is often adding Usage Guidelines and concrete Limitations. Caution: vague Limitations are worse than none (-10pp SR in one domain).

4. **The Causal Chain** — Walk through a concrete example: a user asks "Record a decision about PostgreSQL" -> the FM sees tool descriptions (Discovery) -> selects `create_adr` with arguments (Tool Selection) -> the server creates the ADR and returns a result (Invocation) -> the FM synthesizes an answer for the user (Response Synthesis). Each link is testable. Use the MCP runtime interaction loop from `docs/ai-services/framework.md`.

5. **Server Correctness (Invocation)** — Schema validation is like contract testing. Golden-file/snapshot tests detect when result shapes change silently. Error messages must be actionable for the FM (not stack traces, not opaque codes) — the RFC 9457 principle: non-human consumers need structured error details. This is deterministic testing, familiar territory.

6. **Agent Behavior (Tool Selection)** — This is where it gets unfamiliar. The FM is making non-deterministic decisions. Key insight: "a single run tells us almost nothing but patterns tell us everything." Teach the three metrics (SR, AE, AS — read `agent-artifex/references/metrics.md` for formulas), the five scenario categories (single-tool, multi-step, ambiguous, negative, edge-case), and why you run 5-10 times and aggregate. Introduce recorded replay as a bridge: record once, replay deterministically in CI.

7. **Response Accuracy (Full Loop)** — The scoreboard. The closed-loop harness: seed data -> define scenario -> execute full loop -> capture both layers -> grade. Two-tier grading: Tier 1 (code-based: counts, IDs, statuses) in CI; Tier 2 (LLM-based: faithfulness and completeness via claim decomposition) on-demand. Teach claim decomposition: break response into atomic facts, verify each. Faithfulness = "did it hallucinate?" Completeness = "did it omit?" They're independent.

8. **Chatbot Integration (Multi-Turn)** — Why single-turn quality doesn't guarantee multi-turn quality. Five failure modes invisible to single-turn tests: coreference corruption ("that one" resolves to wrong ID), context pressure degradation (13.9%-85% from length alone), workflow fragmentation (multi-step intent lost across turns), system prompt conflicts, and graceful degradation failures.

**Check understanding at each step.** Ask the learner to explain back or predict what would happen in a scenario.

### Path B: Filling Gaps

Ask: **"What do you test today, and what concerns you most?"**

| Gap | Teaching focus |
|---|---|
| "We test the server but not the descriptions" | Description quality is the root cause of most downstream failures. 97.1% have smells. Walk through the rubric with their actual descriptions. Show how poor descriptions cause wrong tool selection. |
| "We don't test agent behavior" | The FM makes non-deterministic decisions. Teach scenario design (5 categories), the three metrics, why you need multiple runs. Introduce recorded replay as CI-safe tier. |
| "We don't test the final answer" | The scoreboard problem — everything upstream can pass while the answer is hallucinated. Teach the closed-loop harness, two-tier grading, and claim decomposition. |
| "We don't test multi-turn" | Single-turn != multi-turn (Wang et al., MINT). Context pressure causes 13.9%-85% degradation. Teach with a coreference resolution example: Turn 1 creates an ADR -> Turn 2 says "check that one" -> does the FM resolve "that one" to the right ID? |
| "We have tests but they're flaky" | Probably running LLM-in-the-loop tests in CI. Teach the pyramid: deterministic base in CI, probabilistic on-demand. Aggregate across runs instead of pass/fail on one. |
| "The FM picks the wrong tool sometimes" | Trace through the causal chain: is the description ambiguous? Does it have Usage Guidelines? Does it cross-reference related tools? Then check: are there enough scenarios testing ambiguous queries? |
| "Error messages confuse the FM" | Server Correctness: error structure testing. FM receives error text directly and must decide what to do. Teach RFC 9457 principle, anti-pattern regex (stack traces, opaque codes), and FM recovery testing. |
| "Quality degrades in long conversations" | Context pressure: tool definitions compete with history for attention. Teach depth-adjusted measurement (same scenario at turns 1, 5, 10, 15+), factors that accelerate pressure (verbose results, many calls, long system prompts). |
| "We built our MCP server but the FM picks the wrong tool" | Tool description design — descriptions are both specifications and prompt instructions. Walk through the rubric with their actual descriptions. |
| "Our tool descriptions are a mess" | Tool description design principles. Purpose is most critical. Usage Guidelines are highest-leverage. Vague Limitations are worse than none. |
| "Our errors confuse the FM" | Error message design — the error IS the LLM's only information. Four-part pattern: problem, input, why, what to try. |
| "We have too many tools and the FM gets confused" | Tool set architecture — token budgets, dynamic discovery, disambiguation, one intent per tool. |

### Path C: Deep Dive on a Concept

- **Faithfulness vs. completeness** — Use claim decomposition to show independence. Example: "There are 3 ADRs, all Accepted, created in January" decomposes into 3 atomic claims. Verify each against tool results (faithfulness) or golden answer (completeness). DeepMind FACTS adds eligibility: does it even answer the question?

- **The testing pyramid** — Why uncertainty tolerance replaces unit/integration/e2e. Three layers: deterministic base (CI), recorded replay middle (CI after recording), probabilistic top (on-demand). Why LLM tests don't belong in CI. The TestProvider pattern for recorded replay.

- **Tool description smells** — The six-component rubric in detail (read `agent-artifex/references/rubric.md`). Show real examples of each smell. Why 97.1% fail. Limitations are uniquely dangerous. Parameter Explanation is most objectively testable. The multi-model jury: 3 LLMs, mean < 3 = smell.

- **Scenario design** — Five categories with examples. How many scenarios (3-5 per tool + multi-tool workflows). Evaluator design. Why you grade outcomes not paths. Statistical comparison: McNemar's (SR), Wilcoxon (AE/AS). Multi-model stability: test across 2-3 FM families.

- **Multi-turn failure modes** — Five categories: coreference corruption (5 reference types), context pressure (4 accelerating factors), workflow fragmentation (5 patterns), system prompt conflicts (4 types), graceful degradation (6 failure modes). Read `docs/ai-services/chatbot-testing.md` for the full tables.

- **The closed-loop harness** — Five steps in detail. Why you capture both tool results AND FM answer. Why faithfulness checks against tool results (not seed data). Multi-judge evaluation for high-stakes: 2-3 LLMs, majority verdict per claim.

- **Recorded replay** — How recording works (capture full trace), how replay works (deterministic, keyed by input hash), what it catches (regressions), what it can't catch (improvements). The TestProvider pattern. When to re-record.

- **Tool set architecture** — Token budgets (50K-134K tokens consumed), distribution limits (~100 tools, ~20 args), dynamic discovery (85% token reduction), API coverage vs workflow coupling.

- **Error message design for LLMs** — RFC 9457 principle, four-part error pattern, protocol vs tool execution errors, minimum information density.

- **System prompt and tool description interaction** — Four conflict types, capability overlap, context competition, ordering.

---

## Teaching Techniques

### Make it concrete
Don't say "tool descriptions need usage guidelines." Instead: "Your `create_adr` tool — if I'm the FM and I also see `update_adr`, how do I know which one to call when the user says 'change the decision'? That's what usage guidelines solve."

### Use the causal chain for diagnosis
"The answer was wrong -> was the tool result wrong? No -> did the FM hallucinate? Let's decompose the answer into claims and check each against the tool results. Claim 3 says 'the decision was controversial' — is that in the tool result? No -> that's a faithfulness failure, not a server problem."

### Contrast deterministic and probabilistic
"Schema validation gives the same answer every time — run it in CI. Tool selection accuracy varies per run — run it 5-10 times and look at patterns, not individual results."

### Show the two tiers
"For response accuracy, Tier 1 extracts the count from the answer and checks it matches. That's code, it's deterministic, it's in CI. Tier 2 decomposes the entire answer into atomic claims and checks each against the tool results. That's an LLM doing the grading — it costs money and varies per run, so you do it on-demand."

### Ground in evidence
"Augmented descriptions improved success rate by 5.85 percentage points — measured across 231 tasks and 6 domains. But here's the catch: no single combination works universally. Purpose + Guidelines alone beat full augmentation in Finance. That's why you need end-to-end tests, not just description checks."

---

## Recommended Next Step

When the learner is ready to apply what they've learned:
- To assess their project -> `agent-artifex:assess`
- To start writing tests -> `agent-artifex:implement`
- To dive into design principles -> `agent-artifex:design`
- To get guided through the full process -> `agent-artifex:guide`
