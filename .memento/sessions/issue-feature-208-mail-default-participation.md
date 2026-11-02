# Session: mail-default-participation

## Details
- **Branch**: issue/feature-208/mail-default-participation
- **Type**: feature
- **Created**: 2026-11-02
- **Status**: in-progress (implemented, awaiting final verification and commit approval)

## Goal
GitHub #208: comitatus mail participates by default, so herdr and native agents are interchangeable peers. A generated handle is the wire identity and an optional alias is the human label. The roll is pruned.

## Session Log
- 2026-11-02: Intake by tim (lead), with ivy (codex) as independent verifier. Plan: `.pipeline/208-plan.md`. Plan review: `.pipeline/208-plan-review.md`. Diff review: `.pipeline/208-diff-review.md`.
- Every source premise of the issue was confirmed. Claude and Codex (0.166.0) hooks both have the long-lived host as their parent process, so `host_pid` works as a liveness hint.
- Implemented comitatus 2.3.0:
  - `deriveHandle` / `validAlias` / `aliasEnv` (identity)
  - `alias` card field, a bounded alias-file read, and card-only `pruneRoll` at SessionStart with an inode re-check (roll)
  - a resolver-aware pickup budget and render (mail)
  - the hook: default-on, `COMITATUS_ALIAS=off`, alias seeded from env or herdr
  - docs and spec pointer
- ivy found a prune/resume race in directory deletion. Pruning is now card-only, and directory reclamation is in the backlog.
- Validation: every package suite passes, `validate:plugins` passes, the strict Claude validators (marketplace + comitatus) pass, the Codex install smoke test passes, and the skill probe fires `comitatus:mail` on Claude and Codex.

- The user asked to close both follow-ups in this change:
  - herdr renames are tracked through `herdr agent get <pane>` at turn boundaries, with a `herdr-name` provenance file;
  - directory reclamation now runs under a per-participant lock (`lib/comm/lock.js`), which the hooks hold for their whole run and the sweeper try-locks.
- Locks are broken only when the owner is dead or its pid was reused, with breakers serialized.
- ivy found three filesystem races in the rename-token design before it was replaced (`.pipeline/208-addendum-review.md`).

- ivy's final verification found two more problems, and both are fixed:
  - the breaker guard could admit two holders, so breaking is now a right keyed by the stale lock's token and won by exclusive create;
  - expiring a temp file could interrupt a send, so senders now use unique, never-reused temp names.
- ivy re-verified with no remaining required changes (`.pipeline/208-final-verification.md`).
- Final validation: every package suite passes (comitatus 129, including an 8-process crash stress test), `validate:plugins` and the strict Claude validators pass, and the Codex install smoke test passes.

## Next Steps
1. User approves the commit and PR (`#208 - participate in mail by default`).
