# Phase 2 Testing Guide

## Overview
This guide provides comprehensive testing procedures for Phase 2 (Config System) components. Phase 2 introduces tech-stack-aware configuration, automated initialization, and verification systems.

## Phase 2 Components

1. **Tech Stack Presets** - Pre-configured settings for different tech stacks
2. **/init Command** - Automated project initialization
3. **Config Reader Script** - Universal config reading and merging
4. **Test Runner Script** - Tech-agnostic verification execution
5. **Config-Aware /check Command** - Dynamic, tech-specific checklists

## Target Projects

- **simple-D365** - TypeScript Node.js
- **Portal-D365-WebApp** - React TypeScript ⭐ Primary Phase 2.6 target
- **portal-D365** - Java Spring Boot

## Prerequisites

### Dependencies
- jq (JSON processor)
- shellcheck (for script validation)
- Git repository
- Node.js/npm (for Node.js projects) OR Gradle/Maven (for Java projects)

### Plugin Location
Ensure claude-domestique repository is cloned locally:
```bash
/Users/dpuglielli/github/flexion/claude-domestique
```

---

## Test 1: Plugin Installation

**Objective:** Verify plugin can be installed in target project

**Not Yet Implemented:** Plugin installation mechanism is Phase 4+
**Current Workaround:** Copy scripts and configs manually for testing

**Manual Test Setup:**
```bash
cd /path/to/target-project

# Copy scripts
cp -r /Users/dpuglielli/github/flexion/claude-domestique/scripts .claude/tools/

# Copy presets
cp -r /Users/dpuglielli/github/flexion/claude-domestique/presets ./

# Copy schemas
cp -r /Users/dpuglielli/github/flexion/claude-domestique/schemas ./
```

**Success Criteria:**
- Scripts accessible at `.claude/tools/`
- Presets accessible at `./presets/`
- Schemas accessible at `./schemas/`

---

## Test 2: Config Reader (`scripts/read-config.sh`)

**Objective:** Verify config reader works with test configs

**Location:** claude-domestique repository

### Test 2a: Read Full Config
```bash
cd /Users/dpuglielli/github/flexion/claude-domestique

CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh
```

**Expected:** Full merged config output as JSON

**Success Criteria:**
- No errors
- JSON output is valid
- Preset values merged with project config
- Project values override preset values

### Test 2b: Extract Specific Values
```bash
CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh runtime.type
# Expected: node

CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh test.testCommand
# Expected: npm test

CONFIG_PATH=test-configs/portal-d365-config.json ./scripts/read-config.sh test.testCommand
# Expected: gradle test
```

**Success Criteria:**
- Correct values extracted
- Works with different tech stacks
- Nested paths work (e.g., `vcs.git.defaultBranch`)

### Test 2c: Preset Merging
```bash
# Test with typescript-node preset
CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh runtime.version
# Expected: 20.x (from project config, overrides preset's 18.x)

# Test with java-spring preset
CONFIG_PATH=test-configs/portal-d365-config.json ./scripts/read-config.sh quality.linter.command
# Expected: gradle checkstyleMain
```

**Success Criteria:**
- Project config values override preset
- Preset provides defaults for missing values
- Deep merge works correctly

### Test 2d: Validation
```bash
CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh --validate
```

**Expected:** "Configuration is valid" message

**Success Criteria:**
- Validation passes for all test configs
- Merged config (not just raw) is validated

### Test 2e: Error Handling
```bash
# Missing config
CONFIG_PATH=nonexistent.json ./scripts/read-config.sh runtime.type
# Expected: Error message

# Invalid path
CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh invalid.path
# Expected: Error message
```

**Success Criteria:**
- Clear error messages
- Non-zero exit codes on failure

---

## Test 3: Test Runner (`scripts/run-verification.sh`)

**Objective:** Verify test runner executes commands correctly

**Location:** claude-domestique repository

### Test 3a: Help Output
```bash
./scripts/run-verification.sh --help
```

**Expected:** Usage information with examples

**Success Criteria:**
- Help text displays
- Examples shown
- Options documented

### Test 3b: Command Extraction (Dry Run)
Verify commands are correctly extracted without executing:

```bash
# TypeScript Node.js
echo "Test: $(CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh test.testCommand)"
# Expected: npm test

# Java Spring Boot
echo "Test: $(CONFIG_PATH=test-configs/portal-d365-config.json ./scripts/read-config.sh test.testCommand)"
# Expected: gradle test
```

**Success Criteria:**
- Correct commands extracted for each tech stack
- All command types work (test, lint, format, type-check)

### Test 3c: Actual Execution (In Target Project)
**⚠️ This test must be run in actual target project with dependencies installed**

```bash
cd /path/to/Portal-D365-WebApp

# Copy config and scripts first (see Test 1)

# Run verification
CONFIG_PATH=.claude/config.json ./scripts/run-verification.sh test
```

**Expected:**
- Script executes `npm test -- --watchAll=false`
- Test results displayed
- Exit code reflects test result (0 = pass, 1 = fail)

**Success Criteria:**
- Commands execute in correct environment
- Output is readable
- Exit codes correct
- Colorized output helps distinguish status

### Test 3d: Multiple Commands
```bash
CONFIG_PATH=.claude/config.json ./scripts/run-verification.sh lint type-check
```

**Expected:**
- Runs lint first
- Then runs type-check
- Stops on first failure

**Success Criteria:**
- Commands run in order
- Failure stops execution
- Success continues to next command

### Test 3e: Default Behavior (PreCommit Hooks)
```bash
CONFIG_PATH=.claude/config.json ./scripts/run-verification.sh
```

**Expected:**
- Reads `vcs.git.hooks.preCommit` from config
- Runs all commands in that list
- Shows progress for each

**Success Criteria:**
- All preCommit commands run
- Order preserved
- Summary shows count (e.g., "4/4 passed")

---

## Test 4: /check Command (Config-Aware)

**Objective:** Verify `/check` command shows tech-specific verification steps

**Location:** Target project (Portal-D365-WebApp recommended)

### Test 4a: Commit Checklist (With Config)
```
/check commit
```

**Expected Output:**
```
Before Git Commit:

1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: npm run format:check
   - lint: npm run lint
   - type-check: npm run type-check
   - test: npm test -- --watchAll=false

2. ☐ UPDATE SESSION
   ...
```

**Success Criteria:**
- Actual project commands shown (not generic)
- Commands match config
- Different for different tech stacks

### Test 4b: Commit Checklist (Without Config)
Test in project without `.claude/config.json`:

```
/check commit
```

**Expected Output:**
```
1. ☐ RUN VERIFICATION
   No config found. Initialize plugin:
   - /init

   Or verify manually:
   - Shell scripts: shellcheck scripts/*.sh
   - Tests: Run test suite if exists
```

**Success Criteria:**
- Fallback shown when config missing
- Suggests `/init`
- Manual alternatives provided

### Test 4c: PR Checklist
```
/check pr
```

**Expected:** Same tech-specific commands as commit checklist

**Success Criteria:**
- Verification commands match commit checklist
- Consistent across different checklist types

---

## Test 5: /init Command

**Objective:** Verify project initialization works correctly

**Location:** Target project (Portal-D365-WebApp)

### Test 5a: Auto-Detection
```
/init
```

**Expected Interaction:**
```
Analyzing project...

Detected:
  Runtime: Node.js 20.9.0
  Framework: React 18.2.0
  TypeScript: Yes
  Test: Jest
  Package manager: npm

Recommended preset: react-typescript

Use this preset? (Y/n): Y
```

**Success Criteria:**
- Correct runtime detected (Node.js)
- React detected
- TypeScript detected
- Correct preset recommended
- Interactive prompts work

### Test 5b: Config Generation
After confirming preset:

**Expected:**
```
Generating configuration...
✓ Preset: react-typescript
✓ Runtime version: 20.x (detected from .nvmrc)
✓ Project name: Portal-D365-WebApp (from package.json)

Creating directory structure...
✓ Created .claude/config.json
✓ Created .claude/branches/
✓ Created .claude/sessions/

Validating configuration...
✓ Configuration is valid

Plugin initialized successfully!
```

**Success Criteria:**
- `.claude/config.json` created
- Config is valid JSON
- Extends correct preset
- Runtime version correctly detected
- Project name correctly detected

### Test 5c: Generated Config Validation
```bash
cat .claude/config.json
```

**Expected Structure:**
```json
{
  "$schema": "../schemas/config.schema.json",
  "extends": "presets/react-typescript.json",
  "name": "Portal-D365-WebApp",
  "runtime": {
    "version": "20.x"
  }
}
```

**Verify:**
```bash
./scripts/validate-config.sh .claude/config.json
```

**Success Criteria:**
- Config validates successfully
- Extends path is correct
- Project-specific overrides present

### Test 5d: Non-Interactive Mode
```
/init --preset react-typescript --yes
```

**Expected:**
- No prompts
- Uses specified preset
- Creates config directly

**Success Criteria:**
- Completes without user input
- Config created correctly
- Faster execution

---

## Test 6: End-to-End Workflow

**Objective:** Validate full workflow from initialization to commit

**Location:** Portal-D365-WebApp

### Workflow Steps

**Step 1: Initialize Project**
```
/init
```
- Confirm preset selection
- Verify config created

**Step 2: Verify Installation**
```bash
ls .claude/
# Expected: config.json, branches/, sessions/

cat .claude/config.json
# Expected: Valid config with react-typescript preset
```

**Step 3: Test Config Reader**
```bash
./scripts/read-config.sh runtime.type
# Expected: node

./scripts/read-config.sh test.testCommand
# Expected: npm test -- --watchAll=false
```

**Step 4: Check Verification Commands**
```
/check commit
```
- Verify shows React-specific commands
- Verify commands match config

**Step 5: Run Verification**
```bash
./scripts/run-verification.sh
```
- Executes all preCommit hooks
- All commands should pass
- Exit code 0

**Step 6: Make Code Change**
- Modify a file (non-breaking change)
- Save

**Step 7: Pre-Commit Check**
```
/check commit
```
- Review checklist
- Run verification

**Step 8: Verify All Commands**
```bash
./scripts/run-verification.sh --verbose
```
- See each command execute
- Verify all pass

**Success Criteria:**
- Complete workflow works end-to-end
- No errors at any step
- All commands execute correctly
- Config drives all behavior

---

## Test 7: Cross-Tech-Stack Validation

**Objective:** Verify same commands work across different tech stacks

### Test in simple-D365 (TypeScript Node.js)
```bash
cd /path/to/simple-D365

# Test config reader
CONFIG_PATH=.claude/config.json ./scripts/read-config.sh test.testCommand
# Expected: npm test

# Test verification runner (if dependencies installed)
CONFIG_PATH=.claude/config.json ./scripts/run-verification.sh test
```

### Test in portal-D365 (Java Spring Boot)
```bash
cd /path/to/portal-D365

# Test config reader
CONFIG_PATH=.claude/config.json ./scripts/read-config.sh test.testCommand
# Expected: gradle test

# Test verification runner (if Gradle available)
CONFIG_PATH=.claude/config.json ./scripts/run-verification.sh test
```

**Success Criteria:**
- Same scripts work in all projects
- Commands extracted match tech stack
- No hard-coded assumptions about build tools

---

## Known Limitations

1. **Plugin Installation:** Full plugin installation mechanism not yet implemented (Phase 4+)
   - Workaround: Manual file copying

2. **Command Execution:** Requires project dependencies installed
   - npm packages for Node.js projects
   - Gradle/Maven for Java projects

3. **Config Schema Validation:** Requires jsonschema tools installed
   - Falls back to jq validation if not available

4. **Path Resolution:** Scripts assume standard project structure
   - `.claude/` at project root
   - `presets/` and `schemas/` accessible

---

## Troubleshooting

### Issue: "Config file not found"
**Solution:** Ensure `.claude/config.json` exists. Run `/init` if not.

### Issue: "Preset file not found"
**Solution:** Verify presets are accessible. Check `extends` path in config.

### Issue: "jq: command not found"
**Solution:** Install jq: `brew install jq`

### Issue: "Command execution failed"
**Solution:**
- Verify project dependencies installed (`npm install` or `gradle build`)
- Check command is correct in config
- Run command manually to diagnose

### Issue: "/check shows generic checklist"
**Solution:** Ensure `.claude/config.json` exists in project root.

---

## Success Metrics

Phase 2 is successfully validated when:

- ✅ `/init` creates valid config for all tech stacks
- ✅ `read-config.sh` reads and merges configs correctly
- ✅ `run-verification.sh` executes commands for all tech stacks
- ✅ `/check` shows tech-specific commands
- ✅ End-to-end workflow completes without errors
- ✅ Same scripts work in TypeScript, React, and Java projects
- ✅ All test configs validate successfully

---

## Next Steps After Testing

1. **Document Results:** Record test outcomes in testing session
2. **Fix Issues:** Address any failures discovered
3. **Update Docs:** Revise this guide based on findings
4. **Phase 3:** Proceed to Skills & Agents implementation
