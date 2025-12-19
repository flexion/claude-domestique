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

### Phase 1: Basic Config Reading ✅
- [x] Create `scripts/read-config.sh`
- [x] Implement `load_config()` function
- [x] Add error handling for missing config
- [x] Test with standalone config (no extends)

### Phase 2: Preset Merging ✅
- [x] Implement `load_preset()` function
- [x] Implement `merge_configs()` using jq
- [x] Handle relative paths to preset files
- [x] Test with all three presets

### Phase 3: Value Extraction ✅
- [x] Implement `get_value()` for JSON path queries
- [x] Support nested paths (e.g., `vcs.git.defaultBranch`)
- [x] Return appropriate exit codes
- [x] Test extraction of various values

### Phase 4: Validation & Error Handling ✅
- [x] Integrate with existing `validate-config.sh`
- [x] Add `--validate` flag
- [x] Error handling for:
  - Missing config file
  - Invalid JSON
  - Missing preset file
  - Invalid JSON path
- [x] Clear, actionable error messages

### Phase 5: Testing ✅
- [x] Test with typescript-node preset
- [x] Test with react-typescript preset
- [x] Test with java-spring preset
- [x] Test value extraction for all common paths
- [x] Test error scenarios
- [x] Shellcheck validation
- [x] Update session and commit

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #12
- Created feature branch: issue/feature-12/config-reader
- Created branch metadata
- Initialized session file
- Ready to implement

**Next:** Implement `scripts/read-config.sh`

### 2024-11-16 - Config Reader Implemented
**Actions:**
- Created `scripts/read-config.sh` (222 lines)
- Implemented all core features:
  - Config loading with JSON syntax validation
  - Preset loading with extends support
  - Deep merge using jq (project overrides preset)
  - Value extraction by dot-notation JSON path
  - Validation integration with validate-config.sh
- Added comprehensive error handling:
  - Missing config file
  - Invalid JSON syntax
  - Missing preset file
  - Invalid JSON path
- Colorized output (errors in red, warnings in yellow, success in green)
- Help flag with usage examples

**Implementation Features:**

1. **Config Loading**
   - Reads `.claude/config.json` or custom path via --config flag
   - Validates JSON syntax with jq
   - Clear error messages for missing/invalid files

2. **Preset Merging**
   - Detects `extends` field in config
   - Resolves relative paths from config directory
   - Deep merge: `preset * project_config` (project wins)
   - Removes `$schema` and `extends` from final output

3. **Value Extraction**
   - Dot notation: `runtime.type`, `vcs.git.defaultBranch`
   - Nested path support
   - Returns specific value or full merged config
   - Error on invalid path

4. **Validation**
   - `--validate` flag runs existing validate-config.sh
   - Validates merged config (not just source files)
   - Integrates with existing validation tooling

5. **Usage Modes**
   - No args: Output full merged config as JSON
   - With path: Extract specific value
   - --validate: Validate only, no output
   - --help: Show usage and examples

**Testing Results:**
- ✅ typescript-node preset (simple-d365-config.json)
- ✅ react-typescript preset (portal-d365-webapp-config.json)
- ✅ java-spring preset (portal-d365-config.json)
- ✅ Standalone presets (no extends field)
- ✅ Value extraction (runtime.type, vcs.git.defaultBranch, test.framework)
- ✅ Error scenarios (missing file, invalid path)
- ✅ Validation integration
- ✅ Help output
- ✅ Shellcheck clean

**Example Usage:**
```bash
# Get merged config
./scripts/read-config.sh

# Get specific value
./scripts/read-config.sh runtime.type  # → "node"

# Validate
./scripts/read-config.sh --validate

# Custom config path
CONFIG_PATH=test-configs/simple-d365-config.json ./scripts/read-config.sh runtime.type
```

**Next:** Update session, commit implementation, create PR

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

### About Config Merging
- jq's `*` operator does deep merge by default
- Need bracket notation for fields starting with `$`: `.["$schema"]`
- Process substitution `<(echo "$json")` works well with jq -s for merging
- Relative paths must be resolved from config directory, not cwd

### About Shell Scripting
- Shellcheck warning SC2155: Declare and assign separately to avoid masking return values
- Color codes work well for error/warning/success output
- `set -euo pipefail` ensures script fails on errors

### About Testing
- Testing with real configs (test-configs/) validates actual use cases
- Error scenario testing is critical for good UX
- Shellcheck catches subtle bugs before runtime

## Files Created

### Scripts
- `scripts/read-config.sh` (222 lines)

## Next Steps

1. ✅ Implement basic config loading
2. ✅ Add preset merging logic
3. ✅ Implement value extraction
4. ✅ Add validation integration
5. ✅ Test with all presets
6. ✅ Update session
7. Commit implementation
8. Create PR
