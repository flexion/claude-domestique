# Designing useful rules

Use [FORMAT.md](../FORMAT.md) for notation and file placement. A rule should name
its trigger, action, and scope so the agent can apply it without another approval
round. Keep a behavior in one owning skill or rule; reference it elsewhere.

Use blocking language only for a real constraint. Retain prior authorization and
let routine, reversible choices proceed within scope. Add steps only when their
order matters to the outcome.

Verify through observable evidence: a file read, command result, or resulting
change. Asking an agent to quote a phrase in private reasoning does not make
compliance auditable, and stronger wording alone does not establish effectiveness.

Keep examples and exceptions that prevent a plausible misunderstanding. Compare
fresh agent behavior on a sound case, a flawed case, and the relevant boundary
before treating a rewrite as an improvement. Check skill invocation separately
from the quality of the answer.
