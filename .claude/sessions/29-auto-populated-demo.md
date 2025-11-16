# Session: Issue #29 - Phase 3C - Work-Item Automation

## Issue Details
- **Issue Number**: #29
- **Title**: Phase 3C - Work-Item Automation
- **Created**: 2025-11-16
- **Status**: open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/29

## Objective

Automate GitHub/Azure DevOps work-item maintenance to eliminate manual session management overhead.

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
Create skill/command to detect issue from branch:
- Parse branch name (e.g., `issue/feature-24/session-enforcement` → #24)
- Support both GitHub and Azure DevOps patterns
- Validate issue exists and is accessible

### 2. GitHub API Integration (Second Priority)
Fetch issue details:
- Use `gh api` command (already available)
- Extract: title, body, labels, milestone, assignee
- Map to session structure

### 3. Auto-Populate Session (Third Priority)
Create session from issue:
- Map issue title → session title
- Map issue body → objectives/requirements
- Add issue metadata (number, URL, status)
- Create initial session log entry

### 4. Azure DevOps Integration (Fourth Priority)
Fetch work item details:
- Use Azure CLI or REST API
- Extract: title, description, acceptance criteria, state
- Map to session structure

### 5. Bidirectional Sync (Fifth Priority)
Keep session and issue in sync:
- Session update → comment on issue
- Issue update → alert in session
- Status sync (session complete → close issue)

## Success Criteria
- ✅ Auto-detects issue from branch name
- ✅ Fetches issue details from GitHub/Azure DevOps
- ✅ Auto-populates session from issue
- ✅ Bidirectional sync working
- ✅ Zero manual session initialization required

## Implementation Plan

### Phase 1: Issue Detection (First Priority)
- [ ] Create skill/command to detect issue from branch
- [ ] Parse branch name
- [ ] Support GitHub and Azure DevOps patterns
- [ ] Validate issue exists

### Phase 2: GitHub API Integration (Second Priority)
- [ ] Fetch issue details using gh api
- [ ] Extract all relevant fields
- [ ] Map to session structure

### Phase 3: Auto-Populate Session (Third Priority)
- [ ] Map issue title to session title
- [ ] Map issue body to objectives/requirements
- [ ] Add issue metadata
- [ ] Create initial session log entry

### Phase 4: Azure DevOps Integration (Fourth Priority)
- [ ] Fetch work item details
- [ ] Extract title, description, criteria, state
- [ ] Map to session structure

### Phase 5: Bidirectional Sync (Fifth Priority)
- [ ] Session update → comment on issue
- [ ] Issue update → alert in session
- [ ] Status synchronization

## Session Log

### 2025-11-16 - Session Created (Auto-Populated)
- Detected issue #29 from branch `issue/feature-29/work-item-automation`
- Fetched complete work-item data from GitHub
- Auto-populated session from issue content
- Ready to begin implementation

**Next**: Begin Phase 1 (Issue Detection)

## Key Decisions

_(To be populated as implementation progresses)_

## Learnings

_(To be populated as implementation progresses)_

## Files Created

_(To be populated as implementation progresses)_

## Next Steps

1. Create skill/command to detect issue from branch
2. Parse branch name and extract issue number
3. Support both GitHub and Azure DevOps patterns
4. Validate issue exists and is accessible
5. Implement GitHub API integration
6. Map issue fields to session structure
7. Implement auto-population logic
8. Test with real GitHub issues
