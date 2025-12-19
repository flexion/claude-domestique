# Plugin Architecture

## Overview

memento is a Claude Code plugin that provides session management for persisting work context across conversation resets, branch switches, and team handoffs.

**Core Concept**: 1 Session = 1 Issue = 1 Branch = 1 Branch Metadata File

## Plugin Structure

```
memento/
├── .claude-plugin/
│   ├── plugin.json           # Plugin metadata
│   └── marketplace.json      # Marketplace definition
├── context/                  # Base context (shipped with plugin)
│   ├── sessions.yml          # Compact session workflow reference
│   └── sessions.md           # Detailed workflow guide
├── templates/                # Session file templates
│   ├── feature.md
│   ├── fix.md
│   └── chore.md
├── tools/                    # Session management tools
│   ├── session.js            # Core module (shared utilities)
│   ├── create-session.js     # Create session + branch metadata
│   └── get-session.js        # Find session from current branch
├── commands/
│   ├── init.md               # /init slash command
│   └── session.md            # /session status command
└── hooks/
    ├── hooks.json            # Hook event registrations
    └── session-startup.js    # Hook implementation
```

## How Session Management Works

### Session Files

Sessions are markdown files that persist work context:

**Location**: Consumer's `.claude/sessions/`

**Naming**:
- Feature/Fix with issue: `<IssueNumber>-<desc>.md` (e.g., `123-add-auth.md`)
- Chore: `chore-<desc>.md` (e.g., `chore-update-deps.md`)

**Content Structure**:
- Details (issue, branch, type, created, status)
- Goal/Objective
- Session Log (timestamped entries)
- Key Decisions
- Files Changed
- Next Steps

### Branch Metadata

Compact files that map branches to sessions:

**Location**: Consumer's `.claude/branches/`

**Naming**: Branch name with `/` → `-`
- `issue/feature-123/add-auth` → `issue-feature-123-add-auth`

**Content**: ~10 lines mapping to session file, status, current work

### Context Loading

When mantra is installed as a sibling plugin:
1. Base context (`context/sessions.yml`) is auto-loaded on refresh
2. Provides Claude with session workflow rules
3. Detailed guide (`context/sessions.md`) available on-demand

## Hook Behavior

### Events

| Event | When | Action |
|-------|------|--------|
| `SessionStart` | New session, resume, clear, compact | Auto-detect session from branch |
| `UserPromptSubmit` | Every user message | Increment counter, prompt session update at interval |

### State Management

The hook maintains a counter in `~/.claude/memento-state.json`:
```json
{"count": 5}
```

Counter increments with each prompt and resets when it reaches the update interval (configured via `.claude/config.json`).

### Output Format

On session detection:
```
📍 Context: 5/50

Session detected for branch: issue/feature-123/add-auth
Read session: .claude/sessions/123-add-auth.md
```

On update prompt (at interval):
```
📍 Context: 50/50 (refreshed)

Consider updating the session file with recent progress.
```

## Tools

Tools run from the plugin root and operate on the consumer's project directory. They use `process.cwd()` for consumer paths and `__dirname` for plugin paths (templates).

### get-session.js

Find session from current git branch. Called internally by hooks.

**For users**: Read `.claude/branches/<sanitized-branch>` then `.claude/sessions/<session>.md`

**Flags** (when called by hooks):
- `--json` - JSON output
- `--path` - Just the session file path
- `--content` - Session file contents
- `--quiet` - Suppress error messages

### create-session.js

Create branch metadata and session file. Called via `/session` slash command.

**Usage**:
```bash
git checkout -b issue/feature-123/add-auth
/session  # Creates session for current branch
```

**Creates**:
- `.claude/branches/issue-feature-123-add-auth`
- `.claude/sessions/123-add-auth.md`

**Flags**:
- `--force` - Overwrite existing session

### session.js

Core module with shared utilities:
- Branch name parsing (GitHub, Jira, Azure DevOps patterns)
- Path configuration (consumer project paths + plugin template paths)
- Template loading (from plugin root)
- Directory management (in consumer project)

## The /init Command

The `/init` slash command creates session directories:

1. Creates required directories:
   - `.claude/sessions/` - session files
   - `.claude/branches/` - branch-to-session mapping

That's it. No files are copied to the consumer project. Tools run from the plugin, templates are read from the plugin, and context is auto-loaded by mantra.

## Configuration

Consumers configure the plugin via `.claude/config.json`:

```json
{
  "session": {
    "updateInterval": 50
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `updateInterval` | 50 | Number of prompts between update reminders |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code                                                  │
│                                                              │
│  ┌──────────────┐    stdin (JSON)    ┌──────────────────┐   │
│  │ Hook Event   │ ─────────────────► │ session-startup  │   │
│  │ (Session/    │                    │ .js              │   │
│  │  Prompt)     │ ◄───────────────── │                  │   │
│  └──────────────┘    stdout (JSON)   └────────┬─────────┘   │
│                                               │              │
└───────────────────────────────────────────────┼──────────────┘
                                                │
    ┌───────────────────────────────────────────┼───────────────┐
    │ Plugin Root                               │               │
    │                           ┌───────────────▼─────────────┐ │
    │                           │ hooks/                      │ │
    │                           │   hooks.json                │ │
    │                           │   session-startup.js ◄──────┤ │
    │                           └─────────────────────────────┘ │
    │                           ┌─────────────────────────────┐ │
    │                           │ context/                    │ │
    │                           │   sessions.yml  ◄── loaded  │ │
    │                           │   sessions.md   by mantra   │ │
    │                           └─────────────────────────────┘ │
    │                           ┌─────────────────────────────┐ │
    │                           │ templates/                  │ │
    │                           │   feature.md  ◄── read      │ │
    │                           │   fix.md      when creating │ │
    │                           │   chore.md    sessions      │ │
    │                           └─────────────────────────────┘ │
    │                           ┌─────────────────────────────┐ │
    │                           │ tools/                      │ │
    │                           │   session.js     ◄── run    │ │
    │                           │   create-session.js from    │ │
    │                           │   get-session.js    plugin  │ │
    │                           └─────────────────────────────┘ │
    └───────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │ Consumer Project                                          │
    │                                                           │
    │  ┌─────────────────────────────────────┐                  │
    │  │ .claude/                            │                  │
    │  │   sessions/   ◄─── session files    │                  │
    │  │   branches/   ◄─── branch metadata  │                  │
    │  └─────────────────────────────────────┘                  │
    │                                                           │
    │  ┌─────────────────────────────────────┐                  │
    │  │ .claude/config.json                 │                  │
    │  │   session.updateInterval            │                  │
    │  └─────────────────────────────────────┘                  │
    │                                                           │
    └───────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │ User Home                                                 │
    │                                                           │
    │  ~/.claude/memento-state.json                             │
    │    {"count": 5}  ◄─── read/write                          │
    │                                                           │
    └───────────────────────────────────────────────────────────┘
```

## Sibling Plugin Integration

memento is designed to work with:

- **mantra**: Context refresh - loads `context/sessions.yml` automatically
- **onus**: Git workflow - commit formats, PR workflows

When mantra discovers memento as a sibling plugin, session workflow rules are automatically included in context refreshes.

## Branch Naming Patterns

The tools support multiple platforms:

| Platform | Pattern | Session File |
|----------|---------|--------------|
| GitHub | `issue/feature-N/desc` | `N-desc.md` |
| Jira | `feature/PROJ-123/desc` | `PROJ-123-desc.md` |
| Azure DevOps | `feature/456/desc` | `456-desc.md` |
| No issue | `chore/desc` | `chore-desc.md` |

## Design Decisions

### Why branch-to-session mapping?

Each branch represents a unit of work (feature, fix, chore). The mapping ensures:
- Sessions are automatically found when switching branches
- Work context follows git workflow
- No manual session management needed

### Why collaborative session updates?

Rather than a rigid CLI for session updates:
- Claude edits session files directly using the Edit tool
- User reviews changes in git diff or IDE
- Both can add entries naturally in conversation
- Updates happen at natural checkpoints

### Why session + code atomic commits?

Session files version WITH the code they describe:
- Git history shows what was done and why together
- Teammates can understand decisions at any point
- Session is always in sync with codebase state

### Why periodic update prompts?

Instead of requiring explicit session updates:
- Hook tracks prompt count
- At configurable intervals, reminds Claude to update
- Keeps session current without constant interruption

### Why run tools from plugin root?

Rather than copying tools to consumer projects:
- Simpler `/init` - just creates two directories
- No duplication in consumer projects
- Plugin updates automatically apply to all consumers
- Templates and tools are always in sync
- Consumer's `.claude/` only contains their data (sessions, branches)
