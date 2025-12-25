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

## STARTING NEW WORK
command: /memento:start (issue|chore)
flow: ask-type → get-details → create-branch → create-session → prime-with-context
issue: fetch-details, populate-acceptance-criteria, create-branch-with-format
chore: gather-description, create-chore-branch

## BRANCH SWITCH DETECTION
detect: compare current-branch vs saved-state on each prompt
on-switch: check-session-exists → find-possible-matches → inject-guidance
mismatch: detect-session-referencing-branch-with-wrong-filename → offer-rename
possible-match: score by issue-number (10), description-words (2 each), max 3 results

## SESSION POPULATION TRIGGERS
todos-changed: TodoWrite used → remind update Session Log, Next Steps
plan-approved: ExitPlanMode used → IMMEDIATELY update Approach section with plan
context-checkpoint: usage > 80% → save state before compaction

## UPDATE TRIGGERS
update-when: after-milestone, before-commit, when-blocked, on-reminder
sections: Session Log (what), Files Changed (where), Next Steps (todo)
skill: /memento:session update

## COMPLETION (before PR)
before-push: finalize session file (status: complete, mark acceptance criteria done)
update: Session Log with completion entry, Files Changed with final list
commit: session file WITH code changes (atomic)
status: change "in-progress" → "complete"

## RESUMPTION
on-start: read session file FIRST (not issue)
use: Next Steps, Left off context
always: git branch --show-current (never guess branch)

## SESSION FILE STRUCTURE
required-sections: Details, Goal, Session Log, Next Steps
optional-sections: Key Decisions, Learnings, Files Changed, Approach
---
