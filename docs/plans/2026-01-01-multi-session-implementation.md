# Multi-Session Work Items Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable multiple sessions (phases/slices) per work item, breaking the 1:1 issue-session constraint.

**Architecture:** Add phase/slice metadata to session files, enhance `/memento:start` to detect existing sessions and prompt for relationship type, extend `/onus:status` to show aggregated view across sessions.

**Tech Stack:** Node.js, Jest for testing, YAML frontmatter parsing, existing shared module patterns.

**Design Doc:** `docs/plans/2026-01-01-multi-session-work-items-design.md`

---

## Phase 1: Data Model

### Task 1.1: Add Phase/Slice Branch Parsing to Shared Module

**Files:**
- Modify: `shared/index.js`
- Create: `shared/__tests__/phase-parsing.test.js`

**Step 1: Write the failing test**

```javascript
// shared/__tests__/phase-parsing.test.js
const { parsePhaseFromBranch } = require('../index');

describe('parsePhaseFromBranch', () => {
  test('parses phase-only branch', () => {
    const result = parsePhaseFromBranch('issue/feature-42-p1/interfaces');
    expect(result).toEqual({
      issueNumber: '42',
      issueType: 'feature',
      phase: 1,
      slice: null,
      description: 'interfaces'
    });
  });

  test('parses phase with slice', () => {
    const result = parsePhaseFromBranch('issue/feature-42-p2a/backend-auth');
    expect(result).toEqual({
      issueNumber: '42',
      issueType: 'feature',
      phase: 2,
      slice: 'a',
      description: 'backend-auth'
    });
  });

  test('returns null for non-phased branch', () => {
    const result = parsePhaseFromBranch('issue/feature-42/auth');
    expect(result).toBeNull();
  });

  test('parses chore with phase', () => {
    const result = parsePhaseFromBranch('chore-p1/setup-ci');
    expect(result).toEqual({
      issueNumber: null,
      issueType: 'chore',
      phase: 1,
      slice: null,
      description: 'setup-ci'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- phase-parsing.test.js`
Expected: FAIL with "parsePhaseFromBranch is not a function"

**Step 3: Write minimal implementation**

Add to `shared/index.js`:

```javascript
/**
 * Parse phase/slice information from branch name
 * Patterns:
 *   issue/<type>-<N>-p<phase>/desc
 *   issue/<type>-<N>-p<phase><slice>/desc
 *   chore-p<phase>/desc
 * @param {string} branch - Branch name
 * @returns {object|null} Parsed phase info or null if not a phased branch
 */
function parsePhaseFromBranch(branch) {
  // Issue with phase: issue/feature-42-p1/desc or issue/feature-42-p2a/desc
  const issuePhaseMatch = branch.match(
    /^issue\/(\w+)-(\d+)-p(\d+)([a-z])?\/(.+)$/
  );
  if (issuePhaseMatch) {
    return {
      issueNumber: issuePhaseMatch[2],
      issueType: issuePhaseMatch[1],
      phase: parseInt(issuePhaseMatch[3], 10),
      slice: issuePhaseMatch[4] || null,
      description: issuePhaseMatch[5]
    };
  }

  // Chore with phase: chore-p1/desc
  const chorePhaseMatch = branch.match(/^chore-p(\d+)([a-z])?\/(.+)$/);
  if (chorePhaseMatch) {
    return {
      issueNumber: null,
      issueType: 'chore',
      phase: parseInt(chorePhaseMatch[1], 10),
      slice: chorePhaseMatch[2] || null,
      description: chorePhaseMatch[3]
    };
  }

  return null;
}

// Add to module.exports
module.exports = {
  // ... existing exports
  parsePhaseFromBranch
};
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- phase-parsing.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/index.js shared/__tests__/phase-parsing.test.js
git commit -m "chore - add phase/slice parsing to shared module"
```

---

### Task 1.2: Add Session Discovery by Issue Number

**Files:**
- Modify: `shared/index.js`
- Modify: `shared/__tests__/phase-parsing.test.js`

**Step 1: Write the failing test**

Add to `shared/__tests__/phase-parsing.test.js`:

```javascript
const { findSessionsForIssue } = require('../index');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('findSessionsForIssue', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessions-test-'));
    const sessionsDir = path.join(tempDir, '.claude', 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('finds all sessions for an issue', () => {
    const sessionsDir = path.join(tempDir, '.claude', 'sessions');

    // Create test session files
    fs.writeFileSync(path.join(sessionsDir, 'issue-feature-42-p1-interfaces.md'), `# Session
## Details
- **Issue**: #42
- **Phase**: 1
- **Status**: complete
`);
    fs.writeFileSync(path.join(sessionsDir, 'issue-feature-42-p2a-backend.md'), `# Session
## Details
- **Issue**: #42
- **Phase**: 2
- **Slice**: a
- **Status**: in-progress
`);
    fs.writeFileSync(path.join(sessionsDir, 'issue-feature-99-p1-other.md'), `# Session
## Details
- **Issue**: #99
- **Phase**: 1
`);

    const result = findSessionsForIssue(tempDir, '42');

    expect(result).toHaveLength(2);
    expect(result[0].phase).toBe(1);
    expect(result[0].status).toBe('complete');
    expect(result[1].phase).toBe(2);
    expect(result[1].slice).toBe('a');
  });

  test('returns empty array when no sessions exist', () => {
    const result = findSessionsForIssue(tempDir, '999');
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- phase-parsing.test.js`
Expected: FAIL with "findSessionsForIssue is not a function"

**Step 3: Write minimal implementation**

Add to `shared/index.js`:

```javascript
/**
 * Find all sessions for a given issue number
 * @param {string} gitRoot - Git repository root
 * @param {string} issueNumber - Issue number to find sessions for
 * @returns {Array} Array of session metadata objects sorted by phase/slice
 */
function findSessionsForIssue(gitRoot, issueNumber) {
  const sessionsDir = path.join(gitRoot, '.claude', 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const sessions = [];
  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8');

    // Extract issue number from content
    const issueMatch = content.match(/\*\*Issue\*\*:\s*#?(\d+)/);
    if (!issueMatch || issueMatch[1] !== issueNumber) {
      continue;
    }

    // Extract metadata
    const phaseMatch = content.match(/\*\*Phase\*\*:\s*(\d+)/);
    const sliceMatch = content.match(/\*\*Slice\*\*:\s*([a-z])/);
    const statusMatch = content.match(/\*\*Status\*\*:\s*(\S+)/);
    const branchMatch = content.match(/\*\*Branch\*\*:\s*(\S+)/);

    sessions.push({
      file,
      filePath: path.join(sessionsDir, file),
      issue: issueNumber,
      phase: phaseMatch ? parseInt(phaseMatch[1], 10) : 1,
      slice: sliceMatch ? sliceMatch[1] : null,
      status: statusMatch ? statusMatch[1] : 'unknown',
      branch: branchMatch ? branchMatch[1] : null
    });
  }

  // Sort by phase, then slice
  return sessions.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    if (!a.slice && !b.slice) return 0;
    if (!a.slice) return -1;
    if (!b.slice) return 1;
    return a.slice.localeCompare(b.slice);
  });
}

// Add to module.exports
module.exports = {
  // ... existing exports
  parsePhaseFromBranch,
  findSessionsForIssue
};
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- phase-parsing.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/index.js shared/__tests__/phase-parsing.test.js
git commit -m "chore - add session discovery by issue number"
```

---

### Task 1.3: Update Session Templates with New Fields

**Files:**
- Modify: `memento/templates/feature.md`
- Modify: `memento/templates/fix.md`
- Modify: `memento/templates/chore.md`

**Step 1: Read current templates**

Review existing templates to understand structure.

**Step 2: Update feature.md template**

```markdown
# Session: {{description}}

## Details
- **Branch**: {{branch}}
- **Issue**: {{issueId}}
- **Type**: {{type}}
- **Phase**: {{phase}}
- **Slice**: {{slice}}
- **Status**: {{status}}
- **Created**: {{date}}
- **Depends-on**: {{dependsOn}}

## Goal
{{goal}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Approach
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Session Log

### {{date}} - Session Started
- Created branch and session file
- Issue: {{issueTitle}}

## Key Decisions
[Record important decisions made during this session]

## Files Changed
- [List modified files]

## Next Steps
1. [First task]
```

**Step 3: Update fix.md template**

```markdown
# Session: {{description}}

## Details
- **Branch**: {{branch}}
- **Issue**: {{issueId}}
- **Type**: {{type}}
- **Phase**: {{phase}}
- **Slice**: {{slice}}
- **Status**: {{status}}
- **Created**: {{date}}
- **Depends-on**: {{dependsOn}}

## Problem
{{problem}}

## Root Cause
[Analysis of why this bug exists]

## Fix Approach
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Session Log

### {{date}} - Session Started
- Created branch and session file
- Issue: {{issueTitle}}

## Files Changed
- [List modified files]

## Next Steps
1. [First task]
```

**Step 4: Update chore.md template**

```markdown
# Session: {{description}}

## Details
- **Branch**: {{branch}}
- **Type**: {{type}}
- **Phase**: {{phase}}
- **Slice**: {{slice}}
- **Status**: {{status}}
- **Created**: {{date}}
- **Depends-on**: {{dependsOn}}

## Goal
{{goal}}

## Approach
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Session Log

### {{date}} - Session Started
- Created branch and session file

## Notes
[Any relevant notes or observations]

## Files Changed
- [List modified files]

## Next Steps
1. [First task]
```

**Step 5: Commit**

```bash
git add memento/templates/*.md
git commit -m "chore - add phase/slice/depends-on fields to session templates"
```

---

### Task 1.4: Rebuild Shared Module Bundle

**Files:**
- Modify: `memento/lib/shared.js`
- Modify: `onus/lib/shared.js`

**Step 1: Run build script**

```bash
npm run build
```

**Step 2: Verify bundles are updated**

Check that `memento/lib/shared.js` and `onus/lib/shared.js` contain the new functions.

**Step 3: Run all tests**

```bash
cd memento && npm test
cd ../onus && npm test
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add memento/lib/shared.js onus/lib/shared.js
git commit -m "chore - rebuild shared bundles with phase parsing"
```

---

## Phase 2: Memento Workflow

### Task 2.1: Add Session Discovery to session-startup.js

**Files:**
- Modify: `memento/hooks/session-startup.js`
- Modify: `memento/hooks/__tests__/session-startup.test.js`

**Step 1: Write the failing test**

Add to `memento/hooks/__tests__/session-startup.test.js`:

```javascript
describe('getExistingSessionsForIssue', () => {
  test('returns sessions for issue from current directory', () => {
    // Create temp sessions
    const sessionsDir = path.join(tempGitRoot, '.claude', 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });

    fs.writeFileSync(path.join(sessionsDir, 'issue-feature-42-p1-setup.md'), `
## Details
- **Issue**: #42
- **Phase**: 1
- **Status**: complete
- **Branch**: issue/feature-42-p1/setup
`);

    const { getExistingSessionsForIssue } = require('../session-startup');
    const sessions = getExistingSessionsForIssue(tempGitRoot, '42');

    expect(sessions).toHaveLength(1);
    expect(sessions[0].phase).toBe(1);
    expect(sessions[0].status).toBe('complete');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd memento && npm test -- session-startup.test.js`
Expected: FAIL

**Step 3: Write minimal implementation**

Add to `memento/hooks/session-startup.js`:

```javascript
const shared = require('../lib/shared');

/**
 * Get all existing sessions for a given issue
 * @param {string} gitRoot - Git repository root
 * @param {string} issueNumber - Issue number
 * @returns {Array} Sorted array of session metadata
 */
function getExistingSessionsForIssue(gitRoot, issueNumber) {
  return shared.findSessionsForIssue(gitRoot, issueNumber);
}

module.exports = {
  // ... existing exports
  getExistingSessionsForIssue
};
```

**Step 4: Run test to verify it passes**

Run: `cd memento && npm test -- session-startup.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add memento/hooks/session-startup.js memento/hooks/__tests__/session-startup.test.js
git commit -m "chore - add session discovery to memento hooks"
```

---

### Task 2.2: Update /memento:start Command Spec

**Files:**
- Modify: `memento/commands/start.md`

**Step 1: Read current command spec**

Review existing `/memento:start` spec.

**Step 2: Update command spec with multi-session support**

Update `memento/commands/start.md` to include:

```markdown
---
description: Start new work with branch and session creation
argument-hint: issue|chore [--phase N] [--slice]
---

# Start New Work

Interactive workflow to begin new work with proper branch and session setup.

## Task

### Step 1: Determine work type

If no argument provided, ask the user:
"What type of work are you starting?
1. **issue** - Work tied to a tracked issue (GitHub, JIRA, Azure DevOps)
2. **chore** - Maintenance work without an issue number"

### If "issue" (work item):

1. Ask for the issue identifier (e.g., #42, PROJ-123)

2. If user doesn't know the ID, help them find it:
   ```bash
   gh issue list --state open --limit 10
   ```

3. Fetch issue details:
   ```bash
   gh issue view <number> --json number,title,body,state,labels
   ```

4. **Check for existing sessions:**
   - Scan `.claude/sessions/` for files with `Issue: #<number>`
   - If sessions exist, show them and prompt for relationship

5. **If existing sessions found:**
   ```
   Issue #42 has existing sessions:

     Phase 1: [complete] interfaces
     Phase 2: [in-progress] backend-auth (slice a)

   Add as:
   (p)hase N - sequential, after current highest phase
   (s)lice - parallel with current phase (becomes slice b)
   (c)ancel
   ```

6. **If --phase N provided:** Skip prompts, create as phase N

7. **If --slice provided:** Skip prompts, add as next slice in current phase

8. **Dependency handling:**
   - If starting phase 2+ and previous phases incomplete, warn:
     ```
     Warning: Phase 1 (interfaces) is not yet complete.
     You can start this session, but may be blocked.
     Continue anyway? (y/n)
     ```

9. Generate branch name:
   - First session: `issue/<type>-<N>-p1/<slug>`
   - Phase N: `issue/<type>-<N>-p<N>/<slug>`
   - Slice: `issue/<type>-<N>-p<phase><letter>/<slug>`

10. Create branch and session:
    ```bash
    git fetch origin
    git checkout -b <branch> origin/main
    ```

11. Create session file with:
    - **Issue**: #<number>
    - **Phase**: <phase number>
    - **Slice**: <letter or empty>
    - **Depends-on**: <list of dependency branches with status>
    - **Status**: in-progress (or pending if deps incomplete)

### If "chore" (maintenance work):

(Existing chore flow, updated with optional phase support)

1. Ask for description
2. Check for existing chore sessions with same description prefix
3. If phased chore, use `chore-p<N>/<slug>` format
4. Create session with appropriate phase metadata

## Examples

**First session for an issue:**
```
User: /memento:start issue
Claude: What's the issue number?
User: 42
Claude: Fetching #42 "Add authentication"...

        No existing sessions for this issue.
        Creating: issue/feature-42-p1/add-auth

        Is this the only phase, or will there be more?
        (o)nly phase, (f)irst of multiple, (s)kip planning
```

**Adding a phase:**
```
User: /memento:start issue 42 --phase 2
Claude: Creating phase 2 for issue #42...
        Existing: Phase 1 [complete] interfaces

        Branch: issue/feature-42-p2/implementation
        Depends-on: issue/feature-42-p1/interfaces (complete)
```

**Adding a slice:**
```
User: /memento:start issue 42 --slice
Claude: Adding slice to phase 2 for issue #42...
        Existing slices: (a) backend-auth

        Description for this slice?
User: frontend auth
Claude: Branch: issue/feature-42-p2b/frontend-auth
        Depends-on: issue/feature-42-p1/interfaces (complete)
```
```

**Step 3: Commit**

```bash
git add memento/commands/start.md
git commit -m "chore - update memento:start spec for multi-session support"
```

---

### Task 2.3: Add Branch Name Generation for Phases

**Files:**
- Modify: `memento/hooks/session-startup.js`
- Modify: `memento/hooks/__tests__/session-startup.test.js`

**Step 1: Write the failing test**

```javascript
describe('generatePhasedBranchName', () => {
  test('generates first phase branch', () => {
    const { generatePhasedBranchName } = require('../session-startup');
    const result = generatePhasedBranchName({
      issueNumber: '42',
      issueType: 'feature',
      phase: 1,
      slice: null,
      description: 'setup interfaces'
    });
    expect(result).toBe('issue/feature-42-p1/setup-interfaces');
  });

  test('generates phase with slice', () => {
    const { generatePhasedBranchName } = require('../session-startup');
    const result = generatePhasedBranchName({
      issueNumber: '42',
      issueType: 'feature',
      phase: 2,
      slice: 'b',
      description: 'frontend auth'
    });
    expect(result).toBe('issue/feature-42-p2b/frontend-auth');
  });

  test('generates chore with phase', () => {
    const { generatePhasedBranchName } = require('../session-startup');
    const result = generatePhasedBranchName({
      issueNumber: null,
      issueType: 'chore',
      phase: 1,
      slice: null,
      description: 'update deps'
    });
    expect(result).toBe('chore-p1/update-deps');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd memento && npm test`
Expected: FAIL

**Step 3: Write minimal implementation**

```javascript
/**
 * Generate branch name with phase/slice encoding
 * @param {object} options - Branch generation options
 * @returns {string} Generated branch name
 */
function generatePhasedBranchName({ issueNumber, issueType, phase, slice, description }) {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  if (issueNumber) {
    const sliceSuffix = slice || '';
    return `issue/${issueType}-${issueNumber}-p${phase}${sliceSuffix}/${slug}`;
  } else {
    const sliceSuffix = slice || '';
    return `chore-p${phase}${sliceSuffix}/${slug}`;
  }
}

module.exports = {
  // ... existing exports
  generatePhasedBranchName
};
```

**Step 4: Run test to verify it passes**

Run: `cd memento && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add memento/hooks/session-startup.js memento/hooks/__tests__/session-startup.test.js
git commit -m "chore - add phased branch name generation"
```

---

### Task 2.4: Add Next Phase/Slice Calculator

**Files:**
- Modify: `memento/hooks/session-startup.js`
- Modify: `memento/hooks/__tests__/session-startup.test.js`

**Step 1: Write the failing test**

```javascript
describe('calculateNextPhaseOrSlice', () => {
  test('returns phase 1 when no existing sessions', () => {
    const { calculateNextPhaseOrSlice } = require('../session-startup');
    const result = calculateNextPhaseOrSlice([], 'phase');
    expect(result).toEqual({ phase: 1, slice: null });
  });

  test('returns next phase after existing', () => {
    const { calculateNextPhaseOrSlice } = require('../session-startup');
    const existing = [
      { phase: 1, slice: null, status: 'complete' },
      { phase: 2, slice: 'a', status: 'in-progress' }
    ];
    const result = calculateNextPhaseOrSlice(existing, 'phase');
    expect(result).toEqual({ phase: 3, slice: null });
  });

  test('returns next slice in current phase', () => {
    const { calculateNextPhaseOrSlice } = require('../session-startup');
    const existing = [
      { phase: 1, slice: null, status: 'complete' },
      { phase: 2, slice: 'a', status: 'in-progress' }
    ];
    const result = calculateNextPhaseOrSlice(existing, 'slice');
    expect(result).toEqual({ phase: 2, slice: 'b' });
  });

  test('returns slice a when phase has no slices yet', () => {
    const { calculateNextPhaseOrSlice } = require('../session-startup');
    const existing = [
      { phase: 1, slice: null, status: 'complete' },
      { phase: 2, slice: null, status: 'in-progress' }
    ];
    const result = calculateNextPhaseOrSlice(existing, 'slice');
    // Existing p2 becomes p2a, new one is p2b
    expect(result).toEqual({ phase: 2, slice: 'b' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd memento && npm test`
Expected: FAIL

**Step 3: Write minimal implementation**

```javascript
/**
 * Calculate next phase or slice based on existing sessions
 * @param {Array} existingSessions - Array of existing session metadata
 * @param {string} mode - 'phase' or 'slice'
 * @returns {object} { phase, slice }
 */
function calculateNextPhaseOrSlice(existingSessions, mode) {
  if (existingSessions.length === 0) {
    return { phase: 1, slice: null };
  }

  const maxPhase = Math.max(...existingSessions.map(s => s.phase));

  if (mode === 'phase') {
    return { phase: maxPhase + 1, slice: null };
  }

  // Slice mode - add to current highest phase
  const currentPhaseSlices = existingSessions
    .filter(s => s.phase === maxPhase)
    .map(s => s.slice)
    .filter(Boolean)
    .sort();

  if (currentPhaseSlices.length === 0) {
    // No slices yet - existing becomes 'a', new one is 'b'
    return { phase: maxPhase, slice: 'b' };
  }

  // Get next letter after highest slice
  const lastSlice = currentPhaseSlices[currentPhaseSlices.length - 1];
  const nextSlice = String.fromCharCode(lastSlice.charCodeAt(0) + 1);

  return { phase: maxPhase, slice: nextSlice };
}

module.exports = {
  // ... existing exports
  calculateNextPhaseOrSlice
};
```

**Step 4: Run test to verify it passes**

Run: `cd memento && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add memento/hooks/session-startup.js memento/hooks/__tests__/session-startup.test.js
git commit -m "chore - add phase/slice calculator"
```

---

## Phase 3: Onus Integration

### Task 3.1: Update /onus:status Command Spec

**Files:**
- Modify: `onus/commands/status.md`

**Step 1: Update command spec for multi-session aggregation**

```markdown
---
description: Show current work item status and session overview
argument-hint: [issue-number]
---

# Work Item Status

Display comprehensive status combining work item details, session state, and git status.

## Task

### With issue number provided:

Show aggregated view across all sessions:

```
Issue #42: Add authentication
Status: In Progress (2 of 3 phases complete)

Acceptance Criteria:
  [x] JWT token generation
  [x] Token validation middleware
  [x] Login endpoint
  [ ] Logout endpoint
  [ ] Password reset flow

Sessions:
  Phase 1: [complete] interfaces        PR #87 merged
  Phase 2: [complete] backend-auth      PR #91 merged
           [in-progress] frontend-auth  branch active
  Phase 3: [pending] integration        waiting on phase 2

Current Session: issue/feature-42-p2b/frontend-auth
  Status: in-progress
  Depends-on: issue/feature-42-p1/interfaces (complete)
```

### Without issue number:

Detect from current branch and show:
1. Current session details
2. Related sessions for same issue
3. Overall issue progress

### Implementation steps:

1. Get current branch
2. Extract issue number from branch or session file
3. Find all sessions for this issue using `findSessionsForIssue()`
4. Fetch issue details from tracker (if available)
5. Format and display aggregated view
```

**Step 2: Commit**

```bash
git add onus/commands/status.md
git commit -m "chore - update onus:status spec for multi-session view"
```

---

### Task 3.2: Update /onus:close Command Spec

**Files:**
- Modify: `onus/commands/close.md`

**Step 1: Update command spec with session validation**

```markdown
---
description: Close a work item with validation
argument-hint: <issue-number>
---

# Close Work Item

Validate and close a work item after checking session and AC completion.

## Task

1. **Fetch issue details**
   ```bash
   gh issue view <number> --json number,title,body,state
   ```

2. **Find all sessions for this issue**
   - Use `findSessionsForIssue()` to get all related sessions
   - Check status of each session

3. **Validate sessions**
   - If any sessions are `in-progress` or `pending`:
     ```
     Warning: The following sessions are not complete:
       [in-progress] frontend-auth
       [pending] integration

     Close issue anyway? (y/n)
     ```

4. **Validate acceptance criteria**
   - Parse AC checkboxes from issue body
   - If any unchecked:
     ```
     Warning: Unchecked acceptance criteria:
       - Logout endpoint
       - Password reset flow

     (c)lose anyway, (m)ark as won't-fix, (a)bort
     ```

5. **Close the issue**
   ```bash
   gh issue close <number> --comment "Completed via sessions: ..."
   ```

6. **Update session files**
   - Mark all sessions as `complete`
   - Add closing note to session logs

## Examples

**Clean close:**
```
User: /onus:close 42
Claude: Checking issue #42...

        Sessions: 3 complete
        Acceptance Criteria: 5/5 complete

        Closing issue #42...
        Done. Issue closed with comment listing completed sessions.
```

**Close with warnings:**
```
User: /onus:close 42
Claude: Checking issue #42...

        Sessions: 2 complete, 1 in-progress
        Warning: Session "frontend-auth" still in-progress

        Acceptance Criteria: 3/5 complete
        Warning: Unchecked items:
           - Logout endpoint
           - Password reset flow

        Close anyway? (y)es, (n)o, (m)ark remaining as won't-fix
```
```

**Step 2: Commit**

```bash
git add onus/commands/close.md
git commit -m "chore - update onus:close spec with session validation"
```

---

## Phase 4: Documentation

### Task 4.1: Update sessions.md Context File

**Files:**
- Modify: `memento/rules/sessions.md`

**Step 1: Add multi-session section to context**

Add to `memento/rules/sessions.md`:

```yaml
## MULTI-SESSION WORK ITEMS
when: issue requires multiple PRs/phases
convention: 1 issue = N sessions (phases + slices)

## PHASES AND SLICES
phases: sequential work with dependencies (p1, p2, p3)
slices: parallel work within a phase (p2a, p2b, p2c)
branch-pattern: issue/<type>-<N>-p<phase><slice>/<desc>

## SESSION RELATIONSHIPS
depends-on: list in session file, tracks completion status
discovery: scan Issue: field in .claude/sessions/*.md
status-values: pending, in-progress, complete, blocked

## STARTING SUBSEQUENT SESSIONS
trigger: /memento:start issue with existing sessions
action: prompt for phase vs slice, set dependencies
shortcut: --phase N, --slice flags to skip prompts

## BACKWARD COMPATIBILITY
no-phase-field: treated as phase 1, only phase
single-session: works unchanged
new-fields: optional, old sessions remain valid
```

**Step 2: Commit**

```bash
git add memento/rules/sessions.md
git commit -m "chore - add multi-session conventions to sessions.md"
```

---

### Task 4.2: Update work-items.md Context File

**Files:**
- Modify: `onus/rules/work-items.md`

**Step 1: Add multi-session section**

Add to `onus/rules/work-items.md`:

```yaml
## MULTI-SESSION TRACKING
aggregation: /onus:status shows all sessions for issue
closure: /onus:close validates sessions + AC before close
ac-tracking: issue-level, progressively checked across sessions

## ISSUE CLOSURE VALIDATION
check-sessions: warn if any in-progress or pending
check-ac: warn if unchecked items remain
options: close-anyway, mark-wont-fix, abort
```

**Step 2: Commit**

```bash
git add onus/rules/work-items.md
git commit -m "chore - add multi-session tracking to work-items.md"
```

---

### Task 4.3: Final Integration Test

**Files:**
- No files created, manual testing

**Step 1: Manual integration test**

1. Create a test issue on GitHub
2. Run `/memento:start issue` with the test issue
3. Complete phase 1, create PR, merge
4. Run `/memento:start issue --phase 2`
5. Add a slice with `/memento:start issue --slice`
6. Run `/onus:status` to verify aggregated view
7. Run `/onus:close` to verify validation

**Step 2: Document any issues found**

Record any bugs or UX issues for follow-up.

---

## Summary

| Phase | Tasks | Estimated Commits |
|-------|-------|-------------------|
| Phase 1: Data Model | 4 tasks | 4 commits |
| Phase 2: Memento Workflow | 4 tasks | 4 commits |
| Phase 3: Onus Integration | 2 tasks | 2 commits |
| Phase 4: Documentation | 3 tasks | 3 commits |
| **Total** | **13 tasks** | **13 commits** |
