# Roadmap

## Core Concept

**1 Session = 1 Issue = 1 Branch = 1 Branch Metadata File**

Sessions persist work context across conversation resets, branch switches, and team handoffs.

## Directory Structure

```
.claude/
├── sessions/           # Session files (rich, detailed markdown)
│   ├── 123-add-auth.md
│   ├── fix-456-login-bug.md
│   └── chore-update-deps.md
├── branches/           # Branch metadata (compact mapping)
│   ├── issue-feature-123-add-auth
│   ├── fix-456-login-bug
│   └── chore-update-deps
└── tools/              # Session management tools (JavaScript)
    ├── session.js          # Core module (shared utilities)
    ├── create-session.js   # Create branch metadata + session file
    └── get-session.js      # Find session from current branch
```

## Tools

### create-session.js
Create branch metadata and session file from current git branch.

```bash
# After creating a branch
git checkout -b issue/feature-123/add-authentication
.claude/tools/create-session.js

# Creates:
# - .claude/branches/issue-feature-123-add-authentication
# - .claude/sessions/123-add-authentication.md
```

### get-session.js
Find and display session info for current branch.

```bash
.claude/tools/get-session.js
# Output:
# Branch: issue/feature-123/add-authentication
# Session: .claude/sessions/123-add-authentication.md
# Status: in-progress
```

### Session Updates
Session updates are collaborative between Claude and the user. Claude edits session files directly using the Edit tool, and users review changes. This keeps session maintenance flexible and conversational.

---

## Phase 1: Foundation

- [ ] Create directory structure (sessions/, branches/, tools/)
- [ ] Define session file schema (markdown with structured sections)
- [ ] Create session templates (feature, chore, bug)
- [ ] Define branch metadata file format
- [ ] Implement `session.js` core module
  - [ ] Git branch detection
  - [ ] Branch name parsing (issue/feature-N/desc, chore/desc, fix/N/desc)
  - [ ] Path utilities
  - [ ] Template loading

## Phase 2: Core Tools

- [ ] Implement `create-session.js`
  - [ ] Parse current branch name
  - [ ] Detect session type (feature, chore, bug)
  - [ ] Create branch metadata file
  - [ ] Create session file from template
  - [ ] Handle existing files (prompt or error)
- [ ] Implement `get-session.js`
  - [ ] Read current branch
  - [ ] Find branch metadata
  - [ ] Return session file path and status
  - [ ] Fallback: guess session from branch name pattern
## Phase 3: Integration

- [ ] Hook: Auto-load session on conversation start
- [ ] Hook: "What's next?" query handler
- [ ] Session file validation
- [ ] Git commit integration (session + code atomicity)
- [ ] Pre-commit hook to remind session update

## Phase 4: Polish

- [ ] Session archival on branch merge
- [ ] Session diff/history viewing
- [ ] Documentation and examples
