# Reviewing — the stilus review phase

This document is the single source of truth for how stilus reviews a finished piece. The `review` skill and the write skill's review step both run this flow. It owns synthesis: how the review phase gathers intent, runs the specialist skills, isolates and verifies the blind pass, compares the blind summary to the intended point, dedups and scores findings, assigns a verdict, and writes the report. The per-dimension rubrics live in the specialist skills, not here.

## The flow

### Step 1 — Gather intent

Establish three things before dispatching:

- **Purpose** — what the piece is for.
- **Audience** — who reads it.
- **Intended point** — the one thing the reader should take away.

In the pipeline these come from the drafting context. Standalone, ask the user for them in one prompt. If the user supplies none, proceed with intent unknown: the AI-perception step becomes a mirror (Step 3) rather than a pass/fail.

Purpose, audience, intended point, the resolved voice profile, this document's scoring rubric, and every specialist finding are **parent-only** material. It stays in your context for the whole review, and none of it may reach `review-summary`.

### Step 2 — Specialist passes

Run the passes in exactly this order. Items 1 and 7 belong to Step 1 and Step 3; they appear here because the isolation contract depends on where they sit.

1. Gather the parent-only purpose, audience, intended point, voice profile, rubric, and prior findings.
2. Generate a new UUID v4 request ID and a new UUID v4 isolation canary. Place the canary beside that parent-only block. Never put the canary in the delegation payload.
3. Run `review-correctness` and `review-voice` independently.
4. If neither `Agent` nor `spawn_agent` is available, skip `review-summary` and report `AI perception: UNAVAILABLE`.
5. Otherwise delegate only the prose or its path, the request ID, and the attestation schema to `review-summary` in a fresh context.
6. Validate the attestation before reading or using the summary. On any failure, discard the pass and report `AI perception: UNAVAILABLE` with the reason. Never fall back to the current context.
7. Compare the blind takeaway with the intended point only after validation passes.

Invoke the plugin-namespaced skill names exposed by the host.

#### Isolation control values

The request ID and the canary are both new for every pass. Their uniqueness is what stops a cached or replayed result from satisfying the current run: an attestation that echoes an earlier request ID is stale by definition. The canary sits adjacent to the parent-only block so that a leak of that material carries the canary with it.

#### The two graded passes

- `review-correctness` — pass the piece and any codebase/domain context.
- `review-voice` — pass the piece and the resolved voice profile (the base profile if no project or user profile resolves).

Both are read-only and independent. Run them in parallel, or one after the other; either is sound, because neither receives the other's findings. Do not let one specialist's findings influence another.

#### The blind pass

`review-summary` runs only in a genuinely fresh specialist context, never in yours — yours has already read the parent-only block. A fresh context exists only where the session exposes a host-native delegation tool that starts a new agent thread: Claude exposes `Agent`; Codex exposes `spawn_agent`, which its hook tool-coverage contract also aliases as `Agent`.

Treat the available tool contract as a fast-path predicate, then attempt the delegation. A successful preflight is not proof that isolation occurred. Do not infer support from the host name, and do not launch another CLI process as a stand-in for a subagent.

The delegation payload carries exactly one piece of substantive content — the prose, or a path to it — plus the request ID and the attestation schema as isolation control metadata. Nothing else.

#### The attestation

`review-summary` begins its result with this object:

```json
{
  "isolation": {
    "request_id": "<exact delegated request ID>",
    "received_fields": ["prose"],
    "forbidden_context": {
      "purpose": false,
      "audience": false,
      "intended_point": false,
      "voice_profile": false,
      "rubric": false,
      "prior_findings": false
    },
    "canary_seen": false,
    "observed_canary": null
  }
}
```

Validate the attestation before reading or using the summary. Discard the pass and report `AI perception: UNAVAILABLE` with the reason when:

- delegation fails, whether the delegation tool is absent or the spawn itself fails;
- the attestation is absent or malformed;
- the request ID does not match the one you delegated;
- `received_fields` contains anything else;
- any forbidden-context flag is true;
- the current canary is reported.

Never fall back to the current context, and never simulate blindness by re-running the summarizer somewhere the parent-only block has already been read. Leaked context is a failed isolation precondition, not an input the specialist can repair. The attestation is a tested guardrail for cooperative models, not cryptographic proof of isolation.

When no valid blind pass returns, continue with correctness, voice, and human perception, and name the cause in the report: either that the host could not provide a fresh context, or which validation check failed.

### Step 3 — AI perception (synthesis)

Compare `review-summary`'s validated blind takeaway to the intended point:

- **Intent known:** Did the point survive? Where the blind summary diverges from the intended point — wrong emphasis, missing the main claim, a misread — the prose failed to carry the point to a machine reader. Report the gap as a finding.
- **Intent unknown:** Present the blind takeaway to the user as a mirror: "An AI reading this cold took away: <summary>. Is that your point?" Do not score this case; surface it for confirmation.
- **No valid blind pass:** Report `AI perception: UNAVAILABLE` with the one-line reason. Do not read the piece yourself in its place: you already know the intended point, so your own reading is not blind and is not evidence.

### Step 4 — Merge and dedup

Combine the findings sets you have. When two specialists flag the same span (for example, review-voice flags it as a disguised list and review-correctness flags the same span as an unsupported leap), merge into one finding that carries both lenses and the higher severity. Order findings by severity, highest first.

### Step 5 — Score and judge

Score each dimension:

- **Correctness** — FAIL if any unsupported claim, unsupported leap, contradiction, disproven fact, or action-blocking missing content survives; PASS otherwise. (Non-blocking missing content is a finding, not a FAIL.) Always attach the claims-to-verify-by-hand list regardless of score.
- **Voice** — PASS if no slop finding is 4 or 5 and all density budgets are within deslop's limits; CONCERN if the worst finding is 3 or 4, or a budget is mildly over; FAIL if any finding is 5 or budgets are well over.
- **Human perception** — PASS if a reader keeps going; CONCERN if there are isolated bail points; FAIL if the piece reads as a wall of words or the point is buried.
- **AI perception** — PASS if the validated blind takeaway matches the intended point; FAIL if it diverges; `mirror` if intent is unknown (unscored); `UNAVAILABLE` if no valid blind pass returned (also unscored).

**Overall verdict:** FAIL if any scored dimension is FAIL; CONCERN if any scored dimension is CONCERN and none is FAIL; otherwise PASS. A `mirror` AI-perception result does not by itself raise the verdict. `UNAVAILABLE` is omitted from aggregation: it neither raises nor lowers the verdict, and it is never counted as a pass. A review with an unavailable dimension is a smaller review, not a cleaner one — say so in the report.

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
- AI perception: <PASS/FAIL/mirror/UNAVAILABLE>

## AI perception
Blind takeaway: <one sentence the cold reader extracted, or "unavailable">
Intended point: <the stated point, or "not supplied">
<the gap, or "point survived", or the confirm-this-is-your-point prompt, or why no valid blind pass returned>

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
