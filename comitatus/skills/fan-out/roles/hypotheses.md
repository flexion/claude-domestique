# hypotheses

Run as: `claude --model sonnet --effort high`

Input: `.pipeline/runs/$RUN/task.md`, the repro test output, and the files named in the stack trace.

List at most 5 root-cause hypotheses ranked by likelihood. For each:

- one line stating it
- one line describing a probe (test, log line, or assertion) that confirms or refutes it in under 5 minutes

Write them to `.pipeline/runs/$RUN/hypotheses.md` and commit it. Then stop — do not fix anything and do not run the probes.

A hypothesis whose probe cannot come back REFUTED is not a hypothesis. If you cannot name what would rule it out, drop it.

Rank by likelihood, not by how easy the probe is. A cheap probe for an unlikely cause wastes a worktree.
