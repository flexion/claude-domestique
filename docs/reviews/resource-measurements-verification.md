# Verification: passive resource collector (#184)

**Date:** 2026-10-08
**Verifier:** pip (Claude Opus 5.5), independent of the implementing lead (kit)
**Branch:** `issue/feature-184/resource-measurements`, uncommitted working tree
**Hosts observed:** Claude Code 2.1.294, codex-cli 0.161.0 (isolated smoke install: 0.147.0)

## Verdict

The collector is ready for the passive pilot. AC2 and AC4 are **partial**. The
contract documents why, and neither should be checked off as done. Every defect I
raised during the session was fixed. I have one minor observation, below.

## Acceptance criteria

| AC | Judgment | Basis |
| --- | --- | --- |
| 1. Inspect events, document hosts, identities, timestamps, coverage | Met | `docs/research/resource-measurements.md` and `mantra/context/resources.md`. These match what I found independently in local transcripts and rollouts (see Evidence). |
| 2. Wall time, request latency, tool durations, active union, user wait, overhead; overlap handled | Partial | Elapsed, tool execution, tool-bracket union, handoff wait, and collector work are recorded. Model-request latency, active-interval union, and human wait are `unknown` because no supported collector input bounds them. Overlap is unioned, never summed into a wall total. |
| 3. Deduplicate tokens by runtime identity, keep categories, no combined total | Met | Claude: last snapshot per `message.id`. Codex: last cumulative `token_count` snapshot. No total and no billing claim. Host category semantics are documented. |
| 4. Human permission vs clarification stops, auto-approvals excluded, partial coverage marked | Partial | `permission_notifications` is an observed count, labelled as notifications rather than episodes. `human_permission_stops` and `human_clarification_stops` are separate fields and remain `unknown`. Auto-approved operations, `AskUserQuestion`, and question marks are never counted. |
| 5. Run identity, observation time, units, coverage; missing = unknown | Met | Every report carries `run_id`, `host`, `observed_at`, and a per-metric `unit`/`coverage`. Missing values are `null` with coverage `unknown`, and are never 0. |
| 6. Fixtures for duplicates, overlap, missing events, classification; overhead; disable path | Met | Kit's 44 tests pass, and so do my 11 fixtures (below). An overhead benchmark is in `docs/research/resource-measurements-overhead.json`. Disabling writes nothing. |
| 7. Passive only, with no scores, countdowns, auto-stop, quotas, or reasoning inspection | Met | The hook always writes `{}` to stdout. No content, arguments, or paths are retained. Live answers were unaffected. |

## Evidence

**Transcript and rollout survey.** These are local Claude transcripts and Codex rollouts, read-only.
- **Claude, repeated records:** one API response is written as several assistant records, each repeating the usage. Some of those repeats grow `output_tokens` (streaming snapshots). Summing per record overcounts, and keeping the first record undercounts.
- **Claude, permissions:** auto-approved tools are marked `permissionDecision.source: config`. Human decisions appear as `user_temporary` or `toolDenialKind: user-rejected`. Neither identifies a dialog episode.
- **Codex:** `token_count` events repeat identical snapshots and sometimes carry `info: null`. Its `cached_input_tokens` is a subset of `input_tokens`, whereas Claude keeps cache categories separate.

**Independent fixtures** (`/tmp/pip184/fixtures.js`, outside the repo). All 11 pass against the final code:
- split records with identical usage
- growing streaming snapshots
- distinct ids with identical usage
- records carrying only camelCase `sessionId`
- Codex duplicates plus a `null` info
- Codex cached-input semantics
- overlapping tools (the union is not the sum)
- a missing PostToolUse (unknown, not 0)
- stop classification
- disabled (no files written)
- a missing transcript (tokens unknown, report still identified)

**Live Claude run.** `claude -p --model haiku` in a scratch directory, with the hooks from the `context/resources.md` snippet supplied via `--settings`, a single `ls` tool call, and one arithmetic question:
- With collection enabled, the snapshot's tokens matched my independent last-per-`message.id` sum from the same transcript exactly. That transcript had 3 assistant records for 2 message ids, so a naive sum would have been wrong.
- Every hook invocation journaled an overhead sample, including those before the transcript existed.
- Tool execution came in below the tool-bracket union. The difference is hook and dispatch time, which the semantics already name.
- With `MANTRA_RESOURCES=disabled`, no files were written. Both runs answered the question correctly.

**Skill invocation probes** (`scripts/probe-skill.js`, neutral temp directory, plugin loaded from source, no global install). The prompt was a Postgres-to-Kafka proposal for a small team. `mantra:assess` fired on Claude, and `assess` fired on Codex. I re-ran both after the final manifest change.

**Metadata.**
- `scripts/validate-plugins.js` passes for the repository root and for `mantra`.
- An isolated `CODEX_HOME` smoke install of `mantra@claude-domestique` at 0.7.0 succeeded.
- `mantra/hooks/hooks.json` and `mantra/hooks/behavior.js` are unchanged from `main`.
- The version is bumped to 0.7.0 consistently across the plugin manifests, `package.json`, and the marketplace.

## Findings raised during verification, all resolved

1. **A stale lock directory disabled collection for the rest of a session.** I reproduced it. The fix removed the lock in favour of small append-only journal writes plus snapshots written by temp file and rename.
2. **Parallel tool hooks lost observations under the lock.** The same change fixed it, and kit added a 12-process concurrency test.
3. **Resource hooks were registered by default.** Every Mantra user paid for a Node spawn on each hook, even when disabled, and Codex users faced new trust prompts. The hooks are now opt-in through a documented settings snippet. The Codex `hooks` manifest override and `codex.json` were removed, which also removed an unverified risk that Codex would load both hook files.
4. **Overhead samples were skipped whenever the transcript was unavailable.** They are now appended independently of transcript success. The live run confirmed one sample per hook invocation.
5. **The resume semantics were unstated.** Transcript rows whose snake_case `session_id` differs from the run's, such as records from before a resume, are excluded from usage, and the contract now says so.
6. **Replayed hook pairs** (found in kit's self-review). A replayed pair could add a second bracket for the same `tool_use_id`. The fix keeps the first completed bracket per id, which a dedicated test covers.

## Remaining limitations and observations

- **Coverage gaps by design:**
  - Model-request latency, human wait, and human permission/clarification episodes stay `unknown`. Active-interval union is `unknown` on both hosts. The Codex protocol defines `exec_command_begin`/`exec_command_end`, but none of the 80 most recent local codex-cli 0.161.0 rollouts contains them (their tool calls are `custom_tool_call` items), so kit removed an adapter that no collector input could feed.
  - Codex has no permission-notification equivalent.
  - Transcripts are undocumented formats, so a host update can turn usage into `unknown`.
  - A transcript over 2 MiB makes all token values `unknown` rather than partial.
- **Trailing handoff gap (minor, not a defect).** In a headless single-turn run, `handoff_wait_ms` measures the time from Stop to session teardown, because the open Stop gap is closed at the observation time. Its semantics already say it is not human waiting. The #185 experiment should treat it as host teardown, not as a handoff.
- **Codex was not exercised live with hooks.** That would require trusting hooks in a Codex home. The Codex paths are covered by fixtures and by the documented contract only.
- **Out of scope:** collection alone shows no behavioural benefit. That question belongs to #185.
