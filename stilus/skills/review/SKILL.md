---
name: review
description: >-
  Use when the user wants a read-only review of finished prose for correctness,
  voice, clarity, or whether its intended point reaches human and AI readers.
---

# stilus:review

Relative plugin paths in this skill are resolved from this `SKILL.md`.

Review the prose the user names — a file path or pasted text — and produce a scored report. You change nothing; this is a read-only assessment.

Run the review phase exactly as defined in `../../context/reviewing.md`:

1. **Gather intent** (purpose, audience, intended point). Ask the user in one prompt; if they supply none, proceed with intent unknown. Intent, the resolved voice profile, the scoring rubric, and every specialist finding are parent-only material and never enter a delegation payload.
2. **Mint the isolation control values.** Generate a new UUID v4 request ID and a new UUID v4 isolation canary for this pass, and keep the canary beside that parent-only material.
3. **Run the two graded passes** with `review-correctness` and `review-voice`, following `../../context/reviewing.md`. Neither may see the other's findings.
4. **Delegate the blind pass.** If neither `Agent` nor `spawn_agent` is available, skip `review-summary` and report `AI perception: UNAVAILABLE`. Otherwise delegate only the prose or its path, the request ID, and the attestation schema to `review-summary` in a fresh context.
5. **Validate the attestation before reading or using the summary.** On any failure — delegation failure, an absent or malformed attestation, a mismatched request ID, unexpected `received_fields`, a true forbidden-context flag, or the current canary — discard the pass and report `AI perception: UNAVAILABLE` with the reason. Never fall back to the current context.
6. **Synthesize:** compare the blind takeaway with the intended point only after validation passes, merge and dedup findings, score each dimension, assign the verdict. An `UNAVAILABLE` dimension is omitted from the verdict, never counted as a pass.
7. **Deliver** the report in the format from `../../context/reviewing.md`. Never loop back to revise in standalone mode.

The resolved voice profile, if any, comes from the same scan the write skill uses: project `.claude/rules/voice.md`, then user `~/.claude/rules/voice.md`, then this plugin's `../../rules/voice.md`.
