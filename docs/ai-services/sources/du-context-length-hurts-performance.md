# Context Length Alone Hurts LLM Performance Despite Perfect Retrieval

> **Source:** Du, Y., Tian, M., Ronanki, S., Rongali, S., Bodapati, S.B., Galstyan, A., Wells, A., Schwartz, R., Huerta, E.A., & Peng, H. (2025). "Context Length Alone Hurts LLM Performance Despite Perfect Retrieval." Findings of EMNLP 2025.
>
> **URL:** https://aclanthology.org/2025.findings-emnlp.1264/
>
> **Retrieved:** 2026-03-08

## Key Findings

- "The sheer length of the input alone can hurt LLM performance, independent of retrieval quality and without any distraction"
- Models showed **substantial declines of 13.9%–85%** as input length increased, despite operating within claimed context windows
- Performance dropped even when irrelevant tokens were replaced with whitespace or masked entirely, forcing models to attend only to relevant information
- **Position independence:** Similar performance losses occurred when all relevant evidence appeared immediately before questions
- Mitigation: prompting models to recite retrieved evidence before solving problems transforms long-context tasks into short-context ones, showing up to 4% gains for GPT-4o

## Relevance to MCP Chatbot Testing

This paper demonstrates that context length itself — not just information position — degrades LLM performance. This is critical for chatbot testing because multi-turn conversations accumulate context (tool results, prior messages) that increases length even when the relevant tool definitions remain well-positioned. Context pressure testing should account for length as an independent degradation factor, separate from the "lost in the middle" positional effect.
