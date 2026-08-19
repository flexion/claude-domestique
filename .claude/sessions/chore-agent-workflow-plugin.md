# Session: agent workflow plugin

**Issue**: N/A
**Branch**: chore/agent-workflow-plugin
**Type**: chore
**Created**: 2026-08-17
**Status**: in-progress

## Goal

Design and develop a plugin that helps organize development agents and workflows.

## Approach

Complete the blocking working-context research foundation with direct host sources, controlled Claude/Codex probes, a cross-host placement matrix, and an independently reviewed technical briefing before defining v1. Keep broader autonomy research, large-sample evaluations, automation, and regression infrastructure deferred until after a thin v1.

## Session Log

- 2026-08-17: Session created; launched Codex and Bedrock-Qwen3 design agents in the isolated worktree.
- 2026-08-17: Reframed the proposed plugin as a host-neutral, evidence-grounded auditor for agent workflow configuration; scope and finding taxonomy defined as hypotheses to be tested.
- 2026-08-17: Added source-backed Codex research notes in `research/sources/`; findings distinguish documented host behavior from illustrative repo-local reasoning.
- 2026-08-17: Established that any configuration audit must reason about intended load paths per host rather than assuming a runtime trace is available.
- 2026-08-17: Expanded and corrected the Codex source note with primary-sourced compaction limits, lifecycle-hook protocol and reinjection boundaries, subagent inheritance, and plugin-hook trust mechanics. The note now explicitly treats compaction as lossy unless retention is verified.
- 2026-08-17: Added primary-sourced Codex runtime-inspection and instruction-hierarchy research. Codex can evidence effective instruction loading, session capacity, and recorded traffic, but has no documented per-item live-context provenance map; authority and post-compaction durability must be assessed as separate axes.
- 2026-08-17: Verified that all six primary-source/synthesis notes are present and non-empty. Research is sufficient to scope v1; the documented Codex live-provenance limitation is a design constraint, not remaining discovery work.
- 2026-08-17: Cataloged Codex-native diagnostics, compaction/rehydration primitives, system skill tooling, and third-party skill/context linters; merged the concise status-labelled results into `research/overlapping-tooling-reference.md` section 4. V1 must complement, not reimplement, installers, generic linters, or mantra's shipped refresh engine.
- 2026-08-17: Established that a downstream adopter may retire bespoke tooling in favour of the plugin. The v1 finding taxonomy must include “retire a bespoke mechanism in favor of a proven native/plugin capability,” gated by capability equivalence, host/load-path compatibility, and before/after migration validation.
- 2026-08-17: Assessed plugin ownership: build the workflow-config auditor as a standalone plugin that coordinates with mantra and can reuse/extract generic shared hook helpers later. Do not merge it into mantra: audit-first, opt-in, target-neutral diagnosis is a different product boundary from mantra's curated behavioural injection.
- 2026-08-17: Named the plugin `context-emendator` (tagline: "Correct the context, clear the noise, free the work."), converged with jay after reconsidering that "context" spans the whole effective instruction surface (static files, skills, hooks, loading, and runtime retention), not just the live window — describe it explicitly as an auditor in the manifest to avoid a runtime-only reading.
- 2026-08-17: Formalized a three-class finding taxonomy (Correction, Retirement, Enhancement) after the user caught that pillar 4 of the corrected assignment (recommend improvements/augmentations, not just cleanup) wasn't yet represented. Enhancement is gated, not default-on: requires an evidenced gap or confirmed goal, ruling out an existing/native capability first, proven host/version support, the smallest opt-in addition with a net benefit, and a rollback/validation plan — otherwise log a lower-confidence opportunity or stay silent. Cross-host caveat: judgment `prompt`/`agent` hooks work on Claude today but Codex only runs `command` handlers, so Codex-side judgment checks need deterministic hooks/CI or a bounded subagent instead.
- 2026-08-17: Recommended the provisional name `context-emendator`: an evidence-first auditor whose correction remains human-approved; proposed tagline: “Correct the context, clear the noise, free the work.”
- 2026-08-17: Added Enhancement as the third proposed finding category, alongside Correction and Retirement. It is a gated recommendation for a proven workflow gap, not a generic best-practices checklist; unsupported opportunities remain silent or advisory.
- 2026-08-17: Read-only review of the `context-emendator` scaffold found its mantra boundary correct: standalone, no dependency, and only a future generic shared-hook contract. JSON manifests parse and moved research links resolve; amend the README Enhancement example so it does not call a deterministic hook a solution for a judgment-requiring rule.
- 2026-08-17: Scaffolded `context-emendator/` (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `package.json` v0.1.0, README) and moved its grounding research from `research/` into `context-emendator/docs/research/`, fixing internal cross-references to the new sibling-relative paths. Deliberately not yet registered in the marketplace or root workspaces — no skill content exists yet, and an empty `skills/` reference would fail plugin validation.
- 2026-08-18: The user made a complete technical model of working context the blocking near-term goal before v1 design. Jay and Ivy co-designed `context-emendator/docs/research/context-oracle-research-plan.md`: direct authoritative host sources, versioned claim/source ledgers, ten bounded clean-room probes, a capability/placement matrix, quality-preservation evaluation, and a final working-context briefing with independent sign-off. The plan explicitly defers broad non-context autonomy research, multi-model/large-sample evaluation, automation, and regression infrastructure.
- 2026-08-18: Made prior-art discovery Task 0 and blocking before the context briefing or implementation. Direct inspection found substantially more overlap than expected: Anthropic's native/official diagnostics and plugins, Melodic Software's MIT Claude audit/measurement suite, Agent Context Lens for the declared Codex `AGENTS.md` chain, agnix/ctxlint static linters, and evidence-discipline skills such as Strata `era-audit`. Bounded agnix/ctxlint trials on this public repo confirmed that their findings are useful candidates but too noisy and load-path-naive to authorize remediation without independent verification.
- 2026-08-18: Jay and Ivy cross-reviewed and passed Task 0 after correcting overclaims on both sides. The frozen boundary labels unexecuted third-party capabilities `UNK`/optional, lists ten explicit v1 non-goals, forbids static Claude token/cost estimates, timeboxes Melodic trials without gating the core, and makes the evidence-normalized claim ledger the provisional v1 audit output contract.
- 2026-08-18: Recorded the trial-first recommendation at `docs/plans/2026-08-18-context-emendator-design.md`, following the repo's existing design-record convention. Placed outside `context-emendator/` so it survives a kill outcome, with a precondition that the cited research be retained or relocated first. Cross-reviewed and signed off. Two corrections carry forward into the plugin's own design: requiring a net context-cost saving would have invalidated the Enhancement class, since a verification loop or rehydration hook may legitimately spend tokens to buy quality, so the gate measures and justifies the tradeoff instead; and a regression introduced while applying an earlier correction established that a remediation is itself a change, inheriting the same regression and verification risk as the defect it replaces.

## Key Decisions

- Use a separate worktree and two-model design review before implementation.
- Build the auditor as a standalone plugin coordinating with mantra, not merged into it (audit-first diagnosis is a different product boundary from curated behavioural injection).
- Name it `context-emendator`; "context" spans the whole effective instruction surface, not just the live window.
- Three-class finding taxonomy — Correction, Retirement, Enhancement — with Enhancement gated, not default-on.
- **Recommend deferring the v1 build decision behind a zero-build trial with an explicit kill criterion** (a recommendation awaiting user authorization, not an executed decision). Task 0 found that published descriptions of existing tools overlap most of the Claude-side scope (Anthropic first-party plus the MIT melodic suite). For three capabilities no complete incumbent was found: cross-host reconciliation, coupling a removal to per-host load proof, and evidence normalization. Those descriptions have not been executed, and the two comparable tools that were run both exposed material limitations — so neither building nor cancelling is yet justified. Full reasoning: `docs/plans/2026-08-18-context-emendator-design.md`.

## Learnings

- Codex natively discovers `AGENTS.md` and `.agents/skills`; any skills path other than the documented native one has an unproven discovery route and needs runtime proof before a keep, move, or remove recommendation.
- Cross-host remediation must prove each host's actual load path before trimming duplicated guidance.
- Durable workflow state should live in a concise artifact; after Codex compaction, only selectively re-inject it through a trusted `SessionStart` hook if the audit proves that mechanism is warranted.
- The runtime-audit design must label an observation as proven, inferred, or unavailable. It may propose opt-in future hook tracing, but cannot retroactively reconstruct host-owned transient context.
- A replacement recommendation is stronger than text deduplication only when the replacement demonstrably preserves the bespoke mechanism's required behavior; otherwise report partial overlap and retain the specialized component.
- The auditor should begin without automatic injection. If later runtime tracing needs hooks, depend on an extracted generic shared hook contract—not mantra's behaviour-specific hook/package lifecycle.
- Provisional naming direction: `context-emendator`. Persisted research establishes context as the whole effective instruction surface—static guidance, skills, rules, hooks, loading, and runtime retention—so the prefix makes the target legible without narrowing it. Its description must call it an auditor to avoid a runtime-only reading.
- An Enhancement must prove need, no adequate existing capability, host/version support, a smallest opt-in solution with positive net token/maintenance/autonomy value, and an observable rollback-capable validation plan. Claude may use judgment-based hooks; Codex cannot currently execute `prompt`/`agent` hook handlers.
- `context-emendator` should be a thin cross-host evidence coordinator, not a new monolithic scanner. Delegate native diagnostics, accept optional versioned tool outputs, borrow frozen-corpus/hash/quote validation, and own only actual-load proof, cross-host semantic reconciliation/placement, and before/after adherence validation. No later feature may duplicate prior art without a recorded host, evidence, license/security, or integration reason.
- Third-party prior art is candidate evidence until its recorded version is trialed; unavailable tools yield `UNK` plus a native/manual route. The Melodic trial cannot block the three-part core: cross-host context/instruction reconciliation, per-host load-path proof, and evidence normalization.
- **Behavioural failure does not identify absence.** Observing that an instruction was not followed does not establish that it was missing from context; it may have been present and not retrieved, or present and outranked. Those have opposite remedies — re-injection helps only the first, and would be inert or wasteful for the others. **Remedy selection must therefore wait for source and availability evidence** (a trace at the failing turn: `/context`, `InstructionsLoaded`, or an assembled-request capture), not be inferred from the behavioural symptom. This is a first-order rule for the auditor itself: every "this rule is not being followed" finding requires availability evidence before any fix is recommended.
- Re-injection can be **by reference or by value**, and the distinction is load-bearing. A hook that injects a file path plus a read-first instruction conveys a pointer; the pointer only becomes context if the agent complies, and that instruction is itself subject to the same decay as the content it points at. Injected content is present regardless. An audit must record which of the two a mechanism actually provides rather than treating "a hook exists" as evidence the content is available.
- Across one document this author repeatedly stated the strongest available version of a claim rather than the supported one — on naming, evidence strength, and causal mechanism — each time leaning toward justifying the plugin. Recorded as a standing caution: for a tool whose output is recommendations about other repositories, a systematic lean toward "the tool is needed" corrupts the product, so claims that favour the plugin warrant stricter external review than claims against it.

## Files Changed

- .claude/branches/chore-agent-workflow-plugin
- .claude/sessions/chore-agent-workflow-plugin.md
- context-emendator/.claude-plugin/plugin.json
- context-emendator/.codex-plugin/plugin.json
- context-emendator/package.json
- context-emendator/README.md
- context-emendator/docs/research/overlapping-tooling-reference.md
- context-emendator/docs/research/context-oracle-research-plan.md
- context-emendator/docs/research/sources/claude-context-and-skills.md
- context-emendator/docs/research/sources/claude-context-window-and-hooks.md
- context-emendator/docs/research/sources/claude-live-debugging-and-hierarchy.md
- context-emendator/docs/research/sources/codex-context-and-skills.md
- context-emendator/docs/research/sources/codex-live-context-and-hierarchy.md
- context-emendator/docs/research/sources/cross-host-context-degradation-synthesis.md
- context-emendator/docs/research/sources/overlapping-tooling-codex.md
- context-emendator/docs/research/sources/prior-art-claude.md

## Next Steps

- [x] Cross-check Claude and Codex primary-source findings against each other and against public host documentation.
- [x] Scaffold the `context-emendator` plugin directory (manifests, README, package.json) and move its grounding research from `research/` into `context-emendator/docs/research/`.
- [x] Develop the bounded working-context technical-briefing research plan with Ivy.
- [x] Complete Jay/Ivy cross-review of the blocking prior-art capability map and freeze the v1 non-duplication boundary.
- [ ] Execute Task 1: establish the source register, claim ledger, and explicit evidence gaps.
- [ ] Complete the direct Claude/Codex/model source packs and bounded clean-room probes.
- [ ] Produce the cross-host capability matrix, remediation decision rules, and working-context technical briefing.
- [ ] Obtain independent Jay/Ivy research sign-off, then define the plugin's intended users, workflows, and smallest useful first release.
- [ ] Register `context-emendator` in `.claude-plugin/marketplace.json` and the root `package.json` workspaces once it has real skill content (deliberately deferred — an empty `skills/` reference would fail plugin validation).
