# Context File Format Guide

This guide explains how to work with `.claude/context/*.yml` files.

## Why This Format Exists

Context files use a compact YAML format optimized for Claude's consumption:

- **Token efficiency**: ~89% reduction compared to prose (~7,750 tokens → ~850 tokens)
- **Fast parsing**: Claude can quickly extract rules without processing verbose text
- **Consistent structure**: Key-value pairs, operators, and minimal prose

The format prioritizes machine readability over human readability.

## AI-Managed Files

The `*.yml` context files are **AI-managed**. Claude writes and maintains them; humans review and approve.

### How It Works

1. **You describe** what you want in natural language
2. **Claude translates** to the compact YAML format
3. **You review** the changes and commit

### Why This Approach?

- You focus on *what* rules you want, not *how* to format them
- Claude ensures consistent formatting and token efficiency
- Reduces human error in the compact syntax

## Requesting Changes

### Adding a Rule

> "Add a rule that we always run integration tests before creating PRs"

Claude translates to:
```yaml
test-before-pr: integration-tests (npm run test:integration)
```

### Modifying Behavior

> "Change the commit format to require ticket numbers at the start"

Claude updates the relevant `*.yml` file with the new pattern.

### Removing Rules

> "Remove the requirement for mandatory code review on documentation changes"

Claude removes the corresponding entries from the YAML.

## Reading the Format

If you need to read context files directly, here's the notation:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `→` | Flow/sequence | `implement → test → commit` |
| `>` | Priority | `unit > integration > e2e` |
| `\|` | Alternatives | `feature/N/desc \| chore/desc` |
| `:` | Key-value | `language: typescript` |
| `no:`, `skip:`, `never:` | Negation | `no: emojis, attribution` |

## File Locations

| Location | Purpose |
|----------|---------|
| `<plugin>/context/*.yml` | Base context shipped with plugins |
| `.claude/context/*.yml` | Your project-specific customizations |

Project files extend (not replace) plugin base context.

## Examples

### Before: Natural Language Request

> "I want Claude to always check for existing tests before writing new code, and to prefer modifying existing tests over creating new test files."

### After: Compact YAML

```yaml
test-workflow:
  before-code: check-existing-tests
  prefer: modify-existing > create-new
  location: colocate-with-source
```

### Before: Natural Language Request

> "For commits, we use conventional commits with a JIRA ticket prefix, like 'PROJ-123: feat: add user auth'. No emojis."

### After: Compact YAML

```yaml
commit:
  format: "PROJ-N: type: description"
  types: feat, fix, chore, docs, refactor
  no: emojis, attribution
  example: "PROJ-123: feat: add user authentication"
```

## Tips

1. **Be specific**: "Add a rule for X" works better than "Update the config"
2. **Provide examples**: "Like this: `PROJ-123: feat: description`"
3. **Review changes**: Always check Claude's YAML before committing
4. **One change at a time**: Easier to review and revert if needed
