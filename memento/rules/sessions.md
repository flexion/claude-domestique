---
# MEMENTO-MANAGED: This file is overwritten by /memento:init --force
# To customize: create your own rule file in .claude/rules/
#
# Session Management - Compact Reference

companion: .claude/context/sessions.md
type: actionable

## CONVENTION
location: {git-root}/.claude/sessions/<branch-sanitized>.md
auto-create: hook creates on first prompt for feature branches
one-session: 1 branch = 1 session = 1 issue

## PRE-ANALYSIS CHECKPOINT (BLOCKING REQUIREMENT)
trigger: user says "start", "begin", "work on", "implement", "fix", "add" with issue/chore/feature/bug
priority: BLOCKING
action: You MUST check if on main branch. STOP before any analysis.
check: current-branch == main|master
ask: "Should I create a branch and session file before we start?"
if-yes: create-branch → create-session → THEN proceed with analysis
if-no: proceed (user takes responsibility for branch management)
never: jump-to-analysis-while-on-main-without-asking
verify: "Checking branch: on main? → asking about branch creation"
consequence: Working on main causes messy history and forgotten session files

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

## PRE-IMPLEMENTATION CHECKPOINT (BLOCKING REQUIREMENT)
trigger: ExitPlanMode used, plan approved, about to start coding
priority: BLOCKING
action: You MUST update session before coding. STOP and verify.
must-do:
  1: verify-branch-exists (not on main)
  2: verify-session-exists (or create it)
  3: update-session-Approach-section (with approved plan)
  4: THEN proceed with implementation
never: start-coding-without-session-update
verify: "Pre-implementation: branch exists, session updated with approach"
consequence: Coding without session update loses context on interruption

## SESSION POPULATION TRIGGERS
todos-changed: TodoWrite used → remind update Session Log, Next Steps
plan-approved: ExitPlanMode used → triggers PRE-IMPLEMENTATION CHECKPOINT above
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
trigger: user asks "what's next?", "where was I?", resuming work
skill: memento:resume (proactively invoked)
action: load session → show goal/approach/next steps
always: git branch --show-current (never guess branch)

## SESSION FILE STRUCTURE
required-sections: Details, Goal, Session Log, Next Steps
optional-sections: Key Decisions, Learnings, Files Changed, Approach
---
