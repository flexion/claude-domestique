# DEFECT: fan-in's settle gate cannot be satisfied by the agent that runs it

run: orch-selfhost
verb: `fan-in` (`comitatus/skills/herdr/scripts/fanin.js`, `faninCmd`)
bead: domestique-a71
status: open — partition work, not fixed in this run

## What happened

Fan-in for this run was performed as two plain `git merge` commands instead of
`node H fan-in --run orch-selfhost --partitions up,settle`. The verb cannot run.

`faninCmd` makes two refusals before the first merge. The first is right and
worked: HEAD must be `task/<run>`. The second waits for `--wait-handle` (default
`arch`) to reach `idle` or `done`:

```js
waitCmd([cfg.waitHandle, '--status', 'idle,done', '--timeout', String(cfg.timeout)], deps);
```

`orchestrator.md` is explicit that the role is "taken by the same agent that just
finished `architect.md`". So the handle that owns the task branch, and therefore the
handle to settle, is the caller's own — and a caller is `working` for the entire
duration of its own command. The wait can never observe itself idle. `--timeout`
only changes how long it takes to fail. Reproduced against the merged task branch at
`--timeout 0 --dry-run`, which is the whole verb short of the merge — the wait runs
before the dry-run check, so it never reaches a plan:

```
$ node H fan-in --run orch-selfhost --partitions up,settle --wait-handle oz --timeout 0 --dry-run
herd: cannot fan in while oz is unsettled: wait timeout: oz is working, want idle,done
```

There is no argument that fixes this. Every value of `--wait-handle` is wrong:

- the caller's own handle deadlocks by construction;
- any other handle satisfies the gate without observing anything about the tree the
  gate protects. That was offered during this run and refused by the operator: a
  gate satisfied by an unrelated witness records a pass that verified nothing, which
  is the same false-green shape as run 1's 275 green tests over five dead CLI verbs.

## The real predicate

The gate's stated reason is sound — "merging under a running agent rewrites the tree
it is living in" — but `handle X is idle` is a proxy for it, and the wrong one. The
property that actually makes a merge safe is **sole occupancy of the task worktree**:
no agent *other than the caller* has that path as its cwd.

herdr already answers this. `herdr agent list` carries `cwd` per agent, and the
caller identifies itself from `HERDR_PANE_ID` — `resolveSelf` in `herd.js` does
exactly that lookup today. So the check is: list the agents whose `cwd` is the task
worktree, drop self, and refuse if any remain — reporting the handles that must
settle first. That predicate accepts the caller's own handle instead of deadlocking
on it, and it also catches the case the current gate misses entirely: a `rev` or a
second implementer parked in the task worktree under some handle that is not
`arch`.

For this run, sole occupancy was confirmed by hand against `herdr agent list`
before the merge: the task worktree
`/Users/dpuglielli/.herdr/worktrees/claude-domestique/task-orch-selfhost` held one
agent, `oz`, the caller. `impl1` and `impl2` were in their own partition worktrees.

## Reproduce

```bash
node H fan-in --run <id> --partitions a,b --wait-handle <your own handle>
```

## Why it is not fixed here

Fixing it means editing `fanin.js` and its tests, which is partition work. The
orchestrator does not write production code, and this run's manifest is closed. The
change also wants a test that asserts the caller's own handle is *accepted* — which
is the assertion whose absence let the proxy look correct.
