---
description: Review a finished piece of prose — correctness, voice (graded slop), human perception, and whether an AI reader gets the point. Read-only; produces a scored report, never edits. Usage: /stilus:review <file-or-text>
---

# /stilus:review

Review the prose the user names — a file path or pasted text — and produce a scored report. You change nothing; this is a read-only assessment.

Run the review phase exactly as defined in this plugin's `context/reviewing.md`:

1. **Gather intent** (purpose, audience, intended point). Ask the user in one prompt; if they supply none, proceed with intent unknown.
2. **Fan out** to the three specialist agents in parallel — `review-correctness`, `review-voice`, and `review-summary` — following `context/reviewing.md`. Pass the blind summarizer ONLY the prose.
3. **Synthesize:** run the AI-perception comparison, merge and dedup findings, score each dimension, assign the verdict.
4. **Deliver** the report in the format from `context/reviewing.md`. Never loop back to revise in standalone mode.

The resolved voice profile, if any, comes from the same scan the write skill uses: project `.claude/rules/voice.md`, then user `~/.claude/rules/voice.md`, then this plugin's `rules/voice.md`.
