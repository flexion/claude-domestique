---
slice: the-reference-implementation
job: >-
  Verify that the reference linter and its mutation instruments detect the schema defects they claim
  to detect, producing an auditable fixture corpus and measured limits rather than assertions of trust.
ships:
  - kind: deterministic
    path: modus/scripts/lint-boundary.js
  - kind: deterministic
    path: modus/scripts/mutation-sweep.js
  - kind: deterministic
    path: modus/scripts/mutation-offset.js
  - kind: doc
    path: modus/docs/the-reference-implementation.md
gating_test:
  status: implemented
  command: npx jest modus/scripts/__tests__/lint-boundary.test.js modus/scripts/__tests__/mutation-sweep.test.js
  evidence: >-
    Exact finding-set assertions, generated enum totality, fixture necessity, and the null-mutation
    guard make a deleted or vacuous check visible.
non_gating:
  - Future adapter-backed locator-resolution integration.
  - Future runner-backed collected-test-case integration.
depends_on:
  - reconstructing-the-item
  - the-boundary-bundle
  - discharging-the-boundary
terminal_failure_owned: []
source_lines: 216-232, 269-274, 768-995
---

# The reference implementation

**Slice boundary.** Verify that the reference linter and its mutation instruments detect the schema
defects they claim to detect, producing an auditable fixture corpus and measured limits rather than
assertions of trust.

| | |
| --- | --- |
| Ships | `scripts/lint-boundary.js` · `scripts/mutation-sweep.js` · `scripts/mutation-offset.js` · this document |
| Gating test | *implemented* — `npx jest modus/scripts/__tests__/lint-boundary.test.js modus/scripts/__tests__/mutation-sweep.test.js`. Exact findings, totality, necessity, and mutation-oracle discrimination |
| Non-gating | Adapter-backed locator resolution · runner-backed collected-case integration |
| Depends on | [`reconstructing-the-item`](reconstructing-the-item.md) · [`the-boundary-bundle`](the-boundary-bundle.md) · [`discharging-the-boundary`](discharging-the-boundary.md) |
| Terminal failure owned | None — this slice verifies instruments; workflow slices own their stops |
| Source lines | 216-232, 269-274, 768-995 of the pre-split `autonomous-workitem-workflow.md` |

## Extraction note

The source's reference-tooling rules and measured results are retained; their order is condensed around
the maintainer's assurance job. The boundary statement and headings are new, and production-input
ownership is linked to its enforcing slices rather than repeated here.

Three claimed source lines were reworded when this work was extracted from `context-emendator/` into
its own `modus` plugin, and `lint-slice-headers` reports each as `W_CONTENT_NOT_FOUND` against
`70e2687`:

| Source line | Rewording |
| --- | --- |
| 810, 811 | The two `node`/`npx jest` invocations now name `modus/` paths. The commands are otherwise unchanged; only the directory moved. |
| 814 | The claim that these checks "are not wired into the root `npm test`" was true of a directory that was not a plugin and is false of one that is. Replaced with the `test:modus` workspace script that now runs them. |

Nothing else in the claimed ranges was touched. The measured results quoted from the source — survivor
counts, oracle contamination figures, test totals — are historical readings and keep the command
spellings they were taken with.

GOAL: Make every schema-local mechanical rule observable, testable, and honest about the domain it
does not yet receive from production.
HOW: Keep three linter passes and their fixtures explicit, assert their exact outcomes and enum
coverage, then challenge the test corpus with a measured mutation instrument whose oracle can itself be
falsified.
JUSTIFICATION: A finding that never fires, an exemption that resembles approval, or a mutation oracle
inside its own ground truth can all report confidence without detection. -- (no source — defects
observed in this reference implementation)
IMPACT: high — later workflow claims are no stronger than the checks that consume them.

## Three passes, one reference contract

`scripts/lint-boundary.js` exposes `lintBoundary` for authoring and freeze,
`lintInterpretationPair` for blind reconstruction comparison, and `lintEvidence` after tests exist.
`X_` codes are terminal; the suite asserts that the terminal and `X_` sets are identical so a code
cannot quietly become retryable.

The fixture corpus supplies second artifacts for item-part and collected-test-case domains. An absent
domain is a declared exemption, never a silent pass. Production item parts belong to
[`tracker-and-forge-ports`](tracker-and-forge-ports.md); production collected cases belong to
[`discharging-the-boundary`](discharging-the-boundary.md). The checks are already tested, so those
integrations feed known checks rather than arriving with untested ones.

## Tested checks, deferred production domains

The limits table has two rows with different consumers, so treating both as one unimplemented
integration was wrong:

| Limit | What it buys | Check written and tested | Production input |
| --- | --- | --- | --- |
| Locator resolution | A fabricated citation becomes catchable | `E_LOCATOR_UNRESOLVED` | Tracker adapter's addressable part list |
| Test-case collectability | A phantom test id becomes catchable | `E_EDGE_CASE_NOT_COLLECTED` | Runner's collected-case list |

Neither check needed its production input to be written and tested. `lintInterpretationPair` and
`lintEvidence` already accept a second artifact: fixtures supply it now, while the adapter and runner
supply it later. The present circularity is bounded—the author writes both locator and item-part list,
so the check catches a slip rather than a lie—and becomes non-circular when either list comes from
outside the author. An absent list must remain a declared no-domain exemption, never a silent pass.

`valid-item-parts.yaml` and `valid-collected-cases.yaml` are the current fixtures. The audit that
introduced this limit is also why the locator finding exists: a check's name is not evidence that its
input reaches it.

The linter stays tracker independent: the same boundary must lint for Jira, GitHub, Azure Boards,
Beads, and an opaque adapter reference. An id shape meaningful to one tracker has no meaning here.

## Fixtures and typing are evidence

The valid fixture is deliberately unrefined: it has a symptom but no goal, no numbers, and one
contradicted claim. `BUG-4471.yaml` predates the schema; it established both a handoff outcome and the
`stated_unverified` rule. A fixture written before a rule is stronger evidence than one tailored to it.

The suite asserts exact finding sets and outcomes, not an empty list alone. Necessity ensures every
emittable code fires somewhere; totality generates all eighteen
`verifier`/`verification_stage`/`obligation` cells. `js-yaml` turns unquoted `1.10` into `1.1`, even
with the core schema option, so quantity values must be quoted and the tests assert the hazard.

Run the reference checks directly:

```
node modus/scripts/lint-boundary.js modus/tests/fixtures/*.yaml
npx jest modus/scripts/__tests__/lint-boundary.test.js
```

They also run from root `npm test`, which reaches them through the `test:modus` workspace script.
That was a separate decision while this work lived in a directory that was not a plugin; extracting
it into `modus` settled it, because a plugin whose tests CI cannot run has been relocated rather
than extracted.

## Mutation instruments must discriminate

**The denominator was wrong twice, in opposite directions, and hid itself.** Two independent
implementations of this sweep first reported 33 sites / 264 mutations and 29 / 232. One found the loop
opening and then scanned a fixed 200-line window, overrunning into the following sweeps by 39 lines. The
other anchored on `entries.forEach((e, i) => {` and got the *first* match, which is an id-registration
one-liner 21 lines above the real loop. Six emission sites between them were outside the entry loop.

What made it self-concealing is the interesting part. A mutated guard on a site outside that loop
references an `e` that does not exist, so it throws `ReferenceError` — and because the guard is lazily
evaluated it throws only when it fires. A throw changes the battery's signature, so every phantom
mutation read as **caught** and contributed zero survivors. The inflated denominator therefore produced
no visible symptom, which is why one implementation reported the same 144 raw survivors under two
different denominators.

Reconciled: **28 sites, 224 mutations**, agreed by both implementations once bounded correctly. The
sweep now asserts that no mutation throws, because a phantom site silently counted as caught is the same
"passes for the wrong reason" shape the suite guards against elsewhere.

The corrected shares are **48%** and **59%** live for the two reachability methods, not the 41% first
reported — that figure divided by the inflated denominator, and the arithmetic error ran in the
flattering direction.

That caveat is now closed by measurement, and the answer is that **both** effects are real and neither
dominates. The battery compares the full code-and-outcome multiset per fixture, which is stronger than
the suite per fixture — that produces 32 false positives. It covers none of the generated, pair-pass or
YAML tests, which is narrower — that produces 37 false negatives. An earlier version asserted a single
direction without support, and a later one asserted the opposite direction on a circular measurement.
Measured: 132 against 137, overlapping in 100. The bias is now known in both directions and stated,
which is what makes the fast battery usable and what stops it being quoted as coverage.

An early offset experiment reported zero survivors because its oracle included the detector itself.
The suite now names the oracle explicitly and applies a null mutation first: unchanged source must
survive. If it reads as caught, the oracle is constant and the run aborts.

That guard catches one of two measured failure modes and not the other, which is why both are kept:

| Mode | Effect | Caught by |
| --- | --- | --- |
| Baseline stale relative to the linter | Oracle is a **constant** — the null mutation itself reads as caught, so every cell does | The null mutation, on iteration one |
| Instrument inside the oracle | Oracle is **self-referential** — mutating the linter changes what the sweep computes | Naming the oracle explicitly; the null mutation passes here |

Family A varies a shared instrument that can make agreement look like evidence. Family B asks which
check consumes a stated property. The first catches self-referential oracles and manufactured agreement;
the second catches properties stated but never checked. Neither detector replaces the other.

## Unrepresentable is a legal verdict

`tests/transcriptions/` holds cases transcribed from sources that predate the schema, each with a
declared verdict in `index.yaml`. This exists because a fixture written by the rules' author can only say
*I made this pass* or *I made this fail*; neither can express **a real case the schema cannot represent**,
so schema findings had nowhere to live.

One is on record. An obligation that only a party outside this repository can discharge — a vendor
attesting that a format change does not break their ingest — has no home in `verification_stage`, whose
members all name a point in *this* pipeline. An earlier draft had `verifiable_in` with an `external`
member and the rewrite to three closed fields dropped it. Encoding it as `production` + handoff
misstates it: the trigger is another organisation acting rather than an interval, and
`failure_transition` cannot revert something we do not control.

**It lints clean, and that is the finding.** The obligation is mis-encoded rather than malformed, so no
mechanical check can see it. A test asserts the clean result precisely so the gap cannot be lost. Either
`verification_stage` gains `external` with an event-triggered handoff, or the autonomy gate must reject
such an item at stage 1 and say so. It currently does neither.
