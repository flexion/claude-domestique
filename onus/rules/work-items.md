---
# ONUS-MANAGED: This file is overwritten by /onus:init --force
# To customize: create your own rule file in .claude/rules/
#
# Work Item Integration - Compact Reference

companion: .claude/context/work-items.md
type: reference

## WORK ITEM AWARENESS
detect: branch-name-first (issue/feature-N, PROJ-123, #N)
inject: session-start (full-context), prompt (status-line)
platforms: github-issues, jira, azure-devops

## GIT CONVENTIONS
see: git.md (commit-format, branch-naming, pr-format)

## WORK ITEM LIFECYCLE
branch-checkout: status -> "In Progress"
pr-created: status -> "In Review"
pr-merged: status -> "Done"
comments: milestone-updates, blockers, decisions

## ACCEPTANCE CRITERIA
track: checkbox-list (from issue description)
validate: before-commit (did-we-address-this?)
warn: unaddressed-criteria (before PR)
format: "- [ ] criterion" -> "- [x] criterion" (when done)

## SESSION INTEGRATION
with-memento: populate-session-from-issue
with-mantra: refresh-issue-context-periodically
shared-convention: issue-N -> branch -> metadata -> session

## COMMIT DISCIPLINE
staged-changes: detect-and-suggest-message
frequency: logical-units (not-too-big, not-too-small)
structure: single-purpose-commits
validation: lint-and-test-before-commit
---
