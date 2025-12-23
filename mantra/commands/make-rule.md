---
description: Create a compact frontmatter rule from verbose markdown
argument-hint: <source-file.md>
---

# Make Rule: Convert Markdown to Frontmatter Rule

Convert a verbose, human-readable markdown file into a token-efficient frontmatter-only rule file.

## Workflow

### Step 1: Identify Source File

If no argument provided, ask the user:

> What is the path to the verbose markdown file you want to compact?

Read the source file to understand its content.

### Step 2: Analyze and Convert

Transform the verbose markdown into compact YAML frontmatter:

**Conversion Rules:**
- Remove prose, explanations, complete sentences
- Use key:value pairs with minimal words
- Apply operators: `→` (flow), `>` (priority), `|` (alternatives)
- Use comma-separated lists instead of bullet points
- Remove articles (a, an, the), filler words
- Use parens for inline examples: `pattern (example: value)`
- Use negation prefixes: `no:`, `skip:`, `never:`
- Target 5-30 lines (89% token reduction)

**Output Format:**
```markdown
---
# {Title} - Compact Reference
companion: {source-filename}

## {Section Header}
key: value, value, value
another-key: flow → sequence → result
---
```

### Step 3: Identify Critical Rules

After creating the compact version, ask the user:

> Are any of these rules CRITICAL - meaning Claude must absolutely follow them without exception?
>
> If yes, describe which rules are critical and why.

### Step 4: Mark Critical Rules

When the user identifies critical rules, apply emphasis markers:

**Emphasis Levels (use sparingly):**

| Marker | Use When | Example |
|--------|----------|---------|
| `MANDATORY-REREAD:` | Must re-read before specific actions | `MANDATORY-REREAD: before-commit (use-thinking-block)` |
| `## SECTION (BLOCKING REQUIREMENT)` | Entire section is non-negotiable | `## ASSESSMENT (BLOCKING REQUIREMENT)` |
| `required-before:` | Must happen before an action | `required-before: git-operations, implementation` |
| `must-verify:` | Must explicitly check | `must-verify: format-requirements` |
| `enforcement:` | Trigger conditions | `enforcement: if user says X → do Y` |
| `never:` | Absolute prohibitions | `never: skip-tests, guess-values` |

**Guidelines for CRITICAL markers:**
- Use SPARINGLY - overuse dilutes impact
- Reserve `MANDATORY-REREAD:` for top-level blocking behaviors
- Reserve `(BLOCKING REQUIREMENT)` for section headers only
- Use `enforcement:` for if→then trigger rules
- Combine with `(use-thinking-block)` for verification requirements

### Step 5: Output

Present the final compact rule file to the user:

1. Show the complete frontmatter-only file
2. Explain which parts were marked as critical and why
3. Suggest saving to `.claude/rules/{name}.md`
4. Remind user to run `/mantra:init --force` if updating existing rule

## Example Transformation

**Before (verbose):**
```markdown
# Code Review Guidelines

When reviewing code, always check for security vulnerabilities first.
This is extremely important and should never be skipped.

## Style Checks
- Check for consistent naming
- Verify imports are organized
- Look for unused variables
```

**After (compact with critical marker):**
```markdown
---
# Code Review - Compact Reference
companion: code-review.md

MANDATORY-REREAD: before-code-review (use-thinking-block)

## SECURITY (BLOCKING REQUIREMENT)
check-first: vulnerabilities (never-skip)
verify: injection, auth, data-exposure

## Style
check: naming-consistency, import-organization, unused-variables
---
```

## Notes

- The companion file should be the original verbose markdown
- Compact files are for Claude (machine-optimized)
- Keep original verbose file for human reference
- Critical markers make Claude pay special attention in thinking blocks
