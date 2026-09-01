# The refinement loop

How modus's two skills and one boundary get improved together.

`docs/plugin-evaluation.md` answers whether a skill fires. This answers something
one level up: whether the three artifacts in a chain are good enough, when each
one's ceiling is set by the artifact before it.

## Why the three cannot be improved separately

The chain is:

```
raw work item
  → human-work-item   → a refined item a person can read
  → agent-work-item   → a boundary an agent can discharge
  → assessment        → defects
```

A refined item that never states what must keep working gives `agent-work-item`
nothing to write a preservation entry from. The boundary is then missing that
entry, and the boundary is not what is wrong. Tuning `agent-work-item` against a
weak refined item measures the item, not the skill.

So a pass runs the whole chain and the fixes land wherever the defect was
created.

## The item under test

GitHub #158, "Writing boundaries by hand doesn't scale". It is the goal and the
fixture at once: completing it requires running the process it describes.

The GitHub issue is the item of record. Beads are derivative — `domestique-3z5`
covers the same goal, and where the two disagree the issue wins. A reader outside
this repository can see the issue; bead ids are hash-suffixed and mean nothing to
them.

### The fixture

```
modus/evals/158-human-work-item/input.json    the raw item
modus/evals/158-human-work-item/expected.md   the refined item
```

`input.json` is the GitHub API response, stored verbatim rather than as pasted
text. `agent-work-item` step 1 warns that a tracker's UI and its API can return
different content for the same item, and bead `domestique-2no` is open on it. The
fixture is what an adapter actually receives.

It records `updatedAt`. If a re-fetch differs, #158 was edited and the fixture is
stale — say so rather than refining a version nobody else can see.

`expected.md` states the shape of the output and the questions blocking its
content. **The content is not known yet.** Passes 1 and 2 produce it. Until then
the file is a contract on shape, not an answer to compare against, so pass 1
cannot fail by disagreeing with it.

## Stages and their gates

Run each gate before starting the next stage. A defect caught at its own stage
costs one stage; the same defect caught at the assessment costs a whole pass.

| Stage | Output | Gate |
| --- | --- | --- |
| 1 `human-work-item` | refined item + acceptance criteria | its own step 6: goal stated, a number wherever the item said fast or slow, what must keep working, what is out of scope, a name against every open question |
| 2 `agent-work-item` | boundary manifest | `lint-boundary.js`: `failures` empty **and** `exempt` zero, with the item's part list supplied |
| 3 assessment | defect list | below |

`exempt` zero is not a formality. An exempt check declared it had no domain and
did not run, which is not passing — see modus README constraint 2.

## The assessment

Three checks. All three run every pass.

**A. The stopping rule from `agent-work-item` step 9.** A fresh agent reads the
boundary and the refined item, and can say what must be true, how it would tell,
what must keep working, what is out of scope, and what is handed off — with no
blocking question about what is wanted. Questions about how or where to build do
not block.

**B. Does it name what the item does not.** The value is in the consumer, the
constant, or the missing test that the item never mentions. A boundary that
restates the item in schema form passes the linter and saves nobody anything.
This is AC-9 in `boundary/agent-work-item-skill.yaml`.

**C. Every `decision` can be false.** Ask of each one: what would make this
false? An answer needing a judgment about quality is a defect.

## The attribution rule

A defect in the boundary does not mean the boundary is what to fix.

**Fix at the earliest stage whose output already contained the defect.**

Read backwards from the defect:

| The defect is already visible in | Fix |
| --- | --- |
| the raw item, and the refined item did not resolve it | `human-work-item` |
| the refined item, absent from the raw item | `human-work-item` |
| the boundary, absent from the refined item | `agent-work-item` |
| nothing upstream, and both skills were followed as written | the boundary draft |

Two consequences worth stating, because both are easy to get wrong:

- A defect present in the refined item **and** the boundary belongs to
  `human-work-item`. It will also look like an `agent-work-item` defect. It is
  not one.
- A skill that was not followed is not a skill defect until you have checked
  whether it *could* be followed. If the instruction was clear and got skipped,
  that is a compliance failure and the fix is bulletproofing, not new content.
  See `superpowers:writing-skills` on matching the form to the failure.

## The control item

A second work item that runs through the flow every pass, and that the skills are
never edited because of. Its only job is to catch one failure: the skills getting
fitted to #158 instead of to work items in general.

Without it, each pass adds instructions that happen to help #158. The skills
improve on #158 and get no better — possibly worse — on anything else. #158's own
results cannot show that, because #158 is improving the whole time.

The item: the CSV export ticket in
`modus/evals/human-work-item-resolves-before-rewriting/prompt.md`. Synthetic,
written to carry one defect per lens.

Read its result every pass. Change nothing on its account. If it degrades while
#158 improves, the last edit fitted #158.

**What this control item cannot detect.** It fails by contradiction and runs about
twice the length of a real issue here. The five open issues are 273 to 460
characters, carry a labelled Problem and Goal, and fail by omission instead. So
this item can show the skills being fitted to #158's subject. It cannot show them
being fitted to long contradictory tickets and losing the terse-omission case,
which is the failure this repository's own items actually have. Swapping in a
real issue — #156 is the furthest from #158 in subject — is the fix if that
becomes a live worry.

## These passes are pre-freeze

`agent-work-item` step 10 says a frozen boundary is the standard and is not
edited. This loop re-drafts the boundary every pass, so no boundary produced by a
pass is frozen. Each carries the marker:

```
# NOT FROZEN. Pass N of the refinement loop.
```

The freeze happens once, after the loop stops, on the boundary that a human
approves. Editing a frozen boundary because a later pass disagreed with it is the
failure modus exists to prevent.

## Where a pass puts things

A pass writes what it produced. The fixture holds what has been accepted. Two
different things, and conflating them loses the ability to compare passes.

```
boundary/158-item-pass-N.md                    what pass N produced
boundary/158-pass-N.yaml                       the boundary pass N produced
modus/evals/158-human-work-item/expected.md    the accepted refined item
```

When a pass's refined item is approved, copy it into `expected.md`. From that
point `expected.md` is an answer later passes are compared against, not only a
contract on shape. Before the first approval it is shape only, and a pass cannot
fail by disagreeing with it.

Per-pass files are kept, not overwritten. A pass that regressed is only visible
next to the one before it.

Nothing is written to GitHub or to a tracker by a pass. `human-work-item` shows
the rewritten item and waits; that rule holds here.

## When the loop stops

Both are required:

- The assessment passes A, B and C with no change to either skill.
- The control item did not degrade.

One pass that meets both ends the loop. A pass that meets both only because the
previous pass edited a skill has not met the first condition — run one more with
no edits and see.

## What a pass records

One row per pass, appended to this file.

| Pass | Defects found | Attributed to | Edits made | Control item |
| --- | --- | --- | --- | --- |
| | | | | |

## Known harness limits

**`probe-skill.js` cannot run stage 1.** It is one-shot (`claude -p`), and
`human-work-item` is built to ask one question and stop. The probe reaches its
findings and its first question. The resolution loop, the rewrite, step 6 and the
second lens pass are all unreachable that way.

So stage 1 is an interactive session with a person answering. Stages 2 and 3 run
through the probe. Do not plan a pass that expects the probe to exercise stage 1.

**One run is weak evidence.** The probe does one run and no repetition. Two
passes disagreeing about the same defect is expected noise, not a finding about
either skill.
