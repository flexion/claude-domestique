# Near-term artifacts for the satisficing boundary

Companion to `satisficing-boundary-briefing.md`. That document establishes what the problem
class is and what the literature supports; this one lists the artifacts worth building
first. Ordered by value ÷ effort. Nothing here is designed yet — each Tier 1 item needs its
own design pass before implementation.

Section references (`§`) point into the briefing.

**Revised 2026-08-28** alongside the briefing, after a per-source pass over
`satisficing-references/text/`. Four changes: the Tier 1 leaf-derivation rule now excludes the
*candidate change* rather than all code, which is what the source actually withholds; the Stop
hook gained an evidence-shape requirement, because a verdict-presence check is satisfiable by
the failure patterns the source records under correct criteria; the overlap tally left the list
entirely and the reason is recorded below rather than deleted silently; and a same-budget
baseline was added, since without one the loop cannot distinguish its own contribution from
inference budget or from a better initial prompt.

---

## Tier 1 — the loop will not terminate without these

- **`review-boundary.json` state file, plus a skill that writes it.**
  Weighted binary leaves derived from the task specification *before the candidate change is
  read*, each tagged `executable` or `semantic`. `max_rounds` and the aspiration threshold are
  set in the same pass — and `max_rounds` has an evidence-based starting point rather than a
  budget-based one: structured self-critique improved at one iteration and degraded thereafter
  on objectively-scored tasks, plateauing or regressing by the fourth on judged ones
  (§4, `checklist--cook-2024:586`, `:535`). This single artifact does most of the work: it is the frozen external
  referent that makes deviation measurable (§1 — drift is undetectable without one) and a
  finite, exhaustible criteria set (§5 — creep dies because the leaf set bounds the work).
  RubricBench's construction rule is the trick: items are "drafted without knowledge of
  candidate responses to prevent post-hoc bias"
  (`text/rubric-limits--zhang-2026--rubricbench.txt:518`, and `:305` for the leakage
  rationale).

  **Read that rule precisely.** What is excluded is the *candidate response* — here, the
  proposed change. Repository context is not what the paper withholds, and a rule barring the
  authoring pass from reading the codebase is a stricter constraint than the source supports.
  Criteria can be grounded in existing code, logs, and call paths and still be frozen before
  the change exists. RubricBench gives no evidence either way on that regime: its rubrics are
  instruction-only by construction, so criteria authored with domain context in hand are
  outside what it measured, in both directions.

- **A `Stop` hook that enforces it.**
  Refuses a completion claim unless every leaf is adjudicated and the stop reason is recorded
  (`threshold_met` | `cap_reached`). Refuses a further review round past `max_rounds`.
  Without this the boundary is advisory, and the briefing's core evidence is that the agents
  cannot self-police it — Huang et al.'s models changed correct answers to incorrect ones
  more often than the reverse and could not tell which direction they were moving (§3.2).

  **Adjudicated must mean evidenced, not answered.** RubricBench's execution-failure section
  is the reason. Given *correct* human rubrics, it still records "recurring execution-level
  failure patterns" (`rubric-limits:1285`), the first of which is the Soft-Constraint Fallacy
  (`:1306`) — the judge names the failed must-have in its own reasoning and then decides
  against it for a secondary quality — and another is deciding by counting satisfied items
  rather than honouring a hard requirement. A hook that checks only for the *presence* of a
  verdict is satisfiable by exactly those patterns. Check the shape of the evidence instead:
  each leaf carries a typed pointer (test name, diff hunk, reviewer verdict id), which is
  mechanically verifiable in a way a verdict string is not. Note also that the source's own
  proposed remedy — "distinguishing hard/soft constraints or incorporating explicit weight
  assignments" (`:1391`) — is offered as untested speculation, so a two-tier severity design
  is a reasonable hypothesis with no measurement behind it and should be logged as such.

- **A compact injected rule carrying the prohibitions.**
  From the "what not to do" table (§5):
  - never stop on "no findings reported" — sycophancy means findings never reach zero;
  - never author new criteria mid-loop — that ratchets the threshold, and model-authored
    criteria ran 27% worse than human-authored on the task where it was measured;
  - never treat Claude/Codex agreement as evidence of correctness;
  - never discharge a `semantic` leaf on the author's own assertion;
  - do not add reviewers expecting proportional yield;
  - do not report several correlation coefficients as corroboration — on binary verdicts
    they are one statistic under five names.

## Tier 2 — cheap and meaningful

- **Findings triage skill.**
  Every finding either cites a leaf ID or lands in a `deferred.md` log: recorded, not
  implemented. This is the creep valve, and it is mechanical rather than a judgment call.

- **Decidability router.**
  `executable` leaves go to tests, types, and lint, and never to a reviewer. This removes the
  largest class of leaves from LLM judgment entirely, and it is the one carve-out Huang et al.
  explicitly grant — "the code executor serves as the perfect verifier" (§3.2).

  The carve-out is narrower than the sentence sounds. It is conditional on a behavioral oracle
  that actually discriminates, inside code-generation self-debugging; it does not license
  reading any green suite as a complete oracle. So the router owes a discrimination check —
  evidence that the test fails against the pre-change state — or an `executable` leaf is
  discharged by a test that would pass against anything.

- **Same-budget baseline for the loop as a whole.**
  Huang et al.'s first prescription for evaluating any multi-call review scheme is
  "Evaluating self-correction against baselines with comparable inference costs"
  (`text/self-correction--huang-2024-iclr--cannot-self-correct.txt:731`). Their own §5 result
  is that a reported self-correction gain came from a requirement the initial prompt should
  have carried, and that moving it up front beat the correction outright. A boundary loop that
  never measures itself against one strong-prompt, single-pass run cannot tell which of those
  two it is. Cheap: run the comparison on a handful of completed work items.

- **Asymmetric reviewer briefing in the review orchestration.**
  Give the cross-model reviewer the specification and the diff *without* the checklist or the
  conversation history. Song et al. report that sharing rubric structure alone lifts
  inter-judge agreement from r̄ ≈ 0.24 to r̄ ≈ 0.62, and that agreement *falls* as output
  quality rises (§3.4). Identical inputs manufacture the concurrence the loop is relying on.
  Weight this as directional, not quantitative — see §3.4 for why the 62% is a correlation
  level rather than a share of agreement, and why its scope is narrower than the headline.

## Tier 3 — needs data first, worth queuing

- **JudgeEval-style calibration set.**
  Five hand-graded reviews, then measure reviewer accuracy/precision/recall/F1 macro-averaged
  over the binary leaves against those gold labels. Converts "do I trust this review" into a
  number. Cheap to run; the cost is grading the five, which is the only reason this sits in
  Tier 3.

  It is also the only artifact on this list that measures *accuracy* rather than agreement, and
  that gap is the corpus's central blind spot rather than a refinement. Song et al. state it
  about their own work: "we lack human ground-truth annotations and therefore cannot claim
  which evaluation method is absolutely more accurate"
  (`text/judge-ceiling--song-2026-tencent--evaluation-illusion.txt:1152`). Saunders et al.
  measure critiques *found*, and the one place they attempted an accuracy comparison against
  human ensembles produced "improvements that were within noise" and was discontinued
  (`text/scalable-oversight--saunders-2022-openai--self-critiquing-models.txt:1886`). Without
  gold labels, `threshold_met` is not a falsifiable claim about the code.

- **Cost calibration for the threshold.**
  Yang et al.'s rule — stop when it becomes cheaper to fix later than to find now — needs a
  local cost estimate that does not exist yet (§3.1).

---

## Removed from this list

Recorded rather than deleted silently, because the reason is the same reason the rest of the
list exists.

- **Overlap tally between the two reviewers.** Previously listed in Tier 2 as a directional
  coverage signal with an n=2 caveat. The caveat was the wrong objection. Capture-recapture
  applies to closed populations — Petersson et al. use the closed-population models precisely
  because "all reviewers are given the same version of the inspected artefact"
  (`text/stopping-rule--petersson-wohlin-2004-jss--capture-recapture-10-years.txt:91`) — and
  its input is overlap between reviewers who did not see each other's findings. A review→revise
  loop changes the artifact between rounds and is therefore outside the model, not
  under-calibrated within it. The survey offers no evidence for transferring overlap logic to
  iterative review or to model-generated review passes. Two further reasons not to keep it: an
  asymmetric reviewer briefing (Tier 2) deliberately reduces the overlap the estimator reads as
  coverage, so the two artifacts would fight; and the survey never established that better
  estimates produce better *decisions*, which is why Relative Decision Accuracy was proposed
  and remains lightly used and threshold-dependent.

## Open questions to settle before building

- **Ownership.** *Half settled.* The research now sits under `modus/`, which has the host
  manifest this question asked for — the work was extracted out of `context-emendator/`, whose
  name belongs to the workflow-config auditor. What is still open is the split: per `AGENTS.md`
  the injected rule belongs with behavioral rules (`mantra`) and the review orchestration
  belongs with herd workflows (`comitatus`), so this work still spans three plugins and the
  one-source-of-truth principle has to be honoured explicitly.

- **Who reviews the checklist.** The briefing's closing risk (§5) is that this design trades
  an unbounded failure mode for a bounded and silent one: the loop stops running away and
  starts terminating confidently on whatever the checklist says. SWE-bench Verified measures
  that risk in a comparable setting — 38.3% of problem statements underspecified, 61.1% of
  test suites able to reject valid solutions, 68.3% of samples unusable. The trade pays only
  if the checklist is reviewed by someone who did not author it, which is the cross-model
  independence argument applied one level up. Decide this before the checklist gates merges.

  TICK measures the same risk on a *generated checklist* specifically, which is closer to this
  design than the SWE-bench figures are: a checklist derived from an instruction inherited that
  instruction's false premise, and a response that hallucinated its sources passed 9 of 10
  questions while a human scored it 2/5 (`checklist--cook-2024:1961`). The authors' own
  conclusion is that checklist answers "alone should not be used to score responses" (`:1883`).
  So the reviewer of the checklist is not an optional hardening step — it is the only thing in
  the design that can catch a criteria set which is precise and wrong.

- **What sets the aspiration threshold, given no coverage estimator.** With capture-recapture
  out (see above) and the cost calibration still missing, `threshold_met` currently rests on the
  leaf set alone. That is defensible for creep and drift, and it is not a coverage claim. Worth
  deciding explicitly whether the first implementation states that limitation in its output, or
  whether the JudgeEval calibration set moves up from Tier 3 to sit alongside Tier 1.
