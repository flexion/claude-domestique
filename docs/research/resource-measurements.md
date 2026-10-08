# Passive resource measurement contract

Issue #185's experiment reads these reports; collection alone establishes no
behavioral benefit. The collector belongs to Mantra and is disabled by default.

## Runtime inspection before calculations

Inspected 2026-10-08: [Claude hooks](https://code.claude.com/docs/en/hooks),
[Codex hooks](https://learn.chatgpt.com/docs/hooks),
[Claude SDK result definitions](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/types.py),
and [Codex protocol](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/protocol.rs).
These contracts describe available fields, not a guarantee that every host/version
delivers every event. The fixture tests pin the supported shapes.

| Source | Identity | Time semantics | Coverage |
| --- | --- | --- | --- |
| Both hosts' hooks | session_id; tool_use_id on tool events; Codex turn_id | Local receipt time, not runtime execution start | Partial root-session lifecycle and supported tools |
| Claude PostToolUse / PostToolUseFailure | tool_use_id | Optional duration_ms excludes permission prompts and PreToolUse hooks | Actual execution duration when provided |
| Codex PreToolUse / PostToolUse | tool_use_id | No execution duration field | Receipt-to-receipt bracket only; includes approval/hooks |
| Claude assistant stream/transcript | message.id and session_id | Usage snapshots, not increments; content-block rows may repeat usage | Observed model messages only; final snapshot required |
| Claude SDK result | uuid and session_id | duration_api_ms is API duration for a query, not a per-request interval | Separate API-duration evidence, never thinking time |
| Codex rollout token_count | session/run scope | total_token_usage cumulative snapshot; last_token_usage is not a unique request | Observed cumulative categories, never sum snapshots |
| Codex protocol exec_command_begin/end | call_id | Protocol execution timestamps | Not present in sampled rollouts; not a supported collector input |
| PermissionRequest on both hosts | No dependable tool-call identity | Before approval decision; another hook can auto-approve | Cannot establish a human stop |
| Claude Notification | No dependable episode id | permission_prompt / elicitation_dialog delayed about six seconds | Partial evidence that a dialog is waiting, misses fast replies |

Claude Notification can also fire for Agent SDK permission callbacks that may be
automated. Therefore a generic collector must not relabel all notifications as
human attention. Tool calls and question marks likewise do not establish human
clarification stops. Unsupported human-stop counts remain unknown; integrations
must provide confirmed UI episode identities before those counts can be asserted.

## Calculation boundaries

The report's elapsed wall time is the observed run window. Tool execution durations
are distinct from hook brackets. The union of tool brackets measures observable
occupied intervals, with partial coverage and its own semantics; it is not agent
thinking time. Handoff wait is Stop-to-next-UserPromptSubmit wall time, which may
include automated turns and overlapping work. It is reported separately from human
wait, never added to active intervals or used as a human attention estimate.

The [pilot's host setup and consumer API](../../mantra/context/resources.md)
define bounded live hook collection. A separate offline importer was omitted:
the #185 consumer needs a fresh report at PostToolUse during a single-turn run.
The [external overhead sample](resource-measurements-overhead.json) is consumed
by that experiment; its alternating fresh-process benchmark includes Node startup
and file I/O. It is a local sample, not a performance guarantee.

Known values carry partial coverage because the host does not guarantee a complete
run event stream; unknown values have no supported sample. AC2 is partial for
per-request model latency and human-wait boundaries. AC4 is partial: observed
permission notifications are collected but distinct human permission and
clarification episodes cannot be established from the supported documented events.
Do not check those criteria as fully satisfied. Adding an undocumented tool-decision
adapter would still not prove distinct dialog episodes for parallel rejections.

Usage categories retain host semantics: Claude input excludes cache categories;
Codex cached input is a subset of input. No combined token total, price estimate,
success score, countdown, stopping rule, question quota or private-reasoning
inspection is implemented.
