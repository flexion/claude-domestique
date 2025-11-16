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

### Phase 1: Basic Framework
- [ ] Create `scripts/run-verification.sh`
- [ ] Parse arguments (command types or --all)
- [ ] Read config using read-config.sh
- [ ] Basic command execution loop

### Phase 2: Command Mapping
- [ ] Implement command type → config path mapping
- [ ] Extract command strings from config
- [ ] Handle missing commands (skip with warning)
- [ ] Validate command types

### Phase 3: Execution & Output
- [ ] Execute commands with proper output
- [ ] Show progress indicators
- [ ] Capture and display errors
- [ ] Exit codes on failure

### Phase 4: Default Behavior
- [ ] Read preCommit hooks list when no args
- [ ] Run all configured verification commands
- [ ] Summary output

### Phase 5: Testing
- [ ] Test with typescript-node preset
- [ ] Test with react-typescript preset
- [ ] Test with java-spring preset
- [ ] Test specific command execution
- [ ] Test failure scenarios
- [ ] Test missing commands

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #14
- Created feature branch: issue/feature-14/test-runner
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Implement `scripts/run-verification.sh`

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

(To be filled as implementation progresses)

## Files Created

### Scripts (To Create)
- `scripts/run-verification.sh`

## Next Steps

1. Implement basic script framework
2. Add command type mapping
3. Implement execution logic
4. Add default behavior (preCommit hooks)
5. Test with all presets
6. Update session and commit
7. Create PR
