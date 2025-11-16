# Quick Start - Session Workflow Plugin Development

## Setup (5 minutes)

### 1. Navigate to Plugin Directory
```bash
cd /Users/dpuglielli/github/flexion/session-workflow-plugin
```

### 2. Create Local Marketplace Link
```bash
mkdir -p ~/.claude/marketplaces/local
ln -s $(pwd) ~/.claude/marketplaces/local/session-workflow
```

### 3. Verify Structure
```bash
tree -L 2
```

You should see:
```
.
├── DESIGN.md                    # Full design document
├── IMPLEMENTATION-PLAN.md       # Step-by-step implementation guide
├── README.md                    # User-facing documentation
├── .claude-plugin/
│   └── plugin.json             # Plugin manifest ✓
├── commands/                    # Slash commands (empty - ready for implementation)
├── agents/                      # Agents (empty)
├── skills/                      # Skills (empty)
├── hooks/                       # Hooks (empty)
├── scripts/                     # Utility scripts (empty)
└── templates/                   # Templates (empty)
```

---

## Next Steps

### Start Implementation: Phase 1, Task 1.2

**Goal:** Copy and adapt universal scripts from existing projects

```bash
# 1. Copy get-current-session.sh
cp /Users/dpuglielli/github/flexion/simple-D365/.claude/tools/get-current-session.sh \
   scripts/get-current-session.sh

# 2. Copy create-branch-metadata.sh
cp /Users/dpuglielli/github/flexion/simple-D365/.claude/tools/create-branch-metadata.sh \
   scripts/create-branch-metadata.sh

# 3. Make executable
chmod +x scripts/*.sh

# 4. Test scripts
./scripts/get-current-session.sh
```

---

## Test Your Changes

### 1. Install Plugin Locally in Test Project
```bash
cd /Users/dpuglielli/github/flexion/simple-D365
/plugin install session-workflow@local
```

### 2. Create Test Config
```bash
cat > .claude/config.json << 'EOF'
{
  "techStack": {
    "type": "typescript-node",
    "testCommand": "npm test",
    "buildCommand": "npm run build",
    "verifyCommands": ["test"]
  },
  "workItems": {
    "system": "github",
    "branchPattern": "issue/feature-{id}/{desc}",
    "commitPattern": "#{id} - {desc}"
  }
}
EOF
```

### 3. Test Commands
```bash
# Once you implement /next command:
/next

# Expected: Shows current session next steps
```

---

## Documentation to Read

### Start Here
1. **DESIGN.md** - Complete architecture and design decisions
2. **IMPLEMENTATION-PLAN.md** - Phase-by-phase implementation tasks

### Reference
- [Plugin manifest](.claude-plugin/plugin.json) - Already created ✓
- [Claude Code Plugin Docs](https://code.claude.com/docs/en/plugins.md)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference.md)

---

## Implementation Checklist (Phase 1)

Current phase: **Phase 1 - Core Plugin Structure**

- [x] 1.1 Plugin Manifest
- [ ] 1.2 Universal Scripts
  - [ ] Copy get-current-session.sh
  - [ ] Copy create-branch-metadata.sh
  - [ ] Make config-aware
  - [ ] Test in isolation
- [ ] 1.3 Config Schema
  - [ ] Create schemas/config.schema.json
  - [ ] Document all fields
- [ ] 1.4 Basic Commands
  - [ ] commands/next.md
  - [ ] commands/create-session.md
  - [ ] commands/check.md
- [ ] 1.5 Test with simple-D365

---

## Key Files to Create First

### 1. scripts/get-current-session.sh ← START HERE
**Why first:** All commands depend on this
**Action:** Copy from simple-D365, adapt for config awareness

### 2. commands/next.md
**Why second:** Simplest command to test plugin installation
**Action:** Create markdown file that invokes get-current-session.sh

### 3. .claude/config.json (in test project)
**Why third:** Needed to test config-aware features
**Action:** Create in simple-D365 for testing

---

## Quick Reference

### Test Projects for Reference
- `/Users/dpuglielli/github/flexion/simple-D365` - TypeScript/Node, GitHub
- `/Users/dpuglielli/github/nucor/Portal-D365-WebApp` - React/TypeScript, Azure DevOps
- `/Users/dpuglielli/github/nucor/portal-D365` - Java/Spring Boot, Azure DevOps

### Plugin Development Commands
```bash
# After making changes to plugin:
cd /Users/dpuglielli/github/flexion/simple-D365
/plugin reload session-workflow

# Or reinstall:
/plugin uninstall session-workflow
/plugin install session-workflow@local
```

---

## Getting Help

### Design Questions
- Read DESIGN.md sections:
  - "Architecture" - Overall structure
  - "Commands" - Command implementation details
  - "Skills" - Auto-invoked capabilities
  - "Project Configuration Schema" - Config format

### Implementation Questions
- Read IMPLEMENTATION-PLAN.md:
  - "Phase 1" - Current phase tasks
  - "Success Criteria" - What "done" looks like
  - "Quick Start Guide" - Step-by-step

### Plugin System Questions
- [Claude Code Plugins](https://code.claude.com/docs/en/plugins.md)
- [Skills Documentation](https://code.claude.com/docs/en/skills.md)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference.md)

---

## Ready to Start!

**Current Status:**
- ✓ Directory structure created
- ✓ Plugin manifest created
- ✓ Documentation complete
- ✓ Local marketplace linked

**Next Action:**
```bash
# Copy first script
cp /Users/dpuglielli/github/flexion/simple-D365/.claude/tools/get-current-session.sh \
   scripts/get-current-session.sh
```

**Then:** Open IMPLEMENTATION-PLAN.md and follow Phase 1, Task 1.2

Happy coding! 🚀
