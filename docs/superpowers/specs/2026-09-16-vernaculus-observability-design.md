# Vernaculus MCP Observability

## Purpose

Add enough observability to the Vernaculus MCP adapter to measure local-model
latency and token use before changing delegation behavior. The first pass is
tuned and measured against the currently selected `qwen3-coder:30b` model. Its
digest at design time is `06c1097efce0`; each measurement must record the live
digest because Ollama tags are mutable.

This pass instruments the local-model leg only. Claude and Codex token use,
verification effort, and final correctness require a later end-to-end harness.

## Constraints

- Preserve the Ollama request body, prompt construction, refinement history,
  model selection, inference settings, and human-readable tool results.
- Do not change the delegation skill, chunking policy, model residency, or
  verification policy.
- Preserve every existing structured result field.
- Do not add another MCP tool or depend on host-specific handling of `_meta`.
- Keep existing execution errors text-only.

These constraints make the before-and-after runs comparable. Telemetry adds a
small structured-result cost; measurements must report that overhead.

## Result Contract

`ollama_generate` and `ollama_refine` add one required `telemetry` object to
their shared output schema:

```json
{
  "telemetry": {
    "call": "generate",
    "round": 0,
    "done_reason": "stop",
    "timing_ms": {
      "wall": 123000,
      "ollama_total": 122800,
      "model_load": 18000,
      "prompt_eval": 42000,
      "generation": 62800
    },
    "input_tokens_estimate": {
      "spec": 180,
      "inline_context": 0,
      "files": 4200,
      "history": 0,
      "diagnosis": 0,
      "total": 4380
    }
  }
}
```

`call` is `generate` or `refine`. Generation uses round `0`; refinements start
at `1` and increment within the in-memory session. `done_reason` preserves the
value returned by Ollama, or `null` when Ollama omits it.

All timing fields use milliseconds. `wall` measures elapsed time from entry into
the selected tool branch through the Ollama response, including inventory and
file reads. The other fields map from Ollama's `total_duration`,
`load_duration`, `prompt_eval_duration`, and `eval_duration`. An omitted Ollama
value becomes `null`.

The input components use the adapter's existing rough estimator. `total` is the
sum of the five components. On refinement, `history` covers the retained prior
messages, while `diagnosis` and `files` cover new input. The existing
`prompt_tokens` remains the authoritative post-call count because it comes from
Ollama's tokenizer and includes chat-template overhead.

Components that do not apply to a call are `0`. Generation reports `history`
and `diagnosis` as `0`; refinement reports `spec` and `inline_context` as `0`
because those values are already included in retained history.

The server returns raw observations. The evaluator derives rates such as prompt
tokens per second and output tokens per second.

## Data Flow

Before inference, the adapter estimates the input components without changing
their text. It reads the session round for refinement. The adapter then sends
the existing request to Ollama.

After a successful response, the adapter converts Ollama's nanosecond durations
to milliseconds and assembles the telemetry object. It stores only the next
round number in session metadata. Session metadata does not enter the model's
message history.

Successful, empty, and truncated generations return telemetry. Preflight and
execution errors keep their existing `isError` text result. An external harness
may time failed calls without changing the MCP error contract.

## Baseline and Verification

Before editing the server, run the existing generation and refinement smoke
scenario against explicit `qwen3-coder:30b`. Record the model digest, adapter
wall time, prompt and output tokens, draft, and refined result. Run the same
scenario after instrumentation.

Deterministic tests use a fake Ollama HTTP endpoint. They must:

- return fixed timing and token metrics;
- verify duration conversion and field mapping;
- verify generation round `0` and refinement round `1`;
- verify component estimates sum to `total`;
- verify absent timing values become `null`;
- capture the outgoing Ollama payload and compare it with the current payload;
- validate successful results against the expanded schema; and
- confirm all pre-existing result fields and error shapes remain intact.

The live smoke test must use `qwen3-coder:30b`, exercise generation and one
refinement, and verify that both structured results contain real telemetry and
the live model digest.

## Files and Validation

Implementation changes are limited to:

- `vernaculus/mcp/server.js`
- `vernaculus/__tests__/server.test.js`
- `vernaculus/mcp/smoke.js`
- `vernaculus/README.md`
- Vernaculus version metadata updated by `scripts/bump-version.js`

Existing unrelated edits in `vernaculus/README.md` must remain intact. This is
a new plugin capability, so the Vernaculus version receives one minor bump after
the substantive changes.

Validation consists of the focused Vernaculus tests, protocol smoke test, live
generation smoke test, repository plugin validation, and strict Claude and
Codex manifest checks required by the repository instructions.

## Acceptance Criteria

- Generation and refinement return the approved telemetry schema.
- The fake-daemon test proves the Ollama request payload is unchanged.
- Existing success and error behavior remains covered and passing.
- A live generate/refine run records `qwen3-coder:30b` with its current digest
  and non-null Ollama timing metrics.
- Before-and-after evidence records the instrumentation overhead.
- The delegation skill and its behavior do not change in this pass.
