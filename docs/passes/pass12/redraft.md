# Pass 12 — the redraft, and why it stopped when it did

`boundary/gh-173.yaml`, 26 entries, both lint forms clean, `exempt` zero, one
recorded `W_NO_FLOOR`. No review round was run in pass 12. The operator stopped the
review at six corrections.

## What changed from pass 11

Pass 11 ended negative at the cap with eleven findings, nine of them
requirement-coverage mismatches sharing one cause: entries verified a requirement by
**reading the skill's text**, and text placed outside what a decision reads defeats
the requirement while the decision stays true.

Six text-reading entries are gone — PRES-1, PRES-4, PRES-5, PRES-6, PRES-7, PRES-10.
PRESB-1 through PRESB-8 replace them by running a review and reading what the run
did. Relabelling cannot survive that: a run that continues past two rounds has
continued whatever the third round is called.

PRES-2 keeps a text form, because it catches deletion and narrowing of step 9's
conditions and that is what the item's Out of scope protects. PRESB-8 gates the
behavioural half by running a refinement to a stop.

## The eval, drafted and withdrawn

An OB-10 obliged an eval. The argument for it was that AC1 to AC4 say a review
*returns* something, so a prose change alone leaves them unverifiable. That argument
was wrong twice over.

It rested on a false claim about this repository, which the drafter wrote as CPL-8:
that `modus/evals/` is committed machinery that runs a skill and grades the run. Per
`docs/plugin-evaluation.md:174-193`, `probe-skill.js` loads the plugin from source and
prints what fired with **no scoring** — "judging the answer is still yours" — and
`modus/evals/` holds one prompt-and-rubric case against a deferred evaluator that
**has never been executed**.

And it was unnecessary regardless. A review dispatched to a fresh agent already *is*
a run; a reader reading its return already *is* the observation. That is what
`verifier: independent_review` means, and it is what four rounds across passes 10 and
11 actually did. An eval would buy repeatability, not capability.

The operator dropped it. The residual is filed as `domestique-5y6` and named in
`non_goals`: **every preservation entry here is verified once before the freeze and
re-run by nothing afterwards, so this boundary's what-must-keep-working half is inert
the moment it freezes.** Under C5 a residual with no destination is a finding, so the
boundary states its own strongest limitation about itself.

## The six corrections, verified

| # | Correction | State |
| --- | --- | --- |
| 1 | OB-11's fixture tested a missing destination, which makes the *handed-off* condition unstatable, not out-of-scope — so its expected finding was misfiled | fixture replaced with non-goals that address nothing the item raises; the out-of-scope finding is now the correct expectation |
| 2 | W-2 was false-positive by construction: its trigger included cap stops, where unmet conditions are the valid reason to hand to a person | observes only runs that declared done; trigger, verification method and failure transition all rescoped |
| 3 | PRESB-7 could pass on a no-blocker answer that merely mentioned the choice | decision requires the answer to **mark** it blocking |
| 4 | OB-7's question-set equality still admitted a prompt carrying head's questions plus stale non-question instructions | compares the whole review-instruction projection, "exactly those extracted" |
| 5 | Four stale assertions the drafter had withdrawn were still in the record | all four removed, verified by grep: no committed-machinery claim, no "a run integrates all the text", no "W-2 carries the behavioural half", and C5 now says five routed residuals rather than three |
| 6 | PRES-11's allowlist was not mechanical without literal paths, and omitted repository-required artifacts | ten literal paths, including the branch session file and `.beads/issues.jsonl` — omitting them would fail a correct run |

## Four changes beyond the six, disclosed

Made in response to objections the verifier subsequently withdrew, and kept rather
than reverted because reverting the first two would restore overclaims:

- PRESB-1's statement names the two boundaries its fixture samples instead of every
  boundary.
- PRESB-2's statement names an unchanged entry instead of every entry.
- PRESB-4 attempts a third round rather than observing an ordinary safe-path run.
- PRESB-5 requires the findings to go to the drafter **and nowhere else**.
- PRES-12 was added as a text-side applicability check beside PRESB-1 and PRESB-2.

## Why this became a loop, which is the operator's question

Pass 11's diagnosis was that the drafter's question set moved between rounds, visible
only to the drafter. Pass 12 repeated that defect one level up, and both participants
did it.

**Each review cycle invented new adversarial witnesses instead of testing against a
fixed set.** A "name an input where this passes while the failure occurs" question has
a near-zero found-nothing rate — which is constraint 3 in the modus README, cited by
the skill's own step 2: a reviewer asked what is wrong with this code manufactures
findings. Applied to repairs, it never terminates, because every repair is new text
and new text admits new witnesses. Six gate cycles in pass 11 and four more in pass 12
produced real findings every time, and would have continued producing them.

There was no termination condition, and neither participant supplied one. The operator
did: freeze the test suite at the agreed eleven witnesses, take the finite corrections
that follow from them, stop.

That is the same lesson as pass 11's, and the same lesson as `domestique-37o`'s: an
unbounded search question is not a gate. It needs a fixed corpus to run against, or it
runs forever.

## Handoff

The boundary is at step 10, which is a person's. It has never been reviewed in its
current form — pass 12 ran no round, by instruction. What is established is that it
satisfies both linters, the prose rules, the pass-11 witness suite as far as the six
corrections carry it, and the verifier's sign-off on those six.

What is not established is that a fresh reviewer finds nothing. That was true of pass
11's boundary too, and pass 11 found eleven things.
