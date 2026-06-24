# Authoring a voice profile

A voice profile teaches stilus to draft in your register instead of a generic one. It lives in `.claude/rules/voice.md` (per project) or `~/.claude/rules/voice.md` (personal default), and extends the plugin base at `stilus/voice.md`.

## What a profile is for

The profile is the additive layer. It says how this author sounds and what they reach for. It does not list banned words or slop patterns — those live in the deslop agent, and the edit phase applies them after drafting. Keep the profile to voice, not to bans.

## Skeleton

Copy this and fill it in. Delete any section you have no opinion on; the base default applies.

```markdown
---
extends: stilus/voice.md
domain: voice
companion: .claude/context/voice-notes.md
---

# Voice

## Persona
One or two sentences: who writes, to whom, with what stance.

## Registers
### <register name>
When it is used, and three to five concrete markers (sentence shapes, moves, tics this author owns).

## Preferred and elevated vocabulary
Words this author reaches for, and the test for when a word earns its place.

## Mode guidance
### Email
Opener, body order, length, sign-off.
### <other modes that matter>

## Additive craft
Moves specific to this author beyond the base defaults.
```

## How it resolves

When stilus resolves your voice, it reads the project profile, then the user profile, then the base, and merges them section by section with the higher tier winning. It announces which profile it used. The `/stilus:review` command resolves your voice this way today (for the `review-voice` specialist); the planned drafting pipeline will read the same profile. The `companion:` field, if present, points at a longer notes file in `.claude/context/` that stilus also reads.

## Keep it honest

Profiles describe a real voice. If you do not have a settled register for a mode, leave it out rather than invent one. The base default is neutral and safe.
