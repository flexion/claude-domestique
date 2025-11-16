# Session: Issue #29 - Phase 3C - Work-Item Automation

## Issue Details
- **Issue Number**: #29
- **Title**: Phase 3C - Work-Item Automation
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/29

## Objective

Automate GitHub/Azure DevOps work-item maintenance to eliminate manual session management overhead. Deliver the final core purpose: "Automate Shit-Work".

**Addresses**: Core Purpose #2 (Automate Shit-Work)

## Requirements

### Core Components
1. GitHub API integration - fetch issue details
2. Azure DevOps API integration - fetch work item details
3. Auto-detect issue/work-item from branch name
4. Auto-populate session from issue/work-item
5. Bidirectional sync (session ↔ work item)

### Key Features
- **Auto-detection**: Extract issue number from branch name
- **Auto-fetch**: Retrieve issue/work-item details via API
- **Auto-populate**: Create session file from issue data
- **Bidirectional sync**: Update issue when session updates, vice versa
- **Multi-platform**: Support both GitHub and Azure DevOps

## Technical Approach

### 1. Issue Detection (First Priority)
Create skill to detect issue from branch:
- Parse branch name (e.g., `issue/feature-29/work-item-automation` → #29)
- Support both GitHub (`issue/feature-N/desc`) and Azure DevOps patterns
- Validate issue exists and is accessible
- Cache issue detection to avoid repeated API calls

### 2. GitHub Integration (Second Priority)
Fetch issue details:
- Use `gh api` command (already available in system)
- Extract: title, body, labels, milestone, assignee, created date
- Map to session structure (objectives, requirements, metadata)
- Handle API errors gracefully (rate limits, auth issues, network)

### 3. Auto-Populate Session (Third Priority)
Create session from issue:
- Map issue title → session title
- Map issue body → objectives/requirements (parse markdown sections)
- Add issue metadata (number, URL, status, labels)
- Create initial session log entry with issue details
- Respect existing session template structure

### 4. Azure DevOps Integration (Fourth Priority)
Fetch work item details:
- Use Azure CLI (`az boards work-item show`) or REST API
- Extract: title, description, acceptance criteria, state, assigned to
- Map to session structure
- Handle Azure-specific fields (work item type, area path, iteration)

### 5. Bidirectional Sync (Fifth Priority)
Keep session and issue in sync:
- Session update → post comment on issue
- Issue label change → update session status
- Session completion → close issue (or mark as resolved)
- Conflict detection and resolution
- Sync interval configuration

## Implementation Plan

### Phase 1: Issue Detection Skill
- [ ] Create `skills/issue-detector/SKILL.md`
- [ ] Define trigger conditions (session start, branch switch, manual request)
- [ ] Implement branch name parsing logic
- [ ] Support GitHub branch patterns
- [ ] Support Azure DevOps branch patterns
- [ ] Validate issue exists via API
- [ ] Cache detection results
- [ ] Error handling for invalid branches

### Phase 2: GitHub Integration
- [ ] Create command `/fetch-issue` or integrate into skill
- [ ] Use `gh api repos/:owner/:repo/issues/:number`
- [ ] Parse JSON response
- [ ] Extract relevant fields (title, body, labels, etc.)
- [ ] Handle markdown in issue body
- [ ] Test with various issue formats
- [ ] Error handling (not found, auth, rate limit)

### Phase 3: Auto-Populate Session
- [ ] Create session template generator
- [ ] Map issue fields to session sections:
  - Issue title → Session title
  - Issue body → Objectives/Requirements
  - Labels → Session tags/status
  - Milestone → Session milestone
- [ ] Generate initial session log entry
- [ ] Update branch metadata
- [ ] Test session creation workflow
- [ ] Handle existing session files (don't overwrite)

### Phase 4: Azure DevOps Integration
- [ ] Research Azure CLI availability
- [ ] Create Azure DevOps command/skill
- [ ] Use `az boards work-item show --id <id>`
- [ ] Parse work item response
- [ ] Map Azure DevOps fields to session structure
- [ ] Handle work item types (User Story, Bug, Task, etc.)
- [ ] Test with Azure DevOps work items
- [ ] Error handling

### Phase 5: Bidirectional Sync
- [ ] Design sync strategy (when to sync, what triggers)
- [ ] Session update → issue comment:
  - Detect session file changes
  - Format session updates for issue comments
  - Post via `gh api` or `az boards`
- [ ] Issue update → session alert:
  - Poll for issue changes (or webhook)
  - Detect relevant changes (status, labels, description)
  - Update session or alert user
- [ ] Status synchronization:
  - Session marked complete → close issue
  - Issue closed → update session status
- [ ] Conflict resolution (both changed simultaneously)
- [ ] Configuration (sync interval, what to sync)
- [ ] Test sync scenarios

## Dependencies
- GitHub CLI (`gh`) - **AVAILABLE** (already in system)
- Azure CLI (`az`) - **UNKNOWN** (may need installation/setup)
- Branch metadata system (Phase 1) - **COMPLETE**
- Session file structure - **COMPLETE**
- Pre-commit hook - **COMPLETE** (ensures session updates)

## Success Criteria
- ✅ Auto-detects issue from branch name
- ✅ Fetches issue details from GitHub API
- ✅ Auto-populates session file from issue
- ✅ Supports Azure DevOps work items
- ✅ Bidirectional sync working
- ✅ Zero manual session initialization for issue-based work

## Notes

**Focus on GitHub first** - Most common use case. Azure DevOps integration is secondary.

**Testing approach**: Integration testing with real GitHub issues (#29 can be the test case).

**API considerations**:
- Rate limits: Cache aggressively, respect limits
- Authentication: Rely on `gh` and `az` CLI tools (already authenticated)
- Offline mode: Gracefully degrade when APIs unavailable
- Error messages: Clear, actionable errors for users

**Session template**: Should preserve the structure of manually-created sessions (objectives, requirements, learnings, etc.)

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #29 for Phase 3C
- Created feature branch: issue/feature-29/work-item-automation
- Created branch metadata
- Initialized session file
- Ready to implement issue detection skill

**Next**: Plan Phase 1 (Issue Detection Skill) implementation

## Key Decisions

_(To be populated as implementation progresses)_

## Learnings

_(To be populated as implementation progresses)_

## Files Created

_(To be populated as implementation progresses)_

## Next Steps

### Immediate (Phase 1)
1. Design issue-detector skill architecture
2. Create `skills/issue-detector/SKILL.md`
3. Implement branch name parsing logic
4. Test with current branch (should detect #29)
5. Document skill usage and examples
6. Update session with learnings
7. Commit skill + session update

### After Phase 1
8. Begin Phase 2 (GitHub Integration)
9. Create `/fetch-issue` command or integrate into skill
10. Test fetching issue #29
11. Implement session auto-population
12. Test end-to-end workflow
