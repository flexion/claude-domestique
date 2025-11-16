# Implementation Plan - Session Workflow Plugin

## Overview

This document provides a step-by-step implementation plan for building the session-workflow plugin.

---

## Phase 1: Core Plugin Structure ✓

**Goal:** Basic plugin structure with manifest and universal scripts

**Status:** READY TO START

### Tasks

#### 1.1 Plugin Manifest ✓
- [x] Create `.claude-plugin/plugin.json`
- [x] Define metadata (name, version, description, author)
- [x] Configure component paths (commands, agents, skills, hooks)

**File:** `.claude-plugin/plugin.json`

---

#### 1.2 Universal Scripts ✓
- [x] Copy `get-current-session.sh` from test projects
- [x] Copy `create-branch-metadata.sh` from test projects
- [x] Make scripts universal (work with any branch pattern)
- [x] Add support for both chore and feature workflows
- [x] Document feature workflow patterns from simple-D365
- [ ] Add config-awareness to scripts

**Files:**
- `scripts/get-current-session.sh` ✓
- `scripts/create-branch-metadata.sh` ✓
- `.claude/context/features.yml` ✓ (feature workflow documentation)
- `.claude/templates/feature-session.md.template` ✓

**Workflow Support:**
- **Chores:** `chore/desc` branches, `chore-desc.md` sessions, `chore - verb desc` commits
- **Features:** `issue/feature-N/desc` branches, `N-desc.md` sessions, `#N - verb desc` commits

**Reference:**
- `/Users/dpuglielli/github/flexion/simple-D365/.claude/tools/get-current-session.sh`
- `/Users/dpuglielli/github/nucor/Portal-D365-WebApp/.claude/tools/get-current-session.sh`

---

#### 1.3 Config Schema
- [ ] Create JSON schema for `.claude/config.json`
- [ ] Define tech stack presets (typescript-node, react-typescript, java-spring)
- [ ] Create validation script
- [ ] Document all config options

**Files:**
- `schemas/config.schema.json`
- `docs/configuration.md`

---

#### 1.4 Basic Commands
- [ ] `/next` - Show next steps
- [ ] `/create-session` - Create session (support both chore and feature)
- [ ] `/check` - Show checklist

**Files:**
- `commands/next.md`
- `commands/create-session.md` (must support chore and feature workflows)
- `commands/check.md`

**Note:** `/create-session` must detect branch type and use appropriate template:
- Chore branches → focused session structure
- Feature branches → rich session structure with issue details, decisions, learnings

**Command Template:**
```markdown
# Command: /next

## Description
Show next steps from current session

## Usage
/next

## Implementation
1. Run `git branch --show-current`
2. Execute `scripts/get-current-session.sh`
3. Read `.claude/sessions/<session-file>.md`
4. Parse "Next Steps" section
5. Display to user

## Example
User: /next

Output:
Current branch: 118344-add-authentication
Session: 118344-add-authentication.md

Next Steps:
- Implement login form validation
- Add JWT token storage
- Test authentication flow
```

---

#### 1.5 Test with simple-D365
- [ ] Install plugin in simple-D365
- [ ] Create test config for typescript-node
- [ ] Test `/next` command
- [ ] Test `/create-session` command
- [ ] Verify scripts work

**Validation:**
```bash
cd /Users/dpuglielli/github/flexion/simple-D365
/plugin install session-workflow@local

# Test commands
/next
/create-session 123
```

---

## Phase 2: Config System

**Goal:** Tech stack configuration and presets

### Tasks

#### 2.1 Tech Stack Presets
- [ ] Create preset files for each tech stack
- [ ] typescript-node preset
- [ ] react-typescript preset
- [ ] java-spring preset
- [ ] python-django preset

**Files:**
- `presets/typescript-node.json`
- `presets/react-typescript.json`
- `presets/java-spring.json`
- `presets/python-django.json`

**Example Preset:**
```json
{
  "name": "react-typescript",
  "techStack": {
    "testCommand": "npm test -- --watchAll=false",
    "lintCommand": "npm run lint",
    "buildCommand": "npm run build",
    "verifyCommands": ["test", "lint", "build"]
  },
  "testPatterns": {
    "test": "pure-functions, business-logic, auth-logic",
    "skip": "react-components, redux-integration, styling"
  },
  "testPlacement": {
    "unit": "src/utils/*.test.ts, src/features/*/utils/*.test.ts"
  },
  "namingConvention": "should_<expectedResult>_when<Condition>"
}
```

---

#### 2.2 Config Reader
- [ ] Create config reader utility
- [ ] Support config validation
- [ ] Support preset loading
- [ ] Merge preset + project overrides

**File:** `scripts/config-reader.sh`

```bash
#!/bin/bash
# Read config, merge with preset

CONFIG_FILE=".claude/config.json"
PRESET=$(jq -r '.techStack.type' "$CONFIG_FILE")

if [ -f "presets/$PRESET.json" ]; then
  # Merge preset with project config
  jq -s '.[0] * .[1]' "presets/$PRESET.json" "$CONFIG_FILE"
else
  cat "$CONFIG_FILE"
fi
```

---

#### 2.3 Test Runner Script
- [ ] Create universal test runner
- [ ] Read verifyCommands from config
- [ ] Execute each command
- [ ] Return exit code

**File:** `scripts/run-tests.sh`

```bash
#!/bin/bash
# Run tests based on tech stack config

CONFIG=$(cat .claude/config.json)
VERIFY_COMMANDS=$(echo "$CONFIG" | jq -r '.techStack.verifyCommands[]')

for cmd in $VERIFY_COMMANDS; do
  case $cmd in
    test)
      TEST_CMD=$(echo "$CONFIG" | jq -r '.techStack.testCommand')
      echo "Running tests: $TEST_CMD"
      eval $TEST_CMD || exit 1
      ;;
    lint)
      LINT_CMD=$(echo "$CONFIG" | jq -r '.techStack.lintCommand')
      echo "Running lint: $LINT_CMD"
      eval $LINT_CMD || exit 1
      ;;
    build)
      BUILD_CMD=$(echo "$CONFIG" | jq -r '.techStack.buildCommand')
      echo "Running build: $BUILD_CMD"
      eval $BUILD_CMD || exit 1
      ;;
  esac
done

echo "All checks passed ✓"
```

---

#### 2.4 Update `/check` Command
- [ ] Make `/check` config-aware
- [ ] Read test commands from config
- [ ] Display tech-specific checklist

---

#### 2.5 Test with Portal-D365-WebApp
- [ ] Install plugin
- [ ] Create config for react-typescript
- [ ] Test `/check commit`
- [ ] Verify correct commands shown (npm test + lint + build)

---

## Phase 3: Skills & Agents

**Goal:** Auto-invoked capabilities and specialized agents

**Note:** All skills and agents must handle both chore and feature workflows:
- Session files have different structures (focused vs rich)
- Commit formats differ (`chore -` vs `#N -`)
- Branch patterns differ (`chore/` vs `issue/feature-N/`)

### Tasks

#### 3.1 Context Loader Skill
- [ ] Create SKILL.md
- [ ] Auto-load on session start
- [ ] Read config.contextFiles
- [ ] Parallel file loading

**File:** `skills/context-loader/SKILL.md`

```markdown
# Context Loader Skill

## Trigger
- Session start
- User says "refresh context" or "reload context"

## Action
When triggered, I will:
1. Read `.claude/config.json`
2. Extract `contextFiles` array
3. Read all files in parallel from `.claude/context/`
4. Load into session context
5. Confirm: "Loaded X context files: [list]"

## Example
Session starts → Auto-invoke

I read:
- .claude/config.json → contextFiles: ["README.yml", "sessions.yml", "git.yml", ...]
- .claude/context/README.yml
- .claude/context/sessions.yml
- .claude/context/git.yml
- etc.

Output: "Loaded 8 context files: README.yml, sessions.yml, git.yml, behavior.yml, test.yml, deploy.yml, azure-devops.yml, project.yml"
```

---

#### 3.2 Session Detector Skill
- [ ] Create SKILL.md
- [ ] Auto-invoke on "what's next?"
- [ ] Run get-current-session.sh
- [ ] Parse output

**File:** `skills/session-detector/SKILL.md`

---

#### 3.3 Test Runner Skill
- [ ] Create SKILL.md
- [ ] Auto-invoke before commit/PR
- [ ] Execute scripts/run-tests.sh
- [ ] Block if tests fail

**File:** `skills/test-runner/SKILL.md`

---

#### 3.4 Checklist Matcher Skill
- [ ] Create SKILL.md
- [ ] Pattern match user messages
- [ ] Surface relevant checklist
- [ ] Block execution until confirmed

**File:** `skills/checklist-matcher/SKILL.md`

---

#### 3.5 Session Manager Agent
- [ ] Create agent.md
- [ ] CRUD operations on sessions
- [ ] Create session from template
- [ ] Update session log
- [ ] Read session file

**File:** `agents/session-manager.md`

---

#### 3.6 Git Workflow Agent
- [ ] Create agent.md
- [ ] Enforce commit format
- [ ] Enforce PR format
- [ ] Run pre-commit checks
- [ ] Block attribution

**File:** `agents/git-workflow.md`

---

## Phase 4: Hooks & Enforcement

**Goal:** Workflow enforcement via hooks

**Note:** Hooks must enforce correct commit format based on branch type:
- Chore branches → require `chore - verb desc` format
- Feature branches → require `#N - verb desc` format
- All commits → ZERO attribution, emojis, or AI mentions

### Tasks

#### 4.1 Pre-Commit Hook
- [ ] Create hook script
- [ ] Run tests via scripts/run-tests.sh
- [ ] Verify session updated
- [ ] Verify commit format matches branch type
- [ ] Block if checks fail

**File:** `hooks/pre-commit.sh`

---

#### 4.2 Pre-PR Hook
- [ ] Create hook script
- [ ] Run tests
- [ ] Verify PR format
- [ ] Check for attribution

**File:** `hooks/pre-pr.sh`

---

#### 4.3 Prompt Submit Hook
- [ ] Create hook script
- [ ] Pattern match user messages
- [ ] Auto-invoke commands
- [ ] Surface checklists

**File:** `hooks/prompt-submit.sh`

---

#### 4.4 Test Blocking Behavior
- [ ] Install in test project
- [ ] Make tests fail
- [ ] Attempt commit
- [ ] Verify blocked

---

## Phase 5: Migration Tools

**Goal:** Easy migration from existing setups

**Note:** Migration must preserve both chore and feature workflows:
- Detect existing feature branches (`issue/feature-N/`)
- Preserve feature session files (`N-desc.md`)
- Maintain GitHub issue mappings
- Convert existing branch metadata correctly

### Tasks

#### 5.1 Auto-Detect Script
- [ ] Detect package.json → npm
- [ ] Detect build.gradle → gradle
- [ ] Detect .github → GitHub
- [ ] Detect existing .claude/context/*.yml
- [ ] Detect existing feature branches and sessions
- [ ] Detect existing chore branches and sessions

**File:** `scripts/auto-detect.sh`

---

#### 5.2 Config Generator
- [ ] Generate config from detected patterns
- [ ] Merge with preset
- [ ] Write to .claude/config.json

**File:** `scripts/generate-config.sh`

---

#### 5.3 Migration Command
- [ ] Create `/migrate` command
- [ ] Backup existing setup
- [ ] Run auto-detect
- [ ] Generate config
- [ ] Validate

**File:** `commands/migrate.md`

---

#### 5.4 Test Migration
- [ ] Test with simple-D365
- [ ] Test with Portal-D365-WebApp
- [ ] Test with portal-D365
- [ ] Verify all existing workflows work

---

## Phase 6: Documentation & Polish

**Goal:** Complete documentation and examples

### Tasks

#### 6.1 Documentation
- [ ] Installation guide (docs/installation.md)
- [ ] Configuration reference (docs/configuration.md)
- [ ] Command reference (docs/commands.md)
- [ ] Migration guide (docs/migration.md)
- [ ] Feature workflow guide (docs/feature-workflow.md)
- [ ] Chore workflow guide (docs/chore-workflow.md)

---

#### 6.2 Examples
- [ ] Example configs for each tech stack
- [ ] Example chore session files
- [ ] Example feature session files (with decisions, learnings, session logs)
- [ ] Example work item templates (GitHub issues, Azure DevOps)

---

#### 6.3 Testing
- [ ] Test all commands in all 3 projects
- [ ] Test all hooks
- [ ] Test all skills
- [ ] Test migration path

---

#### 6.4 Release
- [ ] Update CHANGELOG.md
- [ ] Tag v1.0.0
- [ ] Publish to GitHub
- [ ] Update test projects to use published version

---

## Quick Start Guide (For Implementation)

### Step 1: Set Up Development Environment
```bash
cd /Users/dpuglielli/github/flexion/session-workflow-plugin

# Create local marketplace
mkdir -p ~/.claude/marketplaces/local
ln -s $(pwd) ~/.claude/marketplaces/local/session-workflow
```

---

### Step 2: Start with Phase 1, Task 1.2
```bash
# Copy universal scripts
cp /Users/dpuglielli/github/flexion/simple-D365/.claude/tools/get-current-session.sh \
   scripts/get-current-session.sh

cp /Users/dpuglielli/github/flexion/simple-D365/.claude/tools/create-branch-metadata.sh \
   scripts/create-branch-metadata.sh

# Make executable
chmod +x scripts/*.sh
```

---

### Step 3: Create First Command
```bash
# Create /next command
cat > commands/next.md << 'EOF'
# Command: /next

## Description
Show next steps from current session

## Usage
/next

## Implementation
Execute scripts/get-current-session.sh and parse output
EOF
```

---

### Step 4: Test Locally
```bash
cd /Users/dpuglielli/github/flexion/simple-D365
/plugin install session-workflow@local
/next
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Plugin installs successfully
- [ ] `/next` works in simple-D365
- [ ] `/create-session` works
- [ ] Scripts execute correctly

### Phase 2 Complete When:
- [ ] Config system works
- [ ] Tech stack presets load
- [ ] Test runner executes correct commands
- [ ] Works in Portal-D365-WebApp (different stack)

### Phase 3 Complete When:
- [ ] Skills auto-invoke correctly
- [ ] Agents handle operations
- [ ] Context loads automatically

### Phase 4 Complete When:
- [ ] Hooks block invalid operations
- [ ] Tests run before commits
- [ ] Pattern matching works

### Phase 5 Complete When:
- [ ] All 3 projects migrated successfully
- [ ] Existing workflows preserved
- [ ] Config generated correctly

### Phase 6 Complete When:
- [ ] Documentation complete
- [ ] Examples provided
- [ ] v1.0.0 released

---

## Current Status

**Phase:** 1 (Core Plugin Structure)
**Completed:**
- 1.1 Plugin Manifest ✓
- 1.2 Universal Scripts ✓ (including feature workflow documentation)

**Next:** 1.3 Config Schema

**Recent Updates:**
- Added support for both chore and feature workflows
- Documented feature patterns from simple-D365
- Created feature session template
- Updated all context files to support dual workflows

**Ready to continue with Phase 1.3!**
