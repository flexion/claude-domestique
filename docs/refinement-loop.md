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

        ^                             |
        |_____ blockers on the item __|
              agent-work-item refuses
```

The back edge is the part that took eight passes to find. Some gaps in a human
item are only visible when something downstream tries to derive obligations from
it and finds it cannot — you do not know what you need until you need it. So the
chain is not one-way: `agent-work-item`'s gate writes one blocker per missing
thing onto the item, and `human-work-item` has a mode for an item that arrives
that way, which resolves what the blockers name and nothing else.

That is the same mechanism #158 specifies for the drafter it describes. The
process building it gets what it is building.

It terminates on a rule rather than on patience: a condition that fails the gate
twice means the answer did not land, and that is a conversation with a person
rather than another lap.

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
worked against is now only in `docs/passes/pass1/item.json`.

The GitHub issue is the item of record. Beads are derivative — `domestique-3z5`
covers the same goal, and where the two disagree the issue wins. A reader outside
this repository can see the issue; bead ids are hash-suffixed and mean nothing to
them.

### Where the item lives

`docs/passes/passN/item.json` is the GitHub API response as fetched at the start
of pass N, stored verbatim rather than as pasted text. `agent-work-item` step 1
warns that a tracker's UI and its API can return different content for the same
item, and bead `domestique-2no` is open on it, so the fixture is what an adapter
actually receives.

The item advances by design. A pass may write an improved item back to the issue,
and the next pass fetches it again — so the item converges alongside the skills.
This is the bootstrapping period and several changes are expected before the
drafter exists.

There is one number, the pass number. An earlier version of this document kept a
separate generation count and the two did not line up: generations 1 and 2 both
came out of pass 3. The historical files are under `docs/passes/pass1/` and
`docs/passes/pass3/`, which is where they belong.

**There is no separate record of what was decided, deliberately.** One existed and
was deleted: it went stale within two passes, listed generation files that had
moved, claimed the item was at a fixed point after that was falsified, and
recorded a split at a seam two later passes disagreed with. Pass 8's boundary then
cited it as support for a claim marked `stated`, so a stale note supplied
provenance for a decision nobody had made.

The item is the record. `human-work-item` step 5 requires everything settled to be
visible in the item's own text, which makes a second copy redundant by
construction — and a second copy of a decision is a second copy that can drift.
Where a decision needs its reasoning kept, that goes in the pass notes, which are
dated and never claim to be current.

**An item is never at a fixed point while the skills are still changing.** What
converges is the pair, not the item. A better skill finds more on the same text,
so more findings after a skill edit is the expected result and is evidence the
edit worked.

An earlier version of this document said the opposite — that a pass over an
unchanged item should find nothing. Pass 7 found nine findings on the text passes
4 to 6 had run against, because passes 4 and 5 had improved `human-work-item` in
between. The claim was wrong in its polarity: finding nothing is the exception.

## How a pass runs

Every pass writes into its own directory, so a pass can be re-read after the fact
and compared with the one before it.

```
docs/passes/passN/
  item.json          the issue as fetched at the start of the pass
  stage1-*.txt       what human-work-item said about it
  stage2-*.txt       what agent-work-item said about it
  boundary.yaml      the boundary, where stage 2 produced one
  stage2-review.md   what step 8 found
  notes.md           this session's evaluation of the pass
```

Both skills write there themselves, conditional on the directory existing. The
path is this repository's and not part of either plugin, so outside a checkout
with `docs/passes/` the instruction is inert.

**1. Make the directory and fetch the item.**

```bash
N=7; mkdir -p docs/passes/pass$N
gh issue view 158 --json number,url,title,state,body,labels,comments,author,createdAt,updatedAt \
  | python3 -m json.tool > docs/passes/pass$N/item.json
```

The fetched item is the pass's input. There is no separate generation numbering —
one number, the pass number, and `docs/passes/passN/item.json` is what pass N ran
against.

**2. Stage 1 — `human-work-item`. A check, not a gate.**

```bash
node scripts/probe-skill.js --plugin modus --expect modus:human-work-item \
  --prompt "$(...)" --full > docs/passes/pass$N/stage1-human-work-item.txt
```

It reports whether the current item still generates findings, and which of them
block. The pass continues either way. Runs in the neutral temporary directory,
because stage 1 reads the item and nothing else.

The probe is one-shot and `human-work-item` stops after one question, so a probe
run reaches its findings and its first question and no further. As a check that
does not matter. It cannot complete a refinement, so do not plan a pass that
expects it to.

**3. Stage 2 — `agent-work-item`. This one gates.**

```bash
node scripts/probe-skill.js --plugin modus --expect modus:agent-work-item \
  --cwd "$(pwd)" --prompt "$(...)" --full > docs/passes/pass$N/stage2-agent-work-item.txt
```

`--cwd` is required. Step 2 of that skill reads the repository to find what the
item does not say, and the probe's default temporary directory has nothing in it.

No boundary can be produced without complete criteria from this stage, so this is
where a pass stops. Its own step 1b refuses an item missing an outcome, a
falsifiable criterion per obligation, what must keep working, or what is out of
scope — and says which is absent rather than drafting a partial boundary.

**3b. Route every stage-1 finding.** Stage 1 does not gate, and that is not the
same as its output being advisory. Each finding goes to exactly one place, by the
attribution rule below:

| | |
| --- | --- |
| the item is wrong or incomplete | fix the item, and the next pass fetches it |
| the skill missed it before and finds it now | nothing to fix — the skill edit worked |
| the skill should have found it and did not | fix the skill |
| nobody has decided it | record it, with a name against it |

A finding left in a transcript is a finding nobody acts on. Pass 7 produced nine
and this step did not exist, so all nine sat in a file.

**4. Evaluate the pass.** Read all of it and look for what is missing. Write the
result to `notes.md` in the pass directory, and add a row to the pass record at
the end of this document. This step is a person and a session, not a script.

## The assessment

One check, and it is the one `agent-work-item`'s own review questions do not ask.

**Does the boundary name what the item does not.** The value is in the consumer,
the constant, or the missing test the item never mentions. A boundary that
restates the item in manifest form lints clean and saves nobody anything. This is
AC-9 in `boundary/agent-work-item-skill.yaml`.

Two other checks used to live here — whether a fresh reader can state what must be
true, and whether every `decision` can be false. Both are already in the skill, as
step 9 and as one of step 8's five questions, so they were a second copy that could
drift. Run the skill's steps and read what step 8 returned.

They were also declared to "run every pass", which was never true of any pass:
passes 1 to 5 never reached stage 2, and pass 6 was the first to produce a
boundary at all.

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

## Proposed and unresolved

Proposals a pass makes and nobody has settled. Without this they are re-proposed
from scratch every pass, and the fact that they keep coming back is lost.

| Proposal | Raised | State |
| --- | --- | --- |
| split #158 in two | pass 6 along AC3/AC4, pass 7 along AC6/AC7 | unresolved. Two passes proposed different lines, which is itself evidence the item holds more than one goal and that nobody can say where the seam is |
| make #156 the control item | pass 4 | unresolved. The synthetic export ticket is compromised for two behaviours after pass 4 drove edits from it |
| reduce the two human touchpoints | pass 3 | deferred by decision, blocked on measuring what review costs |

A proposal that recurs with a different shape each time is not the same proposal
twice. It is a signal that the question is wrong, or that the item is too broad to
answer it.

## When the loop stops

Three conditions, and the third is the one that makes the other two mean
anything:

- The boundary names what the item does not.
- The control item did not degrade.
- **Neither the skills nor the item changed since the previous pass, and stage 1
  still finds nothing new.**

The third condition is why reaching a fixed point takes a deliberate act. While
skills keep improving, each pass finds more on the same item, and "more findings"
is indistinguishable from "the item got worse" if nothing was held still. Ending
the loop means choosing one pass in which nothing is edited, and seeing what a
frozen pair finds.

An earlier version required "no change to either skill", which no pass can satisfy
while the loop is doing its job — the loop's whole design is that skills improve
every pass.

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
| 6 | 7 | `agent-work-item` 1, `lint-boundary.js` 1, the draft 5 | not re-run |

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

#158 is defined and awaiting approval. Approval writes it to the issue, which is
the only place it is recorded.

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

### Pass 6

**Stage 2 ran for the first time.** `docs/passes/pass6/boundary.yaml`, fourteen
entries, derived from generation 2. Both lint forms clean: failures empty,
warnings `W_NO_FLOOR` only, exempt zero.

Stage 1 passed with one non-blocking finding — AC1 says "a person is asked" and
never says which person.

**The item rewrite had silently invalidated the existing boundary.**
`boundary/gh-158.yaml` was authored in an earlier session against generation 0 and
cites `description#1`, `#2` and `#3`. After the rewrite all three resolve to
nothing. It is superseded rather than edited, and kept.

Worse than the citations: six of the item's seven criteria had no obligation in it
at all, and five of its nine entries are about a prompt template with double-brace
placeholders that the item never mentions. It was derived from a placeholder, so
its obligations were invented against a chosen design — which is exactly what
`human-work-item` now forbids:

> A placeholder does not go to the agent stage. That stage derives obligations
> from the goal, and given an undecided goal it will invent them.

That rule was written in pass 1 from reasoning. This is the same failure already
committed to the repository before the rule existed.

Findings:

1. **`agent-work-item` step 1 is ambiguous about "paragraph".** The earlier author
   counted lines, so `description#3` meant the Goal line; counting blank-line
   blocks, generation 0 had only two parts and `description#3` named nothing. Two
   readers, two answers, one sentence. Bead `domestique-3lf`.
2. **`lint-boundary.js` prints `ok` while checks are exempt.** The CLI reported
   `ok` on a boundary with three dead citations, and printed no exempt count. The
   skill warns about this and the CLI's own output does not, which is modus README
   constraint 2 inside modus's own linter: a check that could not run reporting
   green. The fix belongs in the CLI, not in the skill.

Five findings against the draft, all from step 8 and none catchable by the linter:

3. `W-1`'s decision could not be evaluated against its own observation — the
   observation collects a population across every item and the decision named one
   boundary, with `quantitative: false` foreclosing a threshold. The same shape as
   bead `domestique-dpi`.
4. `PRES-1` demanded the two step lists be equal where AC6 states a subset, so it
   also failed a hand-written boundary needing fewer steps — a case the item
   permits.
5. AC4's "can be resolved without resolving the others" had no entry. `AC-8`
   resolves every blocker at once and passes even where resolution is
   order-dependent. Added as `AC-10`.
6. AC1's "a person is asked" had no entry. `AC-3` shows only that nothing is
   drafted while nothing is answered, which a drafter that never asks anyone also
   satisfies. Added as `AC-11`.
7. `PRES-1`'s statement stated the containment in the opposite direction from its
   own decision. Caught on the second review round.

Two review rounds were needed, and the first found four defects in a boundary that
had already passed both lint forms. That is the case for step 8 existing: linting
is necessary and measures nothing about whether the boundary decides anything.

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

**A refinement needs a person, a check does not.** The probe cannot complete
stage 1 — see step 2 of the procedure. Where the item actually has to be rewritten
and re-approved, that is an interactive session with somebody answering, not a
probe run.

**The probe declares its environment; it does not inherit one.** Pass 7's stage 2
hung past nineteen minutes with 25 seconds of CPU, asleep on a socket. The cause
was not the skill: the run had inherited `~/.claude` and booted `n8n-mcp`,
`@azure/mcp` and `chrome-devtools-mcp`, two of which resolve `@latest` from the
npm registry every run. `--strict-mcp-config` was added and the same run finished
in four minutes.

That was a wrong diagnosis before it was a right one. The hang was first written
down here as the agent over-reading the repository, and `agent-work-item` step 2
was bounded on that reasoning. The bound may still be worth having; the evidence
offered for it was not evidence.

**A `--cwd` run needs a clean tree.** Permissions are open, because
`agent-work-item` step 7 lints a boundary file and a skill cannot lint a file it
was not allowed to write — under inherited permissions a run got twelve Bash calls
through and had Write denied. Git is what protects the tree, so `probe-skill.js`
refuses to start a `--cwd` run against uncommitted work and exits 2.

**One run is weak evidence.** The probe does one run and no repetition. Two
passes disagreeing about the same defect is expected noise, not a finding about
either skill.
