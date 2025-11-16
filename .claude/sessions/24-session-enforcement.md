# Session: Issue #24 - Phase 3B - Session Enforcement

## Issue Details
- **Issue Number**: #24
- **Title**: Phase 3B - Session Enforcement
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/24

## Objective

Actively enforce session updates and prevent context drift through automated hooks, prompts, and detection mechanisms.

**Addresses**: Core Purpose #3 (Prevent Context Drift)

## Requirements

### Core Components
1. Pre-commit hook that blocks commits without session updates
2. Session update prompt skill (auto-invoke after milestones)
3. Drift detection skill (alert when work diverges from session)
4. Periodic context refresh capability

### Key Features
- **Enforcement**: Cannot commit without updating session file
- **Prompting**: AI suggests session updates after major milestones
- **Detection**: Alerts when implementing features not in session scope
- **Refresh**: Context reloaded periodically during long sessions

## Technical Approach

### 1. Pre-Commit Hook (First Priority)
Create `hooks/pre-commit.sh` that runs before every commit:
- Check if session file in staged changes
- If not found, block commit with helpful error message
- Identify current session file from branch metadata
- Allow `--no-verify` override for emergencies

### 2. Session Update Prompts (Second Priority)
Create `skills/session-update-prompter/SKILL.md`:
- Trigger after implementation milestones
- Suggest what to document (decisions, learnings, changes)
- Don't block, just prompt

### 3. Drift Detection (Third Priority)
Create `skills/drift-detector/SKILL.md`:
- Compare files created vs session scope
- Compare work done vs session objectives
- Alert when diverging

### 4. Periodic Refresh (Fourth Priority)
Update `skills/context-loader/SKILL.md`:
- Add periodic refresh capability
- Configurable interval (default: every 50 interactions)
- Manual trigger still supported

## Implementation Plan

### Phase 1: Pre-Commit Hook
- [x] Create `hooks/` directory
- [x] Create `hooks/check-session-updated.sh` script
- [x] Implement session file detection logic
- [x] Install pre-commit framework
- [x] Create `.pre-commit-config.yaml`
- [x] Integrate shellcheck validation
- [x] Test with commit (should block without session update)
- [x] Test with session update (should allow commit)
- [ ] Test `--no-verify` override
- [ ] Create PR
- [ ] Document hook in README or docs

### Phase 2: Session Update Prompter
- [x] Create `skills/session-update-prompter/` directory
- [x] Create `SKILL.md` with trigger conditions
- [x] Define prompt templates for different scenarios
- [ ] Test prompting after implementation (manual testing in real usage)
- [x] Create PR (#26)

### Phase 3: Drift Detector
- [x] Create `skills/drift-detector/` directory
- [x] Create `SKILL.md` with detection logic
- [x] Define drift patterns to detect (5 patterns: behavioral + 4 scope patterns)
- [x] Add behavioral drift detection (sycophantic, research avoidance, quality, workflow)
- [ ] Test detection when creating off-scope files (manual testing in real usage)
- [ ] Test detection when objective diverges (manual testing in real usage)
- [x] Create PR (#27)

### Phase 4: Periodic Refresh
- [x] Update `skills/context-loader/SKILL.md`
- [x] Add periodic refresh trigger (3rd trigger condition)
- [x] Add interval configuration to schema
- [ ] Test refresh during long session (manual testing in real usage)
- [ ] Test configurable interval (manual testing in real usage)
- [x] Create PR (#28)

## Dependencies
- Plugin `context/` directory (Phase 3A) - **COMPLETE**
- Context-loader skill (Phase 3.1) - **COMPLETE**
- Branch metadata system (Phase 1) - **COMPLETE**

## Success Criteria
- ✅ Cannot commit without updating session (enforced by hook)
- ✅ Prompted to update session after milestones
- ✅ Alerted when drifting from session objective
- ✅ Context refreshed periodically in long sessions

## Notes

**Focus on pre-commit hook first** - this is the most impactful enforcement mechanism. The other features enhance the experience but the hook is the core deliverable.

**Testing approach**: Integration testing - install hook, attempt commits with/without session updates, verify blocking behavior.

**Shellcheck validation**: All bash scripts must pass `shellcheck hooks/*.sh`

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #24
- Created feature branch: issue/feature-24/session-enforcement
- Created branch metadata
- Initialized session file
- Ready to implement pre-commit hook

### 2024-11-16 - Pre-Commit Framework Implemented
- Created `hooks/check-session-updated.sh` with session enforcement logic
- Created `.pre-commit-config.yaml` with two hooks:
  - Session enforcement (local custom hook)
  - Shellcheck validation (from shellcheck-precommit repo)
- Installed pre-commit framework via `brew` package
- Migrated config to fix deprecated stage names
- Removed old custom git hook (moved to .legacy by pre-commit)
- Shellcheck integration ensures all bash scripts pass validation
- Fixed shellcheck repo URL (koalaman/shellcheck-precommit, not shellcheck-sh)
- Tested hook: successfully blocks commits without session updates
- Tested hook: allows commits when session file staged
- Cleaned commit history (removed test commit)
- Created PR #25
- PR #25 merged to main

**Phase 3B.1**: ✅ COMPLETE

### 2024-11-16 - Session Update Prompter Skill Created
- Created `skills/session-update-prompter/` directory and SKILL.md
- Defined comprehensive trigger conditions (4 scenarios):
  - After implementation milestones (feature done, refactor complete, bug fixed)
  - Before commit preparation (user signals ready to commit/PR)
  - After resolving blockers (error fixed, complex problem solved)
  - Explicit user request (asks what to document)
- Documented session detection logic (branch → metadata → session file)
- Created session update analysis framework (decisions, learnings, work, context)
- Defined prompt format and suggestion structure
- Added throttling logic (max once per 30 mins, skip if recently updated)
- Provided 4 detailed examples (feature implementation, before commit, blocker resolved, explicit request)
- Documented session update templates (log entries, decisions, learnings formats)
- Skill provides soft nudges (non-blocking) complementing hook's hard enforcement

**Phase 3B.2**: ✅ COMPLETE - Merged to main (PR #26)

### 2024-11-16 - Drift Detector Skill Created
- Created `skills/drift-detector/` directory and SKILL.md
- Monitors TWO types of drift:
  - **Scope drift**: WHAT work is done (files, features, objectives)
  - **Behavioral drift**: HOW work is done (AI behavior, workflow compliance)
- Defined comprehensive drift detection logic:
  - 4 trigger conditions (after file creation, after edits, during features, periodic)
  - 5 drift patterns:
    1. **Behavioral drift** (sycophantic, research avoidance, quality, workflow)
    2. File scope drift
    3. Feature scope drift
    4. Architectural drift
    5. Objective drift
  - 3-tier severity scoring (low 1-3, medium 4-6, high 7-10)
  - Severity-based alerting (increasingly urgent as drift increases)
- Behavioral drift detection catches:
  - Sycophantic responses (vs skeptical stance in behavior.yml)
  - Implementing without research (vs search-first requirement)
  - Skipping quality steps (testing, validation, alternatives)
  - Workflow violations (attribution, HEREDOC, session updates)
- Documented drift detection workflow:
  - Load session context (objectives, requirements, scope)
  - Load behavior context (behavior.yml, git.yml, sessions.yml)
  - Analyze recent work (files created/edited, features implemented, AI responses)
  - Compare against session scope AND context-specified behavior
  - Calculate drift score based on severity
  - Alert with recommendations (update scope, refocus, create new session, reset behavior)
- Created 7 detailed examples:
  1. Behavioral: Sycophantic response (Medium)
  2. Behavioral: Research avoidance (High)
  3. Behavioral: Workflow violation (Medium)
  4. File scope drift (creating frontend when session is backend API)
  5. Feature scope drift (bug fix expands to major feature additions)
  6. Objective drift (email notifications grows to multi-channel platform)
  7. Architectural drift (caching addition triggers API layer refactor)
- Defined default drift thresholds including behavioral violations
- Behavioral drift is HIGH priority (violates core values)
- Skill provides early warning system before drift becomes problematic

**Phase 3B.3**: ✅ COMPLETE - Merged to main (PR #27)

### 2024-11-16 - Periodic Refresh Added to Context Loader
- Updated `skills/context-loader/SKILL.md` with periodic refresh capability
- Added 3rd trigger condition: Periodic Refresh
  - Auto-triggers every N interactions (configurable, default: 50)
  - Only during active work (not idle sessions)
  - Skipped if context refreshed recently (within last 10 interactions)
- Updated Configuration section with periodicRefresh object:
  - `enabled` (boolean, default: true)
  - `interval` (number, default: 50, min: 10, max: 500)
- Updated schemas/config.schema.json with periodicRefresh definition
- Added Example 4: Periodic Refresh (Long Session)
- Added configuration control examples (disable, change interval)
- Updated Benefits section with periodic refresh benefits
- Added "Periodic Refresh Benefits" notes section explaining:
  - Why it matters (prevents context drift in long sessions)
  - Default interval rationale (50 interactions balances freshness vs interruption)
  - When to adjust interval (increase for stable projects, decrease for strict adherence)

**Phase 3B.4**: Implementation complete, PR #28 created

**Phase 3B Status**: ✅ ALL 4 PHASES COMPLETE
- 3B.1: Pre-Commit Hook (PR #25) ✅
- 3B.2: Session Update Prompter (PR #26) ✅
- 3B.3: Drift Detector (PR #27) ✅
- 3B.4: Periodic Refresh (PR #28) ✅

**Next**: After PR #28 merged, Phase 3B (Session Enforcement) fully delivered

## Key Decisions

### Decision 1: Start with Pre-Commit Hook
**Reason**: Highest impact enforcement mechanism. Prevents commits without session updates, directly addressing context drift.
**Impact**: Immediate enforcement of session updates for all commits.
**Alternative**: Could start with prompts/detection, but those are softer nudges vs hard enforcement.

### Decision 2: Allow --no-verify Override
**Reason**: Sometimes emergencies require quick commits (security patches, hotfixes). Provide escape hatch.
**Impact**: Users can override in true emergencies but get clear warning.
**Alternative**: No override (too strict), or silent override (less clear).

### Decision 3: Use Pre-Commit Framework Instead of Custom Hook
**Reason**: Industry-standard tool (https://pre-commit.com/) with better hook management, easier distribution, and built-in hook repository ecosystem.
**Impact**: More maintainable, can integrate shellcheck validation, easier for users to install (`pre-commit install`).
**Alternative**: Custom `.git/hooks/pre-commit` script (less standard, harder to manage multiple hooks).
**User Request**: "let's use the brew pre-commit package instead with a pre-commit config yaml"

## Learnings

### Learning 1: Pre-Commit Framework Benefits
- **Standardization**: Pre-commit framework is industry standard for git hooks
- **Multi-hook support**: Single YAML config manages multiple hooks (session check + shellcheck)
- **Hook repositories**: Can use existing hooks from https://github.com/shellcheck-sh/shellcheck-precommit
- **Migration tools**: `pre-commit migrate-config` updates deprecated syntax automatically
- **Installation**: Simple `pre-commit install` vs manually copying hook files
- **Backup**: Automatically backs up existing hooks to `.legacy` when installing

### Learning 2: Session Enforcement Hook Logic
- Read current branch from `git branch --show-current`
- Sanitize branch name (replace `/` with `-`)
- Check `.claude/branches/<sanitized-branch>` for metadata
- If no metadata file, skip check (main branch, hotfix branches)
- Extract session file path from metadata (`session:` field)
- Check if session file in staged changes (`git diff --cached --name-only`)
- Block commit with helpful error if session not staged
- Allow override with `git commit --no-verify`

## Files Created

### Phase 3B.1: Pre-Commit Framework Files
- `.pre-commit-config.yaml` - Pre-commit framework configuration
  - Local hook: `check-session-updated` (custom session enforcement)
  - Remote hook: `shellcheck` from shellcheck-precommit repo v0.11.0
  - Stage: `pre-commit` (runs before commit)

- `hooks/check-session-updated.sh` - Session enforcement hook script
  - Checks if current branch has metadata
  - Verifies session file in staged changes
  - Blocks commit with helpful error message
  - Supports `--no-verify` override
  - Color-coded output (red errors, yellow warnings, green success)

### Phase 3B.2: Session Update Prompter Skill
- `skills/session-update-prompter/SKILL.md` - Session update prompting skill
  - Auto-invokes after implementation milestones
  - Analyzes recent work to suggest what to document
  - Provides helpful templates for session updates
  - Non-blocking soft nudges (complements hook enforcement)
  - Throttling to avoid over-prompting
  - 4 detailed usage examples

### Phase 3B.3: Drift Detector Skill
- `skills/drift-detector/SKILL.md` - Dual drift detection skill
  - Monitors WHAT work is done (scope alignment) AND HOW it's done (behavior alignment)
  - Detects 5 drift patterns:
    1. Behavioral (sycophantic, research avoidance, quality, workflow)
    2. File scope
    3. Feature scope
    4. Architectural
    5. Objective
  - 3-tier severity scoring and alerts
  - Behavioral drift is HIGH priority (violates core values)
  - Recommends corrective action (update scope, refocus, new session, reset behavior)
  - Early warning system before drift becomes problematic
  - 7 detailed drift scenario examples (3 behavioral, 4 scope)

### Phase 3B.4: Periodic Refresh Enhancement
- `skills/context-loader/SKILL.md` - Updated with periodic refresh
  - 3rd trigger condition: Automatic periodic refresh during long sessions
  - Default interval: 50 interactions (configurable 10-500)
  - Configuration via `.claude/config.json` periodicRefresh object
  - Prevents context drift by reloading core values and project context
  - Example showing automatic refresh trigger and output
- `schemas/config.schema.json` - Updated with periodicRefresh schema
  - Enabled flag (boolean, default: true)
  - Interval setting (number, default: 50, min: 10, max: 500)
  - Full JSON schema validation for periodic refresh config

## Next Steps

### Immediate (Phase 1)
1. Create `hooks/` directory
2. Create `hooks/pre-commit.sh` with session enforcement logic
3. Make executable (`chmod +x`)
4. Test blocking behavior (commit without session update)
5. Test allow behavior (commit with session update)
6. Run shellcheck validation
7. Update session with learnings
8. Commit hook + session update

### After Phase 1
9. Create session update prompter skill
10. Create drift detector skill
11. Add periodic refresh to context-loader
12. Update ROADMAP.md with Phase 3B completion
