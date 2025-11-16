# Session Workflow Plugin - Design Document

## Overview

Universal Claude Code plugin providing session-based workflow management across multiple tech stacks, languages, and work item systems.

**Core principle:** Universal workflow patterns + project-specific configuration

---

## Architecture

### Universal Components (Language Agnostic)
- Session tracking (branch → metadata → session file)
- Git workflow enforcement (commit/PR format, HEREDOC, no attribution)
- Behavior patterns (critical assessment, incremental testing)
- Context loading system

### Configurable Components (Tech Stack Specific)
- Test/build/lint commands
- Work item system integration (GitHub, Azure DevOps)
- Deployment strategies
- Language-specific patterns

---

## Directory Structure

```
session-workflow-plugin/
├── .claude-plugin/
│   └── plugin.json                      # Plugin manifest
├── commands/
│   ├── next.md                          # /next - What's next?
│   ├── create-session.md                # /create-session - Create session
│   ├── update-session.md                # /update-session - Update session
│   ├── refresh.md                       # /refresh - Reload context
│   ├── new-work.md                      # /new-work - Create work item
│   └── check.md                         # /check - Show checklist
├── agents/
│   ├── session-manager.md               # Session CRUD operations
│   └── git-workflow.md                  # Commit/PR enforcement
├── skills/
│   ├── context-loader/
│   │   └── SKILL.md                     # Auto-load .claude/context/*.yml
│   ├── session-detector/
│   │   └── SKILL.md                     # Auto-detect session from branch
│   ├── test-runner/
│   │   └── SKILL.md                     # Run tests based on tech stack
│   └── checklist-matcher/
│       └── SKILL.md                     # Pattern match → surface checklist
├── hooks/
│   ├── pre-commit.sh                    # Test + session verification
│   ├── pre-pr.sh                        # Test + format validation
│   └── prompt-submit.sh                 # Pattern matching for checklists
├── scripts/
│   ├── get-current-session.sh           # Universal session detector
│   ├── create-branch-metadata.sh        # Universal session creator
│   └── run-tests.sh                     # Tech-stack aware test runner
├── templates/
│   ├── context/                         # Context file templates
│   │   ├── README.yml.template
│   │   ├── sessions.yml.template
│   │   ├── git.yml.template
│   │   ├── behavior.yml.template
│   │   ├── test.yml.template
│   │   └── project.yml.template
│   └── work-items/                      # Work item templates
│       ├── github-issue.md
│       └── azure-devops-bug.md
├── docs/
│   ├── installation.md                  # Installation guide
│   ├── configuration.md                 # Config schema reference
│   ├── commands.md                      # Command reference
│   └── migration.md                     # Migration from existing setup
├── README.md                            # Plugin overview
└── CHANGELOG.md                         # Version history
```

---

## Project Configuration Schema

Projects using this plugin define `.claude/config.json`:

```json
{
  "techStack": {
    "type": "typescript-node" | "react-typescript" | "java-spring" | "python-django" | "custom",
    "testCommand": "npm test",
    "lintCommand": "npm run lint",
    "buildCommand": "npm run build",
    "verifyCommands": ["test", "lint", "build"]
  },
  "workItems": {
    "system": "github" | "azure-devops" | "jira" | "linear",
    "branchPattern": "issue/feature-{id}/{desc}" | "{id}-{desc}",
    "commitPattern": "#{id} - {desc}" | "{id} - {desc}",
    "apiEndpoint": "https://dev.azure.com/org/project/_apis/wit",
    "templates": {
      "bug": ".claude/templates/azure-devops-bug.md",
      "feature": ".claude/templates/azure-devops-feature.md"
    }
  },
  "deployment": {
    "strategy": "terraform" | "frontend-last" | "expand-contract" | "blue-green" | "custom",
    "platform": "azure-aci" | "azure-app-service" | "vercel" | "kubernetes"
  },
  "personal": {
    "enabled": true,
    "directory": ".claude/personal"
  },
  "contextFiles": [
    "README.yml",
    "sessions.yml",
    "git.yml",
    "behavior.yml",
    "test.yml",
    "deploy.yml",
    "project.yml"
  ],
  "mandatoryChecks": {
    "commitBlockers": ["tests", "session-update"],
    "prBlockers": ["tests", "format-check"]
  },
  "session": {
    "autoLoad": true,
    "updateTriggers": ["beginning", "milestone", "pause", "blocked", "pre-commit"]
  }
}
```

---

## Tech Stack Presets

### typescript-node
```json
{
  "testCommand": "npm test",
  "buildCommand": "npm run build",
  "verifyCommands": ["test"],
  "testPatterns": {
    "test": "new-logic, conditionals, errors",
    "skip": "getters, framework, unchanged-code"
  },
  "testPlacement": {
    "unit": "src/**/*.test.ts"
  }
}
```

### react-typescript
```json
{
  "testCommand": "npm test -- --watchAll=false",
  "lintCommand": "npm run lint",
  "buildCommand": "npm run build",
  "verifyCommands": ["test", "lint", "build"],
  "testPatterns": {
    "test": "pure-functions, business-logic, auth-logic",
    "skip": "react-components, redux-integration, styling"
  },
  "testPlacement": {
    "unit": "src/utils/*.test.ts, src/features/*/utils/*.test.ts"
  }
}
```

### java-spring
```json
{
  "testCommand": "./gradlew test",
  "buildCommand": "./gradlew build",
  "verifyCommands": ["test"],
  "testPatterns": {
    "test": "new-logic, conditionals, errors, security",
    "skip": "simple-getters, DTOs, config, framework"
  },
  "testPlacement": {
    "unit": "src/test/java",
    "integration": "src/integrationTest/java"
  }
}
```

### python-django
```json
{
  "testCommand": "python manage.py test",
  "lintCommand": "ruff check .",
  "buildCommand": "python manage.py check",
  "verifyCommands": ["test", "lint"]
}
```

---

## Commands

### `/next` - What's Next?
**Purpose:** Show next steps from current session

**Logic:**
1. Run `git branch --show-current`
2. Execute `scripts/get-current-session.sh`
3. Read `.claude/sessions/<session-file>.md`
4. Parse and display "Next Steps" section

**Tech stack:** Universal (no dependencies)

---

### `/create-session [id]` - Create Session
**Purpose:** Create branch metadata and session file

**Logic:**
1. Read `.claude/config.json` for branch pattern
2. Prompt for work item ID if not provided
3. Execute `scripts/create-branch-metadata.sh`
4. Create branch following pattern
5. Create session file from template

**Tech stack:** Config-aware (uses `workItems.branchPattern`)

---

### `/update-session [description]` - Update Session
**Purpose:** Append to current session log

**Logic:**
1. Detect current session
2. Append timestamp + description to session file
3. Update "What's Been Done" section

**Tech stack:** Universal

---

### `/new-work [description]` - Create Work Item
**Purpose:** Create work item in tracking system

**Logic:**
```javascript
config = readConfig()

if (config.workItems.system === "github") {
  gh issue create --title "$description" --body "$(cat template)"
} else if (config.workItems.system === "azure-devops") {
  curl -X POST config.workItems.apiEndpoint \
    -H "Content-Type: application/json-patch+json" \
    -d '[{"op":"add","path":"/fields/System.Title","value":"$description"}]'
}
```

**Tech stack:** Config-aware (uses `workItems.system`, `workItems.templates`)

---

### `/check [action]` - Show Checklist
**Purpose:** Display checklist for action (commit, PR, terraform, etc.)

**Logic:**
```javascript
action = args[0] // "commit", "pr", "terraform"
config = readConfig()

if (action === "commit") {
  checklist = [
    "Run tests: " + config.techStack.testCommand,
    "Run lint: " + config.techStack.lintCommand,
    "Update session file",
    "Verify format: '" + config.workItems.commitPattern + "'",
    "No attribution/emojis"
  ]
  display(checklist)
}
```

**Tech stack:** Config-aware

---

### `/refresh` - Refresh Context
**Purpose:** Re-read behavior.yml and verify critical assessment mode

**Logic:**
1. Read `.claude/context/behavior.yml`
2. Display CRITICAL ASSESSMENT section
3. Self-verify: Am I being skeptical or agreeable?

**Tech stack:** Universal

---

## Skills

### context-loader
**Trigger:** Session start, explicit refresh

**Action:**
1. Read `.claude/config.json` to get `contextFiles` list
2. Read all files in parallel using multiple Read tool calls
3. Load into session context

**Implementation:**
```markdown
When a new session starts, I will:
1. Read .claude/config.json
2. Extract contextFiles array
3. Read all files in parallel: .claude/context/README.yml, .claude/context/sessions.yml, etc.
4. Confirm: "Loaded X context files"
```

---

### session-detector
**Trigger:** User asks "What's next?", session start

**Action:**
1. Run `git branch --show-current`
2. Execute `scripts/get-current-session.sh`
3. Parse output to get session file path
4. Auto-load session file

**Config-aware:** Uses `workItems.branchPattern` to parse branch names

---

### test-runner
**Trigger:** Before commit, before PR

**Action:**
1. Read `.claude/config.json`
2. For each command in `techStack.verifyCommands`:
   - Run corresponding command (test, lint, build)
   - Check exit code
   - Block operation if any fail

**Implementation:**
```bash
#!/bin/bash
# scripts/run-tests.sh

CONFIG=$(cat .claude/config.json)
VERIFY_COMMANDS=$(echo "$CONFIG" | jq -r '.techStack.verifyCommands[]')

for cmd in $VERIFY_COMMANDS; do
  case $cmd in
    test)
      TEST_CMD=$(echo "$CONFIG" | jq -r '.techStack.testCommand')
      eval $TEST_CMD || exit 1
      ;;
    lint)
      LINT_CMD=$(echo "$CONFIG" | jq -r '.techStack.lintCommand')
      eval $LINT_CMD || exit 1
      ;;
    build)
      BUILD_CMD=$(echo "$CONFIG" | jq -r '.techStack.buildCommand')
      eval $BUILD_CMD || exit 1
      ;;
  esac
done
```

---

### checklist-matcher
**Trigger:** User prompt contains trigger words

**Action:**
1. Scan user message for patterns: "commit", "PR", "what's next", "terraform"
2. Match pattern → surface relevant checklist
3. Block execution until checklist confirmed

**Patterns:**
- "commit" | "git commit" → `/check commit`
- "PR" | "pull request" → `/check pr`
- "what's next" | "status" → `/next`
- "terraform apply" → `/check terraform`

---

## Hooks

### pre-commit.sh
**Trigger:** Before git commit tool use

**Action:**
```bash
#!/bin/bash
# 1. Run tests based on tech stack
./scripts/run-tests.sh || exit 1

# 2. Verify session file updated
git diff --cached --name-only | grep -q ".claude/sessions/" || {
  echo "ERROR: Session file not updated"
  exit 1
}

# 3. Verify commit format
# (handled by git-workflow agent)
```

---

### pre-pr.sh
**Trigger:** Before gh pr create tool use

**Action:**
```bash
#!/bin/bash
# 1. Run tests
./scripts/run-tests.sh || exit 1

# 2. Verify PR title format
# 3. Verify PR body has no attribution
# (handled by git-workflow agent)
```

---

### prompt-submit.sh
**Trigger:** User submits message

**Action:**
```bash
#!/bin/bash
MESSAGE="$1"

# Pattern matching
if echo "$MESSAGE" | grep -qiE "(commit|git commit|create commit)"; then
  echo "CHECKLIST: Git Commit"
  cat .claude/context/git.yml
fi

if echo "$MESSAGE" | grep -qiE "(pr|pull request|create pr)"; then
  echo "CHECKLIST: Pull Request"
  cat .claude/context/git.yml
fi

if echo "$MESSAGE" | grep -qiE "(what's next|status|where are we)"; then
  echo "AUTO-EXECUTING: /next"
fi
```

---

## Templates

### Context File Templates

Templates use placeholders that get replaced during initialization:

**test.yml.template:**
```yaml
# Testing Strategy - Compact Reference
when: after-each-method (not end), incremental
pyramid: unit > integration > e2e
test: {TECH_STACK_TEST_TARGETS}
skip: {TECH_STACK_SKIP_TARGETS}
placement:
  unit: {TECH_STACK_UNIT_PATH}
  integration: {TECH_STACK_INTEGRATION_PATH}
pattern: Arrange-Act-Assert
naming: {TECH_STACK_NAMING_CONVENTION}
run:
  unit: {TECH_STACK_TEST_COMMAND}
  integration: {TECH_STACK_INTEGRATION_COMMAND}
coverage: 100% (business-logic, auth), skip (framework, unchanged)
```

**Placeholder replacement (react-typescript):**
- `{TECH_STACK_TEST_TARGETS}` → `pure-functions, business-logic, auth-logic`
- `{TECH_STACK_SKIP_TARGETS}` → `react-components, redux-integration, styling`
- `{TECH_STACK_UNIT_PATH}` → `src/utils/*.test.ts, src/features/*/utils/*.test.ts`
- `{TECH_STACK_TEST_COMMAND}` → `npm test -- --watchAll=false`

---

## Migration Strategy

### Detecting Existing Setup

Plugin detects existing `.claude/` directory structure and generates config:

```bash
/plugin install session-workflow

# Plugin checks:
- Does .claude/ exist?
- Does .claude/context/ exist?
- Does .claude/tools/get-current-session.sh exist?
- Does package.json exist? (detect npm)
- Does build.gradle exist? (detect gradle)
- Does .github/ exist? (detect GitHub)
- Does .azure-devops/ exist? (detect Azure DevOps)

# Plugin generates:
.claude/config.json (based on detected patterns)
```

### Config Generation Example

**Detected:**
- `package.json` with `react` and `typescript` dependencies
- `.claude/context/azure-devops.yml` exists
- Branch pattern in `.claude/branches/` files: `118344-description`

**Generated config:**
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
  "personal": {
    "enabled": true
  }
}
```

### Migration Steps

1. **Backup existing setup**
   ```bash
   cp -r .claude .claude.backup
   ```

2. **Install plugin**
   ```bash
   /plugin install session-workflow@github:user/repo
   ```

3. **Plugin analyzes existing setup**
   - Reads existing `.claude/context/*.yml` files
   - Detects tech stack from project files
   - Detects work item system from templates/config

4. **Plugin generates config**
   - Creates `.claude/config.json`
   - Preserves existing context files (does NOT overwrite)

5. **Validate**
   ```bash
   /next  # Should work with existing session
   /check commit  # Should show correct test commands
   ```

6. **Commit plugin adoption**
   ```bash
   git add .claude/config.json
   git commit -m "chore - adopt session-workflow plugin"
   ```

---

## Testing Strategy

### Local Development Setup

```bash
# Clone plugin repo
git clone https://github.com/user/session-workflow-plugin
cd session-workflow-plugin

# Create local marketplace for testing
mkdir -p ~/.claude/marketplaces/local
ln -s $(pwd) ~/.claude/marketplaces/local/session-workflow

# In test project (e.g., simple-D365)
cd /Users/dpuglielli/github/flexion/simple-D365
/plugin install session-workflow@local

# Test commands
/next
/create-session 123
/check commit
```

### Test Projects

Use existing projects as test cases:

1. **simple-D365** (typescript-node, GitHub, Terraform)
2. **Portal-D365-WebApp** (react-typescript, Azure DevOps, App Service)
3. **portal-D365** (java-spring, Azure DevOps, Expand-contract)

### Validation Checklist

- [ ] `/next` works in all 3 projects
- [ ] `/create-session` creates correct branch pattern per project
- [ ] `/check commit` shows correct test commands per tech stack
- [ ] Hooks block commits when tests fail
- [ ] Session detector works with different branch patterns
- [ ] Context loader reads correct files per project
- [ ] Personal context works (Portal projects only)
- [ ] Templates generate correctly per tech stack

---

## Versioning & Releases

### Semantic Versioning

- **Major (1.0.0 → 2.0.0):** Breaking changes to config schema, command interface
- **Minor (1.0.0 → 1.1.0):** New commands, new tech stack presets, new features
- **Patch (1.0.0 → 1.0.1):** Bug fixes, documentation updates

### Release Process

1. Update `CHANGELOG.md`
2. Update version in `.claude-plugin/plugin.json`
3. Tag release: `git tag v1.0.0`
4. Push: `git push --tags`
5. Users update: `/plugin update session-workflow`

---

## Future Enhancements

### v1.1 - Enhanced Work Item Integration
- Auto-link commits to work items
- Pull work item description into session file
- Update work item status on PR merge

### v1.2 - Multi-repo Support
- Session tracking across related repos (frontend + backend)
- Cross-repo branch detection
- Unified "what's next" across repos

### v1.3 - Analytics & Metrics
- Session duration tracking
- Test success rates
- Time per work item
- Session quality metrics

### v2.0 - AI-Powered Session Management
- Auto-generate session summaries
- Suggest next steps based on code changes
- Auto-detect when session should be updated

---

## Implementation Phases

### Phase 1: Core Plugin Structure (Week 1)
- [ ] Create plugin manifest
- [ ] Implement universal scripts (get-current-session.sh, create-branch-metadata.sh)
- [ ] Create basic commands (/next, /create-session)
- [ ] Test with simple-D365

### Phase 2: Config System (Week 2)
- [ ] Define config schema
- [ ] Create tech stack presets
- [ ] Implement config-aware test-runner
- [ ] Test with Portal-D365-WebApp (react-typescript)

### Phase 3: Skills & Agents (Week 3)
- [ ] Implement context-loader skill
- [ ] Implement session-detector skill
- [ ] Implement test-runner skill
- [ ] Create session-manager agent
- [ ] Create git-workflow agent

### Phase 4: Hooks & Enforcement (Week 4)
- [ ] Implement pre-commit hook
- [ ] Implement pre-pr hook
- [ ] Implement prompt-submit hook
- [ ] Test blocking behavior

### Phase 5: Migration Tools (Week 5)
- [ ] Auto-detect existing setup
- [ ] Generate config from existing patterns
- [ ] Create migration guide
- [ ] Test migration on all 3 projects

### Phase 6: Documentation & Polish (Week 6)
- [ ] Complete README
- [ ] Write installation guide
- [ ] Write configuration reference
- [ ] Create examples for each tech stack
- [ ] Publish v1.0.0

---

## Success Metrics

1. **Adoption:** All 3 test projects using plugin successfully
2. **Consistency:** Same commands work across all projects
3. **Zero Breaking Changes:** Existing workflows continue to work
4. **Reduced Duplication:** Context files shared via templates
5. **Easy Onboarding:** New project setup < 5 minutes

---

## References

### Analyzed Projects
- `/Users/dpuglielli/github/flexion/simple-D365` (TypeScript/Node, GitHub, Terraform)
- `/Users/dpuglielli/github/nucor/Portal-D365-WebApp` (React/TypeScript, Azure DevOps)
- `/Users/dpuglielli/github/nucor/portal-D365` (Java/Spring Boot, Azure DevOps)

### Plugin Documentation
- [Claude Code Plugins Guide](https://code.claude.com/docs/en/plugins.md)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference.md)
- [Skills Documentation](https://code.claude.com/docs/en/skills.md)
- [Hooks Guide](https://code.claude.com/docs/en/hooks-guide.md)

---

**Status:** Design Complete - Ready for Implementation
**Next Step:** Begin Phase 1 - Core Plugin Structure
