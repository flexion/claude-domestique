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
1. Execute the remaining tasks in
   `docs/superpowers/plans/2026-09-16-vernaculus-observability.md` with one
   implementer and one independent review per task.
2. Add the approved telemetry fields without changing the frozen payload or
   text-only execution-error contract.
3. Measure the post-instrumentation full loop on `qwen3-coder:30b` before
   revising the MCP interface or skill guidance.

## Files Changed

- `.claude/sessions/chore-explore-local-model-integration.md`
- `docs/superpowers/plans/2026-09-16-vernaculus-observability.md`
- `docs/superpowers/specs/2026-09-16-vernaculus-observability-design.md`
- `vernaculus/README.md` (pre-existing registration findings preserved)
- `vernaculus/__tests__/server.test.js`
