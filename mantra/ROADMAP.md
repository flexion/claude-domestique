# Mantra roadmap

## Current implementation

Mantra provides four skills and a fixed reminder on session start and every
prompt. Separately configured resource hooks support passive `collect` and
experimental Claude `display`; see [the pilot contract and recommendation](context/resources.md).
See [README.md](README.md) and [DEVELOPMENT.md](DEVELOPMENT.md).

Older plans described periodic file refresh, sibling-plugin discovery, and
prompt-count freshness indicators. Those are not implemented by the current
behavior hook.

## Future work

Consider further changes only when observed failures justify them. Current
assessment evidence and unresolved framing-consistency and evidence-scope gaps
are recorded in [the #183 review](../docs/reviews/183-evidence-responsive-skepticism.md).
Keep recurring guidance small and evaluate behavioral effects before adding
refresh state, discovery logic, or more procedure.
