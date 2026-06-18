---
name: voice-base
domain: voice
description: Generic voice base for the stilus writing pipeline. Projects extend this with their own register; the Write phase resolves and reads it.
---

# Voice (generic base)

This file defines the shape of a voice profile and supplies neutral defaults. It carries no personality. The Write phase of stilus reads the resolved voice — project profile over user profile over this base — and drafts in it.

## How a project supplies its voice

Create `.claude/rules/voice.md` in the project (or `~/.claude/rules/voice.md` for a personal default that follows you across repos) with this frontmatter:

```yaml
---
extends: stilus/voice.md
domain: voice
---
```

Fill in the sections below. A section you omit falls back to the default here. A section you supply overrides it. Precedence: project profile over user profile over this base.

## What this base does not define

The subtractive catalog (slop patterns, banned constructions, density budgets) and the craft that both drafting and editing share (lead with the point, sentence rhythm, accuracy over precision) live in the deslop agent. This base references them; it never restates them. A voice profile should not restate them either.

## Profile sections

### Persona

Who is writing, in one or two sentences: role, relationship to the audience, the stance the prose takes. Default: a neutral technical author with no personality, who states what a thing does and what it costs.

### Registers

The named registers the author moves between, each with its markers. A project may define one or several. Default: a single neutral analytical register — plain, ordered, unsentimental.

### Preferred and elevated vocabulary

The words this author reaches for, and the rule for when. Default: plain words; no elevated diction.

### Mode guidance

Per-medium conventions. Fill in only the modes that matter.

- Email — opener, body order, length, sign-off. Default: name the recipient, lead with the ask or the answer, keep it short.
- Slack — Default: one or two sentences, no greeting in active threads.
- Document or article — Default: topic sentences carry the argument; headers only when the length needs navigation.
- White paper or report — Default: short paragraphs, argument-driven, specific numbers.

### Additive craft

Positive moves this author makes that deslop does not own:

- Register-driven generation — produce text in the resolved register, not a generic one.
- Specificity — use the specific number, date, or name when it is available and true.
- Equip the reader to act — give the reader everything needed to decide without a follow-up round.
- Analogy as translation — when explaining across domains, map the structure, do not simplify.
