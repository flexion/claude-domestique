---
name: agent-artifex:assess
description: |
  Use when the user asks "what testing do we need?", "what are our testing gaps?", "we have some tests but are they enough?", "is our MCP server well-tested?", "what should we test next?", "audit our test coverage for AI", "we keep getting bad responses and don't know why", "our agent picks the wrong tool sometimes", "how is my tool design?", "are my descriptions good enough?", "review my error messages", "is my system prompt well-designed?", "audit my MCP server design", "what design gaps do I have?", or needs to diagnose AI design or testing gaps in an existing project. Also use when someone says "assess my testing", "review our test strategy for AI", or "assess my design".
---

# agent-artifex:assess — AI Services Design & Testing Gap Assessment

## When to Use

Diagnostic skill that identifies design quality issues and testing gaps in an existing project. Produces a prioritized gap analysis with specific recommendations covering both how well the AI integration is designed and how well it is tested. For learning the concepts first, use `agent-artifex:foundations` or `agent-artifex:learn`. For applying design principles, use `agent-artifex:design`. For writing tests or implementing design fixes after assessment, use `agent-artifex:implement`.

## Shared References

Read these when you need precise definitions during assessment:

| Reference | When to read |
|---|---|
| `agent-artifex/references/framework.md` | Causal chain diagnostic flow, testing pyramid layers, two-tier model, impact/effort table |
| `agent-artifex/references/metrics.md` | Formulas for any metric (SR/AE/AS, Faithfulness/Completeness, CRR/WCR/DASR) |
| `agent-artifex/references/rubric.md` | Six-component rubric, labeling rules, structural detection markers |
| `agent-artifex/references/evidence.md` | Key numbers to cite when justifying recommendations |

---

## Assessment Process

Three passes: inventory, gap analysis, and prioritized recommendations.

---

## Pass 1: Inventory

### Questions to ask

1. **What are you building?**
   - MCP server (how many tools?)
   - Agent/chatbot that uses MCP servers
   - Both (server + client)
   - Something else that uses LLM tool calling

2. **What tests exist today?**
   - Unit tests for server logic?
   - Integration tests against the MCP protocol?
   - Structural checks on tool descriptions?
   - Tests that involve an LLM?
   - End-to-end tests with seeded data and ground truth?
   - Multi-turn conversation tests?
   - Recorded replay infrastructure?

3. **What problems are you experiencing?**
   - FM picks the wrong tool
   - FM uses wrong arguments
   - Server returns errors the FM can't recover from
   - Final answers are inaccurate or hallucinated
   - Quality degrades in long conversations
   - Tests are flaky or expensive
   - "We don't know what we don't know"

4. **Have you followed design guidelines for your tool descriptions, error messages, and schemas?**
   - Are tool descriptions substantive (4+ sentences with usage guidelines and limitations)?
   - Do parameters have `.describe()` annotations beyond property names?
   - Do error messages suggest recovery actions?
   - Are output schemas declared?
   - Is the system prompt sized appropriately relative to tool count?

### What to look for in the codebase

If you have access to the codebase, also check:

- **Tool descriptions:** Read the tool registration code or `tools/list` output. Note description length (< 3 sentences = likely smells), whether parameters have descriptions, whether tools cross-reference each other, whether limitations are concrete or vague.
- **Output schemas:** Do tools declare `outputSchema`? Without it, clients and LLMs can't validate returned data.
- **Error handling:** Do error responses contain stack traces (`/Error\s+at\s/`)? Are error messages > 20 characters? Do they suggest recovery actions?
- **Test files:** Look for test directories and frameworks. Note what's being asserted — exact values? Schema shapes? LLM output? Are tests isolated (clean state per run)?
- **CI configuration:** What runs on every commit vs. on-demand? Are LLM-calling tests in CI (anti-pattern)?
- **System prompt size:** How large is the system prompt relative to tool definition footprint? With many tools, definitions alone can consume 50K+ tokens.
- **Tool count and discovery:** How many tools are registered? Is dynamic discovery used, or are all tools loaded at once?
- **Response format consistency:** Do tools use consistent field names and structures across responses? Are the same concepts named differently in different tools?
- **Result verbosity:** Are tool results sized for context budget, or do they return full data dumps that will fill the context window in multi-turn conversations?

---

## Pass 2: Gap Analysis

### Design Quality Assessment

Assess the quality of the AI integration design across seven areas. For each, assign a status:

| Status | Meaning |
|---|---|
| **Not designed** | No intentional design effort in this area |
| **Partially designed** | Some attention paid but significant gaps remain |
| **Well-designed** | Follows established design principles; low risk of FM-facing issues |

#### Tool Description Design

| Signal | Indicates |
|---|---|
| Descriptions < 4 sentences | Missing substantive content — likely no Usage Guidelines or Limitations |
| No cross-references between similar tools | Missing inter-tool disambiguation |
| Limitations are vague ("may not work in all cases") | Worse than no limitations — degrades SR by up to 10pp |

#### Parameter & Schema Design

| Signal | Indicates |
|---|---|
| No `.describe()` annotations beyond property name | Opaque Parameters (84.3% prevalence) |
| No output schemas declared | MCP spec violation; clients can't validate results |
| Tools with > 20 parameters | Out of model distribution — expect degradation |

#### Error Message Design

| Signal | Indicates |
|---|---|
| Stack traces in error output | Internal details leak to FM — anti-pattern |
| Error messages < 20 characters | Too terse for FM to act on |
| No recovery action in errors | FM can't determine what to try next |

#### System Prompt Design

| Signal | Indicates |
|---|---|
| Domain knowledge duplicated in prompt and tool descriptions | Capability overlap — FM may answer from prompt instead of calling tool |
| System prompt > 2000 tokens with > 10 tools | Context pressure risk — tool definitions may already consume 50K+ tokens |

#### Multi-Turn Conversation Design

| Signal | Indicates |
|---|---|
| No testing at conversation depths > 5 turns | Context pressure effects unknown |
| Tool results include full data dumps | Verbose results accelerate context pressure |
| Entity references use display names, not IDs | Coreference resolution will fail |

#### Tool Set Architecture

| Signal | Indicates |
|---|---|
| > 20 tools without dynamic discovery | Context overload — 85% token reduction possible with dynamic loading |
| Overlapping tools don't reference each other | FM will confuse similar tools |
| Multi-intent tools with mode parameters | Should be separate tools |

#### Response Format Design

| Signal | Indicates |
|---|---|
| Different field names for same concept across tools | Inconsistent schemas degrade FM parsing |
| No pagination for large result sets | Context will fill up in multi-turn conversations |
| Results contain narrative instead of discrete facts | Can't run claim decomposition for verification |

### Testing Gap Analysis

Map current testing against the five areas. For each, assign a status:

| Status | Meaning |
|---|---|
| **Not tested** | No tests exist for this area |
| **Partially tested** | Some tests exist but significant gaps remain |
| **Adequately tested** | Core scenarios covered; diminishing returns from more investment |
| **Over-invested** | More testing effort than impact justifies (e.g., LLM tests in CI) |

#### Tool Description Quality (Discovery)

| Signal | Indicates |
|---|---|
| Descriptions < 3 sentences | Rubric score < 3 on Length; likely missing Usage Guidelines, Limitations, Parameters |
| No parameter `.describe()` annotations | Opaque Parameters smell (84.3% prevalence). FM defaults to overly broad argument values. |
| Tools with overlapping names don't reference each other | Missing inter-tool disambiguation. FM will confuse similar tools. |
| No structural checks in CI | Description changes ship without quality verification. |
| Limitations are vague or self-referential | Worse than no Limitations — empirically degrades SR by up to 10pp. |
| No FM-scored rubric evaluation | Semantic quality is unmeasured; structural checks are necessary but insufficient. |

#### Agent Behavior (Tool Selection)

| Signal | Indicates |
|---|---|
| No test scenarios with expected tool calls | Tool selection quality is unmeasured. |
| Tests assert exact tool call sequences | Overly rigid — "agents regularly find valid approaches that eval designers didn't anticipate." Grade outcomes, not paths. |
| LLM tests run in CI | Too expensive, too slow, too flaky. Should be on-demand. |
| No multi-step workflow scenarios | Sequencing and context carry-forward are untested. |
| No recorded replay infrastructure | Missing the CI-safe middle pyramid layer. No regression detection for tool selection. |
| No multi-model testing | Tool descriptions may work for one FM but fail for another. Risk for production with diverse FM users. |
| Not tracking Average Steps (AS) | Step efficiency and cost impact are invisible. Steps increase 67.46% with augmentation. |

#### Server Correctness (Invocation)

| Signal | Indicates |
|---|---|
| Tools don't declare `outputSchema` | MCP spec MUST/SHOULD violation. Clients and LLMs can't validate returned data. |
| No error-path tests | FM will receive raw exceptions or opaque errors it can't act on. |
| No golden-file / snapshot tests | Result format changes go undetected until they break downstream. |
| Error messages contain stack traces | Internal implementation details leak to the FM. Anti-pattern: `/Error\s+at\s/` |
| No FM recovery testing | Error messages may be structurally present but useless to the FM. |
| Tests don't isolate state between runs | Shared state causes correlated failures. Each trial needs clean environment. |

#### Response Accuracy (Full Loop)

| Signal | Indicates |
|---|---|
| No seeded test data | Can't verify answers against ground truth. |
| No end-to-end tests at all | The scoreboard is unmeasured — "a system can score well on the first three and still produce a hallucinated answer." |
| Tests check tool calls but not the final answer | Agent behavior is tested but response synthesis is not. |
| No faithfulness checking | Hallucinated claims go undetected. |
| No claim decomposition | Faithfulness checking without atomic claim verification is insufficient. |
| Golden answers are vague or qualitative only | Can't run Tier 1 code-graded correctness checks without specific extractable values. |
| No eligibility check | Response may be grounded but fail to answer the user's actual question. |

#### Chatbot Integration (Multi-Turn)

| Signal | Indicates |
|---|---|
| No multi-turn test scenarios | Conversational failure modes invisible. "Better single-turn performance does not guarantee better multi-turn performance." |
| No coreference resolution tests | Indirect references ("that one") may silently corrupt tool arguments — hardest to detect. |
| No context pressure testing at multiple depths | Quality at turn 15 is unknown. Context length alone causes 13.9%–85% degradation. |
| No graceful degradation testing | Server failures, timeouts, rate limits unhandled. No failure injection for MCP transport layer. |
| No system prompt conflict testing | Tool descriptions may collide with system prompts or other MCP servers' tools. |
| No workflow interruption testing | Prior context may be lost when user interrupts and resumes a multi-step workflow. |

---

## Pass 3: Prioritized Recommendations

Ordered by **impact / effort**, interleaving design and testing recommendations:

### Default priority order

1. **Tool description design improvements** — Highest impact, lowest cost. Well-designed descriptions are the single most effective lever for FM tool selection. Fix descriptions before testing anything else.

2. **Error message design** — Fix error messages so the FM can recover from failures. Actionable errors with recovery suggestions directly reduce retry loops and cascading failures.

3. **Tool Description Quality structural checks (Tier 1)** — Near-zero cost, CI-safe, catches the root cause of most downstream failures. 97.1% of descriptions have smells. Validates that description design improvements are maintained.

4. **Server Correctness deterministic tests (Tier 1)** — Schema validation, error structure, golden-file assertions, error-path coverage. Near-zero cost, CI-safe. Standard software engineering that's often missing in AI projects.

5. **Parameter & schema design review** — Ensure parameters have annotations, output schemas are declared, and tool parameter counts stay within model distribution. Design review, not code changes.

6. **Response Accuracy Tier 1 (code-graded correctness)** — Seed known data, run the loop, check counts/IDs/statuses with exact match. Moderate setup cost but catches the most damaging errors.

7. **Remaining design areas** — System prompt design (check for capability overlap and context pressure), multi-turn conversation design (result verbosity, entity references), tool set architecture (dynamic discovery, tool overlap), response format design (schema consistency, pagination).

8. **Agent Behavior recorded replay** — If live evaluation has been run at least once, set up recorded replay for CI. Deterministic regression detection for tool selection without ongoing LLM costs.

9. **Agent Behavior live scenarios** — Design 3–5 scenarios per tool. On-demand, not CI. Run 5–10 times, aggregate. Validates that description improvements actually helped.

10. **Response Accuracy Tier 2 (LLM-graded faithfulness/completeness)** — Claim decomposition and NLI. On-demand. Reserve for pre-release validation.

11. **Chatbot Integration** — Multi-turn scenarios. Most expensive. Reserve for production deployment readiness. Start with coreference resolution (highest impact chatbot-specific test).

### Adjustment triggers

| Symptom | Prioritize |
|---|---|
| "The FM keeps picking the wrong tool" | Tool Description Design + Quality checks (check rubric) + Agent Behavior scenarios |
| "Answers are wrong even though the right tool was called" | Response Accuracy (both tiers — correctness then faithfulness) |
| "Quality is fine in single queries but degrades in conversation" | Multi-Turn Conversation Design + Chatbot Integration (coreference + context pressure first) |
| "Our server crashes on unexpected input" | Server Correctness (error-path coverage + error structure) |
| "Tests are flaky and expensive" | Move LLM tests out of CI; add deterministic base layer; consider recorded replay |
| "The FM can't recover from errors" | Error Message Design + Server Correctness (error actionability) + FM recovery testing |
| "Works with Claude but not GPT" (or vice versa) | Agent Behavior multi-model stability testing |
| "System prompt conflicts with tool behavior" | System Prompt Design + Chatbot Integration (system prompt conflict testing) |
| "Too many tools, FM gets confused" | Tool Set Architecture (dynamic discovery, tool deduplication) |

---

## Output Format

Present the assessment as:

1. **Summary** — One paragraph: what's working, what's the biggest gap, what to do first.
2. **Design Quality** — Table with all seven design areas and their status (Not designed / Partially designed / Well-designed).
3. **Assessment Matrix** — Table with all five testing areas and their status (Not tested / Partially / Adequately / Over-invested).
4. **Top 3 Recommendations** — Specific, actionable items ordered by impact / effort. Each names: what to fix or test, how to do it, which design or testing area it addresses.
5. **Detailed Gaps** — Full gap analysis for areas that need attention, with signals observed.

---

## Recommended Next Step

After assessment:

- For design gaps → `agent-artifex:design` to learn the principles, then `agent-artifex:implement` to apply them
- For testing gaps → `agent-artifex:implement`
- For areas where the user doesn't understand *why* it matters → `agent-artifex:learn`
