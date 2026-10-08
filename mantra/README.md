# mantra

> I told you. You agreed. You forgot. Repeat.

Behavioral rules plugin for Claude Code and Codex sessions.

Claude is brilliant. Claude is helpful. Claude also has the memory of a goldfish in a context window. You've written the perfect CLAUDE.md. You've carefully documented your project conventions. Claude reads it. Claude agrees. Claude then drifts away from it as the session grows.

**mantra** solves this by providing curated behavioral rules that are injected automatically by session hooks in Claude Code and Codex, and re-injected periodically, so they stay in context as a session grows.

### Flexion Fundamentals

mantra helps developers embody Flexion fundamentals throughout long sessions:

- **Be skeptical and curious** — Keeps Claude questioning assumptions and seeking evidence, not pattern-matching
- **Never compromise on quality** — Keeps standards consistent across a long session
- **Listen with humility** — Enforces peer-not-subordinate stance, deferring to evidence over agreement

## Features

- **Zero config** - Rules injected automatically via hooks, no setup required
- **Token efficient** - Compact YAML frontmatter rather than prose
- **Status indicator** - Shows rules loaded and context freshness on every prompt
- **Curated rules** - Ships with behavior, testing, git, and format conventions
- **Active objective** - The behavior hook injects guidance to distinguish discussion from action requests, retain clarifications and authorization, and honor discussion pauses
- **Periodic refresh** - Re-injects rules every 10 prompts to prevent drift
- **Plugin family aware** - Automatically loads rules from sibling plugins (memento, onus)
- **Easy customization** - Create your own rules with `/mantra:make-rule`
- **On-demand details** - Companion files provide elaboration when needed

## Installation

### Claude Code

```bash
# Add the marketplace
/plugin marketplace add flexion/claude-domestique

# Install the plugin
/plugin install mantra@claude-domestique
```

### Codex

```bash
codex plugin marketplace add flexion/claude-domestique
codex plugin add mantra@claude-domestique
```

Rules are injected automatically on every session start—no initialization required.

Codex does not run a plugin's hooks just because the plugin is installed: it
holds them until you review and trust them. Open `/hooks` in a new Codex thread
and approve this plugin's hook definitions, otherwise you get its skills but
none of its automatic rule injection. Hooks themselves are on by default; the
`[features] hooks` setting in `~/.codex/config.toml` only matters if they were
turned off.


## How It Works

mantra uses the shared plugin hook convention for automatic context injection in Claude Code and Codex:

| Hook | When | What Happens |
|------|------|--------------|
| **SessionStart** | New conversation | Injects all rules + companion docs path |
| **UserPromptSubmit** | Every prompt | Shows status line, refreshes context every 10 prompts |

### What Gets Injected

On session start, mantra injects:

| Rule | Purpose |
|------|---------|
| `behavior.md` | AI behavior (skeptical-first, evidence-based) |
| `context-format.md` | Context module format spec |
| `format-guide.md` | Compact YAML conventions |
| `test.md` | Testing conventions (TDD workflow) |

When sibling plugins are installed (memento, onus), their rules are also loaded:
- `git.md` - Git workflow (from onus)
- `sessions.md` - Session management (from memento)
- `work-items.md` - Work item integration (from onus)

### Status Line

Every prompt shows mantra status:

```
📍 Mantra: #3 ✓
```

**Components:**
- **#N** - Prompt counter since session start
- **✓** - Context injection successful

**IDE Compatibility:**

| Environment | Status Line |
|-------------|-------------|
| Terminal/CLI | Full support |
| VS Code Integrated Terminal | Full support |
| VS Code Extension (GUI panel) | Not supported |
| JetBrains IDEs | Full support (uses CLI) |

The status line is a CLI feature. In VS Code, use Claude Code from the integrated terminal (`` Ctrl+` ``) to see the status line.

### Skills

Use `/mantra:<skill>` in Claude Code or `$mantra:<skill>` in Codex.

| Command | Description |
|---------|-------------|
| `/mantra:make-rule` | Create compact frontmatter rule from verbose markdown |
| `/mantra:assess` | Structured critical assessment (correctness, architecture, alternatives, risks) |
| `/mantra:troubleshoot` | Debugging with evidence relevant to the next action |

### Creating Custom Rules

Use `/mantra:make-rule` to create your own rules:

1. Write a verbose, human-readable markdown file (e.g., `docs/code-review.md`)
2. Run `/mantra:make-rule docs/code-review.md`
3. Claude converts it to token-efficient frontmatter
4. Identify which rules are CRITICAL (used sparingly)
5. Save compact version to `.claude/rules/code-review.md`

**What happens to the source?** The original verbose file is preserved as a "companion" - the compact rule references it via `companion: docs/code-review.md`. Claude loads the compact rules automatically but can read the companion file on-demand for detailed examples or clarification.

## Rule File Format

Each rule file is a **frontmatter-only markdown file**:

```markdown
---
# AI-managed context file - optimized for token efficiency
companion: behavior.md

MANDATORY-REREAD: before-implementation-proposal-response (use-thinking-block)

## CRITICAL ASSESSMENT (BLOCKING REQUIREMENT)
assess-first: correctness, architecture, alternatives, risks
stance: skeptical-default, find-problems-not-agreement
never: eager-agreement, sycophantic-tone, yes-without-analysis

## IMPLEMENTATION BEHAVIOR
mode: discuss-approach-first (non-trivial), build-first (trivial)
implement: minimal-working, fix-actual-errors (not speculative-fixes)
---
```

No markdown body—just frontmatter containing compact YAML rules.

### Emphasis Markers

Use sparingly for critical rules:

| Marker | Use When |
|--------|----------|
| `MANDATORY-REREAD:` | Must re-read before specific actions |
| `## SECTION (BLOCKING REQUIREMENT)` | Entire section is non-negotiable |
| `required-before:` | Must happen before an action |
| `never:` | Absolute prohibitions |
| `enforcement:` | If→then trigger rules |

## Default Behavior Overrides

Mantra isn't just about remembering project conventions. It's about **overriding Claude's default tendencies** that make it less useful as a coding partner.

### Anti-Sycophancy

| Default Claude | Mantra Override |
|----------------|-----------------|
| Eager agreement ("Great idea!") | Skeptical assessment first |
| Yes without analysis | Assess correctness, architecture, risks before agreeing |
| Subordinate tone | Peer-not-subordinate stance |
| Validate user's approach | Find problems, challenge assumptions |

### Evidence-Based Troubleshooting

| Default Claude | Mantra Override |
|----------------|-----------------|
| Pattern-match from training data | Evidence-based only, NO guessing |
| Jump to common solutions | Demonstrate the cause with applicable evidence |
| Research every local defect | Use demonstrated local evidence without a source quota |
| Assume a format, protocol, or third-party API contract from recall | Consult an applicable authoritative reference when the contract determines correctness and is not established by available evidence |
| Continue research or review without a decision | Address a named uncertainty that could change the next action |
| Hide consequential uncertainty | Investigate or surface it |

Choose further investigation using available evidence, uncertainty, consequences,
and reversibility. Keep the choice inexpensive; no numerical value-of-information
estimate or per-action approval document is required. This governs discretionary
process guidance; required permissions, user constraints, and project validation
still apply. Modus owns work-item completion and review stopping.

### Implementation Discipline

| Default Claude | Mantra Override |
|----------------|-----------------|
| Dive into code immediately | Discuss approach first (non-trivial) |
| Speculative fixes | Fix actual errors only |
| Snippets without context | Complete blocks with imports |
| Over-engineer | Minimal working implementation |

**The core insight**: Claude's default mode is helpful-subordinate. Mantra retrains it to be skeptical-peer.

## Development

```bash
npm install
npm test    # Run Jest tests
```

## Why "mantra"?

A mantra is a phrase repeated to focus the mind. Claude's mind wanders. This brings it back.

## Plugin Family

mantra is part of a plugin family that works together:

| Plugin | Purpose | Layer |
|--------|---------|-------|
| **[memento](../memento)** | Session persistence | Persistence |
| **[mantra](../mantra)** | Behavioral rules | Rules |
| **[onus](../onus)** | Work-item automation | Integration |

### How They Work Together

```
External (GitHub/JIRA/Azure DevOps)
        │
        ▼ fetch issue details
    [onus]
        │
        ▼ populate session file
    [memento] ←── "What's next?" lookup
        │
        ▼ read session context
    [mantra] ──► rules injected via hooks
```

Each plugin works standalone but gains enhanced behavior when used together.

## License

MIT
