# Session: Issue #10 - Implement plugin initialization command

## Issue Details
- **Issue Number**: #10
- **Title**: Implement plugin initialization command
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/10

## Objective
Implement the `/init` command to initialize projects for claude-domestique plugin usage, with auto-detection, config generation, and directory setup.

## Requirements

### Core Features
1. **Tech Stack Auto-Detection** - Detect Node.js, Java, Python, etc.
2. **Preset Selection** - Map tech stack to appropriate preset
3. **Config Generation** - Create `.claude/config.json` from preset
4. **Directory Setup** - Create `.claude/` structure
5. **Migration Support** - Preserve existing files
6. **Interactive/Non-Interactive** - Support both modes

### Tech Stacks to Support
- Node.js (with TypeScript/JavaScript detection)
- React (within Node.js projects)
- Java (with Spring Boot detection)
- Python, Ruby, Go, Rust (basic support)

## Technical Approach

### Implementation Strategy
Since `/init` is a command definition (not executable script), the approach is:
1. Define clear implementation steps
2. Specify detection logic
3. Document config generation process
4. Provide comprehensive examples

### Command Structure
The command will be a Markdown file that instructs Claude how to:
- Analyze the project
- Detect tech stack
- Select preset
- Generate config
- Create directories
- Validate result

## Implementation Plan

### Phase 1: Command Definition
- [ ] Create `commands/init.md`
- [ ] Define tech stack detection logic
- [ ] Specify preset selection rules
- [ ] Document config generation steps
- [ ] Add interactive mode examples
- [ ] Add non-interactive mode examples

### Phase 2: Helper Scripts (Optional)
- [ ] Consider `scripts/detect-tech-stack.sh`
- [ ] Consider `scripts/generate-config.sh`
- [ ] Or keep logic in command definition

### Phase 3: Testing
- [ ] Test command logic in simple-D365
- [ ] Test in client-frontend
- [ ] Test in client-backend
- [ ] Validate generated configs

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #10
- Created feature branch: issue/feature-10/plugin-init
- Initialized session file
- Ready to implement

**Next:** Implement `/init` command definition

### 2024-11-16 - `/init` Command Implemented
**Actions:**
- Created `commands/init.md` (545 lines)
- Defined comprehensive initialization workflow
- Implemented tech stack auto-detection logic
- Specified preset selection rules
- Documented config generation process
- Added interactive and non-interactive modes
- Included migration support for existing .claude/
- Comprehensive examples for all scenarios

**Command Features:**

1. **Tech Stack Detection** (6 languages)
   - Node.js (with TypeScript/React detection)
   - Java (with Spring Boot detection)
   - Python, Ruby, Go, Rust

2. **Preset Mapping**
   - Node + TypeScript + React → react-typescript
   - Node + TypeScript → typescript-node
   - Java + Spring → java-spring
   - Fallback: User selection

3. **Config Generation**
   - Reads preset file
   - Merges with detected values
   - Validates result
   - Handles unsupported stacks

4. **Directory Setup**
   - Creates .claude/ structure
   - Preserves existing files (migration)
   - Optional context/ and templates/

5. **Modes**
   - Interactive (default): Prompts and confirmations
   - Non-interactive (--yes): No prompts
   - Force (--force): Overwrite existing config

6. **Error Handling**
   - Unsupported project types
   - Preset not found
   - Validation failures
   - Not in git repo

**Examples Provided:**
- New React project
- Migration scenario
- Non-interactive mode
- Java Spring Boot project

**Implementation Quality:**
- 545 lines of detailed documentation
- Step-by-step implementation guide
- Comprehensive error handling
- Clear user experience design

**Next:** Commit implementation and create PR

### 2024-11-16 - Naming Conflict Resolved
**Issue:** User identified that `/init` conflicts with Claude Code's built-in `/init` command
- Built-in `/init`: "Initialize project with CLAUDE.md guide"
- Conflict would prevent plugin command from working

**Resolution:**
- Renamed command from `/init` to `/plugin-init`
- Updated all references in command file (566 lines)
- New command name clearly indicates plugin-specific initialization
- Avoids confusion with built-in command

**Actions:**
- Renamed `commands/init.md` → `commands/plugin-init.md`
- Updated all 10+ references within file
- Command now: `/plugin-init [options]`

**Next:** Update session, commit implementation, create PR

## Key Decisions

### Decision 1: Command vs Script
**Reason**: `/init` is a command definition (Markdown), not executable script
**Impact**: Claude interprets and executes the steps, not a shell script
**Alternative**: Could create shell script, but less flexible

### Decision 2: Detection Approach
**Reason**: File-based detection (package.json, build.gradle, etc.)
**Impact**: Reliable across different environments
**Alternative**: Runtime detection (node --version), but less portable

### Decision 3: Command Naming (`/plugin-init` vs `/init`)
**Reason**: Claude Code has built-in `/init` command that initializes CLAUDE.md
**Impact**: `/plugin-init` clearly indicates plugin-specific functionality, avoids conflict
**Alternative**: Could have tried to override, but would be confusing and potentially break existing workflows

## Learnings

### About Initialization
- Must handle both new projects and migrations
- Auto-detection reduces user burden
- Clear output builds trust

## Files Created

### Commands
- `commands/plugin-init.md` (566 lines)

### Scripts (Not needed)
- Tech stack detection logic embedded in command
- Config generation logic embedded in command
- No separate scripts required

## Next Steps

1. ✅ Create `/plugin-init` command definition
2. ✅ Define tech stack detection logic (6 languages)
3. ✅ Specify config generation process
4. ✅ Add examples for all modes (4 comprehensive examples)
5. ✅ Resolve naming conflict with built-in `/init`
6. Commit implementation
7. Create PR
8. Test in target projects (simple-D365, client-frontend, client-backend)
