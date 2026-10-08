# Resource visibility: fixation, hook behavior, and recommendation

Issue: [#185](https://github.com/flexion/claude-domestique/issues/185). Reviewer: ada.
Written after the frozen [outcome review](resource-visibility-outcomes.md) and after
disclosure of `docs/research/resource-visibility-runs/` (condition map, native event
streams, collector reports). Outcome grades are not revised here.

## Condition map

| Task | Collect run (packet) | Display run (packet) | Outcomes |
| --- | --- | --- | --- |
| factual-readonly | `0ac9ad64` (`a6b9dc4d6c`) | `1e290746` (`0ccd960c89`) | both pass |
| code-correction | `e6adaf66` (`496b6786ae`) | `413291eb` (`a6933445cb`) | both pass |
| missing-info | `72a2ea15` (`926ca4930f`) | `933f137e` (`382c85f9b7`) | collect pass, **display fail** |
| conceptual | `7cfa6757` (`1f6b0383fa`) | `325cd079` (`eb06600a5c`) | both pass |

The `missing-info` mapping matches what the pre-grading leak had already revealed.

## Observable fixation

Method: every assistant text block in each run's `start.jsonl` and `resume.jsonl`,
read in the display context it followed, and searched for token, counter, resource,
budget, elapsed, wall, cost, cache, usage, spend, efficiency and similar terms.
Private reasoning is not in the evidence and was not inspected.

| Display run | Unprompted counter commentary | Decision justified by consumption | Stop citing effort or cost |
| --- | --- | --- | --- |
| `1e290746` factual | none observed | none observed | none observed |
| `413291eb` code | none observed | none observed | none observed |
| `933f137e` missing-info | none observed | none observed | none observed |
| `325cd079` conceptual | none observed | none observed | none observed |

The only term matches are task-domain uses in the conceptual answers (the webhook's
5-second budget, the queue's operational costs), and they occur in both arms.

`933f137e` is the one display run that failed, by not asking the necessary question.
Its text gives no consumption reason: it says it will "require an explicit retention
period rather than silently picking 30 or 90," builds a refusing purge, and reports
done. The text does not show whether the display contributed. No visible sign is not
proof of absence, and a single run cannot separate the display from run variance; the
collect run's first message took almost the same path before it asked.

## Hook behavior and coverage

Checked from the hook responses in the native event streams:

- **Guidance once.** Each display run received the fixed guidance exactly once, at
  `SessionStart:startup`. No collect run received any additional context.
- **Fresh refreshes.** Display runs received an observation at `UserPromptSubmit`
  and after every `PostToolUse`; `PreToolUse` and `Stop` returned `{}`. Observation
  times and every token category increased monotonically within each run. The first
  observation showed `incomplete acquisition` with tokens unknown, as designed.
- **No hook failures.** Every hook response exited 0 with outcome `success` and empty
  stderr, in both arms.
- **Accounting matches the host.** Each final collector report's input, output,
  cache-read and cache-create values equal the host's `result.usage` for that run.
  For the resumed `72a2ea15`, the report equals the start and resume results added
  per category, so deduplication held across a resume.
- **Coverage.** Every report is `partial` and none is truncated. Request latency,
  API query duration, active-interval union, user wait, both human-stop counts and
  permission notifications are unknown in every run; they stay unknown, not zero.
- **What the agent could see.** The last refresh follows the last tool call, so the
  agent never saw consumption from its final answer turn. Wall time shown includes
  waits.

## Consumption, outcomes first

Outcomes in three pairs are identical. In `missing-info`, the display run spent less
because it skipped the question and the resumed turn; under #185 that is not a gain.

| Task | Arm | Output tokens | Cache-read | Cache-create | Input | Wall (s, incl. waits) |
| --- | --- | --- | --- | --- | --- | --- |
| factual-readonly | collect | 879 | 26678 | 10317 | 8 | 16.9 |
| factual-readonly | display | 835 | 32450 | 6459 | 8 | 24.8 |
| code-correction | collect | 1317 | 40391 | 5837 | 10 | 31.6 |
| code-correction | display | 1764 | 41713 | 6576 | 10 | 34.5 |
| missing-info | collect | 10890 | 117650 | 21843 | 20 | 169.9 |
| missing-info | display | 4478 | 43774 | 9456 | 10 | 57.1 |
| conceptual | collect | 2994 | 21187 | 4203 | 6 | 51.4 |
| conceptual | display | 1907 | 21712 | 4430 | 6 | 35.3 |

No category moves in one direction across the pairs. The `missing-info` collect wall
time includes the scripted-reply gap (planned 10 s, actual about 39 s from yield to
resume launch) and a second launch, so its wall time is not comparable.

## Intervention and experiment overhead

- Display text injected per display run: 686 to 1103 characters (guidance plus
  refreshes); it enters context and grows with the number of tool calls.
- Collector work recorded in-process: 16 to 65 ms per run. This excludes process
  startup, which these runs did not measure. For scale only: the #184 disabled-hook
  benchmark (`docs/research/resource-measurements-overhead.json`, synthetic transcript,
  external wall time per fresh process) had a median of about 42 ms. That is not an
  isolated spawn cost and not a measurement of these live hooks, which fired between
  7 and 24 times per run.
- Experiment cost includes one failed authentication attempt (kept under
  `failed-attempts/`), fixture authoring and oracle validation, live hook probes, and
  outcome grading (about two minutes for eight runs). Implementation time before
  `2026-10-08T12:24:32Z` was not timed and is unknown.

## Recommendation assessment

The lead's provisional recommendation is to retain passive collection. I agree, and
would make the display decision explicit:

1. **Retain passive collection as opt-in.** Its token accounting matched the host
   exactly in all eight runs, including a resume, with no hook failures. It costs
   nothing for users who do not opt in.
2. **Stop the display intervention for now.** Across four task types it produced no
   observed benefit: no outcome improved, and there were no unnecessary questions in
   either arm to reduce. The one outcome difference is in the harmful direction #185
   names, a missed necessary clarification, under guidance that said "Ask when
   necessary." That single, unblinded observation is not evidence that display causes
   missed questions, but it gives no reason to continue.
3. **Do not run a further comparison unless a named uncertainty justifies it.** The
   uncertainty this data raises is whether display affects necessary clarification.
   Answering it would need many repetitions of clarification tasks, which is out of
   proportion to an intervention that showed no benefit elsewhere.
4. **Consider removing the display code.** Under the repository's preference for less
   code, the renderer and display mode are maintenance without a demonstrated use. If
   no follow-up is scheduled, removing them keeps passive collection unchanged.

   *Resolution (lead):* the display seam stays. #185 AC1 requires distinct disabled,
   collect and display behavior, and keeping it makes this record replayable. It has
   no default registration, so ordinary users do not run it.

## Limitations

- **`missing-info` is unblinded.** The lead's message #9ac9d1 identified the collect
  run's asking behavior before grading. That pair's grades rest on hidden tests and
  the frozen asking rule.
- **Parent-directory mtimes.** Agents' `ls -la` output shows the workspace parent's
  modification time, which orders runs within a pair. It was visible in the packets.
- **Guidance and counters are bundled.** The guidance appeared only in display runs,
  so any difference reflects both.
- **One run per cell, one grader.** Run-to-run variance is unmeasured. No causal claim
  is made about visibility, consumption, or clarification.
- **Scripted-delay deviation.** The collect clarification gap exceeded the planned
  10 seconds; it affects wall time only.
- **Partial coverage.** Human stops, human wait and request latency are unknown, so
  avoidable supervision cannot be measured beyond the transcript classification.
