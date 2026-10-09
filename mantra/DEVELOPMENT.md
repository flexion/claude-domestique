# Mantra development guide

## Project overview

Mantra provides behavioral skills and a recurring reminder for evidence-responsive assessment, proportionate research, and the active user objective. Automatic hooks inject coverage-labelled resource observations and periodic tool-completion reflection on both hosts.

Repository-wide agent instructions come from the root `AGENTS.md` and `CLAUDE.md`; this file documents Mantra's implementation and is loaded on demand.

Tagline: "Skeptical peer, not eager subordinate."

## Commands

```bash
npm test
npm run test:coverage
```

## Architecture

Plugin type: **skill pack, recurring behavior hook, and automatic resource observations**

Design goals:

- Add behavior not already supplied by the host.
- Reinforce assessment, research, and active-objective guidance on every prompt.
- Keep structured assessment and troubleshooting workflows available on demand.
- Keep always-on context small.

### Directory structure

```text
mantra/
├── hooks/
│   ├── hooks.json
│   ├── behavior.js       # Contains the injected BEHAVIOR text
│   └── resources.js      # Automatic collection/injection and cadence
├── lib/
│   ├── resources.js      # Measurement projection and aggregation
│   └── resource-inject.js # Coverage-labelled observation formatting
├── context/              # Detailed on-demand references
│   ├── behavior.md
│   ├── test.md           # Mantra-specific validation reference
│   ├── rule-design.md
│   └── resources.md
├── scripts/
│   └── statusline.js
└── skills/               # Canonical workflows shared by Claude Code and Codex
    ├── skeptic/SKILL.md
    ├── assess/SKILL.md
    ├── troubleshoot/SKILL.md
    └── make-rule/SKILL.md
```

### What Mantra adds

1. Evidence-responsive assessment that accepts sound proposals and challenges unsupported ones.
2. Troubleshooting using evidence relevant to the next action, including demonstrated
   local causes and authoritative references for uncertain external behavior.
3. Carrying the active objective and authorization forward while honoring discussion pauses.
4. Automatic, coverage-labelled resource observations and context injection on Claude and Codex.
5. Brief next-action reflection using actual progress and visible resources,
   including reflection overhead, without quotas or automatic completion decisions.

### Resource hooks

hooks.json registers Claude hooks; codex.json is the Codex manifest override.
Both register behavior.js on start/prompts and resources.js on session, prompt
and tool events. Resources collect automatically and inject observations on
supported events; tool completions add reflection about every five minutes.
See [the consumer and storage contract](context/resources.md). Node.js is the
only runtime dependency. Synthetic evaluation evidence stays in repository docs/.

### What Mantra does not duplicate

- Generic simplicity or anti-over-engineering guidance.
- Generic response-format preferences.
- TDD workflows owned by another installed plugin.
- General testing knowledge.

## Validation

Follow `AGENTS.md` for required checks and [the Mantra testing reference](context/test.md)
for the properties covered by tests and fresh-host probes. Static validation and
resource accuracy do not establish behavioral benefit.

## Git conventions

Branches use `issue/feature-<N>/<desc>` or `chore/<desc>`.

Commit and pull-request titles use `#N - lowercase description` for issue work or `chore - lowercase description` otherwise.
