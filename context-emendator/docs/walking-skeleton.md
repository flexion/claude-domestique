---
slice: walking-skeleton
job: >-
  Deliver one narrow end-to-end autonomous run that claims a Beads item, records recoverable effects,
  freezes a trivial boundary, proves one mechanical obligation, and hands the result to a human.
ships:
  - kind: deterministic
    path: context-emendator/lib/orchestrator.js
  - kind: deterministic
    path: context-emendator/lib/adapters/beads.js
  - kind: deterministic
    path: context-emendator/tests/fixtures/walking-skeleton.yaml
  - kind: doc
    path: context-emendator/docs/walking-skeleton.md
gating_test:
  status: planned
  command: npx jest context-emendator/lib/__tests__/walking-skeleton.test.js
  evidence: >-
    A disposable Beads-backed fixture records ordered claim, intent/result, frozen-bundle, gate, and
    handoff events; restarting after a simulated crash reconciles the unmatched intent without a second effect.
non_gating:
  - Model quality for future reconstruction and adversarial prompts.
  - Cross-machine Beads synchronization behavior.
depends_on: []
terminal_failure_owned: []
source_lines: new
---

# Walking skeleton

**Slice boundary.** Deliver one narrow end-to-end autonomous run that claims a Beads item, records
recoverable effects, freezes a trivial boundary, proves one mechanical obligation, and hands the result
to a human.

| | |
| --- | --- |
| Ships | `lib/orchestrator.js` · one Beads adapter · one trivial boundary fixture · this document |
| Gating test | *planned* — `npx jest context-emendator/lib/__tests__/walking-skeleton.test.js`. A disposable Beads-backed fixture records claim, recovery, freeze, gate, and handoff in order |
| Non-gating | Future prompt quality · cross-machine Beads synchronization |
| Depends on | None — this first increment carries the thin implementations it integrates |
| Terminal failure owned | None — existing slice contracts own their outcomes |
| Source lines | new |

## Extraction note

This is new composition prose, not an extraction. It derives the narrow integration path from the ports,
boundary, and discharge contracts while deliberately leaving their detailed rules in their owning slices.

GOAL: Prove the workflow can make one safe, useful trip through its integration boundaries before the
team invests in broader adapters, reconstruction, or review capability.
HOW: Use one eligible Beads item, one deterministic boundary fixture, one mechanical obligation, and one
controlled crash/restart path. Claim, append intent and result, freeze, gate, then render handoff.
JUSTIFICATION: Integration, rather than completed components, is the risk a vertical slice must expose.
The existing workflow already requires a tracker, a run record, a frozen bundle, a gate, and a handoff;
this slice exercises the narrowest version of all five. -- (no new source — direct composition of the
existing workflow contracts)
IMPACT: high — it distinguishes independently runnable components from an end-to-end deliverable.

## One happy path

The Orchestrator selects one eligible Beads item through the tracker port and claims it with a fence.
It opens a run record, writes an `intent`, performs the claim or branch-side effect, and records a
`result`. It freezes one pre-authored trivial boundary bundle and runs one change-style mechanical
obligation against a disposable base/head fixture. A passing gate writes its artifact digest and the
Orchestrator renders a `ready_for_merge` or `handoff_pending` projection for a human.

The test simulates a crash after intent and before result. Restart replays the record, reconciles the
real Beads/forge state, writes exactly one result, and never repeats the external effect. Its assertion
is the ordered event stream plus the named handoff state, not a collection of successful unit calls.

## Deliberate exclusions

This first increment does not reconstruct an ambiguous item, support a second tracker, select registry
invariants, run adversarial boundary review, perform semantic review, manage post-merge obligations, or
claim cross-machine Beads correctness. Those are later components and later increments. The skeleton
does not call them done by omission: each remains named in its owning slice with a planned test.

## Why this is the first slice

The port, boundary, discharge, and reference-tooling documents each define independently testable
components. None alone gets a work item to a usable handoff. This skeleton is the first actual vertical
increment because it crosses their minimal interfaces for one reader goal and one observable outcome.
