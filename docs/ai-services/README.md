# docs/ai-services — Canonical Reference Documents

Source documentation for the `ai-services` plugin. These documents contain the full evidence base, design principles, and testing methodology that the plugin's skills distill into actionable guidance.

**Skills do not load these files by default.** They are too large for routine context. Skills read from the lighter `ai-services/references/` files instead and point here for deep dives.

## Documents

### Design

| Document | What it covers |
|---|---|
| [`design-for-quality.md`](design-for-quality.md) | 7 design areas that determine response quality: tool descriptions, parameter schemas, error messages, system prompts, multi-turn conversations, tool set architecture, and response formats. Each principle cited with evidence. |

### Testing (organized by the causal chain)

| Document | Causal Chain Link | What it covers |
|---|---|---|
| [`framework.md`](framework.md) | All | The causal chain, MCP runtime interaction loop, impact/effort analysis, and how the testing areas connect. |
| [`tool-description-quality.md`](tool-description-quality.md) | Discovery | Six-component rubric, smell taxonomy, augmentation experiments, component ablation study. |
| [`agent-behavior.md`](agent-behavior.md) | Tool Selection | Scenario design, three metrics (SR/AE/AS), recorded replay, multi-model stability. |
| [`server-correctness.md`](server-correctness.md) | Invocation | Output schema validation, error structure, golden-file testing, FM recovery. |
| [`response-accuracy.md`](response-accuracy.md) | Full Loop | Faithfulness, completeness, claim decomposition, closed-loop harness, two-tier grading. |
| [`chatbot-testing.md`](chatbot-testing.md) | Multi-Turn | Coreference resolution, context pressure, workflow orchestration, graceful degradation. |

### Sources

| Directory | What it contains |
|---|---|
| [`sources/`](sources/) | 17 indexed research sources — papers, specifications, and vendor documentation. See [`sources/INDEX.md`](sources/INDEX.md) for the full annotated index by topic. |

## How these documents relate

```
design-for-quality.md          "Design it well"
        │                       (7 areas, 43 principles)
        │
        ▼
framework.md ─────────────┐    "Test it thoroughly"
        │                 │     (causal chain, testing pyramid)
        ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ tool-descr-  │  │ agent-       │  │ server-      │  │ response-    │  │ chatbot-     │
│ iption-      │  │ behavior.md  │  │ correctness  │  │ accuracy.md  │  │ testing.md   │
│ quality.md   │  │              │  │ .md          │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
                                           │
                                    sources/INDEX.md
                                    (17 research sources)
```

## Adding new documents

When adding a new reference document:

1. Ground every claim in a source from `sources/`. If a new source is needed, add it to `sources/` and register it in `sources/INDEX.md`.
2. Use inline footnotes with quote snippets — the same citation style used throughout these documents.
3. Update this README to include the new document in the appropriate table.
