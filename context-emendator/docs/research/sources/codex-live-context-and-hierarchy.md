# Codex: Live Context Inspection, Instruction Hierarchy, and Context Efficiency

Collected by jay (Codex), 2026-08-17. Claims about public behavior are primary-sourced from OpenAI documentation; explicitly labelled CLI observations are from the installed Codex CLI 0.147.0 help and are not assumed to be a stable public interface.

## Executive conclusion: inspectable, but not fully provenance-addressable

Codex provides enough evidence to audit the **effective static instruction chain**, session configuration, token capacity, and recorded traffic. It does **not** document a supported, live per-item provenance map that can answer “this exact text currently in context came from file X / hook Y / skill Z” for every injected or historical item. The plugin must distinguish evidence it can prove from an inference, and must not promise a Claude-like runtime context debugger where the host does not expose one.

## Available live and post-run evidence

| Need | Codex mechanism | What it establishes | Provenance boundary |
| --- | --- | --- | --- |
| Inspect current session capacity/configuration | `/status` | Active model, approval policy, writable roots, and current token usage; status-line can also show context remaining and token counters. | Capacity/configuration only; not a context-item inventory. |
| Render current effective prompt input | `codex debug prompt-input` | **CLI observation:** the current CLI describes it as “Render the model-visible prompt input list as JSON”; its optional user prompt is appended after session context. | No public promise of source-file attribution or stable schema. Treat it as diagnostic evidence, not a portable integration contract. |
| Diagnose config precedence | `/debug-config` | Active config layer order, states, and policy sources such as MCP servers and rules. | Config provenance, not the exact text sent to the model. |
| Audit native project instruction loading | Opt-in `log_dir` plaintext TUI log, or the latest session JSONL where session logging is enabled | OpenAI explicitly recommends these to determine which instruction files Codex loaded. Codex rebuilds the instruction chain at every run/TUI session start. | Establishes loaded instruction files, not a documented map for hook output, skill body, tool result, or summary text. |
| Review prior traffic | `history.jsonl` / session transcript | History persistence controls whether transcripts are saved locally; a hook receives `transcript_path` for convenience. | The transcript format is explicitly not a stable hook interface; it is a record, not a guaranteed live-context view or provenance graph. |

### Recommended audit procedure

1. Capture `/status` and `/debug-config` from the live session for model, remaining context, roots, and active configuration layers.
2. Capture `codex debug prompt-input` only as an opt-in diagnostic snapshot, treating its schema as version-specific.
3. Start a controlled TUI session with an explicit `log_dir` and inspect `codex-tui.log` or the session JSONL to prove which native `AGENTS.md` files loaded.
4. Parse hook/plugin/skill configuration statically, then correlate it to transcript/log evidence. Report exact source attribution only when an observable host event or a plugin-created trace records it.
5. If the repository needs ongoing per-item provenance, recommend a small **opt-in trace hook** that records event, source path/identity, emitted byte/token estimate, and content digest outside the model context. It can observe future hook injection, but cannot reconstruct opaque host or historical context. Treat logs as potentially sensitive.

This is deliberately narrower than “read all current context.” It avoids assuming that a record of the conversation is equivalent to all model-visible instructions, built-in system content, transient tool context, or compaction state.

## Instruction hierarchy: authority is not retention or salience

OpenAI documents an instruction authority hierarchy: **system/platform > developer > user > tool**. The Model Spec further distinguishes guideline and no-authority content, and says a later instruction at the same authority can supersede an earlier one. This determines how conflicts should be resolved; it is valuable for classifying a context item as an instruction, user request, or untrusted tool data.

It is **not** a documented token-budget, position, fidelity, or compaction-retention mechanism. OpenAI does not document that a higher-authority item is immune to truncation, more salient because of its location, or retained verbatim by Codex compaction. In particular, the public Codex compaction contract remains a concise summary retaining critical details, without an exhaustive retention table.

### Plugin implication

The plugin should model two separate axes rather than inventing a single “context hierarchy” score:

| Axis | Question | Evidence and action |
| --- | --- | --- |
| Authority | If instructions conflict, which source should win? | Classify by host message role when observable; otherwise label the role unknown. Do not treat a local filename as proof of system/developer authority. |
| Durability / availability | Is the material actually present after compaction or in the current scoped task? | Use host-specific documented behavior and runtime evidence. Keep vital project state in a small durable artifact, then selectively rehydrate it only where proven necessary. |

This prevents a dangerous inference: an `AGENTS.md` rule may be authoritative relative to a user request once placed in a developer message, but the documentation does not establish that it will survive compaction or remain high-fidelity merely because it is important.

## Published Codex context-efficiency guidance

OpenAI's current recommendations for making Codex usage limits last longer are directly relevant to an auditor:

- Make prompts precise but remove unnecessary context.
- Provide only relevant source material; narrow files and date ranges.
- Define audience, output format, and length; separate required work from optional improvements.
- Reduce an oversized `AGENTS.md` by nesting specialized instructions.
- Disable unnecessary MCP servers, because each adds message context.
- Use a smaller model for routine work where appropriate.

The Codex customization guidance adds complementary patterns:

- Keep `AGENTS.md` concise; use nested files near specialized work rather than raising the 32 KiB project-instruction cap reflexively.
- Use a skill for a repeatable workflow instead of repeated long prompts. Skills initially disclose only a concise description and load their full body on selection.
- Keep one chat per coherent unit of work; use `/compact` for long coherent work, `/fork` only when work genuinely branches, and use subagents for bounded, independent, read-heavy tasks rather than dumping their intermediate work into the parent context.
- Restrict hook output: default `additionalContextLimit` is roughly 2,500 tokens per handler, and multiple hook/plugin injections accumulate.

### Plugin recommendation language

Frame every efficiency recommendation as a measurable trade-off:

- **Observed cost:** loaded bytes/words, skill index footprint, configured MCP/hook count, or token capacity reported by `/status`.
- **Load path:** always, nested directory, selected skill, triggered hook, tool result, or unknown.
- **Retention confidence:** documented, observed in a trace, or unverified.
- **Safe remedy:** partition, cross-reference, move workflow material to a skill, remove unused integration, or add a bounded durable summary.
- **Validation:** a before/after effective-prompt/log capture plus a representative task outcome—not a word-count reduction alone.

## Sources

- [Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli) — `/status`, `/debug-config`, and session inspection
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) — instruction-chain loading, verification, and diagnostic log/session JSONL guidance
- [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced) — history persistence and plaintext TUI logs
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) — history, log, context-window, and compaction settings
- [Hooks](https://learn.chatgpt.com/docs/hooks) — hook transcript caveat and injected-context limits
- [Codex pricing and usage limits](https://learn.chatgpt.com/docs/pricing) — published usage-reduction guidance
- [Prompting](https://learn.chatgpt.com/docs/prompting) — task scoping guidance
- [Improving instruction hierarchy in frontier LLMs](https://openai.com/index/instruction-hierarchy-challenge/) — system > developer > user > tool
- [OpenAI Model Spec](https://model-spec.openai.com/2025-02-12.html) — authority levels, same-level recency, and no-authority tool data
