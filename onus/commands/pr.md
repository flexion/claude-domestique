---
description: Create a pull request with validation and format guidance
argument-hint: [title]
---

# Create Pull Request

Create a GitHub pull request following project conventions with validation.

## Task

### Load Project Rules

Before proceeding, check for project-level rules that may override onus defaults:

1. **Scan for project rules**
   ```bash
   find .claude/rules -name '*.md' 2>/dev/null
   ```

2. **If files found**, read any that relate to git, commits, PRs, or branches (match by filename, e.g. `git.md`, `commits.md`, or by frontmatter `domain:` / `type:` fields)

3. **Check for companion context** — if a rule file's frontmatter contains a `companion:` field, also read that file from `.claude/context/`

4. **State the source**
   - "Using project rules from .claude/rules/{filename}" OR
   - "No project rules found, using onus defaults"

5. **Apply precedence**: project rules override plugin defaults

**IMPORTANT: Consult the PR CHECKLIST from git.md before proceeding.**

### Pre-PR Validation

Before creating the PR, verify:

1. **Run tests** (if applicable)
   ```bash
   npm test
   ```

2. **Check current branch and commits**
   ```bash
   git branch --show-current
   git log main..HEAD --oneline
   git diff main...HEAD --stat
   ```

3. **Ensure changes are pushed**
   ```bash
   git push -u origin $(git branch --show-current)
   ```

4. **Check session file** for summary content
   - Read `.claude/sessions/<branch>.md`
   - Verify session status is `complete` (should be marked before final commit)
   - Use Goal, Approach, Session Log for PR body

### Determine PR Title Format

**Format Requirements:**
- Must match commit format exactly
- `#N - lowercase description` (for issues)
- `chore - lowercase description` (for chores)
- No emojis, no attribution

### Locate PR Template

Before generating PR body, check for project templates:

1. **Check for PR templates**
   ```bash
   ls .github/pull_request_template.md .github/PULL_REQUEST_TEMPLATE.md .github/PULL_REQUEST_TEMPLATE/*.md 2>/dev/null
   ```

2. **Handle results**
   - **Single template found**: Use it as the PR body structure
   - **Multiple templates found**:
     - Parse branch name using `branchFormat` from `.claude/config.json` to determine type
     - Match type to template name (e.g., `feature` → `feature.md`)
     - Ask user if still ambiguous
   - **No templates found**: Use generic format (see fallback below)

3. **State the source used**
   - "Using project template: .github/PULL_REQUEST_TEMPLATE/feature.md"
   - "No project PR template found, using generic format"

### Generate PR Body

**If project template was found:**
- Read the template file
- Fill in template sections using session file content
- Preserve all template sections (don't skip any)
- Map session data: Goal → Summary, Approach → Details, Session Log → Changes

**If no project template (fallback):**

Use session file content to build the body:

```markdown
## Summary
<2-3 bullets from Session Log or Approach>

## Test Plan
<How to verify the changes work>

## Acceptance Criteria
<From issue, if applicable>
- [ ] Criterion 1
- [ ] Criterion 2
```

**IMPORTANT:**
- No attribution (no "Generated with Claude", no co-authored-by)
- No emojis
- No AI mentions

### Create the PR

```bash
gh pr create --title "#42 - add user authentication" --body "$(cat <<'EOF'
## Summary
- Implement login form with email/password fields
- Add JWT token handling with httpOnly cookies
- Create auth middleware for protected routes

## Test Plan
- Run `npm test` to verify unit tests pass
- Manually test login flow at /login

## Acceptance Criteria
- [x] Login form with email and password fields
- [x] Secure token storage
- [ ] Auto-logout on token expiry (follow-up)
EOF
)"
```

### After Creation

1. Display the PR URL
2. Working directory should be **clean** (no uncommitted changes)
3. Suggest next steps:
   - Review the PR in browser
   - Request reviewers if needed

**Note**: Do NOT update the session file after PR creation. The PR number is discoverable via `gh pr view`—no need to store it in the session.

## Example Interaction

```
User: /onus:pr

Claude: I'll help you create a PR. Let me check the branch and commits.

[Runs git branch, git log, reads session file]

Branch: issue/feature-42/auth
Commits: 3 commits ahead of main
Session: Goal is "Add user authentication"

Checking for PR templates...
Found: .github/PULL_REQUEST_TEMPLATE/feature.md
Using project template for PR body.

Creating PR with title matching your commits...

gh pr create --title "#42 - add user authentication" --body "..."

Created: https://github.com/org/repo/pull/87

Next steps:
- Review at the link above
- Request reviewers if needed
```

**Example without project template:**
```
Checking for PR templates...
No project PR template found, using generic format.
```

## Troubleshooting

**"Pull request already exists"?**
- Check existing PRs: `gh pr list`
- View existing PR: `gh pr view`

**Wrong base branch?**
- Specify base: `gh pr create --base main`

**Need to update PR after creation?**
- Edit title: `gh pr edit --title "new title"`
- Edit body: `gh pr edit --body "new body"`

**Authentication failed?**
- Ensure `gh auth status` shows logged in
- Check token has `repo` scope
