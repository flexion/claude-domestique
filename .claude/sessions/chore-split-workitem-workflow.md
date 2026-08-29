# Session: split-workitem-workflow

## Details
- **Branch**: chore/split-workitem-workflow
- **Type**: chore
- **Created**: 2026-08-29
- **Status**: complete

## Goal
Define independently testable, shippable vertical slices for the autonomous-work-item workflow. This branch documents the slice boundaries; later work implements them.

## Approach
Use the 1,118-line document preserved at `HEAD` as the immutable extraction source. Sly owns ports, discharge, reference implementation, and walking skeleton; Tim owns reconstruction, the boundary bundle, and the final spine/index. Every destination uses ordered YAML frontmatter, a matching human-facing header/table, explicit source ranges, and links to shared contracts rather than duplicated schema.

## Session Log
- 2026-08-29: Session created
- 2026-08-29: Sly and Tim assessed lifecycle and artifact cuts as horizontal. Agreed, pending operator approval, on five substantive vertical workflow documents plus a thin index/spine: item reconstruction; boundary bundle authoring, adversarial review, and freezing; frozen-bundle delivery through handoff; adapter/runtime integration; and reference-instrument assurance. The reconstruction contract must be explicitly linked into the boundary-bundle document without schema duplication.
- 2026-08-29: Tim relayed an operator reframe: each slice must ship an atomic, usable artifact and be independently testable, with a test column in the design grid. The team assessed the existing linter seams as useful components but not vertical slices. The proposed first increment is a walking skeleton using one concrete Beads adapter to claim an item, append/reconcile a run record, freeze a trivial boundary, execute one mechanical gate, and hand off; its package setup is a task inside that increment, not a standalone slice.
- 2026-08-29: Tim relayed operator approval to make this branch define (not implement) seven slice documents. Ownership proposed: Sly writes tracker-and-forge-ports, discharging-the-boundary, the-reference-implementation, and walking-skeleton; Tim writes reconstruction, boundary-bundle, and the original-doc index/spine after reconciliation. Sly accepted the division but requires direct operator confirmation before creating files. Proposed metadata correction: YAML frontmatter is the machine-readable source of truth; the requested bold boundary statement and table are its human-facing mirror.
- 2026-08-29: Team agreed the slice frontmatter contract: slice, job, ships, gating_test, non_gating, depends_on, terminal_failure_owned, source_lines in that order. gating_test has required status (planned or implemented), command, and evidence; a planned slice commits to a concrete test but CI executes only implemented slices. Cross-cutting prose is assigned by enforcing consumer: the spine owns the ceiling/audit method; ports owns locator resolution; discharge owns test-case collectability; the boundary owns freeze/digest identity; the reference implementation owns js-yaml behavior and linter evidence.
- 2026-08-29: Tim replaced the working-tree original document with the new spine/index and created the reconstruction and boundary documents. The original 1,118-line source remains intact at HEAD; use `git show HEAD:context-emendator/docs/autonomous-workitem-workflow.md` for all extraction ranges. Stop conditions remain in the spine because the orchestrator consumes the registry across slices; discharge links to, but does not repeat, the states it reaches.
- 2026-08-29: Direct operator approval received. Sly created the assigned ports, discharge, reference-implementation, and walking-skeleton slice definitions from the immutable HEAD source. All seven documents pass the ordered-frontmatter check; `git diff --check` passes; the implemented reference-tooling Jest gate passes 174 tests. Reconciliation with Tim remains.
- 2026-08-29: Reconciliation corrected two provenance defects in Sly's documents: discharge no longer falsely claims the spine-owned stop-state range, and reference implementation now owns the tested-domain limits table, bounded-circularity explanation, fixtures, and audit source ranges. Headers, whitespace, and the 174-test reference gate pass again; Tim is updating final coverage and inbound pointers.
- 2026-08-29: Final coverage review found a material citation loss in discharge. Restored separate GOAL/HOW/JUSTIFICATION/IMPACT blocks for implementation, mechanical gate, semantic review, and handoff, including Lightman, Sharma, Zheng, and Petersson citations; removed the boundary-owned line 543 from discharge provenance. Targeted provenance checks, whitespace validation, and the 174-test reference gate pass.
- 2026-08-29: Tim completed the final coverage and inbound-pointer reconciliation. All seven frontmatter contracts and dependencies validate; `git diff --check` and the full `npm test` suite pass. The branch remains uncommitted pending operator integration choice.
- 2026-08-29: Final commit prepared after the operator selected push and PR. The seven slice documents, machine-readable headers, source coverage, and inbound references are reconciled; full tests are green.

## Files Changed
- `.claude/sessions/chore-split-workitem-workflow.md`
- `.claude/sessions/chore-satisficing-boundary.md`
- `docs/superpowers/plans/2026-08-29-define-autonomous-workitem-slices.md`
- `docs/superpowers/plans/2026-08-28-finish-autonomous-workitem-workflow.md`
- `context-emendator/docs/autonomous-workitem-workflow.md`
- `context-emendator/docs/reconstructing-the-item.md`
- `context-emendator/docs/the-boundary-bundle.md`
- `context-emendator/docs/tracker-and-forge-ports.md`
- `context-emendator/docs/discharging-the-boundary.md`
- `context-emendator/docs/the-reference-implementation.md`
- `context-emendator/docs/walking-skeleton.md`
- `context-emendator/scripts/lint-boundary.js`

## Next Steps
1. [x] Choose branch integration: local merge, PR, or keep the worktree unchanged.
