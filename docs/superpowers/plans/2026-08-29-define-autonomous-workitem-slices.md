# Autonomous Work-item Slice Definitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define four independently testable, shippable workflow slices without implementing their future artifacts.

**Architecture:** The preserved `HEAD` version of the former monolithic workflow is the immutable extraction source. Each destination carries ordered YAML frontmatter as the machine-readable slice contract, followed by a human-readable boundary sentence and rendered metadata table. Destination documents own only their reader goal; shared contracts are linked rather than copied.

**Tech Stack:** Markdown, YAML frontmatter, existing Jest commands referenced as future gating contracts.

**Spec:** `context-emendator/docs/autonomous-workitem-workflow.md` at `HEAD`, plus Tim's in-progress `reconstructing-the-item.md`, `the-boundary-bundle.md`, and spine/index document.

## Global Constraints

- Do not modify the original source through the working-tree path; extract only with `git show HEAD:context-emendator/docs/autonomous-workitem-workflow.md`.
- Do not edit Tim's destination documents or the spine/index.
- Preserve each rule with the adjacent passage that falsifies or justifies it; note any material rewording.
- Use frontmatter keys in this exact order: `slice`, `job`, `ships`, `gating_test`, `non_gating`, `depends_on`, `terminal_failure_owned`, `source_lines`.
- Require `gating_test.status` to be `planned` or `implemented`; every state supplies a specific command and evidence, while CI executes only `implemented` tests.
- Link to the interpretation contract in `reconstructing-the-item.md`; never duplicate it.

---

### Task 1: Establish the extraction map and metadata template

**Files:**
- Create: `docs/superpowers/plans/2026-08-29-define-autonomous-workitem-slices.md`
- Modify: `.claude/sessions/chore-split-workitem-workflow.md`
- Read only: `HEAD:context-emendator/docs/autonomous-workitem-workflow.md`

**Interfaces:**
- Consumes: immutable source line ranges and the agreed frontmatter contract.
- Produces: one documented mapping for the four destination documents.

- [ ] **Step 1: Read the immutable source in numbered ranges.**

  Run: `git show HEAD:context-emendator/docs/autonomous-workitem-workflow.md | nl -ba`

  Expected: 1,118 source lines, independent of the working-tree spine replacement.

- [ ] **Step 2: Map each destination to a reader goal and its enforcing consumer.**

  - `tracker-and-forge-ports.md`: adapter author implements stable item addressing, claim, forge operations, and run-record effects.
  - `discharging-the-boundary.md`: delivery team turns a frozen bundle into a gated, reviewed handoff.
  - `the-reference-implementation.md`: maintainer verifies the reference linter, fixture corpus, and mutation instruments.
  - `walking-skeleton.md`: implementer delivers the first end-to-end Beads-backed run.

- [ ] **Step 3: Update the branch session approach and next steps.**

  Expected: it records direct approval, immutable-source handling, ownership boundaries, and documentation-first scope.

### Task 2: Define the tracker-and-forge-ports slice

**Files:**
- Create: `context-emendator/docs/tracker-and-forge-ports.md`
- Read only: `HEAD:context-emendator/docs/autonomous-workitem-workflow.md:38-89`, `:281-298`, `:545-580`, `:584-597`

**Interfaces:**
- Consumes: the spine's lifecycle ownership and the reconstruction document's `item_locator` contract.
- Produces: a planned adapter contract used by walking-skeleton and discharge.

- [ ] **Step 1: Add ordered slice frontmatter.**

  Include `slice: tracker-and-forge-ports`, a folded `job`, `ships` entries for this document and future deterministic adapter/runtime artifacts, a `planned` contract-test command, and source ranges.

- [ ] **Step 2: Render the matching human header.**

  Under the H1, include the bold `Slice boundary.` sentence and the six-row metadata table mirroring frontmatter.

- [ ] **Step 3: Extract the port and run-record rules.**

  Keep tracker/forge independence, authoritative run-record semantics, capability-gated claim, addressable item parts, append/fence/idempotency/reconciliation rules, and locator-resolution production input together with their rationale.

- [ ] **Step 4: State the slice test contract.**

  Define a deterministic adapter contract suite that tests claim fencing, stable locator resolution, intent/result recovery, and tracker-projection failure without treating it as an implementation already present.

### Task 3: Define the discharging-the-boundary slice

**Files:**
- Create: `context-emendator/docs/discharging-the-boundary.md`
- Read only: `HEAD:context-emendator/docs/autonomous-workitem-workflow.md:520-543`, `:684-767`, `:996-1054`

**Interfaces:**
- Consumes: a frozen boundary bundle from `the-boundary-bundle` and item interpretation through that bundle.
- Produces: a planned delivery, gate, semantic-review, safety-exception, handoff, and merge-watcher contract.

- [ ] **Step 1: Add the ordered planned-slice metadata and matching rendered header.**

  The gating test names a deterministic base-versus-head gate command and evidence; non-gating evaluation names model review calibration separately.

- [ ] **Step 2: Extract evidence-map and sensitivity-probe requirements.**

  Keep collected-case identity, baseline compatibility, negative-control/mutation sensitivity, and the test-case collectability production-input limit together.

- [ ] **Step 3: Extract stages 4 through 7 as one reader journey.**

  Preserve the frozen-scope rule, mechanical gate repair cap, semantic-review evidence/triage rule, safety exception, final handoff, merge watcher, and links to the spine-owned stop-state registry.

- [ ] **Step 4: Keep terminal ownership narrow.**

  Own only delivery-reached states by link; do not restate the registry or claim cross-slice stop conditions.

### Task 4: Define the reference-implementation assurance slice

**Files:**
- Create: `context-emendator/docs/the-reference-implementation.md`
- Read only: `HEAD:context-emendator/docs/autonomous-workitem-workflow.md:233-237`, `:768-995`

**Interfaces:**
- Consumes: the source linter, fixture corpus, and mutation scripts.
- Produces: the implemented assurance contract for current reference tooling and planned gaps for future integration.

- [ ] **Step 1: Add ordered implemented-slice metadata and matching rendered header.**

  Use the existing Jest command as the literal gating command and state the asserted code sets, fixtures, and mutation results as evidence.

- [ ] **Step 2: Extract current linter behavior and fixture evidence.**

  Include three passes, tracker independence, pre-schema transcriptions, exact-code assertions, totality, and the js-yaml typing hazard with their correcting archaeology.

- [ ] **Step 3: Extract mutation-instrument assurance.**

  Preserve the measured fast/real-oracle discrepancy, reachability distinction, null-mutation guard, denominator correction, and Family A/Family B detector distinction.

- [ ] **Step 4: Link, rather than absorb, production inputs.**

  Point locator resolution to `tracker-and-forge-ports` and test-case collectability to `discharging-the-boundary`.

### Task 5: Define the new walking-skeleton slice

**Files:**
- Create: `context-emendator/docs/walking-skeleton.md`
- Read only: `HEAD:context-emendator/docs/autonomous-workitem-workflow.md:38-89`, `:545-580`, `:584-746`

**Interfaces:**
- Consumes: planned ports/runtime, boundary, and discharge contracts.
- Produces: the narrow first end-to-end increment: claim an eligible Beads item, append/reconcile a run record, freeze a trivial boundary, execute one gate, and hand off.

- [ ] **Step 1: Add ordered planned-slice metadata and matching rendered header.**

  Set `source_lines: new`; enumerate the future deterministic runtime, one concrete Beads adapter, one trivial boundary fixture, and this definition document as ships.

- [ ] **Step 2: Describe the one happy path only.**

  Explicitly exclude reconstruction breadth, multiple adapters, production/post-merge obligations, and semantic review expansion from this first increment.

- [ ] **Step 3: Commit to a deterministic integration test.**

  The planned command must exercise claim, append/recovery, freeze, gate, and handoff against a disposable Beads-backed fixture; the evidence is an ordered run record ending in the named handoff state.

### Task 6: Validate and reconcile

**Files:**
- Modify: `.claude/sessions/chore-split-workitem-workflow.md`
- Read: all seven destination docs and inbound references

**Interfaces:**
- Consumes: both agents' destination documents.
- Produces: an auditable, non-overlapping slice graph ready for the final source and pointer reconciliation.

- [ ] **Step 1: Parse each frontmatter block and check ordered keys.**

  Expected: every header supplies the same required schema and each dependency resolves to a slice slug.

- [ ] **Step 2: Verify every source range against `HEAD`.**

  Expected: no extraction cites the replaced working-tree spine as its source.

- [ ] **Step 3: Search for duplicated interpretation schema and stale inbound paths.**

  Run: `rg -n 'interpretation|autonomous-workitem-workflow' context-emendator docs/superpowers/plans`

  Expected: other slice docs link to `reconstructing-the-item.md`; only the reconciliation owner changes inbound pointers and the original file.

- [ ] **Step 4: Review the diff and hand off reconciliation findings to Tim.**

  Run: `git diff --check && git diff --stat`

  Expected: no whitespace errors and no edits outside assigned files, the plan, and the session.
