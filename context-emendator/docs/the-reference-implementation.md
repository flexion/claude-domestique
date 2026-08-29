---
slice: the-reference-implementation
job: >-
  Verify that the reference linter and its mutation instruments detect the schema defects they claim
  to detect, producing an auditable fixture corpus and measured limits rather than assertions of trust.
ships:
  - kind: deterministic
    path: context-emendator/scripts/lint-boundary.js
  - kind: deterministic
    path: context-emendator/scripts/mutation-sweep.js
  - kind: deterministic
    path: context-emendator/scripts/mutation-offset.js
  - kind: doc
    path: context-emendator/docs/the-reference-implementation.md
gating_test:
  status: implemented
  command: npx jest context-emendator/scripts/__tests__/lint-boundary.test.js context-emendator/scripts/__tests__/mutation-sweep.test.js
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
| Gating test | *implemented* — `npx jest context-emendator/scripts/__tests__/lint-boundary.test.js context-emendator/scripts/__tests__/mutation-sweep.test.js`. Exact findings, totality, necessity, and mutation-oracle discrimination |
| Non-gating | Adapter-backed locator resolution · runner-backed collected-case integration |
| Depends on | [`reconstructing-the-item`](reconstructing-the-item.md) · [`the-boundary-bundle`](the-boundary-bundle.md) · [`discharging-the-boundary`](discharging-the-boundary.md) |
| Terminal failure owned | None — this slice verifies instruments; workflow slices own their stops |
| Source lines | 216-232, 269-274, 768-995 of the pre-split `autonomous-workitem-workflow.md` |

## Extraction note

The source's reference-tooling rules and measured results are retained; their order is condensed around
the maintainer's assurance job. The boundary statement and headings are new, and production-input
ownership is linked to its enforcing slices rather than repeated here.

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

## Mutation instruments must discriminate

The fast sweep is a biased pre-filter, not a coverage measurement. It reports 132 fixture-corpus
survivors; the real oracle reports 137; 100 overlap. Thirty of the 37 apparent real-only survivors are
vacuous because the code cannot fire in their cells, leaving seven genuine gaps, now closed.

An early offset experiment reported zero survivors because its oracle included the detector itself.
The suite now names the oracle explicitly and applies a null mutation first: unchanged source must
survive. If it reads as caught, the oracle is constant and the run aborts.

Family A varies a shared instrument that can make agreement look like evidence. Family B asks which
check consumes a stated property. The first catches self-referential oracles and manufactured agreement;
the second catches properties stated but never checked. Neither detector replaces the other.
