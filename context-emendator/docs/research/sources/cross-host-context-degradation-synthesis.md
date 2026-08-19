# Cross-Host Synthesis: How Context Loads, Is Managed, and Degrades (Claude vs Codex)

Synthesized by ivy from `claude-context-and-skills.md`, `claude-context-window-and-hooks.md` (ivy), and `codex-context-and-skills.md` (jay), 2026-08-17. This is general host expertise feeding the plugin's design. Target-repository scenarios below are illustrative worked examples, not survey findings.

## The core asymmetry: compaction survival is a documented contract on Claude, undocumented/lossy on Codex

| | Claude Code | Codex |
|---|---|---|
| Compaction survival | **Exact table** (system prompt/output style unchanged; project-root CLAUDE.md + unscoped rules re-injected from disk; auto memory re-injected; `paths:`-scoped rules and nested CLAUDE.md **lost** until re-triggered; invoked skill bodies re-injected capped at 5,000/skill, 25,000 total; startup skill-description index **not** re-injected) | **No exhaustive survival table documented.** OpenAI states the contract is "a concise summary that retains critical details" — no guarantee any specific earlier instruction, tool output, or decision survives verbatim. Must be treated as lossy unless independently verified per-project. |
| Compaction triggers | `/compact` (manual, with optional focus), automatic at a per-model threshold (`/autocompact <n>` to tune) | Manual `/compact` + automatic, threshold via `model_auto_compact_token_limit` (`total` or `body_after_prefix` scope) |
| Rehydration hook | `SessionStart` matched on `compact` — stdout added to context | `SessionStart` with `source: compact` — same shape, but Codex additionally exposes `PreCompact`/`PostCompact` observation hooks (`continue: false` can stop before/after; these do **not** inject context, only `SessionStart`/`SubagentStart`/`UserPromptSubmit`/`PreToolUse`/`PostToolUse` can) |
| Judgment-based hooks | `type: "prompt"` (single Claude/Haiku call) and `type: "agent"` (subagent, up to 50 tool turns) are fully supported | **Not yet functional** — `prompt`/`agent` handlers are parsed but currently skipped; only `command` handlers run |
| Enforcement boundary | `PreToolUse` exit 2 blocks before any permission-mode check, even bypass modes | `PreToolUse` can block/rewrite input, but hosted tools (e.g. web search) aren't on the hook path, and some specialized tools may opt out — hooks are guardrails, not a complete enforcement boundary |
| Context-injection budget | Skill bodies capped 5,000 tokens each / 25,000 total after compaction; hook `additionalContext` enters uncapped in the base guide (full JSON) | `additionalContextLimit` defaults to ~2,500 tokens per handler; oversized output spills to disk with a head/tail preview; context from multiple hooks/plugins **accumulates** |

**Practical implication for the plugin:** a remediation that assumes "pin this rule via a compaction-rehydration hook and it'll definitely survive" is a documented guarantee on Claude and an unverified assumption on Codex. Any cross-host recommendation involving compaction survival needs to say so explicitly, and Codex-side claims need the project's own verification (log trace, `/hooks`-equivalent inspection) rather than citing the same confidence level as the Claude-side table.

## Convergent finding: both hosts point away from "just re-inject everything"

jay's audit guidance, independently consistent with the Claude-side skill/compaction caps: **do not solve context drift by repeatedly injecting whole rule sets** — hook and plugin context accumulates every time it fires, and bloating the rehydration payload just recreates the token-cost problem the plugin exists to fix, while degrading model performance the same way an unscoped, always-loaded rule set does. The correct pattern on both hosts is a **small, durable, curated artifact** (a few non-negotiable decisions/facts) re-injected concisely on compaction — not a rule dump. This should be a first-class design principle for the plugin's own remediation recommendations, not just an observation: any "add a rehydration hook" suggestion must come with an explicit token budget, not an unbounded "reinject the rules."

## What "BLOCKING enforcement" actually requires, per-host

Neither host treats prose (a `priority: BLOCKING` marker, an "(BLOCKING)" heading) as enforcement — both are context the model tries to follow, not a hard gate. jay's phrasing is the cleanest statement of this for the plugin's own audit rubric: **"Do not call prose labelled 'BLOCKING' enforcement unless a hook, CI rule, or platform control demonstrably implements it."** Concretely:
- Claude: `PreToolUse` (command, or `prompt`/`agent` for judgment calls) with exit code 2, or a project CI gate.
- Codex: `PreToolUse` (command only, today) with a block/rewrite decision, or CI. Judgment-based BLOCKING rules can't yet become a Codex-native `prompt`/`agent` hook — they need either a deterministic proxy check or to stay CI/human-reviewed.

This gives the plugin's audit a concrete test: for every rule marked BLOCKING in a target repo, check whether an actual hook/CI mechanism exists for it, per host, before accepting the label at face value — an enforcement claim with no implementing mechanism on either host is the shape this check is meant to catch.

## Skill discovery: progressive disclosure is convergent, exact paths/budgets differ

Both hosts converge on the same shape (frontmatter always visible, full body loads on relevance/selection, reference files load further on demand) but with different numbers and paths:
- Claude: `.claude/skills/` (project) or `~/.claude/skills/` (personal); frontmatter ~100 tokens; skill body <5k tokens typical.
- Codex: documented native path is `.agents/skills/` (plural, CWD-to-repo-root scan); initial listing budget is 2% of the context window or 8,000 characters if unknown.

A plugin recommending a skill-based fix must specify the path per host — assuming one path works for both is a predictable failure mode, since a layout can match neither host's documented native convention.

## Live-context debugging: attribution exists on Claude, is partial on Codex

Claude ships a full source-attributed live-context toolkit: `/context` (per-item breakdown with source), `/doctor` (automated redundancy/bloat audit — already does a version of this plugin's job), `/hooks`/`/mcp`/`/permissions`/`/status`, `--safe-mode` and `CLAUDE_CONFIG_DIR` for clean-room isolation, and the `InstructionsLoaded` hook for empirical load-reason tracing. Codex provides real but narrower evidence — `/status`, `/debug-config`, `codex debug prompt-input` (explicitly an unstable CLI diagnostic, not a public contract), and opt-in TUI/session-JSONL logs OpenAI itself recommends for proving which `AGENTS.md` files loaded — but **no documented per-item provenance graph**: it cannot reliably answer "this exact text came from file X / hook Y / skill Z" for every item the way Claude's `/context` can. jay's audit procedure (capture `/status`+`/debug-config`, use `log_dir`/session JSONL to prove native loading, correlate static config to transcript evidence, and add a small opt-in trace hook only if ongoing provenance is genuinely needed) is the right calibrated approach — the plugin must not promise Codex a Claude-equivalent live debugger where the host doesn't expose one.

## The hierarchy question is really two separate axes — do not collapse them

Both research threads converged independently on the same critical distinction, stated most crisply by jay:

| Axis | Question | Claude evidence | Codex evidence |
|---|---|---|---|
| **Authority** (conflict resolution) | If two instructions disagree, which wins? | No single named doctrine; reconstructed from settings precedence (managed > local > project > user) plus in-band `IMPORTANT`/`YOU MUST` emphasis | Explicit, formally published: **Root > System > Developer > User > Tool/Guideline** (OpenAI Model Spec) — trained via RL, a real model-level guarantee |
| **Durability/salience** (survives time/compaction, stays "front of mind") | Is this content still present, and still weighted, later in a long session? | Documented compaction-survival table (`claude-context-window-and-hooks.md`) — a genuine per-mechanism guarantee; further tunable via a compaction-preservation instruction in CLAUDE.md | Explicitly **undocumented** — OpenAI states no exhaustive retention table and no claim that higher authority survives truncation/compaction verbatim |

**The dangerous inference to avoid in the plugin's own recommendations (jay's phrasing, exactly right):** placing a rule at AGENTS.md/developer-message level makes it *authoritative* relative to a user request, but does **not** establish that it survives compaction or stays high-fidelity merely because it's important. A plugin recommendation that says "make this rule more important" must specify *which axis* it's fixing — a Codex rule that keeps losing conflicts needs an authority fix (move it to a higher-authority message level); a rule that keeps "disappearing" mid-session needs a durability fix (durable artifact + bounded rehydration), and the two fixes are not interchangeable on either host.

## Recommendation-language rubric (adopt for the plugin's own output format)

jay's framework for how every efficiency/context finding should be phrased, general enough to apply to both hosts and adopted here as a design pattern for the plugin itself, not just Codex:

- **Observed cost**: loaded bytes/words, skill index footprint, configured MCP/hook count, or token capacity from a live inspector (`/context`, `/status`).
- **Load path**: always / nested-directory / selected-skill / triggered-hook / tool-result / unknown.
- **Retention confidence**: documented (cite the spec), observed in a trace (cite the log), or unverified (say so explicitly).
- **Safe remedy**: partition, cross-reference (the `@AGENTS.md`-import / `paths:` pattern), move to a skill, remove unused integration, or add a bounded durable summary — never "just delete" without one of these.
- **Validation**: a before/after live-inspector capture plus a representative task outcome — a raw word-count drop alone is not sufficient evidence a fix worked.

This rubric should be the literal output template the plugin uses for every finding, on both hosts — it forces exactly the discipline this research process itself had to learn the hard way (hema's fabricated citations, the several rounds of jay's "prove it first" corrections on this very briefing).

## Sources
See `claude-context-and-skills.md`, `claude-context-window-and-hooks.md`, `claude-live-debugging-and-hierarchy.md`, `codex-context-and-skills.md`, and `codex-live-context-and-hierarchy.md` for full primary-source citations underlying this synthesis.
