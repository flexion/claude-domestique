# FACTS Grounding — Google DeepMind

> **Source:** Google DeepMind (2024). "FACTS Grounding: A new benchmark for evaluating the factuality of large language models."
>
> **URL:** https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/
>
> **Retrieved:** 2026-03-08

## What It Measures

FACTS Grounding evaluates whether LLMs can "generate responses that are not only factually accurate with respect to given inputs, but also sufficiently detailed to provide satisfactory answers."

## Core Definition: "Fully Grounded"

Responses are "judged as factually accurate if they are fully grounded in information contained in the provided document, with no hallucinations."

## Evaluation Methodology

### Two-Phase Assessment

1. **Eligibility Phase**: Responses evaluated for adequately addressing the user's request.
2. **Grounding Phase**: Responses assessed for factual accuracy without hallucinations.

### Multi-Judge System

Three frontier LLMs (Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet) independently evaluate each response. This mitigates bias toward any single model family.

## Dataset Composition

- 1,719 examples total (860 public, 859 private)
- Documents up to 32,000 tokens across finance, technology, retail, medicine, and law
- Tasks include summarization, Q&A, and rewriting (excludes tasks requiring advanced reasoning or creativity)

## Key Problem Statement

LLMs can "hallucinate" false information, particularly with complex inputs, which erodes trust and limits real-world applications.
