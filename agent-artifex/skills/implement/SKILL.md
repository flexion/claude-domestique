---
name: agent-artifex:implement
description: |
  Use when the user wants to improve an existing MCP server, agent, chatbot, or tool-calling system. This includes: improving tool descriptions, fixing error messages, adding output schemas, writing tests, implementing quality checks, adding evals, setting up test harnesses, or any task where they say "help me improve", "fix my descriptions", "add tests", "write evals", "implement quality checks", "make my server better", "apply the design principles", or are ready to make code changes to improve quality. This skill covers both design application (making the code better) and test implementation (verifying the code is good). For scaffolding new projects, use claude-api:mcp-builder. For design principles without code changes, use agent-artifex:design.
---

# agent-artifex:implement — AI Services Implementation Guide

## When to Use

This is the hands-on improvement skill. It covers both applying design principles to make code better AND writing tests to verify code quality. Use it whenever the user is ready to make changes — whether that means rewriting tool descriptions, restructuring error messages, adding output schemas, writing test harnesses, or building eval pipelines.

Cross-references:
- Scaffolding new projects → `claude-api:mcp-builder`
- Design principles without code changes → `agent-artifex:design`
- Gap diagnosis → `agent-artifex:assess`

---

## On Invocation

Start by understanding what the user needs:

1. **Determine the work type:**
   - **Design application**: Improving tool descriptions, fixing error messages, adding schemas, restructuring tool sets → read the corresponding design reference (`agent-artifex/skills/design/references/`)
   - **Test implementation**: Writing quality checks, evals, test harnesses → read the corresponding testing reference (`references/`)
   - **Both**: Improve the code AND add tests (the ideal flow)
2. **What are you building?** MCP server? Agent? Chatbot? All three?
3. **Which area?** If not specified, determine from context:
   - Building/modifying tool definitions → Tool Description Design / Quality
   - Validating tool call results → Server Correctness
   - Testing whether the FM picks the right tool → Agent Behavior
   - Verifying the final answer to the user → Response Accuracy
   - Testing multi-turn conversations → Chatbot Integration
   - Fixing error messages → Error Message Design
   - Restructuring parameters → Parameter & Schema Design
   - Optimizing system prompts → System Prompt Design
   - Improving multi-turn handling → Multi-Turn Conversation Design
   - Reorganizing tool sets → Tool Set Architecture
   - Standardizing output formats → Response Format Design
4. **What's the tech stack?** TypeScript/Python/Go? Which test framework? MCP SDK version?

Then **read the relevant reference files** before writing any code.

---

## Reference Files

### Design references (for applying improvements)

Read these when making code changes to improve quality. Each file contains principles, patterns, anti-patterns, and concrete guidance for one design area.

| Design Area | Reference File | What it contains |
|---|---|---|
| Tool Description Design | `agent-artifex/skills/design/references/tool-descriptions.md` | Six-component rubric, structural markers, augmentation patterns, domain-specific guidance |
| Parameter & Schema Design | `agent-artifex/skills/design/references/parameter-schema.md` | `.describe()` patterns, output schema design, argument count guidance, naming conventions |
| Error Message Design | `agent-artifex/skills/design/references/error-messages.md` | Problem/input/why/recovery structure, anti-patterns, `isError` usage, cross-references in recovery |
| System Prompt Design | `agent-artifex/skills/design/references/system-prompts.md` | Knowledge placement, ordering instructions, prompt sizing, collision avoidance |
| Multi-Turn Conversation Design | `agent-artifex/skills/design/references/multi-turn.md` | Result trimming, stable ID patterns, pagination, context pressure mitigation |
| Tool Set Architecture | `agent-artifex/skills/design/references/tool-set-architecture.md` | Dynamic discovery, cross-references, tool splitting, token footprint management |
| Response Format Design | `agent-artifex/skills/design/references/response-format.md` | Field naming, pagination patterns, fact vs. narrative, schema consistency |

### Testing references (for writing tests)

Read these when writing test code, assertions, harness setup, or eval pipelines. Each file contains working code examples, prompt templates, regex patterns, and pass/fail criteria.

| Testing Area | Reference File | What it contains |
|---|---|---|
| Tool Description Quality | `references/tool-descriptions.md` | Tier 1 code examples (all 5 checks with regex), Tier 2 FM scoring prompt template, multi-model jury setup, pass/fail criteria |
| Server Correctness | `references/server-correctness.md` | Schema validation (Ajv/jsonschema), error anti-pattern regex, golden-file patterns, FM recovery 4-step procedure |
| Agent Behavior | `references/agent-behavior.md` | Scenario design with examples, recorded replay (TestProvider pattern), live evaluation 4-step procedure, grading guidance |
| Response Accuracy | `references/response-accuracy.md` | Closed-loop harness 5 steps, claim decomposition with LLM prompt templates, DeepMind FACTS two-phase evaluation |
| Chatbot Integration | `references/chatbot-testing.md` | 5 coreference categories, 5 workflow patterns, 6 scenario categories, 4 conflict types, 6 degradation failure modes |

The canonical source documents with full evidence and footnotes are in `docs/ai-services/`.

---

## Design Application by Area

### Tool Description Design

**What to look for:**
- Descriptions shorter than 4 sentences
- Missing Usage Guidelines (89.3% prevalence — "use this when", "do not use", "instead use")
- Vague Limitations that hurt more than help (removing bad limitations improved SR by 10pp)
- No cross-references between related or confusable tools

**What to change:**
- Add a Purpose statement: what the tool does, what it returns, and its behavioral characteristics
- Add Usage Guidelines with domain-specific cues: when to use, when NOT to use, what to use instead
- Make Limitations concrete and actionable, or remove them entirely if they are vague
- Add inter-tool cross-references: "Use `tool_x` instead when [condition]" or "Often used after `tool_y`"

**How to verify:**
- Run Tier 1 structural checks: sentence count >= 3, regex markers for Usage Guidelines and Limitations present
- Check that every related tool pair has at least one cross-reference
- Optionally run Tier 2 FM-scored rubric: all six component means >= 3 across a 3-model jury

### Parameter & Schema Design

**What to look for:**
- Missing `.describe()` annotations on Zod schemas or missing `description` fields in JSON Schema
- No `outputSchema` declared (server returns unstructured text only)
- More than 20 parameters on a single tool (out-of-distribution for FM training)
- Generic parameter names like `data`, `input`, `value`, `options` without clarifying descriptions

**What to change:**
- Add type, meaning, behavioral effect, and default value to every parameter description
- Add `outputSchema` declarations so servers return `structuredContent`
- Rename ambiguous parameters or add descriptions that disambiguate
- For tools with > 20 parameters, consider splitting into multiple tools or using nested objects

**How to verify:**
- Check all `inputSchema.properties` entries have non-empty, non-trivial descriptions
- Verify `outputSchema` is declared and `structuredContent` conforms to it
- Count arguments per tool; flag any exceeding 20

### Error Message Design

**What to look for:**
- Stack traces leaking to the FM (`Error at`, `at function_name (`)
- Raw exception class names (`TypeError:`, `ReferenceError:`)
- Error messages shorter than 20 characters
- No recovery actions — the FM receives an error but no guidance on what to do next

**What to change:**
- Structure errors with: what went wrong, which input caused it, why it failed, and what to try instead
- Add tool cross-references in recovery actions: "Try `tool_x` with [adjusted args]"
- Set `isError: true` on all error responses so the FM knows the call failed
- Remove internal implementation details; replace with user/FM-facing language

**How to verify:**
- Regex checks: no matches for `/Error\s+at\s/`, `/at\s+\w+\s+\(/`, `/^(TypeError|ReferenceError|Error):/`
- Length checks: all error messages > 20 characters
- Recovery action presence: error text contains actionable guidance (not just "failed")

### System Prompt Design

**What to look for:**
- Domain knowledge duplicated between system prompt and tool descriptions
- Naming collisions: two MCP servers both exposing a `query` tool
- Oversized system prompt competing with tool definitions for context window space

**What to change:**
- Remove duplicated knowledge — tool descriptions own capability details, system prompt owns behavioral instructions
- Add ordering instructions for multi-tool sequences: "Always call `tool_a` before `tool_b` when [condition]"
- Trim system prompt to behavioral instructions only; move factual content into tool descriptions or resources

**How to verify:**
- No capability overlap: system prompt does not redefine what a tool does
- Prompt is proportionate to tool footprint (not consuming excessive context)
- Naming collisions resolved: each tool has a unique, unambiguous name

### Multi-Turn Conversation Design

**What to look for:**
- Verbose tool results consuming disproportionate context (large JSON payloads)
- Display-name-only references: results return "John Smith" but not a stable ID, causing ambiguity in later turns
- No depth testing: system only tested at turn 1, never at turn 10+

**What to change:**
- Trim tool results to essential fields; remove redundant or internal data
- Return stable IDs alongside display names in all tool results
- Add pagination for large result sets to avoid context bloat
- Design tool results to be self-contained enough for coreference resolution

**How to verify:**
- Test the same scenario at turn 1, 5, 10, and 15+; compare accuracy (DASR metric)
- Check that entity references are unambiguous: stable IDs present, not just display names
- Measure token footprint of tool results; flag outliers

### Tool Set Architecture

**What to look for:**
- More than 20 visible tools (out-of-distribution for FM training data)
- Overlapping tools without cross-references (FM cannot disambiguate)
- Multi-intent tools that try to do too many things

**What to change:**
- Implement dynamic discovery: start with high-level tools, expose specific tools on demand
- Add cross-references between related tools: "Use `tool_x` for [case A], `tool_y` for [case B]"
- Split multi-intent tools into focused, single-purpose tools
- Group tools logically and consider namespacing for large servers

**How to verify:**
- Measure total token footprint of all tool definitions; compare against context budget
- Count visible tools; flag if > 20
- Verify every confusable tool pair has disambiguation cross-references

### Response Format Design

**What to look for:**
- Inconsistent field names across tools (e.g., `name` in one tool, `title` in another for the same concept)
- No pagination for tools that can return large result sets
- Narrative text where discrete, verifiable facts would be more useful to the FM

**What to change:**
- Standardize field names across all tools in the server
- Add pagination (offset/limit or cursor-based) for any tool that can return unbounded results
- Return discrete, verifiable facts rather than narrative summaries
- Use consistent date formats, ID formats, and enum values across all tools

**How to verify:**
- Check schema consistency across tools: same concept uses same field name and type
- Verify pagination is present for tools with potentially large result sets
- Confirm outputs contain structured facts, not just prose descriptions

---

## Implementation by Testing Area

### 1. Tool Description Quality (Discovery)

**Before writing code, read:** `references/tool-descriptions.md`

**What to implement:**

| Test | Tier | CI | What it catches |
|---|---|---|---|
| Description presence and length (>= 3 sentences) | 1 | Yes | Missing or minimal descriptions |
| Rubric component markers (regex) | 1 | Yes | Missing usage guidelines (89.3%), limitations (89.8%), examples |
| Parameter descriptions (non-empty, non-trivial) | 1 | Yes | Opaque parameters (84.3% prevalence) |
| Inter-tool disambiguation (cross-references) | 1 | Yes | Confusable tools without cross-references |
| Limitation quality guard (anti-pattern regex) | 1 | Yes | Vague limitations that hurt more than help (-10pp SR) |
| FM-scored rubric evaluation (multi-model jury) | 2 | No | Semantic quality below threshold (mean < 3 on any component) |

**Retrieve tool definitions:** Call `tools/list` or extract from registration code as static JSON.

**Tier 1 pass criteria:** All structural checks pass. A Tier 1 failure guarantees a rubric smell; passing does not guarantee the rubric score is >= 3.

**Tier 2 pass criteria:** All six rubric component means >= 3 across a 3-model jury. Smell detected if and only if `(1/N) x Sum Score_i < 3`.

**When to add Tier 2:** After Tier 1 passes but Agent Behavior tests regress, before releases, or periodically as audit.

---

### 2. Server Correctness (Invocation)

**Before writing code, read:** `references/server-correctness.md`

**What to implement:**

| Test | Tier | CI | What it catches |
|---|---|---|---|
| Schema validation (`outputSchema` -> `structuredContent`) | 1 | Yes | Format violations. MCP spec: servers MUST conform. |
| Error structure (actionable, no stack traces) | 1 | Yes | Opaque errors -> FM can't recover. RFC 9457 principle. |
| Result fidelity (golden-file / snapshot) | 1 | Yes | Silent changes to result shapes. Contract testing. |
| Error-path coverage (invalid input, not-found) | 1 | Yes | Crashes or success responses for invalid input. |
| FM recovery rate (LLM in loop) | 2 | No | Error messages the FM can't act on. |

**Minimum test cases per tool:** 1 happy path + 1 invalid input + 1 not-found = 3 cases.

**Key anti-pattern regex (error structure):**
- Stack traces: `/Error\s+at\s/` and `/at\s+\w+\s+\(/`
- Raw exceptions: `/^(TypeError|ReferenceError|Error):/`
- Minimum error text length: > 20 characters

**Golden-file non-deterministic fields:** Assert patterns, not values. UUID: `/^[0-9a-f-]{36}$/`. ISO date: `/^\d{4}-\d{2}-\d{2}/`. Assert relationships (count field = array length).

---

### 3. Agent Behavior (Tool Selection)

**Before writing code, read:** `references/agent-behavior.md`

**What to implement:**

| Test | Tier | CI | What it catches |
|---|---|---|---|
| Recorded scenario replay (TestProvider pattern) | Middle | Yes (after recording) | Regressions in tool selection |
| Tool selection accuracy (live FM evaluation) | Upper | No | Wrong tool selected for a query |
| Argument quality (live) | Upper | No | Wrong or hallucinated parameters |
| Step efficiency (live) | Upper | No | Excessive tool call loops |

**Three metrics (compute per scenario, aggregate across runs):**

```
SR = (tasks where all evaluators pass) / (total tasks) x 100
AE = (1/N) x Sum (evaluators_passed_i / total_evaluators_i)
AS = (1/N) x Sum steps_i
```

**Statistical guidance:** Run each scenario 5-10 times. Report median and IQR. Compare configurations with McNemar's test (SR) or Wilcoxon signed-rank (AE, AS). Report effect sizes, not just p-values.

**Five scenario categories:** (1) single-tool, (2) multi-step workflows, (3) ambiguous queries (highest-value — exercise description disambiguation), (4) negative cases, (5) edge-case arguments.

**Aim for:** 3-5 scenarios per tool + 2-3 multi-tool workflows. A 5-tool server benefits from 20-30 scenarios.

**Grade outcomes, not paths.** Don't assert exact tool call sequences. Agents regularly find valid approaches that eval designers didn't anticipate.

---

### 4. Response Accuracy (Full Loop)

**Before writing code, read:** `references/response-accuracy.md`

**What to implement:**

| Test | Tier | CI | What it catches |
|---|---|---|---|
| Correctness (counts, IDs, statuses — code-graded) | 1 | Yes | Wrong facts in the answer |
| Faithfulness (claim decomposition — LLM-graded) | 2 | No | Hallucinated claims not in tool results |
| Completeness (golden answer coverage — LLM-graded) | 2 | No | Missing important facts |
| Grounding traceability (attribution — LLM-graded) | 2 | No | Unattributable claims |

**Closed-loop harness (5 steps):** Seed data -> Define scenario (query + seed state + golden answer + grading mode) -> Execute full MCP loop -> Capture both layers (tool results + FM answer) -> Grade.

**Key formulas:**

```
Faithfulness = (claims supported by tool results) / (total claims in response)
Completeness = (golden claims covered by response) / (total golden claims)
```

Faithfulness checks "did the response hallucinate?" against **tool results**. Completeness checks "did the response omit?" against the **golden answer**. They are independent dimensions — a response can be perfectly faithful but incomplete, or vice versa.

**Tier 1 pass criteria:** All extracted facts (counts, IDs, statuses, entities) match golden answer exactly. Negation consistency: zero-match seed data -> answer must not fabricate results.

**Tier 2 pass criteria:** Faithfulness score = 1.0 (all claims SUPPORTED). Use DeepMind FACTS two-phase evaluation: eligibility (does it answer the query?) then grounding (is it factually grounded?). For high-stakes: multi-judge with 2-3 LLMs, majority verdict per claim.

---

### 5. Chatbot Integration (Multi-Turn)

**Before writing code, read:** `references/chatbot-testing.md`

**What to implement:**

| Test | Tier | CI | What it catches |
|---|---|---|---|
| Coreference resolution (5 reference types) | Code-graded | No | Indirect references -> wrong argument values |
| Workflow tool sequences (5 workflow patterns) | Code-graded | No | Multi-turn workflows broken |
| Context pressure (turn 1 vs turn 5/10/15) | Code-graded | No | Quality degradation at conversation depth |
| System prompt conflict (4 conflict types) | FM-graded | No | Tool description collisions with system prompt |
| Presentation quality (anti-pattern detection) | FM-graded | No | Raw JSON dumps, over-summarization |
| Graceful degradation (6 failure modes) | Hybrid | No | Hallucinated results after server failure |

**Key metrics:**

```
CRR = (correctly resolved references) / (total references) x 100
WCR = (completed workflows) / (total workflow scenarios) x 100
DASR(N) = SR at turn N;  Degradation = SR(turn 1) - SR(turn N)
Reliability = (function_name_recall + function_argument_recall) / 2
```

**Coreference categories to cover:** result reference ("that one"), argument echo ("same but for Q4"), implicit context ("make sure it's well-written"), negation reference ("the other one"), plural accumulation ("all three").

**Context pressure evidence:** Context length alone causes 13.9%-85% performance degradation. Tool definitions can consume 50K-134K tokens. Test the same scenario at turns 1, 5, 10, 15+.

**Starting point:** 2-3 coreference scenarios + 1 workflow scenario + 1 pressure scenario.

**Diagnostic flow:** If chatbot tests fail but single-turn tests pass -> conversational problem (context, coreference, orchestration). If both fail -> fix single-turn first.

---

## Cross-Cutting Implementation Guidance

### CI vs. on-demand

| CI (every commit) | On-demand (before releases) |
|---|---|
| Tool description structural checks (Tier 1) | Agent behavior live FM evaluation |
| Server schema validation | Response accuracy Tier 2 (faithfulness/completeness) |
| Server error-path coverage | Chatbot integration scenarios |
| Server golden-file assertions | Multi-model stability testing |
| Response accuracy Tier 1 correctness | FM-scored rubric evaluation (Tier 2) |

**Key principle:** "Don't run live LLM tests in CI. Too expensive, too slow, too flaky." (Block Engineering)

**Key principle:** "Prefer deterministic graders where possible; use LLM graders where necessary." (Anthropic)

### When to run on-demand tests

- Before releases that change tool descriptions, schemas, or server logic
- When adding new tools
- Periodically as a quality audit
- When deterministic tests pass but users report issues

### Minimum test coverage

| Area | Minimum |
|---|---|
| Tool Description Quality | All tools (structural checks iterate automatically) |
| Server Correctness | 3 cases per tool (happy, invalid, not-found) |
| Agent Behavior | 3-5 scenarios per tool + 2-3 multi-tool workflows |
| Response Accuracy | 1 closed-loop scenario per critical user journey |
| Chatbot Integration | 2-3 coreference + 1 workflow + 1 pressure scenario |

### The causal chain for debugging

When response accuracy is low, trace through the chain:

```
Tool Description Quality -> Agent Behavior -> Server Correctness -> Response Accuracy
```

Did the FM pick the right tool? (Agent Behavior) -> Were the arguments correct? -> Did the server return correct results? (Server Correctness) -> Did the FM synthesize faithfully? (Response Accuracy Tier 2)

---

## Recommended Next Step

After implementing improvements and tests:
- Run the deterministic tests and fix failures
- When deterministic tests pass, run on-demand tests to validate behavioral quality
- If response accuracy is low, trace through the causal chain
- Use `agent-artifex:assess` periodically to re-evaluate coverage as the project evolves
