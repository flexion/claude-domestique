# Expected output: #158 refined

**Content unresolved.** This file states the shape the output must take and the
questions that block its content. Passes 1 and 2 of the refinement loop fill it
in. See `docs/refinement-loop.md`.

Input: `input.json`, the GitHub API response for issue 158, captured
2026-09-01 against `updatedAt: 2026-08-29T19:52:17Z`. If a re-fetch differs, the
issue was edited and this fixture is stale.

## Shape

Markdown. Four parts, in this order.

```
# <title>

<the problem, and why now>

<what is wanted>

## Acceptance criteria

- <bullet>
- <bullet>

## Open questions

- <question> — <name of whoever answers it>
```

No boundary manifest, no YAML, no implementation. Those belong to
`agent-work-item`, which reads this file's eventual content as its input.

## What the content must satisfy

From `human-work-item` step 6, the handoff gate. `agent-work-item` cannot invent
any of these:

- a goal stating what is true when the work is done
- the problem, and why now
- a number wherever the raw item said scale, sprint, or patience
- what must keep working
- what is out of scope
- a name against every open question

From the acceptance-criteria test: each bullet, applied to a case #158 never
described, yields a yes or no without asking anyone. About five bullets. Past
that, #158 holds more than one goal and the split gets proposed.

## What blocks the content

Findings against the raw item, highest verdict first. The first one has to be
answered by a person before any content can be written.

**conflict — `description#2`** — the Problem line names human patience as the
binding constraint. The Goal line keeps a human approving every item before it
freezes, which keeps a per-item patience cost. Three readings were put to the
author and none is chosen yet:

1. Every item still gets a human approval; the saving is that reading a draft is
   faster than writing one.
2. Only items the drafter could not settle reach a human; everything else freezes
   without one.
3. One approval covers a batch of drafted boundaries, not one item.

**missing-goal — `description#2`** — "draft the boundary from the ticket" names
an activity, not a condition. A drafter that reformats the ticket into the
manifest schema satisfies it.

**logic-problem — `description#2`** — no outcome defined for a human who does not
approve.

**logic-problem — whole item** — the input is "the ticket", and the item permits
a ticket with no stated goal or two requirements in conflict. No outcome defined
for that case. This is the requirement #158 omits and `human-work-item` exists to
supply.

**untestable-criterion — title and `description#1`** — "doesn't scale", "Fine for
a couple, not for a sprint". No count, no time per item, no measure separating
today from done.

**missing-requirement — `description#2`** — "approves" undefined: what the human
is shown, what they decide, what a rejection produces.

**missing-requirement — whole item** — nothing states what must keep working. A
drafter touches the linter, the manifest schema, and the boundaries already
frozen.

**missing-requirement — whole item** — nothing states what is out of scope.

No implementation leak. The raw item names no technology, no mechanism, and no
file.

## A hazard for stage 2

`body` splits into two paragraphs on the blank line, so the addressable parts are
`description#1` and `description#2`. The Problem sentence and the Goal sentence
are both inside `description#2`, separated by a single newline.

A citation to `description#2` therefore cannot distinguish the problem from the
goal, and four of the findings above land on that one id. Bead `domestique-3lf`
is open on this: addressable-part granularity collapses on a short work item.
Expect it to bite when `agent-work-item` writes `support` entries.
