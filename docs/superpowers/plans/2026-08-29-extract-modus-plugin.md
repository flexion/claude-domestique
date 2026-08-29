# Modus Plugin Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the autonomous work-item workflow into a self-contained `modus` plugin whose frozen, per-item definition of done is the verification boundary.

**Architecture:** `modus/` owns all assets that describe, test, or substantiate the autonomous work-item workflow. This extraction empties `context-emendator/` on its own branch; the unrelated auditor exists on `chore/agent-workflow-plugin` and must be integrated before or together with this branch so that it recreates that directory. Current-path references move to `modus`; the linter retains a separately named historical Git-object path for pre-split provenance.

**Tech Stack:** CommonJS, Node.js 24+, Jest, js-yaml, Claude/Codex plugin manifests.

**Spec:** User-provided extraction brief and the seven workflow slice documents under `context-emendator/docs/` at `a0896d1`.

## Global Constraints

- Move the seven slice documents, scripts, tests, fixtures, baseline, and all 59 workflow research files together with `git mv`.
- Use `modus` consistently in package, marketplace, manifests, README, live commands, and planned artifact paths.
- Keep `context-emendator/docs/autonomous-workitem-workflow.md` only as the named historical source path queried against Git revision `70e2687`.
- Do not change relative inter-document Markdown links or `lint-boundary.js` relative documentation pointers.
- New plugin version is `0.1.0`; add `modus` to the root workspace and version-bump script registry.
- The historical plans under `docs/superpowers/plans/` and the review records retain their original commands as dated evidence; do not rewrite those historical path references.

---

### Task 1: Establish the Modus Plugin Boundary

**Files:**
- Create: `modus/package.json`
- Create: `modus/.claude-plugin/plugin.json`
- Create: `modus/.codex-plugin/plugin.json`
- Create: `modus/README.md`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `scripts/bump-version.js`

**Interfaces:**
- Consumes: marketplace validation convention used by the existing six plugins.
- Produces: an installable `modus@0.1.0` plugin declaring its work-item, frozen-DoD purpose.

- [x] Add matching package and host manifest metadata for `modus` at version `0.1.0`.
- [x] Add an appended marketplace entry and root workspace entry for `modus`.
- [x] Add root `test:modus` and `test:coverage:modus` scripts, and include them in the aggregate suite commands.
- [x] Add `modus` to `scripts/bump-version.js` so subsequent plugin changes can use the repository-standard version workflow.
- [x] Write a README whose first substantive statement says that Modus refines a vague ticket into a per-item definition of done, freezes it before implementation, verifies against it, and hands off unverifiable work.

### Task 2: Relocate the Complete Workflow Product

**Files:**
- Move: `context-emendator/docs/` workflow slices and `docs/research/` corpus to `modus/docs/`
- Move: `context-emendator/scripts/` to `modus/scripts/`
- Move: `context-emendator/tests/` to `modus/tests/`

**Interfaces:**
- Consumes: the current workflow product rooted at `context-emendator/`.
- Produces: a self-contained `modus/` directory; no work-item asset remains in the squatted path.

- [x] Move the seven slice documents, all research files, scripts, unit tests, fixtures, transcriptions, and `mutation-baseline.json` with `git mv` without changing their bytes during relocation.
- [x] Confirm `context-emendator/` is empty on this branch and flag the required merge ordering with `chore/agent-workflow-plugin`.

### Task 3: Rewrite Current References and Preserve Historical Provenance

**Files:**
- Modify: all moved slice documents, research records, scripts, tests, and baseline with current `context-emendator/` paths
- Modify: `modus/scripts/lint-slice-headers.js`
- Modify: `modus/scripts/__tests__/lint-slice-headers.test.js`

**Interfaces:**
- Consumes: `modus` as the current artifact root and `70e2687:context-emendator/docs/autonomous-workitem-workflow.md` as immutable source history.
- Produces: live commands that execute against `modus`, plus a provenance linter that reads the correct historical source.

- [x] Replace all current artifact paths and Jest commands that now identify the live product with `modus/`; preserve dated plan and review records as historical evidence.
- [x] Retain the historical Git-object path in the linter and test as `HISTORICAL_SOURCE_PATH`, with a comment explaining why it cannot be moved.
- [x] Do not alter relative Markdown cross-links or `lint-boundary.js`'s relative documentation references.
- [x] Add or adjust tests only where observable linter path naming/contract changes require it.

### Task 4: Verify Extraction Integrity

**Files:**
- Test: `modus/scripts/__tests__/lint-boundary.test.js`
- Test: `modus/scripts/__tests__/lint-slice-headers.test.js`
- Test: `modus/scripts/__tests__/mutation-sweep.test.js`

- [x] Run the three focused Modus Jest suites with `--runInBand`.
- [x] Run the slice-header linter to prove it resolves the `70e2687` historical source and validates the relocated documents.
- [x] Run `npm run validate:plugins` and the strict Claude and isolated-Codex manifest validation for Modus.
- [x] Run `rg` scans proving no live `context-emendator` reference remains and every live Modus path resolves.
- [x] Review the diff for a pure relocation plus stated metadata/reference changes, excluding session/plan artifacts.
