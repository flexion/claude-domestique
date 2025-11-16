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
- [ ] Test in Portal-D365-WebApp
- [ ] Test in portal-D365
- [ ] Validate generated configs

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #10
- Created feature branch: issue/feature-10/plugin-init
- Initialized session file
- Ready to implement

**Next:** Implement `/init` command definition

## Key Decisions

### Decision 1: Command vs Script
**Reason**: `/init` is a command definition (Markdown), not executable script
**Impact**: Claude interprets and executes the steps, not a shell script
**Alternative**: Could create shell script, but less flexible

### Decision 2: Detection Approach
**Reason**: File-based detection (package.json, build.gradle, etc.)
**Impact**: Reliable across different environments
**Alternative**: Runtime detection (node --version), but less portable

## Learnings

### About Initialization
- Must handle both new projects and migrations
- Auto-detection reduces user burden
- Clear output builds trust

## Files Created

### Commands (To Create)
- `commands/init.md`

### Scripts (Maybe)
- `scripts/detect-tech-stack.sh` (if needed)
- `scripts/generate-config.sh` (if needed)

## Next Steps

1. Create `commands/init.md`
2. Define tech stack detection logic
3. Specify config generation process
4. Add examples for all modes
5. Test in target projects
6. Update session and commit
7. Create PR
