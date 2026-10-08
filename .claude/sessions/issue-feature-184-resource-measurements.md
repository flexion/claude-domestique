# Session: mantra collect trustworthy resource measurements with explicit coverage

## Details

**Issue**: #184
**URL**: https://github.com/flexion/claude-domestique/issues/184
**Branch**: issue/feature-184/resource-measurements
**Type**: feature
**Created**: 2026-10-08
**Status**: in-progress
**Lead**: kit (Codex, medium effort)
**Verifier**: pip (Claude, medium effort)

## Goal

Mantra: collect trustworthy resource measurements with explicit coverage. Use the GitHub issue body as the acceptance criteria.

## Approach

Implement a bounded, opt-in passive collector separately from behavior.js. Document Claude/Codex hook and runtime-stream contracts first; retain only measurement fields, never message content or reasoning. Aggregate native usage snapshots by host identity, preserve categories, use interval union for overlapping observations, and expose unknown values wherever events cannot establish a measurement. Hooks capture supported lifecycle/tool observations and project measurement fields from bounded host-provided transcripts; omit an additional importer/runner. Reports carry run identity, observation time, units and per-metric coverage. Disabled is the default; collection never injects agent feedback. Tests cover duplicates, overlap, incomplete records, classification, bounds, concurrent hooks and disable behavior. Pip independently verifies the contract and behavior; rex consumes the validated report for #185. No edits to assessment guidance or behavior.js. Commit local changes and rebase onto origin/main at the operator's latest request. No push, PR, issue closure, or beads.

## Session Log

- 2026-10-08: Worktree and paired agents launched from refreshed origin/main at operator request; session initialized before task assignment.
- 2026-10-08: Fetched #184, inspected official host contracts and coordinated with tim/sly/rex. Implemented separate passive collector with host-specific hook registration and bounded measurement-only transcript projection. Removed persistent locks after reproducing verifier's timeout/concurrency finding; parallel journal preservation and abandoned-lock tests pass. Mantra bumped to 0.7.0. Focused suite passes; metadata and Claude plugin validation pass. Full suite rerun outside sandbox because local test sockets were denied. Pip is verifying probes/behavior independently.
- 2026-10-08: Operator simplicity direction relayed by hal: removed extra offline CLI/runner. Kept live hooks because #185 needs PostToolUse observations within single-turn tasks. Actual human-stop episodes, human wait and request latency remain unknown; notifications are explicitly not episodes. AC2/AC4 are partial and must not be claimed fully satisfied. External hook overhead evidence is in docs/research/resource-measurements-overhead.json for #185.
- 2026-10-08: Final simplification removes all shipped resource-hook registrations and Codex hook overrides; pilot participants explicitly install settings hooks. Ordinary plugin users incur no collector launch cost. Fixed replayed pairs adding extra intervals and retained samples when transcripts are missing. Independent pip verification passes, including live Claude token comparison, disabled/no-files behavior, assess invocation on both hosts, metadata and isolated Codex install. Full npm test passed; final focused and scripts suites pass; strict Claude root/mantra checks and final isolated Codex smoke pass. Codex hook execution remains fixture-tested rather than live-verified.
- 2026-10-08: Removed a speculative native-execution adapter after pip found its protocol events absent from sampled Codex rollouts. Final focused suite passes, and pip's independent fixtures remain passing. Delivered a frozen archive of implementation/tests/contracts/evidence to rex for #185, pending receipt confirmation. Active execution union remains unknown; hook bracket union stays separate and observable.
- 2026-10-08: Rex verified the archive checksum and extracted the verified source into #185. Implementation/verification handoff is finished; no commit, push, PR, issue closure or beads were performed.
- 2026-10-08: Operator requested token efficiency in both old/new injections and clarified expectation of resource-awareness feedback. Explained #184 passive scope versus #185 display. Coordinating compact final recurring paragraphs with tim (#181), sly (#182), mae (#183), each retaining required distinctions and fresh behavioral checks; rex (#185) owns compact display. Concrete display sample shrinks from 270 to 131 characters by sharing units/coverage rather than repeating per field; these are text sizes, not exact token counts. Keep frozen paired experiments separate from any later renderer change. The #184 collector adds no injected context.

- 2026-10-08: Rex adopted compact resource display before any paired run began, so comparisons use one intervention. Independently inspected representative output: 130 characters versus prior 270, sharing units/coverage while retaining timestamp, separate cache categories, unknown versus zero, differing coverage and acquisition flags. Ran current #185 Mantra suite: 60 tests pass. Guidance remains SessionStart-only. Existing objective/research/assessment paragraph compression is owned by tim/sly/mae with fresh behavioral checks pending; exact token savings remain unmeasured.

- 2026-10-08: Existing-injection follow-through: mae adopted corrected assessment compression (500 to 460 characters) after eight fresh paired cases showed no observed regression, with existing criterion limitations retained. Tim's compact objective passed fifteen conversations; reviewer identified dropped research-campaign distinction, which tim restored for a scope recheck (558 characters versus prior 670). Sly removed duplicate assess invocation while retaining external-contract/reference clauses; known format case passed with authoritative lookup and independent repair checks. These owner-branch changes await normal integration and combined guidance checks; no exact-token or behavioral-improvement claim.

- 2026-10-08: Assembled final owner paragraphs and obtained pip independent textual-composition approval: one trigger per skill, no conflicting scope, no measurement counters in behavior guidance. Recorded candidate and limitations in docs/reviews/recurring-injection-efficiency.md. Combined live behavior/host rendering remains unverified; final exact objective checks stay with tim.

- 2026-10-08: Tim delivered final scope-restored objective source; independently confirmed its SHA256. All five exact-source cases passed once with jay approval, separate from earlier stricter wording. Updated recurring-injection review; no behavioral-improvement claim. Owner final checks are finished; combined live integration remains unverified.

- 2026-10-08: Reviewed completed #185 outcome and independent fixation/accounting reports: no demonstrated outcome benefit, one missed necessary ask without causal attribution. Rex recommends retaining passive opt-in collection and ending display evaluation; experimental replay seam remains opt-in with no default registration. Updated efficiency review with actual display sizes and deployment distinction. #185 comparison is finished; combined guidance integration remains separate.

- 2026-10-08: Operator authorized local commit and rebase onto origin/main. Re-ran full npm test and metadata validation successfully; reviewed criteria with AC2/AC4 still partial. Latest origin/main contains #181–183 guidance. Committing the passive collector and review/session evidence before rebasing; no push or PR authorized.

- 2026-10-08: Rebase resolution preserves origin/main's merged #181–183 guidance and rewritten README. Reconciled the collector feature bump onto current Mantra 0.7.2 as 0.8.0 in all metadata; original 0.7.0 verification/archive provenance remains historical. Added passive-pilot section to current README. Post-rebase validation follows; no push or PR.

## Files Changed

- Session and branch metadata initialized.
- mantra/lib/resources.js; mantra/hooks/resources.js; focused collector tests; mantra/context/resources.md; mantra/README.md and synchronized version manifests. Default hooks and behavior.js are unchanged.
- docs/research/resource-measurements.md and resource-measurements-overhead.json.
- docs/reviews/resource-measurements-verification.md (independent verifier's evidence).

## Next Steps

Injection-efficiency implementation and textual review are recorded; owner final objective recheck passed; combined live integration remains unverified. No #184 collector changes are needed. AC2/AC4 remain partial: supported inputs cannot establish active execution intervals, per-request latency, human wait or distinct human-stop episodes. Preserve these limitations in any later review or issue update. Local commit and rebase are authorized; finish rebase and validate integrated changes. No push, PR, issue closure or beads without further instruction.
