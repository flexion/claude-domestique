# Claude Code: Live Context Debugging and Fidelity Hierarchy

Fetched directly from `https://code.claude.com/docs/en/debug-your-config` and `https://code.claude.com/docs/en/best-practices`, 2026-08-17.

## Live-context debugging toolkit (source-attributed, not just static file review)

| Command | What it shows | Use for |
|---|---|---|
| `/context` | Everything occupying the context window right now, by category: system prompt, system tools, MCP tools, **custom subagents with the source each loaded from**, memory files, skills, conversation messages | First stop: confirm whether a file is present *at all* before debugging why an instruction isn't followed |
| `/doctor` | Full checkup: invalid settings files, duplicate subagent names, unused skills/plugins, **checked-in CLAUDE.md content Claude can derive from the codebase** (with proposed trims), slow hooks — reports green/yellow/red, offers to fix with confirmation | The plugin's exact use case: an automated, official context-bloat/redundancy auditor already exists for Claude |
| `/hooks` | Every registered hook grouped by event, from its source file | Confirm a hook is actually registered before assuming it fires |
| `/mcp` | Connected servers, status, approval state | Diagnose a connected-but-toolless server, or an unapproved project server |
| `/permissions` | Resolved allow/deny rules currently in effect, after all scope merging | Trace *why* an action was allowed/blocked |
| `/status` | Active settings sources, whether managed settings are in effect | Find which settings scope is winning for a given key |
| `/debug [issue]` | Enables debug logging, prompts Claude to diagnose from the log + settings paths | Deepest level before manual log reading |

**Root-cause isolation, not just inspection:** `claude --safe-mode` disables all customization (CLAUDE.md, skills, plugins, hooks, MCP, custom commands/agents) while keeping auth/model/permissions — if a problem disappears, the cause is confirmed to be in project/user config, and the targeted commands above narrow which surface. `CLAUDE_CONFIG_DIR=/tmp/empty claude` from a directory with no `.claude`/`CLAUDE.md` goes further, bypassing everything under `~/.claude` too — a genuine clean-room comparison.

**Attribution mechanism confirmed:** `InstructionsLoaded` hook (from the earlier hooks research) fires with a `matcher` on *why* a file loaded (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`) — this plus `/context`'s per-item source is the concrete "trace context injection back to its source" capability the plugin needs, already built into the platform rather than something the plugin has to invent.

**Documented anti-pattern that IS the plugin's mission, verbatim:** "The over-specified CLAUDE.md. If your CLAUDE.md is too long, Claude ignores half of it because important rules get lost in the noise. Fix: Ruthlessly prune. If Claude already does something correctly without the instruction, delete it or convert it to a hook." Also: "If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost." This is Anthropic's own stated causal mechanism for rule-following failure — directly grounds why a large, unscoped always-loaded rule surface is not just "wasteful" but actively self-defeating for the very rules it's trying to enforce.

## Fidelity / "front of mind" mechanisms (concrete, not vague)

Claude Code doesn't publish a single named "instruction hierarchy" doc the way OpenAI does (see below), but the *effective* hierarchy is reconstructable from three concrete, documented mechanisms:

1. **Settings/config precedence** (structural, always-on): managed policy > local settings > project settings > user settings, with CLI flags/env vars as another override layer on top. This governs *enforcement* config (hooks, permissions), not free-text guidance.
2. **What survives compaction** (from `claude-context-window-and-hooks.md`): system prompt/output style (never lost) > project-root CLAUDE.md + unscoped rules + auto memory (re-injected from disk) > invoked skill bodies (re-injected but capped/truncated, oldest dropped first) > `paths:`-scoped rules and nested CLAUDE.md (lost until re-triggered). This is a de facto fidelity ranking: content placed higher in this list stays "front of mind" through a long session; content placed lower degrades first.
3. **Explicit emphasis, newly confirmed**: "You can tune instructions by adding emphasis (e.g., 'IMPORTANT' or 'YOU MUST') to improve adherence" — a documented, in-band mechanism for raising a specific instruction's priority *within* a file, independent of file placement.
4. **Compaction can be told what to prioritize, newly confirmed — the most direct answer to "front of mind":** "Customize compaction behavior in CLAUDE.md with instructions like 'When compacting, always preserve the full list of modified files and any test commands' to ensure critical context survives summarization." This means the plugin can recommend a *specific, addressable* fix for "make X always survive degradation" — not just "move it to root CLAUDE.md" (coarse) but "add a compaction-preservation instruction for X" (targeted), or combine both for the highest-stakes content.

Practical synthesis: to make content genuinely "always front-of-mind and high-fidelity" on Claude, the available levers, from strongest to weakest, are: (a) enforce it as a hook/CI gate so it's not context-dependent at all, (b) place it in project-root CLAUDE.md (survives compaction structurally), (c) add an explicit compaction-preservation instruction for it, (d) mark it `IMPORTANT`/`YOU MUST` for in-context emphasis, (e) leave it in a `paths:`-scoped rule or nested file (weakest — lost on every compaction until re-triggered). A repo's BLOCKING rules can end up sitting at level (e) or between (b)/(e) depending on the file, with none using (c) or a real (a) — a pattern worth checking for in any audit.

## OpenAI's Instruction Hierarchy (the Codex/model-level answer to "hierarchy")

Where Claude's hierarchy is reconstructed from separate mechanisms, OpenAI has a single, explicitly named, formally published concept: the **Instruction Hierarchy**, per the OpenAI Model Spec: **Root > System > Developer > User > Tool/Guideline**. Root rules are fixed safety/chain-of-command rules no lower level can override; each level below is progressively less authoritative; content from tools or retrieved/web data is treated as **untrusted** unless a higher-priority instruction explicitly delegates authority to it. This was trained into the models via reinforcement learning specifically so conflicting instructions resolve predictably by rank rather than by recency or verbosity.

**Implication for the plugin's Codex-side recommendations**: on Codex, "make this instruction authoritative" has a real, model-level lever — placement at the Developer-message level (which is what AGENTS.md/system-level config effectively occupies) carries more inherent weight than a user-turn instruction, independent of context-window position or compaction. This is a stronger, more formal guarantee than anything on the Claude side, but it's a *priority* guarantee (which instruction wins a conflict), not a *survival* guarantee (whether it's still present after compaction) — the two "hierarchy" questions are different axes and shouldn't be conflated in the plugin's own recommendations. Cross-reference jay's finding in `codex-context-and-skills.md` that Codex compaction survival is explicitly undocumented/lossy — so even Root/System-level content isn't guaranteed to survive a compaction event verbatim, only to *win conflicts* when it's actually present.

## Sources
- [Debug your configuration — Claude Code Docs](https://code.claude.com/docs/en/debug-your-config) (primary, fetched directly)
- [Best practices for Claude Code — Claude Code Docs](https://code.claude.com/docs/en/best-practices) (primary, fetched directly)
- [The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions — OpenAI](https://openai.com/index/the-instruction-hierarchy/)
- [Improving instruction hierarchy in frontier LLMs — OpenAI](https://openai.com/index/instruction-hierarchy-challenge/)
