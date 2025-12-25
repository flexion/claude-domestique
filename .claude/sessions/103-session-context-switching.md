# Session: Reliable Session Recording and Context Switching

**Issue**: #103
**Branch**: issue/feature-103/session-context-switching
**Type**: feature
**Created**: 2025-12-25
**Status**: complete

## Goal

Enhance memento to provide reliable session recording and intelligent context switching, making session management automatic and friction-free.

## Acceptance Criteria

### 1. New Work Item / Chore Creation Workflow
- [x] Ask if this is a work item or chore
- [x] Work item: require work item identifier
  - [x] If user doesn't know the ID, query the repository to provide suggestions
  - [x] Support searching by title, label, or recent activity
- [x] Create new branch with correct format (`issue/feature-N/desc`)
- [x] Start a new session
- [x] Prime session file with template and known information from user input or work item

### 2. Branch Switch Detection
- [x] Assume a work context switch on branch change
- [x] Look for existing session file based on branch name
- [x] If session file not found:
  - [x] Ask: use existing file or create new?
  - [x] If user provides a valid file that could not be found due to misnamed, rename it
  - [x] If no session exists, create and populate a new one

### 3. Regular Session Population Triggers
- [x] Todos completed
- [x] Change in todos (updates, deletions)
- [x] Initial design documented
- [x] Design changes
- [x] Requirements added or changed
- [x] Context checkpoints (context approaching compaction threshold)

## Approach

### Phase 1: Branch Switch Detection (foundation)
Modify `onUserPromptSubmit` in `memento/hooks/session-startup.js` to:
- Compare current branch against saved state
- When branch changed: check for existing session, find possible misnamed sessions
- Inject context guiding Claude to read/create/rename sessions

### Phase 2: Start Work Command
Create `memento/commands/start.md` with interactive workflow:
- Ask work item vs chore
- Work item: get ID (help search via `gh issue list`), fetch details, create branch + session
- Chore: get description, create branch + session

### Phase 3: Session Population Triggers
Detect events in `onUserPromptSubmit`:
- TodoWrite usage → remind to update Session Log
- ExitPlanMode → **immediately update Approach section with plan**
- Context > 80% → checkpoint reminder

### Phase 4: Misnamed File Handling
Extend Phase 1 to detect sessions that reference current branch but have wrong filename; offer to rename.

### Implementation Order
1. Phase 1 (branch switch) → 2. Phase 4 (mismatch) → 3. Phase 2 (start command) → 4. Phase 3 (triggers)

## Session Log

- 2025-12-25: Session created, issue #103 opened
- 2025-12-25: Plan approved - context injection approach, 4 phases identified
- 2025-12-25: Implementation complete - all 4 phases implemented with 31 tests passing
- 2025-12-25: Documentation updated - context, rules, and README files
- 2025-12-25: Version bumped to 0.3.0, session finalized for PR

## Key Decisions

- **Context injection over blocking prompts**: Claude receives guidance naturally, no forced interrupts
- **Loose coupling**: memento tracks branches independently, optionally uses onus cache

## Learnings

- Branch switch detection can reuse existing state management from shared module
- Mismatch detection by searching session file content for branch references works well
- Session population triggers need hook input metadata (toolsUsed, contextUsage) which may need Claude Code support

## Files Changed

- `memento/hooks/session-startup.js` - Added branch switch detection, mismatch detection, session triggers
- `memento/hooks/__tests__/session-startup.test.js` - Added 20 new tests for new functionality (31 total)
- `memento/commands/start.md` - New command for starting work with branch+session creation
- `memento/context/sessions.md` - Updated with new features and completion workflow
- `memento/rules/sessions.md` - Added compact rules for new features and completion before PR
- `memento/README.md` - Updated with new commands and features
- `memento/package.json`, `memento/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` - Version bump to 0.3.0

## Next Steps

- [x] Phase 1: Implement branch switch detection in `onUserPromptSubmit`
- [x] Phase 4: Add misnamed file handling
- [x] Phase 2: Create `/memento:start` command
- [x] Phase 3: Implement session population triggers
- [x] Add tests for new functionality
- [x] Update documentation (context, rules, README)
- [x] Add completion workflow to session rules
- [x] Finalize session file
- [ ] Push changes and create PR
