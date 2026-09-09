# probe

Run as: `codex --model gpt-5.6-sol -c model_reasoning_effort=high`

Take hypothesis `$HYPOTHESIS` from `.pipeline/runs/$RUN/hypotheses.md`.

Write the probe. Run it. Write the result to `.pipeline/runs/$RUN/probe-$HYPOTHESIS.md` as `CONFIRMED` or `REFUTED` with the evidence, and commit it.

Commit a REFUTED result too. Losing hypothesis worktrees get closed, and an uncommitted result is discarded with them — leaving no account of what was ruled out, so the next pass re-probes it.

Do not fix anything. Stop.

A probe that could not run is neither CONFIRMED nor REFUTED. Write `COULD NOT RUN` and name what stopped it — a missing fixture, an unreachable service, a test that errors on import. Reporting REFUTED for a probe that never executed sends the search down the wrong branch and nothing downstream can tell the difference.

The evidence is the output, not your reading of it. Paste what the probe printed.
