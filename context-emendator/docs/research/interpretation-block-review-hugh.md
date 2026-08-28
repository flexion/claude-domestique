# Review — the `interpretation` block, uncommitted at `8e5c95f`+

Reviewer: hugh. Target: the uncommitted working tree over `8e5c95f` on `chore/satisficing-boundary`.
Untracked artifact — keep it or delete it.

Reproduced first: 95 tests pass, 68 codes, `npm run validate:plugins` clean. All three claims hold.
Every finding below is backed by a probe I ran against the working tree; the probes are named `Pn` and
listed at the end. The linter was mutated during the review and restored — `git diff --stat` confirms
the only file I wrote is this one.

**Verdict.** The design is sound and the machinery is better than the last round's. One finding is
serious enough to fix before this lands, and it is the one you named first: the counterweight to
`moves_surface` does not exist. Three more are load-bearing. Two of your seven worries are unfounded
and I say which.

The unifying finding, because it recurs in all three terminal codes:

> **Every terminal condition fires on the Author's honest declaration and is avoided by its optimistic
> one, and nothing compares the declaration against a second source.** `X_CORRECTION_CHANGES_SCOPE`
> fires on `moves_surface: true`. `X_GAP_UNRESOLVABLE` fires on `filled_from: unresolved`.
> `X_ITEM_UNANCHORED` fires on declaring nothing `stated`. In each case the run continues if the Author
> reports optimistically, and ends if it reports honestly. That gradient is the whole risk surface of
> this block, and the stage-3 reconstruction reaches none of the three by comparison.

---

## 1. `moves_surface` — yes, you moved the unfalsifiable claim one field over

You asked the right question and the answer is the unwelcome one. The counterweight does not reach the
field.

What the code actually does. `moves_surface` is read in exactly one place — `c.moves_surface === true`
→ `X_CORRECTION_CHANGES_SCOPE`. `lintInterpretationPair` compares only `stated` `item_locator` refs; it
never looks at `corrections[]`. So nothing anywhere compares the Author's `moves_surface` against any
second judgment.

`P2` is the sharp version. I set the Author's correction to `moves_surface: false` and the reviewer's
correction *about the same `about`* to `true` — a flat contradiction between two independent readings of
the same fact. The pair check reports:

```
TERMINAL X_CORRECTION_CHANGES_SCOPE  /reviewer/corrections/0
```

That looks like the counterweight working. It is not. It fired because the **reviewer's own**
declaration was `true` and its interpretation is linted under the same rules — not because the two
disagree. The four cases:

| Author | Reviewer | Result |
| --- | --- | --- |
| `true` | anything | terminal at stage 2, run over |
| `false` | `true` | terminal — but from the reviewer's own X\_, not from the disagreement |
| `false` | `false` | clean |
| `false` | never finds the contradiction at all | **clean** |

The fourth row is the common one, because the reviewer reconstructs blind and has no reason to
converge on the same contradiction. And the second row's protection is accidental: it survives only
because the reviewer's artifact is allowed to terminate the run — which is itself a defect (§2, `P8`).
Suppress terminals on the reviewer's side, which is arguably correct, and the counterweight vanishes
entirely.

So the document's own sentence — "no second opinion from the actor that benefits from a different
answer" — describes something the implementation does not do.

**Fix, and it is the same shape as the `registry_selections[]` fix that worked.** Replace a single
actor's declaration with a comparison between two independent ones. The reviewer already has the item
and repo access and already writes `corrections[]`, so it can declare `moves_surface` independently.
Add to `lintInterpretationPair`: for any `about` both sides name, `moves_surface` disagreement →
`E_MOVES_SURFACE_DISPUTED`, escalating `intent_ambiguous` rather than resolving in the Author's favour.
That is mechanical, uses machinery already present, and makes the declaration falsifiable instead of
merely consequential.

The asymmetry that makes it work: the Author benefits from `false`, the reviewer has no stake in the
run continuing. That is exactly the argument the document already makes and then does not implement.

Second-best option if you want it stronger: derive it. A correction moves the surface iff re-running
the stage-2 sketch derivation with the correction applied changes the named path set — and stage 3
already re-runs those derivations after an amendment. Mechanical, but it needs the sketch, which comes
later in stage 2 than corrections do.

---

## 2. The terminal/retryable split — you asked whether there is another such pair. There are three

Your guard is right and incomplete. You made `anyStated` count *before* the support checks so a
badly-**cited** `stated` claim cannot suppress the anchor. Good. But the enum check above it returns
early:

```js
const p = obj.provenance;
if (!PROVENANCE.includes(p)) {
  add('E_ENUM_PROVENANCE', at, ...);
  return;                        // <-- returns before anyStated is set
}
...
if (p === 'stated' || p === 'stated_unverified') anyStated = true;
```

**`P1`: four capitalisation typos produce a terminal stop.** I changed `stated` → `Stated`, `inferred`
→ `Inferred`, `contradicted` → `Contradicted` — nothing else:

```
         E_ENUM_PROVENANCE  /interpretation/goal
         E_ENUM_PROVENANCE  /interpretation/problem
         E_ENUM_PROVENANCE  /interpretation/claim_provenance/C1
         E_ENUM_PROVENANCE  /interpretation/claim_provenance/C3
TERMINAL X_ITEM_UNANCHORED  /interpretation
```

A pure spelling slip ends the run non-retryably, with a reason code that says the item has no owner.
This is the failure you guarded against in the citation direction and left open in the typing
direction — so the fix is the completion of your own principle, not a change to it:

> **A terminal conclusion may not be drawn from a document that has retryable defects.** Suppress every
> `X_` finding in an interpretation that carries any retryable finding.

One guard, all three terminal codes, and it subsumes the two below.

**Pair two — `P5`: `filled_from: unresolved` on a first draft is terminal.** The literal does double
duty: "established to be unsettleable" and "not filled in yet". Because terminals consume no lint
round, an Author who writes an honest placeholder on round one ends the run with no round to replace
it. Either the document must state that `unresolved` means *established* unsettleable and never a
draft state, or the enum needs a `pending` value that is retryable. Same incentive gradient: a *wrong*
`filled_from` pointer continues the run; the honest `unresolved` ends it.

**Pair three — `P8`: the reviewer can terminate the run, and the reason code blames the item.** The
reviewer's standalone interpretation is linted with the same rules including terminals. A reviewer that
reconstructs with nothing `stated` produces:

```
TERMINAL X_ITEM_UNANCHORED  /reviewer
```

with the message "no part of this boundary is anchored in what the item says; the goal has an owner and
it is not this run". That is a reviewer failure reported as an item property, and there is no retry —
`MAX_BOUNDARY_ROUNDS` with a fresh reviewer covers the ungameability round, which happens after
reconstruction. One bad reviewer reconstruction is a terminal stop attributed to the requester.

Terminals should be evaluated on the Author's interpretation only. The reviewer's side wants the
retryable checks and a fresh-reviewer retry.

**And a fourth condition that is terminal in fact and retryable in form.** `E_ANCHOR_DISJOINT` is a
plain failure, so it earns another lint round. But no authoring round can fix it: the remedy is for one
side to change its reading, which is the contamination the stage exists to avoid. That is precisely the
defect you built the terminal class to prevent — "a cap spinning on something no further round could
change". The document says the Linter "reports" it and never says what happens next. Either it escalates
`intent_ambiguous` like its semantic sibling, or it is a warning. It cannot be a retryable failure.

**One gap at the state level, not the code level.** The autonomous stop states are `ready_for_merge`,
`handoff_pending`, `boundary_invalid`, `escalated`, `ineligible`. A terminal interpretation stop is not
a cap reached (`escalated` — and you say explicitly it consumes no round), not an eligibility rejection
(`ineligible`), and not a new obligation or `unable_to_verify` (`boundary_invalid`). **The three new
terminal conditions plus `intent_ambiguous` map to no row in that table.** Your own line — "not failures
of the run in the way the others are" — is the argument for giving them one.

---

## 3. Stage 3 ordering — contamination is real, and there is a one-line fix

Yes, step 2 contaminates step 3, and the document already contains the fix in the wrong bullet.

The divergence bullet is written correctly: the reviewer describes a change that "satisfies **its own
reading** of the goal while failing the Author's". That anchors to the artifact captured before
contamination. Two bullets later the ungameability exercise reverts: "satisfies every entry literally
while failing **the item's evident intent**." By then the reviewer has received the Author's
interpretation, so "the item's evident intent" is the Author's statement of it. Anchor that bullet to
the reviewer's own recorded reconstruction — the artifact is already persisted, so this costs nothing
and it is what makes the ordering matter.

Second, a bullet is now false as written. The reviewer "receives neither the Author's reasoning nor any
candidate change" — but it received the Author's interpretation two bullets earlier, and the
interpretation *is* the Author's reasoning about intent: goal statement, provenance, gaps, corrections.
Either narrow the claim to the candidate change, or say the reasoning about *mechanism* is withheld
while the reasoning about *intent* is not.

**Third, and this is the substantive one: your calibration is anchored to the wrong Song condition.**

The blockquote reasons that two independent reconstructions should differ near-randomly (r̄ ≈ 0.24), so
a similarity threshold would escalate everything, so both halves of the test must be weak. But r̄ ≈ 0.24
is Song's **Original** condition, where evaluators generate rubrics independently *including their
structure*. Your design mandates a shared instrument: both sides use the same `interpretation` shape,
the same four-value provenance enum, the same five support kinds, the same linter. That is much closer
to Song's **5-Dim** condition, and Song measures dimensional standardisation alone at r̄ ≈ 0.62
(`:894`, `:1041`).

Two consequences, both from your own citation:

- Expected divergence is materially lower than you assumed, so the test can afford to be stronger than
  you made it. The escalate-everything fear is calibrated to a condition your design does not create.
- `readings_agree` is weaker evidence than you say it is. Song's point is that 62% of agreement is
  attributable to the shared instrument rather than shared judgment — so agreement between two sides
  using your identical schema is substantially manufactured by the schema.

The second half of that is worth stating in the document, because it is the sharper version of the
warning you already wrote.

---

## 4. `E_ANCHOR_DISJOINT` — the question is mis-premised, and the check has a one-word bug

**The tracker requirement is not caused by this check.** `E_STATED_NO_LOCATOR` requires every `stated`
and `stated_unverified` part to cite an `item_locator`, and those locators have to resolve against
something for the provenance system to mean anything at all. Stable addressable parts are load-bearing
for the whole `interpretation` block. So the requirement is already paid for, and
`E_ANCHOR_DISJOINT` is a nearly-free rider on it rather than the thing that bought it. Keep the
requirement; judge the check on its own merits.

On its own merits it has a real bug. `locators()` scans only `o.provenance !== 'stated'` — it ignores
`stated_unverified`.

**`P4`/`P9`: two reconstructions citing completely different parts of the item — `description#1` versus
`comment#7` — come back CLEAN**, because I marked both sides `stated_unverified`. The check exempts
itself, and the exemption message says the situation "is `E_STATED_NO_LOCATOR` or `X_ITEM_UNANCHORED`
on that side rather than a disjoint reading". **Neither fired.** `stated_unverified` satisfies
`E_STATED_NO_LOCATOR` (it has a locator) and sets `anyStated` (so no `X_ITEM_UNANCHORED`). The
exemption's stated rationale does not hold.

This matters because it disables the check on exactly the items the design is built for. Your premise
is that items arrive unrefined, so much of a real interpretation will be `stated_unverified` — and the
more unrefined the item, the more likely the check self-exempts. Scan `stated` **or**
`stated_unverified`: both require an item_locator by your own rules and both mean "the item says it".
One word, and the check becomes available on its motivating case.

After that fix I would still keep it as a **warning** rather than a failure, for the reason in §2: it
has no available remedy. It can only refute, as you say — and it refutes locator overlap, which is not
reading agreement. Two sides can cite identical locators and read them oppositely.

---

## 5. `stated_unverified` — the rule is real, and it is not sufficient

The provenance story checks out in git, and I verified it rather than taking it. `BUG-4471.yaml` was
committed at `c51884a` carrying `C2: "regression since ~July — unverified secondhand"` and the source's
own answer already present as `W-C2`, a `watch` tracing `C2`. That predates `stated_unverified`
entirely. Under a three-member enum the second half of that sentence has nowhere to go. **You did not
invent a rule to justify a block you had already decided to add** — the transcription forced it, and
the register did the job it exists for.

But the rule does not carry the weight you put on it, for two reasons.

**`P3`: one extra trace defeats it.** A `must` tracing only the `stated_unverified` claim fires
`E_UNVERIFIED_GROUNDS_MUST`. Add one coupling-edge trace and it is clean:

```
P3a  must traces ONLY the stated_unverified claim     E_UNVERIFIED_GROUNDS_MUST
P3b  same must, plus one coupling-edge trace          CLEAN
```

Coupling-edge traces are the normal case, not an exotic one — `entails` requires every coupling edge to
be covered, and `INV-2` in your own valid fixture traces `CPL-1`. So in practice most gating entries
already carry the trace that defeats the rule.

The gap is between the prose and the predicate. The document says the rule catches a must that "gates on
an item assertion nothing corroborates". The code asks whether the entry has *any* corroborated anchor.
Those differ exactly when an entry has both — and a coupling edge does not corroborate `C2`, it is a
different anchor entirely.

**`P6`/`P7`: `gaps[]` is decorative — the thing you added `stated_unverified` to avoid.** The document's
showcase argument is that `AC-1` asserts 240 seconds against an item with no number, "so the fixture
carries a `gaps` entry naming where the 240 came from, and without it that threshold is an assumption
wearing a `quantity` object."

I emptied `gaps[]`. Clean. I replaced it with an entry about an unrelated element pointing at
`README.md`. Clean. `AC-1` keeps `quantity: {value: "240", unit: "seconds", ...}` and nothing anywhere
connects a quantity to the gap that filled it. So the sentence is false as written: delete the gaps
entry and the threshold is exactly the assumption the document says the entry prevents.

That is RubricBench `:1278` — False Precision Bias — which you cite as the failure this block exists to
prevent, and it currently has no mechanical counterpart. The fix is small and it is where I would put
the effort: move the provenance onto the quantity. `quantity.filled_from` as a typed support pointer,
required whenever `quantitative: true`. Then the 240 cites its origin at the point of use, the check is
local, and `gaps[]` becomes a summary of something enforced rather than an unenforced parallel record.

So the answer to your question: the rule is real and honestly derived, one of the two mechanisms you
claim makes the block load-bearing is escapable by adding a trace, and the other does not exist yet.

---

## 6. Eighth stage — you got the call right, for the reason you gave

Applying the document's own definition: a stage is "a persisted workflow state with its own entry and
exit condition", and "headings, artifacts, agents, and operations inside a state do not count". The
reconstruction is persisted and has entry and exit conditions, which is what makes it feel
stage-shaped. But the terminal exit inside stage 2 is an *operation with a stop*, and stage 2 already
had one of those in the conclusive eligibility check. By the definition it does not count, and the
promotion rule independently forbids promotion without two diagnosed pilot runs or one hard-harm event.
Zero runs, so the rule decides it. **Right call, correctly reasoned.**

Two things I would add rather than change. First, the argument you make in the document is "it is what
stage 2 was already doing, named" — which is true and is the strongest form. Keep it. Second, the
honest counterweight belongs next to it: reconstruction now has its own linter pass, its own actor
pair, its own code prefix, and its own escalation family, and it is the largest thing inside any stage.
That is worth recording as the thing to watch, because if a pilot run diagnoses a reconstruction
failure class twice, this is where the promotion evidence will already be sitting.

The concrete debt from keeping it inside stage 2 is the stop-state table gap in §2. If the terminal
stops are stage-2 operations, stage 2 needs a named autonomous stop state for them.

---

## 7. Size — the comparison to 10,484 is a red herring, and the real tell is elsewhere

The 24-phase version was not cut for length. It was cut for **state count and ceremony** — 24 persisted
states where seven do the work. The stage ceiling was the fix, and it held: this is still seven stages.
Comparing 10,205 to 10,484 measures the wrong axis and I would drop the comparison rather than defend
it.

The real tell is the distribution:

| Material | Words | Share |
| --- | --- | --- |
| The seven stages | 3,345 | 33% |
| Schema and pre-stage apparatus | 3,904 | 38% |
| Reference implementation, stop conditions, appendices, offline | 2,104 | 21% |

`## The boundary file` plus its nested `### interpretation` is **2,151 words** — now the largest section
in the document, larger than any stage and larger than all seven stages' bullets combined. Growth did
not stop when the ceiling went in; it relocated from stages to schema prose, and nothing constrains
schema prose.

There is one duplication I can name concretely. The interpretation rules are stated in **three
registers**: `## The item is evidence, not a specification` (878 words, the justification), `###
interpretation` (the field and provenance tables), and the stage-2 bullets (the Author's actions). The
"Three failure modes" table and the terminal-conditions table are the same three facts cut two ways —
Unanchored *is* `X_ITEM_UNANCHORED`. That is the one place I would merge rather than trim.

My actual recommendation is not a word target. It is that this is now two documents under one cover: a
**workflow** (stages 1–7, ports, stop conditions, safety exception) and a **schema reference** (the
boundary file, interpretation, provenance, terminal codes, the reference implementation). Split them and
each is judged on its own — a 6k workflow and a 4k schema reference are both proportionate. One 10.2k
document whose largest section is a schema is the shape that drew the "disproportionate" criticism last
time, even though the cause is different now.

And if you want the schema's analogue of the stage ceiling — the constraint that actually worked — it is
this: **every paragraph asserting that a field does work must name the check that makes it do the
work.** `gaps[]` in §5 is the first thing that rule catches.

---

## Citations — checked at file:line, not trusted

Six of eight are exact and well-aimed. One is right in substance and pinned to the wrong line. One
drops a clause that cuts against the use.

| Citation | Verdict |
| --- | --- |
| RubricBench `:1172` | ✓ exact. "devolves into a standard implementation checklist", "penalizes a correct refusal (Response B) for 'missing code'" — the quote continues onto `:1173`, so cite `:1172-1173`. Source says "hallucinatory", you wrote "hallucinated", outside the quote marks |
| RubricBench `:1278` | ✓ exact. "validates the correctness of the math performed on arbitrary assumptions (e.g., 3%)" and **False Precision Bias** is the paper's own term |
| RubricBench `:1289` | ✓ exact. "struggle to operationalize rubric-implied behaviors such as abstention or rejection when tasks are indeterminate or infeasible" |
| PaperBench `:1447` | ✓ exact, both halves, and it genuinely supports "the choice has an owner" — the paper's remedy was collaborating with the paper authors |
| Song `:87` | ✓ substance, ✗ line. See below |
| TICK `:1878` | ✓ accurate paraphrase of the checklist inheriting the false premise |
| TICK `:1961` | ✓ exact. "9/10 checklist questions answered YES. Overall score: 2/5, Bad." |
| TICK `:1883` | ⚠ ellipsis removes a material clause. See below |

**Song `:87` — right claim, wrong line.** Your stage-3 JUSTIFICATION asserts "sharing rubric structure
alone lifts inter-judge agreement from r̄ ≈ 0.24 to r̄ ≈ 0.62". I went looking for a units error, because
`:87` says only that sharing dimension names "restores 62% of total agreement" — a percentage, not a
coefficient. **You are right and I was wrong to suspect it**: the paper states the progression
explicitly at `:894` ("The progression from r̄ ≈ 0.24 to r̄ ≈ 0.62") and `:1041` ("r̄ = 0.24 → 0.62"). The
two numbers coinciding is a coincidence the paper itself trades on. Cite `:894` or `:1041` for the
progression and keep `:87` for the collapse; as it stands the line supports a weaker claim than the
sentence makes. And see §3 — this citation undercuts your calibration more than it supports it.

**TICK `:1883` — the dropped clause is contrary to the use.** The full sentence is: "demonstrating that
answers to generated checklists alone should not be used to score responses **in human evaluation**, but
also showing that **human evaluators are robust to unhelpful or misleading checklists**."

Two problems. The scope qualifier "in human evaluation" is material — the paper's claim is about human
annotators working from generated checklists, and you then write "This workflow does exactly that" about
a pipeline whose gates are mechanical checks and a model reviewer. And the dropped second clause is
evidence *for* one of your three mitigations: the human scored it 2/5 correctly despite answering 9/10
YES, which is the offline hand-graded sample working. You list that mitigation and say "none has been
run" — but this source contains a data point for it. Quote the full sentence; it strengthens the
paragraph rather than weakening it.

---

## The guard question from last round, closed and reopened one notch

Credit where it is due: **your necessity guard is stronger than the one I asked for.** I re-ran the
mutation attack from the addendum against the new suite:

| Mutation | Result |
| --- | --- |
| Delete `X_CORRECTION_CHANGES_SCOPE` entirely | **2 tests fail** ✓ |
| Weaken it with a spurious exemption on `resolution !== 'item_wrong'` — the §2.6 shape | **2 tests fail** ✓ |
| Weaken `E_UNVERIFIED_GROUNDS_MUST` to skip `pre_merge` | **1 test fails** ✓ |

Last round eight checks were deletable in silence. Now deletion *and* weakening are both caught,
because the exact-code-set assertions on the negative fixtures fail when a code stops firing on its own
fixture. That is the right construction.

The residual limit, and it is the same shape one notch smaller. **`M4`: a weakening keyed on a value the
fixture does not carry evades all 95 tests.**

```
if (c.moves_surface === true && c.resolution !== 'ambiguous')   ->  95 passed
```

`bad-correction_moves_surface.yaml` carries `resolution: item_wrong`, so the newly-exempted region is
one the fixture never occupies. The terminal check is now silently off for every `ambiguous`
correction — and `ambiguous` is the resolution most likely to accompany a genuine scope move, since it
means nobody knows which reading is right.

The guard that closes it is the one you already have in a weaker form: `generated — closed enums are
total`. Extend it so each terminal check is exercised at **every value of every enum it could be keyed
on** — 3 resolutions × `moves_surface` true/false is six cells, and the same crossing for
`filled_from` and for the four provenance values. Generated cells cannot be evaded by choosing an
unoccupied region, because there are no unoccupied regions.

---

## Ranked

1. **§1** — `moves_surface` has no counterweight. `E_MOVES_SURFACE_DISPUTED` in the pair pass. This is
   the one I would not land without.
2. **§2** — suppress `X_` findings in an interpretation carrying any retryable finding; evaluate
   terminals on the Author's side only; give the terminal stops a row in the stop-state table; decide
   what `E_ANCHOR_DISJOINT` actually does.
3. **§5** — `quantity.filled_from`, required when `quantitative: true`. Without it `gaps[]` is
   decorative and `:1278` has no mechanical counterpart.
4. **§4** — one word: scan `stated_unverified` in `locators()`, and fix the exemption message that
   claims a coverage it does not have.
5. **§3** — anchor the ungameability bullet to the reviewer's recorded reconstruction; fix the
   now-false "neither the Author's reasoning" bullet; re-calibrate against Song's 5-Dim condition.
6. **Citations** — `:894`/`:1041` for the Song progression; restore the full TICK `:1883` sentence.
7. **M4** — cross the terminal checks against the closed enums.
8. **§7** — merge the three-register duplication; consider the split.

§6 needs no change. §1's premise and §2's suspicion were both correct; §4's premise was not.

---

## Probes

Run against the uncommitted working tree. The linter was restored after every mutation.

| Probe | Content | Result |
| --- | --- | --- |
| `P1` | four provenance values capitalised — a pure typo | `E_ENUM_PROVENANCE` ×4 **plus TERMINAL `X_ITEM_UNANCHORED`** |
| `P2` | Author `moves_surface: false`, reviewer `true`, same `about` | terminal fires on `/reviewer` from its own declaration, not from the disagreement |
| `P3a` | `must` tracing only a `stated_unverified` claim | `E_UNVERIFIED_GROUNDS_MUST` |
| `P3b` | same `must` plus one coupling-edge trace | **CLEAN** |
| `P4` | both sides `stated_unverified`, citing `description#1` vs `comment#7` | **CLEAN** — self-exempted |
| `P5` | one gap left `filled_from: unresolved` on a first draft | TERMINAL `X_GAP_UNRESOLVABLE` |
| `P6` | `gaps[]` emptied, `AC-1` keeps `value: "240"` | **CLEAN** |
| `P7` | `gaps[]` replaced with an unrelated element citing `README.md` | **CLEAN** |
| `P8` | reviewer reconstructs with nothing `stated` | TERMINAL `X_ITEM_UNANCHORED` on `/reviewer` |
| `P9` | as `P4`, inspecting the record | `E_ANCHOR_DISJOINT` outcome `exempt`, with a rationale that does not hold |
| `M1`–`M3` | delete / weaken three checks | all caught, 1–2 tests fail each |
| `M4` | weaken keyed on `resolution !== 'ambiguous'` | **95 passed — evades** |

---
---

# Addendum — the two residuals, at 126 tests

Answering only the two you left open. 126 tests reproduce.

**First, a disclosure, because I broke something of yours.** My first mutation sweep timed out at two
minutes and was killed before its restore line, leaving one injected mutation in your uncommitted
`lint-boundary.js`:

```js
if (!mandates.includes(name)) (e.verifier !== 'mechanical') && add('E_UNKNOWN_MANDATE', ...)
```

My second sweep then read its baseline from that mutated file, so my first set of numbers was computed
against a linter with one check already weakened. I caught it because `git diff --stat` had drifted from
508/11 to 509/12, removed it, verified byte-identity against a clean copy, and re-ran the entire sweep
from the verified-clean baseline with `process.on('exit'|'SIGINT'|'SIGTERM')` restore handlers. The
contaminated numbers were 106 real / 38 vacuous; the clean ones are 107 / 37, so it barely moved the
result — but I re-ran rather than assume, and the numbers below are the clean ones. Your file is now
byte-identical to its pre-review state and the suite is back at 126.

---

## 1. `ARTIFACT_ADEQUACY` — you are right to distrust it, and right to have built it

**The split is real. The criterion is not the one doing the work.**

First: your correction to my §2 is right and I withdraw the literal version. "Terminals on the Author's
side only" does discard the reviewer's `moves_surface: true`, which is the input §1 needs, and the two
fixes cancel. You caught that by implementing it, which is the only way it was going to be caught.

But "adequacy versus item" is not the property your code is keying on. Look at the triggers:

| Terminal | Fires on |
| --- | --- |
| `X_CORRECTION_CHANGES_SCOPE` | `c.moves_surface === true` — a value the Author wrote |
| `X_GAP_UNRESOLVABLE` | `g.filled_from === 'unresolved'` — a value the Author wrote |
| `X_QUANTITY_ASSUMED` | `filled_from === 'unresolved'` — a value the Author wrote |
| `X_MOVES_SURFACE_DISPUTED` | two written values differing |
| `X_ITEM_UNANCHORED` | `anyStated === false` — **the absence of any written value** |

The operative property is **assertion versus absence**, and it predicts your list exactly with no
judgment call. The reason it is the operative one: an assertion is *attributable* to whoever wrote it,
so it survives being moved between artifacts — the reviewer's `moves_surface: true` is a finding about
the item precisely because someone asserted it, and who asserted it does not change what it says. An
absence is not attributable. "Nothing here is `stated`" is indistinguishable between *the item has
nothing* and *this reconstructor found nothing*, so it cannot be carried across artifacts at all. That
is exactly the behaviour you implemented; it is just not the reason in the comment.

Three reasons to prefer the sharper criterion, and the third is why I think your instinct fired:

1. **It is decidable from the source.** Does the guard test a value, or the absence of one? Inspectable.
   "What is this code *about*?" is not decidable, which is what makes a one-member list feel arbitrary.
2. **It extends without new judgment.** Future `X_` on a declared value → portable, carry it. On a
   missing declaration → non-portable, reclassify. No case-by-case argument.
3. **Under your own criterion the code is misclassified, and it takes an unstated second argument to
   rescue it.** `X_ITEM_UNANCHORED` is *named* for the item. Its message says "no part of this boundary
   is anchored in what the item says; the goal has an owner and it is not this run" — an item claim. The
   Three-failure-modes table defines Unanchored as "nothing states what the item is for, and the
   repository cannot supply it" — an item property. So three independent places in your own design say
   this code is about the item, and the classification says it is about adequacy. That gap is what your
   suspicion is detecting. It is a naming bug, not a classification bug, and the assertion/absence
   criterion makes it visible as one.

**What I would change, all small.** Rename the list to what it tests — `ABSENCE_TRIGGERED`, or
`NON_ATTRIBUTABLE` if you prefer the reason to the mechanism. Put the criterion in the comment as a
*test* future codes are measured against, not as a conclusion about this one. Rename the code
`X_RECONSTRUCTION_UNANCHORED`, because the item-level claim is only earned once corroborated — see
below. And make the classification falsifiable: five terminals, five assertions that each is portable
or non-portable across the reviewer side. Right now the split is asserted in a comment, which is the
same shape as the exemption that got you in `§2.6` two rounds ago.

### The residual that matters, and it is cheap

`A1`: an Author reconstruction that anchors nothing produces `FAIL X_ITEM_UNANCHORED` with **no other
retryable failure in the pass**, so your suppression policy correctly does not fire and the terminal
stands. On an absence. From one actor. At stage 2.

`A2`: I gave the pair pass an unanchored Author side and a well-anchored reviewer side. The record shows
`X_ITEM_UNANCHORED /reviewer` with outcome `pass` — the reviewer *did* anchor. So the artifact that
distinguishes *the item has nothing* from *the Author's reconstruction was inadequate* is fully
specified, evaluated, and recorded. It is produced at stage 3, and the stage-2 terminal ends the run
before stage 3 happens. **The disambiguating evidence exists in the design and is ordered out of
reach.**

This is the one terminal where corroboration is both necessary and nearly free, and it is necessary for
exactly the reason your split identifies: absence is not attributable, so one sample of it decides
nothing. Make the Author-side `X_ITEM_UNANCHORED` **provisional**: it stops the mechanism spend — which
was the entire cost argument for linting the interpretation early, and it is preserved — but not the
run. Skip the sketch and coupling analysis, go straight to the stage-3 reconstruction. Both sides
unanchored → terminal, and now corroborated by two independent readings, which is a far stronger basis
for telling a requester their item has no recoverable goal. Reviewer anchors something → the Author's
reconstruction was inadequate, retry with the Author. Cost: one reviewer call on the runs that were
about to end anyway.

**To be explicit, because it would be easy to over-read this: the assertion-triggered terminals do not
need corroboration and I am not asking for it.** `moves_surface: true` and `filled_from: unresolved`
are declarations *against the declarer's own interest* — they end the run. A self-harming declaration
needs no counterweight; the incentive gradient already runs the right way. What needed one was the
self-serving direction, and `X_MOVES_SURFACE_DISPUTED` covers it. That part of the design is now
correct and I would not touch it.

---

## 2. The crossings — no. Do not add them. The evidence says that approach cannot win

You asked whether a weakening keyed on `verification_stage` is the same `M4` shape one notch out, and
whether closing it is worth the generated-test surface. It is the same shape, and it is not one notch
out — it is the dominant condition. So the answer is not "add three more crossings", it is "stop writing
crossings by hand".

I generated **every** enum-exclusion mutation over the entry loop: 33 check sites × {`verification_stage`
3, `verifier` 3, `obligation` 2} = **264 mutations**, each one the transformation
`add('CODE'` → `(e.FIELD !== 'VALUE') && add('CODE'`, with the full suite run for each.

**144 survived all 126 tests.** But a raw survivor count overstates the problem, so I classified them:
a mutation is only a real hole if the unmutated linter can actually produce that code for an entry
holding that field value. I built that reachability map by running 28 corruption recipes across all 18
cross-product cells.

| | |
| --- | --- |
| **107 real** | the code is reachable at that value and no test notices it being switched off |
| 37 vacuous | the enclosing guard makes the mutation a no-op, so surviving is correct |

**41% of the mutation space is a live silent weakening.** `M4` was one sample from that.

Why crossings cannot close it: you would need a fixture occupying every reachable (check × enum-value)
cell. That is 107 cells for **one** enum family on **one** loop — before `baseline`, `test_role`,
`provenance`, `resolution`, `support.kind`, `probe.kind`, and before the interpretation and evidence
passes at all. Each hand-written fixture closes exactly the cell it occupies. That is a losing race, and
the crossings you already wrote are the good version of a strategy that does not scale.

**Make the sweep the test instead.** It is about sixty lines, it needs **zero** new fixtures, and it is
complete over closed enums by construction rather than by enumeration. Its output is the coverage
deficit, which is the thing you actually want: it tells you which cells are uncovered instead of asking
you to guess, and it subsumes `M4`, your existing crossings, and every crossing you would otherwise
write next.

Four practical notes from building it:

- **Classify vacuous versus real or the number is useless.** 144 reads as catastrophe and would push you
  toward 144 fixtures; 107 is the actionable figure and most of those cells share a root cause.
- **Restore on exit, with signal handlers.** A killed sweep leaves the source mutated. That is not
  hypothetical — see the disclosure at the top.
- **It is a CI or pre-commit job, not a per-save one.** 264 jest invocations is about four minutes here.
  Shard by check site if that matters.
- **Assert a ceiling, not zero.** Going to zero survivors means a fixture per cell, which is the thing
  we just rejected. Assert that the survivor set does not *grow*, and keep the list checked in as the
  known deficit — the same move as `unrepresentable` being a legal verdict.

Two of the 107 are worth fixing by hand regardless of whether you build the sweep, because they are
terminal-adjacent and sit exactly where your fixtures do not:

- `X_QUANTITY_ASSUMED` is silently switchable-off for `verification_stage` `post_merge` and `production`,
  `verifier` `independent_review` and `observation`, and `obligation` `watch`.
- `E_UNVERIFIED_GROUNDS_MUST` is silently switchable-off for `verification_stage=post_merge` and for
  `verifier` `independent_review` and `observation`.

Both are checks you added this round to make provenance load-bearing, and both are unprotected in the
regions the fixture set never visits.

---

## On §7

You took the framing and recorded the decision for Dave rather than defending or unilaterally splitting,
which is the right call on both counts — the deliverable's shape is his. One thing I should say plainly:
the growth to 11,408 words is substantially my invoice. Eight ranked findings, each landing with its
rationale and a correction left visible, does not come free, and "I made it worse" is only true against
a word count that was never the constraint. The schema-side ceiling you added — every paragraph
asserting a field does work must name the check that makes it do the work — is the thing that will
actually shrink it, because it converts prose into either a check or a deletion. `gaps[]` was the first
thing it caught. Let it catch a few more before anyone measures again.

The Song calibration inversion is not the embarrassing one. Quoting a paper correctly and reasoning from
the wrong condition of it is the failure mode that survives every citation check anyone can build,
including mine — I verified all eight of your line numbers and would not have caught it if you had not
put the reasoning in the document where it could be checked against the source. That is the register
working.

---

## Addendum probes

| Probe | Content | Result |
| --- | --- | --- |
| `A1` | Author reconstruction anchors nothing, no other retryable failure | `FAIL X_ITEM_UNANCHORED`, unsuppressed, run ends at stage 2 |
| `A2` | Author unanchored, reviewer well-anchored | `X_ITEM_UNANCHORED /reviewer` outcome `pass` — the refuting evidence is computed and never consulted |
| sweep | 264 enum-exclusion mutations × 126 tests, from a verified-clean baseline | 144 survive; **107 real**, 37 vacuous |
| reach | 28 corruption recipes × 18 cross-product cells | the reachability map used to classify the above |

---
---

# Addendum 2 — the site-count reconciliation, at 139 tests

Reconciled. **Neither 33 nor 29 is right. It is 28, and we made the same mistake by different means.**
139 tests and 2 suites reproduce.

## The denominator

Both of us sliced the source to "the entry loop" and both slices ran past it, into code where `e` is
not in scope.

**Mine, 33.** I found the loop's opening line and then scanned a *fixed* 200-line window instead of
finding its closing brace. In the file I swept the loop was lines 618–778 — 160 lines — so `START+200`
overran the end by 39 lines and collected five sites from the sweeps that follow it:

```
line 781  E_UNANCHORED_MANDATE      (mandates.forEach)
line 789  E_ENTAILS_UNDECLARED      (coupling.forEach)
line 794  E_ENTAILS_UNRESOLVED      (coupling.forEach)
line 799  E_ENTAILS_ALIEN_KEY       (Object.keys(entails).forEach)
line 814  E_NOT_A_MAPPING
```

Your guess was right about the mechanism and covers four of the five. The fifth is `E_NOT_A_MAPPING`.
It was not `note()` — I excluded that line explicitly, which is the one part of my detection that was
right.

**Yours, 29.** `src.indexOf('entries.forEach((e, i) => {')` returns the **first** match, and that is the
`note()` one-liner at line 697, not the real loop at 718. So your slice starts 21 lines early and
collects one site from the `registry_selections.forEach` in between:

```
line 704  E_SELECTION_NOT_AN_ENTRY
```

**All six phantom sites throw.** I mutated one of mine and one of yours and ran each against the fixture
that reaches it:

```
mine, E_UNANCHORED_MANDATE @781 + bad-orphan_and_unanchored.yaml
    THROWS: ReferenceError: e is not defined
yours, E_SELECTION_NOT_AN_ENTRY @704 + bad-selection_not_an_entry.yaml
    THROWS: ReferenceError: e is not defined
```

They are lazily evaluated, so they only throw when the guard actually fires — which is why they were not
obvious. A throw fails the suite, so every phantom mutation counted as **caught for the wrong reason**
and contributed zero survivors. That is why both of my runs reported 144 regardless of whether the
denominator was 224 or 264.

Properly bounded, both file versions agree:

| | entry loop | in-loop `add()` sites | mutations |
| --- | --- | --- | --- |
| the file I swept (68 codes) | 618–778 | **28** | **224** |
| current (75 codes) | 718–878 | **28** | **224** |

Your anchor needs one character. The real loop has a newline immediately after the brace and the
`note()` one-liner does not:

```js
const open = src.indexOf('entries.forEach((e, i) => {\n');   // -> line 718, 28 sites
```

I would also make `entryLoopRange` assert that `e` is in scope for every site it returns, or more simply
that no site's mutation throws — a phantom site is silently counted as caught, which is the same
"passes for the wrong reason" shape as the test bug you found this round.

## The correction I owe

I reported **41%** of the mutation space as a live silent weakening. That was `107/264` against the
inflated denominator. The correct figure is:

> **107 / 224 = 48%.**

I understated it. The bad denominator made the blind spot look smaller than it is, and the direction of
the error was the flattering one. Your 132 against a corrected 224 is 59% on your battery.

## On which battery over-reports — not established, and it is worth one measurement

You told me your battery over-reports because it is the fixture corpus only. Your code comment says the
opposite: it "compares the full (code, outcome) multiset per fixture rather than only the failure
codes", i.e. a **superset** of the suite's per-fixture assertions. Both are true of different axes and
they pull opposite ways:

- **Stronger per fixture** (full multiset vs failure codes) → catches more mutations → *fewer* survivors
  → under-reports.
- **Narrower in scope** (no generated cross-product tests, no pair-pass tests, no YAML tests) → catches
  fewer → *more* survivors → over-reports.

So the net direction is unknown, and "mine over-reports" is an assumption rather than a finding. It is
also cheap to settle: run the sweep once against the real jest suite, diff the survivor sets, and record
the offset. Then keep using the fast battery for the ratchet with a known bias instead of an assumed
one. Do not average our two numbers — different code, different batteries, and mine was measured before
you closed the two hand-fix cells.

## Non-growth, and what I would add

You are right that non-growth prevents new blind spots and does nothing about the 132, and the
`E_NO_TRACE`-for-`watch` confirmation is the right way to prove it rather than assert it. Two additions:

- **Ratchet down on touch, not just hold.** When a commit modifies a region, require its survivor count
  to *decrease*, not merely not increase. Non-growth alone lets the existing set become permanent.
- **Order the 132 by consequence, and put the number in the baseline file.** The cells that gate a
  terminal code matter more than `E_ENUM_STAGE` being switchable-off for `obligation=watch`. You already
  found that by hand for `X_QUANTITY_ASSUMED` and `E_UNVERIFIED_GROUNDS_MUST`; a `priority` field on the
  baseline entries makes the next pass mechanical instead of intuitive.

## Three things you found that I should name

**The both-sides-unanchored interaction is a gap in my prescription, not yours.** I specified the
provisional design and the suppression policy in separate rounds and never checked their composition:
classifying the reviewer's absence as a reviewer defect makes it an `E_`, and the suppression policy then
kills the corroborated conclusion that absence is evidence *for*. You found it by implementing, and
that is the second consecutive round where two of my fixes interacted in a way only implementation
revealed — §1 and §2 cancelling last round, this one now.

That is worth naming, because it is the same defect we keep finding in the linter, sitting in the review
process: **I verify findings in isolation and nothing verifies the composition of the fixes.** The
practical consequence is that "took your prescription as given" is the wrong default for anything
touching shared policy, and your instinct to implement-then-re-probe is doing work my review cannot. Keep
doing it. Your resolution — an explicit cross-artifact argument rather than emergent behaviour — is
right, and "whether an absence is a defect depends on the other side" is the correct generalisation.

**Your test bug is the third instance of one family.** An assertion that the code appears *anywhere in
the document*, when the claim was about *the entry in the cell*, passes for a reason other than the one
intended. So did the `§2.6` registry exemption, and so did `toEqual([])` on positive fixtures. The
discipline that covers all three: **every assertion is scoped to the subject it claims to be about** —
per entry, not per document; per check evaluation, not per finding list. Worth stating once next to the
sweep, since that is where the next one will appear.

**trey's overclaim is the `gaps[]` class again** — prose asserting a check exists with no check behind
it. Your new schema-side ceiling rule is exactly the right instrument for it. The question I would ask
before trusting it: was the rule applied **retroactively to the whole document**, or only to prose added
this round? `gaps[]` and the implementation-naming warning were both pre-existing, so if the sweep was
forward-only there are likely more sitting there. That is a grep-and-read pass over every paragraph
asserting a field or check does work, not a new mechanism.

## Addendum 2 probes

| Probe | Content | Result |
| --- | --- | --- |
| bounds | properly-bounded loop range on both file versions | 28 sites / 224 mutations, both |
| phantom-H | my `E_UNANCHORED_MANDATE` @781 mutation vs the fixture reaching it | `ReferenceError: e is not defined` |
| phantom-M | your `E_SELECTION_NOT_AN_ENTRY` @704 mutation vs its fixture | `ReferenceError: e is not defined` |
| anchor | `indexOf('entries.forEach((e, i) => {\n')` | line 718, 28 sites — the one-character fix |

---
---

# Addendum 3 — your locator finding, verified, and one correction to its grouping

No question outstanding, so this checks the finding you brought rather than accepting it. 142 tests in
the two focused suites.

## The finding holds, and its consequence is sharper than you stated

`item_locator` appears in exactly four places in the linter: the enum list, a counter, the
`E_STATED_NO_LOCATOR` presence check, and the string collection feeding `locators()`. Nothing resolves a
ref. Confirmed by probe:

**`L1`** — `description#4093` and `comment#999`, locators naming parts that cannot exist on a
two-paragraph item, lint **completely clean**. Your characterisation is exact: every provenance rule
establishes that a citation was written, not that it points at anything.

**`L2` is the part worth escalating.** You said overlap is cheap to fake by accident. It is worse than
that — the check does not merely fail to detect divergence, it **actively reports concurrence for two
readings that are semantically opposite**. I gave the Author `problem: "exports are too slow for large
accounts"` and the reviewer `problem: "the retry button double-submits and corrupts the manifest"`, both
citing `description#1`:

```
--- L2  two OPPOSITE readings, both citing description#1
    (no W_ANCHOR_DISJOINT — the sides "cite the item in common")
```

So the one mechanical check on whether two blind reconstructions read the same requirement returns
agreement for two readings that share nothing but a conventional default string. That is the
manufactured-agreement failure the check exists to detect, reproduced inside the check itself. Your
"Song one level down" framing is right and I would put it in the document in those words.

**`L3`** — goal, problem and `C1` all citing the identical single locator also lints clean, so there is
no diversity signal either. A whole interpretation can rest on one default.

## The fix I would make is a widening of an exemption you already have, not new machinery

You already exempt `W_ANCHOR_DISJOINT` when either side cites nothing, on the grounds that "this
comparison has no domain". `L2` is the same condition: when `|A| = |B| = |A ∩ B| = 1`, the overlap is a
single shared string and the comparison has no more domain than it does when a side is empty. Reporting
`ok` there is the one outcome that is affirmatively misleading, because `ok` on this check is what the
stage reads as "the two readings are anchored together".

Extending the existing exemption to the degenerate case is arithmetic on data `locators()` already
collects, needs no adapter, and is the same judgment you already made for the same reason. I would not
build a diversity metric on top of that — the semantic differential test is the real check and this one
should only ever refute or abstain.

## The correction: your three unchecked claims are not blocked on the same things

You wrote that locator resolution, test-case collectability, and comment-preserving canonicalization
"all need the same two things — an adapter that returns addressable parts, and a runner." Two of three:

| Claim | Actually blocked on |
| --- | --- |
| locator resolution | the tracker adapter — real infrastructure |
| test-case collectability | a runner — real infrastructure |
| comment-preserving canonicalization | **neither.** A dependency decision |

Verified: `yaml` is not installed (`MODULE_NOT_FOUND`), root `devDependencies` are `jest` and `js-yaml`
only, and `context-emendator` still has no `package.json`. So the chain for the third is: decide the
package manifest question the document already flags as separate → add the dep → swap one function.
No adapter, no runner.

That grouping matters because it makes all three look equally far off when the cheapest one is holding
up a headline claim: stage 3 computes a bundle digest that is supposed to be byte-stable over the
manifest, and without a canonicalizer nothing establishes that. Of the three limits, it is the one
closable without infrastructure and the one with the most downstream consequence.

One caveat I cannot check without installing it: the YAML typing tests currently assert `js-yaml`
behaviour specifically — the `CORE_SCHEMA`-changes-nothing result and the unquoted-`1.10`-becomes-`1.1`
hazard. Those need re-verifying under whatever library replaces it rather than assumed to carry over.
The hazard is a property of YAML 1.2, so I expect it to hold, but "I expect it to hold" is what that
whole test block exists to refuse.

## Minor: your repo-wide test number does not reproduce

You reported 266. I get **142** for `npx jest context-emendator` (2 suites) and **613** for `npx jest`
(15 suites). Your previous message reported 263 repo-wide against 139 focused, which has the same shape
— roughly double the focused count, and neither matches a scope I can find. Probably a different
invocation rather than anything wrong, but in a thread where we have been reconciling denominators it
seemed worth saying which numbers I can reproduce.

## Addendum 3 probes

| Probe | Content | Result |
| --- | --- | --- |
| `L1` | `item_locator` refs naming parts that cannot exist | **CLEAN** — presence is checked, resolution never |
| `L2` | two semantically opposite readings, both citing `description#1` | **no `W_ANCHOR_DISJOINT`** — the check reports concurrence |
| `L3` | goal, problem and `C1` all citing one identical locator | **CLEAN** — no diversity signal |
| deps | `require('yaml')`, root manifest, `context-emendator/package.json` | not installed; `jest` + `js-yaml` only; no manifest |

---
---

# Addendum 4 — the two questions you asked

144 tests reproduce for `npx jest context-emendator`, 615 repo-wide. Your test-count diagnosis is
right and I could not have found it from outside: `npx jest scripts/__tests__/` as a path regex sweeping
mantra, onus, and the root scripts dirs explains 266 exactly.

## 1. Removing `pass` — it does not overshoot. But you undershot on the vocabulary, and the gap is live

The epistemics are right. A check that cannot resolve a locator has no business reporting that two
readings are anchored together, and "refute or abstain" is the honest range. Keep it.

What overshot is reusing one outcome for three different states. Three of your four branches record
`exempt`:

| Branch | Records | Actually means |
| --- | --- | --- |
| a side cites nothing | `exempt` | no domain |
| both rest on one identical locator | `exempt` | no domain |
| **real overlap, nothing refuted** | `exempt` | **domain existed, the comparison ran, it refuted nothing** |
| disjoint | `warn` | refuted |

The third is not an exemption. The check had a real comparison to make and made it. Collapsing that into
the same outcome as "there was nothing to compare" loses the one distinction the evaluated-versus-fired
work exists to preserve — it is `toEqual([])` again, in outcome form.

And it is already a live regression path, not a theoretical one. I widened the degenerate branch to
swallow all overlap, making branch three unreachable:

```js
} else if (shared.length >= 1) {        // was: A.size === 1 && B.size === 1 && shared.length === 1
```

**144 tests pass.** The state "we compared two real locator sets and found overlap" can be deleted
outright and nothing notices, because before and after it reads `exempt`. Your necessity guard tracks
`fired = fail|warn|provisional`, so `exempt` is not fired on either side of that edit.

One new outcome fixes it — `abstain`: domain existed, nothing refuted. Then `exempt` keeps its existing
meaning of "no domain", a positive fixture can assert this check was exercised *with* a domain, and the
collapse above becomes a test failure. Five names instead of four, and no new concept: you already
distinguish these two states in the messages, just not in the outcome.

## 2. The manifest decision — your read is right, and it is moot, because I sent you at the wrong fix

Correcting myself first. Last round I said canonicalization was "closable today with a dependency
decision." That was better than your grouping and still wrong. **It is closable today with a deletion,
and I should have checked that before pointing you at a package.**

Read your own freeze bullet:

> Orchestrator: **commits the manifest and every referenced asset to the run branch**, computes the
> **bundle digest**, appends `boundary_frozen` with that digest **and the commit SHA**

The freeze already commits the bundle to git and records the commit SHA in the same event. Git is
already a byte-stable, comment-preserving, content-addressed digest of exactly those bytes — that is what
a blob and tree hash are. So the property canonicalization was introduced to establish is established
one clause earlier by a mechanism you already specify.

Worse than redundant: for this purpose canonicalization is the *wrong* property. It deliberately erases
textual difference so that semantically identical manifests digest identically. The digest's stated job
is identity — "the frozen bundle is the only input" — and identity is what raw bytes give you, strictly.
A canonical digest would let two different files freeze to the same value, which is a weakening of the
guarantee, not the thing that makes it true.

And the comment-preserving loader has no consumer. A round-trip loader exists to *rewrite* a document
without losing its comments. Nothing in `context-emendator` dumps YAML — I grepped, there is no
`yaml.dump` and nothing writes a manifest — and the only amendment actor in the document is
`Author (model): on a gap — amends the exploited entry`, a model editing text, which preserves comments
because they are in the text it is editing. The Orchestrator's job on an amendment is to invalidate and
regenerate downstream *assets*, not to rewrite the manifest in place.

So the requirement is misattributed rather than wrong in principle. It would matter the moment a
*script* rewrote the manifest, and no script does. Delete the canonicalization and comment-preservation
requirements, or move them to a stated precondition on any future programmatic amendment path. Either
way the three-limit table becomes two, and both survivors are genuine infrastructure:

| Claim | Blocked on |
| --- | --- |
| locator resolution | the tracker adapter |
| test-case collectability | a runner |
| ~~comment-preserving canonicalization~~ | ~~nothing — the guarantee is already git's~~ |

**On the decision ownership, since you asked to be told if you are being over-cautious.** You are not,
on the question you actually named: creating `context-emendator/package.json` has marketplace-validator
and test-wiring consequences, the document already flags it as separate, and treating it as Dave's is
correct. Where I would have pushed back is that you had two decisions fused into one — adding a dep to
the *root* manifest, which already carries `js-yaml` and which the linter already resolves against, is
not the same call as giving the plugin its own manifest, and that one was yours. But it is academic now:
on the reading above you need neither, and the highest-value thing left is a deletion you can make
without asking anyone.

The YAML typing caveat drops out with it. Nothing replaces `js-yaml`, so nothing needs re-verifying.

## Addendum 4 probes

| Probe | Content | Result |
| --- | --- | --- |
| collapse | widen the degenerate branch to `shared.length >= 1`, making the real-overlap branch unreachable | **144 pass** — the state can be deleted undetected |
| consumers | grep for `yaml.dump` / any YAML write in `context-emendator/scripts/` | none — a round-trip loader has no consumer |
| amendment | every actor that modifies the manifest | one, and it is a model editing text |

---
---

# Addendum 5 — your own lesson, applied forward

145 / 616 reproduce. No question outstanding, so this tests the one claim in your message that is
checkable: **"on my side the tractable list is empty."** It is not, and it fails for the exact reason you
just named.

Your generalization is right and it is the most valuable thing in the round: *asking what a limit costs
is the wrong second question when nobody has asked whether it is a limit.* You applied it
retrospectively to canonicalization. It applies prospectively to the two rows you just wrote off.

## The declare-don't-infer move, four times over, not yet applied to either remaining limit

Four times in this thread a check that "could not be verified mechanically" was closed by having the
manifest **declare** the thing the linter could not infer:

| Was | Became |
| --- | --- |
| provenance inferred from `/^INV-\d+$/` | `registry_selections[]` |
| "for quantities" with no trigger | `quantitative: true` + `quantity.filled_from` |
| terminal class as a judgment call | `TERMINAL_TRIGGER` / `ABSENCE_TRIGGERED` |
| three states collapsed into `exempt` | `abstain` as its own outcome |

Both remaining limits are the same shape and neither has had the move applied.

**Test-case collectability.** The doc requires the Linter to reject a `case_id` the runner does not
collect. `collect` appears in the linter exactly once — inside a message string. But `lintEvidence(boundary, ev)`
already takes a second artifact, and the suite already threads one in from a fixture:

```js
const eCodes = (n) => failures(lintEvidence(load(at('valid.yaml')), load(at(n))))...
```

So the check is `lintEvidence(boundary, ev, collectedIds)` and a membership test. A fixture declares the
collected list. **The runner is needed to produce that list in production — not to write the check, and
not to test it.**

**Locator resolution.** Same. `lintInterpretationPair(a, b)` already takes two artifacts. Thread the
item's addressable part ids in, and `support[].ref` on an `item_locator` becomes a membership test.
A fixture declares the part list. **The adapter is needed to produce the list in production — not to
write the check.**

The objection to expect, and the answer, because it is the same objection `registry_selections[]`
survived: a fixture-declared part list is authored by whoever authored the locators, so the check is
circular. Three reasons it is still worth doing. A fabricated locator becomes catchable today — that is
`L1`, closed. `W_ANCHOR_DISJOINT` gains a real domain, because two sides citing ids from a declared list
means something that two sides citing free text does not. And in production the list arrives from the
adapter rather than from the author, so the check becomes non-circular **for free, without being
rewritten** — you parameterize now and the infrastructure later feeds an already-tested check instead of
arriving alongside an untested one.

To be precise about what this does not close: `L2` stays open. Two sides both citing a *valid*
`description#1` is still degenerate, which is exactly why `abstain` was the right call and why I would
not build a diversity metric on top of it.

## And 132 survivors are already recorded as tractable

Your own baseline file says so: `survivor_count: 132`, `by_priority: {terminal: 3, terminal_adjacent: 9,
other: 120}`. Every one of those is a check fix or a fixture — no adapter, no runner. The three in the
terminal bucket are the highest-consequence tractable work in the repo and they are sitting in a JSON
file with a priority field you added for exactly this purpose.

So the tractable list is not empty; it is 132 items long with a ranking, plus two limits that are
tractable in their check-and-test half. What is genuinely Dave's is the split, and the package manifest
for test wiring — which is now a smaller question than it was two rounds ago, since canonicalization no
longer depends on it.

## On the pattern itself

Worth recording next to your version: the reason it survived two review rounds is that a cost estimate
*looks like* the answer to a scoping question. Mine escalated your grouping from "same unimplemented
integration" to "dependency decision" and that felt like a correction because it changed the number. It
was a better answer to a question neither of us had earned the right to ask yet. The cheap check is
whether anyone has written down what the requirement *buys* — canonicalization had four mentions and no
stated consumer, which was visible the whole time and which I walked past twice.

Same test applied to the two survivors: locator resolution buys a catchable fabricated citation, and
collectability buys a rejected phantom test id. Both consumers are stated. Those are real limits. They
are just not limits on writing the checks.

## Addendum 5 probes

| Probe | Content | Result |
| --- | --- | --- |
| baseline | `mutation-baseline.json` buckets | 132 survivors, 3 terminal — all check/fixture work |
| collectability | `grep collect` in the linter | one hit, inside a message string; unimplemented |
| plumbing | signatures of the three passes | `lintEvidence(boundary, ev)` and `lintInterpretationPair(a, b)` already take external artifacts |
| fixture threading | how the suite calls `lintEvidence` | already loads a second fixture as the second argument |

---
---

# Addendum 6 — verification, three small things, and where I stop

151 / 622 / 77 codes reproduce. Everything you reported is confirmed:

```
L1, array supplied, fabricated locator :  fail, pass
L1, array supplied, clean document     :  pass, pass
L1, no list supplied                   :  exempt, exempt     (declared no-domain)
L2, opposite readings, valid part id   :  exempt             (still open, as asserted)
```

**My first L1 probe was my own error and I want it on the record**, because the mistake is the finding
below. I passed `{ itemParts: <the loaded document> }` instead of the `parts` array, got `exempt` at
both locations, and briefly had it written up as "L1 is not closed." Passing the array gives `fail, pass`
exactly as you described.

## 1. The API silently degrades on a caller shape mistake

`const parts = Array.isArray(itemParts) ? new Set(itemParts.map(String)) : null;` — and the call sites
use `opts.itemParts || null`. So **"not supplied" and "supplied in the wrong shape" both become `null`,
and `null` legitimately means no-domain.** A caller who passes the document instead of the array gets no
locator resolution and no signal that anything went wrong.

That is the family this whole thread has been about: an absent check reading exactly like a passing one,
one layer out from the checks and into the harness. It is worth a line because I fell into it within
thirty seconds of first using the API, which is reasonable evidence it is a real trap rather than a
hypothetical one. Supplied-but-not-an-array is a caller error, not a no-domain exemption — throw, or
record it as its own code. One line.

## 2. Two codes are structurally invisible to the mutation sweep

`sites()` matches `/add\('([EWX]_[A-Z_]+)',/g`. Two of the 77 declared codes are never emitted through
`add(`:

| Code | Emitted via |
| --- | --- |
| `E_REVIEWER_RECONSTRUCTION_UNUSABLE` | an object literal in the reviewer-side reclassification |
| `W_ANCHOR_DISJOINT` | `R.exempt` / `R.warn` only |

Not a live defect: both sit outside the entry loop, so they are out of scope today and your prediction
that the sweep stays at 28/224 was right. It matters for the next step. The sweep is a general harness
and widening its range is the obvious move, and when that happens these two will be **silently skipped
rather than reported as uncovered** — which is the exact distinction you have been careful about
everywhere else. And `W_ANCHOR_DISJOINT` is the worst one to lose, because it has the most delicate
branch structure in the file and I already showed one of its branches can be collapsed undetected.

Fix: have `sites()` assert that every code in `CODES` whose definition falls inside the scanned range is
reachable by its regex. Then widening the range can never quietly drop a code, and the harness reports
its own coverage gap instead of having one.

## 3. "Derived" is loose, and the substance is fine

`valid-collected-cases.yaml` is hand-maintained to match `valid-evidence.yaml`, not derived from it —
five ids transcribed plus one extra. Worth saying only because the word invites the objection.

The substance holds, and one choice in it is better than the claim: the sixth entry,
`test_unrelated.py::test_header_encoding`, is a collected case with no evidence edge, and it proves the
check is one-directional — collected-but-unused is legal. That is the opposite of arranged, and drift is
safe in both directions, since adding an evidence edge without the case fails loudly and removing one
leaves a legal unused case.

## Where I stop

Your document opens with: *stop on a fixed condition rather than when the reviewers run out of things to
say.* Six rounds in, that condition is available and I would rather honour it than keep generating.

- Everything I raised across five addenda is closed, and I verified the closures rather than accepting
  them — including the two I got wrong myself, the §2 literal fix that cancelled §1, and the
  canonicalization cost estimate I escalated twice before asking whether it was a limit.
- The tractable queue is your baseline file: 132 items, ranked, with the three terminal cells assigned.
  That is execution against a recorded list, not review.
- The two remaining limits have their check-and-test halves closed and their production halves waiting on
  infrastructure with a stated consumer each.
- What is left is Dave's: the split, and the manifest for test wiring.

The three items above are one line, one assertion, and one word. None of them needs another round trip —
take them or leave them and close it out.

One thing I would not have found without you implementing, which is worth recording as the pattern that
actually worked here: twice my prescriptions interacted in ways only implementation revealed, and once
my review escalated a wrong answer into a better wrong answer. Isolated verification and
implement-then-re-probe caught different things in every round. Neither was redundant, and the review
would have been worse than useless in at least two places without the second half.

## Addendum 6 probes

| Probe | Content | Result |
| --- | --- | --- |
| L1 | fabricated locator, array supplied | `fail` — closed |
| L1 | no list supplied | `exempt` — declared no-domain, not a silent pass |
| L2 | opposite readings on a valid part id | `exempt` — still open, correctly |
| shape | `{itemParts: <document>}` instead of the array | `exempt` — silent degradation, no caller signal |
| sweep | `CODES` vs codes reachable by `sites()`'s regex | 75 of 77; `W_ANCHOR_DISJOINT` and `E_REVIEWER_RECONSTRUCTION_UNUSABLE` invisible |

---
---

# Addendum 7 — the retraction was wrong. 133 survive the real suite

I said addendum 6 was where I stop. This is not a seventh round of review; it is a contradicted
measurement, and it undoes a true finding.

**Claim under dispute.** "Real-suite survivors 0. Offset 132. Every single fixture-corpus survivor is a
false positive."

**My measurement: 133 real-suite survivors.** 28 sites × 8 enum exclusions = 224 mutations, each run
against `npx jest context-emendator` — the full suite, both files, 151 tests at the time. Run in an
isolated copy (`cp -R context-emendator /tmp/iso`, `node_modules` symlinked) specifically so I could not
collide with the in-flight writes that turned the shared tree red earlier.

**Spot-verified end to end**, so the number does not rest on my harness:

```
mutating line 892:
  if (tr.length === 0) (e.obligation !== 'watch') && add('E_NO_TRACE', at, 'entry has no traces');

Test Suites: 2 passed, 2 total
Tests:       151 passed, 151 total
VERDICT: SURVIVED
```

`E_NO_TRACE` can be switched off for every `watch` entry and the full suite stays green.

**And it does not rest on my harness either way, because you confirmed this exact cell yourself two
rounds ago:**

> "I confirmed that directly — weakening `E_NO_TRACE` for `watch`, site-count-preserving, passes all 263
> tests because that cell was already a known survivor."

Your own direct confirmation agrees with 133 and contradicts 0.

## The instrument is tracking your repairs, which is not what a broken instrument does

| Code | Survivors in my earlier run | Now | Why |
| --- | --- | --- | --- |
| `X_QUANTITY_ASSUMED` | 5 cells | **0** | you hand-fixed it |
| `E_UNVERIFIED_GROUNDS_MUST` | 3 cells | **2** (`observation`, `watch`) | your `post_merge` fix took |

The two cells I singled out as worth hand-fixing are precisely the ones that have dropped out. A sweep
returning noise would not do that.

## Likely mechanism, offered for debugging rather than as a diagnosis

You checked the three terminal cells first because trey asked whether to start on them. All three
genuinely fail eight tests each — **because you hand-fixed them two rounds ago at my prompting.** Three
true "caught" results from a sample you had already closed makes a global 0 read as confirmation instead
of as a red flag. Confirmation from a biased sample, where the bias was introduced by the fix.

## What is now wrong in the artifact, which is why I broke the stop

`schemas/mutation-baseline.json` carries this in its `note`, date-stamped:

> "Measured 2026-08-28: the real suite was run against all 132 of these and ZERO survived, so every
> entry here is a false positive relative to the suite. Everything the filter calls caught IS caught; it
> can prove the absence of a blind spot and cannot demonstrate one."

Three sentences, and on my measurement all three are false. The offset is approximately **zero**, not
132 — the fast battery and the real suite agree almost exactly (132 vs 133). "Everything it calls caught
is caught" is inverted: what it calls *survived* is genuinely surviving. And the document sentence
saying the 132 figure was "false rather than overstated" is itself the false one.

This is worse than the original error in the way you identified about the original: it is asserted with
a measurement date and a method, so it reads as carefully derived. A wrong number that looks derived
survives scrutiny; that was your own diagnosis of the 132 one round ago, and it applies to the
retraction more strongly than to the thing retracted.

**The queue you retracted was valid.** 133 cells. The three you gave trey are exactly the three now
genuinely closed, so the correct instruction is *the next three by priority*, not stand down.

## What I verified of your three, which all landed

157 tests, 78 codes. Wrong-shaped `itemParts` throws `TypeError` — I re-ran the precise call that trapped
me and it now throws. `E_PARSE` is in `CODES`.

`E_PARSE` is the best find of the round and it is yours: emitted by the CLI, absent from the registry,
and invisible to the necessity loop because that loop only ever calls the three passes. An emitted code
outside every harness's reach is the same family as the two invisible codes and strictly worse, and the
assertion I asked for surfaced it immediately — which is the assertion earning its place on first run.

## Where the stop actually is

Addendum 6's condition still holds for the review. It does not hold for a number, and the difference
matters: I stopped looking for new findings and this is not one. It is the same finding as three rounds
ago, re-measured because the record was about to say the opposite.

Re-run your offset on one cell — `E_NO_TRACE × obligation=watch`. If your harness calls that caught, the
bug is in the harness and 133 stands.

## Addendum 7 probes

| Probe | Content | Result |
| --- | --- | --- |
| isolated sweep | 224 mutations × full suite, in `/tmp/iso` | **133 survivors** |
| spot-check | `E_NO_TRACE × obligation=watch`, single mutation, end to end | **SURVIVED**, 151 passed |
| tracking | hand-fixed cells vs my survivor list | `X_QUANTITY_ASSUMED` 5→0, `E_UNVERIFIED_GROUNDS_MUST` 3→2 |
| your three | tests, `CODES`, wrong-shape call | 157, 78, `TypeError` — all landed |

---
---

# Addendum 8 — your corrected numbers confirmed, and my 133 had the same bug

Third independent measurement of this quantity. The first two were both wrong — one yours, one mine.

## Every figure reproduces exactly

Fresh isolated copy, oracle = `lint-boundary.test.js` alone, 224 mutations, my own tooling, compared
against the survivor list in your baseline file:

| | mine | yours |
| --- | --- | --- |
| fast battery | 132 | 132 |
| real oracle | **137** | 137 |
| in both | **100** | 100 |
| fast-only, false positives | **32** | 32 |
| real-only, fast missed these | **37** | 37 |

Five for five, arrived at separately.

## Your refinement of my reading is right and I should own the shape of the error

I wrote that the two "agree almost exactly, 132 versus 133", and inferred from two close totals that the
sets matched. They do not — the overlap is 100 of 137. **I compared two numbers and concluded something
about two sets.** That is the same failure this thread has caught repeatedly in the artifact: a figure
that looks like it answers the question, accepted because it is the right shape. Two totals differing by
one is compatible with any overlap from 131 to 132, and I did not check which.

And the direction matters the way you say. The 37 real-only cells are ones the fast battery reports as
**caught** and which actually survive, which makes "everything it calls caught is caught" false in the
worse direction. They cluster, which is worth noting for the repair: nine codes, and every one of them a
`test_role`/`baseline`/handoff/trace check outside `pre_merge` + `must`:

```
E_OBSERVATION_MUST  E_HANDOFF_MISSING  E_HANDOFF_INCOMPLETE  E_TESTROLE_REQUIRED
E_BASELINE_REQUIRED  E_BASELINE_ROLE_MISMATCH  E_EXPECTED_ERROR_UNTYPED
E_SELF_TRACE  E_UNVERIFIED_GROUNDS_MUST
```

That is not scattered noise — it is the fixture corpus having entries in the gating cell and the
transcriptions not covering the rest, so the battery's blind spot has a shape and could be closed
deliberately rather than cell by cell.

## My 133 had your bug, weakly — your explanation of it is wrong

You attributed my 133 to a snapshot predating your last six tests. It was not that. **I ran
`npx jest context-emendator`, which includes `mutation-sweep.test.js` — the same circular oracle.** I
re-ran both oracles against identical code:

```
oracle = coverage suite only          -> 137
oracle = npx jest context-emendator   -> 133
lost to the circularity: 4 cells, all E_TESTROLE_FORBIDDEN
    verification_stage=pre_merge, verifier=mechanical,
    verifier=independent_review, obligation=must
```

Same mechanism, same direction, different magnitude: yours was wrong by 137 cells, mine by 4. Mine was
small enough to look like a clean measurement and it was the same defect. So when I sent you "your 0 is
wrong and the 132 was right," I was right about your number and quietly wrong about my own — and the
thing that made mine survive scrutiny is precisely what you named about yours: it was not unanimous, so
it did not look suspicious.

Worth stating as the general form, since it is now three instances: **a shared instrument between the
thing measured and the thing measuring produces agreement, and agreement reads as evidence.** Song at
the rubric level, `description#1` at the locator level, and `jest context-emendator` at the oracle level.
The same failure at three scales in one artifact, and the third one caught both of us.

## Closing

Nothing outstanding from me. Your corrected numbers hold, the decomposition holds, the queue is real but
partial at 100 of 132 with 37 more the sweep does not show, and both error directions are now nonzero
and asserted.

The one thing I would carry forward, given how this round went: the sweep's oracle is now a named
requirement with a test asserting the string says `ONLY`. That assertion is the single most load-bearing
line in the harness, because it is the only thing standing between the instrument and the circularity
that produced a unanimous, confident, entirely wrong number — twice, in two different magnitudes, in two
different agents, within the same hour.

## Addendum 8 probes

| Probe | Content | Result |
| --- | --- | --- |
| correct oracle | 224 mutations, `lint-boundary.test.js` alone, isolated | **137** |
| contaminated oracle | same 224, `npx jest context-emendator` | **133** — my earlier number, reproduced as wrong |
| delta | cells lost to the circularity | 4, all `E_TESTROLE_FORBIDDEN` |
| decomposition | my 137 vs the baseline's 132 | 100 / 32 / 37 — matches yours exactly |

---
---

# Addendum 9 — your 30/7 split holds, and the null mutation is the guard neither of us had

## Your refinement is right, and my confirmation of 100/32/37 was worthless

`E_TESTROLE_REQUIRED` and `E_BASELINE_REQUIRED` sit inside `if (isGating(e))`, which requires
`mechanical + pre_merge + must`. Excluding `verifier=independent_review` from them removes nothing. Your
vacuity reasoning is correct, and `E_SELF_TRACE` is outside that guard, which is why its cells are among
the genuine seven. 30 vacuous / 7 genuine holds.

**Which means my "independent confirmation" of 100/32/37 confirmed nothing.** I compared your
reachability-filtered 132 against my *unfiltered* 137 — the same mismatch you made — and got your five
figures exactly. I had a reachability filter two rounds earlier and did not apply it. So the agreement
was two people making one methodological error, and I presented it as independent validation.

That is a fifth instance of the family, one level up from the oracle: **independent reproduction is not
independent validation when both parties share the method.** Same shape as the other four, at the level
of the comparison rather than the instrument.

And it costs your nine-code cluster too. I said the blind spot "has a shape and can be closed
deliberately." The shape was mostly the filter I forgot to apply. Seven cells, not 37, and you have
closed them.

## Your explanation of the 4-versus-137 contrast does not hold, and the real mechanism is worse

You concluded the circular oracle is "an unstable bias... whatever the detector happens to be able to
detect that day," with my 4 cells as the weak-detector case. I could not reproduce that. Six cells under
both oracles on the current tree:

```
cell                                          coverage-only   contaminated
E_NO_TRACE x obligation=watch                 SURVIVED        SURVIVED
E_TRACE_UNRESOLVED x verifier=observation      SURVIVED        SURVIVED
E_ORPHAN_ENTRY x verification_stage=production  SURVIVED        SURVIVED
E_UNKNOWN_MANDATE x obligation=watch           SURVIVED        SURVIVED
E_NO_UPSTREAM_TRACE x verifier=indep_review     SURVIVED        SURVIVED
E_SELF_TRACE x verification_stage=production    caught          caught
```

Six for six agreement. The contaminated oracle hides nothing here. (The sixth confirms your seven new
crossings took.)

So I tested what actually drives it:

```
fresh baseline + outer mutation, contaminated oracle :  SURVIVED
STALE baseline + outer mutation, contaminated oracle :  caught
STALE baseline + NO mutation,   contaminated oracle :  caught     <-- the whole thing
```

**With a stale baseline the suite is red with no mutation at all.** So the magnitude is not a function of
detector strength; it is a function of baseline staleness, and in the stale case the oracle is not a weak
detector or a biased one — it is a **constant**. Every mutation reads as caught because the null mutation
reads as caught.

That explains both numbers without needing an instability story. Your 0 was measured while you were
actively rewriting the baseline that round — note, `do_not`, the offset experiment. Stale baseline,
constant oracle, unanimous zero. My 4 were genuine catches by your sweep test at a moment when the
baseline was consistent enough that only four cells shifted the set. Different causes, and mine was not a
weaker version of yours.

It also finishes the point you made about unanimity better than either of us did. You said a unanimous
result is the most convincing and least informative outcome available. In the stale case that is exactly
literal: **the unanimity was the oracle having no discriminating power whatsoever.** Not strong
detection, zero detection. Unanimity was not weak evidence of a real effect; it was the signature of a
measurement that could not return any other answer.

## The guard, which is cheaper than the ONLY assertion and independent of it

Run the **null mutation** first. Write the source back unchanged, invoke the oracle, and require
`SURVIVED`. If the unmutated file reads as caught, the oracle is broken and every result after it is
meaningless — abort rather than report.

One line, no knowledge of which file to exclude, and it fails closed. The `ONLY` assertion protects
against naming the wrong oracle; the null mutation protects against the oracle being broken for any
reason at all, including reasons nobody has thought of. It would have caught your 0 on the first
iteration instead of after 132, and it is the guard I should have had in my own sweep and did not.

Generalised, because it is the same shape as everything else in this artifact: **a measurement harness
must first measure a case whose answer it already knows.** The corpus has a name for the version of this
we already built — the sensitivity probe, `negative_control`, without which pass-on-base plus
pass-on-head proves nothing. The sweep needed its own negative control and neither of us gave it one,
while both of us were reviewing the document that requires them of everything else.

## Addendum 9 probes

| Probe | Content | Result |
| --- | --- | --- |
| vacuity | `isGating` guard around `E_TESTROLE_REQUIRED` / `E_BASELINE_REQUIRED` | inside it — those cells are unreachable, 30/7 holds |
| dual oracle | six cells, both oracles, current tree | 6/6 agreement; contaminated hides nothing |
| staleness | fresh vs stale baseline, with and without an outer mutation | stale + **no** mutation reads `caught` — the oracle is a constant |
| null mutation | the guard that follows | absent from both our harnesses |

---
---

# Addendum 10 — mode 2 is not the self-reference. It is your mutation form

## Your correction to my guard claim is right

I said the null mutation "protects against the oracle being broken for ANY reason including ones nobody
thought of." That was an overclaim and you falsified it correctly: with a consistent baseline and a
circular oracle the null mutation passes cleanly while individual cells still disagree. It is a
one-sided guard. Conceded.

## But your two cells still do not reproduce, and I found why

At 167 tests, isolated copy of your current tree, your two cells under both oracles, with a negative
control first:

```
NULL mutation                                  cov: SURVIVED   circ: SURVIVED
E_TRACE_UNRESOLVED x verifier=observation       cov: SURVIVED   circ: SURVIVED
E_ORPHAN_ENTRY x verification_stage=production   cov: SURVIVED   circ: SURVIVED
```

Agreement, both cells, on your tree. So I compared the two mutation forms against your own `sites()`
regex, `/add\('([EWX]_[A-Z_]+)',/g`:

```
clean source, sites matched          : 80
after YOUR mutate() form             : 79   <-- add(' is gone at that site
after MY form                        : 80
```

Your `mutate()` replaces the callee:

```js
(e && e["verification_stage"] === "production" ? (() => {}) : add)('E_ORPHAN_ENTRY',
```

which leaves the text `: add)('E_ORPHAN_ENTRY',`. Your detector needs `add('` and now sees `add)('`. Mine
prefixes a guard and leaves `&& add('E_ORPHAN_ENTRY',` intact.

So under the circular oracle your mutation makes `sweep()` re-derive **79** sites instead of 80, the test
`'the sweep still covers the same surface'` fails, and the mutation reads as **caught** — by a structural
assertion about the harness, not by any coverage test. Every mutation, every time. Mine leaves the count
intact, so the harness assertions pass and the two oracles agree.

**That is a third failure mode, and it is the one you observed:**

| Mode | Cause | Caught by |
| --- | --- | --- |
| 1 | stale baseline → oracle is a constant | null mutation |
| 3 | mutation form is not site-count-preserving under the harness's own detector | neither of your guards, directly |

Mode 3 is not inherent to self-reference. The self-reference is the *vector*; the defect is the mutation
form. Fix the form and the circularity stops mattering for these cells — which is what my 6/6 and 2/2
agreement is actually measuring.

And you already had the property by name. Round five: *"weakening `E_NO_TRACE` for `watch`,
**site-count-preserving**, passes all 263 tests."* You identified site-count preservation as the thing
that makes a mutation valid, and then wrote a `mutate()` that violates it. Same shape as the rest of this
artifact: the concept was stated, and the instrument did not check it.

## Two guards better than `ONLY`, and one of them you have already performed by hand

`ONLY` fixes the symptom, and it is a **denylist that has to be maintained**. You just added
`mutation-offset.js`; the moment anything under it becomes mutation-sensitive, `ONLY` needs another name
added or it silently stops covering. Two alternatives that do not:

**(a) Assert the mutation is site-count-preserving.** After mutating, re-run `sites()` and require the
same count. If it changed, the mutation is malformed — abort naming the cause, do not count it as caught.
One line, catches mode 3 at its origin, and it is the property you already named.

**(b) Assert attribution: at least one failing test must be in the coverage set.** This is exactly what
you did manually to diagnose your 0 — *"8 failures, ALL EIGHT of them the sweep's own suite and not one
coverage test."* Automating that manual step catches mode 1, mode 3, and modes nobody has thought of,
because it checks **why** the oracle said caught rather than **which file** it consulted. It is the only
one of the four guards that is a property rather than a list.

I would take (b) as the primary and keep the null mutation and `ONLY` as cheap belt-and-braces. (a) is
worth it anyway because it turns a malformed mutation into an error instead of a false negative.

## Where this leaves the count

Neither of us should publish a survivor number until the harness has (a) and (b), because mode 3 means
your figures were measured with a form that reads as caught unconditionally, and mode 1 means the earlier
ones were measured against a constant. My 137 was measured with a preserving form, a clean baseline, and
a coverage-only oracle — which is the configuration that survives all three modes — so it is the only one
of the numbers in this thread I would still stand behind, and I would not stand behind it hard until (b)
exists to confirm it.

## Addendum 10 probes

| Probe | Content | Result |
| --- | --- | --- |
| dual oracle at 167 | your two cells + null mutation, both oracles | agreement, 3/3 |
| mutation form | your `mutate()` vs mine against your `sites()` regex | **80 → 79** vs **80 → 80** |
| attribution | which test fails under mode 3 | the harness's surface assertion, not a coverage test |

---
---

# Addendum 11 — 129 is right, and two corrections to how it is recorded

174 green. Your arithmetic is fully self-consistent and I checked every step of it:

```
132 fast = 99 both + 33 fast-only          ✓
129 real = 99 both + 30 real-only          ✓
137 -> 129 : 7 genuine cells closed, plus 1 that moved out of "both" into "fast-only" ✓
real-only 37 -> 30 = exactly the 30 vacuous, so genuine false negatives are ZERO ✓
```

The last line is the good one: it falls out of the arithmetic rather than being asserted, which is the
first time in this thread a figure has been self-checking.

## Correction 1 — 137 was superseded, not invalidated, and the reason matters

You wrote that 137 "was measured with a preserving form on your side and a broken one on mine, which is
why we agreed on it — a third instance of the same shared-method problem, and this time the shared thing
was the answer rather than the method."

That does not hold. **The mutation form only affects the circular oracle**, because only `sites()` reads
the text shape. Under the coverage-only oracle the two forms are semantically identical — verified
directly:

```
Does the FORM change the COVERAGE-ONLY verdict?
  prefix (mine)     coverage-only oracle -> SURVIVED
  callee (yours)    coverage-only oracle -> SURVIVED
```

Both of us measured 137 with the coverage-only oracle. So the form difference could not have influenced
either measurement, and our agreement on 137 was genuine independent agreement on a correct figure — not
a shared artifact.

Which makes the provenance: **137 was correct for the code at 157 tests. 129 is correct at 174, after
eight cells closed.** That is a usable audit trail with a verifiable delta. Recording 137 as
"unreliable, measured with a broken form" would retire a checkpoint that is actually sound, and would
attach a wrong reason to a right conclusion — which is the thing this thread has spent nine rounds
pruning out of the document.

Worth noting where the impulse comes from, because it is the interesting part: after being wrong twice on
this number you now treat agreement itself as suspicious. That is the right instinct pointed at the wrong
instance. Agreement is evidence of a shared instrument only when the instrument was shared; here it was
not, and I can show it was not.

## Correction 2 — you have two families, not one with six instances

Your six do not all belong together, and separating them is worth more than the count:

**Family A — a shared instrument produces agreement, and agreement reads as evidence.**
Song at the rubric level · `description#1` at the locator level · `jest context-emendator` at the oracle
level · filtered-versus-unfiltered at the comparison level (the mirror: shared method producing apparent
disagreement) · shared method at the reviewer level.

**Family B — a property is stated and never checked.**
`gaps[]` asserted to prevent an assumption · the implementation-name warning asserted to exist ·
canonicalization required with no stated consumer · `value`/`unit`/`conditions` "for quantities" with no
trigger · `moves_surface` given a consequence and no cross-check · **site-count preservation, named by you
two rounds before you violated it.**

Your sixth instance is Family B, not A. And the two have **different detection methods**, which is the
practical reason to keep them apart:

- Family A is caught by **varying the instrument** — a second oracle, a second measurer, a rename, an
  isolated copy.
- Family B is caught by **asking who consumes the property** — name the check, or delete the sentence.

Collapsing them loses that. Family B is also the larger one and the one that runs through the *document*
rather than the instruments: it produced most of the findings in the first five rounds, and your
schema-side ceiling rule — every paragraph asserting a field does work must name the check that makes it
do the work — is precisely Family B's detector, generalised. Point it at the harness as well as the
schema and site-count preservation would have been caught at the moment you named it.

## Closing, for real this time

129, from a harness with a negative control, an attribution check, a preserving-form assertion, and a
named oracle. Four guards covering three known modes, each documented with which mode it covers.

The thing I would carry out of eleven addenda: every finding in this thread was one of two shapes, and
both are detectable cheaply once named. Vary the instrument, or name the consumer. Neither requires
knowing in advance what is wrong, which is the only property that survives the reviewer being as fallible
as the author — which, on the record here, is roughly the case.

## Addendum 11 probes

| Probe | Content | Result |
| --- | --- | --- |
| form vs oracle | both mutation forms under the coverage-only oracle | identical verdicts — the form cannot have affected either 137 |
| arithmetic | 132/129/99/33/30 and the 137→129 delta | self-consistent on every identity |
