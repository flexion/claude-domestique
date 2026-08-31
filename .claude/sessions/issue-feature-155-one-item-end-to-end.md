# Session: one-item-end-to-end

## Details
- **Issue**: gh-155 (bead: domestique-gag)
- **Branch**: issue/feature-155/one-item-end-to-end
- **Type**: feature
- **Created**: 2026-08-29
- **Status**: PAUSED — the slice is not delivered; this branch ships only what stands on its own

## Objective

Get one work item from claim to handoff with no human stepping in. The `walking-skeleton` slice,
specced in `modus/docs/walking-skeleton.md`.

## Why it is paused

Not abandoned and not complete. The slice explicitly excludes refinement — it freezes a
pre-authored boundary — so finishing it does not move toward acceptance criteria an agent can act
on, which is the nearer goal. Work moved to gh-158 on
`issue/feature-158/draft-boundary-from-ticket`.

The structural reason is worth keeping. This slice claims a real tracker item and freezes an
unrelated canned fixture, so the item and the boundary are never connected to each other. It
proves the sequence runs and recovers. It does not prove the workflow produces anything true
about the item it claimed. Refinement is the step that would connect them, and that is gh-158
and gh-159.

## What this branch ships

Only what is complete and useful independent of the unbuilt slice.

| | |
| --- | --- |
| `W_NO_FLOOR` in `lint-boundary.js` | an empty `registry_selections` now warns instead of passing in silence. Closes `domestique-7oi` |
| `bad-no_floor.yaml` | its fixture |
| `the-boundary-bundle.md` | names the check, per the every-claim-names-its-check rule |
| `modus/package.json` | `jest scripts/__tests__` → `jest`; any suite outside that directory silently never ran |
| `walking-skeleton.yaml` | the boundary the skeleton freezes — a worked example of a minimal conforming manifest |

## What was written and then removed

`modus/lib/run-record.js` and its tests. Append-only JSONL, monotonic `seq`, and unmatched-intent
reconciliation. It worked and it was green. It was removed before PR because it had no caller: no
orchestrator, no adapter, nothing imported it.

The reason to delete rather than keep: it encoded an envelope, a file layout and an API shape
derived from a document rather than from anything that needed them. A committed module with
passing tests reads as a settled decision, so the next reader would have built on those guesses
instead of questioning them.

Two things worth keeping from it, for whoever resumes:

- **Key idempotency on the tuple `(effect_kind, target, input_digest)`, not on a delimited
  string.** Any single-character separator can appear inside a `target` and collide two effects
  into one key, which would let a result answer an intent it never belonged to.
- **Drop a torn trailing line rather than throwing on it.** A crash mid-append is the case the
  record exists for, and refusing to read the file afterwards blocks recovery exactly when it is
  needed.

## Learnings

- The idempotency key was written with literal NUL bytes instead of spaces. Tests passed — NUL is
  a fine JS separator — but git classed the file as binary, so it would have been permanently
  undiffable. Found only when staging it, not by any test.
- `modus/tests/fixtures/valid.yaml` gives its watch entry the decision `recorded, not gated`. That
  is a status label, not a condition, so nothing about it can be false. The reference fixture
  teaches the defect, and the first hand-authored boundary in this repo copied it. Filed as a bead.

## Remaining for the slice

Resume after gh-158 and gh-159 make refinement real, or sooner if the integration risk needs
proving.

1. `lib/ports.js` — tracker and forge ports, kept separate.
2. `lib/adapters/beads.js` — `read(ref)` returns addressable parts, not a blob. `domestique-3lf`
   is the open question about what granularity a part is.
3. `lib/gate.js` — one change-style obligation, fails on base, passes on head.
4. `lib/run-record.js` — rewritten against a real caller.
5. `lib/orchestrator.js` and the gating test: the ordered stream, plus a crash between intent and
   result that reconciles to exactly one result.
6. Flip `walking-skeleton.md` `gating_test.status` to `implemented` once the suite runs.

## Blockers

None technical. Paused on priority.
