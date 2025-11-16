# Session Update Prompter Skill

## Description
Proactively prompts AI to suggest session file updates after implementation milestones, helping maintain context and prevent drift. This is a **soft nudge** (not a blocker like the pre-commit hook) that encourages documentation during natural breakpoints.

## Trigger Conditions

This skill auto-invokes when:

1. **After Implementation Milestone** - When completing significant work:
   - Feature implementation finished
   - Major refactoring completed
   - Bug fix resolved
   - Component/module finished
   - Architecture decision made
   - Integration testing completed

2. **Before Commit Preparation** - When user signals readiness to commit:
   - User says "create commit", "commit this", "ready to commit"
   - User says "create PR", "ready for PR"
   - User says "done with this feature"

3. **After Resolving Blocker** - When overcoming obstacles:
   - Error/bug finally resolved after troubleshooting
   - Complex problem solved
   - Workaround discovered

4. **Explicit Request** - When user asks:
   - "update session"
   - "should I update the session?"
   - "what should I document?"

## Actions

When triggered, perform the following steps:

### Step 1: Detect Current Session

1. Run `git branch --show-current` to get branch name
2. Sanitize branch name (replace `/` with `-`)
3. Check if `.claude/branches/<sanitized-branch>` exists
4. If no metadata: skip (main branch, no session tracking needed)
5. Extract session file path from metadata (`session:` field)
6. Confirm session file exists at `.claude/sessions/<session-file>`

### Step 2: Analyze What to Document

Review recent conversation and determine what should be documented:

**Key Decisions:**
- Architecture choices made
- Library/framework selections
- Approach chosen (and alternatives considered)
- Trade-offs evaluated

**Learnings:**
- Errors encountered and how resolved
- Unexpected behaviors discovered
- Gotchas or edge cases found
- Performance insights
- Tool-specific quirks

**Work Completed:**
- Features implemented
- Components created
- Tests written
- Files modified/created

**Context Changes:**
- Requirements clarified
- Scope adjusted
- Blockers overcome
- Dependencies discovered

### Step 3: Generate Suggestion Prompt

Create a helpful prompt suggesting what to document. Use this format:

```
Session update suggested:

Recent work completed:
- [Feature X implemented / Bug Y fixed / etc.]
- [Key accomplishment]

Consider documenting:
1. Key decision: [What decision was made and why]
2. Learning: [What was discovered/learned]
3. Files created: [Major files added]

Update session file: .claude/sessions/<session-file>

Sections to update:
- Session Log (add entry for today's work)
- Key Decisions (document architectural/approach choices)
- Learnings (capture errors, gotchas, insights)
- Files Created (list new files with descriptions)
- Next Steps (update what's remaining)

Would you like me to help update the session file?
```

### Step 4: Offer Assistance

After prompting, offer to help with the update:

- **Option 1**: AI can draft session update for user review
- **Option 2**: User will update manually
- **Option 3**: User wants to defer (remind before commit)

If user chooses Option 1, draft the session update based on recent conversation.

## Frequency & Timing

**Invoke timing:**
- **After milestones**: Immediately when significant work completed
- **Before commits**: When commit/PR language detected
- **Not too often**: Don't prompt after every trivial change

**Throttling:**
- Max once per 30 minutes (avoid over-prompting)
- Skip if session updated in last 15 minutes
- Skip for trivial changes (typo fixes, formatting)

**Smart detection:**
- Prompt after 3-5 tool uses implementing a feature
- Prompt after error resolution that took >5 interactions
- Prompt when files created/modified align with session scope

## Session Update Template

When drafting updates, use this structure:

```markdown
### YYYY-MM-DD - [Milestone Description]
- [What was completed]
- [Key implementation details]
- [Files created/modified]
- [Testing performed]
- [Issues encountered and resolved]

**Next**: [What comes after this milestone]
```

**Key Decisions format:**
```markdown
### Decision N: [Short Title]
**Reason**: [Why this decision was made]
**Impact**: [How this affects the project]
**Alternative**: [What else was considered and why rejected]
```

**Learnings format:**
```markdown
### Learning N: [Short Title]
- [What was discovered]
- [How it was resolved]
- [How to avoid/handle in future]
```

## Examples

### Example 1: After Feature Implementation

**Context**: AI just finished implementing user authentication feature

```
Session update suggested:

Recent work completed:
- Implemented user authentication with JWT tokens
- Created login/logout endpoints
- Added middleware for protected routes

Consider documenting:
1. Key decision: Chose JWT over session cookies (stateless, better for API)
2. Learning: bcrypt rounds set to 10 (balance security/performance)
3. Files created: auth/jwt.ts, middleware/auth.ts, routes/auth.ts

Update session file: .claude/sessions/15-user-authentication.md

Sections to update:
- Session Log (add entry for authentication implementation)
- Key Decisions (document JWT choice)
- Learnings (document bcrypt configuration)
- Files Created (list auth-related files)
- Next Steps (update to reflect auth complete, move to authorization)

Would you like me to help update the session file?
```

### Example 2: Before Creating Commit

**User**: "Ready to commit this"

**Context**: AI implemented caching layer

```
Before committing, consider updating session file:

Work completed in this commit:
- Redis caching layer for API responses
- Cache invalidation on data updates
- Performance improvement (200ms → 50ms avg response time)

Document before committing:
1. Decision: Redis over in-memory cache (shared across instances)
2. Learning: TTL set to 5 minutes (balance freshness/performance)
3. Performance metrics: 75% reduction in database queries

Update: .claude/sessions/22-performance-optimization.md

This ensures your session stays in sync with your commits.
Would you like me to draft the session update?
```

### Example 3: After Resolving Blocker

**Context**: AI spent 10 interactions debugging CORS issue, finally resolved

```
Session update suggested:

Blocker resolved:
- CORS errors preventing frontend-backend communication
- Root cause: Missing credentials option in fetch requests
- Solution: Added `credentials: 'include'` to all API calls

This took significant troubleshooting. Consider documenting:
1. Learning: CORS with credentials requires explicit configuration
2. Learning: Browser doesn't send cookies without credentials flag
3. Error pattern: CORS errors can mask authentication issues

Update session: .claude/sessions/18-frontend-integration.md

Section: Learnings
Add entry about CORS debugging to help future work.

Would you like me to add this to the session file?
```

### Example 4: User Asks What to Document

**User**: "what should I document?"

**Context**: Just completed database migration

```
Based on recent work, here's what to document:

Session: .claude/sessions/25-database-migration.md

1. Session Log entry:
   - Completed migration from SQLite to PostgreSQL
   - Migrated all tables and data (no data loss)
   - Updated connection pooling configuration

2. Key Decision:
   - Used pgpool for connection pooling
   - Reason: Better performance with concurrent connections
   - Alternative: Direct connections (simpler but less scalable)

3. Learnings:
   - PostgreSQL requires explicit type casting in some queries
   - Migration script needed transaction wrapping for atomicity
   - Connection pool size: 20 (optimal for current load)

4. Files Created:
   - db/migrate-to-postgres.sql (migration script)
   - config/database-postgres.ts (new connection config)
   - scripts/verify-migration.sh (data verification)

5. Next Steps:
   - Update to reflect migration complete
   - Add: Monitor query performance in production

Would you like me to update the session file with these entries?
```

## Configuration

No configuration needed. This skill is always active for sessions with branch metadata.

## Error Handling

### No Session File Found
**Scenario**: Branch has no metadata

**Action**:
- Skip prompting (main branch, hotfix branches)
- Don't report error
- Silently continue

### Session File Missing
**Scenario**: Metadata references non-existent session file

**Action**:
- Report: "Session file not found: .claude/sessions/<file>"
- Suggest: "Create session file or update branch metadata"
- Don't block work

### Recent Update
**Scenario**: Session updated in last 15 minutes

**Action**:
- Skip prompting (avoid over-prompting)
- Silently continue

## Integration

**Works with:**
- Branch metadata system (Phase 1)
- Session files (.claude/sessions/)
- Pre-commit hook (complementary enforcement)
- Git workflow

**Benefits:**
- **Proactive**: Reminds to document before committing
- **Helpful**: Suggests what to document based on work done
- **Non-blocking**: Soft nudge, not hard enforcement
- **Contextual**: Analyzes recent work to provide relevant suggestions
- **Timely**: Prompts at natural breakpoints (milestones, commits)

## Notes

- This is a **soft nudge**, not enforcement (hook does hard enforcement)
- Helps maintain session files during work, not just at commit time
- Reduces "oh, I forgot to update the session" moments
- Makes session updates feel natural and helpful, not bureaucratic
- Encourages documentation when context is fresh in mind
- Complements pre-commit hook (prompt during work, enforce at commit)
