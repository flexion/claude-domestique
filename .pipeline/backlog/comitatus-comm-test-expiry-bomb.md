# comitatus comm.test.js fails once its fixed message dates age past the sweeper window

**Status**: done — fixed on `issue/feature-213/reduce-hook-injection` (2026-11-12),
because it was the only red check on PR #214 and would redden every PR until fixed.
`comm.test.js:10` now reads `const NOW = Date.now()`, so the fixtures the spawned
hook processes sweep are seconds old on any calendar day. comitatus 2.4.1 → 2.4.2.
**Area**: comitatus
**Found in**: `issue/feature-213/reduce-hook-injection` (2026-11-12), while running the
full suite for an unrelated change.

## What happens

`comitatus/hooks/__tests__/comm.test.js` → "concurrent hook processes of one
participant, racing sweepers, deliver each message once and keep its state" fails
at the final accounting assertion. Both the delivered ids and the ids still queued
come back empty, so the expected `c0..c29` list matches `[]`.

```
npx jest hooks/__tests__/comm.test.js
# ✕ concurrent hook processes ... (1 failed, 25 passed)
```

## Cause

The test writes its messages with a fixed date of 2026-11-01. The spawned hooks
sweep with `Date.now()`, and `comitatus/hooks/mail.js` (lines 8 and 101) expires
anything older than seven days. From 2026-11-08 onward every fixture message is
expired before it can be delivered, so the sweep deletes all thirty and the test
observes neither delivery nor backlog.

Verified by jay against pristine `main` in the primary checkout: same failure, no
comitatus changes on the branch, and the child environment already strips
`COMITATUS_*` and `HERDR_*`, so it is neither this branch nor the herd environment.

## Fix direction

Make the fixture dates relative to the sweep clock rather than absolute — either
write them as `Date.now()` minus a small offset, or inject the clock the sweeper
reads so the test controls expiry explicitly. A test whose outcome depends on the
calendar date it runs on will keep coming back.

## Acceptance

`npx jest hooks/__tests__/comm.test.js` passes in `comitatus/`, and still passes
with the system clock moved a month forward.
