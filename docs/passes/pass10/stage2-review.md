# Pass 10, step 8 — review of `boundary/gh-173.yaml`

Two rounds, then stopped at the cap with findings. The boundary is unfrozen and
unfixed, handed to a person as step 8 requires.

## The question set

Six questions each round. Two are the skill's committed step 8. Four are not in any
committed artifact and were added deliberately:

| # | Question | Source |
| --- | --- | --- |
| 1 | which entries' `decision` could you not evaluate against that entry's own `observation` | step 8 |
| 2 | do you have a blocking question about what is wanted | step 8 |
| 3 | can you state what must keep working | gh-173 AC1 |
| 4 | can you state what is out of scope | gh-173 AC2 |
| 5 | can you state what is handed off, and to whom | gh-173 AC3 |
| 6 | can every `decision` come out false | `domestique-37o` |

Q3 to Q5 are the conditions this item adds to the review. Asking them of this
boundary is the item's own change applied to the artifact that specifies it. Q6 is
the check `docs/refinement-loop.md` claims step 8 already asks; it does not, which
is `domestique-crl`.

**Q6 was not worded the same way in both rounds, and that is a defect in the
dispatch rather than in either reviewer.** Round one was asked "can every `decision`
come out false, or is one true by construction of its own observation". Round two
was asked that *and* "or where the failure the entry exists to exclude would read as
a pass". The second clause is the one round two's findings answer. The rounds are
therefore not two samples of one question on Q6, and the comparison at the end of
this file is weaker than it would otherwise be. Recorded rather than smoothed over:
the drafter wrote both prompts.

## Round one

Reviewer: zed, who did not draft the boundary.

| Q | Answer |
| --- | --- |
| 1 | OB-4 |
| 2 | none |
| 3 | yes |
| 4 | yes |
| 5 | **no** |
| 6 | none |

**Q1, OB-4.** The observation yielded the round's findings and not the set of
conditions the reviewer could not state, so the findings were being asked to
establish their own completeness.

**Q5.** Two residuals with no destination. W-1 was a `production` watch naming no
owner. Three `non_goals` entries said "a separate item" without naming one.

Both fixed. OB-4's observation was widened to read the per-condition answers as
well as the findings. W-1 was given a `handoff` object. The three residuals were
filed as `domestique-37o`, `domestique-crl` and `domestique-13n`, and `non_goals`
now names them.

Q5 is the finding worth recording twice: it is C5 applied to the artifact that
defines C5, and the linter cannot raise it. A `handoff` object is required on
`post_merge` and `production` **musts** only, so nothing in the schema asks a watch
who owns it.

## Round two

Reviewer: a fresh agent, given only the boundary and the item. Round two went to a
new reviewer rather than back to zed because step 8's grounding for permitting a
second round is that each round is a new sample, and a second reading by the same
reviewer is a converging opinion, which the skill says a round is not. Pass 9
dispatched an agent per round for the same reason.

| Q | Answer |
| --- | --- |
| 1 | none |
| 2 | none |
| 3 | yes |
| 4 | yes |
| 5 | yes, with a note |
| 6 | **OB-4, OB-6** |

**Q6, OB-4 — the round-one fix passes vacuously.** The observation fixes the input
as a boundary stating none of the three conditions. If the review answers yes to
all three anyway, no condition is answered no, `every condition answered no is
named in the findings` is vacuously true, and OB-4 passes while an unstatable
condition never became a finding. Nothing in the decision requires any condition to
be answered no. This is the same vacuity the boundary itself describes for the
narrow reading of "handed off" in the C5 annotation, reproduced inside the fix for
round one's finding.

**Q6, OB-6 — the decision cannot fail when nothing is bumped.** `the four values
agree on each revision` holds when four files still read `0.3.0` at head. CPL-4's
hazard is that a skill edit needs the version bumped; `entails` maps CPL-4 to OB-6;
`non_goals` calls it "the bump OB-6 requires". OB-6 requires only agreement. PRES-9
is the only other entry tracing C8 and checks exit status, so a head that edits
step 8 and never bumps modus passes both — which is precisely the state C7 and
CPL-5 say serves pre-change text to the next reviewer.

**How the two Q6 findings should be classified.** zed, verifying, concurs that both
defects are real and disputes that either is a Q6 finding: OB-4 returns false
whenever a NO lacks a finding, and OB-6 returns false whenever the four versions
disagree, so neither decision is true by construction. Under the clause round one
was asked, Q6 is none. Under the clause round two was asked — the failure the entry
exists to exclude reading as a pass — both qualify. The disagreement is about the
question, not about the defects.

zed's characterizations are more precise than the ones above and are the ones to
carry forward: **OB-4 lacks sensitivity to false YES answers**, and **OB-6 proves
synchronization but omits the base-to-head bump C8 requires**. Neither entry is
unfailable; each is insensitive to the specific failure it exists to catch.

**Q5's note, not a finding.** CPL-6 is declared `uncovered` with no destination.
C5's claim text scopes the requirement to *live* residuals and the boundary argues
CPL-6 is not live, so it passes the claim as written. It fails the stricter rule in
the C5 annotation — "a declared `uncovered` edge is a finding until it names a
destination." The annotation is stricter than the claim it explains.

## Where this stops

Step 8: "Two rounds. Then stop, whatever the second one said. ... If it names
anything, stop and hand the findings to a person, with the boundary as it stands."

Round two named two. The boundary is handed over unfixed. The fixes are not applied
and not partly applied, because the cap exists so that the drafter does not decide
when the drafter is finished.

Recorded for whoever picks it up, not applied:

- OB-4's decision needs a reference set fixed by the input rather than by the
  answers. `the findings name all three conditions` is one claim, cannot pass
  vacuously on an input constructed to omit all three, and still fails a review
  that produces no findings.
- OB-6 needs splitting. The increment is one claim — head's version greater than
  base's, `test_role: change`, `baseline: assertion_fail` — and cross-file
  agreement is another, which is the preservation half.
- The C5 annotation should be relaxed to the claim's live-residual scope rather
  than the claim tightened to the annotation: **an `uncovered` edge that represents
  live residual work is a finding until routed.** CPL-6 shows that the literal
  `uncovered` is not itself proof of residual work, so tightening C5 to match the
  annotation would knowingly manufacture a false positive. That distinction is what
  separates a residual from an exclusion, and it is the one the `non_goals` list
  already uses. Agreed by both reviewers.

## What the two question sets each found

The committed step 8 asked Q1 and Q2. Across both rounds they found one thing:
OB-4's observation, in round one.

The four added questions found four: the missing destinations for W-1 and the three
residuals (Q5, round one), and OB-4's vacuous pass and OB-6's missing increment
(Q6, round two).

Q6 is not one of the six conditions step 9 names and is not part of gh-173. It found
the OB-6 defect, which no other question reached. That is evidence for
`domestique-37o` and against absorbing it into this item, since a question worth
asking on its own merit is not made better by being renamed a stopping condition.

**Two qualifiers on this comparison, both against it.** Q6 was worded differently in
the two rounds, so its round-two yield partly measures a wider question rather than a
second sample of the same one. And a question asked second, of a boundary already
repaired once, is not competing on equal terms with a question asked first: round
one's fixes are what round two had to find defects in. One run of six questions over
one boundary establishes what those questions found here. It does not establish a
rate.

The three conditions gh-173 adds found the defect a boundary can only have by
omission — a residual with nowhere to go — and neither committed question reaches
it. That is the item's own claim, measured on one run.
