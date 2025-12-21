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

![All three plugins working together](images/plugins-in-action.png)

*Session resumption showing mantra (context refresh counter), onus (issue tracking), and memento (session file) working together. Claude reads the session file and picks up exactly where the previous conversation left off.*

---

## Requirements

### Required

| Tool | Version | Used By | Purpose |
|------|---------|---------|---------|
| [Claude Code](https://claude.ai/code) | 2.0.12+ | All | Plugin host (plugin system introduced in v2.0.12) |
| [Node.js](https://nodejs.org/) | 18+ | All | Runtime for hooks and scripts |
| [git](https://git-scm.com/) | 2.x | All | Branch detection, commits, session tracking |

### Platform-Specific (onus)

When using `/onus:fetch`, Claude will use these tools to retrieve work items:

| Tool | Platform | Purpose |
|------|----------|---------|
| [GitHub CLI (gh)](https://cli.github.com/) | GitHub | Fetch issues, create PRs (recommended) |
| Claude's WebFetch | JIRA, Azure DevOps | Built-in HTTP tool for API calls |

> **Note**: For JIRA/Azure DevOps, Claude uses its built-in WebFetch capability. No additional tools required.

### Environment Variables (for onus)

| Variable | Platform | How to Get |
|----------|----------|------------|
| `GITHUB_TOKEN` | GitHub | [Create PAT](https://github.com/settings/tokens) with `repo` scope |
| `JIRA_TOKEN` | JIRA | `echo -n "email:api_token" \| base64` ([Get API token](https://id.atlassian.com/manage-profile/security/api-tokens)) |
| `AZURE_DEVOPS_TOKEN` | Azure DevOps | `echo -n ":pat" \| base64` ([Create PAT](https://dev.azure.com/_usersSettings/tokens) with Work Items Read) |

### Verification

```bash
# Check required tools
git --version          # git version 2.x
node --version         # v18.x or higher
claude --version       # Claude Code 2.x

# Check GitHub CLI (optional, for onus with GitHub)
gh --version           # gh version 2.x
gh auth status         # Verify authentication
```

---

## Installation

### Add the Marketplace

```bash
/plugin marketplace add flexion/claude-domestique
```

### Install Plugins

```bash
# Install all three
/plugin install memento@claude-domestique
/plugin install mantra@claude-domestique
/plugin install onus@claude-domestique

# Or just the ones you need
/plugin install mantra@claude-domestique
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

## Development

### Version Management

Bump plugin versions consistently across all config files:

```bash
node scripts/bump-version.js <plugin> <patch|minor|major>

# Examples:
node scripts/bump-version.js memento patch   # 0.1.10 → 0.1.11
node scripts/bump-version.js mantra minor    # 0.1.5 → 0.2.0
```

This updates `package.json`, `plugin.json`, and `marketplace.json` atomically.

### Testing

Each plugin has its own test suite:

```bash
cd mantra && npm test   # Jest
cd memento && npm test  # Node test runner
cd onus && npm test     # Jest
```

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
Session: .claude/sessions/issue-feature-42-description.md
```

---

## Context System

The plugins use a two-tier context system: **base context** (shipped with plugins) and **project context** (your customizations).

### What Plugins Provide

Each plugin ships base context files that apply universally:

| Plugin | Base Context | Purpose |
|--------|--------------|---------|
| **mantra** | `behavior.yml` | AI behavior (skeptical-first, evidence-based) |
| **mantra** | `format-guide.yml` | Compact YAML conventions |
| **mantra** | `context-format.yml` | Context system documentation |
| **memento** | `sessions.yml` | Session workflow and conventions |
| **onus** | `git.yml` | Git workflow (branches, commits, PRs) |
| **onus** | `work-items.yml` | Work item integration patterns |

These load automatically when plugins are installed—no action required.

### Loading Order

```
Plugin base context → Project .claude/context/ → CLAUDE.md
```

Project files **extend** (not replace) plugin base. Your customizations add to the defaults.

### Project-Specific Context

Add context files to your project's `.claude/context/` directory:

```
your-project/
└── .claude/
    └── context/
        ├── project.yml      # Always: tech stack, domain, commands
        ├── test.yml         # If: project has specific test patterns
        ├── deploy.yml       # If: project has deployment process
        └── git.yml          # If: different branch/commit conventions
```

#### Always Add: `project.yml`

Every project should have a `project.yml` with:

```yaml
# Project Context
name: my-project
domain: e-commerce, payments

## Technology Stack
language: typescript
framework: nextjs
database: postgresql

## Commands
test: npm test
build: npm run build
dev: npm run dev

## Domain Terminology
sku: stock keeping unit (product identifier)
cart: shopping cart (temporary order storage)
```

#### Add When Needed

| File | When to Add | Example |
|------|-------------|---------|
| `test.yml` | Project has specific test patterns | `./gradlew test` vs `npm test` |
| `deploy.yml` | Project has deployment process | Expand-contract, slot swaps |
| `git.yml` | Different conventions than default | `WorkItemID-desc` vs `issue/feature-N/desc` |
| `azure-devops.yml` | Project uses Azure DevOps | Area paths, iteration, REST API |

### Override Examples

#### Custom Git Conventions

If your project uses Azure DevOps work item IDs instead of GitHub issues:

```yaml
# .claude/context/git.yml
# Extends onus base git.yml

branch: WorkItemID-desc | chore/desc
commit: |
  "WorkItemID - verb desc" OR "chore - desc"
  (use HEREDOC format)
test-before: ./gradlew test
examples:
  branch-wi: 111713-add-customer-search
  commit-wi: "111713 - add customer search\n- Add sales rep field"
```

#### Custom Test Strategy

```yaml
# .claude/context/test.yml
when: after-each-method
pyramid: unit > integration > e2e
run:
  unit: ./gradlew test (before-commit)
  integration: ./gradlew integrationTest (before-PR)
placement:
  unit: src/test/java
  integration: src/integrationTest/java
```

#### Deployment Patterns

```yaml
# .claude/context/deploy.yml
platform: azure-app-service (deployment-slots)
order: database-migration → backend-deploy → swap-slots → frontend-deploy
pattern: expand-contract (3-phase: expand → migrate → contract)
critical: backward-compatibility (old-backend-works-with-new-db)
```

### File Format

Context files use compact YAML optimized for Claude:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `→` | Flow/sequence | `implement → test → commit` |
| `>` | Priority | `unit > integration > e2e` |
| `\|` | Alternatives | `issue/feature-N/desc \| chore/desc` |
| `:` | Key-value | `language: typescript` |

Keep files compact: 10-30 lines, no prose, one fact per line.

### AI-Managed Files

The `*.yml` context files are **AI-managed**—optimized for Claude, not human editing. The compact format achieves ~89% token reduction compared to prose.

**To modify context files:**
1. Describe your changes to Claude in natural language
2. Claude writes the compact YAML
3. Review and commit the result

Example:
> "Add a rule that we always run integration tests before PRs"

Claude translates this to the appropriate compact YAML format.

---

## License

MIT
