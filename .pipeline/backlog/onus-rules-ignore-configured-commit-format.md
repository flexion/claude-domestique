# onus injected rules ignore the configured commit format

- **status**: open
- **type**: defect (pre-existing; the rule text predates `chore/onus-config-location`)
- **area**: onus, `rules/git.md` (injected at SessionStart)
- **found in**: branch `chore/onus-config-location`, Claude host probe on a Jira-configured target, 2026-10-20

## What happened

`onus/rules/git.md` is injected at SessionStart and states the commit convention as
`#N - verb desc` / `chore - desc`. It does not read `.onus/config.json`. On a target
whose config set `commitFormat.issue` to `[PRB-{number}] {description}`, the probe
agent noticed that the injected rule contradicted the configured format.

The commit and pr skills resolve the configured format through `onus/scripts/config.js`;
the always-on rule text does not. Claude/Codex resolution parity holds, but commit
behavior with a non-default format is unverified.

## Done when

A project with a non-default `commitFormat` in `.onus/config.json` gets injected
guidance that names that format, or the rule text defers to the resolved config
instead of stating a format.
