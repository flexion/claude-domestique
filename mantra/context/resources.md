# Passive resource pilot

The pilot is opt-in and its hooks are **not registered by plugin installation**.
Before launching Claude Code or Codex, set:

```sh
export MANTRA_RESOURCES=collect
export MANTRA_RESOURCE_DIR=/absolute/path/to/local/scratch/resources
```

In a scratch workspace, add this fragment to Claude's `.claude/settings.local.json`
or supply a settings file with `--settings`. Replace the script path with an
absolute path to this checkout or the installed Mantra plugin. Merge the `hooks`
entries with any existing settings; do not overwrite unrelated settings.

```json
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "PreToolUse": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "PostToolUse": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "PostToolUseFailure": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "Notification": [{"matcher": "permission_prompt", "hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}],
    "SessionEnd": [{"hooks": [{"type": "command", "command": "node /absolute/path/to/mantra/hooks/resources.js --host claude", "timeout": 3}]}]
  }
}
```

For Codex, put the fragment in a scratch workspace's `.codex/hooks.json`, replace
`--host claude` with `--host codex`, and remove `Notification` and
`PostToolUseFailure` (unsupported events). Enable/review hooks for that workspace.
Quote script paths containing spaces inside the JSON command string.

Unset `MANTRA_RESOURCES` or set it to `disabled` to stop all collection writes.
Unrecognized values do not collect. Remove these
settings entries to remove the launch cost too. No resource hook runs for ordinary
plugin users. Existing behavior rules remain independent.

## Consumer API

`hooks/resources.js` exports `collect(input, env)` and
`readSnapshot(host, runId, env)`. The first returns the current report after
recording the hook, or null when disabled/unsupported; it never produces host
feedback. Programmatic callers set `MANTRA_RESOURCE_HOST` to `claude` or `codex`.
The settings commands supply `--host` themselves. `readSnapshot` checks both host and
run identity and returns null for missing/invalid files. It is a saved observation,
not a new measurement; consumers must inspect its observation time. A display
experiment can wrap `collect` and explicitly decide whether to expose its return
value. In `collect` mode the command always writes `{}` to stdout.

## Experimental Claude display

With the same explicit Claude hook settings, set `MANTRA_RESOURCES=display` to
collect and show observations. This mode is experimental and Claude-only; Codex
display mode does neither collection nor feedback. `collect(input, env)` itself
remains passive and accepts only `collect`; the CLI's `processInput(input, env)`
maps display to passive collection before deciding whether to emit context.

An initial SessionStart injects fixed guidance; resumed SessionStart does not
repeat it. UserPromptSubmit, PostToolUse and PostToolUseFailure display the current
`collect` return, rather than an older disk snapshot. Display shows the separate
Claude token categories, per-field coverage, observation time and elapsed wall
including waits. Other metrics remain in the report with their full semantics.
The report's `truncated` flag appears as "incomplete acquisition" because it also
covers a missing early transcript or malformed input, not only size truncation.
No prompt or tool-completion event means no refreshed observation.

Consumption does not change requirements or permissions. Ask when necessary and
spend what the task requires. Avoid routine commentary about counters. Display
contains no success score, countdown, question quota or automatic stop. Unknown
values remain unknown. The guidance and added observation text have their own
input cost; collection alone establishes no behavioral benefit.

Snapshots and journals live in the configured local scratch directory. Their stem
is SHA256 of `JSON.stringify([host, session_id])`; extensions are `.json` and
`.jsonl`. Keep this directory outside git. Resume/compaction retain hook session scope;
elapsed wall time includes gaps since the first observed SessionStart. A new host
session id starts a new report. Transcript rows bearing another snake_case
`session_id`, including records from before some resumes, are excluded from usage;
the observed elapsed window and usage window can therefore differ. Root/session
coverage does not include all nested
agents or tools. No cross-session or cross-host sums are made.

Reports use `schema_version: 1`, `host`, `run_id`, `observed_at` (UTC ISO timestamp),
`coverage`, `truncated`, `tokens`, and `metrics`. Each metric has `value`, `unit`,
`coverage`, and `semantics`. Unknown is `value: null, coverage: "unknown"`; zero
requires an actual zero sample. Known values have `coverage: "partial"` because
none of these streams promises full run coverage. The semantics name what was
observed and what the value can establish. No combined token total is emitted.

## Supported observations and limits

Claude and Codex lifecycle/tool hooks capture local receipt timestamps.
Claude additionally supplies optional `duration_ms` on tool completion/failure
and permission-prompt notifications. These notifications are counted as
notifications, **not distinct human-stop episodes**. PermissionRequest is excluded:
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

The Codex protocol defines timestamped `exec_command_begin/end` events, but the
[independent verification](../../docs/reviews/resource-measurements-verification.md)
found none in sampled codex-cli 0.161.0 rollouts. They are not an input
supported by this pilot. Active execution interval union therefore stays unknown.
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
totals. A full journal stops new capture and marks `truncated: true`. Missing files,
malformed lines and concurrent partial reads also mark acquisition as truncated;
that flag does not mean successful full coverage. Concurrent appends at the size
boundary can exceed the journal limit by their small in-flight records; subsequent
invocations stop appending. Files are not rotated or uploaded. Delete scratch
data between experiments as needed.

The collector uses small append-only journal writes on a local filesystem,
without persistent locks; snapshots use temporary files plus rename. Parallel
hooks can finish out of order, so a saved snapshot is last-writer-wins and can lag
another observation. A live display should use its own `collect` return. NFS and
other filesystems without reliable append semantics are outside pilot coverage.

`collector_work_ms` sums earlier successful hook work samples, including journal,
projection and snapshot work. The current sample appears in the next snapshot;
its final sample write and process startup are excluded. External wall benchmarks
must include those costs. Collection inspects no private reasoning, retains no
message content, arguments, results or source paths, and emits no feedback.
