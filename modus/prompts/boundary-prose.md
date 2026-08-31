# Boundary prose rules

Applies to the text fields of a boundary manifest: `statement`, `observation`,
`decision`, and the `interpretation` statements.

These fields are read by an agent deciding whether it has finished. A field that
reads well and cannot be evaluated leaves that agent unable to decide.
Duplicated here rather than borrowed from a sibling plugin, per constraint 1 in
the modus README.

## `decision`

A predicate. After making the observation, it is true or false, and two readers
get the same answer.

Banned, because none of them can be false. **The list is closed.** A word not on
it is not banned by this rule, and a checker reads exactly these:

```
usable reasonable appropriate sufficient adequate proper clean correct good
sensible robust generally typically mostly usually largely better faster
clearer simpler stronger
```

Two-word forms, matched as phrases:

```
"as needed"  "where appropriate"  "as applicable"  "and so on"
```

An earlier version of this list ended "and so on, etc.", which read as an open
list. A check against an open list returns no definite answer, so the rule could
not be run.

If a number decides it, the number goes in `quantity`, not in the prose.

## `observation`

Names what is done and by whom or by what. Repeatable: two people following it
feed the same input to the decision.

Not an observation: "review the output." That names no action and no observer.

## `statement`

Declarative. States a condition that holds when the work is done. Not an
activity, not an intention.

`obligation` already carries must or watch, so the word "should" never appears.

## All fields

One claim per field. If an `and` joins two things that could be separately true
or false, split the entry.

No metaphor, no analogy, no rhetorical emphasis.

## The author's tells

If the author is a language model, the following patterns are a signal, not just
a style problem. They appear when the model does not know the answer, or has
drifted off the goal and is producing well-shaped text in place of content.

- an aphorism, especially a two-part one with a semicolon or a comma pivot:
  "files are not a change surface; behaviour is"
- "not just X, but Y", and "X is not A. It is B."
- a short punchy sentence closing a section
- opening a reply by restating the reader's point as a revelation
- "the real question is", "the honest answer is", "what matters here is"
- three items in a list where two carry the content
- an em dash inserted for emphasis rather than for grammar
- a sentence explaining the importance of the document it is inside

Treatment: when one appears, do not just delete the phrase. Stop and establish
which of the two causes produced it. If the answer is not known, say so in the
field or leave the entry unwritten. If the work has drifted, return to the item.
Deleting the wording and keeping the sentence hides the signal and keeps the
defect.

Two of these were in this repository's first hand-authored boundary and in this
file, written by the model that wrote the rules above and not noticed until a
reader pointed at them.

## Length

Plain language is not the same as short. Text can be plain and still be padded,
so register and length are separate rules and both are enforced.

| Field | Cap |
| --- | --- |
| `statement` | 20 words |
| `observation` | 25 words |
| `decision` | 15 words |

Over the cap means the field is doing more than one job. Split the entry or cut
the restatement. Do not compress by deleting the threshold.

Nothing in a field explains *why*. Reasons go in a YAML comment or in the item.
An agent evaluating an obligation does not need the argument for it.

## Worked example

From this repository, the first hand-authored boundary. It passed the linter and
failed these rules.

Before:

```yaml
statement: >-
  a boundary drafted for a real modus issue is judged usable by someone who did
  not draft it, without being rewritten from scratch
decision: "the reviewer approves it, or names the specific entries needing change"
```

`judged usable` is an evaluative adjective. `from scratch` has no threshold.
`approves` is a state of mind. Nothing here can be false.

After:

```yaml
statement: >-
  a reviewer who did not draft the boundary names no entry whose decision they
  could not evaluate
observation: >-
  give the drafted boundary and the item text to a reviewer; ask it to list every
  entry whose decision it could not evaluate against the observation
decision: "the returned list is empty"
```

An empty list is checkable. A non-empty list names the entries to fix.

## What enforces what

A rule with no check is advice. Stated here so the difference is visible rather
than assumed.

| Rule | Enforced by |
| --- | --- |
| word caps | a script |
| banned words in `decision` | a script |
| one claim per field | a reviewer |
| `decision` is a predicate | a reviewer |
| `observation` names an actor | a reviewer |
| the author's tells | nobody |

"One claim per field" is not scriptable. Detecting a conjunction is easy and
wrong: `at least one of goal, problem, or a claim` is a single claim with a
disjunctive predicate, and a crude check would report it. Per constraint 2 in the
modus README, a check that produces false findings is dismissed and then not read
at all.

The tells are unenforced. That is a limit, not a claim that they do not matter.

## Check

Read each `decision` and ask: what would make this false? If the answer needs a
judgment call about quality, rewrite it.
