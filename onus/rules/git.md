---
# ONUS-MANAGED: This file is overwritten by /onus:init --force
# To customize: create your own rule file in .claude/rules/
#
# Git Workflow - Compact Reference

companion: .claude/context/git.md
type: actionable

## COMMIT (BLOCKING REQUIREMENT)
trigger: user says "commit", about to run git commit
priority: BLOCKING
action: You MUST use /onus:commit for guided validation. STOP.
command: /onus:commit
verify: "Using /onus:commit for validation"
consequence: Skipping validation causes format violations

## PR (BLOCKING REQUIREMENT)
trigger: user says "PR", "pull request", about to run gh pr create
priority: BLOCKING
action: You MUST use /onus:pr for guided validation. STOP.
command: /onus:pr
verify: "Using /onus:pr for validation"
consequence: Skipping validation causes format violations

## CONVENTIONS (quick reference)
branch-from: main (git-fetch-first, remote-main)
branch: issue/feature-N/desc | chore/desc
commit: "#N - verb desc" OR "chore - desc" (lowercase, HEREDOC, zero attribution)
pr: title matches commit format, zero attribution
no: emojis, co-authored-by, --amend (except pre-commit hooks)
ask-first: "Is this an issue or chore?" + get issue number (never guess)
---
