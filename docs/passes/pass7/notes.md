# Pass 7

First pass to run through `docs/passes/`. The directory scheme, and both skills
writing into it, were built during this pass.

## What ran

| | |
| --- | --- |
| `item.json` | fetched at the start. Identical to pass 3's — the issue had not changed |
| `stage1-human-work-item.txt` | ran. Nine findings, one blocking |
| `stage2-agent-work-item.txt` | **did not return.** Ran past nineteen minutes with the process still alive and no output. Not committed, because an empty file reads as a run that produced nothing rather than one that never finished |
| `control-item.txt` | ran after the stage-1 fixes, to check they generalise |

## Stage 1 falsified a claim in the loop document

The document said the item was at a fixed point and a pass over it should find
nothing. It found nine. Passes 4 and 5 had improved `human-work-item` in between,
so the better skill found what the older one missed.

The claim was wrong in its polarity, not in its detail: while the skills are still
changing, more findings is the expected result and is evidence the edit worked. An
item is never at a fixed point until the pair stops moving. The stopping rule was
rewritten around that, and now requires a pass in which nothing at all was edited.

## Stage 2 did not return, and that is a finding

`agent-work-item` step 2 — "read what the item names" — had no bound. Run with
`--cwd` at the repository root it is a search with no floor, and it did not
terminate inside twenty minutes.

Step 2 now says to read the things the item names and the direct consumers of
those, and to stop when every named thing has been read once. That fix is
untested: the run that exposed the problem predates it.

## Findings and where they went

Routed by the attribution rule. Three to `human-work-item`, four to
`agent-work-item`, six to the loop document, two to the item.

`human-work-item`:

1. Triage cut nine findings to one blocking and then offered to take the other
   eight one at a time. The split had no default, so the queue moved rather than
   shortened. Not blocking now means recorded, and a non-blocking question is
   asked only where the answer changes what a criterion says.
2. Two decisions made during resolution never reached the item: a sentence
   reclassified from requirement to motivation, and an inference that consent is
   asked once per item. A later reader found both again, the second as a
   contradiction. Step 5 now requires everything settled to be visible in the
   text.
3. No lens named unexplained vocabulary. "Boundary", "refined criteria" and
   "freezes" are undefined in an item whose purpose is that a person can read it.
   The `missing` lens now names five things to check rather than four.

`agent-work-item`:

4. No coverage check. Nothing said every criterion must map to an entry. This is
   the failure that has actually happened: six of seven uncovered in
   `boundary/gh-158.yaml`, two of seven in `docs/passes/pass6/boundary.yaml`, and
   a reviewer caught it both times. New step 5b.
5. The gate checked that four things were present and not whether they agreed.
   Stage 1 found a conflict between AC1 and AC5 in an item holding all four, so
   the gate would have passed it. A fifth condition was added.
6. Step 2 unbounded — above.
7. Two failure modes observed in pass 6's review were missing from the table: a
   decision its own observation cannot answer, and a statement disagreeing with
   its own decision.

Loop document: the stopping rule, the fixed-point polarity, a routing step for
stage-1 findings, the assessment cut from three checks to one, a section for
proposals that recur, and the stage-2 timeout.

## Control item

Fourteen findings, three blocking, eleven recorded in a table with an owner column
left blank because it could not invent owners. No queue offered. It also detected
three separate goals, and volunteered the motivation-versus-requirement reading
unprompted.

Two of the three stage-1 fixes verified: recorded-not-asked, and look-up terms.
The third — settled decisions visible in the item — is unverified, because the run
correctly stopped at placeholder and never reached a rewrite.

## Not fixed

The procedural preamble. Three runs, three phrasings: "Findings first.", "I read
it six times, once per lens.", "What follows is the findings...". A red flag names
the shape and has not bound it once.

That is the wrong form for the failure. `superpowers:writing-skills` says a
prohibition backfires on wrong-shaped output and a recipe works instead — state
what the output is, its parts, in order. Three data points now say the same.
