---
name: review
description: >-
  Use when the user asks for a review of finished prose, wants to know whether a piece lands, or asks how a draft reads — produces a scored, read-only report across correctness, voice, and reader perception. Invoke with stilus:review <file-or-text>.
---

# stilus:review

Relative plugin paths in this skill are resolved from this `SKILL.md`.

Review the prose the user names — a file path or pasted text — and produce a scored report. You change nothing; this is a read-only assessment.

Run the review phase exactly as defined in `../../context/reviewing.md`:

1. **Gather intent** (purpose, audience, intended point). Ask the user in one prompt; if they supply none, proceed with intent unknown.
2. **Run three isolated specialist passes** with `review-correctness`, `review-voice`, and `review-summary`, following `../../context/reviewing.md`. Use parallel subagents when the host supports them; otherwise run the same skills sequentially with separate context. Pass the blind summarizer ONLY the prose.
3. **Synthesize:** run the AI-perception comparison, merge and dedup findings, score each dimension, assign the verdict.
4. **Deliver** the report in the format from `../../context/reviewing.md`. Never loop back to revise in standalone mode.

The resolved voice profile, if any, comes from the same scan the write skill uses: project `.claude/rules/voice.md`, then user `~/.claude/rules/voice.md`, then this plugin's `../../rules/voice.md`.
