# Pass 11, step 8 — the frozen question set

Written before the boundary was touched. Both rounds receive this file verbatim.

**This file does not change during pass 11.** If a question turns out to be wrong,
that is a recorded finding about the question set and it ends the pass. It is not
reworded mid-pass. Pass 10 reworded Q6 between rounds, which moved the review's
target and was invisible to everyone except the drafter who did it.

Q1 and Q2 are the skill's committed step 8. Q3 to Q5 are the three conditions
gh-173 adds. Q6 is `domestique-37o`'s check, kept because it found a defect in pass
10 that no other question reached.

---

## The prompt given to each reviewer

You are reviewing a boundary manifest — a per-item definition of done — that you
did not write. You are a fresh reviewer with no history with this artifact.

Read the boundary at `boundary/gh-173.yaml`. Read the work item it was drafted from
with `gh issue view 173 --comments`.

Those two artifacts are all you get. Do not read the rest of the repository — not
the skill, not the linter, not the research documents, not the other boundaries, not
the pass records. If the boundary cites a file you have not read, that is intended:
judge whether the boundary and the item together let you answer, not whether the
citation is accurate.

Answer exactly six questions. Nothing else.

**1.** Which entries' `decision` could you not evaluate against that entry's own
`observation`? Ids only, then a short reason per id. The test is narrow: holding
only what that entry's `observation` produces, can you return true or false?

**2.** Do you have a blocking question about **what is wanted** that you cannot
answer from the boundary and the item? Do not raise questions about how or where to
build it — those are the next phase. A question is only blocking if proceeding under
either answer would build materially different things and neither artifact chooses.

**3.** Can you state what must keep working? Yes or no. If no, name the specific
thing missing.

**4.** Can you state what is out of scope? Yes or no. If no, name the specific thing
missing.

**5.** Can you state what is handed off, and to whom? Yes or no. Use the boundary's
own claim C5 as the definition of what counts as handed off. If no, name the
specific residual that lacks a destination.

**6.** For each entry, try to name an input under which its `decision` returns
**true** while the failure that entry exists to exclude **occurs**. Ids only, plus
the input you found. Report `none` for entries where you could not construct one.

Do not answer Q6 by asking whether a decision can ever return false. Almost every
decision can. The question is whether the decision is **sensitive to the specific
failure its entry is there to catch** — a decision that returns false on some
unrelated input and true on the failure itself passes this boundary's own test while
leaving the failure uncaught.

### Field meanings you need

`statement` is the condition that holds when the work is done. `observation` names
what is done and by whom, repeatably. `decision` is a predicate that is true or
false after making that observation. `traces` anchors an entry to a claim (`C*`) or
a coupling edge (`CPL-*`). `obligation: must` gates; `watch` does not. `entails`
maps each coupling edge to the obligation covering it, or to the literal
`uncovered`. `test_role: change` means the test fails or errors on the base
revision; `preservation` means it passes on both base and head. Provenance `stated`
means the item says it; `stated_unverified` means the item says it and nothing
settles it; `inferred` means the repository supplies it and the item is silent. A
`stated_unverified` claim may not ground a `must`.

### What counts as a finding

Name it specifically. General dissatisfaction is not a finding. `none` is an
acceptable and expected answer on any question, and a manufactured finding is worse
than no finding. Do not hunt for findings to justify the review.

---

## Why Q6 is worded this way

Pass 10 asked "can every `decision` come out false, or is one true by construction".
Round two named OB-4 and OB-6. zed, verifying, showed that neither decision is true
by construction: OB-4 returns false whenever a NO lacks a finding, and OB-6 returns
false whenever the four versions disagree. Both defects were real anyway. What was
wrong with them was **insensitivity to the specific failure the entry existed to
exclude**, which is a different property from unfailability and needs a different
fix.

Q6 now asks for that property directly, as a construction rather than a judgment.
The reviewer either produces the input or reports `none`.
