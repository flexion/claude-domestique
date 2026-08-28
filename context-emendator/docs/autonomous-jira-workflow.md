# Autonomous Jira issue to Ready for Merge — pilot workflow

GOAL: Take a Jira issue to Ready for Merge -- complete, correct, and high quality -- without a human in the loop, and stop on a fixed condition rather than when the reviewers run out of things to say.
HOW: Author one boundary file, have it independently reviewed, and freeze it before implementation; then implement on an isolated branch against that boundary and nothing else, with mechanical gates and one bounded repair loop per review kind. Escalate whenever the boundary cannot be made decidable, a genuinely new obligation appears, or the coupling reaches past what this repo controls.

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

`boundary/JIRA-1234.yaml`. One file, authored once, frozen once, and the only input to everything
downstream. Every entry carries three closed fields, and the combination decides how it is verified
and whether it can gate anything.

| Field | Values |
| --- | --- |
| `verifier` | `mechanical` · `independent_review` · `observation` |
| `verification_stage` | `pre_merge` · `post_merge` · `production` |
| `obligation` | `must` · `watch` |

Rules, all mechanical:

- `verifier: mechanical` + `obligation: must` — requires an executable test. Gates at stage 5.
- `verifier: independent_review` + `obligation: must` — gates at stage 6, where a reviewer may
  inspect the implementation and its evidence.
- `verification_stage: production` + `obligation: must` — cannot be discharged in this pilot, so it
  **requires a handoff object**: `owner`, `trigger`, `verification_method`, `evidence_destination`,
  `failure_transition`. Without a feasible handoff the issue is **ineligible**, decided before
  freeze. This field is not decorative: it controls eligibility, handoff completeness, and which
  terminal state is reachable.
- `obligation: watch` — preserves a watch window and an escalation signal, and is explicitly **not**
  an acceptance criterion. An acceptance criterion that cannot affect acceptance is decorative; this
  is the honest name for the entries that would otherwise pretend to gate.

Each entry also carries `id`, `statement`, `observation`, `decision`, `traces[]`, and — for
quantities — `value`, `unit`, `conditions`. Floor invariants are **selected** from
`registry/invariants.yaml` by path glob, never authored per issue.

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

This is cross-cutting infrastructure, not a stage. It is also where the previous version's missing
durability lives: `run_id` plus `seq` plus `input_digests` give idempotent replay, crash recovery,
and an audit trail that a poll-then-transition state machine otherwise lacks.

---

## 1. Qualify and claim

GOAL: Take exclusive ownership of one eligible issue, or leave it alone.
HOW: Query for eligible issues, atomically claim one, and screen it for the conditions that make autonomous completion impossible. Emit a claim event before doing any other work.
JUSTIFICATION: An issue with no feasible handoff for a production obligation, or coupling outside this repo, cannot be finished correctly and should cost nothing to discover. -- (no source -- eligibility screening is local judgment)
IMPACT: medium -- (SWE-bench Verified -- 68.3% of samples were filtered as unusable by professional annotators, so screening rejects a large fraction cheaply, but it decides nothing about the ones that pass)

- Orchestrator (no model): queries `status = "To Do" AND labels = agent-eligible`
- Orchestrator (no model): claims one issue atomically — a lease with an owner, an expiry, and a `run_id`; a lost race is a no-op, not a retry
- Orchestrator (no model): opens `runs/JIRA-1234/<run-id>.jsonl` and appends `run_claimed`
- Orchestrator (no model): rejects the issue as ineligible if the coupling crosses a service or team boundary, per the ownership map
- Orchestrator (no model): rejects as ineligible if any production obligation would lack a feasible handoff
- Orchestrator (no model): on ineligible — appends `run_ineligible` with a reason code, releases the lease, stops

## 2. Author the boundary

GOAL: Produce one boundary file containing every obligation this change must satisfy.
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
- Orchestrator (no model): commits the boundary, appends `boundary_frozen` with the file digest and SHA, attaches a remote link to Jira
- Orchestrator (no model): from here the boundary is the only input; the issue text is not read again

## 4. Implement

GOAL: Produce a candidate change that satisfies the frozen boundary and nothing else.
HOW: Work on an isolated branch, writing a failing test for each mechanical must before implementing it. Open a draft PR when the branch is ready for the gate.
JUSTIFICATION: A failing test committed before the fix is what makes "obligation discharged" a fact rather than a claim. -- (Huang :721 -- "the code executor serves as the perfect verifier", the one carve-out the self-correction literature grants, conditional on an oracle that discriminates)
IMPACT: high -- (Lightman :76 -- process supervision solves 78.2% of the MATH subset against 72.4% for outcome supervision and the gap widens with N; :63 -- it "specifies the exact location of any errors")

- Orchestrator (no model): creates branch `agent/JIRA-1234/<run-id>` from the target base
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes one failing test per `mechanical` + `must` entry and commits those tests as their own commit
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): implements until green, touching only paths the sketch named
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): appends out-of-scope defects as `deferral` events; does not fix them
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): emits `escalate: coupling_found_after_freeze` if the work reveals a consumer the coupling analysis missed
- Orchestrator (no model): on that escalation — decides whether the coupling is already entailed by a frozen obligation, which is a plan correction, or is a genuinely new obligation, which makes the boundary invalid and ends the run for refreeze
- Orchestrator (no model): never adds an entry in place, and never treats logging an addition as authorization
- Orchestrator (no model): opens a draft PR, appends `pr_opened` with the PR number and head SHA

## 5. Mechanical gate

GOAL: Prove every mechanical must is discharged, before spending a reviewer.
HOW: Run CI plus the discrimination and scope checks against the branch. Return failures to the implementer for one bounded repair loop.
JUSTIFICATION: A test committed green proves nothing, so the gate has to prove the test fails against the base before it counts as discharging anything. -- (Huang :721 -- the verifier is "perfect" only given a behavioral oracle that actually discriminates, which a green suite does not establish)
IMPACT: high -- (Huang :721 -- an executable check is the only verdict in this design that does not rest on model judgment)

- Gate (no model): fails if a `mechanical` + `must` entry has no test
- Gate (no model): fails if a test's runner outcome against the base tree is not `failed` — an `error` from an import, a missing fixture, or a collection failure also exits non-zero and would let a test that never ran count as discriminating
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
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): repairs, writing a failing test first where the entry is mechanical

## 7. Finalize and hand off

GOAL: Reach a terminal state that names exactly what a human is being asked to do.
HOW: Mark the PR ready, write the handoff summary as a projection of the run record, and stop. Transition Jira only on an observed merge event, and only when nothing post-merge or production remains open.
JUSTIFICATION: Accepted imperfection has to be written down, or the next agent rediscovers the deferred items and starts fixing them. -- (Petersson :173 -- in ten years of capture-recapture research "only one paper has been classified" as an experience report)
IMPACT: medium -- (Petersson :173 -- the corpus's own failure mode is knowledge that never reached practice, but no source measures whether a record prevents it)

- Orchestrator (no model): marks the PR ready for review; appends `ready_for_merge`
- Orchestrator (no model): renders the handoff summary from the run record — obligations discharged, deferrals with reasons, rounds consumed, residual risk, every open handoff object with its owner and trigger
- Orchestrator (no model): sets the terminal state to `Handoff Pending` rather than `Ready for Merge` while any `post_merge` or `production` must is unresolved, and **prohibits Jira `Done`** in that state
- Orchestrator (no model): on an observed merge event — appends `merged` with the merge SHA
- Orchestrator (no model): transitions Jira to `Done` only when a merge is recorded and no `post_merge` or `production` must remains open
- Orchestrator (no model): releases the lease

---

## Safety exception — a conditional escape branch, not a stage

An uncited reviewer observation may **request a stop**. It may never create work. That asymmetry is
what keeps the exception from becoming an unbounded reviewer veto: a cited finding can produce repair
work, an uncited one can only invalidate the boundary.

- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): may file a safety exception only for a closed set — security-boundary breach, secret or privacy exposure, data loss or corruption, irreversible external side effect
- Reviewer (Opus 5 xhigh or gpt-5.6-sol xhigh): must supply an observed counterexample or reproducible evidence reference, the affected asset, the impact, and why no frozen obligation applies
- Adjudicator (Opus 5 max or gpt-5.6-sol max): a distinct actor, or a human, confirms or rejects; no severity score and no open invariant category, because both restore veto discretion
- Orchestrator (no model): on confirm — appends `boundary_invalid`, ends the run; this does **not** authorize an in-run fix
- Orchestrator (no model): on reject — appends `safety_exception_rejected` carrying `finding_id`, category, affected asset, canonical claim, `submission_digest`, the original `evidence_refs`, adjudicator, reason, and timestamp
- Orchestrator (no model): suppresses the identical **evidence packet**, not the underlying hazard — the `finding_id` is stable, each submission gets its own digest
- Orchestrator (no model): allows one automatic reopening when a resubmission declares `novel_evidence_refs` and the adjudicator confirms a material evidence delta; further reopening needs a human override event

Suppression is a projector outcome derived from the stream, never a deletion. A wrongly rejected
data-loss report stays legible to anyone reading the run.

## Stop conditions

| Terminal state | Reached when |
| --- | --- |
| `Ready for Merge` | Mechanical gate green, every in-scope must passed, no `unable_to_verify`, nothing post-merge or production open |
| `Handoff Pending` | As above, but a `post_merge` or `production` must remains; Jira `Done` prohibited |
| `boundary_invalid` | Genuinely new obligation found, `unable_to_verify` on a must, or a confirmed safety exception |
| `escalated` | Any cap reached, with its reason code |

Caps live in config, not in prose: `MAX_LINT_ROUNDS`, `MAX_BOUNDARY_ROUNDS`, `MAX_GATE_RETURNS`, and
one semantic repair round. Every cap is a handoff, not a signal to buy another round.

Reason codes: `floor_gap`, `ineligible_no_handoff`, `ineligible_crosses_boundary`,
`criteria_not_lintable`, `boundary_ungameable_unproven`, `coupling_found_after_freeze`,
`gate_not_passable`, `semantic_review_not_converging`, `requires_product_tradeoff`,
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
alias routes to Sol, not Terra. `ultra` is a Codex CLI effort value with no Responses API equivalent —
an API implementation should read it as `max` plus orchestrator-side fan-out. The API effort default
is `high` and Claude Code raises it to `xhigh`; those are two layers, not a contradiction.

Cross-family pairing at stages 3 and 6 is the point, not a preference: the reviewer must not share a
family with the actor whose work it is checking.
