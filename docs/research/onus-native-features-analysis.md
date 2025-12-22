# Analysis: onus Goals vs Native Claude Code Features

## Executive Summary

**Key Discovery**: Native Claude Code has extensive work-item capabilities via `gh` CLI and MCP servers. onus provides a **convenience layer**: zero-config branch→issue mapping, automatic context injection, and multi-platform abstraction. The unique value is workflow automation, not raw capability.

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

## Recommendations

### Keep onus's Core Value

onus provides **workflow automation**:
1. **Branch → Issue auto-detection** (unique)
2. **Session integration** (unique with memento)
3. **Multi-platform abstraction** (unique)
4. **Acceptance criteria tracking** (unique)

### Potential Simplifications

1. **Use gh CLI directly for GitHub ops**
   - `/onus:fetch` could wrap `gh issue view`
   - PR creation could use `gh pr create`

2. **Document MCP setup for JIRA/Azure**
   - Instead of building fetchers, document MCP setup
   - Use MCPs for actual API calls

3. **Focus on unique value**
   - Branch parsing
   - Context injection
   - Session integration
   - Format enforcement

### Architecture Options

**Option A: Thin Wrapper (Recommended)**
- Keep branch parsing and context injection
- Delegate actual fetching to gh CLI / MCPs
- Focus on workflow, not API calls

**Option B: Full Integration**
- Keep current architecture
- Add MCP-based fetchers for JIRA/Azure
- More complex but self-contained

**Option C: Slash Commands Only**
- Convert to slash commands
- Use gh CLI / MCPs directly
- Lose auto-injection on session start

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
