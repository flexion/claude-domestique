# Command: /next

## Description
Show the next steps from the current session file. This command helps you quickly understand what to do next without manually reading the session file.

## Usage
```
/next
```

No arguments required. The command automatically detects your current branch and session.

## Implementation

When the user invokes `/next`, follow these steps:

1. **Detect Current Branch**
   ```bash
   git branch --show-current
   ```

2. **Find Session File**
   ```bash
   ./scripts/get-current-session.sh
   ```

   This script:
   - Sanitizes the branch name
   - Looks up branch metadata in `.claude/branches/`
   - Returns the session file path

3. **Read Session File**
   Read the session file at `.claude/sessions/<session-file>.md`

4. **Parse Next Steps Section**
   - Find the "## Next Steps" section
   - Extract all content under that heading until the next `##` heading
   - If no "Next Steps" section found, check for "**Next:**" in session log entries

5. **Display to User**
   Show:
   - Current branch name
   - Session file name
   - Next steps (formatted list or description)

## Error Handling

### No Session File Found
```
No session file found for branch: <branch-name>

To create a session:
  /create-session
```

### No Next Steps Section
```
Session file found: <session-file>
But no "Next Steps" section is defined.

Please update the session file with next steps.
```

### Not in Git Repository
```
Error: Not in a git repository.

This command requires a git-tracked project.
```

## Examples

### Example 1: Feature Branch with Next Steps

**Input:**
```
/next
```

**Output:**
```
Current branch: issue/feature-8/basic-commands
Session: 8-basic-commands.md

Next Steps:
1. Create commands/ directory
2. Implement /next command
3. Test /next command
4. Implement /create-session command
5. Test /create-session command
```

### Example 2: Chore Branch

**Input:**
```
/next
```

**Output:**
```
Current branch: chore/update-docs
Session: chore-update-docs.md

Next Steps:
- Update README with new command documentation
- Add examples to configuration guide
- Commit changes
```

### Example 3: Session with Inline Next Indicator

**Input:**
```
/next
```

**Output:**
```
Current branch: issue/feature-6/config-schema
Session: 6-config-schema.md

Next: Update GitHub issue, test in target projects, or continue with Phase 2 modules
```

## Notes

- This command is read-only and never modifies files
- Works with both chore and feature session formats
- The "Next Steps" section should be kept up to date as work progresses
- Session files can use either a dedicated "## Next Steps" section or inline "**Next:**" indicators
