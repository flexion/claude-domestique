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
conflict > missing-goal > logic-problem > untestable-criterion >
missing-requirement > implementation-leak
```

A conflict makes everything below it undecidable, and a missing goal makes the
rest unjudgeable.

**4. Resolve one finding with the human, then the next.** Never batch. Five
questions in one message get one answer, about the easiest one.

For a conflict or an ambiguity, give 2-4 readings. Mutually exclusive. One
sentence each. Plain enough to choose from on a phone without reading your
analysis.

- Two readings that would read the same are one reading. Merge them.
- Five or more readings means the item is too broad. Say so and propose
  splitting it. Do not offer five choices.

Never fill a gap by guessing, and a stated assumption is still a guess. If the
human does not know, put the question in an Open Questions list with the name of
whoever answers it. An invented answer is worse than a recorded gap.

**5. Rewrite.** Title, the problem, what is wanted, then the acceptance criteria.
Nothing in it that the human did not settle. Nothing about how to build it.

**6. Check it carries enough for the next stage.** `agent-work-item` prepares the
same item for an autonomous agent. It needs things it cannot invent:

- a goal stating what is true when the work is done
- the problem, and why now
- a number wherever the item says fast, slow, large, or soon
- what must keep working, not only what must change
- what is out of scope
- a name against every open question

Anything missing is a finding. Take it back through step 4. Do not write the
agent's artifact here — different skill, different structure.

**7. Run the six lenses again over the rewrite.** A rewrite creates new gaps: a
requirement you changed in step 5 can leave a criterion that no longer matches
it. This is a full second pass, not a re-read for typos.

**8. Show the rewritten item and wait for approval.**

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
| "Nine bullets, but each one is needed" | Past about five, say the item holds more than one goal. |
| "The reader will understand 'not left waiting indefinitely'" | Two readers get two answers. The bullet fails the test. |

## Red flags

Stop if you are about to write, or have written:

- a rewrite, before a single finding was answered
- "assuming", or "I have taken the second reading"
- more than one question in one message
- a second or third item the human did not ask for
- a technology name, a data structure, or an API in the rewrite
- an acceptance bullet describing a screen, a button, a field, or a column
- "it is worth noting", "the real question is", "this is the key point"

## Out of scope

- Creating a work item from nothing. This skill needs an existing one.
- Estimating, sizing, prioritising, or assigning.
- Deciding how to build it.
- Splitting the item. Propose it; the human splits.
- Filing it, updating a tracker, or committing.
