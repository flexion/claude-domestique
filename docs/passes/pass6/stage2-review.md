# Boundary review — gh-158, pass 6

Step 8 of `agent-work-item`: review by someone who did not write it, asked
exactly two questions. Two rounds were needed.

Reviewer: a fresh `claude -p` instance, given the item and the boundary inline and
nothing else. The boundary under review had already passed both lint forms —
failures empty, exempt zero — before round one.

The questions, verbatim both rounds:

1. Which entries' `decision` could you not evaluate against that entry's own
   `observation`? Ids only.
2. Do you have a blocking question about WHAT IS WANTED that you cannot answer
   from the boundary and the item? Do not raise questions about how or where to
   build it.

## Round one — four defects

## 1. Entries whose `decision` I could not evaluate from that entry's own `observation`

**W-1**

The observation collects a per-item record across every item started ("for each item started, record whether its boundary was drafted or written by hand"). The decision is singular — "the boundary was drafted" — with no rule for aggregating the population the observation gathers (all items? any? a rate over some window?), and `quantitative: false` forecloses a threshold. Holding only the observation's output, there is no way to return a verdict.

Every other entry's decision names a datum its own observation produces: a failures list (AC-1), an exempt-check count (AC-2), a boundary list (AC-3, AC-5, AC-8), a reviewer's returned list (AC-4, AC-7), a blocker count against a setup-fixed number of missing things (AC-6), an approval record (AC-9), two step lists (PRES-1), per-file failure-code sets (PRES-2).

Borderline, not counted: PRES-1 instructs listing "the steps a drafted boundary required" without setting up the freeze that would produce that list — the operand is asserted rather than obtained, though the same undefined notion of "step" applies symmetrically to both sides, so the comparison is at least well-formed.

## 2. Blocking question about what is wanted

No.

The two things I would otherwise ask about are answerable from the item, which makes them boundary defects rather than open questions:

- **PRES-1 is stricter than AC6 in a direction the item rules out.** AC6 wants hand-written boundaries to freeze "without any step a drafted one does not require" — a subset relation. PRES-1's decision demands the two step lists be *equal*, which also fails a hand-written boundary that requires *fewer* steps. That is a misreading to fix, not an ambiguity to resolve.
- **AC4's independence clause is uncovered.** AC-7 verifies that each blocker names its missing criterion or undecided question, but nothing verifies "can be resolved without resolving the others." AC-8 exercises resolving *all* blockers, which passes just as well if resolution is order-dependent. What is wanted is clear from AC4; the boundary simply has no entry for half of it.

Also clear from the item but unverified: AC1's "a person is *asked*." AC-3 only observes that nothing is drafted when nothing is answered — a drafter that never asks anyone satisfies it.

### What changed after round one

| Finding | Fix |
| --- | --- |
| `W-1` decision unevaluable | observation now bounds a window, decision reads "no record in the window says written by hand" |
| `PRES-1` demanded equality where AC6 states a subset | decision now "every step the hand-written one required is also required for the drafted one" |
| AC4's independence clause had no entry | added `AC-10` |
| AC1's "a person is asked" had no entry | added `AC-11` |

## Round two — clean, plus one caught outside the questions

## 1. Entries whose `decision` I could not evaluate against its own `observation`

**None.**

Every pair reads exactly what its observation yields. Two lean on the setup rather than on the reading, but both are still determined: AC-6's "the number of missing things" comes from the observation's own construction (two), and AC-10's "unchanged" is fixed by "an item carrying three blockers" rather than by a before-reading.

(Separately — not what Q1 asks — PRES-1's `statement` states the containment in the opposite direction from its `decision`; the decision is the one that matches AC6.)

## 2. Blocking question about what is wanted

**No.**

The one candidate is the negative half of the Goal: the item says a person "decides whether it freezes" but never states what happens on a *no* — discard, redraft, or leave unfrozen — and no entry covers that branch. It isn't blocking, because AC6 answers it: a boundary "written or **edited** by hand" freezes with no extra step, so declining leaves the drafted boundary editable by hand and freezable on the same path. Nothing else about what is wanted requires an answer before work starts.

### What changed after round two

`PRES-1`'s `statement` stated the containment in the opposite direction from its
own `decision`. The decision matched AC6; the statement did not. Statement is now
"a hand-written boundary requires no step a drafted one does not".

## Why this file exists

Both rounds ran against a boundary the linter had already passed. Round one found
four defects in it. Linting is necessary and measures nothing about whether the
boundary decides anything, which is the case for step 8 existing at all.

Round one also found no blocking question about what is wanted — so the upstream
refinement of the item held. The defects were all in the boundary, not in the
item, which is what the attribution rule in `docs/refinement-loop.md` predicts
for an item that has been through the human stage.
