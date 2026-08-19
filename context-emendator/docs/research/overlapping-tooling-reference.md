# Overlapping and Complementary Tooling — Reference

Catalog of existing skills, deterministic tooling, and built-in host functionality that overlaps or complements the workflow-config-auditor plugin, so the plugin's v1 scope builds on what already exists instead of reinventing it. Compiled by ivy (Claude-native + this-repo's own plugin family) and jay (Codex-native + third-party ecosystem — see that section for Codex/ecosystem findings). Grounded in `sources/` (primary Anthropic/OpenAI docs) and direct inspection of this repository.

## Executive finding: compose, do not recreate

The prior-art pass found substantially more overlap than the initial catalog. In particular, source inspection of the MIT-licensed [Melodic Software Claude plugin suite](https://github.com/melodic-software/claude-code-plugins) found shipped artifacts that its catalog describes as Claude-only auditors for memory/instructions, configuration, progressive disclosure, fixed startup payload, live context occupancy, and empirical bare-instruction experiments. [Agent Context Lens](https://github.com/ciceroyang/agent-context-lens) similarly describes and implements a declared Codex `AGENTS.md` chain resolver with hashes, byte budgets, and explicit unknowns. Neither tool has been executed in this study, so their runtime capabilities remain `UNK`/candidate evidence pending bounded, versioned trials. Generic multi-host linters already cover most syntax/schema checks, although our trials found their reports noisy.

Therefore `context-emendator` should not become a new monolithic scanner. Its smallest defensible core is the layer none of these tools supplies end-to-end:

1. capability-detect native and optional tools without requiring them;
2. normalize their evidence with host/tool/version/provenance and explicit limitations;
3. independently prove the actual Claude and Codex load routes for the target/cwd;
4. reconcile semantics across hosts and surfaces, including parity, contradiction, duplication, authority, durability, cost, and enforcement;
5. choose a minimal correction, retirement, or enhancement; and
6. validate both context/cost and representative-task adherence before calling the change an improvement.

The normalized claim ledger planned for the research briefing is therefore also the provisional v1 output contract: a target-repository audit should emit claims with source artifact, exact evidence, host, version, method, limitation, status (`DOC`/`OBS`/`INF`/`UNK`), proposed disposition, and validation route. Research may refine that schema before implementation.

### Capability disposition

| Capability | Existing mechanism to prefer | `context-emendator` disposition |
| --- | --- | --- |
| Host/config health | Claude `/doctor`; `codex doctor`; native config/status diagnostics | Invoke or ask the operator to run; do not clone the checks. |
| Claude live source/cost evidence | `/context`, `InstructionsLoaded`, OpenTelemetry, `session-report`; optional Melodic `context-budget` (`UNK` until trialed) | Accept versioned evidence; do not build a second transcript or startup-payload analyzer unless a recorded gap survives the incumbent trial. |
| Codex `AGENTS.md` chain | Native instruction/debug traces plus optional Agent Context Lens (`UNK` until trialed) | Adapt and verify; Agent Context Lens does not parse TOML or support every current version/platform exactly. |
| Static syntax/schema/path lint | agnix, ctxlint, native plugin/skill validators | Treat output as candidate findings; independently validate before remediation. |
| Claude instruction/memory audit | Anthropic `claude-md-management`; optional Melodic `claude-memory` and `claude-config` (`UNK` until trialed) | Do not duplicate a candidate catalog before trialing it. Add cross-host reasoning or route the operator to a validated incumbent. |
| Progressive disclosure and SSOT | Optional Melodic `docs-hygiene` (`UNK` until trialed); Sentry `agents-md`; native placement docs | Borrow candidate decision rules only after checking their sources and behavior; do not invent another size-only rubric. |
| Runtime capacity warning | Optional Melodic `context-guard` (`UNK` until trialed); mantra refresh; memento durable state | Complementary signals/mechanisms. Capacity is not proof of fidelity loss. |
| Claude deterministic rule-to-hook conversion | Anthropic `hookify` | Reuse for pattern-matchable Claude rules only; judgment and Codex remain separate. |
| Claude with/without evaluation | `claude plugin eval --ablation` | Reuse when available; it does not eliminate the need for a Codex evaluation route. |
| “Read vs skimmed” / instruction fidelity | No host or plugin exposes hidden attention or a literal skimming trace | Measure observable recall/adherence with versioned repeated trials; label the internal mechanism unknown. |
| Finding reliability | Strata `era-audit` frozen-corpus/quote validator; `memory-audit` receipt method | Adopt the evidence contract: hashes, exact quotes, explicit unknowns, independent verification. |
| Cross-host **context/instruction** reconciliation and placement | No complete incumbent found; cross-host scanners do exist for other concerns such as skill security | This narrower reconciliation problem is the unique v1 core. |

Detailed evidence, revision stamps, license boundaries, and trial results are in `sources/overlapping-tooling-codex.md` and `sources/prior-art-claude.md`. A tool's presence in a marketplace or registry is never proof of authorship, correctness, runtime loading, or fitness for the target.

### Explicit v1 non-goals

Unless a bounded incumbent trial records a concrete gap, v1 will **not** build:

- a plugin/skill installer, registry, or universal loader;
- a generic Markdown/frontmatter/schema/path linter;
- a Claude transcript analyzer, token dashboard, fixed-startup-payload meter, or context-zone monitor;
- a Claude-only `CLAUDE.md`/rules/memory quality or model-era audit catalog;
- a deterministic Claude prose-rule-to-hook generator;
- a new Claude plugin-evaluation harness;
- a skill authoring, packaging, security-scanning, or validation system;
- a parallel periodic refresh engine or durable session-memory store; or
- a claim that hidden attention, “skimming,” or instruction fidelity can be read directly from token occupancy; or
- a static Claude token or cost estimate. Claude cost claims require a versioned host measurement such as `/context`, OpenTelemetry counters, or a separately validated measurement tool; tokenizer proxies may be reported only as explicitly non-cost diagnostics.

Third-party tools are never hard dependencies in v1. An available adapter may consume their versioned structured output, but missing/untrialed tools must yield `UNK` and a native/manual validation path, not failure or invented evidence.

The Melodic trial is timeboxed and **does not gate the v1 core**. Run at most one narrow, version-stamped trial per capability that a real finding would otherwise duplicate. If installation, permissions, runtime, or cost makes that impractical, record `UNK` and proceed with cross-host context/instruction reconciliation, load-path proof, and evidence normalization. A failed trial authorizes only the exact observed gap, not a wholesale reimplementation of the suite.

## 1. Claude Code native built-ins (deterministic, ships today)

| Tool | What it already does | Overlap / complement |
|---|---|---|
| `/doctor` | Automated checkup: invalid settings, duplicate subagent names, unused skills/plugins, checked-in CLAUDE.md content Claude can derive from the codebase (proposes trims), slow hooks. Fixes with confirmation. | **Direct overlap** — do not reimplement it. Codex has its own `codex doctor`, but that is installation/config/runtime health rather than a semantic instruction audit; the uncovered scope is cross-file/cross-host reconciliation and verified placement. |
| `/context` | Live per-category context breakdown with source attribution for supported memory, skill, and subagent surfaces. | **Complementary primitive** — reuse it rather than reproduce the UI. It does not provide a provenance graph for every assembled-request span, so the remaining work is to reconcile it with `InstructionsLoaded`, telemetry, static files, and cross-host evidence. |
| `InstructionsLoaded` hook | Fires with a matcher on *why* a CLAUDE.md/rule loaded (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`). | **Complementary building block** — the plugin could ship a bundled hook using this event to empirically verify its own static-analysis claims (e.g. "this rule never actually loads") against a real session, closing the loop between static audit and runtime truth. |
| `paths:` rule frontmatter | Native conditional loading for `.claude/rules/*.md` by file glob. | **The mechanism, not a tool** — this is the fix the plugin should *recommend*, not build. Already covered in `sources/claude-context-and-skills.md`. |
| `@path` import syntax (incl. `@AGENTS.md`) | Native cross-file/cross-host content sharing without duplication. | **The mechanism, not a tool** — same as above; the plugin recommends its use (with jay's correct sequencing caveat), it doesn't need to reinvent an import system. |
| CLAUDE.md compaction-preservation instructions | User-authored instruction telling `/compact` what to always keep. | **The mechanism, not a tool** — a targeted fidelity lever the plugin can recommend per-rule rather than building custom rehydration infrastructure. |
| `/init` (with `CLAUDE_CODE_NEW_INIT=1`) | Interactive multi-phase setup: explores codebase via subagent, asks clarifying questions, proposes CLAUDE.md/skills/hooks before writing. | **Adjacent, not overlapping** — solves "bootstrap a new project's config," not "audit and fix an existing accreted one." Different lifecycle stage; the plugin picks up where `/init` leaves off, months/years later. |

## 2. This repository's own plugin family (claude-domestique)

The plugin being designed will ship *alongside* five existing siblings in this same marketplace. Two have direct, material overlap that must shape v1 scope — this isn't just "prior art to learn from," it's work the new plugin should not duplicate.

| Plugin | What it does | Overlap with this plugin |
|---|---|---|
| **mantra** | Behavioral-rules plugin. **Shipped today (v0.1.2):** injects curated rules via `.claude/rules/` on `SessionStart`, re-injects every N prompts (`UserPromptSubmit`) to fight drift, compact YAML frontmatter (~89% token reduction vs. prose per its own README), auto-discovers sibling-plugin rules (memento, onus), works on both Claude and Codex via the shared hook convention. | **Direct, significant overlap — split by status, not conflated.** *Shipped* (native/current): the periodic-refresh and compact-rule-format mechanisms above are working prior art the plugin should point at, not re-derive. *Planned, unverified, NOT shipped* (per mantra's own `ROADMAP.md`, "Near Term"/"Medium Term" sections): a **"Context Priority System"** (high/normal/low refresh tiers — conceptually close to the authority/durability distinction in `cross-host-context-degradation-synthesis.md`, but not yet built) and **"Context Summarization"** (inject condensed summaries instead of full files, also not yet built). Do not treat these roadmap items as an existing substitute for anything this plugin might do — they are unimplemented ideas in a sibling project, worth coordinating on, not tooling to defer to. Open design question, unaffected by the shipped/planned distinction: does the new plugin *extend* mantra's injection engine, or operate independently (since a target repo may use raw `.claude/rules/` without mantra installed at all)? |
| **memento** | Session-file persistence across context resets (1 session = 1 branch = 1 issue). Solves "durable external memory for decisions/progress," directly overlapping with the "small durable artifact for compaction-safe rehydration" pattern from the cross-host synthesis. | **Complementary, not competing.** memento is the durable-artifact mechanism; a rehydration hook recommendation from this plugin's audit could literally point at an existing memento session file rather than inventing a new durable-storage convention. |
| **onus** | Work-item/git/PR automation (JIRA, GitHub, Azure DevOps). | **No overlap** — orthogonal domain (project-management bureaucracy, not context/config management). Only relevant as one more source of `.claude/rules/` content (onus's own git/work-item rules) that the audit would need to recognize as legitimately sourced from a sibling plugin, not local cruft. |
| **comitatus** | herdr multi-agent orchestration (worktrees, panes, agent-to-agent messaging) — what this very research session runs on. | **No overlap** — different problem (coordinating multiple *agent processes*), not context/rule management within one agent's session. |
| **agent-artifex** | AI-service design/testing guidance (MCP servers, tool descriptions, evals) grounded in Anthropic/OpenAI/RAGAS research. | **Adjacent domain, not overlapping** — audits the quality of AI services/tools *the target repo builds* (e.g. a repo's own MCP tool definitions), not the config that governs how Claude/Codex work *in* the repo. Worth flagging as a related-but-distinct plugin if a target repo has its own AI chat/MCP server and needs both audits. |
| **stilus** | Prose drafting/editing/review. | **No overlap.** |

## 3. A target repo's own bespoke tooling is a factoring-out candidate, not just prior art

**Scope clarification from the user:** a target repository being audited is not a frozen fixture whose bespoke tooling is merely referenced for inspiration. It's a real, live project, and any of its functionality that overlaps with what this plugin provides is a candidate to be **factored out of that repo** once the plugin exists and covers that ground — i.e., the target repo should be able to retire/thin its own bespoke implementation and depend on the plugin instead, the same way it would drop a hand-rolled JSON mapper if a well-supported library did the same job.

In practice, a repo's own host-neutral skills or coordination tooling split into two buckets: (a) pattern-level prior art worth learning from (e.g. a canonical host-neutral base with thin per-host adapters) whose specific *content* is often a large, opinionated system unrelated to context/config auditing — only the pieces that literally duplicate content already canonical elsewhere (rules, AGENTS.md, etc.) are this plugin's business to flag; and (b) tooling that solves a genuinely different problem (e.g. cross-workspace multi-agent coordination) which is out of scope entirely, even though it's a real example of a repo building bespoke tooling from scratch.

**Practical implication for v1 design:** the plugin's remediation output for a target repo shouldn't only say "here's what's wasteful, fix it" — for findings where the repo's bespoke tooling literally duplicates something the plugin now provides natively (e.g. a hand-rolled instruction-restatement pattern where `@AGENTS.md` import or `paths:` frontmatter now does the job), the recommendation should explicitly say "retire this bespoke mechanism in favor of the native/plugin-provided one," not just "trim the duplicate text." This is a stronger, more actionable remediation class than pure deduplication and should be reflected in the plugin's finding taxonomy.

## 4. Codex-native built-ins and third-party ecosystem

Full sources and boundaries: `sources/overlapping-tooling-codex.md`. “Reported” below means a tool maintainer's stated capability, which must be tested against the target; it is not automatically evidence for a finding.

| Tool / feature | Status | What it already does | Overlap / boundary |
|---|---|---|---|
| `skill-installer` system skill | Bundled in this Codex environment | Lists curated OpenAI skills or installs from GitHub into `CODEX_HOME/skills`. | Distribution only. Not a repository audit or runtime-load verifier. |
| `skill-creator` system skill | Bundled in this Codex environment | Guides `SKILL.md` structure, progressive disclosure, resources, and validation. | Authoring guide, not an audit; invoke only after the user approves a skill-based remediation. |
| Native skills/plugins | Documented | Codex discovers `.agents/skills` progressively and supports plugin packaging/management. | Remediation surface, not a classifier for what belongs there. |
| `codex doctor` | Documented, stable | Local installation/config/auth/runtime/Git/terminal/app-server/thread-inventory diagnostic; redacted JSON available. | **Adjacent preflight**—not a semantic `AGENTS.md`/hook/skill or token-quality audit. |
| `/debug-config`, `/status`, instruction logs/session JSONL, `codex debug prompt-input` | Documented (`prompt-input` experimental) | Config precedence, session capacity, native instruction-load evidence, and a model-visible prompt rendering. | **Complementary runtime evidence**, but no documented per-item provenance graph for transient context. |
| `/compact`, automatic compaction, `compact_prompt`, `SessionStart(source=compact)` | Documented | History summary plus optional, bounded hook rehydration. | **Mechanism, not policy:** no automatic durable-summary lifecycle or priority refresh tiers. |

**No Codex context-priority system exists in the documented host surface.** OpenAI's system/platform > developer > user > tool hierarchy resolves conflicting instructions; it is not token reservation, positional salience, or a compaction-survival guarantee. The plugin must retain the cross-host distinction between **authority** and **durability/availability**.

### Ecosystem tools (current, third-party)

| Tool | Reported role | How v1 should relate to it |
|---|---|---|
| [Agent Skills / `skills-ref`](https://github.com/agentskills/agentskills) | Open SKILL.md format and structural validator. | Use after a skill change; structural validity does not prove discovery, triggering, or task value. |
| [skills.sh](https://www.skills.sh/docs/cli) | Registry and installer. | Discovery/distribution only; never auto-install in response to an audit. It has opt-out telemetry and does not guarantee every skill's quality/security. |
| [OpenSkills](https://github.com/numman-ali/openskills) | Reported universal SKILL.md installation/loading and AGENTS.md sync. | Optional migration companion. Its `.agent/skills` convention is not proof of native host discovery; runtime verification remains required. |
| [Agent Context Lens](https://github.com/ciceroyang/agent-context-lens) | MIT source implements a Codex `AGENTS.md` chain explainer with active/shadowed/partial/unknown states, byte budgets, hashes, and evidence classes; not run in this study. | Closest Codex load-path candidate, `UNK` until trialed. Use only with a declared/version-matched configuration: the inspected v0.2.0 does not parse `.codex/config.toml`, excludes user scope by default, and its exact profiles do not yet cover Codex 0.147.0. |
| [agnix](https://github.com/agent-sh/agnix) | Reported multi-agent config linter/LSP with CI and fixes. | Optional deterministic structural backend; independently verify host docs/load paths and do not confuse lint with runtime or semantic evidence. |
| [ctxlint](https://github.com/YawLabs/ctxlint) | Reported context/MCP/skill/session lint, codebase-reference checking, contradiction checks, and token estimates. | Closest direct static overlap; use as a comparator/backend where available, but independently validate estimates and host compatibility. |
| [Melodic Software Claude plugins](https://github.com/melodic-software/claude-code-plugins) | MIT source/catalog describes Claude memory/instruction/config audits, startup-context measurement, runtime context zones, progressive disclosure, SSOT extraction, and bare-model ablation; not run in this study. | Direct Claude-side candidate overlap, `UNK` until trialed. Prefer optional invocation/output integration if validated; retain cross-host normalization, verification, and placement. |
| [Strata `era-audit`](https://github.com/onblueroses/strata/tree/main/skills/era-audit) | Frozen-corpus, hash-bound semantic audit with schema and verbatim-quote validation. | Reuse the evidence contract/validator shape; its model-era-rot categories are narrower than this plugin's complete context taxonomy. |
| [`memory-audit`](https://github.com/brenbuilds1/skills/tree/main/skills/memory-audit) | Atomic-claim fact checking with a receipt for each verdict. | Method donor for stale/wrong/contradiction evidence, not a load/cache/adherence engine. |
| [`skill-audit`](https://github.com/ondrej-merkun/skill-audit) | Local multi-host prompt-injection and malicious-skill scanner. | Security preflight only. Keep security findings separate from context fitness and placement. |
| [skill-validator](https://github.com/agent-ecosystem/skill-validator) | Reported skill quality/link/token/contamination validator and scorer. | Post-recommendation quality gate for a skill package, not a repository-wide workflow-config auditor. Keep LLM-judge scores advisory. |

### Scope consequence

V1 should not ship an installer, registry, generic syntax linter, Claude transcript analyzer, startup-payload meter, deterministic Claude hook generator, Claude-only instruction catalog, or a parallel mantra-like refresh engine. It should orchestrate the missing layer: inventory → native/optional evidence adapters → host load-path proof → independently verified authority/durability/cost/adherence finding → minimal remediation → before/after representative-task validation. Never treat unimplemented roadmap items, an unverified model judgment, or a linter diagnostic as a dependency or verdict.

## 5. Finding taxonomy (three classes, not one)

The plugin's output is not just "here's what's wasteful" — three distinct finding classes, converged on with jay:

1. **Correction** — deduplicate, trim, or scope existing content that is redundant, stale, or loaded unconditionally when it need not be. Hypothesised instances: the same convention restated across several instruction files; a rule's content duplicated into a broader guidance file that does not own it; rule files carrying no conditional scoping despite applying to a narrow file area.
2. **Retirement** — recommend replacing a repo's bespoke mechanism with a proven native or plugin-provided capability that now does the same job (§3: only where capability-equivalence, host/load-path compatibility, and migration validation are all demonstrated — not a default).
3. **Enhancement** — recommend a genuinely new capability the repo doesn't have (verification loops/Stop hooks/`/goal` conditions, adversarial-review subagents, `disable-model-invocation` skills for side-effect workflows, deterministic hooks for judgment-requiring BLOCKING rules). This class was missing from earlier scope drafts — added per the user's catch that pillar 4 of the corrected assignment (improve workflows/quality/autonomous-work-length, token-efficient, without sacrificing autonomy or quality) requires more than pure cleanup.

**Enhancement is gated, not default-on** — recommending too freely would recreate the exact bloat/over-engineering problem this plugin audits against. Emit an Enhancement finding only when **all** of: (a) there's an evidenced repeatable workflow gap in the target repo, or the user explicitly confirmed the goal; (b) an existing/native capability has been ruled out first (§1/§2 — don't recommend building what already exists); (c) host and version support for the mechanism is proven, not assumed (see the Codex caveat below); (d) the smallest opt-in/on-demand addition is chosen, with a demonstrated net token/maintenance/autonomy benefit — not the most feature-rich option; (e) rollback and a before/after validation plan are specified alongside the recommendation. If any of (a)-(e) isn't met, log it as a lower-confidence "opportunity" note or stay silent — don't force an Enhancement finding to fill the category.

**Cross-host capability caveat (jay's correction, important):** judgment-based `prompt`/`agent`-type hooks are Claude-capable today, but **Codex currently parses and skips them** — only `command` handlers run on Codex (per `codex-context-and-skills.md`). An Enhancement recommendation for a judgment-requiring check must use deterministic hooks/CI or a bounded subagent on Codex, never a `prompt`/`agent` hook — that path doesn't function on this host yet, regardless of how well it works on Claude.
