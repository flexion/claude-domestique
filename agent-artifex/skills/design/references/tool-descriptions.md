# Tool Description Design — Design Reference

Tool descriptions are the root cause of most downstream quality issues. They are simultaneously a specification and a prompt instruction — the LLM reads them to decide what to do.[^1]

[^1]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "tool descriptions have a dual nature, functioning both as a requirement-like specification...and as a prompt-like instruction."

## Design Principles

**1. Purpose is the most critical component.** 44% of tools are smell-free on Purpose alone, but quality drops sharply when checking multiple components — down to just 2.9% across all five.[^2] Purpose must unambiguously state what the tool does and when to use it.

[^2]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "44% of tools are smell-free on Purpose alone...quality drops sharply when checking multiple components: 10.4% with Guidelines, 7.5% with Limitations, 3.0% with Parameters, and just 2.9% across all five."

**2. Usage Guidelines provide the highest-leverage behavioral cues.** Purpose + Guidelines alone can outperform full augmentation (67.50% vs 57.50% SR in Finance/GPT-4.1).[^3] Guidelines should include operational rules — domain-specific cues the LLM cannot infer from the tool name.[^4]

[^3]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "In Finance, the P+G configuration yields the highest SR of 67.50%, surpassing the full augmentation SR of 57.50%."
[^4]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "the Guidelines component provides critical operational cues (e.g., 'requested dates should include trading days' and 'set end_date one day later than expected')."

**3. Limitations must be concrete or absent.** Vague limitations degrade performance worse than no limitations at all — removing poorly written Limitations improved SR by 10 percentage points.[^5] Each limitation should name a specific constraint and cross-reference the alternative tool by name.

[^5]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Removing poorly written Limitations improved SR by 10 percentage points" in Finance/GPT-4.1.

**4. Examples are statistically dispensable.** Removing examples does not significantly degrade performance.[^6] FM-generated examples risk hallucination without execution traces.[^7] If you include examples, ensure they are derived from actual execution, not synthesized.

[^6]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Removing Examples does not significantly degrade performance (Cochran's Q, p > 0.20)."
[^7]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "the model cannot reliably generate factually grounded examples without execution traces, and doing so would risk introducing hallucinated or incorrect examples."

**5. Length is a trade-off, not a goal.** Augmented descriptions increase execution steps by 67.46% (median).[^8] Descriptions should be substantive (>=4 sentences) but concise. Optimize for the most impactful components (Purpose, Guidelines), not comprehensiveness.

[^8]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "augmented descriptions increase execution steps by 67.46% (median)" — Wilcoxon signed-rank, p < 0.001.

**6. Descriptions are domain-and-model-dependent.** No single configuration works universally.[^9] Test your specific descriptions against your specific model and domain. What improves Finance/GPT-4.1 may degrade Travel/Claude.

[^9]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "No single component combination consistently improves performance across all domains and models."

**7. Treat descriptions as first-class engineering artifacts.** Small refinements yield dramatic improvements — Claude Sonnet 3.5 achieved state-of-the-art SWE-bench performance after precise description refinements.[^10] Quality should be a blocking criterion for release.[^11]

[^10]: Anthropic, "Writing Tools for Agents" — "Even small refinements to tool descriptions can yield dramatic improvements...Claude Sonnet 3.5 achieved state-of-the-art performance on the SWE-bench Verified evaluation after we made precise refinements to tool descriptions."
[^11]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "Treat tool descriptions as first-class engineering artifacts — quality should be a blocking criterion for release."

## Assessment Criteria

- Apply the six-component rubric (score >= 3 on each: Purpose, Usage Guidelines, Limitations, Parameter Explanation, Examples, Length)
- Check for inter-tool disambiguation (overlapping tools cross-reference each other)
- Verify length is >= 4 sentences but not gratuitously verbose
- 97.1% of descriptions have at least one smell — assume yours do too until proven otherwise[^12]

[^12]: Hasan et al., "MCP Tool Descriptions Are Smelly!" — "97.1% of tool descriptions contain at least one smell...Official servers (Anthropic, GitHub, PayPal) are statistically indistinguishable from community servers (all p-values > 0.17 with Bonferroni correction)."

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Tool Description Quality)

**Related design areas:** [Parameter & Schema Design](parameter-schema.md) (parameters are part of the description), [Tool Set Architecture](tool-set-architecture.md) (inter-tool disambiguation)
