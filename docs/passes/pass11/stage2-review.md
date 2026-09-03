# Pass 11, step 8 — outcome

**Negative boundary review. The cap fired. The boundary is handed to a person
untouched. It is not a freeze candidate.**

Two rounds, fresh reviewer each, dispatched by reference to a question set frozen and
digested before the boundary was edited. Round one: seven repairs. Round two: eleven
real findings. Verifier: zed, who classified before either participant framed the
outcome.

## Provenance, independently confirmed

| | |
| --- | --- |
| `review-questions.md` | `e5af5b092a80e8e47041706e837c0f8550fc5cf12a3f8e925a7a05f6d43ce8e1` |
| `round-prompt.txt` | `dbc5557245509aec9642710083808faca44ba86794e31e9b913239863ae23fe5`, 3324 bytes |

Both rounds reported that digest as read. zed re-measured before and after each round
and matched the receipts. The question set did not change between rounds, which is the
defect pass 10 had.

## Round two's findings, as classified

**Requirement-coverage mismatch — the decision covers less than its claim requires.**

| Entry | What the decision omits |
| --- | --- |
| OB-1, OB-2, OB-3 | one qualifying boundary sample passes while head omits the new returns everywhere else |
| OB-4 | the fixed literal-absence fixture passes while the same head misses present-but-empty conditions |
| PRES-1 | wording equality omits the dependent meanings the question rests on |
| PRES-10 | *when* the questions are asked omits their applicability and domain |
| PRES-2 | step 9's contents omit external binding and context |
| PRES-4 | "the same review" lets a drafter relabel an automatic continuation as new and evade the cap |
| PRES-7 | applicability omits the naming rule's strength |
| PRES-11 | linter-file equality does not cover schema authored elsewhere |

**Insensitive or gameable.**

| Entry | Witness |
| --- | --- |
| OB-7 | containment permits a prompt carrying head's questions *and* installed-0.3.0 text |
| PRES-6 | the handoff predicate stays true when an `or` makes escalation escapable |

**Rejected — W-1.** Never named is still not late arrival. If a condition is later
named the set is nonempty and the decision fails; if it is never named, C11's stated
failure has not occurred.

**Two qualifications.** The reviewer was wrong that pass 11 itself witnesses PRES-4,
because this pass was person-authorized; the hypothetical drafter escape is valid.
OB-3's second input is not independently sufficient as written, since no live residual
is specified — but OB-3 already falls on the valid conditional-domain witness.

**Clean:** OB-5, OB-6, OB-8, OB-9, PRES-3, PRES-5, PRES-8, PRES-9, and Q1 through Q5
entirely.

## The verifier corrected himself

zed had accepted PRES-11's sole-owner premise — that byte equality of
`lint-boundary.js` covers C10's schema half — at the second pre-dispatch gate, and
withdrew it here. The premise was the drafter's assertion that the whole schema lives
in that one file, and neither artifact establishes it. Recorded because a verifier who
only ever ratifies is not a check.

## Why the pass ended negative anyway

Pass 10's three process failures were each fixed, and the fixes held:

1. The question set was frozen, digested, dispatched by reference, and independently
   re-measured. It did not move.
2. Every repair went through the verifier before the next round was dispatched. Six
   gate cycles, four of which blocked.
3. The two absent mechanical checks were written and probed. `check-boundary.js`
   reports pass 10's exact OB-6 defect when it is reintroduced.

None of that prevented a negative review, because the findings are not process
artifacts. They are substantive, and they share one cause.

**Every repair closed one axis and left the orthogonal axis open.** PRES-1 reads
wording and not scope; PRES-7 reads scope and not wording — the reviewer named them as
mirrors. PRES-10 forbids a qualifier on *when* the two questions are asked, so head
qualifies *what they are asked about*; and PRES-10 is scoped to the two original
questions, so head makes the three new ones conditional and OB-1 to OB-3 all pass. The
external-qualifier problem was diagnosed on step 8 and never applied to step 9.
Containment was mistaken for identity in OB-7, and one file for a schema in PRES-11.

Nine of eleven findings are requirement-coverage mismatches. That is one defect class,
and it is a property of the strategy rather than of any entry: **these preservation
entries verify a requirement by reading text for a property, and a text-reading
decision can always be satisfied while the requirement is defeated from outside what
it reads.**

## What this establishes and what it does not

The item's own three conditions are met. Q3, Q4 and Q5 came back yes in both rounds,
with every live residual naming a destination. On the question gh-173 exists to answer,
the boundary works.

What fails is the preservation half — proving that a prose change to a skill has not
weakened the rules around it. Two passes, four reviewers and thirteen gate-or-round
cycles have not produced a text-reading decision that survives an adversarial reader.

A clean round would not have established soundness either. Pass 10's round one was
clean on Q6 under a narrower wording and established nothing. Two samples finding
nothing is two samples finding nothing.

## Handoff

Step 8: stop, hand the findings to a person, boundary as it stands. Done. The boundary
is unedited since the cap fired, and the eleven findings are recorded above rather than
repaired.

The decision at step 10 is the operator's, and the realistic options are not equal.
Repairing eleven findings of one class inside the same strategy is the thing that has
now failed twice. Recorded for whoever picks this up:

- The preservation strategy is the thing to reconsider, not the eleven entries. An
  obligation that a rule still *binds* may not be verifiable by reading the rule's
  text at all.
- `W-1`'s rejection is the one place a reviewer overreached and the verifier held the
  line, which is worth knowing when weighing how much of the eleven to accept.
