# fan-in's settle gate cannot be satisfied by its own caller

- **status**: open
- **type**: bug
- **area**: comitatus — `skills/herdr/scripts/fanin.js`, `faninCmd`
- **found in**: run `orch-selfhost`, at the fan-in step
- **record**: [`runs/orch-selfhost/DEFECT-fanin-selfwait.md`](../runs/orch-selfhost/DEFECT-fanin-selfwait.md)
- **retired bead**: `domestique-a71`

The full analysis, the verified reproduction, and the predicate the gate should check
instead are in the record above. It is not copied here — one statement of a defect,
in the run that found it.

In one line: `faninCmd` waits for `--wait-handle` to reach `idle|done`, but
`orchestrator.md` assigns the role to the same agent that wrote the manifest, so the
handle to settle is the caller's own and a caller is `working` for its whole command.
No value of the flag is correct — its own handle deadlocks, any other handle
witnesses nothing.

Why it stayed open: fixing it means editing `fanin.js` and its tests, which is
partition work, and the orchestrator does not write production code. It needs a test
asserting the caller's own handle is *accepted*, since the absence of that assertion
is what let handle-idle pass as a proxy for sole occupancy of the task worktree.

Blast radius while open: every run must fan in with plain `git merge` and confirm
sole occupancy by hand against `herdr agent list`, as `orch-selfhost` did.
