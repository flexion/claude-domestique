# Context Directory Guide

This directory contains project-specific context files that Claude loads automatically.

## Current Structure

```
.claude/context/
├── README.md                 (this file - overview)
│
├── # Format Guide
├── format-guide.yml          (how to read/write compact YAML)
│
├── # Behavior & Workflow (from claude-domestique)
├── behavior.yml              (compact: AI behavior rules)
├── assistant-preferences.md  (detailed: implementation protocol)
├── git.yml                   (compact: git workflow rules)
├── git-workflow.md           (detailed: commit/PR examples)
├── sessions.yml              (compact: session management)
├── session-workflow.md       (detailed: session patterns)
│
└── # Project-Specific
    └── project.yml           (mantra project context)
```

## Two-File Pattern

Each topic has TWO files:

### 1. YAML File (Compact, Machine-Optimized)
**Purpose:** Quick context for Claude (token-efficient)
**Format:** Key-value pairs, minimal prose
**Example:**
```yaml
domain: context-refresh-plugin
patterns: hooks, periodic-injection
tech-stack: typescript, node
```

### 2. Markdown Guide (Detailed, Human-Readable)
**Purpose:** Elaboration, examples, edge cases
**Format:** Full prose, code examples, troubleshooting

## When Claude Loads These

**Automatic loading:**
- Session start (reads all .yml files)
- Periodic refresh (every 20 interactions)
- Manual: "reload context"

**On-demand loading:**
- When Claude needs deeper context, it reads corresponding .md file

## File Categories

### Core Workflow (from claude-domestique)
These files establish baseline Claude behavior:
- `behavior.yml` / `assistant-preferences.md` - How Claude should behave
- `git.yml` / `git-workflow.md` - Git conventions (no attribution, HEREDOC commits)
- `sessions.yml` / `session-workflow.md` - Session management patterns

### Project-Specific
- `project.yml` - mantra domain, architecture, requirements
- (add more as project evolves: `test.yml`, `deploy.yml`, etc.)

## How to Maintain

### Adding New Context

1. Create compact YAML file (assertions, rules)
2. Create detailed guide markdown file (examples, edge cases)
3. Test: Start new session, verify context loads

### Updating Context

1. Update YAML first (Claude reads this most often)
2. Update guide with new details/examples

## Tips

- Keep YAML files under 100 lines (token efficiency)
- Use guides for examples, edge cases, troubleshooting
- Link to actual code: `src/path/file.ts:123`
- Update when architecture changes
- Delete obsolete context (keeps context fresh)
