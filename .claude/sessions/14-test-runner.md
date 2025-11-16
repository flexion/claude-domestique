# Session: Issue #14 - Implement universal test runner script

## Issue Details
- **Issue Number**: #14
- **Title**: Implement universal test runner script
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/14

## Objective
Create a universal test runner that executes verification commands based on project configuration, enabling consistent quality checks across all tech stacks.

## Requirements

### Core Features
1. **Config-Based Execution** - Read verification commands from config
2. **Multi-Command Support** - Run test, lint, build, type-check, format
3. **Exit on Failure** - Stop on first failure
4. **Clear Output** - Show command progress and results
5. **Selective Execution** - Run specific commands or all
6. **Tech Stack Agnostic** - Works with all supported tech stacks

### Use Cases
- Pre-commit hooks validation
- `/check commit` command
- CI/CD pipelines
- Manual developer quality checks

## Technical Approach

### Script: `scripts/run-verification.sh`

**Command Types:**
- `test` → `config.test.testCommand`
- `lint` → `config.quality.linter.command`
- `format` → `config.quality.formatter.checkCommand`
- `type-check` → `config.quality.typeChecker.command`
- `build` → `config.quality.build.command`

**Workflow:**
1. Read config using `scripts/read-config.sh`
2. Determine commands to run (args or preCommit list)
3. For each command:
   - Extract command string from config
   - Display progress
   - Execute command
   - Handle success/failure
4. Report results

## Implementation Plan

### Phase 1: Basic Framework ✅
- [x] Create `scripts/run-verification.sh`
- [x] Parse arguments (command types or --all)
- [x] Read config using read-config.sh
- [x] Basic command execution loop

### Phase 2: Command Mapping ✅
- [x] Implement command type → config path mapping
- [x] Extract command strings from config
- [x] Handle missing commands (skip with warning)
- [x] Validate command types

### Phase 3: Execution & Output ✅
- [x] Execute commands with proper output
- [x] Show progress indicators
- [x] Capture and display errors
- [x] Exit codes on failure

### Phase 4: Default Behavior ✅
- [x] Read preCommit hooks list when no args
- [x] Run all configured verification commands
- [x] Summary output

### Phase 5: Testing ✅
- [x] Test command extraction with typescript-node preset
- [x] Test command extraction with java-spring preset
- [x] Test help output
- [x] Shellcheck validation
- [x] Verify tech stack agnostic design

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #14
- Created feature branch: issue/feature-14/test-runner
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Implement `scripts/run-verification.sh`

### 2024-11-16 - Test Runner Implemented
**Actions:**
- Created `scripts/run-verification.sh` (195 lines)
- Implemented all core features:
  - Config-based command execution
  - Command type mapping (test, lint, format, type-check, build)
  - Selective execution (specific commands or all)
  - Default behavior (runs preCommit hooks)
  - Exit on first failure
  - Clear progress and error output
- Added comprehensive features:
  - Colorized output (errors, warnings, success, info)
  - Verbose mode (--verbose flag)
  - Help flag with examples
  - Proper exit codes
- Command extraction using read-config.sh
- Tested with typescript-node and java-spring configs

**Implementation Features:**

1. **Command Type Mapping**
   - `test` → `test.testCommand`
   - `lint` → `quality.linter.command`
   - `format` → `quality.formatter.checkCommand`
   - `type-check` → `quality.typeChecker.command`
   - `build` → `quality.build.command`

2. **Execution Modes**
   - No args: Run all commands from `vcs.git.hooks.preCommit`
   - With command types: Run only specified commands
   - Verbose: Show actual command being executed

3. **Error Handling**
   - Missing config reader → error
   - Missing config file → error
   - Unknown command type → warning, skip
   - Command not configured → warning, skip
   - Command execution failure → error, exit 1

4. **Output Format**
   ```
   Running verification checks...

   Running test...
     Command: npm test  (verbose mode)
   ✓ test passed

   ✓ All verification checks passed (4/4)
   ```

**Testing Results:**
- ✅ Help output works
- ✅ Shellcheck clean (no warnings)
- ✅ Command extraction from typescript-node config:
  - test: npm test
  - lint: npm run lint
  - format: npm run format:check
  - type-check: npm run type-check
- ✅ Command extraction from java-spring config:
  - test: gradle test
  - lint: gradle checkstyleMain
  - format: gradle spotlessCheck
- ✅ preCommit hooks list extraction
- ✅ Tech stack agnostic (works with npm and gradle commands)

**Usage Examples:**
```bash
# Run all preCommit hooks
./scripts/run-verification.sh

# Run specific commands
./scripts/run-verification.sh test
./scripts/run-verification.sh lint type-check

# Verbose output
./scripts/run-verification.sh --verbose test

# Use custom config
CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/run-verification.sh test
```

**Integration Points:**
- Pre-commit hooks: Call this script in `.git/hooks/pre-commit`
- `/check commit` command: Use this to validate before commit
- CI/CD: Run verification in pipelines
- Manual: Developers can run quality checks anytime

**Note on Testing:**
Actual execution testing (running real npm/gradle commands) needs to be done in target projects:
- simple-D365 (TypeScript Node.js)
- Portal-D365-WebApp (React TypeScript)
- portal-D365 (Java Spring Boot)

Command extraction and logic flow have been validated with test configs.

**Next:** Update session, commit implementation, create PR

## Key Decisions

### Decision 1: Command Type Names
**Reason**: Use simple names (test, lint, format) not full paths
**Impact**: Easier for users, abstracted from config structure
**Alternative**: Use full JSON paths, but less user-friendly

### Decision 2: Default Behavior
**Reason**: Run preCommit hooks when no args provided
**Impact**: Natural fit for pre-commit hook usage
**Alternative**: Require explicit --all flag, but less convenient

## Learnings

### About Command Execution
- `eval` is needed to properly execute commands with arguments
- Exit codes propagate correctly with `eval "$command"`
- Colorized output helps distinguish errors from success

### About Array Handling
- `readarray -t` cleanly populates array from command output
- `jq -r '.[]'` outputs array elements line by line
- Need to check if first element is empty for empty arrays

### About Config Integration
- read-config.sh provides clean abstraction for config access
- Using read-config.sh means we don't need to parse JSON directly
- Tech stack differences handled automatically through config

### About User Experience
- Verbose mode shows actual commands being run (helpful for debugging)
- Clear progress indicators important for multi-command execution
- Skip warnings better than errors for missing optional commands

## Files Created

### Scripts
- `scripts/run-verification.sh` (195 lines)

## Next Steps

1. ✅ Implement basic script framework
2. ✅ Add command type mapping
3. ✅ Implement execution logic
4. ✅ Add default behavior (preCommit hooks)
5. ✅ Test command extraction logic
6. ✅ Shellcheck validation
7. ✅ Update session
8. Commit implementation
9. Create PR
