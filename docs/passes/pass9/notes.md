# Pass 9

The first pass to run end to end and stop on its own. 23 minutes: stage 1 in
3:57, stage 2 in 19:12.

## Both changes made this session held on their first test

**The two-round review cap bound.** Round one at 12:43:32, round two at 12:46:49,
and then it stopped:

> Round two named two entries. That is the cap — I stop here and the decision is
> yours. I have not fixed round two's findings and did not run a third round.

Pass 8 dispatched five rounds in twenty-two minutes and had to be killed. The cap
also held the harder half: it did not fix round two's findings, which is the part
that would have been easy to leak.

**The contradiction-is-not-a-gap rule landed on the first item it met.** AC7
requires an approval at the freeze; the specified freeze appends a digest and a
commit SHA and names no approver, and the workflow's one human approval is at
merge. Pass 8 filed that under `gaps[]` and left `corrections[]` empty. Pass 9
recorded it as `contradicted` with a correction and `moves_surface: false`, and
said why it did not stop the run.

## Stage 1 confirmed the item edits and found a new conflict

The AC1/AC5 consent conflict is gone — the two sentences added to AC1 closed it,
and no finding mentions consent scope.

It found `conflict` — AC3 against AC5 — which nobody had seen. AC5 requires a
boundary once the last blocker is resolved; AC3 forbids one when the criteria
cannot be derived from. When the answers to a set of blockers are themselves not
enough, both apply. That is the same non-termination hole fixed in the skills this
session and never written into the item. It is now question 1 in #163.

Nine more findings, all recorded rather than asked, and the triage default worked:
one blocking, nine recorded.

It also declined to open `modus/evals/158-human-work-item/expected.md` on its own
initiative — "reading the expected output would make the run worthless" — which
nothing in the skill asks for.

## Review found a defect that had passed twice before

`OB-5` instrumented AC2 by handing a reviewer a finished boundary and asking which
entries they had to write themselves. Round one:

> Nothing in that observation gives them a step at which they would write one, so
> the honest answer is `none` whatever the drafter emits.

`docs/passes/pass6/boundary.yaml` `AC-4` has the identical instrumentation and both
of its review rounds passed it. The working form derives first and compares
second. Filed as #166 and carried into #163's decided list.

## Handed over unfixed, per the cap

`OB-7` counts failed gate conditions where its statement says missing things, so a
drafter that lumps three missing criteria into one blocker passes — the exact
failure AC3 and AC4 exist to exclude. `OB-13`'s sensitivity probe is in a comment
rather than in the observation.

Round one saw the second and declined to count it; round two counted it. That is
the non-monotonicity the cap exists for, not a boundary getting worse.

## Incidental

`modus/prompts/boundary-prose.md` claims word caps and banned words are "enforced
by a script", in the section written to stop exactly that being assumed. No such
script exists. Filed as #164.

## Where the item went

#158 was narrowed to what shipped and the drafter deferred to #163. Nothing here
freezes: step 9's stopping rule is not met, so step 10 does not follow, and
`boundary.yaml` stays `NOT FROZEN`. It is a pass artifact rather than the
definition of done for anything.
