# Testing Pyramid for AI Agents — Block Engineering

> **Source:** Jones, A. (2026). "Testing Pyramid for AI Agents." Block Engineering Blog.
>
> **URL:** https://engineering.block.xyz/blog/testing-pyramid-for-ai-agents
>
> **Retrieved:** 2026-03-08

## Key Thesis

The traditional testing pyramid breaks down for AI agents because "agents change what 'working' even means" and "traditional testing assumes that given the same input, you get the same output. Agents break that assumption immediately."

The paradigm shift: layers no longer represent test types but rather "how much uncertainty you're willing to tolerate."

## Pyramid Layers

### Base Layer: Deterministic Foundations
- Traditional unit tests: retry behavior, max turn limits, tool schema validation, extension management, subagent delegation
- Mock providers return canned responses — "fast, cheap, and completely deterministic"
- Answers: "Did we write correct software?" If flaky, "the problem lies with the software, not AI"

### Middle Layer: Reproducible Reality
- Record reality once, replay forever
- Recording mode: real MCP servers run, capture full interactions
- Playback mode: exact sessions replay deterministically without external dependencies
- Assertions focus on "tool call sequences and interaction flow," not exact outputs
- Same pattern for LLMs: TestProvider records/replays keyed by input message hash

### Upper Layer: Probabilistic Performance
- Structured benchmarks: task completion, tool selection appropriateness, expected artifact production
- "These benchmarks run multiple times and aggregate results"
- "A single run tells us almost nothing but patterns tell us everything"
- Regression means "success rates dropped," not "the output changed"

### Top Layer: Vibes and Judgment
- LLM-as-judge with clear rubrics
- Three evaluation runs per task; majority result smooths randomness
- If all three differ, fourth tiebreaker round
- "If we don't test vibes, our users will"

## CI/CD Philosophy

> "Don't run live LLM tests in CI. Too expensive, too slow, too flaky."

- CI validates the deterministic layers
- Benchmarks run on-demand, not per pull request
- "Humans validate the rest when it matters"

## Key Quote

> "The testing pyramid has evolved. The bottom still matters (probably more than ever), and the top is no longer optional."
