# Evaluation Best Practices — OpenAI

> **Source:** OpenAI Developer Documentation.
>
> **URL:** https://developers.openai.com/api/docs/guides/evaluation-best-practices
>
> **Retrieved:** 2026-03-08

## Evaluation Types

### Metric-Based Evals
- Quantitative: exact match, string matching, ROUGE/BLEU, function call accuracy, executable evals
- "May not be tailored to specific use cases, may miss nuance"

### Human Evals
- Highest quality; randomized, blinded tests
- Multiple review rounds, clear examples of different score levels
- Consensus voting across reviewers
- Constraint: expensive, slow

### LLM-as-Judge
- "Strong LLM judges like GPT-4.1 can match both controlled and crowdsourced human preferences, achieving over 80% agreement"
- Approaches: pairwise comparison, single answer grading, reference-guided grading
- Challenges: "Position bias (response order), verbosity bias (preferring longer responses)"
- "LLMs are better at discriminating between options. Therefore, evaluations should focus on tasks like pairwise comparisons, classification, or scoring against specific criteria instead of open-ended generation."

## Cost and Effort

> "No strategy is perfect. The quality of LLM-as-Judge varies depending on problem context while using expert human annotators to provide ground-truth labels is expensive and time-consuming."

Scalability path: "Once the LLM judge reaches a point where it's faster, cheaper, and consistently agrees with human annotations, scale up."

## Architecture-Specific Evaluation Needs

### Single-Turn
- Instruction following, functional correctness

### Workflow
- Same evals applied at each step

### Single-Agent (tool-using)
- Adds **tool selection**: "Evaluations that test whether the agent is able to select the correct tool to use"
- Adds **data precision**: "Evaluations that verify the agent calls the tool with the correct arguments"

### Multi-Agent
- Adds **agent handoff**: "Evaluations that test whether each agent can appropriately recognize the decision boundary for triaging to another agent"

## Effort Allocation

> "The decision to use a multi-agent architecture should be driven by your evals. Starting with a multi-agent architecture adds unnecessary complexity."

> "Adopt eval-driven development: Evaluate early and often. Write scoped tests at every stage."

> "It's a journey, not a destination: Evaluation is a continuous process."

> "Not calibrating your automated metrics against human evals" is explicitly warned against.
