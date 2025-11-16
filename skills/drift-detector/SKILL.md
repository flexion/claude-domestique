# Drift Detector Skill

## Description
Automatically detects when work diverges from the session's documented scope and objectives, OR when AI behavior diverges from context-specified values and workflows. Alerts before drift becomes problematic. This skill proactively monitors both WHAT work is done (scope alignment) and HOW it's done (behavior alignment), suggesting corrective action.

## Trigger Conditions

This skill auto-invokes when:

1. **After File Creation** - When creating new files:
   - AI creates files via Write tool
   - Files created that aren't mentioned in session scope
   - Check after 2-3 file creations in a session

2. **After Multiple Edits** - When editing existing files:
   - After 5+ file edits in areas not mentioned in session
   - Editing files outside documented scope
   - Refactoring beyond original objectives

3. **During Feature Implementation** - When implementing functionality:
   - User requests feature not in session objectives
   - AI begins work on undocumented requirements
   - Scope expands beyond session plan

4. **Periodic Check** - At regular intervals:
   - Every 20-30 interactions during active work
   - Before major milestones (commits, PRs)
   - When transitioning between tasks

## Actions

When triggered, perform the following steps:

### Step 1: Load Session Context

1. Detect current session (branch → metadata → session file)
2. If no session: skip (main branch, no tracking)
3. Read session file to extract:
   - **Objectives**: What the session aims to accomplish
   - **Requirements**: Specific features/components to implement
   - **Scope**: Files, areas, features mentioned
   - **Files Created section**: Already documented file list

### Step 2: Analyze Recent Work

Review recent conversation and tool usage to identify:

**Files Created:**
- Collect all file paths from Write tool usage
- Note file types (source, config, test, docs)
- Identify directories/modules involved

**Files Modified:**
- Collect all file paths from Edit tool usage
- Note frequency of edits per file
- Identify areas of codebase being changed

**Features Implemented:**
- Extract what functionality was added
- Identify new components/modules created
- Note architectural changes made

**User Requests:**
- Capture what user asked to implement
- Note if requests expanded beyond original scope
- Identify new requirements introduced

### Step 3: Detect Drift Patterns

Compare recent work against session scope AND expected behavior to identify drift:

#### Pattern 1: Behavioral Drift
**Detection:**
- AI behavior diverges from values specified in context files
- Not following behavior.yml guidelines (skepticism, objectivity, quality)
- Violating git.yml workflow rules
- Ignoring session.yml requirements

**Behavioral Drift Indicators:**

**Sycophantic Drift:**
- Eager agreement without critical assessment
- "You're absolutely right" without analysis
- Validating user ideas without questioning
- Missing the skeptical stance specified in behavior.yml

**Research Avoidance Drift:**
- Implementing without investigation
- Guessing instead of searching/reading
- Skipping verification steps
- Not using grep/glob to understand codebase first

**Quality Drift:**
- Skipping testing when context requires it
- Not running validation tools (shellcheck, linters)
- Implementing without considering alternatives
- Rushing to code without design thinking

**Workflow Drift:**
- Adding attribution to commits (violates git.yml)
- Not using HEREDOC format for commits
- Skipping session updates (violates sessions.yml)
- Creating files without updating session

**Example:**
- Context: behavior.yml specifies "skeptical default, find problems"
- Drift: AI responds "Great idea! Let me implement that right away" without questioning approach, considering alternatives, or identifying risks

#### Pattern 2: File Scope Drift
**Detection:**
- Files created in directories not mentioned in session
- New modules/components not in session objectives
- File types outside original scope (e.g., adding frontend when session is backend)

**Example:**
- Session: "Implement user authentication API"
- Drift: Creating `components/LoginForm.tsx` (frontend, not in scope)

#### Pattern 3: Feature Scope Drift
**Detection:**
- Implementing features not listed in objectives
- Adding functionality beyond requirements
- "While we're at it..." expansion

**Example:**
- Session: "Add password reset endpoint"
- Drift: Also implementing email verification, 2FA, password strength checker

#### Pattern 4: Architectural Drift
**Detection:**
- Making architectural changes not in session plan
- Refactoring beyond documented scope
- Adding new dependencies/frameworks

**Example:**
- Session: "Fix bug in user service"
- Drift: Refactoring entire service layer to use different pattern

#### Pattern 5: Objective Drift
**Detection:**
- User requests diverge from session objectives
- Multiple unrelated tasks in single session
- Original objective abandoned

**Example:**
- Session: "Implement caching layer"
- Drift: Now working on logging system, metrics, monitoring

### Step 4: Calculate Drift Score

Assign drift severity based on detected patterns:

**Low Drift (Score 1-3):**
- 1-2 files outside scope but related
- Minor scope expansion (natural evolution)
- Related functionality added
- Minor workflow deviation (forgot one step)

**Medium Drift (Score 4-6):**
- 3-5 files outside scope
- Feature expansion beyond original plan
- Multiple unrelated changes
- Behavioral drift (sycophantic tone, skipping research)
- Workflow violations (no HEREDOC, missing session updates)

**High Drift (Score 7-10):**
- 6+ files in unrelated areas
- Major architectural changes not in scope
- Original objective lost/abandoned
- Implementing different feature entirely
- Severe behavioral drift (abandoning core values)
- Systematic workflow violations

### Step 5: Alert and Recommend

Based on drift score, alert the user:

#### Low Drift Alert (Score 1-3)
```
Context Drift Detected (Low):

Session objective: [Original objective]

Recent work:
- [File/feature created outside original scope]

This is minor scope expansion. Consider:
1. Update session to reflect expanded scope
2. Continue current work, update session later

No immediate action needed.
```

#### Medium Drift Alert (Score 4-6)
```
Context Drift Detected (Medium):

Session objective: [Original objective]

Work diverging from scope:
- Created files: [List files outside scope]
- Implemented features: [Features not in objectives]

Recommendation:
1. PAUSE: Review if this work aligns with session goals
2. UPDATE SESSION: If scope intentionally expanded, document it
3. REFOCUS: If drifted accidentally, return to original objectives

Current session: .claude/sessions/<session-file>
```

#### High Drift Alert (Score 7-10)
```
⚠️  SIGNIFICANT Context Drift Detected (High):

Original session objective:
[Session objective from file]

Current work:
[What's actually being implemented]

Major divergence detected:
- Files created in unrelated areas: [List]
- Features implemented outside scope: [List]
- Original objective appears abandoned

RECOMMENDED ACTION:
1. STOP current work
2. DECIDE: Are you intentionally pivoting?
   - YES: Create new session for this work (don't reuse existing)
   - NO: Refocus on original objective, abandon divergent work

This level of drift suggests you may need a separate session.

Original session: .claude/sessions/<session-file>
```

### Step 6: Suggest Corrective Action

Based on context, suggest specific actions:

**If Scope Expansion:**
- Update session objectives to reflect new scope
- Add new requirements/features to session
- Update "Files Created" section
- Document decision to expand scope

**If Accidental Drift:**
- Return to original objectives
- Defer divergent work to future session
- Create TODO for divergent work ideas
- Refocus on session goals

**If Major Pivot:**
- Create new session file for new work
- Close/complete current session
- Branch appropriately for new objective
- Keep sessions focused on single objective

## Drift Detection Examples

### Example 1: Behavioral Drift - Sycophantic Response (Medium)

**Context Specification (behavior.yml):**
```yaml
stance: skeptical_default
approach: find_problems_not_agreement
before_implementation:
  - assess_correctness
  - evaluate_architecture
  - consider_alternatives
  - identify_risks
```

**User Request:** "Let's use MongoDB for this project"

**Expected Behavior (per context):**
- Question the choice, don't immediately agree
- Ask about requirements (scale, query patterns, consistency needs)
- Consider alternatives (PostgreSQL, MySQL, other options)
- Identify risks/trade-offs of MongoDB choice
- Provide objective analysis before proceeding

**Drift Detected:**
```
AI Response: "Great idea! MongoDB is perfect for this. Let me set it up right away."

⚠️  Behavioral Drift Detected (Medium):

Context specification: behavior.yml requires skeptical assessment
AI behavior: Eager agreement without critical analysis

Expected per behavior.yml:
- Question choice and understand requirements ✗ (skipped)
- Consider alternatives ✗ (skipped)
- Identify risks/trade-offs ✗ (skipped)
- Skeptical stance ✗ (violated)

Actual behavior:
- Immediate enthusiastic agreement ⚠️
- No requirements analysis ⚠️
- No alternatives considered ⚠️
- Sycophantic tone ("Great idea!") ⚠️

RECOMMENDED ACTION:
AI should pause and follow behavior.yml process:
1. Ask WHY MongoDB (understand requirements)
2. Evaluate if MongoDB fits those requirements
3. Consider alternatives (SQL databases, other NoSQL)
4. Identify trade-offs and risks
5. Provide objective recommendation

Context file: context/behavior.yml (skeptical_default stance)
```

### Example 2: Behavioral Drift - Research Avoidance (High)

**Context Specification (behavior.yml):**
```yaml
before_implementation:
  - search_codebase_first
  - understand_existing_patterns
  - verify_assumptions
```

**User Request:** "Add logging to the authentication flow"

**Expected Behavior:**
- Search codebase for existing logging patterns (grep/glob)
- Understand current logging setup (what library, format, level)
- Check how other flows handle logging
- Verify logging configuration exists
- Follow established patterns

**Drift Detected:**
```
AI Response: "I'll add console.log statements to the auth functions."

⚠️  SIGNIFICANT Behavioral Drift Detected (High):

Context specification: Requires codebase research before implementation
AI behavior: Implementing without investigation

Required steps per behavior.yml:
- Search for existing logging patterns ✗ (skipped)
- Understand current logging setup ✗ (skipped)
- Verify assumptions about logging ✗ (skipped)

Actual behavior:
- Immediately proposed implementation ⚠️
- Assumed console.log (may not match project) ⚠️
- No research conducted ⚠️
- Guessing instead of investigating ⚠️

This is HIGH severity because:
- Could introduce inconsistent patterns
- May conflict with existing logging infrastructure
- Violates core "research first" principle

RECOMMENDED ACTION:
STOP implementation. Follow required process:
1. Search: grep -r "log\|logger" to find existing patterns
2. Read: Understand what logging library is used
3. Verify: Check logging configuration and format
4. Match: Implement using established patterns

Context file: context/behavior.yml (search_codebase_first)
```

### Example 3: Behavioral Drift - Workflow Violation (Medium)

**Context Specification (git.yml):**
```yaml
commit_format: HEREDOC
attribution: NEVER
format: "chore - verb desc"
```

**AI Action:**
```bash
git commit -m "chore - add logging

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Drift Detected:**
```
⚠️  Behavioral Drift Detected (Medium):

Context specification: git.yml workflow rules
AI behavior: Violated multiple git workflow rules

Required per git.yml:
- Use HEREDOC format for commits ✗ (violated)
- NEVER add attribution ✗ (violated)
- Format: "chore - verb desc" ✓ (correct)

Actual behavior:
- Used -m flag instead of HEREDOC ⚠️
- Added attribution footer ⚠️
- Added emoji ⚠️

RECOMMENDED ACTION:
Follow git.yml workflow exactly:

Correct format:
```bash
git commit -m "$(cat <<'EOF'
chore - add logging to authentication flow
- Add logger initialization
- Log successful/failed auth attempts
EOF
)"
```

NEVER include attribution or emojis.

Context file: context/git.yml (commit workflow)
```

### Example 4: File Scope Drift (Medium)

**Session Objective:** "Implement REST API endpoints for user management"

**Files Created:**
- `api/users/create.ts` ✓ (in scope)
- `api/users/update.ts` ✓ (in scope)
- `api/users/delete.ts` ✓ (in scope)
- `frontend/UserForm.tsx` ⚠️ (outside scope - frontend not mentioned)
- `frontend/UserList.tsx` ⚠️ (outside scope)
- `components/Table.tsx` ⚠️ (outside scope)

**Alert:**
```
Context Drift Detected (Medium):

Session objective: Implement REST API endpoints for user management

Work diverging from scope:
- Created 3 frontend files (session is backend API only)
- Files: UserForm.tsx, UserList.tsx, Table.tsx

Original scope:
- REST API endpoints ✓ (completed)
- User CRUD operations ✓ (completed)
- Frontend components ⚠️ (NOT in scope)

Recommendation:
Frontend work is outside this session's scope. Options:
1. UPDATE SESSION: Add frontend implementation to scope
2. NEW SESSION: Create separate session for frontend
3. DEFER: Save frontend work for future session

Current session: .claude/sessions/18-user-api.md
```

### Example 5: Feature Scope Drift (High)

**Session Objective:** "Fix pagination bug in product listing"

**Work Done:**
- Fixed pagination bug ✓ (objective completed)
- Refactored entire pagination component ⚠️
- Added infinite scroll ⚠️
- Implemented virtualized rendering ⚠️
- Added sorting and filtering ⚠️
- Redesigned product card layout ⚠️

**Alert:**
```
⚠️  SIGNIFICANT Context Drift Detected (High):

Original session objective:
Fix pagination bug in product listing

Current work:
- Pagination bug: FIXED ✓
- Pagination refactor: ADDED (not in scope)
- Infinite scroll: ADDED (not in scope)
- Virtualized rendering: ADDED (not in scope)
- Sorting/filtering: ADDED (not in scope)
- UI redesign: ADDED (not in scope)

Major divergence detected:
Original objective was complete after bug fix, but work continued
with major feature additions and refactoring not in session scope.

RECOMMENDED ACTION:
1. STOP current work
2. Original bug fix is complete - that work should be committed
3. CREATE NEW SESSION for pagination enhancements
4. Separate "bug fix" from "feature enhancements"

This level of drift suggests you've completed original goal and
started a new project within the same session.

Original session: .claude/sessions/22-pagination-bug.md
```

### Example 6: Objective Drift (High)

**Session Objective:** "Implement email notification system"

**User Requests in Session:**
1. "Create email templates" ✓ (in scope)
2. "Add send email function" ✓ (in scope)
3. "Actually, let's add SMS notifications too" ⚠️ (scope expansion)
4. "While we're at it, implement push notifications" ⚠️ (scope expansion)
5. "Let's build a notification preferences UI" ⚠️ (major expansion)
6. "Can you add notification analytics?" ⚠️ (completely new area)

**Alert:**
```
⚠️  SIGNIFICANT Context Drift Detected (High):

Original session objective:
Implement email notification system

Scope has expanded significantly:
✓ Email templates (original scope)
✓ Email sending (original scope)
⚠️ SMS notifications (added)
⚠️ Push notifications (added)
⚠️ Preferences UI (added)
⚠️ Analytics system (added)

This session has grown from "email notifications" to
"complete multi-channel notification platform with analytics."

RECOMMENDED ACTION:
Email notification system appears complete. The additional
features (SMS, push, UI, analytics) are substantial additions
that warrant separate focused sessions.

OPTIONS:
1. COMPLETE CURRENT: Commit email system, close session
2. CREATE NEW: "Notification platform" session for expanded scope
3. SPLIT WORK: Separate sessions for each channel + analytics

Mixing multiple large features in one session increases
context drift risk and makes work harder to track.

Current session: .claude/sessions/15-email-notifications.md
```

### Example 7: Architectural Drift (Medium)

**Session Objective:** "Add caching to API responses"

**Work Done:**
- Implemented Redis caching ✓ (in scope)
- Refactored entire API layer to use middleware pattern ⚠️ (architectural change)
- Migrated all routes to new structure ⚠️ (large refactor)
- Changed error handling approach ⚠️ (architectural change)

**Alert:**
```
Context Drift Detected (Medium):

Session objective: Add caching to API responses

Architectural changes detected:
- Redis caching: IMPLEMENTED ✓ (original objective)
- API layer refactor: PERFORMED ⚠️ (not in scope)
- Middleware pattern: ADOPTED ⚠️ (architectural change)
- Route migration: COMPLETED ⚠️ (large refactor)
- Error handling: CHANGED ⚠️ (architectural change)

While adding caching, significant architectural changes were made
that go beyond the original objective.

Recommendation:
Architectural refactoring is valuable but wasn't in session scope.
This makes it harder to track "what changed and why."

OPTIONS:
1. UPDATE SESSION: Document architectural decisions made
2. SPLIT COMMITS: Separate "add caching" from "refactor API"
3. SEPARATE PR: Two PRs - one for caching, one for refactor

Large architectural changes deserve their own focused sessions
with proper documentation and review.

Current session: .claude/sessions/28-api-caching.md
```

## Configuration

No configuration needed. This skill is always active for sessions with branch metadata.

## Drift Thresholds

Default thresholds for drift detection:

```yaml
drift_thresholds:
  low:
    files_outside_scope: 1-2
    features_added: 1
    behavioral_violations: 1
    severity_score: 1-3

  medium:
    files_outside_scope: 3-5
    features_added: 2-3
    behavioral_violations: 2-3
    workflow_violations: 1-2
    severity_score: 4-6

  high:
    files_outside_scope: 6+
    features_added: 4+
    objective_abandoned: true
    systematic_behavioral_drift: true
    core_values_abandoned: true
    severity_score: 7-10

check_frequency:
  after_files_created: 3
  after_edits: 5
  periodic_interactions: 25
  before_milestone: true
```

## Error Handling

### No Session File
**Scenario**: Branch has no metadata

**Action**:
- Skip drift detection (main branch)
- Don't report error
- Silently continue

### Session File Incomplete
**Scenario**: Session missing objectives/scope

**Action**:
- Report: "Session file lacks objectives section"
- Suggest: "Update session with clear objectives"
- Continue without drift detection

### Cannot Determine Scope
**Scenario**: Session objectives too vague

**Action**:
- Skip specific drift detection
- Suggest: "Add specific objectives to enable drift detection"

## Integration

**Works with:**
- Session files (objectives, scope, requirements)
- Context files (behavior.yml, git.yml, sessions.yml)
- Branch metadata system
- File creation/editing tools (Write, Edit)
- Pre-commit hook (alerts before enforcement)
- Session update prompter (suggests updates after drift)

**Benefits:**
- **Early Warning**: Catches drift during work, not after
- **Prevents Scope Creep**: Alerts when work expands beyond plan
- **Maintains Focus**: Keeps session aligned with objectives
- **Enforces Values**: Alerts when AI behavior diverges from context specifications
- **Quality Assurance**: Catches sycophantic, rushed, or careless behavior
- **Workflow Compliance**: Ensures git/session workflows followed
- **Clear Decision Points**: Forces decision to update scope or refocus
- **Session Integrity**: Ensures session files accurately reflect work

## Notes

- This is an **alert system**, not enforcement (doesn't block work)
- Monitors TWO types of drift:
  - **Scope drift**: WHAT work is being done (files, features, objectives)
  - **Behavioral drift**: HOW work is being done (AI behavior, workflow compliance)
- Alerts increase in urgency as drift severity increases
- Low drift is natural (scope evolves) - just document it
- High drift suggests need for correction (new session, refocus, or behavior reset)
- Behavioral drift is HIGH priority (violates core values)
- Works best with clear, specific session objectives AND context specifications
- Complements session update prompter (drift detection → update prompt)
- Helps maintain "one session, one objective" principle
- Ensures AI maintains skeptical, quality-focused, research-first behavior
