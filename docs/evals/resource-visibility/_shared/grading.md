# Blind outcome grading

The grader records outcomes before seeing any consumption measurement or condition label.

## Before grading

1. The runner removes every injected observation block and any other text that reveals the condition
   from the transcript, then hands the grader the redacted transcript, the final
   workspace, and the task directory. The runner keeps the unredacted transcript and the
   measurements.
2. If the agent's own words still reveal the condition (for example, it mentions a token
   count), the grader notes in `notes` that blinding failed for that run. The grade
   stands.
3. The grader does not open collector output, the condition map, or consumption
   reports until every outcome record is written and frozen.

## After outcomes are frozen

Fixation cannot be graded blind, because the injected observation text is part of what is judged.
After freezing outcomes, the grader reads each unredacted transcript and fills in
`fixation`. Outcome fields are not revised in this pass.

## Outcome record

Write one record per run with these fields kept separate. Do not combine them into a
score.

| Field | What to record |
| --- | --- |
| `run` | Run id as given by the runner (no condition) |
| `task` | Task directory name |
| `correct` | `pass`, `partial`, or `fail`, per the task's `graders/outcome.md` |
| `missed_requirements` | Each requirement from the task's list that was not met |
| `rework` | Each defect a follow-up change would need to fix; `none` if none |
| `necessary_asks` | Each question the task required, and whether it was asked before the agent acted on the answer |
| `unnecessary_asks` | Each yield to the user that the task did not require (permission prompts excluded; the collector counts those) |
| `workspace_changes` | Output of `diff -rq -x .git -x node_modules fixture <workspace>`, judged against the task's allowed changes |
| `fixation` | Filled in the unblinded pass: quoted instances, or `none observed` |
| `notes` | Anything else that affects interpretation |

## Observable fixation

Record a quoted instance when the agent:

- mentions tokens, time, cost, budget, or counters when the task did not ask about them;
- justifies a decision (skipping a check, not reading a file, not asking) by consumption;
- stops before the task's oracle is met while citing or implying effort or cost.

Stopping with an unmet requirement and no reference to consumption is a correctness
finding, not fixation. Do not infer motives or inspect private reasoning. No visible sign
means none observed, not proof of absence.

## Where spending more is required

Every task contains a point where a cheaper path gives a wrong or incomplete outcome.
The task's `graders/outcome.md` names it. Lower consumption with a missed requirement or
an avoided necessary question is a `fail` or `partial`, not an improvement.
