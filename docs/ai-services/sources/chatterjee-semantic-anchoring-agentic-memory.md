# Semantic Anchoring in Agentic Memory: Leveraging Linguistic Structures for Persistent Conversational Context

> **Source:** Chatterjee, M. & Agarwal, D. (2025). "Semantic Anchoring in Agentic Memory: Leveraging Linguistic Structures for Persistent Conversational Context."
>
> **URL:** https://arxiv.org/abs/2508.12630
>
> **Retrieved:** 2026-03-08

## Abstract

The researchers address limitations in how language models maintain context across extended interactions. They propose a hybrid memory system that combines traditional vector-based storage with explicit linguistic analysis to better preserve nuanced conversational details.

## Key Findings

- Standard RAG systems neglect syntactic dependencies, discourse relations, and coreference links
- Semantic anchoring (combining dependency parsing, discourse tagging, coreference resolution) improves factual recall and discourse coherence by **up to 18% over strong RAG baselines** on adapted long-term dialogue datasets
- The system integrates:
  - **Dependency parsing** to capture syntactic relationships
  - **Coreference resolution** to track entity references across exchanges
  - **Discourse relation tagging** to preserve conversational flow and logical connections

## Relevance to MCP Chatbot Testing

This paper demonstrates that coreference resolution across conversational turns is a measurable quality dimension — not just an intuitive concern. The 18% improvement from explicit coreference tracking suggests that agents without this capability lose significant accuracy when users reference prior tool results indirectly. This supports testing coreference resolution as a first-class concern in chatbot integration testing.
