# task: implement the fan-out patterns in comitatus

type: feature
risk: low

## goal

`.pipeline/runs/fanout-comitatus/fan-out-trial.md` describes a manual fan-out that a
person drives by hand: create a task worktree, launch one agent per partition in its
own worktree, wait on them, fan in, collect artifacts, tear down. Every step is a
hand-typed `herdr` or `git` invocation.

Implement the mechanical parts of that runbook as comitatus helper verbs, so the
operator stops retyping them. comitatus already owns this surface: `comitatus/scripts/herd.js`
has `status|members|wait|send|send-wait-read|seed|broadcast|sync|withdraw|agent|up`,
and `up` already does fetch + worktree create + one labeled tab per agent.

## done-when

- `node comitatus/scripts/herd.js --help` lists the new verbs
- each new verb is self-contained: it shells out to `herdr` itself, reads no stdin,
  and takes no shell variables
- `cd comitatus && npm test` passes, including new cases for each verb
- no change to any existing verb's output shape

## out of scope

Do not move or edit `modus/docs/fan-out-trial.md`. Do not add an orchestrator,
a run journal, a sandbox, or a budget meter — the runbook's "Do not build yet"
list still holds. Git stays the state machine.
