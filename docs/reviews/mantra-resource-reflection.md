# Mantra resource reflection

2026-10-09. Sly implemented; Gus independently reviewed and probed Claude.

The change is a concise reminder, with **no demonstrated judgment improvement**.
The original implementation used existing delivery and left resource collection/injection opt-in. The
operator subsequently requested an anticipatory notice on startup: `startup`
and `clear` receive the notice without an immediate reflection request;
`resume`, `compact`, missing/unknown sources and user prompts receive the
self-contained reflection. Neither text claims persistent priming.

## Original delivery choice

Current official [Claude hooks](https://code.claude.com/docs/en/hooks) and
[Codex hooks](https://learn.chatgpt.com/docs/hooks), inspected 2026-10-09,
establish the following comparison:

| Event | Suitability |
| --- | --- |
| UserPromptSubmit | Existing model-context channel; refreshes when the user submits a prompt. |
| SessionStart, source compact | Existing context channel after compaction. Codex explicitly delivers it to the immediate continuation, including mid-turn automatic compaction. |
| PreCompact / PostCompact | Direct compaction events do not establish a common context-injection contract; use SessionStart instead. |
| Stop | Blocking can force another model request, even when finished. Adds evaluation cost and continuation pressure; a command cannot determine product correctness. |
| Tool completion | Can supply context during work but would repeat per tool or need scheduling state. No new registration is warranted by the current evidence. |

No hook registration changed. Automatic compaction responds to context size,
not stalled progress. Long autonomous turns receive no fresh reminder until
compaction. The default hook supplies no wall-time or token measurements, reads
no reports, and starts no collector. Visible measurements must retain coverage
limits; consumption is neither success nor a stopping budget.

## Behavioral checks

[Extracted evidence](mantra-resource-reflection-evidence.json) preserves the
synthetic prompts, hook receipts, actions, diffs, final answers and host usage.
Claude 2.1.295 ran isolated local settings with source plugin copies, one run per
condition. Baseline and new arms used the same fixtures/model/effort. Outcomes
were inspected before resource figures. These runs tested the initial reflection
paragraph; the later explicit trigger and startup notice were separately checked
for delivery, not evaluated in another behavior comparison.

Final-text Claude routing smoke S1–S4 verified startup, resume, manual compact and
clear: notice only on startup/clear, reflection on prompts/resume/compact, and
core behavior on every receipt. Gus's independent final review found no blockers.

| Case | Outcome in baseline and reflection arms |
| --- | --- |
| Finish: off-by-one sum | Opus/medium fixed the bug, passed the test and finished; four turns each, no additional scope. |
| Continue: test plus release check despite claimed high prior consumption | Opus/medium and Haiku/low satisfied both checks; no stopping at the first green test or counter commentary. Haiku broadened punctuation behavior in both arms. |
| Reorient: failed rounding attempts, locale cause | Both models/efforts identified locale on the first pass and passed the test with shared config unchanged. Locale workarounds leave a product tradeoff. New Opus also edited NOTES.md without request. |
| Clarify: unresolved retention/hold rules | Both Opus arms implemented parameterized, guarded purges and ended with conditional offers, without obtaining the missing decisions. The requested production behavior remained unresolved; reflection did not improve this case. |

The initial paragraph reached every new-arm Claude SessionStart/UserPromptSubmit
receipt and no baseline receipt. A resumed `/compact` produced resume and compact
SessionStart receipts carrying it and a compact boundary. This establishes hook
output, not beneficial reasoning after compaction.

In the matched finish pair, the new arm reported 211 more cache-creation tokens,
consistent with two injections, and cost rose from $0.2546 to $0.2572. Other pairs
had differing turn counts and permission denials; they do not isolate overhead.
The paragraph adds recurring model input cost but no process invocation or file
I/O beyond the existing hook. Reflection itself also consumes model effort.

Codex 0.161.0, gpt-6.1-sol/medium, in an isolated home with the source plugin
installed and its vetted hooks enabled, reproduced the final reflection sentence
verbatim and selected finish, required-check continuation and locale reorientation
in a read-only smoke. Those choices were explanations, not executed repairs.
The first harness run had overwritten plugin-enable configuration and reported
ABSENT; restoring marketplace/plugin enablement fixed delivery. The official
trust bypass was confined to the vetted temporary probe.

The small Claude sample shows no observed premature stopping on finish/continue
cases, but no demonstrated improvement. It does not establish harmlessness,
resource savings, a minimum model capability or effort, or success on harder
fixtures. Haiku/low passing these particular checks cannot establish a minimum;
its extra scope is a reason to inspect outcomes beyond test-green. Conversational
ritual reflection and long autonomous turns remain untested. Retain the bounded
reminder without extending the experiment.

## Repository validation

The initial rebased change was 0.10.1 after rebasing onto the resource-injection feature on main.
The original implementation and probes used 0.9.1. Startup/clear routing tests first failed as expected, then all
70 Mantra tests passed. The final full suite passed 614 tests in 23 suites
(outside the sandbox, which blocked Vernaculus's test server). Repository metadata validation, Claude
2.1.226 strict marketplace/Mantra validation, and isolated Codex 0.147.0 marketplace
installation were run. Final results and remaining limitations are recorded in
the branch session. No shared source changed and no commit/push/PR was made.

After rebasing onto `origin/main` at `0d39212`, version conflicts were resolved
to 0.10.1 and upstream resource injection was retained. The rebased full suite
passed 630 tests in 24 suites (83 Mantra tests); metadata, strict Claude manifests
and isolated Codex 0.147.0 installation passed again. Reflection code had no
merge conflict; prior behavioral probes remain the evidence for that code.

## Always-on follow-up

The operator subsequently approved about five minutes between reflections at
tool completion and requested automatic resource injection without configuration
environment variables. This supersedes the original delivery-only design and the
visibility pilot recommendation; it is an operator decision, with no new evidence
of better judgment. Resources now register automatically on both hosts, and
PostToolUse adds reflection once per elapsed interval. Prompts/session starts
reset the cadence; Stop remains passive. An atomic claim handles parallel
completions, subagent receipts are skipped, and startup removes local collector
files untouched for 30 days. The interval is provisional, not a task deadline or
established optimum. Measurement coverage, transcript lag, unknowns and the
2 MiB acquisition limits remain; long transcripts can make token counts unknown.

The earlier paired outcomes and overhead estimates apply only to the original
paragraph, not to the new cadence or always-on collection. New hooks add process
and filesystem overhead and resource text on tool completions. Behavioral benefit
in long sessions and effects on conversational replies remain unverified.

Follow-up validation: all 647 tests in 25 suites passed, including 86 Mantra tests
and execution of both host hook configurations. Metadata and strict Claude
marketplace/Mantra validation passed. Installed codex-cli 0.161.0 installed 0.11.0,
ran pwd in a fresh isolated session and quoted the PostToolUse resource observation
verbatim, with native subset categories and unknown token values. No resource
environment variables were supplied. The initial network attempt failed inside
the sandbox; the authorized unrestricted rerun succeeded.

Gus independently approved 0.11.0 with no blockers. Claude 2.1.295/Haiku live smoke
used a disposable copy with only the interval shortened to 20 seconds; production
has no override. Prompt and tool observations were delivered, reflection appeared
once after 21.3 seconds and not again within the following 18 seconds, and parallel
tools caused no duplicate reflection. The model completed the requested sleep/echo
steps without counter commentary. This tests routing, not improved judgment.
Extracted receipts are archived in the evidence JSON under always_on_delivery.
Cache-reuse explanatory guidance was added afterward and verified by the focused
suite; the live smoke did not compare that wording.

Independent direct-spawn benchmarking (60 events) measured p50/p95 43.6/45.5 ms
with a small transcript, 48.3/54.0 ms with a real 1.15 MB transcript, and bare Node
startup p50 38.7 ms. Pre/post collection therefore adds about 95–110 ms per tool;
observations also recur in model history. See the current resource contract for
these costs and the long-transcript token-visibility limit.

## Trey reliability review

Trey independently reproduced a stale-lock race: two recoverers could unlink a
new owner's lock, causing two reflections and a third hook throwing ENOENT.
The first parallel test recovered the lock before concurrency, missing this case.
The repair replaces reclaimable locks with immutable claim receipts published
through exclusive hard links; readers follow existing claims if a checkpoint
pointer update lags. No shared cadence lock is deleted or released. Cadence
storage failure preserves the resource observation. A deterministic three-process
regression failed on the original implementation and passes with the repair;
additional tests cover a missing pointer update and failed claim publication.
Legacy locks are ignored. Filesystem hard-link support is required for periodic
claims; a crash after publishing a claim can omit its reminder. It cannot cause
a second caller to claim the same interval. New claim and temporary filenames
participate in the existing 30-day cleanup.

The injected observation now labels the timestamp as acquisition time and token
counts as cumulative session observations that can lag completed turns, addressing
Trey's freshness recommendation. The inherited long-transcript cap remains an
explicit usefulness limit. Previous source hashes and live receipts document the
pre-repair snapshot, not the repaired cadence.

Trey rereview found the P2 resolved with no new blockers. His independent fault
injection disabled pointer renames across three intervals; the claim chain still
emitted once per boundary and respected a subsequent prompt reset. All 650 tests
in 25 suites (89 Mantra tests), repository metadata, strict Claude marketplace
and Mantra validation, installed Codex isolated installation and diff check
passed on the repaired source. The original live model probes were not rerun;
the changed cadence has deterministic process/fault-injection coverage.

Publication uses [Node fs.linkSync](https://nodejs.org/docs/latest-v24.x/api/fs.html#fslinksyncexistingpath-newpath), whose linked [link contract](https://man7.org/linux/man-pages/man2/link.2.html) refuses an existing destination; the complete temporary receipt and claim are in the same directory.
