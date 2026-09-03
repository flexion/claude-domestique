# Pass 11 — sensitivity witness per entry

Written before any reviewer saw the boundary. One test, applied to all 18 entries:

> Name an input under which this `decision` returns **true** while the failure the
> entry exists to exclude **occurs**.

This is the test pass 10 needed and did not run. Both of its round-two findings were
insensitivity rather than unfailability, and the drafter's own repair to OB-4
reintroduced a defect class the same boundary already documented.

**It found two defects here, both fixed before dispatch.** They are listed first
because a self-pass that reports only "none" is indistinguishable from one that was
not run.

## Defects found, and fixed

**OB-7 — unobservable in the case it exists for.** The observation read "the step 8
text the reviewer was given". Pass 11 dispatches reviewers a *path*, not a payload,
so there is no text they "were given" and the comparison has no domain. The entry
guarding against a reviewer reading the installed plugin's pre-change text could not
be performed in the dispatch mode actually in use.

The repair made here — comparing a digest the reviewer reports against a digest of
the file at head — did not survive. Round one found the party undefined, and the
second gate found the chain missing its middle link. **Final form:** OB-7 compares the
review questions extracted from head against the recorded prompt, and OB-9 binds the
answering reviewer to that prompt. See the round-one section below; this entry took
three revisions across two gates.

**OB-4 — false negative: fails while the requirement is satisfied.** Found by zed at
the pre-dispatch gate, and the worst of the three, because the other two let a
failure pass while this one rejects a success. The fixture was "a boundary stating
none of the three conditions", but a reviewer answers Q3 to Q5 from the boundary
**and the item together**, and gh-173 states what must keep working and what is out
of scope. A correct reviewer therefore answers YES to two of the three and honestly
cannot produce three findings, so `the findings name all three conditions` returns
false while AC4 holds. Classified requirement-coverage mismatch: the entry's fixture
covered one of the two artifacts its own reviewer reads. The fixture is now a
boundary-and-item pair that together state none of the three, and the reference set
stays fixed by the input rather than by the answers.

**PRES-1 — excluded deletion, not dilution.** Listing step 8's questions and
checking "both of the original questions are in the list" passes when a question is
softened into something a reader still recognizes. PRES-3 does not catch it either,
because a diluted question still returns an id list and a blocking-question answer.
The witness is a review whose Q1 has been reworded to ask whether entries "look
evaluable": both questions are still "in the list" and neither establishes what it
did. Now compares the wording of the two questions on base and head.

## No witness found

**This table is the pre-dispatch self-pass and round one superseded much of it.**
Witnesses were later found for PRES-1, PRES-2, PRES-4, PRES-7, PRES-8 and W-1 — the
rows below record what the drafter's own pass concluded, not what holds now. Kept
rather than rewritten, because a self-pass that quietly acquires the reviewer's later
findings stops being evidence of what the self-pass caught. The current position for
each of those six is in the round-one section.

| Entry | Failure it excludes | Why no witness exists |
| --- | --- | --- |
| OB-1, OB-2, OB-3 | the review not returning an answer for that condition | the return either answers or does not; a *wrong* answer is OB-4's target, not these |
| OB-4 | an unstatable condition never becoming a finding | the boundary-and-item pair omits all three, so the reference count is 3 and is fixed by the observation's own text rather than by the answers; a review answering YES to any names fewer than three |
| OB-5 | `refinement-loop.md` miscounting step 8's questions | deleting the sentence removes the number to read, which makes the decision unevaluable rather than true, and also removes the failure |
| OB-6 | the version never bumped | no bump means equal, not greater; a partial bump is OB-8's target |
| OB-8 | a bump that updates some files and not others | a partial bump makes the four unequal; no bump at all is OB-6's target |
| PRES-2 | the stopping rule altered to match what step 8 asks | a change that leaves all six conditions identical has changed no condition |
| PRES-3 | the change breaking the existing return | an empty id list is the pass case for Q1, not a failure |
| PRES-4, PRES-5, PRES-6 | the round limit or either route altered | each compares stated text on base and head |
| PRES-7 | the name-a-specific-requirement rule deleted | the rule is a sentence and its absence is readable |
| PRES-8 | fixture-verdict drift | a change leaving every fixture verdict identical has changed no fixture verdict |
| PRES-9 | a manifest broken by the edit | exit status is the observable; content validity beyond the manifests is OB-8's and PRES-8's |
| W-1 | findings against the three conditions arriving after the cap | a watch with a trigger is not evaluated before the trigger fires, so zero rounds leaves it unfired rather than passing |

## Limits recorded rather than resolved

Three residual insensitivities, each named because it is out of this item's scope
rather than because it is absent.

**What Q3 and Q4 are for, once OB-4's fixture is understood.** A reviewer answers Q3
to Q5 from the boundary and the item together, and step 1b already refuses an item
that does not state what must keep working or what is out of scope. On a correctly
gated, noncontradictory run, Q3 and Q4 should therefore normally pass, and what is
handed off is the condition most likely to fail, since items do not state it.

They remain capable of failing, and the first version of this section claimed
otherwise. Two ways, neither hypothetical:

- **Upstream compliance or judgment failure.** Step 1b is a model instruction, not a
  mechanically enforced precondition. A drafter that wrongly passes an incomplete
  item puts it in front of a reviewer anyway, and this repository has already
  recorded the gate being applied inconsistently to the same pair on two runs of the
  same skill.
- **Boundary conflict.** An item that states both conditions clearly can be
  contradicted or obscured by the boundary drafted from it, which makes the
  condition unanswerable *from the pair* whatever the item says alone.

Q2 may catch the second case as a blocking question. That redundancy does not make
Q3 and Q4 incapable of failing; it means two questions can reach one defect.

So the honest description is defense-in-depth, not dead weight. Neither the frozen
question set nor OB-4 changes on account of this, and narrowing Q3 and Q4 to "from
the boundary alone" is still refused — step 9 asks whether a fresh reader **can
state** each condition without restricting the source, and restricting it would
change what the stopping rule requires, which gh-173 places out of scope.

**OB-4 does not exclude over-naming.** A reviewer naming all three conditions plus
fabricated extras returns true. AC4 is about a condition that cannot be stated
becoming a finding; false positives are a different property and no criterion here
names them.

**PRES-7 rests on a reader's judgment of "present".** Same dilution exposure PRES-1
had. Comparing wording would fix it, and the item's third bullet asks for the rule
rather than for its text, so tightening it would oblige more than the item requires.

**PRES-9's exit status does not certify skill content.** `validate:plugins` checks
manifests. Nothing checks that a skill's prose still says what it said, which is why
PRES-1 through PRES-7 read text directly instead of relying on it.

## Mechanical checks

`docs/passes/pass11/check-boundary.js` runs the two that exist nowhere else: the
prose caps and banned-word list that `boundary-prose.md` credits to a script
(`domestique-13n`), and a comparison of each `entails` hazard's semantics against
the mapped entry's `test_role`.

Probed rather than trusted. Reverting OB-6 to `test_role: preservation` — pass 10's
exact defect — is reported, and so are an over-cap decision and a banned word. A
check that reports clean and cannot report anything else establishes nothing.

---

# Round one repairs, and the witnesses run against them

Round one's Q6 named **twelve** entries. zed's classification reduced that to a
bounded set, and the reduction is the substance:

**Not valid Q6 findings — OB-1, OB-2, OB-3, PRES-3, OB-4.** The witness ran a
hand-assembled prompt against *base*, but every one of these observations requires a
review run **under head**. A witness that violates the observation's own precondition
is not evidence about the decision's sensitivity. What it did expose is real, and it
is one thing rather than five: nothing bound the review that answered to the skill
text at head. That is OB-7.

**One real defect, not two — OB-7.** Unevaluable actor and provenance. Its own Q6
witness is derivative of the same ambiguity.

**Real — PRES-1, PRES-2, PRES-7.** Insensitive context checks.

**Real but narrower — PRES-4.** Only when the clause extends *the same* review. A
newly authorized pass is a fresh two-round budget, so pass 11 is not the witness. The
first version of this file accepted the reviewer's wider claim; zed's is correct.

**Real — PRES-8.** Requirement-coverage mismatch: fixture verdict equality is
narrower than C10's schema-and-verdict-surface claim.

**Real in one half — W-1.** First discovery after the cap. "Never named" is excluded,
because the observation cannot distinguish the absence of a defect from a failure to
detect one — the same reason this repository's linter refuses terminal conclusions
drawn from an absence.

## The repairs

| Entry | Repair |
| --- | --- |
| OB-7 | rewritten to compare the review questions extracted from head against the recorded prompt; **split**, with OB-9 binding the answering reviewer to that prompt |
| PRES-1 | kept as the wording check; **split**, with PRES-10 reading whether the questions are asked unconditionally |
| PRES-2 | reads the six conditions *and their definitions*, so redefining one is caught |
| PRES-4 | reads whether a third round of the same review is permitted, not whether the number two is still printed |
| PRES-7 | reads whether the naming rule applies to every question the review asks |
| PRES-8 | kept as the fixture-corpus check; **split**, with PRES-11 asserting byte equality of `lint-boundary.js` |
| W-1 | window scoped to the item's first round, over conditions actually named |

Three splits, no new claims, no change to the frozen question set. 21 entries. Both
lint forms clean, `exempt` zero, `check-boundary.js` clean.

## The lesson the witness pass found in my own repairs

Four of the seven repairs were first written anchored to **step 8** — "any condition
step 8 states", "every question step 8 asks". Each had the same witness: put the
qualifier somewhere else in the skill, or move a question into a different step, and
the decision passes while the requirement fails. Anchoring an obligation to the
artifact section instead of to the obligation is the identical proxy error one level
up, found in my own corrections to a proxy error.

All four now read the skill, or the review, rather than a section of it. This is the
third time in two passes that a repair of mine relocated a defect rather than closing
it, and the first time the relocation was caught before a reviewer saw it.

## Second gate: two more requirement-coverage mismatches

Both found by zed after the repairs above, and both in the repairs rather than in the
original draft.

**The chain had a gap in the middle.** OB-7 compared head's skill digest with a
recorded source digest, and OB-9 compared a recorded prompt with the reviewer's
receipt. Nothing bound the recorded source to the recorded prompt's question text, so
an honest mistaken dispatcher could record the right skill, assemble the wrong prompt,
and satisfy both links. OB-7 now compares question **text** extracted from head
against the recorded prompt — the middle of the chain rather than one end of it — and
OB-9 carries prompt to reviewer unchanged.

**PRES-8 and the first PRES-11 together still missed C10's schema half.** C10 claims
no schema change *and* no verdict change. PRES-8 read fixture verdicts; PRES-11 read
the set of returnable codes. A field silently accepted, with no new code and no
fixture carrying it, changes the schema while leaving both identical. PRES-11 is now
byte equality on `lint-boundary.js`, which is the guard rather than a proxy for one:
this item authorizes no change to that file, and an unchanged file cannot grow a
schema.

**A judgment inside that repair, flagged for overrule.** Byte equality implies the
code-set equality PRES-11 previously asserted, so the code-set form was replaced
rather than kept beside it — an entry whose truth is implied by another is cost with no
return, by the skill's own stopping rule. PRES-8 survives because fixtures are
separate files and a fixture edit is not a linter edit. Removing a form the verifier
had already cleared is a change the verifier should get to reverse, so it is recorded
here rather than made quietly.

## The floor, stated rather than closed

With the middle link closed, the chain runs: questions the skill states at head →
the recorded prompt (OB-7) → the receipt the reviewer reports (OB-9). What defeats it
is a reviewer reporting a receipt for a file it did not answer.

That is the irreducible trust floor, and **not** an operator call. The earlier version
of this section raised it as one, on the strength of a gap that turned out to be the
missing middle link rather than a limit of the method. Guarding a false receipt needs
an adversarial-reviewer threat model, and nothing in this item states one.

The comparable limit for the wrapper is recorded in `dispatch-provenance.md`. Both are
stated as floors rather than smoothed over.
