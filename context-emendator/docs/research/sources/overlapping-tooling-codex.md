# Overlapping Tooling: Codex, Agent Skills, and Context Auditors

Collected by jay (Codex), 2026-08-17. This is a reference catalog, not an endorsement. “Reported” describes a maintainer's published capability and needs evaluation in the target environment; “documented” is an official host/API capability. Planned features are deliberately not treated as available functionality.

Expanded 2026-08-18 with direct source inspection and bounded trials. Repository state used for load-bearing comparisons:

| Repository | Revision inspected | License | Evidence used |
| --- | --- | --- | --- |
| `melodic-software/claude-code-plugins` | `96a9775013f284026014fb949675d35e1448756a` | MIT | Manifests, shipped skills, scripts, tests, and references; not executed |
| `ciceroyang/agent-context-lens` | `7e5cf4f9c6075b70a0d982c009dd10323e321034` | MIT | README, Codex provider implementation, tests/tree; not executed |
| `agent-sh/agnix` | `e89a2ab66d0414ce05161f882c8153fa59760e35` | Apache-2.0 | Source/rule corpus plus `agnix@0.49.0` trial |
| `YawLabs/ctxlint` | `734bbbe07e41406c74eee90c29e60cd2b7c9f9a1` | MIT | Scanner/detector implementation plus `ctxlint@0.23.0` trial |
| `onblueroses/strata` | `71da3da49f3f19a1bd32150a7b896dfefc2aa9a7` | MIT | `era-audit` skill, schemas, and quote validator |
| `brenbuilds1/skills` | `7fa956cc6cc5dfdf2c42b22a5abd161dbdca73ce` | MIT | `memory-audit` skill |
| `getsentry/skills` | `24fdb833b9e67670a027e3b482189100a69ff7f9` | Apache-2.0 | `agents-md` and settings-audit skills |

The revisions make this a reproducible prior-art snapshot, not a promise that future versions retain the same behavior. Recheck before depending on a tool or copying licensed code.

Only agnix and ctxlint were executed in this pass. Every other third-party runtime capability is `UNK` pending a bounded trial of the recorded version. Source inspection may justify borrowing a documented method under its license; it does not promote the tool's runtime output to observed evidence.

## Decision lens

The proposed workflow-config auditor should not become another skill installer or syntax linter. Its differentiator is a host-aware, evidence-backed audit that:

1. discovers the configured surface and actual/observable load paths;
2. distinguishes documented, observed, inferred, and unavailable evidence;
3. connects structural problems to runtime context cost, compaction risk, and task outcomes; and
4. proposes minimal, reversible remediation with a before/after validation path.

Existing tooling can be an input or optional validation backend for this workflow.

## Closest prior art found

### Melodic Software's Claude plugin suite: direct candidate overlap, Claude only

The strongest candidate overlap is not a single “context optimizer.” It is a coordinated, MIT-licensed Claude Code marketplace whose source and generated catalog divide much of the problem as follows. Source inspection proves these artifacts and checks exist; this study has not executed them, so behavior remains `UNK` until a bounded, versioned trial.

| Shipped component | Vendor-described/source-inspected capability (`UNK` at runtime) | Boundary for `context-emendator` |
| --- | --- | --- |
| `claude-memory` v0.9.3 | Audits project/user `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/`, and auto-memory using a deterministic spine plus labelled judgment checks; separates memory health from model-era fitness. | Claude-only; no `AGENTS.md`/Codex parity; its own surface inventory is not proof of the complete model request. |
| `claude-config` v0.38.7 | Audits settings/hooks/plugins, instruction content against current-model doctrine, cross-surface conflicts, prompting gaps, and coordinates an ordered/resumable `audit-pass`. Its `unhobble` workflow runs a reversible bare-instruction experiment and re-adds a rule only after repeated same-cause stumbles. | This is a near-substitute for a Claude-only static auditor. Do not rebuild its catalogs or orchestration. Its model judgments and official-doc assumptions still require versioned verification. |
| `context-budget` v0.6.3 | Measures fixed Claude startup payload at a pinned binary, attributes built-in tools through A/B deny differencing, rejects incomparable runs, and records per-project before/after ledgers. | Measurement engine, not semantic placement auditor; headless sessions may differ from interactive sessions. Reuse or recommend it rather than ship token folklore. |
| `context-guard` v0.7.13 | Captures per-session statusline context usage, resolves configurable zones, records a post-compaction evidence-degraded marker, and can advise or gate new work. | Runtime capacity signal, not evidence that attention or output quality has degraded. Its own README correctly warns that a zone is not a decay signal. Claude-only. |
| `docs-hygiene` audits | Classifies progressive-disclosure tiers, tier mismatch, mixed concerns, orphan spokes, deep indirection, and SSOT extraction; includes deterministic detectors and eval fixtures. | Strong remediation prior art. Its thresholds and third-party research claims are not host contracts and must not become universal rules. |

This is sufficient to block a fresh Claude context auditor until the incumbent has been trialed: building first would risk duplicating source-visible work. If the trial confirms the claims, the defensible product layer is cross-host coordination: normalize native and optional-backend evidence, reconstruct each host's actual load route, verify semantic findings against frozen source, compare Claude/Codex parity, and choose a minimal remediation whose cost and adherence effect can be checked. If a claim fails, record the exact gap before implementing it.

No Codex manifests were found in this marketplace; treat every component above as Claude-specific unless a separate live Codex probe proves otherwise.

### Agent Context Lens: closest Codex load-chain explainer

`ciceroyang/agent-context-lens` v0.2.0 is the strongest reusable candidate implementation found for the Codex `AGENTS.md` chain. Its implementation records active, shadowed, outside-chain, partial, unknown, and unsupported sources; byte budgets; hashes; encoding; and explicit evidence classes (`official_contract`, `versioned_observation`, `unknown`). It was not executed in this study, so those runtime results remain `UNK`.

Its restraint is as important as its coverage:

- it does not run Codex or claim whole-prompt parity;
- it does not parse `.codex/config.toml`; effective values must be declared in a normalized snapshot or flags;
- user instructions are excluded by default;
- safe mode refuses symlinks rather than guessing;
- exact behavior profiles in the inspected revision cover only Codex CLI 0.145.0 and 0.146.0-alpha.3.1 on Darwin arm64, not the current repository's pinned 0.147.0.

Trial it as an optional backend and use its source as design reference; never treat it as unqualified current-host truth. `context-emendator` still needs native diagnostics or a version-matched probe to close the gap.

### Deterministic multi-host linters: candidate generators, not verdict engines

`agnix` and `ctxlint` both cover more static surface than a v1 should recreate. Trials ran on 2026-08-18 against this public repository at HEAD `ba6d38d1855393f6d5c8423e3236b79a5ad48979` with a dirty research worktree; counts are a bounded diagnostic sample, not a clean-release benchmark. They also showed why tool output cannot directly authorize remediation:

| Trial | Result | Representative false/noisy findings |
| --- | --- | --- |
| `npx --yes agnix@0.49.0 .` | Exit 1; 14 errors, 101 warnings, 1 info | Treated plugin-qualified skill names such as `stilus:deslop` as missing; treated inline identifiers such as `engines.node` as paths; warned about intentional `.claude/` references in documentation; downgraded deliberate safeguards as negative phrasing. |
| `npx --yes @yawlabs/ctxlint@0.23.0 . --format json` | Exit 0; 2 errors, 4 warnings, 3 info; estimated 2,034 tokens | Treated documented placeholder paths as missing files; required pinned `npx` packages to be dev dependencies; read “do not edit this generated file” as a command requiring a hook. |

Implementation inspection explains part of the mismatch. `ctxlint` recursively discovers known filename patterns rather than reconstructing a host/cwd-specific load graph; uses `cl100k_base` as a Claude token proxy; detects contradictions through a fixed regex taxonomy; and uses whole-file line-set Jaccard similarity, which can miss a duplicated section embedded in otherwise different large files. `agnix` has a much larger rule corpus and stronger syntax/LSP/CI machinery, but its general knowledge base mixes official material, blogs, model-era assumptions, and generic context-engineering advice.

The reusable part is deterministic syntax/schema/path checking and their JSON/SARIF-style outputs. The non-reusable part is treating every emitted diagnostic as evidence-backed or importing generic context advice into the authoritative briefing.

### Evidence-discipline skills worth borrowing

| Skill | Reusable method | Boundary |
| --- | --- | --- |
| `onblueroses/strata` `era-audit` | Probes ground truth, freezes and hashes the exact corpus, requires one disposition per file, schema-validates findings, proves every cited quote exists in the frozen source, records unknowns, and separates fixer/verifier/collateral critic roles. | Its taxonomy targets model-era rot rather than complete context placement. Reuse the evidence contract and validator shape, not its categories as the whole audit. |
| `brenbuilds1/skills` `memory-audit` | Splits persistent instructions into atomic claims, verifies cheapest fact first, cross-checks files, and requires a re-checkable receipt for every verdict. | Simple inventory model; no runtime load, cache, token, compaction, or adherence proof. |
| `getsentry/skills` `agents-md` | Production guidance favors concise root/nested `AGENTS.md`, exact commands, external references instead of copied policy, and a symlinked Claude entry point rather than divergent copies. | Authoring guidance, not an auditor; its commit-attribution convention is Sentry-specific. |

These methods directly address a reliability failure already observed during this project: model-generated “matching quotes” can be fabricated. A candidate finding becomes evidence-backed only after a deterministic source/hash/quote check and an independent host/load-path check.

### Adjacent tools that should stay separate

| Tool | Use it for | Why it is not the core auditor |
| --- | --- | --- |
| `ondrej-merkun/skill-audit` | Local deterministic security scan of installed skills/plugins/MCP and project instruction files across Claude, Codex, and other hosts. | Security and prompt-injection risk, not context cost, placement, retention, or semantic fitness. Consume as a security preflight where available. |
| Anthropic `hookify` | Generate deterministic Claude regex-rule hooks. | Does not implement judgment-bearing prompt/agent hooks and has no Codex path. |
| Anthropic `session-report` and Claude OpenTelemetry | Transcript aggregation, token/cache counters, and opt-in assembled-request capture. | A `cache_break` is a heuristic, not causal proof; raw request bodies expose sensitive data and still do not map every span back to its source file. |
| Anthropic `claude plugin eval --ablation` | Claude plugin with/without evaluation and score delta. | Reuse for Claude experiments where enabled; it is not a Codex or universal evaluation harness. |
| `alexgreensh/token-optimizer` | Broad competitor/reference for Claude/Codex context optimization. | PolyForm Noncommercial license prevents general code reuse; it mutates global config and its own audit exempts its bundled tools, so treat it as a biased comparator. |

Registry entries with no license, no deterministic implementation, or only generic percentage/threshold advice were kept as search leads rather than dependencies. Popularity or a `skills.sh` listing is not quality, authorship, or host-compatibility evidence.

## Reuse decision

The prior-art pass changes the implementation plan:

1. **Delegate native diagnostics.** Consume `/doctor`, `/context`, `InstructionsLoaded`, Claude telemetry, `codex doctor`, `/debug-config`, `/status`, `codex debug prompt-input`, and session logs instead of imitating them.
2. **Support optional evidence adapters.** Prefer machine-readable output from Agent Context Lens, agnix, ctxlint, Claude `session-report`, and `context-budget` only after a bounded trial of the installed version. Every adapter must preserve tool/version/provenance and mark limitations; unavailable or untrialed tools yield `UNK` plus a native/manual route.
3. **Borrow the evidence contract.** Freeze/hash the corpus, require exact quote validation, label `DOC`/`OBS`/`INF`/`UNK`, require one disposition per in-scope artifact, and separate candidate generation from finding verification.
4. **Do not build Claude-only catalogs before trialing Melodic's candidate incumbents.** If validated, recommend the plugins or integrate at their invocation/output boundary. If a trial fails, record the exact missing behavior before building it. Copy code only after an explicit dependency/attribution decision and license review.
5. **Retain a small unique core.** Cross-host surface inventory, actual-load proof, Claude/Codex parity analysis, semantic reconciliation across files and hosts, placement/remediation choice, and before/after adherence validation remain unsolved as one coherent workflow.
6. **Fail open on unavailable evidence.** Absence of a backend or live trace produces `unknown`, not a guessed load path or a forced finding.

No prior-art tool found can expose the model's hidden attention weights or prove that a loaded instruction was literally “read” rather than “skimmed.” Raw request capture proves availability; repeated, version-stamped behavioral probes can measure observable adherence. The briefing must preserve that boundary instead of turning a UI score or context-usage percentage into a fidelity claim.

The Melodic trial is non-gating and demand-driven. Timebox it to one narrow, version-stamped run only when a real finding would otherwise duplicate a claimed capability; record `UNK` and continue if the trial is unavailable or disproportionately expensive. The surviving core—cross-host context/instruction reconciliation, per-host load-path proof, and evidence normalization—does not depend on whether Melodic's vendor claims pass.

Do not quote `ctxlint`'s `cl100k_base` output as Claude tokens or cost. It is a GPT-family tokenizer proxy whose error against the active Claude tokenizer is unknown. More generally, v1 must not emit a static Claude cost estimate: use versioned host-native measurements or a separately validated measurement tool, and record whether the source was interactive or headless.

Completion condition for the broader research plan: no planned `context-emendator` capability may duplicate an existing tool without a recorded reason (missing host, incorrect evidence model, unacceptable license/security posture, or incompatible output contract).

## Codex-native / bundled capabilities

| Tool or feature | Status | Overlap | Boundary for this plugin |
| --- | --- | --- | --- |
| `skill-installer` system skill | Bundled in this Codex environment | Lists curated `openai/skills` items or installs skills from GitHub into `CODEX_HOME/skills`. | Distribution only. It does not inspect a repository's current workflow configuration or establish runtime loading. |
| `skill-creator` system skill | Bundled in this Codex environment | Guides creation, structure, progressive disclosure, and validation of a `SKILL.md` package. | Authoring guidance, not an audit. The auditor can recommend invoking it after a user approves a skill-based remediation. |
| Native skills and plugins | Documented | Progressive skill discovery, `.agents/skills` repository discovery, plugin packaging and marketplace management. | Provides the host's preferred remediation surfaces; does not assess whether existing material belongs in a rule, skill, plugin, or session artifact. |
| `codex doctor` | Documented, stable | Diagnostic report for local installation, config, authentication, runtime, Git, terminal, app-server, and thread-inventory health; supports redacted JSON. | A health/configuration diagnostic, **not** a semantic `AGENTS.md`/skill/hook audit or token-quality analyzer. It should be a preflight input, not a competing feature. |
| `/debug-config`, `/status`, instruction logs/session JSONL, `codex debug prompt-input` | Documented; `prompt-input` is experimental | Configuration precedence, session capacity, native instruction-load evidence, and model-visible prompt rendering. | The runtime evidence layer for a Codex audit. None provides a documented per-item provenance graph for all transient context. |
| `/compact`, automatic compaction, `compact_prompt`, `SessionStart(source=compact)` hook | Documented | Manual/automatic history summary; configurable compaction prompt; optional hook context injection after compaction. | The closest native “summarization + rehydration” mechanism. It is not a priority-tier system, and injected hook context is bounded/cumulative. |
| Codex app server `thread/inject_items` | Documented but app-server/advanced | Adds raw Responses API items to an already loaded thread. | Not a normal local-project context-management mechanism; avoid basing v1 on app-server integration or assuming injected items have a durable source map. |

### Skill installer and creator: important classification

The current `skill-installer` and `skill-creator` are preinstalled **system skills**, not standalone universal Codex CLI subcommands. They are useful local prior art: installer handles curated/GitHub acquisition; creator emphasizes concise skill bodies, progressive disclosure, and deterministic scripts for fragile work. Neither substitutes for an auditor that determines whether a proposed skill should exist in the first place.

A 2026-08-18 code search of OpenAI's public `openai/skills` repository at revision `49f948faa9258a0c61caceaf225e179651397431` found no dedicated `AGENTS.md`, persistent-memory, or context-optimization auditor. Keyword matches were incidental to deployment/security/application skills. This is negative search evidence, not a guarantee that no private, newly published, or workspace-scoped Codex plugin exists; recheck the official catalog before implementation.

## Does Codex already have context priority or summarization injection?

### Context priority: no documented tier feature

OpenAI documents instruction authority—system/platform > developer > user > tool—and same-authority recency. That is conflict resolution, not a `high`/`normal`/`low` context scheduling, token reservation, positional salience, or compaction-survival feature. No official Codex configuration or hook mode found in the current docs exposes priority tiers for repository instructions, skills, or injected context.

The auditor must keep the two concepts separate:

- **Authority:** which conflicting instruction should win, when a role is observable.
- **Durability/availability:** whether the material is loaded now or survives compaction. This remains host- and path-specific.

### Summarization and injection: primitives exist, policy does not

Codex manually or automatically compacts earlier chat turns to a concise summary; users can tune automatic compaction threshold/scope and override the compaction prompt. `PreCompact` and `PostCompact` hooks observe compaction but cannot inject context. `SessionStart` matched to `compact` can add bounded developer context before the next root-session request (and the immediate automatic-compaction continuation).

This permits an implementation to maintain a tiny, durable “current state” artifact and selectively rehydrate it. It does **not** provide an official automatic summary-to-file lifecycle, a durable memory guarantee, or a priority refresh policy. Codex command hooks are the only currently executable hook handler type; `prompt` and `agent` hook types are parsed but skipped. A proposed plugin should therefore recommend a deterministic command hook only after proving the target needs it and can validate it.

## Ecosystem tooling

| Tool | Status and reported role | Useful complement | Important limitation / integration posture |
| --- | --- | --- | --- |
| [Agent Skills specification and `skills-ref`](https://github.com/agentskills/agentskills) | Open format and reference validator for `SKILL.md` frontmatter/naming. | Validate a new or edited skill's portable structure. | Structural compliance only; it does not determine whether a skill triggers, fits a host discovery path, duplicates instructions, or helps a representative task. |
| [skills.sh](https://www.skills.sh/docs/cli) | Registry and `npx skills add` installer for skills/collections. | Discover or distribute approved skills after policy/security review. | Registry acquisition is not repository audit. The CLI collects anonymous install telemetry by default and the registry cannot guarantee every listed skill's security/quality; never auto-install as an audit side effect. |
| [OpenSkills](https://github.com/numman-ali/openskills) | Reported universal SKILL.md installer/loader, with install, list, read, update, and `AGENTS.md` sync commands. | A possible migration/distribution companion for multi-agent teams. | Its `.agent/skills` “universal” convention and `AGENTS.md` synchronization are tool conventions, not proof of a target host's native discovery. Treat it as opt-in and verify real runtime loading afterward. |
| [agnix](https://github.com/agent-sh/agnix) | Reported multi-agent linter/LSP for `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, hooks, and MCP; offers CI, diagnostics, and fixes. | Fast deterministic structural checks and safe-fix previews. | Lint findings must be independently checked against current host docs and the target's load path. It cannot establish all runtime provenance, compaction retention, or semantic fitness of a workflow. |
| [ctxlint](https://github.com/YawLabs/ctxlint) | Reported CLI/CI/MCP lint for agent context, MCP configuration, skill/session data, codebase references, cross-file conflicts, and token estimates. | Closest direct overlap: static drift, stale references, contradiction, and token-cost signals. | Treat as an optional backend/comparator, not authoritative evidence. Its reported token estimates and source compatibility must be verified in the target; it cannot replace host-specific live-context evidence. |
| [skill-validator](https://github.com/agent-ecosystem/skill-validator) | Reported skill validator/scorer with link, token, density, contamination, and optional LLM-judge checks. | Deeper quality gate for a skill after an audit recommends creating or refactoring one. | It evaluates a skill package, not the repository-wide configuration system or live host context. LLM-judge scores should remain advisory. |

## Design implications

- **Do not ship an installer, registry, or universal loader in v1.** Point users to the appropriate existing mechanism after a recommendation is accepted.
- **Do not reimplement a generic syntax linter.** Accept results from tools such as agnix/ctxlint as evidence, while retaining independent verification and host-aware remediation planning.
- **Do own the orchestration and evidence model:** inventory → host load-path/diagnostic trace → findings classified by confidence → authority/durability/cost analysis → small remediation proposal → before/after validation.
- **Do not elevate a roadmap into a dependency.** In-repository mantra context-priority and summarization concepts must be treated as future design input until their code and manifests demonstrate they are shipped and host-supported.

## Sources

### Official OpenAI documentation

- [Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli) — `doctor`, `prompt-input`, compaction, and diagnostics
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) — instruction discovery and verification
- [Build skills](https://learn.chatgpt.com/docs/build-skills) — native skill model
- [Hooks](https://learn.chatgpt.com/docs/hooks) — compaction lifecycle and `SessionStart` injection
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) — compaction controls
- [OpenAI Model Spec](https://model-spec.openai.com/2025-02-12.html) — authority hierarchy

### Local bundled-skill evidence

- `~/.codex/skills/.system/skill-installer/SKILL.md` — current installer scope and source/destination behavior
- `~/.codex/skills/.system/skill-creator/SKILL.md` — current creator scope and progressive-disclosure guidance
- [OpenAI public skills repository](https://github.com/openai/skills) — searched at recorded revision for a native audit skill

### Ecosystem primary sources

- [Agent Skills specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx)
- [skills-ref reference library](https://pypi.org/project/skills-ref/)
- [skills.sh CLI](https://www.skills.sh/docs/cli)
- [OpenSkills](https://github.com/numman-ali/openskills)
- [agnix](https://github.com/agent-sh/agnix)
- [ctxlint](https://github.com/YawLabs/ctxlint)
- [skill-validator](https://github.com/agent-ecosystem/skill-validator)
- [Melodic Software Claude Code plugins](https://github.com/melodic-software/claude-code-plugins)
- [Agent Context Lens](https://github.com/ciceroyang/agent-context-lens)
- [Strata `era-audit`](https://github.com/onblueroses/strata/tree/main/skills/era-audit)
- [Memory Audit](https://github.com/brenbuilds1/skills/tree/main/skills/memory-audit)
- [Sentry `agents-md`](https://github.com/getsentry/skills/tree/main/skills/agents-md)
- [`skill-audit`](https://github.com/ondrej-merkun/skill-audit)
- [Anthropic official Claude plugins](https://github.com/anthropics/claude-plugins-official)
