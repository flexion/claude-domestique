# Command: /check

## Description
Show the relevant workflow checklist for your current work. Displays the mandatory steps from CLAUDE.md based on what you're doing (starting work, committing, creating PR, etc.).

## Usage
```
/check [action]
```

**Arguments:**
- `action` (optional) - Specific checklist to show:
  - `start` - Checklist for beginning new work
  - `commit` - Pre-commit checklist
  - `pr` - Pull request checklist
  - `next` - "What's next?" checklist

If no action specified, shows all relevant checklists based on current context.

## Implementation

When the user invokes `/check`, follow these steps:

1. **Determine Action**

   If action specified:
   - Show that specific checklist

   If no action:
   - Detect current context (uncommitted changes, branch status, etc.)
   - Show most relevant checklist

2. **Read CLAUDE.md**

   Parse the bootstrap file to extract checklists:
   - "Before Beginning Any New Work"
   - "When Beginning Chore/Feature"
   - "When User Requests Git Commit"
   - "When User Requests Pull Request"
   - "Before Answering 'What's Next?'"

3. **Display Checklist**

   Format the checklist clearly with checkboxes and instructions.

## Checklists

### Before Beginning Any New Work (REQUIRED)

```
Before Beginning Any New Work:

1. ASSESS WORK TYPE
   - Is this a feature (GitHub issue) or chore (internal)?
   - Feature: REQUIRES pre-existing GitHub issue
   - Chore: Internal maintenance, no issue needed

2. CONFIRM WITH USER
   - Ask: "Should this be a feature or chore?"
   - If feature: "What is the GitHub issue number?"
   - If no issue exists: Cannot be a feature

3. WAIT FOR ANSWER
   - Do not proceed until confirmed

4. PROCEED
   - Use appropriate workflow (feature or chore)
```

### When Beginning Feature

```
When Beginning Feature:

1. REREAD .claude/context/sessions.yml
2. CREATE SESSION - Use .claude/tools/create-branch-metadata.sh
3. POPULATE SESSION - Document:
   - Issue details
   - Objective
   - Requirements
   - Approach
4. COMMIT SESSION - Before starting implementation
```

### When Beginning Chore

```
When Beginning Chore:

1. REREAD .claude/context/sessions.yml
2. CREATE SESSION - Use create-branch-metadata.sh
3. POPULATE SESSION - Document goal and approach
4. COMMIT SESSION - Before starting implementation
```

### Before Git Commit

**When displaying this checklist, dynamically generate the verification commands:**

1. Check if `.claude/config.json` exists
2. If exists:
   - Use `scripts/read-config.sh vcs.git.hooks.preCommit` to get command list
   - For each command type, extract actual command using `scripts/read-config.sh {path}`
   - Display tech-specific commands
3. If not exists:
   - Show fallback checklist
   - Suggest running `/plugin-init`

**With Config (Tech-Specific):**
```
Before Git Commit:

1. RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   {for each command in preCommit hooks}
   - {command_type}: {actual_command}
   {end for}

2. UPDATE SESSION
   - Ensure session file is up to date
   - Session + code committed atomically

3. REREAD .claude/context/git.yml

4. VERIFY COMMIT FORMAT
   - Feature: "#<N> - verb description"
   - Chore: "chore - verb description"
   - Use HEREDOC for multi-line messages
   - ZERO attribution (no Claude Code, Generated, Co-Authored-By)
```

**Without Config (Fallback):**
```
Before Git Commit:

1. RUN VERIFICATION (if applicable)
   No config found. Initialize plugin:
   - /plugin-init

   Or verify manually:
   - Shell scripts: shellcheck scripts/*.sh
   - Tests: Run test suite if exists

2. UPDATE SESSION
   - Ensure session file is up to date
   - Session + code committed atomically

3. REREAD .claude/context/git.yml

4. VERIFY COMMIT FORMAT
   - Feature: "#<N> - verb description"
   - Chore: "chore - verb description"
   - Use HEREDOC for multi-line messages
   - ZERO attribution (no Claude Code, Generated, Co-Authored-By)
```

### Before Pull Request

**When displaying this checklist, dynamically generate the verification commands (same as commit checklist):**

**With Config (Tech-Specific):**
```
Before Pull Request:

1. RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   {for each command in preCommit hooks}
   - {command_type}: {actual_command}
   {end for}

2. REREAD .claude/context/git.yml

3. VERIFY PR BODY HAS ZERO:
   - Attribution ("Claude Code", "Generated")
   - Emojis
   - AI mentions
   - Co-Authored-By tags

4. INCLUDE IN PR:
   - Summary (1-3 bullet points)
   - Test plan (checklist)
   - Files added/modified
   - Closes #<N> (for features)
```

**Without Config (Fallback):**
```
Before Pull Request:

1. RUN VERIFICATION
   No config found. Initialize plugin:
   - /plugin-init

   Or verify manually:
   - Shell scripts: shellcheck scripts/*.sh
   - Tests: Run full test suite

2. REREAD .claude/context/git.yml

3. VERIFY PR BODY HAS ZERO:
   - Attribution ("Claude Code", "Generated")
   - Emojis
   - AI mentions
   - Co-Authored-By tags

4. INCLUDE IN PR:
   - Summary (1-3 bullet points)
   - Test plan (checklist)
   - Files added/modified
   - Closes #<N> (for features)
```

### Before Answering "What's Next?"

```
Before Answering "What's Next?":

1. REREAD .claude/context/sessions.yml

2. RUN IN ORDER (NEVER guess):
   - git branch --show-current
   - .claude/tools/get-current-session.sh
   - Read .claude/sessions/<session-file>.md

3. CHECK "Next Steps" SECTION
   - Provide answer from session file
   - Never guess or assume
```

## Examples

### Example 1: General Check (With Config)

**Input:**
```
/check
```

**Output:**
```
Current Status:
  Branch: issue/feature-8/basic-commands
  Session: 8-basic-commands.md
  Uncommitted changes: Yes
  Config: .claude/config.json (typescript-node)

Relevant Checklists:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before Git Commit:

1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: npm run format:check
   - lint: npm run lint
   - type-check: npm run type-check
   - test: npm test

2. ☐ UPDATE SESSION
   - Ensure session file reflects current state

3. ☐ VERIFY COMMIT FORMAT
   - Use: "#8 - verb description"
   - Use HEREDOC for multi-line
   - ZERO attribution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To commit:
  git add <files>
  git commit -m "$(cat <<'EOF'
  #8 - implement basic commands
  - Create /next, /create-session, /check commands
  - Add command documentation
  EOF
  )"
```

### Example 2: Specific Checklist - Start

**Input:**
```
/check start
```

**Output:**
```
Before Beginning Any New Work (REQUIRED):

1. ☐ ASSESS WORK TYPE
   Is this a feature (GitHub issue) or chore (internal)?

   Feature: REQUIRES pre-existing GitHub issue
   Chore: Internal maintenance, no issue needed

2. ☐ CONFIRM WITH USER
   Ask: "Should this be a feature or chore?"
   If feature: "What is the GitHub issue number?"

3. ☐ WAIT FOR ANSWER
   Do not proceed until confirmed

4. ☐ PROCEED
   Use appropriate workflow checklist
```

### Example 3: Specific Checklist - Commit (TypeScript Node.js Project)

**Input:**
```
/check commit
```

**Output:**
```
Before Git Commit:

1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: npm run format:check
   - lint: npm run lint
   - type-check: npm run type-check
   - test: npm test

2. ☐ UPDATE SESSION
   - Ensure session up to date
   - Commit session + code atomically

3. ☐ REREAD .claude/context/git.yml

4. ☐ VERIFY COMMIT FORMAT
   - Feature: "#<N> - verb description"
   - Chore: "chore - verb description"
   - HEREDOC for multi-line
   - ZERO attribution
```

### Example 3b: Specific Checklist - Commit (Java Spring Boot Project)

**Input:**
```
/check commit
```

**Output:**
```
Before Git Commit:

1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: gradle spotlessCheck
   - lint: gradle checkstyleMain
   - test: gradle test

2. ☐ UPDATE SESSION
   - Ensure session up to date
   - Commit session + code atomically

3. ☐ REREAD .claude/context/git.yml

4. ☐ VERIFY COMMIT FORMAT
   - Feature: "#<N> - verb description"
   - Chore: "chore - verb description"
   - HEREDOC for multi-line
   - ZERO attribution
```

### Example 3c: Specific Checklist - Commit (No Config)

**Input:**
```
/check commit
```

**Output:**
```
Before Git Commit:

1. ☐ RUN VERIFICATION
   No config found. Initialize plugin:
   - /plugin-init

   Or verify manually:
   - Shell scripts: shellcheck scripts/*.sh
   - Tests: Run test suite if exists

2. ☐ UPDATE SESSION
   - Ensure session up to date
   - Commit session + code atomically

3. ☐ REREAD .claude/context/git.yml

4. ☐ VERIFY COMMIT FORMAT
   - Feature: "#<N> - verb description"
   - Chore: "chore - verb description"
   - HEREDOC for multi-line
   - ZERO attribution
```

### Example 4: Specific Checklist - PR (With Config)

**Input:**
```
/check pr
```

**Output:**
```
Before Pull Request:

1. ☐ RUN VERIFICATION
   ./scripts/run-verification.sh

   Commands that will run:
   - format: npm run format:check
   - lint: npm run lint
   - type-check: npm run type-check
   - test: npm test

2. ☐ REREAD .claude/context/git.yml

3. ☐ VERIFY PR BODY HAS ZERO:
   - Attribution
   - Emojis
   - AI mentions

4. ☐ INCLUDE IN PR:
   - Summary (1-3 bullets)
   - Test plan
   - Files changed
   - Closes #<N>
```

## Error Handling

### Not in Git Repository
```
Error: Not in a git repository.

Checklists require git context.
```

### Unknown Action
```
Unknown action: "build"

Valid actions:
  /check start  - Starting new work
  /check commit - Before committing
  /check pr     - Before creating PR
  /check next   - Before "what's next?"
  /check        - Show all relevant
```

## Notes

- Checklists are extracted from CLAUDE.md
- The command is context-aware (shows relevant checklist based on branch status)
- Use checkboxes (☐/☑) to make checklists actionable
- All checklists are BLOCKING - must be followed
- This command is read-only and educational
