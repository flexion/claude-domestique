# Finish Autonomous Work-Item Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a truthful, internally consistent single-document baseline for the autonomous work-item workflow before a separately reviewed document split.

**Architecture:** Treat the existing workflow, linter, fixtures, and mutation sweep as one evidence bundle. Audit every claim about executable behavior against the checked-in implementation and every numerical claim against the generated measurement; correct the document or explicitly bound an unresolved limitation, without changing workflow behavior in this pass. Commit that coherent snapshot before the later structural split.

**Tech Stack:** Markdown, Node.js CommonJS, Jest, YAML fixtures, `js-yaml`.

> **Superseded on 2026-08-29.** This plan established the single-document baseline it describes.
> That document has since been split by vertical slice on `chore/split-workitem-workflow`, so the
> file paths in the tasks below refer to the pre-split source, recoverable with
> `git show HEAD:context-emendator/docs/autonomous-workitem-workflow.md`. The spec is now seven
> documents: `autonomous-workitem-workflow.md` (index and spine), `walking-skeleton.md`,
> `tracker-and-forge-ports.md`, `reconstructing-the-item.md`, `the-boundary-bundle.md`,
> `discharging-the-boundary.md`, and `the-reference-implementation.md`.

**Spec:** `context-emendator/docs/autonomous-workitem-workflow.md` — now the index for the six
sibling slice documents rather than the whole specification.

## Global Constraints

- Preserve mac's existing uncommitted linter, fixture, mutation-sweep, and session work; do not discard or rewrite it wholesale.
- This pass may correct prose and session state only. A mismatch that requires changing linter behavior is recorded as a bounded limitation for later, not silently repaired.
- Do not split the workflow document in this commit; the user will provide one additional requirement before the split.
- Validate executable claims with the focused Jest suites and generated mutation measurement before committing.
- Do not make tracker-, model-, or source-specific claims stronger than their cited evidence supports.

---

### Task 1: Establish the audit baseline

**Files:**
- Read: `context-emendator/docs/autonomous-workitem-workflow.md`
- Read: `context-emendator/scripts/lint-boundary.js`
- Read: `context-emendator/scripts/mutation-sweep.js`
- Read: `context-emendator/scripts/__tests__/lint-boundary.test.js`
- Read: `context-emendator/scripts/__tests__/mutation-sweep.test.js`
- Read: `context-emendator/tests/mutation-baseline.json`

**Interfaces:**
- Consumes: the uncommitted workflow document and executable reference artifacts.
- Produces: a line-specific list of unsupported, contradictory, stale, or numerically inconsistent claims.

- [ ] **Step 1: Run the focused evidence suite**

Run:

```bash
npx jest context-emendator/scripts/__tests__/lint-boundary.test.js context-emendator/scripts/__tests__/mutation-sweep.test.js --runInBand
```

Expected: PASS; record the actual test count and any generated sweep totals.

- [ ] **Step 2: Compare prose claims with executable behavior**

Check the document's statements about linter passes, code classes, terminal suppression, fixture coverage, mutation coverage, and external verification against the named source and test files. Mark claims as: supported, overstated, stale, or not mechanically verifiable.

- [ ] **Step 3: Check numerical consistency**

Reconcile every visible count for tests, emission sites, mutations, survivors, fixtures, and document length. The document must either use one reproducible measurement or identify the two measurements, their different methods, and why neither is substituted for the other.

### Task 2: Finish the single-document baseline

**Files:**
- Modify: `context-emendator/docs/autonomous-workitem-workflow.md`
- Modify: `.claude/sessions/chore-satisficing-boundary.md`

**Interfaces:**
- Consumes: Task 1's evidence list.
- Produces: a self-contained workflow document whose behavioral claims exactly match the current reference implementation and whose open implementation work is marked as a limit.

- [ ] **Step 1: Correct factual and semantic mismatches**

Make the smallest prose changes that resolve every evidenced discrepancy. Retain citations and the distinction between measured results, hypotheses, and local design choices. Do not remove caveats merely to shorten the document.

- [ ] **Step 2: Bound unfinished implementation work**

Keep the YAML round-trip loader, test-case collectability, external verification-stage encoding, calibration baseline, and unverified source readings in explicit limitation/follow-up language. Do not imply that any is implemented or validated.

- [ ] **Step 3: Update the branch session**

Append the audit result, list the workflow document as changed, and set the next step to receive the user's additional requirement before splitting the document.

### Task 3: Verify and commit the baseline

**Files:**
- Verify: all modified and newly added files in the worktree

**Interfaces:**
- Consumes: the coherent baseline from Task 2.
- Produces: one commit that can be reviewed independently of the forthcoming split.

- [ ] **Step 1: Re-run focused evidence tests**

Run:

```bash
npx jest context-emendator/scripts/__tests__/lint-boundary.test.js context-emendator/scripts/__tests__/mutation-sweep.test.js --runInBand
git diff --check
```

Expected: both Jest files pass and the diff has no whitespace errors.

- [ ] **Step 2: Review the commit boundary**

Confirm the staged set contains the existing workflow evidence bundle, session update, and this plan, but no split-only structural move. Check `git diff --cached --check` and summarize the staged paths before committing.

- [ ] **Step 3: Commit with the project workflow**

Use `onus:commit` immediately before `git commit`. Use the project convention:

```text
chore - finish autonomous work-item workflow
```

Expected: a signed commit if the configured signing agent is available; do not bypass signing with `--no-gpg-sign`.

