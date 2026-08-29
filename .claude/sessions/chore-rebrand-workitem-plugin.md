# Session: rebrand-workitem-plugin

## Details
- **Branch**: chore/rebrand-workitem-plugin
- **Type**: chore
- **Created**: 2026-08-29
- **Status**: in-progress

## Goal
Extract the autonomous work-item workflow from `context-emendator/` into a new `modus` plugin, preserving its provenance checks and making its purpose explicit in marketplace metadata.

## Approach
1. Relocate the workflow documents, research corpus, scripts, tests, fixtures, and baseline into `modus/`.
2. Add `modus` package and Claude/Codex manifests, register it in the workspace and marketplace, and document its per-item frozen-definition-of-done purpose.
3. Rewrite current paths to `modus/`, while retaining the pre-split historical Git path used by the provenance linter.
4. Validate the focused suites, plugin metadata, manifests, and complete-reference scan.

## Session Log
- 2026-08-29: Session created
- 2026-08-29: Gus and Nell agreed the extraction scope. The 59-file research corpus moves with the workflow assets; the provenance linter retains the historical `context-emendator` Git-object path because revision 70e2687 has no `modus` path.
- 2026-08-29: Extracted the product into `modus/`, added package and host metadata, and made it a tested root workspace. Independent certification reproduced 179 tests across three suites, resolved the 1,118-line historical provenance source, and passed repository, Claude, Codex, and coverage checks.

## Key Decisions
- The historical source path in `lint-slice-headers.js` and its test is not a current file reference; it remains `context-emendator/docs/autonomous-workitem-workflow.md` and will be named/commented accordingly.
- This branch empties `context-emendator/`. Integrate `chore/agent-workflow-plugin` before or together with this branch so its unrelated context-auditor files recreate the directory.

## Next Steps
1. [x] Record the extraction plan and test expectations.
2. [x] Move the workflow product into `modus/` and add plugin metadata.
3. [x] Rewrite live path references and preserve the historical provenance path.
4. [x] Run focused tests, plugin validation, host manifest checks, and reference scans.
5. [ ] Obtain operator direction before committing or opening a pull request.
