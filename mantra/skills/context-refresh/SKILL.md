---
name: context-refresh
description: |
  Keep Claude aligned with project conventions throughout long sessions.
  Prevent context drift where Claude forgets guidance as conversation grows.
  Use this skill when:
  - A refresh is due (hook indicates refreshDue: true)
  - User asks about project conventions or guidelines
  - Behavior drift is detected (Claude forgetting earlier guidance)
  - User explicitly requests a context refresh
---

# Context Refresh

Inject project context to maintain alignment with conventions throughout long sessions.

## When to Use This Skill

Proactively invoke when:
- Hook output shows `refreshDue: true`
- User asks about project conventions, coding standards, or guidelines
- Claude's responses drift from established patterns (skeptical-first, evidence-based)
- Session is long and context may have been compacted

## Goal

Prevent "context drift" where Claude gradually forgets project guidance as conversations grow longer. The hook tracks interaction count; this skill loads and injects the actual context content.

## Context Sources (Priority Order)

1. **Base context** (`mantra/context/*.yml`) - AI behavior rules shipped with plugin
2. **Sibling plugins** - Context from memento/onus if installed
3. **Project extensions** (`.claude/context/*.yml`) - Project-specific rules
4. **CLAUDE.md fallback** - Legacy format (with migration warning)

## Two-Tier Content Model

- **Tier 1 (yml)**: Compact rules - always injected on refresh
- **Tier 2 (md)**: Verbose examples - loaded on-demand when needed

When loading context, read all `.yml` files from each source. Only load `.md` files when:
- User explicitly asks for examples
- Clarification is needed on a specific guideline
- Deep-dive into a particular topic is required

## Quick Reference

### Check Context Status
The hook provides status in format:
```
Mantra: 1/5 ⏳ | base(423) sibling(352) project(43)
        ^   ^     ^--- size in bytes per source
        |   pending (skill hasn't confirmed yet)
        count/interval

Mantra: 1/5 ✅ | base(423) sibling(352) project(43)
            ^--- confirmed (skill loaded context)
```

### Confirm Context Loaded (REQUIRED)
After loading context files, you MUST confirm by updating the state file:

```bash
# Read current state, set skillConfirmed, write back
node -e "
const fs = require('fs');
const path = require('path');
const stateFile = path.join(process.env.HOME, '.claude', 'mantra-state.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
state.skillConfirmed = true;
state.refreshPending = false;
fs.writeFileSync(stateFile, JSON.stringify(state));
console.log('✅ Context refresh confirmed');
"
```

This changes the status line from ⏳ to ✅ on the next prompt.

### Force Refresh
User can request: "refresh context" or run `/mantra:refresh`

### Context File Locations
```bash
# Base context (plugin)
mantra/context/*.yml

# Sibling plugins (auto-detected)
memento/context/*.yml
onus/context/*.yml

# Project extensions
.claude/context/*.yml

# Legacy (fallback)
CLAUDE.md
```

## Key Rules (from behavior.yml)

1. **Skeptical-first** - Assess before agreeing, find problems not agreement
2. **Evidence-based** - Minimum 3 documented examples, no guessing
3. **TDD workflow** - Write test first, run to fail, then implement
4. **Minimal implementation** - Only what's needed, no over-engineering

## What This Skill Does NOT Do

- Define behavior rules (see behavior.yml)
- Define context format (see context-format.yml)
- Handle session management (see memento)
- Handle git operations (see onus)

## Standalone Behavior

When mantra is installed without sibling plugins:
- Load only base context and project extensions
- Sibling context is enhancement, not requirement
- All core functionality works independently
