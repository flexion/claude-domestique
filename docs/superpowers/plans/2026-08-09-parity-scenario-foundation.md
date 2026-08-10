# Parity Scenario Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, credential-free contracts for parity scenarios, paired no-guidance controls, invariant evaluation, and sanitized evidence.

**Architecture:** Keep model execution outside the foundation. CommonJS modules under `scripts/parity/` load and validate checked-in JSON scenarios, create isolated control copies by replacing only one skill description, evaluate trial results, and sanitize evidence. Jest proves these mechanics without invoking Claude or Codex. Plan 2 supplies the real catalog and scenarios; Plan 3 supplies host adapters.

**Tech Stack:** Node.js 18+ CommonJS, Jest 29, `js-yaml`, JSON Schema files used as checked-in contracts.

## Global Constraints

- Follow [the approved design](../specs/2026-08-09-cross-host-parity-open-issues-design.md).
- Do not call a model or require credentials in this plan.
- A control copy changes only the target skill's frontmatter `description`; name, body, neighboring skills, and plugin enablement stay byte-identical.
- Every temporary host home and plugin copy is created under a caller-supplied temporary directory.
- Sanitized evidence must remove credentials, home paths, repository secrets, and unrelated prompt history before writing.
- Do not commit unless the user explicitly authorizes commits. Treat each task boundary as a review checkpoint.
- Plugin versions do not change in this plan because it modifies repository tooling only.

## Why this does not use `claude plugin eval`

Codex CLI `0.147.0` has no eval command or eval-related feature flag. That is
the primary reason this plan needs a host-neutral harness: neither vendor can
run the cross-host matrix for the repository.

Claude Code's native eval command does provide cases, graders, repeated runs,
thresholds, JSON output, and whole-plugin ablation. This plan deliberately uses
the common schema and runner for the Claude arm too:

- `--ablation with-without` removes the entire plugin and changes the candidate
  set; discovery scenarios require changing only the target description.
- Native Claude cases do not express Codex hook trust or cross-host state
  handoffs.
- Using it only for direct-invocation and isolation cases would require a case
  generator, native-result translator, and second evidence path while retaining
  the Codex adapter and common invariant evaluator. The required assertions are
  observable invariants, so native LLM graders and HTML reports do not remove a
  required component.

The schema does not mirror `evals/**/case.yaml`, because partial portability
would create two sources of truth with different control semantics.
`claude plugin eval` may be used separately while authoring a Claude skill, but
it is not used for any parity case class and its output is not release-gate
evidence.

## Prior art: Caliper

[Caliper](https://github.com/edonadei/caliper) confirms the need for cross-host
skill evaluation and provides useful closed-neighborhood and activation
concepts. It is not the runner for this repository:

- It installs standalone skills by unqualified frontmatter name. This catalog
  contains both `agent-artifex:assess` and `mantra:assess`, each with local name
  `assess`; plugin namespaces are part of the behavior under test.
- Its ablation removes the named skill, while this design must preserve the
  candidate and replace only its description.
- It does not cover installed plugin hooks, interactive hook trust, or the
  exact-path shared-state handoff.

Adapting those gaps would preserve most of `scripts/parity/` while adding a
Python runtime dependency, so the plan uses Caliper as prior art rather than a
dependency.

## File Structure

- `scenarios/parity/scenario.schema.json` — checked-in contract for direct, discovery, hook, isolation, and handoff scenarios.
- `scenarios/parity/result.schema.json` — normalized host-trial result contract.
- `scripts/parity/scenarios.js` — JSON loading, structural validation, and scenario discovery.
- `scripts/parity/invariants.js` — deterministic invariant and five-trial threshold evaluation.
- `scripts/parity/control-copy.js` — isolated plugin copy with test-only description ablation.
- `scripts/parity/evidence.js` — evidence sanitization and JSON persistence.
- `scripts/__tests__/parity-scenarios.test.js` — schemas and loader tests.
- `scripts/__tests__/parity-invariants.test.js` — threshold tests.
- `scripts/__tests__/parity-control-copy.test.js` — byte-preservation tests.
- `scripts/__tests__/parity-evidence.test.js` — redaction tests.
- `package.json` — add a deterministic parity-foundation test script.

---

### Task 1: Define and validate scenario/result contracts

**Files:** Create both schema files, `scripts/parity/scenarios.js`, and `scripts/__tests__/parity-scenarios.test.js`.

- [ ] **Step 1: Write failing loader tests**

Cover: missing ID, unknown behavior class, discovery without `target_skill`, absent control declaration, ambiguous case without `allowed_outcomes`, side-effect case without `forbidden_side_effects`, and a valid fixture. Use temporary JSON files; do not add production scenarios yet.

```javascript
const { validateScenario } = require('../parity/scenarios');

test('ambiguous discovery requires an explicit allowed outcome set', () => {
  const errors = validateScenario({
    id: 'memento-neighbor',
    class: 'discovery',
    expectation: 'ambiguous',
    target_skill: 'memento:resume',
    prompt: 'What is next?',
    control: { ablate_description: true },
    invariants: [],
  });
  expect(errors).toContain('allowed_outcomes must be a non-empty array');
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-scenarios.test.js --runInBand`

Expected: FAIL because `scripts/parity/scenarios.js` does not exist.

- [ ] **Step 3: Add the schemas and minimal validator**

The scenario schema must require `id`, `class`, `prompt`, `fixture`, `invariants`, and `forbidden`; allow classes `direct`, `discovery`, `hook`, `isolation`, and `handoff`; and conditionally require discovery/control fields. The result schema must require `scenario_id`, `host`, `host_version`, `arm`, `trial`, `outcome`, `observations`, `state_changes`, and `invariants`.

Export this stable interface:

```javascript
function validateScenario(scenario) { /* returns string[] */ }
function loadScenarios(root) { /* returns scenarios sorted by id; throws aggregated errors */ }
module.exports = { loadScenarios, validateScenario };
```

Use explicit field checks rather than adding a runtime dependency solely for JSON Schema validation. Keep the JSON Schema files aligned with those checks and assert their required fields in the tests.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-scenarios.test.js --runInBand`

Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Run: `git diff --check && git diff -- scenarios/parity scripts/parity/scenarios.js scripts/__tests__/parity-scenarios.test.js`

---

### Task 2: Implement invariant and trial-threshold evaluation

**Files:** Create `scripts/parity/invariants.js` and `scripts/__tests__/parity-invariants.test.js`.

- [ ] **Step 1: Write the failing table tests**

Pin every approved threshold:

```javascript
test.each([
  ['control', [true, true, true, false, false], true],
  ['control', [true, true, false, false, false], false],
  ['positive', [true, true, true, true, false], true],
  ['positive', [true, true, true, false, false], false],
  ['ordinary-negative', [true, true, true, true, false], true],
  ['side-effect-negative', [true, true, true, true, true], true],
  ['side-effect-negative', [true, true, true, true, false], false],
])('%s threshold', (kind, trialMetExpectation, expected) => {
  expect(evaluateTrials(kind, trialMetExpectation).pass).toBe(expected);
});
```

Every boolean has one meaning: `true` means that trial met its declared
expectation. For a control trial, the declared expectation is that the target's
skill-specific invariants are absent. For an ordinary negative, it is that the
target remained unselected. The evaluator never inverts raw booleans by kind.

Also test that all five ambiguous trials must be inside `allowed_outcomes`, any forbidden action fails immediately, and infrastructure failures are reported separately from behavioral failures.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-invariants.test.js --runInBand`

Expected: FAIL because the evaluator does not exist.

- [ ] **Step 3: Implement the pure evaluator**

Export:

```javascript
function evaluateInvariant(invariant, observation) { /* { pass, message } */ }
function evaluateTrials(kind, trials, options = {}) { /* { pass, reason, counts } */ }
function classifyFailure(result) { /* 'infrastructure' | 'behavioral' | null */ }
module.exports = { classifyFailure, evaluateInvariant, evaluateTrials };
```

Do not retry or execute anything here. This module only classifies normalized results.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-invariants.test.js --runInBand`

Expected: PASS.

---

### Task 3: Build a candidate-preserving control copy

**Files:** Create `scripts/parity/control-copy.js` and `scripts/__tests__/parity-control-copy.test.js`.

- [ ] **Step 1: Write a byte-comparison RED test**

Create a two-skill temporary plugin. After ablation, assert that only the YAML scalar value for the target description differs; the target body, name, other frontmatter, neighboring skill, manifests, and filenames are identical. Also assert that the copied plugin version is unique and valid semver.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-control-copy.test.js --runInBand`

Expected: FAIL because `createControlCopy` does not exist.

- [ ] **Step 3: Implement description-only ablation**

```javascript
const NEUTRAL_DESCRIPTION = 'Skill.';

function createControlCopy({ pluginRoot, skillName, destination, runId }) {
  // Copy recursively, parse only target frontmatter, replace description,
  // set all copied version surfaces to 0.0.0-control.<sanitized-runId>,
  // then verify the semantic diff allowlist before returning destination.
}
```

The semantic diff allowlist is exactly the target description and copied version surfaces. `Skill.` is intentionally contentless rather than negative guidance. Reject symlinks that escape `pluginRoot` and reject an existing destination.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-control-copy.test.js --runInBand`

Expected: PASS.

---

### Task 4: Sanitize and persist evidence

**Files:** Create `scripts/parity/evidence.js` and `scripts/__tests__/parity-evidence.test.js`.

- [ ] **Step 1: Write RED tests with synthetic secrets**

Include `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, bearer/basic authorization, `/Users/alice`, `/home/alice`, the repository absolute path, and unrelated transcript turns. Assert none survives and that scenario ID, versions, observations, state changes, invariant results, reviewed hook hash, and overall result do survive.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-evidence.test.js --runInBand`

Expected: FAIL because the evidence module does not exist.

- [ ] **Step 3: Implement allowlist-first evidence writing**

```javascript
const EVIDENCE_FIELDS = [
  'scenario_id', 'prompt', 'plugin_versions', 'host', 'host_version',
  'arm', 'trial', 'observations', 'state_changes', 'invariants',
  'infrastructure_failure', 'reviewed_hook_hash', 'result',
];

function sanitizeEvidence(record, replacements) { /* deep allowlist + redaction */ }
function writeEvidence({ root, release, record, replacements }) { /* atomic JSON write */ }
```

Write to `docs/release-evidence/<date>-<release>/` only when explicitly invoked; tests write to temporary directories.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-evidence.test.js --runInBand`

Expected: PASS.

---

### Task 5: Integrate the deterministic suite

**Files:** Modify `package.json`.

- [ ] **Step 1: Add `test:parity` and include it in `test` and coverage**

```json
"test:parity": "jest scripts/__tests__/parity-*.test.js --runInBand"
```

Add a matching coverage command collecting `scripts/parity/*.js`.

- [ ] **Step 2: Run focused and full verification**

Run:

```bash
npm run test:parity
npm run test:scripts
npm test
npm run validate:plugins
git diff --check
```

Expected: all commands pass. No network or model credentials are used.

- [ ] **Step 3: Review checkpoint**

Inspect `git diff --stat` and confirm only repository tooling, tests, schemas, and this plan's files changed.

## Plan Completion Checks

- [ ] Scenario and result schemas cover all five behavior classes.
- [ ] Threshold tests encode 3/5 control, 4/5 positive/ordinary-negative, 5/5 side-effect-negative, and explicit ambiguous sets.
- [ ] The control arm preserves the complete candidate set.
- [ ] Evidence is allowlisted and sanitized before persistence.
- [ ] Search finds no placeholder markers: `rg -n 'TODO|TBD|placeholder|later' scripts/parity scenarios/parity`.
- [ ] No plugin version was changed.
