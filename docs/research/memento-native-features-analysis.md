# Analysis: memento Goals vs Native Claude Code Features

## Executive Summary

**Key Discovery**: Native Claude Code has robust session management (transcripts, resume, checkpoints), but stores **raw conversation data**, not **structured documentation**. memento fills a real gap: human-readable, git-committed, branch-organized work documentation.

A similar open-source project ([claude-sessions](https://github.com/iannuttall/claude-sessions)) validates this need exists.

## memento's Stated Goals

From README:
1. Session persistence across conversation resets
2. 1 Session = 1 Issue = 1 Branch mapping
3. Atomic commits (session + code together)
4. Progress checkpointing
5. Branch metadata files (branch → session lookup)
6. Session templates (structured format)
7. Automatic context restoration
8. Session log (chronological what/when/why)
9. Key decisions documentation
10. Learnings capture
11. Files changed tracking
12. Blockers documentation
13. Team handoffs

## Native Claude Code Session Features

### Session Storage (`~/.claude/projects/`)

| Feature | Capability |
|---------|------------|
| **Automatic saving** | Full message history, tool usage, context |
| **Session naming** | `/rename session-name` |
| **Resume by name** | `claude --resume session-name` |
| **Continue recent** | `claude --continue` |
| **Session picker** | Interactive with preview, search, rename |
| **Git branch filter** | Press `B` in picker to filter by current branch |
| **Per-project org** | Sessions organized by project directory |

### Checkpointing

| Feature | Capability |
|---------|------------|
| **Automatic** | Checkpoint created at each user prompt |
| **File tracking** | Tracks direct file edits |
| **Rewind** | `Esc` + `Esc` or `/rewind` |
| **Persists** | Available in resumed sessions |
| **NOT tracked** | Bash commands, external changes |

### Hook Data Available

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../session.jsonl",
  "cwd": "/current/directory",
  "hook_event_name": "SessionStart"
}
```

## Gap Analysis

### What Native DOES Cover

| memento Goal | Native Feature | Status |
|-------------|----------------|--------|
| Session persistence | `~/.claude/projects/*.jsonl` | **NATIVE** |
| Resume previous work | `claude --continue/--resume` | **NATIVE** |
| Named sessions | `/rename` | **NATIVE** |
| File change tracking | Checkpoints | **NATIVE** (but raw, not summarized) |
| Branch filtering | Picker `B` key | **PARTIAL** (filter only) |

### What Native DOES NOT Cover

| memento Goal | Gap | Why It Matters |
|-------------|-----|----------------|
| **1 Session = 1 Branch** | Native uses session_id, not branch | No automatic branch→session mapping |
| **Auto-create for new branch** | No automatic session creation | Must manually start sessions |
| **Structured templates** | Raw JSONL transcripts | Not human-readable |
| **Session Log** | No structured what/when/why | Can't quickly scan progress |
| **Key decisions** | Not captured | Lost context on why choices made |
| **Next Steps list** | Not in format | No resumption guidance |
| **Git-committed sessions** | `~/.claude/` is user-local | Not shareable with team |
| **Branch switch detection** | No tracking/notification | No awareness of context change |
| **Team handoffs** | User-specific storage | Teammates can't access sessions |

## The Fundamental Difference

**Native sessions**: Raw conversation transcripts (JSONL)
- Great for exact replay
- Machine-readable
- Not human-scannable
- Not git-committable
- User-specific

**memento sessions**: Structured documentation (Markdown)
- Human-readable summary
- Scannable sections (Goal, Log, Next Steps)
- Git-committable
- Team-shareable
- Branch-organized

This is **complementary**, not redundant.

## Validation: claude-sessions Project

The open-source [claude-sessions](https://github.com/iannuttall/claude-sessions) project does something very similar:
- `/project:session-start` - Create session
- `/project:session-update` - Log progress with git changes
- `/project:session-end` - Generate summary
- Stores markdown files in `sessions/` directory

This validates that the need memento addresses is real and not covered by native features.

## What memento Could Leverage

### 1. Status Line (Native)
Replace hook status output with native status line script:
```bash
# ~/.claude/statusline.sh
#!/bin/bash
input=$(cat)
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -f ".claude/sessions/${BRANCH//\//-}.md" ]; then
  echo "📂 Session: ${BRANCH//\//-}.md"
else
  echo "📂 No session"
fi
```

### 2. transcript_path (Hook Data)
Could read native transcript to auto-extract:
- Recent tool usages → Files Changed
- Key decisions from conversation
- Auto-populate session log

### 3. SessionStart Sources
Handle all sources for context restoration:
- `startup` - New session start
- `resume` - Returning to existing session
- `clear` - After /clear
- `compact` - **Critical**: After compaction, remind about session file

### 4. Git Branch Filter
Native picker already has `B` to filter by branch - document this.

## Architecture Recommendation

### Keep memento's Core Value
memento provides **documentation**, not **transcription**:
- Human-readable
- Git-committed
- Branch-organized
- Team-shareable

Native sessions don't replace this.

### Potential Enhancements

1. **Auto-sync session name** - When creating memento session, also `/rename` native session to match

2. **Transcript mining** - Read `transcript_path` to auto-suggest:
   - Files changed (from Write/Edit tool uses)
   - Decisions made (extract from conversation)

3. **Native status line** - Move status display to native statusline feature

4. **Checkpoint integration** - Link memento sessions to native checkpoints for rewind

### Minimal Changes Needed

memento is already well-positioned:
- Hooks provide session_id and transcript_path
- Could enhance with transcript mining
- Status line could migrate to native
- Core value (documentation layer) is unique

## Summary Matrix

| Capability | Native | memento | Verdict |
|------------|--------|---------|---------|
| Transcript storage | ✅ | ❌ | Native |
| Resume conversations | ✅ | ❌ | Native |
| Human-readable summary | ❌ | ✅ | **memento** |
| Git-committed | ❌ | ✅ | **memento** |
| Branch-organized | ⚠️ (filter only) | ✅ | **memento** |
| Team shareable | ❌ | ✅ | **memento** |
| Structured template | ❌ | ✅ | **memento** |
| Auto-create on branch | ❌ | ✅ | **memento** |
| Branch switch detect | ❌ | ✅ | **memento** |
| Next Steps guidance | ❌ | ✅ | **memento** |

## Conclusion

memento addresses a real gap. Native Claude Code manages **conversation state**; memento manages **work documentation**. These are complementary layers.

**Recommendation**: Keep memento largely as-is. Consider:
1. Using native status line for display
2. Mining transcript_path for auto-population
3. Syncing native session names with branch names

## Sources

- [Session Management](https://code.claude.com/docs/en/common-workflows)
- [Checkpointing](https://code.claude.com/docs/en/checkpointing)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Status Line](https://code.claude.com/docs/en/statusline)
- [Memory Management](https://code.claude.com/docs/en/memory)
- [claude-sessions (Similar Project)](https://github.com/iannuttall/claude-sessions)
- [Context Persistence Issue #2954](https://github.com/anthropics/claude-code/issues/2954)
- [Persistent Memory Request #14227](https://github.com/anthropics/claude-code/issues/14227)
