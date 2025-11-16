# Session: Document Feature Workflow from simple-D365

## Objective
Research and document the feature branch workflow from simple-D365 repository to establish feature development patterns for claude-domestique plugin.

## Context
Claude-domestique currently only documents chore workflow. Need to add support for feature branches that map to GitHub issues, similar to how simple-D365 handles features.

## Approach
1. Explore simple-D365 repository structure for feature patterns
2. Extract key patterns for:
   - Branch naming (`issue/feature-N/description`)
   - Session file structure (`N-description.md`)
   - Commit format (`#N - verb description`)
   - Branch metadata (issue tracking)
   - Session templates (detailed structure)
3. Update claude-domestique context files and tooling
4. Create templates and documentation

## Key Findings from simple-D365

### Branch Naming
- **Features:** `issue/feature-<N>/<kebab-case-description>`
- **Chores:** `chore/<description>`
- **Example:** `issue/feature-10/d365-performance-tools`

### Session File Naming
- **Features:** `<N>-<kebab-case-description>.md`
- **Chores:** `chore-<description>.md`
- **Example:** `10-d365-performance-tools.md`

### Commit Format
- **Features:** `#<N> - <verb> <description>\n- bullet1\n- bullet2`
- **Chores:** `chore - <verb> <description>\n- bullet1\n- bullet2`
- **NO attribution, emojis, or AI mentions**
- **Must use HEREDOC format**

### Branch Metadata
- Tracks issue number for features
- Status: planning, in-progress, testing, pr-created, completed, blocked
- Maps to session file
- Auto-detection via sanitized branch name

### Session Structure for Features
Features have richer session files with sections:
- Issue Details (number, title, created, status, GitHub URL)
- Objective
- Requirements (Core Components, Key Features)
- Technical Approach
- Implementation Plan (phased checklist)
- Dependencies
- Success Criteria
- Session Log (timestamped entries)
- Key Decisions (with rationale, impact, alternatives)
- Learnings (categorized insights)
- Files Created (organized by type)
- Next Steps (prioritized, timestamped)

### One-to-One Mapping
```
GitHub Issue #N
    ↓
issue/feature-N/description
    ↓
.claude/branches/issue-feature-N-description
    ↓
.claude/sessions/N-description.md
```

## Implementation Tasks

### 1. Update git.yml ✓
Add feature commit format and branch patterns

### 2. Update sessions.yml
Add feature session structure patterns

### 3. Create Feature Session Template
Template file at `.claude/templates/feature-session.md.template`

### 4. Update create-branch-metadata.sh
Support `issue/feature-N/description` pattern
Auto-extract issue number
Prompt for issue URL

### 5. Create Feature Workflow Documentation
Comprehensive guide in `.claude/context/features.yml`

### 6. Update CLAUDE.md
Add feature workflow checklist differences

## Files to Create/Update

### Create
- `.claude/context/features.yml` - Feature workflow patterns
- `.claude/templates/feature-session.md.template` - Feature session template
- `docs/FEATURE-WORKFLOW.md` - User-facing feature documentation

### Update
- `.claude/context/git.yml` - Add feature commit patterns
- `.claude/context/sessions.yml` - Add feature session patterns
- `.claude/tools/create-branch-metadata.sh` - Support feature branches
- `CLAUDE.md` - Add feature workflow checklists

## Session Log

### 2025-11-16 - Exploration Complete
**Actions:**
- Launched Explore agent to examine simple-D365 repository
- Found comprehensive feature workflow patterns
- Documented branch naming, session structure, commit format
- Identified one-to-one mapping pattern (Issue ↔ Branch ↔ Session)

**Key Findings:**
- Features use `issue/feature-N/` prefix with GitHub issue numbers
- Session files are much more detailed for features (252+ lines)
- Commit format uses `#N` for GitHub auto-linking
- Branch metadata tracks issue numbers
- Session logs document decisions, learnings, and progress over time

### 2025-11-16 - Implementation Starting
**Actions:**
- Created branch: `chore/document-feature-workflow`
- Created session file
- Ready to begin documentation updates

### 2025-11-16 - Implementation Complete
**Actions Completed:**
1. Updated `.claude/context/git.yml` - Added feature branch and commit patterns
2. Created `.claude/context/features.yml` - Comprehensive feature workflow documentation
3. Updated `.claude/context/sessions.yml` - Added feature session structure patterns
4. Created `.claude/templates/` directory
5. Created `.claude/templates/feature-session.md.template` - Feature session template with placeholders
6. Updated `.claude/tools/create-branch-metadata.sh` - Added GitHub issue URL prompt and template support
7. Updated `CLAUDE.md` - Added features.yml to mandatory load list, feature-specific checklists, updated examples

**Files Created:**
- `.claude/context/features.yml` (76 lines) - Feature vs chore patterns, commit formats, session structure
- `.claude/templates/feature-session.md.template` (90 lines) - Template with {{placeholders}} for issue details

**Files Updated:**
- `.claude/context/git.yml` - Added feature branch/commit patterns alongside chore patterns
- `.claude/context/sessions.yml` - Updated mapping, session file formats, branch metadata
- `.claude/tools/create-branch-metadata.sh` - Enhanced to prompt for GitHub URL, use template if available
- `CLAUDE.md` - Added "When Beginning Feature" checklist, updated commit examples, session detection, quick commands, key rules

**Key Accomplishments:**
- Established clear distinction between features (GitHub issue-driven) and chores (internal maintenance)
- Documented one-to-one mapping: Issue ↔ Branch ↔ Metadata ↔ Session
- Created reusable template for feature sessions with rich structure
- Updated all mandatory context files to support both workflows
- Tool now auto-detects and handles both branch types correctly

## Next Steps

### Completed ✓
1. ✓ Update `.claude/context/git.yml` with feature patterns
2. ✓ Create `.claude/context/features.yml` for feature workflow
3. ✓ Update `.claude/context/sessions.yml` with feature session structure
4. ✓ Create `.claude/templates/feature-session.md.template`
5. ✓ Update `.claude/tools/create-branch-metadata.sh` to support features
6. ✓ Update `CLAUDE.md` with feature checklists
7. ✓ Commit session + code (2 commits created)
8. ✓ Update `IMPLEMENTATION-PLAN.md` with feature workflow impacts

### All Core Work Complete ✓
This chore is complete and ready for PR.

### Future Enhancements (Optional)
- Create `docs/FEATURE-WORKFLOW.md` for user-facing documentation
- Add validation testing: create sample feature branch, test auto-detection
