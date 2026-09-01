---
name: human-work-item
description: >-
  Use when an existing work item, ticket, story, or bug is vague,
  self-contradictory, or has no acceptance criteria, and a person needs it
  rewritten for another person to read. Also use when asked to tighten an item's
  wording, clean up a ticket, work out what an item is actually asking for, or
  write acceptance criteria a reader can check without asking anyone.
argument-hint: [work item text, file path, or issue id]
---

# human-work-item

Rewrite one existing work item so a person can read it, and give it acceptance
criteria a person can check. Scope is the WHAT. Never add implementation.

Some items cannot be rewritten, because they were never defined. Name those as
placeholders and record what is undecided — see Placeholder items.

Findings, then resolution, then the rewrite. In that order. A rewrite written
before the findings are settled carries your guesses, and the human then reviews
your guesses instead of answering your questions.

## Procedure

**1. Read the item once, for intent.** All of it: title, description, comments,
any acceptance-criteria field. Given an id or a path, fetch the whole item rather
than working from what someone pasted. A tracker's UI and its API can return
different content for the same item.

**2. Read it again, once per lens.** One lens at a time, looking only for that
lens's problem.

| Lens | Look for |
| --- | --- |
| goal | Is the outcome stated? What is true when this is done? |
| problem | Is it stated why this is needed, and why now? |
| missing | Requirements implied but never written down |
| logic | Steps that cannot happen in the stated order. States the item allows but does not handle. Cases with no defined outcome. |
| conflict | Two statements that cannot both be satisfied |
| how-not-what | Implementation prescribed where behaviour belongs |

Six passes, not one pass with six things in mind. One pass finds the loudest
defect and stops there.

**3. Write the findings.** One finding per defect, each in three parts and in
this order:

```
<verdict> — <where it is in the item> — <the defect>
```

Where it is uses the item's own structure: the title, paragraph 3, the last
sentence of the description, comment 4. Quote the words when two sentences are in
conflict.

The defect states what is wrong, not how it reads. "Names two different
outcomes", not "is unclear". One defect per finding — two defects in one line
cannot be answered with one answer.

Give each finding one verdict. Where several apply, report the highest only:

```
contradicted > conflict > missing-goal > logic-problem >
untestable-criterion > missing-requirement > implementation-leak
```

A contradicted claim makes the item's own text unreliable, so everything read
from it is suspect until the claim is corrected. A conflict makes everything
below it undecidable. A missing goal makes the rest unjudgeable.

`contradicted` is the item asserting something that is not so. It rarely appears
in the lens pass, because the lenses read the item and this needs knowledge from
outside it. It usually appears in step 4, when the human's answer contradicts
what the item says.

A contradicted finding needs two more things than the others: a correction
stating what is actually the case, and whether the correction changes what gets
built. When it does, stop — the item is about something other than what it
says, and that is a decision rather than a rewrite.

**4. Resolve one finding with the human, then the next.** Never batch. Five
questions in one message get one answer, about the easiest one.

The form depends on what the item did.

**The item said two things, or one thing two ways** — a conflict or an
ambiguity. Give 2-4 readings. Mutually exclusive. One sentence each. Plain
enough to choose from on a phone without reading your analysis.

- Two readings that would read the same are one reading. Merge them.
- Five or more readings means the item is too broad. Say so and propose
  splitting it. Do not offer five choices.

**The item said nothing** — a missing requirement, a missing goal, or a case with
no defined outcome. State what is absent and ask for it. Do not offer candidate
answers. A list you invented is your guess, and the human picking from it makes
the guess theirs.

Never fill a gap by guessing, and a stated assumption is still a guess. If the
human does not know, put the question in an Open Questions list with the name of
whoever answers it and what would settle it. An invented answer is worse than a
recorded gap.

Two answers sound alike and are not. "It is not written down" is a gap you close
here. "It has not been decided" is not a gap at all — see Placeholder items.

An answer may arrive with a format, a syntax, or a mechanism inside it. People
describe how they picture a thing, and that is useful. It is still not the
requirement. Take the behaviour out of it, say what you took, and confirm that.
Putting the picture in the item makes it a requirement nobody chose.

**5. Rewrite.** Title, the problem, what is wanted, then the acceptance criteria.
Nothing in it that the human did not settle. Nothing about how to build it.

**6. Check it carries enough for the next stage.** `agent-work-item` prepares the
same item for an autonomous agent. It needs things it cannot invent:

- a goal stating what is true when the work is done
- the problem, and why now
- a number wherever a requirement depends on one; a sentence that only motivates
  the work needs none
- what must keep working, not only what must change
- what is out of scope
- a name against every open question

Anything missing is a finding. Take it back through step 4. Do not write the
agent's artifact here — different skill, different structure.

**7. Run the six lenses again over the rewrite.** A rewrite creates new gaps: a
requirement you changed in step 5 can leave a criterion that no longer matches
it. This is a full second pass, not a re-read for typos.

**8. Show the rewritten item and wait for approval.** Approval gates the record —
the tracker, the repository, any commit. It does not gate your working notes. Keep
a local draft per attempt, including the ones that were rejected; a later reader
can only see what changed by reading them side by side.

## Placeholder items

Some items are not underspecified. They are undefined. The item hints at the
thing to be done and the basic definition has never happened. Calling that
refinement is a euphemism — there is nothing to refine yet, and the work is to
define.

This is common. Treat it as a normal state, not an exception.

**How you know.** Not a judgment about quality. You asked, and the answer came
back "it has not been decided" rather than "it is not written down", on a finding
whose verdict was `conflict` or `missing-goal`. The goal or the measure of done
is undecided.

**What changes:**

- Say so before going further. Do not present the output as a refined item.
- Stop walking lenses for polish. An item whose goal is undecided cannot be
  judged by the remaining lenses, and findings against it are noise.
- Write no acceptance criteria. Criteria for an undecided goal are invented, and
  they will read as agreed.
- The five-bullet guidance does not apply. There is nothing to count.

**What you still produce.** What is decided, written plainly. What is not, as
open questions with a name and a route to an answer against each. That is a
placeholder made honest, and it is worth more than an item that reads as defined.

A placeholder does not go to the agent stage. That stage derives obligations from
the goal, and given an undecided goal it will invent them.

### Unblocking a placeholder

An undecided question often needs evidence nobody has. Waiting for it is one
option and usually the wrong one. Do not answer the question. **Change the item
until the question stops deciding anything.**

Three moves. Try them in this order.

**1. Move the decision out of the item.** Keep the conservative option in scope
and make the change a separate item, blocked on the evidence. Prefer the
reversible direction: removing a control later is cheaper than restoring one that
was removed too early.

**2. Separate motivation from requirement.** A sentence that reads like a
requirement is often the reason for the work, not a condition of done. Motivation
needs no number. Ask whether the work would be finished with that sentence
unmeasured — if yes, it was never a requirement.

**3. Replace the unmeasurable measure with an observable one.** Ask what a person
would have to do differently if the work succeeded, and measure that instead.

Each move is a scope decision, so each one is the human's to make and none of
them can be derived from evidence. That is what makes them available while the
original question is not.

Check any replacement measure against the prose rules before offering it.
"Judged usable" is an evaluative adjective and "without being rewritten from
scratch" has no threshold; `../../prompts/boundary-prose.md` has the worked
example of both being rejected.

If none of the three moves works, the item stays blocked. Say so plainly.

## Acceptance criteria

Bullets. Each one must pass a single test: take a case the item has never
described. Can a reader apply the bullet to that case and get a yes or no,
without asking anyone?

A bullet needing a judgment call fails. It passes only when three or more
examples are given that span the boundary. One example is not enough.

| | |
| --- | --- |
| Bad | Search box appears in the header with a submit button |
| Good | User can find a case by its case number |

The bad one describes a screen, and a box that searches nothing satisfies it.

Three forms fail the test every time, because none of them can be false:

| Form | Example |
| --- | --- |
| a state of mind | "the reviewer approves it", "the user is happy with" |
| an evaluative adjective | "usable", "clean", "correct", "sensible" |
| a comparison with no threshold | "from scratch", "significantly faster" |

Replace them with something countable. "The reviewer approves it" becomes "the
reviewer names no entry they had to write themselves" — an empty list is
checkable, and a non-empty one names the remaining work.

`../../prompts/boundary-prose.md` carries the closed list of banned words and a
worked example of each of these being rejected.

Past about five bullets, the item probably holds more than one goal. Say so and
propose the split.

## Wording

Applies to everything written back.

Write as a person writes. Short sentences. Say the thing and stop.

- No opening or closing flourish, on any sentence or any paragraph.
- No "it is worth noting", no "in order to ensure".
- No summarising restatement at the end of a section.
- No metaphor, no analogy, no idiom. The reader may not be a native English
  speaker.
- No term the reader would have to look up. Where a term from the agent stage is
  needed, explain it in the sentence that uses it.
- Enough detail for a person to understand and act. No more.

`../../prompts/boundary-prose.md` lists the author's tells: patterns a language
model produces when it does not know the answer or has drifted off the goal.
Those apply here. Its word caps and banned-word list do not — they govern a
machine-read artifact.

## Rationalizations

Each of these came out of a real run on a contradictory ticket.

| Excuse | Reality |
| --- | --- |
| "I will write it against the likelier reading and flag it" | The flag gets skimmed and the reading ships. Ask instead. |
| "Stating my assumption is honest" | An assumption in the rewrite is a guess with a label. It is not resolution. |
| "One question at a time wastes the human's time" | Five questions get one answer, about the easiest one. |
| "The contradiction is obvious, one side is clearly right" | Two people wrote those two sentences. You do not know which is the current decision. |
| "It is three items, so I will write three items" | Propose the split. Wait for the answer. |
| "Naming the cache key is being helpful" | It is the design. Scope is the WHAT. |
| "A rewrite is easier to react to than a list of questions" | It is easier to approve without answering. |
| "Options are easier for the human than an open question" | Where the item said nothing, the options are your guesses. The human picks one and it becomes theirs. |
| "The goal is undecided, but I can write criteria against the likely one" | Criteria for an undecided goal read as agreed. Record the question instead. |
| "The human gave me the format, so it belongs in the item" | They described how they picture it. The requirement is the behaviour underneath. Confirm that instead. |
| "Nine bullets, but each one is needed" | Past about five, say the item holds more than one goal. |
| "The reader will understand 'not left waiting indefinitely'" | Two readers get two answers. The bullet fails the test. |

## Red flags

Stop if you are about to write, or have written:

- a rewrite, before a single finding was answered
- "assuming", or "I have taken the second reading"
- more than one question in one message
- a second or third item the human did not ask for
- a list of candidate answers, for a finding where the item said nothing
- a technology name, a data structure, or an API in the rewrite, or in a question
- a format, a file layout, or a syntax in the item, because the human supplied it
- acceptance criteria, when the goal came back undecided
- an acceptance bullet describing a screen, a button, a field, or a column
- "it is worth noting", "the real question is", "this is the key point"

## Out of scope

- Creating a work item where none exists. A placeholder issue is not nothing;
  see Placeholder items.
- Estimating, sizing, prioritising, or assigning.
- Deciding how to build it.
- Splitting the item. Propose it; the human splits.
- Filing it, updating a tracker, or committing.
