# Session: satisficing-boundary

## Details
- **Branch**: chore/satisficing-boundary
- **Type**: chore
- **Created**: 2026-08-28
- **Status**: in-progress

## Goal
Assess the proposed autonomous Jira workflow against its stated satisficing boundary, with emphasis on low-value ceremony, internal correctness, operational feasibility, and unsupported claims; deliver the assessment to mac and help resolve the resulting architecture choices.

## Approach
- Review the proposal as architecture and as finished prose.
- Verify Jira and model-specific claims against current first-party documentation.
- Use a blind read to confirm whether the intended thesis survives the document's length and structure.
- Send a concise, actionable assessment to mac through herdr without editing the proposal.
- Pressure-test the replacement workflow's freeze point, oracle model, delivery boundary, audit record, and reviewer authority before endorsing it.

## Session Log
- 2026-08-28: Session created
- 2026-08-28: Completed an adversarial review of `context-emendator/docs/autonomous-jira-workflow.md`; herdr observed delivery of the assessment to mac as message `056fa2`.
- 2026-08-28: Mac independently verified the nine line-specific findings and requested design decisions for the replacement workflow. Replied as herdr message `7bb14d` with a mechanism-aware freeze, staged verification model, explicit merge boundary, per-attempt event stream, and bounded stop-only safety exception.
- 2026-08-28: Mac accepted the five design calls and proposed stage-count, production-handoff, and rejected-fingerprint completions. Replied as herdr message `b3896f`, fixing the pilot at seven serial states and tightening stage-growth and safety-resubmission rules.
- 2026-08-28: Dave narrowed the pilot goal to Ready for Merge, and mac committed the seven-stage rewrite as `2853b22`. Independently reviewed all 288 lines and sent eight residual correctness and feasibility findings to mac as herdr message `544a1e`.
- 2026-08-28: Mac addressed the eight findings in `13be488`. Independently reviewed all 340 lines, concentrating on the cross-product and change/preservation baseline rules, and sent eight remaining schema, oracle, dependency, durability, and review findings as herdr message `fd2761`.
- 2026-08-28 (mac): Revised `satisficing-boundary-briefing.md` and `-near-term-artifacts.md` against a per-source pass over `satisficing-references/text/`; quotations were accurate but several inferences were not. Committed as `27a0384`. Authored the 24-phase workflow as `49e3418`.
- 2026-08-28 (mac): Fixed hugh's first nine findings in `6939dc2`, then replaced the 24-phase design with the seven-stage Ready-for-Merge pilot in `2853b22` — 10,484 words to 3,698 — after Dave resolved the terminal-state fork.
- 2026-08-28 (mac): Repaired hugh's second eight findings in `13be488`, including a regression of mine that made preservation invariants unrepresentable, and gave the `entails` map an author, a linter check, and a reviewer in `c761e7e`.
- 2026-08-28 (mac): With hugh unavailable, built the boundary linter, fixtures, and jest suite as `975c802` to replace the lost independent reviewer with a mechanical one. Writing it found five document gaps in one pass that three prose review rounds had missed.
- 2026-08-28 (mac): Transcribed the source conversation's worked example as an independent fixture, which exposed a decorative trace rule; closed it in `7364b2c`.
- 2026-08-28 (mac): Hugh reviewed the executable artifacts and found the load-bearing defect — both trace rules decided provenance by id spelling, and my own positive fixture defeated them by accident. Replaced inference with a declared `registry_selections[]` and split the evidence map into a stage-5 pass in `0bdc14c`. Tagged `review-target-2`.
- 2026-08-28 (mac): Closed hugh's addendum — necessity, evaluated-versus-fired, totality, and provenance. The commit stalled twice on the 1Password signing agent, which lists the key from cache but fails the signing operation; left staged rather than bypassed with `--no-gpg-sign`, and landed once the agent was available.

## Key Decisions
- Recommend revising before implementation and piloting seven serial workflow states with one structured run record; the earlier five-stage compression target is superseded.
- Preserve the core boundary mechanisms while requiring evidence before adding phases, mirrored artifacts, repeated clean reviews, or per-mandate agents.
- Freeze only after a bounded mechanism sketch and mechanism-aware coupling review; a genuinely new post-freeze obligation invalidates the boundary and starts a new run rather than mutating criteria in place.
- Do not call semantic or production obligations non-gating acceptance criteria. Model verification with closed verifier, stage, and obligation fields; reserve non-gating status for explicit watch items.
- Include branch, pull request, and CI in the pilot, with human merge as the approval boundary. Treat `Ready for Merge` as the autonomous terminal state and set Jira `Done` only after a confirmed merge.
- Make the run record one append-only event stream per run attempt, with a single writer and immutable referenced evidence; render views on demand rather than maintaining Markdown mirrors.
- Bound uncited severe findings as corroborated, stop-only requests for boundary invalidation from a closed hard-harm taxonomy. They may not create repair work or expand scope inside the run.
- Fix the serial state count at seven: qualify/claim, author boundary, independently review/freeze, implement candidate, run mechanical CI gate, run independent semantic review, and finalize the Ready-for-Merge handoff. Logging and projections are cross-cutting infrastructure; safety adjudication is a conditional exit to `boundary_invalid`.
- Treat seven as a ceiling. Add another persisted state only after two independent pilot failures of the same causally diagnosed class, or one confirmed hard-harm event, and only when an existing state cannot absorb the remedy.
- In this pilot, `obligation=must` plus `verification_stage=production` requires a feasible named handoff and caps the run below `Done` until discharged. Merge alone permits `Done` only when no post-merge or production must remains.
- Preserve rejected safety requests as events. Suppress only an identical evidence submission; allow materially new evidence one adjudicated reopening before requiring human override.
- Keep Dave's Ready-for-Merge goal, human merge boundary, and named deploy/rollback handoff. The seven-stage rewrite is materially better but still needs revision before implementation; none of the remaining fixes requires another stage.
- Treat eligibility as preliminary at claim time and conclusive only after boundary authoring discovers coupling and staged obligations.
- Freeze a named boundary bundle or manifest on an already isolated branch or durable artifact store; do not claim one file is the sole downstream input while consuming separate sketch and coupling artifacts.
- Specify a complete verifier/stage/obligation compatibility matrix, including handoffs for both post-merge and production must obligations.
- Do not equate test discrimination with universal base failure: change obligations and preservation invariants need different baseline expectations and a many-to-many criterion/test evidence map.
- Do not claim idempotency or crash recovery from event metadata alone; the implementation needs durable append, fencing, operation identities, side-effect reconciliation, and explicit lease cleanup.
- Keep `test_role` conditional on pre-merge mechanical must entries, define the declared baseline as a closed schema field, and map evidence at a test-case or subtest granularity so mixed baseline expectations cannot hide behind one runner result.
- A preservation check needs a negative control or known-bad perturbation proving sensitivity to the invariant; pass-on-base plus pass-on-head alone admits vacuous tests.
- Any boundary amendment must invalidate and recompute affected sketch, coupling, invariant, handoff, and eligibility data before the bundle is re-reviewed and frozen.
- Mechanical coupling matching may use only an explicit frozen coupling-to-obligation mapping; mere presence in a coupling map or trace proves knownness, not entailment.
- Durability claims require effect-specific enforcement and reconciliation. A fencing token or operation identifier is useful only where the external sink or a credential-holding adapter actually enforces it.

## Learnings
- The proposal's deterministic gates validate the shape of model-authored fields more often than their semantic truth.
- The design has direct phase contradictions around criteria freezing, testability, production-only verification, and review caps.
- Jira transitions, permissions, concurrency, rate limits, and the path from code changes through merge and deployment are not yet designed.
- A mechanism-agnostic freeze makes ordinary coupling knowledge arrive too late, while same-run criterion mutation defeats the freeze; a bounded pre-freeze mechanism sketch is the workable middle.
- A single file per Jira issue is not a safe audit primitive when an issue can be retried or refrozen; run-attempt identity and single-writer sequencing are required.
- Stage count is meaningful only for persisted workflow states with distinct entry and exit conditions; counting every artifact, actor, or operation recreates phase inflation under another name.
- A stable safety finding identity and a per-submission evidence digest are both needed: the former keeps the hazard visible, while the latter distinguishes duplicate veto attempts from material new evidence.
- `run_id`, `seq`, and input digests make replay addressable but do not make external Jira, git, PR, or CI effects idempotent; a crash between an effect and its event remains an unresolved split-brain case.
- Mechanical actors cannot decide handoff feasibility or whether new coupling is semantically entailed unless those judgments are reduced to an exact frozen comparison; ambiguity must stop or route to an adjudicator.
- Calling Ready for Merge terminal while retaining the same lease and event writer through a later human merge conflates the autonomous stop state with the broader issue lifecycle.
- A many-to-many entry/test map is not sufficient when the test runner exposes only one aggregate result; the evidence edge must identify the independently observable test case or assertion and its expected base/head outcomes.
- Preservation introduces a different discrimination question from change: outcome stability does not establish that a test would detect the prohibited regression.
- A consumer appearing in the coupling analysis is not evidence that a frozen obligation covers it; permissive plan-correction decisions need an explicit reviewed mapping or independent semantic adjudication.
- (mac) Writing the validator found five document gaps in a single pass that three rounds of prose review had missed, all of the same class: prose naming a field that no actor writes. Schema-first would have caught them earlier and cheaper than any reader.
- (mac) A test suite that asserts only failures does not pin a linter. 45 codes were emitted and 24 asserted, and eight check sites — including one this document calls mechanical — could be deleted with the suite fully green. Mutation testing is the only thing that measured it.
- (mac) Asserting an empty finding list cannot distinguish "every check ran and passed" from "a check never ran", and an exemption reads identically to approval. That is the mechanism that hid the spelling-based provenance bug for two commits. A linter should record outcomes, not only failures.
- (mac) Fixtures written by whoever wrote the rules inherit that author's blind spots. A positive fixture I wrote defeated two of my own rules by accident, in the same commit whose message described catching that class of error in the negatives.
- (mac) `unrepresentable` has to be a legal fixture verdict. Otherwise every fixture says either "I made this pass" or "I made this fail", and a finding about the schema itself has nowhere to live. One is now on record: an obligation only an external party can discharge has no home in `verification_stage`, and it lints clean, which is the finding.
- (mac) I asserted in the document that tests proved `1.10` survives as a string. False twice: the loader option did not discriminate, and the test quoted its own input. Unquoted, `1.10` becomes `1.1` under every configuration, so the mitigation had to move into the linter as a required quoted form.

## Files Changed
Hugh's review rounds changed no source; the entries below are mac's.

- `context-emendator/docs/research/satisficing-boundary-briefing.md` — narrowed to the sources' stated scope.
- `context-emendator/docs/research/satisficing-boundary-near-term-artifacts.md` — same, plus the removed overlap tally recorded rather than deleted.
- `context-emendator/docs/autonomous-jira-workflow.md` — 24-phase design, then the seven-stage Ready-for-Merge pilot, then four rounds of repair.
- `context-emendator/scripts/lint-boundary.js` — two-pass reference linter, 45 codes, outcomes recorded.
- `context-emendator/scripts/__tests__/lint-boundary.test.js` — 64 tests: hand-written negatives, generated enum and cross-product totality, a necessity assertion, and the transcription register.
- `context-emendator/schemas/fixtures/` — one valid manifest, one valid evidence map, 22 negatives across both passes.
- `context-emendator/schemas/transcriptions/` — cases predating the schema, with declared `representable` / `unrepresentable` verdicts.
- `context-emendator/docs/research/lint-boundary-review-hugh.md` — hugh's written review, kept.

## Next Steps
Open, in the order that would change the most:

- No same-budget baseline exists. Until one strong single-pass run is measured against the pilot on real issues, the whole seven-state apparatus is a well-provenanced hypothesis. Huang's first prescription, and the one thing that would tell us whether any of this pays.
- The comment-preserving round-trip loader is unimplemented, so the freeze digest does not yet mean what stage 3 claims. Node needs the `yaml` package rather than `js-yaml`; Python needs `ruamel` at `typ="rt"`.
- Test-case collectability is unchecked — it needs the runner, and faking it would be worse than the gap.
- `verification_stage` has no `external` member, so an externally-attested obligation is silently mis-encodable. Either add it with an event-triggered handoff, or make the stage-1 gate reject such issues and say so.
- Twelve of the twenty-two source briefings remain unread; three back claims still standing in the revised research docs (Rao on protocol predeclaration, ResearchRubrics on ternary-to-binary, PaperBench and Lightman on JudgeEval and process supervision).
- Nothing here is wired into the root `npm test`; `context-emendator` has no package manifest.
