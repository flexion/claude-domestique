# An Empirical Study of Testing Practices in Open Source AI Agent Frameworks and Agentic Applications

> **Source:** Hasan, M.M., Li, H., Fallahzadeh, E., Rajbahadur, G.K., Adams, B., & Hassan, A.E. (2025). "An Empirical Study of Testing Practices in Open Source AI Agent Frameworks and Agentic Applications."
>
> **URL:** https://arxiv.org/abs/2509.19185
>
> **Retrieved:** 2026-03-08

## Key Findings

Examined 39 open-source agent frameworks and 439 agentic applications:

- **Over 70% of testing focuses on deterministic components** (tools and workflows)
- **Less than 5% addresses the FM-based planning component**
- **Approximately 1% covers prompt testing** (the trigger component)
- Developers primarily use traditional methods like "negative and membership testing" to manage uncertainty
- Specialized approaches like DeepEval see minimal adoption (around 1%)

## Core Problem

> "A critical blind spot, as the Trigger component (prompts) remains neglected."

Developers have adapted incompletely to non-determinism inherent in foundation models.

## Recommendations

- Framework developers should enhance support for novel testing methodologies
- Application developers must implement prompt regression testing
- Researchers should investigate barriers preventing adoption of advanced testing techniques

## Relevance to MCP Chatbot Testing

This study quantifies the testing gap: deterministic components (tool schemas, server logic) receive the vast majority of testing effort, while the behavioral components that matter most in chatbot contexts (tool selection, argument quality, multi-turn orchestration) receive almost none. This validates the need for dedicated chatbot integration testing guidelines.
