# Context File Format Specification

This document defines the format for context files used by mantra.

## Directory Structure

**Base context** (shipped with plugin):
```
<plugin-root>/
├── rules/                 # Rule files (auto-injected)
│   ├── behavior.md        # AI behavior rules (frontmatter + optional body)
│   ├── test.md            # Testing conventions
│   └── ...
└── context/               # Companion docs (on-demand)
    ├── behavior.md        # Detailed behavior guide
    ├── test.md            # Detailed test examples
    └── ...
```

**Project extensions** (your project):
```
.claude/
├── rules/                 # Project rule overrides
│   └── *.md               # Custom rules with YAML frontmatter
└── context/               # Project companion docs
    └── *.md               # Detailed examples
```

**Loading order**: base → sibling plugins → project extensions → CLAUDE.md

## Two-Tier Pattern

Each topic should have TWO files:

### 1. Rule File (`rules/*.md`)
**Purpose:** Quick context injection for Claude
**Format:** YAML frontmatter (extracted and injected automatically)
**Characteristics:**
- Token-efficient (aim for 89% reduction vs prose)
- Key-value assertions in frontmatter
- Minimal prose
- Target size: 10-30 lines of frontmatter

### 2. Companion Doc (`context/*.md`)
**Purpose:** Detailed reference for humans and Claude deep-dives
**Characteristics:**
- Full prose explanations
- Code examples
- Edge cases and troubleshooting
- Not injected automatically (read on-demand)

## Rule File Format

Rule files use YAML frontmatter with an optional markdown body:

```markdown
---
companion: behavior.md
type: actionable

## Assessment
stance: skeptical-default
assess-first: correctness, architecture, risks
never: eager-agreement, sycophantic-tone

## Implementation
mode: discuss-first (non-trivial) | build-first (trivial)
order: syntax → runtime → logic → optimize
---

Optional body content (usually omitted for rule files).
```

The frontmatter between `---` markers is extracted and injected.

## YAML Format Conventions

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `→` | Flow/sequence | `hook → inject → refresh` |
| `>` | Priority order | `unit > integration > e2e` |
| `\|` | Alternatives | `issue/feature-N \| chore/desc` |
| `,` | List items | `test: logic, errors, edge-cases` |

### Negation Prefixes
- `no:` - Prohibited
- `skip:` - Don't do
- `never:` - Absolutely prohibited

### Style Rules

**Do:**
- Use shortest phrasing possible
- Omit articles (a, an, the)
- Use operators instead of prose
- One fact per line
- Key-value format

**Don't:**
- Write complete sentences
- Include explanations (put in companion `.md` file)
- Use markdown formatting in YAML
- Repeat information

### Example Frontmatter

```yaml
# behavior.md - Compact Reference
companion: context/behavior.md

## Assessment
stance: skeptical-default
assess-first: correctness, architecture, risks
never: eager-agreement, sycophantic-tone

## Implementation
mode: discuss-first (non-trivial) | build-first (trivial)
order: syntax → runtime → logic → optimize
validation: incremental (implement → test → next)

## Testing
priority: unit > integration > e2e
test: new-logic, conditionals, error-paths
skip: simple-DTOs, getters, boilerplate
```

## File Naming

### Recommended Names

| File | Purpose |
|------|---------|
| `behavior.md` | AI behavior rules, assessment stance |
| `git.md` | Git conventions, commit format, PR rules |
| `test.md` | Testing patterns, what to test/skip |
| `sessions.md` | Session management workflow |
| `<domain>.md` | Domain-specific rules |

### Naming Rules
- Use lowercase
- Use hyphens for multi-word names
- Be descriptive but concise
- Pair with same-name companion file in `context/` for details

## Token Efficiency

Context files are injected into Claude's context window. Efficiency matters.

### Size Targets

| Complexity | Lines | Tokens (approx) |
|------------|-------|-----------------|
| Simple | 5-12 | 50-150 |
| Standard | 10-20 | 100-250 |
| Complex | 20-30 | 200-400 |
| Maximum | 30 | 400 |

### Efficiency Tips

1. **Abbreviate consistently** - Use same short forms throughout
2. **Omit obvious context** - Don't repeat what's in project files
3. **Use references** - Point to companion `.md` files for details
4. **Prioritize** - Put most important rules first
5. **Prune regularly** - Remove obsolete content

## Interpretation Guide

When Claude reads compact YAML frontmatter:

| Pattern | Interpretation |
|---------|----------------|
| `test: a, b, c` | Test ALL of these |
| `skip: x, y, z` | Don't test ANY of these |
| `a > b > c` | Priority order (a highest) |
| `a → b → c` | Sequence (a then b then c) |
| `a \| b` | Either is valid |
| `key: value (example)` | Value with inline example |

## Validation

mantra validates:
- File exists and is readable
- Valid YAML frontmatter syntax
- File size within limits

mantra does NOT validate:
- Content correctness
- Operator usage
- Naming conventions

## Migration from CLAUDE.md

If migrating from a single `CLAUDE.md`:

1. **Identify topics** - Group related rules
2. **Create rule file** - Add YAML frontmatter to `rules/<topic>.md`
3. **Keep details** - Leave examples/explanations in `context/<topic>.md`
4. **Test refresh** - Verify context injects correctly

### Before (CLAUDE.md excerpt)
```markdown
## Git Conventions

Always use HEREDOC format for commits. Never include attribution
or Co-Authored-By tags. Commit messages should be lowercase after
the issue number. Format: "#N - verb description"
```

### After (rules/git.md)
```markdown
---
# Git Workflow - Compact Reference
companion: context/git.md

commit-format: "#N - verb desc" | "chore - desc"
commit-style: HEREDOC, lowercase-after-dash
no: attribution, co-authored-by, emojis
---
```
