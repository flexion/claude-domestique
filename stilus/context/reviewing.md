# Reviewing — the stilus review phase

This document is the single source of truth for how stilus reviews a finished piece. The `/stilus:review` command and the write skill's review step both run this flow. It owns synthesis: how the review phase gathers intent, fans out to the specialist agents, compares the blind summary to the intended point, dedups and scores findings, assigns a verdict, and writes the report. The per-dimension rubrics live in the specialist agents, not here.

## The flow

### Step 1 — Gather intent

Establish three things before dispatching:

- **Purpose** — what the piece is for.
- **Audience** — who reads it.
- **Intended point** — the one thing the reader should take away.

In the pipeline these come from the drafting context. Standalone, ask the user for them in one prompt. If the user supplies none, proceed with intent unknown: the AI-perception step becomes a mirror (Step 3) rather than a pass/fail.

### Step 2 — Fan out (parallel, read-only)

Dispatch all three specialists on the same target in a single batch so they run concurrently. Each is read-only and independent.

- `review-correctness` — pass the piece and any codebase/domain context.
- `review-voice` — pass the piece and the resolved voice profile (the base profile if no project or user profile resolves).
- `review-summary` — pass ONLY the piece. Do not pass the purpose, audience, or intended point. Its blindness is the point.

If the platform namespaces plugin agents, use the namespaced name; the names are unique within this plugin.

### Step 3 — AI perception (synthesis)

Compare `review-summary`'s blind takeaway to the intended point:

- **Intent known:** Did the point survive? Where the blind summary diverges from the intended point — wrong emphasis, missing the main claim, a misread — the prose failed to carry the point to a machine reader. Report the gap as a finding.
- **Intent unknown:** Present the blind takeaway to the user as a mirror: "An AI reading this cold took away: <summary>. Is that your point?" Do not score this case; surface it for confirmation.

### Step 4 — Merge and dedup

Combine the three findings sets. When two specialists flag the same span (for example, review-voice flags it as a disguised list and review-correctness flags the same span as an unsupported leap), merge into one finding that carries both lenses and the higher severity. Order findings by severity, highest first.

### Step 5 — Score and judge

Score each dimension:

- **Correctness** — PASS if no unsupported claims, contradictions, or disproven facts survive; FAIL if any do. Always attach the claims-to-verify-by-hand list regardless of score.
- **Voice** — PASS if no slop finding is 4 or 5 and all density budgets are within deslop's limits; CONCERN if the worst finding is 3 or a budget is mildly over; FAIL if any finding is 5 or budgets are well over.
- **Human perception** — PASS if a reader keeps going; CONCERN if there are isolated bail points; FAIL if the piece reads as a wall of words or the point is buried.
- **AI perception** — PASS if the blind takeaway matches the intended point; FAIL if it diverges; `mirror` if intent is unknown (unscored).

**Overall verdict:** FAIL if any dimension is FAIL; CONCERN if any is CONCERN and none is FAIL; otherwise PASS. A `mirror` AI-perception result does not by itself raise the verdict.

In the pipeline, a FAIL drives one bounded loop-back to the reviser, then deliver regardless of the second result. Standalone, the verdict is the assessment; never loop.

### Step 6 — Write the report

Use the format below.

## Report format

````
# Review — <piece>

Verdict: PASS | CONCERN | FAIL
- Correctness: <PASS/FAIL>
- Voice: <PASS/CONCERN/FAIL>  (slop: <n>x1 <n>x2 <n>x3 <n>x4 <n>x5)
- Human perception: <PASS/CONCERN/FAIL>
- AI perception: <PASS/FAIL/mirror>

## AI perception
Blind takeaway: <one sentence the cold reader extracted>
Intended point: <the stated point, or "not supplied">
<the gap, or "point survived", or the confirm-this-is-your-point prompt>

## Findings (highest severity first)
1. [voice - severity 4] "<exact quotation>"
   Why: <reason>
   Fix: <concrete fix>
2. [correctness - unsupported] "<exact quotation>"
   Why: <reason>
   Fix: <concrete fix>
...

## Claims to verify by hand
- "<quoted claim>" — <why it could not be confirmed>

## Density rates (per 1,000 words)
contrast pivots: <r> | totalizing quantifiers: <r> | disguised lists: <r> | echoes: <r>
````

Every finding cites a direct quotation from the piece. A finding without a quotation does not ship.
