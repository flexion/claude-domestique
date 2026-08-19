# Design: context-emendator Plugin

**Date:** 2026-08-18
**Status:** Recommendation — trial proposed, build decision awaiting user authorization
**Branch:** chore/agent-workflow-plugin

## Summary

`context-emendator` was proposed as a workflow-configuration auditor: analyze a repository's Claude/Codex agent context (`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, skills, hooks), find inconsistency, duplication, and token waste, and recommend grounded, human-approved fixes. A scaffold exists (manifests, README, no skill content) and is committed but deliberately unregistered in the marketplace.

Prior-art research (Task 0 of the research plan) then found that published descriptions of existing tools **overlap** most of the *Claude-side* scope. This document records the resulting recommendation — **run a zero-build trial before deciding whether to build** — together with the reasoning, so that the reasoning survives regardless of which way the decision goes.

## Provisional taxonomy — occurrence unverified, coverage unverified

**Provisional — the taxonomy is a hypothesis, not a measured result.** The defect classes below define what the plugin would look for. Their real-world occurrence and prevalence are `UNK` and are exactly what the public trial is designed to establish. Nothing here should be read as a survey result.

- instruction content loaded into every session that is observably irrelevant to many of them, paid for unconditionally (always-loading is correct where the content is genuinely always relevant; the defect is unnecessary loading, not unscoped loading);
- the same convention restated in several independently-maintained files, which drift apart;
- content duplicated between a general guidance file and the canonical rule file that already owns it;
- enforcement asserted in prose, with no hook or CI mechanism actually implementing it;
- instruction files describing a state the build no longer matches.

These are the finding taxonomy, stated as categories the trial will test for.

**Also `UNK`:** whether existing tools already address these classes adequately. The trial tests both questions together — does the defect class occur, and if it does, do the incumbents already catch it.

## What Task 0 found

Coverage divides into three tiers, which must not be conflated because they carry different availability guarantees.

**Native to Claude Code** (present without installing anything): `/doctor`, `/context`, `InstructionsLoaded`, `claude plugin validate`, `claude plugin eval --ablation`, and OpenTelemetry token/cache counters.

**Anthropic-authored plugins** (must be installed; authorship verified from the marketplace manifest): `claude-md-management` (CLAUDE.md quality/currency auditing, including duplication *within* the CLAUDE.md family), `claude-code-setup` (recommends new automations from codebase signals), `hookify` (deterministic Claude regex-rule hook generation), and `session-report` (transcript token aggregation).

**Third-party.** The MIT `melodic-software/claude-code-plugins` suite *describes* `.claude/rules/` auditing, cross-surface instruction conflict detection, dedup-to-single-source, load-tier placement grading, per-item startup token measurement, and a reversible strip-and-re-add instruction experiment.

Those descriptions overlap most of the original scope. For three capabilities, **no complete incumbent was found** — which is weaker than claiming none exists:

1. **Cross-host reconciliation.** Single-host coverage exists on both sides — the melodic suite is Claude-only, Agent Context Lens is Codex-only, and the static linters are multi-host — but no tool found joins Codex evidence to Claude evidence and reasons about parity between them.
2. **Removal coupled to per-host load proof.** Load evidence exists per host. The gap is that no tool found requires a removal recommendation to be justified by proof that the file actually loads on *each* host the repository supports.
3. **Evidence normalization.** Each incumbent emits its own format, scope, and confidence posture; nothing found reconciles them into one model carrying host, version, method, and limitations.

## Why the overlap finding is not decisive

The melodic capabilities are **published descriptions. Nothing in that suite has been executed.** Under the standard applied to every other third-party tool in this research, a description is not runtime evidence.

Two comparable tools *were* executed, and both exposed material limitations:

- `agnix` 0.49.0 — exit 1, with basic misclassifications: plugin-qualified skill names read as missing files, inline identifiers read as filesystem paths, deliberate safeguards downgraded as negative phrasing.
- `ctxlint` 0.23.0 — estimates Claude tokens with `cl100k_base`, a GPT tokenizer, so its Claude figures are wrong by an unknown factor; and detects duplication by whole-file similarity, which structurally misses a duplicated *section* inside two otherwise-different files — one of the defect classes above.

Two tools do not establish a pattern. What they establish is that **a description is not runtime evidence**, and that for these two the gap was material enough to matter for our use.

## Recommendation: trial first, with a kill criterion

**Do not build the full plugin. Do not cancel.** Run a zero-build trial:

1. **Manually produce the proposed normalized claim ledger** from native Claude and Codex evidence — no implementation. Do this **first and blind**, before running the unexecuted incumbents.
2. Execute the closest melodic components, Agent Context Lens, and the static linters at pinned versions.
3. Compare, and record what each side found that the other did not.

**Ordering is load-bearing.** The gate asks whether the ledger surfaces something the incumbents miss. Running an incumbent first would contaminate that comparison — the ledger author would be anchored on its output and could not honestly claim an independent finding. Blind-first is what makes the comparison mean anything, and it is achievable only for the incumbents not yet run here; see the contamination note below.


### Fixture

**`claude-domestique` itself.** It is a genuine dual-host repository: `CLAUDE.md` and `AGENTS.md` at root, seven plugins each carrying `.claude-plugin/` and `.codex-plugin/` manifests, plus `rules/`, `context/`, `skills/`, and `hooks/` surfaces. It is real rather than synthetic, so it avoids the artificiality of planted defects, and baseline linter runs against it already exist.

It is also **out-of-sample relative to taxonomy derivation** — the taxonomy above was not developed from this repository. That is what makes a finding here meaningful rather than a restatement of the detector's own design. Note the weaker claim: out-of-sample is not the same as independent, since the same authors wrote both the taxonomy and much of this repository's instruction surface.

**Partial contamination, recorded rather than ignored.** `agnix` and `ctxlint` have already been run against this repository, and their output has been seen. The blind-ledger discipline therefore holds only for the **unexecuted** incumbents. Any comparison against those two linters is contaminated and is **non-gating** — it may inform, but it cannot be cited as evidence that the ledger found something they missed. Restoring a clean comparison for them would require a fresh fixture or a reviewer who has not seen their output.

Protocol requirements:

- **Pin an immutable commit** and run against a **disposable clone**, so the fixture cannot drift mid-trial and the trial cannot mutate the working repository.
- **Preregister the gate** before running anything: what counts as a material finding, and what the paired before/after measurement will be, written down first so the threshold cannot be adjusted to fit the result.
- **Isolate third-party execution.** Incumbent plugins are installed and run under a throwaway `CLAUDE_CONFIG_DIR`, never the operator's live configuration, so an audit never silently adds hooks or plugins to a working environment.

**Technical go gate:** build a thin v0.1 only if the trial surfaces at least one *material* finding in cross-host reconciliation, per-host load proof, or remediation that the incumbents miss, **and** the resulting change passes validation — defined as *measuring both context cost and adherence **before and after** the change, on the same representative task and the same configuration, and justifying the resulting tradeoff*. Without that paired baseline the tradeoff is asserted rather than evidenced. Net cost savings are **not** required: an Enhancement such as a verification loop or a compaction-rehydration hook may legitimately spend tokens to buy quality or longer autonomous runs. What the gate forbids is an unmeasured or unjustified tradeoff, not a positive-cost one.

A single passing fixture is a **technical gate only**. It shows the mechanism can find something real on one repository. It is **not** market evidence, and does not establish that the problem or the audience generalizes.

**Kill:** otherwise, recommend the existing tools, or retain this as a one-off audit method. Both are acceptable outcomes and neither is a failure.

**Kill precondition:** the research under `context-emendator/docs/research/` must be relocated or otherwise retained *before* any kill removes that directory. This document cites it throughout, and deleting it would strand every citation here.

The manual-ledger step is the point: it tests the differentiated core at zero build cost. If a hand-produced ledger finds nothing the incumbents miss, the build case fails its current evidence threshold and does not earn implementation — on this fixture. That is a failure to clear the bar we set, not a demonstration that the value claim is false in general.

## Alternative artifact shape under test

The trial must also test whether the right artifact is **a host-neutral audit skill plus the claim-ledger schema**, rather than a runtime plugin. Two independent observations point that way: the claim ledger keeps behaving like the product rather than the bookkeeping, and a one-off audit method carries less ongoing maintenance exposure than a shipped runtime tool. Upstreaming adapters to existing tools should be considered only after the trial.

## Risks

1. **The incumbent descriptions weaken the build case, and they are unverified — first-order risk.** If the melodic suite does what it describes, most of the Claude-side rationale for building disappears, and the remaining core is narrow. That case has not been tested, so the build case currently rests on an unresolved question rather than on evidence. Compounding it, the defect classes are a hypothesis whose occurrence and prevalence are themselves untested. Resolving these two unknowns takes precedence over every risk below.
2. **Maintenance coupling to two fast-moving surfaces.** Both host surfaces are version-gated and change frequently; this research had to pin behavior to specific releases of each. A shipped cross-host tool carries that exposure continuously. An audit method **reduces** it — the same version sensitivity applies whenever the method is run — but does not escape it.
3. **Narrow differentiated audience.** Repositories deliberately supporting both Claude and Codex are the **primary** beneficiaries of the surviving core. Single-host repositories may still gain from the normalization and load-proof discipline, but they have **candidate** incumbents — whose actual behavior remains `UNK` until trialed, so "already served" is an assumption rather than a finding.
4. **Weaker Codex provenance.** Codex exposes no documented per-item context provenance; the closest third-party chain reconstructor is version- and platform-bound and does not parse effective TOML.
5. **Non-goals already constrain scope.** Ten capabilities are explicitly excluded, including any static Claude token estimate and any claim that instruction fidelity can be read from token occupancy.

## Provenance and standing

Method: every substantive claim was cross-checked by a second reviewer against primary sources — official documentation, shipped source on disk, or the installed binary's own output — and corrections were verified against those sources rather than accepted on assertion. Model-generated citations that could not be confirmed in the cited artifact were excluded rather than softened. Task 0 was frozen as PASS by both reviewers.

**This document is a recommendation, not an executed decision.** No authorization to build, cancel, or run the trial has been given. What exists today is retained research plus this recommendation awaiting the user's decision.

Evidence, versions, licenses, and trial results: `context-emendator/docs/research/` — `context-oracle-research-plan.md`, `overlapping-tooling-reference.md` (capability dispositions and the v1 non-goals), `sources/prior-art-claude.md`, `sources/overlapping-tooling-codex.md`. Third-party capabilities remain `UNK` until a bounded versioned trial executes them.

`sources/prior-art-claude.md` also records three partial-read errors by this document's author as an `OBS` case study, with its evidence limits stated: it shows prose-only process rules can fail even for the author who wrote them, and does not show that any particular check would have caught them.

**Location rationale:** this record lives in `docs/plans/` rather than inside `context-emendator/` so that it remains available if that directory is later removed. See the kill precondition above regarding its citations.
