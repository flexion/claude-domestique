# Five work items from the boundary-completion research

Drafted from `modus/docs/research/boundary-completion-freeze-evidence.md` and
`modus/docs/research/boundary-review-coverage.md`, merged to `main` at `2f62ac5`. Findings that
produced this split are in `work-item-findings.md`. The measurement behind item 3 is in
`edge-rejection-measurement.md`.

Order to file: none. The five are independent of each other.

---

## Item 1 — say that coupling-edge review is not built, and stop claiming it

**Problem**

Two documents describe a review of the `entails` map that does not happen. The design says the
reviewer checks every edge and that an edge it rejects becomes `uncovered`
(`the-boundary-bundle.md:217`). The review as it runs asks two questions, neither about coupling
edges (`agent-work-item/SKILL.md:224-232`), so no edge has ever been rejected and none can be.

One shipped rule depends on that review having happened. `discharging-the-boundary.md:111` says the
Orchestrator "accepts only an exact, **reviewed**, frozen hit in `entails`". Nothing reviews, so the
word is false, and the repository's own rule against this is explicit: "every paragraph asserting
that a field does work must name the check that makes it do the work"
(`autonomous-workitem-workflow.md:108`).

The decision here is to leave the review unbuilt and correct the documents, rather than to build a
step nothing has needed. What the map costs unreviewed was checked: across the pass records there is
no `boundary_invalid` and no `coupling_found_after_freeze` from a real run, and in the one boundary
that has been implemented against, the map held and the fence held.

**Goal**

No shipped rule claims a check that does not exist, and a reader can tell which parts of the edge
design are built.

**Acceptance criteria**

AC1 — In `discharging-the-boundary.md`, the sentence beginning "An undisclosed consumer is not
authorization" no longer reads as though the `entails` hit it accepts was reviewed by anyone. The
claim is recorded as a limit instead, in the same form as the test-case collectability limit already
recorded in that file. The word need not be deleted; it must stop reading as something that happens.

AC2 — A reader of the bullet in `the-boundary-bundle.md` that has the Boundary-reviewer checking
every `entails` edge can tell the check is not built, without running the skill to find out.

AC3 — The condition that would reopen this decision is recorded: a `boundary_invalid` in a real run
that is attributable to an `entails` hit the Orchestrator accepted — that is, a mapping that claimed
to cover a consumer and did not.

AC4 — The record says why `coupling_found_after_freeze` is not that condition: it fires on a consumer
whose coverage was never declared, which is a missing edge rather than a wrongly covered one, and
edge review would not have caught it.

**What must keep working**

- The `entails` map itself. The Author writes it, and the linter continues to require every coupling
  edge to be mapped or marked `uncovered`.
- The downstream rule that an undisclosed consumer is not authorization, minus the claim that the
  hit was reviewed.

**Out of scope**

- Building the edge check. That is what this item decides against, and AC3 records what would change
  the decision.
- A size-based trigger. "Too many edges to check by hand" was considered and dropped: it has no
  threshold, and inventing one here would put a number in the record that nobody chose.
- Whether a boundary covering none of its edges may freeze. That is item 3, and it does not need the
  edge check: an Author can mark every edge `uncovered` today.

**Ready for the agent stage**

Yes.

**Reference**

`modus/docs/research/boundary-completion-freeze-evidence.md` §4 and §6.
`tmp/edge-rejection-measurement.md` for the measurement.

---

## Item 2 — a freeze states the evidence that allowed it

**Problem**

Freezing records a bundle digest and a commit reference. Both identify what was frozen. Neither
says what made it eligible. Four separate results gate the freeze: the lint pass, the mechanical
half of the eligibility check, the reviewer's judgment on whether a handoff is workable, and the
adversarial pass. None reaches the record. A person reading a frozen boundary later cannot say
which of them happened, what the adversarial pass concluded, or how many rounds ran.

The same gap shows in the tooling. The linter keeps an outcome for every check, including checks
that did not run because their input was withheld. The command that reports to a person prints only
failures and warnings, so five of five committed boundaries report success while carrying between 3
and 16 checks that never ran, against a written rule that this count must be zero.

**Goal**

A person reading a frozen boundary can say what evidence allowed it, and a freeze does not happen
when that evidence is absent or when a required check did not run.

**Acceptance criteria**

AC1 — For any frozen boundary, a reader can name each result that gated it and what each concluded,
from the record alone: the lint pass, both halves of the eligibility check, and the adversarial pass.

AC2 — The record states how many review rounds ran, which reviewer family produced the last one, how
many coupling edges were declared covered out of how many exist, and how many floor invariants were
selected.

AC3 — Where the adversarial pass found no counterexample, the record says the search for one failed,
and neither says nor implies that no counterexample exists.

AC4 — A freeze does not happen when any fact named in AC1, AC2 or AC3 is absent from the record. This
is a defect in a component that runs without a model, so it fails loudly where it occurs. It does not
become a workflow outcome and needs no stop state.

AC5 — A check that did not produce an ordinary pass or failure is recorded with which of these
applies, and they are told apart: its input was withheld by the caller, it had no domain in this
artifact, or it ran and a rule permits the result. Only the first names an owner and a remedy, and
only the first is a defect.

AC6 — Where a check's input was withheld, the record names the input, who supplies it, what the check
would have established had it run, and states that no boundary amendment is being requested.

**What must keep working**

- The digest and commit reference already recorded.
- The rule that exhausting a round limit hands off.
- The linter's existing outcome discipline: a failure gates, and a warning is recorded without
  gating.

**Out of scope**

- Judging whether the recorded evidence is good enough. This item makes it readable and refuses when
  it is missing.
- Comparing evidence between runs.
- Refusing a freeze on the proportion of coupling covered. This item records the proportion. Item 3
  is the only one that refuses on it.

**Why "a check that did not run" is three states, and why refusing on it was wrong**

Two earlier drafts had AC5 refusing a freeze when a required check had not run, and asked what state
such a run then reached. Both were wrong, and in two different ways.

The first is that a missing input is not the boundary's defect. `tracker-and-forge-ports.md` places
it: "An absent declaration is a configuration error, not a discovery to make after an item was
selected." Refusing at the freeze blames the boundary for a defect in the environment, after the
whole cost of authoring is spent, and the Author cannot repair it in any case.

The second is worse and is why AC5 is now a recording criterion. "A check that did not run" is three
different states wearing one word, and only one of them is a defect:

- **The caller withheld its input.** Two checks are guarded this way, both commented as taking their
  input from a fixture in tests and an adapter or runner in production. This one has an owner and a
  remedy.
- **The check had no domain in this artifact.** There was nothing to compare, so the comparison did
  not apply. Nothing is wrong and nobody owes anything.
- **The check ran, matched, and a rule permits the result.** `E_SELF_TRACE` is this: an entry may
  trace its own id when that id is a declared registry selection, and the exemption records that the
  rule allowed it. The code comment is explicit that this was made visible because "when this
  exemption was silent it read exactly like approval".

That third state is why a gate here would have been actively harmful. Tracing its own id is how an
entry anchors to the registry, which is how a manifest carries a **selected floor invariant** — the
shape the design prefers, and whose absence raises a warning. A freeze refused on this count would
refuse a boundary for having selected a floor correctly. No committed boundary shows it yet only
because none selects a floor at all.

A missing check input is a configuration defect, and `tracker-and-forge-ports.md` says where it
belongs: "An absent declaration is a configuration error, not a discovery to make after an item was
selected." Refusing at the freeze blames the boundary for a defect in the environment, after the
whole cost of authoring has been spent, and the Author cannot repair it in any case. The same
document treats a degraded input as something to degrade the check against rather than to stop for.

So there is no new stop state here, and none of the existing ones is stretched to fit. What the case
needs is honest reporting, which the repository already requires and the linter already produces
internally — the defect is that it is not surfaced.

**A count of review results is deliberately not here**

The research proposed that this record also carry how many entries the review produced a result for.
It is left out. Nothing was ever written down that reads it, and the one use the research gave — that
a declared figure can be shown wrong — depends on comparing rounds, which item 4 puts out of scope. A
figure with a reader would earn its place; this one has none, and a number in a freeze record invites
being read as a coverage measurement, which it is not.

**Depends on**

The reporting defect tracked as `domestique-asx`: the linter records a check that could not run, and
the command that reports to a person prints only failures and warnings, so the result reads as
success.

AC5 also needs the three states above told apart before it can be satisfied, and today they share one
word. That split is the same move the codebase has already made twice, when a "ran and refuted
nothing" outcome was taken out of pass and a "halts spending without ending the run" outcome was
taken out of fail.

**Ready for the agent stage**

Yes.

**Reference**

`modus/docs/research/boundary-completion-freeze-evidence.md` §1, §2 and §6.
`modus/docs/research/boundary-review-coverage.md` §6 for the count.

---

## Item 3 — a boundary that covers none of its coupling does not freeze

**Problem**

Coverage of coupling is declared and never required. Every edge may be marked `uncovered`, and the
boundary passes every check with no failure and no warning. A boundary that names its coupling and
covers none of it is eligible to freeze today exactly as one that covers all of it is.

This is reachable now, and does not wait on anything. The Author writes the map, and marking every
edge `uncovered` passes the linter. Pass 9's own boundary carries one such edge, `CPL-5`, written
that way by the Author.

**Goal**

A boundary that has coupling edges and covers none of them does not freeze.

**Acceptance criteria**

AC1 — A boundary with one or more coupling edges, none of them covered, does not reach a frozen
state.

AC2 — This item introduces no refusal that depends on the proportion covered being anything other
than zero. A boundary covering one edge of eight is not refused by this item.

AC3 — This item introduces no refusal for a boundary that names no coupling edges at all.

AC4 — A run refused by AC1 re-enters the amend path: the Author covers an edge or the run reaches
the round limit and hands off to a person. Not frozen is not a state.

**What must keep working**

- Every proportion of coverage other than zero, and boundaries that name no coupling, as far as this
  item is concerned. AC2 and AC3 bound what this item adds. They do not exempt a boundary from any
  other gate.
- Boundaries already committed are not refused by this item. Measured below.

**Compatibility, measured**

**No boundary committed as of `53d86a7` is refused by this item.** Every one of them covers at least
one coupling edge. Whether any is refused by another gate, including item 2's, is not settled here.
Because item 1 decides not to build edge review, the map this item judges is the authored map and no
later step changes it, so this holds rather than expiring. It would reopen only under item 1's
reopening condition. The per-boundary figures are in `tmp/work-item-findings.md` for anyone who wants
to re-derive it.

**Out of scope**

- Telling a boundary that names no coupling from one whose coupling was never looked for. The
  research names this as needing evidence about how coupling was gathered, and does not attempt it.
- Any coverage proportion as a target or a quality measure.

**Depends on**

Nothing. Two earlier drafts of this item said otherwise and both were wrong. It does not depend on
item 1, because the map it judges is written by the Author rather than produced by a reviewer
rejection that nothing generates. It does not depend on item 2 either: zero coverage is a defect the
Author can fix, and the route was already decided in `boundary-completion-freeze-evidence.md`, in the
paragraph headed "The repair path, which an `E_` does not supply at this stage": a zero-coverage
freeze attempt re-enters the amend path, with cap exhaustion handing off. Item 2's refusals may have
a different owner and a different remedy, so its routing question is its own.

**Ready for the agent stage**

Yes.

**Reference**

`modus/docs/research/boundary-completion-freeze-evidence.md` §4 and §6.

---

## Item 4 — each entry's review result is separately readable

**Problem**

The review is asked which entries it could not evaluate, and answers with a list of those entries.
Entries it does not name are not accounted for. In one recorded run the reviewer gave a reason for 9
of the boundary's 17 entries, then stated that the remaining sixteen evaluated. That statement was
wrong about one entry, which the next round found a real defect in, reading text that had not
changed. Nobody could point at the sentence that covered that entry, say which reviewer stood behind
it, or read why it had been judged sound, because one sentence covered sixteen entries and gave a
reason for none of them.

**Goal**

A reader can find, for any entry in the boundary, what the review concluded about it and why.

**Acceptance criteria**

AC1 — For every entry in the boundary, a reader can find what the review concluded about it.

AC2 — For every entry, a reader can find the reason the review gave for that conclusion.

AC3 — A review that could not evaluate an entry can say so about that entry, and a later reader can
tell that entry from one the review evaluated and passed.

AC4 — Where the review records that it considered raising something about an entry and did not, the
record names the concern and the reason for not raising it. A record claiming this without both is
not sufficient.

AC5 — What a round does with its findings does not change. An entry a first round could not evaluate,
or that it fails, returns to the drafter as a finding. The same in a second round hands off to a
person. An entry the review passed, or considered and declined to raise, does neither.

**What an unevaluable entry causes, which does not change**

An entry the review could not evaluate is a finding today — that is exactly what the review's first
question asks for — and the existing rule already states what follows
(`agent-work-item/SKILL.md:224-238`). AC5 preserves it. This item changes where that conclusion is
written down, not what it causes.

Written here because it was nearly asked as an open question. It is settled by the rule the review
runs under, and a reader of this item should not have to derive it again.

**What must keep working**

- The two-round review limit, and the round behaviour AC5 names.
- The second question the review is already asked, about whether anything blocks saying what is
  wanted.
- The rule that a reviewer names a specific requirement it could not decide, rather than general
  dissatisfaction.

**Out of scope**

- Keeping review results from one round to the next, and comparing them. The research names both as
  undesigned.
- Making the review deeper. A review can produce a result for every entry having examined fewer, and
  this item does not change that. AC4 is the limit of what a record can show: it exposes a stated
  concern, not that an entry was examined.
- Reading a count of results as a measure of how much of the review happened.

**Ready for the agent stage**

Yes.

**Reference**

`modus/docs/research/boundary-review-coverage.md` §1, §2, §4 and §6.
`modus/docs/research/boundary-review-coverage-review-emil.md` for the measurement.

---

## Item 5 — the review establishes all six conditions the stopping rule names

**Problem**

Refinement is declared done when a fresh reader can say five things about the boundary and has no
blocking question about what is wanted. The review asks two questions, which establish three of
those six conditions. Whether a reader can say what must keep working, what is out of scope, and
what is handed off is asked by nothing. This was recorded and left unfixed at
`docs/passes/pass8/notes.md:84-87`. Findings against those three conditions therefore arrive late,
or after the review rounds have been used up.

**Goal**

The review establishes, for each of the three conditions nothing currently asks about, whether a
fresh reader can state it. A condition that cannot be stated is a finding, handled the way the
review's existing findings are handled.

**Acceptance criteria**

AC1 — A review returns whether a fresh reader can state what must keep working.

AC2 — A review returns whether a fresh reader can state what is out of scope.

AC3 — A review returns whether a fresh reader can state what is handed off.

AC4 — A condition a reader cannot state is a finding for that round.

AC5 — What a round does with those findings does not change: a first round returns them to the
drafter, and a second round that names one hands off to a person.

**What must keep working**

- The two questions the review already asks, and the three conditions they establish.
- The two-round review limit, and the round behaviour AC5 names.
- The rule that a reviewer names a specific requirement it could not decide.

**Out of scope**

- Changing what the stopping rule requires. This item makes the review cover what it already names.

**Ready for the agent stage**

Yes.

**Reference**

`modus/docs/research/boundary-review-coverage.md` §7.
`docs/passes/pass8/notes.md:84-87` for the earlier record of the same gap.
