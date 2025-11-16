# Installation Guide - claude-domestique

Complete guide for installing and initializing the claude-domestique plugin.

---

## Prerequisites

- Claude Code CLI installed
- Git repository (for session/branch tracking)
- Bash shell (for scripts and hooks)

---

## Installation

### Option 1: Install from Local Development (Current)

For local development or testing:

```bash
# 1. Clone the repository
git clone https://github.com/flexion/claude-domestique.git
cd claude-domestique

# 2. Install from local path in your project
cd /path/to/your/project
claude plugin install /path/to/claude-domestique
```

**Example:**
```bash
cd ~/github/flexion/simple-D365
claude plugin install ~/github/flexion/claude-domestique
```

### Option 2: Install from GitHub (Future)

Once published:

```bash
cd /path/to/your/project
claude plugin install claude-domestique
```

---

## Initialization

After installation, initialize the plugin in your project:

### Step 1: Run Plugin Init

```bash
claude /domestique-init
```

This command will:
1. Detect your tech stack (TypeScript, React, Java, Python, etc.)
2. Detect your work-item system (GitHub, Jira, Azure DevOps)
3. Generate `.claude/config.json` with sensible defaults
4. Create `.claude/context/` directory with context files
5. Create `.claude/sessions/` and `.claude/branches/` directories
6. Install git hooks (pre-commit, check-session-updated, post-session-commit)

### Step 2: Review Generated Config

Edit `.claude/config.json` to customize:

```json
{
  "techStack": {
    "type": "typescript-node",
    "testCommand": "npm test",
    "lintCommand": "npm run lint",
    "buildCommand": "npm run build",
    "verifyCommands": ["test", "lint"]
  },
  "workItems": {
    "platform": "github",
    "branchPattern": "issue/feature-{id}/{desc}",
    "sync": {
      "enabled": true,
      "autoSyncOnCommit": true
    }
  },
  "git": {
    "commitFormat": "chore - {desc}",
    "useHeredoc": true,
    "noAttribution": true
  }
}
```

### Step 3: Verify Installation

Test key commands:

```bash
# Check current session
claude /next

# Create a test session
git checkout -b chore/test-setup
claude /create-session

# Run verification
claude /check commit
```

---

## Migration from Bootstrap Setup

If you're migrating from an existing bootstrap `.claude/` directory:

### Option 1: Automated Migration (Recommended)

```bash
# Run migration script
./scripts/migrate-bootstrap.sh
```

This will:
1. Detect bootstrap setup in `.claude/`
2. Backup bootstrap directory to `.claude-bootstrap-backup/`
3. Generate `.claude/config.json` from bootstrap context
4. Install plugin
5. Migrate session files and branch metadata
6. Validate all components work
7. Show migration report

### Option 2: Manual Migration

```bash
# 1. Backup bootstrap setup
cp -r .claude .claude-bootstrap-backup

# 2. Install plugin
claude plugin install claude-domestique

# 3. Run plugin init
claude /domestique-init

# 4. Copy session files
cp -r .claude-bootstrap-backup/sessions/* .claude/sessions/

# 5. Copy branch metadata
cp -r .claude-bootstrap-backup/branches/* .claude/branches/

# 6. Merge context files (manual review needed)
# Compare .claude-bootstrap-backup/context/ with .claude/context/
# Keep project-specific customizations

# 7. Test
claude /next
```

### Migration Validation Checklist

After migration, verify:

- [ ] `/next` shows correct current session
- [ ] `/create-session` creates session with correct format
- [ ] `/check commit` shows correct test/build commands
- [ ] Skills auto-invoke (context-loader, issue-detector, etc.)
- [ ] Hooks execute (pre-commit blocks when tests fail)
- [ ] Work-item automation works (`/fetch-issue`, `/sync-work-item`)
- [ ] Git workflow enforced (commit format, HEREDOC, no attribution)

### Rollback

If migration fails, rollback:

```bash
# 1. Uninstall plugin
claude plugin uninstall claude-domestique

# 2. Restore bootstrap
rm -rf .claude
mv .claude-bootstrap-backup .claude

# 3. Verify bootstrap still works
.claude/tools/get-current-session.sh
```

---

## Verification

### Test All Commands

```bash
# Session management
claude /next                           # Show next steps
claude /create-session                 # Create session
claude /check                          # Show checklist

# Work-item automation
claude /fetch-issue                    # Fetch work item
claude /sync-work-item                 # Sync session ↔ work item

# Plugin management
claude /domestique-init                # Re-initialize config
```

### Test Skills (Auto-Invoke)

Skills should trigger automatically:

- **context-loader**: Loads `.claude/context/*.yml` on session start
- **issue-detector**: Detects work item from branch name
- **drift-detector**: Checks for uncommitted session changes
- **session-update-prompter**: Prompts to update session after work

### Test Hooks

```bash
# Test pre-commit hook
echo "test" > test.txt
git add test.txt
git commit -m "test"  # Should run tests and verify session updated

# Test check-session-updated hook
# Should block commits if session not updated

# Test post-session-commit hook
# Should sync session updates to work item (if enabled)
```

---

## Configuration Reference

### Tech Stack Types

Supported tech stacks with presets:

- `typescript-node` - Node.js with TypeScript
- `react-typescript` - React with TypeScript
- `java-spring` - Java Spring Boot
- `python-django` - Python Django
- `custom` - Custom configuration

### Work Item Platforms

Supported platforms:

- `github` - GitHub Issues
- `jira` - Jira (REST API + optional imdone)
- `azure-devops` - Azure DevOps Work Items

### Branch Patterns

Common patterns:

- `issue/feature-{id}/{desc}` - GitHub standard
- `feature/{id}/{desc}` - Alternative
- `{id}-{desc}` - Simple format
- `feature/{PROJECT}-{id}/{desc}` - Jira with project key

### Commit Formats

- `chore - {desc}` - Internal work (default)
- `#{id} - {desc}` - GitHub issue commits
- `{PROJECT}-{id} - {desc}` - Jira ticket commits

---

## Troubleshooting

### Plugin Not Found

```bash
# Verify plugin installed
claude plugin list

# Reinstall
claude plugin uninstall claude-domestique
claude plugin install /path/to/claude-domestique
```

### Commands Not Working

```bash
# Check command paths
ls -la $(claude plugin show claude-domestique)/commands/

# Verify commands/ directory exists and has .md files
```

### Skills Not Auto-Invoking

```bash
# Check skills paths
ls -la $(claude plugin show claude-domestique)/skills/

# Verify each skill has SKILL.md file
```

### Hooks Not Executing

```bash
# Check hooks installed
ls -la .git/hooks/

# Verify hooks are executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/check-session-updated

# Check hook paths point to plugin
cat .git/hooks/pre-commit
```

### Config Not Loading

```bash
# Verify config exists
cat .claude/config.json

# Validate JSON syntax
jq . .claude/config.json

# Re-initialize if corrupted
claude /domestique-init
```

---

## Next Steps

After installation:

1. **Create first session**: `git checkout -b chore/test-feature && claude /create-session`
2. **Read workflow guide**: See `docs/workflow.md`
3. **Configure tech stack**: Edit `.claude/config.json` for your stack
4. **Set up work-item sync**: Configure work-item platform settings
5. **Test with real work**: Create feature branch from GitHub issue

---

## Support

- **Documentation**: `docs/` directory
- **Issues**: https://github.com/flexion/claude-domestique/issues
- **Examples**: See test projects (simple-D365, Portal projects)

---

## Uninstallation

To remove the plugin:

```bash
# 1. Uninstall plugin
claude plugin uninstall claude-domestique

# 2. Optional: Remove generated files
rm -rf .claude/
rm -f .git/hooks/pre-commit
rm -f .git/hooks/check-session-updated
rm -f .git/hooks/post-session-commit
```

---

**Status**: Ready for use
**Version**: 0.1.0
**Last Updated**: 2024-11-16
