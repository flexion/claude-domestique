---
slice: tracker-and-forge-ports
job: >-
  Define portable tracker/forge interfaces and implement the durable run-record boundary that let an
  orchestrator safely claim an item, address its evidence, perform external effects, and recover after a crash.
ships:
  - kind: deterministic
    path: modus/lib/ports.js
  - kind: deterministic
    path: modus/lib/run-record.js
  - kind: doc
    path: modus/docs/tracker-and-forge-ports.md
gating_test:
  status: planned
  command: npx jest modus/lib/__tests__/ports-contract.test.js
  evidence: >-
    Every adapter passes the same contract suite for claim fencing, stable item-part addressing,
    best-effort projection, intent/result recovery, and reconciliation of an incomplete effect.
non_gating:
  - Cross-machine Beads claim behavior after Dolt sync.
  - Provider-specific operational latency and rate-limit behavior.
depends_on: []
terminal_failure_owned: []
source_lines: 38-89, 293-297, 545-580
---

# Tracker and forge ports

**Slice boundary.** Define portable tracker/forge interfaces and implement the durable run-record
boundary that lets an orchestrator safely claim an item, address its evidence, perform external effects,
and recover after a crash.

| | |
| --- | --- |
| Ships | `lib/ports.js` · `lib/run-record.js` · the adapter contract suite · this document |
| Gating test | *planned* — `npx jest modus/lib/__tests__/ports-contract.test.js`. Every adapter passes the same contract suite for fencing, stable locators, projection, incomplete effects, and reconciliation |
| Non-gating | Cross-machine Beads claim behavior after Dolt sync · provider latency and rate limits |
| Depends on | None |
| Terminal failure owned | None — the spine owns eligibility and stop-state decisions |
| Source lines | 38-89, 293-297, 545-580 of the pre-split `autonomous-workitem-workflow.md` |

## Extraction note

The port operations and run-record guarantees are verbatim or lightly condensed from the cited ranges.
The opening boundary statement and section grouping are new; they do not add an adapter capability or
change which actor consumes it. The walking skeleton owns the thin Beads adapter; this slice supplies
the interface, durable record, and contract suite that later harden it.

GOAL: Give the workflow generic, recoverable access to work items and forge effects without pretending
that trackers share either a state machine or an atomic claim primitive.
HOW: Implement separate tracker and forge ports, retain run state in one append-only record, and route
every external effect through a fencing and reconciliation boundary.
JUSTIFICATION: Jira may be the tracker while GitHub is the forge; collapsing the two makes that common
deployment unusable. A tracker projection cannot be authoritative because trackers have incompatible
state machines. -- (no source — local design judgment)
IMPACT: high — a lost claim permits two orchestrators to act on the same item, while an unrecoverable
effect leaves the run unable to know what actually happened.

## Two independent ports

The tracker port owns work items:

| Operation | Required | Used by |
| --- | --- | --- |
| `list_eligible(filter)` | yes | run entry |
| `read(ref)` | yes | reconstruction |
| `comment(ref, text)` | yes | escalation |
| `attach_reference(ref, label, uri)` | yes | boundary freeze |
| `project(ref, state, note)` | best effort | run entry, freeze, handoff |
| `claim(ref, owner, expiry, fence)` | capability-gated | run entry |
| `assign(ref, owner)` | optional | escalation |

The forge port owns `create_branch`, `open_pr`, `mark_pr_ready`, `checks_status(sha)`, and
`observe_merge(pr)`. All five are required: a tracker-only installation is outside this pilot's scope,
not a missing fallback to silently invent.

The ports remain separate. Jira supplies no forge, GitHub and Azure DevOps can supply both, and Beads is
a local tracker. A consumer may compose any valid pair; no linter or manifest field may infer a provider
from the opaque item reference.

The state-machine incompatibility is concrete: Jira's transitions are configurable with validators and
transition permissions; GitHub Issues has open and closed plus labels; Azure Boards has per-process
states; and Beads has its own set. The workflow's states therefore cannot live authoritatively in any
tracker.

## Stable item evidence and claims

`read(ref)` returns addressable item parts with stable identifiers such as `description#1` and
`comment#4`, not one text blob. The reconstruction contract in
[`reconstructing-the-item`](reconstructing-the-item.md) uses those identifiers for every
`item_locator`; without them, locator comparison is noise. Field-level addressing is a coarser but
still meaningful degradation when a tracker cannot expose individual parts.

Claim is the non-degradable operation. Azure Boards can use revision-based optimistic concurrency, Jira
a conditional issue-property update, and one shared Beads database a transaction. GitHub Issues have
last-write-wins field writes, so their real lease belongs in an external compare-and-set store; a
tracker-side claim is then advisory decoration. Configuration declares that capability before the run
starts. An absent declaration is a configuration error, not a discovery to make after an item was
selected.

## The run record is authoritative

`runs/WI-1234/<run-id>.jsonl` is append-only and belongs to one run attempt. A refreeze makes a new
run rather than rewriting history. A single Orchestrator owns sequence allocation and append. Its envelope is `schema_version`, `run_id`, `seq`, `timestamp`,
`actor`, `event_type`, `input_digests`, `outcome`, `reason_code`, and `evidence_refs`; large logs and
review payloads remain immutable referenced artifacts.

The record is authoritative and tracker state is a best-effort projection. A tracker that cannot
represent `handoff_pending` stays open with a comment naming handoffs and owners. No downstream actor
reads workflow state back from the tracker, and a failed projection is an event rather than a stalled
run. Deferrals are events: current state, the deferral list, and every human view are derived projections,
never a second source of truth and never committed.

The runtime guarantees are part of this slice, not metadata wishes:

- The store supplies single-writer atomic append and monotonic `seq`; a torn write leaves the last
  complete record authoritative.
- A fence is enforced at a credential-holding sink or gateway. Passing a token to a tracker, forge, or
  CI provider does not itself reject a stale writer.
- Idempotency is per sink. Use a native key where available; otherwise write an external marker before
  acting and reconcile it by query on resume.
- Idempotency keys include `(run_id, effect_kind, target, input_digest)`. `(run_id, operation)`
  collides when a repair round retriggers CI.
- Append an `intent` before an effect and a `result` after it. Startup finds unmatched intents and
  reconciles them with tracker, git, PR, and checks before continuing.

The last rule is the answer to a crash between opening a PR and recording it. It detects a gap but
cannot close it until the per-sink semantics above exist; the document records that limit rather than
calling recovery complete.

## Test contract

The future contract suite supplies a disposable adapter fixture to every adapter implementation. It
asserts that a lost compare-and-set is a no-op; two references resolve to stable, distinct item parts;
a failed projection is recorded without changing run state; and an unmatched intent is reconciled
exactly once. Those checks consume the properties this document assigns to the adapter rather than
merely asserting that interface names exist.
