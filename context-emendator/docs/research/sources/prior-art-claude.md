# Prior Art (Claude side): Tooling That Evaluates or Explains Effective Context

Blocking prior-art pass for the Context Oracle. Collected by ivy, 2026-08-18. Scope: Claude Code plugins, skills, built-ins, and cross-host tools that evaluate, explain, or optimize *effective context* — what actually reaches the model and why.

## Method and confidence conventions

Primary sources used, in descending strength:

1. **Shipped source on disk** — the actual installed plugin/skill files under `~/.claude/plugins/`, and the installed CLI's own `--help`. Strongest available evidence: it is the code that runs.
2. **Official Anthropic docs** — `code.claude.com/docs`, `platform.claude.com/docs`.
3. **Official marketplace manifest** — `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json` (owner: Anthropic, `support@anthropic.com`, schema `anthropic.com/claude-code/marketplace.schema.json`).

Per-claim labels below: **[shipped]** verified by reading installed source or running the installed CLI myself; **[docs]** from official documentation; **[delegated]** surfaced by a `claude-code-guide` subagent citing official doc URLs, not independently re-verified by me; **[vendor]** a third-party maintainer's own claim, unverified; **[unverified]** could not confirm from any primary source.

**Important provenance caveat:** the official marketplace is a *curated directory* that also lists third-party plugins (42Crunch, SonarQube, Convex, etc.). Presence in it does **not** mean Anthropic authored it. Every plugin called "Anthropic" below was confirmed by reading its `author` field in the marketplace manifest **[shipped]**.

## Classification summary

| Tool | Author | Class | One-line boundary |
|---|---|---|---|
| `claude plugin eval --ablation` | Anthropic | **Reusable dependency** | First-party A/B harness with baseline arm + score delta — our removal-justification methodology, already built |
| `claude plugin validate --strict` | Anthropic | **Reusable dependency** | Manifest/frontmatter/hooks.json validation; CI gate for anything we emit |
| `session-report` | Anthropic | **Reusable dependency** | Per-skill/per-subagent token data from local transcripts; its `cache_breaks` is a >100k-token heuristic, not causal cache evidence |
| `hookify` | Anthropic | **Reusable dependency** | **Deterministic Claude regex-rule** hook generation only — not judgment `prompt`/`agent` hooks, not Codex |
| `skill-creator` | Anthropic | **Reusable dependency** | Skill authoring + eval/benchmark scripts |
| OpenTelemetry raw-body logging + token counters | Anthropic | **Reusable dependency** | Assembled-request observability and per-turn cache counters — **not** a per-item source-attribution graph |
| `/doctor` | Anthropic | **Native built-in** | Bloat/health checkup incl. CLAUDE.md derivable-content trims |
| `/context`, `/memory`, `/hooks`, `/mcp`, `/status`, `/permissions`, `/usage`, `/debug` | Anthropic | **Native built-in** | Live inspection surface |
| `InstructionsLoaded` hook | Anthropic | **Native built-in** | Load-reason attribution |
| `claude-md-management` (`claude-md-improver`) | Anthropic | **Comparator** | CLAUDE.md *quality/currency/completeness*, plus duplication **within the CLAUDE.md family only**; no cost, placement, rules, or `AGENTS.md` |
| `claude-code-setup` (`claude-automation-recommender`) | Anthropic | **Comparator** | Recommends *new* automations; does not audit existing misplacement |
| **melodic-software suite** (`claude-memory`, `claude-config`, `context-budget`, `context-guard`, `docs-hygiene`) | third-party, MIT | **Closest comparator** | Claims most of our Claude-side scope incl. removal-first auditing — but **Claude-only, no `AGENTS.md`**, and entirely vendor-self-described |
| `claude-context-optimizer`, `token-optimizer`, `claude-code-token-saver` | third-party | **Comparator** | Token/cache accounting; capability claims unverified |
| `ctxlint`, `agnix`, `OpenSkills`, `skill-validator`, `skills.sh` | third-party | **Comparator** | Static lint / registry (catalogued in `overlapping-tooling-codex.md`) |
| `plugin-dev`, `code-simplifier`, `pr-review-toolkit`, `project-artifact`, `security-guidance`, `code-review` | Anthropic | **Adjacent** | Different problem domain |
| `/skill-doctor` | — | **Unverified** | Not resolvable as a command; treat as unavailable |

## 1. Static config linting

**`/doctor`** **[docs]**/**[delegated]** — the closest official analogue to our Correction class. Reported checks: installation health (duplicate installs, PATH, unparseable settings), **unused extensions weighed against context cost** (skills, MCP servers, plugins), slow hooks, duplicate subagent names, version currency, and **CLAUDE.md trimming that cuts content Claude can derive from the codebase while keeping gotchas/rationale/conventions**. The CLAUDE.md trim check requires v2.1.206+. Fixes are applied only on confirmation.

**`claude plugin validate <path> [--strict]`** **[shipped]** — verified by running the installed CLI. Validates a plugin or marketplace manifest, or the skills/agents/commands in a directory. `--strict` treats warnings as errors and exits 1, explicitly "for CI to fail on unrecognized fields, missing metadata, and other issues that the runtime tolerates."

Boundary: `/doctor`'s trim heuristic is *derivable-from-codebase* content. That is a real but different axis from **cross-file duplication** and **contradiction**, neither of which any official static linter addresses.

## 2. Runtime provenance

`/context [all]` gives a per-category breakdown with source attribution for memory files, skills, and custom subagents **[docs]**. `InstructionsLoaded` fires with a matcher on *why* a file loaded (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`) **[docs]**. `/hooks`, `/mcp`, `/status`, `/permissions`, `/debug` cover the rest of the live surface **[docs]**.

**Materially new finding — Claude offers assembled-request observability, not per-item provenance** **[delegated]**: `OTEL_LOG_RAW_API_BODIES=1` (or `file:<dir>`) logs `claude_code.api_request_body` — the full assembled request including system prompt, messages, and tools — untruncated to disk (default truncates at 60KB). Paired with `claude_code.token.usage` broken out by type (`input`, `output`, `cacheRead`, `cacheCreation`) and attributable per-user/session/skill/MCP-server.

This **narrows, but does not eliminate**, the provenance gap recorded in `cross-host-context-degradation-synthesis.md`. Corrected position: Claude can expose the *fully assembled prompt* (heavyweight, opt-in, operator-configured, and sensitive — it captures everything), which is strictly more than Codex's documented surface. It is still not a per-item *attribution graph* that maps a span of assembled text back to the file/rule/hook that contributed it — that inference remains ours to make. Recommend re-verifying the OTEL claims directly before we build on them, since they are `[delegated]` and this is load-bearing.

## 3. Token and prompt-cache analysis

**`session-report`** (Anthropic) **[shipped]** — reads `~/.claude/projects` transcripts via a bundled `analyze-sessions.mjs`, emitting JSON with `overall`, `by_project`, `by_subagent_type`, `by_skill`, **`cache_breaks`**, and `top_prompts` (subagent tokens included; task-notification continuations rolled into the originating prompt). Its own guidance names the anomaly thresholds it looks for: cache hit rate <85%, a single prompt >2% of total tokens, subagent types averaging >1M tokens/call, and cache breaks clustering.

Cache mechanics **[delegated]**: `cache_creation_input_tokens` vs `cache_read_input_tokens` per turn; reads at ~10% of standard rate; 5-minute TTL by default on API key, 1-hour on subscription, overridable via `ENABLE_PROMPT_CACHING_1H=1` / `FORCE_PROMPT_CACHING_5M=1`. Subagents do not read the parent's cache (separate prefix) and use the 5-minute TTL even on subscription.

**Partially — not fully — the empirical answer to the caching risk.** Corrected by jay's independent verification: `session-report`'s `cache_breaks` is a **>100k-token heuristic**, not a true cache-invalidation detector, so it flags large-payload events rather than proving a given restructure broke the cached prefix. Similarly `OTEL_LOG_RAW_API_BODIES` gives assembled-request observability but **no source-attribution graph**. What survives: OTEL's `cacheCreation` vs `cacheRead` counters are a genuine per-turn signal, so a controlled before/after comparison on a fixed task is still viable — but it must be built as a deliberate probe with those counters, not read off `cache_breaks` as though it were a cache-invalidation oracle. The blocking caching question therefore remains open and needs a purpose-built measurement.

Third-party **[vendor]**, all unverified: `claude-context-optimizer` (claims a `/cco-overhead` audit of the fixed per-session payload from first-turn API usage, cache-aware pricing at 10% read / 125% write, and a CLAUDE.md >200-line nudge); `token-optimizer`; `context-budget` skill (context audit across agents/skills/MCP/rules); `claude-code-token-saver` (cache-expiry detection, claims v2.1.71+). Their existence is well-evidenced; their accuracy is not. Treat as comparators to benchmark against, never as backends to trust silently.

## 4. Memory and compaction

Covered in depth in `claude-context-window-and-hooks.md`. New here: `contextWindowAutoCompactThresholdPercentage` is a configurable soft auto-compaction threshold (default varies by model, reportedly ~85% for Opus) **[delegated]**, and `claudeMdExcludes` / `worktree.sparsePaths` / `additionalDirectories` are the documented large-codebase context controls **[delegated]**.

## 5. Rule-vs-skill-vs-hook placement

**Anthropic publishes the decision matrix we were going to invent** **[delegated]**, across `memory.md`, `hooks-guide.md`, `features-overview.md`, and `large-codebases.md`. Shape: **CLAUDE.md** for always-relevant conventions that shape decisions (always loaded, always costs tokens); **path-scoped rules** for conditional file-area instructions (load on glob match); **skills** for repeatable workflows and reference material not needed every session (load on invocation/relevance); **hooks** for enforcement that must happen regardless of what the model decides (execute as code, no context cost). `large-codebases.md` additionally contrasts per-directory `CLAUDE.md` (owned by directory maintainers, loads at startup from that directory or on demand when read there) against `.claude/rules/` path-scoped rules (all at repo root, load conditionally on glob match).

`claude-automation-recommender` **[shipped]** also carries the official invocation-control semantics, which we need for any skill-based remediation: `disable-model-invocation: true` = user-only (for side effects: deploy, commit, send), `user-invocable: false` = Claude-only (background knowledge), omit both = either. It also documents `context: fork` for workflows that should run in isolation.

**Adopt this matrix verbatim and cite it. Do not author a competing one.**

## 6. General context optimization — and the two closest comparators

### `claude-md-management` / `claude-md-improver` (Anthropic) **[shipped]**

Read in full from installed source. It discovers CLAUDE.md files (project root, `.claude.local.md`, `~/.claude/CLAUDE.md`, package-level, nested), scores each against six weighted criteria (commands/workflows, architecture clarity, non-obvious patterns, conciseness, currency, actionability) on an A–F/100 scale, emits a file-by-file quality report **before** any edit, requires confirmation, shows diffs, then applies targeted changes. It flags stale commands, missing dependencies, outdated architecture, missing env setup, broken test commands, and undocumented gotchas.

Boundaries — this is the single most important differentiation input in this document:

1. **CLAUDE.md only.** Its discovery glob is `CLAUDE.md`, `.claude.md`, `.claude.local.md`. It does not examine `.claude/rules/`, `.claude/context/`, `.claude/skills/`, hooks, `settings.json`, or **`AGENTS.md` at all**. No cross-host concept exists in it.
2. **Its gradient is addition, not removal.** "Propose targeted additions only"; the report section is "Recommended additions"; the worked diff example is `+` lines; it promotes the `#` shortcut for auto-incorporating learnings *into* CLAUDE.md. Conciseness is 15 of 100 points and carries no token measurement. It is a **completeness and currency** auditor, and its default direction of travel grows the file.
3. **No token or cache accounting.** No token counts, no cost model, no cache consideration.
4. **No load-path verification.** It notes parent-directory auto-discovery but does not distinguish launch-loaded from on-demand subdirectory loading — a real correctness gap against `memory.md`, which specifies that subdirectory files load only when Claude reads a file in that directory.
5. **It does detect duplication, but only inside the CLAUDE.md family** — corrected by jay's independent verification; my first pass claimed it "structurally cannot" see cross-file duplication, which was wrong. `references/quality-criteria.md:109` lists "Duplicate info across multiple CLAUDE.md files" as an explicit Red Flag **[shipped]**. Precise boundary: it is a *red flag to surface*, not one of the six scored criteria (the nearest scored proxy is conciseness at 15/100), its comparison set is limited to the `CLAUDE.md`/`.claude.md`/`.claude.local.md` files it globs, and remediation remains addition-biased. So **CLAUDE.md-to-CLAUDE.md duplication is covered**; `CLAUDE.md`-to-`.claude/rules/` and `CLAUDE.md`-to-`AGENTS.md` duplication are not — and those are the two cross-surface cases this plugin would exist to catch.
6. **No placement reasoning.** Never asks whether content should become a rule, skill, or hook instead.

> **Method note, recorded deliberately — and it recurred three times.** The pattern: *partial read → confident absence claim*.
>
> 1. I inventoried `quality-criteria.md`, skipped it to conserve context, then asserted a structural limitation that file contradicts (it lists cross-CLAUDE.md duplication as a red flag).
> 2. I corrected this document's body but left the summary table, a section header, and two reuse items restating the superseded claims — the exact duplication-drift defect this plugin exists to detect, occurring inside the plugin's own research.
> 3. Reviewing a peer's document, I read from line 32 onward, missed the revision table at lines 13–15, and reported that three third-party licenses were unrecorded. They were recorded there, with pinned commit SHAs.
>
> Instance 3 happened *after* I wrote the rule from instance 1, which shows a rule stated once in prose does not bind behavior — the project's own central thesis, demonstrated on its own authors.
>
> **Standing rules, generalized beyond tools to any artifact under review:** (a) an absence claim requires reading the complete artifact, including tables and front matter, not the section that seemed relevant; (b) when a claim is corrected, sweep every restatement of it in the same document before declaring the correction done; (c) treat a correction offered by a peer as a hypothesis to verify, not a fact to absorb — instance 3's correction was itself checked against source before acceptance.
>
> **Evidence boundary (jay's correction, and it applies our own Enhancement gate to our own case study).** Status: `OBS`, N=3, single author, single task, non-independent instances. It establishes that prose-only process rules and unswept restatements **can** fail even for a capable author who wrote the rule. It does **not** establish that any particular hook or deterministic check would have caught them, nor that the finding generalizes to other authors, repos, or hosts. My earlier framing of this as "the strongest argument for enforced checks over prose" overreached and is withdrawn.
>
> What it legitimately supports: recommending a deterministic completeness/consistency check **when a target repo exhibits this same evidenced failure shape** — corrected content with surviving stale restatements, or absence claims made against partially-read artifacts. Such an Enhancement still requires its own before/after validation under the standard gate; this case study is the *evidenced gap* input to that gate, not a substitute for validating the fix.

### `claude-code-setup` / `claude-automation-recommender` (Anthropic) **[shipped]**

Explicitly **read-only** ("does NOT create or modify any files"). Profiles the codebase (language, framework, DB, testing, CI, issue tracker, docs patterns) and recommends **1–2 items per category** across MCP servers, skills, hooks, subagents, and plugins, with a signal-to-recommendation table per category and a "when to recommend X" decision framework.

Boundary: it recommends **new** automations from codebase signals. It does not inventory or evaluate *existing* configuration, does not detect misplacement, and does not measure cost. Its self-imposed 1–2-per-category cap is a deliberate anti-overwhelm constraint worth copying into our own gated Enhancement class.

## The closest third-party suite: melodic-software/claude-code-plugins

Surfaced by jay; inventory below read from that repository's own generated `docs/CATALOG.md` **[vendor]**. MIT, ~1,588 commits, and — load-bearing for our differentiation — **Claude Code only, not Codex** (repository's own compatibility statement). Relevant components, descriptions quoted from that catalog:

| Component | Skill | Self-described capability |
|---|---|---|
| `context-budget` | measure-toggle-remeasure ledger | "Measure a Claude Code session's fixed startup context payload **per item**," including "per-tool attribution of the built-in tool pools" via **A/B differencing**. "Report-only: prints exact config, applies nothing." |
| `context-guard` | statusline wrapper, zone resolver, PostCompact hook | "Per-session context-window observability," usage classified into "smart/acceptable/dumb bands," zone-crossing hooks; advisory by default, optional blocking mode |
| `claude-memory` | audit, stateless | "Keeps a repo's Claude Code memory layer healthy" across "CLAUDE.md, CLAUDE.local.md, **`.claude/rules/`**, auto-memory," with deterministic and judgment tiers; can inspect/disable/purge auto memory across settings scopes |
| `claude-config` | audit-instructions, audit-pass, unhobble (+6) | audit-instructions detects "locally-owned instruction surfaces vs current model capability — proposes **removals**/rewrites" and identifies "**cross-surface instruction conflicts**." **Does not mention AGENTS.md support.** |
| `claude-config` | unhobble | "The empirical bare-baseline experiment: reversibly strip a repo's standing instructions, log real stumbles against the current model, re-add only what evidence earns" |
| `docs-hygiene` | audit-progressive-disclosure | "Grade instruction files against a load-tier model for split opportunities and hub/spoke disclosure defects" |
| `docs-hygiene` | extract-ssot | "Deduplicate repeated content into a single source of truth" |

**Epistemic status, and this matters for the review gate:** every capability above is the suite's *own description of itself*, taken from a generated catalog. Under the standard this project already applied to `ctxlint`/`agnix`/`skill-validator`, that is `[vendor]` — candidate evidence, not verified behavior. None of it has been run, and a well-written catalog entry is not a demonstration. Do not promote these to verified without a bounded trial.

## Capability boundaries: the uncovered space (materially revised)

**My first pass overstated the gap.** Assuming only official tooling existed, I listed seven uncovered areas. The melodic-software suite claims coverage of most of them — on Claude only. Corrected position:

| Previously claimed uncovered | Actual status |
|---|---|
| Cross-file duplication and contradiction | **Claimed covered (Claude-only)** — `docs-hygiene:extract-ssot` for dedup-to-SSOT, `claude-config:audit-instructions` for "cross-surface instruction conflicts"; also partially by `claude-md-improver` inside the CLAUDE.md family |
| `.claude/rules/` as a content-audit target | **Claimed covered (Claude-only)** — `claude-memory` audits `.claude/rules/` explicitly |
| Placement migration of existing config | **Claimed covered (Claude-only)** — `docs-hygiene:audit-progressive-disclosure` grades load-tier placement and split opportunities |
| Removal justified by measured adherence | **Claimed covered (Claude-only)** — `claude-config:unhobble` is precisely the reversible bare-baseline experiment; `claude plugin eval --ablation` supplies the first-party measurement primitive |
| Per-item token accounting | **Claimed covered (Claude-only)** — `context-budget` measures the fixed startup payload per item by A/B differencing |
| Direction-of-travel (addition bias) | **No longer a differentiator** — `claude-config:audit-instructions` explicitly proposes removals, and `unhobble` is removal-first |
| **Cross-host parity (`AGENTS.md`)** | **Still uncovered.** The entire suite is Claude-only by its own statement, and `claude-config` does not mention `AGENTS.md`. No incumbent reconciles Claude and Codex instruction surfaces. |
| **Per-host load-path proof before removal** | **Still uncovered.** No incumbent proves a file actually loads on a given host before advising its removal. |
| **Normalization across heterogeneous tools** | **Still uncovered.** Each incumbent emits its own format, scope, and confidence posture; nothing reconciles them into one evidence model with host/version/method/limitations attached. |

**Honest conclusion:** the differentiated core is narrower than my first pass implied, but it is real and it is exactly the three rows above — cross-host reconciliation, load-path proof, and evidence normalization. That supports jay's "compose, do not recreate" framing and argues against v1 shipping any fresh Claude-only auditor.

## Reuse recommendations

1. **Do not build an eval harness.** Use `claude plugin eval --ablation with-without` **[shipped]**: it runs a no-plugin baseline arm and reports the score delta, with `evals/**/case.yaml` or `prompt.md` + `graders/*.md`, `--judge-model` (default haiku), `--case` glob filtering, `--json`, a self-contained HTML `--report`, and `--max-cost-usd` as a hard ceiling. This is the correct instrument for both the quality-preservation workstream and the "does a contradiction actually change behavior" probe. It also revises my own point 10 from the research plan: `agent-artifex` may be unnecessary for eval *mechanics* here — check this first before investing there.
2. **Do not build a *deterministic* hook generator — but hookify covers less than my first pass implied.** `hookify` (Anthropic) **[shipped]** ships working `pretooluse.py`, `posttooluse.py`, `stop.py`, `userpromptsubmit.py`, a `rule_engine.py`/`config_loader.py` core, markdown rule definitions with examples (`dangerous-rm`, `sensitive-files-warning`, `require-tests-stop`), and a `conversation-analyzer` agent. **Corrected scope (jay, independent verification):** it replaces *deterministic Claude regex-rule hook generation only*. It does **not** cover judgment-based `prompt`/`agent`-type hooks, and it does **not** cover Codex hook mechanisms at all. Consequence for the taxonomy: a judgment-requiring BLOCKING rule still needs a `prompt`/`agent` hook authored on Claude, and on Codex still needs deterministic hooks/CI or a bounded subagent (Codex parses but skips `prompt`/`agent` handlers). Point only the deterministic-Claude subset at hookify.
3. **Do not build skill authoring or validation.** `skill-creator` (Anthropic) **[shipped]** ships `run_eval.py`, `quick_validate.py`, `improve_description.py`, `package_skill.py`, `aggregate_benchmark.py`, and grader/comparator/analyzer agents. Gate anything we emit with `claude plugin validate --strict`.
4. **Do not build transcript token analytics.** Consume `session-report`'s `analyze-sessions.mjs --json` output; it already provides `by_skill`, `by_subagent_type`, `cache_breaks`, and `top_prompts`.
5. **Do not re-score CLAUDE.md quality or currency.** Defer to `claude-md-improver` and scope ourselves to the three rows that survive in the revised uncovered-space table (cross-host reconciliation, per-host load-path proof, evidence normalization). Where a target repo would benefit from a completeness/currency pass, *recommend that plugin* rather than duplicating it — a Retirement-class finding pointed at ourselves.
6. **Adopt the official placement matrix** and the invocation-control semantics verbatim, with citations.
7. **Measure the caching risk with a purpose-built probe, not with `cache_breaks`.** `cache_breaks` is a >100k-token heuristic and is not causal evidence of cache invalidation. The viable instrument is OTEL's per-turn `cacheCreation` vs `cacheRead` counters compared before and after a restructure on a fixed task. No restructure recommendation should ship without that controlled measurement, and the blocking cache question stays open until it exists.

## Unverified / could not confirm

- **`/skill-doctor`** — a `claude-code-guide` subagent tested it in a clean session and got "Unknown command"; it does not appear in official docs or CLI help. My own environment's system prompt references it as early access. **Treat as unavailable**; do not depend on it.
- **`claude plugin eval` availability elsewhere.** Its `--help` resolves in this installed CLI **[shipped]**, but it is described as early access with per-organization enablement **[delegated]**. Our own use is fine; do not assume a target repo's operators can run it.
- **Exact `/doctor` lint rubric.** Behavior is documented; the specific rule set for what counts as derivable or redundant is not published.
- **All third-party capability and savings claims** (e.g. "30–50% cost reduction") — `[vendor]`, unverified, and not to be cited as evidence.
- **The OTEL provenance and cache-TTL specifics** are `[delegated]` with doc URLs but not independently re-verified by me; they are load-bearing enough to re-check directly.

## Sources

Shipped source read directly: `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`; `plugins/claude-md-management/skills/claude-md-improver/SKILL.md`; `plugins/claude-code-setup/skills/claude-automation-recommender/SKILL.md`; `plugins/session-report/skills/session-report/SKILL.md`; `plugins/hookify/` and `plugins/skill-creator/` file inventories. Installed CLI: `claude plugin validate --help`, `claude plugin eval --help`.

Official docs (via delegated agent, URLs as cited): [debug-your-config](https://code.claude.com/docs/en/debug-your-config), [memory](https://code.claude.com/docs/en/memory), [prompt-caching](https://code.claude.com/docs/en/prompt-caching), [context-window](https://code.claude.com/docs/en/context-window), [commands](https://code.claude.com/docs/en/commands), [plugins](https://code.claude.com/docs/en/plugins), [monitoring-usage](https://code.claude.com/docs/en/monitoring-usage), [large-codebases](https://code.claude.com/docs/en/large-codebases), [sub-agents](https://code.claude.com/docs/en/sub-agents), [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official).

Third-party comparators (existence evidenced, claims unverified): [claude-context-optimizer](https://github.com/egorfedorov/claude-context-optimizer), [token-optimizer](https://github.com/alexgreensh/token-optimizer), plus the registry/lint tools catalogued in `overlapping-tooling-codex.md`.
