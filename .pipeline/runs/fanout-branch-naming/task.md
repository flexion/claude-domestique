# task: make the fan-out verbs work on any branch naming convention

type: feature
risk: low

## goal

Every fan-out verb builds its branch names from the literal `task/<run>`, so the kit
only works in a repository that names branches that way. It must work on
`chore/make-new-readme` and `76632-create-new-thing` too.

The literal appears at six independent sites — `state`, `settled`, `fan-in`,
`teardown` in `fanin.js`, and both the `--base` default and the partition branch in
`fanout.js` — plus three `usage()` strings. Six independent defaults is the actual
risk: two of them disagreeing is a silent wrong-branch, not an error, so the fix
threads one resolved value rather than adding one flag with six defaults.

Background, with the verified constraints: `.pipeline/backlog/branch-naming-conventions.md`.

## done-when

- `cd comitatus && npm test` passes, with new failing-first tests
- `--task-branch <name>` is accepted by every verb that today derives `task/<run>`,
  and defaults to `task/<run>` so no existing invocation changes behavior
- partition branches are `<task-branch><sep><partition>`, `--partition-sep`
  defaulting to `-`
- a `--partition-sep` containing `/` is rejected with an error naming the git reason:
  refs are files, so `refs/heads/chore/x` and `refs/heads/chore/x/api` cannot coexist
- `--run` names only the `.pipeline/runs/<id>` artifact directory; a run id and a
  branch name may differ entirely
- `state` accepts an optional `--partitions` to constrain discovery, because it is
  the only verb that finds partitions by globbing rather than being told them
- both target conventions work end to end: `chore/make-new-readme` →
  `chore/make-new-readme-api`, and `76632-create-new-thing` →
  `76632-create-new-thing-api`
- `npm run validate:plugins` passes from the repo root
- no existing verb's output shape changes, and the implementer edits no test. Four
  existing exact-shape parse assertions do move, because two fields are added to what
  the parsers return; the architect makes those edits before the red gate, so they are
  part of the contract the implementer is handed rather than something it negotiates

## out of scope

Do not edit anything under `modus/`. Do not change what a verb returns. Do not fix
the fan-in self-wait gate (`.pipeline/backlog/fanin-selfwait-gate.md`) or the stale
stub headers (`.pipeline/backlog/stale-stub-headers.md`) — both are separate backlog
items and touching them here would mix three changes in one diff.

## note

This run's own branch is `chore/fanout-branch-naming` while its run id is
`fanout-branch-naming`. That is deliberate: the branch does not carry a `task/`
prefix, so the run exercises the decoupling it is building.
