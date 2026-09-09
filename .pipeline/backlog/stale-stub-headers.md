# stale STUB headers survive the runs that implement them

- **status**: open
- **type**: chore
- **area**: comitatus — `skills/herdr/scripts/fanin.js`
- **found in**: run `orch-selfhost`, during the final handoff
- **retired bead**: `domestique-7jz`

`fanin.js` opens with:

```js
// STUB — partition `fanin` of run fanout-comitatus. Every function is exported
// with a correctly-typed placeholder return so the contract tests in
// __tests__/fanin.test.js fail on an assertion that prints what it got, rather
// than on a missing module. Replace each body; …
```

and carries a second, identical header for partition `settle` of run
`orch-selfhost`. Both are false. Every body is implemented and the suite is green on
them, so a reader opening the file is told it is a stub. The
`// eslint-disable-next-line no-unused-vars` lines above `stateCmd`, `derivePhase`,
`parseSettled`, `settledCmd`, `parseFanin`, `faninCmd`, `parseTeardown` and
`teardownCmd` are stale for the same reason — they were needed only while those
functions were unreferenced.

## Why it is a process item, not just a tidy-up

Two runs produced this litter, not one, and neither role owns removing it:

- the **architect** writes the stub header on purpose. It is what makes a contract
  test fail on an assertion that prints its received value rather than on a missing
  export, which is the red gate.
- the **implementer** is briefed for the "smallest diff that passes". A comment is
  not a test, so deleting it never becomes necessary.

So the header outlives the condition it describes, every time. The fix is one line in
`implementer.md` — a stub header you made untrue is part of your diff — and then the
deletion happens inside the partition that falsified it, by the agent that falsified
it. Cleaning the current two occurrences without that line just resets the clock.
