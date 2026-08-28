# Autonomous Jira issue to Ready for Merge — pilot workflow

GOAL: Take a Jira issue to Ready for Merge -- complete, correct, and high quality -- without a human in the loop, and stop on a fixed condition rather than when the reviewers run out of things to say.
HOW: Author one boundary bundle, have it independently reviewed, and freeze it before implementation; then implement on an isolated branch against that boundary and nothing else, with mechanical gates and one bounded repair loop per review kind. Escalate whenever the boundary cannot be made decidable, a genuinely new obligation appears, or the coupling reaches past what this repo controls.

Merge is a human approval boundary. After a confirmed merge event the orchestrator records the merge
SHA and may transition Jira to `Done`, but only when no post-merge or production obligation remains.
Deploy and rollback are a named handoff, out of scope.

Actor: action form. One line per step. `JIRA-1234` is the worked example.

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

## The boundary file

`boundary/JIRA-1234.yaml` is a **manifest**, not a lone criteria list. It carries the obligation
entries inline and digest-references every other normative asset — the mechanism sketch, the coupling
analysis, the selected registry revision. Freezing computes and records a **bundle digest** over the
manifest plus every referenced asset. "The frozen bundle is the only input" is then true; "the
boundary file is the only input" was not, because stages 4 through 6 legitimately read the sketch and
the coupling analysis.

The bundle is committed to the run branch, which exists from stage 1. An earlier draft committed it
before any branch existed, which would have landed the boundary on the base branch or lost it.

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

Each entry also carries `id`, `statement`, `observation`, `decision`, `traces[]`, and — for
quantities — `value`, `unit`, `conditions`. Floor invariants are **selected** from
`registry/invariants.yaml` at a pinned revision, by path glob, never authored per issue.

Mechanical entries additionally carry `test_role`:

- `test_role: change` — the behavior is new or altered. Its tests must show a **targeted behavioral
  delta**: fail on base, pass on head.
- `test_role: preservation` — the behavior must not change. Its tests must **pass on base and on
  head**. Floor invariants are almost always this, and the previous draft made them unrepresentable
  by requiring every mechanical must to fail on base.

Evidence is a **many-to-many map** between entries and tests, not one test per entry. One test may
discharge several entries; one entry may need several tests.

The Markdown view is rendered on demand and never committed.

## The run record

`runs/JIRA-1234/<run-id>.jsonl`. Append-only, one file per **run attempt** rather than per issue, so
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
- **Fencing.** The lease carries a fencing token. Every external effect presents it, so a resumed or
  duplicated orchestrator with a stale token cannot act.
- **Idempotency keys.** Every external effect — branch create, PR create, Jira transition, CI
  trigger — carries a stable operation id derived from `(run_id, operation)`. Retrying is safe.
- **Intent then result.** Each external effect appends an `intent` event before acting and a `result`
  event after. A crash between them is recoverable precisely because the intent is on disk.
- **Startup reconciliation.** On resume the orchestrator replays the stream, finds every intent with
  no result, and reconciles against the real world — Jira, git, PR, CI — before proceeding. This is
  the answer to the crash-between-PR-creation-and-event case, which no amount of metadata solves.

---

## 1. Qualify and claim

GOAL: Take exclusive ownership of one eligible issue, or leave it alone.
HOW: Query for eligible issues, claim one under a compare-and-set, and run a preliminary screen for conditions already visible in the issue text. The conclusive eligibility decision cannot happen here and is taken at the end of stage 2.
JUSTIFICATION: An issue that is obviously out of scope should cost nothing to reject, but coupling and production obligations are not known until stage 2, so rejecting on them here would repeat the ordering defect one stage earlier. -- (no source -- eligibility screening is local judgment)
IMPACT: medium -- (SWE-bench Verified -- 68.3% of samples were filtered as unusable by professional annotators, so screening rejects a large fraction cheaply, but it decides nothing about the ones that pass)

- Orchestrator (no model): queries `status = "To Do" AND labels = agent-eligible`
- Orchestrator (no model): claims the issue with a compare-and-set on a single claim record — issue key, owner, expiry, `run_id`, fencing token; a lost CAS is a no-op, not a retry. Jira's conditional issue-property update is one viable primitive; the protocol must be named in config, because "atomically" is not an implementation
- Orchestrator (no model): opens `runs/JIRA-1234/<run-id>.jsonl` and appends `run_claimed`
- Orchestrator (no model): creates branch `agent/JIRA-1234/<run-id>` from the target base, so the frozen bundle has somewhere to live
- Orchestrator (no model): runs the **preliminary** screen only — issue type, labels, declared component ownership, and any pre-declared out-of-scope marker
- Orchestrator (no model): on preliminary reject — appends `run_ineligible` with a reason code, finalizes the lease, stops

## 2. Author the boundary

GOAL: Produce one boundary bundle containing every obligation this change must satisfy, plus the sketch and coupling analysis it rests on.
HOW: Extract claims from the issue, resolve them against the repo and logs, sketch the change surface, then run coupling analysis against that sketch. Select floor invariants from the registry rather than writing them.
JUSTIFICATION: Coupling cannot be found before a mechanism is chosen, so the sketch has to precede the analysis and both have to precede the freeze. -- (RubricBench :151 -- models "fail to define the necessary constraints on their own", 27% gap against human rubrics, which is why the floor is selected and not authored)
IMPACT: high -- (RubricBench :151 -- the boundary is what "correct" means for this run, and the corpus identifies the criteria rather than the reasoning as the binding constraint)

- Author (Opus 5 max or gpt-5.6-sol max): extracts numbered claims from the issue text alone
- Author (Opus 5 max or gpt-5.6-sol max): resolves each claim against read-only repo, logs, and deploy history; quantifies vague terms from data
- Author (Opus 5 max or gpt-5.6-sol max): writes a **bounded mechanism sketch** — the chosen change surface, affected interfaces and subsystems, data and control-flow edges, external dependencies; not code and not a plan
- Orchestrator (no model): runs coupling extractors against the sketch's named surface
- Author (Opus 5 max or gpt-5.6-sol max): selects applicable `INV-*` from the registry; emits `escalate: floor_gap` if one is missing
- Author (Opus 5 max or gpt-5.6-sol max): writes `boundary/JIRA-1234.yaml` with the three closed fields per entry, a handoff object for every production must, and a non-empty non-goals list
- Linter (no model): loads under the YAML 1.2 core schema with a comment-preserving round-trip loader, canonicalizes, validates the schema, resolves every trace
- Linter (no model): warns — does not reject — on an entry that appears to name an implementation; that check is not decidable
- Linter (no model): re-runs up to `MAX_LINT_ROUNDS`, then escalates `criteria_not_lintable`
- Orchestrator (no model): runs the **conclusive** eligibility check now that coupling and obligations exist — mechanical part only: does the coupling map name a path outside the ownership map, and does every `post_merge` or `production` must carry a complete handoff object
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): judges whether each handoff is *feasible*, which the Linter cannot; an infeasible handoff makes the issue ineligible
- Orchestrator (no model): on ineligible — appends `run_ineligible`, finalizes the lease, stops before any review round is spent

> Mechanism-aware authoring is compatible with withholding the candidate implementation, but that
> compatibility is a local design inference and not RubricBench evidence. The source withholds
> candidate *responses*; it says nothing either way about a design sketch.

## 3. Review and freeze

GOAL: Get the boundary reviewed by someone who did not write it, then fix it so nothing later can move the target.
HOW: An independent reviewer reads the boundary, the sketch, and the coupling analysis and tries to satisfy every entry while failing the issue's evident intent. On success the boundary is amended and re-reviewed; on a clean pass it is committed and frozen.
JUSTIFICATION: A boundary reviewed only by its author trades an unbounded failure mode for a bounded and silent one. -- (Panickssery :145, :166 -- GPT-4 recognises its own output 73.5% of the time and self-preference is linearly correlated with self-recognition)
IMPACT: high -- (Wall :435 -- an aspiration level adapted from recent outcomes "could also become negative", making a performance decline acceptable; the freeze stops that, and the independent review stops the freeze from locking in a wrong target)

- Orchestrator (no model): starts Boundary-reviewer in a fresh session, cross-family from the Author
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): receives the boundary, the sketch, the coupling analysis, the issue text, and read-only repo access; receives neither the Author's reasoning nor any candidate change
- Boundary-reviewer (Opus 5 max or gpt-5.6-sol max): describes a change that satisfies every entry literally while failing the issue's evident intent, or returns `no_gap_found`; a described gap counts and no artifact is owed
- Author (Opus 5 max or gpt-5.6-sol max): on a gap — amends the exploited entry, re-runs the Linter
- Orchestrator (no model): repeats with a fresh reviewer up to `MAX_BOUNDARY_ROUNDS`, then escalates `boundary_ungameable_unproven`
- Orchestrator (no model): commits the manifest and every referenced asset to the run branch, computes the **bundle digest**, appends `boundary_frozen` with that digest and the commit SHA, attaches a remote link to Jira
- Orchestrator (no model): from here the frozen bundle is the only input; the issue text is not read again

## 4. Implement

GOAL: Produce a candidate change that satisfies the frozen boundary and nothing else.
HOW: Work on the run branch, writing tests for every mechanical must before implementing — failing on base for a change entry, passing on base for a preservation entry. Open a draft PR when the branch is ready for the gate.
JUSTIFICATION: A test committed before the fix, with its baseline behavior recorded, is what makes "obligation discharged" a fact rather than a claim. -- (Huang :721 -- "the code executor serves as the perfect verifier", the one carve-out the self-correction literature grants, conditional on an oracle that discriminates)
IMPACT: high -- (Lightman :76 -- process supervision solves 78.2% of the MATH subset against 72.4% for outcome supervision and the gap widens with N; :63 -- it "specifies the exact location of any errors")

- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes tests covering every `mechanical` + `must` entry — a `change` entry needs a test that fails on base, a `preservation` entry needs one that passes on base — and commits them as their own commit
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): records the entry-to-test evidence map, which is many-to-many
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): implements until green, touching only paths the sketch named
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): appends out-of-scope defects as `deferral` events; does not fix them
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): emits `escalate: coupling_found_after_freeze` if the work reveals a consumer the coupling analysis missed
- Orchestrator (no model): resolves the escalation mechanically where it can — if the named consumer already appears in the frozen coupling analysis or in an entry's `traces[]`, it is entailed, and the run continues as a plan correction
- Adjudicator (Opus 5 max or gpt-5.6-sol max): decides the remainder, because "entailed by a frozen obligation" is a question about meaning and a no-model actor cannot answer it
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
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): receives the diff, the boundary, and the coupling analysis; receives neither the implementer's session nor any prior round
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): returns `pass` | `fail` | `unable_to_verify` per in-scope entry, with `test_id`, `file:line`, or `trace_id` on every fail
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): returns uncited observations in a separate array; no cap on cited verdicts
- Triage (no model): drops findings with no entry id, an out-of-scope id, or a fail without evidence, and appends every drop as an event
- Triage (no model): routes `unable_to_verify` to the boundary as a spec defect, which invalidates the boundary rather than the change
- Orchestrator (no model): on cited fails — one repair round, then escalates `semantic_review_not_converging`
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): repairs the cited entries; stage 6 gates `independent_review` entries and `verifier` is singular, so no test is owed here — an optional regression test is allowed, not required

## 7. Finalize and hand off

GOAL: Reach an autonomous stop state that names exactly what a human is being asked to do.
HOW: Mark the PR ready, write the handoff summary as a projection of the run record, and stop. Transition Jira only on an observed merge event, and only when nothing post-merge or production remains open.
JUSTIFICATION: Accepted imperfection has to be written down, or the next agent rediscovers the deferred items and starts fixing them. -- (Petersson :173 -- in ten years of capture-recapture research "only one paper has been classified" as an experience report)
IMPACT: medium -- (Petersson :173 -- the corpus's own failure mode is knowledge that never reached practice, but no source measures whether a record prevents it)

- Orchestrator (no model): marks the PR ready for review; appends `ready_for_merge`
- Orchestrator (no model): renders the handoff summary from the run record — obligations discharged, deferrals with reasons, rounds consumed, residual risk, every open handoff object with its owner and trigger
- Orchestrator (no model): sets the autonomous stop state to `Handoff Pending` rather than `Ready for Merge` while any `post_merge` or `production` must is unresolved
- Orchestrator (no model): **finalizes the execution lease here**, at the autonomous stop, not after merge — the wait for human approval is unbounded and must not be held under lease
- Merge-watcher (no model): a separately triggered, idempotent continuation keyed by `(run_id, "merge")`; it is not part of the run's execution
- Merge-watcher (no model): on an observed merge event — appends `merged` with the merge SHA
- Merge-watcher (no model): transitions Jira to `Done` only when a merge is recorded and no `post_merge` or `production` must remains open; otherwise the issue stays open with its handoffs listed

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

## Stop conditions

Two different things were conflated in an earlier draft. An **autonomous stop state** ends the run's
execution and finalizes the lease. A **lifecycle final state** is where the Jira issue ends up, which
may be later and is not the run's business.

Autonomous stop states — every one finalizes the lease:

| Stop state | Reached when |
| --- | --- |
| `ready_for_merge` | Mechanical gate green, every in-scope must passed, no `unable_to_verify`, nothing post-merge or production open |
| `handoff_pending` | As above, but a `post_merge` or `production` must remains |
| `boundary_invalid` | Genuinely new or unmatched obligation, `unable_to_verify` on a must, or a confirmed safety exception |
| `escalated` | Any cap reached, with its reason code |
| `ineligible` | Preliminary or conclusive eligibility screen rejected the issue |

Lifecycle final states, reached by the merge-watcher and not by the run:

| Final state | Reached when |
| --- | --- |
| Jira `Done` | Merge recorded **and** no `post_merge` or `production` must open |
| Jira open with handoffs | Merge recorded, obligations outstanding, owners named |
| Jira unchanged | No merge; a human decides what happens to the PR |

Caps live in config, not in prose: `MAX_LINT_ROUNDS`, `MAX_BOUNDARY_ROUNDS`, `MAX_GATE_RETURNS`, and
one semantic repair round. Every cap is a handoff, not a signal to buy another round.

Reason codes: `floor_gap`, `ineligible_no_handoff`, `ineligible_crosses_boundary`,
`criteria_not_lintable`, `boundary_ungameable_unproven`, `coupling_found_after_freeze`,
`gate_not_passable`, `semantic_review_not_converging`, `ineligible_infeasible_handoff`,
`coupling_unmatched_after_freeze`, `requires_product_tradeoff`,
`requires_stakeholder_preference`, `underdetermined_by_issue`, `requires_unavailable_observability`.

## Out of scope, named rather than omitted

Deploy, rollback, merge-queue interaction, post-merge verification, and on-call escalation. Each
needs an owner and a trigger recorded in the relevant handoff object. Bot-merge through `Done` is a
materially larger system and is deliberately not smuggled in here.

## Offline — not in the run loop

- Human (human): hand-grades a sample of completed runs
- Calibrator (no model): measures reviewer precision and recall against those labels
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
| **Supported** | 2 floor selected not authored · 3 independent review and ex-ante freeze · 4 leaf-level executable verification · 5 discrimination as the condition on the executor carve-out |
| **Hypothesis — targets a measured failure, remedy untested** | 3 adversarial boundary review · 6 citation rule, evidence pointers, cross-family routing · the safety exception |
| **Local judgment — corpus silent** | 1 eligibility screening · 2 mechanism sketch and coupling analysis · 7 handoff record · every cap value · the stage ceiling |
| **Not available** | Any coverage estimate. Capture-recapture needs a closed population and reviewers blind to each other; this loop changes the artifact between rounds. A pass bounds scope and makes no claim about what was missed. |

Two overclaims corrected from the superseded version: cross-model review was tagged Supported on
Panickssery, which establishes self-preference bias rather than validating this configuration; and
offline calibration was tagged Supported on JudgeEval, which is an existence proof of a scoring
pattern rather than evidence that a small sample estimates per-mandate precision usefully.

## Appendix B — model and effort config

Config, not architecture. Verified 2026-08-28: Claude figures from the bundled `claude-api` skill,
Codex from `learn.chatgpt.com/docs/models`.

| Actor | Claude | Codex |
| --- | --- | --- |
| Author | Opus 5 max | gpt-5.6-sol max |
| Boundary-reviewer | Opus 5 max | gpt-5.6-sol max |
| Implementer | Sonnet 5 xhigh | gpt-5.6-terra xhigh |
| Reviewer | Opus 5 xhigh | gpt-5.6-sol xhigh |
| Adjudicator | Opus 5 max | gpt-5.6-sol max |
| Orchestrator · Gate · Linter · Triage · Calibrator | no model | no model |

Notes that are easy to get wrong. Haiku 4.5 rejects the `effort` parameter, so a cheap Claude lane is
Sonnet 5 at `low`. `gpt-5.5`, `gpt-5.4`, and `gpt-5.4-mini` retire 2026-08-31. The bare `gpt-5.6`
alias routes to Sol, not Terra. `ultra` is a Codex CLI effort value that is
unavailable through the Responses API; that is the whole defensible statement. Substituting `max`
plus orchestrator-side fan-out is a separate hypothesis about how to recover the capability, not a
translation, and it is untested. The API effort default
is `high` and Claude Code raises it to `xhigh`; those are two layers, not a contradiction.

Cross-family pairing at stages 3 and 6 is the point, not a preference: the reviewer must not share a
family with the actor whose work it is checking.
