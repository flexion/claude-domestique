# Findings on the session recommendations, before any rewrite

Source: `modus/docs/research/boundary-completion-freeze-evidence.md` and
`modus/docs/research/boundary-review-coverage.md`, both on `main` at `2f62ac5`, with
`modus/docs/research/boundary-review-coverage-review-emil.md` as review provenance.

The recommendations in those two documents are the item being refined. Six lenses were run over
them one at a time.

## The count decides the shape

Ten findings. Above about eight means the material was never defined as a work item, or it holds
more than one thing. Here it is the second: it holds five.

Agreed with hal, who ran the same source independently. An earlier count of six kept "records what
it examined and declined" apart from "states an outcome for every entry". Those read the same —
both are the per-entry review result — so they are one goal.

| | Goal, stated as an outcome | Source | Depends on |
| --- | --- | --- | --- |
| 1 | **Decided: do not build.** Say that coupling-edge review is unbuilt, and stop claiming it downstream | freeze §6 | — |
| 2 | Every freeze states the grounds that allowed it, and a freeze whose grounds cannot be produced does not happen | freeze §6 | 4, if it carries the review count |
| 3 | A boundary with coupling and no covered edge does not freeze | freeze §6 | — |
| 4 | Each entry's review result is individually inspectable, with a reason. A review can conclude it was unable to evaluate an entry, and can record that it examined an entry and chose not to raise it | coverage §6 | — |
| 5 | A fresh reader can state what must keep working, what is out of scope, and what is handed off | coverage §7 | — |

Five goals, not one. The operator chose to file all five as separate issues.

**2 and 3 are separate, on the first document's own concession.** A complete rationale improves
what can be audited. It does not decide whether a freeze happens. Different done states.

## Out of all five

- Persistence of review results across rounds, and any comparison between rounds. Named as
  undesigned in coverage §6.
- Extraction provenance, which is what `0 of 0` would need. Named as out of scope in freeze §6.
- The `exempt` false-green. An existing defect, on `domestique-asx`, not a recommendation.

## Findings

**F1 — the whole set — holds five separately deliverable goals.**
See the table above. Written as one item, the acceptance criteria would exceed five bullets and no
reader could say what "done" covers.

**F2 — 2 and 4 — state a design where behaviour belongs.**
"One verdict row per entry id", "an explicit third value", "carry examined-and-declined in the same
ledger", and the freeze rationale's six-field table are all shapes for the data. The shapes are later decisions and do not belong in
either item. The behaviour underneath each:

- Goal 4 — a reader can find, for any entry, what the review concluded about it and why.
- Goal 2 — a freeze exposes the evidence it consumed, and does not occur when that evidence is
  absent.

**F3 — 4 — logic-problem — WITHDRAWN. The outcome was already defined.**
The recommendation gives the reviewer a way to conclude it could not evaluate an entry. Nothing
says what happens next: whether the boundary can still freeze, whether it counts as a finding, or
whether it routes anywhere. This is the defect class both research documents are about — a result
with no defined consumer — so writing item 4 without it would reproduce the thing the item exists
to fix.

Withdrawn on checking the rule the review already runs under. "Which entries' `decision` could you
not evaluate" is the review's first question, so an unevaluable entry is already a finding, and the
existing rule already says what a finding causes: the drafter fixes what the round named, and a
round that names anything after the limit hands the findings to a person. Item 4 moves where that
conclusion is written down. It does not change what it causes.

The finding was raised, put to the operator, and answered by reading the rule rather than by a
decision. It is kept here because the answer is now written into item 4, where the next reader will
find it without deriving it again.

Note that "examined and chose not to raise it" is not a second value of the same kind. It is part
of the reason recorded against an entry, and it carries no separate consequence.

**F4 — the whole set — does not say what must keep working.**
Unstated: the two-round cap, step 8's second question about blocking questions on what is wanted,
and the existing linter behaviour.

Whether boundaries already committed must continue to freeze is not on that list. It is a
compatibility decision for the operator, and no finding derives it.

Measured, for whoever decides: the five committed boundaries declare 3/3, 1/1, 4/4, 7/8 and 5/6
coupling edges covered. That establishes only that no manifest declares zero covered edges **as
authored**. Item 3 is judged after review, and `the-boundary-bundle.md:217` lets a reviewer turn a
covered edge into an uncovered one, so it says nothing about what the post-review state of any of
these would be.

**F5 — the whole set — does not say what is out of scope.**
The documents say what the findings do not *fix*. That is not the same as what the work does not
*touch*.

**F6 — 3 and 1 — carry an ordering constraint stated only in prose.**
`boundary-completion-freeze-evidence.md` §6 says the gate has no repair path until 1 is specified.
So 3 cannot ship before 1. An item covering 3 without 1 would be refused or would invent the
transition.

**F7 — 4 and 2 together — a recorded count says less than a reader will take it to say.**
A count of entries the review reached says how much of the record was completed. It does not
measure how much of the review happened, and it does not measure depth: coverage §6 states that a
model can produce results for every entry having examined fewer. Both facts hold together — a
declared figure that can be shown wrong is worth more than an absent one — but an item carrying
both without saying so invites a reader to treat the count as a coverage measurement.

**F8 — 4 — "addressable and attributable" is not checkable as written.**
It names a property, not an observation. A criterion has to say what a reader could look at and
get a yes or no from.

**F9 — 5 — is the narrowest apparent change of the five, and is buried.**
Three of the six conditions in the skill's own stopping rule are asked about by nothing. This is
recorded and unfixed at `docs/passes/pass8/notes.md:84-87`, and the source states it is independent
of the other four. How much work it is has not been measured and is not claimed here.

## Blocking and not blocking

**Answered.** Which of the five to write. The operator chose all five, as separate issues.

**Blocking — one, found on hal's second pass and since answered.** Item 1 had no decided goal. The research names the
choice — a rejected edge "either re-enters the amend loop at `:221` or does not" — and does not make
it. Under the skill a missing goal is blocking, so item 1 carries no acceptance criteria and is
written as a placeholder with the question against it.

Discovered late because the first draft stated a goal that read as decided ("has one stated next
step") while leaving the step itself unnamed. A goal that names no outcome is the defect it looks
least like.

**Answered.** Hal chose to build the review and route rejections through the amend path; emil chose
not to build it, and measured that no record shows the unreviewed map costing anything, that the one
boundary implemented against held, and that six of six edges audited as a consumer were sound or
narrow with none false. The operator took emil's answer. Item 1 is now a decision not to build, with
the false `reviewed` claim at `discharging-the-boundary.md:111` corrected and a reopening condition
recorded.

**F6 is withdrawn with it.** Item 3 was said to depend on item 1. It does not: a zero-coverage map is
written by the Author, not produced by a reviewer rejection, and pass 9's `CPL-5` is an authored
`uncovered` edge. Item 3 also does not depend on item 2 — its route was already decided in
`boundary-completion-freeze-evidence.md:420-422`.

**Asked and withdrawn — one.** F3. The rule already answered it; see above.

**Later additions.** Emil measured that `the-boundary-bundle.md:217` is not implemented: the review
asks two questions and neither concerns coupling edges, so no reviewer can reject an edge today.
That closed item 3's compatibility question as a fact about the present and reopened it as a
question about the future, because item 3 ships only after item 1 builds the step whose absence the
measurement rests on.

**Not blocking — recorded.** F1, F2, F4 through F9 are answerable inside the items they belong to.
They are written above rather than asked.

