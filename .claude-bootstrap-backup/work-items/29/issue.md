# Phase 3C - Work-Item Automation

**Issue:** #29
**State:** open
**Created:** 2025-11-16T18:10:56Z
**Updated:** 2025-11-16T18:10:56Z
**URL:** https://github.com/flexion/claude-domestique/issues/29
**Labels:** (none)
**Milestone:** (none)
**Assignee:** (none)

---

# Phase 3C - Work-Item Automation

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

## Notes

**Focus on GitHub first** - Most common use case. Azure DevOps second.

**Testing approach**: Integration testing with real GitHub issues and Azure DevOps work items.
