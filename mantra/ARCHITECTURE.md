# Plugin Architecture

## Overview

claude-mantra is a Claude Code plugin that periodically re-injects context files into Claude's working memory. It addresses "context drift" where Claude gradually forgets project guidance as conversations grow longer.

## Plugin Structure

```
claude-mantra/
├── .claude-plugin/
│   ├── plugin.json           # Plugin metadata
│   └── marketplace.json      # Marketplace definition (required by plugin system)
├── hooks/
│   ├── hooks.json            # Hook event registrations
│   └── context-refresh.js    # Hook implementation
├── context/                  # Base context (shipped with plugin)
│   ├── behavior.yml          # AI behavior rules
│   ├── behavior.md           # Detailed behavior guide
│   ├── context-format.yml    # Context format spec
│   ├── context-format.md     # Detailed format guide
│   └── format-guide.yml      # Compact YAML format reference
├── templates/context/        # Init templates for consumers
│   ├── README.md             # How to extend context
│   └── project.yml.example   # Example project context
├── scripts/
│   └── init.js               # Project initialization script
├── commands/
│   └── init.md               # /init slash command
└── examples/context/         # Legacy template files
```

Note: The `.claude/` directory in this repository contains project-specific files for developing claude-mantra itself (sessions, branches, context) and is not distributed with the plugin.

## How Context Loading Works

### Context Sources

The plugin loads context from multiple sources in a specific order:

**Loading order:**
1. **Base context** - `{plugin-root}/context/*.yml` (shipped with plugin)
2. **Sibling plugins** - Context from claude-memento and claude-onus if installed in same project
3. **Project extensions** - `{project}/.claude/context/*.yml` (consumer additions)
4. **CLAUDE.md fallback** - If present (with warning if modular context also exists)

### Sibling Plugin Discovery

The hook reads `~/.claude/plugins/installed_plugins.json` to find sibling plugins:
- Only includes plugins from the family: claude-mantra, claude-memento, claude-onus
- Only includes plugins where `projectPath` matches the current working directory
- Loads `context/*.yml` from each sibling's install path

### What Gets Injected

On refresh, the hook:
1. Finds all `.yml` files in base context (plugin root)
2. Finds sibling plugins and loads their context
3. Finds all `.yml` files in consumer's `.claude/context/` directory
4. Reads and concatenates all contents
5. Injects them as `additionalContext` in the hook response

```
---
**Context Refresh** (session startup)
### behavior.yml
[contents from plugin root]

### context-format.yml
[contents from plugin root]

## From: claude-memento@flexion-claude-memento
### sessions.yml
[contents from sibling plugin]

### project.yml
[contents from consumer project]
```

### Base Context

The plugin ships with base context that provides:
- **behavior.yml** - AI behavior rules (skeptical-first, evidence-based troubleshooting)
- **context-format.yml** - Specification for the context format
- **format-guide.yml** - Compact YAML conventions

This base context is always injected, ensuring consistent behavior across all projects.

## Hook Behavior

### Events

| Event | When | Action |
|-------|------|--------|
| `SessionStart` | New session, resume, clear, compact | Reset counter to 0, inject all context |
| `UserPromptSubmit` | Every user message | Increment counter, inject if counter hits 0 |

### State Management

The hook maintains a counter in `~/.claude/mantra-state.json`:
```json
{"count": 5}
```

Counter increments with each prompt and resets to 0:
- On session start
- When counter reaches `refreshInterval` (triggers refresh)

### Output Format

Every prompt gets a freshness indicator in `systemMessage`:
```
📍 Context: 5/20
```

On refresh, `additionalContext` contains the concatenated context files.

## Configuration

Consumers configure the plugin via `.claude/config.json`:

```json
{
  "context": {
    "periodicRefresh": {
      "interval": 20
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `interval` | 20 | Number of prompts between context refreshes |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code                                                  │
│                                                              │
│  ┌──────────────┐    stdin (JSON)    ┌──────────────────┐   │
│  │ Hook Event   │ ─────────────────► │ context-refresh  │   │
│  │ (Session/    │                    │ .js              │   │
│  │  Prompt)     │ ◄───────────────── │                  │   │
│  └──────────────┘    stdout (JSON)   └────────┬─────────┘   │
│                                               │              │
└───────────────────────────────────────────────┼──────────────┘
                                                │
    ┌───────────────────────────────────────────┼───────────────┐
    │ Plugin Root                               │               │
    │                           ┌───────────────▼─────────────┐ │
    │                           │ context/                    │ │
    │                           │   behavior.yml  ◄── read    │ │
    │                           │   context-format.yml        │ │
    │                           │   format-guide.yml          │ │
    │                           └─────────────────────────────┘ │
    └───────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │ Sibling Plugins (if installed in same project)            │
    │                                                           │
    │  ~/.claude/plugins/cache/<marketplace>/<plugin>/          │
    │    context/*.yml  ◄── read if projectPath matches         │
    │                                                           │
    └───────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │ Consumer Project                                          │
    │                                                           │
    │  ┌─────────────────────────────────────┐                  │
    │  │ .claude/context/                    │                  │
    │  │   project.yml   ◄─── read           │                  │
    │  │   custom.yml    ◄─── read           │                  │
    │  └─────────────────────────────────────┘                  │
    │                                                           │
    │  ┌─────────────────────────────────────┐                  │
    │  │ .claude/config.json                 │                  │
    │  │   context.periodicRefresh.interval  │                  │
    │  └─────────────────────────────────────┘                  │
    │                                                           │
    └───────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │ User Home                                                 │
    │                                                           │
    │  ~/.claude/mantra-state.json                              │
    │    {"count": 5}  ◄─── read/write                          │
    │                                                           │
    │  ~/.claude/plugins/installed_plugins.json                 │
    │    plugin registry  ◄─── read (for sibling discovery)     │
    │                                                           │
    └───────────────────────────────────────────────────────────┘
```

## The /init Command

The `/init` slash command scaffolds context files for new consumers:

1. Creates `.claude/context/` directory if needed
2. Copies README.md explaining how to extend context
3. Creates `project.yml` from template (or extracts from CLAUDE.md if present)
4. If CLAUDE.md exists, backs it up and attempts basic decomposition

After `/init`, project context files belong to the consumer and can be freely modified. Base context from the plugin root is always injected regardless of consumer modifications.

## Known Limitations

### VS Code Extension Visibility

The freshness indicator (`📍 Context: 5/20`) is returned in both `systemMessage` and `additionalContext`, but its visibility differs by platform:

| Platform | `systemMessage` | `additionalContext` |
|----------|-----------------|---------------------|
| CLI | Visible in console | Visible in conversation |
| VS Code Extension | Not prominently displayed | Visible in conversation |

In the VS Code extension, `systemMessage` values from hooks don't appear as prominently as they do in the CLI.

## Design Decisions

### Why base context + project extensions?

The plugin provides base behavioral rules (skeptical-first, evidence-based troubleshooting) while allowing projects to add their own context. This ensures:
- Consistent AI behavior across all projects using the plugin
- Projects can add domain-specific context without modifying plugin files
- Plugin updates can improve base behavior without overwriting consumer customizations

### Why sibling plugin discovery?

The plugin family (mantra, memento, onus) is designed to work together. Sibling discovery enables:
- Automatic context loading from companion plugins
- No manual configuration needed - just install the plugins
- Each plugin can contribute its own behavioral rules

### Why YAML only for injection?

Only `.yml` files are injected to minimize token usage. The companion `.md` files provide detailed examples that Claude can read on-demand, but they aren't automatically injected on every refresh.

### Why global state file?

The counter is stored in `~/.claude/` rather than the project directory because:
- It's transient state, not project configuration
- Avoids polluting project with temporary files
- Persists across project switches within a session
