# Front-loading a task contract does not substitute for a diagnosis

**Measured 2026-09-18. Negative result. The design it was testing was not built.**

## The question

The existing measurement says a diagnosis naming the *cause* moves a local model
from 1 of 3 to 3 of 3 on this repository's own functions. It says nothing about
*when* that information has to arrive.

A proposed change to the Vernaculus tool schema would have replaced the free-text
`spec` with a structured contract — signature, behaviour, acceptance criteria,
ordering and placement rules, must-nots, exact error strings — on the theory that
supplying that structure up front would save the round trip the diagnosis
currently costs.

That theory had no supporting measurement. This is the measurement.

## Method

The fixture is this repository, unchanged from the earlier probes:
`comitatus/skills/herdr/scripts/up.js` with one function blanked, the complete
real `comitatus/__tests__/up.test.js` supplied verbatim as the specification, and
the whole suite run by Jest as the grade. Targets: `parseSelector`, `makeAgent`,
`parseArgs`.

Two conditions, single shot, no retries:

- **plain** — the brief used by the earlier probes.
- **contract** — the identical brief with a `=== TASK CONTRACT ===` block
  prepended, carrying signature, behaviour, the orderings the suite actually
  pins, must-nots, and the exact error substrings asserted by the tests.

**Both conditions receive the identical module and the identical complete test
file.** Every claim in the contract block is derivable from that test file.
The contract therefore adds no information — only structure and salience. If the
contract wins, structure is what did it.

Discipline applied while writing the contracts: an ordering was stated only where
a test actually pins one. Inventing an ordering the suite does not assert would
have been leaking an implementation rather than stating a contract.

`qwen3-coder:30b`, digest `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca`,
temperature 0, seed 42, `num_ctx` 32768, `num_predict` 4096, `truncate`/`shift`
false. Conditions interleaved per run. Control verified before the run: an
unmodified sandbox passes the suite, so a red is the model's function failing and
not a broken harness.

Harness: `tmp/ab-contract-probe.js`. Raw data: `tmp/ab-results.json`.

## Result

Identical in every cell.

| Target | plain | contract |
|---|---|---|
| `parseSelector` | 0/3 green | 0/3 green |
| `makeAgent` | 0/3 green | 0/3 green |
| `parseArgs` | 3/3 green | 3/3 green |

The same 1-of-3 the cold condition has always produced. The contract moved
nothing.

### The part that matters

In both conditions `makeAgent` fails on exactly one test: **`opencode without a
model throws`**. That is the precise rule the contract stated, near the top of the
prompt:

> For opencode, a selector carrying no model throws the missing-model error EVEN
> WHEN `effort=` is also present. The effort rejection applies only when a model
> IS present. Getting these two the wrong way round makes the wrong error win.

The model was told the exact defect, in plain language, before writing a line, and
produced the defect anyway. It is the same failure recorded in the skill from an
earlier session — "add the missing-model check", implemented after the effort
check so the wrong error won. Twice now, in two different framings, against two
different prompt shapes.

### Format compliance needs no enforcement

18 of 18 generations returned a clean fenced block containing the right
declaration, in both conditions. The existing one-line instruction already gets
full compliance on this model. An enforced output-format contract would be
enforcing something that does not fail.

## What this kills

- **Contract-first input schema.** Front-loading structure does not substitute for
  a diagnosis. Whatever makes a diagnosis work, it is not the information content:
  the model held that information in three simultaneous forms — the test file, the
  contract, and the module's own conventions — and still had to fail first.
- **An enforced output-format contract.** Nothing to enforce.
- **A size or complexity bound.** Never supported by evidence in the first place.
  The repository's measurements describe an *economic* threshold (a small function
  does not repay the diagnosis) and a *kind* exclusion (architecture, security,
  concurrency, multi-file), not a size limit.

## Limits of this result

- One model, one fixture, three runs per cell. A failure-mode map, not a
  reliability estimate.
- Only one of three cells was genuinely sensitive. `makeAgent` failing on a single
  test means an intervention had room to show there, and none did. But
  `parseSelector` may be out of reach for this model at any prompt shape, and
  `parseArgs` passes cold either way.
- Determinism is not guaranteed. The same plain prompt produced different output
  lengths across daemon loads, so temperature 0 with a fixed seed is not
  reproducible across restarts. Treat cell-level counts, not token counts, as the
  finding.
- This tests front-loading only. It says nothing about whether a *better*
  diagnosis, or a differently shaped refinement, would help.

## The question it opens

Why does a post-failure diagnosis work when identical information beforehand does
not? The candidate explanation is that the model needs its own wrong output in
front of it before a correction attaches to anything — but that is untested
speculation, and the repository already records that feeding back *raw test
output* does not work either (one function failed nine consecutive automated
retries).

Something between those two — its own draft plus a named cause — is the only
condition measured to succeed, and nobody has isolated which half carries it.
