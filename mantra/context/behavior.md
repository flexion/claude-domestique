# Behavioral guidance

Mantra's [hook](../hooks/behavior.js) supplies a recurring reminder. The following
skills own the detailed guidance; this document is an on-demand index.

- [Skeptic](../skills/skeptic/SKILL.md): evidence-responsive agreement, challenge,
  revision, goal corrections, and checked facts versus unverified limits or
  causal hypotheses.
- [Assess](../skills/assess/SKILL.md): correctness, architecture, alternatives,
  material risks, proportionate deliberation, and the active user objective.
- [Troubleshoot](../skills/troubleshoot/SKILL.md): evidence selection and diagnosis
  relevant to the next action.

Project instructions set implementation and testing conventions. Mantra does
not require a separate change manifest, model recommendation, approval for
already-authorized work, or `// CHANGED` annotations. Consult the owning plugin
for session, git, and work-item procedures rather than duplicating them here.

The hook also prompts brief reflection on the requested outcome, actual progress,
and consequential uncertainty. This uses the existing prompt/session delivery,
including after compaction, and a five-minute tool-completion cadence. It asks agents
to use wall-time/token metrics only when visible and to account for reflection
cost. Startup/clear instead preview later reminders without requesting reflection
now. The hook itself measures nothing; guidance is not a completion judge.

The [automatic resource hooks](resources.md) is separate from this guidance. Its
observations measure neither usefulness nor human attention and do not authorize
changes to scope, permissions, or necessary clarification. Collection projects measurements; supported delivery events automatically add observations to model context.
