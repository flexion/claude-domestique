---
slice: the-boundary-bundle
job: >-
  Author every obligation that would settle the item, have the bundle adversarially reviewed by
  someone who did not write it, and freeze it so nothing later can move the target — producing
  one committed manifest plus its referenced assets under a bundle digest.
ships:
  - kind: deterministic
    path: modus/lib/lint-boundary.js
  - kind: deterministic
    path: modus/lib/freeze.js
  - kind: prompt
    path: modus/prompts/author-boundary.md
  - kind: prompt
    path: modus/prompts/reviewer-adversarial.md
  - kind: doc
    path: modus/docs/the-boundary-bundle.md
gating_test:
  status: planned
  command: npx jest modus/lib/__tests__/lint-boundary.test.js
  evidence: >-
    Exact finding-set assertions over the twenty-two `bad-*.yaml` fixtures and the valid fixture;
    generated totality over all eighteen cells of the verifier/verification_stage/obligation
    cross-product; a digest-stability test asserting identical bytes freeze to an identical digest
    and a one-byte change does not; a prompt template contract for both authoring prompts.
non_gating:
  - Model eval of the adversarial pass — whether a described gap is a real gap.
  - Escalation-rate reporting for `boundary_ungameable_unproven`, measured across runs.
depends_on:
  - reconstructing-the-item
  - tracker-and-forge-ports
terminal_failure_owned:
  - criteria_not_lintable
  - boundary_ungameable_unproven
  - ineligible_infeasible_handoff
  - ineligible_crosses_boundary
  - floor_gap
source_lines: 238-268, 299-348, 463-511, 543-543, 615-630, 648-659
---

# The boundary bundle

**Slice boundary.** Author every obligation that would settle the item, have the bundle
adversarially reviewed by someone who did not write it, and freeze it so nothing later can move the
target — producing one committed manifest plus its referenced assets under a bundle digest.

| | |
| --- | --- |
| Ships | `lib/lint-boundary.js` · `lib/freeze.js` · the Author's boundary-authoring prompt · the Boundary-reviewer's adversarial prompt · this document |
| Gating test | *planned* — `npx jest modus/lib/__tests__/lint-boundary.test.js`. Exact finding-set assertions over the 22 `bad-*.yaml` fixtures, generated totality over all eighteen cross-product cells, a digest-stability test, and a prompt template contract for both prompts |
| Non-gating | Model eval of the adversarial pass · escalation-rate reporting for `boundary_ungameable_unproven` |
| Depends on | [`reconstructing-the-item`](reconstructing-the-item.md) — owns the `interpretation` contract this manifest carries · [`tracker-and-forge-ports`](tracker-and-forge-ports.md) — `attach_reference` and the run branch |
| Terminal failure owned | `criteria_not_lintable`, `boundary_ungameable_unproven`, `ineligible_infeasible_handoff`, `ineligible_crosses_boundary`, `floor_gap` |
| Source lines | 238-268, 299-348, 463-511, 543-543, 615-630, 648-659 of the pre-split `autonomous-workitem-workflow.md` |

GOAL: Produce one boundary bundle containing every obligation that would settle the item, plus the
sketch and coupling analysis it rests on, and freeze it.
HOW: Sketch the change surface, run coupling analysis against that sketch, select floor invariants
from the registry rather than writing them, then have an independent cross-family reviewer try to
satisfy every entry while failing the item's evident intent. On a described gap the boundary is
amended and re-reviewed; on a clean pass it is committed and frozen.
JUSTIFICATION: Coupling cannot be found before a mechanism is chosen, so the sketch precedes the
analysis and both precede the freeze; and a boundary reviewed only by its author trades an unbounded
failure mode for a bounded and silent one. -- (RubricBench `:151` -- models "fail to define the
necessary constraints on their own", which is why the floor is selected and not authored;
Panickssery `:145`, `:166` -- GPT-4 recognises its own output 73.5% of the time and self-preference is
linearly correlated with self-recognition)
IMPACT: high -- (Wall `:435` -- an aspiration level adapted from recent outcomes "could also become
negative", making a performance decline acceptable; the freeze stops that)

The `interpretation` block this manifest carries is owned by
[`reconstructing-the-item`](reconstructing-the-item.md). Its schema, its provenance enum, its support
kinds, and its codes are defined there and are deliberately not restated here — duplicated schema is
how two copies drift.

## The manifest

`boundary/WI-1234.yaml` is a **manifest**, not a lone criteria list. It carries the obligation
entries inline and digest-references every other normative asset — the mechanism sketch, the coupling
analysis, the `entails` map, the selected registry revision. Freezing computes and records a **bundle
digest** over the manifest plus every referenced asset. "The frozen bundle is the only input" is then
true; "the boundary file is the only input" was not, because the implementation and review slices
legitimately read the sketch and the coupling analysis.

The bundle is committed to the run branch, which exists from the moment the item is claimed. An
earlier draft committed it before any branch existed, which would have landed the boundary on the base
branch or lost it.

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
| `claims[]` | `id` plus text |
| `coupling[]` | `id`, `kind`, `target` — the id is the key space for `entails` |
| `entails{}` | Keyed by **coupling edge id**, valued by obligation entry id or the literal `uncovered` |
| `registry_selections[]` | The entry ids that were **selected** from the registry at `registry_revision`, rather than authored for this issue. Provenance is declared here because it cannot be inferred: an earlier draft decided it by matching `INV-<n>`, which made the claim unfalsifiable and let a rule be defeated by renaming an id. An empty list is `W_NO_FLOOR` — non-gating, because where no registry exists there is no remedy, but never silent |
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

## The entries

Every entry carries three closed fields. The **cross-product is exhaustive** — partial rules were how
the previous draft left `observation` + `must` and `post_merge` + `must` undefined.

| `verifier` | `verification_stage` | `obligation` | Effect |
| --- | --- | --- | --- |
| `mechanical` | `pre_merge` | `must` | Executable test required. Gates the mechanical gate. |
| `independent_review` | `pre_merge` | `must` | Gates the semantic review, reviewer sees the implementation. |
| `mechanical` or `independent_review` | `post_merge` or `production` | `must` | Cannot be discharged in the run. Requires a handoff object. Caps terminal state at `Handoff Pending`. |
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
threshold; its core-schema option does not prevent that. Requiring the quoted form is the place this
reference implementation can catch the corruption. The measured `js-yaml` behaviour behind this rule
is recorded in [`the-reference-implementation`](the-reference-implementation.md).

Floor invariants are **selected** from `registry/invariants.yaml` at a pinned revision, by path glob,
never authored per issue.

Only `mechanical` + `pre_merge` + `must` entries carry `test_role` and a baseline. Base-versus-head
gating is meaningless for a `post_merge` or `production` entry, which cannot be checked in the run at
all, and for a `watch` entry, which gates nothing.

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

The evidence map that binds these entries to collected test cases is **not** part of the frozen
bundle. It is authored once tests exist and is specified in
[`discharging-the-boundary`](discharging-the-boundary.md). An earlier draft made evidence a field of
the manifest, which put three checks a stage earlier than the data they need and froze the bundle
before the map was written.

The Markdown view is rendered on demand and never committed.

## Authoring

- Author: writes a **bounded mechanism sketch** — the chosen change surface, affected interfaces and subsystems, data and control-flow edges, external dependencies; not code and not a plan
- Orchestrator (no model): runs coupling extractors against the sketch's named surface
- Author: writes the `entails` map — one edge per coupling edge or consumer id to the obligation id that covers it, and an explicit `uncovered` marker where none does
- Linter (no model): rejects the bundle if any coupling edge is neither mapped nor marked `uncovered`, so coverage is declared rather than assumed
- Author: selects applicable `INV-*` from the registry; emits `escalate: floor_gap` if one is missing
- Author: writes `boundary/WI-1234.yaml` with the three closed fields per entry, a handoff object for every `post_merge` **and** `production` must, `test_role` plus `baseline` on every `mechanical` + `pre_merge` + `must`, and a non-empty non-goals list
- Linter (no model): validates the schema and resolves every trace
- Linter (no model): does not try to decide whether an entry names an implementation, because that judgment is not mechanically decidable; the Boundary-reviewer evaluates it in the adversarial pass
- Linter (no model): re-runs up to `MAX_LINT_ROUNDS`, then escalates `criteria_not_lintable`
- Orchestrator (no model): runs the **mechanical** half of the conclusive eligibility check now that coupling and obligations exist — does the coupling map name a path outside the ownership map, and does every `post_merge` or `production` must carry a complete handoff object
- Orchestrator (no model): on mechanical ineligibility — appends `run_ineligible`, finalizes the lease, stops before any model call is spent

> Mechanism-aware authoring is compatible with withholding the candidate implementation, but that
> compatibility is a local design inference and not RubricBench evidence. The source withholds
> candidate *responses*; it says nothing either way about a design sketch.

## Adversarial review

By this point the reviewer has already produced its own blind reconstruction and the two readings
have been compared — that half is specified in
[`reconstructing-the-item`](reconstructing-the-item.md). What follows is the second half, where the
boundary is finally supplied.

- Boundary-reviewer: receives the boundary, the sketch, the coupling analysis, the `entails` map, and keeps read-only repo access; receives no candidate change, and no reasoning about **mechanism** — the Author's reasoning about **intent** it has already seen, because the interpretation is exactly that
- Boundary-reviewer: checks every `entails` edge, because that map is what later permits work to continue without a refreeze; an edge it rejects becomes `uncovered`
- Boundary-reviewer: judges handoff **feasibility** first — the semantic half of eligibility, which the Linter cannot do; an infeasible handoff exits `ineligible` here, before the adversarial exercise and without a second top-model call
- Boundary-reviewer: describes a change that satisfies every entry literally while failing **its own recorded reconstruction** of the goal, or returns `no_gap_found`; a described gap counts and no artifact is owed
- Boundary-reviewer: is anchored to that artifact rather than to "the item's evident intent" because by this point it has read the Author's interpretation, so evident intent would mean the Author's statement of it — the reconstruction is already persisted, so anchoring to it costs nothing and is what makes the ordering matter
- Author: on a gap — amends the exploited entry
- Orchestrator (no model): invalidates every bundle asset downstream of the amendment and re-runs the derivations that produced them — mechanism sketch, coupling analysis, registry selection, handoff objects — then the Linter and the conclusive eligibility check, before a fresh review round
- Orchestrator (no model): does this because an amendment can move the mechanism surface; without it the frozen digest faithfully preserves stale coupling
- Orchestrator (no model): repeats with a fresh reviewer up to `MAX_BOUNDARY_ROUNDS`, then escalates `boundary_ungameable_unproven`

## The freeze

- Orchestrator (no model): commits the manifest and every referenced asset to the run branch, computes the **bundle digest**, appends `boundary_frozen` with that digest and the commit SHA, and calls `attach_reference` so the item points at the frozen bundle
- Orchestrator (no model): from here the frozen bundle is the only input; the item text is not read again

### Canonicalization was a requirement on the wrong mechanism, and is withdrawn

Comment-preserving canonicalization was named as a standing requirement for four mentions, with two
rounds of cost estimates — first "the same unimplemented integration as the adapter", then "a
dependency decision" — both of which took the requirement itself for granted.

The general form is worth stating, because it survived two review rounds and is cheaper to make than
any defect in the linter: **a cost estimate looks like the answer to a scoping question.** Escalating
from one wrong cost to a better wrong cost feels like a correction because the number changes, while
the question — is this a requirement, and what does it buy — has not been asked. The cheap test is
whether anyone has written down the *consumer*. Canonicalization had four mentions in the pre-split
document and no stated consumer, which was visible the whole time.

Read the freeze bullet above: the Orchestrator **commits the manifest and every referenced asset to
the run branch** and records the commit SHA in the same event. Git blob and tree hashes are
byte-stable, comment-preserving, content-addressed digests of exactly those bytes — that is what they
are. The property canonicalization was introduced to establish is established one clause earlier by a
mechanism this design already specifies.

Worse than redundant, it was the **wrong property**. Canonicalization deliberately erases textual
difference so that semantically identical manifests digest identically. The digest's stated job is
*identity* — "the frozen bundle is the only input" — and a canonical digest would let two different
files freeze to the same value. It would have weakened the guarantee while appearing to secure it.

And the comment-preserving loader had no consumer. Nothing in `modus` writes YAML, and the
only actor that amends a frozen bundle is the Author, a model editing text — which preserves comments
because they are in the text being edited. The Orchestrator's job on an amendment is to regenerate
downstream *assets*, not to rewrite the manifest in place. The requirement would matter the moment a
*script* rewrote the manifest, and no script does; it is recorded as a precondition on a future
programmatic amendment path rather than as a gap in this one.

The requirement returns if a script is ever given the manifest to rewrite. Until then it is withdrawn
rather than deferred. What the YAML typing tests do and do not establish is recorded in
[`the-reference-implementation`](the-reference-implementation.md), which owns that evidence.
