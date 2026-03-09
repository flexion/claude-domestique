# Response Format Design — Design Reference

Tool results are the raw material from which the LLM synthesizes the user's answer. The shape, consistency, and fidelity of results directly determine whether the response is faithful and complete. A malformed result degrades every subsequent FM decision.[^1]

[^1]: MCP Specification (2025-06-18) — tool results feed directly into the FM's context for the next iteration. Fowler, "ContractTest" — "the format of the data matters rather than the actual data." A malformed result degrades every subsequent decision because the LLM reasons over it as ground truth.

## Design Principles

**1. Result schemas must be consistent across tools.** When tools return data in unpredictable shapes, the LLM must guess how to parse each result. Use the same field names, nesting patterns, and data types for equivalent concepts across your entire tool set. The format of the data matters rather than the actual data.[^2]

[^2]: Fowler, "ContractTest" — "the format of the data matters rather than the actual data."

**2. Results must accurately reflect domain state.** The LLM reasons directly over tool results. Faithfulness scoring measures supported claims divided by total claims — a score of 1.0 means no hallucinations.[^3] But faithfulness evaluation only works if the tool results themselves are correct. Garbage in, faithful garbage out.

[^3]: RAGAS (Es et al., arXiv:2309.15217) — Faithfulness = supported claims / total claims. A score of 1.0 means no hallucinations — but only works if the tool results themselves are correct.

**3. Design results for both machine parsing and LLM synthesis.** Support JSON for programmatic validation and structured text for LLM reasoning. Avoid raw data dumps that force heavy transformation. A tool that returns a 500-row CSV when the user asked for a summary wastes context and degrades reasoning.

**4. Control result verbosity to manage context pressure.** Every token stays in context for the rest of the conversation, and context length alone causes 13.9–85% performance degradation.[^4] Return what the user needs, not everything the API provides. Use pagination (has_more/next_offset/total_count) for large result sets.

[^4]: Du et al., (EMNLP Findings 2025) — Context length alone causes 13.9%–85% performance degradation.

**5. Use the two-phase quality standard.** Phase 1 — Eligibility: does the response answer the query? Phase 2 — Grounding: is every claim traceable to a tool result? Both must pass.[^5] Design tool results so both checks are possible — results must contain enough information for the LLM to answer (eligibility) and enough specificity to verify claims against (grounding).

[^5]: Google DeepMind, FACTS Grounding — Two-phase evaluation: eligibility (does it answer the query?) then grounding (is it factually grounded?). Must pass both.

**6. Design for claim decomposition.** Tool results should contain discrete, verifiable facts — counts, IDs, statuses, dates, named entities. Ambiguous aggregations ("several," "many") undermine verification. Break responses into atomic claims and verify each against evidence.[^6]

[^6]: Anthropic, "Demystifying Evals for AI Agents" — Break responses into atomic claims and verify each against evidence. Grading approach: "Prefer deterministic graders where possible; use LLM graders where necessary."

## Assessment Criteria

- All tools declare output schemas and conform to them
- Equivalent concepts use the same field names and types across tools
- Result payloads are sized for context budget (no gratuitous fields)
- Large result sets use pagination
- Results contain discrete, verifiable facts (counts, IDs, statuses) not just narrative
- Non-deterministic fields (UUIDs, timestamps) follow predictable patterns

---

**Related testing:** To test these design decisions → `agent-artifex:implement` (area: Server Correctness + Response Accuracy)

**Related design areas:** [Parameter & Schema Design](parameter-schema.md) (output schemas bridge both areas), [Multi-Turn Conversation Design](multi-turn.md) (result verbosity drives context growth), [Error Message Design](error-messages.md) (error responses are a response format)
