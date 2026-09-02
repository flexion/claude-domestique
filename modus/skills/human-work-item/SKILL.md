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
| missing | Requirements implied but never written down. Five are absent more often than present, so check each by name: what must keep working, what is out of scope, what happens when it fails, a number wherever a requirement depends on one, and any term the reader would have to look up |
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

Where it is uses the item's own labels if it has them: `Problem`, `Goal`, `AC4`.
Otherwise its structure: the title, paragraph 3, the last sentence of the
description, comment 4. Quote the words when two sentences are in conflict.

The defect states what is wrong, not how it reads. "Names two different
outcomes", not "is unclear".

One defect per finding, and the test is the answer rather than the sentence: if
resolving it would take two answers, it is two findings. A finding reading "the
job can fail, it can be started twice, and the data can change underneath it"
names three undefined cases and takes three answers. Split it before asking.

Give each finding one verdict. Where several apply, report the highest only:

```
contradicted > conflict > missing-goal > logic-problem >
untestable-criterion > missing-requirement > implementation-leak
```

A contradicted claim makes the item's own text unreliable, so everything read
from it is suspect until the claim is corrected. A conflict makes everything
below it undecidable. A missing goal makes the rest unjudgeable.

**Then split them, and say which is which before asking anything.**

| | |
| --- | --- |
| blocking | `contradicted`, `conflict`, a missing goal. The item cannot be written until these are answered. |
| not blocking | everything else. Recorded, not asked. |

**Not blocking means recorded.** Put it in Open Questions with a name against it
and write the item. Ask a non-blocking question only where the answer would change
what a criterion says — and then ask that one, not the eight around it.

The default matters more than the split. A run that triages nine findings down to
one blocking and then offers to take the other eight "one at a time" has moved the
queue, not shortened it. A recorded gap is a finished part of the item, and a
person answers better against a written item than against a list of abstractions.

`contradicted` is the item asserting something that is not so. It rarely appears
in the lens pass, because the lenses read the item and this needs knowledge from
outside it. It usually appears in step 4, when the human's answer contradicts
what the item says.

A contradicted finding needs two more things than the others: a correction
stating what is actually the case, and whether the correction changes what gets
built. When it does, stop — the item is about something other than what it
says, and that is a decision rather than a rewrite.

**4. Resolve one blocking finding with the human, then the next.** Never batch.
Five questions in one message get one answer, about the easiest one.

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

**And everything settled has to be visible in it.** A decision that changes how a
sentence should be read goes into the text, not just into your working. That
covers a reclassification, a scope call, and every inference you drew instead of
asking.

Applying a decision without writing it down leaves the next reader to derive it
again, and they may derive it differently. Two real cases from this item: a
sentence reclassified from requirement to motivation, which a later reader found
again as an untestable criterion because the item never said which it was; and an
inference that consent is asked once per item, carried by the single word "again",
which a later reader read as a contradiction between two criteria.

Label every separately falsifiable claim so the agent stage can cite one:
`Problem`, `Goal`, then `AC1`, `AC2`, one per criterion. Put a blank line between
them so each stands on its own.

Unlabelled, the agent stage falls back to citing paragraph numbers — and a bullet
list is one paragraph, so seven criteria collapse into a single citation meaning
"somewhere in the seven". Labels also survive editing; a paragraph index does
not.

**6. Check it carries enough for the next stage.** `agent-work-item` prepares the
same item for an autonomous agent. It needs things it cannot invent:

- a goal stating what is true when the work is done
- the problem, and why now
- a number wherever a requirement depends on one; a sentence that only motivates
  the work needs none
- what must keep working, not only what must change
- what is out of scope
- a name against every open question
- no two criteria that need an unstated fact to reconcile

Anything missing is a finding. Take it back through step 4. Do not write the
agent's artifact here — different skill, different structure.

The last one exists because this list and the agent stage's own gate were not the
same test. An item passed this check and was then refused there, over two criteria
that only agree if you already know something the item never says. Whatever you
settled in step 4 has to be readable off the page, or the next stage either stops
or invents it.

**7. Run the six lenses again over the rewrite.** A rewrite creates new gaps: a
requirement you changed in step 5 can leave a criterion that no longer matches
it. This is a full second pass, not a re-read for typos.

**Read it as someone who was not in the conversation.** You know what you meant,
which is exactly what disqualifies you from reading it. An inference you drew is
not in the text unless you wrote it there, and a conflict you settled in your head
is still a conflict on the page.

The `conflict` lens is where this bites. Two criteria on a real item read as
agreeing only if you already knew the decision behind them; the author re-read
them and saw agreement, and the next stage saw a contradiction and stopped.

**8. Show the rewritten item and wait for approval.** Approval gates the record —
the tracker, the repository, any commit. It does not gate your working notes. Keep
a local draft per attempt, including the ones that were rejected; a later reader
can only see what changed by reading them side by side.

**9. Write the run out where it can be re-read.** If a `docs/passes/` directory
exists, find the highest-numbered `passN` inside it and write your findings and
the item you were given there. Elsewhere, do nothing — the directory belongs to
the repository you are in, not to this skill.

## When it is done

Not when you run out of findings. Done is when a fresh reader can say all five of
these, and has no blocking question left:

- what the item wants
- what would make it done
- what must keep working
- what is out of scope
- what is still unanswered, and who answers it

Questions about how or where to build it do not block.

Stop at the first version that passes. Structure added past that point is cost
with no return.

An unanswered finding that was not blocking does not hold this open. A recorded
gap with a name against it is a finished part of the item, not an unfinished one.

## Placeholder items

Some items are not underspecified. They are undefined. The item hints at the
thing to be done and the basic definition has never happened. Calling that
refinement is a euphemism — there is nothing to refine yet, and the work is to
define.

This is common. Treat it as a normal state, not an exception.

**How you know.** Two signals. Neither is a judgment about quality.

**Count the findings.** More than about eight on a short item means it was never
defined, or it holds more than one thing. Say which before you start asking. This
one is free — it needs no question put to anyone.

**Read the answer.** A finding whose verdict was `conflict` or `missing-goal`
came back "it has not been decided" rather than "it is not written down". The goal
or the measure of done is undecided.

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
- No sentence explaining what you are about to do or why it is ordered that way.
  "Findings first, because a rewrite now would carry my guesses" is that sentence.
  Write the findings.
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
| "These eight are quick, I will just ask them" | Recorded is the default. Ask only where the answer changes what a criterion says. |
| "I inferred it and said so, that is enough" | You said it to one person once. The item is what the next reader has. Write it in. |
| "Nine bullets, but each one is needed" | Past about five, say the item holds more than one goal. |
| "The reader will understand 'not left waiting indefinitely'" | Two readers get two answers. The bullet fails the test. |

## Red flags

Stop if you are about to write, or have written:

- a rewrite, before a single finding was answered
- "assuming", or "I have taken the second reading"
- more than one question in one message
- a finding that would take two answers to resolve
- a sentence explaining your procedure, ahead of the findings
- an offer to take the remaining findings one at a time
- a decision you applied without writing it into the item
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
