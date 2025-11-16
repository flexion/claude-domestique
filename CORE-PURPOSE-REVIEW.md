# Core Purpose Review

## The Four Core Purposes

1. **Inject Core Values** - Skepticism, quality, non-sycophantic behavior into EVERY project
2. **Do the Shit-Work** - Automate work-item maintenance across multiple tools
3. **Prevent Context Drift** - Ensure AI stays aligned with project context over time
4. **Share Knowledge** - Track work in Git for sharing across contexts and developers

---

## Current State Assessment

### ✅ Purpose 4: Share Knowledge (WORKING)

**What We Built:**
- Session files in `.claude/sessions/` (markdown, Git-tracked)
- Branch metadata in `.claude/branches/`
- Work tracked in version control
- Human-readable format

**Status:** ✅ **FULLY ALIGNED** - This is working as intended.

---

### ⚠️ Purpose 1: Inject Core Values (PARTIALLY WORKING)

**What We Built:**
- Context loader skill (auto-loads context files)
- Config system allows specifying which files to load
- Session workflow via context files

**The Problem:**
- ❌ Core context files are in the **bootstrap** `.claude/` directory
- ❌ Projects must create their own behavior.yml, git.yml, sessions.yml
- ❌ The plugin doesn't actually INJECT core values - it expects projects to define them

**What's Missing:**
- Plugin should ship with CORE context files that are ALWAYS loaded
- Core values (skepticism, quality, git workflow) should come FROM THE PLUGIN
- Projects should only need to add PROJECT-SPECIFIC context on top

**Solution:**
```
plugin structure:
  context/               ← PLUGIN'S core context (always loaded)
    behavior.yml         ← skepticism, quality, non-sycophantic
    git.yml              ← git workflow rules
    sessions.yml         ← session management workflow

project structure:
  .claude/
    context/             ← PROJECT-SPECIFIC context (loaded after plugin context)
      project.yml        ← project overview
      test.yml           ← testing strategy
      deploy.yml         ← deployment process
```

**Required Changes:**
1. Move core context files INTO the plugin directory
2. Update context-loader skill to:
   - First load plugin's core context
   - Then load project's custom context
3. `/domestique-init` should NOT create behavior.yml, git.yml, sessions.yml (those come from plugin)
4. `/domestique-init` should only create project-specific context files

---

### ❌ Purpose 2: Do the Shit-Work (NOT WORKING)

**What We Built:**
- `/create-session` command (manual invocation)
- Session files with manual updates
- No automation

**The Problem:**
- ❌ No GitHub Issues integration
- ❌ No Azure DevOps integration
- ❌ No automatic work-item sync
- ❌ No automatic session creation from issues
- ❌ No status sync (in-progress, completed, etc.)
- ❌ User has to manually create sessions, update them, sync status

**What's Missing:**
Everything. This is the biggest gap.

**What We Need:**

#### GitHub Integration
- **Skill**: Auto-detect GitHub issue from branch name
- **Skill**: Fetch issue details via GitHub API (title, description, labels, assignee)
- **Skill**: Populate session file with issue details
- **Skill**: Sync session status to issue status
- **Hook**: Update issue when PR is created
- **Hook**: Close issue when PR is merged

#### Azure DevOps Integration
- **Skill**: Auto-detect work item from branch name
- **Skill**: Fetch work item details via Azure DevOps API
- **Skill**: Populate session file with work item details
- **Skill**: Sync session status to work item status
- **Hook**: Update work item when PR is created

#### Session Automation
- **Skill**: Auto-create session from issue/work-item
- **Skill**: Auto-populate session with issue details (no manual copying)
- **Skill**: Auto-extract session updates from commits
- **Hook**: Block commits if session not updated
- **Agent**: Session-sync agent that handles bidirectional sync

**Required Changes:**
1. Create GitHub integration skills/agents (Phase 3.x)
2. Create Azure DevOps integration skills/agents (Phase 3.x)
3. Create session automation skills (auto-create, auto-update)
4. Create hooks that ENFORCE session updates
5. Add API authentication configuration to config schema

---

### ⚠️ Purpose 3: Prevent Context Drift (PARTIALLY WORKING)

**What We Built:**
- Context loaded at session start (one-time)
- Session files track decisions and learnings

**The Problem:**
- ⚠️ Context loaded ONCE at session start
- ❌ No periodic refresh during long sessions
- ❌ No detection of drift from session plan
- ❌ No active prompts to update session
- ❌ No enforcement of session alignment

**What's Missing:**

#### Active Context Management
- **Skill**: Periodic context refresh (every N interactions or on request)
- **Skill**: Detect when work diverges from session plan
- **Skill**: Prompt for session update after major milestones
- **Hook**: Block commits unless session updated
- **Hook**: Verify commit aligns with session objective

#### Drift Detection
- **Skill**: Compare current work with session objective
- **Skill**: Alert when implementing features not in session plan
- **Skill**: Suggest session update when new decisions are made

**Required Changes:**
1. Add periodic refresh triggers to context-loader skill
2. Create drift-detection skill (Phase 3.x)
3. Create session-update-enforcer hook (Phase 4.x)
4. Add commit-alignment verification hook (Phase 4.x)

---

## Priority Reassessment

### What We've Been Building (Phases 1-2)
- Infrastructure (plugin manifest, scripts, config system)
- Foundation for workflow management
- Tech stack abstraction

**Assessment:** ✅ Good foundation, but not directly addressing core purposes yet.

### What We Need to Build Next

#### PRIORITY 1: Inject Core Values (Purpose 1)
**Impact:** HIGH - This is fundamental to the plugin's value proposition
**Effort:** LOW - Just move files and update context-loader

**Tasks:**
1. Move core context files into plugin `context/` directory
2. Update context-loader to load plugin context first
3. Update `/domestique-init` to NOT create core context files
4. Test that core values are injected into every project

**Timeline:** Can complete in 1-2 sessions

---

#### PRIORITY 2: Enforce Session Updates (Purpose 3)
**Impact:** HIGH - Prevents drift and ensures sessions stay current
**Effort:** MEDIUM - Need hooks and skills

**Tasks:**
1. Create pre-commit hook that blocks unless session updated
2. Create skill that prompts for session updates after milestones
3. Create skill that detects divergence from session plan
4. Test enforcement in real workflows

**Timeline:** 2-3 sessions

---

#### PRIORITY 3: Work-Item Automation (Purpose 2)
**Impact:** VERY HIGH - This is the "shit-work" automation promise
**Effort:** HIGH - Requires API integration, auth, error handling

**Tasks:**
1. Add API config to schema (GitHub token, Azure DevOps token)
2. Create GitHub integration skills:
   - Fetch issue details
   - Auto-populate session
   - Sync status
3. Create Azure DevOps integration skills:
   - Fetch work item details
   - Auto-populate session
   - Sync status
4. Create session-auto-create skill
5. Test with real issues/work-items

**Timeline:** 5-7 sessions (this is big)

---

## Revised Roadmap

### Phase 3A: Core Values Injection (IMMEDIATE)
- Move core context into plugin
- Update context-loader
- Test in all 3 projects

### Phase 3B: Session Enforcement (NEXT)
- Pre-commit hook (block if session not updated)
- Session update prompts
- Drift detection

### Phase 3C: Work-Item Automation (AFTER 3A & 3B)
- GitHub integration
- Azure DevOps integration
- Auto-create sessions
- Bidirectional sync

### Phase 4: Hooks & Enforcement (ONGOING)
- Integrate with Phase 3B
- Additional quality gates

### Phase 5: Migration Tools (DEFERRED)
- Can wait until core purposes are working

---

## Immediate Next Steps

1. **Abandon current chore** (updating implementation plan with past work)
2. **Start Phase 3A** (Core Values Injection)
   - Create `context/` directory in plugin
   - Move behavior.yml, git.yml, sessions.yml from bootstrap
   - Update context-loader skill
   - Test in simple-D365
3. **Then Phase 3B** (Session Enforcement)
4. **Then Phase 3C** (Work-Item Automation)

---

## Questions for Decision

1. **GitHub vs Azure DevOps**: Build GitHub first, then Azure DevOps? Or in parallel?
2. **API Auth**: How should users configure API tokens? (config file, env vars, both?)
3. **Session Auto-Update**: Should commits automatically update session logs, or just prompt?
4. **Enforcement Strictness**: Should hooks BLOCK or just WARN when session not updated?

---

## Success Metrics (Aligned with Core Purposes)

### Purpose 1: Core Values Injection
- ✅ Every project automatically gets skepticism/quality behavior
- ✅ No manual setup required for core values
- ✅ Projects can still customize with their own context

### Purpose 2: Shit-Work Automation
- ✅ Sessions auto-created from GitHub issues/Azure DevOps work items
- ✅ Issue details auto-populated (no manual copying)
- ✅ Status synced bidirectionally
- ✅ User spends zero time on "work-item management"

### Purpose 3: Context Drift Prevention
- ✅ Context refreshed automatically during long sessions
- ✅ Drift detected and surfaced to user
- ✅ Sessions enforced via hooks (can't commit without updating)
- ✅ AI stays aligned with session objective

### Purpose 4: Knowledge Sharing
- ✅ Already working - sessions in Git, human-readable

---

## Bottom Line

**We have a good foundation (Phases 1-2), but we've been building infrastructure instead of core value.**

**The next 3 priorities are:**
1. Inject core values (Phase 3A) - 1-2 sessions
2. Enforce session updates (Phase 3B) - 2-3 sessions
3. Automate work-items (Phase 3C) - 5-7 sessions

**This will deliver on all 4 core purposes.**
