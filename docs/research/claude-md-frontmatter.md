# Research: CLAUDE.md Frontmatter for Context Control

## Current State

### Native Claude Code Behavior
- **CLAUDE.md**: Plain markdown, NO frontmatter support
- **`.claude/rules/`**: Supports frontmatter with `paths` field for conditional loading
- **Subagents/Skills**: Use frontmatter for `name`, `description`, `tools`, `model`
- **@import syntax**: CLAUDE.md supports `@path/to/file` includes

### mantra Current Behavior
- Loads `.claude/context/*.yml` files
- Does NOT currently load CLAUDE.md (despite documentation saying "fallback")
- No frontmatter parsing anywhere

## Opportunity: Native Rules Migration

Claude Code's `.claude/rules/` already supports path-scoped frontmatter:

```markdown
---
paths: src/api/**/*.ts
---
# API Development Rules
```

**Consideration**: Could migrate from `.claude/context/` to `.claude/rules/`?

| Aspect | .claude/context/ (mantra) | .claude/rules/ (native) |
|--------|---------------------------|-------------------------|
| Format | YAML files | Markdown with optional frontmatter |
| Scoping | None (all files) | Path-based globs |
| Injection | Via hook | Native by Claude |
| Refresh | Periodic (mantra) | Always loaded |

**Problem**: Rules are markdown, not compact YAML. Token efficiency lost.

## Opportunity: Custom Frontmatter in CLAUDE.md

mantra could parse frontmatter in project CLAUDE.md to control context loading:

### Proposed Schema

```yaml
---
# Context Control
mantra:
  refresh-interval: 10              # Override default 5
  skip: [behavior.yml]              # Don't load from base
  include: [custom.yml]             # Extra files to load
  sources: [base, project]          # Skip sibling context

# Plugin Configuration
memento:
  session-dir: .sessions            # Custom location

onus:
  platform: jira                    # github | jira | azure
  project-key: ABC

# Token Management
context:
  budget: 2000                      # Target token limit
  priority:                         # Loading priority
    - project.yml
    - git.yml
    - behavior.yml
---

# Project Overview
...rest of CLAUDE.md...
```

### Benefits
1. **Single config location** - Project authors configure in familiar CLAUDE.md
2. **Plugin awareness** - Plugins can check for their config section
3. **Graceful degradation** - No frontmatter = default behavior
4. **Token control** - Budget hints for context sizing

### Implementation Approach

```javascript
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: null, body: content };
  const yaml = require('js-yaml');
  return {
    frontmatter: yaml.load(match[1]),
    body: content.slice(match[0].length).trim()
  };
}
```

## Opportunity: Extend .claude/context/*.yml Headers

Alternative: Use structured header in yml files themselves:

```yaml
# Current (comment-based)
companion: behavior.md

# Extended (structured)
meta:
  companion: behavior.md
  priority: 1
  paths: ['**/*.ts']        # Only when working on TS files
  token-budget: 200
```

**Problem**: Changes yml format, requires updates everywhere.

## Recommendations

### Short-term (this chore)
1. Document findings
2. Decide if worth implementing

### If implementing
1. Add frontmatter parsing to CLAUDE.md in mantra
2. Start with simple fields: `mantra.refresh-interval`, `mantra.skip`
3. Log when frontmatter is detected (visibility)

### Questions to Answer
- Is CLAUDE.md even loaded by mantra currently? (No - need to add)
- Should we load CLAUDE.md body as context too?
- How to handle conflicts between frontmatter and .claude/context/ settings?

## Sources
- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [Claude Code Memory](https://code.claude.com/docs/en/memory)
- [GitHub Issue #12378](https://github.com/anthropics/claude-code/issues/12378) - Related frontmatter request
