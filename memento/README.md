# memento

> "Remember Sammy Jankis."

Like Leonard in *Memento*, Claude can't form long-term memories. memento gives Claude its tattoos—session files that persist decisions, progress, and context across conversation resets.

### Flexion Fundamentals

memento helps developers embody Flexion fundamentals across conversation boundaries:

- **Design as you go** — Session files are **living design documents** that evolve from requirements through implementation
- **Lead by example** — Persists decisions and design rationale so nothing is lost to "fixed bug" amnesia
- **Empower customers to adapt** — Enables team handoffs with full design context and history

## The Problem

In Christopher Nolan's *Memento* (2000), Leonard Shelby suffers from anterograde amnesia—he can't form new memories. Every few minutes, his slate wipes clean. To function, he tattoos critical facts on his body and leaves himself Polaroids and notes.

Claude has the same problem. Context window fills up, conversation resets, and everything learned—decisions made, approaches tried, dead ends discovered—vanishes.

## The Solution

memento is Leonard's system for Claude: persistent session files that survive the reset, letting Claude wake up, read its own notes, and pick up exactly where it left off.

## Key Concepts

- **1 Session = 1 Issue = 1 Branch** - Clean mapping between work units
- **Atomic commits** - Session file versions WITH the code it describes
- **Progress checkpointing** - Update throughout work, not just at the end

## Features

- **Branch metadata files** - Compact lookup to find session from current branch
- **Session templates** - Standardized structure for feature vs chore sessions
- **Automatic context restoration** - Branch → session → next steps lookup
- **Session log** - Chronological record of what was done, when, and why
- **Key decisions documentation** - Captures WHY, not just WHAT
- **Learnings capture** - What surprised you, what would you do differently
- **Files changed tracking** - Inventory of modified files for handoff
- **Blockers documentation** - Capture what's blocking before stepping away

## Use Cases

- **Survives conversation resets** - Context window fills up, start new chat, read session, continue
- **Survives context compaction** - When Claude summarizes, session file has the real details
- **Team handoffs** - Teammate checks out branch, reads session, has full context

## Plugin Family

memento is part of a plugin family that works together:

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

## Installation

```bash
# Add the marketplace
/plugin marketplace add flexion/claude-domestique

# Install the plugin
/plugin install memento@claude-domestique
```

That's it. Session management works automatically—no initialization required.

## How It Works

memento uses Claude Code's hook system for automatic session management:

| Hook | When | What Happens |
|------|------|--------------|
| **SessionStart** | New conversation | Creates session file for feature branches, injects session context |
| **UserPromptSubmit** | Every prompt | Shows session status in status line |

### Automatic Session Creation

When you start a conversation on a feature branch like `issue/feature-42/add-auth`:
1. memento detects the branch name
2. Creates `.claude/sessions/issue-feature-42-add-auth.md` if it doesn't exist
3. Injects session file path into Claude's context
4. Claude reads the session and picks up where you left off

## Usage

### Start Working

```bash
# Create a branch for your work
git checkout -b issue/feature-42/add-auth

# Start Claude Code - session is created automatically
claude
```

### Status Line

Every prompt shows session status:

```
📂 Memento: #3 ✓
📂 Session: /path/to/.claude/sessions/issue-feature-42-add-auth.md
```

### Check Session Status

```
/memento:session
```

Shows current session details:
```
Session: issue-feature-42-add-auth.md
Branch: issue/feature-42/add-auth
Type: feature
Issue: #42
Status: in-progress

Next Steps:
1. First pending task
2. Second pending task
```

## Commands

| Command | Description |
|---------|-------------|
| `/memento:session` | Show current session status or create new session |

## Requirements

- Node.js (required by Claude CLI)
- All tools written in JavaScript

## License

MIT
