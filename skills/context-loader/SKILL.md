# Context Loader Skill

## Description
Automatically loads project context files at session start, ensuring Claude has necessary context immediately available for effective workflow management.

## Trigger Conditions

This skill auto-invokes when:
1. **Session Start** - Automatically at the beginning of any new session
2. **User Request** - When user says:
   - "refresh context"
   - "reload context"
   - "load context"
   - "update context"

## Actions

When triggered, perform the following steps:

### Step 1: Check for Config
Check if `.claude/config.json` exists in the current working directory.

### Step 2: Determine Context Files
**If config exists:**
1. Use `scripts/read-config.sh context.files` to get array of context files
2. If `context.files` is not defined, use default list

**If config doesn't exist:**
Use default context file list:
- `README.yml`
- `sessions.yml`
- `git.yml`
- `behavior.yml`

### Step 3: Load Context Files
For each file in the context files list:
1. Check if `.claude/context/{filename}` exists
2. If exists: Read file using the Read tool
3. If doesn't exist: Skip with note (don't fail)
4. Load content into session context

**Important:** Load files in parallel when possible for efficiency.

### Step 4: Report Results
Display a summary of loaded files:

```
Context loaded:
✓ README.yml - Compact YAML reading guide
✓ sessions.yml - Session workflow and branch tracking
✓ git.yml - Git workflow rules
✓ behavior.yml - AI behavior preferences
✓ test.yml - Testing strategy
✓ project.yml - Project overview

Loaded 6 context files successfully.
```

If any files were missing:
```
Context loaded:
✓ README.yml
✓ sessions.yml
✓ git.yml
✓ behavior.yml
⚠ test.yml - Not found (skipping)
⚠ project.yml - Not found (skipping)

Loaded 4 of 6 context files.
```

## Configuration

Projects can configure context loading in `.claude/config.json`:

```json
{
  "context": {
    "files": [
      "README.yml",
      "sessions.yml",
      "git.yml",
      "behavior.yml",
      "test.yml",
      "project.yml",
      "custom-context.yml"
    ],
    "autoLoad": true
  }
}
```

**Fields:**
- `files` (array of strings) - List of context files to load from `.claude/context/`
- `autoLoad` (boolean, default: true) - Whether to auto-load at session start

**If `autoLoad` is false:**
- Skip automatic loading at session start
- Only load when user explicitly requests

## Error Handling

### No Config File
- Use default context file list
- Attempt to load from `.claude/context/`
- Don't treat as error

### Missing Context Directory
- Report: "Context directory not found: .claude/context/"
- Suggest: "Run /plugin-init to initialize project"
- Don't fail session

### Missing Context Files
- Skip missing files
- Report which files were skipped
- Continue with available files
- Don't fail operation

### Invalid Config
- Fall back to default list
- Report: "Invalid context config, using defaults"
- Continue operation

## Examples

### Example 1: Session Start (Auto-Invoke)

**Session begins**

```
Context loaded:
✓ README.yml - Compact YAML reading guide
✓ sessions.yml - Session workflow
✓ git.yml - Git workflow rules
✓ behavior.yml - AI behavior preferences
✓ test.yml - Testing strategy
✓ project.yml - Project overview

Loaded 6 context files successfully.
```

**Claude now has all context files loaded and can follow the workflows defined in them.**

### Example 2: Manual Reload

**User:** "reload context"

```
Reloading context files...

Context loaded:
✓ README.yml
✓ sessions.yml
✓ git.yml
✓ behavior.yml
✓ test.yml
✓ project.yml

Loaded 6 context files successfully.
```

### Example 3: Missing Files

**Session begins**

```
Context loaded:
✓ README.yml
✓ sessions.yml
✓ git.yml
✓ behavior.yml
⚠ test.yml - Not found
⚠ custom-workflow.yml - Not found

Loaded 4 of 6 context files.

Note: Some context files are missing. The plugin will work with available context.
```

### Example 4: No Config

**Session begins (no .claude/config.json)**

```
No config found, using default context files.

Context loaded:
✓ README.yml
✓ sessions.yml
✓ git.yml
✓ behavior.yml

Loaded 4 context files successfully.

Tip: Run /plugin-init to create a project-specific configuration.
```

## Integration

**Works with:**
- `.claude/config.json` - Optional project config
- `.claude/context/` directory - Context files location
- `scripts/read-config.sh` - Config reading utility
- All project types (feature and chore workflows)

**Benefits:**
- **Automatic** - No manual loading required each session
- **Consistent** - Same context loaded every time
- **Configurable** - Projects choose what to load
- **Fast** - Parallel loading for efficiency
- **Transparent** - Clear reporting of what loaded
- **Resilient** - Gracefully handles missing files

## Notes

- Context files should be in YAML format for compact representation
- Files are loaded at session start before any user interaction
- This ensures all workflow rules and preferences are available immediately
- Skills are auto-invoked based on triggers (unlike commands which require explicit invocation)
- The skill must work for both feature branches (`issue/feature-N/`) and chore branches (`chore/`)
