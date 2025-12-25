# Research: Claude Code Hooks for Context Injection

## Executive Summary

Claude Code hooks provide a mechanism for injecting context into Claude's conversation via the `additionalContext` field. This research documents the hook system, available events, and data structures to inform issue #99 (hook-based context injection).

## Hook Events Overview

Claude Code provides 10 hook events:

| Event | When Fired | Can Block? | Context Injection? |
|-------|------------|------------|-------------------|
| **SessionStart** | Session starts, resumes, clears, or compacts | No | Yes |
| **UserPromptSubmit** | User submits prompt, before Claude processes | Yes | Yes |
| **PreToolUse** | After Claude creates tool params, before execution | Yes | No |
| **PermissionRequest** | Permission dialog shown to user | Yes | No |
| **PostToolUse** | After tool completes successfully | Feedback | Yes |
| **Stop** | Main agent finishes responding | Yes | Reason only |
| **SubagentStop** | Subagent (Task tool) finishes | Yes | Reason only |
| **Notification** | Claude sends notification | No | No |
| **PreCompact** | Before compact operation | No | No |
| **SessionEnd** | Session ends | No | No |

## Inbound Data Structures (stdin)

### Common Fields (All Events)

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../session.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default|plan|acceptEdits|bypassPermissions",
  "hook_event_name": "EventName"
}
```

### SessionStart

```json
{
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear|compact",
  "context_window": {
    "context_window_size": 200000,
    "current_usage": {
      "input_tokens": 15000,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 10000
    }
  },
  "CLAUDE_ENV_FILE": "/path/to/env-file"
}
```

**Source values:**
- `startup`: Fresh session start
- `resume`: Resuming existing session
- `clear`: After `/clear` command
- `compact`: After automatic or manual compaction

### UserPromptSubmit

```json
{
  "hook_event_name": "UserPromptSubmit",
  "prompt": "The user's submitted prompt text",
  "context_window": { /* same as SessionStart */ }
}
```

### PreToolUse / PostToolUse

```json
{
  "hook_event_name": "PreToolUse|PostToolUse",
  "tool_name": "Write|Edit|Bash|Glob|Grep|Read|WebFetch|Task|mcp__*",
  "tool_input": {
    // Schema varies by tool
    // Write/Edit: file_path, content
    // Bash: command, description
    // Read: file_path
  },
  "tool_use_id": "toolu_01ABC123...",
  "tool_response": { /* PostToolUse only */ }
}
```

### Stop / SubagentStop

```json
{
  "hook_event_name": "Stop|SubagentStop",
  "stop_hook_active": true|false
}
```

## Outbound Data Structures (stdout)

### Context Injection Pattern

The primary mechanism for injecting context into Claude:

```json
{
  "systemMessage": "Status message shown to user in UI",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart|UserPromptSubmit",
    "additionalContext": "Text injected directly into Claude's context"
  }
}
```

**Critical distinction:**
- `systemMessage`: Displayed to user in interface (status line)
- `additionalContext`: Injected into Claude's conversation context

### Decision Control (PreToolUse)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "Explanation",
    "updatedInput": { /* modify tool params */ }
  }
}
```

### Blocking Prompts (UserPromptSubmit)

```json
{
  "decision": "block",
  "reason": "Why blocked (shown to user, prompt erased)",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit"
  }
}
```

### Stop Control

```json
{
  "decision": "block",
  "reason": "Instructions for Claude on what to do next"
}
```

## Exit Code Behavior

| Exit Code | Behavior |
|-----------|----------|
| **0** | Success. stdout parsed as JSON or displayed to user |
| **2** | Blocking error. stderr fed back to Claude/user. JSON ignored |
| **Other** | Non-blocking error. stderr shown in verbose mode only |

## Environment Variables

Available to all hooks:
- `CLAUDE_PROJECT_DIR`: Absolute path to project root
- `CLAUDE_PLUGIN_ROOT`: Absolute path to plugin directory (plugin hooks only)
- `CLAUDE_CODE_REMOTE`: "true" if remote/web environment
- `CLAUDE_ENV_FILE`: File for persisting env vars (SessionStart only)

## Execution Characteristics

| Aspect | Details |
|--------|---------|
| Timeout | 60 seconds default, configurable per hook |
| Parallelization | All matching hooks run in parallel |
| Deduplication | Identical commands auto-deduplicated |
| Working Directory | Runs in cwd with Claude Code's environment |

## Current Plugin Implementation Status

| Plugin | SessionStart | UserPromptSubmit | Injects Context? |
|--------|--------------|------------------|------------------|
| **mantra** | Status + token count | Prompt counter | **No** - relies on native `.claude/rules/` |
| **memento** | Session path + instructions | Same | **Yes** - session file path hint |
| **onus** | Full `.yml` files | Issue status | **Yes** - git.yml, work-items.yml content |

## Key Findings for Issue #99

1. **mantra does not inject context via hooks** - it only provides status messages. Actual rules load via Claude Code's native `.claude/rules/` mechanism requiring `/mantra:init`.

2. **onus already demonstrates the pattern** - reads `.yml` files from `context/` and injects via `additionalContext` on SessionStart.

3. **SessionStart fires on compact** - with `source: "compact"`, enabling context refresh without periodic injection.

4. **`additionalContext` is the key field** - this is what injects text into Claude's conversation context.

5. **Multiple hooks concatenate** - when multiple SessionStart hooks return `additionalContext`, values are concatenated.

## Recommended Approach

1. **Add context injection to mantra** - load `rules/*.md` frontmatter and inject via `additionalContext`
2. **Periodic refresh on UserPromptSubmit** - re-inject full context every N prompts
3. **Lazy companion loading** - include plugin path in context so Claude knows where to find detailed docs
4. **Unified utility** - shared context loading logic across all three plugins

## References

- Claude Code Hooks Documentation: https://code.claude.com/docs/en/hooks.md
- Claude Code Hooks Guide: https://code.claude.com/docs/en/hooks-guide.md
