# Session: mantra make research and deliberation proportionate to the decision

## Details

**Issue**: #182
**URL**: https://github.com/flexion/claude-domestique/issues/182
**Branch**: issue/feature-182/proportionate-research
**Type**: feature
**Created**: 2026-10-08
**Status**: complete
**Lead**: sly (Codex, medium effort)
**Verifier**: gus (Claude, medium effort)

## Goal

Mantra: make research and deliberation proportionate to the decision. Use the GitHub issue body as the acceptance criteria.

## Approach

Replace the hook's fixed source quota and the troubleshoot workflow with evidence chosen for the next decision. Demonstrated local defects can proceed from local evidence; uncertain external behavior uses an applicable authoritative reference; consequential unresolved uncertainty is investigated or surfaced. Add proportionate deliberation to assess and companion documentation, preserving required permissions, user constraints, and project validation. Keep the decision inexpensive: no numerical value-of-information calculation, approval artifact, or new completion rules.

Use existing hook delivery tests and fresh agent runs to verify semantic behavior; do not treat source-text assertions as proof of judgment. Gus independently runs contrasting local-typo, uncertain external-format, and consequential-uncertainty cases against current and revised guidance, recording correctness and additional research, review, and human interactions. Validate affected manifests on both hosts, probe both revised skills, bump mantra once after substantive edits, and review the final diff. Coordinate insertion points with tim (#181) and mae (#183). The operator subsequently authorized committing, pushing, and opening an independent PR. Do not close issues or file beads.

## Session Log

- 2026-10-08: Worktree and paired agents launched from refreshed origin/main at operator request; session initialized before task assignment.
- 2026-10-08: Fetched #182; read owning guidance and hook tests; established implementation boundaries with adjacent leads and assigned independent behavioral comparisons to gus. Node 24 confirmed; installed missing test dependencies with npm ci.
- 2026-10-08: Replaced fixed source quota and search loop; aligned hook, troubleshoot, assess, companion guidance, README, development description, and Codex prompt. Removed examples after verifier identified overlap with behavioral fixtures; final guidance gives no fixture-specific solutions. Added a narrow injection regression that rejects the original quota on both events, and confirmed it distinguishes original/revised output.
- 2026-10-08: Bumped mantra to 0.6.4 (small content correction, no new skills or commands). Focused Mantra and repository script suites passed; metadata validator and pinned Claude plugin/marketplace validators passed. Fresh-home Codex installs succeeded; assess fired and surfaced migration uncertainty. An arithmetic-defect prompt returned the correct repair without invoking troubleshoot, so an explicit failing-test diagnosis probe is pending. Full npm test subsequently passed. Final-guidance Codex troubleshoot fired on the failing clamp test, verified the repair directly, and requested no external research. Companion links resolve; independent Claude comparisons remain in progress.

- 2026-10-08: Hal relayed the operator simplification preference. Reassessed the final change: removed fixed quota, open-ended searching, source template, and fixture-specific examples; no decision engine or approval machinery added. The narrow hook regression guards the observed old quota. Asked gus to independently assess avoidable complexity.

- 2026-10-08: Independent comparison found baseline and revised local fixes both succeeded without external research; risk cases both surfaced destructive consequences. Revised external-format runs implemented RFC grammar from recall without lookup, so strengthened the reference condition to format/protocol/third-party API contracts that determine correctness and are not established by available evidence. Simplified repeated policy blocks: troubleshoot owns evidence workflow, assess and companion link to it, hook is shorter, maintainer scope remains in README. Gus is checking final external-format cases; no cost-reduction claim is supported by the earlier cases.

- 2026-10-08: Final simplified-guidance Codex external-format probe fired troubleshoot and consulted authoritative protocol/runtime references, with no explicit lookup directive in the prompt. Focused Mantra and repository script suites plus plugin metadata/Claude strict manifest validation passed again after the semantic change. Independent Claude final-format results and durable comparison report remain pending.

- 2026-10-08: Shortened-hook Claude format run passed repair tests but again skipped reference consultation. Restored explicit operational instruction in the hook: consult before implementing a change dependent on an unestablished format/protocol/third-party API contract, and recall is not evidence for that contract. Aligned troubleshoot wording. Generic bug-prompt nonlookup remains a reported reliability limitation; final paired prompt will directly express uncertain external forms as acceptance criterion requires.

- 2026-10-08: Reviewed the independent comparison report; corrected aggregate review counts and labeled Codex probe versions honestly. Both baseline and v4 explicitly uncertain Claude questions consulted references and passed independent checks. Generic lookup reliability remains untested for v4. Kit relayed the operator token-efficiency direction: removed only the duplicated assess invocation from the research hook paragraph, preserving the first paragraph invocation and the tested evidence wording. Focused tests passed; gus is repeating the known format case on that final compression.
- 2026-10-08: Final source fingerprint `ead6226` verified against the report. Gus approved the final source after the format recheck: authoritative RFC consultation, passing repair tests and independent checks, no added review agents. Reviewed durable evidence, preserved optional human deferrals and excluded host failures. All acceptance criteria have supporting evidence on their stated contrasting cases; generic-prompt reference lookup remains unverified for the final wording, and no general overhead reduction is claimed. Full suite passed earlier; focused tests passed after the final hook edit; metadata and both host manifest/install checks passed. Work is ready for review, left uncommitted as instructed.

- 2026-10-08: Operator authorized commit, push, and independent PR. Refreshed origin/main and confirmed this branch starts at its current head; no existing PR found. Reran the full npm test suite, plugin metadata validation, and diff whitespace checks successfully. Finalized this session before the atomic implementation commit. Behavioral limitations and neighboring-branch integration requirements remain documented.

## Acceptance Criteria

- [x] Replace unconditional source counts and open-ended searching with decision-relevant evidence; align injected and companion guidance.
- [x] Demonstrated local defects proceed with local evidence and no external source quota.
- [x] Explicitly uncertain external-format question consults an authoritative reference when it determines implementation; final generic-prompt lookup remains unverified.
- [x] High-consequence uncertainty is surfaced or investigated rather than silently guessed.
- [x] Record paired correctness, research, review, and human-interaction evidence without numeric value calculations or per-action approval documents.

## Files Changed

- Session and branch metadata initialized.
- `mantra/hooks/behavior.js` and `mantra/hooks/__tests__/behavior.test.js`.
- `mantra/skills/troubleshoot/SKILL.md` and `mantra/skills/assess/SKILL.md`.
- `mantra/context/behavior.md`, `mantra/README.md`, and `mantra/DEVELOPMENT.md`.
- Mantra package, host manifests, and marketplace version metadata.
- `docs/research/issue-182-proportionate-research.md` (independent behavioral comparison).

## Next Steps

Commit, push, and open the independent PR as authorized. Preserve the behavioral limitations in the comparison report. Later integration must compose #181's objective paragraph and #183's assessment changes with #182's research paragraph, reconcile Mantra version metadata, and check the combined injection. Issue closure and beads actions remain outside this task.
