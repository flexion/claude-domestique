# Session: draft-boundary-from-ticket

## Details
- **Issue**: gh-158 (bead: domestique-3z5)
- **Branch**: issue/feature-158/draft-boundary-from-ticket
- **Type**: feature
- **Created**: 2026-08-31
- **Status**: in-progress — boundary frozen, implementation not started

## Objective

An agent drafts the boundary rather than a human writing it, and a human approves before freeze.

## The frozen boundary

`boundary/gh-158.yaml`, frozen at `cfbc53c`. Nine entries. **It is the standard now.** If
implementation makes it look wrong, stop and escalate — do not edit it.

`modus/prompts/boundary-prose.md` froze in the same commit because AC-6 and AC-7 name it.

Implementation notes are in `boundary/gh-158.sketch.md`, marked non-normative and deliberately
not part of the boundary. The change surface is a next-phase concern; refinement states only what
must be true.

## How refinement stopped

Not by running out of findings. By a rule, agreed with the operator:

> A fresh agent can say what must be true, how it would tell, what must keep working, what is out
> of scope, and what is handed off — and has no blocking question about *what is wanted*.
> Questions about *how or where to build* do not block. Stop at the first draft that passes.
> A reviewer must name a specific undecidable requirement, not express general dissatisfaction.

Four review rounds with an independent agent, each finding a real defect:

| Round | Finding |
| --- | --- |
| 1 | would refuse to implement — unbounded change surface; two gameable obligations; a `non_goals` contradiction |
| 2 | the mechanism sketch was normative but unenforced, and unreadable to a YAML consumer |
| 3 | a watch entry with no truth condition; `boundary-prose.md` bound nothing |
| 4 | AC-7's observation named two of three banned categories, against an open list |

Severity fell each round. The final check returned an empty list and "no blocking question."

## Key decisions

- **The mechanism sketch came out of the boundary.** Refinement is the "what". The change surface
  is the "how" and belongs to the next phase. This resolved a deadlock rather than working around
  it: the sketch was normative, the schema has no field for it, and `non_goals` forbade the schema
  change that would have made it enforceable.
- **`boundary-prose.md` lives in modus, not borrowed from `stilus`.** README constraint 1: nothing
  here may depend on a sibling plugin, and should duplicate rather than couple.
- **Only the checkable half of the prose rules gates.** Word caps and the closed banned list are
  AC-6 and AC-7. One-claim-per-field is AC-8, a reviewer's job, because a conjunction check
  false-positives on a disjunctive predicate. The author's tells are enforced by nothing, and that
  is recorded as a limit rather than claimed as a check.

## Learnings

- Fluent prose in an acceptance criterion is not a style problem. "Judged usable" cannot be false,
  so an agent cannot tell whether it met it. Writing the rules down caught defects that reading
  the file three times had not.
- A reviewer asked "would you implement from this" answers a different question than "can you
  evaluate these decisions." The first one invited a refusal about the wrong phase.

## Next Steps

1. Implement against the frozen boundary and nothing else: `modus/prompts/author-boundary.md`,
   `modus/scripts/draft-boundary.js`, and its tests. Notes in `boundary/gh-158.sketch.md`.
2. AC-4 needs its sensitivity probe as an evidence edge at stage 5 — an adversarial fixture
   emitting a fixed manifest, which must fail every perturbation case.
3. Commit `boundary/gh-158.sketch.md` with the implementation work.

## Blockers

None.
