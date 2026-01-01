---
description: Evidence-based debugging workflow for errors and bugs
argument-hint: [error message or bug description]
---

# Troubleshoot

Perform evidence-based debugging using documented examples rather than guessing.

## Task

**IMPORTANT: This skill implements the TROUBLESHOOTING & DEBUGGING rule from behavior.md**

When the user reports an error, bug, or unexpected behavior, you MUST find documented evidence before proposing fixes. No guessing.

### Evidence-Based Workflow

1. **Gather Context**
   - Get full error message and stack trace
   - Identify version numbers (runtime, libraries, tools)
   - Understand what the user was trying to do

2. **Research First**
   Use these sources in order:
   - **GitHub Issues**: Search the project's issue tracker
   - **Web Search**: Find real documented cases
   - **Official Docs**: Check changelogs, known issues, migration guides

3. **Cross-Reference Requirement**
   - Find minimum 3 documented examples of the same or similar error
   - Sources must be authoritative (issue trackers, release notes, official docs)
   - Do NOT rely on a single Stack Overflow answer

4. **Pattern Matching**
   Only after finding documented evidence:
   - Identify common causes across examples
   - Note what solutions worked in each case
   - Determine if user's context matches

5. **Propose Solution**
   - Reference the documented examples
   - Explain why this solution applies to user's case
   - Provide verification steps

### What NOT to Do

- Jump to "common solutions" from training data
- Pattern-match without verification
- Shotgun debugging (try random fixes)
- Fill knowledge gaps with speculation
- Propose fixes without citing sources

### Output Format

```
## Troubleshooting: [error summary]

### Context Gathered
- Error: [full message]
- Environment: [versions, platform]
- Action: [what user was doing]

### Research Findings

**Source 1**: [link or reference]
- Cause: [identified cause]
- Solution: [what worked]

**Source 2**: [link or reference]
- Cause: [identified cause]
- Solution: [what worked]

**Source 3**: [link or reference]
- Cause: [identified cause]
- Solution: [what worked]

### Analysis
[Common patterns across sources, applicability to user's case]

### Recommended Fix
[Solution with steps]

### Verification
[How to confirm the fix worked]
```

## Example

```
User: /mantra:troubleshoot TypeError: Cannot read properties of undefined (reading 'map')

Claude: ## Troubleshooting: TypeError on .map()

### Context Gathered
Let me get more details:
- Where does this error occur? (file:line)
- What data are you mapping over?
- Did this work before? What changed recently?

[After user provides context]

### Research Findings

**Source 1**: React GitHub Issue #14920
- Cause: API response returning undefined before data loads
- Solution: Add loading state or optional chaining

**Source 2**: Stack Overflow - verified answer with 200+ votes
- Cause: Component renders before async data arrives
- Solution: Initialize state with empty array, not undefined

**Source 3**: React Docs - Conditional Rendering
- Cause: Race condition between render and data fetch
- Solution: Guard clause or early return when data unavailable

### Analysis
All three sources point to the same root cause: trying to call .map() on data that hasn't loaded yet. Your fetch likely returns undefined on error or hasn't completed.

### Recommended Fix
```javascript
// Before
{items.map(item => ...)}

// After - Option 1: Optional chaining
{items?.map(item => ...) ?? null}

// After - Option 2: Guard clause
{items && items.length > 0 && items.map(item => ...)}

// After - Option 3: Loading state (preferred)
if (!items) return <Loading />;
return items.map(item => ...);
```

### Verification
- Error should not occur when component first renders
- Check Network tab to confirm API response shape
- Add console.log before .map() to verify data structure
```

## When to Use

Invoke this skill when:
- User reports an error message
- Something "stopped working"
- Unexpected behavior occurs
- User asks "why is this happening?"

## When Stuck

If you can't find 3 documented examples:
- Ask user for more context (exact error, reproduction steps)
- Search with different keywords
- Check if this is a new/unreported issue
- Do NOT guess - say "I couldn't find documented cases for this specific issue"
