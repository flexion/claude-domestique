# Session: Issue #12 - Implement config reader utility

## Issue Details
- **Issue Number**: #12
- **Title**: Implement config reader utility
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/12

## Objective
Create a universal configuration reader utility that loads, merges, and validates project configurations with preset files.

## Requirements

### Core Features
1. **Config Loading** - Read `.claude/config.json`
2. **Preset Merging** - Load and merge preset files when config uses `extends`
3. **Value Extraction** - Get specific config values by path
4. **Validation** - Ensure config is valid before use
5. **Error Handling** - Clear errors for missing files, invalid JSON, missing presets

### Use Cases
- Scripts need to read test commands, branch patterns, commit formats
- `/check` command needs tech-specific checklists
- Test runner needs verification commands
- Git hooks need pre-commit commands

## Technical Approach

### Script: `scripts/read-config.sh`

**Usage Examples:**
```bash
# Read entire merged config
./scripts/read-config.sh

# Get specific value
./scripts/read-config.sh runtime.type
./scripts/read-config.sh vcs.git.defaultBranch
./scripts/read-config.sh quality.test.command

# Validate only
./scripts/read-config.sh --validate
```

**Merge Strategy:**
1. Check if config has `extends` field
2. If yes, load preset file from `presets/` directory
3. Deep merge: project config overrides preset defaults
4. Project-specific values (name, runtime.version) always win

**Example Merge:**
- Preset defines: `runtime.type = "node"`, `runtime.version = "18.x"`
- Project defines: `runtime.version = "20.x"`
- Result: `runtime.type = "node"`, `runtime.version = "20.x"`

### Functions
- `load_config()` - Read and parse `.claude/config.json`
- `load_preset()` - Read preset file if referenced
- `merge_configs()` - Deep merge using jq
- `get_value()` - Extract value by JSON path
- `validate_config()` - Use existing `validate-config.sh`

## Implementation Plan

### Phase 1: Basic Config Reading
- [ ] Create `scripts/read-config.sh`
- [ ] Implement `load_config()` function
- [ ] Add error handling for missing config
- [ ] Test with standalone config (no extends)

### Phase 2: Preset Merging
- [ ] Implement `load_preset()` function
- [ ] Implement `merge_configs()` using jq
- [ ] Handle relative paths to preset files
- [ ] Test with all three presets

### Phase 3: Value Extraction
- [ ] Implement `get_value()` for JSON path queries
- [ ] Support nested paths (e.g., `vcs.git.defaultBranch`)
- [ ] Return appropriate exit codes
- [ ] Test extraction of various values

### Phase 4: Validation & Error Handling
- [ ] Integrate with existing `validate-config.sh`
- [ ] Add `--validate` flag
- [ ] Error handling for:
  - Missing config file
  - Invalid JSON
  - Missing preset file
  - Invalid JSON path
- [ ] Clear, actionable error messages

### Phase 5: Testing
- [ ] Test with typescript-node preset
- [ ] Test with react-typescript preset
- [ ] Test with java-spring preset
- [ ] Test value extraction for all common paths
- [ ] Test error scenarios
- [ ] Update session and commit

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #12
- Created feature branch: issue/feature-12/config-reader
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Implement `scripts/read-config.sh`

## Key Decisions

### Decision 1: Merge Strategy
**Reason**: Use jq for deep merging of JSON objects
**Impact**: Clean, reliable merge without manual recursion
**Alternative**: Manual bash parsing, but complex and error-prone

### Decision 2: Path Syntax
**Reason**: Use dot notation for JSON paths (e.g., `runtime.type`)
**Impact**: Familiar to developers, supported by jq
**Alternative**: Slash notation, but less common

## Learnings

(To be filled as implementation progresses)

## Files Created

### Scripts (To Create)
- `scripts/read-config.sh`

## Next Steps

1. Implement basic config loading
2. Add preset merging logic
3. Implement value extraction
4. Add validation integration
5. Test with all presets
6. Update session and commit
7. Create PR
