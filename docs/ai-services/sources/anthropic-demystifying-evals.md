# Demystifying Evals for AI Agents — Anthropic Engineering

> **Source:** https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
>
> **Retrieved:** 2026-03-08

## Key Excerpts

### Groundedness and Faithfulness

> "Groundedness checks verify that claims are supported by retrieved sources, coverage checks define key facts a good answer must include, and source quality checks confirm the consulted sources are authoritative, rather than simply the first retrieved."

### Grading Outcomes vs. Tool Sequences

> "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid and results in overly brittle tests, as agents regularly find valid approaches that eval designers didn't anticipate."

> "It's often better to grade what the agent produced, not the path it took."

### Evaluation Harness

> "An evaluation harness is the infrastructure that runs evals end-to-end. It provides instructions and tools, runs tasks concurrently, records all the steps, grades outputs, and aggregates results."

> "Each trial should be 'isolated' by starting from a clean environment. Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures."

### Partial Credit

> "For tasks with multiple components, build in partial credit. A support agent that correctly identifies the problem and verifies the customer but fails to process a refund is meaningfully better than one that fails immediately."

### Verifying Claims

> "An LLM can flag unsupported claims and gaps in coverage but also verify the open-ended synthesis for coherence and completeness."
