# Analysis: onus Goals vs Native Claude Code Features

## Executive Summary

**Key Discovery**: Native Claude Code has extensive work-item capabilities via `gh` CLI and MCP servers. onus provides a **convenience layer**: zero-config branch→issue mapping, automatic context injection, and multi-platform abstraction. The unique value is workflow automation, not raw capability.

## Flexion Fundamentals Alignment

onus's unique value enables these Flexion fundamentals:

| Fundamental | How onus Enables It |
|-------------|----------------------|
| **Never compromise on quality** | Ensures proper commit messages, ticket updates, and PR descriptions |
| **Lead by example** | Handles PM accountability work so it actually gets done |
| **Empower customers to adapt** | Keeps stakeholders informed via trackers without breaking developer focus |

Native tools provide *raw capability* (fetch issues, create PRs). onus provides *workflow automation* that ensures the "awful-but-important" accountability work aligns with how Flexion developers maintain quality.

## onus's Stated Goals

From README:
1. Fetch work items from GitHub Issues, JIRA, Azure DevOps
2. Auto-populate sessions with issue details (memento integration)
3. Generate commit messages that reference tickets properly
4. Create PR descriptions from session and work item
5. Update work items with progress (bidirectional sync)
6. Multi-platform support
7. Branch naming suggestions
8. Issue-to-session bridge
9. Acceptance criteria tracking

## Native Claude Code Capabilities

### GitHub CLI (`gh`)

Claude Code can already use `gh` CLI:

```bash
# View issues
gh issue view 123

# Create issues
gh issue create --title "Bug" --body "Description"

# Create PRs
gh pr create --title "#123 - fix bug" --body "..."

# Comment on issues
gh issue comment 123 --body "Progress update"

# List issues
gh issue list --label "bug"
```

**Configuration**: Add to allowedTools:
```json
{
  "allowedTools": ["Bash(gh:*)", "Bash(gh issue:*)", "Bash(gh pr:*)"]
}
```

### MCP Servers Available

| Platform | MCP Server | Status |
|----------|------------|--------|
| **GitHub** | Built-in gh CLI | ✅ Works well |
| **JIRA** | Atlassian MCP (SSE) | ⚠️ Auth issues reported |
| **JIRA** | mcp-jira-server (Docker) | ✅ Community solution |
| **Azure DevOps** | microsoft/azure-devops-mcp | ✅ Official Microsoft |
| **Azure DevOps** | Tiberriver256/mcp-server-azure-devops | ✅ Community alternative |

### Native Git Operations

| Operation | Native Support |
|-----------|---------------|
| Branch creation | ✅ `git checkout -b` |
| Commit | ✅ With HEREDOC format |
| Push | ✅ `git push` |
| PR creation | ✅ `gh pr create` |
| Status check | ✅ `git status` |

### Feature Request: Native GitHub Issues (#10998)

Open request for deeper integration:
- Currently: Must use `gh` CLI or copy/paste issue content
- Requested: Direct URL-to-implementation (`implement https://github.com/user/repo/issues/64`)
- Status: **Not implemented**, marked as enhancement

## Gap Analysis

### What Native/MCP DOES Cover

| onus Goal | Native Solution | Status |
|-----------|-----------------|--------|
| Fetch GitHub Issues | `gh issue view` | **NATIVE** |
| Fetch JIRA issues | Atlassian/Docker MCP | **MCP** (setup required) |
| Fetch Azure DevOps | Azure DevOps MCP | **MCP** (setup required) |
| Create PRs | `gh pr create` | **NATIVE** |
| Update issues | `gh issue comment` | **NATIVE** |
| Commit with reference | Manual with `#{number}` | **MANUAL** |

### What Native/MCP DOES NOT Cover

| onus Goal | Gap | Why It Matters |
|-----------|-----|----------------|
| **Branch → Issue auto-detect** | Must manually specify issue | No zero-config workflow |
| **Auto-inject on session start** | Must run `gh issue view` | Extra step every time |
| **Unified multi-platform interface** | Different commands per platform | Cognitive overhead |
| **Session integration** | No memento awareness | No session file population |
| **Acceptance criteria tracking** | Not tracked | No completion validation |
| **Commit format enforcement** | Manual | Easy to forget format |
| **Staged changes awareness** | `git status` separate | No integrated prompt |

## The Fundamental Difference

**Native (gh CLI / MCPs)**: Raw capability, explicit commands
```bash
# User must know and type:
gh issue view 42
# Then manually incorporate into context
```

**onus**: Automated workflow
```
# Just checkout branch:
git checkout issue/feature-42/description
# onus automatically:
# 1. Detects issue #42 from branch name
# 2. Loads cached issue details
# 3. Injects context on session start
# 4. Reminds about commit format
# 5. Tracks acceptance criteria
```

This is **convenience**, not **capability**.

## What onus Uniquely Provides

### 1. Zero-Config Branch → Issue Mapping
```javascript
// onus automatically extracts from branch:
// issue/feature-42/description → 42
// feature/PROJ-123-description → PROJ-123
// 42-some-feature → 42
```
No manual specification needed.

### 2. Automatic Context Injection
- SessionStart injects issue context
- No `/fetch` command for cached items
- Context always available

### 3. Multi-Platform Abstraction
```javascript
// Same onus workflow for:
// GitHub: #42
// JIRA: PROJ-123
// Azure: Work item 42
// Platform auto-detected from key format
```

### 4. Memento Integration
- Populates session Goal from issue title
- Tracks acceptance criteria in session
- Bridges issue tracker ↔ session file

### 5. Commit Format Enforcement
```
📍 Onus: #42 - Add authentication | staged
💡 Staged changes detected. When ready to commit:
   `#42 - {verb} {description}`
```

### 6. Acceptance Criteria Tracking
```markdown
**Acceptance Criteria:**
- [ ] User can log in with email
- [ ] Password reset works
- [ ] Session expires after 30 minutes
```

## Alternative: Custom Slash Command

Much of onus's GitHub functionality could be replicated with a slash command:

```markdown
# .claude/commands/fetch-issue.md
Fetch GitHub issue and inject context:
1. Run: gh issue view $ARGUMENTS --json title,body,labels
2. Extract acceptance criteria from body
3. Add to current context
4. Remind about commit format: #$ARGUMENTS - {verb} {description}
```

But this requires:
- Manual invocation (`/project:fetch-issue 42`)
- GitHub-only (no JIRA/Azure)
- No branch auto-detection
- No caching

## Goal-Focused Analysis

The question isn't "what can onus do?" but "what delivers the Flexion fundamentals to the installed project?"

### What Actually Delivers Value

| Flexion Fundamental | What Delivers It | Simplest Implementation |
|---------------------|------------------|------------------------|
| **Never compromise on quality** | Proper commit format, PR descriptions | Git convention rules (could be just `.claude/rules/`) |
| **Lead by example** | PM work actually gets done | Reminders + easy invocation (skills) |
| **Empower customers to adapt** | Stakeholder visibility via trackers | Issue updates when milestones hit |

**Key Insight**: Most of onus's "quality" value is just **git conventions** (commit format, PR template). This could be delivered by `.claude/rules/git.md` without any plugin. The unique onus value is **workflow automation**: zero-friction from branch to issue context.

### What Native Features Already Provide

| Capability | Native Solution | Sufficient? |
|------------|-----------------|-------------|
| Fetch GitHub issues | `gh issue view #N` | ✅ Yes |
| Create PRs | `gh pr create` | ✅ Yes |
| Commit with format | Manual with rules | ✅ If rules loaded |
| JIRA/Azure fetch | MCPs (setup required) | ⚠️ Depends on MCP maturity |

### What Remains Unique to onus

1. **Branch → issue auto-detection** - Extract `#42` from `issue/feature-42/desc` automatically
2. **Session integration** - Populate memento session from issue (bridges the two)
3. **Cached issue context** - Don't re-fetch every session start
4. **Multi-platform abstraction** - Same workflow for GitHub/JIRA/Azure

## Simplest Architecture Recommendation

**Principle**: Delegate fetching to native tools; focus on workflow glue.

### What onus Should Be

```
onus (workflow glue):
├── Branch parsing                   ← Extract issue from branch name
├── Issue caching                    ← Store fetched issue locally
├── Session integration              ← Populate memento Goal/Acceptance from issue
└── Context injection                ← SessionStart reminds about issue

Skills (user-invoked):
├── /onus:fetch                      ← Fetch issue, populate session
├── /onus:init                       ← Setup config
└── (future) /onus:update            ← Push comment to tracker
```

### What onus Should NOT Be

| Temptation | Why Avoid |
|------------|-----------|
| Custom GitHub API client | `gh` CLI does this better |
| Custom JIRA/Azure clients | MCPs do this; don't duplicate |
| PR creation automation | `gh pr create` is native; just enforce format via rules |
| Complex state management | Cache issue, that's it |

### Git Conventions: Plugin or Native?

**Current**: onus owns `git.yml` (commit format, branch naming, PR format)

**Question**: Should this be onus or just `.claude/rules/git.md`?

| Approach | Pros | Cons |
|----------|------|------|
| Keep in onus | Packaged with workflow automation | Extra plugin just for rules |
| Move to native rules | Simpler, native loading | Loses plugin coherence |

**Recommendation**: Keep git conventions in onus context, but recognize they could work standalone. The packaging is valuable—install onus, get the full "PM accountability" workflow.

### Simplest `/onus:fetch` Implementation

```markdown
# /onus:fetch skill

1. Detect platform from branch or config
2. GitHub: `gh issue view $N --json title,body,labels`
3. JIRA/Azure: Use MCP or WebFetch
4. Cache result in `.claude/onus/issue-$N.json`
5. Populate memento session Goal from title
6. Extract acceptance criteria from body
7. Output: "📍 Issue #N loaded. Acceptance criteria tracked."
```

No custom HTTP clients. No complex auth handling. Just wrap native tools.

### Migration Path

1. **Immediate**: Simplify `/onus:fetch` to wrap `gh` CLI
2. **Short-term**: Document MCP setup for JIRA/Azure instead of building fetchers
3. **Medium-term**: Validate if SessionStart hook is needed vs just using `/onus:fetch`
4. **Long-term**: Consider if git rules should live in onus or be standalone

## Conclusion

onus's job is to ensure the "awful-but-important" PM work gets done. The **workflow automation** delivers this—zero-friction from branch name to issue context to session file to properly-formatted commit.

As Claude Code's native capabilities expand (gh CLI, MCPs), onus should simplify:

- **Keep**: Branch→issue detection, session integration, cached context, git conventions
- **Delegate to native**: Issue fetching (gh/MCP), PR creation (gh), status updates (gh)
- **Avoid**: Custom API clients, complex multi-platform abstraction, duplicate capabilities

The simplest onus is: parse branch → fetch with native tools → cache → integrate with memento. Everything else is optional.

## Summary Matrix

| Capability | Native | onus | Verdict |
|------------|--------|------|---------|
| GitHub issue fetch | ✅ gh CLI | ✅ | Native sufficient |
| JIRA issue fetch | ⚠️ MCP (auth issues) | 🔜 planned | MCP when stable |
| Azure DevOps fetch | ✅ MCP | 🔜 planned | MCP available |
| Branch → issue mapping | ❌ | ✅ | **onus unique** |
| Auto-inject context | ❌ | ✅ | **onus unique** |
| Multi-platform unified | ❌ | ✅ | **onus unique** |
| Session integration | ❌ | ✅ | **onus unique** |
| Acceptance criteria | ❌ | ✅ | **onus unique** |
| Commit format reminder | ❌ | ✅ | **onus unique** |
| PR creation | ✅ gh CLI | ❌ | Native |

## Conclusion

onus is a **workflow automation layer**, not a capability layer. Native gh CLI and MCPs provide the raw capabilities; onus provides:
- Zero-friction branch-based context
- Multi-platform abstraction
- Session integration
- Format enforcement

**Recommendation**: Keep onus for workflow automation. Consider using gh CLI / MCPs for actual API operations rather than building custom fetchers.

## Sources

- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [GitHub CLI Integration](https://www.claudecode101.com/en/tutorial/configuration/github-cli)
- [Native GitHub Issues Request #10998](https://github.com/anthropics/claude-code/issues/10998)
- [Azure DevOps MCP](https://github.com/microsoft/azure-devops-mcp)
- [JIRA MCP Server](https://github.com/tom28881/mcp-jira-server)
- [Atlassian MCP Issues #1093](https://github.com/anthropics/claude-code/issues/1093)
- [Docker MCP Toolkit](https://www.docker.com/blog/add-mcp-servers-to-claude-code-with-mcp-toolkit/)
