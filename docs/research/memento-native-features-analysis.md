# Analysis: memento Goals vs Native Claude Code Features

## Executive Summary

**Key Discovery**: Native Claude Code has robust session management (transcripts, resume, checkpoints), but stores **raw conversation data**, not **structured documentation**. memento fills a real gap: human-readable, git-committed, branch-organized work documentation.

A similar open-source project ([claude-sessions](https://github.com/iannuttall/claude-sessions)) validates this need exists.

## Flexion Fundamentals Alignment

memento's unique value enables these Flexion fundamentals:

| Fundamental | How memento Enables It |
|-------------|----------------------|
| **Design as you go** | Session file is a **living design document** that evolves from requirements through implementation |
| **Lead by example** | Persists decisions and design rationale so nothing is lost |
| **Empower customers to adapt** | Enables team handoffs with full design context |

### Critical Use Case: Design As You Go (PRIMARY)

The most important memento use case: Sessions capture iterative design BEFORE code is written.

**Workflow:**
1. **Pre-implementation design** - Hours of discussion working through requirements, inconsistencies, high-level design
2. **Session captures design** - Decisions, trade-offs, and rationale persisted in session file
3. **Design guides implementation** - When coding starts, session provides the design context
4. **Implementation informs design** - Work reveals new insights → session updated with refined design
5. **Final state** - Session contains up-to-date, consistent design document

**Key insight**: The session file is a **living design document**, not just post-hoc documentation. It evolves throughout the entire lifecycle—from initial requirements through implementation.

Native sessions store *conversation transcripts* (JSONL). memento creates *living design documents* (structured markdown) that embody how Flexion developers design, iterate, and communicate.

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

## Goal-Focused Analysis

The question isn't "what can memento do?" but "what delivers the Flexion fundamentals to the installed project?"

### What Actually Delivers Value

| Flexion Fundamental | What Delivers It | Simplest Implementation |
|---------------------|------------------|------------------------|
| **Lead by example** | Git-committed session files that persist decisions | Structured markdown in `.claude/sessions/` |
| **Empower customers to adapt** | Team-readable handoff documentation | Human-readable format, not JSONL |
| **Design as you go** | Evolving session log, next steps, blockers | Template sections that capture learning |

**Key Insight**: The *session file format* delivers value. A teammate checking out a branch can read `.claude/sessions/feature-42.md` and understand what was done, why, and what's next. Native transcripts (JSONL) cannot provide this.

### Native Features That Don't Replace This

| Native Feature | Why It's Different |
|----------------|-------------------|
| `~/.claude/projects/*.jsonl` | Machine-readable transcript, not human-readable documentation |
| `claude --resume` | Resumes YOUR conversation, doesn't help teammates |
| Checkpoints | Point-in-time snapshots, not structured knowledge transfer |
| Branch filter (`B` key) | Filters sessions, doesn't create branch→session mapping |

### What Remains Unique to memento

1. **Structured session files** - Goal, Log, Decisions, Next Steps, Files Changed
2. **Git-committed documentation** - `.claude/sessions/` lives in repo, not `~/.claude/`
3. **Branch→session mapping** - Automatic lookup from branch name
4. **Team handoffs** - Readable by any teammate, not user-specific

## Simplest Architecture Recommendation

**Principle**: memento IS the documentation layer. Keep it simple; don't over-engineer.

```
memento (core deliverable):
├── .claude/sessions/*.md            ← Structured session files (THE VALUE)
├── .claude/branches/*               ← Branch→session mapping
└── SessionStart hook                ← Remind about session file

Skills (user-invoked):
├── /memento:init                    ← Create directories
└── /memento:session                 ← Create/update/show session
```

### Reliability Over Simplicity

**Critical insight**: Users don't reliably invoke skills manually. If the Flexion goal is "Lead by example" (decisions persist), the mechanism must **ensure** documentation happens, not hope users remember.

| Approach | Reliability | Why |
|----------|-------------|-----|
| Skills only (`/memento:session`) | ❌ Low | Users forget; session files go stale |
| Hooks with reminders | ✅ High | Persistent prompts; hard to ignore |
| Automatic updates | ⚠️ Medium | May capture noise; less intentional |

**Recommendation**: Hooks are essential for reliability. The hook's job is to make session updates **unavoidable** without being annoying.

### What Hooks Should Do

| Trigger | Hook Action | Purpose |
|---------|-------------|---------|
| **SessionStart** | Show session path, Next Steps | Context restoration |
| **SessionStart(compact)** | Remind to check session accuracy | Post-compaction recovery |
| **Branch switch** | Prompt for session file if missing | Auto-create for new work |
| **Stop (after commits)** | Suggest session update | Capture milestone |

### What memento Could Leverage (Native)

1. **Native statusline** - Persistent session indicator (supplements hooks, doesn't replace)
   ```bash
   # ~/.claude/statusline.sh
   BRANCH=$(git branch --show-current 2>/dev/null)
   SESSION=".claude/sessions/${BRANCH//\//-}.md"
   [ -f "$SESSION" ] && echo "📂 ${SESSION##*/}" || echo "📂 No session"
   ```

2. **SessionStart(compact)** - Already fires; use it to remind about session freshness

3. **Stop hook** - Detect commits and suggest session update (milestone trigger)

### Migration Path

1. **Immediate**: Keep hooks for reliability; they're essential
2. **Short-term**: Add native statusline as persistent indicator (supplement, not replace)
3. **Medium-term**: Explore Stop hook for commit-triggered session prompts
4. **Long-term**: Explore transcript mining to suggest "Files Changed" (reduce manual work)

## Conclusion

memento's job is to deliver team-shareable work documentation. The **session file format** is the value—it enables "Lead by example" (decisions persist), "Empower customers to adapt" (teammates can read it), and "Design as you go" (captures learning).

**Reliability is paramount.** Skills alone won't ensure documentation happens. Hooks provide the persistent reminders that make session updates unavoidable.

As Claude Code's native features expand, memento should:

- **Keep**: Session file format, branch→session mapping, git-committed storage, **hooks for reliability**
- **Delegate to native**: Status display (supplement), compaction handling
- **Explore**: Stop hook for milestone detection, transcript mining for auto-suggestions

The simplest **reliable** memento is: session file template + hooks that ensure updates happen + skills for manual invocation. Reliability trumps simplicity.

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
