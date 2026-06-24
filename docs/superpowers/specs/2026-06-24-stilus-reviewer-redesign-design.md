# Stilus Reviewer Redesign — Design

**Date:** 2026-06-24
**Status:** Approved design, pending implementation plan
**Repo:** claude-domestique (stilus plugin, branch `chore/add-stilus-plugin`)
**Amends:** `docs/superpowers/specs/2026-06-18-stilus-writing-plugin-design.md` (the Review phase)

## Overview

The original stilus design specified the Review phase as a single read-only agent
(`agents/reviewer.md`) that judged pipeline output and emitted a PASS/FAIL the
orchestrator looped back to the reviser. That agent was never built (it was Task 5 of the
implementation plan). This design replaces it before it is built.

The reviewer becomes a **dual-mode, orchestrated review phase**:

- It works **standalone** on existing or external prose (work the pipeline did not
  generate), not only on pipeline output.
- It reviews along **four dimensions**: correctness and content; voice (slop graded on a
  1–5 severity scale plus a human-perception read); and AI perception (does the point
  survive when an AI reads and summarizes the piece).
- It produces a **scored report with a verdict**, where every finding is grounded in a
  direct quotation from the reviewed document.

The single-agent shape does not survive one requirement: AI perception needs a *blind*
reader — an agent that judges what the prose conveys without knowing the intended point. A
subagent cannot spawn its own subagents, and an agent that already knows the intent cannot
summarize "cold." So review is lifted to an orchestrated phase that fans out to parallel
specialists and synthesizes their findings in the orchestrator's own context.

## Decisions

These were settled during brainstorming and drive the design:

1. **Review is an orchestrated phase, not a single self-contained agent.** The orchestrator
   spawns three read-only specialists in parallel, then synthesizes. This resolves the
   blind-reader constraint, gives each dimension an independent judge, and runs the
   specialists concurrently.
2. **Two entry points, both thin.** A new `/stilus:review <file-or-text>` command for
   standalone review, and the write skill's review step (plus its existing "critique only" /
   "review this" override path). Both run the identical review flow.
3. **Three specialists.** correctness; voice-critic (slop grading 1–5 **and**
   human-perception, kept in one agent because a high-severity slop finding and a "reader
   bails here" finding are usually the same span); and a blind summarizer.
4. **Synthesis runs in the orchestrator (main context).** It already holds the intended
   point, purpose, and audience, and it spawned the specialists. No dedicated synthesizer
   agent. Synthesis is where the blind-summary-vs-intent comparison (AI perception) happens.
5. **Shared synthesis logic lives in one context doc.** `stilus/context/reviewing.md` holds
   the scoring rubric, verdict rules, AI-perception comparison guidance, and report format,
   so the command and the skill do not duplicate it (the repo's Context Ownership rule).
6. **deslop is unchanged.** It remains the single source of truth for *what* slop is. The
   voice-critic detects independently against deslop's catalog and applies a review-specific
   severity scale on top; it does not restate the catalog.
7. **Output is a scored report + verdict** with every finding grounded in a direct
   quotation, its category, severity (1–5 for slop), the reason it is flagged, and a fix.
8. **Correctness verifies when it can and flags when it cannot.** Internal soundness plus
   verification against codebase/web where checkable, plus a "claims to verify by hand" list
   for what the reviewer cannot confirm itself.

## The four review dimensions

### 1. Correctness and content

Owned by the `review-correctness` specialist.

- **Internal soundness.** Claims supported by the piece's own stated evidence; no
  contradictions or unsupported leaps; the argument holds together.
- **Verify when possible.** When a claim is checkable from the codebase (claims about this
  repo) or the web (public facts), verify it and flag what is wrong or unsupported.
- **Flag for human.** A separate "claims to verify by hand" list for external or factual
  claims the reviewer cannot confirm itself, so nothing factual passes silently.
- **Accuracy over precision.** Flag specifics (numbers, dates, names, citations) that read as
  invented or unverifiable. This rule lives in deslop; the specialist references it.

### 2. Voice — graded slop (1–5)

Owned by the `review-voice` specialist. Detection runs against deslop's catalog (the SSOT);
the specialist references the catalog and applies the severity scale below.

Each slop finding is scored on a 1–5 scale (full guidance with quoted examples drafted
inline in the agent):

- **1 — Defensible.** A light tell that is arguable in context (e.g., one stray "robust").
  Worth noting, low priority.
- **2 — Minor.** Cut on sight, but harmless to meaning. A single filler word, a mild hedge.
- **3 — Noticeable.** A clear machine habit; a reader senses "an AI wrote this." A relief
  structure, a participial summary tail, a tricolon riding for rhythm.
- **4 — Degrading.** Actively erodes trust or clarity; often multiple stacked tells, booster
  register, or a posture declarative standing in for a fact.
- **5 — Reading-stopping.** Empty performance, a wall of words, or meaninglessness a reader
  bounces off — the point buried or absent, density budgets blown.

The specialist also reports the per-1,000-word density-budget rates deslop already defines
(contrast pivots, totalizing quantifiers, disguised lists, echoes).

### 3. Human perception

Also owned by `review-voice` (same agent, because the spans overlap with slop findings).

Will a human reader keep reading, or bail? The read covers:

- **Wall of text** — paragraphs or sentences so long the reader skips them.
- **Unnecessary jargon** — undefined terms or insider shorthand the audience will not parse.
- **Meaninglessness** — filler that signals value without delivering it; the reader gets
  nothing and stops.
- **Buried or absent point** — the reader who stops early leaves without the takeaway.

Reported as a "will they keep reading?" read with the specific spans that cause drop-off.

### 4. AI perception (round-trip)

The novel dimension. Computed during synthesis from the blind summarizer's output.

- The `review-summary` specialist sees **only the prose** — no intended point, no rubric — and
  reports what it took away: the main point and the key claims it extracted.
- Synthesis compares that blind summary against the intended point:
  - **Known intent** (pipeline mode, or the user stated the point): does the point survive
    the round-trip? Where the AI's takeaway diverges from intent, the prose failed to carry
    the point to a machine reader; flag the gap.
  - **Unknown intent** (standalone external prose): surface what the AI extracted as the
    point and ask the user to confirm it matches their intent — a mirror, not a pass/fail.

This tests whether the point gets across to an AI agent that later analyzes or summarizes the
piece — increasingly the real downstream reader.

## Architecture

### Flow

Identical for both entry points:

1. **Gather intent.** The orchestrator establishes the piece's purpose, audience, and
   intended point — from the pipeline context, from the user, or by asking. In standalone
   mode on external prose it may proceed with intent unknown (see AI perception).
2. **Fan out.** Spawn the three read-only specialists in parallel on the same target.
3. **Synthesize.** In the orchestrator's context: run the AI-perception comparison, merge the
   three findings sets (dedup overlapping spans), score each dimension, and assign the
   overall verdict.
4. **Emit / route.** Standalone: deliver the report. In-pipeline: a failing verdict drives
   one bounded loop-back to the reviser, then deliver.

### Specialists (parallel, read-only)

| Agent | Dimension(s) | Tools |
|---|---|---|
| `agents/review-correctness.md` | Correctness and content | `Read, Grep, Glob, WebSearch, WebFetch` |
| `agents/review-voice.md` | Voice (slop 1–5) + human perception | `Read, Grep, Glob` |
| `agents/review-summary.md` | Blind summary (feeds AI perception) | `Read` |

None has `Edit` or `Write`. The summarizer is deliberately starved of context: only the prose
and an instruction to report what it conveys.

### Component layout

```
stilus/
├── agents/
│   ├── deslop.md              # unchanged — slop-catalog SSOT
│   ├── reviser.md             # unchanged — revise phase
│   ├── review-correctness.md  # NEW — correctness & content specialist
│   ├── review-voice.md        # NEW — slop grading (1–5) + human perception
│   └── review-summary.md      # NEW — blind summarizer
├── commands/
│   └── review.md              # NEW — /stilus:review standalone entry
├── context/
│   ├── authoring-a-voice.md   # unchanged
│   └── reviewing.md           # NEW — synthesis: scoring, verdict, AI-perception, report format
├── rules/
│   └── voice.md               # unchanged — register SSOT
└── skills/
    └── write/SKILL.md         # MODIFIED — review step becomes fan-out + synthesis
```

This replaces the single `agents/reviewer.md` that the original plan's Task 5 would have
built, and reshapes Task 6's review step.

## Output: the scored report

A review produces:

- **Per-dimension scores** — correctness, voice (with the slop severity distribution),
  human perception, AI perception.
- **An overall verdict** — drives the one bounded loop-back in pipeline mode; in standalone
  mode it is the assessment.
- **A prioritized findings list.** Every finding carries:
  - a **direct quotation** from the reviewed document (the grounding),
  - its category,
  - severity (1–5) for slop findings,
  - *why* it is flagged (slop / incorrect / jargon / buried point / unverified claim),
  - a concrete fix.
- **A "claims to verify by hand" list** from the correctness specialist.
- **The AI-perception read** — the blind summary, and how it compares to the intended point
  (or the confirm-this-is-your-point mirror in standalone mode).

## Single source of truth

| Concept | Owner | References it |
|---|---|---|
| Subtractive slop catalog + density budgets + accuracy-over-precision | `deslop` | review-voice, review-correctness |
| Register / persona / voice schema | `rules/voice.md` | review-voice |
| 1–5 slop severity scale + human-perception rubric | `review-voice` | — |
| Correctness rubric (internal soundness, verify, flag-for-human) | `review-correctness` | — |
| Synthesis: scoring, verdict, AI-perception comparison, report format | `context/reviewing.md` | `/stilus:review` command, write skill |

No specialist restates another's catalog. The review-specific rubrics (severity, perception,
correctness, synthesis) are new and owned where listed.

## Out of scope

- Changes to `deslop.md`, `reviser.md`, `rules/voice.md`, or the write/edit/revise phases
  beyond the write skill's review step.
- A dedicated synthesizer subagent (synthesis runs in the orchestrator).
- Splitting voice-slop and human-perception into separate agents.
- Any always-on hook or global injection (stilus stays on-demand).

## Open items to resolve in the implementation plan

- **Severity-scale calibration.** Draft the 1–5 guidance with two or three quoted examples per
  level, anchored to deslop's named patterns, so grading is reproducible across runs.
- **Synthesis verdict thresholds.** Pin how per-dimension scores roll up to PASS/FAIL (in
  pipeline) and what triggers the single reviser loop-back.
- **Standalone intent capture.** Define exactly what the `/stilus:review` command asks for
  (purpose, audience, intended point) and how it behaves when the user supplies none.
- **Dedup rule for overlapping spans.** Specify how synthesis merges a span flagged by both
  voice-critic (as slop) and correctness (as unsupported), so it appears once with both lenses.
- **CLAUDE.md Context Ownership.** Add the review-phase row reflecting the new owners above.
