# task: fix the two defects the first fan-out run surfaced

type: feature
risk: low

## goal

Running the kit in `.pipeline/runs/orch-selfhost/fan-out-trial.md` for real surfaced two
defects in the comitatus helper. Both are in this repository already; fix them.

1. `up` always runs `git fetch origin <base>` before creating a worktree. A task branch
   that exists only locally fails with `couldn't find remote ref`, so `up --base task/<id>`
   cannot create a partition worktree. It should fetch only when the base is a remote-
   tracking ref, and create from a local ref without fetching.

2. Completion is reported off agent status, and an agent reads `idle` between its own
   turns. `wait-all` returning `idle` for every handle is not evidence a partition
   finished. Add a git-derived settle check so a caller can ask "is this partition
   actually done" and get an answer from refs — a commit on the partition branch, or a
   committed `BLOCKED-<p>.md` — not from status.

## done-when

- `cd comitatus && npm test` passes, with new failing-first tests for both defects
- defect 1: a local-only base creates a worktree with no fetch attempted; a remote base
  still fetches
- defect 2: the settle check reports done/blocked/working per partition from refs alone,
  and issues no writing git command
- `npm run validate:plugins` passes from the repo root
- no existing verb's output shape changes

## out of scope

Do not edit anything under `modus/`. Do not build an orchestrator process, a run journal,
or a sandbox. Git stays the state machine.
