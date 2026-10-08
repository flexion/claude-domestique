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

Plugin type: **skill pack and minimal hook**

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
│   └── behavior.js       # Contains the injected BEHAVIOR text
├── context/              # Detailed on-demand references
│   ├── behavior.md
│   ├── test.md
│   └── rule-design.md
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

### What Mantra does not duplicate

- Generic simplicity or anti-over-engineering guidance.
- Generic response-format preferences.
- TDD workflows owned by another installed plugin.
- General testing knowledge.

## Git conventions

Branches use `issue/feature-<N>/<desc>` or `chore/<desc>`.

Commit and pull-request titles use `#N - lowercase description` for issue work or `chore - lowercase description` otherwise.
