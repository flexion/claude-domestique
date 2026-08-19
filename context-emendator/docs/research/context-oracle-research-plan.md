# Working-Context Technical Briefing Research Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a version-stamped, source-preserved, empirically tested technical briefing that explains how Claude Code and Codex assemble, prioritize, retain, refresh, and lose working context, and turns that evidence into safe placement and remediation rules for `context-emendator`.

**Architecture:** Build the briefing in four layers: a claim/source ledger, authoritative host and model research, controlled host experiments, and a cross-host synthesis. Keep raw evidence separate from conclusions; every conclusion must point to a documented mechanism or a reproducible observation and state what remains unknown.

**Tech Stack:** Markdown, Git, Claude Code CLI, Codex CLI, host-native context/debug commands and logs, shell-based fixture setup, and the repository's agent-artifex evaluation guidance.

**Spec:** `context-emendator/README.md` plus the user-approved working-context research scope recorded in `.claude/sessions/chore-agent-workflow-plugin.md`.

## Global Constraints

- This is research, not plugin implementation. Do not add runtime hooks, skills, marketplace registration, or automatic remediation in this plan.
- Commit no confidential repository names, paths, source text, or results. Use this public repository and synthetic fixtures for committed examples.
- Prefer official Anthropic/OpenAI documentation for host behavior and original papers or benchmark repositories for model-behavior claims.
- A downloaded source may be committed only when its license permits redistribution. Otherwise keep the raw capture outside Git and commit a concise source note with URL, retrieval date, version, checksum when available, and short compliant excerpts.
- Classify every material claim as `DOC` (documented), `OBS` (observed), `INF` (inference), or `UNK` (unknown). Behavioral observations cannot establish hidden attention weights, internal “skimming,” or undocumented prompt construction.
- Stamp host-sensitive claims and experiment results with CLI version, model, date, operating mode, configuration scope, and relevant feature flags.
- Every host-sensitive claim must name a revalidation trigger: host version change, model change, documentation change, or failed regression probe.
- Measure instruction **authority**, **availability**, **durability**, **salience/adherence**, and **enforcement** separately. Never use “priority” as an unspecified umbrella term.
- For deterministic load-path claims, capture at least two clean-session traces. For stochastic behavioral claims, run at least five independent trials per condition and report the distribution, not a single anecdote.
- Compare candidate context changes against both cost and task outcomes. A token reduction is not an improvement if task success, guardrail adherence, autonomy, or latency regresses.
- Treat prompt-cache behavior as a first-class variable. Do not recommend restructuring a stable prefix until cache-hit, cost, and latency effects are documented or explicitly marked unknown.
- Do not use a static tokenizer proxy as Claude token or cost evidence. Record static bytes/lines only as inventory facts; Claude cost claims require a versioned host-native measurement or a separately validated measurement tool.
- Keep edits conflict-free: Ivy owns Claude-specific source/result files; Jay owns Codex-specific and model-level files. Jay assembles shared synthesis only after Ivy delivers her sections; each reviews the other's host claims before sign-off.
- “Context Oracle” is a research-phase shorthand for the authoritative briefing, not a plugin component, command, or product rename.

## Scope Boundary: Blocking vs. Deferred

This plan is intentionally bounded. The plugin's own thesis is that unbounded accumulation degrades useful context; the research phase must not reproduce that failure mode.

**Blocking for the briefing:**

- A prior-art capability audit covering native diagnostics, official plugins/skills, and credible third-party tools. No planned capability may duplicate an incumbent without a recorded host, evidence, license/security, or integration reason.
- Direct official source packs for the host surfaces the plugin will inspect or recommend.
- Prompt-cache evidence, because cache invalidation could reverse a nominal token/cost improvement.
- Enough primary model-behavior research to define degradation phenomena and interpret the controlled probes.
- The ten small experiment IDs in Task 5, on one current Claude model/version and one current Codex model/version only.
- The cross-host capability matrix and placement/remediation decision rules, because removal and relocation cannot be justified without them.
- The final working-context briefing, claim ledger, and independent Jay/Ivy sign-offs.

**Deferred until after a thin v1 exists:**

- Broad autonomy/workflow feature research that does not change context assembly, retention, refresh, enforcement, or observability.
- Additional model families, old host versions, large samples, formal statistical generalization, and a broad benchmark corpus.
- Automated regression infrastructure, CI scheduling, continuous documentation monitoring, and production hook instrumentation.
- Exhaustive third-party-tool comparisons beyond evidence needed to avoid duplicating an existing capability.
- Implementing any audit, remediation, hook, memory, or runtime feature.

Deferred work must be recorded as a concrete follow-up question with a trigger; it is not a reason to hold the blocking briefing open.

---

### Task 0: Prove the plugin is not rebuilding prior art

**Owner:** Jay assembles the cross-host decision; Ivy owns Claude-native verification and cross-reviews the result.

**Files:**
- Modify: `context-emendator/docs/research/overlapping-tooling-reference.md`
- Modify: `context-emendator/docs/research/sources/overlapping-tooling-codex.md`
- Create/modify: `context-emendator/docs/research/sources/prior-art-claude.md`
- Modify: `context-emendator/docs/research/context-oracle-research-plan.md`

**Interfaces:**
- Consumes: native host help/docs, official marketplace manifests and shipped source, public repositories at recorded revisions, and bounded trials on this public repository.
- Produces: the canonical reuse/defer/build capability map that constrains every later task and the thin v1.

- [x] **Step 1: Inventory native and first-party capabilities**

  Include host health/config diagnostics, live context inspection, instruction-load events, telemetry/logs, plugin/skill validation, Claude ablation evaluation, deterministic hook generation, and official authoring/audit skills. Verify authorship from manifests; marketplace presence alone is insufficient.

- [x] **Step 2: Inspect the closest third-party implementations**

  Read implementation or shipped skill bodies for static multi-host linters, Claude instruction/memory/config auditors, token/startup-payload measurement, runtime context monitoring, Codex `AGENTS.md` chain reconstruction, and evidence validators. Record revision, license, host/version support, and failure posture.

- [x] **Step 3: Run bounded public-repository trials**

  Run the strongest install-free static linters against this public repository. Record exit status, finding counts, and representative false/noisy results. A tool's own score or token estimate is not validation of its accuracy.

- [x] **Step 4: Classify each capability**

  Use four dispositions: invoke/recommend an incumbent; optional structured-evidence adapter; borrow a method under its license; or build because a coherent gap remains. Keep code reuse, process reuse, and external invocation distinct.

- [x] **Step 5: Cross-review and freeze the boundary**

  Ivy corrects the Claude findings; Jay corrects the Codex/cross-host findings. The shared reference must explicitly list what v1 will not build and define the remaining unique core. Any disagreement or unverified dependency stays `UNK`/optional.

**Review gate:** both owners confirm that no later task or v1 feature duplicates a known incumbent without an explicit recorded reason, and that third-party outputs remain candidate evidence until independently verified.

---

### Task 1: Establish the evidence contract and gap register

**Owner:** Jay drafts; Ivy reviews.

**Files:**
- Create: `context-emendator/docs/research/sources/source-register.md`
- Create: `context-emendator/docs/research/sources/claim-ledger.md`
- Modify: `context-emendator/docs/research/context-oracle-research-plan.md`

**Interfaces:**
- Consumes: the eight existing research/reference notes under `context-emendator/docs/research/`.
- Produces: the source metadata and claim schema used by every later task. The claim ledger is also the **provisional v1 audit output contract**: implementation may refine its serialization, but not discard its evidence/provenance/limitation fields in favor of an untraceable prose report.

- [ ] **Step 1: Inventory existing claims and sources**

  List every current `## Sources` entry and every substantive host-behavior claim. Give each claim a stable ID using `CLAUDE-*`, `CODEX-*`, `MODEL-*`, or `CROSS-*`.

- [ ] **Step 2: Create the source register**

  Use these columns:

  ```markdown
  | Source ID | Publisher | Title | Canonical URL | Retrieved | Product/model version | Primary? | Redistribution | Local evidence | Revalidate when |
  |---|---|---|---|---|---|---|---|---|---|
  ```

  `Local evidence` must be either a committed source note, a licensed committed artifact, or a checksum/path to an uncommitted capture.

  Carry the prior-art licenses into this register before any method becomes copied code or schema: Strata `era-audit` and `memory-audit` were observed as MIT; Sentry skills as Apache-2.0. Reverify the repository license at the recorded revision and preserve attribution/notice obligations.

- [ ] **Step 3: Create the claim ledger**

  Use these columns:

  ```markdown
  | Claim ID | Artifact/span | Claim | Host/layer | Status | Authority | Evidence/source IDs | Tool/host/model version | Method | Limitations | Confidence | Proposed disposition | Validation route | Revalidation trigger |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  ```

  `Status` is one of `DOC`, `OBS`, `INF`, or `UNK`. `Authority` records whether the source is normative vendor documentation, descriptive vendor guidance, a primary paper, host telemetry, behavioral evidence, or vendor self-description. `Method` distinguishes file inspection, static tool output, native runtime trace, raw request capture, and repeated behavioral probe. Third-party capability claims remain `UNK` until the recorded version has a bounded trial.

- [ ] **Step 4: Record the known gaps before new research**

  At minimum, register gaps for prompt assembly, message/order precedence, path-rule triggers, compaction survival, memory lifecycle, skill discovery/reinjection, hook insertion points, prompt caching, formatting/adherence, contradiction behavior, and what host diagnostics cannot reveal.

- [ ] **Step 5: Validate the evidence files mechanically**

  Run:

  ```bash
  rg -n "^\| (CLAUDE|CODEX|MODEL|CROSS)-" context-emendator/docs/research/sources/claim-ledger.md
  rg -n "https://" context-emendator/docs/research/sources/source-register.md
  rg -n "T[B]D|T[O]DO|unknown source" context-emendator/docs/research/sources/source-register.md context-emendator/docs/research/sources/claim-ledger.md
  ```

  Expected: claim IDs and source URLs are present; the placeholder scan returns no output. Real unknowns are written as `UNK` claims with a reason and a validation route, not as placeholders.

**Review gate:** Ivy confirms that the ledger distinguishes evidence status from confidence and that no existing search-synthesis claim is mislabeled as a direct fetch.

---

### Task 2: Build the direct, authoritative Claude source pack

**Owner:** Ivy; Jay cross-reviews citations and inference boundaries.

**Files:**
- Create: `context-emendator/docs/research/sources/claude-authoritative-reference.md`
- Modify: `context-emendator/docs/research/sources/source-register.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`

**Interfaces:**
- Consumes: current Claude notes and the Task 1 evidence schema.
- Produces: direct-source evidence for Claude context assembly, lifecycle, placement, cost, and enhancement mechanisms.

- [ ] **Step 1: Capture the core context-loading documentation directly**

  Fetch and record the current official pages for memory/`CLAUDE.md`, rules, the `.claude` directory, context windows/compaction, configuration debugging, and best practices. Record redirects and canonical URLs rather than assuming yesterday's page names remain stable.

- [ ] **Step 2: Capture the plugin-building surfaces directly**

  Fetch the official plugin guide, plugin reference, skills documentation, subagent documentation, hooks guide, and full hooks reference. The reference must be treated separately from the guide because lifecycle payloads and context-injection semantics live there.

- [ ] **Step 3: Capture Anthropic's feature-selection decision tree**

  Fetch the official features overview, especially the guidance that selects among `CLAUDE.md`, rules, skills, hooks, subagents, and MCP. Preserve its decision criteria in the source note; later remediation rules must adapt this official tree rather than invent a competing taxonomy.

- [ ] **Step 4: Capture cost and cache documentation**

  Fetch the official token-reduction/cost guidance and prompt-caching documentation. Extract what forms the cacheable prefix, invalidation boundaries, observable cache metrics, TTL/retention behavior if documented, and implications for imports or reorganized instructions. Mark anything not exposed by Claude Code telemetry as `UNK`.

- [ ] **Step 5: Capture only context-relevant autonomy surfaces**

  Fetch official documentation for goals/completion conditions, agent teams, common workflows, status lines, output styles, and append/replace-system-prompt controls only far enough to classify whether each changes model-visible context, orchestration only, or enforcement outside context. Defer deeper research for mechanisms that do not alter context assembly, retention, refresh, enforcement, or observability.

- [ ] **Step 6: Reconcile existing Claude notes**

  For every claim in the three existing Claude source notes, point to a direct source in `claude-authoritative-reference.md`, downgrade it to `INF`/`UNK`, or remove it from future synthesis. Do not silently carry search synthesis forward as direct evidence.

- [ ] **Step 7: Verify source completeness**

  Run:

  ```bash
  rg -n "plugins|skills|subagent|hooks reference|features overview|token|cache|agent teams|system prompt" context-emendator/docs/research/sources/claude-authoritative-reference.md
  rg -n "Retrieved:|Claude Code version:|Revalidate when:" context-emendator/docs/research/sources/claude-authoritative-reference.md
  ```

  Expected: every target surface and every version/revalidation field appears.

**Review gate:** Jay samples each high-impact claim against its direct URL and rejects conclusions that exceed the cited host contract.

---

### Task 3: Build the direct, authoritative Codex source pack

**Owner:** Jay; Ivy cross-reviews citations and inference boundaries.

**Files:**
- Create: `context-emendator/docs/research/sources/codex-authoritative-reference.md`
- Modify: `context-emendator/docs/research/sources/source-register.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`

**Interfaces:**
- Consumes: current Codex notes, the locally fetched official Codex manual, and the Task 1 evidence schema.
- Produces: direct-source evidence for Codex prompt/context assembly, `AGENTS.md`, skills, hooks, subagents, compaction, memory/session behavior, plugins, diagnostics, and cost controls.

- [ ] **Step 1: Snapshot the official Codex documentation**

  Use the `openai-docs` skill and its local manual fetcher. Record the manual revision or retrieval date and canonical official URLs. Restrict host-mechanics claims to official OpenAI sources.

- [ ] **Step 2: Trace every context input**

  Document the supported evidence for system/developer/user/tool messages, `AGENTS.md` discovery and size limits, user/project configuration, skills, plugins, hooks, subagents, tool schemas/results, conversation history, images/files, MCP, and app-server injection. Explicitly identify sources whose ordering or message-role placement is not documented.

- [ ] **Step 3: Trace lifecycle and retention**

  Document session start/resume/clear, manual and automatic compaction, `compact_prompt`, pre/post-compact events, bounded context reinjection, session JSONL/logging, and any official memory facilities. Keep authority hierarchy separate from compaction retention.

- [ ] **Step 4: Trace diagnostics and token/cost controls**

  Document `/status`, configuration diagnostics, prompt-input rendering, logs, token capacity/usage, tool-search or schema-loading behavior, and any observable cached-input metrics. Label experimental commands as unstable and assign a short revalidation trigger.

- [ ] **Step 5: Reconcile existing Codex notes**

  For every claim in the three existing Codex source notes, point to a direct source, downgrade it, or exclude it from the final briefing. Specifically recheck hook-handler support, skill discovery paths/budgets, plugin trust, and context-compaction claims against the current version.

- [ ] **Step 6: Verify source completeness**

  Run:

  ```bash
  rg -n "AGENTS.md|skills|subagent|hooks|compact|memory|plugin|prompt-input|token|cache" context-emendator/docs/research/sources/codex-authoritative-reference.md
  rg -n "Retrieved:|Codex version:|Revalidate when:" context-emendator/docs/research/sources/codex-authoritative-reference.md
  ```

  Expected: every target surface and every version/revalidation field appears.

**Review gate:** Ivy samples high-impact claims and confirms that Codex limitations are not filled in with Claude behavior by analogy.

---

### Task 4: Research model-level degradation and instruction fidelity

**Owner:** Jay leads source acquisition; Ivy reviews Anthropic applicability and synthesis.

**Files:**
- Create: `context-emendator/docs/research/sources/model-context-behavior.md`
- Modify: `context-emendator/docs/research/sources/source-register.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`

**Interfaces:**
- Consumes: original papers/benchmark repositories plus official provider prompting and model-behavior guidance.
- Produces: bounded, model-level explanations and experiment hypotheses; it does not override host-specific contracts.

- [ ] **Step 1: Define the degradation phenomena precisely**

  Separate positional retrieval loss, distractor interference, instruction conflict, recency effects, long-context degradation without retrieval failure, multi-turn/coreference decay, summarization/compaction loss, and tool-output displacement. Give each phenomenon a measurable observable.

- [ ] **Step 2: Acquire primary evidence**

  Include original publications and repositories for long-context position effects (including “Lost in the Middle”), long-context benchmarks such as LongBench/RULER where applicable, multi-turn degradation, instruction hierarchy, and provider-authored context/prompting guidance. Record model families, context lengths, tasks, dates, and limitations before applying results to current Claude/Codex models.

- [ ] **Step 3: Research formatting and instruction grammar**

  Collect direct evidence on headings/delimiters, explicit priority language, positive versus negative instructions, examples, ordering, repetition, structured formats, XML/Markdown/YAML tradeoffs, and concise versus verbose instructions. Do not generalize a result across model families without a host-specific experiment.

- [ ] **Step 4: Build the hypothesis table**

  Use:

  ```markdown
  | Hypothesis ID | Mechanism | Observable | Existing evidence | Host applicability | Confounders | Experiment |
  |---|---|---|---|---|---|---|
  ```

- [ ] **Step 5: Bound the conclusions**

  Add an explicit “What this evidence cannot tell us” section covering proprietary system prompts, hidden attention values, host-side prompt transformations, undisclosed truncation, and model updates.

**Review gate:** Both reviewers agree that every model-level claim states the evaluated models/tasks and is not presented as an invariant of all LLMs.

---

### Task 5: Define the clean-room experiment harness and evaluation method

**Owner:** Shared design; Jay writes the shared files after Ivy supplies Claude requirements.

**Files:**
- Create: `context-emendator/docs/research/experiments/README.md`
- Create: `context-emendator/docs/research/experiments/fixture/AGENTS.md`
- Create: `context-emendator/docs/research/experiments/fixture/CLAUDE.md`
- Create: `context-emendator/docs/research/experiments/fixture/referenced-detail.md`
- Create: `context-emendator/docs/research/experiments/fixture/.claude/rules/unscoped.md`
- Create: `context-emendator/docs/research/experiments/fixture/.claude/rules/scoped.md`
- Create: `context-emendator/docs/research/experiments/fixture/.claude/skills/context-probe/SKILL.md`
- Create: `context-emendator/docs/research/experiments/fixture/.agents/skills/context-probe/SKILL.md`
- Create: `context-emendator/docs/research/evaluation-methodology.md`

**Interfaces:**
- Consumes: host contracts from Tasks 2–3, hypotheses from Task 4, and agent-artifex's outcome-based, multi-turn evaluation guidance.
- Produces: a versioned fixture and protocol both host owners run without exposing private repositories.

- [ ] **Step 1: Define run isolation and metadata**

  Every run records: experiment ID, Git commit, UTC timestamp, exact host executable path and CLI version, session mode (`interactive`, `headless`, `cloud`, or other named surface), model, context-window setting, configuration roots, enabled plugins/hooks/MCP, permission mode, clean-room command, trial number, raw evidence path, and result classification. Never compare startup-payload measurements across a binary or session-mode change.

- [ ] **Step 2: Define neutral source canaries**

  Give every fixture source a unique generated marker of the form `CE_<SOURCE>_<RUN>`. Use markers only to prove availability/provenance; do not equate marker recall with general instruction adherence.

- [ ] **Step 3: Define the minimum experiment suite**

  Assign stable IDs and procedures for:

  - `LOAD-01`: startup assembly and source attribution.
  - `RULE-01`: whether a path-scoped Claude rule triggers on Read, Edit, and Write independently.
  - `COMPACT-01`: survival/reinjection of root guidance, unscoped/scoped rules, nested guidance, invoked skill bodies, memory, and hook context.
  - `SKILL-01`: native skill discovery, index cost, invocation, supporting-file loading, and post-compaction behavior; include Codex `.agent` versus `.agents` discovery.
  - `HOOK-01`: lifecycle event ordering, message authority, context-injection limits, accumulation, and hard-enforcement boundaries.
  - `MEMORY-01`: cross-turn/session persistence, refresh, stale-memory behavior, and removal/update semantics.
  - `CONFLICT-01`: observable behavior when equivalent-authority files disagree and when message-authority levels disagree.
  - `POSITION-01`: the same critical instruction placed early, middle, and late under controlled distractor load.
  - `FORMAT-01`: semantically equivalent concise/structured and verbose/prose instructions, measuring tokens and adherence.
  - `CACHE-01`: stable-prefix cache hits, invalidation, latency, and cost before and after import/restructure changes where telemetry exists.

- [ ] **Step 4: Define outcome metrics**

  Reuse agent-artifex's principle to grade outcomes rather than exact tool-call paths. Record at least:

  ```markdown
  | Metric | Meaning |
  |---|---|
  | Load evidence | Host trace proves the source entered context |
  | Adherence rate | Trials satisfying the targeted instruction / total trials |
  | Guardrail violation rate | Trials violating a stated invariant / total trials |
  | Task success | All deterministic outcome assertions pass |
  | Assertion coverage | Passed assertions / total assertions |
  | Input tokens | Model-visible input for the condition |
  | Cached input | Cache-hit tokens or documented proxy, if exposed |
  | Latency | Same host/model task elapsed time |
  | Human interventions | Clarifications/corrections required to finish |
  ```

- [ ] **Step 5: Define comparison rules**

  A proposed optimization passes only if it reduces the targeted cost and does not lower task success or guardrail adherence beyond the predeclared tolerance. With five trials, treat findings as directional evidence and report raw counts; do not claim statistical generality.

- [ ] **Step 6: Validate the fixture**

  Run:

  ```bash
  rg --files --hidden context-emendator/docs/research/experiments/fixture | sort
  rg -n "LOAD-01|RULE-01|COMPACT-01|SKILL-01|HOOK-01|MEMORY-01|CONFLICT-01|POSITION-01|FORMAT-01|CACHE-01" context-emendator/docs/research/experiments/README.md
  rg -n "task success|guardrail|input tokens|cached input|human interventions" context-emendator/docs/research/evaluation-methodology.md
  ```

  Expected: all fixture inputs, experiment IDs, and quality/cost metrics are present.

**Review gate:** Both host owners can execute the protocol without interpreting an unstated step, and no fixture relies on a private repository.

---

### Task 6: Run and document the Claude experiments

**Owner:** Ivy; Jay audits raw evidence against conclusions.

**Files:**
- Create: `context-emendator/docs/research/experiments/results/claude-observations.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`

**Interfaces:**
- Consumes: Task 5 protocol and fixture.
- Produces: Claude load-path, lifecycle, cost, cache, and behavioral observations.

- [ ] **Step 1: Record a clean-room baseline**

  Capture `claude --version`, model, active configuration roots, safe-mode comparison, `/context`, `/status`, `/hooks`, and relevant debug output before running conditions.

- [ ] **Step 2: Run deterministic lifecycle probes twice**

  Execute `LOAD-01`, `RULE-01`, `COMPACT-01`, `SKILL-01`, `HOOK-01`, and `MEMORY-01` in fresh sessions twice. Use `InstructionsLoaded` and `/context` evidence wherever supported.

- [ ] **Step 3: Run behavioral and formatting probes**

  Execute `CONFLICT-01`, `POSITION-01`, and `FORMAT-01` for at least five independent trials per condition on the same model/version.

- [ ] **Step 4: Run the cache/cost probe**

  Execute `CACHE-01` only with documented telemetry. If Claude Code does not expose sufficient cache metrics, record the boundary as `UNK` and prohibit a cost claim from that experiment.

- [ ] **Step 5: Publish result tables and raw-evidence pointers**

  Each conclusion must name its experiment, raw capture, version, trial counts, confounders, and `OBS` confidence. Add or update claim-ledger rows without converting an observation into a host guarantee.

**Review gate:** Jay can reproduce at least one deterministic Claude result from the committed protocol and finds no unsupported causal language.

---

### Task 7: Run and document the Codex experiments

**Owner:** Jay; Ivy audits raw evidence against conclusions.

**Files:**
- Create: `context-emendator/docs/research/experiments/results/codex-observations.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`

**Interfaces:**
- Consumes: Task 5 protocol and fixture.
- Produces: Codex load-path, lifecycle, cost, and behavioral observations with explicit diagnostic limitations.

- [ ] **Step 1: Record a clean-room baseline**

  Capture `codex --version`, model, configuration roots, `/status`, configuration diagnostics, prompt-input rendering where supported, and session/log settings.

- [ ] **Step 2: Run deterministic lifecycle probes twice**

  Execute the Codex-applicable portions of `LOAD-01`, `COMPACT-01`, `SKILL-01`, `HOOK-01`, and `MEMORY-01` in fresh sessions twice. Use session JSONL/log evidence to prove native loading; state when per-item provenance is unavailable.

- [ ] **Step 3: Resolve skill discovery empirically**

  Run `SKILL-01` separately with `.agent/skills`, `.agents/skills`, and any documented plugin adapter. Verify with `/skills` plus a live selection/log trace; an instruction that merely lists a path is not load evidence.

- [ ] **Step 4: Run behavioral and formatting probes**

  Execute `CONFLICT-01`, `POSITION-01`, and `FORMAT-01` for at least five independent trials per condition on the same model/version.

- [ ] **Step 5: Run cache/cost probes where observable**

  Record input tokens, compaction behavior, schema/tool loading, cache telemetry, and latency only where the host exposes them. Mark unavailable fields `UNK` rather than estimate them from file size alone.

- [ ] **Step 6: Publish result tables and raw-evidence pointers**

  Each conclusion must name its experiment, raw capture, version, trial counts, confounders, and `OBS` confidence.

**Review gate:** Ivy can reproduce at least one deterministic Codex result and confirms that Claude-only diagnostics or lifecycle contracts were not imported by analogy.

---

### Task 8: Build the cross-host capability matrix and placement rules

**Owner:** Shared analysis; Jay drafts after Tasks 6–7, Ivy challenges the Claude mappings.

**Files:**
- Create: `context-emendator/docs/research/context-capability-matrix.md`
- Create: `context-emendator/docs/research/remediation-decision-rules.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`

**Interfaces:**
- Consumes: documented contracts and observed results.
- Produces: the decision substrate used by the final briefing and future auditor.

- [ ] **Step 1: Build the capability matrix**

  Give each host rows for system/developer/user instructions, root/nested front doors, rules, imports/references, skills, hooks, memory, subagents, MCP/tools, tool results, conversation history, compaction summaries, plugins, and runtime injection. Use these columns:

  ```markdown
  | Source/mechanism | Discovery/load trigger | Message authority | Scope | Reload/refresh | Compaction durability | Token/cache impact | Enforcement | Provenance tooling | Version/confidence |
  |---|---|---|---|---|---|---|---|---|---|
  ```

- [ ] **Step 2: Separate five placement questions**

  For every mechanism, answer: who may override it, whether it is present now, whether it survives later, whether behavior follows it under pressure, and whether a non-model gate enforces it.

- [ ] **Step 3: Adapt the official feature-selection guidance**

  Start from Anthropic's official CLAUDE.md/rule/skill/hook/MCP decision guidance, then add documented Codex equivalents and explicit “no equivalent” branches. Do not force symmetry where the hosts differ.

- [ ] **Step 4: Encode remediation rules**

  Cover at least:

  - Always relevant, concise project invariants → root front door/shared canonical layer.
  - File-area-specific guidance → path-scoped rule where the host supports and re-triggers it.
  - Prompt/task-triggered workflow → skill with progressive disclosure.
  - Deterministic safety/property → hook, CI, permission, or platform control rather than prose.
  - Judgment-based validation → host-supported model/agent hook or bounded review workflow, with Codex capability checked by version.
  - Detailed reference material → linked documentation loaded on demand.
  - Cross-session decisions/progress → bounded durable memory/session artifact.
  - Duplication across hosts → canonical base plus verified thin adapters/imports, after cache and load-path analysis.

- [ ] **Step 5: Tie every rule to claim IDs**

  Every branch ends with supporting `DOC`/`OBS` claim IDs, a validation step, and a fallback when evidence is `UNK`.

**Review gate:** Both reviewers can trace every decision rule back to evidence and can name at least one case where the correct answer differs between Claude and Codex.

---

### Task 9: Write the working-context technical briefing

**Owner:** Jay assembles; Ivy supplies Claude sections and performs first adversarial review.

**Files:**
- Create: `context-emendator/docs/research/working-context-technical-briefing.md`
- Modify: `context-emendator/README.md`

**Interfaces:**
- Consumes: source packs, experiment results, capability matrix, and decision rules.
- Produces: the authoritative human-readable “Oracle” used to design and validate `context-emendator`.

- [ ] **Step 1: State scope and epistemic contract**

  Define working context, the five separate axes, evidence labels, versioning, and the boundary between observable behavior and proprietary internals.

- [ ] **Step 2: Explain context assembly for each host**

  Trace sources from platform/system instructions through project files, skills/hooks/tools, conversation/tool results, memory, and compaction. Include source-attributed lifecycle diagrams and link every edge to claim IDs.

- [ ] **Step 3: Explain degradation and refresh**

  Cover position/distractor effects, conflicts, stale context, tool noise, long-running sessions, compaction loss, cache behavior, memory refresh, rule/skill re-triggering, and bounded reinforcement. Separate documented mechanisms from observed adherence.

- [ ] **Step 4: Explain placement and formatting**

  Present the cross-host matrix, remediation decision tree, format evidence, token/cache tradeoffs, enforcement boundary, and host-specific exceptions.

- [ ] **Step 5: Translate evidence into auditor requirements**

  Define what an audit must inventory, what it can prove statically, what requires a live trace, what requires behavioral evaluation, and when it must say `UNK`. Connect these requirements to Correction, Retirement, and Enhancement findings.

- [ ] **Step 6: Publish open questions and revalidation policy**

  List unresolved host/model internals and provide a probe or monitoring trigger for each. Add a review cadence based on host/model/documentation changes rather than a calendar-only promise.

- [ ] **Step 7: Link the briefing from the plugin README**

  Describe it as the technical evidence base for the plugin. Do not market it as a runtime “Oracle” feature.

**Review gate:** Ivy performs an adversarial read for Claude correctness; Jay then corrects all supported findings and labels unresolved disagreements instead of smoothing them over.

---

### Task 10: Validate completeness and declare the research gate passed

**Owner:** Jay and Ivy sign off independently.

**Files:**
- Modify: `context-emendator/docs/research/working-context-technical-briefing.md`
- Modify: `context-emendator/docs/research/sources/claim-ledger.md`
- Modify: `.claude/sessions/chore-agent-workflow-plugin.md`

**Interfaces:**
- Consumes: every research deliverable.
- Produces: a binary decision that the technical foundation is sufficient for v1 design, plus explicit residual unknowns.

- [ ] **Step 1: Run mechanical integrity checks**

  Run:

  ```bash
  rg -n "T[B]D|T[O]DO|FIX[M]E|citation need[e]d" context-emendator/docs/research
  rg -n "\b(DOC|OBS|INF|UNK)\b" context-emendator/docs/research/sources/claim-ledger.md
  rg -n "https://" context-emendator/docs/research/sources/source-register.md
  git diff --check
  ```

  Expected: no placeholders, evidence labels and URLs exist, and the diff check is clean.

- [ ] **Step 2: Check source and claim coverage**

  Confirm every material briefing claim has claim IDs; every `DOC` claim has a primary source; every `OBS` claim has a versioned result; every `INF` claim names premises; every `UNK` claim states why it is unknown and how the auditor behaves safely without it.

- [ ] **Step 3: Check host-surface coverage**

  Confirm the matrix covers default/platform instructions, `AGENTS.md`, `CLAUDE.md`, rules, references/imports, skills, hooks, memory, subagents, MCP/tools, tool results, conversation, compaction, plugins, diagnostics, and prompt caching for both hosts or explicitly records no equivalent/unknown.

- [ ] **Step 4: Exercise all three finding classes on a public real repository**

  Against this repository or another approved public repository, produce one candidate Correction, one Retirement, and one Enhancement. Each must include cited mechanism, per-host load-path proof, observed cost or gap, safe remedy, representative-task validation, and rollback. This is an audit-only exercise; do not apply the recommendations in this task.

- [ ] **Step 5: Apply the quality-preservation gate**

  For at least one proposed token/context optimization, run the before/after representative-task evaluation from Task 5. Require no regression in task success or guardrail adherence; report token, cache, latency, and intervention changes without collapsing them into one score.

- [ ] **Step 6: Complete independent sign-offs**

  Ivy signs the Claude claims and challenges Codex by analogy; Jay signs the Codex claims and challenges Claude by analogy. Both sign the shared decision rules and list any unresolved disagreements in the briefing.

- [ ] **Step 7: Update the session milestone**

  Record the briefing path, tested host/model versions, completed gates, residual `UNK` claims, and the next design decision. Do not call the research complete merely because all documents exist.

## Completion Criteria

The near-term research goal is complete only when all of the following are true:

- Direct official source packs exist for both hosts and the source register records retrieval/version/revalidation metadata.
- The claim ledger provides traceability and evidence status for every material conclusion.
- Controlled experiments distinguish context loading from behavioral adherence and cover the ten minimum experiment IDs.
- The capability matrix and remediation rules cover both hosts without assuming parity.
- Prompt-cache and quality-preservation risks are measured where possible and explicitly unknown where not observable.
- The briefing explains assembly, authority, durability, degradation, refresh, memory, placement, formatting, token cost, and enforcement.
- One evidence-complete candidate exists for each of Correction, Retirement, and Enhancement against an approved public repository.
- Jay and Ivy independently sign off, and remaining unknowns have safe auditor behavior and revalidation triggers.

After this gate passes, the next deliverable is the v1 plugin design—not implementation directly.
