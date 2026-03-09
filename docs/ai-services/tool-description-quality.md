# Tool Description Quality — Discovery

> Part of [AI Services Framework](framework.md).
>
> MCP Spec Term: **Discovery** | Test type: **Structural (no LLM)**

**Expose tool names, descriptions, and input schemas to the MCP Client**[^1] so that the FM has the semantic context it needs to select the right tool and infer correct arguments.[^2]

**High-quality descriptions** reduce tool confusion, eliminate ambiguity between similar tools, and enable smaller models to perform as well as larger ones.[^3] Poor descriptions — vague purpose statements, missing usage guidelines, opaque parameters — are the root cause of downstream failures in every subsequent phase.[^4]

**How to compare two outputs:** Score each tool description against the six-component rubric (Purpose, Guidelines, Limitations, Parameter Explanation, Examples, Length).[^5] The higher-quality output has higher rubric scores, better inter-tool disambiguation (Limitations cross-reference the correct alternative tools), and fewer tokens consumed for the same semantic content.[^6]

---

## What should be tested

1. **Rubric score per component.** Each tool description should score ≥ 3 on all six rubric components (Purpose, Guidelines, Limitations, Parameter Explanation, Examples, Length) using the paper's 5-point Likert scale.[^7] A score < 3 on any component constitutes a smell.[^8]

2. **Purpose clarity.** Purpose is the single most important component — 44% of tools are smell-free on Purpose alone, but only 2.9% are smell-free across all components.[^9] Purpose should be tested with the highest weight.

3. **Description length and token budget.** Descriptions must be substantive (≥ 4 sentences for score 5)[^10] but concise enough to avoid inflating execution steps. Augmented descriptions increase execution steps by 67.46% (median).[^11]

4. **Inter-tool disambiguation.** Tools with overlapping functionality should explicitly state when to use each one and when not to. Limitations sections should cross-reference the correct alternative tool by name.[^12]

5. **Parameter completeness.** Every parameter should have a `.describe()` annotation covering type, meaning, behavioral effect, and required/default status.[^13]

6. **Limitation quality.** Test not just for presence but for concreteness. Vague or self-referential limitations actively hurt performance — in one domain, removing poorly written Limitations improved SR by 10pp.[^14]

---

## How to test

Testing tool description quality uses two tiers: **deterministic structural checks** that run on every commit (CI-safe, no LLM, near-zero cost), and **FM-scored rubric evaluation** that runs on-demand (requires LLM calls, non-deterministic, higher cost).[^21] Both tiers operate on the tool definitions returned by the MCP `tools/list` protocol call.[^22]

### Impact and effort summary

| Test | Impact on description quality | Effort | Evidence |
|---|---|---|---|
| **1. Description presence and length** | **Moderate.** Length is a "meta-quality dimension" — automatically fulfilled when other components are populated.[^26] But descriptions scoring 1–2 on Length guarantee multiple missing components.[^10] | Near-zero. String split and count. | Hasan et al. §4.4.3[^26], Appendix A.1[^10] |
| **2. Rubric component markers** | **High.** Catches the three most prevalent smells by keyword absence: Unstated Limitations (89.8%), Missing Usage Guidelines (89.3%), Opaque Parameters (84.3%).[^18] If the markers aren't present, the component is definitely missing. | Near-zero. Regex matching. | Hasan et al. §5.1[^18] |
| **3. Parameter descriptions** | **High.** Opaque Parameters is the #3 smell at 84.3%.[^18] Parameter Explanation has the highest inter-rater reliability of any component (ICC 0.90)[^24] — it is the most objectively assessable component, making it the best candidate for deterministic testing. | Near-zero. Iterate schema properties. | Hasan et al. §5.1[^18], §4.3.2[^24] |
| **4. Inter-tool disambiguation** | **Moderate.** Missing Usage Guidelines is the #2 smell at 89.3%.[^18] However, disambiguation is only the score-5 criterion for Usage Guidelines[^12] — it targets the highest quality bar, not the minimum threshold. Most valuable for servers with overlapping tools. | Low. String matching against tool names, but requires defining tool groups for servers with unrelated tools. | Hasan et al. Appendix A.1[^12] |
| **5. Limitation quality guard** | **High — and uniquely important.** The only component where poor quality is empirically worse than absence: removing vague Limitations improved SR by 10pp in one domain.[^14] Unstated Limitations is the #1 smell at 89.8%.[^18] | Low. Regex anti-patterns, but the pattern list needs domain-specific tuning over time. | Hasan et al. §5.3[^14], §5.1[^18] |
| **6. FM-scored rubric evaluation** | **Highest.** The only test that evaluates semantic quality across all 6 components simultaneously.[^7] Catches smells that structural checks miss — e.g., a description with the right keywords but wrong meaning. The paper's +5.85pp SR improvement from augmentation was measured using this methodology.[^25] | High. Three LLM calls per tool per scoring run.[^16] Non-deterministic.[^27] Cost scales linearly with tool count. "Grading is a cost you will incur every time you re-run your eval, in perpetuity."[^28] | Hasan et al. §4.3[^16], Block[^21], Anthropic[^28], OpenAI[^27] |

**Practical implication:** Invest in Tier 1 tests first. They catch the majority of smells at near-zero cost and run on every commit.[^21] Reserve Tier 2 for validation that semantic quality meets the rubric threshold — it is the most accurate but also the most expensive.[^28] When Tier 2 scores drop, use Tier 1 results to narrow the diagnosis. When Tier 1 passes but downstream Agent Behavior tests regress, Tier 2 rubric scores reveal whether description quality is the root cause.[^25] Anthropic recommends: "Prefer deterministic graders where possible; use LLM graders where necessary."[^29] OpenAI warns: "Not calibrating your automated metrics against human evals" leads to unreliable automation[^30] — periodically verify that your Tier 1 structural checks correlate with Tier 2 rubric scores.

### Retrieving tool descriptions

Call `tools/list` on your MCP server. The response contains an array of tool objects, each with `name`, `description`, `inputSchema`, and optionally `outputSchema` and `annotations`.[^22] These are the inputs to every test below.

How you make this call depends on your MCP client library. The pattern is the same across languages:

```typescript
// TypeScript (using @modelcontextprotocol/sdk)
const response = await client.listTools();
const tools = response.tools; // Array of { name, description, inputSchema, ... }
```

```python
# Python (using mcp SDK)
response = await session.list_tools()
tools = response.tools  # List of Tool objects
```

If your test framework cannot instantiate an MCP client, you can extract tool definitions at build time (e.g., from your tool registration code) and test them as static JSON. The assertions are the same.

### The six-component rubric

This rubric is the scoring standard for both tiers.[^7] Score each component from 1 to 5. Score 3 is the minimum viable threshold; any component scoring below 3 constitutes a smell.[^8]

| Score | Purpose | Usage Guidelines | Limitations | Parameter Explanation | Examples vs Description | Length and Completeness |
|---|---|---|---|---|---|---|
| **5** | Clearly explains function, behavior, and return data with precise language. | Explicitly states appropriate use cases and when not to use; includes disambiguation if the tool name is ambiguous. | Clearly states what the tool does not return, scope boundaries, and important constraints. | Every parameter is explained with type, meaning, behavioral effect, and required or default status. | Description is self-sufficient; examples, if any, supplement rather than replace the explanation. | Four or more sentences of substantive, well-structured prose covering all aspects. |
| **4** | Explains function and behavior with minor ambiguity. | States when to use with minimal guidance on when not to use. | Mentions main limitations but misses some edge cases. | Most parameters are explained with minor omissions. | Mostly descriptive with minor reliance on examples. | Three to four sentences with good coverage. |
| **3** | Basic explanation present but lacks behavioral details. | Implies usage context but lacks explicit boundaries. | Vague or incomplete limitation statements. | Basic parameter information is present but lacks behavioral impact. | Even mix of description and examples. | Two to three sentences that are somewhat complete. |
| **2** | Vague or incomplete purpose statement. | Usage context unclear or overly generic. | Minimal or implied limitations only. | Parameters are listed without meaningful explanation. | Over-relies on examples with minimal prose. | One to two sentences that are too brief. |
| **1** | Purpose unclear or missing. | No usage guidance provided. | No limitations or caveats mentioned. | Parameters are not explained or only provided in schema form. | Only examples are provided with no descriptive explanation. | Single phrase or fragment. |

**Labeling rules:**[^23] A description is labeled **Bad** if any of the six components scores below 3, or if examples replace the description instead of supporting it. A description is labeled **Good** only if all six components score 3 or higher.

### Tier 1: Deterministic structural checks (CI)

These tests require no LLM calls. They are fast, cheap, and fully deterministic — run them on every commit.[^21] They serve as proxy indicators for the rubric components. A failure here guarantees a rubric smell; passing here does not guarantee the rubric score is ≥ 3, because semantic quality requires judgment.

#### 1. Description presence and length

The Length and Completeness rubric defines sentence-count thresholds.[^10] Assert that every tool has a description, and that it meets a minimum sentence count.

**Pass criteria:**
- Every tool has a non-empty `description` field
- Description contains ≥ 3 sentences (rubric score ≥ 3)[^10]
- Recommended: ≥ 4 sentences for substantive tools (rubric score 5)[^10]

**How to count sentences:** Split on sentence-ending punctuation (`. `, `! `, `? `) accounting for common abbreviations (e.g., `e.g.`, `i.e.`). A simple regex like `/[.!?]\s+[A-Z]/` counts transitions. Exact counting is not critical — the rubric uses ranges ("two to three," "four or more"), so a rough count is sufficient.

```typescript
// Example: assert minimum sentence count
for (const tool of tools) {
  const sentences = tool.description!.split(/[.!?]\s+/).filter(s => s.length > 0);
  expect(sentences.length).toBeGreaterThanOrEqual(3);
}
```

#### 2. Rubric component markers

Each rubric component has structural markers that can be detected without an LLM. These are necessary-but-not-sufficient checks — their absence guarantees a smell, but their presence doesn't guarantee quality.

**Purpose:** The description should begin with or contain a clear statement of what the tool does. Check for an action verb in the first sentence.

**Usage Guidelines:** Look for language indicating when to use or not use the tool: phrases like "use this when," "use this to," "do not use," "instead use," "not suitable for."[^12]

**Limitations:** Look for explicit boundary language: "does not," "cannot," "only," "limited to," "will not return." Critically, check that limitations reference other tools by name when the server has tools with overlapping functionality.[^12] Vague limitations (e.g., self-referential phrases that don't name concrete boundaries) are worse than no limitations.[^14]

**Examples:** Look for concrete scenario language: "for example," "e.g.," "such as," or input/output patterns in the description text.

```typescript
// Example: check for rubric component markers across all tools
for (const tool of tools) {
  const desc = tool.description ?? "";

  // Usage guidelines: should indicate when to use
  expect(desc).toMatch(/\buse this\b|\buse when\b|\bdo not use\b|\binstead use\b/i);

  // Limitations: should state boundaries
  expect(desc).toMatch(/\bdoes not\b|\bcannot\b|\blimited to\b|\bonly\b|\bwill not\b/i);

  // Examples: should include concrete scenarios
  expect(desc).toMatch(/\bexample\b|\be\.g\.\b|\bfor instance\b|\bsuch as\b/i);
}
```

#### 3. Parameter descriptions

The MCP specification defines `inputSchema` as a JSON Schema object with `properties`.[^22] Each property can have a `description` field. The Parameter Explanation rubric requires every parameter to be explained with type, meaning, behavioral effect, and required/default status.[^13]

**Pass criteria:**
- Every property in `inputSchema.properties` has a non-empty `description` field
- The `description` is not just a repetition of the property name
- Enum-typed parameters list their valid values

```typescript
// Example: assert every parameter has a meaningful description
for (const tool of tools) {
  const properties = tool.inputSchema.properties ?? {};
  for (const [name, schema] of Object.entries(properties)) {
    const desc = (schema as Record<string, unknown>)["description"] as string;

    // Must exist and be non-empty
    expect(desc, `${tool.name}.${name} must have a description`).toBeTruthy();

    // Must not just repeat the property name
    expect(desc.toLowerCase()).not.toBe(name.toLowerCase());
  }
}
```

#### 4. Inter-tool disambiguation

When a server exposes multiple tools, tools with related functionality should cross-reference each other in their Limitations sections.[^12] This is testable by checking that each tool's description mentions at least one other tool name from the same server (where appropriate).

**Pass criteria:**
- For each tool, if the server has tools with overlapping domains, the Limitations section references the correct alternative tool by name
- No two tools have descriptions that could be confused for the same operation

```typescript
// Example: verify cross-references exist for tools with related names
const toolNames = tools.map(t => t.name);
for (const tool of tools) {
  const desc = tool.description ?? "";
  const otherTools = toolNames.filter(n => n !== tool.name);

  // At least one other tool should be mentioned in the description
  const mentionsOther = otherTools.some(name => desc.includes(name));
  expect(mentionsOther, `${tool.name} should reference related tools`).toBe(true);
}
```

> **Note:** This assertion assumes all tools in the server are related enough to warrant cross-references. For servers with clearly unrelated tools, scope this check to tool groups you define.

#### 5. Limitation quality guard

Vague or self-referential limitations actively hurt performance — in one domain, removing poorly written Limitations improved task success rate by 10 percentage points.[^14] Check for anti-patterns that indicate low-quality limitations.

**Anti-patterns to flag:**
- Self-referential phrases that don't name concrete boundaries (e.g., "this may require further investigation")
- Limitations that restate the purpose instead of stating boundaries
- Limitations sections shorter than one sentence

```typescript
// Example: flag vague limitation patterns
const vaguePatterns = [
  /\bmay require\b.*\binvestigation\b/i,
  /\brequires disambiguation\b/i,
  /\bfurther analysis\b/i,
  /\bsubject to\b.*\blimitations\b/i,
];

for (const tool of tools) {
  const desc = tool.description ?? "";
  for (const pattern of vaguePatterns) {
    expect(desc).not.toMatch(pattern);
  }
}
```

### Tier 2: FM-scored rubric evaluation (on-demand)

These tests use LLMs to score descriptions against the full rubric. They are non-deterministic and incur API costs — run them on-demand, not per commit.[^21] The paper's methodology uses a **multi-model jury** to reduce single-model bias.[^16]

#### Scoring prompt

Send each tool's complete definition (name, description, inputSchema) to the scoring LLM with this prompt structure, derived from the paper's Appendix A.1:[^23]

> You are grading a tool description. Score each component from 1 to 5, then provide a label, justification, and improvement recommendations.
>
> [Insert the six-component rubric table above]
>
> **Tool definition:**
> ```json
> {tool_payload}
> ```
>
> Respond with JSON only:

Expected output schema:

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

#### Multi-model jury

Use three LLMs from different model families to independently score each tool.[^16] The paper achieved good inter-rater reliability (ICC(2,1) ≥ 0.76 for five of six components) using models from OpenAI, Anthropic, and Alibaba families.[^24]

**Recommended jury composition:** Choose three models from at least two different providers. The specific models will change over time; what matters is family diversity.

**Aggregation:** For each tool and each component, compute the arithmetic mean of the three scores. A smell is detected if and only if the mean score falls below 3:[^16]

```
Smell Detected ⟺ (1/N) × Σ Score_i < 3
```

#### Pass/fail criteria

A tool description **passes** if:
- All six component means are ≥ 3 (no smells detected)
- The label is "Good"

A tool description **fails** if:
- Any component mean is < 3 (smell detected)
- Examples replace the description instead of supporting it

#### When to run

Run Tier 2 tests:
- When adding or substantially modifying a tool description
- Before a release that changes tool interfaces
- Periodically (e.g., monthly) as a quality audit
- When Tier 1 structural checks pass but downstream Agent Behavior tests show regressions — the rubric scores help diagnose whether description quality is the root cause[^25]

---

## Evidence base

Hasan et al.'s primary contribution is a **six-component rubric** derived from official MCP documentation, 15 community sources, and open coding with inter-rater agreement of Jaccard 0.92.[^15] Smells are detected when the mean score across a multi-model jury (3 FMs from different families) falls below 3.[^16]

Key findings:
- 97.1% of tool descriptions contain at least one smell.[^17]
- The most prevalent smells are Unstated Limitations (89.8%), Missing Usage Guidelines (89.3%), and Opaque Parameters (84.3%).[^18]
- Official servers (Anthropic, GitHub, PayPal) are statistically indistinguishable from community servers in quality — all p-values > 0.17 with Bonferroni correction.[^19]
- The tool description has a **dual nature**: it is simultaneously a requirement-like specification and a prompt-like instruction.[^20]

---

## Footnotes

[^1]: Hasan et al. §3.1, point (1): "Discovery — The client queries connected servers via reflection to list available tools and their metadata."

[^2]: Hasan et al. §1: "the FM selects the correct tool and infers the tool's arguments, e.g., ticker='AAPL' and financial_type='quarterly_income_statement'"

[^3]: Hasan et al. §6.3: "the smaller-sized Qwen3-Next-80B-A3B-Instruct model, when equipped with augmented tool descriptions, achieves performance parity with or even surpasses the significantly larger Qwen3-Coder-480B-A35B in domains such as Finance, Repository Management, and Location Navigation"

[^4]: Hasan et al. §1: "if the tool descriptions are defective, underspecified, or misleading, the FM may select the wrong tool, supply invalid or suboptimal arguments, or take unnecessary interaction steps, ultimately reducing the reliability of MCP-enabled systems"

[^5]: Hasan et al. §4.1: Six components identified through "official MCP documentation search" (§4.1.1), "LLM-assisted survey for community guidelines" (§4.1.2), and "open coding to identify components of tool description" (§4.1.3).

[^6]: Hasan et al. §6.1: "developers should first identify and optimize the most impactful components for their tools that convey critical semantic intent with minimal text"

[^7]: Hasan et al. §4.1.4: "We implement a 5-point Likert scale rubric for each component...We designate score 3 as the minimum threshold: it represents a 'Minimum Viable' description."

[^8]: Hasan et al. §4.1.4: "scores in the smelly zone (Score < 3) directly indicate a corresponding smell"

[^9]: Hasan et al. §5.1/Table 2: "44.0% for Purpose alone...the proportion declines to 7.5% when analyzing tools that combine Purpose, Guidelines, and Limitations...and drops to a mere 2.9% when all five components in the description are required to be smell-free"

[^10]: Hasan et al. Appendix A.1, Length and Completeness rubric: Score 5 = "Four or more sentences of substantive, well-structured prose covering all aspects."

[^11]: Hasan et al. §5.2: "the average number of execution steps increases by 67.46% (median)"

[^12]: Hasan et al. Appendix A.1, Usage Guidelines rubric: Score 5 = "Explicitly states appropriate use cases and when not to use; includes disambiguation if the tool name is ambiguous."

[^13]: Hasan et al. Appendix A.1, Parameter Explanation rubric: Score 5 = "Every parameter is explained with type, meaning, behavioral effect, and required/default status."

[^14]: Hasan et al. §5.3: "the Limitations component of the same tool includes vague or self-referential statements such as 'this contradiction requires disambiguation before relying on intraday availability', which can introduce uncertainty into the model's reasoning"; P+G achieved 67.50% vs. FR 57.50% in Finance/GPT-4.1 (Table 7).

[^15]: Hasan et al. §4.1: "mean Jaccard similarity = 0.92" across 15 sources identified via LLM-assisted survey.

[^16]: Hasan et al. §4.3.2–4.3.3: Multi-model jury using "three distinct FMs from three disparate families" with smell threshold at mean score < 3.

[^17]: Hasan et al. §5.1: "97.1% of tool descriptions contain at least one smell"

[^18]: Hasan et al. §5.1/Figure 7: Unstated Limitations (89.8%), Missing Usage Guidelines (89.3%), Opaque Parameters (84.3%).

[^19]: Hasan et al. §5.1/Table 3: "none of the components show statistically significant differences between official and community servers; all raw p-values exceed 0.17 and all corrected p-values equal 1.0"

[^20]: Hasan et al. §1: "the tool description...embodies a dual nature, as it serves as (i) a requirement-like specification that defines the tool's expected behavior and parameter constraints, and (ii) a prompt-like instruction that shapes the model's contextual reasoning and decision-making"

[^21]: Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog. Base layer: "fast, cheap, and completely deterministic." CI philosophy: "Don't run live LLM tests in CI. Too expensive, too slow, too flaky." ([source](https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents); local copy: `sources/block-testing-pyramid-ai-agents.md`)

[^22]: MCP Specification, Tools (2025-06-18): Tool definitions include `name`, `description`, `inputSchema`, and optional `outputSchema` and `annotations`. Discovery via `tools/list` returns an array of these definitions. ([spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), local copy: `sources/mcp-spec-tools-2025-06-18.md`; [concepts](https://modelcontextprotocol.io/docs/concepts/tools), local copy: `sources/mcp-spec-tools-concepts.md`)

[^23]: Hasan et al. Appendix A.1: Labeling rules — "A description is labeled Bad if: Any of the six rubric dimensions score below 3, or Examples replace the description instead of supporting it. A description is labeled Good only if: All six dimensions score 3 or higher."

[^24]: Hasan et al. §4.3.2–4.3.3: ICC(2,1) values: Purpose 0.82, Guidelines 0.85, Limitations 0.84, Parameter Explanation 0.90, Length and Completeness 0.76, Examples 0.62. Five of six components achieved "good reliability" (0.75–0.90); Examples showed "moderate reliability" (0.50–0.75).

[^25]: Hasan et al. §5.2: Augmented tool descriptions yield +5.85pp SR improvement, demonstrating the causal link between description quality and downstream agent behavior. When Agent Behavior tests regress, rubric scores help diagnose whether description quality is the root cause.

[^26]: Hasan et al. §4.4.3: "We do not include a separate field for Length and Completeness. This component functions as a meta-quality dimension of the overall tool description and is automatically fulfilled when the other five components are properly populated."

[^27]: OpenAI, "Evaluation Best Practices": "No strategy is perfect. The quality of LLM-as-Judge varies depending on problem context while using expert human annotators to provide ground-truth labels is expensive and time-consuming." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)

[^28]: Anthropic, "Building Evals" cookbook: "Grading is a cost you will incur every time you re-run your eval, in perpetuity." Also: "Code-based grading is the best grading method if possible, as it is fast and highly reliable." ([source](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/building_evals.ipynb); local copy: `sources/anthropic-building-evals.md`)

[^29]: Anthropic, "Demystifying Evals for AI Agents": "Prefer deterministic graders where possible; use LLM graders where necessary." ([source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); local copy: `sources/anthropic-demystifying-evals.md`)

[^30]: OpenAI, "Evaluation Best Practices": "Not calibrating your automated metrics against human evals" is explicitly warned against. Scalability path: "Once the LLM judge reaches a point where it's faster, cheaper, and consistently agrees with human annotations, scale up." ([source](https://developers.openai.com/api/docs/guides/evaluation-best-practices); local copy: `sources/openai-evaluation-best-practices.md`)
