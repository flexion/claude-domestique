# Context Refresh Agent

## Description

Monitors interaction count during long sessions and triggers periodic context refresh to prevent drift from core values and project context. Works with the context-loader skill to reload context files at configurable intervals.

## Purpose

Long sessions can drift from original context values:
- AI may gradually forget skeptical stance, workflow rules
- Context files may be updated during session (team changes)
- Quality standards may slip without periodic reinforcement

This agent ensures context stays fresh and values remain enforced.

## Trigger Conditions

This agent activates when:

1. **Interaction threshold reached** - Interaction count hits configured interval (default: 20)
2. **Only during active work** - Not idle sessions
3. **Not recently refreshed** - Skips if context refreshed within last 10 interactions

## Agent State

The agent maintains internal state:

```
interaction_count: 0          # Increments each user message
last_refresh_at: 0            # Interaction count when last refreshed
refresh_interval: 20          # Configurable (from config.json)
refresh_enabled: true         # Configurable (from config.json)
```

## Actions

### Step 1: Check Configuration

Read refresh settings from `.claude/config.json`:

```json
{
  "context": {
    "periodicRefresh": {
      "enabled": true,
      "interval": 20
    }
  }
}
```

**Defaults (if not configured):**
- `enabled`: true
- `interval`: 20

### Step 2: Track Interactions

On each user message:
1. Increment `interaction_count`
2. Check if refresh threshold reached: `interaction_count - last_refresh_at >= refresh_interval`

### Step 3: Check Skip Conditions

Before refreshing, verify:
- `refresh_enabled` is true
- Not recently refreshed (within last 10 interactions)
- Session is active (not idle)

If any skip condition met, log and continue without refresh.

### Step 4: Trigger Context Reload

When refresh needed:
1. Invoke the **context-loader skill** to perform actual loading
2. Record: `last_refresh_at = interaction_count`
3. Report refresh to user

### Step 5: Report Results

Display refresh notification:

```
[Periodic context refresh at interaction 20]

Refreshing context to maintain alignment with core values...

Core context loaded (from plugin):
✓ README.yml
✓ behavior.yml
✓ git.yml
✓ sessions.yml

Project context loaded (from .claude/context/):
✓ project.yml
✓ test.yml

Context refreshed. Core values and project context reloaded.
Next refresh at interaction 40.
```

## Configuration

Projects control refresh behavior in `.claude/config.json`:

**Enable with default interval (20):**
```json
{
  "context": {
    "periodicRefresh": {
      "enabled": true
    }
  }
}
```

**Custom interval (every 100 interactions):**
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

**Disable periodic refresh:**
```json
{
  "context": {
    "periodicRefresh": {
      "enabled": false
    }
  }
}
```

**When to adjust interval:**
- **Increase (e.g., 50)**: Stable projects, infrequent context changes
- **Decrease (e.g., 10)**: Active context updates, strict adherence needed
- **Disable**: Very short sessions, context never changes

## Integration

**Works with:**
- `context-loader` skill - Performs actual context loading
- `.claude/config.json` - Configuration source
- Plugin `context/` directory - Core context files
- Project `.claude/context/` - Custom context files

**Does NOT duplicate:**
- Context loading logic (uses context-loader skill)
- File reading (delegates to skill)
- Two-tier loading (handled by skill)

## Examples

### Example 1: Normal Refresh Cycle

**Interaction 1-19:** Agent increments counter, no action

**Interaction 20:**
```
[Periodic context refresh triggered]

Refreshing context (periodic refresh at 20 interactions)...

Core context loaded (from plugin):
✓ README.yml - Compact YAML format guide
✓ behavior.yml - Skeptical AI behavior, quality focus
✓ git.yml - Git workflow (no attribution, HEREDOC)
✓ sessions.yml - Session management workflow

Project context loaded (from .claude/context/):
✓ project.yml
✓ test.yml
✓ deploy.yml

Loaded 4 core + 3 project = 7 context files successfully.

Context refreshed. Core values reinforced.
Next refresh at interaction 40.
```

### Example 2: Skip (Recently Refreshed)

**User manually says "refresh context" at interaction 15**
**Context-loader skill handles it**

**Interaction 20:**
```
[Periodic refresh skipped - context refreshed recently at interaction 15]
Next check at interaction 25.
```

### Example 3: Disabled

**Config has `periodicRefresh.enabled: false`**

**Interaction 20:** No action, agent remains dormant

### Example 4: Custom Interval

**Config has `periodicRefresh.interval: 10`**

**Interaction 10:**
```
[Periodic context refresh triggered]

Refreshing context (periodic refresh at 10 interactions)...
...
Next refresh at interaction 20.
```

## Error Handling

### Configuration Missing
**Scenario**: No `periodicRefresh` in config

**Action**: Use defaults (enabled: true, interval: 20)

### Context-Loader Skill Fails
**Scenario**: Skill reports error during loading

**Action**:
- Report error to user
- Do NOT update `last_refresh_at`
- Retry at next interval

### Invalid Configuration
**Scenario**: `interval` is not a number or is negative

**Action**: Fall back to default (20), warn user

## Benefits

- **Maintains alignment** - Core values stay fresh throughout session
- **Catches updates** - Picks up context file changes mid-session
- **Configurable** - Projects control frequency
- **Non-intrusive** - Brief notification, then continue working
- **Separation of concerns** - Agent monitors, skill loads

## Notes

- Agent tracks state internally (not persisted across sessions)
- Session start triggers context-loader skill directly (not this agent)
- Manual "refresh context" handled by context-loader skill (not this agent)
- This agent ONLY handles periodic/scheduled refreshes
- Count resets to 0 at session start
