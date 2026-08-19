# Claude Code: Context Window, Compaction, and Hooks — Deep Reference

Fetched directly from `https://code.claude.com/docs/en/context-window` and `https://code.claude.com/docs/en/hooks-guide`, 2026-08-17.

## Startup load order (before you type anything)

In order: system prompt (~4,200 tokens, always first, never visible) → auto memory `MEMORY.md` (first 200 lines/25KB) → environment info (cwd, platform, git status) → MCP tool names (schemas deferred by default; full schemas load on demand via tool search, or upfront if `ENABLE_TOOL_SEARCH=auto` and they fit in 10% of the window) → skill descriptions (one-liners only; skills with `disable-model-invocation: true` are excluded entirely, staying zero-cost until invoked by `/name`) → `~/.claude/CLAUDE.md` (global) → project `CLAUDE.md`.

As Claude works: each file read adds its full content to context; `paths:`-scoped rules load automatically the moment a matching file is read (not on every tool use — specifically on file reads matching the pattern); `PostToolUse` hooks can inject `additionalContext` after edits.

**Subagent isolation (confirmed, primary source):** a subagent gets its own system prompt (shorter — for the built-in general-purpose agent, brief prompt + environment only), its own copy of project CLAUDE.md (counts against the subagent's context, not the parent's — Explore/Plan built-ins skip this for a smaller footprint), the same MCP servers/skills as the parent (minus plan-mode controls, background-task tools, and the Agent tool itself by default, to prevent recursion), and a task prompt from the parent instead of a user prompt. The **parent's auto memory is not included**; a custom subagent with `memory:` in its frontmatter gets its own separate MEMORY.md instead. Only the subagent's final text response (plus a small metadata trailer) returns to the parent — file reads and intermediate work stay in the subagent's own context and never touch the parent's. This is the documented mechanism behind "fork agents to keep tool noise out of your context."

## What survives `/compact` (verbatim table)

| Mechanism | After compaction |
|---|---|
| System prompt and output style | Unchanged; not part of message history |
| Project-root CLAUDE.md and unscoped rules | Re-injected from disk |
| Auto memory | Re-injected from disk |
| Rules with `paths:` frontmatter | **Lost** until a matching file is read again |
| Nested CLAUDE.md in subdirectories | **Lost** until a file in that subdirectory is read again |
| Invoked skill bodies | Re-injected, capped at 5,000 tokens/skill and 25,000 tokens total; oldest dropped first |
| Hooks | N/A — hooks run as code, not context |
| Skill *descriptions* listing (startup index) | **Not** re-injected — only skills actually invoked before compaction survive |

This is the authoritative grounding for the briefing's §2 working hypothesis about context drift: **path-scoped rules and nested CLAUDE.md genuinely disappear from context after compaction** until their trigger file is read again — an agent mid-task after a compaction event can plausibly "forget" a rule it saw earlier in the session for exactly this documented reason, not just a vague notion of "models used to be worse." If a rule must survive compaction, it needs to be at project-root CLAUDE.md (unscoped) rather than `paths:`-scoped.

Compaction mechanics: it's a structured summary — keeps requests/intent, key technical concepts, files examined/modified with important snippets, errors and fixes, pending tasks, current work. It replaces the verbatim conversation; **full tool outputs and intermediate reasoning are gone**. Claude can reference that work happened but not the exact code it read earlier — a second documented, concrete mechanism for context degradation over a long session (not just "the model got confused" — the raw material is deliberately discarded by design).

Managing it proactively: `/compact focus on X` (steer what's kept), `/autocompact <token count>` (compact earlier, before the automatic pass), `/clear` (wipe entirely between unrelated tasks — old conversation actively crowds out what's needed next), delegate large reads to a subagent (never enters the parent context at all, not even temporarily).

## Full hook lifecycle (confirmed, primary source — supersedes any partial list)

`SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `MessageDisplay`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `DirectoryAdded`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd`.

Notable for the plugin's mission:
- **`InstructionsLoaded`** fires whenever a CLAUDE.md or `.claude/rules/*.md` file loads, with a matcher on *why* it loaded (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`). This is the official tool for **empirically verifying** what actually loads and when — directly answers questions like "does this rule ever actually fire" without guessing.
- **The re-inject-after-compaction pattern**: a `SessionStart` hook matched on `compact` runs a command (e.g. `echo` a reminder, or `git log --oneline -5`) whose stdout is added to Claude's context every time compaction happens. This is an **official, ready-made architectural answer** to context/fundamentals drifting away over a long session — a repo with heavily-accreted rules could pin its highest-stakes BLOCKING rules to survive every compaction via this mechanism instead of hoping the model re-reads a path-scoped rule file.
- **`PreToolUse` with exit code 2 is real, hard enforcement** — blocks the tool call outright, fires before any permission-mode check (even `bypassPermissions`/`--dangerously-skip-permissions`), and feeds the reason back to Claude. A rule asserting enforcement in prose, where the enforcement is deterministic and mechanically checkable, is a candidate for this mechanism instead — prose depends on the model re-reading and applying it, which drift makes unreliable.
- Hooks can also be `prompt` (single Claude/Haiku call for judgment-based checks) or `agent` (a subagent with tool access, up to 50 turns, for checks that need to inspect actual file state) — not just deterministic shell scripts. This matters for "does it sacrifice autonomy/quality" (user's original mandate): a judgment-requiring BLOCKING rule doesn't have to become brittle regex — it can become a `prompt`/`agent` hook that still exercises judgment, just deterministically triggered rather than hoping the model remembers to apply it.
- Hook config can live in a **skill's own frontmatter** (scoped to "rest of session once invoked") or a **subagent's frontmatter** (scoped to while that subagent runs) — not just global/project settings. Relevant to a "convert workflow-shaped rules into skills" recommendation: the skill can carry its own enforcement, not just instructions.

## Sources
- [Explore the context window — Claude Code Docs](https://code.claude.com/docs/en/context-window) (primary, fetched directly)
- [Automate actions with hooks — Claude Code Docs](https://code.claude.com/docs/en/hooks-guide) (primary, fetched directly)
