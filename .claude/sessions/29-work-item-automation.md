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
2. Jira API integration - fetch issue/ticket details
3. Azure DevOps API integration - fetch work item details
4. Auto-detect issue/work-item from branch name
5. Auto-populate session from issue/work-item
6. Bidirectional sync (session ↔ work item)

### Key Features
- **Auto-detection**: Extract issue number from branch name
- **Auto-fetch**: Retrieve issue/work-item details via API
- **Auto-populate**: Create session file from issue data
- **Bidirectional sync**: Update issue when session updates, vice versa
- **Multi-platform**: Support GitHub, Jira, and Azure DevOps

## Technical Approach

### 1. Issue Detection (First Priority)
Create skill to detect issue from branch:
- Parse branch name to extract issue identifier
  - GitHub: `issue/feature-29/desc` → #29
  - Jira: `feature/PROJ-123/desc` → PROJ-123
  - Azure DevOps: `feature/456/desc` → #456
- Detect platform based on identifier format
- Validate issue exists via appropriate API
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

### 4. Jira Integration (Fourth Priority) - Use imdone.io
Leverage imdone CLI (markdown-based Jira integration):
- **Install**: `npm i -g imdone-cli && imdone init`
- **Pull**: `imdone pull` → fetches Jira issues as markdown via JQL
- **Structure**: `backlog/[ISSUE-KEY]-[SUMMARY]/issue-[KEY].md`
- **Parse**: Extract from imdone markdown format → map to session structure
- **Sync**: Use `imdone push` for bidirectional sync (local ↔ Jira)
- **Benefits**:
  - Markdown-native (no custom API integration needed)
  - Git-backed (version control for issues)
  - AI-accessible (issues as markdown in repo)
  - Bidirectional sync built-in
- **Limitations**: Free tier has 5 push limit (paid tier for unlimited)
- **Config**: `.imdone/config.yml` with JQL queries

### 5. Azure DevOps Integration (Fifth Priority)
Fetch work item details:
- Use Azure CLI (`az boards work-item show`) or REST API
- Extract: title, description, acceptance criteria, state, assigned to
- Map to session structure
- Handle Azure-specific fields (work item type, area path, iteration)

### 6. Bidirectional Sync (Sixth Priority)
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
- [ ] Support GitHub branch patterns (`issue/feature-N/desc`)
- [ ] Support Jira branch patterns (`feature/PROJ-123/desc`)
- [ ] Support Azure DevOps branch patterns (`feature/456/desc`)
- [ ] Detect platform from identifier format (# vs KEY-N vs N)
- [ ] Validate issue exists via appropriate API
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

### Phase 4: Jira Integration (via imdone.io)
- [ ] Install imdone CLI (`npm i -g imdone-cli`)
- [ ] Research imdone CLI usage and configuration
- [ ] Create skill to detect Jira issues (PROJ-123 pattern)
- [ ] Use `imdone pull` to fetch issues as markdown
- [ ] Parse imdone markdown format:
  - `backlog/[KEY]-[SUMMARY]/issue-[KEY].md`
  - Extract frontmatter (metadata)
  - Extract body (description/acceptance criteria)
  - Handle comments file (`comments-[KEY].md`)
- [ ] Map imdone markdown → session structure
- [ ] Handle `.imdone/config.yml` (JQL configuration)
- [ ] Implement bidirectional sync via `imdone push`
- [ ] Test with real Jira issues
- [ ] Error handling (auth, pull limits on free tier)

### Phase 5: Azure DevOps Integration
- [ ] Research Azure CLI availability
- [ ] Create Azure DevOps command/skill
- [ ] Use `az boards work-item show --id <id>`
- [ ] Parse work item response
- [ ] Map Azure DevOps fields to session structure
- [ ] Handle work item types (User Story, Bug, Task, etc.)
- [ ] Test with Azure DevOps work items
- [ ] Error handling

### Phase 6: Bidirectional Sync
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
- Jira CLI or REST API access - **UNKNOWN** (may need configuration)
- Azure CLI (`az`) - **UNKNOWN** (may need installation/setup)
- Branch metadata system (Phase 1) - **COMPLETE**
- Session file structure - **COMPLETE**
- Pre-commit hook - **COMPLETE** (ensures session updates)

## Success Criteria
- ✅ Auto-detects issue from branch name (GitHub, Jira, Azure DevOps)
- ✅ Fetches issue details from appropriate API
- ✅ Auto-populates session file from issue
- ✅ Supports all three platforms (GitHub, Jira, Azure DevOps)
- ✅ Bidirectional sync working
- ✅ Zero manual session initialization for issue-based work
- ✅ Platform auto-detection working based on identifier format

## Notes

**Platform priority**:
1. **GitHub first** - Most common in open source, easiest to test (this repo uses GitHub)
2. **Jira second** - Most common in enterprise, widest adoption
3. **Azure DevOps third** - Common in Microsoft shops

**Platform detection**: Use identifier format to detect platform automatically:
- `#N` or numeric only → GitHub or Azure DevOps (disambiguate via API)
- `PROJECT-N` format → Jira
- Allow explicit platform specification in config

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

### 2024-11-16 - Global Context Updated
- Created `context/work-items.yml` - work-item automation workflow documentation:
  - Supported platforms (GitHub, Jira, Azure DevOps)
  - Auto-detection logic (branch pattern → identifier → platform)
  - Auto-population workflow (detect → fetch → map → populate → metadata)
  - Field mapping for all three platforms
  - Bidirectional sync strategy
  - Configuration, examples, error handling
- Updated `context/sessions.yml` - added work-item automation:
  - Session creation: manual + auto (work-item automation)
  - Auto-population workflow documented
  - Updated tools section with auto-creation
  - Updated benefits (automated, synced with work items)
- Global context now includes work-item automation as core workflow

**Next**: Begin Phase 1 (Issue Detection Skill) implementation

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
