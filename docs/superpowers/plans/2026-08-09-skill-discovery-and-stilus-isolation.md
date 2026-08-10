# Skill Discovery and Stilus Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify every skill, make descriptions mechanically discoverable without collisions, and make Stilus AI-perception review fail closed unless a fresh specialist context returns a valid isolation attestation.

**Architecture:** `metadata/skill-catalog.json` is the repository source of truth for public/internal classification and scenario links. The existing validator enforces catalog completeness and frontmatter shape. Stilus remains prompt-native: its canonical review skill and shared reviewing context define delegation and attestation; Claude agent wrappers preload the same canonical specialist bodies. Deterministic isolation fixtures validate the contract before model-level execution in Plan 3.

**Tech Stack:** Markdown skills/agents/context, JSON metadata/scenarios, Node.js CommonJS validator, Jest.

## Global Constraints

- Complete the Parity Scenario Foundation plan first.
- Internal specialist skills remain model-invocable; do not add `disable-model-invocation: true` because Claude agents preload them through `skills:`.
- Public descriptions start with `Use when` and contain triggers only. Internal descriptions use `Internal <phase> phase of <plugin>:<orchestrator>. Not a standalone user workflow.`
- No shipped skill description contains `/plugin:skill`, `$plugin:skill`, `Invoke with`, workflow steps, output summaries, or persuasive claims.
- Never run `review-summary` in the parent context. No wording may tell it to ignore leaked intent.
- AI perception accepts `PASS`, `FAIL`, `mirror`, or `UNAVAILABLE`; unavailable is omitted from overall verdict aggregation.
- On `chore/make-all-plugins-available-to-claude-and-codex`, the affected plugins already have their one release bump; do not bump them again on that branch. If this plan is executed later on a fresh branch, follow `AGENTS.md` and bump every modified plugin once.
- Do not commit unless the user explicitly authorizes commits.

## File Structure

- `metadata/skill-catalog.json` — all 31 fully qualified skills, classifications, orchestrators, and discovery scenarios.
- `scripts/validate-plugins.js` — catalog, description-shape, reference, and scenario checks.
- `scripts/__tests__/validate-plugins.test.js` — RED/GREEN static enforcement tests.
- `scripts/parity/isolation.js` — isolation-attestation validation.
- `scripts/__tests__/parity-isolation.test.js` — success and contamination fixtures.
- `scenarios/parity/isolation/*.json` — fresh, unavailable, spawn-failure, malformed, stale, and leakage cases.
- `scenarios/parity/discovery/*.json` — positive, negative, ambiguous, and collision cases.
- `<plugin>/skills/*/SKILL.md` — trigger-only or internal descriptions.
- `stilus/skills/review/SKILL.md`, `stilus/skills/review-summary/SKILL.md` — orchestrator and blind specialist contracts.
- `stilus/agents/review-summary.md`, `stilus/context/reviewing.md` — Claude wrapper and shared synthesis behavior.

---

### Task 1: Add failing isolation-contract tests

**Files:** Create `scripts/parity/isolation.js`, `scripts/__tests__/parity-isolation.test.js`, and `scenarios/parity/isolation/*.json`.

- [ ] **Step 1: Write the fixture matrix and RED tests**

Use request ID `req-current` and canary `7d9c57c4-02b7-4b11-a59c-4950957511c3`. Cover success, absent tool, spawn failure, missing/malformed attestation, stale request ID, `received_fields` extras, each of the six forbidden flags, `canary_seen: true`, and matching `observed_canary`.

```javascript
const clean = {
  isolation: {
    request_id: 'req-current',
    received_fields: ['prose'],
    forbidden_context: {
      purpose: false, audience: false, intended_point: false,
      voice_profile: false, rubric: false, prior_findings: false,
    },
    canary_seen: false,
    observed_canary: null,
  },
};
expect(validateIsolation(clean, 'req-current', CURRENT_CANARY)).toEqual({ ok: true });
```

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-isolation.test.js --runInBand`

Expected: FAIL because `validateIsolation` is not implemented.

- [ ] **Step 3: Implement exact, fail-closed validation**

Export `validateIsolation(result, requestId, canary)`. Require every field, exact boolean types, exact `received_fields` of `['prose']` or `['path']`, matching request ID, all forbidden flags false, `canary_seen === false`, and `observed_canary === null`. Return `{ ok: false, reason }` for every other state.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-isolation.test.js --runInBand`

Expected: PASS.

---

### Task 2: Make the blind specialist attest what it received

**Files:** Modify `stilus/skills/review-summary/SKILL.md` and `stilus/agents/review-summary.md`.

- [ ] **Step 1: Add a static RED assertion**

Add a test that requires all attestation keys and rejects the phrase `ignore it` in the canonical skill.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-isolation.test.js --runInBand`

Expected: FAIL on missing schema language and the existing simulated-blindness sentence.

- [ ] **Step 3: Rewrite the skill contract**

Make its first returned block the exact JSON object from the approved design, followed by the four existing summary items. State that it must report exposure, not disregard it. The wrapper should require the request ID and attestation schema as control metadata and reject any purpose, audience, intended point, voice profile, rubric, prior findings, or canary in its substantive input.

- [ ] **Step 4: Run GREEN and validate Stilus**

Run:

```bash
npm run test:parity
npm run validate:plugins
npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate stilus --strict
```

Expected: PASS.

---

### Task 3: Make the Stilus orchestrator attempt, verify, and degrade safely

**Files:** Modify `stilus/skills/review/SKILL.md` and `stilus/context/reviewing.md`.

- [ ] **Step 1: Add RED content-contract tests**

Require `Agent`, `spawn_agent`, UUID v4, parent-only canary adjacency, fresh request ID, attestation validation before summary use, every fail-closed reason, `AI perception: UNAVAILABLE`, and overall-verdict exclusion. Reject `sequentially`, `separate context`, and any current-context fallback near `review-summary`.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-isolation.test.js --runInBand`

Expected: FAIL because current prose permits sequential specialist execution.

- [ ] **Step 3: Update the shared flow**

Specify this order exactly:

1. Gather parent-only purpose, audience, intended point, voice profile, rubric, and prior findings.
2. Generate new UUID v4 request ID and canary; place the canary beside that parent-only block.
3. Run correctness and voice independently.
4. If `Agent`/`spawn_agent` is absent, report `UNAVAILABLE`.
5. Otherwise delegate only `{ prose | path, request_id, attestation_schema }` to `review-summary`.
6. Validate the attestation before reading the summary; discard and report `UNAVAILABLE` on failure.
7. Compare the takeaway with intent only after validation.

Update the report vocabulary and overall verdict rule so unavailable is neither passing nor failing.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:parity && npm run validate:plugins`

Expected: PASS.

---

### Task 4: Add catalog classification tests

**Files:** Create `metadata/skill-catalog.json`; modify `scripts/validate-plugins.js` and `scripts/__tests__/validate-plugins.test.js`.

- [ ] **Step 1: Write RED validator tests**

Cover missing skill, duplicate skill, nonexistent skill, invalid classification, and nonexistent internal orchestrator. Description-shape checks belong to Task 6; scenario-reference checks belong to Task 5.

- [ ] **Step 2: Run RED**

Run: `npm run test:scripts`

Expected: FAIL until catalog validation exists.

- [ ] **Step 3: Add all 31 catalog entries**

Classify only `stilus:review-correctness`, `stilus:review-voice`, and
`stilus:review-summary` as internal, each orchestrated by `stilus:review`.
Classify the other 28 skills as public. In particular,
`memento:session-manager` remains a supported lifecycle workflow and
`onus:work-item-handler` remains a supported generic read/triage workflow until
a separate compatibility decision removes or redirects them. Agent Artifex
atomic skills also remain public because each has a supported direct user
intent. Collision scenarios distinguish all of these neighboring workflows.

Catalog entry shape:

```json
{
  "name": "stilus:review-summary",
  "classification": "internal",
  "orchestrator": "stilus:review"
}
```

Public entries include a `scenarios` array, which may be empty until Task 5 adds and validates the references.

- [ ] **Step 4: Implement repository validation**

Discover skills from marketplace plugin roots, derive `plugin:skill`, compare the complete sets, and validate classifications and internal orchestrators. Aggregate errors; do not fail fast. Do not add description-shape or scenario-reference enforcement in this task.

- [ ] **Step 5: Run GREEN**

Run: `npm run test:scripts`

Expected: PASS with complete catalog classification and intentionally empty public scenario arrays.

---

### Task 5: Add and validate discovery scenarios before rewriting descriptions

**Files:** Create JSON files under `scenarios/parity/discovery/`; modify `scripts/validate-plugins.js`, `scripts/__tests__/validate-plugins.test.js`, and `metadata/skill-catalog.json`.

- [ ] **Step 1: Write RED scenario-reference tests**

Cover an empty public scenario array, nonexistent scenario ID, missing positive case, missing negative case, and missing ambiguous/neighboring case.

- [ ] **Step 2: Run RED**

Run: `npm run test:scripts`

Expected: FAIL because scenario-reference validation is not implemented.

- [ ] **Step 3: Implement scenario-reference validation**

Load checked-in cases through `scripts/parity/scenarios.js`. Require every public catalog entry to reference existing positive, negative, and ambiguous/neighboring cases. Internal entries do not own discovery cases.

- [ ] **Step 4: Add required scenario groups and catalog references**

Each public skill gets clear positive, clear negative, and neighboring/ambiguous coverage. Include explicit collision suites for:

- Memento `session`, `session-manager`, `start`, `resume`, and Onus `status` with “what is next?” and “continue this session.”
- Mantra `assess`, `skeptic`, and `troubleshoot`.
- Stilus `review`, `deslop`, and all three internal specialists.
- Agent Artifex `guide` and its five atomic public skills.
- Onus `commit`, `pr`, `create`, `update`, and `close`, including discussion without authorization; these are `side-effect-negative` and require 5/5 safety.

- [ ] **Step 5: Run GREEN**

Run: `npx jest scripts/__tests__/parity-scenarios.test.js scripts/__tests__/validate-plugins.test.js --runInBand`

Expected: PASS. Description shape is not enforced until Task 6.

---

### Task 6: Rewrite descriptions to satisfy the policy

**Files:** Modify `scripts/validate-plugins.js`, `scripts/__tests__/validate-plugins.test.js`, and the description frontmatter of the 31 canonical skill files.

- [ ] **Step 1: Write RED description-policy tests**

Cover a public description not starting `Use when`, an internal description starting `Use when`, Claude/Codex invocation syntax, workflow steps, and output-summary language.

- [ ] **Step 2: Run RED**

Run: `npm run test:scripts`

Expected: FAIL on the current descriptions.

- [ ] **Step 3: Implement description-policy validation**

Parse descriptions through the existing frontmatter reader. Enforce the public/internal mechanical forms and reject invocation syntax plus the explicitly tested workflow/output phrases.

- [ ] **Step 4: Apply public/internal forms**

Preserve user-intent distinctions from the catalog. Strip workflow/result prose and invocation syntax. Internal examples:

```yaml
description: Internal blind-summary phase of stilus:review. Not a standalone user workflow.
```

```yaml
description: Internal voice-review phase of stilus:review. Not a standalone user workflow.
```

- [ ] **Step 5: Run static GREEN**

Run:

```bash
npm run test:scripts
npm run test:parity
npm run validate:plugins
rg -n 'description:.*(/|\$)[a-z-]+:' */skills/*/SKILL.md
```

Expected: tests and validator pass; `rg` returns no matches.

- [ ] **Step 6: Validate every plugin manifest**

Run the Claude strict-validation loop from `AGENTS.md`, then validate all six Codex manifests with the installed plugin-creator validator. Expected: 6/6 pass for each host format.

- [ ] **Step 7: Review checkpoint**

On `chore/make-all-plugins-available-to-claude-and-codex`, confirm every
modified plugin remains at its already-bumped branch version and do not run
another bump. On a fresh branch, confirm each modified plugin received exactly
one appropriate bump as required by `AGENTS.md`.

## Plan Completion Checks

- [ ] The catalog and filesystem each contain exactly the same 31 skills.
- [ ] All public descriptions are trigger-only and all internal descriptions are non-triggering.
- [ ] Every public skill points to positive, negative, and neighboring scenarios.
- [ ] Stilus has no simulated-blindness or sequential blind-summary path.
- [ ] Isolation tests cover all forbidden fields, canary leakage, stale IDs, and malformed output.
- [ ] `npm test`, `npm run validate:plugins`, strict Claude validation, and all Codex manifest validations pass.
