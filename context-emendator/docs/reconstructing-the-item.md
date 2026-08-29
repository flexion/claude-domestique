---
slice: reconstructing-the-item
job: >-
  Recover what a work item is for — its goal, its problem, and the obligations that would
  settle it — and produce one `interpretation` artifact corroborated by a second independent
  reading, or stop with the drafted interpretation as the run's product.
ships:
  - kind: deterministic
    path: context-emendator/lib/lint-interpretation.js
  - kind: prompt
    path: context-emendator/prompts/author-blind-read.md
  - kind: prompt
    path: context-emendator/prompts/reviewer-blind-read.md
  - kind: doc
    path: context-emendator/docs/reconstructing-the-item.md
gating_test:
  status: planned
  command: npx jest context-emendator/lib/__tests__/lint-interpretation.test.js
  evidence: >-
    Exact finding-set assertions over the interpretation fixtures; the five
    assertion-versus-absence portability assertions; a prompt template contract asserting
    that every placeholder binds and that the declared output shape validates against the
    linter's input schema.
non_gating:
  - Model eval over `tests/transcriptions/`, cases authored before this schema existed.
  - Offline hand-grading of the reconstruction against what the requester actually wanted.
depends_on:
  - tracker-and-forge-ports
terminal_failure_owned:
  - X_GAP_UNRESOLVABLE
  - X_QUANTITY_ASSUMED
  - X_CORRECTION_CHANGES_SCOPE
  - X_RECONSTRUCTION_UNANCHORED
  - X_ITEM_UNANCHORED
  - X_MOVES_SURFACE_DISPUTED
source_lines: 90-199, 234-237, 275-292, 350-430, 606-614, 639-647
---

# Reconstructing the item

**Slice boundary.** Recover what a work item is for — its goal, its problem, and the
obligations that would settle it — and produce one `interpretation` artifact corroborated by a
second independent reading, or stop with the drafted interpretation as the run's product.

| | |
| --- | --- |
| Ships | `lib/lint-interpretation.js` · the Author's blind-read prompt · the Boundary-reviewer's blind-read prompt · this document |
| Gating test | *planned* — `npx jest context-emendator/lib/__tests__/lint-interpretation.test.js`. Exact finding-set assertions over the interpretation fixtures, the five assertion-versus-absence portability assertions, and a prompt template contract asserting every placeholder binds and the declared output shape validates against the linter's input schema |
| Non-gating | Model eval over `tests/transcriptions/` · offline hand-grading of the reconstruction against what the requester actually wanted |
| Depends on | [`tracker-and-forge-ports`](tracker-and-forge-ports.md) — `read(ref)` must return addressable parts, or every `item_locator` has nothing to resolve against |
| Terminal failure owned | `X_GAP_UNRESOLVABLE`, `X_QUANTITY_ASSUMED`, `X_CORRECTION_CHANGES_SCOPE`, `X_RECONSTRUCTION_UNANCHORED`, `X_ITEM_UNANCHORED`, `X_MOVES_SURFACE_DISPUTED` — all reaching the `interpretation_blocked` stop state |
| Source lines | 90-199, 234-237, 275-292, 350-430, 606-614, 639-647 of the pre-split `autonomous-workitem-workflow.md` |

GOAL: Recover the item's goal, the problem it is solving, and the obligations that would settle
it, with every part declaring whether the item stated it, the repository supplied it, or the two
disagree.
HOW: Read the item alone first and record what it says, each part carrying a locator. Then
resolve those claims against the repository, logs, and history, and set provenance from that
resolution. A second reader reconstructs the item blind, and the two readings are compared before
either is trusted.
JUSTIFICATION: The item is unrefined, so obligations have to be reconstructed rather than
transcribed. -- (RubricBench `:151` -- models "fail to define the necessary constraints on their
own", 27% gap against human rubrics; `:1172` -- a model-authored rubric on an ill-posed task
"devolves into a standard implementation checklist" and penalises correct refusal)
IMPACT: high -- this is the ceiling on every slice after it.

This slice owns the `interpretation` contract. [`the-boundary-bundle`](the-boundary-bundle.md)
consumes it by reference and does not restate its schema.

## The item is evidence, not a specification

Real trackers hold unrefined, incorrect, and incomplete items. Acceptance criteria fit to serve as an
autonomous completion metric are the exception, not the input. So the first real job of a run is to
recover the item's **goal**, the **problem** it is solving, and the **obligations** that would settle
it — and that reconstruction, not the implementation, is where most runs will fail.

This is measured rather than assumed. Given an ill-posed task — "convert SQL to Mongo for all cases" —
a model-authored rubric "devolves into a standard implementation checklist", then penalises a correct
refusal for "missing code" while rewarding a hallucinated solution
(`rubric-limits--zhang-2026--rubricbench:1172`). The failure is not that the model reconstructed the
criteria badly. It is that the model reconstructed *implementable* criteria from an item that had
none, and everything downstream then verified against them faithfully.

Four failure modes, and they need different handling, because conflating them yields either a
workflow that never starts or one that confidently ships the wrong feature. This table is the only
place they are enumerated; the schema section below names the fields and does not restate the modes.

| Mode | Item against repository | Handling | Code | Reason code |
| --- | --- | --- | --- | --- |
| **Underspecified** | omits something the repository, logs, or history can settle | fill it, record what it was filled from, proceed — the common case, and treating it as an error means nothing ever runs | — | — |
| **Unsettleable** | omits something nothing available can settle | terminal; filling it injects an assumption | `X_GAP_UNRESOLVABLE`, `X_QUANTITY_ASSUMED` | `underdetermined_by_issue` |
| **Contradicted** | asserts something the repository shows is false | proceed when the correction does not move the change surface; terminal when it does | `X_CORRECTION_CHANGES_SCOPE` | `item_correction_changes_scope` |
| **Unanchored** | nothing states what the item is for, and the repository cannot supply it | halts the spend and routes to the independent reconstruction; terminal only once that corroborates it | `X_RECONSTRUCTION_UNANCHORED` → `X_ITEM_UNANCHORED` | `item_unanchored` |

Underspecified and unsettleable were one row in an earlier draft, which hid the fact that the
interesting boundary is not whether the item is silent but whether anything else can speak.

The last row is two codes because it is two claims. "Nothing in *this reconstruction* is anchored"
is what one artifact can support; "nothing in *the item* is anchored" needs a second, independent
reading to agree. An earlier draft collapsed them and ended the run at stage 2 — with the artifact
that distinguishes them specified, evaluated, and ordered out of reach.

Filling a gap is not free, and the corpus names the way it goes wrong. On an underspecified instruction
missing a required interest rate, the human rubric required the model to ask; the model-authored rubric
instead "validates the correctness of the math performed on arbitrary assumptions (e.g., 3%)",
penalising the honest response and rewarding the invented one — the paper's **False Precision Bias**
(`rubric-limits:1278`). An obligation carrying a number the item never supplied and the repository
cannot produce is that failure exactly.

The mechanical counterpart is `quantity.filled_from`, required on every quantitative entry, and it
lives on the quantity rather than in a list somewhere else in the manifest. An earlier draft claimed
the `gaps[]` entry did this work — the worked example's `AC-1` asserts 240 seconds against an item with
no number in it, and the document said that without the gaps entry the threshold "is an assumption
wearing a `quantity` object". That was false: emptying `gaps[]` left `AC-1` standing and the manifest
clean, because nothing connected a quantity to the gap that filled it. Provenance has to be recorded at
the point of use or it is a parallel record that enforces nothing.

Escalating an unanchored item is not an admission of defeat. PaperBench hit the same wall and answered
it the same way: "To deal with underspecification, we collaborate with authors from the papers to make
specific choices about what is important", noting that "there exist many different realizations of our
paper rubrics which are no less valid"
(`rubric-impl--starace-2025-openai--paperbench:1447`). Where several readings are equally valid,
choosing one is a decision with an owner, and the owner is not this run. The run's product in that case
is the drafted interpretation, attached to the item through `attach_reference`.

**The escalation cannot be the reconstructing model's judgment call, and this design does not fully
achieve that.** RubricBench's execution-failure analysis finds that models "struggle to operationalize
rubric-implied behaviors such as abstention or rejection when tasks are indeterminate or infeasible"
even when handed correct human rubrics (`rubric-limits:1289`) — abstention is the specific thing they
are measured to be bad at. What the interpretation block buys is narrower than mechanical adjudication:
the model's judgment becomes a **declared field with a mechanical consequence**. No script can decide
whether a correction moves the change surface, but once the Author declares that it does, the run is
over — terminal, non-retryable, no lint-round loop, no second opinion from the actor that benefits from
a different answer. The declaration is self-serving to under-report, and its only counterweight is the
independent reconstruction below — which is a counterweight only because the two sides' `moves_surface`
declarations are actually **compared**. For one round they were not: the field was read in a single place,
the pair pass never looked at `corrections[]`, and the common case — a blind reviewer that never
rediscovers the contradiction — was clean. A declared field with a mechanical consequence and no
cross-check is the unfalsifiable claim moved one field over, which is the same defect as deciding
provenance by how an id is spelled.

**Terminal findings are protected by two policies, both the same principle.** First, a terminal
conclusion may not be drawn from a document that has retryable defects: four capitalisation typos on
provenance values used to produce a terminal stop, because the enum check returned before the anchor was
counted. The guard is uniform over a pass rather than attached to each check, because the previous
version *was* attached to one check and missed the next case. Second, terminals are evaluated on the
Author's interpretation; a reviewer that anchors nothing produces
`E_REVIEWER_RECONSTRUCTION_UNUSABLE` and a fresh-reviewer retry, not a stop that blames the item.

That second policy needs a distinction to be correct rather than merely safe, and the first version of
it was wrong. Suppressing the reviewer's terminals wholesale discards the reviewer's `moves_surface: true`,
which is precisely the input the cross-side check consumes — the two fixes cancelled. The criterion that
makes both work is **assertion versus absence**, and it is decidable from the source rather than from a
judgment about what a code is "about":

| Trigger | Fires on | Portable between artifacts |
| --- | --- | --- |
| `assertion` | a value the Author wrote — `moves_surface: true`, `filled_from: unresolved`, two written values differing | yes; an assertion is attributable, so it means the same thing wherever it is found |
| `absence` | nothing written — no part declared `stated` or `stated_unverified` | no; "the item states nothing" and "this reading found nothing" are indistinguishable from one artifact |

An earlier version of this split keyed on "the reconstruction's own adequacy versus a property of the
item". That classified the same codes correctly and was undecidable from the source — and the tell was
that it called `X_ITEM_UNANCHORED` an adequacy code while the code's own name, its message, and the
failure-mode table all called it a property of the item. Three places said item, the list said adequacy.
That was a naming bug rather than a classification bug: the two readings are now two codes, and each
name is accurate.

Every terminal code declares its trigger, and the suite tests the declaration against behaviour with
five portability assertions — because an assertion in a comment is the same shape as the exemption that
hid a bug for two commits.

**This is not a separate stage.** It is what stage 2 was already doing, named, plus one comparison at
the review-and-freeze step. Reconstruction has a decent claim to its own persisted state, but the
promotion rule wants a diagnosed failure class across two pilot runs and there have been no pilot runs.

The honest counterweight belongs next to that, as the thing to watch: reconstruction now has its own
linter pass, its own actor pair, its own code prefix, its own escalation family, and its own stop state,
and it is the largest thing inside any stage. If a pilot diagnoses a reconstruction failure class twice,
the promotion evidence will already be sitting here.

### The reconstruction is the ceiling on everything after it

Every slice after this one verifies against the frozen bundle, so a faithful implementation of a wrong
reconstruction passes every gate and reports `ready_for_merge`. TICK gives that outcome its shape: a
response that fabricated its sources answered 9 of 10 generated checklist questions YES and scored 2/5
from a human annotator (`checklist--cook-2024:1961`), because the generated checklist inherited the
instruction's false premise (`:1878`).

The authors' conclusion has to be quoted whole, because an earlier version of this section cut it in a
direction that flattered the argument. It reads: generated-checklist answers "alone should not be used
to score responses **in human evaluation**, but also showing that **human evaluators are robust to
unhelpful or misleading checklists**" (`:1883`). Both restored clauses matter. The scope qualifier is
material — the finding is about human annotators working from a generated checklist, whereas this
pipeline's gates are mechanical checks and a model reviewer, so "this workflow does exactly that" was
too quick. And the second clause is evidence *for* one of the three mitigations rather than against it:
the annotator scored 2/5 correctly while answering 9 of 10 YES, which is the offline hand-graded sample
working. Independent reconstruction, declared support, and that sample are the mitigations; none is a
solution, and the sample is the one with a data point behind it.

## The `interpretation` block

It is carried inside the manifest rather than in a side file because it is normative. `claims[]`
descend from it, and freezing a bundle whose reconstruction was not frozen with it would leave the
run's definition of the goal mutable after the freeze. The manifest that carries it is defined in
[`the-boundary-bundle`](the-boundary-bundle.md); the block's own schema is defined here and is not
restated there.

| Field | Contents |
| --- | --- |
| `goal.statement`, `problem.statement` | What the item is for; what is wrong or missing now |
| `provenance` on each | `stated` \| `stated_unverified` \| `inferred` \| `contradicted` |
| `support[]` on each | Typed pointers, below |
| `claim_provenance{}` | Keyed by claim id, valued by the same `provenance` plus `support[]` shape |
| `corrections[]` | One per place the item asserts something the repository contradicts |
| `gaps[]` | One per element the item did not supply |

`claim_provenance` is a map rather than a field on each claim for a reason that is not cosmetic: the
same block is written by two actors. The Author writes one into the manifest, and the
Boundary-reviewer writes a **standalone** one at the review step with no entries and no claims list. One
shape means one set of rules and one linter for both, and it means the reviewer's artifact is not a
partial boundary.

The provenance values:

| Value | Means | Requires |
| --- | --- | --- |
| `stated` | the item says it and resolution corroborated it | at least one `item_locator` |
| `stated_unverified` | the item says it and resolution could neither corroborate nor contradict it | at least one `item_locator`, and no external support — the absence is the point |
| `inferred` | the repository, logs, or history supply it | at least one pointer that is **not** an `item_locator` |
| `contradicted` | the item asserts it and the repository shows otherwise | as `inferred`, plus a matching `corrections[]` entry |

Support pointers are typed, because an untyped citation is unverifiable: `item_locator`, `repo_path`,
`log_query`, `commit`, `registry_entry`. The two rules that follow are the ones that do the work — a
`stated` claim must carry an `item_locator`, and an inference whose only support is the item it was not
in cites nothing.

**A locator is checked for presence, never for resolution, and that is the weakest point in the whole
provenance system.** The Linter does not read the item — it cannot, since the item lives behind a
tracker adapter — so `description#4` on a two-paragraph item lints exactly as clean as a true citation.
Every rule here establishes that a citation was *written*, not that it points at anything. The domain
that would make resolution checkable is supplied by the tracker adapter and is specified in
[`tracker-and-forge-ports`](tracker-and-forge-ports.md).

The consequence is worse than "cheap to fake by accident", which is how an earlier version of this
paragraph put it. The check did not merely fail to detect divergence — it **affirmatively reported
concurrence**. An author reading of "exports are too slow for large accounts" and a reviewer reading of
"the retry button double-submits and corrupts the manifest", both citing `description#1`, recorded a
`pass`, and the stage reads that as *the two readings are anchored together*. The
manufactured-agreement failure, reproduced inside the check built to detect it.

Two fixes, and neither needs the adapter. **This check now refutes or abstains and never passes** — a
`pass` was the only affirmatively misleading outcome available to it. And the existing exemption is
widened rather than joined by a new rule: it already abstains when either side cites nothing, on the
grounds that the comparison has no domain, and one identical locator on each side is the same
condition — a set with no discriminating power, where identical and opposite readings are
indistinguishable.

Two residuals, stated rather than checked. A side resting on one locator while the other cites three
still reports overlap; drawing that line needs a diversity metric, and the semantic differential is the
real check rather than something worth propping up. And a whole interpretation — goal, problem, and
every claim — can rest on one default locator with nothing flagging it.

`corrections[]` carries `about` (a claim id or the literal `goal` or `problem`), `item_assertion`,
`repo_finding`, `support[]`, `resolution` (`item_wrong` | `repo_changed_since` | `ambiguous`), and
`moves_surface`. `gaps[]` carries `element` and `filled_from`, which is either a support pointer or the
literal `unresolved`.

**`stated_unverified` constrains the obligation graph.** A `must` that traces a `stated_unverified`
claim **at all** is rejected: it gates partly on an item assertion nothing corroborates. Verify the
claim, drop the trace if a coupling edge is the real anchor, or author the obligation as `watch`.

The predicate is "cites an uncorroborated claim" and not "has no corroborated anchor", because the
weaker form was defeated by adding a single coupling-edge trace — and since `entails` requires every
coupling edge to be covered, coupling traces are the normal case rather than an exotic one. The prose
said the rule caught a must that gates on an uncorroborated assertion; the code asked whether the entry
had any corroborated anchor at all. Those differ exactly when an entry has both, and a coupling edge is
a different anchor rather than corroboration of the claim.

That member and that rule came out of transcribing the pre-schema worked example, which carried
`regression since ~July — unverified secondhand`. A three-member enum could record the first half of
that sentence and not the second, so an assertion resolution could not confirm looked identical to one
it did. The source had already solved the consequence without naming the cause: its `C2` grounds a
`watch` entry and gates nothing.

`filled_from: unresolved` means **established** unsettleable and never "not filled in yet", so it
requires a non-empty `sought[]` of typed pointers that were checked and did not settle it. Without that
the literal did double duty and an honest first-draft placeholder ended the run with no round available
to replace it — while a *wrong* pointer continued it. A missing `sought[]` is retryable, which the
suppression policy then keeps from terminating.

`W_ANCHOR_DISJOINT` is the one warning. Two reconstructions citing no item locator in common may be
reading different requirements, but locator overlap is not reading agreement in either direction, and no
authoring round can fix a disjoint reading. So it is recorded and requires the semantic divergence test
rather than standing in for it.

## In the run

The Author's pass, before any mechanism work is paid for:

- Author: reads the item alone and records what it says — goal, problem, numbered claims — each with an `item_locator` pointing at the part of the item that says it
- Author: does this pass first and separately because provenance is otherwise unrecoverable — read the item and the repository together and nothing afterwards can say which of them told you
- Author: resolves each claim against read-only repo, logs, and deploy history; quantifies vague terms from data
- Author: sets provenance from that resolution — `stated` where corroborated, `stated_unverified` where neither corroborated nor contradicted, `contradicted` where the repository shows otherwise — and adds `inferred` entries for anything the item never mentioned
- Author: writes one `corrections[]` entry per contradicted part, naming the item's assertion, the repository's finding, its support, a resolution, and whether the correction **moves the change surface**
- Author: writes one `gaps[]` entry per element the item did not supply, naming what it was filled from, or the literal `unresolved` where nothing can settle it
- Linter (no model): lints the interpretation on its own, before any mechanism work is paid for, and reports terminal findings separately from fixable ones
- Orchestrator (no model): on an **assertion**-triggered terminal finding — appends the reason code, calls `attach_reference` so the drafted interpretation reaches the item as the run's product, finalizes the lease, stops; it consumes no lint round, because no further authoring round can change it
- Orchestrator (no model): on the **provisional** finding that nothing in the reconstruction is anchored — skips the mechanism sketch, the coupling analysis, and the registry pass, and goes straight to the independent reading with the interpretation alone; the spend stops here and the run does not

The independent reading, which is the counterweight the whole slice rests on:

- Orchestrator (no model): starts Boundary-reviewer in a fresh session, cross-family from the Author
- Orchestrator (no model): gives it the item text and read-only repo access and **withholds the boundary**, so its reading of the item is not anchored on the Author's
- Boundary-reviewer: writes its own standalone `interpretation` — goal, problem, claims, provenance, typed support — under the same rules and the same linter
- Linter (no model): lints the reviewer's side under the same rules; where the Author anchored and the reviewer did not, that is `E_REVIEWER_RECONSTRUCTION_UNUSABLE` and a fresh-reviewer retry, because an absence on the reviewer's side is a statement about the reviewer
- Linter (no model): resolves the Author's provisional absence against the reviewer's — **both unanchored** is `X_ITEM_UNANCHORED`, corroborated by two blind cross-family readings and now genuinely a property of the item; **Author unanchored, reviewer anchored** is `E_AUTHOR_RECONSTRUCTION_INADEQUATE`, and the Author re-authors against the reviewer's locators
- Linter (no model): does not call the reviewer's absence a reviewer defect when the Author is also unanchored, because there it is the corroboration rather than an indictment — treating it as a defect made it a retryable finding, which then suppressed the very conclusion it corroborates
- Linter (no model): compares the two — warns `W_ANCHOR_DISJOINT` when their `stated` and `stated_unverified` parts cite no item locator in common, and reports `X_MOVES_SURFACE_DISPUTED` when the two sides disagree about whether correcting the same thing moves the change surface
- Boundary-reviewer: then receives the Author's interpretation and describes one change that satisfies its own reading of the goal while failing the Author's, or returns `readings_agree`
- Orchestrator (no model): on a described divergence — escalates `intent_ambiguous` and attaches both interpretations; two defensible readings mean the choice between them has an owner

> **The divergence test is weak, the calibration is a guess, and the guess was anchored to the wrong
> condition.** Song reports two numbers. Where evaluators generate rubrics independently *including
> their structure*, "agreement collapses to near-random levels (r̄ ≈ 0.24)"
> (`judge-ceiling--song-2026-tencent--evaluation-illusion:87`); standardising the instrument alone
> raises it to r̄ ≈ 0.62 (`:894`, `:1041`). An earlier version of this note reasoned from 0.24 — expect
> near-random divergence, so any similarity threshold escalates everything, so make both halves weak.
> But this design **mandates a shared instrument**: both sides use the same `interpretation` shape, the
> same provenance enum, the same support kinds, the same linter. That is the 0.62 condition, not the
> 0.24 one.
>
> Two consequences, both from the same citation. Expected divergence is materially lower than assumed,
> so the test could afford to be stronger than it is — the escalate-everything fear was calibrated to a
> condition this design does not create. And `readings_agree` is **weaker** evidence than a first reading
> suggests: Song's point is that 62% of agreement is attributable to the shared instrument rather than
> shared judgment, so agreement between two sides using an identical schema is substantially
> manufactured by the schema. Which is the sharper form of the warning, and an argument for keeping the
> two halves weak on a different ground than the one originally given — not because divergence is
> expected to be everywhere, but because agreement proves less than it looks like it does.
>
> What escalation rate this produces is unknown, and it remains the most likely reason this slice needs
> retuning.

## Codes this slice owns

Terminal, reaching `interpretation_blocked`: `X_GAP_UNRESOLVABLE`, `X_QUANTITY_ASSUMED`,
`X_CORRECTION_CHANGES_SCOPE`, `X_RECONSTRUCTION_UNANCHORED`, `X_ITEM_UNANCHORED`,
`X_MOVES_SURFACE_DISPUTED`.

Two limits on `X_ITEM_UNANCHORED` specifically, both real: it detects the total absence of item
anchoring rather than weak anchoring, and it is deliberately not reached from a badly-cited or
badly-typed `stated` claim, because letting a retryable failure decide a terminal one is how a run stops
for the wrong reason.

Retryable: `E_REVIEWER_RECONSTRUCTION_UNUSABLE` and `E_AUTHOR_RECONSTRUCTION_INADEQUATE`. Both are
retries under `MAX_BOUNDARY_ROUNDS` rather than stops, and they exist so that a failure by either
reconstructor is never reported as a property of the item.

Warning: `W_ANCHOR_DISJOINT`.

The prefix contract, the outcome set including `provisional`, and the stop states are defined in
[`autonomous-workitem-workflow`](autonomous-workitem-workflow.md).
