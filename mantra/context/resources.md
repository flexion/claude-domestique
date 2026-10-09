# Resource observations and reflection

Mantra automatically collects and injects resource observations on Claude Code
and Codex. Installation registers the hooks; no resource environment variables or
separate settings file are required. Codex still requires the host's hook trust
review. Disable the plugin or its hooks through the host to stop this behavior.

This is an operator decision, superseding the earlier opt-in visibility pilot's
recommendation. The [earlier evaluation](../../docs/research/resource-visibility.md)
and [reflection checks](../../docs/reviews/mantra-resource-reflection.md) establish
neither better judgment nor an optimal reminder interval.

## Delivery and cadence

SessionStart adds measurement guidance; UserPromptSubmit and PostToolUse add the
fresh observation. Claude also injects after PostToolUseFailure. PreToolUse, Stop
and SessionEnd collect without context or decisions. Stop never forces another
model request. The [Claude](https://code.claude.com/docs/en/hooks) and
[Codex](https://learn.chatgpt.com/docs/hooks) contracts support additionalContext
on the delivery events.

Tool completion also adds the self-contained reflection when five minutes have
elapsed since the latest prompt, session start or tool reflection. An atomically published
claim chooses one concurrent completion. The first receipt seeds a missing
clock; a backward wall-clock change resets it. No background timer runs, and an
idle gap never queues multiple reminders. Prompts reset the clock, so time
waiting for a new user turn does not trigger its first tool reminder. A long tool
or approval wait can delay delivery: this measures elapsed time, not active model
computation. Five minutes is a provisional reminder interval, not a task deadline,
stopping quota or established optimum.

Root-conversation resource hooks skip inputs carrying agent_id, keeping subagent
measurements and cadence from consuming the parent's checkpoint. This does not
establish complete nested-agent coverage. Prompt/compact reflection remains in
behavior.js as the single source of reflection text.

## Storage and consumer API

Hooks use the host-provided plugin data directory (CLAUDE_PLUGIN_DATA on Claude,
PLUGIN_DATA on Codex), under resources/. If the host provides none, storage falls
back to ~/.cache/claude-domestique/mantra/resources. These host variables require
no user configuration. Per-session files are keyed by SHA256 of
JSON.stringify([host, session_id]): .jsonl journal, .json snapshot and .checkpoint
cadence pointer. Immutable .checkpoint.<previous-time>.claim receipts are
fully written to unique temporary files, then published through exclusive hard
links. Readers follow the published chain if a pointer update lags or is lost.
No shared lock is reclaimed or released; legacy .checkpoint.lock files are
ignored. On a filesystem without hard-link support, observations continue but
the periodic reflection claim is skipped. A crash after publication can omit
that reflection; it cannot cause another caller to repeat the same claim. Files untouched for 30 days are removed
on session start; unrelated filenames are preserved. New session identities get
separate reports. Resume and compaction retain session scope, so reported elapsed
wall time includes gaps since the first observed SessionStart.

hooks/resources.js exports collect(input, { host, directory }),
readSnapshot(host, runId, { directory }) and processInput(input, { host, directory }).
Directory is an internal caller/test option, not an environment mode. collect
returns the current report without host output; processInput emits supported
additionalContext. Missing identity or unsupported hosts yield no report. The CLI
supplies --host, catches failures, returns valid JSON and exits successfully.
readSnapshot validates host/session identity. Saved snapshots can lag concurrent
writes; injection uses its own fresh collect return.

Injected text preserves native token categories, coverage, acquisition timestamp (not the time of token use)
and elapsed wall including waits. Unknown stays unknown. Claude cache reads count
repeated reuse, not distinct new input or progress; Codex cache/reasoning categories
are subsets. No combined spend, billing or success score is computed. Consumption
changes neither requirements nor permissions. Reflection considers actual results,
consequential missing facts, the next useful action and its own overhead.

Reports use `schema_version: 1`, `host`, `run_id`, `observed_at` (UTC ISO timestamp),
`coverage`, `truncated`, `tokens`, and `metrics`. Each metric has `value`, `unit`,
`coverage`, and `semantics`. Unknown is `value: null, coverage: "unknown"`; zero
requires an actual zero sample. Known values have `coverage: "partial"` because
none of these streams promises full run coverage. The semantics name what was
observed and what the value can establish. No combined token total is emitted.

## Supported observations and limits

Claude and Codex lifecycle/tool hooks capture local receipt timestamps.
Claude additionally supplies optional `duration_ms` on tool completion/failure. The projection can count permission-prompt notifications, **not distinct human-stop episodes**, but the plugin does not register Notification. PermissionRequest is excluded:
it can be automatically approved by another hook. Notifications themselves can
repeat, miss fast answers, or target automated SDK callbacks. Actual human
permission and clarification counts therefore remain separately unknown, as does
human-wait duration. Question marks, AskUserQuestion calls, and auto-approved
operations are never counted as human stops.

Only measurement fields are projected from the hook-provided transcript path.
Claude assistant usage rows upsert by `message.id` within the session; repeated
rows are snapshots, never additions. Later snapshots replace earlier category
values, so streaming placeholders do not suppress later final usage. Codex
`event_msg/token_count.info.total_token_usage` is a cumulative session snapshot;
only the last observed snapshot is used. Categories preserve host semantics:
Codex cached/reasoning values are subsets; Claude cache categories are separate.
Transcripts are not stable public interfaces, so format changes can make usage
unknown. Do not treat these observations as billing or context-window accounting.

Observed token counts lag on both hosts. Claude counts can take a turn or two to
catch up. In a three-turn Codex 0.161.0 probe, the first turn’s injected counts
were unknown; turns two and three showed the preceding completed turn’s totals,
matching the saved snapshots. Post-tool observations refreshed their timestamps
and wall time but retained those totals: the next rollout usage row appeared
after the hook. Injection reports usage already written to the transcript, not
tokens still in flight; this timing is an observation, not a host guarantee.

The Codex protocol defines timestamped `exec_command_begin/end` events, but the
[independent verification](../../docs/reviews/resource-measurements-verification.md)
found none in sampled codex-cli 0.161.0 rollouts. They are not an input
supported by this collector. Active execution interval union therefore stays unknown.
Hook brackets establish only receipt-to-receipt occupancy and include
approval/hook overhead. Their union is separate from actual execution. Summed
execution durations may overlap and are never a wall-time total.

Model request latency has no supported start/end source in these hooks and stays
unknown. `lib/resources.js` can also project Claude SDK `result` records containing
identified query-level `duration_api_ms` from stream-json; ordinary transcripts
usually lack them. That separate API-query measurement is neither per-request
latency nor thinking time. Stop-to-next-prompt gaps measure handoff wall time,
including automation and possible background work, not human attention.

Each invocation reads at most 2 MiB of journal and 2 MiB of transcript and accepts
at most 1 MiB of hook input. A transcript larger than that limit is skipped
entirely: all its token/API measurements become unknown, rather than stale prefix
totals. This can remove token visibility during the longest autonomous sessions;
reflection still uses actual progress and available wall observations. A full journal stops new capture and marks `truncated: true`. Missing files,
malformed lines and concurrent partial reads also mark acquisition as truncated;
that flag does not mean successful full coverage. Concurrent appends at the size
boundary can exceed the journal limit by their small in-flight records; subsequent
invocations stop appending. Files are not uploaded. SessionStart removes collector files untouched for 30 days; retention is cleanup, not a task budget.

The collector uses small append-only journal writes on a local filesystem,
without persistent locks; snapshots use temporary files plus rename. Parallel
hooks can finish out of order, so a saved snapshot is last-writer-wins and can lag
another observation. Live context injection should use its own `collect` return. NFS and
other filesystems without reliable append semantics are outside pilot coverage.

`collector_work_ms` sums earlier successful hook work samples, including journal,
projection and snapshot work. The current sample appears in the next snapshot;
its final sample write and process startup are excluded. External wall benchmarks
must include those costs. Collection retains no message content, arguments, results or source paths; only projected measurement records are stored.

## Measured overhead

An independent 60-event direct-spawn benchmark including Node startup measured
p50/p95 of 43.6/45.5 ms with a small transcript and 48.3/54.0 ms with a real
1.15 MB Claude transcript; bare Node startup p50 was 38.7 ms. These are local
samples, not latency guarantees. PreToolUse and PostToolUse both collect, retaining
receipt-bracket accounting on both hosts, so typical pairs add about 95–110 ms per
tool call (roughly 20 seconds across 200 tools). Retention scanning adds work on
session start. Collector samples exclude process startup and the final write;
external timings include them.

Observations remain enabled on every prompt and supported tool completion,
independent of the reflection interval. A typical observation is about 230
characters; that is not an exact model token count. Repeated observations add to
history and later input/cache reads. The earlier reflection-only overhead figures
do not measure this always-on version. No resource savings or judgment improvement
has been demonstrated.
