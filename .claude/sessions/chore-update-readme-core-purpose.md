# Chore: Update README with Core Purpose Focus

## Goal
Rewrite README.md to focus on the four core purposes of the plugin and provide detailed technical implementation explanations for how each purpose is achieved.

## Context
The previous README was feature-focused (commands, installation, config) without clearly articulating WHY the plugin exists and HOW it technically delivers on its promises. After reviewing ROADMAP.md, CORE-PURPOSE-REVIEW.md, and all context files, the README needed to lead with purpose and back it up with technical implementation details.

## What's Been Done

### 2025-11-17 - Complete README Rewrite
**Actions:**
1. Read all strategic documents (ROADMAP.md, CORE-PURPOSE-REVIEW.md, DESIGN.md)
2. Read all core context files (behavior.yml, git.yml, sessions.yml, project.yml, test.yml)
3. Analyzed existing README structure and content
4. Completely rewrote README.md with new structure

**New README Structure:**
1. **Core Purpose Section** - Four promises with technical implementation for each:
   - Purpose 1: Inject Core Values (two-tier context loading)
   - Purpose 2: Automate Shit-Work (API integration, auto-detection)
   - Purpose 3: Prevent Context Drift (4-layer approach)
   - Purpose 4: Share Knowledge (1:1 mapping, Git persistence)

2. **How It Works** - Universal patterns + project-specific config

3. **Technical Architecture** - Component breakdown (commands, skills, hooks, scripts)

4. **Key Implementation Details** - Deep dives with diagrams:
   - Session persistence flow
   - Core values injection load order
   - Drift prevention layers
   - Work-item automation integration

5. **Tech Stack Support** - Built-in presets + custom

6. **Installation** - Quick start + local development

7. **Migration** - Existing setup support

8. **Examples** - Real projects (simple-D365, Portal-D365-WebApp, portal-D365)

9. **Testing Strategy** - Integration testing approach

10. **Current Status** - 3 of 4 purposes delivered

11. **Philosophy** - Domestique metaphor

**Key Changes:**
- Lead with PURPOSE not features
- Each purpose includes "Technical Implementation" subsection
- Concrete examples with actual file references
- Flow diagrams showing how things work
- Links to actual implementation files
- Clear "Problem → Solution" framing

**Result:**
- README now answers "What does this do?" and "How does it work technically?"
- Focuses on value delivery, backed by technical depth
- Aligns with ROADMAP.md's 4 core purposes
- Provides enough detail for developers to understand architecture

### 2025-11-17 - Second Iteration: Explain Actual Mechanisms
**User feedback:** "Think critically about the readme and explain the inner workings of how Claude and Claude plugins are leveraged"

**Critical assessment of first version:**
- Too abstract ("skills auto-invoke" - but HOW?)
- Missing actual mechanisms
- Didn't explain that plugins are just FILES Claude reads
- Vague on what "auto" means

**Actions:**
1. Read actual plugin components (commands/next.md, skills/drift-detector/SKILL.md, hooks/check-session-updated.sh)
2. Analyzed how Claude Code actually works with these files
3. Completely rewrote README to explain mechanisms

**Second version explains:**
1. **Commands** = Markdown files Claude READS when user types `/command`, then follows "Implementation" steps
2. **Skills** = Markdown files Claude READS at session start, monitors for trigger conditions, follows "Actions" when triggered
3. **Hooks** = Bash scripts that RUN (not instructions) and can block Claude's actions
4. **Context** = YAML/Markdown Claude reads that shapes its responses (not "configuration")

**New sections added:**
- "How Claude Code Plugins Work" - Detailed explanation of each primitive
- "The Real Technical Architecture" - Step-by-step execution traces
- "What Actually Happens" - Concrete sequences for session start, `/next`, drift detection, commits
- Component interaction diagrams showing exact flow

**Key insight revealed:**
The plugin doesn't "execute code" - it provides:
- Instructions Claude reads and follows (commands, skills, context)
- Constraints bash scripts enforce (hooks)
- Persistent state in Git (sessions)

**Result:** README now teaches HOW CLAUDE CODE WORKS through this plugin's concrete examples.

### 2025-11-17 - CLAUDE.md Conflict Discovery
**User question:** "How will the original CLAUDE.md work with claude-domestique installed?"

**Critical finding:**
- CLAUDE.md says "MANDATORY - read .claude/context/*.yml files"
- Plugin's context-loader skill ALSO reads these files
- If both exist: files loaded TWICE, redundant, potential conflicts

**Analysis:**
- **This repo (bootstrap phase):** Has CLAUDE.md + .claude/context/ directory
- **After plugin transition:** Should DELETE CLAUDE.md, keep only project-specific context
- **Other projects:** Don't need CLAUDE.md - plugin provides core values

**Decision documented:**
Phase 5 transition includes:
1. Install plugin in this repo
2. DELETE CLAUDE.md (replaced by plugin)
3. DELETE .claude/context/behavior.yml, git.yml, sessions.yml (now from plugin)
4. KEEP .claude/context/project.yml (project-specific)

**README implication:**
Should add note that projects with existing CLAUDE.md should remove it after installing plugin to avoid conflicts.

## Files Changed
- `README.md` - Complete rewrite explaining actual Claude Code mechanisms (717 lines)

## Key Decisions

### Decision 1: Explain Mechanisms Not Features
**Reason:** Users need to understand HOW the plugin works to extend/customize it
**Impact:** README became a teaching document about Claude Code itself
**Alternative:** Could have kept it feature-focused, but wouldn't enable understanding

### Decision 2: Use This Plugin's Components as Examples
**Reason:** Real working code is better than abstract explanations
**Impact:** README references actual files (commands/next.md, skills/drift-detector/SKILL.md)
**Alternative:** Could have used hypothetical examples, but less concrete

### Decision 3: Include Execution Traces
**Reason:** Step-by-step sequences make mechanisms concrete
**Impact:** Readers see EXACTLY what happens when they type `/next` or create files
**Alternative:** Could have omitted traces, but wouldn't show the reality

## Learnings

**About Claude Code:**
- Commands/skills are just markdown files Claude reads and follows
- "Auto-invoke" means Claude monitors trigger conditions and activates skills
- Hooks are bash scripts that RUN and can block operations
- Context files shape behavior through instructions, not configuration

**About Documentation:**
- Explaining mechanisms > listing features
- Concrete examples > abstract descriptions
- Execution traces > vague statements
- Teaching the platform > documenting the plugin

**About This Plugin:**
- Its power comes from leveraging simple primitives cleverly
- No "AI magic" - just Claude following instructions from markdown files
- Hooks provide hard enforcement, skills provide soft guidance
- Two-tier context loading (plugin core + project specific) is the key pattern

### 2025-11-17 - Fixed /init Command CLAUDE.md Handling
**User request:** "change the init to backup the CLAUDE.md file"

**Problem identified:**
Original `/init` command (Step 7) would PREPEND plugin instructions to CLAUDE.md, creating the exact conflict the plugin was designed to eliminate.

**Solution implemented:**
Rewrote Step 7 to properly handle CLAUDE.md:

**New behavior:**
1. **If CLAUDE.md exists:**
   - Create timestamped backup: `CLAUDE.md.backup-YYYYMMDD-HHMMSS`
   - Show conflict warning to user
   - Explain: Plugin provides core instructions automatically
   - Prompt: "Delete CLAUDE.md? (y/N)"
   - If yes: Delete CLAUDE.md, keep backup
   - If no: Keep CLAUDE.md, warn about conflicts
   - Non-interactive mode: Keep file, create backup, warn

2. **If CLAUDE.md doesn't exist:**
   - Don't create one (plugin provides everything)
   - Report: "No CLAUDE.md found (plugin will provide core instructions)"

**Rationale documented:**
- Plugin's context-loader skill auto-loads core workflow instructions
- Creating/modifying CLAUDE.md causes duplicate loading
- Best practice: No CLAUDE.md needed, use `.claude/context/project.yml` for project-specific instructions

**Summary updated:**
Step 8 now shows CLAUDE.md action:
- `✓ CLAUDE.md deleted (backup: file.backup-timestamp)`
- `⚠ CLAUDE.md kept (backup: file.backup-timestamp) - review for conflicts`
- `✓ No CLAUDE.md (plugin provides core instructions)`

**Result:**
- `/init` now aligns with plugin philosophy (no CLAUDE.md duplication)
- Users explicitly choose whether to keep CLAUDE.md
- Backup always created (safe)
- Clear guidance on conflicts

### 2025-11-17 - Added CLAUDE.md Migration Guide
**User question:** "What can the user do if he wants to preserve some of the context provided by CLAUDE.md? How does he adapt it to the new structure?"

**Addition to commands/init.md:**
Added comprehensive migration guidance in Step 7 showing how to convert CLAUDE.md content to plugin structure:

**Migration guide includes:**
1. **Content categorization:**
   - Core workflow rules → Already in plugin (don't migrate)
   - Project-specific context → Migrate to `.claude/context/project.yml`
   - Tech stack details → Migrate to `.claude/context/test.yml`, `.claude/context/deploy.yml`

2. **Conversion table:**
   | CLAUDE.md Content | Migrate To | Purpose |
   |-------------------|------------|---------|
   | Git workflow | DON'T MIGRATE | Plugin provides |
   | Session management | DON'T MIGRATE | Plugin provides |
   | AI behavior | DON'T MIGRATE | Plugin provides |
   | Project domain | project.yml | Domain/architecture |
   | Testing strategy | test.yml | What/how to test |
   | Deployment | deploy.yml | Deploy process |
   | Team conventions | team.yml | Code style/review |
   | APIs | apis.yml | Endpoints/patterns |

3. **Before/after examples:**
   - Markdown prose → Compact YAML
   - Verbose instructions → Key-value pairs
   - Narrative → Structured data

4. **Step-by-step process:**
   - Review backup file
   - Identify project-specific sections
   - Create corresponding .yml files
   - Convert to compact format
   - Validate context loads

**Example provided:**
Testing strategy + deployment process from CLAUDE.md → test.yml + deploy.yml with compact YAML format

**Result:**
Users have clear path to migrate valuable CLAUDE.md content without duplication. Plugin handles core values, project context files handle specifics.

### 2025-11-17 - Simplified CLAUDE.md Handling to Backup-Only
**User feedback:** "the init should ONLY backup the the CLAUDE.md file and not get the option to delete it."

**Problem identified:**
Step 7 offered interactive prompt to delete CLAUDE.md, which added complexity and required user interaction.

**Solution implemented:**
Simplified Step 7 to backup-only approach:
- **If CLAUDE.md exists:** Create timestamped backup, show note about potential conflicts, keep original
- **If CLAUDE.md doesn't exist:** Report no action needed
- **Removed:** Delete prompt, interactive mode handling, non-interactive mode handling

**New behavior:**
```bash
if [ -f "CLAUDE.md" ]; then
  cp CLAUDE.md "CLAUDE.md.backup-${TIMESTAMP}"
  echo "✓ Backed up existing CLAUDE.md"
  echo "⚠️  Note: Plugin provides core instructions automatically"
  CLAUDE_MD_ACTION="backed-up"
else
  echo "✓ No CLAUDE.md found"
  CLAUDE_MD_ACTION="none"
fi
```

**Summary updated:**
- `✓ CLAUDE.md backed up to file.backup-timestamp`
- `✓ No CLAUDE.md found (plugin provides core instructions)`

**Result:**
- Simpler, non-interactive init flow
- User retains full control over CLAUDE.md deletion
- Migration guide still available for reference
- Backup always created for safety

### 2025-11-17 - Interactive Migration Workflow
**User request:** "init should walk the user through integrating the CLAUDE.md and README.md into the created .claude/context context so the so it can be available to the refresh"

**Problem identified:**
Previous approach only backed up CLAUDE.md and provided static migration guide. Users needed interactive guidance to actually extract content into .claude/context/ files that the context-loader skill would auto-load.

**Solution implemented:**
Transformed Step 7 into interactive migration workflow:

**New behavior:**
1. **Detect migration sources:**
   - Check for CLAUDE.md → backup with timestamp
   - Check for README.md → note for extraction

2. **CLAUDE.md interactive migration:**
   - Ask: "Does CLAUDE.md contain project-specific context?"
   - If yes, prompt content type:
     - 1. Project domain/architecture → .claude/context/project.yml
     - 2. Testing strategy → .claude/context/test.yml
     - 3. Deployment process → .claude/context/deploy.yml
     - 4. Team conventions → .claude/context/team.yml
     - 5. API documentation → .claude/context/apis.yml
     - 6. Multiple (manual extraction)
   - Show example YAML format for selected type
   - Offer to open editor: "${EDITOR:-vi} .claude/context/project.yml"
   - Ask: "Delete CLAUDE.md now?" (optional)

3. **README.md interactive extraction:**
   - Ask: "Extract project overview from README.md to project.yml?"
   - If yes:
     - Show what to extract (name, domain, tech stack, architecture)
     - If project.yml exists: offer to append
     - If doesn't exist: create template, open editor
   - User fills in YAML while viewing README.md

4. **Migration complete summary:**
   - Show what was migrated
   - Remind when context auto-loads:
     - Session start (automatic)
     - Periodic refresh (every 50 interactions)
     - Manual: "reload context"

**Step 8 summary updated:**
```
Migration:
  ✓ CLAUDE.md migrated to .claude/context/ and deleted
  ✓ README.md content extracted to .claude/context/project.yml

Context auto-loads:
  - Session start (automatic)
  - Periodic refresh (every 50 interactions)
  - Manual: "reload context"
```

**Result:**
- Users guided step-by-step to migrate content
- Context files created in correct format during /init
- Content immediately available to context-loader skill
- No manual file creation needed (editor opened automatically)
- Clear connection between migration and auto-loading

### 2025-11-17 - Automatic Markdown Guide Creation
**User request:** "the init should also copy/create the md files in the .claude/context directory so there's further detail and examples."

**Problem identified:**
Interactive migration created YAML files (compact, machine-optimized) but didn't provide detailed markdown guides with examples, troubleshooting, and elaboration.

**Solution implemented:**
Add automatic markdown guide generation after YAML file creation:

**New behavior:**
After interactive migration completes, automatically create:

1. **project-guide.md** (if project.yml exists):
   - Detailed explanations for compact YAML entries
   - Domain concepts with examples
   - Architecture patterns with code references
   - Tips for maintaining context

2. **test-guide.md** (if test.yml exists):
   - Testing philosophy explained
   - Good/bad test examples
   - Integration test patterns
   - Running tests commands
   - What to test vs skip

3. **deploy-guide.md** (if deploy.yml exists):
   - Detailed deployment steps
   - What happens at each stage
   - Troubleshooting procedures
   - Rollback process
   - Environment variables
   - Monitoring checklist

4. **.claude/context/README.md** (always created):
   - Overview of context directory structure
   - Two-file pattern explanation (YAML + guide)
   - When Claude loads files (auto vs on-demand)
   - How to maintain context
   - Plugin core vs project context

**Two-file pattern established:**
```
.claude/context/
├── project.yml         (compact, token-efficient, auto-loaded)
├── project-guide.md    (detailed, examples, on-demand)
├── test.yml            (compact, auto-loaded)
├── test-guide.md       (detailed, on-demand)
├── deploy.yml          (compact, auto-loaded)
├── deploy-guide.md     (detailed, on-demand)
└── README.md           (explains structure)
```

**Benefits:**
- **YAML files**: Quick context, Claude reads frequently (session start, periodic refresh)
- **Guide files**: Deep dive, Claude reads when needs details
- **README.md**: Onboarding for team, explains maintenance

**Example content created:**
- project-guide.md: Domain concepts, architecture patterns with code examples
- test-guide.md: Test patterns, good/bad examples, integration test template
- deploy-guide.md: Step-by-step deployment, rollback, monitoring

**Result:**
- Users get both compact (YAML) and detailed (markdown) context
- Context-loader auto-loads YAML, reads guides on-demand
- New team members have clear examples to follow
- Maintenance pattern established (update YAML first, then guide)

## Files Changed
- `README.md` - Complete rewrite explaining actual Claude Code mechanisms (717 lines)
- `commands/init.md` - Interactive migration workflow + automatic markdown guide creation

## Next Steps
1. Commit README + init.md changes together
2. Consider adding "CLAUDE.md not needed" note to README installation section
3. Update ROADMAP.md to reflect README completion
