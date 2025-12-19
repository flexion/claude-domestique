# onus

> "The burden is mine now."

The awful-but-important work that developers hate: JIRA tickets, Azure DevOps work items, commit messages, PR descriptions. Someone has to carry this load. Now Claude does.

## The Problem

You're in flow. You've just solved an elegant problem. Now you need to:

1. Update the JIRA ticket with what you did
2. Write a commit message that references the ticket
3. Create a PR description that satisfies the template
4. Link it all together so PMs can track progress

You groan. The context switch kills your momentum. You write "fixed bug" and move on. The PM asks for details. Rinse, repeat.

## The Solution

onus handles the project management bureaucracy:

- **Fetches work items** from GitHub Issues, JIRA, Azure DevOps
- **Auto-populates sessions** with issue details (integrates with [memento](https://github.com/flexion/claude-domestique/tree/main/memento))
- **Generates commit messages** that reference tickets properly
- **Creates PR descriptions** from your session and work item
- **Updates work items** with progress (bidirectional sync)

You code. Claude carries the burden.

## Features

- **Multi-platform support** - GitHub Issues, JIRA, Azure DevOps
- **Issue-to-session bridge** - Fetches requirements, acceptance criteria, links
- **Commit message formatting** - `#123 - verb description` with proper linking
- **PR description generation** - Pulls from session log, maps to acceptance criteria
- **Work item updates** - Push status, comments, links back to the tracker
- **Branch naming** - Suggests `issue/feature-N/description` from work item

## Plugin Family

onus is part of a plugin family that works together:

| Plugin | Purpose | Layer |
|--------|---------|-------|
| **[memento](https://github.com/flexion/claude-domestique/tree/main/memento)** | Session persistence | Persistence |
| **[mantra](https://github.com/flexion/claude-domestique/tree/main/mantra)** | Context refresh | Injection |
| **[onus](https://github.com/flexion/claude-domestique/tree/main/onus)** | Work-item automation | Integration |

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
- **memento → mantra**: Session files live alongside context files; mantra can refresh session-aware context
- **mantra → memento**: Mantra keeps behavioral rules fresh; memento persists the actual work state

Each plugin works standalone but gains enhanced behavior when used together.

## Why "onus"?

*Onus* (Latin): a burden, duty, or responsibility.

"The onus is on you to update the ticket."
"The onus of keeping JIRA in sync falls on someone."

It's the weight you carry. Now Claude carries it for you.

## License

MIT
