# Near-term artifacts for the satisficing boundary

Companion to `satisficing-boundary-briefing.md`. That document establishes what the problem
class is and what the literature supports; this one lists the artifacts worth building
first. Ordered by value ÷ effort. Nothing here is designed yet — each Tier 1 item needs its
own design pass before implementation.

Section references (`§`) point into the briefing.

---

## Tier 1 — the loop will not terminate without these

- **`review-boundary.json` state file, plus a skill that writes it.**
  Weighted binary leaves derived from the task specification *before any code is read*, each
  tagged `executable` or `semantic`. `max_rounds` and the aspiration threshold are set in the
  same pass. This single artifact does most of the work: it is the frozen external referent
  that makes deviation measurable (§1 — drift is undetectable without one) and a finite,
  exhaustible criteria set (§5 — creep dies because the leaf set bounds the work).
  RubricBench's construction rule is the whole trick: derived solely from the instruction,
  with no access to the candidate response, which prevents response-aware leakage.

- **A `Stop` hook that enforces it.**
  Refuses a completion claim unless every leaf is adjudicated and the stop reason is recorded
  (`threshold_met` | `cap_reached`). Refuses a further review round past `max_rounds`.
  Without this the boundary is advisory, and the briefing's core evidence is that the agents
  cannot self-police it — Huang et al.'s models changed correct answers to incorrect ones
  more often than the reverse and could not tell which direction they were moving (§3.2).

- **A compact injected rule carrying the prohibitions.**
  From the "what not to do" table (§5):
  - never stop on "no findings reported" — sycophancy means findings never reach zero;
  - never author new criteria mid-loop — that ratchets the threshold, and model-authored
    criteria run 27% worse than human-authored;
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

- **Asymmetric reviewer briefing in the review orchestration.**
  Give the cross-model reviewer the specification and the diff *without* the checklist or the
  conversation history. Song et al. measured ~62% of inter-judge agreement as an artifact of
  shared rubric structure alone, and found agreement *falls* as output quality rises (§3.4).
  Identical inputs manufacture the concurrence the loop is relying on.

- **Overlap tally.**
  Count shared versus unique findings across the two reviewers as a directional coverage
  signal. Print the n=2 caveat in the output so it is not read as a percentage: Mh-JK needs
  four or more reviewers, the two-reviewer recommendation failed on real inspection data, and
  most estimators underestimate (§3.1, §5).

## Tier 3 — needs data first, worth queuing

- **JudgeEval-style calibration set.**
  Five hand-graded reviews, then measure reviewer accuracy/precision/recall/F1 macro-averaged
  over the binary leaves against those gold labels. Converts "do I trust this review" into a
  number. Cheap to run; the cost is grading the five.

- **Cost calibration for the threshold.**
  Yang et al.'s rule — stop when it becomes cheaper to fix later than to find now — needs a
  local cost estimate that does not exist yet (§3.1).

---

## Open questions to settle before building

- **Ownership.** The research sits under `context-emendator/`, but per `AGENTS.md` the
  injected rule belongs with behavioral rules (`mantra`) and the review orchestration belongs
  with herd workflows (`comitatus`). If `context-emendator` is to own the boundary concept it
  needs a host manifest; otherwise this work splits across three plugins and the
  one-source-of-truth principle has to be honoured explicitly.

- **Who reviews the checklist.** The briefing's closing risk (§5) is that this design trades
  an unbounded failure mode for a bounded and silent one: the loop stops running away and
  starts terminating confidently on whatever the checklist says. SWE-bench Verified measures
  that risk in a comparable setting — 38.3% of problem statements underspecified, 61.1% of
  test suites able to reject valid solutions, 68.3% of samples unusable. The trade pays only
  if the checklist is reviewed by someone who did not author it, which is the cross-model
  independence argument applied one level up. Decide this before the checklist gates merges.
