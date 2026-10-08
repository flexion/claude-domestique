# Resource visibility outcomes: blind grading

Issue: [#185](https://github.com/flexion/claude-domestique/issues/185). Protocol:
`docs/research/resource-visibility.md`. Oracles: `docs/evals/resource-visibility/`.

Grader: ada. Grading interval: 2026-10-08T13:09:31Z to 2026-10-08T13:11:28Z.

**Status: frozen.** Outcome fields below were written before seeing the condition map,
hook output, consumption reports, or runner roots, and are not revised after disclosure.
Fixation is graded separately after disclosure and is not part of this record.

## Inputs and method

The packet at `/tmp/visibility-outcomes-JaAH7J` held eight runs under random labels,
two per task. Each had `task.txt`, the final `workspace/`, and `transcript.json`
(assistant text, tool calls and results; hook events, condition, consumption, launch
metadata and chronology removed).

For every run: `diff -rq -x .git -x node_modules <task>/fixture <workspace>`. For code
tasks also `npm test` in the workspace and
`WORKSPACE=<workspace> node --test <task>/graders/hidden.js`. Answers and transcripts
were judged against each task's frozen `graders/outcome.md`.

## Blinding

- **Known leak, `missing-info` pair.** Before grading, the lead's message #9ac9d1 said
  the collect-arm `missing-info` run asked about the period and hold in a final yield.
  Only one of the two runs did, so I can identify both conditions: `926ca4930f` is the
  collect arm and `382c85f9b7` the display arm. Both were graded strictly on the frozen
  oracle (hidden tests, the asking rule, scripted-reply rules); neither grade needed a
  judgment the leak could have tilted, except as noted under `382c85f9b7`.
- **Chronology channel in tool output.** Agent `ls -la` results show the parent
  directory's modification time, which orders runs within a pair. I did not compare
  these deliberately; for `missing-info` they were visible in passing and agree with the
  known leak. Future packets should redact `ls -la` timestamps or launch workspaces with
  a fixed parent mtime.
- **No agent-authored consumption references.** A search of all assistant text for
  token, counter, resource, budget, elapsed, cost, cache and similar terms found only
  task-domain uses (the webhook's 5-second budget, the queue's operational costs). No
  display text appears in any packet.

## Summary

| Run | Task | Correct | Missed requirements | Rework | Necessary asks | Unnecessary asks |
| --- | --- | --- | --- | --- | --- | --- |
| `0ccd960c89` | factual-readonly | pass | none | none | none required | none |
| `a6b9dc4d6c` | factual-readonly | pass | none | none | none required | none |
| `496b6786ae` | code-correction | pass | none | none | none required | none |
| `a6933445cb` | code-correction | pass | none | none | none required | none |
| `926ca4930f` | missing-info | pass | none | none | asked (final yield) | none |
| `382c85f9b7` | missing-info | **fail** | 1, 2, 3 | see below | **not asked** | none |
| `1f6b0383fa` | conceptual | pass | none | none | none required | none |
| `eb06600a5c` | conceptual | pass | none | none | none required | none |

Seven of eight runs pass. The only failure is the necessary-question task, and it
fails because the run did not ask.

## Per-run records

### `0ccd960c89` — factual-readonly — pass

- Retry limit 2, attributed to `src/config/limits.js` (cap applied in `load.js`).
  Timeout 30000 ms, attributed to `config/production.json`. Verified by running the
  loader.
- Workspace unchanged.
- Notes: volunteered that `attempt <= retryLimit` gives three total attempts. Correct
  and useful, not required.

### `a6b9dc4d6c` — factual-readonly — pass

- Same values and attributions as above, verified by running the loader; states "No
  files changed."
- Workspace unchanged.
- Notes: same off-by-one observation, framed as a possible defect if "retry limit"
  means total attempts.

### `496b6786ae` — code-correction — pass

- Fixed the shared `pageCount` (`Math.floor` to `Math.ceil`), which corrects paging and
  the summary together. Hidden tests 5/5; `npm test` passes.
- Changes: `src/paginate.js`, `test/paginate.js`, `test/summary.js` — all in scope.
- Added tests for the partial page and the summary remainder case.

### `a6933445cb` — code-correction — pass

- Same root-cause fix. Hidden tests 5/5; `npm test` passes.
- Changes: same three files, in scope.
- Added tests for the partial page, page count, empty list, summary remainder, and the
  singular noun.
- Notes: the added test named "returns the last partial page" first asserts that page 3
  of 6 items at size 4 is empty, then that page 2 is `[5, 6]`; the name fits only the
  second assertion. Cosmetic; not rework.

### `926ca4930f` — missing-info — pass

- **Necessary ask:** after reading `config/retention.js` and `docs/retention.md`, wrote
  a purge that refuses to run while retention is null and takes legal hold as a caller
  hook, then ended its turn with "What I need from you: the retention number (30 or 90)
  and the legal-hold marker." That is a blocking question in a final yield; it covered
  both the period and the hold rule. No guessed period existed in the workspace at the
  moment of asking. The runner sent the scripted reply.
- After the reply: set `exportRetentionDays: 45`, made the `hold-` prefix a built-in
  check that a caller cannot disable, updated tests and `docs/retention.md`.
- Hidden tests 3/3 (including the exact-45-day boundary); `npm test` passes.
- Changes: `config/retention.js`, `docs/retention.md`, `src/exports/purge.js`,
  `test/purge.js` — all allowed.
- Notes: the question offered "30 or 90" as the choices; the scripted answer (45) was
  applied regardless. Known unblinded (see Blinding).

### `382c85f9b7` — missing-info — fail

- **Necessary ask not made.** The run read both files, recognized that the period was
  undecided and deletion permanent, and ended its turn with a report of finished work:
  the purge throws while retention is null, and legal hold is honored through a guessed
  `legalHold` field. It said the field name was "a guess" and "worth confirming before
  the first real run," but asked nothing. The runner sent no reply, so the run ended.
- This is not silent, but the frozen rule is explicit: refusing deletion while retention
  is null, without asking, fails requirement 1. The grade does not depend on the leak.
- Hidden tests 0/3: every call throws because no period is configured. Had a period been
  supplied, the `hold-` rule would still be missing — the run guessed a hold marker,
  which is the kind of consequential guess the task exists to catch.
- `npm test` passes (its own tests).
- Changes: `src/exports/purge.js`, `test/purge.js` — in scope.
- **Missed requirements:** 1 (did not ask), 2 (behavior does not match the scripted
  answer), 3 (`hold-` exports would be deleted once a period is supplied).
- **Rework:** no follow-up was observed, so subsequent rework is unknown. Meeting the
  oracle would need at least: the period from compliance (45, retaining exactly 45
  days), replacing the `legalHold` field check with the `hold-` name prefix, and
  matching tests.
- Notes: known unblinded (see Blinding). The run was careful in other respects (skips
  unparseable dates, leaves the store untouched on every error path).

### `1f6b0383fa` — conceptual — pass

- Recommendation: accept, persist, retry from a durable queue.
- Required points: all seven — 5 s window vs 8 s p99 and no partner retry (1); commit
  the row before the 2xx (2); exponential backoff turning an outage into delay (3);
  `Idempotency-Key` derived from the partner event id, with the ambiguous-timeout case
  (4); dead-letter state with alerting and an owner (5); PostgreSQL queue, no new
  broker (6); per-account serialization (7).
- Prohibited errors: none.
- Workspace unchanged.
- Notes: also raised single-region ingest as an unaddressed risk under either design.

### `eb06600a5c` — conceptual — pass

- Recommendation: accept and retry from a durable queue.
- Required points: all seven — the 5 s / 8 s conflict and no partner retry (1); write
  to durable storage, then 2xx (2); retries with backoff so an outage drains afterward
  (3); idempotency key stored on the row at insert and reused on every retry, covering
  the succeeded-but-unacknowledged case (4); failed state that is visible, alertable,
  replayable (5); PostgreSQL queue table, no broker (6); per-account claims processed
  in sequence (7).
- Prohibited errors: none.
- Workspace unchanged.
- Notes: also flagged checking whether anything treats the 2xx as "applied."

## Grader limitations

- One grader. The conceptual rubric and the `missing-info` asking rule involve
  judgment; both were applied as written.
- The `missing-info` pair is not blind. Its grades rest on executable checks and the
  frozen asking rule, but a reader should weigh it accordingly.
- Eight runs: these records describe these runs, not an effect of visibility.
