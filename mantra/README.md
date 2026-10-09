# mantra

Behavioral skills and a recurring reminder for Claude Code and Codex. Mantra
supports evidence-responsive assessment, proportionate troubleshooting, and
acting on the user's current objective.

## Installation

In Claude Code:

```text
/plugin marketplace add flexion/claude-domestique
/plugin install mantra@claude-domestique
```

In Codex:

```bash
codex plugin marketplace add flexion/claude-domestique
codex plugin add mantra@claude-domestique
```

Review and trust the plugin's hook definitions through `/hooks` in Codex
([host hook documentation](https://developers.openai.com/codex/hooks)). An
installed plugin's skills can be available while its hooks remain untrusted.

## Automatic guidance

[The hook](hooks/behavior.js) injects core guidance on `SessionStart`
and every `UserPromptSubmit`. It reinforces:

- Assessment of correctness, architecture, alternatives, and material risks;
  agreement with sound proposals and revision for evidence rather than pressure.
- Investigation of uncertainties that could change the next action, using local
  evidence where sufficient and authoritative references for unsettled external
  contracts.
- The active objective, prior clarifications and authorization, discussion
  pauses, and action within the requested scope.
- Brief reflection on actual progress, remaining uncertainty, and whether to
  continue necessary work, change a stalled approach, or finish a supported
  outcome. When wall-time/token metrics are visible, consider their coverage
  and the cost of reflection; consumption alone does not decide completion.

The behavior hook has no counters, refresh interval, state, file reads, or
sibling-plugin loader. It does not inject the `context/` documents or load project rule files.
Those documents are references for use on demand; project instructions are loaded
by the host according to its own conventions.

SessionStart also refreshes guidance after compaction (source: compact). During
an autonomous turn, tool completion adds the same reflection about every five
minutes, alongside fresh resource observations. Each prompt or session start
resets that interval. Stop adds no continuation. The interval is provisional;
[the behavioral checks](../docs/reviews/mantra-resource-reflection.md) have not
demonstrated improved judgment.

On `SessionStart` with `source: "startup"` or `"clear"`, the hook adds a short
notice explaining the later reminders and says no reflection is needed now.
Prompts and other session-start sources (including resume and compact) get the
self-contained reflection instead, triggered before finishing or after
unproductive attempts. The notice does not establish persistent priming or
behavioral benefit.

On session start the hook also returns `📍 Mantra: behavior rules loaded`.
It returns no status message on individual prompts.

## Automatic resource observations

[Resource hooks](hooks/resources.js) collect and inject native token categories
and elapsed wall observations on both hosts without resource environment-variable
setup. Coverage limits and unknown values remain explicit. Subagent hook receipts
are excluded; snapshots use the host's plugin data directory, with a built-in
fallback and 30-day cleanup. Disabling Mantra or its hooks stops injection.

See [the measurement and reminder contract](context/resources.md) for delivery,
storage, overhead and coverage limits.

## Skills

The [canonical skill files](skills/) are shared across hosts. Claude Code exposes
`/mantra:<skill>`; Codex invokes skills by reading their `SKILL.md` files
([host differences](../docs/plugin-evaluation.md#two-hosts-two-mechanisms)).

| Skill | Purpose |
|-------|---------|
| [skeptic](skills/skeptic/SKILL.md) | Evidence-responsive agreement, challenge, revision, and claims about evidence/access |
| [assess](skills/assess/SKILL.md) | Evaluation of correctness, architecture, alternatives, and risks, scaled to the decision |
| [troubleshoot](skills/troubleshoot/SKILL.md) | Debugging with evidence relevant to the next action |
| [make-rule](skills/make-rule/SKILL.md) | Convert prose guidance into a compact rule and companion reference |

## Token efficiency and custom rules

The recurring hook carries a reminder; the skills contain the full workflows.
Prefer references to repeated guidance. Shorter text is not proof of fewer
model tokens or better behavior: measure with the relevant tokenizer when
available, and compare fresh agent behavior after changing guidance.

Use `make-rule` to turn project guidance into a compact rule. See [FORMAT.md](FORMAT.md)
for the authoring convention and its limits. Claude Code project rules can live
in `.claude/rules/`, which Claude Code loads natively; start a new session to
apply edited instructions. Mantra does not read that directory itself. Follow the host's
instruction convention for other hosts.

## Optional Claude Code statusline

[scripts/statusline.js](scripts/statusline.js) is a standalone script, not wired
into Mantra's hooks. If configured as a Claude Code statusline command, it counts
Markdown files directly under the current project's `.claude/rules/` and displays
context usage, model, and cost when supplied by the host. The rule count does not
prove those files were loaded. Its context percentage includes a fixed buffer
estimate; it is not an exact measure of tokens injected by Mantra.

## Development

From the repository root:

```bash
npm run test:mantra
npm run validate:plugins
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for implementation details and
[the evaluation guide](../docs/plugin-evaluation.md) for fresh skill-invocation
probes. Static validation does not establish that a skill fires or that its
instructions improve behavior.

## License

MIT
