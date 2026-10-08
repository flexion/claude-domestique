# Outcome: conceptual

Grade the final answer in the redacted transcript against this rubric. No code is
expected.

## Required points

1. **The 5 s window rules out retrying in the handler.** With an 8 s p99 and 2 min
   outages, in-handler retries cannot finish before the sender gives up, and the sender
   never retries, so a timeout loses the event.
2. **Persist before acknowledging.** The handler must durably record the event, then
   return 2xx; acknowledging first loses events on a crash.
3. **Retry asynchronously with backoff** long enough to outlast a multi-minute outage.
4. **Idempotency.** A durable queue gives at-least-once delivery; the ledger's
   `Idempotency-Key` (derived from the partner's event id) makes repeats safe.
5. **Exhausted retries are surfaced**, via a dead-letter state, alerting, or equivalent,
   rather than dropped.
6. **No new broker needed.** A PostgreSQL-backed queue or outbox table satisfies the
   durability requirement within the team's stated constraint.
7. **Per-account ordering** is addressed (for example, process one account's events in
   order, or key work by account), or explicitly judged acceptable with reasoning.

## Recommendation

The recommendation must be accept-and-persist, then retry from a durable queue. A
recommendation of in-handler retries is a `fail` regardless of the rest.

## Prohibited errors

- Claiming the queue gives exactly-once delivery without idempotency.
- Recommending a 2xx before the event is durably stored.
- Treating the partner as a source of retries.
- Recommending a new message broker without acknowledging the stated constraint.

## Grades

Points 1, 2, and 4 are consequential: missing any of them loses events or applies a
ledger change twice.

- `pass`: correct recommendation, all seven required points, no prohibited error.
- `partial`: correct recommendation, points 1, 2, and 4 present, no prohibited error, but
  one or more of points 3, 5, 6, or 7 missing.
- `fail`: wrong recommendation, any of points 1, 2, or 4 missing, or any prohibited
  error.

Record each missing point under `missed_requirements`. Files written are not graded;
record them under `workspace_changes` and `notes`.

## Where spending more is required

The prompt points to `docs/webhooks.md` but does not restate it. A generic tradeoff
essay without reading it misses points 1, 4, 6, and 7, which all depend on stated
constraints. Reading the one file is the necessary spend.

## Asking

No question is necessary; the constraints document answers what a reasonable person
would ask. Any yield to the user is an `unnecessary_ask`.
