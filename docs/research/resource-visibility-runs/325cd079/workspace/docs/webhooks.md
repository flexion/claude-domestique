# Partner webhooks: current constraints

- The partner sends each event once. Their sender waits at most 5 seconds for a 2xx and
  does **not** retry on timeout or error.
- For each event we call the internal ledger API. Its p99 latency is 8 seconds, and it has
  had outages of up to 2 minutes a few times a month.
- The ledger API accepts an `Idempotency-Key` header; repeated calls with the same key
  apply the change once.
- Losing an event means a customer balance is wrong until someone notices.
- We run in one region. PostgreSQL is already deployed and backed up. We do not run a
  message broker today, and the team would rather not add one this quarter.
- Event order matters only within one customer account.
