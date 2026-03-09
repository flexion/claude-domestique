# Tool Description Quality — Implementation Reference

Read this file when implementing Tool Description Quality tests. Contains the rubric, code patterns, prompt templates, and pass/fail criteria.

---

## Six-Component Rubric (score 1–5 per component)

| Score | Purpose | Usage Guidelines | Limitations | Parameter Explanation | Examples vs Description | Length and Completeness |
|---|---|---|---|---|---|---|
| **5** | Clearly explains function, behavior, and return data with precise language. | Explicitly states appropriate use cases and when not to use; includes disambiguation if the tool name is ambiguous. | Clearly states what the tool does not return, scope boundaries, and important constraints. | Every parameter is explained with type, meaning, behavioral effect, and required or default status. | Description is self-sufficient; examples, if any, supplement rather than replace the explanation. | Four or more sentences of substantive, well-structured prose covering all aspects. |
| **4** | Explains function and behavior with minor ambiguity. | States when to use with minimal guidance on when not to use. | Mentions main limitations but misses some edge cases. | Most parameters are explained with minor omissions. | Mostly descriptive with minor reliance on examples. | Three to four sentences with good coverage. |
| **3** | Basic explanation present but lacks behavioral details. | Implies usage context but lacks explicit boundaries. | Vague or incomplete limitation statements. | Basic parameter information is present but lacks behavioral impact. | Even mix of description and examples. | Two to three sentences that are somewhat complete. |
| **2** | Vague or incomplete purpose statement. | Usage context unclear or overly generic. | Minimal or implied limitations only. | Parameters are listed without meaningful explanation. | Over-relies on examples with minimal prose. | One to two sentences that are too brief. |
| **1** | Purpose unclear or missing. | No usage guidance provided. | No limitations or caveats mentioned. | Parameters are not explained or only provided in schema form. | Only examples are provided with no descriptive explanation. | Single phrase or fragment. |

### Labeling Rules

- **Good:** All six components score ≥ 3.
- **Bad:** Any component scores < 3, OR examples replace the description instead of supporting it.
- **Smell threshold:** Mean score across jury < 3 on any component.

### Key statistics

- 97.1% of tool descriptions contain at least one smell
- Most prevalent: Unstated Limitations (89.8%), Missing Usage Guidelines (89.3%), Opaque Parameters (84.3%)
- Only 2.9% of descriptions are smell-free across all five non-length components

---

## Tier 1: Deterministic Structural Checks (CI)

No LLM calls. Fast, cheap, deterministic. A failure here guarantees a rubric smell; passing here does not guarantee the rubric score is ≥ 3.

### 1. Description presence and length

Count sentences. Score ≥ 3 requires ≥ 3 sentences. Score 5 requires ≥ 4 sentences.

```typescript
for (const tool of tools) {
  // Sentence counting — split on sentence-ending punctuation
  const sentences = tool.description!.split(/[.!?]\s+/).filter(s => s.length > 0);
  expect(sentences.length, `${tool.name} description too short`).toBeGreaterThanOrEqual(3);
}
```

```python
import re

for tool in tools:
    sentences = [s for s in re.split(r'[.!?]\s+', tool.description) if s.strip()]
    assert len(sentences) >= 3, f"{tool.name} description too short ({len(sentences)} sentences)"
```

### 2. Rubric component markers

Each component has detectable keyword patterns. Absence guarantees a smell.

**Usage Guidelines phrases:** `use this when`, `use this to`, `do not use`, `instead use`, `not suitable for`

**Limitations phrases:** `does not`, `cannot`, `only`, `limited to`, `will not return`, `will not`

**Examples phrases:** `example`, `e.g.`, `for instance`, `such as`

```typescript
for (const tool of tools) {
  const desc = tool.description ?? "";

  // Usage guidelines markers
  expect(desc, `${tool.name} missing usage guidelines`)
    .toMatch(/\buse this\b|\buse when\b|\bdo not use\b|\binstead use\b|\bnot suitable for\b/i);

  // Limitations markers
  expect(desc, `${tool.name} missing limitations`)
    .toMatch(/\bdoes not\b|\bcannot\b|\blimited to\b|\bonly\b|\bwill not\b/i);

  // Examples markers
  expect(desc, `${tool.name} missing examples`)
    .toMatch(/\bexample\b|\be\.g\.\b|\bfor instance\b|\bsuch as\b/i);
}
```

### 3. Parameter descriptions

Every property in `inputSchema.properties` must have a non-empty description that isn't just the property name repeated. Parameter Explanation has the highest inter-rater reliability (ICC 0.90) — the most objectively assessable component.

```typescript
for (const tool of tools) {
  const properties = tool.inputSchema.properties ?? {};
  for (const [name, schema] of Object.entries(properties)) {
    const desc = (schema as Record<string, unknown>)["description"] as string;

    // Must exist and be non-empty
    expect(desc, `${tool.name}.${name} must have a description`).toBeTruthy();

    // Must not just repeat the property name
    expect(desc!.toLowerCase(), `${tool.name}.${name} description is just the name`)
      .not.toBe(name.toLowerCase());

    // Enum parameters should list valid values in description or schema
    const enumVals = (schema as Record<string, unknown>)["enum"];
    if (enumVals) {
      // Enum values exist in schema — acceptable even if not in description
    }
  }
}
```

### 4. Inter-tool disambiguation

Tools with related functionality should cross-reference each other by name in their descriptions.

```typescript
const toolNames = tools.map(t => t.name);
for (const tool of tools) {
  const desc = tool.description ?? "";
  const otherTools = toolNames.filter(n => n !== tool.name);

  // At least one other tool should be mentioned
  const mentionsOther = otherTools.some(name => desc.includes(name));
  expect(mentionsOther, `${tool.name} should reference related tools`).toBe(true);
}
```

> **Note:** Scope this check to tool groups for servers with clearly unrelated tools.

### 5. Limitation quality guard

Vague limitations are worse than no limitations. In one domain, removing poorly written Limitations improved SR by 10pp.

**Anti-patterns to flag:**

```typescript
const vaguePatterns = [
  /\bmay require\b.*\binvestigation\b/i,
  /\brequires disambiguation\b/i,
  /\bfurther analysis\b/i,
  /\bsubject to\b.*\blimitations\b/i,
  /\bthis contradiction\b/i,
];

for (const tool of tools) {
  const desc = tool.description ?? "";
  for (const pattern of vaguePatterns) {
    expect(desc, `${tool.name} has vague limitation: ${pattern}`).not.toMatch(pattern);
  }
}
```

---

## Tier 2: FM-Scored Rubric Evaluation (on-demand)

Use LLMs to score descriptions against the full rubric. Non-deterministic, incurs API costs. Run on-demand: when adding/modifying descriptions, before releases, periodically as audit, or when Tier 1 passes but Agent Behavior regresses.

### Scoring prompt template

Send each tool's complete definition to the scoring LLM:

```
You are grading a tool description. Score each component from 1 to 5, then provide a label, justification, and improvement recommendations.

## Rubric
[Insert the six-component rubric table above]

## Tool definition
```json
{tool_payload}
```

Respond with JSON only:
```json
{
  "scores": {
    "purpose": 1,
    "usage_guidelines": 1,
    "limitations": 1,
    "parameter_explanation": 1,
    "examples_balance": 1,
    "length_completeness": 1
  },
  "label": "Good",
  "reason": "One sentence justification",
  "improvement_needed": ["list of specific weak areas with scores <= 3"]
}
```
```

### Multi-model jury

Use **three LLMs from at least two different provider families** (e.g., OpenAI, Anthropic, open-weight). The original research achieved ICC(2,1) ≥ 0.76 for five of six components using models from OpenAI, Anthropic, and Alibaba families.

**Per-component ICC values for reference:** Purpose 0.82, Guidelines 0.85, Limitations 0.84, Parameter Explanation 0.90, Length and Completeness 0.76, Examples 0.62.

**Aggregation formula:**

```
Smell Detected ⟺ (1/N) × Σ Score_i < 3
```

For each tool and each component, compute the arithmetic mean of the three scores. A smell is detected if and only if the mean falls below 3.

### Pass/fail criteria

- **Pass:** All six component means ≥ 3 AND label is "Good"
- **Fail:** Any component mean < 3 OR examples replace the description instead of supporting it

### Calibration

Periodically verify that Tier 1 structural checks correlate with Tier 2 rubric scores. If Tier 1 passes consistently but Tier 2 reveals low scores, the structural checks need tuning.

---

## Retrieving tool definitions

```typescript
// TypeScript (@modelcontextprotocol/sdk)
const response = await client.listTools();
const tools = response.tools; // Array of { name, description, inputSchema, ... }
```

```python
# Python (mcp SDK)
response = await session.list_tools()
tools = response.tools
```

If your test framework can't instantiate an MCP client, extract tool definitions at build time from your tool registration code and test them as static JSON. The assertions are identical.
