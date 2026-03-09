# RAGAS: Evaluation Metrics

> **Source (paper):** Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2023). "RAGAS: Automated Evaluation of Retrieval Augmented Generation." arXiv:2309.15217. https://arxiv.org/abs/2309.15217
>
> **Source (docs):** https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/
>
> **Retrieved:** 2026-03-08

## Definition

The Faithfulness metric evaluates whether a response's claims are factually consistent with retrieved context, on a scale from 0 to 1.

## Formula

```
Faithfulness Score = (Number of claims supported by context) / (Total number of claims in response)
```

## How It Works

1. **Claim Decomposition:** The response is broken down into individual factual statements or claims.
2. **Verification Against Context:** Each claim is checked to determine whether it can be logically inferred from the retrieved context.
3. **Score Calculation:** The proportion of supported claims yields the final score.

## Key Quote

> "A response is considered **faithful** if all its claims can be supported by the retrieved context."

---

## Context Recall

> **Docs:** https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/

Context Recall measures "how many of the relevant documents (or pieces of information) were successfully retrieved." It breaks down reference answers into individual claims, then determines whether each claim can be supported by retrieved contexts.

**Formula:** (Number of supported claims) / (Total reference claims). Output: 0–1.

Requires reference data for comparison — essential for scenarios where missing relevant information is a significant concern.

---

## Factual Correctness

> **Docs:** https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/factual_correctness/

Factual Correctness "compares and evaluates the factual accuracy of the generated response with the reference." It operates in two stages:

1. **Claim Decomposition:** Breaks down both response and reference into individual claims.
2. **Natural Language Inference (NLI):** Compares claims to determine factual overlap.

**Metrics:**
- **Precision** = TP / (TP + FP) — response claims present in reference
- **Recall** = TP / (TP + FN) — reference claims present in response
- **F1 Score** = 2 × (Precision × Recall) / (Precision + Recall)

Mode can be set to "precision," "recall," or "f1" (default).
