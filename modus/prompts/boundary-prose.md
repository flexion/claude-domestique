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

A closed list of banned words used to stand here — `usable`, `adequate`, `robust`
and twenty more — on the grounds that none of them can be false. It is gone,
because the list is a proxy for the rule and the rule works better unproxied.

The instance that removed it: a boundary whose decision read "the output is
acceptable". Genuinely unevaluable, exactly what the list existed to catch, and
**`acceptable` was not on the list.** Two review rounds caught it anyway, by asking
what would make it false. A list that misses the case a reader gets right is worse
than no list once anything enforces it, because it certifies the wording rather
than the predicate.

Ask the question instead. It is at the end of this file.

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
| word caps | nobody yet — `domestique-13n` |
| one claim per field | a reviewer |
| `decision` is a predicate | a reviewer |
| `observation` names an actor | a reviewer |

"One claim per field" is not scriptable. Detecting a conjunction is easy and
wrong: `at least one of goal, problem, or a claim` is a single claim with a
disjunctive predicate, and a crude check would report it. Per constraint 2 in the
modus README, a check that produces false findings is dismissed and then not read
at all.

The word caps are the one rule this table used to credit to a script that does not
exist. `domestique-13n` is open on it. Until then the row says so.

## Check

Read each `decision` and ask: what would make this false? If the answer needs a
judgment call about quality, rewrite it.
