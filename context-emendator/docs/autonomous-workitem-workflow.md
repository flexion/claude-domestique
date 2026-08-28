# Autonomous work item to Ready for Merge — pilot workflow

GOAL: Take a work item to Ready for Merge -- complete, correct, and high quality -- without a human in the loop, and stop on a fixed condition rather than when the reviewers run out of things to say.
HOW: Reconstruct the item's goal, problem, and obligations into one boundary bundle -- recording for every part whether the item stated it, the repository supplied it, or the two disagree -- have that bundle independently reviewed, and freeze it before implementation; then implement on an isolated branch against that boundary and nothing else, with mechanical gates and one bounded repair loop per review kind. Escalate whenever the item's goal cannot be recovered, the boundary cannot be made decidable, a genuinely new obligation appears, or the coupling reaches past what this repo controls.

Acceptance criteria fit to serve as a completion metric are the output of the first two stages, not the
input to them. See `## The item is evidence, not a specification` — it is the highest-risk part of this
design.

Merge is a human approval boundary. After a confirmed merge event a separate idempotent
merge-watcher records the merge SHA and may project the item to its closed state, but only when no
post-merge or production obligation remains. The run itself has already stopped by then.
Deploy and rollback are a named handoff, out of scope.

Actor: action form. One line per step. `WI-1234` is the worked example — the workflow is not bound to
a tracker, so the key is opaque.

Each stage opens with GOAL, HOW, JUSTIFICATION with its grounding in
`research/satisficing-references/text/` by file stem and line, and IMPACT as high, medium, or low
against the overall GOAL. `no source` is a real answer, not a gap in the citation work — the corpus
is silent on most of this.

## What this supersedes

A 24-phase version of this document was committed at `6939dc2` and is superseded by this one. An
adversarial cross-model review found it not actually issue-to-Done, internally contradictory on
freeze and on the test model, and disproportionate in ceremony. Nine outright errors were fixed
first, in that commit; this rewrite is the architectural answer. The prior version is in history if
the detail is wanted — nothing here needs it.

**Seven stages is a ceiling, not a target.** A stage is a *persisted workflow state with its own
entry and exit condition*. Headings, artifacts, agents, and operations inside a state do not count,
which is how the previous version reached 24. Promoting an eighth stage requires either the same
causally diagnosed failure class in two or more independent pilot runs, or one confirmed hard-harm
event — plus evidence that the failure cannot be handled by changing an existing stage. Record that
decision in the run evidence. Do not create a document to hold the process for it.

## Two ports, and why they are separate

The workflow names no tracker. It calls two adapters, and they are independent because real setups
split them: Jira is a tracker with no forge, GitHub and Azure DevOps supply both, and beads is a
tracker that is local rather than hosted. Jira plus GitHub is probably the most common combination
there is, so a design that conflates them is unusable.

**Tracker port** — work items.

| Operation | Required | Used by |
| --- | --- | --- |
| `list_eligible(filter)` | yes | stage 1 |
| `read(ref)` | yes | stages 1-2 |
| `comment(ref, text)` | yes | escalation |
| `attach_reference(ref, label, uri)` | yes | stage 3 freeze |
| `project(ref, state, note)` | best effort | stages 1, 3, 7 |
| `claim(ref, owner, expiry, fence)` | capability-gated | stage 1 |
| `assign(ref, owner)` | optional | escalation |

**Forge port** — branch, pull request, checks: `create_branch`, `open_pr`, `mark_pr_ready`,
`checks_status(sha)`, `observe_merge(pr)`. All required. A tracker-only setup cannot run this pilot,
which is a statement about scope rather than a gap to work around.

### The run record is authoritative; the tracker is a projection

This is the load-bearing consequence of going generic. Trackers have incompatible state machines —
Jira's are configurable with validators and transition permissions, GitHub Issues has open and closed
plus labels, Azure Boards has per-process states, beads has its own set. The workflow's states cannot
live in any of them.

So the run record holds the state and the tracker receives a **best-effort projection**. A tracker
that cannot represent `handoff_pending` simply does not: the item stays open with a comment naming the
open handoffs and their owners. Nothing downstream ever reads state back out of the tracker, and a
failed projection is an event in the run record rather than a stalled run.

### Claim is the operation most likely to be missing

Everything else degrades gracefully. Atomic claim does not — without it two orchestrators take the
same item and both run.

| Tracker | Claim primitive | Degradation |
| --- | --- | --- |
| Azure DevOps Boards | revision-based optimistic concurrency on work item update | none needed |
| Jira | conditional issue-property update | none needed |
| beads | transactional local database | sound against one shared database; cross-machine claims settle only as that database syncs |
| GitHub Issues | none — issue field writes are last-write-wins | the lease must move to an external store |

Config declares each adapter's capabilities, and the stage-1 gate refuses to start when a required one
is absent — the same treatment as a missing ownership map, because an undeclared capability is a
configuration error rather than something to discover at runtime. Where `claim` is unavailable the
lease lives in an external compare-and-set store and any tracker-side claim is advisory decoration.

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
independent reconstruction at stage 3 — which is a counterweight only because the two sides' `moves_surface`
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

**This is not an eighth stage.** It is what stage 2 was already doing, named, plus one comparison at
stage 3. Reconstruction has a decent claim to its own persisted state, but the promotion rule wants a
diagnosed failure class across two pilot runs and there have been no pilot runs.

The honest counterweight belongs next to that, as the thing to watch: reconstruction now has its own
linter pass, its own actor pair, its own code prefix, its own escalation family, and its own stop state,
and it is the largest thing inside any stage. If a pilot diagnoses a reconstruction failure class twice,
the promotion evidence will already be sitting here.

And the schema's analogue of the stage ceiling, since the ceiling is the constraint that actually worked:
**every paragraph asserting that a field does work must name the check that makes it do the work.** The
`gaps[]` claim above is the first thing that rule caught, and it was false for a full round.

**The rule was applied forward-only when it was written, and that was the wrong scope.** It was aimed at
the paragraph that had just been falsified, and `gaps[]` was pre-existing prose — so were two more
overclaims found afterwards by other readers: the Linter was said to warn on an entry that names an
implementation, and no such check exists at all, and the evidence pass was said to reject a test-case id
the runner does not collect, which needs a runner. A rule introduced to catch a defect class, applied
only to the text that exposed it, leaves the rest of the class in place.

Retroactive pass, then. Every field claim in this document now names its check, and three do not have
one. They are recorded as limits rather than as behaviour — but **they are not equally far off, and
grouping them as "the same unimplemented integration" was wrong**:

| Limit | What it buys | Check written and tested | Production input |
| --- | --- | --- | --- |
| Locator resolution | a fabricated citation becomes catchable | yes — `E_LOCATOR_UNRESOLVED` | tracker adapter's addressable part list |
| Test-case collectability | a phantom test id becomes catchable | yes — `E_EDGE_CASE_NOT_COLLECTED` | the runner's collected-case list |

**Both rows were written off as "blocked on infrastructure" for two rounds, and that was wrong in the
same way the canonicalization estimate was wrong.** Neither pass needed the infrastructure to have its
check *written or tested*: `lintEvidence` and `lintInterpretationPair` already took a second artifact, so
the list is threaded in as a parameter — a fixture today, the adapter and the runner in production. The
infrastructure then feeds an already-tested check rather than arriving alongside an untested one.

`valid-item-parts.yaml` and `valid-collected-cases.yaml` are those fixtures. The circularity is real and
bounded: today the author writes both the locators and the part list, so the check catches a slip rather
than a lie. It still closes the fabricated-locator case now, it gives the stage-3 comparison a domain
that free text does not have, and it becomes non-circular for free when the lists arrive from elsewhere —
without the check changing. An absent list is recorded as a **declared** no-domain exemption, never a
silent pass, because that is the difference between a limit and a lie about coverage.

This does **not** rescue the degenerate overlap case. Two reconstructions both citing a *valid*
`description#1` are still indistinguishable from each other, which is why `abstain` exists and why there
is still no diversity metric.

**There were three, and the third was deleted rather than implemented.** Comment-preserving
canonicalization was a requirement on the wrong mechanism, and two rounds of cost estimates — first
"the same unimplemented integration as the adapter", then "a dependency decision" — both took the
requirement itself for granted.

The general form is worth stating, because it survived two review rounds and is cheaper to make than any
defect in the linter: **a cost estimate looks like the answer to a scoping question.** Escalating from
one wrong cost to a better wrong cost feels like a correction because the number changes, while the
question — is this a requirement, and what does it buy — has not been asked. The cheap test is whether
anyone has written down the *consumer*. Canonicalization had four mentions in this document and no stated
consumer, which was visible the whole time. The table above now carries a `What it buys` column for
exactly that reason.

Read the freeze bullet: the Orchestrator **commits the manifest and every referenced asset to the run
branch** and records the commit SHA in the same event. Git blob and tree hashes are byte-stable,
comment-preserving, content-addressed digests of exactly those bytes — that is what they are. The
property canonicalization was introduced to establish is established one clause earlier by a mechanism
this document already specifies.

Worse than redundant, it was the **wrong property**. Canonicalization deliberately erases textual
difference so that semantically identical manifests digest identically. The digest's stated job is
*identity* — "the frozen bundle is the only input" — and a canonical digest would let two different
files freeze to the same value. It would have weakened the guarantee while appearing to secure it.

And the comment-preserving loader had no consumer. Nothing in `context-emendator` writes YAML, and the
only actor that amends a frozen bundle is the Author, a model editing text — which preserves comments
because they are in the text being edited. The Orchestrator's job on an amendment is to regenerate
downstream *assets*, not to rewrite the manifest in place. The requirement would matter the moment a
*script* rewrote the manifest, and no script does; it is recorded as a precondition on a future
programmatic amendment path rather than as a gap in this one.

The YAML typing tests keep asserting `js-yaml` behaviour, and nothing needs re-verifying, because
nothing replaces `js-yaml`.

The audit is the reason the locator finding above exists — nobody had looked at that sentence since it
was written.

**The reconstruction is the ceiling on everything after it.** Stages 3 through 7 verify against the
frozen bundle, so a faithful implementation of a wrong reconstruction passes every gate and reports
`ready_for_merge`. TICK gives that outcome its shape: a response that fabricated its sources answered
9 of 10 generated checklist questions YES and scored 2/5 from a human annotator
(`checklist--cook-2024:1961`), because the generated checklist inherited the instruction's false premise
(`:1878`).

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

One consequence for the tracker port: `read(ref)` must return the item as **addressable parts with
stable identifiers** — `description#1`, `comment#4` — rather than one blob of text, because every
`item_locator` resolves against that addressing and the stage-3 comparison of locator sets is noise
without it. Where an adapter can only address whole fields, locators are field-level and the check is
coarser, which is a real loss and still better than free-text citations that cannot be compared at all.

## The boundary file

`boundary/WI-1234.yaml` is a **manifest**, not a lone criteria list. It carries the obligation
entries inline and digest-references every other normative asset — the mechanism sketch, the coupling
analysis, the `entails` map, the selected registry revision. Freezing computes and records a **bundle digest** over the
manifest plus every referenced asset. "The frozen bundle is the only input" is then true; "the
boundary file is the only input" was not, because stages 4 through 6 legitimately read the sketch and
the coupling analysis.

The bundle is committed to the run branch, which exists from stage 1. An earlier draft committed it
before any branch existed, which would have landed the boundary on the base branch or lost it.

Manifest-level fields, all required — every one of these was implied by prose and named only after a
reference linter could not be written without them:

| Field | Purpose |
| --- | --- |
| `schema_version` | The manifest's own version, so a linter can refuse a shape it does not know |
| `tracker` | Which adapter produced `item` — `jira`, `azure-boards`, `github-issues`, `beads`, … |
| `item` | The work item reference, opaque to everything downstream |
| `registry_revision` | The pinned registry revision the floor was selected from |
| `mandates[]` | The declared mandate set. Orphan-entry and unanchored-mandate checks are unimplementable without it, and "one reviewer per mandate" has no domain |
| `non_goals[]` | Non-empty |
| `interpretation` | The reconstruction of goal, problem, and provenance. Everything else descends from it |
| `claims[]` | `id` plus text, from stage 2 |
| `coupling[]` | `id`, `kind`, `target` — the id is the key space for `entails` |
| `entails{}` | Keyed by **coupling edge id**, valued by obligation entry id or the literal `uncovered` |
| `registry_selections[]` | The entry ids that were **selected** from the registry at `registry_revision`, rather than authored for this issue. Provenance is declared here because it cannot be inferred: an earlier draft decided it by matching `INV-<n>`, which made the claim unfalsifiable and let a rule be defeated by renaming an id |
| `entries[]` | The obligations |

`traces[]` resolves against claim, coupling-edge, or entry ids. An entry may use its own id as an
upstream trace only when that id is declared in `registry_selections[]`; selection, not an `INV-*`
spelling convention, is the provenance declaration. An earlier draft inferred the last case from the
id spelling and left the selected-entry case ambiguous.

**What `traces[]` is for**, which an earlier draft never said — it stated only what a trace resolves
*against*, which is a syntax rule wearing a semantics rule's clothes, and a resolution rule with no
stated purpose is satisfiable by any self-consistent closed set:

> `traces[]` anchors an obligation to a requirement stated **outside** the boundary. At least one
> trace must reach a claim, a coupling edge, or this entry as a declared registry selection. A trace
> to another entry records a relationship between obligations and does not discharge the anchoring
> requirement.

Two constraints follow from that purpose rather than being added on top of it:

- An entry may not trace **its own id** unless it appears in `registry_selections`, where tracing the
  registry is the anchor. Any other self-reference resolves and anchors nothing.
- `traces[]` must be non-empty. Carrying an empty list satisfies "the entry carries traces" and
  anchors nothing, so the list is required to have at least one member.

### `interpretation` — the reconstruction, carried inside the manifest

It is in the manifest rather than a side file because it is normative. `claims[]` descend from it, and
freezing a bundle whose reconstruction was not frozen with it would leave the run's definition of the
goal mutable after the freeze.

| Field | Contents |
| --- | --- |
| `goal.statement`, `problem.statement` | What the item is for; what is wrong or missing now |
| `provenance` on each | `stated` \| `stated_unverified` \| `inferred` \| `contradicted` |
| `support[]` on each | Typed pointers, below |
| `claim_provenance{}` | Keyed by claim id, valued by the same `provenance` plus `support[]` shape |
| `corrections[]` | One per place the item asserts something the repository contradicts |
| `gaps[]` | One per element the item did not supply |

`claim_provenance` is a map rather than a field on each claim for a reason that is not cosmetic: the
same block is written by two actors. The Author writes one into the manifest at stage 2, and the
Boundary-reviewer writes a **standalone** one at stage 3 with no entries and no claims list. One shape
means one set of rules and one linter for both, and it means the reviewer's artifact is not a partial
boundary.

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
Every rule here establishes that a citation was *written*, not that it points at anything.

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

**A code's prefix is its contract**, and the suite asserts the three sets partition the registry so a
code cannot be quietly reclassified.

| Prefix | Class | Consequence |
| --- | --- | --- |
| `E_` | retryable | the Author can fix it; earns another lint round |
| `W_` | warning | recorded, non-gating; no available remedy, so neither a round nor a stop |
| `X_` | terminal | the run stops with a reason code; no authoring round can change it |

Outcomes are `fail`, `pass`, `exempt`, `warn`, and `provisional`. `provisional` halts spending without
ending the run and exists for one case: an `absence`-triggered terminal on the Author's side, which
routes straight to stage 3 because the independent reconstruction is the only thing that can tell an
unanchored item from an unanchored reading of it. The cost argument for stopping early is preserved —
no mechanism sketch, no coupling analysis, no registry pass — while the conclusion waits for the
evidence that decides it.

The failure modes those `X_` codes correspond to are tabulated once, above. Two limits on
`X_ITEM_UNANCHORED` specifically, both real: it detects the total absence of item anchoring rather than
weak anchoring, and it is deliberately not reached from a badly-cited or badly-typed `stated` claim,
because letting a retryable failure decide a terminal one is how a run stops for the wrong reason.

`filled_from: unresolved` means **established** unsettleable and never "not filled in yet", so it
requires a non-empty `sought[]` of typed pointers that were checked and did not settle it. Without that
the literal did double duty and an honest first-draft placeholder ended the run with no round available
to replace it — while a *wrong* pointer continued it. A missing `sought[]` is retryable, which the
suppression policy then keeps from terminating.

`W_ANCHOR_DISJOINT` is the one warning. Two reconstructions citing no item locator in common may be
reading different requirements, but locator overlap is not reading agreement in either direction, and no
authoring round can fix a disjoint reading. So it is recorded and requires the semantic divergence test
rather than standing in for it.

Every entry carries three closed fields. The **cross-product is exhaustive** — partial rules were how
the previous draft left `observation` + `must` and `post_merge` + `must` undefined.

| `verifier` | `verification_stage` | `obligation` | Effect |
| --- | --- | --- | --- |
| `mechanical` | `pre_merge` | `must` | Executable test required. Gates stage 5. |
| `independent_review` | `pre_merge` | `must` | Gates stage 6, reviewer sees the implementation. |
| `mechanical` or `independent_review` | `post_merge` or `production` | `must` | Cannot be discharged here. Requires a handoff object. Caps terminal state at `Handoff Pending`. |
| `observation` | any | `must` | **Not allowed.** An observation cannot gate; the Linter rejects it. Author it as `watch`, or supply a `mechanical`/`independent_review` proxy. |
| any | any | `watch` | Preserves a watch window and escalation signal. Explicitly not an acceptance criterion. |

Handoff object, required for every `post_merge` and `production` must: `owner`, `trigger`,
`verification_method`, `evidence_destination`, `failure_transition`. Its **presence and field
completeness are mechanical**; whether the handoff is *feasible* is semantic and belongs to the
Boundary-reviewer, not to a script. The previous draft called every rule here mechanical, which was
false.

Each entry also carries `id`, `statement`, `observation`, `decision`, `traces[]`, and a
`quantitative: true | false` declaration. No script can read a statement and decide whether it
asserts a number, so the author declares it; when true, a `quantity` object with `value`, `unit`, and
`conditions` is required.

**`quantity.value` must be a quoted string.** This is a mitigation, not a preference. The reference
linter's `js-yaml` loader turns an unquoted `1.10` into the number `1.1` and silently changes a
threshold; its core-schema option does not prevent that, as the tests assert. Requiring the quoted
form is the place this reference implementation can catch the corruption. Floor invariants are **selected** from
`registry/invariants.yaml` at a pinned revision, by path glob, never authored per issue.

Only `mechanical` + `pre_merge` + `must` entries carry `test_role` and a baseline. Base-versus-head
gating is meaningless for a `post_merge` or `production` entry, which cannot be checked here at all,
and for a `watch` entry, which gates nothing.

`test_role` is one of:

- `change` — the behavior is new or altered.
- `preservation` — the behavior must not change. Floor invariants are almost always this, and an
  earlier draft made them unrepresentable by requiring every mechanical must to fail on base.

`baseline` is a closed union, and the Linter constrains it against `test_role`:

| `baseline` | Meaning | Allowed with |
| --- | --- | --- |
| `assertion_fail` | The test runs on base and its assertion fails | `change` |
| `expected_error` | The test cannot run on base, and that *is* the evidence — carries a typed `error_code` and a match pattern | `change` |
| `pass` | The test runs and passes on base | `preservation` |

Head expectation is always `pass`. There is exactly one authority for the baseline, which is this
field — an earlier draft said the gate accepted an error "when the entry declares" one while no such
field existed, and in the same sentence required the outcome to be `failed`.

**The evidence map is a stage-4 artifact, not part of the frozen bundle.** It is authored by the
Implementer once tests exist, keyed to entry ids, and carries the frozen bundle digest it was written
against. An earlier draft made evidence a field of the manifest, which put three checks a stage
earlier than the data they need and froze the bundle before the map was written.

**Evidence edges bind an entry to a specific collected test case**, by runner node id, not to a test
file. A runner outcome is scalar, so one test *file* cannot simultaneously evidence a `change` entry
that must fail on base and a `preservation` entry that must pass on base. Two constraints follow. The
reference linter implements the second now; the first needs runner integration and remains an explicit
gap:

- An edge names a collected test case id. The Gate must reject an id the runner did not collect; until
  that collection integration exists, the reference linter can only require a non-empty `case_id`.
- A single test case may carry several edges only if every one of them declares the **same**
  `baseline`. Conflicting baselines on one case are rejected.

One entry may still need several test cases. "One test discharges several entries" holds only under
that same-baseline constraint.

**A preservation edge also needs a sensitivity probe**, or pass-on-base plus pass-on-head proves
nothing — `assert True` satisfies it. Each preservation edge declares one of:

- `negative_control` — a known-bad fixture the test case must fail against.
- `mutation` — a named controlled perturbation of the code under test that the case must catch.

The Gate runs the probe and requires the case to fail against it. An entry with no available probe is
**not** a mechanical entry: reclassify it as `independent_review` rather than let stage 5 claim it
proved something. This is the difference between outcome stability, which pass/pass shows, and
sensitivity to the invariant, which is what the entry actually asserts.

The Markdown view is rendered on demand and never committed.

## The run record

`runs/WI-1234/<run-id>.jsonl`. Append-only, one file per **run attempt** rather than per issue, so
a refreeze starts a new run rather than mutating an old one. A single orchestrator owns sequence
allocation and append.

Envelope per event: `schema_version`, `run_id`, `seq`, `timestamp`, `actor`, `event_type`,
`input_digests`, `outcome`, `reason_code`, `evidence_refs`.

Large CI logs and review payloads are immutable content-addressed artifacts referenced by
`evidence_refs`, not inlined. Deferrals are events. Current state, the deferral list, and every human
view are **derived projections** — never a second source of truth, never committed.

This is cross-cutting infrastructure, not a stage. Metadata alone is not durability, so the
guarantees are named rather than implied — `run_id`, `seq`, and `input_digests` are inputs to these
mechanisms, not substitutes for them:

- **Durable store and append guarantee.** The stream lives on a store providing single-writer
  atomic append with a monotonic `seq`; a torn write is detectable and the last complete record wins.
- **Fencing needs an enforcement point.** Presenting a token stops nothing on its own; the sink, or
  a credential-holding gateway in front of it, has to reject a stale one. Route every external effect
  through one gateway that holds the credentials and checks the current fence, because no tracker,
  git host, or CI system will do it for you.
- **Idempotency is per-sink, not universal.** Many sinks accept no arbitrary key. Where a native key
  exists, use it. Where none does, write an external marker before acting and reconcile by query on
  resume — the marker plus the query is the idempotency.
- **Keys must include the input.** `(run_id, operation)` collides: a repair round re-triggers CI for
  the same run and operation. The key is `(run_id, effect_kind, target, input_digest)`, where
  `input_digest` is the head SHA for anything branch-scoped.
- **Intent then result.** Each external effect appends an `intent` event before acting and a `result`
  event after. A crash between them is recoverable precisely because the intent is on disk.
- **Startup reconciliation.** On resume the orchestrator replays the stream, finds every intent with
  no result, and reconciles against the real world — tracker, git, PR, checks — before proceeding. This is
  the answer to the crash-between-PR-creation-and-event case, which no amount of metadata solves.
  Intent-then-result replay is only sound once the per-sink semantics above exist; without them it
  detects the gap and cannot close it.

---

## 1. Qualify and claim

GOAL: Take exclusive ownership of one eligible work item, or leave it alone.
HOW: Query for eligible work items, claim one under a compare-and-set, and run a preliminary screen for conditions already visible in the item text. The conclusive eligibility decision cannot happen here and is taken at the end of stage 2.
JUSTIFICATION: An item that is obviously out of scope should cost nothing to reject, but coupling and production obligations are not known until stage 2, so rejecting on them here would repeat the ordering defect one stage earlier. -- (no source -- eligibility screening is local judgment)
IMPACT: medium -- (SWE-bench Verified -- 68.3% of samples were filtered as unusable by professional annotators, so screening rejects a large fraction cheaply, but it decides nothing about the ones that pass)

- Orchestrator (no model): calls `list_eligible` with the configured filter; the filter is adapter-specific and lives in config, not here
- Orchestrator (no model): refuses to start if the configured tracker does not declare the `claim` capability and no external claim store is configured
- Orchestrator (no model): calls `claim` — owner, expiry, `run_id`, fencing token — against the tracker or the external store; a lost compare-and-set is a no-op, not a retry
- Orchestrator (no model): opens `runs/WI-1234/<run-id>.jsonl` and appends `run_claimed` with the tracker id and item reference
- Orchestrator (no model): creates branch `agent/WI-1234/<run-id>` from the target base, so the frozen bundle has somewhere to live
- Orchestrator (no model): runs the **preliminary** screen only — issue type, labels, declared component ownership, and any pre-declared out-of-scope marker
- Orchestrator (no model): on preliminary reject — appends `run_ineligible` with a reason code, finalizes the lease, stops

## 2. Author the boundary

GOAL: Reconstruct what the item is for, then produce one boundary bundle containing every obligation that would settle it, plus the sketch and coupling analysis it rests on.
HOW: Read the item alone first, then resolve what it says against the repo and logs, recording for every part whether the item stated it, the repository supplied it, or the two disagree. Sketch the change surface, run coupling analysis against that sketch, and select floor invariants from the registry rather than writing them.
JUSTIFICATION: The item is unrefined, so obligations have to be reconstructed rather than transcribed, and coupling cannot be found before a mechanism is chosen -- so the reconstruction precedes the sketch, the sketch precedes the analysis, and all three precede the freeze. -- (RubricBench :151 -- models "fail to define the necessary constraints on their own", 27% gap against human rubrics, which is why the floor is selected and not authored; :1172 -- a model-authored rubric on an ill-posed task "devolves into a standard implementation checklist" and penalises correct refusal)
IMPACT: high -- (RubricBench :151 -- the boundary is what "correct" means for this run, and the corpus identifies the criteria rather than the reasoning as the binding constraint; :1278 -- an underspecified instruction produced a rubric validating "math performed on arbitrary assumptions", which is the failure this stage either prevents or commits)

- Author (Opus 5 max or gpt-5.6-sol max): reads the item alone and records what it says — goal, problem, numbered claims — each with an `item_locator` pointing at the part of the item that says it
- Author (Opus 5 max or gpt-5.6-sol max): does this pass first and separately because provenance is otherwise unrecoverable — read the item and the repository together and nothing afterwards can say which of them told you
- Author (Opus 5 max or gpt-5.6-sol max): resolves each claim against read-only repo, logs, and deploy history; quantifies vague terms from data
- Author (Opus 5 max or gpt-5.6-sol max): sets provenance from that resolution — `stated` where corroborated, `stated_unverified` where neither corroborated nor contradicted, `contradicted` where the repository shows otherwise — and adds `inferred` entries for anything the item never mentioned
- Author (Opus 5 max or gpt-5.6-sol max): writes one `corrections[]` entry per contradicted part, naming the item's assertion, the repository's finding, its support, a resolution, and whether the correction **moves the change surface**
- Author (Opus 5 max or gpt-5.6-sol max): writes one `gaps[]` entry per element the item did not supply, naming what it was filled from, or the literal `unresolved` where nothing can settle it
- Linter (no model): lints the interpretation on its own, before any mechanism work is paid for, and reports terminal findings separately from fixable ones
- Orchestrator (no model): on an **assertion**-triggered terminal finding — appends the reason code, calls `attach_reference` so the drafted interpretation reaches the item as the run's product, finalizes the lease, stops; it consumes no lint round, because no further authoring round can change it
- Orchestrator (no model): on the **provisional** finding that nothing in the reconstruction is anchored — skips the mechanism sketch, the coupling analysis, and the registry pass, and goes straight to stage 3 with the interpretation alone; the spend stops here and the run does not
- Author (Opus 5 max or gpt-5.6-sol max): writes a **bounded mechanism sketch** — the chosen change surface, affected interfaces and subsystems, data and control-flow edges, external dependencies; not code and not a plan
- Orchestrator (no model): runs coupling extractors against the sketch's named surface
- Author (Opus 5 max or gpt-5.6-sol max): writes the `entails` map — one edge per coupling edge or consumer id to the obligation id that covers it, and an explicit `uncovered` marker where none does
- Linter (no model): rejects the bundle if any coupling edge is neither mapped nor marked `uncovered`, so coverage is declared rather than assumed
- Author (Opus 5 max or gpt-5.6-sol max): selects applicable `INV-*` from the registry; emits `escalate: floor_gap` if one is missing
- Author (Opus 5 max or gpt-5.6-sol max): writes `boundary/WI-1234.yaml` with the three closed fields per entry, a handoff object for every `post_merge` **and** `production` must, `test_role` plus `baseline` on every `mechanical` + `pre_merge` + `must`, and a non-empty non-goals list
- Linter (no model): validates the schema and resolves every trace
- Linter (no model): does not try to decide whether an entry names an implementation, because that
  judgment is not mechanically decidable; the Boundary-reviewer evaluates it in the adversarial pass
- Linter (no model): re-runs up to `MAX_LINT_ROUNDS`, then escalates `criteria_not_lintable`
- Orchestrator (no model): runs the **mechanical** half of the conclusive eligibility check now that coupling and obligations exist — does the coupling map name a path outside the ownership map, and does every `post_merge` or `production` must carry a complete handoff object
- Orchestrator (no model): on mechanical ineligibility — appends `run_ineligible`, finalizes the lease, stops before any model call is spent

> Mechanism-aware authoring is compatible with withholding the candidate implementation, but that
> compatibility is a local design inference and not RubricBench evidence. The source withholds
> candidate *responses*; it says nothing either way about a design sketch.

## 3. Review and freeze

GOAL: Get the item read and the boundary reviewed by someone who did not write either, then fix the boundary so nothing later can move the target.
HOW: An independent cross-family reviewer reconstructs the item before seeing the boundary, and a material divergence between the two readings escalates rather than resolving in the Author's favour. It then reads the boundary, the sketch, and the coupling analysis and tries to satisfy every entry while failing the item's evident intent. On success the boundary is amended and re-reviewed; on a clean pass it is committed and frozen.
JUSTIFICATION: A boundary reviewed only by its author trades an unbounded failure mode for a bounded and silent one, and a reviewer handed the Author's reading cannot independently check the reading. -- (Panickssery :145, :166 -- GPT-4 recognises its own output 73.5% of the time and self-preference is linearly correlated with self-recognition; Song :894, :1041 -- sharing rubric structure alone lifts inter-judge agreement from r̄ ≈ 0.24 to r̄ ≈ 0.62, so identical inputs manufacture the concurrence this stage is relying on; :87 for the independent-generation collapse)
IMPACT: high -- (Wall :435 -- an aspiration level adapted from recent outcomes "could also become negative", making a performance decline acceptable; the freeze stops that, and the independent review stops the freeze from locking in a wrong target)

- Orchestrator (no model): starts Boundary-reviewer in a fresh session, cross-family from the Author
- Orchestrator (no model): gives it the item text and read-only repo access and **withholds the boundary**, so its reading of the item is not anchored on the Author's
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): writes its own standalone `interpretation` — goal, problem, claims, provenance, typed support — under the same rules and the same linter
- Linter (no model): lints the reviewer's side under the same rules; where the Author anchored and the reviewer did not, that is `E_REVIEWER_RECONSTRUCTION_UNUSABLE` and a fresh-reviewer retry, because an absence on the reviewer's side is a statement about the reviewer
- Linter (no model): resolves the Author's provisional absence against the reviewer's — **both unanchored** is `X_ITEM_UNANCHORED`, corroborated by two blind cross-family readings and now genuinely a property of the item; **Author unanchored, reviewer anchored** is `E_AUTHOR_RECONSTRUCTION_INADEQUATE`, and the Author re-authors against the reviewer's locators
- Linter (no model): does not call the reviewer's absence a reviewer defect when the Author is also unanchored, because there it is the corroboration rather than an indictment — treating it as a defect made it a retryable finding, which then suppressed the very conclusion it corroborates
- Linter (no model): compares the two — warns `W_ANCHOR_DISJOINT` when their `stated` and `stated_unverified` parts cite no item locator in common, and reports `X_MOVES_SURFACE_DISPUTED` when the two sides disagree about whether correcting the same thing moves the change surface
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): then receives the Author's interpretation and describes one change that satisfies its own reading of the goal while failing the Author's, or returns `readings_agree`
- Orchestrator (no model): on a described divergence — escalates `intent_ambiguous` and attaches both interpretations; two defensible readings mean the choice between them has an owner
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): receives the boundary, the sketch, the coupling analysis, the `entails` map, and keeps read-only repo access; receives no candidate change, and no reasoning about **mechanism** — the Author's reasoning about **intent** it has already seen, because the interpretation is exactly that
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): checks every `entails` edge, because that map is what later permits work to continue without a refreeze; an edge it rejects becomes `uncovered`
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): judges handoff **feasibility** first — the semantic half of eligibility, which the Linter cannot do; an infeasible handoff exits `ineligible` here, before the adversarial exercise and without a second top-model call
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): describes a change that satisfies every entry literally while failing **its own recorded reconstruction** of the goal, or returns `no_gap_found`; a described gap counts and no artifact is owed
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): is anchored to that artifact rather than to "the item's evident intent" because by this point it has read the Author's interpretation, so evident intent would mean the Author's statement of it — the reconstruction is already persisted, so anchoring to it costs nothing and is what makes the ordering matter
- Author (Opus 5 max or gpt-5.6-sol max): on a gap — amends the exploited entry
- Orchestrator (no model): invalidates every bundle asset downstream of the amendment and re-runs the stage-2 derivations that produced them — mechanism sketch, coupling analysis, registry selection, handoff objects — then the Linter and the conclusive eligibility check, before a fresh review round
- Orchestrator (no model): does this because an amendment can move the mechanism surface; without it the frozen digest faithfully preserves stale coupling
- Orchestrator (no model): repeats with a fresh reviewer up to `MAX_BOUNDARY_ROUNDS`, then escalates `boundary_ungameable_unproven`
- Orchestrator (no model): commits the manifest and every referenced asset to the run branch, computes the **bundle digest**, appends `boundary_frozen` with that digest and the commit SHA, and calls `attach_reference` so the item points at the frozen bundle
- Orchestrator (no model): from here the frozen bundle is the only input; the item text is not read again

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
> What escalation rate this produces is unknown, and it remains the most likely reason the stage needs
> retuning.

## 4. Implement

GOAL: Produce a candidate change that satisfies the frozen boundary and nothing else.
HOW: Work on the run branch, writing tests for every mechanical must before implementing — failing on base for a change entry, passing on base for a preservation entry. Open a draft PR when the branch is ready for the gate.
JUSTIFICATION: A test committed before the fix, with its baseline behavior recorded, is what makes "obligation discharged" a fact rather than a claim. -- (Huang :721 -- "the code executor serves as the perfect verifier", the one carve-out the self-correction literature grants, conditional on an oracle that discriminates)
IMPACT: high -- (Lightman :76 -- process supervision solves 78.2% of the MATH subset against 72.4% for outcome supervision and the gap widens with N; :63 -- it "specifies the exact location of any errors")

- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes tests covering every `mechanical` + `must` entry — a `change` entry needs a test that fails on base, a `preservation` entry needs one that passes on base — and commits them as their own commit
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): records the entry-to-test evidence map, which is many-to-many
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): implements until green, touching only paths the sketch named
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): appends out-of-scope defects as `deferral` events; does not fix them
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): emits `escalate: coupling_found_after_freeze` on any consumer whose obligation coverage is not already declared
- Orchestrator (no model): accepts mechanically **only** an exact hit in the frozen `entails` map — a reviewed edge from a coupling-edge or consumer id to an obligation id, authored in stage 2 and frozen in the bundle; presence in the coupling analysis or in `traces[]` proves the consumer was *known*, which is not the same as an obligation covering the new work
- Adjudicator (Opus 5 max or gpt-5.6-sol max): decides everything else, cross-family from the Implementer or a human — "entailed" is the **permissive** direction, so it is constrained the same way safety rejection is
- Orchestrator (no model): treats anything unmatched, ambiguous, or undecided as `boundary_invalid` — the conservative default, because the failure direction is shipping past an obligation nobody agreed to
- Orchestrator (no model): never adds an entry in place, and never treats logging an addition as authorization
- Orchestrator (no model): opens a draft PR, appends `pr_opened` with the PR number and head SHA

## 5. Mechanical gate

GOAL: Prove every mechanical must is discharged, before spending a reviewer.
HOW: Run CI plus the discrimination and scope checks against the branch. Return failures to the implementer for one bounded repair loop.
JUSTIFICATION: A test committed green proves nothing on its own, so the gate has to check it against the base and confirm the baseline its entry declared — failing for a change entry, passing for a preservation one. -- (Huang :721 -- the verifier is "perfect" only given a behavioral oracle that actually discriminates, which a green suite does not establish)
IMPACT: high -- (Huang :721 -- an executable check is the only verdict in this design that does not rest on model judgment)

- Gate (no model): fails if a `mechanical` + `must` entry has no test in the evidence map
- Gate (no model): for `test_role: change` — requires outcome `failed` on base and `passed` on head; rejects an `error` caused by unrelated setup or collection, but accepts an error that *is* the expected absence, such as the import of a module the change introduces, when the entry declares that as its baseline expectation
- Gate (no model): for `test_role: preservation` — requires `passed` on base and `passed` on head; a preservation test that fails on base is testing something else
- Gate (no model): fails if CI is not green on the head SHA
- Gate (no model): fails if the diff touches a path the sketch does not name
- Orchestrator (no model): on failure — returns to Implementer up to `MAX_GATE_RETURNS`, then escalates `gate_not_passable`
- Orchestrator (no model): appends `mechanical_gate_passed` with the CI artifact digest

## 6. Independent semantic review

GOAL: Get a verdict on every independent_review must from a reviewer that did not write the change.
HOW: One fresh cross-family reviewer receives the diff, the boundary, and the coupling analysis, and returns a verdict per in-scope entry with an evidence pointer on every fail. Cited fails create one bounded repair loop; uncited observations do not.
JUSTIFICATION: A reviewer asked to find problems will supply problems, so the loop needs a mechanical rule separating a finding from a work item. -- (Sharma :18 -- five assistants "consistently exhibit sycophancy"; :263 -- challenged on a correct answer, Claude 1.3 wrongly admits a mistake on 98% of questions)
IMPACT: high -- (Zheng :60 -- judge-human agreement tops out near 80%, "the same level of agreement between humans"; this is where quality is actually found and also where the ceiling binds)

- Orchestrator (no model): starts Reviewer in a fresh session, cross-family from the Implementer
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): receives the diff, the frozen bundle, read-only checkouts of **both base and head**, and the `evidence_refs` for this run's CI and gate artifacts; receives neither the implementer's session nor any prior round
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): returns `pass` | `fail` | `unable_to_verify` per in-scope entry, with a typed evidence value on every fail — `test_id`, `file:line`, `trace_id`, `artifact_ref` into a content-addressed artifact, or `observation` carrying a reproduction command and its captured output
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): uses `observation` for failures that are output, a log line, a command result, or an absence; without that form a valid semantic fail is either dropped by Triage for lacking a citable pointer or becomes an avoidable `unable_to_verify` that invalidates the boundary
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): returns uncited observations in a separate array; no cap on cited verdicts
- Triage (no model): drops findings with no entry id, an out-of-scope id, or a fail without evidence, and appends every drop as an event
- Triage (no model): routes `unable_to_verify` to the boundary as a spec defect, which invalidates the boundary rather than the change
- Orchestrator (no model): on cited fails — one repair round, then escalates `semantic_review_not_converging`
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): repairs the cited entries; stage 6 gates `independent_review` entries and `verifier` is singular, so no test is owed here — an optional regression test is allowed, not required

## 7. Finalize and hand off

GOAL: Reach an autonomous stop state that names exactly what a human is being asked to do.
HOW: Mark the PR ready, write the handoff summary as a projection of the run record, and stop. Project the item's closed state only on an observed merge event, and only when nothing post-merge or production remains open.
JUSTIFICATION: Accepted imperfection has to be written down, or the next agent rediscovers the deferred items and starts fixing them. -- (Petersson :173 -- in ten years of capture-recapture research "only one paper has been classified" as an experience report)
IMPACT: medium -- (Petersson :173 -- the corpus's own failure mode is knowledge that never reached practice, but no source measures whether a record prevents it)

- Orchestrator (no model): marks the PR ready for review; appends `ready_for_merge`
- Orchestrator (no model): renders the handoff summary from the run record — obligations discharged, deferrals with reasons, rounds consumed, residual risk, every open handoff object with its owner and trigger
- Orchestrator (no model): sets the autonomous stop state to `Handoff Pending` rather than `Ready for Merge` while any `post_merge` or `production` must is unresolved
- Orchestrator (no model): **finalizes the execution lease here**, at the autonomous stop, not after merge — the wait for human approval is unbounded and must not be held under lease
- Merge-watcher (no model): a separately triggered, idempotent continuation keyed by `(run_id, "merge")`; it is not part of the run's execution
- Merge-watcher (no model): on an observed merge event — appends `merged` with the merge SHA
- Merge-watcher (no model): projects the item's closed state only when a merge is recorded and no `post_merge` or `production` must remains open; otherwise the item stays open with its handoffs and owners in a comment

---

## Safety exception — a conditional escape branch, not a stage

An uncited reviewer observation may **request a stop**. It may never create work. That asymmetry is
what keeps the exception from becoming an unbounded reviewer veto: a cited finding can produce repair
work, an uncited one can only invalidate the boundary.

- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): may file a safety exception only for a closed set — security-boundary breach, secret or privacy exposure, data loss or corruption, irreversible external side effect
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): must supply an observed counterexample or reproducible evidence reference, the affected asset, the impact, and why no frozen obligation applies
- Adjudicator (Opus 5 max or gpt-5.6-sol max): a distinct actor cross-family from the Reviewer, or a human, returns `confirm` | `reject` | `unable`; no severity score and no open invariant category, because both restore veto discretion
- Adjudicator (Opus 5 max or gpt-5.6-sol max): on `unable` — the outcome is treated as `confirm`, because uncertainty about a hard-harm claim resolves toward stopping
- Orchestrator (no model): requires a cross-family adjudicator or a human specifically to **reject**; rejection is the unsafe direction and same-family rejection is not permitted
- Orchestrator (no model): on confirm — appends `boundary_invalid`, ends the run; this does **not** authorize an in-run fix
- Orchestrator (no model): on reject — appends `safety_exception_rejected` carrying `finding_id`, category, affected asset, canonical claim, `submission_digest`, the original `evidence_refs`, adjudicator, reason, and timestamp
- Orchestrator (no model): suppresses the identical **evidence packet**, not the underlying hazard — the `finding_id` is stable, each submission gets its own digest
- Orchestrator (no model): allows one automatic reopening when a resubmission declares `novel_evidence_refs` and the adjudicator confirms a material evidence delta; further reopening needs a human override event

Suppression is a projector outcome derived from the stream, never a deletion. A wrongly rejected
data-loss report stays legible to anyone reading the run.

## Reference implementation

`scripts/lint-boundary.js` implements the current schema-local mechanical rules in three passes:
`lintBoundary` for stages 2 and 3, `lintInterpretationPair` for the two blind reconstructions, and
`lintEvidence` for stage 5 once tests exist. Codes prefixed `X_` are terminal and the suite asserts that
the terminal set and the `X_` set are the same set, so a code cannot be quietly demoted to retryable.
It **does** check test-case collectability and `item_locator` resolution, and it **cannot supply their
inputs**: both take a list from the caller — a fixture in the suite, the runner and the tracker adapter
in production — and record a declared no-domain exemption when none is given. That is a different claim
from "not implemented", which is what this sentence said for two rounds while both passes already
accepted a second artifact.
The suite also asserts **tracker independence**: the same boundary lints clean with a Jira key, a
GitHub `org/repo#n` reference, an Azure Boards integer, a beads id, and an opaque string from an
adapter nobody has written. A key shape that means something to one tracker must mean nothing to the
linter, or the schema is Jira-shaped with a generic label on it.

`schemas/fixtures/` carries one valid boundary and targeted negative fixtures across the three passes.
`schemas/transcriptions/BUG-4471.yaml` is an instance transcribed from the source design conversation's
worked example, authored under the earlier `INV`/`AC`/`PRES` vocabulary before this schema existed. It
is there because a fixture written by the schema's author to fit the schema's rules is weak evidence;
one written before the rules is better.

The valid fixture is a deliberately unrefined item: it states a symptom and no goal, supplies no
numbers, and asserts one thing that is not true. All three are recorded rather than smoothed over,
which is the only way a positive fixture can demonstrate what the interpretation block is for. A valid
fixture describing a well-specified item would prove nothing about the case this workflow actually
faces.

That transcription produced **two** findings, one about the pilot and one about the schema. `PRES-4`,
concurrent export capacity, is only verifiable in production, so it carries a handoff and caps the
run. **The first worked example terminates at `Handoff Pending`, not `Ready for Merge`** — a test
asserts this, so it is a recorded property rather than a surprise.
The second finding changed the schema: `stated_unverified` and the rule against it grounding a `must`
came out of this transcription, as described above. That is the direction this register is supposed to
run in — a finding from a case authored before the rules, rather than from anyone reviewing the rules.

`scripts/__tests__/lint-boundary.test.js` asserts the exact finding set for each, so a rule that
stops firing fails a test rather than passing silently.

Run it directly:

```
node context-emendator/scripts/lint-boundary.js context-emendator/schemas/fixtures/*.yaml
npx jest context-emendator/scripts/__tests__/lint-boundary.test.js
```

It is not wired into the root `npm test`; `context-emendator` has no package manifest, and adding one
is a separate decision.

The linter records **outcomes, not only failures** — `fail`, `pass`, `exempt`, `warn`, and
`provisional`. That shape exists
because of a specific defect: asserting an empty finding list cannot distinguish "every check ran and
passed" from "a check never ran", and an exemption reads identically to approval. A per-issue entry
wearing a registry-shaped id was exempted from the self-trace rule and looked approved for two
commits. Positive fixtures now assert which checks evaluated, and the one exemption in the valid
fixture is asserted as an exemption.

Two guards matter more than the fixture count, because hand-written fixtures inherit the blind spots
of whoever wrote the rules — 22 of them shared the defect 9 of them shared:

- **Necessity.** Every code the linter can emit must fire on some input, asserted as a set. Before
  this, 45 codes were emitted and 24 asserted, and eight check sites — including handoff field
  completeness, which this document calls mechanical — could be deleted with no test failing.
- **Totality.** The closed enums and all eighteen cells of the cross-product are generated rather
  than sampled, so a combination cannot be silently undecided.
- **Non-growth.** `scripts/mutation-sweep.js` generates every enum-exclusion mutation over the entry
  loop — each of 28 emission sites crossed with each value of `verifier`, `verification_stage`, and
  `obligation`, 224 in all — and reports which the **fixture corpus** cannot see: 132. The test asserts
  that set does not grow. It is a fast pre-filter with measured error in both directions, **not** a
  coverage measurement; see below.

**The number is real, and the sweep is not a conservative filter. Both of those were established the
hard way.**

The reasoning that built it: an exact-code-set assertion catches a check deleted or weakened on a value
some fixture carries, but not a weakening keyed on a value no fixture carries — and one such weakening, a
terminal check quietly exempted for `resolution: ambiguous`, passed the entire suite. Closing that class
with fixtures would need one per reachable cell. So the sweep measures instead, over the **fixture
corpus**, and reports 132 of 224.

An offset experiment then measured that against the real coverage suite, one jest invocation per cell.
Its first result was **zero survivors**, which would have meant every one of the 132 was a false
positive — and it was an artifact of a **circular oracle**. The command used as ground truth,
`npx jest context-emendator`, includes `mutation-sweep.test.js`, which is itself a mutation detector.
Every mutation was "caught" by the instrument being measured. An independent reviewer caught this by
cross-referencing a cell I had personally confirmed as a survivor two rounds earlier, which contradicted
the new zero; excluding the sweep's own suite from the oracle reproduces the survivor immediately.

Re-run with the coverage suite alone as the oracle, over all 224 cells:

| Measure | Cells |
| --- | --- |
| Fixture-corpus survivors (fast battery) | 132 |
| Real-oracle survivors | 137 |
| In both | 100 |
| Fast-only — false positives | 32 |
| Real-only — reported covered, actually survive | 37 |
| &nbsp;&nbsp;… of those, **vacuous** — the code cannot fire in that cell at all | 30 |
| &nbsp;&nbsp;… of those, **genuine gaps** | **7** |

So the totals nearly agree while the *sets* differ, which is the part an aggregate hides — and the
set difference is itself mostly an artifact. Comparing a reachability-filtered list against an
unfiltered one counts 30 no-ops as gaps: excluding `E_BASELINE_REQUIRED` for
`verifier: independent_review` removes nothing, because that check only runs inside
`isGating`. The honest false-negative count is **7**, not 37.

Those seven were real, and are now closed. Both are checks that fire **outside** the gating cell while
the corpus only ever exercised them inside it: `E_SELF_TRACE` on any entry, and
`E_HANDOFF_INCOMPLETE` for any verifier. Seven generated crossings close all seven, verified by
re-running each mutation.

What the sweep is, therefore: a **fast, biased pre-filter** with both error directions measured — and
the lesson about comparing it to anything is that a filtered set and an unfiltered set are not
comparable, which is how 7 became 37 and how a nine-code "cluster with a shape" turned out to be
mostly nothing.

**The instrument needed the thing this document requires of everything else.** A preservation obligation
here cannot be discharged without a sensitivity probe — a `negative_control` or a `mutation` the test
must fail against — because pass-on-base plus pass-on-head proves nothing. The sweep had no such probe,
and it was reviewed repeatedly against this document by two readers who both missed that. It has one
now: `scripts/mutation-offset.js` runs the **null mutation** first, writing the source back unchanged and
requiring the oracle to report SURVIVED. If an unmutated file reads as caught, the oracle has no
discriminating power and the run aborts naming the cause.

That guard catches one of two measured failure modes and not the other, which is why both are kept:

| Mode | Effect | Caught by |
| --- | --- | --- |
| Baseline stale relative to the linter | Oracle is a **constant** — the null mutation itself reads as caught, so every cell does | the null mutation, on iteration one |
| Instrument inside the oracle | Oracle is **self-referential** — mutating the linter changes what the sweep computes | naming the oracle explicitly; the null mutation passes here |

**Every finding in this document's review history is one of two shapes, and they have different
detectors.** Keeping them apart is the practical point: the detection method differs, so collapsing them
loses one.

**Family A — a shared instrument produces agreement, and agreement reads as evidence.**
Song at the rubric level, where 62% of inter-judge agreement is attributable to the shared rubric
structure. `description#1` at the locator level, where two opposite readings citing one default string
were recorded as concurrence. `jest context-emendator` at the oracle level, where the mutation detector
sat inside its own ground truth. A reachability-filtered list compared against an unfiltered one at the
comparison level, where the artifact of the comparison read as a finding. And two reviewers sharing a
method at the reviewer level, where five figures matching exactly should have read as a shared procedure
rather than as confirmation.

*Detector: vary the instrument.* A second oracle, a second measurer, a rename, an isolated copy.

**Family B — a property is stated and never checked.**
`gaps[]` asserted to prevent an assumption it did not prevent. A Linter warning on entries that name an
implementation, asserted to exist when no such check existed at all. Comment-preserving canonicalization
required for four mentions with no stated consumer. `value`/`unit`/`conditions` required "for quantities"
with nothing triggering it. `moves_surface` given a mechanical consequence and no cross-check.
Site-count preservation named as the condition for a valid mutation two rounds before the harness
violated it.

*Detector: ask who consumes the property.* Name the check or delete the sentence — which is the
schema-side ceiling rule above, generalised. **It applies to the instruments as well as the schema**, and
pointing it at the harness would have caught site-count preservation at the moment it was named.

Family B is the larger of the two and runs through the *document* rather than the instruments; it
produced most of the findings in the first five review rounds. Neither detector requires knowing in
advance what is wrong, which is the only property that survives the reviewer being as fallible as the
author — which, on this record, is approximately the case.

**The denominator was wrong twice, in opposite directions, and hid itself.** Two independent
implementations of this sweep first reported 33 sites / 264 mutations and 29 / 232. One found the loop
opening and then scanned a fixed 200-line window, overrunning into the following sweeps by 39 lines.
The other anchored on `entries.forEach((e, i) => {` and got the *first* match, which is an id-registration
one-liner 21 lines above the real loop. Six emission sites between them were outside the entry loop.

What made it self-concealing is the interesting part. A mutated guard on a site outside that loop
references an `e` that does not exist, so it throws `ReferenceError` — and because the guard is lazily
evaluated it throws only when it fires. A throw changes the battery's signature, so every phantom
mutation read as **caught** and contributed zero survivors. The inflated denominator therefore produced
no visible symptom, which is why one implementation reported the same 144 raw survivors under two
different denominators.

Reconciled: **28 sites, 224 mutations**, agreed by both implementations once bounded correctly. The
sweep now asserts that no mutation throws, because a phantom site silently counted as caught is the
same "passes for the wrong reason" shape the suite guards against elsewhere.

The corrected shares are **48%** and **59%** live for the two reachability methods, not the 41% first
reported — that figure divided by the inflated denominator, and the arithmetic error ran in the
flattering direction.

That caveat is now closed by measurement, and the answer is that **both** effects are real and neither
dominates. The battery compares the full code-and-outcome multiset per fixture, which is stronger than
the suite per fixture — that produces 32 false positives. It covers none of the generated, pair-pass or
YAML tests, which is narrower — that produces 37 false negatives. An earlier version asserted a single
direction without support, and a later one asserted the opposite direction on a circular measurement.
Measured: 132 against 137, overlapping in 100. The bias is now known in both directions and stated,
which is what makes the fast battery usable and what stops it being quoted as coverage.

## Unrepresentable is a legal verdict

`schemas/transcriptions/` holds cases transcribed from sources that predate the schema, each with a
declared verdict in `index.yaml`. This exists because a fixture written by the rules' author can only
say *I made this pass* or *I made this fail*; neither can express **a real case the schema cannot
represent**, so schema findings had nowhere to live.

One is on record. An obligation that only a party outside this repository can discharge — a vendor
attesting that a format change does not break their ingest — has no home in `verification_stage`,
whose members all name a point in *this* pipeline. An earlier draft had `verifiable_in` with an
`external` member and the rewrite to three closed fields dropped it. Encoding it as
`production` + handoff misstates it: the trigger is another organisation acting rather than an
interval, and `failure_transition` cannot revert something we do not control.

**It lints clean, and that is the finding.** The obligation is mis-encoded rather than malformed, so
no mechanical check can see it. A test asserts the clean result precisely so the gap cannot be lost.
Either `verification_stage` gains `external` with an event-triggered handoff, or the autonomy gate
must reject such an item at stage 1 and say so. It currently does neither.

**One stated requirement is unmet, and an earlier version of this section overstated what the tests
show.** It claimed the tests "prove `NO`, `on`, `off`, and `1.10` all survive as strings". That was
false twice: `js-yaml` 5.2.3 resolves identically with and without the core-schema option, so those
assertions did not discriminate, and the `1.10` case quoted its own input and asserted a tautology.
**Unquoted, `1.10` becomes `1.1` under every configuration.** The suite now asserts the hazard rather
than a workaround for it, and the linter mitigates it by requiring `quantity.value` to be quoted.

An earlier version of this section carried a second standing requirement — that the Linter use a
*comment-preserving round-trip loader*, because "canonicalization must be byte-stable" — and named the
`yaml` package and `ruamel` as the choice to make. **That requirement is withdrawn rather than
deferred.** Freezing already commits the manifest and every referenced asset to the run branch, and git
supplies a byte-stable comment-preserving content-addressed digest of exactly those bytes; a
canonicalizing digest would have made two different files freeze to the same value, which is the
opposite of the identity the freeze asserts. Nothing in this plugin writes YAML, and the only actor that
amends a bundle is a model editing text. The requirement returns as a precondition if a script is ever
given the manifest to rewrite.

## Stop conditions

Two different things were conflated in an earlier draft. An **autonomous stop state** ends the run's
execution and finalizes the lease. A **lifecycle final state** is where the work item ends up, which
may be later, is not the run's business, and is a projection the tracker may be unable to represent
faithfully.

Expect `handoff_pending` to be the common outcome rather than the exception. Any obligation that can
only be verified after merge or in production caps the run there, and a realistic issue usually has at
least one — the first worked example transcribed into this schema has exactly one, and a test asserts
it. A design that treats `ready_for_merge` as the normal case will mis-set expectations.

Autonomous stop states — every one finalizes the lease:

| Stop state | Reached when |
| --- | --- |
| `ready_for_merge` | Mechanical gate green, every in-scope must passed, no `unable_to_verify`, nothing post-merge or production open |
| `handoff_pending` | As above, but a `post_merge` or `production` must remains |
| `boundary_invalid` | Genuinely new or unmatched obligation, `unable_to_verify` on a must, or a confirmed safety exception |
| `escalated` | Any cap reached, with its reason code |
| `ineligible` | Preliminary or conclusive eligibility screen rejected the item |
| `interpretation_blocked` | An assertion-triggered terminal finding, a corroborated unanchored item, or a material divergence between the two reconstructions. The run's product is the drafted interpretation, attached to the item |

`interpretation_blocked` exists because the other five rows do not fit and an earlier draft left the
terminal stops mapping to none of them. It is not `escalated` — no cap was reached, and terminal findings
deliberately consume no round. It is not `ineligible` — the item was eligible and the screen passed. It
is not `boundary_invalid` — no new obligation appeared and nothing failed to verify. Giving it a row is
the argument the earlier draft already made without following through: these are not failures of the run
in the way the others are.

Lifecycle final states, reached by the merge-watcher and not by the run:

| Final state | Reached when |
| --- | --- |
| item closed | Merge recorded **and** no `post_merge` or `production` must open |
| item open with handoffs | Merge recorded, obligations outstanding, owners named in a comment |
| item unchanged | No merge; a human decides what happens to the PR |

Caps live in config, not in prose: `MAX_LINT_ROUNDS`, `MAX_BOUNDARY_ROUNDS`, `MAX_GATE_RETURNS`, and
one semantic repair round. Every cap is a handoff, not a signal to buy another round.

Reason codes: `floor_gap`, `ineligible_no_handoff`, `ineligible_crosses_boundary`,
`criteria_not_lintable`, `boundary_ungameable_unproven`, `coupling_found_after_freeze`,
`gate_not_passable`, `semantic_review_not_converging`, `ineligible_infeasible_handoff`,
`coupling_unmatched_after_freeze`, `no_sensitivity_probe`, `requires_product_tradeoff`,
`requires_stakeholder_preference`, `underdetermined_by_issue`, `requires_unavailable_observability`,
`item_unanchored`, `item_correction_changes_scope`, `intent_ambiguous`,
`reviewer_reconstruction_unusable`, `author_reconstruction_inadequate`.

The interpretation reason codes — those four plus `underdetermined_by_issue`, which until now had nothing
that produced it — are **not** failures of the run in the way the others are. Each ends with a drafted
goal, problem, and obligation set attached to the item, which is more than the item had when the run
started. Expect them to be the most common outcome, because the premise of this design is that items
arrive unrefined.

`reviewer_reconstruction_unusable` and `author_reconstruction_inadequate` are the exceptions among them:
both are retries under `MAX_BOUNDARY_ROUNDS` rather than stops, and they exist so that a failure by
either reconstructor is never reported as a property of the item.

## Out of scope, named rather than omitted

Deploy, rollback, merge-queue interaction, post-merge verification, and on-call escalation. Each
needs an owner and a trigger recorded in the relevant handoff object. Bot-merge through `Done` is a
materially larger system and is deliberately not smuggled in here.

## Offline — not in the run loop

- Human (human): hand-grades a sample of completed runs
- Human (human): specifically grades the **reconstruction** against what the requester actually wanted, on items where that person is reachable — the only measurement that can tell a correct interpretation from a confident one, and the only check on the terminal escalations being right
- Calibrator (no model): measures reviewer precision and recall against those labels
- Calibrator (no model): reports the interpretation escalation rate and its breakdown, because a design that escalates every item and a design that escalates none are both failures and neither is visible from inside one run
- Calibrator (no model): runs one strong-prompt single-pass implementation against the same boundary as a same-budget baseline
- Human (human): reviews the deferral projection on its own cadence
- Human (human): adds each production-discovered implicit contract to the registry
- Orchestrator (no model): sets every cap from cross-run data, offline, never from inside a running loop

> Huang :731 prescribes evaluating any multi-call scheme "against baselines with comparable inference
> costs", and :691 found a reported gain that came from a requirement belonging in the initial prompt.
> Without the baseline this pilot cannot tell its own contribution from inference budget. A sample of
> five would give one or two graded reviews per mandate — enough for a direction, not a number.

---

## Appendix A — evidence provenance

Status of each stage against `research/satisficing-references/text/`:

| Status | Stages |
| --- | --- |
| **Supported** | 2 floor selected not authored · 2 the interpretation block itself, as the recording of a failure the corpus measures three ways · 3 independent review and ex-ante freeze · 3 withholding the boundary from the reviewer · 4 leaf-level executable verification · 5 discrimination as the condition on the executor carve-out |
| **Hypothesis — targets a measured failure, remedy untested** | 2 declared provenance and typed support as the mitigation for assumption injection · 3 adversarial boundary review · 3 the blind-reconstruction divergence test and its calibration · 6 citation rule, evidence pointers, cross-family routing · the safety exception |
| **Local judgment — corpus silent** | 1 eligibility screening · 2 mechanism sketch and coupling analysis · 2 the `stated_unverified` rule, which came from a transcription rather than a source · 7 handoff record · every cap value · the stage ceiling |
| **Not available** | Any coverage estimate. Capture-recapture needs a closed population and reviewers blind to each other; this loop changes the artifact between rounds. A pass bounds scope and makes no claim about what was missed. |

Two overclaims corrected from the superseded version: cross-model review was tagged Supported on
Panickssery, which establishes self-preference bias rather than validating this configuration; and
offline calibration was tagged Supported on JudgeEval, which is an existence proof of a scoring
pattern rather than evidence that a small sample estimates per-mandate precision usefully.

## Appendix B — model and effort config

Config, not architecture. Verified 2026-08-28: Claude figures from the bundled `claude-api` skill;
Codex model selection and API effort levels from the official OpenAI model guidance.

| Actor | Claude | Codex |
| --- | --- | --- |
| Author | Opus 5 max | gpt-5.6-sol max |
| Boundary-reviewer | Opus 5 max | gpt-5.6-sol max |
| Implementer | Sonnet 5 xhigh | gpt-5.6-terra xhigh |
| Reviewer | Opus 5 xhigh | gpt-5.6-sol xhigh |
| Adjudicator | Opus 5 max | gpt-5.6-sol max |
| Orchestrator · Gate · Linter · Triage · Calibrator | no model | no model |

Notes that are easy to get wrong. Haiku 4.5 rejects the `effort` parameter, so a cheap Claude lane is
Sonnet 5 at `low`. The bare `gpt-5.6` alias routes to Sol, not Terra. `ultra` is a Codex CLI effort
value that is unavailable through the Responses API; that is the whole defensible statement.
Substituting `max` plus orchestrator-side fan-out is a separate hypothesis about how to recover the
capability, not a translation, and it is untested. GPT-5.6's API default is `medium`; a client may
override it, so every run record must retain the effective model and effort rather than infer either
from a client default.

Cross-family pairing at stages 3 and 6 is the point, not a preference: the reviewer must not share a
family with the actor whose work it is checking.
