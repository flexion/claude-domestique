# Cross-Host Parity Release Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the checked-in parity scenarios against Claude and Codex, keep pull-request CI credential-free, and produce sanitized release evidence that gates parity claims.

**Architecture:** A host-neutral orchestrator consumes scenarios and calls small Claude/Codex adapters. Adapters normalize JSON/JSONL into the result schema; they do not decide pass/fail. The runner creates isolated homes/workspaces, installs the full six-plugin catalog for both guided and control arms, evaluates deterministic invariants, and writes sanitized evidence. PR CI tests adapters with fake executables and deterministic hook fixtures. Authenticated model runs and manual Codex hook trust occur only in a local, operator-driven release gate because `/hooks` requires an interactive TTY.

**Tech Stack:** Node.js CommonJS, Jest, Claude Code CLI 2.1.226+, Codex CLI 0.147.0+, GitHub Actions, existing plugin hooks.

## Global Constraints

- Complete the Scenario Foundation and Skill Discovery/Stilus Isolation plans first.
- PR CI never uses vendor credentials and never claims model-level parity.
- Release runs use isolated `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, plugin caches, and fixture repositories.
- Never use `--dangerously-bypass-hook-trust` as evidence of the trust transition.
- Behavioral failures are not retried. Only classified infrastructure failures may be retried.
- Evidence is written only after sanitization and must record exact host/plugin versions.
- ACP/Air remains out of scope.
- Do not commit or publish unless the user explicitly authorizes it.

## File Structure

- `scripts/parity/hosts/claude.js` — Claude installation and `claude -p --output-format json` adapter.
- `scripts/parity/hosts/codex.js` — Codex installation and `codex exec --json` adapter.
- `scripts/parity/process.js` — injectable child-process wrapper and infrastructure classification.
- `scripts/parity/run.js` — scenario matrix orchestration and paired trials.
- `scripts/run-parity.js` — CLI entry point (`--mode deterministic|release`).
- `scripts/__tests__/parity-hosts.test.js` — fake-executable adapter tests.
- `scripts/__tests__/parity-runner.test.js` — matrix, retry, and threshold tests.
- `scenarios/parity/{direct,hooks,handoff}/*.json` — remaining scenario classes.
- `scenarios/parity/fixtures/` — isolated fixture repositories and event payloads.
- `docs/release-evidence/README.md` — evidence format, manual trust procedure, and retention rules.
- `.github/workflows/pr-check.yml` — deterministic parity job and Codex 0.147.0.
- `scripts/verify-release-evidence.js` — validates that a local release bundle is complete and safe to retain.
- `README.md`, `AGENTS.md`, `docs/plans/2026-08-08-cross-model-plugin-architecture.md` — aligned minimums and parity boundary.

---

### Task 1: Implement host adapters against fake executables

**Files:** Create process/host modules and `scripts/__tests__/parity-hosts.test.js`.

- [ ] **Step 1: Write RED adapter tests**

Fake executables should capture argv/environment and return canned JSON. Assert:

- Claude installation uses `claude plugin marketplace add` and `claude plugin install` in an isolated config; execution receives `-p`, `--output-format json`, `--no-session-persistence`, and the fixture cwd.
- Codex receives `exec --json --ephemeral --sandbox workspace-write`, isolated `CODEX_HOME`, and fixture cwd.
- Direct invocation uses `/plugin:skill` only for Claude and `$plugin:skill` only for Codex.
- Nonzero exit, timeout, invalid JSON, and missing final response normalize to infrastructure failures.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-hosts.test.js --runInBand`

Expected: FAIL because adapters do not exist.

- [ ] **Step 3: Implement injectable adapters**

```javascript
function createClaudeAdapter({ execute, binary = 'claude' }) {
  return { install, run };
}

function createCodexAdapter({ execute, binary = 'codex' }) {
  return { install, run };
}
```

`run` returns the normalized result schema; it never evaluates scenario success. Redact raw environment values from error messages. Use argument arrays, not shell strings.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-hosts.test.js --runInBand`

Expected: PASS without installed credentials.

---

### Task 2: Implement paired matrix orchestration

**Files:** Create `scripts/parity/run.js`, `scripts/run-parity.js`, and `scripts/__tests__/parity-runner.test.js`.

- [ ] **Step 1: Write RED orchestration tests**

Use fake adapters to assert:

- direct/hook scenarios run once per host/version;
- discovery runs five control and five guided trials;
- each trial gets a new host home, fixture copy, control version, request ID, and canary;
- behavioral failure is never retried;
- one classified infrastructure failure may be retried and remains separately recorded;
- forbidden action short-circuits the scenario;
- unsupported Stilus isolation returns `UNAVAILABLE`, which passes degraded-operation scenarios but fails full-parity scenarios.

- [ ] **Step 2: Run RED**

Run: `npx jest scripts/__tests__/parity-runner.test.js --runInBand`

Expected: FAIL because the runner does not exist.

- [ ] **Step 3: Implement the runner**

```javascript
async function runScenario({ scenario, hosts, versions, tempRoot, release }) {
  // Prepare fixture -> control/guided arms -> isolated installs -> trials ->
  // normalize -> evaluate -> sanitize/write evidence.
}

async function runMatrix(options) { /* sorted scenarios, hosts, versions */ }
```

Require an explicit `--mode release` before any model command. `--mode deterministic` validates schemas, hook fixtures, parsers, and fake-adapter invariants only.

- [ ] **Step 4: Run GREEN**

Run: `npx jest scripts/__tests__/parity-runner.test.js --runInBand`

Expected: PASS.

---

### Task 3: Add direct, hook, and exact shared-state scenarios

**Files:** Create scenario JSON and fixtures under `scenarios/parity/`.

- [ ] **Step 1: Add one direct invocation per plugin**

Use read-only or fixture-contained actions. The scenario declares common intent, host syntax, expected selected skill, required output/state invariants, and forbidden actions.

- [ ] **Step 2: Add deterministic hook fixtures**

For Mantra, Memento, Onus, and Comitatus, feed representative Claude and Codex event JSON directly to the installed hook command and assert exit status, sentinel/context output, and fail-open behavior. Do not need host trust for direct handler fixtures.

- [ ] **Step 3: Add both handoff directions**

Fixture branch: `issue/feature-42/auth`.

```text
.claude/branches/issue-feature-42-auth
.claude/sessions/issue-feature-42-auth.md
```

Run Claude-write/Codex-read and Codex-write/Claude-read. Start the receiving
host normally on the fixture branch so Memento's `SessionStart` path runs. The
receiver must open the exact session path through the normal skill workflow;
filename search is forbidden. Assert the hook result reports
`extra.sessionPath` equal to the fixture's absolute
`.claude/sessions/issue-feature-42-auth.md` path and `extra.isNew === false`, the
status line does not contain `NEW`, and the receiving workflow reports a unique
marker seeded in that session. `onSessionStart` checks the exact derived path
before creating anything and has no directory-scan fallback, so these
assertions exercise the regression boundary without depending on
branch-switch-only fields.

- [ ] **Step 4: Validate all scenarios**

Run: `node scripts/run-parity.js --mode deterministic`

Expected: PASS and zero model invocations.

---

### Task 4: Align host minimums and the parity promise

**Files:** Modify `README.md`, `AGENTS.md`, `.github/workflows/pr-check.yml`, and `docs/plans/2026-08-08-cross-model-plugin-architecture.md`.

- [ ] **Step 1: Write a RED version-consistency test**

Extract the declared support floors and require Claude `2.1.226` and Codex
`0.147.0` in all four locations. Treat these as fixed, deliberately tested
floors, not aliases for whichever versions CI currently tests. Claude
`2.1.226` is intentionally higher than the first capability versions because
it is the first release this migration validates end-to-end across plugin
installation, skill preloading, fresh delegation, and the parity scenarios.
The plan must cite the Claude changelog for `skills:` preloading in `2.0.43`
and the Claude subagent documentation for the `Task` to `Agent` rename in
`2.1.63`, and rewrite README's old “plugin system introduced” note so it does
not pretend to justify the higher floor.

- [ ] **Step 2: Run RED**

Run: `npm run test:parity`

Expected: FAIL because README/AGENTS/CI still declare stale minimums.

- [ ] **Step 3: Update documentation and CI**

Replace the named-specialists matrix row with Claude native agents and Codex `spawn_agent` subagents. State that equivalent final dimensions are required on supported minimums and `UNAVAILABLE` is degraded operation, not full parity. Remove the old sequential fallback risk text.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:parity`

Expected: PASS.

---

### Task 5: Add credential-free PR CI coverage

**Files:** Modify `.github/workflows/pr-check.yml` and `package.json`.

- [ ] **Step 1: Add a deterministic parity step**

Run `npm run test:parity` and `node scripts/run-parity.js --mode deterministic`. Pin the minimum-version smoke cells to Codex `0.147.0` and Claude `2.1.226`; current-version cells are separate inputs and may advance without changing those floors.

- [ ] **Step 2: Prove CI cannot enter release mode**

Add a test that release mode exits with a clear error unless `PARITY_RELEASE=1` and both configured host credentials are present. Do not add secrets to `pr-check.yml`.

- [ ] **Step 3: Run local CI-equivalent verification**

Run:

```bash
npm run test:coverage
node scripts/run-parity.js --mode deterministic
npm run validate:plugins
git diff --check
```

Expected: PASS; output explicitly says model-level parity was not evaluated.

---

### Task 6: Add the local authenticated release gate and manual trust evidence

**Files:** Create `scripts/verify-release-evidence.js`, its Jest tests, and `docs/release-evidence/README.md`; modify `package.json`.

- [ ] **Step 1: Add the operator-driven release command**

Add `npm run parity:release -- --release <label> --claude-current <version> --codex-current <version>`. It requires a TTY, `PARITY_RELEASE=1`, configured host authentication, and an explicit temporary root. The matrix includes each minimum and current version and writes sanitized evidence locally; it never runs from `pull_request` CI.

When a current version equals its minimum (as Codex `0.147.0` does when this
plan was written), deduplicate the execution cell but retain both `minimum` and
`current` role labels in the evidence. Do not run the same binary twice or
silently omit either role.

- [ ] **Step 2: Document the manual Codex trust checkpoint**

The operator must:

1. Record the SHA-256 hash of the installed `hooks/hooks.json`.
2. Run an untrusted hook scenario and record that Codex skipped it.
3. Open `/hooks` interactively and approve that exact hash.
4. Run the trusted scenario and record the hook sentinel.
5. Attach both sanitized records. A bypass flag cannot satisfy this step.

The local runner pauses with `manual_trust_required`, prints the isolated Codex home and exact next command, and waits for the operator to confirm completion. Evidence validation requires `reviewed_hook_hash`, `approved_via: "/hooks"`, and both before/after observations.

- [ ] **Step 3: Test evidence validation**

Add fixtures for missing hash, mismatched hash, bypass-only execution, and valid manual approval. `scripts/verify-release-evidence.js` must also reject missing host/version cells and unsanitized values. Run `npm run test:parity`; expected PASS.

---

### Task 7: Run the first release matrix and close Phase 5

**Files:** Create `docs/release-evidence/2026-08-09-<release>/` only after an authorized authenticated run; update the migration plan only after evidence passes.

- [ ] **Step 1: Run minimum and current versions**

Run direct/hook once and discovery five paired trials per host/version. Complete manual `/hooks` approval. Do not retry behavioral failures.

- [ ] **Step 2: Inspect sanitized evidence before retaining it**

Search for credential patterns, absolute home paths, repository secrets, and unrelated history. Delete unsafe evidence rather than editing around leaked credentials; rerun after fixing sanitization.

- [ ] **Step 3: Resolve failures or leave Phase 5 open**

Only mark the migration plan complete when both hosts pass all required invariants and both handoff directions. Record intentional UX differences. If any behavioral scenario fails, keep Phase 5 open and report the exact scenario/host/version.

- [ ] **Step 4: Final verification**

Run the full Definition of Done from `AGENTS.md`, including `npm test`, coverage, plugin validation, both host install smokes, and `git diff --check`.

## Plan Completion Checks

- [ ] PR CI is deterministic and credential-free.
- [ ] The release runner tests minimum and current versions of both hosts.
- [ ] Control and guided arms use identical candidate sets.
- [ ] Hook trust evidence records a hash-linked manual `/hooks` transition.
- [ ] Both exact-path handoff directions pass.
- [ ] Retained evidence is sanitized and sufficient to reproduce failures.
- [ ] CI output does not claim model-level parity; only release evidence may support that claim.
