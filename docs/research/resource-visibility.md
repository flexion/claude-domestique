# Resource visibility comparison

Issue: [#185](https://github.com/flexion/claude-domestique/issues/185). Dependency:
[#184](https://github.com/flexion/claude-domestique/issues/184).

## Question and decision

Does displaying trustworthy observations improve delivered work or reduce
avoidable supervision, without causing defects, missed clarification, or fixation?
The provisional recommendation is to **retain passive collection as opt-in and
end this display evaluation**. No follow-up comparison or rollout is scheduled.
The factual, correction and conceptual pairs passed in both conditions. The
clarification collect run asked and passed; the display run reported completion
without asking and failed. No counter fixation was observed. These are anecdotes,
not evidence that visibility caused the difference. Consumption is a separate
observation, not a usefulness score; the failed run's lower consumption is not a
benefit.

The small explicit display seam remains as experimental, replayable source:
the issue requires distinct disabled/collect/display behavior, and the recorded
intervention must be reproducible. It has no default hook registration. Keeping
that seam does not recommend its use in ordinary work. Negative and inconclusive
results are valid completion.

## Design

Use four task types with two fresh runs each. The eight-run starting comparison
comes from the issue, and the evaluator uses it to bound expenditure, not to claim
statistical significance. Run factual and clarification pairs in collect/display
order, and correction and conceptual pairs in display/collect order. Do not repeat
or replace an unfavorable completed run. Infrastructure failures are recorded as
failed attempts and a replacement is labelled explicitly.

Use the fixtures in `docs/evals/resource-visibility/`. Each run receives only its
`prompt.md` and a fresh copy of `fixture/`; graders and scripted responses stay with
the evaluator. Copy the same starting files for each member of a pair. Keep agent
workspaces outside this repository, with no session file or issue/experiment notes.
Disable unrelated installed plugins, memories, and MCP servers where the host
supports this. Record residual inherited context rather than claiming isolation
that the launch configuration does not establish.

Pin host and version, resolved model, effort, permission mode, tools, source
revision plus uncommitted experiment diff, collector revision, display text, and
fixture-tree and prompt hashes in the run record. Use the same settings for both arms. Fresh
sessions remove conversational carryover; they do not guarantee a cold provider
prompt cache. Preserve input/output/cache-read/cache-write categories and condition
order. Do not add a token total or infer billing equivalence.

The intervention shows separate Claude token categories and elapsed wall time
(including waits) from the same report collected in the passive arm. Other
collector metrics stay in the evaluator's report: their interval and notification
semantics need caveats, and displaying them repeatedly would add unnecessary
context. Coverage and observation time accompany each refreshed display.
Guidance appears at SessionStart: consumption does not change requirements or
permissions; ask when needed; spend what the task requires; avoid routine counter
commentary. Disabled performs neither collection nor display; collect records
without showing observations; display collects and shows the same observations.
Display refreshes at UserPromptSubmit and after tool use, without repeating the
fixed guidance. It has no success score, countdown, question quota, or automatic stop. The
passive arm retains ordinary task instructions and permissions. Preserve exact
injected display text separately; it has an input cost and may confound any
behavioral effect. Do not estimate that cost as an exact token count unless the
host supplies it.

## Preconditions and execution

Before running either comparison arm, kit must deliver the collector's supported
event contract, focused fixture results, overhead evidence, and independent
verification. Cite those artifacts and their revision here. Validate the display
against the delivered report rather than reconstructing accounting in the runner.
Unknown measurements remain unknown. A partially supported host may be used only
with the missing coverage disclosed, including stop classification and live
snapshot freshness. Offline post-run reports alone cannot establish that the agent
saw current-run consumption while working.
Display must refresh during the run, for example after tool use, with observation
times retained outside the grading packet. If that cannot be established, do not
claim that the single-turn tasks test current-run visibility; only the resumed
clarification task may expose prior consumption.

For each run, preserve the launch command and sanitized environment, starting
fixture hash, native event transcript, display snapshots and observation times,
final response, resulting files/diff, collector report, and wall-clock setup and
grading intervals. Never copy credentials into an evidence artifact. For the
clarification case, deliver the same scripted answer after the agent asks the
consequential question; preserve the actual question, answer and timestamps. If
the host cannot accept an interactive response, use its supported continuation
mechanism and record the extra launch cost. Do not reveal the answer in advance.
Use a fixed scripted delay before the clarification response in both conditions
and retain the actual delay plus continuation overhead. Elapsed display includes
this wait. Scripted clarification is a substitute for a user response, not measured
human attention or a confirmed human-stop event.

Rex prepares an outcome packet with neutral run labels and no condition mapping,
consumption, or counter text. Ada checks the oracle, response and diff before
opening resource reports. Record accidental unblinding. Separately inspect the
unredacted transcript for fixation; grading that observable behavior cannot be
blind to the display condition. Freeze the outcome findings before linking the
condition map and consumption reports.
Use random labels rather than ordinal labels and omit transcript timestamps,
launch times and source file mtimes from the packet, because ada knows the planned
condition order. Keep the chronological raw evidence outside that packet.

## Run record

For every run, record these independent observations with artifact paths:

- Correctness: oracle result and supporting output/test evidence.
- Missed requirements: each omitted or violated requested property.
- Subsequent rework: evaluator changes or follow-up requests needed to meet the
  oracle; use unknown when no follow-up observation exists.
- Human interactions: necessary clarification, avoidable clarification, actual
  permission stops, and other intervention; keep collector coverage separate
  from manual transcript classification. Automatically approved tools are not
  human stops. A requested script response is necessary, not avoidable overhead.
- Resource consumption: copy the validated collector report with units,
  observation time, run identity and per-metric coverage. Preserve overlapping
  interval semantics; model-request latency is not thinking time.
- Observable fixation: quote unprompted counter commentary, a decision justified
  by consumption, or stopping with an unmet requirement while citing consumption.
  Stopping without a consumption reference is a correctness finding. Do not infer motives or
  inspect private reasoning. No visible sign means no observed sign, not proof
  of its absence.
- Cost of the experiment: implementation and verification intervals, setup and
  grading intervals, collector overhead, display text size, failed attempts, and
  limitations of any host-reported costs. Keep overlapping costs separate.

## Interpretation

Compare outcomes before resources. Lower consumption paired with a defect or
avoided necessary question is not success. Spending more to satisfy an oracle is
allowed. Distinguish a successful answer from an unobserved rework outcome. No
output-per-token score, aggregate success score, or causal estimate is justified
by this small sample. Fixture difficulty, order/cache effects, injected-text cost,
partial event coverage, evaluator judgment, and run variance limit conclusions.
The display arm receives both fixed guidance and observations; this comparison
cannot attribute a difference to the counters alone, nor generalize to displaying
all of the collector's metrics.

## Current evidence

The verified #184 collector snapshot was imported from an archive with SHA256
`f157f0051f14dbf621dc12eeff1224cb2d68a2a2b88700613f08dec0e34d9f54`.
The [independent verification](../reviews/resource-measurements-verification.md)
establishes live Claude token accounting and passive behavior. Collector AC2/AC4
remain partial; human-stop episodes, human wait and request latency are unknown.
Codex hooks have fixture coverage only. Trailing single-turn handoff gaps measure
teardown, not human waiting. Display extends CLI dispatch only; collector
projection/accounting stays unchanged.

The [run record](resource-visibility-runs/README.md) contains all eight completed
runs, exact settings and launch arguments, fixture/prompt/source hashes, final
workspaces, native text/tool/hook events and collector reports. Claude Code
2.1.294 ran `claude-opus-5` at medium effort with Bash, Read, Write, Edit, Glob and
Grep, bypassPermissions, empty setting sources, strict MCP configuration and
custom slash commands disabled. Every successful run used the same elevated
execution context outside the Codex sandbox. Fresh workspaces held only their
starting fixture. Builtin Claude plugins and managed policy remained; the verifier
found no user `CLAUDE.md`. This is comparable context, not complete isolation.

The first sandbox launch failed authentication before any model usage and is
preserved as an infrastructure attempt. Its replacement used a fresh session id;
no completed model outcome was replaced. For clarification, the collect run's
blocking question triggered the frozen answer via `--resume`. The display run
reported completion without a question and received no unsolicited answer.

Ada froze the [outcome review](../reviews/resource-visibility-outcomes.md) before
resource disclosure, then wrote a separate
[fixation and accounting review](../reviews/resource-visibility-fixation.md).
Outcome grading withheld counters and conditions, but was imperfectly blind:
rex accidentally disclosed the collect clarification's asking behavior in a
coordination message, identifying that pair. Tool-output `ls -la` parent mtimes
also survived the packet projection and could reveal order; ada did not
deliberately compare them. Neither limitation was repaired by rerunning or
regrading unfavorable outcomes.

| Task | Collect outcome | Display outcome | Interaction finding |
| --- | --- | --- | --- |
| Factual | pass | pass | no clarification required; no writes |
| Code correction | pass | pass | independent checks pass; changes in scope |
| Missing information | pass | fail | collect asked; display did not ask |
| Conceptual | pass | pass | required points present; no prohibited error |

There were no unnecessary clarification requests in either arm. Native result
records show no permission denials under bypassPermissions; they do not establish
human-stop counts. Those collector metrics remain unknown. Subsequent rework is
unobserved, including for passing runs: the outcome review's "none" means no
repair needed to meet its oracle, not an observed absence of later rework. The
failed purge needs a confirmed period and a correct legal-hold rule; the evaluator
did not repair it. Its refusal to delete with a null period does not satisfy the
explicit requirement to ask.

The [separate resource categories](resource-visibility-runs/observations.json)
remain in their native units and coverage. The independent reviewer matched
every final token category to the host's usage, including both clarification
launches. Factual display had slightly fewer output tokens, correction display
had more, and conceptual display had fewer. Cache categories also varied. With
one run per cell and uncontrolled provider cache state, these observations do
not establish an efficiency effect. Clarification display used fewer resources
while missing a necessary question and failing the oracle; that is not success.

Every display run received startup guidance once and fresh observations after
tool use; collect injected nothing. Initial unknown usage remained explicit.
The [actual injected text](resource-visibility-runs/display-text.json) preserves
observation times and hook outcomes. The last refresh precedes the final answer,
so the agent never saw that answer's consumption while producing it. No visible
decision or premature stop cited consumption. A missed requirement without a
consumption reference remains a correctness finding, not fixation.

Preparation checks: Mantra Jest passed; repository metadata validation passed;
fresh Claude and Codex `assess` invocation probes fired on the same retry-policy
proposal. These establish existing skill invocation, not a visibility effect.
Ada independently checked fixture paths and demonstrated that the correction
oracle catches the seeded defect and a partial correction, and that the deletion
oracle catches guessed periods and missing legal-hold protection.

The [hooks reference](https://code.claude.com/docs/en/hooks) supports additional
context after tool execution. The [streaming guide](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)
and [user-input guide](https://code.claude.com/docs/en/agent-sdk/user-input) distinguish
interactive continuation from a one-shot prompt. Cross-check these host contracts
against actual launch evidence; they do not establish collector coverage by themselves.

The initial implementation/design interval was not timed; report it as unknown,
not zero. Setup and validation timing begins at `2026-10-08T12:24:32Z` for this
preparation session; the evaluator uses these intervals to report experiment
overhead. Dependency waiting and active work are not interchangeable. A failed
initial test attempt had no installed Jest; `npm ci` then installed dependencies
and rebuilt shared bundles without changing tracked bundle content.

## Cost and limits of the decision

The evaluator uses the following costs to judge whether another comparison would
be proportionate; they are not an output-per-token score:

- Recorded preparation from `12:24:32Z` to source freeze at `12:55:45.148Z`
  includes implementation, validation, dependency waiting and authentication
  troubleshooting. Earlier implementation/fixture-authoring time is unknown;
  this interval is not active engineering time.
- Successful launches span `12:56:06.768Z` to `13:09:02.285Z`, with gaps for
  orchestration and inspection. Per-launch intervals remain in the run record.
  Outcome grading ran `13:09:31Z` to `13:11:28Z`; final validation and synthesis
  intervals are in [overhead.json](resource-visibility-runs/overhead.json).
- The planned clarification response delay was 10 seconds, but its actual
  yield-to-resume-launch gap was 38934 ms, including inspection and an operator
  status interruption. Only collect asked, so there was no corresponding display
  wait to equalize. Elapsed wall is not a useful efficiency comparison for that
  pair. Scripted waiting is not measured human attention.
- Fixed guidance was 234 characters once per display run; successful mid-run
  observations were 137–140 characters, and initial incomplete observations were
  176. Total injected text per display run ranged from 686 to 1103 characters.
  These ASCII character and byte counts are exact; added token cost is unknown
  because the host does not attribute tokenization to individual hook blocks.
- In-process collector work was approximately 16–65 ms per run, excluding startup
  and final sample writes. The [#184 external benchmark](resource-measurements-overhead.json)
  measured disabled-hook process median 42.10 ms and collect median 46.57 ms on a
  synthetic transcript. It is not a measurement of each live hook's overhead or
  of isolated Node startup, and is not multiplied into a claimed run total.

Coverage remains partial: human attention, stop episodes, request latency and
other unsupported fields are unknown. The display combined guidance with
counters, the model/host sample is narrow, and there was one grader and one run per
condition/task. The clarification pair was unblinded and the other packets had a
residual chronology channel. These limits rule out causal or statistical claims.
No useful outcome improved in this comparison; consumption differences do not
justify another experiment without a named uncertainty and likely value. The
reviewer's suggestion to remove display machinery was weighed against the
explicit mode and reproducibility criteria; keeping the minimal opt-in seam
serves those criteria without extending this experiment.

## Acceptance evidence

| Issue criterion | Evidence |
| --- | --- |
| Validated collector and distinct modes | verified #184 archive; real-collector hook tests; passive/live accounting review |
| Observations without behavioral quotas | renderer and guidance; exact live hook outputs; no automatic stop or score |
| Independent outcome/resource/fixation records | frozen outcome review, separate fixation review and coverage-labelled reports; necessary-ask failure retained |
| Implementation/evaluation costs | intervals, failed attempt, actual injected text and collector overhead, with unknowns explicit |
| Reproducible record and provisional decision | pinned manifest/settings/launches/fixtures; retain passive and end display evaluation |
| Negative/inconclusive completion | no causal claim; cheaper failed clarification is explicitly not success |

Final validation passed the full repository suite, metadata checks, pinned Claude
marketplace/Mantra validation, isolated Codex 0.147.0 installation of Mantra 0.8.0,
and fresh `assess` invocation probes on both hosts. Tests establish mode semantics;
skill probes establish invocation, not a resource-visibility benefit.
