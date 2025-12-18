# Claude Domestique

**Your strategic coding partner. Like a cycling domestique, it carries the water, stays focused on your goals, and handles the unglamorous work you don't want to do.**

---

## Core Purpose

Claude Domestique delivers on four promises by leveraging Claude Code's plugin system to inject instructions, enforce constraints, and maintain persistent state.

### 1. **Inject Core Values**

**What it delivers:**
- **Skeptical assessment** - Challenges assumptions, finds problems before agreeing
- **Non-sycophantic behavior** - Acts as peer not subordinate, disagrees when necessary
- **Quality discipline** - Incremental testing, rigorous code review, architectural thinking

**How Claude Code enables this:**

Claude Code plugins can include a `context/` directory containing YAML and markdown files. When the plugin is installed, Claude Code makes these files discoverable to Claude.

**How this plugin achieves it:**

1. **Core context files ship with plugin:**
   - `context/behavior.yml` - Compact YAML specifying: "stance: skeptical-default, find-problems-not-agreement"
   - `context/git.yml` - Workflow rules: no attribution, HEREDOC format, specific commit patterns
   - `context/sessions.yml` - Session management workflow instructions
   - `context/*.md` - Markdown elaborations with detailed explanations

2. **context-loader skill auto-loads these at session start:**
   ```markdown
   # skills/context-loader/SKILL.md

   ## Trigger Conditions
   This skill auto-invokes when:
   1. Session Start - Automatically at the beginning of any new session
   2. Periodic Refresh - Every N interactions (default: 50)

   ## Actions
   Step 1: Load Plugin Core Context (ALWAYS)
   Read the plugin's core context files:
   - behavior.yml - Skeptical AI behavior, quality focus
   - git.yml - Git workflow (no attribution, HEREDOC)
   - sessions.yml - Session management workflow
   ```

   When Claude reads this skill at session start, it sees trigger condition #1 is met, so it reads the "Actions" section and executes the instructions: "Read behavior.yml, git.yml, sessions.yml"

3. **Claude reads these files and they shape its responses:**
   
   When behavior.yml says:
   ```yaml
   stance: skeptical-default
   never: eager-agreement, sycophantic-tone
   ```
   
   And user says: "Let's use MongoDB"
   
   Claude's response is influenced by having read these instructions. Instead of "Great idea!", Claude responds with: "Before choosing MongoDB, let's assess: What are your consistency requirements? What query patterns? Have you considered alternatives like PostgreSQL?"

**The mechanism:** Claude Code plugins inject context files → Skills auto-load them → Claude reads instructions → Instructions influence behavior. No code execution - just instructions Claude follows.

---

### 2. **Automate Shit-Work**

**What it delivers:**
- Sessions auto-created from GitHub Issues/Azure DevOps work items
- Issue details auto-populated (no copy-paste)
- Status synced bidirectionally (session ↔ tracking system)
- Session updates extracted from commit messages

**How Claude Code enables this:**

Claude Code plugins can include:
- **Skills** - Markdown files with trigger conditions that Claude reads and follows
- **Commands** - Markdown files with implementation instructions Claude executes when user types `/command`
- **Scripts** - Bash utilities Claude can call

**How this plugin achieves it:**

1. **issue-detector skill monitors branch names:**
   ```markdown
   # skills/issue-detector/SKILL.md

   ## Trigger Conditions
   Auto-invokes when:
   - User asks "What's next?"
   - Session start with branch matching pattern

   ## Actions
   Step 1: Detect branch pattern
   - Branch: issue/feature-123/auth → Extract issue #123
   - Branch: 118344-auth → Extract work item 118344

   Step 2: Fetch issue details
   - GitHub: gh api repos/{owner}/{repo}/issues/123
   - Azure DevOps: curl {endpoint}/workitems/118344

   Step 3: Populate session file
   Parse JSON response, extract:
   - Title, description, labels
   - Requirements from body
   - Acceptance criteria
   ```

   Claude reads this skill, sees the trigger condition matches (user asked "What's next?"), then follows the step-by-step actions: detect pattern, call `gh api`, parse JSON, populate session file.

2. **Commands provide user-triggered automation:**
   ```markdown
   # commands/fetch-issue.md

   ## Implementation
   When user invokes /fetch-issue:
   1. Run: gh api repos/{owner}/{repo}/issues/{id}
   2. Parse JSON response
   3. Update session file with issue details
   ```

   When you type `/fetch-issue 123`, Claude reads this command file and follows the implementation steps.

**The mechanism:** Claude reads skill/command instructions → Follows steps → Uses Bash tool to call `gh api` / `curl` → Parses responses → Updates files. Claude is executing instructions, not running plugin code.

---

### 3. **Prevent Context Drift**

**What it delivers:**
- Context refreshed periodically during long sessions
- Session updates enforced at commit time (hard block)
- Drift detection monitors scope creep and behavioral violations
- Session update prompts after major milestones (soft nudges)

**How Claude Code enables this:**

Claude Code's hook system allows bash scripts to run in response to Claude's tool usage:
- **pre-commit hooks** - Run before Claude executes git commit commands
- **Tool monitoring** - Skills can track Claude's tool usage patterns

**How this plugin achieves it:**

**Layer 1 - Periodic Refresh (Skill-driven):**
```markdown
# skills/context-loader/SKILL.md

## Trigger Conditions
3. Periodic Refresh - Automatically during long sessions:
   - Every N interactions (configurable, default: 50)
```

Claude internally tracks interaction count. When it hits 50, this trigger condition matches, skill activates, Claude re-reads all context files. This prevents behavioral drift in long sessions.

**Layer 2 - Hard Enforcement (Hook-driven):**
```bash
# hooks/check-session-updated.sh

# Check if session file is in staged changes
if git diff --cached --name-only | grep -q "^$SESSION_PATH$"; then
  echo "✓ Session file updated"
  exit 0
else
  echo "COMMIT BLOCKED: Session file not updated"
  exit 1
fi
```

When Claude attempts to use the Bash tool to run `git commit`, Claude Code runs this hook first. If the hook exits with code 1, the commit is blocked. Claude sees the error message and reports it to the user.

**Layer 3 - Soft Prompts (Skill-driven):**
```markdown
# skills/session-update-prompter/SKILL.md

## Trigger Conditions
Auto-invokes when:
- After completing a component
- After resolving a blocker
- After major decision
```

Claude tracks its actions. After completing a component, this trigger matches, Claude reads the skill, follows instructions: "Suggest updating session file with what was completed."

**Layer 4 - Drift Detection (Skill-driven):**
```markdown
# skills/drift-detector/SKILL.md

## Actions
Step 1: Load session objectives from .claude/sessions/<file>
Step 2: Analyze recent tool usage (Write, Edit calls)
Step 3: Compare files created vs session scope
Step 4: Detect behavioral violations (from behavior.yml)
- Sycophantic agreement without analysis
- Skipping research steps
- Quality shortcuts
Step 5: Alert if drift detected
```

Claude reads this skill, follows the instructions: read session file, check what files it created recently, compare to session scope, check if its own responses violated behavior.yml rules, alert if drift detected.

**The mechanism:** 
- **Skills** = Instructions Claude follows periodically
- **Hooks** = Bash scripts that block Claude's actions
- **Context files** = Specifications Claude checks itself against

No "magic" - just Claude reading instructions and bash scripts enforcing constraints.

---

### 4. **Share Knowledge**

**What it delivers:**
- Sessions stored in `.claude/sessions/` (markdown, version controlled)
- Branch metadata maps branches → sessions (`.claude/branches/`)
- Decisions and learnings documented inline
- Teammates read sessions to understand work context

**How Claude Code enables this:**

Claude Code's file system access and git integration allow:
- Reading/writing markdown files
- Detecting current branch
- Running git commands

**How this plugin achieves it:**

**The architecture:**
```
git branch: issue-feature-10-auth
          ↓
.claude/branches/issue-feature-10-auth  (metadata file)
  content: session: 10-auth.md
          ↓
.claude/sessions/10-auth.md  (session state)
  content: objectives, progress, next steps
```

**How Claude follows this pattern:**

1. **Scripts detect session from branch:**
   ```bash
   # scripts/get-current-session.sh
   
   BRANCH=$(git branch --show-current)
   SANITIZED=$(echo "$BRANCH" | tr '/' '-')
   SESSION=$(grep '^session:' ".claude/branches/$SANITIZED" | awk '{print $2}')
   echo "$SESSION"
   ```

2. **Commands use this to load session:**
   ```markdown
   # commands/next.md

   ## Implementation
   1. Run: git branch --show-current
   2. Run: ./scripts/get-current-session.sh
   3. Read: .claude/sessions/<session-file>
   4. Parse "Next Steps" section
   5. Display to user
   ```

   When you type `/next`, Claude reads these instructions and executes them step-by-step using the Bash and Read tools.

3. **Session files persist across context resets:**
   
   When Claude's context window resets (new conversation), the session file remains in Git. The context-loader skill auto-runs, loads session, restores context.

**The mechanism:** Standard file system + git operations. Claude follows instructions to read/write markdown files in predictable locations. Git tracks them. Teammates can read them. It's just structured files, not a database.

---

## How Claude Code Plugins Work

Understanding how this plugin achieves its goals requires understanding Claude Code's plugin primitives:

### Commands (User-Invoked Instructions)

**Structure:**
```
commands/
└── next.md
```

**File contents:**
```markdown
# Command: /next

## Description
Show next steps from current session

## Implementation
When user invokes /next:
1. Run: git branch --show-current
2. Run: ./scripts/get-current-session.sh
3. Read: .claude/sessions/<file>
4. Display "Next Steps" section
```

**How it works:**
1. User types `/next`
2. Claude Code finds `commands/next.md`
3. Claude reads the entire file
4. Claude sees "Implementation" section
5. Claude follows the steps using Bash/Read tools
6. Claude displays results to user

**Key insight:** The command is just a markdown file. Claude reads it and follows the instructions. The command doesn't "execute" - Claude executes it by reading and following.

---

### Skills (Auto-Invoked Instructions)

**Structure:**
```
skills/
└── drift-detector/
    └── SKILL.md
```

**File contents:**
```markdown
# Drift Detector Skill

## Description
Detects when work diverges from session scope

## Trigger Conditions
Auto-invokes when:
- After 3 file creations
- Every 25 interactions
- Before commits

## Actions
Step 1: Load session from .claude/sessions/<file>
Step 2: Check files created via Write tool
Step 3: Compare to session scope
Step 4: Alert if diverged
```

**How it works:**
1. Claude reads all SKILL.md files at session start
2. Claude monitors for trigger conditions
3. When condition matches (e.g., "After 3 file creations"), skill activates
4. Claude re-reads the full SKILL.md
5. Claude follows "Actions" section step-by-step
6. Claude reports findings

**Key insight:** Skills are proactive. Claude monitors for triggers and self-activates. Still just following instructions from markdown files.

---

### Hooks (Constraint Enforcement Scripts)

**Structure:**
```
hooks/
└── check-session-updated.sh
```

**File contents:**
```bash
#!/bin/bash
# Pre-commit hook

SESSION_FILE=$(./scripts/get-current-session.sh)

if git diff --cached --name-only | grep -q "$SESSION_FILE"; then
  exit 0  # Allow commit
else
  echo "ERROR: Session file not updated"
  exit 1  # Block commit
fi
```

**How it works:**
1. Claude attempts: `git commit -m "message"`
2. Claude Code runs hook BEFORE allowing the commit
3. Hook checks if session file is staged
4. Hook exits 0 (success) or 1 (failure)
5. If failure, commit is blocked, error shown to Claude
6. Claude reports error to user

**Key insight:** Hooks are actual bash scripts that RUN. They're not instructions for Claude - they're enforcement mechanisms that block Claude's actions.

---

### Context Files (Behavioral Shaping)

**Structure:**
```
context/
├── behavior.yml
├── git.yml
└── sessions.yml
```

**File contents:**
```yaml
# behavior.yml

stance: skeptical-default
never: eager-agreement, sycophantic-tone
before-implementation:
  - assess-correctness
  - evaluate-architecture
  - consider-alternatives
```

**How it works:**
1. context-loader skill loads these files
2. Claude reads the YAML/markdown
3. These instructions become part of Claude's working context
4. Claude's responses are shaped by having read these rules
5. drift-detector skill checks if Claude's behavior matches these rules

**Key insight:** Context files don't "configure" the plugin - they configure Claude's behavior through instructions it reads and follows (or violates, triggering drift detection).

---

## The Real Technical Architecture

### What Actually Happens

**Session start sequence:**

1. Claude Code activates plugin
2. Claude reads `skills/*/SKILL.md` (discovers available skills)
3. context-loader skill triggers (condition: "Session Start")
4. Claude reads skill instructions: "Load context/behavior.yml, git.yml, sessions.yml"
5. Claude uses Read tool to load those files
6. Claude now has behavior instructions in context
7. session-detector skill triggers (condition: "Session start")
8. Claude reads skill: "Run get-current-session.sh, load session file"
9. Claude uses Bash tool to run script
10. Claude uses Read tool to load session markdown
11. Session state restored

**User types "/next":**

1. Claude Code routes to `commands/next.md`
2. Claude reads the command file
3. Claude sees "Implementation" section with steps
4. Claude uses Bash tool: `git branch --show-current`
5. Claude uses Bash tool: `./scripts/get-current-session.sh`
6. Claude uses Read tool: `.claude/sessions/10-auth.md`
7. Claude parses markdown, finds "## Next Steps"
8. Claude displays content to user

**User implements feature, creates 3 files:**

1. drift-detector skill monitors Write tool usage (in background)
2. After 3rd file creation, trigger condition matches
3. Claude reads drift-detector skill instructions
4. Claude reads session file (via Read tool)
5. Claude compares files created vs session scope
6. If diverged: Claude outputs drift alert
7. User sees warning before too much drift

**User attempts commit:**

1. User says "commit this"
2. Claude prepares: `git commit -m "..."`
3. Claude Code runs `hooks/check-session-updated.sh` FIRST
4. Hook script checks: is session file staged?
5. If NO: Hook exits 1, commit blocked
6. Claude sees error output from hook
7. Claude reports to user: "Commit blocked - session not updated"

### Component Interaction Diagram

```
User types "/next"
     ↓
Claude Code finds: commands/next.md
     ↓
Claude reads markdown file
     ↓
Claude executes instructions:
  1. Bash tool → git branch --show-current
  2. Bash tool → ./scripts/get-current-session.sh
  3. Read tool → .claude/sessions/10-auth.md
  4. Parse → Find "## Next Steps"
     ↓
Claude displays result to user
```

```
Claude creates 3rd file (Write tool)
     ↓
drift-detector skill trigger matches
     ↓
Claude reads: skills/drift-detector/SKILL.md
     ↓
Claude follows "Actions" instructions:
  1. Read tool → .claude/sessions/10-auth.md
  2. Compare files created vs scope
  3. Calculate drift score
     ↓
Claude outputs alert if drift detected
```

```
Claude attempts: git commit
     ↓
Claude Code runs: hooks/check-session-updated.sh
     ↓
Bash script checks: session file staged?
     ↓
NO → Script exits 1 → Commit BLOCKED
     ↓
Claude sees error message
     ↓
Claude reports to user: "Session must be updated"
```

---

## Why This Matters

**Traditional approach:**
"The plugin injects core values" ← Vague, seems like magic

**Actual mechanism:**
1. Plugin ships with `context/behavior.yml` containing instructions
2. `skills/context-loader/SKILL.md` auto-triggers at session start
3. Claude reads the skill, sees instruction: "Read behavior.yml"
4. Claude reads behavior.yml: "stance: skeptical-default, never: sycophantic-tone"
5. Claude's responses are now influenced by having read these rules
6. `skills/drift-detector/SKILL.md` monitors if Claude violates these rules
7. If violation detected, drift alert shown

**Result:** Core values "injected" through a chain of markdown files Claude reads and follows. No code execution - just instructions and monitoring.

---

## Installation

### Quick Start
```bash
# In your project
/plugin install claude-domestique@github:flexion/claude-domestique
```

**What happens:**
1. Claude Code downloads plugin repository
2. Plugin's `context/`, `skills/`, `commands/`, `hooks/` directories become available
3. Skills auto-load at next session start
4. Commands available via `/command-name`
5. Hooks enforce constraints on git operations

---

## Tech Stack Support

The plugin adapts to different tech stacks through **configuration, not code:**

```json
{
  "techStack": {
    "type": "react-typescript",
    "testCommand": "npm test -- --watchAll=false",
    "verifyCommands": ["test", "lint", "build"]
  }
}
```

**How commands use this:**
```markdown
# commands/check.md

## Implementation
1. Read: .claude/config.json
2. Extract: techStack.testCommand
3. Display checklist: "Run tests: npm test -- --watchAll=false"
```

Claude reads config, extracts values, displays tech-specific instructions. Same command file works across TypeScript, Java, Python projects.

---

## Examples

### Example: How `/next` Actually Works

**You type:** `/next`

**Claude Code:**
1. Finds: `commands/next.md`
2. Passes content to Claude

**Claude reads:**
```markdown
## Implementation
When user invokes /next:
1. Run: git branch --show-current
2. Run: ./scripts/get-current-session.sh
3. Read: .claude/sessions/<file>
4. Display "Next Steps" section
```

**Claude executes:**
```
1. Bash tool: git branch --show-current
   → Output: "issue-feature-10-auth"
2. Bash tool: ./scripts/get-current-session.sh
   → Output: "10-auth.md"
3. Read tool: .claude/sessions/10-auth.md
   → Reads entire file
4. Parses markdown, finds:
   ## Next Steps
   - Implement authentication middleware
   - Add JWT token validation
   - Test with protected routes
5. Displays to you
```

**You see:**
```
Current branch: issue-feature-10-auth
Session: 10-auth.md

Next Steps:
- Implement authentication middleware
- Add JWT token validation
- Test with protected routes
```

---

### Example: How Drift Detection Actually Works

**You create 3 files outside session scope**

**drift-detector skill (running in background):**
```markdown
## Trigger Conditions
Auto-invokes when:
- After 3 file creations ← THIS CONDITION MATCHES
```

**Claude:**
1. Sees trigger condition matched
2. Re-reads: `skills/drift-detector/SKILL.md`
3. Follows "Actions" section:
   - Read: `.claude/sessions/10-auth.md` (sees: Objective is "API authentication")
   - Check: Recent Write tool usage (sees: Created `LoginForm.tsx`, `UserList.tsx`, `Table.tsx`)
   - Compare: Session scope (backend API) vs files created (frontend React)
   - Detect: DRIFT - frontend files not in backend session scope
   - Calculate: Medium drift score
4. Outputs alert

**You see:**
```
⚠️  Context Drift Detected (Medium):

Session objective: Implement REST API authentication

Work diverging from scope:
- Created 3 frontend files (session is backend API only)
- Files: LoginForm.tsx, UserList.tsx, Table.tsx

Recommendation:
Frontend work is outside this session's scope. Options:
1. UPDATE SESSION: Add frontend to scope
2. NEW SESSION: Create separate session for frontend
3. DEFER: Save frontend for future session
```

---

## Current Status

**Delivered (3 of 4 core purposes):**
- ✅ Purpose 1: Inject Core Values - Via context files + context-loader skill
- ✅ Purpose 3: Prevent Context Drift - Via hooks (hard) + drift-detector skill (soft)
- ✅ Purpose 4: Share Knowledge - Via session files in git + commands to access

**In Progress:**
- 🔄 Purpose 2: Automate Shit-Work - issue-detector skill + fetch-issue command (partial)

---

## Philosophy

This plugin doesn't use "AI magic" - it uses Claude Code's primitives:

- **Commands** = Markdown files with implementation instructions
- **Skills** = Markdown files with trigger conditions + actions
- **Hooks** = Bash scripts that enforce constraints
- **Context** = YAML/Markdown that shapes Claude's behavior
- **Scripts** = Bash utilities for reusable operations

Claude reads instructions and follows them. Hooks block invalid actions. Context shapes responses. Sessions persist in Git.

Simple primitives, powerful results.

---

## Contributing

To understand this plugin, read:
1. `commands/next.md` - See how commands work
2. `skills/context-loader/SKILL.md` - See how skills work
3. `hooks/check-session-updated.sh` - See how hooks work
4. `context/behavior.yml` - See how context shapes behavior

Then try:
- Add a command (markdown file with implementation steps)
- Add a skill (markdown file with triggers + actions)
- Modify context (change the YAML, see behavior change)

---

## License

MIT

---

## Support

- **Issues:** https://github.com/flexion/claude-domestique/issues
- **Discussions:** https://github.com/flexion/claude-domestique/discussions
