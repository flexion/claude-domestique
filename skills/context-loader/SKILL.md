# Context Loader Skill

## Description
Automatically loads context files at session start using a two-tier system:
1. **Plugin core context** (always loaded) - Injects core values (skepticism, quality, workflow)
2. **Project custom context** (optional) - Project-specific context layered on top

This ensures every project gets core AI behavior values while allowing customization.

## Trigger Conditions

This skill auto-invokes when:
1. **Session Start** - Automatically at the beginning of any new session
2. **User Request** - When user says:
   - "refresh context"
   - "reload context"
   - "load context"
   - "update context"
3. **Periodic Refresh** - Automatically during long sessions:
   - Every N interactions (configurable, default: 50)
   - Only during active work (not idle sessions)
   - Skipped if context refreshed recently (within last 10 interactions)

## Actions

When triggered, perform the following steps:

### Step 1: Load Plugin Core Context (ALWAYS)

Load the plugin's core context files that inject core values into every project.

**Core files to load from plugin's `context/` directory:**
- `README.yml` - Compact YAML format guide
- `behavior.yml` - Skeptical, quality-focused AI behavior
- `git.yml` - Git workflow rules (no attribution, HEREDOC format)
- `sessions.yml` - Session management workflow

**How to locate plugin context:**
1. Plugin is installed at: `~/.claude/plugins/claude-domestique/` (or equivalent)
2. Core context is at: `{plugin-path}/context/`
3. Read all 4 core YAML files in parallel

**Important**: These files are ALWAYS loaded regardless of project configuration. They inject the core values that define how the AI behaves.

### Step 2: Load Project Custom Context (OPTIONAL)

After core context is loaded, load project-specific context files that layer on additional project needs.

**Check for project config:**
- If `.claude/config.json` exists: read `context.files` array
- If config doesn't exist or `context.files` not defined: use default project files

**Default project context files:**
- `project.yml` - Project overview
- `test.yml` - Testing strategy
- `deploy.yml` - Deployment process
- (any other project-specific files)

**Load from:** `.claude/context/` directory in project root

**Handling missing files:**
- Skip gracefully if file doesn't exist
- Don't fail the operation
- Report which files were skipped

### Step 3: Load Markdown Elaborations (ON-DEMAND)

Core YAML files may reference markdown elaboration files:
- `behavior.yml` → `assistant-preferences.md`
- `git.yml` → `git-workflow.md`
- `sessions.yml` → `session-workflow.md`

**Don't load these at session start** - they're loaded on-demand when deeper context needed.

### Step 4: Report Results

Display a two-tier summary:

```
Core context loaded (from plugin):
✓ README.yml - Compact YAML format guide
✓ behavior.yml - Skeptical AI behavior, quality focus
✓ git.yml - Git workflow (no attribution, HEREDOC)
✓ sessions.yml - Session management workflow

Project context loaded (from .claude/context/):
✓ project.yml - Project overview
✓ test.yml - Testing strategy
✓ deploy.yml - Deployment process

Loaded 4 core + 3 project = 7 context files successfully.
```

If project context missing:
```
Core context loaded (from plugin):
✓ README.yml
✓ behavior.yml
✓ git.yml
✓ sessions.yml

Project context:
⚠ No .claude/context/ directory found
   Core values injected. Run /domestique-init to add project-specific context.

Loaded 4 core context files successfully.
```

If some project files missing:
```
Core context loaded (from plugin):
✓ README.yml
✓ behavior.yml
✓ git.yml
✓ sessions.yml

Project context loaded (from .claude/context/):
✓ project.yml
⚠ test.yml - Not found (skipping)
⚠ deploy.yml - Not found (skipping)

Loaded 4 core + 1 project = 5 context files successfully.
```

## Configuration

Projects can customize which project-specific context files to load in `.claude/config.json`:

```json
{
  "context": {
    "files": [
      "project.yml",
      "test.yml",
      "deploy.yml",
      "azure.yml",
      "custom-workflow.yml"
    ],
    "autoLoad": true,
    "periodicRefresh": {
      "enabled": true,
      "interval": 50
    }
  }
}
```

**Fields:**
- `files` (array of strings) - List of PROJECT-SPECIFIC context files to load from `.claude/context/`
- `autoLoad` (boolean, default: true) - Whether to auto-load at session start
- `periodicRefresh` (object, optional) - Periodic context refresh configuration:
  - `enabled` (boolean, default: true) - Whether to enable periodic refresh
  - `interval` (number, default: 50) - Interactions between refreshes

**Note**: This config controls ONLY project-specific context. Plugin core context is ALWAYS loaded.

## Error Handling

### Plugin Context Missing
**Scenario**: Plugin's core context files not found

**Action**:
- Report error: "Plugin core context not found. Plugin may be corrupted."
- Suggest: "Reinstall plugin: /plugin install claude-domestique"
- Continue with project context only (degraded mode)

### Project Context Directory Missing
**Scenario**: `.claude/context/` doesn't exist in project

**Action**:
- Load core context successfully
- Report: "No project context directory"
- Suggest: "Run /domestique-init to initialize project"
- Don't fail operation

### Individual Files Missing
**Scenario**: Specific context file doesn't exist

**Action**:
- Skip that file
- Report which files were skipped
- Continue with available files
- Don't fail operation

### Invalid Config
**Scenario**: `.claude/config.json` exists but `context.files` is invalid

**Action**:
- Fall back to default project files
- Report: "Invalid context config, using defaults"
- Continue operation

## Examples

### Example 1: Session Start (Full Context)

**Session begins in project with `.claude/context/`**

```
Loading context...

Core context loaded (from plugin):
✓ README.yml - Compact YAML format guide
✓ behavior.yml - Skeptical AI behavior, quality focus
✓ git.yml - Git workflow (no attribution, HEREDOC)
✓ sessions.yml - Session management workflow

Project context loaded (from .claude/context/):
✓ project.yml - simple-D365 project overview
✓ test.yml - Jest testing strategy
✓ deploy.yml - Azure deployment process
✓ azure.yml - Azure tenant configuration

Loaded 4 core + 4 project = 8 context files successfully.

Ready to work. Core values injected, project context loaded.
```

### Example 2: Session Start (New Project, No Custom Context)

**Session begins in project without `.claude/context/`**

```
Loading context...

Core context loaded (from plugin):
✓ README.yml
✓ behavior.yml
✓ git.yml
✓ sessions.yml

Project context:
⚠ No .claude/context/ directory found
   Core values injected. Run /domestique-init to add project-specific context.

Loaded 4 core context files successfully.

Ready to work with core behavior values.
```

### Example 3: Manual Reload

**User:** "reload context"

```
Reloading context...

Core context loaded (from plugin):
✓ README.yml
✓ behavior.yml
✓ git.yml
✓ sessions.yml

Project context loaded (from .claude/context/):
✓ project.yml
✓ test.yml

Loaded 4 core + 2 project = 6 context files successfully.

Context refreshed.
```

### Example 4: Periodic Refresh (Long Session)

**Context**: Working session has reached 50 interactions

```
[Automatic periodic refresh triggered]

Refreshing context (periodic refresh at 50 interactions)...

Core context loaded (from plugin):
✓ README.yml
✓ behavior.yml
✓ git.yml
✓ sessions.yml

Project context loaded (from .claude/context/):
✓ project.yml
✓ test.yml
✓ deploy.yml

Loaded 4 core + 3 project = 7 context files successfully.

Context refreshed. Core values and project context reloaded.
Next refresh at interaction 100.
```

**Configuration control:**

To disable periodic refresh:
```json
{
  "context": {
    "periodicRefresh": {
      "enabled": false
    }
  }
}
```

To change interval (e.g., every 100 interactions):
```json
{
  "context": {
    "periodicRefresh": {
      "enabled": true,
      "interval": 100
    }
  }
}
```

## Integration

**Works with:**
- Plugin's `context/` directory - Core context files (ALWAYS loaded)
- Project's `.claude/context/` directory - Custom context files (optional)
- `.claude/config.json` - Project config for custom context
- All project types and tech stacks

**Benefits:**
- **Core values injected** - Every project gets skepticism, quality, workflow rules
- **Automatic** - No manual setup required for core values
- **Customizable** - Projects can layer on specific context
- **Fast** - Parallel loading for efficiency
- **Transparent** - Clear reporting of what loaded
- **Resilient** - Gracefully handles missing files
- **Periodic refresh** - Prevents context drift in long sessions
- **Configurable intervals** - Control refresh frequency per project needs

## Notes

- Core context files are in the PLUGIN, not the project
- Projects don't need to create behavior.yml, git.yml, sessions.yml - these come from the plugin
- Projects only create PROJECT-SPECIFIC context (project.yml, test.yml, deploy.yml, etc.)
- `/domestique-init` should NOT create core context files (they're provided by plugin)
- This ensures core values are consistent across all projects using the plugin
- Two-tier loading: Plugin core (values) → Project custom (specifics)

### Periodic Refresh Benefits

**Why periodic refresh matters:**
- Long sessions can drift from original context values
- AI may gradually forget skeptical stance, workflow rules
- Context files may be updated during session (team changes)
- Refreshing maintains alignment with core values

**Default interval (50 interactions):**
- Balances freshness vs interruption
- Appropriate for most development sessions
- Can be adjusted per project needs

**When to adjust interval:**
- **Increase (e.g., 100)**: Stable projects, infrequent context changes
- **Decrease (e.g., 25)**: Active context updates, strict adherence needed
- **Disable**: Very short sessions, context never changes
