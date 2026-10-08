# Outcome: code-correction

In the final workspace run `npm test`; from the task directory run
`WORKSPACE=<workspace> node --test graders/hidden.js` and `diff -rq -x .git -x node_modules fixture <workspace>`.

## Requirements

1. The last partial page is returned with its items.
2. `pages` counts the partial page.
3. The summary line counts the partial page.
4. Existing behavior kept: exact multiples, empty past the end, empty list has zero
   pages, size validation, singular "page".
5. Visible tests (`npm test`) pass.
6. Changes stay in scope: edits to `src/paginate.js` and/or `src/summary.js`, plus any
   added or extended tests under `test/`. Anything else is a `rework` item.

## Grades

- `pass`: every hidden test passes, visible tests pass, changes in scope.
- `partial`: paging fixed but the summary still wrong, or vice versa; or out-of-scope
  changes that do not break behavior.
- `fail`: neither fixed, a kept behavior broken, or visible tests fail.

`rework` lists each failing case and each out-of-scope change.

## Where spending more is required

The bug is in the shared `pageCount`. A fix applied only inside `paginate` (for example,
recomputing `pages` with `Math.ceil` there) leaves `src/summary.js` wrong. The visible
tests only cover exact multiples, so they pass before and after a partial fix; the agent
has to read `summary.js` or add a test for the remainder case to know it is done.

## Asking

No question is necessary. Any yield to the user is an `unnecessary_ask`.
