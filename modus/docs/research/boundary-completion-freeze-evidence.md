# Boundary completion: what licenses the freeze

Companion to [`satisficing-boundary-briefing.md`](satisficing-boundary-briefing.md) and
[`satisficing-boundary-near-term-artifacts.md`](satisficing-boundary-near-term-artifacts.md).
Those establish that a frozen external referent is what makes creep and drift measurable at all.
This one asks the question one level up, about the freeze itself:

> **What positive, reviewable evidence should make a boundary eligible to freeze — not merely
> lint-clean and free of a described adversarial gap — while semantic completeness stays
> unprovable and declared-uncovered coupling can still lint clean?**

It extends [`the-boundary-bundle.md`](../the-boundary-bundle.md)`:143`, which splits mechanical
completeness from semantic feasibility: the handoff object's "presence and field completeness are
mechanical; whether the handoff is *feasible* is semantic and belongs to the Boundary-reviewer, not
to a script." That line settles **who decides what**. It does not say what the freeze decides *on*,
and the two are not the same question.

Every claim below is a citation into this repository. Where a reading of ambiguous prose is doing
the work rather than a stated rule, it is labelled as a reading. The recommendation in §6 is a
**design judgment**, not a finding, and is marked as such.

---

## 1. The freeze predicate, stated exactly

The boundary is committed and frozen on the conjunction of **four** results. The lint pass and the
adversarial pass are the visible two; the conclusive eligibility check supplies the other two, and
those are the design's own worked example of the `:143` split this document sets out to extend.

| Actor | Result | Bound |
| --- | --- | --- |
| Linter (no model) | Validates the schema and resolves every trace (`:199`) | `MAX_LINT_ROUNDS`, then `criteria_not_lintable` (`:201`) |
| Orchestrator (no model) | The **mechanical** half of conclusive eligibility — does the coupling map name a path outside the ownership map, and does every `post_merge` or `production` must carry a complete handoff object (`:202`) | Not a loop: mechanical ineligibility appends `run_ineligible` and "stops before any model call is spent" (`:203`) |
| Boundary-reviewer | The **semantic** half — handoff *feasibility*, "which the Linter cannot do; an infeasible handoff exits `ineligible` here, before the adversarial exercise and without a second top-model call" (`:218`) | Exits `ineligible`; `ineligible_infeasible_handoff` |
| Boundary-reviewer | "Describes a change that satisfies every entry literally while failing **its own recorded reconstruction** of the goal, or returns `no_gap_found`" (`:219`) | `MAX_BOUNDARY_ROUNDS`, then `boundary_ungameable_unproven` (`:224`) |

"On a clean pass it is committed and frozen" (`:61`). The Orchestrator then "commits the manifest
and every referenced asset to the run branch, computes the **bundle digest**, appends
`boundary_frozen` with that digest and the commit SHA" (`:228`).

The two eligibility rows sharpen the question rather than answering it. Both are **exclusionary**:
they can stop a run, and passing them establishes that no disqualifying condition was found. The
mechanical one at `:202` does produce a genuine positive — handoff completeness and ownership
containment, both checkable — which is exactly the evidence §2 shows is computed and then discarded.
Neither reaches the freeze event.

Two further properties of that predicate matter and are easy to miss.

**The caps do not weaken it.** An exhausted cap is not a cheaper freeze:
[`autonomous-workitem-workflow.md`](../autonomous-workitem-workflow.md)`:204` states the rule
generally — "Every cap is a handoff, not a signal to buy another round." This is *stronger* than
the `threshold_met | cap_reached` pair the near-term artifacts document proposes for the code-review
loop, where a cap-reached stop is an honest recorded outcome. Here a cap-reached boundary does not
freeze at all. Nothing in this document argues against that; it is the part of the design that
already answers the briefing's stopping-rule problem, and it should be left alone.

**The freeze event records what was frozen, not what licensed freezing it.** `boundary_frozen`
carries a digest and a SHA. Both are identity, and `:244`–`:253` argues that point well — the git
hashes are byte-stable content-addressed digests of exactly those bytes, which is why
canonicalization was withdrawn. Identity is not grounds. Nothing in the event says how many
coupling edges were covered, how many review rounds ran, which reviewer family returned
`no_gap_found`, that either eligibility half was checked, or that the semantic axis established
nothing.

---

## 2. The mechanical half already produces positive evidence, and throws it away

This is the load-bearing fact in this document, because it makes the recommendation in §6 cheap
rather than speculative.

`lint-boundary.js:227` carries the comment **"Records outcomes, not just failures. A check that ran
and passed is visible."** The recorder emits six outcomes — `fail | pass | exempt | warn |
provisional | abstain` (`:31`) — and the module exports a filter for four of them, including
`abstentions` at `:252`.

The shipped reader uses two. `main()` prints warnings and failures (`:1112`), and where there are
neither it prints a bare success line:

```js
if (findings.length === 0) process.stdout.write(`ok    ${name}\n`);   // :1113
```

`abstentions` and `provisionals` are consumed only by
`modus/scripts/__tests__/lint-boundary.test.js`. So the per-check record of what was established —
the exact artifact a freeze rationale would need, already computed, already addressable by code and
JSON pointer — reaches the end of the run and is discarded at the only production consumer. The
success line is one word, and one word is not evidence.

The gap is not that the mechanical layer lacks positive evidence. It is that nothing reads it.

---

## 3. The semantic half returns a negative that the workflow reads as a permission

`no_gap_found` is the outcome of a refute-only exercise. The Boundary-reviewer is asked to
*construct* a change that satisfies every entry while failing the reconstruction. Success produces
an artifact. Failure produces nothing — "a described gap counts and no artifact is owed" (`:219`).
An unsuccessful attempt to construct a counterexample does not establish that none exists, and
cannot be made to.

The briefing states the general form: **"a reviewer asked to find problems will supply problems.
'Stop when the reviewer reports nothing' is not a terminating condition"**
(`satisficing-boundary-briefing.md:266`). The freeze predicate reads a null result from exactly
such a reviewer as the licence to commit.

Two qualifications, because the design is better than that summary suggests and both are load-bearing.

- **This is not silence, and it is not the naive form the briefing indicts.** The reviewer is
  anchored to its own persisted blind reconstruction rather than to the Author's statement of intent
  (`:220`), which is a real external referent authored before the boundary was supplied — the
  anti-drift move the briefing calls for, applied inside the boundary loop. `no_gap_found` is an
  explicit negative result from a scaffolded, cross-family, adversarial exercise. It is a much
  better negative than "the reviewer had no comments."
- **It is still a negative.** No amount of quality in the exercise converts the absence of a
  constructed counterexample into positive evidence of coverage. That is the Rice-theorem boundary
  the briefing names (`§2.2`): no stopping rule can be a completeness rule, and any terminating rule
  is a resource or aspiration rule. The problem is not that the exercise is weak, and — as §5 works
  out — not that its result is badly named. It is that the freeze reads that result as a positive and
  records neither the reading nor the result.

---

## 4. Coupling coverage: acceptance is declared, the consequence is not

`entails` is the closest thing in the bundle to the briefing's "finite set of binary leaves." Its
key space is produced by deterministic extractors run by the Orchestrator against the sketch's named
surface (`:194`), so the denominator is not a model's opinion. Every edge is mapped to an obligation
id or to the literal `uncovered` (`:103`), and the Linter "rejects the bundle if any coupling edge is
neither mapped nor marked `uncovered`, so coverage is declared rather than assumed" (`:196`).

The acceptance of `uncovered` is deliberate and stated. What is missing is any consequence attached
to it. `uncovered` has exactly four workflow mentions — `:103`, `:195`, `:196`, `:217` — and none
attaches one. The linter agrees:

```js
if (target !== 'uncovered' && !entryIds.has(target)) {          // :982
  add('E_ENTAILS_UNRESOLVED', at, ...);
} else ok('E_ENTAILS_UNRESOLVED', at);
```

`uncovered` at every edge lints clean, with no finding and no warning.

**`:217` makes this active rather than passive.** The Boundary-reviewer "checks every `entails` edge
… an edge it rejects becomes `uncovered`." The one actor positioned to notice under-coverage
*produces* uncovered edges as an output, into a freeze that reads no threshold against them.

### A permissive countermodel

Read `:217` against `:221`. The amend loop is keyed to "a gap," which `:219` defines as the
described-change exercise, and `:221` says the Author "amends the exploited **entry**." An edge
rejection is a different event and triggers none of `:221`–`:224`. So a single reviewer pass can
reject every `entails` edge *and* return `no_gap_found`, and both gates read clean: the Linter
because `uncovered` is legal at every edge, the review because no change was described. The bundle
freezes with zero declared coverage.

This is **a reading of prose that leaves the post-rejection transition undefined, not a permission
the design grants**. The distinction matters: the defect is an unspecified transition, and the fix
is to specify it, not to reverse a decision someone made.

### What the fixture corpus does and does not establish

The `uncovered` branch is exercised, but only at one coverage level. Seventeen of the twenty-seven
`bad-*.yaml` fixtures use `uncovered` at all, and all seventeen carry an identical two-edge shape —
`CPL-1: PRES-1`, `CPL-2: uncovered` — inside a manifest already failing for another reason.
(`bad-entails_alien_key.yaml` adds a third key on top, which is the defect it exists to catch.)
`valid.yaml:79-81` maps every edge. Nothing runs the branch at zero coverage, and no clean fixture
asserts that a fully-uncovered map is accepted.

The corpus brackets the property at 50% and 100% without ever asserting it at either end. Compare
`bad-no_floor.yaml`, which exists precisely to assert the empty-floor warning — the project does
write that kind of test when it wants the behaviour pinned.

---

## 5. Four neighbouring precedents, with their differences intact

The repository has met this evidence state — a result that establishes less than a reader would take
it to establish — four times, and answered it four different ways. They are **neighbouring
precedents, not instances of one rule**: they sit at different stages and carry different
consequences, and only one of them touches a consumer. Flattening them would overstate the case, and
the section below works out which part of each does and does not transfer.

| Precedent | Where | Stage | Consequence |
| --- | --- | --- | --- |
| `abstain` outcome | `lint-boundary.js:245`, use site `:669` | Interpretation-pair lint | Recorded, non-gating; distinguishes "ran and refuted nothing" from "passed" |
| `W_NO_FLOOR` | `lint-boundary.js:790`, fixture `bad-no_floor.yaml` | Boundary lint | Warning on a declared-empty coverage axis; never silent |
| Sensitivity-probe reclassification | [`discharging-the-boundary.md`](../discharging-the-boundary.md)`:82-86`, `lint-boundary.js:1064` | Post-freeze discharge | Two halves in one rule: the obligation changes class rather than the gate claiming an unperformed proof, **and** until it does, the Gate records `no_sensitivity_probe` rather than accepting the edge |
| `unable_to_verify` | `discharging-the-boundary.md:148`, `:152` | Post-freeze review | A third verdict that invalidates the boundary rather than blaming the change |

Two of the four sit *after* the freeze, so they are precedents for the epistemic pattern rather than
evidence that the pre-freeze design is already inconsistent with itself.

The `abstain` site is worth quoting, because it is the nearest thing to this bug that the codebase
has already diagnosed — nearest, not identical, for the reason worked out below. The comment at
`:240`–`:245` defines the outcome as "the check had a domain, ran, and refuted nothing …
distinct from `pass`, which for a refute-only check would assert something it cannot establish." And
`:647`–`:651` records why it was introduced:

> Recording `pass` was the one affirmatively misleading outcome available: the stage read it as "the
> two readings are anchored together", and two semantically opposite reconstructions both citing
> `description#1` produced exactly that. The manufactured-agreement failure, reproduced inside the
> check built to detect it.

The linter never sees `no_gap_found` — the adversarial pass is a model actor and the clean pass is a
workflow branch at `:61`. So the accurate claim is not that the code misclassifies it.

Nor is it that the adversarial pass lacks a name for its own negative. Two earlier drafts of this
section got this wrong in successive directions — first calling the freeze "the only result with no
outcome vocabulary at all," then calling `no_gap_found` a *missing* third value for "ran, and
established nothing." Both are false, and the second is false in an instructive way.

**`no_gap_found` is exactly that name, and it is a careful one.** It says a gap was not found. It
does not say no gap exists, and the reviewer that returns it is not overclaiming. The defect is not
in the token:

> The design names the state correctly and then consumes it as a permission. `:61` reads
> `no_gap_found` — an honest report that a search failed — as the licence to commit and freeze, and
> `:228` records neither that the value was consumed nor which of the two values it was.

**The `abstain` case is a partial analogy, and the part that does not transfer is the instructive
one.** `:647`–`:651` records two defects, not one: "**Recording** `pass` was the one affirmatively
misleading outcome available" is an output that asserted what the check could not establish, and
"**the stage read it** as 'the two readings are anchored together'" is a consumer that promoted it.
The remedy was producer-side — emit `abstain`, so there is nothing left to promote.

Read carefully, that precedent argues for the option §6 rejects. It should, and the disanalogy is
what decides between them:

| | `W_ANCHOR_DISJOINT` before the fix | The adversarial pass today |
| --- | --- | --- |
| What the producer emits | `pass` — **false**; asserts an establishment it cannot make | `no_gap_found` — **true**; a search failed, and it says so |
| What the consumer does | Reads it as agreement | Reads it as licence to freeze |
| Where the remedy has to land | The producer, because a false output must be corrected wherever it is read | The consumer, because there is no falsehood upstream to correct |

A producer emitting a false value has to be fixed at the producer; that is not optional and
`abstain` is the right shape for it. A producer emitting a true value that a consumer over-reads is a
different repair, and adding a second true value beside the first does not perform it.

Pressing that distinction across the whole table gives a result worth stating against interest.
**Three of the four are purely producer-side**: `abstain` and `unable_to_verify` add an output value,
and `W_NO_FLOOR` emits a warning where the linter previously emitted nothing. Each fixes what is
emitted, and none of them is a precedent for the remedy §6 recommends.

**The sensitivity probe is the exception, and it is mixed.**
`discharging-the-boundary.md:82`–`:86` carries both halves in one rule: the obligation is
reclassified as `independent_review` "instead of letting the gate claim a proof it did not perform" —
producer-side — *and* "Until that reclassification, the Gate records `no_sensitivity_probe` rather
than accepting the edge" — consumer-side, with `E_NO_SENSITIVITY_PROBE` at `lint-boundary.js:1064`
implementing the refusal. A consumer is told to refuse rather than accept, which is exactly the shape
§6 asks for.

So the honest position is narrower than "no precedent" and narrower than "four precedents." One
consumer has been constrained this way before, and the constraint differs from the one recommended
here in what triggers it: the Gate refuses because the producer's output is **deficient** — a probe is
missing — not because a correct output is being over-read. That difference is the whole distance
between the nearest precedent and the recommendation, and §7 records it rather than closing it.

---

## 6. Recommendation — a design judgment, not a finding

The evidence above settles the diagnosis. It does not settle the remedy, and what follows is a
judgment about which remedy to build. Three candidates were on the table.

**Reject: a third Boundary-reviewer verdict** — and reject it knowing that the three producer-side
precedents superficially favour it, which §5 works through. Per §5 it answers the wrong half of the
problem.
`no_gap_found` already names "the search failed" accurately, so an `unable_to_probe` alongside it
adds a synonym rather than information, and it hands a model a third option in the exact place the
briefing warns that a reviewer's output is shaped by what it is asked for. The `unable_to_verify`
precedent works at `:148` because there the reviewer is adjudicating *entries against a diff* and can
cite a typed pointer; here it would be adjudicating its own failure to imagine something. Different
evidential situation, same words.

**Reject as the primary move: a `W_` coverage code.** The coverage figure is worth having, but a
warning is the wrong carrier. `lint-boundary.js:28` defines the prefix as "recorded, non-gating,
**has no available remedy**" — and an uncovered edge has an obvious remedy, which is to author an
obligation that covers it. `W_NO_FLOOR` fits the prefix because where no registry exists there is no
remedy (`the-boundary-bundle.md:104`); a coverage warning would not. Using `W_` here would erode a
distinction the codebase currently holds.

**Recommend: make the freeze carry its own grounds.** `boundary_frozen` should be required to
record what licensed it, and be refusable when it cannot be produced:

| Field | Derived from | Available when |
| --- | --- | --- |
| Coupling coverage as a declared ratio — edges mapped over edges extracted | The manifest | Lint time (`:199`) |
| Count of `registry_selections` at the pinned revision | The manifest | Lint time (`:199`) |
| Mechanical eligibility: ownership containment and handoff field completeness | The Orchestrator's check | Eligibility time (`:202`) |
| Semantic eligibility: the reviewer's handoff **feasibility** judgment | The review record | Review time (`:218`) |
| Rounds run, and the reviewer family that returned `no_gap_found` | The run record | Freeze time (`:228`) |
| That `no_gap_found` was the value consumed — an honest report that a search for a counterexample failed, establishing nothing about coverage | The run record | Freeze time (`:228`) |

The two eligibility rows are there because §1 shows both produce results the freeze never records,
and the mechanical one is a genuine positive. A rationale that claimed to carry the grounds while
omitting them would have the defect this document is about.

The last row must not say the reviewer *refuted* a gap. Nothing was described, so there was nothing
to refute, and a rationale phrased that way would reintroduce — in the record built to prevent it —
the promotion §5 identifies.

This subsumes the useful half of both rejected options: it carries the coverage number without
misusing `W_`, and it constrains the consumer of `no_gap_found` without giving the reviewer a third
verdict to choose. Per §5 the reviewer's own vocabulary is already adequate; it is the reader that
needs the work.

### The consumer test, applied to this recommendation

`the-boundary-bundle.md:241` sets the standard and it should be turned on this proposal:

> **a cost estimate looks like the answer to a scoping question** … The cheap test is whether anyone
> has written down the *consumer*.

Canonicalization was withdrawn for failing that test after four mentions and two rounds of costing.
A freeze rationale that nothing reads is documentation, and would deserve the same withdrawal.

The obvious reader is the pre-freeze Linter, and it cannot be — not for most of the record. The
Linter runs at `:199`; the adversarial review runs at `:209`–`:224`. Rounds run, reviewer family, and
the consumed `no_gap_found` value do not exist when the Linter executes, so it cannot check them.
The rationale needs three readers at three stages, and the manifest-derived half is the only part
the Linter can own:

1. **The Linter, at `:199`** — the coverage ratio and the selection count, both computable from the
   manifest. This is the ordinary manifest-field case and needs no new machinery.
2. **The Orchestrator, at the freeze step `:228`** — the run-record half. The Orchestrator is already
   the actor there, already "no model," and already performs mechanical work at that point: it
   computes the digest, appends the event, and calls `attach_reference`. Refusing to emit
   `boundary_frozen` without a complete rationale is one more mechanical precondition on a step that
   already has several.
3. **The offline Calibrator, after the run.** `autonomous-workitem-workflow.md:236` already has an
   actor that "reports the interpretation escalation rate and its breakdown, because a design that
   escalates every item and a design that escalates none are both failures and neither is visible
   from inside one run." A freeze rationale makes the freeze rate measurable in exactly that way.
   Today `boundary_frozen` is unfalsifiable — the same defect `:104` names when it rejects inferred
   provenance for making "the claim unfalsifiable."

### Completeness of the record does not constrain the freeze, and one gate is needed

The harder objection is that a *complete* rationale reading `0 of N` still freezes. Requiring the
record to exist constrains whether the freeze is **explained**; it does not constrain whether the
freeze **happens**. On its own the recommendation is an auditability improvement wearing a gate's
clothes, and that should be said rather than finessed.

One gate closes the degenerate case without inventing a tunable threshold, and the repository already
argues for it in the same document. `:125`–`:126`:

> `traces[]` must be non-empty. Carrying an empty list satisfies "the entry carries traces" and
> anchors nothing, so the list is required to have at least one member.

Zero coupling coverage is that pattern exactly: it satisfies "coverage is declared" and covers
nothing. **A bundle with N extracted coupling edges and none covered should not freeze.** What this
deliberately does *not* do: it sets no percentage, no aspiration level, and nothing that could
ratchet with results. It rejects one value, the one where the declaration is known to establish
nothing, and leaves every other ratio to the record and the offline grader.

Three things have to be settled before that sentence is a specification rather than a slogan.

**The denominator, and why `0 of 0` is out of scope.** `coupling[]` is required to be *present*
(`:102`) but never required to be non-empty. The contrast is deliberate elsewhere in the same
manifest — `non_goals` carries "Non-empty" at `:99` and `E_NONGOALS_EMPTY` at `lint-boundary.js:744`,
`entries` carries `E_NO_ENTRIES` at `:746` — and `coupling` has no counterpart, so an empty list lints
clean and the coverage loop at `:974` never executes. A gate phrased as "no covered edge" therefore
collapses two different states. `0 of N` is a bundle that found coupling and covered none of it.
`0 of 0` is a bundle asserting there is no coupling to cover, and the manifest cannot distinguish
that from an extraction that never ran.

`0 of 0` is an **absence**, and the repository's own rule about absences governs it —
`lint-boundary.js:44`–`:46`: "A terminal conclusion drawn from an ABSENCE needs a second, independent
reconstruction before it ends anything, because one artifact cannot tell 'the item states nothing'
from 'this reading found nothing'." One artifact cannot tell "this change couples to nothing" from
"no extractor ran over the surface." So the gate is scoped to `N > 0` and **`0 of 0` is left open**,
named here rather than smuggled in. Closing it needs extraction provenance — a record that the
extractors ran and over what surface — which the bundle is structurally ready for, since the coupling
analysis is already a digest-referenced asset (`:80`–`:82`). Designing that is not attempted here.

**The repair path, which an `E_` does not supply at this stage.** `lint-boundary.js:27` defines the
prefix as "retryable — the Author can fix it; **earns another lint round**," and lint rounds are
bounded by `MAX_LINT_ROUNDS` at `:201`. A finding raised by the Orchestrator at `:228` is outside
that loop and would earn nothing. The transition it needs already exists one section up: `:221`–`:224`
is the amend path, where the Author amends, the Orchestrator invalidates and re-derives every
downstream asset, and a fresh reviewer runs, bounded by `MAX_BOUNDARY_ROUNDS`. A zero-coverage freeze
attempt belongs there — and by `autonomous-workitem-workflow.md:204`, exhausting that cap is a
handoff, not a cheaper freeze.

**The gate must run at freeze time, and that makes the `:217` fix a prerequisite rather than a
sibling.** §4's countermodel is why: `:217` lets the Boundary-reviewer convert a mapped edge to
`uncovered` *after* the Linter at `:199` has run. A check that fires only in the lint pass is defeated
by the exact sequence that motivated it — clean at `N of N`, then a review that rejects every edge,
then a freeze at `0 of N` that nothing re-read. So the ratio is computed twice, once by the Linter on
the authored manifest and once by the Orchestrator at `:228` on the post-review state, and the second
evaluation is the one that gates. The same reasoning `:222`–`:223` already applies to amendments,
where downstream assets are re-derived "because an amendment can move the mechanism surface; without
it the frozen digest faithfully preserves stale coupling."

But a freeze-time refusal needs somewhere to go, and where an edge rejection routes is exactly what
`:217` leaves undefined. **So the gate does not close §4 on its own.** It closes §4 only once the
post-rejection transition is specified, which reclassifies that item from a separate smaller fix to a
prerequisite of this one.

The residual concession stands: between `1 of N` and `N of N` the rationale informs and does not
gate. A coverage ratio is a declaration rather than a measurement (§7), so gating on a threshold
would price something the number cannot bear.

### The prerequisite, which is smaller than the recommendation

`:217`'s post-rejection transition should be specified first: an edge rejected by the
Boundary-reviewer either re-enters the amend loop at `:221` or does not, and the prose should say
which. An earlier draft of this document filed that as a separate, smaller fix that could be done
independently. It is smaller, but it is not independent — the freeze-time gate above has no repair
path until it exists, so this is the prerequisite and not a sibling.

It is also worth doing on its own terms, whatever happens to the recommendation. It is a defect in a
stated rule rather than a design question, and it is the whole of §4's countermodel.

---

## 7. What this does not fix

Stated plainly, because the briefing's own closing move is to name the residual risk rather than let
it be discovered.

- **It does not make the freeze complete.** Rice's theorem and the four empirical ceilings in
  `satisficing-boundary-briefing.md:544` are unmoved. A recorded rationale makes the freeze
  *auditable and falsifiable*, not correct. The briefing's verdict — "expect a defensible threshold,
  not an optimal one" — governs here too.
- **A declared coverage ratio is not a coverage estimate.** It is the fraction of edges an extractor
  found that an obligation claims to cover. Edges the extractor missed are invisible to it, and the
  corpus supplies no substitute: capture-recapture needs a closed population this loop does not have
  (`:620`). The number must be read as a declaration, not a measurement, or it becomes the
  false-assurance failure it was meant to prevent.
- **An empty coupling list is still an unguarded freeze.** The gate in §6 is scoped to `N > 0`
  because `0 of 0` cannot be told apart from an extraction that never ran, and `coupling[]` is the one
  list in the manifest with no non-empty check. A bundle that declares no coupling therefore freezes
  with no coverage claim to make, which is the same hole one level down. It is named rather than
  closed, and closing it needs extraction provenance rather than another threshold.
- **It moves the failure mode rather than removing it.** A freeze that records confident grounds can
  still rest on a reconstruction that was precise and wrong — the risk
  `satisficing-boundary-briefing.md:674` names, measured by SWE-bench Verified at 38.3%
  underspecified statements, and by TICK at 9-of-10 checklist questions passed against a human score
  of 2/5. The rationale gives the offline grader something to grade. It does not do the grading.
- **The recommended mechanism is only partly precedented here.** §5 works out that three of the four
  neighbouring cases were fixed at the producer. The fourth, the sensitivity probe, does constrain a
  consumer — the Gate refuses the edge rather than accepting it — but it fires on a *deficient*
  producer output, a missing probe, rather than on an over-read correct one. Nothing in the codebase
  yet refuses a value that is true. The argument for doing so is the disanalogy in §5, and that
  argument is doing real work rather than resting on an established pattern.
- **None of the countermeasures here is validated anywhere in the corpus.** They are hypotheses
  aimed at measured failures, in a domain where "application evidence is nearly absent" (`§4`).
