---
description: Create a commit with validation and format guidance
argument-hint: [message]
---

# Commit Changes

Create a git commit following project conventions with validation.

## Task

**IMPORTANT: Consult the COMMIT CHECKLIST from git.md before proceeding.**

### Pre-Commit Validation

Before creating the commit, verify:

1. **Check current branch**
   ```bash
   git branch --show-current
   ```
   - If on `main` or `master`: STOP and ask user
   - Options: create a branch first, or confirm direct commit is intentional

2. **Run tests** (if applicable)
   ```bash
   npm test
   ```

3. **Check for session file**
   - Read `.claude/sessions/<branch>.md`
   - If missing: create session file using `/memento:session create`
   - Update Session Log, Files Changed sections if needed
   - Session file should be committed atomically with code

4. **Session completion check** (if this is the final commit)
   - Ask: "Is this the final commit for this work? Mark session complete?"
   - If yes:
     - Change status: `in-progress` → `complete`
     - Mark acceptance criteria as done: `- [ ]` → `- [x]`
     - Add final Session Log entry
   - This ensures clean working directory after PR creation

5. **Check staged changes**
   ```bash
   git status
   git diff --staged
   ```

### Determine Commit Type

Ask user if not clear from context:
- **Issue commit**: `#N - verb description` (linked to GitHub issue)
- **Chore commit**: `chore - description` (no issue number)

Never guess issue numbers - ask if unclear.

### Generate Commit Message

**Format Requirements:**
- Lowercase description (except proper nouns)
- Present tense verb: add, fix, update, remove, refactor
- No emojis
- No attribution, no co-authored-by
- Use HEREDOC for multi-line messages

**Single-line commit:**
```bash
git commit -m "#42 - add user authentication"
```

**Multi-line commit with bullets:**
```bash
git commit -m "$(cat <<'EOF'
#42 - add user authentication

- Implement login form with email/password
- Add JWT token handling
- Create auth middleware
EOF
)"
```

**Chore format:**
```bash
git commit -m "chore - update dependencies"
```

### After Commit

1. Verify commit was created:
   ```bash
   git log -1 --oneline
   ```

2. Show next steps:
   - Push to remote: `git push -u origin <branch>`
   - Create PR: `/onus:pr`

## Example Interaction

```
User: /onus:commit

Claude: I'll help you create a commit. Let me check the staged changes.

[Runs git status, git diff --staged]

You have changes in:
- src/auth/login.ts
- src/auth/middleware.ts

Is this for an issue or a chore?

User: Issue #42

Claude: I'll update the session file and create the commit.

[Updates session file, then commits]

git commit -m "$(cat <<'EOF'
#42 - add user authentication

- Implement login form with email/password
- Add JWT token handling
EOF
)"

Committed: #42 - add user authentication
Next: `git push -u origin issue/feature-42/auth` or `/onus:pr`
```

## Troubleshooting

**Pre-commit hook failed?**
- Fix the issues reported by the hook
- Stage the fixes: `git add .`
- Try commit again (do NOT use --no-verify)

**Nothing to commit?**
- Check `git status` for unstaged changes
- Stage changes: `git add <files>` or `git add -p`

**Wrong message format?**
- Use `git commit --amend` only if commit hasn't been pushed
- Otherwise, make a new commit with correct format
