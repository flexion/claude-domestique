# Git Workflow Guide

This guide provides detailed patterns and examples for git operations, commit messages, and PR creation.

## Commit Message Format

### HEREDOC Pattern (Required)

Always use HEREDOC format for commit messages to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
#42 - implement user authentication

- Add login form with validation
- Create auth service with token management
- Add session persistence
EOF
)"
```

### Good Examples

```
#42 - add user login form

- Create LoginForm component with email/password fields
- Add client-side validation with error messages
- Connect to auth API endpoint
```

```
#123 - fix null pointer in cart service

Root cause: getItems() returned null for empty carts
- Initialize items array in constructor
- Add null guard in checkout flow
```

```
chore - update dependencies

- Bump typescript to 5.3.0
- Update eslint and prettier configs
- Fix breaking changes from upgrades
```

### Bad Examples (Avoid)

```
fix bug                           # Too vague
update code                       # Meaningless
#42 - Updated stuff               # Uppercase, vague
#42 - add feature :sparkles:      # No emojis
Co-authored-by: Claude <...>      # No attribution
Generated with Claude Code        # No AI mentions
```

## Branch Naming

### Pattern
```
issue/feature-{N}/{slug}    # For features
issue/bug-{N}/{slug}        # For bugs
issue/fix-{N}/{slug}        # For fixes
chore/{slug}                # For maintenance (no issue)
```

### Examples

| Scenario | Branch Name |
|----------|-------------|
| Feature #42 | `issue/feature-42/user-login` |
| Bug #123 | `issue/bug-123/fix-checkout-crash` |
| Chore (no issue) | `chore/update-dependencies` |

### Creating a Branch

```bash
# Always fetch first
git fetch origin

# Create from remote main
git checkout -b issue/feature-42/user-login origin/main
```

## PR Creation

### Title Format

Must match commit format:
- `#42 - lowercase description` (with issue)
- `chore - lowercase description` (without issue)

### PR Template

```markdown
## Summary
- Implements user login with email/password
- Adds session persistence
- Includes form validation

## Test Plan
1. Navigate to /login
2. Enter valid credentials - should redirect to dashboard
3. Enter invalid credentials - should show error
4. Refresh page - session should persist

Closes #42
```

### Creating a PR

```bash
gh pr create --title "#42 - add user authentication" --body "$(cat <<'EOF'
## Summary
- Add login form with validation
- Create auth service
- Add session persistence

## Test Plan
1. Test login with valid credentials
2. Test login with invalid credentials
3. Verify session persistence

Closes #42
EOF
)"
```

## Pre-Commit Checklist

> **Use `/onus:commit` for guided commit creation with validation.**

Before every commit, verify:

1. **Tests pass** (if applicable)
   ```bash
   npm test
   ```

2. **Session file updated** (if using memento)
   - Commit session and code together atomically

3. **Format correct**
   - `#N - verb description` or `chore - description`
   - All lowercase
   - HEREDOC for multi-line

4. **No forbidden content**
   - No emojis
   - No "Co-authored-by" lines
   - No AI attribution ("Generated with...")

## Pre-PR Checklist

> **Use `/onus:pr` for guided PR creation with validation.**

Before every PR, verify:

1. **Tests pass**
   ```bash
   npm test
   ```

2. **Title format matches commits**
   - `#N - lowercase desc` or `chore - lowercase desc`

3. **Body is clean**
   - No emojis
   - No AI mentions
   - No attribution lines

4. **Base branch correct**
   ```bash
   git remote show origin | grep "HEAD branch"
   ```

## Common Mistakes

### Wrong: Amending After Push

```bash
# NEVER do this after pushing
git commit --amend
git push --force  # Dangerous!
```

### Wrong: Guessing Issue Numbers

```bash
# BAD - guessing
git commit -m "#999 - fix bug"

# GOOD - ask first if unsure
# "Is this an issue or chore? What's the issue number?"
```

### Wrong: Generic Messages

```bash
# BAD
git commit -m "fix"
git commit -m "updates"
git commit -m "WIP"

# GOOD
git commit -m "#42 - fix login redirect loop"
```

## Attribution Rules

### Never Include

- `Co-authored-by:` lines
- `Generated with Claude Code`
- AI/assistant mentions
- Emojis in any form

### Why

Attribution clutters git history and provides no value. The commit message should describe *what* changed and *why*, not *who* or *how* it was written.
