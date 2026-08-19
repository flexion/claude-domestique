# Codex: Context, AGENTS.md, Skills, Subagents, Hooks, and Plugins

Collected by jay (Codex), 2026-08-17. All host-behavior claims are drawn from official OpenAI documentation. Illustrative target-repository scenarios are separately labelled as repo-local analysis; they are worked examples of what an audit would reason about, not survey findings.

## AGENTS.md instruction discovery

- Codex builds its instruction chain at session start. At global scope it uses the first non-empty `AGENTS.override.md` or `AGENTS.md` in `CODEX_HOME`; at project scope it walks from repository root to the current directory, reading at most one configured instruction file per directory.
- Files concatenate root-to-current-directory, so deeper guidance appears later and overrides broader guidance. Empty files are skipped.
- The combined project-instruction size is capped by `project_doc_max_bytes`, **32 KiB by default**. Codex stops adding instruction files at that cap. The documented remedies are a deliberate cap increase or nested, specialized guidance.
- A file existing on disk does not prove it loaded. Official verification options include asking Codex to summarize current instructions or list active instruction files from a target directory, and inspecting the TUI log or enabled session JSONL.

### Repo-local analysis (hypothetical target, illustrative)

`AGENTS.md` is the native Codex entry point. An explicit instruction to read `.claude/rules/*.md` can be a repository's intended Claude/Codex parity mechanism, but those files are outside Codex's native `AGENTS.md` discovery chain and must be traced separately. Do not remove a restatement until the shared source's actual path to both hosts is proved.

There is no documented Codex import syntax equivalent to Claude's `@AGENTS.md` import. A future cross-host pattern could use native Codex loading of a slim canonical `AGENTS.md` and a Claude import of that file plus Claude-only additions. That removes front-door copy/paste drift only; it neither shrinks context by itself nor establishes a rule-file load path.

## Context compaction and durable state

- Codex has both manual `/compact` and automatic history compaction. The manual command summarizes visible chat to free tokens; automatic compaction also occurs when the model reaches its configured/default threshold.
- `model_auto_compact_token_limit` sets an automatic threshold; when unset, the model default applies. `model_auto_compact_token_limit_scope` defaults to `total`, counting the full active context; `body_after_prefix` instead counts growth after the carried compaction-window prefix. `model_context_window`, `compact_prompt`, and experimental `experimental_compact_prompt_file` are related configuration controls.
- The documented contract is a concise summary that retains critical details. OpenAI does **not** document an exhaustive turn-by-turn survival table or a guarantee that any particular earlier instruction, tool output, or decision remains verbatim. An audit must therefore treat post-compaction retention as lossy unless it is independently verified.
- Codex exposes `PreCompact` and `PostCompact` hooks for both `manual` and `auto` triggers. After root-session compaction, `SessionStart` runs with source `compact` before the next model request; automatic mid-turn compaction can supply that extra context to the immediate continuation.

### Audit guidance

Keep non-negotiable decisions in a small durable artifact (for example, a branch session note) and re-inject only a concise, current subset through a `SessionStart` hook matching `compact` if the project elects to use hooks. Do not solve drift by repeatedly injecting whole rule sets: hook/plugin context accumulates and can reduce model performance.

## Skills

- A skill is a directory whose required `SKILL.md` supplies `name`, `description`, and instructions; scripts, references, and assets are optional.
- Skill discovery is progressive. Codex initially receives names, descriptions, and paths, and reads full instructions only on selection. The initial list has a 2%-of-context budget (or 8,000 characters if the window is unknown), so concise, front-loaded descriptions and clear trigger boundaries matter.
- Implicit selection depends on the description. OpenAI recommends focused, instructions-first skills with explicit inputs and outputs, tested against the intended trigger prompts.
- The documented repository discovery location is `.agents/skills`, scanned from the current directory toward repository root. A direct folder suits local/repository workflows; plugins suit stable, distributable capabilities or related skills/connectors.

### Repo-local analysis (hypothetical target, illustrative)

**Testable shape:** a repository may place skills at a path that differs from the documented native scanner location, and may carry no skill-path configuration that would redirect discovery to it. Where that holds, native Codex discovery is **unproven rather than broken** — the layout may still work through a route the documentation does not describe, or may not load at all.

The audit rule is therefore about proof, not about the path: a non-native skills location requires runtime confirmation (`/skills` plus a live selection or log trace) before any recommendation to keep, move, or remove it. Recommending a layout change on documentation alone would be acting on an assumption.

## Subagents

- Codex delegates bounded work to specialized subagents; every subagent consumes additional model and tool tokens. The main agent retains requirements, decisions, and final output, while workers should return distilled findings rather than raw intermediate output.
- The documented fit is independent, read-heavy work such as exploration, tests, triage, log analysis, and summarization. Concurrent write-heavy work increases conflict and coordination overhead.
- A strong delegation prompt states the exact division of work, whether the parent should wait, and the required returned summary. Subagents inherit the parent's approval and sandbox policy; a profile cannot weaken the parent's runtime controls.
- Custom agent profiles live under `.codex/agents/` or `~/.codex/agents/`, have a name, description, and developer instructions, and extend normal configuration. Built-ins include `default`, `worker`, and `explorer`.

## Hooks: lifecycle, data, and context injection

Hooks are additive across active configuration layers (`hooks.json` or inline `[hooks]`), plugin bundles, and managed sources. Project hooks load only when the project `.codex` layer is trusted. Non-managed command hooks are hash-reviewed before execution; `/hooks` manages review/trust. Only `command` handlers run today—`prompt` and `agent` handlers are parsed but skipped.

| Lifecycle point | Event | Primary use and steering capability |
| --- | --- | --- |
| Before a supported tool | `PreToolUse` | Inspect or block/rewrite tool input; can inject `additionalContext`. |
| On a permission request | `PermissionRequest` | Allow/deny approval decisions. |
| After a supported tool | `PostToolUse` | Add developer context or replace model-visible feedback; cannot undo side effects. |
| Before / after compaction | `PreCompact`, `PostCompact` | Observe `manual`/`auto`; `continue: false` can stop before/after compaction. Plain stdout is ignored. |
| Before sending a user prompt | `UserPromptSubmit` | Add developer context or block the prompt. |
| Root / child session start | `SessionStart`, `SubagentStart` | Inject developer context; `SessionStart` source includes `startup`, `resume`, `clear`, `compact`. |
| Child / root turn stop | `SubagentStop`, `Stop` | Request a continuation (with event-specific constraints). |
| Main thread ends | `SessionEnd` | Advisory cleanup/recording only; does not run for subagents. |

- Every command hook receives one JSON object on stdin with at least `session_id`, `transcript_path`, `cwd`, `hook_event_name`, and `model`; turn events add `turn_id`. The transcript path is convenient but its format is explicitly not a stable hook interface.
- Tool events add canonical tool name, input, invocation id, and (for `PostToolUse`) response. Supported local paths include `Bash`/unified exec, `apply_patch` (`Edit`/`Write` aliases), MCP tools, and other local function tools; hosted tools such as web search are not on this hook path. Some specialized tools may opt out, so hooks are guardrails rather than a complete enforcement boundary.
- `SessionStart`, `SubagentStart`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse` can supply `additionalContext` in their event-specific JSON output. Plain stdout also adds context for `SessionStart`, `SubagentStart`, and `UserPromptSubmit`. `PreCompact`/`PostCompact` do not inject context.
- Per-handler `additionalContextLimit` defaults to roughly 2,500 tokens. Oversized output spills to disk and the model receives a head/tail preview and path; `0` disables that limit and is risky. Context from multiple hooks/plugins accumulates, and sensitive data must not be emitted because spilled output is written to disk.
- Hooks default to synchronous execution (normally 600 seconds; `SessionEnd` defaults to one second and permits at most three). `async: true` returns control immediately and delivers informational output only at the next safe model point; it cannot block, approve, rewrite, or initiate a user turn. Up to eight background hooks may run concurrently.
- Plugins can bundle hooks by default in `hooks/hooks.json` or via a manifest `hooks` entry. Plugin hook commands receive `PLUGIN_ROOT` and `PLUGIN_DATA` (and Claude-compatibility variables); installation does not automatically trust them.

### Audit guidance

Use hooks for deterministic checks with bounded output: evidence capture, a real policy gate for a narrow safety condition, or compact-session rehydration. Do not call prose labelled “BLOCKING” enforcement unless a hook, CI rule, or platform control demonstrably implements it. A remediation recommendation should specify the event, matcher, input/output contract, trust and secret implications, and the verification path.

## Plugins

- A plugin is an installable package that can contain skills, an MCP server, or both. ChatGPT and Codex share the universal plugin directory.
- OpenAI recommends starting with a skill while iterating on one personal workflow, and packaging it as a plugin when sharing, bundling related skills, adding a connector, or distributing a stable team capability.
- A plugin hook or MCP server is an operational capability, not merely a prompt. Its manifest paths, trust state, installed dependencies, and lifecycle behavior must be checked in the host where it will run.

## Sources

- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Hooks](https://learn.chatgpt.com/docs/hooks)
- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins)
