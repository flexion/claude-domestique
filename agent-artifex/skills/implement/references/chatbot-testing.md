# Chatbot Integration — Implementation Reference

Read this file when implementing Chatbot Integration (multi-turn) tests. Contains metrics, scenario categories, coreference patterns, context pressure methodology, and graceful degradation testing.

---

## Metrics

Extend the Agent Behavior metrics (SR, AE, AS) with chatbot-specific measures.

### Coreference Resolution Rate (CRR)

Fraction of conversational references resolved to the correct tool argument value.

```
CRR = (correctly resolved references) / (total references in scenario) × 100
```

### Workflow Completion Rate (WCR)

Fraction of multi-turn workflows where all required tools are called with correct arguments across all turns.

```
WCR = (completed workflows) / (total workflow scenarios) × 100
```

### Depth-Adjusted Success Rate (DASR)

Tool selection accuracy at a specific conversation depth, compared against baseline.

```
DASR(depth=N) = SR at turn N
Degradation = SR(turn 1) − SR(turn N)
```

### Presentation Score (PS)

FM-graded measure of result presentation quality (1–5 scale). Grade on relevance to conversational context and appropriate detail level.

### Reliability Score

Mean of function name recall and function argument recall (Microsoft ISE's composite metric).

```
Reliability = (function_name_recall + function_argument_recall) / 2
```

---

## Scenario Categories

| Category | Turn count | What it tests | Key assertion |
|---|---|---|---|
| **Coreference** | 2–4 | Indirect reference resolution | Correct argument values from prior results |
| **Workflow** | 3–6 | Incremental intent accumulation | Correct tool sequence with accumulated context |
| **Pressure** | 10–20 | Context window degradation | Accuracy at depth N vs. baseline |
| **Conflict** | Any | System prompt / tool description tension | Graceful handling of competing instructions |
| **Degradation** | Any | Server failure handling | Clear reporting without hallucination |
| **Interruption** | 4–6 | Workflow pause/resume | Prior context intact after interruption |

### Multi-turn scenario structure

| Component | Description | Example |
|---|---|---|
| **Conversation script** | Ordered list of user messages | Turn 1: "Create an ADR about PostgreSQL" → Turn 2: "We chose it for JSONB support" → Turn 3: "Check its quality" |
| **Turn-level assertions** | Expected behavior per turn | Turn 3: agent calls `assess_adr_quality` with the ID from turn 1's result |
| **Conversation-level assertions** | Expected outcome of the full conversation | ADR created AND quality assessed. All coreferences resolved. |
| **Context seed** (optional) | Prior conversation history to prepend | 10 turns of unrelated conversation to test context pressure |
| **System prompt** (optional) | Agent system prompt to test interaction | "Always confirm before creating records." |

Each trial should be isolated — no shared state between runs.

---

## Tier 1: Code-Graded Checks

### Coreference Resolution

The expected argument value is known from the seeded tool result. Compare the agent's actual tool call arguments against the expected resolved values.

**Five categories of references to test:**

| Reference type | Example | Resolution source |
|---|---|---|
| **Result reference** | "check the quality of that one" | Prior tool result (extract ID, name, etc.) |
| **Argument echo** | "same query but for Q4" | Prior tool call arguments (change one value) |
| **Implicit context** | "now make sure it's well-written" | Prior turn's result implies which resource |
| **Negation reference** | "the other one, not that one" | Prior results + exclusion logic |
| **Plural accumulation** | "check all three of those" | Multiple prior results |

```typescript
// Coreference grading example
// Turn 1 tool result: { id: "adr-007", title: "Use PostgreSQL" }
// Turn 2 user: "check the quality of that one"
// Expected: agent calls assess_adr_quality({ id: "adr-007" })

const actualArgs = capturedToolCall.arguments;
expect(actualArgs.id).toBe("adr-007"); // Coreference correctly resolved
```

### Workflow Tool Sequence

Assert the correct tools were called with correct arguments across turns. Grade outcomes, not paths.

**Five workflow patterns to test:**

| Pattern | Description | Key assertion |
|---|---|---|
| **Incremental specification** | User provides tool arguments across 2–4 messages | Agent calls the tool with complete, correct values |
| **Conditional branching** | "If the quality score is low, fix it" | Agent selects the next tool based on a prior result |
| **Iterative refinement** | "Change the context section" | Agent calls update tool with correct resource and only changed fields |
| **Workflow discovery** | "Help me create and review an ADR" | Agent identifies the correct multi-tool sequence |
| **Interruption recovery** | Unrelated question mid-workflow, then "back to the ADR" | Agent resumes with prior context intact |

### Context Pressure Measurement

Run the same tool-selection scenario at different conversation depths. Compare accuracy against baseline (turn 1).

| Conversation depth | Expected behavior |
|---|---|
| Turn 1 (clean context) | Baseline — should match single-turn Agent Behavior results |
| Turn 5 (light history) | Tool selection should remain stable |
| Turn 10 (moderate history) | Watch for argument quality degradation |
| Turn 15+ (heavy history) | Watch for tool selection errors, hallucinated arguments, ignored tool results |

**Factors that accelerate context pressure:**
- **Verbose tool results** — Large JSON payloads consume disproportionate context
- **Many tool calls per conversation** — Each adds both call and result to context
- **Long system prompts** — Compete with tool definitions and history
- **Stateless APIs** — The Messages API requires full conversational history each time, so context grows linearly with depth

Key evidence: context length alone causes 13.9%–85% performance degradation, independent of retrieval quality and without any distraction.

---

## Tier 2: FM-Graded Checks (On-Demand)

### System Prompt Conflict Testing

Define system prompt + tool definition combinations that create realistic tensions.

| Conflict type | Example | Failure mode |
|---|---|---|
| **Instruction conflict** | System prompt: "always confirm before creating records"; tool: "creates immediately" | Hesitation, unnecessary confirmation, or bypassed safeguard |
| **Naming collision** | Two MCP servers both expose a `query` tool | Wrong server's tool selected |
| **Priority ambiguity** | System prompt: "prefer simple answers"; tool: "provide comprehensive analysis" | Inconsistent detail levels |
| **Capability overlap** | System prompt gives built-in knowledge overlapping a tool | Answers from training data instead of calling tool |

### Presentation Quality Grading

Grade on two dimensions beyond faithfulness/completeness:

- **Relevance to conversational context:** Does the answer connect to what the user asked, referencing prior conversation where appropriate?
- **Appropriate detail level:** Is detail proportional to the query? (Quick question → concise answer. Detailed request → comprehensive response.)

**Anti-patterns to flag:**
- Over-summarization (critical information lost)
- Under-summarization (raw JSON dumped)
- Missing conversational framing ("Here are the results" without context)
- Format inconsistency across turns

### Graceful Degradation Testing

Inject failures into the MCP transport layer and verify the agent's conversational response.

| Failure mode | Expected behavior | Anti-pattern |
|---|---|---|
| **MCP server unreachable** | Inform user, suggest retry | Hang, empty response, or hallucinated result |
| **Tool call timeout** | Inform user, offer retry | Silently drop request |
| **Rate limit exceeded** | Inform user, suggest waiting | Tight retry loop |
| **Context window full** | Summarize older turns; maintain tool definitions | Drop tool definitions or crash |
| **Malformed tool result** | Report unexpected response | Parse incorrectly, present wrong data |
| **Partial tool failure** | Report what succeeded and what failed | Hide partial result |

---

## When to Run

| Test type | Trigger | Rationale |
|---|---|---|
| **Coreference scenarios** | Before releases that change tool schemas or response formats | Schema changes break reference resolution. |
| **Workflow scenarios** | Before releases that add or modify tools | New tools change workflow possibilities. |
| **Pressure scenarios** | Before production deployment; periodically as audit | Deployment-specific — depends on expected conversation lengths. |
| **Conflict scenarios** | When changing system prompts or adding MCP servers | System prompt changes affect all tool interactions. |
| **Degradation scenarios** | Before production deployment | Standard reliability testing. |
| **Interruption scenarios** | Before releases that change multi-tool workflows | Interruption recovery depends on context management. |

---

## Diagnostic Flow

When chatbot integration tests fail but single-turn tests pass → the problem is conversational (context pressure, coreference, workflow orchestration).

When both fail → fix the single-turn failures first. Tool descriptions must be high quality for chatbot integration to succeed.
