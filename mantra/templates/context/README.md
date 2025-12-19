# Project Context Extensions

This directory extends the base claude-mantra behavior with project-specific context.

## How It Works

claude-mantra provides **base behavior** (AI behavior rules, format conventions). Your project **extends** this base by adding files here.

**Loading order:**
1. Plugin base context (behavior.yml, context-format.yml, etc.)
2. Your project extensions (files in this directory)
3. CLAUDE.md (if present - see warning below)

All context is **additive** - your files extend, not replace, the base behavior.

## Why Extend?

The base behavior covers general AI assistant patterns. Your project likely has:
- Domain-specific terminology
- Architecture decisions
- Team conventions
- Technology stack details

Adding these as context keeps Claude aligned with YOUR project, not just generic best practices.

## How to Extend

### 1. Create a Project Context File

Copy `project.yml.example` to `project.yml` and customize:

```yaml
# project.yml
domain: your-domain
stack: your-tech-stack
patterns: your-patterns
conventions:
  naming: your-conventions
  testing: your-test-framework
```

### 2. Add Topic-Specific Files

Create additional `.yml` files for specific topics:

```yaml
# api.yml - API conventions
style: REST
versioning: URL path (/v1/...)
auth: JWT bearer tokens
errors: RFC 7807 problem details
```

```yaml
# database.yml - Database conventions
orm: prisma
migrations: automatic
naming: snake_case tables, camelCase fields
```

### 3. Add Detailed Guides (Optional)

For complex topics, add a matching `.md` file:
- `api.yml` (compact rules) + `api.md` (detailed examples)
- Claude loads `.yml` automatically, `.md` on-demand

## File Format

**YAML files** should be:
- Compact (target <50 lines)
- Token-efficient (no prose)
- Key-value structured
- Using operators: `→` (flow), `>` (priority), `|` (alternatives)

See the base `context-format.yml` and `context-format.md` for detailed format guidelines.

## Warning: CLAUDE.md Confusion

If your project has both:
- `.claude/context/*.yml` files (this directory)
- A `CLAUDE.md` file (project root)

Claude will load BOTH, which can cause confusion if they contain conflicting guidance.

**Recommendation:** Migrate CLAUDE.md content into modular context files here, then remove or minimize CLAUDE.md.

## Example Extensions

See `project.yml.example` for a starter template.
