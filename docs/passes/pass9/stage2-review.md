# Step 8 — what review found, pass 9

Two rounds, capped. A boundary that passed review holds no record of what review
found, which is why this file exists: pass 6's boundary passed both lint forms and
then failed review on four counts, and the only account of that is the file it was
written to.

Each round is a fresh agent given the manifest and the item and nothing else, and
asked exactly two questions:

1. Which entries' `decision` could you not evaluate against that entry's own
   `observation`? Also count an entry whose `decision` cannot come out false at
   all.
2. Do you have a blocking question about **what is wanted** that you cannot answer
   from the boundary and the item?

## Round one — `/tmp/pass9-r1.yaml`

**Question 1: one entry. `OB-5`, and it was the AC2 entry.**

The observation handed the reviewer a finished boundary and asked which entries
they had to write themselves. Nothing in that observation gives them a step at
which they would write one, so the honest answer is `none` whatever the drafter
emits, and `the returned list is empty` is true by construction. The failure the
entry exists to exclude — a draft too thin to use — read as a pass. AC2 was, as
instrumented, unfalsifiable.

The round also checked and rejected the obvious rescue: `OB-6`, labelled `OB-5`'s
falsification guard, tests whether the output responds to changed input. A drafter
that is responsive and incomplete passes it. So nothing else covered the failure.

It named the manifest's own counter-examples: `OB-9` asks a reviewer about a
property of artifacts they were given, and `OB-12` asks them to enumerate steps
from a procedure. Both can return a non-empty answer.

**Fixed.** `OB-5` now has the reviewer derive obligations from the criteria
*first*, then compare against the draft:

```yaml
statement: "a reviewer deriving obligations from the criteria writes no entry the drafted boundary lacks"
observation: "give a reviewer the criteria; ask for every obligation they would write, then give them the draft and ask which are missing"
decision: "the returned list is empty"
```

A thin draft now yields a non-empty list. The derive-then-compare order is the one
`reconstructing-the-item` already specifies for the blind reconstruction.

**Two near-misses it checked and did not count**, recorded because a later round
may raise them again:

- `OB-3` and `OB-10` name no explicit read verb, but the re-run of the drafter
  directly produces what the decision reads.
- `OB-13`'s comment describes a sensitivity probe its observation omits. The
  failure it guards still reads as a failure from the observation as written, and
  the probe belongs to the evidence map rather than to a frozen manifest —
  `E_NO_SENSITIVITY_PROBE` is an evidence-pass check on the edge.

**Question 2: none.** It enumerated the WHAT-level forks it tested and where each
is settled: the trigger for asking (`AC1`, `C5`), asked-once semantics (`AC1`'s
second sentence, `C3`), what makes criteria underivable (`C13`), what makes a
blocker resolved (`C14`), whether `AC7` is a requirement or a description of the
current design (the correction on `C12`, and `AC7`'s own second sentence), and
whether a post-resolution redraft is automatic or a re-run — `OB-4` and `OB-11`
both observe a re-run, and `AC5` demands only that nobody is asked again, so both
readings build the same thing.

One defect the drafter found itself before this round returned, recorded so the
round is not credited with it: `OB-3`'s observation did not say to count the
request events its decision reads. Fixed in place.

## Round two — `/tmp/pass9-r2.yaml`

**Question 1: two entries. Neither is fixed, and that is the rule rather than an
oversight** — step 8 caps the loop at two rounds and hands the findings to a
person with the boundary as it stands. A third reviewer is a new sample, not a
converging opinion.

It confirmed the round-one fix: `OB-5` "is sound now — deriving first and
comparing second gives the reviewer a step at which they would produce an entry".

### `OB-7` — the decision counts a different unit than the statement

The statement says "one blocker per missing thing", which is AC3's wording. The
decision says "the blocker count equals the number of missing conditions", and
those conditions are `C13`'s five gate conditions. Not the same quantity.

`C13`'s second condition — a falsifiable criterion per obligation — is violated
*once as a condition* however many obligations lack a criterion. So a drafter that
lumps three missing criteria into one blocker records one blocker against one
failed condition and the decision reads true. Lumping is the exact failure AC3 and
AC4 exist to exclude: a lumped blocker cannot be resolved independently. In the
other direction a correct per-thing drafter recording three blockers against one
failed condition reads false.

Separately, the observation produces only the blocker count. It pins the
right-hand side of the equality at "more than one" and no further, so the decision
reads a quantity the observation does not fix.

Assessment: real, and the more serious of the two. The unit has to be the missing
thing, not the gate condition, and the observation has to fix the expected count.

### `OB-13` — the probe is in a comment, not in the observation

The entry's own comment states the requirement: delete a required top-level field
from a copy of one of these files and the test must report a failure, because
without that probe `pass` on base and `pass` on head is satisfied by asserting
nothing. The observation then performs only the plain run, and `no file reports a
failure` is satisfied by an empty failure list for any reason, including a linter
that was weakened.

Round one saw the same thing and did not count it, on the grounds that the probe
belongs to the evidence map. Round two counted it. That is the non-monotonicity
step 8 warns about, not evidence that the boundary got worse.

Assessment: real as stated — a preservation entry whose sensitivity probe lives in
a comment has no probe in anything that gets executed. One supporting argument in
the finding is weaker than it reads: it claims the linter's failure-reporting
surface is inside this change because `OB-17` requires the linter to accept a part
list and record exempt checks. `lintBoundary` already takes `itemParts` and
already records exempt outcomes, so `OB-17` constrains the caller rather than the
linter. The finding does not depend on that argument.

**Question 2: none.** It named the same contradiction and the same resolution:
AC7's approval at freeze against a specified freeze that records a digest and a
SHA and no approver, settled by AC7's second sentence and recorded in
`corrections` rather than left open. It read `CPL-5: uncovered` as a declared hole
rather than an assumption. Its remaining questions — model-backed or
deterministic, where blockers are recorded, whether `refinement-loop.md` has to
change — are next-phase questions.

## Where this leaves the run

Step 8 is spent. Two rounds, one defect found and fixed, two defects found and
handed over. The boundary lints clean in both forms — failures empty, `exempt`
zero, `W_NO_FLOOR` only — and carries two known unevaluable decisions.

Step 9's stopping rule is not met: a fresh agent named specific undecidable
requirements, so this is not a first draft that passes. Step 10 does not follow
from here. The decision about `OB-7` and `OB-13` is a person's.
