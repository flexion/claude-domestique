---
name: delegate-to-local-model
description: Use when handing well-specified coding work to a locally hosted model through the vernaculus MCP tools, when deciding whether a task is worth delegating at all, or when a local model's draft fails its tests and the next message has to be written.
---

# Delegating to a local model

The tools are `ollama_models`, `ollama_generate`, and `ollama_refine`. This skill
is about using them in the one sequence that measured well, and recognising the
tasks where delegating loses.

## The loop

```
brief → generate → verify → diagnose → refine → verify
                      ↑                            │
                      └────────────────────────────┘
```

**The diagnose step is the whole thing.** Measured on three real functions from
this repository, each with a complete pre-existing Jest suite handed to the model
verbatim:

| condition | result |
| --- | --- |
| cold, single shot | 1 of 3 |
| plus automatic retries on raw test output | 1–2 of 3; one function failed 9 consecutive times |
| plus a diagnosis naming the cause | **3 of 3, zero behavioural divergence** |

Nothing changed but whether the orchestrator read the failure and said why.
Directed turns also ran roughly twice as fast as cold ones, because the model
stops searching.

## Writing the diagnosis

A failing test states a **symptom**. It is structurally incapable of stating a
**cause**. Feeding raw test output back is what produced the nine consecutive
failures above — the model re-derived the same wrong idiom every round because
nothing told it the idiom was wrong.

Not this:

> Expected `ollama/qwen2.5:7b`, received `ollama/qwen2.5`.

This:

> You used `spec.split(':', 2)`. In JavaScript, `String.prototype.split(sep, limit)`
> TRUNCATES the result array — it does not put the unsplit remainder in the last
> element the way Python's `maxsplit` does. Use `indexOf(':')` then `slice()`.

**Read the draft before you diagnose.** A cause inferred from the failing test
alone names the wrong defect — and the model then applies that wrong cause
faithfully, leaving the real one untouched. Open the code it wrote and find the
mechanism there.

**State ordering and placement explicitly.** An underspecified diagnosis is
implemented faithfully and still fails:

- "Add the missing-model check" — it was added *after* the effort check, so the
  wrong error won on an input where both applied.
- "Don't validate the handle" — the validation loop was moved inside a branch,
  so bare values stopped being validated at all.

Neither was the model's error. Both were the diagnosis being incomplete. If
position matters, say where.

## Deciding whether to delegate at all

Delegation converts your **output** tokens into **input** tokens, which is the
only reason it can pay. Everything else erodes that.

**Pass context with `files`, never by pasting.** Pasting source into
`inline_context` spends output-rate tokens to resend what is already on disk.
Measured: 11,850 tokens of context delivered via `files` cost ~90 output tokens.
The same context pasted inline cost more than writing the function by hand.

**Expect to break even on a small function.** For a ~340-token function, one
cold generation plus one diagnosis came to roughly the same output tokens as
writing it directly. Delegation earns its keep on volume — a large artifact in a
shape you already trust — not on a tight 30-line function where the diagnosis is
nearly as long as the code.

**Do not delegate** architecture, security, concurrency, or multi-file
refactors. The measured failure mode is confident, plausible, wrong code that
reads cleanly.

**A more complete brief does not avoid the loop.** Structure supplied before the
first attempt — acceptance criteria, ordering rules, the exact strings required —
has not moved a result; only a diagnosis after an observed failure has. Budget
for generate → verify → diagnose → refine, not for a spec good enough to
one-shot.

## Verifying

`verified` is always `false` in the result. The server never runs the code.

A passing test suite is **necessary and not sufficient**. A draft has passed a
complete suite while silently accepting malformed input the original rejected;
another added an unrequested helper function. Run a differential
probe against the original where one exists: feed both the same edge inputs and
compare values and throw/no-throw, not just the test result.

Expect error-message wording to differ; the repository's phrasing is the
idiosyncratic part, not the model's. If exact strings matter, say so in the
spec — many suites assert them character for character, and this is the failure
that survives an otherwise correct function.

## Reading the result

Every call returns structured content, so nothing needs parsing out of prose:

- `code` — the extracted fenced block, or `null` if there wasn't one
- `session` — pass to `ollama_refine`. **In-memory only**; lost when the server
  restarts, and then you start over with `ollama_generate`
- `truncated` — `true` means the draft is cut off at the `num_predict` ceiling.
  Raise it and retry; do not use a truncated draft
- `prompt_tokens` — authoritative, from the server. Compare against
  `budget.input_budget`
- `model_digest` — Ollama tags are mutable pointers, so a result without the
  digest is undated. Record it beside any measurement you keep

An over-budget prompt is **refused**, not silently trimmed. That is deliberate:
without it, Ollama keeps `C - max(floor((C-K)/2),1)` tokens, drops the middle,
and reports nothing — leaving a starved model indistinguishable from an
incapable one.

## Choosing a model

Call `ollama_models` first. `default_model` is resolved from live inventory and
prefers code-specialised tags; a hardcoded preference list went stale the moment
a better model was pulled. Note that a general-instruct tag and its `-coder`
sibling are different models — `qwen3:30b` is not `qwen3-coder:30b`.

## Further reading

`references/front-loaded-contract-experiment.md` carries the measurements behind
the two rules above: a complete brief does not avoid the loop, and the model
cannot diagnose itself. `references/local-model-delegation-findings.md` carries
the earlier measurements and the options considered. `references/launch-surface.md` covers the mechanical
launcher surface for running a local model as a peer agent instead of a
subordinate tool — a different topology with different failure modes.
