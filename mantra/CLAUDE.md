# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mantra** is a behavioral skills plugin for Claude Code sessions. It provides structured workflows for critical assessment and evidence-based debugging, plus a lean rules file for guidance that goes beyond base Claude behavior.

Tagline: "Skeptical peer, not eager subordinate"

## Commands

```bash
npm test          # Run tests (statusline)
```

## Architecture

Plugin type: **skill pack + minimal hook**

Design goals:
- Only additive: nothing that duplicates base Claude Code behavior
- Always-on skepticism: behavior.md injected on every prompt to prevent drift
- Skills for structured workflows: assess, troubleshoot, skeptic trigger on demand
- Lean injection: single rules file (~300 tokens) per prompt

### Directory Structure

```
mantra/
├── rules/                # Lean rules (injected via hook)
│   └── behavior.md       # Critical assessment + anti-sycophancy + troubleshooting
├── hooks/                # Minimal hook (no state, no counters)
│   └── behavior.js       # Injects behavior.md on every prompt
├── context/              # Companion docs (on-demand reference)
│   ├── behavior.md       # Detailed assessment examples
│   ├── test.md           # Testing patterns (reference only)
│   ├── context-format.md # Context system docs (for plugin authors)
│   ├── format-guide.md   # Compact YAML notation (for plugin authors)
│   └── rule-design.md    # Rule authoring guide (for plugin authors)
├── scripts/              # Utilities
│   └── statusline.js     # Status line display
└── commands/             # Skills
    ├── skeptic.md         # /mantra:skeptic - anti-sycophancy behavioral gate
    ├── assess.md          # /mantra:assess - structured critical assessment
    ├── troubleshoot.md    # /mantra:troubleshoot - evidence-based debugging
    └── make-rule.md       # /mantra:make-rule - convert prose to compact rules
```

### What mantra adds beyond base Claude

1. **Critical assessment stance** - Skeptical-by-default evaluation before agreeing to proposals
2. **Evidence-based troubleshooting** - Requires 3+ documented sources before proposing fixes
3. **Thinking-block checklists** - Enforces explicit checklist consultation before git ops

### What mantra does NOT duplicate

- "Simple solutions first" (already in system prompt)
- "Avoid over-engineering" (already in system prompt)
- "Skip preambles" (already in system prompt)
- TDD workflow (covered by superpowers:test-driven-development)
- Generic testing knowledge (Claude already knows FIRST, DI, etc.)

## Git Conventions

**Branches:** `issue/feature-<N>/<desc>` or `chore/<desc>`

**Commits:** HEREDOC format, no attribution, no emojis
```bash
git commit -m "$(cat <<'EOF'
#N - verb desc

- change1
- change2
EOF
)"
```

**PRs:** Title matches commit format (`#N - lowercase desc` or `chore - lowercase desc`)
