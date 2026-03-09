# Lost in the Middle: How Language Models Use Long Contexts

> **Source:** Liu, N.F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2024). "Lost in the Middle: How Language Models Use Long Contexts." Transactions of the Association for Computational Linguistics (TACL).
>
> **URL:** https://arxiv.org/abs/2307.03172
>
> **Retrieved:** 2026-03-08

## Abstract

The researchers investigated how effectively language models utilize extended input contexts. They tested models on two tasks requiring identification of relevant information: multi-document question answering and key-value retrieval. Their findings indicate that "performance can degrade significantly when changing the position of relevant information," revealing a critical limitation in how these models access longer inputs.

## Key Findings

- Performance is highest when relevant information appears at the **beginning or end** of the input context
- Performance **degrades significantly** when relevant information is positioned in the **middle** of long contexts
- This U-shaped performance curve persists even in models explicitly designed for long contexts
- The finding has implications for any system that places information (such as tool definitions) at arbitrary positions within a large context window

## Relevance to MCP Chatbot Testing

This paper provides the empirical foundation for context pressure testing. In a multi-turn chatbot conversation, tool definitions are typically positioned at the beginning of context, but as conversation history grows, prior tool results and user messages push them further from both ends — into the "lost in the middle" zone. This predicts degradation in tool selection accuracy at conversation depths where tool definitions fall into the middle of the context window.
