# Mantra development guide

## Project overview

Mantra is a behavioral-skills plugin for coding-agent sessions. It provides structured workflows for critical assessment and evidence-based debugging, plus a lean hook that reinforces guidance throughout a session.

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
- Inject assessment, research, and active-objective guidance on every prompt to prevent drift.
- Keep structured assessment and troubleshooting workflows available on demand.
- Keep always-on context small.

### Directory structure

```text
mantra/
├── hooks/
│   ├── hooks.json
│   ├── behavior.js       # Contains the injected BEHAVIOR text
│   └── resources.js      # Explicit settings-only collection/display hook
├── lib/
│   ├── resources.js      # Measurement projection and aggregation
│   └── resource-display.js # Experimental observation formatting
├── context/              # Detailed on-demand references
│   ├── behavior.md
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
4. Opt-in, coverage-labelled resource observations, with experimental Claude display.

### Resource pilot

The default hook configuration registers only `behavior.js`, on session start and
every prompt; skills own the detailed workflows. Resource collection
and display require explicit host settings and environment variables; see
[the setup and consumer contract](context/resources.md). Neither mode changes
requirements, permissions, or the active objective. Unknown measurements are not
zero, and consumption is not a usefulness score. Collection writes local reports
and returns `{}`; the experimental display can emit context. The collector has no
runtime dependency outside Node.js and projects measurements without retaining
message content.

The visibility comparison recommends retaining passive collection and ending
display evaluation. The small display seam remains for reproducibility and
distinct-mode validation, without automatic registration. Its evaluation fixtures
and run evidence live under repository `docs/`, outside the installed plugin.

### What Mantra does not duplicate

- Generic simplicity or anti-over-engineering guidance.
- Generic response-format preferences.
- TDD workflows owned by another installed plugin.
- General testing knowledge.

## Git conventions

Branches use `issue/feature-<N>/<desc>` or `chore/<desc>`.

Commit and pull-request titles use `#N - lowercase description` for issue work or `chore - lowercase description` otherwise.
