# Mantra development guide

## Project overview

Mantra provides behavioral skills and a recurring reminder for evidence-responsive assessment, proportionate research, and the active user objective. An optional passive collector records resource observations with explicit coverage; it supplies no behavioral feedback. An explicit `inject` mode adds observations to model context on Claude and Codex.

Repository-wide agent instructions come from the root `AGENTS.md` and `CLAUDE.md`; this file documents Mantra's implementation and is loaded on demand.

Tagline: "Skeptical peer, not eager subordinate."

## Commands

```bash
npm test
npm run test:coverage
```

## Architecture

Plugin type: **skill pack, recurring behavior hook, and opt-in resource pilot**

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
│   └── resources.js      # Explicit settings-only collection/injection hook
├── lib/
│   ├── resources.js      # Measurement projection and aggregation
│   └── resource-inject.js # Experimental observation formatting
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
4. Opt-in, coverage-labelled resource observations, with experimental context injection on Claude and Codex.

### Resource pilot

The default hook configuration registers only `behavior.js`, on session start and
every prompt; skills own the detailed workflows. Resource collection
and injection require explicit host settings and environment variables; see
[the setup, consumer contract and recommendation](context/resources.md). Collection writes local reports
and returns `{}`; the experimental `inject` mode can emit context. The collector has no
runtime dependency outside Node.js and projects measurements without retaining
message content.

Evaluation fixtures and run evidence live under repository `docs/`, outside the
installed plugin.

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
