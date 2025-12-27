---
# ONUS-MANAGED: This file is overwritten by /onus:init --force
# To customize: create your own rule file in .claude/rules/
#
# Git Workflow - Compact Reference

companion: .claude/context/git.md
type: actionable

MANDATORY-REREAD: before-commit, before-PR (use-thinking-block-verification)

## COMMIT CHECKLIST (BLOCKING REQUIREMENT)
trigger: user says "commit", about to run git commit
priority: BLOCKING
action: You MUST verify all checks before committing. STOP and consult checklist.
check: Tests run if applicable (npm test)
check: Session file updated (atomic commit - session+code together)
check: Format "#N - verb desc" OR "chore - desc" (lowercase!)
check: HEREDOC with bullets
check: ZERO attribution/co-authored-by/emojis
verify: "Consulting git.md commit checklist: tests, session, format, HEREDOC, zero attribution"
consequence: Wrong commit format requires amend or new commit, attribution causes PR rejection

## PR CHECKLIST (BLOCKING REQUIREMENT)
trigger: user says "PR", "pull request", about to run gh pr create
priority: BLOCKING
action: You MUST verify all checks before creating PR. STOP and consult checklist.
check: Tests run if applicable (npm test)
check: Title format "#N - lowercase desc" OR "chore - lowercase desc" (MATCHES commit format)
check: Body has ZERO attribution, emojis, AI mentions, co-authored-by
check: Base branch main (or project default)
verify: "Consulting git.md PR checklist: tests, title format, zero attribution, base branch"
consequence: PR with wrong format or attribution requires edit or recreation

## CONVENTIONS
branch-from: main (git-fetch-first, remote-main)
branch: issue/feature-N/desc | chore/desc
commit: "#N - verb desc" OR "chore - desc" with HEREDOC bullets
no: attribution, co-authored-by, emojis, --amend (except pre-commit hooks)
test-before: npm test (when package.json exists)
pr-base: main (or project default branch)
ask-first: "Is this an issue or chore?" + get issue number (never guess)
---
