# Session: review-establishes-stopping-conditions

## Details
- **Branch**: issue/feature-173/review-establishes-stopping-conditions
- **Type**: feature
- **Created**: 2026-09-03
- **Status**: in-progress

## Goal
Produce a freeze-candidate boundary for gh-173, which makes the `agent-work-item`
review establish all six conditions its step 9 stopping rule names. Step 8 asks two
questions covering three conditions; what must keep working, what is out of scope,
and what is handed off are asked about by nothing.

## Session Log
- 2026-09-03: Session created
- 2026-09-03: wes and zed read gh-173 independently and converged: a step-8 prompt-contract change, routing and the two-round cap unchanged, #172's return-shape repair kept separate. Operator ruled that the boundary and step 9's six conditions are the agents' completeness test, not the operator's artifact, so what "handed off" must mean was ours to settle.
- 2026-09-03: Settled "handed off" as every live residual the boundary will not discharge, each with a named disposition, sourced from per-entry later-stage handoff objects, `uncovered` coupling edges, and only those `non_goals` deferring live work. zed corrected two over-reaches in wes's first version: an `uncovered` edge is a finding until routed rather than satisfied by being declared, and a `non_goal` excluding work with no residual needs no destination.
- 2026-09-03: Pass 10 drafted `boundary/gh-173.yaml` through steps 1-7, both lint forms clean, `exempt` zero, `W_NO_FLOOR` recorded. Step 2 found five obligations the item never mentions, the sharpest being OB-7: the installed plugin serves pre-change skill text once step 8 is edited, so a review dispatched through it verifies the wrong artifact and returns a meaningless pass. Step 7 found `boundary-prose.md` crediting a script with the word caps and banned-word list that no script checks.
- 2026-09-03: Filed the residuals `domestique-37o` (falsifiability check has no reader in the review), `domestique-crl` (`refinement-loop.md` attributes to step 8 a check step 8 does not ask), `domestique-13n` (`boundary-prose.md` credits a script with checks no script performs). Overrode step 9b, which would write the run into `pass9` and mix two items; used `pass10`.
- 2026-09-03: Pass 10 ended at the step-8 cap with two real defects outstanding. OB-4 lacks sensitivity to false YES answers; OB-6 proves cross-file version synchronization but omits the base-to-head bump C8 requires. Boundary handed over unfrozen and unfixed, per the cap rule. Record in `docs/passes/pass10/stage2-review.md`.

### To revisit after pass 11

Three process failures caused pass 10 to reach the cap, and none of them was the
boundary being hard. Recorded here to check against pass 11's outcome rather than
re-derived later.

1. **The question set was not frozen before the review began.** wes worded Q6 one way
   for round one ("true by construction of its own observation") and a wider way for
   round two ("or where the failure the entry exists to exclude would read as a
   pass"). Round two's findings answer the second clause. The rounds were therefore
   not two samples of one question, the review's target moved mid-pass, and the
   "what each question set found" comparison reported to the operator was weaker
   than presented. The dispatch was wes's, so this was invisible to every other
   participant.
2. **A drafter's repair gets one fewer look than the original draft.** wes's
   round-one fix to OB-4 reintroduced the same defect class the same boundary
   already documented in its C5 annotation, and round two was that repair's first
   reader.
3. **OB-6's defect was mechanically detectable and no check existed.** `entails`
   maps CPL-4 to OB-6, CPL-4's hazard reads "needs the version bumped" — change
   semantics — and the entry carried `test_role: preservation`. Comparing an edge's
   hazard against its mapped entry's test role is scriptable and was not scripted.

Operator's framing, which is the standard for pass 11: **the hard cap is a
failsafe, not a good pass.** Reaching it twice would be information about the
boundary; reaching it for any of the three reasons above would be a process failure
repeating.

Check after pass 11: did the frozen question set hold identically across both
rounds, did zed see every repair before the next round was dispatched, and did the
mechanical checks catch anything a reviewer would otherwise have had to find.

### Answered, after pass 11

Pass 11 ended **negative, cap fired, boundary handed over untouched**. Not a freeze
candidate. Eleven real findings in round two, classified by zed: nine
requirement-coverage mismatches and two insensitive/gameable decisions, with W-1
rejected. Record in `docs/passes/pass11/stage2-review.md`.

All three process failures were fixed, and the fixes held:

1. **Question set held.** Frozen and digested before the boundary was edited,
   dispatched by reference rather than pasted, and independently re-measured by zed
   before and after each round. Both rounds reported the same digest as read. It did
   not move.
2. **Every repair was verified before the next dispatch.** Six gate cycles, four of
   which blocked — including two blocks on repairs that had already passed one gate.
3. **The mechanical checks exist and are probed.** `check-boundary.js` reports pass
   10's exact OB-6 defect when reintroduced. But it found nothing new on pass 11's
   artifact, so no pass-11 finding is attributable to it. It is a regression net, not
   a discovery tool, and it should not be credited as one.

**The conclusion that matters: a correctly executed pass still returned negative, so
the findings are not process artifacts.** Nine of eleven are one defect class, and it
is a property of the strategy rather than of any entry — these preservation entries
verify a requirement by reading text for a property, and a text-reading decision can
always be satisfied while the requirement is defeated from outside what it reads.
Every pass-11 repair closed one axis and left the orthogonal axis open: PRES-1 reads
wording and not scope, PRES-7 reads scope and not wording, PRES-10 forbids a
qualifier on *when* so head qualifies *what*.

Two things to carry forward rather than rediscover:

- **The drafter's repairs are the highest-defect region of the artifact.** Across both
  passes, nearly every finding after the first draft was in a repair rather than in
  original work. The pre-dispatch gate is what makes that survivable, and it is worth
  its cost.
- **A verifier who only ratifies is not a check.** zed withdrew his own acceptance of
  PRES-11's sole-owner premise at the final classification, having cleared it at an
  earlier gate. That reversal is the single most useful event in the pass.

Open question for the operator, not for us: whether to reconsider the preservation
strategy rather than repair eleven entries inside it. Repairing within the strategy is
what has now failed twice.

### Pass 12, and the loop

Operator authorized a redraft of the preservation strategy, then dropped the eval,
then stopped the review at six corrections. Record in `docs/passes/pass12/redraft.md`.
Boundary is 26 entries, both lint forms clean.

Six text-reading preservation entries replaced by run-and-observe entries. An eval
obligation was drafted and withdrawn: the argument for it rested on a false claim
about the repository (`modus/evals` has never executed; `probe-skill.js` does no
scoring) and was unnecessary anyway, because a dispatched review already is a run
under `independent_review`. Residual filed as `domestique-5y6` — the preservation
entries are verified once and re-run by nothing after the freeze.

**Why it looped, which is the thing to carry forward.** Every review cycle invented
new adversarial witnesses instead of testing against a fixed set. A "name an input
where this passes while the failure occurs" question has a near-zero found-nothing
rate — constraint 3 in the modus README, which the skill's own step 2 cites. Applied
to repairs it never terminates: every repair is new text and new text admits new
witnesses. Ten gate cycles across two passes each produced real findings and would
have kept producing them. Neither agent supplied a termination condition; the operator
did.

This is pass 11's defect one level up. Pass 11's question set moved between rounds;
pass 12's *witness* set moved between gates. The fix is the same both times: freeze
the corpus before reviewing, and treat an unbounded search question as a source of
candidates rather than as a gate.

### Verification technique: probe-skill, not the Agent tool

Operator-supplied and verified in the source, not taken from the doc. This is the
instrument the frozen boundary implicitly requires, and getting it wrong would have
produced verification that means nothing.

**`scripts/probe-skill.js` loads the plugin from source.** Line 144 passes
`--plugin-dir <dir>`; the comment at line 21 says "reads the source directory
directly." A probe run therefore exercises the worktree `SKILL.md`.

**Agent-tool subagents do not.** They run inside the parent session and load its
installed plugins — currently `modus/0.3.0` from the plugin cache. So dispatching a
reviewer through the Agent tool after editing `SKILL.md` exercises the PRE-CHANGE step
8 and returns a pass that says nothing. That is CPL-5 and C7, and OB-7 exists for it.

This did not bite in passes 10 and 11 only because those reviewers read the boundary
*file* and answered questions handed to them; they never invoked the skill. Every
PRESB entry requires the skill to run, so from here it is decisive.

**The self-dispatch trap.** PRESB-1 asks whether a review under head asks all five
questions. If the dispatcher extracts the questions and sends them, the *dispatcher*
asked them, not the skill, and the entry is satisfied by the wrong actor. Only a run
where the skill drives its own review can establish it. probe-skill is the only
instrument here that does that.

**Four limits, none of them fatal:**

- No scoring. It prints which skills fired and the response; judging is ours. probe
  produces the run, a fresh reader produces the verdict — which is what
  `independent_review` already expects.
- Its baseline arm is *no plugin*, not *base revision* (line 142). Entries with
  `test_role: change` need base-vs-head, so run probe against two checkouts.
- `--cwd` refuses to start against uncommitted work outside `docs/passes/`
  (`requireCleanTree`, lines 124-137). Verification runs against a committed edit, not
  a dirty tree.
- One run, not three. The sampling limit stands: a fixture exposes the branch it
  selects and nothing else.

**`--stream <path>` captures the run**, which is how `docs/passes/pass9/stage2-stream.jsonl`
was produced. That capture is the "prompt file the dispatcher recorded" that OB-9
compares against the reviewer's reported digest.

Shape of a verification run:

```bash
node scripts/probe-skill.js --plugin modus --expect modus:agent-work-item \
  --prompt "<fixture prompt>" --cwd <fixture repo> --stream docs/passes/pass13/<fixture>.jsonl
```

## Next Steps

Boundary is FROZEN at commit `44d9969`. Step 10 is done; implementation is next, and
the boundary is now the standard — if implementing makes it look wrong, stop and
escalate rather than edit it.

1. **Fixture inventory**, expressed as probe-skill invocations. The boundary says what
   to observe and not what to observe it on. From the entries: a frozen-marked and an
   unfrozen-marked boundary (OB-1/2/3, PRESB-1); a pair stating none of the three
   conditions (OB-4); one whose non-goals address nothing the item raises (OB-11); one
   with an unevaluable decision in an unchanged entry (PRESB-2); one whose finding
   survives a first-round repair (PRESB-3/4/5); one defective against each question
   (PRESB-6); a pair leaving a what-is-wanted choice unresolved (PRESB-7); and six
   condition-variants for PRESB-8. Roughly eight base fixtures, fourteen artifacts,
   about fifteen runs.
2. **Write the step 8 prose** in `modus/skills/agent-work-item/SKILL.md`, plus
   `refinement-loop.md`'s question count (OB-5) and the version bump across four
   metadata files (OB-6, OB-8). PRES-11's allowlist fences the file surface.
3. **Commit before verifying** — probe-skill's `--cwd` refuses a dirty tree.
4. **Verify by probe-skill with `--stream` capture**, fresh readers judging each
   captured run against the entry's decision, zed gating. Not the Agent tool: see the
   technique note above.
5. Expect the first prose draft to fail a witness. Writing text that *binds* is where
   both passes failed; the difference now is that failure is specific and immediate.

Not pushed and no `bd dolt push`. Both the commit and the issue database are local.
When authorized the order is `git pull --rebase`, `bd dolt push`, `git push` — the
beads step is separate, and skipping it leaves all five residuals invisible to anyone
who clones.
