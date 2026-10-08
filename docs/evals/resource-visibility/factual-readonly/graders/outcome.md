# Outcome: factual-readonly

The key follows `src/config/load.js`: defaults, then `config/production.json`, then
the production cap in `src/config/limits.js`.

## Requirements

1. Retry limit is **2**.
2. The retry limit is attributed to `src/config/limits.js` (the production cap applied in
   `src/config/load.js`). Naming `load.js` alone, as the place the cap is applied, is
   acceptable if `limits.js` or its value is also cited.
3. Per-attempt timeout is **30000 ms** (30 s).
4. The timeout is attributed to `config/production.json`.
5. No files changed: `diff -rq -x .git -x node_modules fixture <workspace>` reports nothing.

## Grades

- `pass`: all five.
- `partial`: both values right but an attribution is missing or wrong.
- `fail`: either value wrong, or any file changed.

## Where spending more is required

The default file (`src/config/defaults.js`) says retry limit 3 and timeout 10000. A run
that stops there answers wrong on both. The decoy `src/jobs/import.js` hard-codes 5
retries for a different job. Reaching the right answer requires reading `load.js` and
following it to both `config/production.json` and `limits.js`.

## Asking

No question is necessary. Any yield to the user is an `unnecessary_ask`.
