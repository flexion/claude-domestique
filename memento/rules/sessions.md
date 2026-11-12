---
# MEMENTO-MANAGED: Shipped with the memento plugin; override by creating your own
# rule file under .claude/rules/ rather than editing this one
# To customize: create your own rule file in .claude/rules/
#
# Session Management - Compact Reference

companion: .claude/context/sessions.md
type: actionable

## CONVENTION
resolve: each needed path independently; run the resolver whenever a needed path has no current-branch injection (same-branch prompts inject only the session path)
location: injected "📂 Session:" path if its filename is <branch-sanitized>.md for the current branch (else stale); otherwise the memento resolver's sessionPath (scripts/resolve-session.js in the memento plugin, ../../scripts/resolve-session.js from the skill's SKILL.md)
branch-metadata: injected "🗂️ Branch metadata:" path if its filename is <branch-sanitized> for the current branch; otherwise the resolver's branchMetadataPath
config: .memento/config.json {sessionsDir, branchesDir}, git-root-relative, defaults .memento/sessions and .memento/branches; validation lives in the resolver (context: Configuring the location)
legacy: resolver legacy=true → session is in .claude/sessions/; use it, offer its migrationCommand verbatim (no shortening, re-quoting, relative paths, or dropping git -C), never run it unasked
auto-create: hook creates on first prompt for feature branches
one-session: 1 branch = 1 session = 1 issue

## STARTING WORK ON MAIN
when: asked to start, implement, or fix an issue/chore/feature/bug
check: current-branch == main|master
if-on-main: ask "Should I create a branch and session file before we start?"
if-yes: create-branch → create-session → proceed
if-no: proceed (user takes responsibility for branch management)
why: work started on main leaves messy history and no session file

## STARTING NEW WORK
command: memento:start (issue|chore)
flow: ask-type → get-details → create-branch → create-session → prime-with-context
issue: fetch-details, populate-acceptance-criteria, create-branch-with-format
chore: gather-description, create-chore-branch

## BRANCH CREATION
when: running `git checkout -b` or `git switch -c`
flow: create-branch → create-session (same command or immediately after)
skill: memento:session create
why: a branch without a session loses context and breaks the 1:1 convention

## BRANCH SWITCH DETECTION
detect: compare current-branch vs saved-state on each prompt
on-switch: check-session-exists → find-possible-matches → inject-guidance
mismatch: detect-session-referencing-branch-with-wrong-filename → offer-rename
possible-match: score by issue-number (10), description-words (2 each), max 3 results

## PLAN APPROVED
when: a plan is approved and implementation is about to start
do:
  1: verify-branch-exists (not on main)
  2: verify-session-exists (or create it)
  3: record the approved plan in the session Approach section
  4: implement
why: an interruption after coding begins loses a plan that was never written down

## SESSION POPULATION TRIGGERS
todos-changed: TodoWrite used → remind update Session Log, Next Steps
plan-approved: ExitPlanMode used → see PLAN APPROVED above
context-checkpoint: usage > 80% → save state before compaction

## UPDATE TRIGGERS
update-when: after-milestone, before-commit, when-blocked (on the event, not on a schedule)
sections: Session Log (what), Files Changed (where), Next Steps (todo)
skill: memento:session update

## COMPLETION (before final commit)
when: final commit before PR (not after PR creation)
finalize: status → complete, mark acceptance criteria done
update: Session Log with completion entry, Files Changed with final list
commit: session file WITH code changes (atomic)
result: clean working directory after PR creation
no-post-PR-updates: PR number discoverable via `gh pr view` (not stored in session)

## RESUMPTION
trigger: user asks "what's next?", "where was I?", resuming work
skill: memento:resume (proactively invoked)
action: load session → show goal/approach/next steps
always: git branch --show-current (never guess branch)

## SESSION FILE STRUCTURE
required-sections: Details, Goal, Session Log, Next Steps
optional-sections: Key Decisions, Learnings, Files Changed, Approach
---
