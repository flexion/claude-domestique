# stilus

Adaptive writing pipeline for Claude Code. Draft prose in a project's voice, then remove AI slop.

Latin for the writing instrument and the root of "style."

## What it does

`stilus` runs prose through up to four phases, escalating depth to match what a piece is worth:

1. **Write** — draft in the project's voice (additive).
2. **Edit** — remove slop line by line with the `deslop` agent (subtractive; changes how, never what).
3. **Revise** — adjudicate deslop's cuts and fix structure so the piece leads with the point.
4. **Review** — an orchestrated phase: three parallel read-only specialists judge correctness, voice (slop graded 1–5 plus a human-perception read), and AI perception (whether a cold AI reader gets the point), and the orchestrator synthesizes a scored, quotation-grounded report. Run it standalone on any existing prose with `/stilus:review <file-or-text>`.

A Slack message gets write → edit. A document gets write → edit → revise. A white paper gets all four.

## On-demand only

`stilus` ships no hooks and injects no global context. The `write` skill triggers when you are drafting or editing prose to send or publish, and costs nothing otherwise.

## Voice profiles

`stilus` carries no personality. A project supplies its own voice in `.claude/rules/voice.md`:

```yaml
---
extends: stilus/voice.md
domain: voice
---
```

Fill in the sections from `rules/voice.md`. A personal default can live at `~/.claude/rules/voice.md` and follows you across repos. Precedence: project over user over the plugin base. See `context/authoring-a-voice.md`.

## Single source of truth

The slop catalog and shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the `deslop` agent. The voice layer, reviser, and the review specialists reference them; they never restate them. The review flow and its scoring live once in `context/reviewing.md`, which the `/stilus:review` command and the write skill both run.
