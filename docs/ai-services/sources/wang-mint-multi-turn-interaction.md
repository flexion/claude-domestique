# MINT: Evaluating LLMs in Multi-turn Interaction with Tools and Language Feedback

> **Source:** Wang, X., Wang, Z., Liu, J., Chen, Y., Yuan, L., Peng, H., & Ji, H. (2024). "MINT: Evaluating LLMs in Multi-turn Interaction with Tools and Language Feedback." ICLR 2024.
>
> **URL:** https://arxiv.org/abs/2309.10691
>
> **Retrieved:** 2026-03-08

## Abstract

MINT addresses a significant gap by emphasizing how models handle nuanced interactions between users, LLMs, and external tools while incorporating natural language feedback. The evaluation framework enables Python code execution for tool access and GPT-4-simulated user feedback across 20 open- and closed-source language models.

## Key Findings

- Models generally benefit from repeated tool interactions, gaining **1–8% in performance** for each successive turn of tool utilization
- Natural language feedback integration produced **2–17% performance gains** per feedback turn
- **"Better single-turn performance does not guarantee better multi-turn performance"** — benchmark scores may not reliably predict real-world interactive capabilities
- Supervised instruction-finetuning (SIFT) and reinforcement learning from human feedback (RLHF) **"generally hurt multi-turn capabilities"** among evaluated models

## Relevance to MCP Chatbot Testing

This paper provides the primary empirical evidence that single-turn and multi-turn tool use performance are fundamentally different capabilities. A model that selects tools correctly in isolation may fail in multi-turn conversations, and vice versa. This justifies dedicated multi-turn testing as a separate concern from single-turn Agent Behavior testing.
