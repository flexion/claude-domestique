---
# ONUS-MANAGED: This file is overwritten by /onus:init --force
# To customize: create your own rule file in .claude/rules/
#
# Git Workflow - Compact Reference

companion: .claude/context/git.md

MANDATORY-REREAD: before-commit, before-PR (use-thinking-block-verification)

## COMMIT CHECKLIST (you are reading this because you're about to commit):
check: Tests run if applicable (npm test)
check: Session file updated (atomic commit - session+code together)
check: Format "#N - verb desc" OR "chore - desc" (lowercase!)
check: HEREDOC with bullets
check: ZERO attribution/co-authored-by/emojis

## PR CHECKLIST (you are reading this because you're about to create PR):
check: Tests run if applicable (npm test)
check: Title format "#N - lowercase desc" OR "chore - lowercase desc" (MATCHES commit format)
check: Body has ZERO attribution, emojis, AI mentions, co-authored-by
check: Base branch main (or project default)
check: Re-read this checklist in thinking block BEFORE running gh pr create

branch-from: main (git-fetch-first, remote-main)
branch: issue/feature-N/desc | chore/desc
commit: "#N - verb desc" OR "chore - desc" with HEREDOC bullets
no: attribution, co-authored-by, emojis, --amend (except pre-commit hooks)
test-before: npm test (when package.json exists)
pr-base: main (or project default branch)
ask-first: "Is this an issue or chore?" + get issue number (never guess)
---
