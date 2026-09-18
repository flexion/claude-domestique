# Session: explore-local-model-integration

## Details
- **Branch**: chore/explore-local-model-integration
- **Type**: chore
- **Created**: 2026-09-16
- **Status**: in-progress

## Goal
Design Vernaculus as a coupled MCP-and-skill delegation system that lets Claude
and Codex use a less capable local model efficiently while preserving final
correctness through independent verification.

## Key Decisions
- Final correctness is a hard acceptance constraint, not an optimization
  variable. Local-model drafts may be wrong; no draft is accepted or delivered
  until Claude or Codex verifies it with appropriate independent evidence.
- The MCP owns deterministic mechanics and enforcement; the skill owns semantic
  task selection, decomposition, diagnosis, verification, and stopping policy.
- MCP and skill evolve against one shared contract rather than duplicating the
  same policy prose in two places.
- Separate requirements from implementation design. Build a deliberately
  simple first pass, measure the end-to-end delegation loop, and use those
  measurements rather than intuition to choose later optimizations.
- Tune the first pass to the currently selected `qwen3-coder:30b` model
  (`06c1097efce0` at discovery time), rather than trying to generalize across
  every installed local model.
- Make the first pass observability-first: expose the evidence needed to locate
  cost and latency before changing delegation behavior.
- Keep that first pass strictly instrumentation-only: do not change prompts,
  chunking policy, model selection, residency, or skill behavior while
  establishing the baseline.
- Put compact telemetry directly in the existing `ollama_generate` and
  `ollama_refine` structured results. Do not add a stats tool or depend on
  host-specific `_meta`/trace handling for the first pass.
- Preserve every existing result field and add one nested `telemetry` object
  containing call kind, refinement round, stop reason, raw timing phases in
  milliseconds, and explicitly estimated input-component token counts. Keep
  the human-readable result unchanged and calculate derived rates outside the
  server.
- Preserve the exact Ollama request, prompt construction, model selection, and
  error result shapes. Add only observational session metadata. Successful,
  empty, and truncated generations get telemetry; preflight and execution
  errors remain text-only in this pass.
- Final review authorized four adapter corrections: retain the generation
  context window for refinement, reject changed or missing session models
  after checking live inventory, reject overlapping refinements with an
  explicit retry instruction, and reject non-object JSON-RPC frames safely.
  Keep the generation payload, telemetry schema, and delegation skill unchanged.
- The operator authorized a residual fix wave over the six items earlier reviews
  deferred, explicitly including the two that exceed the branch's original
  instrumentation-only scope: `allow_digest_change` on `ollama_refine`, and a
  markdown link harness. The Ollama request body still does not change.
- A malformed JSON-RPC envelope is `-32600`, never `-32601`. The envelope guard
  deliberately does NOT require an `id`, because a notification is a valid frame
  with a method and no id and every real MCP client sends
  `notifications/initialized` right after `initialize`.
- A changed model digest stays refused by default. The override is opt-in per
  call, records the new digest as `model_digest` and the old one as
  `telemetry.digest_changed_from`, and never covers a missing model.

## Session Log
- 2026-09-16: Session created
- 2026-09-16: Established the MCP/skill ownership boundary and final-correctness
  invariant during design discovery.
- 2026-09-16: Agreed to identify needs first and defer mechanism choices; the
  initial implementation should be simple and followed by measurement.
- 2026-09-16: Scoped initial tuning to `qwen3-coder:30b` and selected MCP
  observability as the first implementation slice.
- 2026-09-16: Operator approved the strict instrumentation-only boundary for
  the first implementation pass.
- 2026-09-16: Selected inline structured telemetry over out-of-band metadata or
  a separate session-stats tool.
- 2026-09-16: Operator approved the compact nested telemetry contract.
- 2026-09-16: Operator approved the instrumentation behavioral boundary and
  text-only error boundary.
- 2026-09-16: Operator approved the baseline and verification design; written
  design recorded in
  `docs/superpowers/specs/2026-09-16-vernaculus-observability-design.md`.
- 2026-09-16: Operator approved the written design and requested a checkpoint
  commit before implementation planning.
- 2026-09-16: Committed the approved design, session state, and pre-existing
  Vernaculus registration guidance as `d638f18`.
- 2026-09-16: Wrote and self-reviewed the observability implementation plan.
  Planning identified one release prerequisite: `scripts/bump-version.js`
  predates Vernaculus and needs a fixture-tested allowlist update before the
  required minor plugin bump can run.
- 2026-09-16: Operator selected subagent-driven implementation. Renamed the
  active Herdr agent and tab to `ned`, verified the branch is already in an
  isolated linked worktree, and prepared the plan-specific SDD workspace.
- 2026-09-16: Captured the pre-instrumentation live baseline with
  `cd vernaculus && npm run smoke:generate`: resolved model
  `qwen3-coder:30b`, digest `06c1097efce0`, generation 10.6s, 94 prompt
  tokens, and 138 output tokens. Generation and refinement passed; the
  refinement result remained an unverified draft as designed.
- 2026-09-16: Added a loopback fake-Ollama contract harness that freezes the
  successful generation request payload and text-only execution-error shape.
  `cd vernaculus && npm test -- --runInBand` passed 21 tests without a real
  Ollama request for either new contract test.
- 2026-09-16: Added structured generation/refinement telemetry: exact schema,
  nanosecond-to-millisecond phase conversion, input-component estimates, and
  persisted refinement rounds. The focused fake-daemon suite passed 25 tests;
  frozen payload and text-only HTTP-500 behavior remain covered.
- 2026-09-16: Exercised the instrumented live smoke with explicit
  `qwen3-coder:30b` (digest
  `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca`). The pre-instrumentation generation
  measured 10.6s with 94 prompt and 138 output tokens; this run measured 10.528s
  wall time with 94 prompt and 109 output tokens. Its new timing fields were
  10,517.468ms Ollama total, 7,839.808ms model load, 347.817ms prompt evaluation,
  and 2,326.577ms generation. Refinement round 1 measured 2,556ms wall,
  2,554.760ms Ollama total, 4.512ms model load, 170.944ms prompt evaluation, and
  2,376.469ms generation. The generation `telemetry` object serialized to 274
  bytes; this is result-payload size only, not Claude or Codex token usage. The
  differing live output length and timings are observations, not a performance
  comparison.
- 2026-09-16: Added a real-fixture regression test for the version tool. Before
  the implementation, the focused Jest run failed with exit status 1 and the
  copied script reported `Unknown plugin: vernaculus`; after adding the minimal
  allowlist entry, the focused test and all 101 script-suite tests passed.
- 2026-09-16: Applied the Vernaculus minor bump exactly once. The version tool
  reported `0.1.0 → 0.2.0`, and package metadata, both host manifests,
  marketplace metadata, and the workspace lockfile now agree on `0.2.0`.
- 2026-09-16: Completed release validation: `npm test` passed all 651 tests;
  `npm run validate:plugins` passed; pinned Claude Code 2.1.226 strict validation
  passed for both the marketplace root and Vernaculus; and the isolated Codex
  0.147.0 marketplace smoke installed `vernaculus@claude-domestique` from source
  at version `0.2.0`. `git diff --check` passed, the delegation skill stayed
  unchanged, the README registration guidance remains present, and no `tmp/`
  artifact was staged.
- 2026-09-16: Reproduced the final-review CI defect with
  `OLLAMA_HOST=http://127.0.0.1:1 npm test --workspace=vernaculus -- --runInBand --reporters=default`:
  the unreadable-file and over-budget tests failed because inventory needed a
  real daemon (23 passed, 2 failed). Converted both to the fake-daemon harness.
- 2026-09-16: Added deterministic regressions before production fixes. RED:
  null stdin exited 1; refinement reset 8192 to 32768; changed/missing models
  still inferred; overlapping refinements both succeeded (26 passed, 5 failed).
  GREEN after the minimal fixes: all 31 focused tests passed with the real
  daemon endpoint disabled. The concurrency test gates an HTTP response,
  checks explicit rejection, and verifies retry history and rounds 1 then 2;
  failed inference also leaves history and round unchanged and permits retry.
  Corrected the packaged launch-surface link and its second stale mention.
- 2026-09-16: Cleared the six residual items. RED first for each: the capacity
  check evicted a live sibling on a refinement re-set (`QWEN_MCP_MAX_SESSIONS`
  makes it testable); object frames with no method, a non-string method, or a
  wrong `jsonrpc` returned `-32601`; a throwing fake-daemon handler failed at
  the 10s jest timeout and then hung the runner instead of reporting its own
  message; a link pointed at a missing `.md` and nothing noticed; and a
  refinement could not continue across a deliberate re-pull. `claimSession()`
  is a pure refactor, so the concurrency tests stayed green unmodified. GREEN:
  51 tests in `vernaculus`, both with a real endpoint and with `OLLAMA_HOST`
  unreachable, and 677 at the repository root.

- 2026-09-18: Measured whether front-loading a structured task contract into a
  cold call substitutes for a post-failure diagnosis. It does not. Same fixture
  (`up.js` blanked one function at a time, real Jest suite as the spec), two
  conditions differing only in a prepended contract block whose every claim was
  derivable from the test file both conditions already received. Result identical
  in every cell: 0/3, 0/3, 3/3 under both. In both conditions `makeAgent` failed
  on exactly one test, `opencode without a model throws` — the precise ordering
  rule the contract stated explicitly. 18 of 18 generations were format-clean, so
  an enforced output-format contract has nothing to enforce. Recorded in
  `vernaculus/references/front-loaded-contract-experiment.md`; harness and raw
  data in `tmp/ab-contract-probe.js` and `tmp/ab-results.json`. The contract-first
  schema was NOT built.

- 2026-09-18: Decided the tool-interface question. NOT built: the contract-first
  input schema (front-loading structure changed nothing, 0/3, 0/3, 3/3 in both
  conditions); an enforced output-format contract (18 of 18 generations were
  format-clean, nothing to enforce); a size or complexity bound (never supported —
  the evidence describes an economic break-even and a kind exclusion, not a size
  limit). Follow-up experiment on self-diagnosis also null: raw 0/3, self 0/3,
  oracle 1/3. The model states its own defect accurately and still cannot fix it,
  so the diagnosis step cannot be routed to it. The oracle's 1/3 sits against the
  3-of-3 recorded in the skill; unresolved, and flagged in the reference.
  Built instead: three small evidence-backed edits — `spec` now names exact-string
  assertion, `ollama_refine` now says to read the draft before diagnosing,
  `ollama_models` gained a limitation and a cross-reference — plus the same two
  rules in the skill. Descriptions trimmed of provenance and measurement
  narrative; that record lives here and in
  `vernaculus/references/front-loaded-contract-experiment.md`, not in artifacts
  read at decision time.

## Approach

1. Capture the current generate/refine smoke scenario against explicit
   `qwen3-coder:30b` before changing the server.
2. Add a nested telemetry object to the shared draft output schema and populate
   it from existing input text, session metadata, wall time, and Ollama's
   duration fields.
3. Prove the outgoing Ollama payload is unchanged with a fake-daemon test, then
   validate field mapping, refinement rounds, null handling, and schema parity.
4. Run the same live scenario after instrumentation and report the telemetry
   overhead. Do not change the skill or delegation policy in this pass.

## Next Steps
1. Review the residual fix wave, then integrate the finished branch.
2. Use the recorded baseline and telemetry to plan any later optimization as a
   separate change.

## Files Changed

- `.claude/sessions/chore-explore-local-model-integration.md`
- `vernaculus/__tests__/markdown-links.test.js` (residual wave: link harness)
- `docs/superpowers/plans/2026-09-16-vernaculus-observability.md`
- `docs/superpowers/specs/2026-09-16-vernaculus-observability-design.md`
- `vernaculus/README.md` (pre-existing registration findings preserved)
- `vernaculus/mcp/server.js`
- `vernaculus/__tests__/server.test.js`
- `vernaculus/mcp/smoke.js`
- `vernaculus/references/local-model-delegation-findings.md` (fix-wave stale-link correction)
- `scripts/__tests__/bump-version.test.js`
- `scripts/bump-version.js`
- `package.json`
- `package-lock.json`
- `vernaculus/package.json`
- `vernaculus/.claude-plugin/plugin.json`
- `vernaculus/.codex-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `.superpowers/sdd/2026-09-16-vernaculus-observability/task-4-report.md`
  (task handoff artifact; not part of the implementation commit)
