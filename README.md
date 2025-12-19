# Claude Domestique

**Your strategic coding partner.**

Like a cycling domestique, it carries the water, stays focused on your goals, and handles the unglamorous work you don't want to do.

---

## The Plugins

### [memento](./memento) — Session Persistence

> "Remember Sammy Jankis."

Like Leonard in *Memento*, Claude can't form long-term memories. Context window fills up, conversation resets, everything vanishes. **memento** gives Claude its tattoos—session files that persist decisions, progress, and context across resets.

- 1 Session = 1 Issue = 1 Branch
- Automatic context restoration on startup
- Survives conversation resets and compaction
- Team handoffs with full context

### [mantra](./mantra) — Context Refresh

> "I told you. You agreed. You forgot. Repeat."

You've written the perfect CLAUDE.md. Claude reads it. Claude agrees. By turn 47, Claude ignores half of it. **mantra** periodically re-injects behavioral guidance before it fades into the abyss of distant tokens.

- Session start and periodic refresh
- Anti-sycophancy rules (skeptical-peer, not helpful-subordinate)
- Evidence-based troubleshooting enforcement
- Freshness indicator on every prompt

### [onus](./onus) — Work-Item Automation

> "The burden is mine now."

JIRA tickets, Azure DevOps work items, commit messages, PR descriptions. The awful-but-important work that kills your flow. **onus** handles the project management bureaucracy so you can code.

- Fetches issues from GitHub, JIRA, Azure DevOps
- Auto-populates session files with requirements
- Generates commit messages and PR descriptions
- Bidirectional sync with trackers

---

## How They Work Together

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

Each plugin works standalone but gains enhanced behavior when used together.

---

## Installation

### Add the Marketplace

```bash
/plugin marketplace add flexion/claude-domestique
```

### Install Plugins

```bash
# Install all three
/plugin install memento@domestique
/plugin install mantra@domestique
/plugin install onus@domestique

# Or just the ones you need
/plugin install mantra@domestique
```

### Initialize in Your Project

```bash
/memento:init    # Session directories
/mantra:init     # Context files
/onus:init       # Work-item config
```

---

## Commands

| Plugin | Command | Description |
|--------|---------|-------------|
| memento | `/memento:init` | Initialize session directories |
| memento | `/memento:session` | Show current session status |
| mantra | `/mantra:init` | Scaffold context files |
| onus | `/onus:init` | Initialize work-item config |
| onus | `/onus:fetch` | Fetch issue details |

---

## Shared Conventions

All plugins agree on this mapping:

```
Issue #42 (tracker)
    ↓
Branch: issue/feature-42/description
    ↓
Metadata: .claude/branches/issue-feature-42-description
    ↓
Session: .claude/sessions/42-description.md
```

---

## License

MIT
