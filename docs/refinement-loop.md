# The refinement loop

How modus's two skills and one boundary get improved together.

`docs/plugin-evaluation.md` answers whether a skill fires. This answers something
one level up: whether the three artifacts in a chain are good enough, when each
one's ceiling is set by the artifact before it.

## Why the three cannot be improved separately

The chain is:

```
raw item
  → human-work-item    → a refined item a person can read
  → agent-work-item    → criteria an autonomous agent can work from
  → the drafter (#158) → the boundary
  → assessment         → defects
```

Today `agent-work-item` spans the last two arrows: a person follows the skill and
writes the boundary manifest by hand. The drafter is what #158 delivers, so the
final arrow is the deliverable rather than a stage the loop can run. The loop runs
the stages that exist.

A refined item that never states what must keep working gives the stages below it
nothing to write a preservation entry from. The boundary is then missing that
entry, and the boundary is not what is wrong. Tuning `agent-work-item` against a
weak refined item measures the item, not the skill.

So a pass runs the whole chain and the fixes land wherever the defect was
created.

## The item under test

GitHub #158, "Draft the boundary from the refined criteria". It is the goal and
the fixture at once: completing it requires running the process it describes.
Pass 3 rewrote its title and body, so the placeholder wording that pass 1 and 2
worked against is now only in `input-gen0.json`.

The GitHub issue is the item of record. Beads are derivative — `domestique-3z5`
covers the same goal, and where the two disagree the issue wins. A reader outside
this repository can see the issue; bead ids are hash-suffixed and mean nothing to
them.

### The fixture

```
modus/evals/158-human-work-item/input-gen0.json   the placeholder
modus/evals/158-human-work-item/input-gen1.json   defined, criteria unlabelled
modus/evals/158-human-work-item/input-gen2.json   the current raw item
modus/evals/158-human-work-item/expected.md       the record of what was decided
```

The highest-numbered generation is the input for the next pass. Each is the
GitHub API response, stored verbatim rather than as pasted text. `agent-work-item` step 1 warns that a tracker's UI and its API can return
different content for the same item, and bead `domestique-2no` is open on it. The
fixture is what an adapter actually receives.

It records `updatedAt`, and the fixture advances by design. A pass may write an
improved item back to the issue, and that becomes the input for the next pass, so
the item converges alongside the skills. This is the bootstrapping period and
several fixture changes are expected before the drafter exists.

Every superseded generation is kept, so the item's own improvement stays
readable. A re-fetch matching no stored generation means somebody else edited the
issue — which is the case this check exists for, and is not the same thing as a
deliberate advance.

`expected.md` records what was decided, who decided it, the inferences drawn
rather than asked, and the split proposed and not made. It does not copy the item
text — the newest generation holds that, and two copies would drift.

**The fixture is now at a fixed point.** Generation 2 is both the next pass's
input and pass 3's accepted output, so a pass over it should find nothing new
unless a skill improved in between. Finding nothing is the expected result, not a
failed pass.

## Stages and their gates

Run each gate before starting the next stage. A defect caught at its own stage
costs one stage; the same defect caught at the assessment costs a whole pass.

| Stage | Output | Gate |
| --- | --- | --- |
| 1 `human-work-item` | refined item + acceptance criteria | its own step 6: goal stated, a number wherever a requirement depends on one, what must keep working, what is out of scope, a name against every open question |
| 2 `agent-work-item` | criteria an agent can work from, and today the boundary too | `lint-boundary.js`: `failures` empty **and** `exempt` zero, with the item's part list supplied |
| 3 assessment | defect list | below |

`exempt` zero is not a formality. An exempt check declared it had no domain and
did not run, which is not passing — see modus README constraint 2.

Stage 1's gate fails two ways and they need opposite responses. Something the
human decided and the refined item omits is the skill underperforming. Something
nobody has decided is a placeholder, and the skill did its job by recording it.
Read the open questions to tell which.

### When stage 1 finds a placeholder

The pass ends at stage 1. A placeholder has no decided goal, and `agent-work-item`
derives obligations from the goal — given an undecided one it invents them. Stages
2 and 3 do not run.

That is not a failed pass. It produced the thing worth having: the undecided
questions named, with a route to an answer against each. Record it and stop.

The pass resumes when those are answered, which may need work outside this loop.

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
| the raw item, and the human answered "not decided" | nothing — the item is a placeholder |
| the raw item, and the human says the item is wrong about its own subject | the item itself — a `contradicted` finding, which may change what gets built |

Three consequences worth stating, because all three are easy to get wrong:

- A defect present in the refined item **and** the boundary belongs to
  `human-work-item`. It will also look like an `agent-work-item` defect. It is
  not one.
- A skill that was not followed is not a skill defect until you have checked
  whether it *could* be followed. If the instruction was clear and got skipped,
  that is a compliance failure and the fix is bulletproofing, not new content.
  See `superpowers:writing-skills` on matching the form to the failure.
- A recorded open question is not a defect. A skill refusing to guess is the
  skill working. Attribute a defect only where a skill could have resolved
  something and did not.

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

Once the item under test advances each pass, this is the only thing left holding
skill quality honest. A better boundary can come from a better item as easily as
from a better skill, and the attribution rule covers defects rather than
improvements. This item is not a precaution any more.

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

Per-pass files are kept, not overwritten, and that includes the drafts a human
rejected. A pass that regressed is only visible next to the one before it.

`human-work-item` step 8 makes this consistent: approval gates the record — the
tracker, the repository, any commit — and not the working draft. Before pass 2
the skill said "wait for approval before writing it anywhere", which banned the
per-pass file this document requires.

Nothing is written to GitHub or to a tracker by a pass. `human-work-item` shows
the rewritten item and waits; that rule holds here.

## When the loop stops

Both are required:

- The assessment passes A, B and C with no change to either skill.
- The control item did not degrade.

One pass that meets both ends the loop. A pass that meets both only because the
previous pass edited a skill has not met the first condition — run one more with
no edits and see.

## When the loop is blocked

Not the same as stopping. The loop is blocked when every remaining open question
needs evidence nobody has. No number of passes closes it, and further passes
produce invented answers.

**Try to unblock before declaring it.** An undecided question is not the only
thing standing in the way — the item's scope is also in play, and scope is
decidable today because it is a human's call rather than a measurement. See
Unblocking a placeholder in `human-work-item`: move the decision out of the item,
separate motivation from requirement, or replace the unmeasurable measure with an
observable one.

Pass 1 declared #158 blocked on two questions. Pass 2 unblocked both without
answering either. Declaring blocked before trying those three moves costs a pass
and produces nothing.

Blocked is still a real state and worth reporting when it holds. Name the
questions, name what would answer each, and hold the loop until that evidence
exists.

## Pass record

One row per pass, appended to this file.

| Pass | Findings | Attributed to | Control item |
| --- | --- | --- | --- |
| 1 | 5 | `human-work-item` 4, this document 1 | unchanged |
| 2 | 4 | `human-work-item` 2, #158 itself 2 | unchanged |
| 3 | 8 | `human-work-item` 2, this document 4, #158 itself 2 | 8 findings against 10 |
| 4 | 3 | `human-work-item` 2, both skills 1 | **used to drive edits — see below** |
| 5 | 4 | `human-work-item` 4 | n/a — verified on #156 |

### Pass 1

Stage 1 only. #158 is a placeholder: the human's role once the feature ships, and
the number that decides "scales", are both undecided rather than unwritten.
Stages 2 and 3 did not run.

Findings against `human-work-item`:

1. Step 4 gave a form for conflicts only. With no form for a missing
   requirement, the run offered the human a menu of invented answers — and named
   a linter, a manifest schema and a fixture corpus inside it, which is
   implementation inside a question about the WHAT.
2. No red flag against offering that menu.
3. The wording rules banned metaphor but not unexplained vocabulary, so
   "preservation obligation" and "held-out item" reached the human unexplained.
4. No notion of a placeholder. The skill assumed refinement throughout, and its
   Out of scope excluded "creating a work item from nothing" — excluding its own
   common case.

Finding against this document: the attribution table had no row for an answer of
"not decided", so a correctly recorded open question read as a `human-work-item`
defect. Fixed above.

All five are fixed.

### Pass 2

Stage 1. #158 was unblocked without answering either question from pass 1, using
two of the three moves in Unblocking a placeholder: the human-involvement
decision moved out of the item into a separate one, and "doesn't scale" was
reclassified from requirement to motivation. The measure was then replaced with
an observable one — a reviewer names no entry they had to write themselves.

#158 is defined and awaiting approval. It does not reach `expected.md` until then.

Findings against `human-work-item`, both fixed:

1. "Wait for approval before writing it anywhere" banned the per-pass working
   draft this document requires, so a rejected draft would never be written and
   the comparison would be lost. Step 8 now gates the record rather than the
   notes.
2. The acceptance-criteria test said a bullet needing judgment fails but named no
   forms, and a draft bullet used "approves" — which `boundary-prose.md` rejects
   as a state of mind. The three failing forms are now named with replacements.

Findings against #158, carried to its open questions rather than fixed here:

- A recorded blocker is not required to name what is wrong. A blocker reading
  "rejected" cannot be resolved.
- No outcome after a blocker is resolved: whether drafting resumes on its own or
  has to be re-requested.

Both came out of step 7, the second lens pass over the rewrite, on the first item
that step has ever run against.

### Pass 3

Complete. #158 was rewritten and approved, and the title and body were written
back to the issue. The fixture was re-captured as generation 1 and generation 0
kept. Generation 2 followed, adding citation labels without changing wording.

Both skills learned the label scheme. `human-work-item` step 5 labels every
separately falsifiable claim; `agent-work-item` step 1 cites a label where the
item carries one and falls back to `<field>#<n>` where it does not. The fallback
matters — #156, #157 and the control item carry no labels and still work.

The label change came from a defect the definition itself created. Generation 1
put seven criteria in one bullet list, and a bullet list is one paragraph, so all
seven were `description#3`. Any entry tracing to any criterion cited the same id.
Generation 0 had the same collapse over two claims; defining the item well made
it worse by putting more content in each paragraph.

### Pass 4

**This pass broke the control item rule, on instruction.** Two findings visible in
the control item were resolved in `human-work-item` rather than only recorded:

1. A finding bundled three undefined cases into one line, against the stated rule
   that one finding takes one answer. The rule was a prose aside inside step 3 and
   did not hold. It is now a test on the answer rather than on the sentence, with
   a red flag beside it.
2. "Nothing states what must keep working" appeared in earlier runs and not in
   this one. It was only reachable through the `missing` lens's general wording.
   That lens now names the four things absent more often than present, so finding
   them does not depend on thinking of them.

**The consequence, stated so it is not lost.** The control item exists to detect
the skills being fitted to the item under test, and it works only while nothing
is changed on its account. For these two behaviours it is no longer a control —
it cannot now show whether the fix generalises, because the fix was written
against it.

**Both fixes were then verified against #156**, which neither skill had ever been
run on and which nothing has been changed on account of. That is what the
compromised control could no longer answer.

On #156 the run produced twelve findings and said so — "twelve findings, each
needing its own answer". The partial-failure case and the already-claimed case
came out as two findings rather than one, which is the split the old behaviour
would not have made. "Nothing is said about what must keep working" appeared by
name, along with the out-of-scope and failure-case items the `missing` lens now
lists. The fourth listed item, a number for a vague quantity, correctly did not
appear: #156 uses no such word.

#156 carries no labels, so it also exercised the fallback. Citations came out as
"the Goal line", "description, sentence 2", "title" — readable, and no worse than
labels would have been on an item this short.

So the fixes generalise on the evidence rather than on the argument. The verified
finding stands, and the control item remains compromised for these two behaviours
even though the fixes turned out to be sound: it cannot demonstrate that, and
#156 had to.

Proposed and not acted on: make #156 the control item. It is real rather than
synthetic, it fails by omission the way this repository's items actually do, and
nothing has been tuned against it.

### Pass 5

Four findings against `human-work-item`, all from watching it run rather than from
reading it.

1. **No stopping rule and no triage.** `agent-work-item` step 9 has one; this
   skill had none, so every finding read as blocking. The #156 run announced
   "Question 1 of 12", which is not a workflow anyone finishes — on a skill whose
   subject is that people run out of patience. Findings are now split into
   blocking (`contradicted`, `conflict`, missing goal) and everything else, and
   there is a "When it is done" section that ends refinement on a condition
   rather than on running out of findings.
2. **Step 3 cited positions for items that carry labels.** Step 5 was taught to
   write `Problem`, `Goal`, `AC1` in pass 3 and step 3 was not, so the skill
   produced labelled items and then cited paragraph numbers in them.
3. **Every run opened with a sentence explaining its own procedure** — "findings
   first, because a rewrite now would carry my guesses". Four runs out of four.
   The wording rules banned flourish in general and did not catch this shape.
4. **Placeholder detection needed a question asked first.** Counting the findings
   is free and catches the same thing earlier. More than about eight on a short
   item means it was never defined or holds more than one thing.

Re-run on #156 after the edits: it opened with the finding count, declared the
item a placeholder, refused to write acceptance criteria, named one blocking
finding out of twelve, asked one question, and produced the decided-so-far and
open-questions sections instead of an item. It also declined to ask about two
findings it judged the goal would settle, which the split enabled and nothing in
the skill teaches directly.

One difference that is not an improvement: the title-versus-goal mismatch came out
as `implementation-leak` where the previous run called it `conflict`. Both are
defensible readings.

The pass changed what #158 is. The item says "draft the boundary from the
ticket"; the input is in fact the output of `agent-work-item`. That is the first
`contradicted` finding this process has produced, and it moved the surface — one
draft acceptance criterion belonged to stage 1 rather than to the drafter and was
removed.

Findings against `human-work-item`, both fixed:

1. No verdict existed for an item asserting something that is not so. The six
   lenses cover absence, internal contradiction, ordering and implementation
   leak, but not an item wrong about its own subject. `contradicted` is now the
   highest verdict, with a required correction and a note on whether the
   correction changes what gets built. The six lenses are unchanged — this
   surfaces in step 4, not in the lens pass, because it needs knowledge from
   outside the item.
2. The skill guarded against implementation in the item and against the agent
   adding it, but not against a format arriving inside the human's own answer.
   The blocker format was accepted into a draft criterion for exactly that
   reason. Step 4 now says to take the behaviour out and confirm that.

Findings against this document, all fixed:

3. The chain diagram omitted a stage. `agent-work-item` does not produce the
   boundary in the target architecture; the drafter #158 delivers does. Today the
   skill spans both arrows by hand, which is why the omission survived two
   passes.
4. The fixture was described as fixed. It advances by design — each pass may
   write an improved item back to the issue, and that is the bootstrapping
   process rather than an accident.
5. The staleness check could not distinguish somebody else editing the issue from
   a deliberate advance. Generations are kept and matched.
6. The control item was described as a precaution. With the item under test no
   longer fixed, it is the only thing holding skill quality honest.

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
