# Session: mantra-codex-resource-context

## Details
- **Branch**: chore/mantra-codex-resource-context
- **Type**: chore
- **Created**: 2026-10-09
- **Status**: complete

## Goal
Rename the resource pilot context mode to `inject` and support Codex context delivery and passive collection on other events. Keep historical research/reviews unchanged; do not file beads. The operator subsequently authorized commit, push and PR creation.

## Approach
Verify the installed Codex 0.161.0 contract before implementation. Rename the opt-in mode and formatter, preserve Claude behavior, render native Codex categories, and emit the documented hookSpecificOutput shape on supported events. Test host/event boundaries and fresh measurements, then bump Mantra and validate both hosts.

Operator-approved follow-up: add a repository-owned probe version selector and regression test, with an explicit opt-in to trust vetted hooks in the throwaway Codex home. Codex 0.161.0 exec does not grant hook or project trust automatically; hook commands spawn directly outside the model sandbox, so retain read-only. Run the live resource probe in a non-repository temporary workspace and inspect model quotes plus resource snapshots.

Operator-approved continuation: run three turns in one isolated Codex 0.161.0 session, using exec resume for turns two and three. Compare injected usage with saved snapshots and rollout rows; document observed host lag and the outside-sandbox hook trust warning.

## Acceptance Criteria
- [x] Verify the installed Codex hook context contract from authoritative documentation/source before implementation.
- [x] Rename the pilot mode to inject without an alias, support Codex context events and passive fallback, preserve historical research/reviews.
- [x] Bump Mantra once and pass focused/full tests plus both hosts’ metadata checks.
- [x] Add isolated probe version/trust options with regressions and document outside-sandbox repository hook trust.
- [x] Verify live delivery and numeric token catch-up across three turns in one Codex session, matching snapshots/rollout; document observed lag.

## Session Log
- 2026-10-09: Session created
- 2026-10-09: Checked official hook documentation at https://learn.chatgpt.com/docs/hooks and installed-version source at https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/hooks/src/schema.rs. SessionStart, UserPromptSubmit, PreToolUse and PostToolUse accept hookSpecificOutput.additionalContext with hookEventName; Stop/SessionEnd have no added-context output. Chose `inject` to name insertion into model context.
- 2026-10-09: Renamed the mode, formatter, guidance constant and tests; added Codex native-category formatting and context output on supported configured events with passive fallback elsewhere. Regression tests failed before implementation and passed afterward. Updated current pilot docs and evaluation grading terminology, preserving historical research/reviews. Bumped Mantra once to 0.10.0.
- 2026-10-09: Validation passed: Mantra 77 tests; full npm test 721 tests / 23 suites (retried outside sandbox because Vernaculus binds local servers); npm run validate:plugins; pinned Claude 2.1.226 strict marketplace and Mantra validation; isolated Codex 0.147.0 marketplace add / Mantra install and installed metadata assertion (retried with network permissions). No live model context-delivery probe was run. No beads, commit or push.
- 2026-10-09: Applied review request to keep PreToolUse passive on Codex and avoid duplicate per-tool observation blocks. Official docs at https://learn.chatgpt.com/docs/hooks#posttooluse state that PostToolUse also runs for Bash commands exiting with nonzero status. Updated the event regression test (observed failure before the fix) and pilot docs. Version remains the branch's single 0.10.0 bump.
- 2026-10-09: Review validation passed: all 77 Mantra tests, repository metadata validator, pinned Claude 2.1.226 strict marketplace and Mantra validators, and git diff --check. No commit or push.
- 2026-10-09: Started operator-approved harness and live-probe follow-up. Checked official hook trust docs and Codex rust-v0.161.0 exec/src/lib.rs, config/src/loader/mod.rs and hooks/src/engine/command_runner.rs before running. No plugin changes or additional version bump are planned.
- 2026-10-09: Added --codex-version (default remains @openai/codex@0.147.0), explicit --codex-trust-hooks for vetted automation, a scripts regression suite and its root test/coverage wiring, and one-line AGENTS.md guidance. Trust is scoped to the throwaway home/workspace; model tools stay read-only. Tests observed failures for missing version/trust handling before implementation.
- 2026-10-09: Initial sandbox probe failed during npm setup. Elevated live runs reached the model but reported resource context absent and wrote no snapshots; diagnostic hook instrumentation showed workspace hooks never started. The trusted /var/... path differed from Codex's canonical /private/var/... cwd. Codex config/src/loader/mod.rs lines 1388-1426 confirmed the lookup; resolving the temp workspace made the original resource command work. Added a symlink regression (observed failure) and fixed the harness's generated trust entry with fs.realpathSync(cwd).
- 2026-10-09: Final live Codex 0.161.0 probe PASS using the original temporary-path spelling and unchanged resource hook: BEFORE quoted Resources at 2026-10-09T10:17:39.927Z with wall=83 ms; AFTER quoted a refreshed line at 2026-10-09T10:17:45.130Z with wall=5286 ms, plus the full resource guidance. Exactly one printf shell command completed successfully. Journals contain SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop/SessionEnd. Final snapshot is Codex run 01a1202b-164d-7fc1-b1c1-9ce7ed191e39, acquisition complete for bounded reads (truncated=false), observed_at 2026-10-09T10:17:52.272Z, input_tokens=30969. Early injected token values were unknown until transcript usage became available; pilot coverage remains partial.
- 2026-10-09: Live evidence (prompt, command arguments, raw events/stderr, model quotes) is in /private/var/folders/bk/6vcq_v6n3bl6qb6m90vhhfcc0000gn/T/mantra-live-evidence-0O8QoG; resource snapshots/journal are in /private/var/folders/bk/6vcq_v6n3bl6qb6m90vhhfcc0000gn/T/mantra-live-resources-j6PGCh. Preflight sources: https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks; https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/exec/src/lib.rs#L612; https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/hooks/src/engine/command_runner.rs#L225; https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/config/src/loader/mod.rs#L1088.
- 2026-10-09: Follow-up validation passed: scripts 104 tests; full npm test 724 tests / 24 suites; repository metadata validator and diff check. Harness changes remain separate repository-owned paths; no further Mantra edits or plugin bump, and no beads, commit or push. Live validation is specific to Codex 0.161.0 on this macOS environment.

- 2026-10-09: Operator-approved three-turn Codex 0.161.0 experiment PASS in one session (01a12048-0536-7a61-9eb8-980e0d905fc2) and one throwaway CODEX_HOME. Fresh first turn used probe-skill; turns two and three used codex exec resume with read-only tools and the same trusted temp workspace/resource directory. Each turn completed exactly one printf command. Turn 1 injected unknown counts; turn 2 BEFORE/AFTER quoted input=30972 output=392 cached=27520 cache-write=0 reasoning=0, matching turn 1 snapshot; turn 3 BEFORE/AFTER quoted input=64738 output=1158 cached=55296 cache-write=0 reasoning=22, matching turn 2 snapshot. All six unique quoted observation lines match the journal hook receipt and latest preceding rollout usage (including initial unknowns). Usage rows after the post-tool hook were timestamped 5–8 ms later, explaining the observed previous-turn totals without a collector change.
- 2026-10-09: Full per-turn BEFORE/AFTER quotes, archived snapshots/journals, rollout and machine-checked comparisons are in /var/folders/bk/6vcq_v6n3bl6qb6m90vhhfcc0000gn/T/mantra-live-evidence-dd84gF (quoted-evidence.md and verification.json). Added AGENTS.md warning that trusting hooks with --cwd trusts the real repository’s hooks outside the Codex sandbox; resources.md records observed lag on both hosts. No runtime or harness extension and no further version bump. Focused tests pass (Mantra 77; scripts 104), repository metadata and pinned strict Claude marketplace/Mantra validators pass; diff check passes. The Claude timing statement reflects the operator’s existing observation, not a new Claude probe. Isolated pinned Codex 0.147.0 metadata installation also passed after retrying the sandbox DNS failure with network access. No beads, commit or push.

- 2026-10-09: Operator authorized commit, push and PR. Final review found no unrelated changes or edits to historical research/reviews; all acceptance criteria are met. Pre-commit full npm test passed 724 tests / 24 suites, repository metadata validation and staged diff checks passed. Publishing the Mantra and repository-owned probe changes as separate commits; the completed session is included with the final code commit.

## Files Changed
- mantra/hooks/resources.js and resource-collection/resource-injection Jest suites
- mantra/lib/resource-inject.js and its Jest suite (renamed from the previous formatter)
- mantra/README.md, DEVELOPMENT.md, ROADMAP.md, context/resources.md and context/test.md
- docs/evals/resource-visibility/_shared/grading.md
- mantra/package.json, both plugin manifests and .claude-plugin/marketplace.json
- scripts/probe-skill.js, scripts/__tests__/probe-skill.test.js, root package.json and AGENTS.md (separate harness follow-up)

## Next Steps
Implementation, live delivery and mid-session token catch-up verification are complete. Push the two validated commits and open a pull request against main, as authorized; await review.
