---
name: make-rule
description: >-
  Use when the user wants to turn verbose prose guidance into a compact rule, asks to "make a rule" or "add a rule", or is authoring rule files for a plugin or project.
argument-hint: <source-file.md>
---

# Make a Compact Rule

Convert prose into concise project instructions without losing triggers, scope,
or exceptions. Read [FORMAT.md](../../FORMAT.md) for notation and host-loading
limits. Mantra does not parse or refresh the resulting file.

## Workflow

1. Read the supplied source. Ask for its path or content if missing.
2. Remove redundancy and move useful explanations/examples to a companion.
   Use short key-value instructions, lists, or ordered steps where clearer;
   preserve the meaning before abbreviating. Token savings are not guaranteed.
3. Use priorities the user or source already specifies. Ask only if unresolved
   priority would materially change the rule. Reserve blocking language for
   actual requirements; verify through observable actions, not private reasoning.
4. Present the complete rule, its proposed location, and any companion reference.
   Preserve the source. For Claude Code, put instructions in the Markdown body
   under `.claude/rules/`; frontmatter is host metadata, not behavioral content.
   Use the host's instruction convention on other hosts.

## Example

Source: review security before merging; also check imports and unused variables.
Security review is required by the project, while style checks are advisory.

```markdown
# Code Review

## Security
trigger: before-merge
required: check injection, authorization, data exposure
verify: findings or checks supporting the review

## Style
check: imports, unused variables

Details: .claude/context/code-review.md (project-root relative)
```

Add host-supported YAML frontmatter only when needed, for example `paths` to
scope a Claude Code rule. Do not put the instructions inside the delimiters:
Claude Code removes rule frontmatter from the content it loads. A companion path
must be understandable to the agent; Mantra does not resolve it automatically.
