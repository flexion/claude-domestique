# onus

> "The burden is mine now."

The awful-but-important work that developers hate: JIRA tickets, Azure DevOps work items, commit messages, PR descriptions. Someone has to carry this load. Now Claude does.

### Flexion Fundamentals

onus helps developers embody Flexion fundamentals while staying in flow:

- **Never compromise on quality** — Ensures proper commit messages, ticket updates, and PR descriptions
- **Lead by example** — Handles PM accountability work so it actually gets done
- **Empower customers to adapt** — Keeps stakeholders informed via trackers without breaking developer focus

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
- **Auto-populates sessions** with issue details (integrates with [memento](../memento))
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
| **[memento](../memento)** | Session persistence | Persistence |
| **[mantra](../mantra)** | Context refresh | Injection |
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

### Shared Naming Convention

All three plugins agree on this mapping:

```
Issue #42 (tracker)
    ↓
Branch: issue/feature-42/description
    ↓
Metadata: .claude/branches/issue-feature-42-description
    ↓
Session: .claude/sessions/issue-feature-42-description.md
```

### Interoperability

- **onus → memento**: Onus fetches issue details and populates the session file that memento manages
- **memento → mantra**: Session files live alongside context files; mantra can refresh session-aware context
- **mantra → memento**: Mantra keeps behavioral rules fresh; memento persists the actual work state

Each plugin works standalone but gains enhanced behavior when used together.

## Companion Plugins

These external plugins complement onus workflows:

| Plugin | Purpose | When to Use |
|--------|---------|-------------|
| **[pr-review-toolkit](https://github.com/anthropics/claude-code/tree/main/plugins/pr-review-toolkit)** | Code quality review | Before creating PRs |

### pr-review-toolkit

Official Anthropic plugin with 6 specialized review agents (comment accuracy, test coverage, error handling, type design, code review, simplification). Install it for thorough code review before PR creation:

```bash
/plugins
# Search for "pr-review-toolkit" and install
```

When onus generates a PR, consider running a review first:
```
# Review before PR
/pr-review-toolkit:review-pr

# Then create PR with onus
```

## Installation

```bash
# Add the marketplace
/plugin marketplace add flexion/claude-domestique

# Install the plugin
/plugin install onus@claude-domestique
```

That's it. Work item detection works automatically—no initialization required.

## How It Works

onus uses Claude Code's hook system for automatic work item detection:

| Hook | When | What Happens |
|------|------|--------------|
| **SessionStart** | New conversation | Detects issue number from branch, injects work item context |
| **UserPromptSubmit** | Every prompt | Shows issue number in status line |

### Automatic Issue Detection

When you're on a branch like `issue/feature-42/add-auth`:
1. onus extracts issue number `42` from the branch name
2. Shows `📋 Issue: 42` in status line
3. Use `/onus:fetch 42` to load full issue details

### Status Line

Every prompt shows issue status:

```
📋 Onus: #3 ✓
📋 Issue: 42
```

## Commands

| Command | Description |
|---------|-------------|
| `/onus:fetch` | Fetch issue details from tracker |
| `/onus:create` | Create new work item |
| `/onus:update` | Update work item (comment, status, fields) |
| `/onus:close` | Close a work item |

## Why "onus"?

*Onus* (Latin): a burden, duty, or responsibility.

"The onus is on you to update the ticket."
"The onus of keeping JIRA in sync falls on someone."

It's the weight you carry. Now Claude carries it for you.

## License

MIT
