# Session: mantra preserve the active user objective when choosing the next action

## Details

**Issue**: #181
**URL**: https://github.com/flexion/claude-domestique/issues/181
**Branch**: issue/feature-181/active-user-objective
**Type**: feature
**Created**: 2026-10-08
**Status**: complete
**Lead**: tim (Codex, medium effort)
**Verifier**: jay (Claude, medium effort)

## Goal

Mantra: preserve the active user objective when choosing the next action. Use the GitHub issue body as the acceptance criteria.

## Approach

Token-efficiency follow-up requested by kit: compress only #181's recurring objective paragraph while preserving its distinctions; rerun the same five cases against the retained baseline, with independent jay verification and a separate compact snapshot/report. Keep assessment/research compression with their owners. No extra runtime machinery or additional version bump.

After review, restore the single word "campaign" to avoid tightening the research boundary. Verify the exact corrected snapshot on all five cases once against the retained baseline; retain the earlier three-repetition compact evidence under its own hash.

Bounded change authorized by the operator's implementation task: append concise active-objective guidance to the stateless behavior hook, add an Active objective section to the assessment skill, and document it in the behavior companion and README. Distinguish questions/observations/action requests, honor explicit discussion pauses, retain prior answers and authorization, and clarify only ambiguity that materially changes the action. No intent ledger, additional state, or approval stage. Existing assessment and research paragraphs remain owned by #183 and #182 respectively. Verify hook delivery with Jest, then compare current HEAD and revised guidance on identical multi-turn cases with independent Claude verifier jay; report unnecessary interactions and failures without inferring causality from a small sample. Run invocation probes and affected plugin validation, then bump mantra once. Do not commit, push, create a PR, close GitHub issues, or file beads.

## Session Log

- 2026-10-08: Worktree and paired agents launched from refreshed origin/main at operator request; session initialized before task assignment.
- 2026-10-08: Fetched #181 and inspected Mantra hook, assessment/skeptic skills, companion, tests, and probe harness. Coordinated additive section ownership with sly (#182) and mae (#183); assigned paired behavioral comparisons to jay. Main risk: extra intent checks could cause confirmation loops; testing must count these explicitly.
- 2026-10-08: Added active-objective guidance to behavior hook and assessment skill, plus documentation. New hook delivery checks failed on baseline text then passed after the change. Full npm test passed (569 tests); metadata and pinned Claude plugin/marketplace validators passed; Codex assess invocation fired from a fresh temporary home. Bumped Mantra to 0.7.0. Jay's review found no blocking delivery defect; clarified README injection wording and recorded companion/documentation limits. Paired multi-turn comparisons remain in progress.
- 2026-10-08: Hal relayed the operator's preference to simplify proposed and existing designs. Reassessed: no new runtime state, branching, or deterministic machinery is needed. Removed the unnecessary injected ban on ledgers/approval stages while retaining the behavioral clarification threshold. Jay will keep earlier candidate evidence distinct and exercise the final simplified wording on all five cases. Focused tests and metadata revalidated successfully.
- 2026-10-08: Simplification review removed the duplicated new companion section and reduced exact-phrase delivery assertions to one marker. Hook and assessment guidance remain unchanged from the final comparison snapshot. Mantra's 25 tests passed again. Repeated final Codex invocation probe passed; full output saved in the review directory.
- 2026-10-08: Completed independent verification with jay: baseline, candidate and final each passed all five cases 3/3 (45 conversations, 117 turns, no aborted conversations). Baseline already passed, so no improvement or causal fix is demonstrated. Report records unsolicited commit/standing-practice/unrelated-task offers and candidate/final A3 non-literal scope choices. Independently inspected report and selected raw/parsed evidence; final source hashes match the tested hook and assessment snapshots. Jay approves with stated limitations. Repeated full npm test after simplification: 569 tests passed. All work remains uncommitted; no push, PR, issue closure, or beads operations performed.
- 2026-10-08: Kit relayed the operator's token-efficiency direction and requested coordination before compacting injections. Shared the final objective paragraph, required semantics, ownership boundaries, and an untested shorter candidate. Kit must compact sly/mae's revised assessment/research text rather than restore baseline policies; rewritten injections cannot inherit this report's exact-snapshot evidence. Verified source is unchanged.
- 2026-10-08: Kit requested #181 lead assess and apply its own compression and rerun matched cases if changed. Reopened implementation follow-up; compressed wording preserves explicit implementation pause, contextual intent, retained authorization/answers, action/observation distinction, and consequential clarification. Earlier snapshot evidence will remain separate.
- 2026-10-08: Applied compact recurring paragraph (92 to 75 words, 670 to 549 characters; not a model-token measurement), hook SHA b689e61f. Full npm test passed again (569 tests), metadata and whitespace checks passed. Jay is exercising the compact arm with identical cases/settings and the retained baseline; assessment skill and existing hook paragraphs remain unchanged.
- 2026-10-08: Compact b689e61f passed all five cases 3/3 and jay approved with limits. Independent reading found omitted unrelated ISSUE.md mentions; jay recounted every arm and corrected both tables. Kit requested restoring "campaign" to preserve the original research boundary: final hook SHA 2a0d673a, 558 characters/76 words (16.7% fewer characters than the previous 670, not measured model tokens). Focused tests and metadata passed; jay is checking the exact corrected snapshot across all five cases once, keeping sample sizes and earlier evidence distinct.
- 2026-10-08: Exact scope-restored compact snapshot 2a0d673a passed all five cases once (5 conversations/13 turns, no errors); jay independently approves. Current tests: 569 pass; metadata/whitespace pass. Retained baseline already passes, so no improvement demonstrated. Current run retains two unsolicited commit offers and one standing-practice offer. Compact-scope addendum explicitly distinguishes n=1 from prior n=3; initial fixture bootstrap blocked on inherited SSH commit signing, resolved with gpgsign=false only on fixture commits. Handoff to kit preserves campaign scope and reports text-size reduction only. Work remains uncommitted.

- 2026-10-08: Operator authorized an independent commit, push, and PR. Final precommit verification passed: full suite 569 tests, repository metadata, pinned Claude Mantra and marketplace validators, and whitespace checks. Retain all comparison transcripts for review and describe the exact final n=1 snapshot separately from earlier n=3 arms; no demonstrated improvement over baseline. Session finalized with code before commit.

## Files Changed

- Session and branch metadata initialized.
- `mantra/hooks/behavior.js`, `mantra/hooks/__tests__/behavior.test.js`: objective guidance and delivery checks.
- `mantra/skills/assess/SKILL.md`, `mantra/README.md`: assessment scope and documentation; companion addition removed after review.
- Mantra package and both host manifests, `.claude-plugin/marketplace.json`: 0.7.0 version.
- `docs/reviews/181-active-objective/`: comparison harness/evidence and validation record.

## Acceptance Criteria

- [x] Exercise multi-turn pause, observation, action-request, and consequential-ambiguity cases: harness cases A-D, plus retained-authorization case E.
- [x] Answer paused discussion without implementation or repeated resume permission: case A passes on the exact final snapshot.
- [x] Act on clear requests without launching unrelated work from observations: cases B and C pass on the exact final snapshot.
- [x] Preserve earlier answers and authorization across follow-ups: cases D and E pass on the exact final snapshot.
- [x] Compare baseline and revised guidance on identical cases and report outcomes, unnecessary interactions, and failures without adding a ledger or approval stage: review README, parsed records, and raw streams retained. Baseline already passes; no improvement is demonstrated.

## Next Steps

The operator typed "commit push and PR" in tim's session, authorizing an independent #181 commit, push, and pull request. This supersedes the initial prohibition on those actions; issue closure and beads operations remain excluded. Implementation and verification are complete, with current hook hash 2a0d673a and assessment skill efce475d. After PR creation, review/merge remains with the operator; coordinate shared Mantra version metadata and #181/#182/#183 sections when merging independent PRs. Codex multi-turn behavior and original long-session failures remain unverified.
