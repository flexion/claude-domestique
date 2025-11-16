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

### Phase 1: Create Skill Directory ✅
- [x] Create `skills/context-loader/` directory
- [x] Create `SKILL.md` file

### Phase 2: Define Skill ✅
- [x] Document trigger conditions
- [x] Document actions to take
- [x] Document example output
- [x] Add error handling instructions

### Phase 3: Update Schema ✅
- [x] Add `context` field to config schema
- [x] Define `files` array
- [x] Define `autoLoad` boolean

### Phase 4: Documentation ✅
- [x] Document how skill works
- [x] Create example usage scenarios
- [x] Document error handling

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #19
- Created feature branch: issue/feature-19/context-loader-skill
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Create skill definition in `skills/context-loader/SKILL.md`

### 2024-11-16 - Context Loader Skill Implemented
**Actions:**
- Created `skills/context-loader/` directory
- Created `SKILL.md` skill definition (250+ lines)
- Updated `schemas/config.schema.json` with context field
- Comprehensive skill documentation

**Skill Features:**

1. **Auto-Invoke Triggers**
   - Session start (automatic)
   - User says "refresh context", "reload context", "load context"

2. **Config Integration**
   - Reads `context.files` array from config
   - Reads `context.autoLoad` boolean
   - Falls back to defaults if not configured

3. **Loading Behavior**
   - Loads files from `.claude/context/` directory
   - Parallel loading for efficiency
   - Graceful handling of missing files
   - Clear reporting of loaded files

4. **Error Handling**
   - No config → use defaults
   - Missing directory → helpful message
   - Missing files → skip with warning
   - Invalid config → fall back to defaults

5. **Reporting**
   - Shows which files loaded successfully
   - Shows which files were skipped
   - Counts loaded vs total
   - Provides helpful tips

**Schema Addition:**
Added `context` field to config schema:
```json
{
  "context": {
    "files": ["README.yml", "sessions.yml", "git.yml", "behavior.yml"],
    "autoLoad": true
  }
}
```

**Example Outputs:**

**Success:**
```
Context loaded:
✓ README.yml - Compact YAML reading guide
✓ sessions.yml - Session workflow
✓ git.yml - Git workflow rules
✓ behavior.yml - AI behavior preferences
✓ test.yml - Testing strategy
✓ project.yml - Project overview

Loaded 6 context files successfully.
```

**Missing Files:**
```
Context loaded:
✓ README.yml
✓ sessions.yml
✓ git.yml
✓ behavior.yml
⚠ test.yml - Not found
⚠ custom.yml - Not found

Loaded 4 of 6 context files.
```

**Benefits:**
- Automatic context loading at session start
- No manual "read these files" needed
- Configurable per project
- Graceful degradation
- Clear transparency

**Next:** Update session, commit implementation, create PR

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

### About Skills
- Skills are markdown definitions that instruct Claude on auto-invoke behavior
- Similar to commands, but triggered automatically vs explicit invocation
- Trigger conditions define when skill activates
- Actions define what Claude should do
- Examples clarify expected behavior

### About Auto-Invocation
- "Session start" trigger ensures context loaded before any interaction
- Manual triggers provide user control when needed
- Graceful fallbacks ensure skill works without config

### About Config Design
- Optional fields with good defaults = better UX
- `autoLoad: true` default means it "just works"
- Array of strings for `files` allows project customization
- Schema validates config structure

## Files Created

### Skills
- `skills/context-loader/SKILL.md` (250+ lines) - Complete skill definition

### Schema Updates
- `schemas/config.schema.json` - Added `context` field with `files` and `autoLoad` properties

## Next Steps

1. ✅ Create skills directory structure
2. ✅ Create SKILL.md definition
3. ✅ Update config schema
4. ✅ Add examples and documentation
5. ✅ Update session
6. Commit implementation
7. Create PR
