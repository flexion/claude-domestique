# Session: Issue #8 - Implement basic slash commands

## Issue Details
- **Issue Number**: #8
- **Title**: Implement basic slash commands
- **Created**: 2024-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/8

## Objective
Implement core slash commands (`/next`, `/create-session`, `/check`) that make the plugin immediately useful for session workflow management.

## Requirements

### Commands to Implement
1. **`/next`** - Show next steps from current session
2. **`/create-session`** - Create new session (supports chore and feature workflows)
3. **`/check`** - Show workflow checklist

### Command Definition Format
Commands are Markdown files that expand into prompts when invoked.

### Session Integration
Must work with both session types:
- Chore sessions: `chore-description.md`
- Feature sessions: `N-description.md`

## Technical Approach

### Command Structure
Each command is a Markdown file in `commands/` directory:
- Description of what the command does
- Usage instructions
- Implementation steps
- Examples

### Implementation Strategy
1. Start with `/next` (simplest, most useful)
2. Then `/create-session` (uses existing script)
3. Finally `/check` (displays checklists)

### Error Handling
Commands must handle:
- Missing session files
- Malformed session files
- Not on tracked branch
- Missing "Next Steps" section

## Implementation Plan

### Phase 1: `/next` Command
- [ ] Create `commands/next.md`
- [ ] Define command description and usage
- [ ] Specify implementation steps
- [ ] Add examples
- [ ] Test in claude-domestique

### Phase 2: `/create-session` Command
- [ ] Create `commands/create-session.md`
- [ ] Define branch type detection
- [ ] Specify template selection logic
- [ ] Document session file creation
- [ ] Add examples for both chore and feature
- [ ] Test in claude-domestique

### Phase 3: `/check` Command
- [ ] Create `commands/check.md`
- [ ] Define checklist extraction logic
- [ ] Specify work type detection
- [ ] Document checklist display
- [ ] Add examples
- [ ] Test in claude-domestique

### Phase 4: Documentation & Testing
- [ ] Update implementation plan
- [ ] Test all commands
- [ ] Prepare for simple-D365 testing
- [ ] Update GitHub issue

## Session Log

### 2024-11-16 - Session Created
- Created GitHub issue #8
- Created feature branch: issue/feature-8/basic-commands
- Initialized session file
- Ready to begin implementation

**Next:** Implement `/next` command

## Key Decisions

### Decision 1: Command Format (Markdown)
**Reason**: Consistent with Claude Code's command system
**Impact**: Easy to create, version control, and document
**Alternative**: JSON or YAML (more structured but less readable)

### Decision 2: Implementation Order
**Reason**: Start with simplest, most useful command first
**Impact**: Quick wins, iterative development
**Alternative**: Implement all at once (more complex, harder to test)

## Learnings

### About Command System
- Commands are Markdown files that expand into prompts
- Must provide clear implementation steps
- Examples are critical for usability

### About Session Workflow
- Two distinct session types (chore vs feature)
- Session detection relies on branch patterns
- Existing scripts handle heavy lifting

## Files Created

### Commands (To Be Created)
- `commands/next.md`
- `commands/create-session.md`
- `commands/check.md`

## Next Steps

1. Create `commands/` directory
2. Implement `/next` command
3. Test `/next` command
4. Implement `/create-session` command
5. Test `/create-session` command
6. Implement `/check` command
7. Test `/check` command
8. Update documentation
9. Update GitHub issue
10. Create PR
