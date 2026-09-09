# fan-out verbs hardcode one branch naming convention

- **status**: done in run `fanout-branch-naming` (commit a02def2)
- **type**: feature
- **area**: comitatus — `skills/herdr/scripts/fanin.js`, `fanout.js`, `herd.js`
- **found in**: run `orch-selfhost`, raised by the operator at handoff
- **retired bead**: `domestique-89c`

The verbs must work on branch names like `chore/make-new-readme` and
`76632-create-new-thing`, not only `task/<id>`. Neither is reachable today.

## Where the literal lives

`task/${cfg.run}` is built independently at six sites:

| file | line | verb |
| --- | --- | --- |
| `fanin.js` | 68 | `state` |
| `fanin.js` | 164 | `settled` |
| `fanin.js` | 237 | `fan-in` |
| `fanin.js` | 306 | `teardown` |
| `fanout.js` | 146 | `fanout` — the default `--base` |
| `fanout.js` | 161 | `fanout` — the partition branch |

plus three `usage()` strings in `herd.js`. `fanout`'s `--base` is already
overridable; the partition branch name is not. Six independent defaults is the shape
of the risk: any two disagreeing is a silent wrong-branch, not an error, so the fix
should thread one resolved value rather than adding one flag with six defaults.

## Hard constraint: no `/` separator, verified

A slash-separated partition branch is impossible, so the design must not offer one.
Git refs are files, so a branch cannot also be a directory:

```
$ git branch chore/make-new-readme          # ok
$ git branch chore/make-new-readme/api
fatal: cannot lock ref 'refs/heads/chore/make-new-readme/api':
       'refs/heads/chore/make-new-readme' exists
```

The task branch always exists in this workflow, so the separator must be flat
(`-`, `--`, `.`, `_`) and a `/` value should be rejected with that git reason in the
message, rather than failing at the second `worktree create`.

## Second constraint: `state` is the only verb that guesses

`state` *discovers* partitions — `git branch --list '<task>-*'`, then strip the
prefix to recover each name. `fan-in`, `settled` and `teardown` are all told their
partitions with `--partitions`. Freer names make sibling collisions likelier: a
human's `76632-create-new-thing-v2` comes back as partition `v2`. So `state` likely
needs the optional `--partitions` the other three already take.

## Shape to build

`--task-branch <name>` on every verb that currently derives `task/<run>`, defaulting
to `task/<run>` so no existing call changes; partition branch =
`<task-branch><sep><partition>` with `--partition-sep` defaulting to `-`; and `--run`
narrowed to naming only the `.pipeline/runs/<id>` artifact directory. That last part
is the real decoupling — the runbook currently asserts "`<id>` is the task id, the
same one in `task/<id>`", which is what forces a ticket-numbered branch to produce a
ticket-numbered artifact directory.
