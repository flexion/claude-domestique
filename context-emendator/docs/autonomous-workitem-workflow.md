---
slice: autonomous-workitem-workflow
job: >-
  Take exclusive ownership of one eligible work item and run it to an autonomous stop state that
  names exactly what a human is being asked to do — producing the orchestrator, the preliminary
  eligibility screen, and the registries every other slice reads.
ships:
  - kind: deterministic
    path: context-emendator/lib/eligibility.js
  - kind: deterministic
    path: context-emendator/lib/codes.js
  - kind: doc
    path: context-emendator/docs/autonomous-workitem-workflow.md
gating_test:
  status: planned
  command: npx jest context-emendator/lib/__tests__/eligibility.test.js context-emendator/lib/__tests__/codes.test.js
  evidence: >-
    Item metadata plus config resolves to `eligible` or `ineligible` with a reason code; a lost
    compare-and-set is a no-op rather than a retry; the three code-prefix sets partition the
    registry so a code cannot be quietly reclassified; every reason code is reachable from some
    stop state.
non_gating:
  - Offline calibration of every cap value from cross-run data.
  - Interpretation escalation rate and its breakdown, reported across runs.
depends_on:
  - tracker-and-forge-ports
terminal_failure_owned:
  - ineligible
  - escalated
source_lines: 1-36, 201-215, 431-446, 584-598, 996-1076, 1079-1118
---

# Autonomous work item to Ready for Merge — pilot workflow

**Slice boundary.** Take exclusive ownership of one eligible work item and run it to an autonomous
stop state that names exactly what a human is being asked to do — producing the orchestrator, the
preliminary eligibility screen, and the registries every other slice reads.

| | |
| --- | --- |
| Ships | `lib/eligibility.js` · `lib/codes.js` · this document, which is also the index for the other six |
| Gating test | *planned* — `npx jest context-emendator/lib/__tests__/eligibility.test.js context-emendator/lib/__tests__/codes.test.js`. Item metadata plus config resolves to a decision with a reason code; a lost compare-and-set is a no-op; the three prefix sets partition the registry; every reason code is reachable from some stop state |
| Non-gating | Offline calibration of every cap value · interpretation escalation rate and its breakdown |
| Depends on | [`tracker-and-forge-ports`](tracker-and-forge-ports.md) — `list_eligible`, `claim`, and the run branch |
| Terminal failure owned | `ineligible`, `escalated` |
| Source lines | 1-36, 201-215, 431-446, 584-598, 996-1076, 1079-1118 of the pre-split document |

GOAL: Take a work item to Ready for Merge -- complete, correct, and high quality -- without a human in the loop, and stop on a fixed condition rather than when the reviewers run out of things to say.
HOW: Reconstruct the item's goal, problem, and obligations into one boundary bundle -- recording for every part whether the item stated it, the repository supplied it, or the two disagree -- have that bundle independently reviewed, and freeze it before implementation; then implement on an isolated branch against that boundary and nothing else, with mechanical gates and one bounded repair loop per review kind. Escalate whenever the item's goal cannot be recovered, the boundary cannot be made decidable, a genuinely new obligation appears, or the coupling reaches past what this repo controls.

Acceptance criteria fit to serve as a completion metric are the output of the first two slices, not the
input to them. See [`reconstructing-the-item`](reconstructing-the-item.md) — it is the highest-risk
part of this design.

Merge is a human approval boundary. After a confirmed merge event a separate idempotent
merge-watcher records the merge SHA and may project the item to its closed state, but only when no
post-merge or production obligation remains. The run itself has already stopped by then.
Deploy and rollback are a named handoff, out of scope.

Actor: action form. One line per step. `WI-1234` is the worked example — the workflow is not bound to
a tracker, so the key is opaque.

Each slice opens with GOAL, HOW, JUSTIFICATION with its grounding in
`research/satisficing-references/text/` by file stem and line, and IMPACT as high, medium, or low
against the overall GOAL. `no source` is a real answer, not a gap in the citation work — the corpus
is silent on most of this.

## The slices

This document was one 1118-line file. It is now seven, cut so that each one lets a reader finish one
job — goal, artifact, check, and what happens on failure — without opening another. Each slice ships
running software, a prompt, or both, alongside its share of this specification; the document is one
artifact in the slice rather than a separate workstream.

| Slice | Job | Ships |
| --- | --- | --- |
| [`walking-skeleton`](walking-skeleton.md) | one thin end-to-end run that proves the integration | the first deliverable; cuts through the four below at their thinnest |
| [`tracker-and-forge-ports`](tracker-and-forge-ports.md) | write an adapter | port interface, one concrete adapter, the run record |
| [`reconstructing-the-item`](reconstructing-the-item.md) | recover what the item is for | `lib/lint-interpretation.js`, two blind-read prompts |
| [`the-boundary-bundle`](the-boundary-bundle.md) | author, review, and freeze the boundary | `lib/lint-boundary.js`, `lib/freeze.js`, two prompts |
| [`discharging-the-boundary`](discharging-the-boundary.md) | implement, prove, review, hand off | `lib/lint-evidence.js`, the gate, three prompts |
| [`the-reference-implementation`](the-reference-implementation.md) | trust the linter | the mutation sweep and its baseline |
| this document | operate a run | `lib/eligibility.js`, `lib/codes.js` |

**The walking skeleton ships first.** The six below it are independently runnable and independently
testable **components**, not vertical slices: no single one of them gets a work item to Ready for
Merge. The skeleton is the only increment that delivers the end-to-end goal, and it proves the
integration, which is where the risk actually lives.

## What this supersedes

A 24-phase version of this document was committed at `6939dc2` and is superseded by this one. An
adversarial cross-model review found it not actually issue-to-Done, internally contradictory on
freeze and on the test model, and disproportionate in ceremony. Nine outright errors were fixed
first, in that commit; this rewrite is the architectural answer. The prior version is in history if
the detail is wanted — nothing here needs it.

**Seven stages is a ceiling, not a target.** A stage is a *persisted workflow state with its own
entry and exit condition*. Headings, artifacts, agents, and operations inside a state do not count,
which is how the previous version reached 24. Promoting an eighth stage requires either the same
causally diagnosed failure class in two or more independent pilot runs, or one confirmed hard-harm
event — plus evidence that the failure cannot be handled by changing an existing stage. Record that
decision in the run evidence. Do not create a document to hold the process for it.

## Every claim names its check

The schema's analogue of the stage ceiling, and the constraint that actually worked:
**every paragraph asserting that a field does work must name the check that makes it do the work.**
The `gaps[]` claim in [`reconstructing-the-item`](reconstructing-the-item.md) is the first thing that
rule caught, and it was false for a full round.

**The rule was applied forward-only when it was written, and that was the wrong scope.** It was aimed
at the paragraph that had just been falsified, and `gaps[]` was pre-existing prose — so were two more
overclaims found afterwards by other readers: the Linter was said to warn on an entry that names an
implementation, and no such check exists at all, and the evidence pass was said to reject a test-case
id the runner does not collect, which needs a runner. A rule introduced to catch a defect class,
applied only to the text that exposed it, leaves the rest of the class in place.

Retroactive pass, then. Every field claim across these seven documents names its check, and the ones
that do not are recorded as limits rather than as behaviour. The two surviving limits and their
production inputs are recorded where their consumers live —
[`tracker-and-forge-ports`](tracker-and-forge-ports.md) for locator resolution and
[`discharging-the-boundary`](discharging-the-boundary.md) for test-case collectability.

The same rule governs this split. A slice header claiming a `gating_test.command` that does not exist
would be the identical defect in the artifact meant to prevent it, which is why every header declares
`gating_test.status` as `planned` or `implemented` and CI executes only the implemented ones.

## 1. Qualify and claim

GOAL: Take exclusive ownership of one eligible work item, or leave it alone.
HOW: Query for eligible work items, claim one under a compare-and-set, and run a preliminary screen for conditions already visible in the item text. The conclusive eligibility decision cannot happen here and is taken once coupling and obligations exist.
JUSTIFICATION: An item that is obviously out of scope should cost nothing to reject, but coupling and production obligations are not known yet, so rejecting on them here would repeat the ordering defect one stage earlier. -- (no source -- eligibility screening is local judgment)
IMPACT: medium -- (SWE-bench Verified -- 68.3% of samples were filtered as unusable by professional annotators, so screening rejects a large fraction cheaply, but it decides nothing about the ones that pass)

- Orchestrator (no model): calls `list_eligible` with the configured filter; the filter is adapter-specific and lives in config, not here
- Orchestrator (no model): refuses to start if the configured tracker does not declare the `claim` capability and no external claim store is configured
- Orchestrator (no model): calls `claim` — owner, expiry, `run_id`, fencing token — against the tracker or the external store; a lost compare-and-set is a no-op, not a retry
- Orchestrator (no model): opens `runs/WI-1234/<run-id>.jsonl` and appends `run_claimed` with the tracker id and item reference
- Orchestrator (no model): creates branch `agent/WI-1234/<run-id>` from the target base, so the frozen bundle has somewhere to live
- Orchestrator (no model): runs the **preliminary** screen only — issue type, labels, declared component ownership, and any pre-declared out-of-scope marker
- Orchestrator (no model): on preliminary reject — appends `run_ineligible` with a reason code, finalizes the lease, stops

## Codes and outcomes

**A code's prefix is its contract**, and the suite asserts the three sets partition the registry so a
code cannot be quietly reclassified.

| Prefix | Class | Consequence |
| --- | --- | --- |
| `E_` | retryable | the Author can fix it; earns another lint round |
| `W_` | warning | recorded, non-gating; no available remedy, so neither a round nor a stop |
| `X_` | terminal | the run stops with a reason code; no authoring round can change it |

Outcomes are `fail`, `pass`, `exempt`, `warn`, and `provisional`. `provisional` halts spending without
ending the run and exists for one case: an `absence`-triggered terminal on the Author's side, which
routes straight to the independent reconstruction because that is the only thing that can tell an
unanchored item from an unanchored reading of it. The cost argument for stopping early is preserved —
no mechanism sketch, no coupling analysis, no registry pass — while the conclusion waits for the
evidence that decides it.

The assertion-versus-absence trigger that decides which terminals are portable between artifacts is
defined in [`reconstructing-the-item`](reconstructing-the-item.md), because that is the only slice
where two artifacts are compared.

## Stop conditions

Two different things were conflated in an earlier draft. An **autonomous stop state** ends the run's
execution and finalizes the lease. A **lifecycle final state** is where the work item ends up, which
may be later, is not the run's business, and is a projection the tracker may be unable to represent
faithfully.

Expect `handoff_pending` to be the common outcome rather than the exception. Any obligation that can
only be verified after merge or in production caps the run there, and a realistic issue usually has at
least one — the first worked example transcribed into this schema has exactly one, and a test asserts
it. A design that treats `ready_for_merge` as the normal case will mis-set expectations.

Autonomous stop states — every one finalizes the lease:

| Stop state | Reached when | Slice that reaches it |
| --- | --- | --- |
| `ready_for_merge` | Mechanical gate green, every in-scope must passed, no `unable_to_verify`, nothing post-merge or production open | [`discharging-the-boundary`](discharging-the-boundary.md) |
| `handoff_pending` | As above, but a `post_merge` or `production` must remains | [`discharging-the-boundary`](discharging-the-boundary.md) |
| `boundary_invalid` | Genuinely new or unmatched obligation, `unable_to_verify` on a must, or a confirmed safety exception | [`discharging-the-boundary`](discharging-the-boundary.md) |
| `escalated` | Any cap reached, with its reason code | this document |
| `ineligible` | Preliminary or conclusive eligibility screen rejected the item | this document and [`the-boundary-bundle`](the-boundary-bundle.md) |
| `interpretation_blocked` | An assertion-triggered terminal finding, a corroborated unanchored item, or a material divergence between the two reconstructions. The run's product is the drafted interpretation, attached to the item | [`reconstructing-the-item`](reconstructing-the-item.md) |

`interpretation_blocked` exists because the other five rows do not fit and an earlier draft left the
terminal stops mapping to none of them. It is not `escalated` — no cap was reached, and terminal findings
deliberately consume no round. It is not `ineligible` — the item was eligible and the screen passed. It
is not `boundary_invalid` — no new obligation appeared and nothing failed to verify. Giving it a row is
the argument the earlier draft already made without following through: these are not failures of the run
in the way the others are.

Lifecycle final states, reached by the merge-watcher and not by the run:

| Final state | Reached when |
| --- | --- |
| item closed | Merge recorded **and** no `post_merge` or `production` must open |
| item open with handoffs | Merge recorded, obligations outstanding, owners named in a comment |
| item unchanged | No merge; a human decides what happens to the PR |

Caps live in config, not in prose: `MAX_LINT_ROUNDS`, `MAX_BOUNDARY_ROUNDS`, `MAX_GATE_RETURNS`, and
one semantic repair round. Every cap is a handoff, not a signal to buy another round.

Reason codes: `floor_gap`, `ineligible_no_handoff`, `ineligible_crosses_boundary`,
`criteria_not_lintable`, `boundary_ungameable_unproven`, `coupling_found_after_freeze`,
`gate_not_passable`, `semantic_review_not_converging`, `ineligible_infeasible_handoff`,
`coupling_unmatched_after_freeze`, `no_sensitivity_probe`, `requires_product_tradeoff`,
`requires_stakeholder_preference`, `underdetermined_by_issue`, `requires_unavailable_observability`,
`item_unanchored`, `item_correction_changes_scope`, `intent_ambiguous`,
`reviewer_reconstruction_unusable`, `author_reconstruction_inadequate`.

The interpretation reason codes — those four plus `underdetermined_by_issue`, which until now had nothing
that produced it — are **not** failures of the run in the way the others are. Each ends with a drafted
goal, problem, and obligation set attached to the item, which is more than the item had when the run
started. Expect them to be the most common outcome, because the premise of this design is that items
arrive unrefined.

`reviewer_reconstruction_unusable` and `author_reconstruction_inadequate` are the exceptions among them:
both are retries under `MAX_BOUNDARY_ROUNDS` rather than stops, and they exist so that a failure by
either reconstructor is never reported as a property of the item.

## Out of scope, named rather than omitted

Deploy, rollback, merge-queue interaction, post-merge verification, and on-call escalation. Each
needs an owner and a trigger recorded in the relevant handoff object. Bot-merge through `Done` is a
materially larger system and is deliberately not smuggled in here.

## Offline — not in the run loop

- Human (human): hand-grades a sample of completed runs
- Human (human): specifically grades the **reconstruction** against what the requester actually wanted, on items where that person is reachable — the only measurement that can tell a correct interpretation from a confident one, and the only check on the terminal escalations being right
- Calibrator (no model): measures reviewer precision and recall against those labels
- Calibrator (no model): reports the interpretation escalation rate and its breakdown, because a design that escalates every item and a design that escalates none are both failures and neither is visible from inside one run
- Calibrator (no model): runs one strong-prompt single-pass implementation against the same boundary as a same-budget baseline
- Human (human): reviews the deferral projection on its own cadence
- Human (human): adds each production-discovered implicit contract to the registry
- Orchestrator (no model): sets every cap from cross-run data, offline, never from inside a running loop

> Huang `:731` prescribes evaluating any multi-call scheme "against baselines with comparable inference
> costs", and `:691` found a reported gain that came from a requirement belonging in the initial prompt.
> Without the baseline this pilot cannot tell its own contribution from inference budget. A sample of
> five would give one or two graded reviews per mandate — enough for a direction, not a number.

---

## Appendix A — evidence provenance

Status of each slice against `research/satisficing-references/text/`:

| Status | Where |
| --- | --- |
| **Supported** | boundary bundle: floor selected not authored · reconstruction: the interpretation block itself, as the recording of a failure the corpus measures three ways · boundary bundle: independent review and ex-ante freeze · reconstruction: withholding the boundary from the reviewer · discharge: leaf-level executable verification · discharge: discrimination as the condition on the executor carve-out |
| **Hypothesis — targets a measured failure, remedy untested** | reconstruction: declared provenance and typed support as the mitigation for assumption injection · boundary bundle: adversarial boundary review · reconstruction: the blind-reconstruction divergence test and its calibration · discharge: citation rule, evidence pointers, cross-family routing · discharge: the safety exception |
| **Local judgment — corpus silent** | this document: eligibility screening · boundary bundle: mechanism sketch and coupling analysis · reconstruction: the `stated_unverified` rule, which came from a transcription rather than a source · discharge: handoff record · every cap value · the stage ceiling |
| **Not available** | Any coverage estimate. Capture-recapture needs a closed population and reviewers blind to each other; this loop changes the artifact between rounds. A pass bounds scope and makes no claim about what was missed. |

Two overclaims corrected from the superseded version: cross-model review was tagged Supported on
Panickssery, which establishes self-preference bias rather than validating this configuration; and
offline calibration was tagged Supported on JudgeEval, which is an existence proof of a scoring
pattern rather than evidence that a small sample estimates per-mandate precision usefully.

## Appendix B — model and effort config

Config, not architecture. Verified 2026-08-28: Claude figures from the bundled `claude-api` skill;
Codex model selection and API effort levels from the official OpenAI model guidance.

| Actor | Claude | Codex |
| --- | --- | --- |
| Author | Opus 5 max | gpt-5.6-sol max |
| Boundary-reviewer | Opus 5 max | gpt-5.6-sol max |
| Implementer | Sonnet 5 xhigh | gpt-5.6-terra xhigh |
| Reviewer | Opus 5 xhigh | gpt-5.6-sol xhigh |
| Adjudicator | Opus 5 max | gpt-5.6-sol max |
| Orchestrator · Gate · Linter · Triage · Calibrator | no model | no model |

Notes that are easy to get wrong. Haiku 4.5 rejects the `effort` parameter, so a cheap Claude lane is
Sonnet 5 at `low`. The bare `gpt-5.6` alias routes to Sol, not Terra. `ultra` is a Codex CLI effort
value that is unavailable through the Responses API; that is the whole defensible statement.
Substituting `max` plus orchestrator-side fan-out is a separate hypothesis about how to recover the
capability, not a translation, and it is untested. GPT-5.6's API default is `medium`; a client may
override it, so every run record must retain the effective model and effort rather than infer either
from a client default.

Cross-family pairing at the reconstruction and semantic-review steps is the point, not a preference:
the reviewer must not share a family with the actor whose work it is checking.
