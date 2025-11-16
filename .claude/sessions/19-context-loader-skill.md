# Session: Issue #19 - Implement context loader skill

## Issue Details
- **Issue Number**: #19
- **Title**: Implement context loader skill
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/19

## Objective
Create an auto-invoked skill that loads project context files at session start, ensuring Claude has necessary context immediately available.

## Requirements

### Core Features
1. **Auto-Invoke** - Triggers on session start
2. **Config-Based** - Reads context files from config
3. **Parallel Loading** - Efficient multi-file loading
4. **Confirmation** - Reports loaded files
5. **Manual Trigger** - "refresh context" / "reload context"

### Trigger Conditions
- Session start (automatic)
- User says "refresh context", "reload context", "load context"

### Workflow
1. Check if `.claude/config.json` exists
2. Read `context.files` array from config
3. Read all files from `.claude/context/`
4. Load into session context
5. Report what was loaded

## Technical Approach

### Skill Definition
Skills are markdown files that instruct Claude on:
- When to trigger
- What actions to take
- How to report results

Location: `skills/context-loader/SKILL.md`

### Config Integration
```json
{
  "context": {
    "files": [
      "README.yml",
      "sessions.yml",
      "git.yml",
      "behavior.yml",
      "test.yml",
      "project.yml"
    ],
    "autoLoad": true
  }
}
```

Default files if not in config:
- README.yml
- sessions.yml
- git.yml
- behavior.yml

## Implementation Plan

### Phase 1: Create Skill Directory
- [ ] Create `skills/context-loader/` directory
- [ ] Create `SKILL.md` file

### Phase 2: Define Skill
- [ ] Document trigger conditions
- [ ] Document actions to take
- [ ] Document example output
- [ ] Add error handling instructions

### Phase 3: Update Schema
- [ ] Add `context` field to config schema
- [ ] Define `files` array
- [ ] Define `autoLoad` boolean

### Phase 4: Testing
- [ ] Document how to test skill
- [ ] Create example usage
- [ ] Verify auto-invoke behavior

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #19
- Created feature branch: issue/feature-19/context-loader-skill
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Create skill definition in `skills/context-loader/SKILL.md`

## Key Decisions

### Decision 1: Skill vs Command
**Reason**: Skills auto-invoke based on triggers, commands require explicit invocation
**Impact**: Context loading happens automatically at session start
**Alternative**: Could be a command, but would require manual invocation each session

### Decision 2: Config-Based vs Hardcoded
**Reason**: Config allows projects to customize which files to load
**Impact**: Flexibility for different projects
**Alternative**: Hardcoded list, but less flexible

## Learnings

(To be filled as implementation progresses)

## Files Created

### Skills
- `skills/context-loader/SKILL.md` - Skill definition

### Schema Updates
- `schemas/config.schema.json` - Add context field

## Next Steps

1. Create skills directory structure
2. Create SKILL.md definition
3. Update config schema
4. Add examples
5. Update session and commit
6. Create PR
