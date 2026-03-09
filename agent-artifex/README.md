# agent-artifex — AI Services Design & Testing Plugin

A suite of skills for designing and testing AI tool sets and agents — MCP servers, chatbots, and tool-calling systems — using evidence-based patterns from Anthropic, OpenAI, RAGAS, and academic research.

The framework's core claim: design quality and test coverage share a single causal chain — from tool descriptions through agent behavior and server correctness to the response the user actually receives. Good design makes systems testable; good tests reveal design gaps.

## Skills

| Skill | Purpose | Best when you... |
|-------|---------|-----------------|
| **agent-artifex:guide** | Entry point — routes to the right skill | Aren't sure where to start |
| **agent-artifex:foundations** | Complete framework reference overview | Need the big picture in one place |
| **agent-artifex:learn** | Socratic teaching through dialogue | Are new to AI services design/testing or want concepts to *click* |
| **agent-artifex:design** | Design principles for quality (7 areas) | Are building or improving an MCP server, agent, or chatbot |
| **agent-artifex:assess** | Diagnose design and testing gaps | Want to know what's missing and what to prioritize |
| **agent-artifex:implement** | Apply design improvements + write tests | Are ready to make code changes |

## Start Here: agent-artifex:guide

If you're not sure which skill to use, start with `agent-artifex:guide`. It asks what you're working on and routes you to the right path:

> "Are you designing a new AI service, improving an existing one, learning about AI services design and testing, or ready to implement changes?"

## The Causal Chain

The framework is organized around a causal chain — each link is independently designable and testable, and failures propagate downstream:

```
Tool Description Quality → Agent Behavior → Server Correctness → Response Accuracy
     (Discovery)            (Tool Selection)    (Invocation)         (full loop)
      leading                 leading              leading              OUTCOME
                                    ↑
                          Chatbot Integration
                            (multi-turn layer)
```

Response Accuracy is the only measure the user experiences. The other four are leading indicators that diagnose *why* response accuracy is high or low. When something goes wrong, trace backward through the chain.

## How the Skills Connect

```
                    ┌─────────────────────────┐
                    │   agent-artifex:guide    │  Entry point — routes to everything
                    └───────────┬─────────────┘
                                │
       ┌───────────┬────────────┼────────────────────┐
       ▼           ▼            ▼                    ▼
┌────────────┐ ┌─────────┐ ┌─────────────┐   ┌─────────────┐
│  Learning  │ │ Design  │ │  Assessing  │   │ Implementing│
│  concepts  │ │ quality │ │  gaps       │   │ changes     │
└─────┬──────┘ └────┬────┘ └──────┬──────┘   └──────┬──────┘
      │             │             │                  │
      ▼             ▼             ▼                  ▼
agent-artifex:  agent-artifex:  agent-artifex:   agent-artifex:
  foundations     design          assess           implement
agent-artifex:      │                │                ▲
  learn             └────────────────┼────────────────┘
                                (design informs assessment,
                                 assess identifies gaps,
                                 implement closes them)
```

## Seven Design Areas

1. **Tool Description Design** — clear, unambiguous descriptions that enable correct tool discovery and selection
2. **Parameter & Schema Design** — input/output schemas that constrain usage and communicate intent
3. **Error Message Design** — actionable error messages that guide LLM recovery without exposing internals
4. **System Prompt Design** — system prompts that complement tool descriptions without conflict or duplication
5. **Multi-Turn Conversation Design** — multi-turn flows that maintain context and handle degradation
6. **Tool Set Architecture** — tool organization, token budgeting, dynamic discovery, disambiguation
7. **Response Format Design** — consistent, verifiable result schemas that enable faithful synthesis

## Five Testing Areas

| Area | What it tests | Key metric |
|------|--------------|------------|
| **Tool Description Quality** | Description clarity, rubric compliance, disambiguation | Six-component rubric score (all means >= 3) |
| **Server Correctness** | Schema conformance, error actionability, result fidelity | Pass/fail on schema + error structure |
| **Agent Behavior** | Tool choice, argument quality, step efficiency | SR, AE, AS (run 5-10x, aggregate) |
| **Response Accuracy** | Faithfulness, completeness, correctness | Claim decomposition scores |
| **Chatbot Integration** | Coreference, context pressure, workflows, degradation | CRR, DASR, WCR |

## The Testing Pyramid

Three layers of uncertainty tolerance:

| Layer | What runs here | CI? | Cost |
|-------|---------------|-----|------|
| **Base: Deterministic** | Tool description structural checks, server schema validation, error structure, golden-file tests | Every commit | Near zero |
| **Middle: Recorded Replay** | Captured FM interactions replayed deterministically (TestProvider pattern) | After recording | Near zero |
| **Upper: Probabilistic** | Agent behavior scenarios, response accuracy evals, chatbot integration | On-demand | LLM API costs |

## Relationship to claude-api:mcp-builder

`claude-api:mcp-builder` scaffolds MCP servers — it gets you a working structure fast. `agent-artifex` makes it *good* — applying design principles and test coverage that turn a scaffold into a production-quality service. They are complementary, not overlapping: mcp-builder for structure, agent-artifex for substance.

## Reference Architecture

The plugin uses progressive disclosure to manage context:

```
agent-artifex/
├── references/                 # Shared across all skills
│   ├── framework.md            #   Causal chain, pyramid, two-tier model
│   ├── metrics.md              #   All formulas (SR/AE/AS, Faithfulness, CRR...)
│   ├── rubric.md               #   Six-component rubric, labeling rules
│   └── evidence.md             #   Key empirical numbers, source index
├── skills/
│   ├── guide/SKILL.md          #   Entry point router
│   ├── foundations/SKILL.md    #   Reference overview
│   ├── learn/SKILL.md          #   Socratic tutor
│   ├── design/
│   │   ├── SKILL.md            #   Design principles router
│   │   └── references/         #   Per-area design guidance
│   │       ├── tool-descriptions.md
│   │       ├── parameter-schema.md
│   │       ├── error-messages.md
│   │       ├── system-prompts.md
│   │       ├── multi-turn.md
│   │       ├── tool-set-architecture.md
│   │       └── response-format.md
│   ├── assess/SKILL.md         #   Gap analysis (design + testing)
│   └── implement/
│       ├── SKILL.md            #   Implementation guidance
│       └── references/         #   Per-area code patterns & prompts
│           ├── tool-descriptions.md
│           ├── server-correctness.md
│           ├── agent-behavior.md
│           ├── response-accuracy.md
│           └── chatbot-testing.md
└── .claude-plugin/
    └── plugin.json
```

Skills read shared references on demand. The `implement` skill additionally reads per-area implementation references containing working TypeScript/Python code, prompt templates, and pass/fail criteria.

## Evidence Base

The framework draws from empirical research including Hasan et al. (tool description quality, 231 tasks, 202 tools), MCP Specification, Anthropic (evals, tool use), Block Engineering (testing pyramid for AI agents), RAGAS (faithfulness/completeness), Google DeepMind (FACTS Grounding), Wang et al./MINT (multi-turn degradation), and others.
