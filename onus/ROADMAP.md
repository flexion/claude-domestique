# onus Roadmap

## Phase 1: GitHub Issues (Foundation)

Start with GitHub since it's the simplest API and most common.

- [ ] GitHub issue fetcher (read issue by number)
- [ ] Issue-to-session mapper (populate session template from issue)
- [ ] Branch name suggester (`issue/feature-N/description`)
- [ ] Commit message formatter (`#N - verb description`)
- [ ] PR description generator (from session + issue)

## Phase 2: Commit & PR Polish

Make the generated text actually good.

- [ ] Commit message from staged changes + session context
- [ ] PR description template support (org-specific formats)
- [ ] Acceptance criteria checklist in PR body
- [ ] Link validation (ensure #N references exist)
- [ ] Multi-commit summarization for PR descriptions

## Phase 3: JIRA Integration

Enterprise reality.

- [ ] JIRA authentication (API token, OAuth)
- [ ] Issue fetcher (read by key: PROJ-123)
- [ ] Field mapping (JIRA fields vary wildly)
- [ ] Status transitions (move to In Progress, etc.)
- [ ] Comment posting (progress updates)

## Phase 4: Azure DevOps Integration

The other enterprise reality.

- [ ] Azure DevOps authentication (PAT, Azure AD)
- [ ] Work item fetcher (by ID)
- [ ] Field mapping (work item types vary)
- [ ] State transitions
- [ ] Discussion thread updates

## Phase 5: Bidirectional Sync

The holy grail.

- [ ] Push session progress to work item
- [ ] Update work item status from git events
- [ ] Link PRs to work items automatically
- [ ] Sync comments/decisions back to tracker
- [ ] Conflict detection (manual edits vs auto-updates)

## Phase 6: Smart Generation

Make it actually smart.

- [ ] Commit message inference from diff
- [ ] PR description from conversation history
- [ ] Acceptance criteria validation (did we actually do this?)
- [ ] Suggested reviewers from code ownership
- [ ] Risk assessment for PR description

## Integration Milestones

| Milestone | memento integration |
|-----------|---------------------------|
| Phase 1 | Populate session files from GitHub issues |
| Phase 3 | Populate from JIRA issues |
| Phase 4 | Populate from Azure DevOps work items |
| Phase 5 | Session updates sync back to trackers |
