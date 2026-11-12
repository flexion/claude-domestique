---
# ONUS-MANAGED: This file is overwritten by the onus:init skill
# To customize: create your own rule file in .claude/rules/
#
# Git Workflow - Compact Reference

companion: .claude/context/git.md
type: actionable

## COMMIT
when: committing, or about to run git commit
use: onus:commit, which validates the message format and reads this file
why: the format is checked before the commit rather than fixed afterwards

## PR
when: opening a pull request, or about to run gh pr create
use: onus:pr, which validates the title format and reads this file
why: the format is checked before the PR rather than fixed afterwards

## CONVENTIONS (quick reference)
branch-from: main (git-fetch-first, remote-main)
branch: issue/feature-N/desc | chore/desc
commit: "#N - verb desc" OR "chore - desc" (lowercase, HEREDOC)
pr: title matches commit format
no: emojis, --amend (except pre-commit hooks)
ask-first: "Is this an issue or chore?" + get issue number (never guess)
---
