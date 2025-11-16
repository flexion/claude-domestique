# CLAUDE.md - Bootstrap (Compact)

Claude Domestique - Your strategic coding partner. Like a cycling domestique, it carries the water (workflow management), stays focused on your goals, and handles the work you don't want to do.

## ⚠️ MANDATORY - Load Immediately (Every Session)

**YOU MUST read these files in parallel on EVERY session start using a single message with multiple Read tool calls:**

```
.claude/context/README.yml       - How to read compact YAML
.claude/context/sessions.yml     - Session workflow & branch tracking
.claude/context/git.yml          - Git workflow rules
.claude/context/behavior.yml     - AI behavior/preferences
.claude/context/test.yml         - Testing strategy (integration testing)
.claude/context/project.yml      - Plugin project overview
```

## Bootstrap Development (Phase 0)

**Status:** Using bootstrap .claude/ directory (copied from simple-D365, customized for plugin dev)
**Artifacts:** Markdown (commands, agents, skills), Bash (scripts, hooks), JSON (manifest, schemas)
**Testing:** Integration testing (install in test projects), not unit testing
**Transition:** After Phase 5 (migration tools), install plugin in self, migrate bootstrap

## ⚠️ MANDATORY Action Checklists (BLOCKING)

### Before ANY Implementation/Proposal Response:
1. **REREAD** `.claude/context/behavior.yml` in thinking block
2. **Assess**: correctness, architecture, alternatives, risks
3. **Stance**: Skeptical default - find problems, not agreement
4. **No**: Eager agreement, sycophantic tone, yes without analysis

### When Beginning Chore:
1. **REREAD** `.claude/context/sessions.yml`
2. **CREATE SESSION** - Use `.claude/tools/create-branch-metadata.sh`
3. **POPULATE SESSION** - Document goal, approach, context
4. **Commit session file** before starting implementation

### After Completing Major Milestone:
1. **UPDATE SESSION** - Document what completed, decisions made, context learned
2. **Examples**: Component done (before testing), blocker resolved, architectural decision, before pausing work

### Before Answering "What's Next?" or Status Queries:
1. **REREAD** `.claude/context/sessions.yml`
2. **Run in order** (NEVER guess):
   - `git branch --show-current` (authoritative)
   - `.claude/tools/get-current-session.sh` (verify mapping)
   - Read `.claude/sessions/<session-file>.md` (Next Steps section)

### When User Requests Git Commit (BLOCKING):
1. **RUN VERIFICATION** (if applicable):
   - Shell scripts changed: `shellcheck scripts/*.sh`
   - (No automated tests initially - plugin is definitions, not executable code)
2. **UPDATE SESSION** - Ensure session updated (session+code committed atomically)
3. **REREAD** `.claude/context/git.yml`
4. **Verify format**: `"chore - verb desc"` with HEREDOC, ZERO attribution

**HEREDOC Example:**
```bash
git commit -m "$(cat <<'EOF'
chore - implement /next command
- Create commands/next.md with command definition
- Document usage and implementation approach
EOF
)"
```

### When User Requests Pull Request (BLOCKING):
1. **RUN VERIFICATION** (if applicable):
   - Shell scripts: `shellcheck scripts/*.sh`
2. **REREAD** `.claude/context/git.yml`
3. **Verify PR body has ZERO:**
   - Attribution ("Claude Code", "Generated", "Co-Authored")
   - Emojis
   - AI mentions

### After Implementing Plugin Component (BLOCKING):
1. **INTEGRATION TEST** - Install plugin in test project
2. **Validate** - Test command/skill/agent/hook works
3. **Test in multiple projects** - Verify works with different tech stacks
4. **Document** - Update relevant docs

## Session Detection (Auto)

1. `git branch --show-current`
2. Sanitize: `chore/implement-phase-1` → `chore-implement-phase-1`
3. Read `.claude/branches/<sanitized>` to get session file
4. Load session from `.claude/sessions/<session-file>`

**Tools:**
- `.claude/tools/get-current-session.sh` - Check current session
- `.claude/tools/create-branch-metadata.sh` - Create branch metadata

## Project Structure

```
claude-domestique/
├── .claude/                      (bootstrap workflow - this directory)
├── .claude-plugin/               (plugin manifest)
├── commands/                     (slash commands - markdown)
├── agents/                       (specialized agents - markdown)
├── skills/                       (auto-invoke capabilities - markdown)
├── hooks/                        (workflow enforcement - bash)
├── scripts/                      (utilities - bash)
├── templates/                    (context + work-item templates)
├── docs/                         (user documentation)
├── DESIGN.md                     (architecture)
├── IMPLEMENTATION-PLAN.md        (phase-by-phase tasks)
└── README.md                     (user-facing docs)
```

## Quick Commands

**Resume work:** "What's next?" (auto-detects from branch)
**New chore:** "Create session for [description]"
**Session ops:** "Update session"

## Key Documents to Reference

**Design & Planning:**
- `DESIGN.md` - Complete architecture design
- `IMPLEMENTATION-PLAN.md` - Phase-by-phase implementation tasks
- `QUICKSTART.md` - Developer onboarding
- `PROJECT-STATUS.md` - Current status and roadmap

**Testing:**
- Install plugin: `/plugin install claude-domestique@local`
- Test in: simple-D365, Portal-D365-WebApp, portal-D365
- Validate: Commands work, skills auto-invoke, hooks block

## Key Rules (Quick Ref - Full Details in .yml Files)

**Git:** `chore - desc`, HEREDOC commits, no attribution
**Behavior:** Skeptical assessment, integration testing, validate in test projects
**Testing:** Integration > validation > docs, test in all 3 projects
**Artifacts:** Markdown (commands, agents, skills), Bash (scripts, hooks), JSON (manifest)
**Workflow:** Bootstrap → develop → transition (Phase 5+) → dogfood

---

**Critical:** Load all 6 `.claude/context/*.yml` files IMMEDIATELY using parallel Read calls.
