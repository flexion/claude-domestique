# stilus

Writing tools for Claude Code and Codex: remove AI slop, write in a project's voice, and review finished prose.

Latin for the writing instrument and the root of "style."

## What it does

`stilus` ships three pieces today — the `deslop` editor, a project voice layer, and a standalone review phase. A full drafting pipeline is planned (see [Roadmap](#roadmap)).

- **Edit** — remove slop line by line with the `deslop` agent (subtractive; changes how, never what). `deslop` can also draft clean prose from facts or critique a draft without editing it.
- **Voice** — a project supplies its own register in `.claude/rules/voice.md`, extending the plugin's neutral base. See [Voice profiles](#voice-profiles).
- **Review** — an orchestrated phase: three parallel read-only specialists judge correctness, voice (slop graded 1–5 plus a human-perception read), and AI perception (whether a cold AI reader gets the point), and the orchestrator synthesizes a scored, quotation-grounded report. Run it on any prose with `/stilus:review <file-or-text>`.

## On-demand only

`stilus` ships no hooks and injects no global context. Its skills run only when invoked and cost nothing otherwise. Claude retains thin named-agent wrappers; Codex runs the same specialist skills through `spawn_agent`. The blind summarizer runs only in a genuinely fresh specialist context: when neither host exposes a fresh-context delegation tool, or the returned isolation attestation fails validation, the review reports `AI perception: UNAVAILABLE` rather than summarizing in a context that has already seen the intended point.

## Installation

### Claude Code

```bash
/plugin marketplace add flexion/claude-domestique
/plugin install stilus@claude-domestique
```

Invoke `/stilus:deslop` or `/stilus:review`.

### Codex

```bash
codex plugin marketplace add flexion/claude-domestique
codex plugin add stilus@claude-domestique
```

Invoke `$stilus:deslop` or `$stilus:review`.

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

The slop catalog and shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the `deslop` skill. The voice layer and review specialists reference it; they never restate it. The review flow and scoring live once in `context/reviewing.md`, which the `review` skill runs.

## Roadmap

The intended full pipeline escalates depth to match what a piece is worth: **Write** (draft in the project's voice) → **Edit** (`deslop`) → **Revise** (adjudicate deslop's cuts and fix structure) → **Review**. The **Write** skill (the pipeline's orchestrator entry point) and the **Revise** phase (the `reviser` agent) are planned; today stilus ships the **Edit**, **Voice**, and **Review** pieces above.
