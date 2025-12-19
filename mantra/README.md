# claude-mantra

> I told you. You agreed. You forgot. Repeat.

Periodic context refresh plugin for Claude Code sessions.

Claude is brilliant. Claude is helpful. Claude also has the memory of a goldfish in a context window. You've written the perfect CLAUDE.md. You've carefully documented your project conventions. Claude reads it. Claude agrees. Claude then proceeds to ignore half of it by turn 47.

**claude-mantra** solves this by periodically re-injecting key instruction files into Claude's working context—reinforcing the behavioral guidance before it fades into the abyss of distant tokens.

## Features

- **Session start refresh** - Injects context immediately when sessions start, resume, or reset
- **Freshness indicator** - Shows context staleness on every prompt (`📍 Context: 12/20`)
- **Periodic refresh** - Re-injects context files every N interactions
- **Base context** - Ships with behavior rules (skeptical-first, evidence-based troubleshooting)
- **Project extensions** - Add project-specific context via `.claude/context/*.yml`
- **Sibling plugin discovery** - Automatically loads context from claude-memento and claude-onus
- **CLAUDE.md fallback** - Works with existing CLAUDE.md if no context directory
- **Lightweight** - Native Claude Code hook, no external dependencies

## Installation

### As a Claude Code Plugin (Recommended)

```bash
# Add the GitHub repo as a marketplace
/plugin marketplace add flexion/claude-mantra

# Install the plugin
/plugin install claude-mantra@claude-mantra

# Scaffold context files for your project
/init
```

The `/init` command creates:
- `.claude/context/README.md` - How to extend context
- `.claude/context/project.yml` - Project-specific context template

If `CLAUDE.md` exists, init backs it up and attempts to extract project info.

### Local Development

For rapid iteration during plugin development:

```bash
# Add local path as a marketplace
/plugin marketplace add /path/to/claude-mantra

# Install from local
/plugin install claude-mantra@claude-mantra

# After changes: uninstall and reinstall
/plugin uninstall claude-mantra@claude-mantra
/plugin install claude-mantra@claude-mantra
```

## Usage

Once installed, the hook runs automatically:

1. **On session start** - Context is injected immediately (startup, resume, clear, compact)
2. **Every prompt** shows freshness: `📍 Context: 12/20`
3. **Every 20 prompts** triggers periodic refresh (configurable)
4. **On refresh** you'll see: `📍 Context: 0/20 (refreshed)` followed by your context

### Context Files

Context uses a **two-tier pattern** with separate locations for base and project context:

**Base context** (shipped with plugin in `context/`):
```
context/
├── behavior.yml      # AI behavior rules (skeptical-first, evidence-based)
├── behavior.md       # Detailed behavior guide
├── context-format.yml # Context format specification
├── context-format.md  # Detailed format guide
└── format-guide.yml   # Compact YAML conventions
```

**Project extensions** (your project's `.claude/context/`):
```
.claude/context/
├── project.yml       # Project-specific context
├── testing.yml       # Testing patterns
└── custom.yml        # Your custom context
```

**Loading order**: base context → sibling plugins → project extensions → CLAUDE.md

- **`.yml` files** - Token-efficient assertions, injected on refresh
- **`.md` files** - Detailed guidance, read on-demand by Claude

See [FORMAT.md](FORMAT.md) for the full specification.

If no `.claude/context/*.yml` files exist, falls back to `CLAUDE.md` with a tip about multi-file support.

## Configuration

Create `.claude/config.json` to customize:

```json
{
  "context": {
    "periodicRefresh": {
      "enabled": true,
      "interval": 20
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `interval` | 20 | Prompts between context refreshes |

## Development

```bash
npm install
npm test    # Run Jest tests (58 specs)
```

## Why "mantra"?

A mantra is a phrase repeated to focus the mind. Claude's mind wanders. This brings it back.

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
| Jump to common solutions | Require 3+ documented examples |
| Single-source answers | Cross-reference multiple sources |
| Fill gaps with speculation | Research until gaps filled |

### Implementation Discipline

| Default Claude | Mantra Override |
|----------------|-----------------|
| Dive into code immediately | Discuss approach first (non-trivial) |
| Speculative fixes | Fix actual errors only |
| Snippets without context | Complete blocks with imports |
| Over-engineer | Minimal working implementation |

### Communication Style

| Default Claude | Mantra Override |
|----------------|-----------------|
| Verbose preambles | Skip preambles, direct, concise |
| Hesitant suggestions | Propose alternatives without hesitation |
| Passive acceptance | Challenge violations proactively |
| Polite hedging | Say "no" when something is wrong |

**The core insight**: Claude's default mode is helpful-subordinate. Mantra retrains it to be skeptical-peer. This is the shitty-but-important behavior work—making Claude actually useful instead of just agreeable.

## Plugin Family

claude-mantra is part of a plugin family that works together:

| Plugin | Purpose | Layer |
|--------|---------|-------|
| **[claude-memento](https://github.com/flexion/claude-memento)** | Session persistence | Persistence |
| **[claude-mantra](https://github.com/flexion/claude-mantra)** | Context refresh | Injection |
| **[claude-onus](https://github.com/flexion/claude-onus)** | Work-item automation | Integration |

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
    [mantra] ──► periodic refresh into working context
```

### Shared Naming Convention

All three plugins agree on this mapping:

```
Issue #42 (tracker)
    ↓
Branch: issue/feature-42/description
    ↓
Metadata: .claude/branches/issue-feature-42-description
    ↓
Session: .claude/sessions/42-description.md
```

### Interoperability

- **onus → memento**: Onus fetches issue details and populates the session file that memento manages
- **memento → mantra**: Mantra automatically discovers memento and loads its context on refresh
- **mantra → memento**: Mantra keeps behavioral rules fresh; memento persists the actual work state

When sibling plugins are installed in the same project, mantra automatically discovers them via `~/.claude/plugins/installed_plugins.json` and loads their context during refresh.

Each plugin works standalone but gains enhanced behavior when used together.

## License

ISC
