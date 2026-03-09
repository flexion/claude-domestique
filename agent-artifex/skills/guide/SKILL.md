---
name: agent-artifex:guide
description: |
  Use when the user is unsure which AI services skill to invoke, asks for "AI services guidance" generally, says "help me design my MCP server", "how should I structure my tools?", "what makes a good tool description?", "how do I design my agent?", "help me test my MCP server", "how should I test my agent?", "what testing do I need?", "my tests are flaky", "the agent picks the wrong tool", "how do I set up CI for AI tests?", or wants a structured guided experience that routes across multiple AI services skills. Also use when the user mentions designing or testing chatbots, tool descriptions, evals, or agent behavior without specifying a particular skill.
---

# agent-artifex:guide — AI Services Design & Testing Guide

## When to Use

Invoke `agent-artifex:guide` when:
- You're not sure which AI services skill to use — the guide routes you to the right one
- You want a structured guided experience
- You're working on a project that might need design help or multiple kinds of testing
- You want the skill suite to behave like a consultant that asks the right question first

For faster, more direct access, invoke the atomic skills directly (see table below).

---

## Orienting Question

On invocation, `agent-artifex:guide` asks exactly one question:

> **"Are you learning about designing and testing AI services, assessing gaps in an existing project, designing a new system, or ready to implement improvements?"**

User's answer determines the routing path below. Some answers don't fit neatly into one path — use the intent table at the bottom for common edge cases.

---

## Routing Logic

### Path 1: Learning

*User says: "I'm new to this," "explain the framework," "teach me about AI services," "what is faithfulness?"*

```
agent-artifex:foundations   → comprehensive reference overview
agent-artifex:learn         → interactive Socratic dialogue
```

Start with `foundations` if the user wants to read, `learn` if they want to be guided through it interactively.

### Path 2: Assessing

*User says: "What testing do we need?", "What are our gaps?", "We have some tests but I'm not sure they're enough," "We keep getting bad responses."*

```
agent-artifex:assess
  → [identifies design and testing gaps across the 5 areas]
  → prioritized recommendations
  → agent-artifex:implement (for areas that need improvement)
```

### Path 3: Designing

*User says: "Help me design my MCP server," "How should I structure my tools?", "What makes a good tool description?", "I need to plan my agent architecture."*

```
agent-artifex:design
  → [applies design principles to the user's problem]
  → tool description quality, server structure, agent architecture
  → agent-artifex:implement (when ready to build)
```

### Path 4: Implementing

*User says: "Help me improve my server," "I need to test my MCP server," "Write tool description quality checks," "Add evals for response accuracy," "Add tests."*

```
agent-artifex:implement
  → [determines which area(s) apply]
  → reads implementation references for code patterns
  → guides implementation with rubrics, formulas, and examples
```

### Path 5: Troubleshooting

*User describes a specific problem rather than a goal.*

Route based on symptom:

| Symptom | Route to | Why |
|---|---|---|
| "The FM picks the wrong tool" | `assess` then `implement` (Description Quality + Agent Behavior) | Likely a description quality problem — assess first, then fix |
| "Answers are wrong but the right tool was called" | `implement` (Response Accuracy) | FM synthesis problem — go straight to implementation |
| "Tests are flaky / too expensive" | `assess` | Probably LLM tests in CI — assess pyramid placement |
| "Quality degrades in long conversations" | `implement` (Chatbot Integration) | Context pressure or coreference — implement specific tests |
| "Works with one model but not another" | `implement` (Agent Behavior, multi-model stability) | Description sensitivity — implement cross-model scenarios |
| "Server errors confuse the FM" | `implement` (Server Correctness, error structure) | Error actionability — implement error path tests |
| "My tool descriptions are a mess" | `design` (Description Quality) | Needs design principles before implementation |
| "I have too many tools" | `design` (Server Structure) | Needs architectural guidance on tool decomposition |

---

## Skill Table

| Skill | Archetype | When to use directly |
|---|---|---|
| `agent-artifex:foundations` | Reference | "What is the framework?" "Give me the big picture." |
| `agent-artifex:learn` | Socratic | "Teach me about designing and testing AI systems." "Walk me through an example." |
| `agent-artifex:design` | Principles | "Help me design my MCP server." "What makes a good tool description?" |
| `agent-artifex:assess` | Assessment | "What design and testing gaps do we have?" "Audit our coverage." |
| `agent-artifex:implement` | Operational | "Help me improve my server." "Add tests." |

---

## The Causal Chain (quick reference)

```
Tool Description Quality → Agent Behavior → Server Correctness → Response Accuracy
     (Discovery)            (Tool Selection)    (Invocation)         (full loop)
      leading                 leading              leading              OUTCOME
                                    ↑
                          Chatbot Integration
                            (multi-turn layer)
```

Response Accuracy is the only measure the user experiences. The other four are leading indicators that diagnose *why* response accuracy is high or low. When something goes wrong, trace backward through the chain.

## Recommended Next Step

After routing, the guide hands off to the selected skill. If the user's needs span multiple skills, chain them: assess first to identify gaps, design to plan improvements, then implement to build them.
