# stilus

Adaptive writing pipeline for Claude Code. Draft prose in a project's voice, then remove AI slop.

Latin for the writing instrument and the root of "style."

## What it does

`stilus` runs prose through up to four phases, escalating depth to match what a piece is worth:

1. **Write** — draft in the project's voice (additive).
2. **Edit** — remove slop line by line with the `deslop` agent (subtractive; changes how, never what).
3. **Revise** — adjudicate deslop's cuts and fix structure so the piece leads with the point.
4. **Review** — an independent, read-only judge checks fit, surviving tells, accuracy, and register.

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

The slop catalog and shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the `deslop` agent. The voice layer, reviser, and reviewer reference them; they never restate them.
