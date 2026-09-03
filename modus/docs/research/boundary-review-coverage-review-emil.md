# Review of `boundary-review-coverage.md` — emil

Requested by gus, who is drafting that document; hal is reviewing in parallel and this deliberately
goes where hal is not. Scope: what prior work on review coverage, sampling, and convergence adds to
or contradicts the draft.

**Ownership, answered first.** `boundary-review-coverage-evidence.md` (untracked, 04:38) is mine. It
covers the same defect. **gus's document should be the surviving one** and I will delete mine once
the material below is folded in. That is not deference — it is the better artifact: one defect, one
mechanism, one recommendation, and §2's three-row indistinguishability table is a cleaner statement
of the mechanism than anything in mine. Mine carries three causes in one file, which is two findings
too many, and its value is the forensics in §1 below rather than its argument.

The thesis is right. Two of its supporting arguments are not, and the run gus is arguing from
contains the evidence that replaces them.

---

## 1. Confirmed by measurement, which the draft currently lacks

The draft rests on an operator report. `docs/passes/pass9/stage2-stream.jsonl` holds both reviewers'
verbatim reports and settles it. The committed `stage2-review.md` is a human summary; these are the
raw returns.

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

Five entries — `OB-1`, `OB-2`, `OB-8`, `OB-14`, `OB-15` — are named individually in neither report.

The manifests the two rounds read are the `tool_result` at idx 485 and 543. Stripping the `NNN\t`
prefix and diffing per entry: **15 of 17 entries are byte-identical between rounds.** Only `OB-3`
and `OB-5` differ — exactly the two the drafter fixed.

That is the operator's "findings on sections unchanged since round one", measured, in the run the
skill's current cap was written from.

---

## 2. Replace §2's argument: the return is not information-free, it is false

§2's table says the three reviewer behaviours are "indistinguishable in the output", and §4 justifies
the third value on the grounds that "silent omission and deliberate pass are *the same output
today*". That is an ambiguity argument, and the run does not support it — it supports something
stronger.

Neither pass-9 reviewer returned a bare subset. Both volunteered a coverage claim the skill never
asked for:

> Round 1: *"The other sixteen entries evaluate."*
> Round 2: *"The other fifteen entries evaluate."*

And round 1's was **wrong about a member**. `OB-7` was inside its "other sixteen." Round 2, reading
byte-identical text, found that `OB-7`'s decision counts a different unit than its statement — a real
defect, which the pass's own evaluation calls "the more serious of the two"
(`stage2-review.md:99`).

So the output is worse than uninformative. It carries an affirmative positive claim over an
unenumerated remainder, and that claim was false three minutes before the run proved it. The human
reading `stage2-review.md` was told a sweep had happened.

**This matters for which precedent applies.** The companion document's §5 disanalogy table
(`boundary-completion-freeze-evidence.md:230`–`:238`) turns on exactly this distinction:

> A producer emitting a false value has to be fixed at the producer; that is not optional and
> `abstain` is the right shape for it. A producer emitting a true value that a consumer over-reads is
> a different repair.

§4 already claims the producer-side branch. The ambiguity argument does not earn it — ambiguity is
consistent with a true-but-vague output. A measured false claim does earn it, and it puts this
finding squarely on the branch the companion document assigns to the producer, while that document's
own recommendation sits on the other branch. The two compose rather than compete, and saying so
pre-empts the obvious objection that they contradict.

`lint-boundary.js:647`–`:651` is then the exact precedent rather than an analogous one: "Recording
`pass` was the one affirmatively misleading outcome available." Same failure, same loop, one actor
over.

---

## 3. Withdraw "independent samples of an unchanged population"

This appears in the framing blockquote and as step 4 of §2's formal argument. Two problems, and the
second is the one that matters.

**It is 88% true.** 15 of 17 entries unchanged, not 17 of 17. Minor on its own.

**It is the precondition for a method the project has already ruled out, and asserting it will
reopen the question.** `satisficing-boundary-near-term-artifacts.md:139`–`:151` removed the
reviewer-overlap tally on the stated grounds that "a review→revise loop changes the artifact between
rounds and is therefore outside the model." A document asserting a closed population invites the next
reader to propose an overlap-based coverage estimate.

My own doc records the correction and I will hand it over: that stated reason **is wrong** for the
boundary loop, since 15 of 17 entries did constitute one version of one artifact read by two
reviewers. The exclusion nonetheless stands on grounds the correction does not touch — n=2 is the
minimum for any overlap at all and results at n=2 are ambiguous
(`stopping-rule--petersson-wohlin-2004-jss--capture-recapture-10-years.txt:417`, `:424`), four to
five reviewers is the floor for acceptable accuracy (`:414`), estimate accuracy was never shown to
improve inspect/reinspect decisions, and an asymmetric reviewer briefing deliberately suppresses the
overlap the estimator reads as coverage.

Also, "independent" is doing work it cannot. Round 2 read a document whose two most-discussed
entries had been rewritten, which moves salience for everything else. Not independent draws.

Suggested form: *successive rounds are fresh samples of a largely unchanged population, and no round
lowers confidence about what remains.* That keeps the argument and does not claim closure.

---

## 4. The split the draft needs: only one of pass 9's two late findings is a coverage failure

This is the most consequential omission, because the draft's central promise is that total
adjudication addresses late findings on unchanged text, and pass 9 contains one clean instance of
each failure — only one of which it fixes.

| | `OB-7` | `OB-13` |
| --- | --- | --- |
| Round 1 | inside the blanket claim; no evidence either way | examined, argued, **explicitly declined** |
| Round 2 | found | found |
| Text between rounds | identical | identical |
| Class | **unenumerated coverage** | **judgment reversal** |
| Total adjudication | fixes it | does not — both rounds emit a row and the rows disagree |

`stage2-review.md:48` records round 1's own account: "Two near-misses it checked and did not count,
recorded because a later round may raise them again." `OB-13` was one of them.

§5's "bounds coverage, not depth" is the right category but does not name the instance, and a reader
will expect the fix to eliminate late findings on unchanged text. It will not eliminate all of them.
Naming `OB-13` costs a paragraph and forecloses an overclaim in the doc's load-bearing promise.

One cheap addition follows. Pass 9 produced the artifact for the `OB-13` half **by hand** — round
one's recorded near-misses — the skill does not ask for it, and round 2 never saw it. The ledger
should carry examined-and-declined alongside the verdicts. Saunders et al. are the argument: the
stated rationale is a lower bound on what the model registered and the critique–discrimination gap
does not close with scale (`scalable-oversight--saunders-2022-openai--self-critiquing-models.txt:145`),
so discarding that articulation throws away the only trace of it.

---

## 5. The gap total adjudication cannot close, and it is upstream of the return shape

`entries[].id` is the wrong domain for three of the six things the skill's own stopping rule requires.

Step 9 (`SKILL.md:255`–`:258`) names six: what must be true, how it would tell, what must keep
working, what is out of scope, what is handed off, and no blocking question about what is wanted.
Step 8's two questions establish the first two and the last. **What must keep working, what is out of
scope, and what is handed off are asked about by nothing** — already recorded, unfixed, at
`docs/passes/pass8/notes.md:84`–`:87`:

> It says refinement is done when a fresh agent can state five things; step 8 asks two questions that
> establish two of them. Nothing asks whether a reader can say what must keep working, what is out of
> scope, or what is handed off. Recorded, not fixed.

Those three are **manifest-level** properties. No row keyed on an entry id can carry "is `non_goals`
adequate" or "is this handoff feasible." So total adjudication is necessary and not sufficient: fix
the return shape and three of six conditions remain uninstrumented, and findings against them still
arrive late or after the cap. The draft would be materially stronger for saying so — it is the second
half of the same defect, and it is cheaper to fix than the ledger.

Grounding for treating it as a prompt fix rather than a loop fix, Huang et al. `:743`: "it is
important to include a complete task description in the prompt for generating initial responses,
rather than leaving part of the task description for the feedback prompt." Their §5 result is a
reported self-correction gain that came entirely from a requirement belonging in the initial prompt.

A corroborating defect worth one line in the draft: `docs/refinement-loop.md:194`–`:197` deleted two
assessment checks as duplicates of step 8, and one of them — whether every `decision` can come out
false — **is not in step 8**. It is in the questions pass 9 actually ran
(`stage2-review.md:11`–`:13`) and in no committed artifact. The deduplication removed the reader that
would have caught the gap.

---

## 6. Two guards §4 should state, because readers will reach for both

**Do not pass round one's ledger to round two.** Song et al. find that sharing rubric structure
alone lifts inter-judge agreement from r̄ ≈ 0.24 to r̄ ≈ 0.62 with no knowledge added
(`judge-ceiling--song-2026-tencent--evaluation-illusion.txt:87`, `:625`). Seeding round 2 with round
1's verdicts manufactures the concurrence round 2 exists to avoid. Each round produces its own total
ledger; the union is computed outside the reviewers.

Quote that as the r̄ progression, not as "62% of agreement" — the paper reads a Pearson r of 0.62
that way and offers no other definition, which `satisficing-boundary-briefing.md:314`–`:321` already
flags. The direction is well supported; the decomposition is not.

**Do not add rounds.** §4's "two rounds of *complete* passes is a defensible bound" is correct and
invites "so three would be better." TICK closes it from the same source that justifies the checklist:
improvement at a single iteration, degradation thereafter on objectively-scored tasks
(`checklist--cook-2024--tick-generated-checklists.txt:586`), plateau or regression by the fourth on
judged ones (`:535`).

---

## 7. Give §5's rubber-stamp caveat a mechanism

§5 names the failure — "adjudicate all N entries shallowly and return `N of N, 0 failed`" — and
stops. The corpus supplies the remedy shape, and it is one clause per row.

`satisficing-boundary-near-term-artifacts.md:52`–`:63`: "Adjudicated must mean evidenced, not
answered." The reason is RubricBench's execution-failure patterns, which persist given *correct*
criteria — judges name the failed requirement in their reasoning and then rule against it
(`rubric-limits--zhang-2026--rubricbench.txt:1285`, `:1306`).

Concretely: an `evaluable` verdict carries one clause naming what would make that decision false.
That does not guarantee interrogation, and the draft should not claim it does. What it changes is
attribution: round 1's `OB-7` row would have been a checkable claim about `OB-7`, where "the other
sixteen entries evaluate" is not checkable about anything. Stating the improvement that precisely is
also the honest answer to the operator's actual worry.

---

## 8. Citations checked

All four spot-checked citations hold: `lint-boundary.js:647`–`:651`, `README:87`–`:88`,
`briefing:563` (the sentence runs to `:564`), `SKILL:247`–`:249`. No corrections.

---

## 9. What I would keep out of the merge

My doc's §5 — that `boundary-prose.md:137`–`:144` claims a script enforces word caps and banned
words while none does, and that every boundary in the repository prints `ok` from the CLI while
carrying 3–16 exempt locator checks against step 7's own "`exempt` must be zero" — is a **different
defect**. It belongs with `domestique-asx` and `boundary/gh-158.yaml`'s unbuilt `AC-6`/`AC-7`, not in
a coverage argument. It is adjacent only in that moving mechanically decidable defects off the
reviewer shortens the list the reviewer sweeps.

`domestique-8nb` is filed against the question-set and ledger halves and should be repointed at
gus's document once it lands.

---

## 10. Addendum — correction to the companion's new §2 subsection

gus folded the `exempt` measurement into `boundary-completion-freeze-evidence.md` §2 as "Measured, on
every committed boundary". The table is right, the counts reproduce (4, 3, 5, 14, 16 in glob order),
and the attribution is fair. **One sentence of the surrounding prose is wrong, and it puts §2 in
contradiction with §5 of the same document.**

The sentence:

> Sixteen checks declaring they had no domain is precisely the "ran and established nothing" state
> this document is about, computed correctly and reported as success.

`exempt` is not that state. `lint-boundary.js:240`–`:245` draws the line explicitly:

> The check had a domain, ran, and refuted nothing. **Distinct from `exempt`, which means there was
> nothing to compare**, and from `pass`, which for a refute-only check would assert something it
> cannot establish.

"Ran and established nothing" is `abstain`, and this document already assigns it that way — the §5
precedent table at `:212` reads "`abstain` outcome … distinguishes 'ran and refuted nothing' from
'passed'." §5 then spends four paragraphs on why `abstain` and `exempt` are different states, and the
withdrawn-canonicalization argument at `:221`–`:238` turns on that same producer-side distinction. A
§2 that collapses the two undercuts the section that does the document's heaviest lifting.

**The accurate framing is stronger, not weaker.** These exemptions are neither `abstain` nor an
honest no-domain: they are caller-induced. The branch fires only `if (parts === null)` (`:409`), and
the comment above it says the part list "is supplied by the caller — by a fixture here, by the
tracker adapter in production … Absent list means declared no-domain, never a silent skip"
(`:405`–`:408`). The emitted message says "no addressable part list was supplied."

So the domain existed and was withheld, because `main()` has no flag to pass it. Every level of the
linter behaves correctly and says so honestly; the entire defect is that the only shipped reader
cannot supply the input or surface the outcome. That closes the one objection the table otherwise
invites — *some exemptions are legitimate* — because none of these sixteen is an exemption by
necessity. All of them are an interface gap reported as success.

Suggested replacement for the sentence:

> Sixteen checks declaring they had no domain is not the `abstain` state §5 is about; `:240`–`:245`
> marks `abstain` "distinct from `exempt`, which means there was nothing to compare." It is a worse
> state than either. The exemption fires only `if (parts === null)` (`:409`), and the part list "is
> supplied by the caller" (`:405`). The domain was available and the CLI has no flag to pass it, so
> none of these sixteen is an exemption by necessity — each is an interface gap reported as success.
