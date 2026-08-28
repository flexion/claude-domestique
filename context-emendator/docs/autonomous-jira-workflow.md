# Autonomous Jira issue to completion — example workflow

GOAL: Take a Jira issue to Done -- complete, correct, and high quality -- without a human in the loop, and stop on a fixed condition rather than when the reviewers run out of things to say.
HOW: Turn the issue into a frozen set of binary criteria before any code is written, then implement and review against those criteria and nothing else, with mechanical gates rejecting any finding that cites no criterion or carries no evidence. Escalate to a human whenever the criteria cannot be made decidable or the blast radius reaches past what this repo controls.

Actor: action form. One line per step. `JIRA-1234` is the worked example.

Each phase opens with four lines, then the mechanics:

- **GOAL** — what the phase is for, one sentence.
- **HOW** — how it gets there, two sentences.
- **JUSTIFICATION** — why the phase earns a place against the overall GOAL, with its grounding in
  `research/satisficing-references/text/` by file stem and line.
- **IMPACT** — high, medium, or low contribution to the overall GOAL, with its grounding.

If a bullet does not serve the phase GOAL, it does not belong in the phase. The GOAL and HOW at the
top of this document are the same contract one level up: a phase that does not serve them does not
belong in the workflow.

**`no source` in a JUSTIFICATION or IMPACT is a real answer, not a gap in the citation work.** The
corpus is silent on 15 of the 24 phases — see the `[JDG]` count under Status tags — and saying so is
the honest grounding. Impact distribution as it stands: 13 high, 9 medium, 2 low. A high-impact
phase resting on `no source` (phase 6 is the one) is the most load-bearing unexamined claim in the
design.

Companion to `research/satisficing-boundary-briefing.md`.

## File formats — one rule

**Structured for anything a gate reads. Markdown only for what nothing parses, and always rendered
from the structured file, never authored directly.**

That is the whole convention. It replaces a three-way split (YAML for human-edited, JSON for
machine-only, Markdown for reports) that was never written down and had already drifted.

| Artifact | Format | Rendered view |
| --- | --- | --- |
| `specs/accept-<key>.yaml` | YAML — humans amend it, comments carry the why | `specs/accept-<key>.md` |
| `plans/<key>.yaml` | YAML — the pre-review gate reads slice path globs from it | `plans/<key>.md` |
| `registry/invariants.yaml` | YAML — human-authored, comments record the source incident | — |
| `ship-records/<key>.yaml` | YAML — phase 23 trends fields across issues | `ship-records/<key>.md` |
| `intake/`, `refine/`, `reviews/` | JSON — model-produced, script-consumed, never hand-edited | — |
| `backlog/deferred.json` | JSON — append path is mechanical | `backlog/deferred.md`, for the phase 23 review |

YAML where a human touches the file, JSON where none does. The reason is comments: a criterion's
tier and an invariant's provenance both need a "why" that JSON cannot hold, and neither is worth a
sidecar field.

**YAML's implicit typing is a hazard for exactly this use.** A criterion id of `NO`, a threshold
written `1.10`, a value of `on` or `off` — YAML 1.1 coerces all of them. For a file whose purpose is
to be decided the same way twice, that is a real risk, so the Linter (phase 10) owes two checks:
parse under the **YAML 1.2 core schema**, and run a **canonicalizing formatter** so committed bytes
are stable. Without the second one, a reformat changes the frozen file's SHA and the phase 13 freeze
is weaker than it looks.

## Model selection

Every actor bullet carries `(<claude model> <effort> or <codex model> <effort>)`. The two sides are
chosen independently for the work, not translated from each other — the families do not share an
effort scale.

Verified 2026-08-28. Claude figures from the bundled `claude-api` skill (cached 2026-06-24); Codex
figures from `learn.chatgpt.com/docs/models` and vendor pricing pages. Re-check before relying on
prices.

### Claude

| Model | ID | Context | In / Out $/1M | Effort levels |
| --- | --- | --- | --- | --- |
| Fable 5 | `claude-fable-5` | 1M | $10 / $50 | low · medium · high · xhigh · max |
| Opus 5 | `claude-opus-5` | 1M | $5 / $25 | low · medium · high · xhigh · max |
| Sonnet 5 | `claude-sonnet-5` | 1M | $2 / $10 | low · medium · high · xhigh · max |
| Haiku 4.5 | `claude-haiku-4-5` | 200K | $1 / $5 | **none — `effort` errors on this model** |

Default effort is `high`. `xhigh` is the recommended setting for most coding and agentic work on
Fable 5, Opus 5, and Sonnet 5, and is Claude Code's own default. Use `high` as the floor for
intelligence-sensitive work, `max` when correctness matters more than cost, `low` for subagents and
simple tasks.

### Codex

| Model | ID | Stated purpose | In / Out $/1M |
| --- | --- | --- | --- |
| GPT-5.6 Sol | `gpt-5.6-sol` | "strongest capability for complex coding, computer use, research, and cybersecurity" | $4 / $20 promotional, $5 / $30 list |
| GPT-5.6 Terra | `gpt-5.6-terra` | "balanced … for everyday work that needs strong reasoning" | $2 / $12 |
| GPT-5.6 Luna | `gpt-5.6-luna` | "lowest cost … extraction, classification, transformation, and structured summaries" | $0.20 / $1.20 |

All three: 1.05M context, 128K max output, higher rates above 272K input tokens. Effort levels are
low · medium (default) · high · xhigh · max · **ultra**. The doc's guidance is "use the lowest
reasoning effort that produces the result you need"; `ultra` is for "complex work divisible into
meaningful parts" — it fans out to subagents.

Two things to watch. `gpt-5.5`, `gpt-5.4`, and `gpt-5.4-mini` retire **2026-08-31**, so any config
naming them breaks this week. And the bare `gpt-5.6` alias routes to Sol, not Terra — pinning the
alias in a cheap lane silently buys the expensive model.

### Why these assignments

- **Cheap lane on Luna, not on Haiku.** Claim extraction and registry selection are exactly Luna's
  stated sweet spot. Haiku 4.5 would be the Claude-side equivalent on price, but it rejects the
  `effort` parameter outright, so a cheap Claude lane means Sonnet 5 at `low` instead.
- **Criteria authoring gets the top of the range on both sides.** RubricBench identifies the
  criteria, not the reasoning, as the binding constraint, so this is the one place to spend before
  anywhere else. `max` rather than `xhigh`.
- **Red-team gets `ultra` on the Codex side.** Its job decomposes into "try this criterion, try that
  one", which is the case `ultra` is described for.
- **Reviewers sit at `xhigh`, not `max`.** The vendor guidance puts `xhigh` at the sweet spot for
  agentic work; `max` is for when correctness beats cost, and the review loop runs many times per
  issue. Raise it only if calibration (phase 23) shows headroom.
- **Effort asymmetry is deliberate.** Codex defaults to `medium` and Claude to `high`, so equal
  labels are not equal spend or equal depth. Treat the two columns as separate decisions.

### The cascade caveat, and why it does not bite here

Anthropic's own cost guidance argues against multi-model cascades: caches are model-scoped, so
spreading work across tiers forfeits prompt-cache reuse, and the newest model at *lower* effort
often beats a prior-generation model at high effort. Measure that single-model option before
assuming the cascade above is cheaper.

The reason a cascade is still defensible in this workflow is structural: **every actor runs in a
fresh session by design**, so there is little cross-actor cache to lose. The exception is the
reviewer set, which re-reads the same frozen criteria and coupling map every round — that is real
reusable prefix, and it is an argument for keeping all reviewers of one mandate on one model rather
than rotating them.

Related and worth wiring in: **task budgets** (Opus 5, Fable 5, Sonnet 5) give an agentic loop a
token ceiling it can see and pace itself against, rather than being cut off. That is a better fit
for the round cap in phase 19 than `max_tokens` is, because the model knows about it.

## Status tags

Applied to phase headings, and to individual bullets whose status differs from their phase.

| Tag | Meaning |
| --- | --- |
| `[S]` | Supported. Traceable to a source in `research/satisficing-references/`, within that source's stated scope. |
| `[HYP]` | Hypothesis. Targets a failure the corpus measured, by a countermeasure the corpus does not test. |
| `[JDG]` | Local judgment. The corpus gives no evidence either way. Not wrong — unexamined. |
| untagged | Mechanical bookkeeping. Makes no evidential claim. |

Phase counts across 24 phases: 3 wholly `[S]`, 2 wholly `[HYP]`, 15 wholly `[JDG]`, 3 mixed, 1
untagged. The `[JDG]` majority is the honest summary of this design — see
`research/satisficing-boundary-briefing.md` §4, "application evidence is nearly absent." Anything
`[JDG]` is a candidate for deletion if it is not carrying weight, because nothing outside this
document argues for it.

---

## 0. Standing artifacts — exist before any issue — `[JDG]`

GOAL: Have the reusable inputs in place before any issue is picked up.
HOW: Keep invariants, implicit contracts, and config in versioned files that every issue reads. Create the output directories once so no later step has to decide where things go.
JUSTIFICATION: The registry has to exist before an issue starts, because an agent that authors its own floor will eventually author a thin one and nothing downstream will notice. -- (RubricBench :151 -- 27% accuracy gap between model-generated and human rubrics; models "fail to define the necessary constraints on their own")
IMPACT: high -- (RubricBench :151 -- the floor is what "correct" means, and selection-not-authoring is the only mechanism the corpus supports for fixing it)

- Registry (no model): holds numbered invariants `INV-*`, one per line, behavioral, tier `floor` — `[S]`
- Registry (no model): holds implicit-contract entries — log formats parsed downstream, upstream timeouts, file-existence readiness signals, error taxonomies, ordering guarantees, capacity assumptions
- Config (no model): holds mandate list, `MAX_SLICE_ROUNDS`, `MAX_FEATURE_ROUNDS`, severity table
- Config (no model): holds per-language coupling extractors and the escalation reason enum
- Repo (no model): holds `registry/`, `specs/`, `plans/`, `reviews/`, `backlog/`, `ship-records/` — formats per the one rule above

## 1. Intake — untagged

GOAL: Pull one eligible issue and put its raw text somewhere fixed.
HOW: Poll Jira for the eligibility label and fetch every field, including comments and links. Write the result to a file and move the issue out of the queue so a second run cannot pick it up.
JUSTIFICATION: Writing the issue to a fixed file is what lets every later step be handed exactly the inputs it should see and nothing else. -- (no source -- mechanical bookkeeping, makes no evidential claim)
IMPACT: low -- (no source -- nothing in the corpus turns on how an issue is fetched)

- Orchestrator (no model): polls Jira for `status = To Do AND label = agent-eligible`
- Orchestrator (no model): fetches JIRA-1234 — summary, description, comments, attachments, linked issues, reporter
- Orchestrator (no model): writes `intake/JIRA-1234.json`
- Orchestrator (no model): transitions JIRA-1234 to `In Refinement`
- Orchestrator (no model): starts Refiner in a fresh session

## 2. Claim extraction — `[JDG]`

GOAL: Turn issue prose into a numbered list of separate claims.
HOW: Split the description into one claim per assertion and record where each claim came from. Write the questions the issue does not answer to a separate file instead of guessing at answers.
JUSTIFICATION: Splitting prose into separate claims is what makes the scope decision reviewable, since a single blob cannot be partly accepted. -- (CheckEval :21 -- decomposition into binary questions raises average cross-evaluator agreement by 0.45; measured on evaluation, not on issue triage)
IMPACT: medium -- (SWE-bench Verified -- 38.3% of problem statements underspecified, so the defect this surfaces is common; surfacing is not yet fixing)

- Refiner (Sonnet 5 low or gpt-5.6-luna medium): reads `intake/JIRA-1234.json` only
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): splits the description into numbered claims `C1..Cn`
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): tags each claim `observed` | `secondhand` | `inferred`
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): flags claims that may be a separate defect
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): writes `refine/JIRA-1234-claims.json`
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): writes unresolved questions to `refine/JIRA-1234-questions.json`
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): does not read the repo in this step

## 3. Investigation — `[JDG]`

GOAL: Answer those questions from the repo and logs, without proposing a fix.
HOW: Give a fresh read-only session the claims and the questions and nothing else. It returns measured answers — a threshold read off logs, a deploy date, whether two symptoms share a cause — and marks what it could not resolve.
JUSTIFICATION: Vague terms have to become measured thresholds by someone reading data, because a criterion no reviewer can decide returns unable_to_verify later instead of a verdict. -- (RubricBench :1285 -- "recurring execution-level failure patterns" persist even under correct rubrics; Jacobs & Wallach :512 -- validity is "always a matter of degree, to be supported by critical reasoning")
IMPACT: high -- (SWE-bench Verified -- 38.3% underspecified statements and 61.1% of test suites able to reject valid solutions; an unquantified criterion is the largest single source of downstream defect)

- Orchestrator (no model): starts Investigator in a fresh session, read-only access to repo, logs, deploy history
- Investigator (Sonnet 5 xhigh or gpt-5.6-terra xhigh): receives claims and questions; does not receive draft criteria
- Investigator (Sonnet 5 xhigh or gpt-5.6-terra xhigh): resolves each question or marks it `unresolved`
- Investigator (Sonnet 5 xhigh or gpt-5.6-terra xhigh): quantifies vague terms from data — "big accounts" becomes a row-count threshold read off export logs
- Investigator (Sonnet 5 xhigh or gpt-5.6-terra xhigh): determines whether flagged claims share a root cause
- Investigator (Sonnet 5 xhigh or gpt-5.6-terra xhigh): returns findings only — no criteria, no patch, no fix
- Investigator (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes `refine/JIRA-1234-findings.json`

## 4. Scope decision — `[JDG]`

GOAL: Decide which claims this issue will handle and which it will not.
HOW: Sort every claim into in-scope, separate issue, or unverified. File the separate ones as their own Jira issues and write the rest down as non-goals, so nothing re-enters scope later by default.
JUSTIFICATION: Claims belonging to another defect have to leave now, because once they are in the criteria set every reviewer will keep citing them. -- (Huang :691 -- a reported self-correction gain came from a requirement that belonged in the initial prompt; creep with its mechanism exposed)
IMPACT: medium -- (Huang :691 -- it stops creep at the source, but the citation rule in phase 18 catches most of what leaks past)

- Refiner (Sonnet 5 high or gpt-5.6-terra high): reads findings
- Refiner (Sonnet 5 high or gpt-5.6-terra high): sorts claims into `in-scope` | `separate-issue` | `deferred-unverified`
- Orchestrator (no model): creates one Jira issue per `separate-issue` claim, links `relates to` JIRA-1234
- Orchestrator (no model): comments on JIRA-1234 with the new keys and a one-line reason each
- Refiner (Sonnet 5 high or gpt-5.6-terra high): records `separate-issue` and `deferred-unverified` claims as explicit non-goals

## 5. Floor selection — `[S]`

GOAL: Attach the non-negotiable invariants that apply to the code being touched.
HOW: Match the subsystems named in the findings against the registry and select the entries that apply. If a needed invariant is missing, stop and ask a human to add it rather than writing one here.
JUSTIFICATION: Selecting invariants from a standing registry rather than writing them per issue keeps the non-negotiable floor from thinning under scope pressure. -- (RubricBench :151 -- 27% gap, and models are competent at checking explicit instructions while failing to define constraints themselves)
IMPACT: high -- (RubricBench :151 -- the floor is the part of "correct" that no budget may override)

- Refiner (Sonnet 5 low or gpt-5.6-luna medium): queries Registry with the subsystems named in findings
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): **selects** applicable `INV-*`; does not author new ones
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): records rejected invariants with a one-line reason
- Refiner (Sonnet 5 low or gpt-5.6-luna medium): emits `escalate: floor_gap` if a needed invariant is absent from Registry
- Human (human): adds the invariant to Registry; Registry is versioned; workflow resumes

> Supported by RubricBench: models are competent at checking explicit instructions and "fail to
> define the necessary constraints on their own", with a 27% accuracy gap between model-generated
> and human rubrics on the measured task. Selection is auditable; invention is not.

## 6. Coupling map — `[JDG]`

GOAL: Find what else breaks if this code changes, and turn each one into a criterion.
HOW: Run extractors over callers, tables, events, metric names, and file formats, then check the registry for contracts the source cannot show. Write one preservation criterion per thing that could break, so a reviewer has something to cite when it does.
JUSTIFICATION: Impact on other code has to become criteria rather than findings, because a reviewer who notices a broken consumer has no criterion to cite and gets dropped by triage. -- (no source -- the corpus contains no blast-radius work; the citation rule this repairs is itself local judgment)
IMPACT: high -- (no source -- in a coupled system this is the most expensive finding class to drop, but the claim is unmeasured)

- Orchestrator (no model): runs mechanical extractors, writes `refine/JIRA-1234-coupling.json`
  - callers of touched symbols
  - readers and writers of touched tables and columns
  - subscribers to emitted events
  - alerts and dashboards referencing touched metric names
  - consumers of touched wire formats, file layouts, directory conventions
- Refiner (Opus 5 max or gpt-5.6-sol max): queries Registry implicit-contract entries for the touched paths
- Refiner (Opus 5 max or gpt-5.6-sol max): writes one preservation criterion `PRES-*` per coupling entry a change could break
- Refiner (Opus 5 max or gpt-5.6-sol max): tags every `PRES-*` tier `floor`
- Refiner (Opus 5 max or gpt-5.6-sol max): records upstream constraints that bound an achievement criterion — for example, a gateway timeout below the proposed completion limit
- Refiner (Opus 5 max or gpt-5.6-sol max): adjusts the bounded criterion now, pre-freeze; this is not an amendment

> The corpus contains nothing on blast-radius analysis. The move that makes this work with the
> citation rule — impact analysis produces *criteria*, not findings — is this design's own, and
> untested.

## 7. Autonomy gate — mechanical, no model — `[JDG]`

GOAL: Stop before planning if this issue is not safe to finish without a human.
HOW: Count preservation criteria against achievement criteria, check whether the coupling leaves this repo or this team, and check that enough claims became measurable criteria. Any failure blocks the issue and assigns it back.
JUSTIFICATION: Some issues cannot be finished correctly without a decision this repo does not own, and learning that before planning is cheaper than learning it in review round three. -- (Petersson :1356 -- the survey's own decision points route to a human and its estimates "should, of course, not solely be taken based on the estimates")
IMPACT: medium -- (no source for any threshold -- the gate's value rests entirely on numbers the corpus does not supply)

- Gate (no model): escalates if the coupling map crosses a service or team boundary
- Gate (no model): escalates if a `PRES-*` cannot be verified without a consumer outside this repo
- Gate (no model): escalates if `count(PRES-*) > count(AC-*)` — this is a migration, not a feature
- Gate (no model): escalates if claim-to-measurable-criterion yield falls below `min_spec_density`
- Orchestrator (no model): on escalate — transitions to `Blocked`, comments reason class and specifics, assigns to reporter, stops
- Orchestrator (no model): on pass — continues

> Every threshold here is invented. No source measures where autonomy should stop.

## 8. Observability seam — `[JDG]`

GOAL: Make sure every criterion can actually be observed before implementation starts.
HOW: Check each criterion for an existing way to measure it. Where none exists, add the metric, log field, status enum, or test hook to the work as its own sub-task.
JUSTIFICATION: A criterion with no way to observe it produces unable_to_verify mid-flight, which is a spec defect found at the most expensive moment. -- (Rice :58, :62 -- non-trivial semantic properties are undecidable while bounded properties of the artifact are not; the seam moves a criterion across that line)
IMPACT: medium -- (Rice :62 -- it converts some semantic criteria into decidable ones, but most remain reviewer-judged)

- Refiner (Sonnet 5 high or gpt-5.6-terra high): checks each draft criterion for an existing observation procedure
- Refiner (Sonnet 5 high or gpt-5.6-terra high): emits the required seam for each unobservable criterion — metric, log field, terminal status enum, test hook, injectable clock
- Orchestrator (no model): creates a Jira sub-task `Instrument <seam>` under JIRA-1234
- Refiner (Sonnet 5 high or gpt-5.6-terra high): treats seams as deliverables, not as review discoveries

## 9. Criteria draft — `[S]` for form, `[HYP]` for tiering

GOAL: Write the list of binary checks that defines done for this issue.
HOW: Write one machine-readable record per criterion carrying a tier, an observation procedure, a decision rule, a mandate, and a trace back to a claim or an invariant. Describe behavior only, and do not look at any proposed change.
JUSTIFICATION: A finite set of binary criteria fixed before the code exists is the only thing that makes the loop terminate at all, and the only external referent against which drift is measurable. -- (CheckEval :21 +0.45 agreement; ResearchRubrics :1392 binary grading at 0.72-0.76 macro-F1; RubricBench :518 items "drafted without knowledge of candidate responses")
IMPACT: high -- (the most replicated result in the corpus -- every checklist source converges on binary decomposition)

- Refiner (Opus 5 max or gpt-5.6-sol max): writes `specs/accept-JIRA-1234.yaml`; `specs/accept-JIRA-1234.md` is rendered from it and never edited directly
- Refiner (Opus 5 max or gpt-5.6-sol max): gives each criterion an id, a tier, an observation procedure, a decision rule, a mandate, and a trace to `C*` / `INV-*` / a coupling entry
- Refiner (Opus 5 max or gpt-5.6-sol max): makes every criterion a binary decision — `[S]`
- Refiner (Opus 5 max or gpt-5.6-sol max): assigns tier `floor` | `aspiration` | `preservation` — `[HYP]`
- Refiner (Opus 5 max or gpt-5.6-sol max): gives every quantity a value, a unit, and measurement conditions
- Refiner (Opus 5 max or gpt-5.6-sol max): states criteria behaviorally; names no implementation
- Refiner (Opus 5 max or gpt-5.6-sol max): writes a non-empty non-goals section
- Refiner (Opus 5 max or gpt-5.6-sol max): may read existing code, logs, and call paths
- Refiner (Opus 5 max or gpt-5.6-sol max): must not read a proposed change — none exists at this point, and none is read later — `[S]`

> Binary decomposition is the most replicated finding in the corpus: CheckEval raises average
> cross-evaluator agreement by 0.45, ResearchRubrics gains ~20 points moving ternary to binary,
> PaperBench grades 8,316 binary leaves at 0.83 judge F1. Deriving criteria without access to the
> candidate response is RubricBench's construction rule.
>
> The three-tier split is not. RubricBench proposes "distinguishing hard/soft constraints or
> incorporating explicit weight assignments" at `:1391` and does not test it. The tiers target its
> measured execution failures — which is why they are here — but the countermeasure is unvalidated.

## 10. Lint — mechanical, no model — `[JDG]`

GOAL: Reject criteria that a reviewer could not decide the same way twice.
HOW: Validate the criteria file against a schema, and check that every criterion resolves to a claim, an invariant, or a coupling entry and maps to a mandate. Rejections go back for revision; the two checks that need judgment are warnings only.
JUSTIFICATION: A criterion two reviewers read differently is worse than no criterion, because it passes every structural check and still moves the target. -- (Jacobs & Wallach :60 -- collapsing construct and operationalization "elides the space in which" harms "are most often introduced")
IMPACT: medium -- (Jacobs & Wallach :512 -- validity is a matter of degree, so a mechanical linter raises the floor without deciding the question)

- Linter (no model): parses under the **YAML 1.2 core schema** — rejects the file if any id, threshold, or enum value depends on implicit typing (`NO`, `on`, `1.10`)
- Linter (no model): rewrites the file through a **canonicalizing formatter** and rejects if the bytes change after the first pass — a later reformat must not move the frozen SHA
- Linter (no model): rejects a criterion missing an observation procedure or a decision rule
- Linter (no model): rejects a quantity missing a unit or measurement conditions
- Linter (no model): rejects a criterion with no tier or no trace
- Linter (no model): rejects an orphan criterion (maps to no mandate) and an unanchored mandate (has no criterion)
- Linter (no model): rejects an empty non-goals section
- Linter (no model): **warns** on a criterion that appears to name an implementation — approximate, not decidable; see "Three checks that cannot be mechanical"
- Linter (no model): **warns** on a vague-predicate wordlist — advisory only; the required-fields check is the gate
- Refiner (Opus 5 max or gpt-5.6-sol max): revises; deletes invented scope rather than rewording it
- Linter (no model): re-runs until pass

## 11. Adversarial falsification — `[JDG]`

GOAL: Find criteria that can be satisfied literally while missing the point.
HOW: Give a fresh session the criteria and the issue text, and ask it to build something that passes every check and still fails the issue. Any success names the criterion to fix.
JUSTIFICATION: Criteria can be satisfied literally while failing the issue, and trying it before implementation is the only way to find out. -- (TICK :1961 -- a generated checklist inherited its instruction's false premise; "9/10 checklist questions answered YES. Overall score: 2/5, Bad.")
IMPACT: medium -- (TICK :1961 measures the failure this targets, but no source tests red-teaming as the remedy; no_gap_found from one model is not evidence)

- Orchestrator (no model): starts Red-team in a fresh session
- Red-team (Opus 5 max or gpt-5.6-sol ultra): receives the criteria **and** the issue text; receives neither the refiner's reasoning nor any code
- Red-team (Opus 5 max or gpt-5.6-sol ultra): attempts an artifact that satisfies every criterion literally while failing the issue's evident intent
- Red-team (Opus 5 max or gpt-5.6-sol ultra): returns the gap and the criterion it exploited, or `no_gap_found`
- Refiner (Opus 5 max or gpt-5.6-sol max): on gap — amends the exploited criterion, re-runs Linter
- Orchestrator (no model): repeats with a fresh Red-team until `no_gap_found` or `red_team_rounds` cap
- Orchestrator (no model): on cap — escalates `criteria_ungameable_unproven`

> This step is load-bearing in the design — it is what is supposed to terminate the
> criteria-for-the-criteria regress — and it has no support at all. `no_gap_found` from one model
> is not evidence a criteria set is ungameable.

## 12. Verdict calibration — `[HYP]`

GOAL: Find criteria that two reviewers would read differently.
HOW: Run three fresh reviewers against one known-bad artifact and one known-good artifact and compare their verdicts. Disagreement identifies the ambiguous criterion; send that criterion back and repeat.
JUSTIFICATION: Disagreement between fresh reviewers on a known artifact localizes the ambiguous criterion before it costs a mid-flight round. -- (Song :894 -- sharing rubric structure lifts agreement from r-bar 0.24 to 0.62 with no knowledge added, so agreement here is partly manufactured; Rao :31 -- protocol choice alone moves reported accuracy from 0.551 to 0.899 without altering a verdict)
IMPACT: low -- (Song :1152 -- the source has no accuracy oracle at all, so this step measures concurrence rather than correctness)

- Orchestrator (no model): assembles two probe artifacts
  - known-bad: the Red-team's gaming output from step 11
  - known-good: current-system behavior on a case the issue states already works
- Orchestrator (no model): starts three Reviewers in fresh sessions, disjoint mandates
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — three reviewers, not one family): returns a verdict per in-scope criterion — `pass` | `fail` | `unable_to_verify`
- Orchestrator (no model): requires unanimous `fail` on known-bad and unanimous `pass` on known-good
- Orchestrator (no model): on disagreement — identifies the criterion carrying it, returns that criterion to Refiner, repeats
- Orchestrator (no model): reads disagreement as localized ambiguity; does not read agreement as evidence the criteria are correct

> Targets a measured failure — ambiguous criteria produce `unable_to_verify` mid-flight — but Song
> cuts against the mechanism: shared rubric structure alone lifts inter-judge agreement from
> r̄ ≈ 0.24 to r̄ ≈ 0.62, and all three reviewers here share the criteria file. Unanimity is
> therefore partly manufactured. Use the disagreement signal; do not treat the agreement as a pass.

## 13. Freeze — `[S]`

GOAL: Fix the criteria so nothing later can move the target.
HOW: Commit the criteria file, record its SHA, and link it from the Jira issue. From here the criteria are the only input, and the issue text is not read again.
JUSTIFICATION: A threshold computed before search and never re-derived from what search turns up is what stops the target from moving. -- (Weitzman :719 -- a box's reservation price "depends only on the properties of that" box; Wall :435 -- an adapted aspiration level "could also become negative", making a performance decline acceptable)
IMPACT: high -- (Wall :1101 -- the adaptive form implements a new configuration in about 83% of periods at high interdependence; freezing is the difference between satisficing and drift)

- Orchestrator (no model): commits `specs/accept-JIRA-1234.yaml` and the rendered `specs/accept-JIRA-1234.md`
- Orchestrator (no model): attaches a remote link on JIRA-1234 to the committed spec at its SHA
- Orchestrator (no model): records `criteria_frozen_at` as the SHA of the `.yaml`, not the rendered `.md`
- Orchestrator (no model): opens `reviews/JIRA-1234/`
- Orchestrator (no model): transitions JIRA-1234 to `In Progress`
- Orchestrator (no model): treats criteria as the only source of truth from here; the issue text is not read again

> A threshold fixed before search and not re-derived from what search turns up is Weitzman's form
> — take the form, not the optimality claim. Wall's simulation is the negative case: an aspiration
> level adapted from recent outcomes can go negative, making a performance decline acceptable.

## 14. Planning — `[JDG]`

GOAL: Break the work into pieces that each close criteria completely.
HOW: A fresh session reads the criteria and the code, orders criteria by dependency, and cuts slices so each one closes at least one criterion or is marked as setup. It may add preservation criteria it discovers, and may not change any criterion that already exists.
JUSTIFICATION: Slicing so each piece closes criteria completely keeps any single review from seeing a diff large enough to have opinions about. -- (Lightman :76 -- process supervision solves 78.2% of the MATH subset against 72.4% for outcome supervision, and the gap widens with N; :63 -- it "specifies the exact location of any errors")
IMPACT: medium -- (Lightman :76 supports per-criterion verification; slice sizing itself is unmeasured)

- Orchestrator (no model): starts Planner in a fresh session, read-only repo
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): receives frozen criteria and the mandate map; does not receive the issue text
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): locates the call path per criterion
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): orders criteria by dependency
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): slices work so each slice closes at least one criterion completely, or is marked `enabling` and closes none
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): rejects its own slicing if a slice closes nothing verifiable and is not marked `enabling`
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): may add `PRES-*` discovered from the chosen mechanism
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): may not modify or remove any `AC-*` or `INV-*`
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): emits `cannot_plan` if a criterion requires change outside the touched subsystem, or if two criteria conflict
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes `plans/JIRA-1234.yaml` — per slice: `id`, `kind` (`terminal` | `enabling`), `closes[]` criterion ids, `paths[]` globs, `after[]` slice ids
- Planner (Sonnet 5 xhigh or gpt-5.6-terra xhigh): declares `paths[]` explicitly per slice — this is what the phase 16 gate scopes the diff against, so an omitted glob is a gate failure, not a formality
- Orchestrator (no model): renders `plans/JIRA-1234.md` from the YAML for human reading; nothing parses the Markdown
- Linter (no model): rejects the plan if a `closes[]` id is absent from the frozen criteria, if a `terminal` slice closes nothing, or if `after[]` forms a cycle
- Orchestrator (no model): creates one Jira sub-task per slice
- Orchestrator (no model): logs `preservation additions` and `amendments after freeze` as separate counters

## 15. Implementation — per slice, fresh session — `[JDG]`

GOAL: Make each slice's criteria pass, and nothing else.
HOW: One fresh session per slice writes a failing test per criterion, commits those tests red, then implements until they are green. Anything else it notices goes to the backlog file unfixed.
JUSTIFICATION: A failing test per criterion committed before the fix is what makes "criterion closed" a fact rather than a claim. -- (Huang :721 -- "the code executor serves as the perfect verifier", the one carve-out the self-correction literature grants)
IMPACT: high -- (Huang :721 -- an executable check is the only verdict in the design that does not rest on model judgment)

- Orchestrator (no model): starts Implementer, one fresh session per slice
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): receives slice id, its criteria ids, the spec path, the plan path
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes one failing test per in-scope criterion
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): runs the tests, confirms red
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): commits the red tests as their own commit
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): implements to green
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): touches only the paths the slice names
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): appends out-of-scope defects to `backlog/deferred.json`; does not fix them
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): reports the diff ref and test ids
- Orchestrator (no model): transitions the slice sub-task to `In Review`

> Lightman supports verifying at the leaf rather than the outcome — process supervision solves
> 78.2% of the MATH subset against 72.4% for outcome supervision, and the gap widens with N. That
> is an argument for per-criterion checks, not for test-first specifically. Slice sizing is invented.

## 16. Pre-review gate — mechanical, no model — `[HYP]`

GOAL: Reject work mechanically before spending a reviewer on it.
HOW: Check that a test exists per criterion, that the test failed before the change, that the suite is green, and that the diff stays inside the slice's paths. Any failure returns to the implementer with no reviewer started.
JUSTIFICATION: A test committed green proves nothing, so the gate has to prove the test fails against the old tree before a reviewer is paid. -- (Huang :721 -- the verifier is "perfect" only given a behavioral oracle that actually discriminates, which a green suite does not establish)
IMPACT: high -- (Huang :721 -- without the discrimination check every executable criterion can be discharged by a test that would pass against anything)

- Gate (no model): fails if a criterion test is absent
- Gate (no model): fails if no red commit exists for a criterion test
- Gate (no model): fails if a criterion test passes against the pre-change tree — the test does not discriminate
- Gate (no model): fails if the full suite is not green
- Gate (no model): fails if the diff touches a path the slice does not name
- Orchestrator (no model): on gate fail — returns to Implementer; spends no reviewer tokens

> Targets a stated scope limit rather than a guess. Huang's "the code executor serves as the perfect
> verifier" is conditional on a behavioral oracle that actually discriminates; a green suite proves
> nothing about a test that would pass against any implementation. The discrimination check is the
> direct response. No source tests red-commit gating as a mechanism.

## 17. Review — per slice — `[S]` for cross-model, `[HYP]` for the rest

GOAL: Get a verdict per criterion from reviewers that cannot wander off it.
HOW: Start one fresh reviewer per mandate, at least one on a different model family, each seeing only the diff, its own criteria, and the coupling map. Every fail carries a pointer to a test, a line, or a trace.
JUSTIFICATION: A reviewer that is not the author, in a fresh session, on a different model family, is the only configuration the corpus supports for catching what an author cannot see in its own work. -- (Panickssery :145, :166 -- GPT-4 recognises its own output 73.5% of the time and self-preference is linearly correlated with self-recognition; Huang :100 -- cross-model feedback is external by the paper's own taxonomy and is endorsed)
IMPACT: high -- (Zheng :60 -- judge-human agreement tops out near 80%, "the same level of agreement between humans"; review is where quality is found and also where the ceiling binds)

- Orchestrator (no model): selects mandates as the union of the slice's criteria mandates — a lookup, not an inference
- Orchestrator (no model): starts one Reviewer per mandate, each in a fresh session
- Orchestrator (no model): routes at least one mandate to a different model family — `[S]`
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — one per mandate, families mixed): receives the diff, the frozen criteria for its mandate, and the coupling map
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — one per mandate, families mixed): does not receive the other reviewers' criteria, the implementer's session, or any prior review round — `[HYP]`
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — one per mandate, families mixed): returns a verdict per in-scope criterion
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — one per mandate, families mixed): attaches an evidence pointer to every `fail` — `test_id` | `file:line` | `trace_id` — `[HYP]`
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — one per mandate, families mixed): returns uncited observations in a separate `observations` array
- Reviewer-* (Opus 5 xhigh and gpt-5.6-sol xhigh — one per mandate, families mixed): applies no cap to criterion-cited verdicts; the cap applies to `observations` only — `[S]`
- Orchestrator (no model): writes `reviews/JIRA-1234/<slice>-<round>-<mandate>.json`
- Orchestrator (no model): closes reviewer sessions after collecting output

> Cross-model is supported: GPT-4 recognises its own output 73.5% of the time and self-preference is
> linearly correlated with self-recognition, so an author model reviewing itself is structurally
> weaker. No cap is supported from the other direction: the critique–discrimination gap does not
> close with scale, so a stated rationale is a lower bound on what the model registered, and
> truncating discards articulation already produced.
>
> Scaffold-free input and evidence pointers are hypotheses. Both target measured failures — Song's
> manufactured agreement, RubricBench's soft-constraint fallacy — and neither is tested as a remedy.

## 18. Triage — mechanical, no model — `[JDG]`

GOAL: Pass the implementer only the findings that are in scope and evidenced.
HOW: Drop findings that cite no criterion, cite an out-of-scope criterion, or fail without evidence, and send unverifiable ones back to the criteria instead of to the implementer. Log everything dropped, and escalate a floor-severity re-raise rather than suppressing it.
JUSTIFICATION: A reviewer asked to find problems will supply problems, so the loop needs a mechanical rule separating a finding from a work item. -- (Sharma :18 -- five assistants "consistently exhibit sycophancy"; :263 -- challenged on a correct answer, Claude 1.3 wrongly admits a mistake on 98% of questions)
IMPACT: high -- (Sharma :263 -- "stop when the reviewer reports nothing" is not a terminating condition, so something has to bound the obligation set)

- Triage (no model): drops a finding with no criterion id
- Triage (no model): drops a finding whose cited criterion is not in the slice's in-scope set
- Triage (no model): drops a `fail` with no evidence pointer
- Triage (no model): routes `unable_to_verify` to Refiner as a spec defect, not to Implementer
- Triage (no model): routes uncited observations to `backlog/deferred.json`
- Triage (no model): suppresses re-raises of items previously deferred **as non-blocking only**
- Triage (no model): escalates — does not drop — a deferred item re-raised at `floor` severity by an independent reviewer
- Triage (no model): logs the count of dropped and suppressed items; suppression is never silent
- Triage (no model): writes `reviews/JIRA-1234/<slice>-<round>-blocking.json`

> The citation rule is this design's central invention and has no external support. Its appeal is
> that it enforces scope without a judgment call. Its risk is that it drops the finding class with
> no criterion to cite, which is why phase 6 exists.

## 19. Slice stop rule — `[S]` for a low cap, `[JDG]` for the value

GOAL: End each slice on a fixed condition rather than on running out of findings.
HOW: Ship the slice when the floor is clean, every in-scope criterion passes, and nothing is unverifiable. Cap the review rounds, and treat hitting the cap as a handoff to a human rather than a reason to buy another round.
JUSTIFICATION: The loop has to end on a stated condition and a hard cap, because the reviewers will not run out of things to say. -- (TICK :586 -- structured self-critique improves at a single iteration and degrades thereafter; :535 -- plateaus or regresses by the fourth; Huang :176 -- gains reappear only when something other than the model decides when to stop)
IMPACT: high -- (Huang :286 -- models changed correct answers to incorrect more often than the reverse, so an unbounded loop degrades the artifact it is meant to improve)

- Orchestrator (no model): ships the slice when floor is clean, all in-scope criteria are `pass`, `unable_to_verify` is 0, and the pre-review gate is green
- Orchestrator (no model): on blocking findings — prompts the same Implementer session with the blocking file path only, never the review prose
- Implementer (Sonnet 5 xhigh or gpt-5.6-terra xhigh): writes a failing test per blocking finding, confirms red, then fixes
- Orchestrator (no model): caps slice review rounds at `MAX_SLICE_ROUNDS`, default 2
- Orchestrator (no model): escalates `slice_not_converging` on cap; transitions the slice sub-task to `Blocked`
- Orchestrator (no model): escalates if the same criterion fails three rounds
- Orchestrator (no model): transitions the slice sub-task to `Done`, advances to the next slice

> TICK sets the direction: structured self-critique improves at a single iteration and degrades
> thereafter on objectively-scored tasks (`:586`), and plateaus or regresses by the fourth on judged
> tasks (`:535`). A low cap is argued from evidence. That the number is 2 rather than 1 or 3 is not.

## 20. Feature close — `[JDG]`

GOAL: Check the whole change together, not only slice by slice.
HOW: Run a fresh reviewer set over the full diff against every criterion. Require two consecutive rounds with no new blocking findings, and block the issue if the round cap is reached first.
JUSTIFICATION: Slices are reviewed against their own criteria only, so the assembled change needs one pass that can see interactions between them. -- (Wall :1101 -- at high interdependence, agents surprised by consequences they could not see individually revise in about 83% of periods)
IMPACT: medium -- (Wall :1101 is an agent-based simulation of organizations, not code review; the analogy motivates the pass but does not size it)

- Orchestrator (no model): after the last slice, starts a fresh reviewer set at whole-diff scope against all criteria
- Orchestrator (no model): requires two consecutive rounds with zero new blocking findings
- Orchestrator (no model): escalates `feature_not_converging` on `MAX_FEATURE_ROUNDS`; transitions JIRA-1234 to `Blocked`

> Two clean rounds is a resource rule, not a coverage claim. With no estimator available (see
> "Not available" below) there is nothing here that bounds what was missed.

## 21. Ship record — `[JDG]`

GOAL: Write down what was accepted, what was deferred, and what is still unknown.
HOW: Record criteria passed, findings deferred with reasons, rounds used, amendments after freeze, and residual risk. Name which criteria were checked only outside production and what signal would show breakage there.
JUSTIFICATION: Accepted imperfection has to be written down, or the next agent rediscovers the deferred items and starts fixing them. -- (Petersson :173 -- in ten years of capture-recapture research "only one paper has been classified" as an experience report, and it used only the original 1992 paper)
IMPACT: medium -- (Petersson :173 -- the corpus's own failure mode is knowledge that never reached practice, but no source measures whether a record prevents it)

- Orchestrator (no model): writes `ship-records/JIRA-1234.yaml`
  - criteria passed, by id and tier
  - findings deferred, with reason and backlog id
  - rounds consumed, per slice and at feature level
  - `amendments_after_freeze` — target 0
  - `preservation_additions` — expected non-zero
  - residual risk — which criteria were verified only outside production
  - watch window — which `PRES-*` are production-observable only, what signal indicates breakage, settle-by date
  - non-goals honored, with linked issue keys
- Orchestrator (no model): renders `ship-records/JIRA-1234.md` from it for human reading
- Orchestrator (no model): attaches the rendered record to JIRA-1234
- Orchestrator (no model): transitions JIRA-1234 to `Done`
- Orchestrator (no model): leaves the observability sub-task open unless its own criteria passed

## 22. Escalation — any phase — `[JDG]`

GOAL: Hand the issue to a human without losing the reason.
HOW: Block the issue, comment the reason class and the specific blocker, and assign it to a named person. Stop there, and do not continue under an assumption.
JUSTIFICATION: Some criteria cannot be made decidable by any amount of refinement, and forcing them produces criteria that are precise and wrong. -- (Jacobs & Wallach :512 -- construct validity is "always a matter of degree, to be supported by critical reasoning"; Rice :58 -- non-trivial semantic properties are undecidable)
IMPACT: high -- (SWE-bench Verified -- 38.3% underspecified, 61.1% invalid tests, 68.3% of samples filtered; a bounded loop that never escalates ships against a defective standard)

- Orchestrator (no model): transitions the issue to `Blocked`
- Orchestrator (no model): comments the reason class and the specific blocker
- Orchestrator (no model): assigns to the reporter or a named owner
- Orchestrator (no model): stops; does not proceed under an assumption
- Reason classes: `floor_gap`, `spec_density`, `requires_product_tradeoff`, `requires_stakeholder_preference`, `requires_aesthetic_judgment`, `underdetermined_by_issue`, `requires_unavailable_observability`, `requires_consumer_coordination`, `crosses_team_boundary`, `criteria_ungameable_unproven`, `cannot_plan`, `slice_not_converging`, `feature_not_converging`
- Note: a refiner that never escalates is misconfigured, not excellent

## 23. Offline — not in the per-issue loop — `[S]`

GOAL: Find out whether the reviewers and the round caps are any good.
HOW: Hand-grade a few completed reviews and measure reviewer precision and recall against those labels, then run a single-pass implementation at the same cost for comparison. Set the round caps from findings-per-round data collected across issues, outside any running loop.
JUSTIFICATION: Nothing inside the loop measures whether the reviewers are any good or whether the round cap is set right. -- (PaperBench JudgeEval -- judges scored on accuracy/precision/recall/F1 macro-averaged over binary nodes against human gold labels; Huang :731 -- evaluate any multi-call scheme "against baselines with comparable inference costs")
IMPACT: high -- (Song :1152 -- "we lack human ground-truth annotations and therefore cannot claim which evaluation method is absolutely more accurate"; without gold labels every threshold_met is unfalsifiable)

- Human (human): hand-grades five completed reviews
- Calibrator (no model): measures reviewer precision and recall per mandate against those labels
- Calibrator (no model): runs one strong-prompt single-pass implementation against the same criteria as a same-budget baseline
- Orchestrator (no model): renders `backlog/deferred.md` grouped by criterion and file
- Human (human): reviews the rendered backlog on its own cadence, separate from any issue — `[JDG]`
- Orchestrator (no model): reads `amendments_after_freeze` and `preservation_additions` from every `ship-records/*.yaml` — this is why the record is structured, not prose
- Human (human): adds each production-discovered implicit contract to Registry — `[JDG]`
- Orchestrator (no model): tracks blocking findings per round across issues
- Orchestrator (no model): sets `MAX_*_ROUNDS` from that distribution offline, never from inside a running loop

> Both calibration steps come straight from sources. The JudgeEval pattern scores judges on
> accuracy/precision/recall/F1 macro-averaged over binary nodes against human gold labels. The
> same-budget baseline is Huang's first prescription (`:731`); their §5 result is that a reported
> self-correction gain came from a requirement the initial prompt should have carried.
>
> This phase is the only place in the workflow that measures **accuracy** rather than agreement.
> Everything else measures whether reviewers concur.

---

## Invariants of the workflow itself

- Refiner never sees a proposed change
- Reviewer never sees a prior review round
- Implementer never sees raw review prose
- Criteria author, criteria reviewer, and implementer are three different sessions
- Every session that can be fresh is fresh
- Messages between actors carry file paths, not content
- Every mechanical check runs before any model is invoked
- Deferral is recorded, never silent
- `cap_reached` is a distinct outcome from `threshold_met` and routes to a human

---

## What "no model" means

Three actors are marked *mechanical, no model*, across four phases: Gate (7 and 16), Linter (10),
Triage (18). The Orchestrator is mechanical everywhere except starting and stopping sessions, and
Registry lookup is mechanical while Registry content is human-authored.

The term means all of the following, and each one is the point:

- **No LLM call anywhere in the step's decision path.** Not a cheap model, not a small one. None.
- **Deterministic.** Same inputs produce byte-identical output on every run. Re-running is free and
  tells you nothing new, which is why these steps can gate cheaply.
- **Decidable without reference to meaning.** The rule can be written as a schema check, a set
  operation, an arithmetic comparison, or a process exit code. If deciding requires reading for
  sense, it is not mechanical, whatever the implementation looks like.
- **Auditable by reading the code**, not by sampling behavior. A disagreement about what the gate
  did is settled by reading a function, not by re-running a prompt.

Why it matters here rather than being an implementation detail: every failure mode that motivates
this whole design is a property of model judgment. Sycophancy — a model wrongly conceded error on
98% of challenged correct answers in one measurement. Self-preference correlated with
self-recognition. Position bias — one judge gave consistent verdicts on 23.8% of swapped pairs.
Verbosity bias. Manufactured agreement from shared rubric structure. The soft-constraint fallacy.
Moving a decision into a script does not mitigate that class of failure, it removes the class. A
script cannot be flattered, cannot be argued down across rounds, and cannot drift as context
accumulates.

The cost ordering is the second reason, and it sets the phase order: schema and set operations run
in milliseconds, git and test operations in seconds to minutes, model calls in dollars. Fail in
that order.

## Implementing the no-model actors

### Precondition: every file a gate reads is a schema, and the prose is rendered from it

This is the decision the rest depends on, and it is the "File formats — one rule" section applied.
A Markdown artifact that reads well is not machine-checkable, and every check over it degrades into
text matching — which needs a model, which defeats the point.

**Criteria** — `specs/accept-JIRA-1234.yaml`:

- Per criterion, required: `id`, `tier`, `mandate[]`, `traces[]`, `observation`, `decision`.
- For any quantity: `value`, `unit`, `conditions`.
- For preservation criteria: `verifiable_in` — one of `unit` | `integration` | `staging` | `production` | `external`.

**Plan** — `plans/JIRA-1234.yaml`:

- Per slice: `id`, `kind` (`terminal` | `enabling`), `closes[]`, `paths[]`, `after[]`.
- `paths[]` is what the pre-review gate scopes the diff against. It is the single field that makes
  phase 16's scope check possible, and the reason the plan cannot stay Markdown.
- `closes[]` ids must exist in the frozen criteria; `after[]` must be acyclic.

**Verdicts** — `reviews/*.json`:

- `criterion_id`, `verdict`, `evidence` as a typed union (`{test_id}` | `{file, line}` | `{trace_id}`), `severity`.
- The criterion-to-test mapping lives here as a declared field, not inferred from test names.
- Findings that are not criterion-cited go in a separate `observations[]` array, never mixed in.

**Ship record** — `ship-records/JIRA-1234.yaml`: structured because phase 23 reads
`amendments_after_freeze` and `preservation_additions` across every issue. A prose record makes the
one un-gameable metric in the design unqueryable.

Effort: three schema files and a renderer. Everything below is then small.

### Linter (phase 10) — JSON Schema plus three set operations

- **Load under the YAML 1.2 core schema**, not the parser default. On PyYAML that means
  `yaml.safe_load` is not enough — 1.1 resolvers turn `NO` into `False` and `1.10` into `1.1`. Use a
  1.2-conformant loader (`ruamel.yaml` with `typ="safe"`, `pure=True`), or require every `id`, enum,
  and threshold to be quoted and reject unquoted scalars in those positions.
- **Canonicalize and compare.** Round-trip the file through the formatter; if the output differs from
  the input, reject. This keeps the phase 13 freeze SHA stable against later reformatting, and it is
  four lines of code.
- Required fields, enum values, type checks: JSON Schema, applied to the loaded YAML. No custom code.
- Orphan criterion and unanchored mandate: symmetric set difference between the union of
  `mandate[]` across criteria and the configured mandate list.
- Trace resolution: every `traces[]` entry must resolve to a claim id in `refine/*-claims.json`, an
  `INV-*` in Registry, or an entry id in the coupling map. Three dictionary lookups.
- Plan checks (same actor, second file): `closes[]` ids exist in the frozen criteria, every
  `terminal` slice closes at least one, `after[]` has no cycle — one topological sort.
- Vague predicate: substring match against a wordlist. Warning only — a denylist loses to any word
  not on it.

### Gate — autonomy (phase 7) — arithmetic over the coupling map, plus one external dependency

- `count(PRES-*) > count(AC-*)`: two counts.
- Spec density: claims that produced at least one criterion, divided by total claims, against a
  configured floor. One division.
- Unverifiable without an external consumer: fail on `verifiable_in == external`.
- Service or team boundary: **requires an ownership map that may not exist.** `CODEOWNERS`, a
  service catalog, or a path-to-team table. Without one this check cannot be implemented, and the
  autonomy governor loses its most important condition. Build or import the map first.

### Gate — pre-review (phase 16) — git and the test runner

- Test exists per criterion: the criterion-to-test mapping is a declared field; run the test
  runner's collect-only mode and assert presence.
- Red commit exists: walk the slice branch for the commit that introduced the test file.
- Discrimination check, the load-bearing one: `git worktree add` a temp tree at the pre-change SHA,
  apply the test commit only, run that criterion's test, assert non-zero exit. Cache the result by
  `(test_id, base_sha)` so it runs once per criterion rather than once per round.
- Suite green: exit code.
- Diff scope: `git diff --name-only base..head`, minus the slice's `paths[]` globs from
  `plans/JIRA-1234.yaml`; non-empty means fail. This is the check that forced the plan to be
  structured — there is no version of it that reads a Markdown slice list.

Effort: a shell script plus a JSON read. This is the most valuable no-model actor per line of code
in the workflow, because it rejects work before any reviewer is paid.

### Triage (phase 18) — a pure data transform, with one genuinely hard part

- Drop uncited, drop out-of-scope citation, drop `fail` without evidence: filters over the verdict
  array using the schema. Trivial.
- Partition by verdict to route `unable_to_verify` upstream: one group-by.
- Cap observations: sort by severity, truncate, log the dropped count.
- **Dedupe against the backlog is not trivially mechanical.** "The same nit" is a judgment. Use an
  exact key — `(criterion_id, file, symbol)` — and accept that it under-suppresses: the same issue
  reported at a shifted line reappears. Do not reach for fuzzy matching, because that needs a model
  and puts model judgment back into the one step that exists to be immune to it. Under-suppression
  is the safer error, and the floor-severity escalation rule catches the case that matters.

### Registry (phases 0, 5) — a versioned file and a glob intersection

- `registry/invariants.yaml`: `id`, `statement`, `tier`, `applies_to` (path globs or subsystem
  tags), `added`, `source` (the incident or ship record that produced the entry).
- Selection: intersect `applies_to` globs with the touched paths from findings.
- Content is human-authored and grows from `residual risk` entries in ship records. Only the query
  is mechanical.

### Three checks that cannot be mechanical, and should not pretend to be

Stating these plainly matters more than the checks that work, because a gate that silently
approximates is worse than one that abstains.

1. **"Names no implementation."** Distinguishing "concurrent transfers never produce a negative
   balance" from "use a mutex in `transfer()`" needs an understanding of what the words denote. A
   denylist of construct names plus repo symbols catches the obvious cases. Ship it as a warning
   routed to the criteria reviewer, not as a gate.
2. **"Criterion is unambiguous."** This is what phase 12 exists for, and phase 12 uses models —
   deliberately, because the property is semantic. The mechanical part is only counting the
   disagreement.
3. **"Two findings are the same finding."** See Triage above. Exact keys or nothing.

### The general shape

A mechanical gate is only as sound as the fields a model filled in. The autonomy gate reads
`verifiable_in`; the pre-review gate reads a criterion-to-test mapping; Triage reads
`criterion_id`. All three were written by a model. The gate is deterministic; its inputs are not.

That is not a defect in the approach — it is where the design puts the seam. A model asserting a
structured field is checkable against reality later (does the test actually fail against the old
tree?), whereas a model asserting a conclusion in prose is not checkable at all. Prefer fields over
prose everywhere, and make the mechanical layer verify the field against something real wherever
that is possible.

---

## Evidence status summary

- **Supported.** Floor selected from a registry rather than authored (5). Binary criteria derived
  without access to the candidate change (9). Ex-ante freeze (13). Cross-model review and no cap on
  cited findings (17). A low round cap (19). Offline accuracy calibration and a same-budget baseline
  (23).
- **Hypothesis, targets a measured failure.** Three-tier criteria split (9). Seeded-probe
  calibration (12). Red-commit and discrimination gating (16). Scaffold-free reviewer input and
  evidence pointers (17).
- **Local judgment, corpus silent.** Claim provenance tagging (2). Investigation separation (3).
  Scope splitting (4). Coupling map and preservation criteria (6). Autonomy thresholds (7).
  Observability seams (8). The linter's field schema (10). Red-team as regress terminator (11).
  Slicing (14, 15). The citation rule (18). Two-clean-rounds (20). Ship record (21). Escalation
  classes (22).
- **Not available.** Any coverage estimate. Capture-recapture needs a closed population and
  reviewers blind to each other; this loop changes the artifact between rounds, which puts it
  outside the model rather than under-calibrated within it. `threshold_met` bounds scope and makes
  no claim about what remains undiscovered. Say so in the ship record.
