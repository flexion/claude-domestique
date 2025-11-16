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
3. If no: Show fallback with `/plugin-init` suggestion

### Dynamic Generation
When `/check commit` or `/check pr` invoked:
1. Use `scripts/read-config.sh` to read config
2. Extract `vcs.git.hooks.preCommit` list
3. For each command type, get actual command string
4. Format as checklist

## Implementation Plan

### Phase 1: Update Commit Checklist
- [ ] Modify "Before Git Commit" section
- [ ] Add config existence check
- [ ] Add dynamic command list generation
- [ ] Add fallback for no config

### Phase 2: Update PR Checklist
- [ ] Modify "Before Pull Request" section
- [ ] Same config-aware approach
- [ ] Same fallback

### Phase 3: Examples
- [ ] Update examples to show config-aware output
- [ ] Add example for typescript-node
- [ ] Add example for java-spring
- [ ] Add example for no config (fallback)

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #16
- Created feature branch: issue/feature-16/config-aware-check
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Update `commands/check.md` with config-aware checklists

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

(To be filled as implementation progresses)

## Files Modified

### Commands
- `commands/check.md` - Update checklists to be config-aware

## Next Steps

1. Update "Before Git Commit" checklist
2. Update "Before Pull Request" checklist
3. Update examples
4. Test with different configs
5. Update session and commit
6. Create PR
