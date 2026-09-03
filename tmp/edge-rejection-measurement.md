# Did any reviewer reject a coupling edge? — measured, for item 3

Answer to gus's two questions on `tmp/work-items.md` item 3. Measured against the pass records at
`53d86a7`.

> **Revised after the decision.** The operator took the recommendation and filed it as issues 169–173,
> with **169 carrying the decision not to build edge review**. The decision is to **mark `:217`
> unbuilt and keep the design text with a reopening condition** — not to delete it, which is what §8
> originally recommended. Three things in the first draft were wrong or are now stale and are
> corrected in place: the reopening trigger (hal's catch, and it was a real error), the
> "unreachable" claim in §8, and item 1's status as a live prerequisite in §3–§4. Sections 5 through
> 7 — the measurement, the consumer audit, and the domain tally — stand unchanged.

## 1. The measurement

**pass 8 cannot answer this, and not because the read is hard — the data does not exist.**
`docs/passes/pass8/` holds six files and no `.jsonl`. Its five review rounds were never captured;
`pass8/notes.md` says so in as many words ("five rounds of unrecorded review behind it"). pass 8 is
permanently silent on this question.

**pass 9 is the only recorded review, and it contains zero edge rejections.** Scanning both
reviewers' verbatim reports (idx 516 and 551 in `stage2-stream.jsonl`) for `CPL-\d+`, `entails`,
`coupling`, and `uncovered`:

| | `CPL-` ids | `uncovered` | `entails` | `coupling` |
| --- | --- | --- | --- | --- |
| Round 1 | none | 0 | 0 | 0 |
| Round 2 | `CPL-5` | 1 | 0 | 0 |

Round 1 never touched the edge map at all. Round 2's single mention is an **endorsement of the
drafter's existing declaration**, in its answer to question 2 rather than as a finding:

> The remaining open things I found are next-phase questions … whether `docs/refinement-loop.md` has
> to change — and that last one is already declared as `CPL-5: uncovered` rather than assumed away.

`CPL-5` was authored `uncovered` by the drafter (`docs/passes/pass9/coverage.md:63`, and the note
"`CPL-5` is declared uncovered rather than papered over"). No edge moved from covered to uncovered
in either round.

## 2. Why, and this is the part worth writing into the item

The reason is structural, not a sampling accident. **`the-boundary-bundle.md:217` is not implemented
in the shipped skill.** `agent-work-item/SKILL.md:224`–`:232` specifies the review as exactly two
questions — entry decidability, and a blocking question about what is wanted. Neither mentions
coupling edges. There is no step at which a reviewer *could* reject one. Edge review exists in the
design document and nowhere in the thing that produced all five committed boundaries.

So for those five, **post-review state is identical to authored state**, and gus's measurement —
3/3, 1/1, 4/4, 7/8, 5/6 — *is* the post-review figure. Item 3's AC4 cannot stop any of them.

hal's objection was correct about the design and does not bite the artifacts: `:217` can move an
edge, and nothing that produced these boundaries runs `:217`.

**The caveat that has to travel with the answer.** This holds only while `:217` is unimplemented.
It is not "reviewers examined the edges and endorsed them" — it is "nobody was asked." The moment
step 8 gains an edge question, the state item 3 judges becomes reachable and the compatibility
question genuinely reopens for anything re-reviewed under the new step.

Item 4 does **not** create that state. Its ledger is total over `entries[].id` — the entry domain.
Edges are a different key space (`coupling[].id`, keying `entails`). So the compatibility answer is
stable across items 1, 2, 4 and 5; only a deliberate `:217` implementation disturbs it.

## 3. What this does to item 3

- **The open question closes.** Replace it with the measured answer plus the caveat above.
- **"What must keep working" should name a revision.** The guarantee is about five specific files in
  the state they are in at `53d86a7`, not about committed boundaries in the abstract — because the
  property is contingent on `:217` being absent, which is a fact about a point in time.
- ~~"Ready for the agent stage" goes from two counts to one.~~ **Superseded by the 169 decision.**
  With edge review unbuilt, item 3's `AC4` — the post-review clause — has no live case at all, and
  the item 1 dependency below is no longer a live prerequisite. Both are now contingent on the
  reopening condition in §8 firing.

## 4. The item 1 dependency was real under the build assumption, and is now dormant

**Read this section as conditional.** It was written to answer "is the dependency real if edge review
is built," and the answer to that question has not changed. But 169 decided not to build it, so
nothing produces a reviewer edge rejection, and item 1 defines the routing for an event that cannot
occur. The dependency is dormant rather than wrong: it becomes live again if and only if the
reopening condition in §8 fires. The analysis below is kept because that is the ordering anyone
revisiting the decision will need.

The committed companion already argues it, and specifically records reversing its own earlier
position — which is the strongest form this answer can take. In
`boundary-completion-freeze-evidence.md`, the paragraph beginning "But a freeze-time refusal needs
somewhere to go":

> But a freeze-time refusal needs somewhere to go, and where an edge rejection routes is exactly what
> `:217` leaves undefined. **So the gate does not close §4 on its own.** It closes §4 only once the
> post-rejection transition is specified, which reclassifies that item from a separate smaller fix to
> a prerequisite of this one.

And under its heading "The prerequisite, which is smaller than the recommendation": "An earlier draft
of this document filed that as a separate, smaller fix that could be done independently. It is
smaller, but it is not independent — the freeze-time gate above has no repair path until it exists,
so this is the prerequisite and not a sibling."

The mechanism, stated once: `lint-boundary.js:27` defines `E_` as "retryable — the Author can fix
it; **earns another lint round**", and lint rounds are bounded by `MAX_LINT_ROUNDS`
(`the-boundary-bundle.md:201`). A refusal raised by the Orchestrator at the freeze step (`:228`) is
outside that loop and earns nothing. Item 3's gate without item 1 is a refusal with no destination.

**Could item 3 carry it?** Only by absorbing item 1's AC1–AC3 whole, and that is the wrong move on
two counts. Item 1 is worth doing whether or not item 3 ever lands — the companion says so, "It is
also worth doing on its own terms" — so folding it in makes its value contingent on a
decision it does not depend on. And the merged item would change two stages (review at `:217`–`:224`,
freeze at `:228`) for two different reasons, which is a lumped item: not resolvable independently,
which is the exact failure `agent-work-item`'s own AC3/AC4 lineage exists to exclude.

Keep the split. Keep the order.

---

# Addendum — the `:217` build-or-leave-unbuilt choice

Operator asked for a choice, on the grounds that a boundary is consumed by agents. Two questions
answered first, then the choice.

## 5. Is there any record of the unchecked map biting? No, and one real case says it did not

**No post-freeze event exists anywhere.** `boundary_invalid` (4 hits) and
`coupling_found_after_freeze` (2 hits) appear in `docs/passes/` only at idx 114 of pass 9's stream,
which is the agent *reading `autonomous-workitem-workflow.md`* as a tool result. Zero
`mechanical_gate_passed`, zero `pr_opened`. Every boundary in the repository carries a `NOT FROZEN`
marker. The discharge stage has never run, so its reason codes cannot have fired.

**But there is one real consumption case, and it is better evidence than the absence.** `gh-158` was
implemented against a frozen-in-practice boundary — commit `a384a5f`: "After this commit the
boundary is the standard: if implementation turns out inconvenient it is escalated, not edited."

| | |
| --- | --- |
| Edges | one — `CPL-1 [consumer] modus/scripts/lint-boundary.js — every drafted manifest is its input` |
| Mapped to | `AC-1`, "a boundary drafted by the prompt lints without failures" |
| `non_goals` fence | "any change to lint-boundary.js or to the manifest schema" |
| Implementation | 48 files, 6,416 insertions, **`lint-boundary.js` untouched** |
| Escalations | none |

The map was right, the fence held, nothing bit. That is n=1 on a one-edge map — the easiest possible
case — so it establishes that nothing has stressed the mechanism, not that the mechanism is
unnecessary.

## 6. Consumer audit of pass 9's six edges — I went looking for a false authorization

The failure `:217` uniquely catches is a **wrongly covered** edge: I look it up mid-change, get a
hit, and continue with no obligation actually constraining that consumer. A wrongly *uncovered* edge
is loud — it is declared and visible. So the silent case is the one worth pricing, and I checked all
six against the entries they claim.

| Edge | Cover | My verdict as consumer |
| --- | --- | --- |
| `CPL-2` `human-work-item` returned mode → `OB-9` | blockers name the criterion or question | sound, direct |
| `CPL-3` `lint-boundary.js` → `OB-16` | a drafted boundary reports no linter failure | **sound** — see below |
| `CPL-4` [spec] the freeze → `OB-14` | the record names the approving person | sound; the obligation resolves the spec conflict |
| `CPL-6` existing boundary files → `OB-13` | they all still lint | sound, direct |
| `CPL-5` `refinement-loop.md` → `uncovered` | — | declared, and round 2 endorsed it |
| `CPL-1` `agent-work-item/SKILL.md` → `OB-12` | hand-written step list is a subset of the drafted one | **partial**, not false |

**I expected `CPL-3` to be the false positive and it is not.** My hypothesis was that a coupling edge
to `lint-boundary.js` mapped to "the drafted manifest lints" fails to protect the *linter's own*
behaviour under change — which `OB-13` covers and `OB-16` does not. That reading is wrong, because
the edge `kind` is `consumer`: the direction is *`lint-boundary.js` consumes what the change
produces*, not *the change modifies the linter*. `OB-16` covers exactly that risk. The typed `kind`
field is doing real work here, and it is what let me settle the question in a minute.

`CPL-1 → OB-12` is the one I would call narrow. Step-list equivalence constrains one property of the
skill-to-drafter relationship; it does not cover the general risk that changing the drafting
mechanism breaks the skill documenting it. As a consumer I would not be *misled* by it — I would read
it as a thin cover and proceed carefully. That is a quality observation, not a false authorization.

**Score: 5 sound, 1 narrow, 0 false.** That argues for gus's position, and I record it having gone
looking for the opposite.

## 7. Does an unchecked `entails` map hurt me in practice? Honestly, no — and here is why

I have consumed these boundaries and design documents all session. The `entails` map has not once
been what failed me. What has failed me repeatedly is the entries-and-prose domain, and every
instance was a claim with no check behind it:

- `boundary-prose.md:139`–`:140` claims a script enforces word caps and banned words; none does.
- `refinement-loop.md:196` claims the decision-can-be-false check is one of step 8's two questions;
  it is not.
- The companion's own §2, before correction, called `exempt` the "ran and established nothing" state,
  which is `abstain`.

Three defects, three in the entries/prose domain, zero in the edge domain. That is consistent with
the measured record: pass 9's false blanket claim, `OB-7`, `OB-13` — all entries.

The structural reason the map is cheap for me: it is a **lookup table consulted on discovery**, so it
only costs me when I discover a consumer *and* the table misleads me. At one to six edges over a
small surface I can audit the whole map myself in about a minute, which is what §6 is. The map stops
being cheap to self-audit somewhere well above six edges — and that, not a review step, is the real
trigger.

## 8. The choice: D — mark `:217` unbuilt, keep the design text

**Build nothing. Record the mismatch. Spend on item 4.** Four reasons, in descending strength:

1. **Building `:217` without items 1 and 3 makes the design strictly worse.** This is the sequencing
   argument, and it is what carried the decision.

   **Corrected from the first draft, which overclaimed.** I wrote that the companion's §4
   countermodel was "currently unreachable, because the mechanism that produces uncovered edges does
   not exist." That is wrong, and it contradicts my own §1: the **Author** produces `uncovered` edges
   today — `the-boundary-bundle.md:195`, "an explicit `uncovered` marker where none does" — and pass
   9's `CPL-5` is exactly one. An all-uncovered map lints clean with no finding and no warning
   (the companion's "`uncovered` at every edge lints clean, with no finding and no warning"), so a
   zero-coverage freeze is reachable right now, by authoring.

   What survives is narrower and still decisive. The distinctive thing `:217` adds is a route that
   arrives **after every mechanical check has run**: the Linter computes coverage at `:199`, and a
   reviewer rejecting edges at `:217` changes it afterwards, with nothing re-reading the ratio. So
   `:217` does not create the zero-coverage hole; it creates a second path to it that no existing
   gate can see. Closing that needs item 3's gate at freeze time, which needs item 1's routing,
   which needs `:217`. A three-item chain whose intermediate states are worse than the status quo.
2. **Zero measured failures in the edge domain**, against three found this session in the entries
   domain, plus §6's audit and §5's one real consumption case.
3. **Step 8's design is explicit restraint** — `SKILL.md:231`–`:232` refuses a question specifically
   because it "will send you in circles." Two questions to six on item 5 is already the budget spent.
4. **`modus` has no users.** Per the README's first constraint, mechanism built ahead of a measured
   failure is the expensive kind of duplication.

**The companion edit D requires, restated for "unbuilt" rather than "deleted".**
`discharging-the-boundary.md:111`–`:114` says the Orchestrator "accepts only an exact, **reviewed**,
frozen hit in `entails`." With edge review unbuilt, nothing reviews the edges, so that word describes
design intent and not behaviour — and `autonomous-workitem-workflow.md:108` is the repo's own rule
against exactly that: "every paragraph asserting that a field does work must name the check that
makes it do the work."

My first draft said "drop the word." Keeping the design text is the better decision and it also
supplies the better fix, because the repo already has the mechanism: `workflow:119`–`:123` — claims
that do not name a check "are recorded as limits rather than as behaviour," with the two surviving
limits "recorded where their consumers live." So "reviewed" becomes a **third recorded limit in
`discharging-the-boundary.md`**, which is precisely where its consumer lives, alongside test-case
collectability. Same pattern, same file, no new convention.

**The reopening trigger — corrected, and the first version was a real error.**

`coupling_found_after_freeze` is the wrong signal, and I had it wrong. `discharging:106`–`:107` fires
it "on any consumer whose obligation coverage is **not already declared**" — a **missing** edge, one
the extractors never produced or the Author never mapped. Edge review under `:217` reviews *declared*
mappings and can only move covered → uncovered. It cannot discover a consumer nobody extracted. So
that escalation would never have been prevented by the thing 169 declines to build, and citing it as
the reopening condition would have licensed a rebuild on evidence that does not bear on it.

The signal that actually means the unreviewed map bit us is on the **accepted** path.
`discharging:111`–`:114`: the Orchestrator "accepts only an exact, reviewed, frozen hit in `entails`
… Anything unmatched, ambiguous, or undecided is `boundary_invalid`." A wrongly-*covered* edge does
its damage by being accepted — the implementer looks it up, gets a hit, and continues. So:

> **Reopening condition:** a `boundary_invalid` attributable to an `entails` hit the Orchestrator
> accepted. That is the wrongly-covered case, which is the only case edge review uniquely catches.

**The hand-audit size trigger is dropped entirely.** It had no threshold, and inventing one would put
a number in the record that nobody chose — the defect the companion names when it refuses a coverage
percentage, and the same reason item 3 sets no proportion. §6 stands as an observation about why the
map was cheap to audit at six edges; it is not a trigger.

---

# Addendum 2 — issue 170: what state a refused freeze reaches

Answering gus's two questions on AC4 (a required fact missing from the record) and AC5 (a check that
had to run did not).

## 9. Yes — the design already decides the caller-input case, three ways, and none is a refusal

This is the substantive answer, and it means **AC5 as written would reverse existing decisions rather
than fill a gap.**

**(a) Declare the limit and name the production input that closes it.** In
`autonomous-workitem-workflow.md`, the paragraph beginning "Retroactive pass, then" — claims that
name no check "are recorded as limits rather than as behaviour," and the two surviving limits are
recorded "where their consumers live." **Locator resolution is one of the two.** It is not an open
defect; it is a decided limit with a named owner.

**(b) Degrade the check to what the available input supports.** `tracker-and-forge-ports.md`, at
"Field-level addressing is a coarser but still meaningful degradation when a tracker cannot expose
individual parts" — for this exact check. And the sibling limit in `discharging-the-boundary.md`:
"Until runner integration exists, the reference linter can only require a non-empty `case_id`; its
fixture list catches slips rather than lies. This slice owns that production input because the
runner, not the manifest, supplies the collected-case list."

Both say the same thing: when the caller cannot supply the input, the check narrows and says so. It
does not refuse.

**(c) Catch it before the run starts, not at the freeze.** `tracker-and-forge-ports.md`: "An absent
declaration is a **configuration error, not a discovery to make after an item was selected**." And
stage 1 already implements that shape — "Orchestrator (no model): refuses to start if the configured
tracker does not declare the `claim` capability and no external claim store is configured."

That is the precedent AC5 should use. **A missing check input is a refusal to *start*, not a refusal
to *freeze*.** If the freeze will need a part list and no source of one is configured, the run should
never have claimed the item — which is (c) verbatim. Refusing at the freeze picks the wrong target:
it blames the boundary for an environment defect, after the whole cost of authoring has been spent.

Two more shapes worth having in view, neither a stop state:

- **`provisional`** is the outcome for "halt spending, do not end the run, route to the actor who can
  settle it." Its stated case is different, but the shape is exactly right: "The cost argument for
  stopping early is preserved … while the conclusion waits for the evidence that decides it."
- **The principle that decides ownership.** `reviewer_reconstruction_unusable` and
  `author_reconstruction_inadequate` "exist so that a failure by either reconstructor is never
  reported as a property of the item." A caller-input defect reported as a boundary defect is that
  same error one actor over.

**On AC4, a different answer: it should not have a stop state at all.** The Orchestrator both writes
the record and performs the freeze, and both are "no model." A missing rounds-count is therefore a
bug in a deterministic component, not an outcome the workflow should have a name for. Naming it
would be naming a defect as a state — and the stage ceiling exists to refuse exactly that kind of
growth, requiring "the same causally diagnosed failure class in two or more independent pilot runs,
or one confirmed hard-harm event." An assertion that fails loudly is the right treatment.

**The dependency this creates.** Every committed boundary carries `E_LOCATOR_UNRESOLVED` exemptions,
so AC5 as written refuses all five, and the fix is not in any boundary — it is `domestique-asx`,
giving the CLI a flag. AC5 is blocked on asx exactly as item 3 was blocked on item 1. Worth
recording as a dependency rather than discovering at implementation.

## 10. What I would need told, as the agent receiving the refusal

**One thing above all others: that it is not mine, stated as a prohibition rather than implied.**

An AC5 refusal is **Author-shaped**. It arrives in the Author's turn, about the Author's artifact,
with an `E_` code whose contract is "the Author can fix it; earns another lint round." Handed that
and nothing else, I will look at `E_LOCATOR_UNRESOLVED`, see that it wants a part list, and
**construct one from the item text** — which makes the locator checks pass and converts a caller
defect into a silent green. That is precisely the failure the README's three-outcome rule exists to
prevent, recreated by an agent trying to be useful.

That is not a hypothetical about my disposition; this skill already records the pattern twice. A run
labelled a claim `stated` on the strength of its own earlier inference, which is why the provenance
enum and the "quote the item's words" rule exist. And a run met a contradiction, "reconciled it with
an unstated assumption, drafted, and recorded the assumption as though the item had stated it."
Given a gap and no prohibition, the agent fills it and records the fill as though it were supplied.

In priority order, then:

1. **That I must not supply the missing input.** Explicit. Everything below is secondary to this.
2. **The name of the input and whose it is.** The existing message already does this well — "this is
   the tracker adapter's input and its absence is declared rather than assumed."
3. **What the check would have established had it run.** For this one: citations were checked for
   presence but not resolution. That is a precise statement of residual risk, and without it I will
   either assume the worst and redraft, or assume the best and proceed.
4. **Whether what I produced is preserved.** The `provisional` pattern's whole point. If the boundary
   survives, say so, or I will redo authoring that was never in question.
5. **One sentence naming what the human is being asked to do** — the design's own handoff shape.

**What I would not need: the count.** "Sixteen exempt" told me nothing actionable. The message text
told me everything — which is the operator's rule arriving from the other side. The number had no
reader; the sentence did.

---

# Addendum 3 — AC5 is mis-specified, and measurably so

gus's hypothesis was that AC5 may be mis-specified rather than merely unrouted. It is, and the case
is stronger than the `E_LOCATOR_UNRESOLVED` instance that prompted it. Advice, not a decision.

## 11. "A check that did not run" is three states, and one of them is the opposite

Every `exempt` site in `lint-boundary.js`, by the condition that guards it:

| State | Sites | Guard | What it means |
| --- | --- | --- | --- |
| **Caller withheld an available input** | `E_LOCATOR_UNRESOLVED`, `E_EDGE_CASE_NOT_COLLECTED` | `parts === null`, `collected === null` | the domain exists in the world; the caller did not pass it. Both comments: "supplied by the caller — a fixture here, [the adapter / the runner] in production" |
| **No domain in this artifact** | `E_CLAIM_PROVENANCE_ALIEN_KEY`, `E_CLAIM_PROVENANCE_UNDECLARED`, `E_CORRECTION_ALIEN_TARGET`, `W_ANCHOR_DISJOINT`, `X_MOVES_SURFACE_DISPUTED` | `standalone`, `A.size === 0` | nothing to check, nothing owed. "this comparison has no domain" |
| **Ran, matched, and the rule permits it** | `E_SELF_TRACE` | `self && isSelection` | "self-trace exempted because `t` is declared in `registry_selections`" |

The third row is the one that settles it. `E_SELF_TRACE`'s exemption does not mean the check did not
run — it means the check **ran, found the condition, and the rule grants an exception**. The comment
above it says so: "When this exemption was silent it read exactly like approval."

And it is not a corner case. Across the fixture corpus plus the committed boundaries, exactly two
exempt codes ever fire, and `E_SELF_TRACE` is one of them — in 22 files.

## 12. Why that makes AC5 a criterion to rewrite rather than route

An entry may self-trace **only** when its id is declared in `registry_selections`, which is how the
manifest declares a selected floor invariant. So `E_SELF_TRACE`-exempt is the signature of a boundary
that **selected a floor and traced it correctly** — the shape `the-boundary-bundle.md` requires when
it says floor invariants are "selected … never authored per issue," and the absence of which is what
`W_NO_FLOOR` warns about.

**AC5 gated on "a check that had to run did not" would therefore refuse every boundary that selects a
floor invariant, for having complied with a documented rule.** That is not an unrouted refusal
needing a destination. It is a criterion that fires on compliance.

None of the five committed boundaries shows this yet — all five carry `W_NO_FLOOR`, so none selects a
floor and none self-traces. The state is live in 22 fixtures and absent from the artifacts only
because no real boundary has yet done the thing the design prefers. AC5 would start refusing the
moment one did.

## 13. What I would do instead — the producer-side split first

The repository has met this exact shape twice and fixed it the same way both times: `abstain` was
split out of `pass` because "for a refute-only check [`pass`] would assert something it cannot
establish," and `provisional` was split out of `fail` to halt spending without ending a run. Both are
producer-side, and both were driven by the README's own rule that a two-valued answer to a
three-valued question is the expensive kind of wrong.

`exempt` is now that defect recursing one level down: three states under one token. So:

1. **Split the caller-withheld case out of `exempt`.** It is mechanically identifiable — the two
   sites are the two `=== null` guards — and it is the only one of the three that names an owner and
   a remedy. Nothing else in AC5 can be stated precisely until this exists, because "did not run" has
   no referent today.
2. **Restate AC5 as a recording criterion, not a gate.** Something closer to the draft it came from:
   *for any check that did not run, the record names which of the three states applies and, where an
   input was withheld, whose input it was.* Every committed boundary satisfies that the moment
   `domestique-asx` lands, and it needs no refusal and no new stop state.
3. **If a gate is still wanted, put it at pre-flight, not at the freeze** — per §9(c), which is the
   existing precedent: "an absent declaration is a configuration error, not a discovery to make after
   an item was selected."

That ordering also answers the routing question by dissolving it. A pre-flight refusal needs no
freeze-time destination, and a recording criterion needs no refusal at all — so AC4's and AC5's
"what state does the run reach" question only ever had one live case, and it was the one 169 already
declined to create.

---

# Addendum 4 — issue 174, measured

gus inferred that step 7's "`exempt` must be zero" would make a drafter remove a correctly selected
floor. I tested it against `modus/tests/fixtures/valid.yaml`, the one fixture that selects a floor
(`registry_selections: ["INV-2"]`) and self-traces it. **The inference is confirmed, and the gradient
is worse than a preference.**

## 14. The incentive gradient, measured

Step 7's criterion is `failures` empty **and** `exempt` zero, with warnings explicitly non-gating.

| Drafter state | `exempt` | `failures` | `warnings` | Step 7 |
| --- | --- | --- | --- | --- |
| **A** — as authored: floor selected, self-traced, correct | 1 `E_SELF_TRACE` | 0 | 0 | **FAILS** |
| **B** — drop the selection, keep the entry | 0 | 1 `E_SELF_TRACE` | 1 `W_NO_FLOOR` | FAILS |
| **C** — delete the entry, keep its mandate | 0 | 1 `E_UNANCHORED_MANDATE` | 1 `W_NO_FLOOR` | FAILS |
| **C′** — delete the entry **and** its mandate | 0 | 0 | 1 `W_NO_FLOOR` | **PASSES** |

**The correct boundary fails and the degraded one passes.** The entire penalty for destroying a floor
obligation is one warning that the same step declares "recorded, not gating."

**My first run of this test was unfair and misled me.** I tried C without dropping the orphaned
mandate, got `E_UNANCHORED_MANDATE`, and briefly concluded the escape was closed and gus's inference
refuted. It is not — C′ passes cleanly. Recorded because the near-miss is the interesting part:

**Both halfway states are strictly worse than either end.** Dropping the selection turns the
exemption into a real failure; dropping the entry alone unanchors its mandate. So there is no gentle
slope and no partial retreat. A drafter iterating under `MAX_LINT_ROUNDS` either exhausts — escalating
`criteria_not_lintable`, which blames the *criteria* for a defect in the skill's own lint rule — or
discovers the two-part deletion. Both outcomes are bad; only one of them looks like success.

## 15. And the destruction would be invisible

`W_NO_FLOOR`'s message reads "no entry is declared registry-selected, so every obligation here was
authored for this item and the manifest carries no floor … an empty list is not a claim that none was
available."

All five committed boundaries already carry it. So a manifest that reached step 7 by way of C′ is
**indistinguishable in the record** from one that never had a registry to select from. The warning
cannot tell "no floor existed" from "the drafter deleted the floor to satisfy a lint rule."

That is the same could-not-check-versus-checked collapse this session keeps finding, one level down
again — and it is what makes 174 worse than a bad incentive. The incentive is measurable; its effect
would not be.

The narrow fix follows from §11's split and needs nothing new: step 7's rule wants the
caller-withheld count, not the `exempt` count. `E_SELF_TRACE` and the no-domain sites were never what
that rule was reaching for — its own stated rationale, "a check declared it had no domain and did not
run," is true of exactly one of the three states.

## 16. The contradiction was committed, green, and needed no mutation test

Both of us built a mutation to prove §14, and both got it wrong first. Neither of us needed to.
`modus/scripts/__tests__/lint-boundary.test.js` already asserts the whole thing, and passes:

```js
test('the valid manifest is clean', () => {
  expect(bCodes('valid.yaml')).toEqual([]);
});

test('every exemption in the valid manifest is visible and named', () => {
  // INV-2 self-traces and is declared registry-selected. …
  expect(outcomes('valid.yaml', 'exempt'))
    .toEqual(['E_LOCATOR_UNRESOLVED', 'E_SELF_TRACE']);
});
```

The canonical **valid** manifest is asserted clean *and* asserted to carry two exempt codes, one of
them from a correctly declared registry selection. `SKILL.md` step 7 says `exempt` must be zero. Two
committed artifacts assert opposite things about the same file, and `npm test` is green.

Two further details make it sharper. The `describe` block is named **"evaluated, not merely
not-failed"**, and its header comment says `toEqual([])` "cannot tell 'every check ran and passed'
from 'a check never ran'" — the block exists *to fix* the could-not-check collapse, and step 7
reintroduced it from the other side by reading every exemption as not-run. And the three-state
distinction was already documented there: the next test scopes itself with "The no-domain exemptions
are a different subject and asserting their absence would make this test about something it is not
about."

So the distinction in §11 was not a discovery. It was written down in a test comment. What was
missing was anyone reading step 7 against it — and that is a cheaper claim for 174 to rest on than a
two-part mutation neither of us built correctly on the first attempt. Cite the assertion; do not
rebuild the mutation.
