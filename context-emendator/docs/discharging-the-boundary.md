---
slice: discharging-the-boundary
job: >-
  Turn a frozen boundary bundle into a scoped candidate change, mechanically prove its mechanical
  obligations, independently review its semantic obligations, and produce an explicit handoff.
ships:
  - kind: deterministic
    path: context-emendator/lib/lint-evidence.js
  - kind: deterministic
    path: context-emendator/lib/gate.js
  - kind: prompt
    path: context-emendator/prompts/implementer.md
  - kind: prompt
    path: context-emendator/prompts/reviewer-semantic.md
  - kind: prompt
    path: context-emendator/prompts/triage.md
  - kind: doc
    path: context-emendator/docs/discharging-the-boundary.md
gating_test:
  status: planned
  command: npx jest context-emendator/lib/__tests__/discharge.test.js
  evidence: >-
    A disposable base/head fixture proves change and preservation baselines, collected-case identity,
    sensitivity probes, out-of-scope rejection, cited-review triage, and the bounded repair outcomes.
non_gating:
  - Model-review precision and recall calibrated against offline human labels.
  - Human review of the deferral projection on its own cadence.
depends_on:
  - the-boundary-bundle
  - tracker-and-forge-ports
terminal_failure_owned:
  - coupling_found_after_freeze
  - gate_not_passable
  - semantic_review_not_converging
  - no_sensitivity_probe
source_lines: 512-542, 684-767
---

# Discharging the boundary

**Slice boundary.** Turn a frozen boundary bundle into a scoped candidate change, mechanically prove
its mechanical obligations, independently review its semantic obligations, and produce an explicit
handoff.

| | |
| --- | --- |
| Ships | `lib/lint-evidence.js` · `lib/gate.js` · Implementer, Reviewer, and Triage prompts · this document |
| Gating test | *planned* — `npx jest context-emendator/lib/__tests__/discharge.test.js`. A disposable base/head fixture proves baselines, collected cases, probes, scope, triage, and bounded outcomes |
| Non-gating | Offline model-review calibration · human review of deferrals |
| Depends on | [`the-boundary-bundle`](the-boundary-bundle.md) · [`tracker-and-forge-ports`](tracker-and-forge-ports.md) |
| Terminal failure owned | `coupling_found_after_freeze` · `gate_not_passable` · `semantic_review_not_converging` · `no_sensitivity_probe` |
| Source lines | 512-542, 684-767 of the pre-split `autonomous-workitem-workflow.md` |

## Extraction note

The cited operational rules are preserved, with stages 4 through 7 grouped by the delivery reader's
job. The opening boundary statement and subsection labels are new; the spine remains the authority for
the shared stop-state registry.

GOAL: Discharge every frozen, in-scope obligation without allowing a candidate change or a reviewer to
silently expand the target.
HOW: Write tests and an evidence map first, implement only the frozen change surface, run a
discriminating mechanical gate, then send the diff to an independent semantic reviewer and finish with
an explicit handoff.
JUSTIFICATION: A green test without a discriminating oracle proves nothing. -- (Huang `:721` — the
executor is a perfect verifier only given an oracle that discriminates)
IMPACT: high — this is the only point where executable evidence can settle a mechanical obligation.

## Evidence map and discrimination

The evidence map is authored after tests exist and is not part of the frozen manifest. It maps entry ids
to collected test-case ids and carries the frozen bundle digest it was written against. An evidence edge
names a runner case, not a test file: one scalar runner outcome cannot discharge one change entry that
must fail on base and one preservation entry that must pass on base.

A Gate rejects a case id the runner did not collect. Until runner integration exists, the reference
linter can only require a non-empty `case_id`; its fixture list catches slips rather than lies. This
slice owns that production input because the runner, not the manifest, supplies the collected-case list.
Several edges may share a case only when their declared baseline is identical. One entry may still need
several test cases; one test discharges several entries only under that same-baseline constraint.

Preservation requires a sensitivity probe. `pass` on base and head permits `assert True`; each edge
therefore names a `negative_control` fixture or a controlled `mutation` that the case must fail against.
If no probe exists, the obligation is not mechanical: reclassify it as `independent_review` instead of
letting the gate claim a proof it did not perform. Until that reclassification, the Gate records
`no_sensitivity_probe` rather than accepting the edge.

## Implement a frozen bundle

GOAL: Produce a candidate change that satisfies the frozen boundary and nothing else.
HOW: Work on the run branch, writing tests for every mechanical must before implementing — failing on
base for a change entry and passing on base for a preservation entry. Open a draft PR when the branch
is ready for the gate.
JUSTIFICATION: A test committed before the fix, with its baseline behavior recorded, makes
"obligation discharged" a fact rather than a claim. -- (Huang `:721` — the code executor serves as
the perfect verifier, conditional on an oracle that discriminates)
IMPACT: high — (Lightman `:76` — process supervision solves 78.2% of the MATH subset against 72.4%
for outcome supervision and the gap widens with N; `:63` — it specifies the exact location of errors)

The Implementer writes tests for each `mechanical` + `must` entry before the change: a `change` test
fails on base and a `preservation` test passes on base. It records the many-to-many evidence map,
implements until green only on sketch-named paths, and records unrelated defects as deferrals rather
than fixing them. The tests are committed as their own commit, so the pre-fix baseline is auditable
rather than asserted.

On any consumer whose obligation coverage is not already declared, the Implementer emits
`escalate: coupling_found_after_freeze`.

The Orchestrator opens a draft PR and appends `pr_opened` with the PR number and head SHA.

An undisclosed consumer is not authorization. The Orchestrator accepts only an exact, reviewed,
frozen hit in `entails`; presence in coupling analysis or `traces[]` proves the consumer was known, not
covered. Anything unmatched, ambiguous, or undecided is `boundary_invalid`; an Adjudicator or human
settles only the permissive `entailed` direction. The run never adds an entry in place.

## Mechanical gate

GOAL: Prove every mechanical must is discharged before spending a reviewer.
HOW: Run CI plus discrimination and scope checks against the branch, returning failures for one bounded
repair loop.
JUSTIFICATION: A test committed green proves nothing alone; the gate confirms the baseline each entry
declared — failure on base for change and pass on base for preservation. -- (Huang `:721` — the
verifier is perfect only given a behavioral oracle that actually discriminates)
IMPACT: high — (Huang `:721` — an executable check is the only verdict here that does not rest on model
judgment)

The Gate rejects a missing evidence-map test, requires a change assertion to fail on base and pass on
head, and requires a preservation assertion to pass on both. It accepts an expected base error only
when the entry declared the typed expected absence; unrelated setup or collection errors fail. CI must
be green and the diff must stay inside the sketch.

Failures return to the Implementer up to `MAX_GATE_RETURNS`, then escalate `gate_not_passable`. A
passing gate appends `mechanical_gate_passed` with the CI artifact digest.

## Independent semantic review and safety

GOAL: Get a verdict on every independent-review must from a reviewer who did not write the change.
HOW: A fresh cross-family reviewer receives the diff, frozen bundle, and coupling analysis, then returns
a verdict per in-scope entry with evidence on every fail. Cited fails get one bounded repair loop.
JUSTIFICATION: A reviewer asked to find problems will supply problems, so a mechanical rule must
separate a finding from a work item. -- (Sharma `:18` — five assistants "consistently exhibit
sycophancy"; `:263` — challenged on a correct answer, Claude 1.3 wrongly admits a mistake on 98% of
questions)
IMPACT: high — (Zheng `:60` — judge-human agreement tops out near 80%, "the same level of agreement
between humans")

A fresh cross-family Reviewer receives the diff, frozen bundle, both base and head checkouts, and gate
artifacts—never the Implementer's session or prior round. It returns `pass`, `fail`, or
`unable_to_verify` per in-scope entry. Every fail carries a typed pointer: test id, file and line,
trace id, artifact reference, or a reproduced observation with command and captured output.

Triage drops missing, out-of-scope, or uncited findings and records every drop. `unable_to_verify`
invalidates the boundary rather than blaming the change. Cited failures get one repair round; exhaustion
escalates `semantic_review_not_converging`. Observations without evidence do not create work.

Uncited observations return in a separate array; there is no cap on cited verdicts. Semantic repair
gates `independent_review` entries and `verifier` is singular, so no test is owed there—an optional
regression test is allowed, not required.

An uncited reviewer observation may **request a stop**. It may never create work. That asymmetry is
what keeps the exception from becoming an unbounded reviewer veto: a cited finding can produce repair
work, an uncited one can only invalidate the boundary.

- Reviewer: may file a safety exception only for a closed set — security-boundary breach, secret or
  privacy exposure, data loss or corruption, irreversible external side effect.
- Reviewer: must supply an observed counterexample or reproducible evidence reference, the affected
  asset, the impact, and why no frozen obligation applies.
- Adjudicator: a distinct actor cross-family from the Reviewer, or a human, returns `confirm` | `reject`
  | `unable`; no severity score and no open invariant category, because both restore veto discretion.
- Adjudicator: on `unable`, treats the outcome as `confirm`, because uncertainty about a hard-harm claim
  resolves toward stopping.
- Orchestrator: requires a cross-family adjudicator or a human specifically to **reject**; rejection is
  the unsafe direction and same-family rejection is not permitted.
- Orchestrator: on confirm, appends `boundary_invalid`, ends the run; this does **not** authorize an
  in-run fix.
- Orchestrator: on reject, appends `safety_exception_rejected` carrying `finding_id`, category, affected
  asset, canonical claim, `submission_digest`, the original `evidence_refs`, adjudicator, reason, and
  timestamp.
- Orchestrator: suppresses the identical **evidence packet**, not the underlying hazard — the
  `finding_id` is stable, each submission gets its own digest.
- Orchestrator: allows one automatic reopening when a resubmission declares `novel_evidence_refs` and
  the adjudicator confirms a material evidence delta; further reopening needs a human override event.

Suppression is a projector outcome derived from the stream, never a deletion. A wrongly rejected
data-loss report stays legible to anyone reading the run.

## Handoff and merge observation

GOAL: Reach an autonomous stop state that names exactly what a human is being asked to do.
HOW: Mark the PR ready, render the handoff from the run record, and stop. Project item closure only from
an observed merge and only when no post-merge or production obligation remains.
JUSTIFICATION: Accepted imperfection must be written down or the next agent rediscovers deferred items
and starts fixing them. -- (Petersson `:173` — in ten years of capture-recapture research only one paper
was classified as an experience report)
IMPACT: medium — the corpus's failure mode is knowledge that never reached practice, but no source
measures whether a record prevents it.

After passing obligations, the Orchestrator marks the PR ready and renders a handoff projection from the
run record: discharged obligations, deferrals, rounds, residual risk, and open handoff objects. It
finalizes the execution lease at the autonomous stop, not after merge. A separately triggered,
idempotent Merge-watcher keyed by `(run_id, "merge")` records an observed merge and projects the item
closed only when no post-merge or production obligation remains.

The stop-state registry lives in the
[`autonomous-workitem-workflow`](autonomous-workitem-workflow.md) spine. This slice reaches
`ready_for_merge`, `handoff_pending`, and `boundary_invalid` but does not restate their cross-slice
definitions.
