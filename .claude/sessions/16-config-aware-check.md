# Session: Issue #16 - Update /check command to be config-aware

## Issue Details
- **Issue Number**: #16
- **Title**: Update /check command to be config-aware
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/16

## Objective
Update the `/check` command to display tech-specific verification commands based on project configuration, making checklists accurate and actionable for each tech stack.

## Current State
The `/check commit` and `/check pr` checklists show generic verification:
```
1. RUN VERIFICATION (if applicable)
   - Shell scripts: shellcheck scripts/*.sh
   - Tests: Run test suite if exists
```

## Desired State
Show tech-specific commands:
```
1. RUN VERIFICATION
   ./scripts/run-verification.sh

   This will run:
   - format: npm run format:check
   - lint: npm run lint
   - type-check: npm run type-check
   - test: npm test
```

## Technical Approach

### Update Checklists
Modify "Before Git Commit" and "Before Pull Request" sections to:
1. Check if `.claude/config.json` exists
2. If yes: Read and display tech-specific commands
3. If no: Show fallback with `/init` suggestion

### Dynamic Generation
When `/check commit` or `/check pr` invoked:
1. Use `scripts/read-config.sh` to read config
2. Extract `vcs.git.hooks.preCommit` list
3. For each command type, get actual command string
4. Format as checklist

## Implementation Plan

### Phase 1: Update Commit Checklist ✅
- [x] Modify "Before Git Commit" section
- [x] Add config existence check
- [x] Add dynamic command list generation
- [x] Add fallback for no config

### Phase 2: Update PR Checklist ✅
- [x] Modify "Before Pull Request" section
- [x] Same config-aware approach
- [x] Same fallback

### Phase 3: Examples ✅
- [x] Update examples to show config-aware output
- [x] Add example for typescript-node
- [x] Add example for java-spring
- [x] Add example for no config (fallback)

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #16
- Created feature branch: issue/feature-16/config-aware-check
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Update `commands/check.md` with config-aware checklists

### 2024-11-16 - Config-Aware /check Implemented
**Actions:**
- Updated `commands/check.md` with config-aware checklists
- Modified "Before Git Commit" section:
  - Added instructions for dynamic command generation
  - Created two versions: with config and without config (fallback)
  - With config: Shows tech-specific verification commands
  - Without config: Suggests /init with manual fallback
- Modified "Before Pull Request" section:
  - Same config-aware approach as commit checklist
  - Dynamic command list generation
  - Fallback for missing config
- Updated examples:
  - Example 1: General check with config-aware output
  - Example 3: Commit checklist for TypeScript Node.js
  - Example 3b: Commit checklist for Java Spring Boot
  - Example 3c: Commit checklist without config (fallback)
  - Example 4: PR checklist with config

**Implementation Approach:**

When `/check commit` or `/check pr` invoked, Claude will:
1. Check if `.claude/config.json` exists
2. If yes:
   - Use `scripts/read-config.sh vcs.git.hooks.preCommit` to get command list
   - For each command type, extract actual command:
     - test → test.testCommand
     - lint → quality.linter.command
     - format → quality.formatter.checkCommand
     - type-check → quality.typeChecker.command
   - Display tech-specific commands in checklist
3. If no:
   - Show fallback checklist
   - Suggest `/init` for plugin setup
   - Provide manual verification steps

**Example Output Formats:**

**TypeScript Node.js:**
```
1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: npm run format:check
   - lint: npm run lint
   - type-check: npm run type-check
   - test: npm test
```

**Java Spring Boot:**
```
1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: gradle spotlessCheck
   - lint: gradle checkstyleMain
   - test: gradle test
```

**No Config (Fallback):**
```
1. ☐ RUN VERIFICATION
   No config found. Initialize plugin:
   - /init

   Or verify manually:
   - Shell scripts: shellcheck scripts/*.sh
   - Tests: Run test suite if exists
```

**Benefits:**
- Tech stack awareness: Shows actual commands for each project
- Actionable: Users know exactly what to run
- Clear: No ambiguity about verification steps
- Flexible: Works with or without config
- Future-proof: Automatically updates with config changes

**Next:** Update session, commit implementation, create PR

## Key Decisions

### Decision 1: Dynamic vs Static
**Reason**: Generate command list dynamically when command invoked
**Impact**: Always shows current config, no stale information
**Alternative**: Static examples, but wouldn't reflect actual project

### Decision 2: Fallback Behavior
**Reason**: Show helpful fallback when config missing
**Impact**: Works in projects without plugin installed
**Alternative**: Error out, but less user-friendly

## Learnings

### About Command Definitions
- Command markdown files instruct Claude on behavior
- Dynamic behavior specified through conditional logic in markdown
- Instructions can reference scripts for runtime data
- Fallback behavior important for universal compatibility

### About User Experience
- Showing exact commands removes ambiguity
- Tech-specific output more helpful than generic instructions
- Fallback ensures plugin works even without config
- Examples demonstrate different scenarios clearly

### About Config Integration
- read-config.sh provides clean abstraction
- Verification commands naturally map to config structure
- preCommit hooks list drives default verification behavior
- Same config used by /check and actual hooks ensures consistency

## Files Modified

### Commands
- `commands/check.md` - Updated checklists to be config-aware (major update)

## Next Steps

1. ✅ Update "Before Git Commit" checklist
2. ✅ Update "Before Pull Request" checklist
3. ✅ Update examples
4. ✅ Update session
5. Commit implementation
6. Create PR
