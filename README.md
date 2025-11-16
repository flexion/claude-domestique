# Claude Domestique

Your strategic coding partner. Like a cycling domestique: carries the water (workflow management), stays focused on your goals, and handles the unglamorous work you don't want to do.

**What it does:**
- **Persistent memory** - Never forgets your session across context resets
- **Skeptical assessment** - Challenges assumptions, finds problems, acts as peer not subordinate
- **Workflow discipline** - Enforces git hygiene, testing rigor, documentation standards
- **Tech-stack agnostic** - Works across TypeScript, Java, Python, and more

## What It Does

Provides consistent workflow patterns across projects regardless of language, build tools, or work tracking system:

- **Session Management:** Track work state across context resets (branch → metadata → session file)
- **Git Workflow:** Enforce commit/PR formats, run tests before commits, block attribution
- **Context Loading:** Auto-load project context files on session start
- **Work Item Integration:** Create and track work items (GitHub, Azure DevOps, Jira)
- **Tech Stack Aware:** Adapts test/build/lint commands per project

## Why Use This Plugin

### Problem
You have multiple projects with:
- Different languages (TypeScript, Java, Python)
- Different build tools (npm, gradle, poetry)
- Different work item systems (GitHub Issues, Azure DevOps, Jira)
- Same workflow patterns (sessions, git discipline, testing strategy)

### Solution
One plugin, many projects. Same commands, different execution based on project config.

### Example
```bash
# All three commands work identically across projects:
/next                    # Show next steps (works in TypeScript, Java, Python)
/create-session 123      # Create session (GitHub or Azure DevOps)
/check commit            # Show checklist (npm test or ./gradlew test)

# Plugin adapts based on .claude/config.json
```

## Installation

### Quick Start
```bash
# In your project
/plugin install claude-domestique@github:flexion/claude-domestique

# Plugin detects your tech stack and generates config
Which tech stack? [typescript-node, react-typescript, java-spring, python-django]
> react-typescript

# Config created at .claude/config.json
```

### Manual Setup
```bash
# Clone plugin
git clone https://github.com/flexion/claude-domestique

# Create local marketplace
mkdir -p ~/.claude/marketplaces/local
ln -s $(pwd) ~/.claude/marketplaces/local/claude-domestique

# Install from local
cd /path/to/your/project
/plugin install claude-domestique@local
```

## Configuration

Plugin uses `.claude/config.json` in your project:

```json
{
  "techStack": {
    "type": "react-typescript",
    "testCommand": "npm test -- --watchAll=false",
    "lintCommand": "npm run lint",
    "buildCommand": "npm run build",
    "verifyCommands": ["test", "lint", "build"]
  },
  "workItems": {
    "system": "azure-devops",
    "branchPattern": "{id}-{desc}",
    "commitPattern": "{id} - {desc}"
  },
  "deployment": {
    "strategy": "frontend-last"
  }
}
```

### Tech Stack Presets

Built-in presets for common stacks:

- `typescript-node` - Node.js with TypeScript
- `react-typescript` - React with TypeScript
- `java-spring` - Spring Boot with Gradle
- `python-django` - Django
- `custom` - Define your own commands

## Commands

### `/next`
Show next steps from current session.

**Usage:**
```bash
/next
```

**What it does:**
1. Detects current branch
2. Loads session file
3. Shows "Next Steps" section

---

### `/create-session [id]`
Create branch metadata and session file.

**Usage:**
```bash
/create-session 118344
/create-session        # Prompts for ID
```

**What it does:**
1. Creates branch following pattern (e.g., `118344-description`)
2. Creates branch metadata (`.claude/branches/118344-description`)
3. Creates session file (`.claude/sessions/118344-description.md`)

---

### `/update-session [description]`
Append to current session log.

**Usage:**
```bash
/update-session "Completed authentication logic"
```

---

### `/new-work [description]`
Create work item in tracking system.

**Usage:**
```bash
/new-work "Add user authentication"
```

**What it does:**
- GitHub: `gh issue create`
- Azure DevOps: REST API call with markdown support
- Creates from template

---

### `/check [action]`
Show checklist for action.

**Usage:**
```bash
/check commit          # Show commit checklist
/check pr              # Show PR checklist
```

**Example output:**
```
✓ Checklist for Git Commit:
  1. Run tests: npm test -- --watchAll=false
  2. Run lint: npm run lint
  3. Run build: npm run build
  4. Update session file
  5. Verify format: "118344 - verb desc" with HEREDOC
  6. No attribution/emojis
```

---

### `/refresh`
Re-read behavior.yml and verify critical assessment mode.

## Skills (Auto-Invoked)

### context-loader
**Triggers:** Session start, explicit refresh

**Actions:**
- Reads all files in `.claude/config.json` → `contextFiles`
- Loads in parallel for fast startup

---

### session-detector
**Triggers:** "What's next?", session start

**Actions:**
- Detects current branch
- Loads correct session file
- Parses based on branch pattern

---

### test-runner
**Triggers:** Before commit, before PR

**Actions:**
- Runs commands from `techStack.verifyCommands`
- Blocks operation if any fail

---

### checklist-matcher
**Triggers:** User message contains trigger words

**Actions:**
- Scans for: "commit", "PR", "what's next"
- Surfaces relevant checklist
- Blocks execution until confirmed

## Hooks

### pre-commit
Blocks git commits if:
- Tests fail
- Session file not updated
- Commit format invalid

### pre-pr
Blocks pull requests if:
- Tests fail
- PR title/body format invalid
- Attribution present

### prompt-submit
Pattern matches user messages to trigger checklists.

## Migration from Existing Setup

If you have existing `.claude/` directory:

```bash
# 1. Backup
cp -r .claude .claude.backup

# 2. Install plugin
/plugin install claude-domestique

# 3. Plugin detects existing setup and generates config
Existing .claude directory detected. Import config? (y/n)
> y

Generated config:
- Detected: react-typescript (from package.json)
- Detected: azure-devops (from templates)
- Detected: branch pattern {id}-{desc}

# 4. Existing context files preserved (not overwritten)
# 5. Validate
/next  # Should work with existing session
```

## Tech Stack Support

### Currently Supported
- TypeScript/Node.js
- React/TypeScript
- Java/Spring Boot
- Python/Django

### Adding Custom Stack
```json
{
  "techStack": {
    "type": "custom",
    "testCommand": "go test ./...",
    "buildCommand": "go build",
    "verifyCommands": ["test", "build"]
  }
}
```

## Work Item System Support

### Currently Supported
- GitHub Issues
- Azure DevOps Work Items

### Adding Custom System
Define `workItems.apiEndpoint` and create templates in `.claude/templates/`.

## Examples

### Example 1: TypeScript Node Project
**simple-D365** - D365 API client

```json
{
  "techStack": {"type": "typescript-node"},
  "workItems": {
    "system": "github",
    "branchPattern": "issue/feature-{id}/{desc}"
  }
}
```

---

### Example 2: React Frontend
**Portal-D365-WebApp** - React customer portal

```json
{
  "techStack": {"type": "react-typescript"},
  "workItems": {
    "system": "azure-devops",
    "branchPattern": "{id}-{desc}"
  },
  "deployment": {"strategy": "frontend-last"}
}
```

---

### Example 3: Java Backend
**portal-D365** - Spring Boot REST API

```json
{
  "techStack": {"type": "java-spring"},
  "workItems": {"system": "azure-devops"},
  "deployment": {"strategy": "expand-contract"}
}
```

## Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [Command Reference](docs/commands.md)
- [Migration Guide](docs/migration.md)
- [Design Document](DESIGN.md)

## Development

### Local Testing
```bash
# Clone plugin
git clone https://github.com/flexion/claude-domestique
cd claude-domestique

# Link to local marketplace
mkdir -p ~/.claude/marketplaces/local
ln -s $(pwd) ~/.claude/marketplaces/local/claude-domestique

# Test in project
cd /path/to/test/project
/plugin install claude-domestique@local
```

### Testing Checklist
- [ ] Commands work in TypeScript project
- [ ] Commands work in Java project
- [ ] Commands work in Python project
- [ ] GitHub integration works
- [ ] Azure DevOps integration works
- [ ] Hooks block invalid operations
- [ ] Context files load correctly

## Versioning

**Current Version:** 0.1.0 (Development)

**Roadmap:**
- v1.0 - Core plugin with TypeScript/Java/Python support
- v1.1 - Enhanced work item integration
- v1.2 - Multi-repo support
- v2.0 - AI-powered session management

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Test against multiple tech stacks
4. Submit PR with examples

## License

MIT

## Support

- **Issues:** https://github.com/flexion/claude-domestique/issues
- **Discussions:** https://github.com/flexion/claude-domestique/discussions

## Credits

Developed by analyzing workflow patterns across:
- simple-D365 (TypeScript/Node)
- Portal-D365-WebApp (React/TypeScript)
- portal-D365 (Java/Spring Boot)

---

**Domestique:** *noun* (cycling) - A road racing cyclist who works for the benefit of their team and leader, sacrificing individual glory. They carry water, shield from wind, and scout ahead - the unsung heroes who make success possible.

**Claude Domestique:** Your AI coding partner that does the same - no ego, no sycophantic praise, just strategic support focused on your success.
