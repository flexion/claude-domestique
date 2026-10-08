# Mantra development guide

## Project overview

Mantra provides behavioral skills and a recurring reminder for evidence-responsive assessment, proportionate research, and the active user objective. An optional passive collector records resource observations with explicit coverage; it supplies no behavioral feedback.

Repository-wide agent instructions come from the root `AGENTS.md` and `CLAUDE.md`; this file documents Mantra's implementation and is loaded on demand.

Tagline: "Skeptical peer, not eager subordinate."

## Commands

```bash
npm test
npm run test:coverage
```

## Architecture

Plugin type: **skill pack, recurring behavior hook, and opt-in passive collector**

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
│   └── resources.js      # Opt-in only; absent from hooks.json
├── lib/
│   └── resources.js      # Measurement projection and aggregation
├── context/              # Detailed on-demand references
│   ├── behavior.md
│   ├── test.md
│   ├── rule-design.md
│   └── resources.md      # Collector setup, API, and coverage limits
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
4. Optional resource observations for evaluation, independent of the behavioral guidance.

### Runtime boundaries

`hooks/hooks.json` registers only `behavior.js`, on session start and every prompt.
The behavior hook injects a fixed string; skills own the detailed workflows. Neither
the hook nor the skills interprets resource observations as permission to change
requirements, omit necessary questions, or stop work.

`hooks/resources.js` reads explicit pilot settings, writes local reports, and
returns `{}` to the host. It has no default registration or runtime dependency
outside Node.js. `lib/resources.js` projects measurement fields and aggregates
them without retaining message content. See [the collector contract](context/resources.md)
for installation, supported host inputs, concurrency, bounds, and unknown values.

### What Mantra does not duplicate

- Generic simplicity or anti-over-engineering guidance.
- Generic response-format preferences.
- TDD workflows owned by another installed plugin.
- General testing knowledge.

## Validation

Follow the repository's required checks in `AGENTS.md`. [The testing reference](context/test.md)
describes the Mantra suites and the difference between mechanical checks and
fresh agent behavior. Collector correctness does not establish that displaying
measurements improves delivered work.

## Git conventions

Branches use `issue/feature-<N>/<desc>` or `chore/<desc>`.

Commit and pull-request titles use `#N - lowercase description` for issue work or `chore - lowercase description` otherwise.
