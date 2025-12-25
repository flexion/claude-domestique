---
# MEMENTO-MANAGED: This file is overwritten by /memento:init --force
# To customize: create your own rule file in .claude/rules/
#
# Session Management - Compact Reference

companion: .claude/context/sessions.md

## CONVENTION
location: {git-root}/.claude/sessions/<branch-sanitized>.md
auto-create: hook creates on first prompt for feature branches
one-session: 1 branch = 1 session = 1 issue

## UPDATE TRIGGERS
update-when: after-milestone, before-commit, when-blocked, on-reminder
sections: Session Log (what), Files Changed (where), Next Steps (todo)
skill: /memento:session update

## RESUMPTION
on-start: read session file FIRST (not issue)
use: Next Steps, Left off context
always: git branch --show-current (never guess branch)

## SESSION FILE STRUCTURE
required-sections: Details, Goal, Session Log, Next Steps
optional-sections: Key Decisions, Learnings, Files Changed
---
