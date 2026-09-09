# fan-out trial log

One row per task. Ten honest rows before anything here gets automated — the
decision table is in `runs/*/fan-out-trial.md` under "What the log decides".

| id | type | width | wall min | human min | conflicts | red-gate fails | scope violations | blocked | reviewer hits | escalations | $ opus | $ sonnet | $ haiku | $ codex | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| orch-selfhost | feature | 2 | 38 | ~4 | 0 | 0 | 0 | 0 | 1 | 0 | ? | ? | — | ? | first run driven by an agent taking `orchestrator.md` rather than by hand. three defects, not the two in `task.md`: `fanout` was dead from the CLI, so fan-out ran on primitives. `fan-in` unusable by an orchestrator that is also the architect — bypassed, `DEFECT-fanin-selfwait.md`. models: opus/high arch+orch, 2× codex gpt-5.6-sol/medium impl, sonnet/high rev. |

**wall min** is 05:50 → 06:28, from the `task.md` commit to the commit resolving the
reviewer's finding, read off `git log`. Teardown is not in it.

**human min** is an estimate, and the only estimated number in the row. The operator
sent three messages and read two reports; nothing measures how long that took, so it
is marked `~`. Every other column is counted.

**$ columns are unread, not zero.** Vendor dashboards are the budget meter and this
session cannot reach them. A zero here would be a false entry in the one column the
"one model dominates spend" decision depends on, so it stays `?` until someone reads
the dashboards for this window. `$ haiku` is `—` because no Haiku agent ran.

**reviewer hits: 1.** The Sonnet reviewer, reading only the manifest and the diff,
found that `package-lock.json` was modified and named nowhere in the manifest — an
orchestrator omission in `shared_files`, not a Codex defect. Cross-lineage review
earned its place on the first agent-driven run, though not against the diff it was
aimed at.

**red-gate fails: 0.** All 22 new tests failed on assertions that printed the value
they got. The `settled` tests needed typed stubs in `fanin.js` to get there; without
them they would have failed on a missing export, which is a red-gate fail and not a
red gate.

## Missing row

Run `fanout-comitatus` — the run that built `fanout`, `wait-all`, `state`, `fan-in`
and `teardown` — has no row, because this file did not exist until now. Its numbers
are not reconstructed here: guessing them would put two rows of different quality in
a table whose only value is that every row was filled honestly. What is known about
it is recorded where it was observed, in `runs/orch-selfhost/manifest.md` under
criterion 14: it shipped five verbs at 275/275 green with every one of them dead
from the command line.
