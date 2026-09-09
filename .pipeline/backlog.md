# backlog

Work that outlives the run that found it. One line per item; the file it links to
is the record.

`.pipeline/` had no slot for this. Its structure covers everything *inside* a run —
`runs/<id>/task.md` states the task, `manifest.md` the criteria, a partition's commit
or `BLOCKED-<p>.md` its outcome, `log.md` the row — and `runs/<id>/` is retained
precisely so a question already answered is not re-asked. But that retention is
indexed by run id, not by subject, so "has anyone looked at this?" means reading
every run directory. This file is that index.

An item belongs here when it is real, not yet done, and not answerable from a single
run's record: a defect found and deliberately deferred, a nit nobody owns, a
requirement for next time. An item that a run is actively executing belongs in that
run's `task.md`; this file just says which run has it.

| item | status | area | found in |
| --- | --- | --- | --- |
| [fan-in's settle gate cannot be satisfied by its own caller](backlog/fanin-selfwait-gate.md) | open | comitatus | orch-selfhost |
| [stale STUB headers survive the runs that implement them](backlog/stale-stub-headers.md) | open | comitatus | orch-selfhost |
| [fan-out verbs hardcode one branch naming convention](backlog/branch-naming-conventions.md) | in run `fanout-branch-naming` | comitatus | orch-selfhost |

## Why these are files and not beads

Run `orch-selfhost` filed seven beads for one task. Four duplicated something
`.pipeline/` or git already held — the task bead restated `task.md`, two partition
beads restated their own commits, and a defect bead restated manifest criterion 14.
Only three had no home, and they are the three above.

The duplication was not a mistake by any one agent. `CLAUDE.md` directs every agent
in the repository to use `bd` for all task tracking, and `implementer.md` says
nothing about who files, so at width 2 both implementers filed their own bead for
work the orchestrator's bead already covered. Because `bd` keys on git identity, all
three recorded the same owner and the duplication was invisible until someone listed
the label.

So the rule while this holds: **the filesystem is the record.** Nothing here is
mirrored into a tracker, because two systems of record diverge and the divergence is
silent. The retired bead ids are noted in each file only so anyone who saw them can
follow the trail.
