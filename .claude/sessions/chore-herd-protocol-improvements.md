# Session: herd-protocol-improvements

## Details
- **Branch**: chore/herd-protocol-improvements
- **Type**: chore
- **Created**: 2026-08-11
- **Status**: in-progress

## Goal
Improve comitatus herd messaging so sends are serialized and mechanically honest across
all recipient states, cold-agent seeding is repeatable, lead withdrawal is explicit, and
rosters self-heal through peer detection.

## Approach
Assess the proposed nonce/echo and lock design against the stronger reliability
requirement before implementation. Treat durable acceptance, idempotency, and the
blocked/unknown states as explicit contract questions; coordinate the helper and prose
changes with tim.

## Session Log
- 2026-08-11: Session created
- 2026-08-11: Reviewed herdr skill, helper, tests/research, and upstream herdr docs. Sent
  tim a skeptical assessment: nonce echo and per-recipient locking improve best-effort
  delivery but cannot by themselves guarantee delivery to blocked or unknown agents.
- 2026-08-11: Agreed on a three-valued delivery contract (`observed`, `accepted`,
  `undeliverable`), blocked-state gating, ownership-checked per-recipient locks, repeatable
  seed/withdraw/sync verbs, and explicit no-mailbox limitations. Updated the skill and
  added `reference/protocol.md`; tim implemented the helper and tests.
- 2026-08-11: Focused comitatus validation passed: 182 tests, plugin metadata validation,
  and strict Claude manifest validation. Bumped comitatus to 0.7.1.
- 2026-08-11: Corrected the default lock-root regression found by the full suite, aligned
  the docs with delivery ids and mandatory seed replies, and corrected the final plugin
  version to 0.8.0. Full repository validation now passes (445 tests); Codex marketplace
  install and strict Claude manifest smoke tests also pass.

## Next Steps
1. Hand off the reviewed diff and its remaining no-mailbox limitation.
