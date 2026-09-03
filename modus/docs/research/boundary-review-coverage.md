# The boundary review has no coverage property

Second finding from the boundary-completion research. The first,
[`boundary-completion-freeze-evidence.md`](boundary-completion-freeze-evidence.md), asks what
licenses the freeze once the adversarial pass returns clean. This one is about the failure that
occurs first, and it is the one currently costing time:

> **Step 8 asks the reviewer for a subset of failing entry ids. The remainder is unenumerated, so a
> reviewer that examined every entry and one that examined a few produce the same shape of return.
> In the run measured below, both reviewers volunteered a coverage claim over that remainder, and
> round one's was false.**

Prior art: [`satisficing-boundary-briefing.md`](satisficing-boundary-briefing.md) and
[`satisficing-boundary-near-term-artifacts.md`](satisficing-boundary-near-term-artifacts.md).
The forensics in §1 and the split in §4 are emil's, from a parallel review; the pass-9 numbers were
reproduced independently before being used here.

---

## 1. What pass 9 measured

`docs/passes/pass9/stage2-stream.jsonl` holds both reviewers' verbatim returns. The committed
`stage2-review.md` is a human summary of them.

```
node -e 'const fs=require("fs");const o=fs.readFileSync("docs/passes/pass9/stage2-stream.jsonl","utf8")
.split("\n").filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}});
const t=i=>o[i].message.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
console.log(t(516));console.log(t(551))'
```

| | Round 1 (idx 516) | Round 2 (idx 551) |
| --- | --- | --- |
| Report length | 2,840 chars | 3,278 chars |
| Entries named individually | 9 of 17 | 6 of 17 |
| Entries covered only by a blanket clause | 8 | 11 |
| Findings returned | `OB-5` | `OB-7`, `OB-13` |

Five entries — `OB-1`, `OB-2`, `OB-8`, `OB-14`, `OB-15` — appear individually in neither report.
Diffing the manifests the two rounds read (`tool_result` at idx 485 and 543, `NNN\t` prefix
stripped): **15 of 17 entries are byte-identical between rounds.** `OB-3` and `OB-5` differ, and
those are the two the drafter fixed.

That is the operator's report of findings on unchanged text, measured, in the run the skill's current
cap was written from.

---

## 2. The return shape permits an unenumerated remainder, and the remainder was filled with a false claim

`SKILL.md:224`–`:228` specifies the review as two questions. The first:

> Which entries' `decision` could you not evaluate against that entry's own `observation`? **Ids
> only.**

That asks for a subset of the entry set. Nothing asks what happened to the rest, so three different
reviewer behaviours reach the drafter as the same object:

| Reviewer behaviour | Returns |
| --- | --- |
| Evaluated 17 entries, 1 failed | `[OB-5]` |
| Evaluated 9 entries, 1 failed | `[OB-5]` |
| Evaluated 2 entries, 1 failed | `[OB-5]` |

The run shows what a model does with an unenumerated remainder. Neither reviewer returned a bare
subset; both volunteered a coverage claim the skill never asked for:

> Round 1: *"The other sixteen entries evaluate."*
> Round 2: *"The other fifteen entries evaluate."*

**Round one's claim was false about a member.** `OB-7` appears nowhere in round one's report, so it
sat inside "the other sixteen." Round two, reading byte-identical text, found that `OB-7`'s decision
counts a different unit than its statement — a real defect, which the pass's own evaluation calls
"the more serious of the two" (`stage2-review.md:99`).

So the output carries an affirmative claim over a population the reviewer did not enumerate, and the
human reading the summary was told a sweep had happened. The defect is a false positive claim, and
not merely an ambiguous one.

**This decides which precedent applies**, which matters because the companion finding recommends the
opposite kind of repair for the freeze. Its §5 disanalogy table
(`boundary-completion-freeze-evidence.md:230`–`:238`) turns on exactly this:

> A producer emitting a false value has to be fixed at the producer; that is not optional and
> `abstain` is the right shape for it. A producer emitting a true value that a consumer over-reads is
> a different repair.

`no_gap_found` is true, so the freeze needs a consumer-side fix. A volunteered coverage claim that is
false puts this finding on the producer-side branch, alongside `lint-boundary.js:647`–`:651` —
"Recording `pass` was the one affirmatively misleading outcome available." The two findings compose.

The branch is shared; the case is not identical, and the difference bears on how much the remedy can
promise. The linter can determine deterministically that its domain is absent, so emitting `abstain`
instead of `pass` is a correctness fix with a checkable condition behind it. A model asked for 17
verdict rows can emit 17 rows that assert examination it did not perform, and no condition in the
code can catch that. Same branch, weaker leverage.

---

## 3. What the return shape establishes, and what rests on evidence

These have different warrants and an earlier draft ran them together.

**Established by the return shape.** A satisficing stop needs a measure a pass can be judged against.
The only candidate is "the reviewer named nothing," which under a subset return is consistent with
*evaluated everything* and with *evaluated two*. **Review coverage is therefore unobservable**, and
no coverage-based convergence stop is available. That is why `:255` has to say "Stop by the rule, not
by running out of findings," and it is what the cap at `:234` rests on instead.

**Established by measurement, in one run.** Round one gave a rationale for 9 of 17 entries, asserted
that it had evaluated 17 entries and that the remaining sixteen evaluated, and was wrong about
`OB-7`. The false claim is measured. Whether `OB-7` went uninspected is not — see §4.

**Established by neither.** That rounds are statistically independent, or that the population is
closed. 15 of 17 entries were unchanged, which is 88% and not 100%; and round two read a document
whose two most-discussed entries had been rewritten, which moves salience for everything else. The
accurate form is that successive rounds are fresh samples of a **largely** unchanged population, and
that no round lowers confidence about what remains.

That distinction carries weight here, for one reason worth spelling out.

Asserting a closed population invites the next reader to propose an overlap-based coverage estimator.
`satisficing-boundary-near-term-artifacts.md:139`–`:151` already removed that idea, on the ground
that "a review→revise loop changes the artifact between rounds."

Pass 9 **qualifies** that ground: 15 of 17 entries were identical across the two reads, which is
substantial stable substructure. It does not **overturn** it. Two entries did change, and
capture-recapture needs the inspected population closed, so a mostly-stable artifact sits outside the
model in the same way a wholly-changed one does.

The exclusion also rests on three grounds this correction does not touch:

- n=2 is the minimum for any overlap, and results at n=2 are ambiguous
  (`petersson-wohlin:417`, `:424`); four to five reviewers is the floor for acceptable accuracy
  (`:414`).
- Estimate accuracy was never shown to improve inspect/reinspect decisions.
- An asymmetric reviewer briefing suppresses the overlap an estimator reads as coverage.

---

## 4. What the two late findings do and do not show

Pass 9 returned two findings in round two on text identical to round one. An earlier draft classified
`OB-7` as a coverage failure and `OB-13` as a judgment reversal, and claimed the recommendation fixes
the first. The stream does not support that split, and the reason is the same error this document
warns about applied to its own evidence.

**Round one asserted totality in its first sentence:**

> I read `/tmp/pass9-r1.yaml` and **evaluated each entry's `decision`** against only what that entry's
> own `observation` produces.

That claim is evidence about the record, and not about what round one did. It establishes that the
report asserts `OB-7` was evaluated. It does not establish that `OB-7` was evaluated, and it does not
establish that `OB-7` was passed over. What the report lacks is a *rationale* for `OB-7`, and absence
of a rationale cannot distinguish two histories:

| | Consistent with the output? |
| --- | --- |
| `OB-7` never inspected; the totality claim is a fabrication | yes |
| `OB-7` inspected, judged sound, judgment later reversed by round two | yes |

Nothing in pass 9 separates those. `OB-13` is the one case where the stream settles it, because round
one recorded its reasoning: "I checked and rejected two near-misses … `OB-13`'s comment describes a
probe that its observation omits, but the failure `OB-13` guards … still reads as a failure from the
observation as written." That is examined, argued, declined, then counted by round two on identical
text — reviewer disagreement, where the ~80% judge-agreement ceiling
(`satisficing-boundary-briefing.md:544`) lives.

**So the measured record contains one confirmed judgment reversal and one unclassifiable late
finding.** It contains no confirmed instance of an entry going uninspected.

### What this costs the recommendation

Round one already produced a totality claim. A ledger would not have introduced one; it would have
changed its *shape* from an unstructured prose assertion into 17 addressable rows.

The gain is not falsifiability. §1 shows the blanket claim was falsified — round two did it by
finding `OB-7`, three minutes later. What the blanket form lacks is **addressability, attribution,
and a per-entry rationale**: nobody can point at the sentence that covered `OB-7`, ask which reviewer
stood behind it, or read why it was judged sound, because the sentence covers sixteen entries at once
and gives a reason for none of them. An `OB-7` row reading *evaluated, sound, because …* answers all
three.

The ledger does not prevent `OB-7`'s late discovery. Preventing it would need the adjudication to be
truthful, which no output shape can compel; and detecting it would need the rows persisted and a
comparator to diff them, neither of which exists (§6). An earlier draft claimed the fix "eliminates
the subclass that arrives because nobody looked." That claim is unsupported by the run and
contradicts this document's own §6 and §8, which say correctly that rows do not measure depth.

One cheap addition follows from the same evidence. Pass 9 produced round one's near-miss list **by
hand**; the skill does not ask for it, and round two never saw it. A ledger that carries
examined-and-declined alongside the verdicts preserves it. Saunders et al. are the argument — the
stated rationale is a lower bound on what the model registered, and the critique–discrimination gap
does not close with scale (`saunders-2022:145`) — so discarding that articulation throws away the
only trace of it.

---

## 5. The repository does this on a neighbouring axis

`SKILL.md:157`, for the drafter:

> **5b. Check coverage of the item.** List the item's criteria. Against each, name the entry that
> covers it. Then name every criterion with no entry.

Enumerate the population, adjudicate each member, name the residue. `:163`–`:167` records what it
caught: `boundary/gh-158.yaml` left six of the item's seven criteria with no obligation,
`docs/passes/pass6/boundary.yaml` left two, and "both linted clean first: the linter checks whether
the manifest is internally consistent and never checks whether it covers the item."

**The precedent is weaker than it looks, and the weakness is instructive.** 5b is total only over
criteria the model itself listed. Nothing checks that list against the item, so an under-enumeration
at the first step propagates silently and the step reports full coverage of a population it chose.
The review axis has one structural advantage here: entry ids are already in the manifest, so the
denominator is fixed by an artifact and the reviewer does not choose it.

---

## 6. Recommendation — a design judgment, not a finding

Change the first review question from a subset return to a **total adjudication**: one verdict row
per entry id, over the manifest's entry set, each row carrying a reason, plus an explicit third value
for an entry the reviewer cannot evaluate. Carry examined-and-declined in the same ledger.

The per-row reason is the part that does the work, and it is easy to drop as decoration. §4's gain is
addressability, attribution, and a rationale; a bare `OB-7: sound` supplies the first two and leaves
the third where the blanket clause left it.

**What that buys is row completeness.** A model can emit 17 rows having examined six, and the output
will not distinguish that either. The change does not measure review coverage. It moves an
unverifiable claim out of a blanket clause, where it is attributable to no entry and supported by no
reason, into a per-entry assertion carrying both — and in pass 9 the blanket clause was contradicted
anyway, by round two, with no way to record which of its sixteen members had been contradicted.

One consequence follows without further design. Two do not.

**Follows.** The freeze rationale in the companion finding gains a review row count alongside its
coupling-coverage ratio: how many entries the reviewer claimed to adjudicate. A declared figure can
be shown wrong. An absent one cannot.

**Does not follow: a principled cap.** Two rounds of row-complete passes is still two, chosen on run
cost. Row completeness supplies no convergence argument.

**Does not follow: cross-round disagreement detection.** "Round two failed an entry round one passed"
needs each round's rows persisted and a comparator. `:266` writes review answers to `docs/passes/`
only where that directory already exists, and no comparator exists. Both are designable; neither is
designed. Claiming the capability without them would repeat the absent-consumer defect the companion
finding documents.

### What the corpus supports

**What the change does not do is supply the finite population.** The manifest already fixes 17 entry
ids, and step 8 already asks a question keyed to them. The briefing's prescription
(`satisficing-boundary-briefing.md:563`) — "a finite leaf set is exhaustible, whereas 'any problem a
reviewer can find' is not" — is therefore already satisfied on this axis. An earlier draft of this
section claimed otherwise and used the README's search-question passage (`:87`–`:88`) to argue that
fixing the population removes the reviewer's pressure to manufacture findings. The population was
fixed already. Total rows neither remove that pressure nor compel depth.

The proposed change is narrower: **one recorded verdict per existing leaf**, where today the leaves
exist and the verdicts for most of them do not.

Decomposed total grading is well replicated in the corpus — PaperBench's 8,316 binary leaves at 0.83
judge F1, CheckEval's +0.45 cross-evaluator agreement, ResearchRubrics' ~20 points from
ternary→binary (`§4`). Each of those grades candidate outputs against criteria. This grades criteria
themselves, where the population is smaller and the judgment is about evaluability. The direction is
supported; the magnitude is measured nowhere for this case.

---

## 7. The gap upstream of the return shape

`entries[].id` is the wrong domain for half of what the skill's own stopping rule requires.

Step 9 (`SKILL.md:255`–`:258`) names six conditions: what must be true, how it would tell, what must
keep working, what is out of scope, what is handed off, and no blocking question about what is
wanted. Step 8's two questions establish the first two and the last. **What must keep working, what
is out of scope, and what is handed off are asked about by nothing.** Recorded and unfixed at
`docs/passes/pass8/notes.md:84`–`:87`:

> It says refinement is done when a fresh agent can state five things; step 8 asks two questions that
> establish two of them. Nothing asks whether a reader can say what must keep working, what is out of
> scope, or what is handed off. Recorded, not fixed.

Those three are **manifest-level**. No row keyed on an entry id can carry "is `non_goals` adequate"
or "is this handoff feasible." **An entry ledger leaves this half untouched**, and the two repairs are
independent: the three manifest-level questions can be added to step 8 without changing the return
shape at all, and a per-entry verdict row is one way to repair the entry half rather than the only
one. Fix the return shape alone and three of six conditions stay uninstrumented, with findings
against them still arriving late or after the cap.

Huang et al. `:743` is the grounding for treating this as a prompt fix rather than a loop fix: "it is
important to include a complete task description in the prompt for generating initial responses,
rather than leaving part of the task description for the feedback prompt." Their §5 result is a
reported self-correction gain that came entirely from a requirement belonging in the initial prompt.

A corroborating defect, worth one line: `docs/refinement-loop.md:194`–`:197` deleted two assessment
checks as duplicates of step 8, and one of them — whether every `decision` can come out false — is
absent from step 8. It is in the questions pass 9 actually ran (`stage2-review.md:11`–`:13`) and in
no committed artifact. The deduplication removed the reader that would have caught the gap.

---

## 8. What this does not fix

- **The output becomes total; the review does not.** Emitting 17 rows is not examining 17 entries,
  and nothing in the output separates them. Depth is untouched, and so are Rice's theorem and the
  ~80% judge ceiling (`satisficing-boundary-briefing.md:544`).
- **Judgment reversals survive.** `OB-13` is the measured instance: examined and declined in round
  one, counted in round two, identical text. §4 is the whole treatment of it.
- **Obligations nobody wrote stay invisible.** Entry-level rows say something about entries that
  exist. Step 5b covers the other axis, which is why both are needed.
- **Three of six step-9 conditions remain uninstrumented** until §7 is addressed, which is a separate
  repair to a different part of step 8.
- **No measured instance of an uninspected entry exists.** Round one claimed to have evaluated every
  entry, so `OB-7` is a late finding of undetermined cause (§4). The recommendation is aimed at a
  failure the run makes *possible and undetectable*, and not at one it demonstrates. If every entry
  is in fact being inspected and the misses are all judgment, a ledger changes the record and not the
  outcome.
- **The cap-reached handoff is a separate defect.** `:234` routes a two-round stop with findings to a
  person, and neither `:255`'s completion test nor the freeze at step 10 connects to that branch. A
  row-complete review makes that handoff more legible. It does not tell the human what to do with it.
