# Session: mantra test whether resource visibility improves useful outcomes

## Details

**Issue**: #185
**URL**: https://github.com/flexion/claude-domestique/issues/185
**Branch**: issue/feature-185/resource-visibility-evaluation
**Type**: feature
**Created**: 2026-10-08
**Status**: complete
**Lead**: rex (Codex, medium effort)
**Verifier**: ada (Claude, medium effort)

## Goal

Mantra: test whether resource visibility improves useful outcomes. Use the GitHub issue body as the acceptance criteria.

## Approach

Prepare a bounded eight-run comparison of passive collection versus visible observations across factual, code correction, necessary clarification, and conceptual tasks. Ada authors isolated fixtures and independent outcome oracles; rex owns the protocol and display integration. Alternate condition order across task pairs, pin the host/model/effort/tools/source, and start each run with a fresh fixture workspace. Grade delivered outputs before exposing consumption to ada. Preserve token categories and coverage, record defects/rework/interactions/fixation independently, and include setup, implementation, display, and grading overhead. Keep display observational with no score, budget, quota, or stopping instruction. Coordinate a separate display seam with kit; do not edit behavior.js or assessment guidance. Run the comparison only after independently validated #184 collector evidence is available. Negative or inconclusive observations are valid findings. Run focused tests, metadata checks, host checks and invocation probes; bump mantra once after substantive changes. The initial scope prohibited commits, pushes, PR creation, issue closure and beads; the operator later authorized local commits and rebasing, as recorded below. The operator subsequently authorized push and PR creation; issue closure and beads remain outside scope.

## Session Log

- 2026-10-08: Worktree and paired agents launched from refreshed origin/main at operator request; session initialized before task assignment.
- 2026-10-08: Fetched #185 and dependency #184; inspected Mantra hooks/tests and the existing invocation probe. No existing resource measurement assertion covers the requested intervention. Contacted kit about the validated collector and display seam, informed tim about scope, and delegated fixture/oracle preparation to ada. Approach updated before implementation.
- 2026-10-08: Prepared protocol and four synthetic fixture/oracle sets, moved them outside the shipped plugin to docs/evals/resource-visibility, and replaced custom fixture runners with native node:test/diff checks. Ada independently checked paths and seeded failure detection. Required mid-run display and removed chronology from blind grading packets. Mantra Jest, metadata validation, and both hosts' assess invocation probes passed. Collector validation is still pending; no visibility runs have started.
- 2026-10-08: Kit fixed schema-v1 and collect/readSnapshot API. Wrote renderer tests, observed expected failures, and implemented the renderer. Ada's review found that bare timing/notification fields lose necessary semantics and repeated full reports add needless input cost; narrowed visible observations to token categories and elapsed wall including waits, with fixed guidance exported for SessionStart only. Revised focused tests pass. Full repository tests and pinned Claude marketplace/plugin validation passed before this renderer revision. Collector verification and dependent-source handoff remain pending.
- 2026-10-08: Imported checksum-verified #184 archive with independent review; collector accounting remains unchanged and partial coverage is explicit. Added tested Claude display CLI dispatch; disabled/collect remain silent. Ada verified live mid-run injection with the exact isolated settings. Applied operator token-efficiency direction before successful comparison runs: compact shared units/coverage and explicit category labels, with unknown and differing coverage retained; guidance stays SessionStart-only. Mantra version is 0.8.0 after importing #184's 0.7.0 metadata and one minor bump. Suite passes with the compact renderer. First sandbox launch failed authentication before model usage and was archived; elevated retry succeeded with identical configuration. Eight-run comparison now underway from one frozen compact snapshot; source and manifests live in /tmp/resource-visibility-185-2xLmYw until evidence is finalized.

- 2026-10-08: Six runs reached outcomes from the frozen snapshot; clarification continuation followed the written response policy. Actual response timing is retained, including inspection/operator delay. A coordination FYI accidentally revealed collect-arm asking behavior to ada; both missing-info grades will disclose possible unblinding, while the other three pairs retain randomized blinding. No completed outcome was replaced.

- 2026-10-08: Completed eight runs; ada froze outcome findings before resource disclosure, then verified accounting/freshness and evaluated fixation separately. Three task pairs passed in both arms; collect clarification asked and passed, display clarification did not ask and failed. No fixation observed; no causal claim. Retain passive opt-in and end display evaluation; keep the minimal explicit seam for mode semantics/replayability. All six issue criteria independently verified. Full tests, metadata, pinned Claude validation, isolated Codex installation and both fresh invocation probes passed; cold-cache fixture package warnings were reproduced and removed by excluding docs from root Jest indexing, with independent fresh-cache verification and a final full-suite pass. Evidence, overhead, limitations and recommendation are finalized; no commits or remote mutations.

- 2026-10-08: The operator explicitly authorized committing local changes and rebasing on origin/main. Pre-commit tests and metadata checks rerun; session remains complete. This authorization supersedes the earlier no-commit instruction; no push, PR or issue closure was requested.

- 2026-10-08: Created the authorized local commit and rebased integration onto origin/main c0ea159. Resolved version/README conflicts by retaining Mantra 0.8.0 and all upstream behavioral wording, adding only the resource-pilot section. Full tests, metadata, pinned Claude validation, isolated Codex installation and fresh assess probes on both hosts passed on the merged tree. The frozen resource implementation hashes and experiment evidence remain unchanged.

- 2026-10-08: The operator extended the handoff to mechanical/thematic integration and a Mantra documentation consistency sweep. Rebase is complete. Inspect the integrated hooks and all Mantra references, keep each behavior with its owner, update current documentation and mark older research historical without rewriting frozen evaluation evidence; commit the resulting integration cleanup under the existing local-commit authorization.

- 2026-10-08: Completed the mechanical/thematic integration and documentation sweep with ada's independent review. Preserved upstream behavioral code and frozen resource source/evidence, corrected current rule-loading/counter/coverage claims and setup instructions, removed the then-unused generic testing manual and circular troubleshooting reference, and labelled superseded proposals historical. Full npm test, metadata validation, pinned Claude marketplace/Mantra checks and fresh troubleshooting invocation probes on both hosts passed. Origin/main is an ancestor; Mantra was synchronized at 0.8.0 for that integration. Final local documentation commit is authorized; no push or remote work-item mutation.

- 2026-10-08: The operator requested a further rebase conflict resolution onto merged #184 at origin/main 3b3da10, including thematic consistency, duplication and token efficiency. Preserved upstream collector/accounting and updated verification provenance, retained the explicit display wrapper, and reconciled passive/display documentation. The upstream replacement for the old testing manual is now a concise Mantra-specific guide and is retained with display coverage. Bumped current Mantra metadata to 0.9.0 because main now publishes 0.8.0; the original experiment remains pinned to its recorded source/version. Runtime prompt text is unchanged: collect/disabled inject nothing, display guidance is separate from compact recurring values, and no automatic resource registration was added. Validation passed: full npm test (including 64 Mantra assertions), metadata validation, pinned Claude marketplace/Mantra strict validation, isolated Codex install at 0.9.0, relative-link checks and unchanged frozen source hashes. Token audit: default behavior reminder remains 1,735 characters; optional display guidance remains 234 characters and recorded known refreshes 137–140 characters, with no exact tokenizer claim. Ada independently confirmed collection/accounting and recurring hook text are unchanged, and found an overview regression plus repeated recommendations. Restored the upstream overview and neutral design goal, kept the concise testing guide, and made context/resources.md the recommendation owner with links elsewhere; detailed workflows stay on demand. Ada independently verified the final staged cleanup with no material findings.

- 2026-10-08: The operator explicitly requested commit, push and PR creation. Local implementation and integration commits already exist; refreshed origin/main and checked branch/PR state before publication. Session authority and final file inventory updated before the final commit; the PR will describe the bounded negative/inconclusive findings and coverage limits without claiming a behavioral benefit.

## Files Changed

- Session and branch metadata initialized.
- docs/research/resource-visibility.md: comparison protocol and preparation evidence.
- docs/evals/resource-visibility/: task prompts, starting workspaces, scripted answer, and independent outcome oracles.
- mantra/lib/resource-display.js and its Jest suite: small observational renderer for the stable collector schema.
- Verified #184 dependency files, research/overhead evidence and independent review; resources.js gains #185 display dispatch without changing collection/accounting.
- Mantra README/context and synchronized current plugin metadata at 0.9.0; pilot evidence retains its recorded 0.8.0 snapshot.
- docs/research/resource-visibility-runs/ and docs/reviews/resource-visibility-{outcomes,fixation}.md: reproducible run evidence and independent reviews.
- jest.config.js: documentation fixture/workspace packages excluded from root Jest indexing.
- Root README/AGENTS and Mantra README/DEVELOPMENT/ROADMAP/resource contract: current behavior, ownership and opt-in setup aligned.
- Mantra hook/package descriptions and troubleshoot reference: terminology and ownership corrected; obsolete generic context/test.md replaced by the upstream Mantra-specific testing guide.
- Historical architecture and research proposals: labelled and linked to current guidance.

## Next Steps

Implementation and integration cleanup are complete and validated, with local commits on origin/main. No further comparison is scheduled. The operator authorized committing, pushing and PR creation; publish the validated branch for review. Issue closure remains outside authorization.

## Acceptance Criteria

- [x] Validated #184 measurements; distinct disabled, collect and display modes.
- [x] Observations without scores, countdowns, quotas or automatic stops; requirements/permissions guidance.
- [x] Correctness, missed requirements, subsequent rework, interactions, consumption and fixation separately recorded, including necessary asking.
- [x] Implementation/evaluation overhead recorded with unknowns explicit; no output-per-token score.
- [x] Reproducible evidence, limitations and provisional retain-passive recommendation.
- [x] Negative/inconclusive findings retained; lower consumption with a missed necessary question is not success.
