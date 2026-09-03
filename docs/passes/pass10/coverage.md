# Pass 10, step 5b — coverage of gh-173

Item as fetched 2026-09-03. Boundary at `boundary/gh-173.yaml`, both lint forms
clean, `exempt` zero, one recorded warning (`W_NO_FLOOR`).

## Every criterion, and the entry that covers it

| Part | Covered by |
| --- | --- |
| `Goal` | OB-1, OB-2, OB-3 |
| `AC1` | OB-1 |
| `AC2` | OB-2 |
| `AC3` | OB-3 |
| `AC4` | OB-4 |
| `AC5` | PRES-4, PRES-5, PRES-6 |
| `What must keep working`, bullet 1 — the two questions and the three conditions they establish | PRES-1, PRES-3 |
| `What must keep working`, bullet 2 — the two-round limit and AC5's routing | PRES-4, PRES-5, PRES-6 |
| `What must keep working`, bullet 3 — a reviewer names a specific requirement | PRES-7 |
| `Out of scope` | PRES-2, and `non_goals` |

No criterion is uncovered.

`Problem` grounds C1, C2 and C11 rather than an obligation of its own; C11 is
`stated_unverified` and grounds W-1, which gates nothing.

## Parts that are not criteria

`Ready for the agent stage` is a routing flag. `Reference` is citations.
`comment#1` records that bead `domestique-8nb` was closed as covered here and in
gh-172. None of the three yields an obligation.

`comment#2` and `comment#3` raise the decision-falsifiability check and leave its
scope open. It is a live residual and is handed off in `non_goals` rather than
absorbed: it is not one of the six conditions step 9 names, and step 6 of the
skill already requires falsifiability as a drafting rule, so what is missing is a
reader in the review and not the rule.

## Obligations the item does not mention

Five, all from step 2 rather than from the item's text.

| Entry | What it holds | Found by reading |
| --- | --- | --- |
| OB-5 | `docs/refinement-loop.md`'s count of step 8's questions stays true | the doc that describes step 8 |
| OB-6 | modus's version agrees across four metadata files | `AGENTS.md`, `scripts/bump-version.js` |
| OB-7 | the review verifying this item reads the worktree skill text, not the installed plugin's | diffing the plugin cache against source |
| PRES-8 | the linter's fixture verdicts do not change | `modus/tests/fixtures/` |
| PRES-9 | repository plugin validation stays green | `AGENTS.md` |

OB-7 is the one that invalidates evidence rather than breaking a consumer. The
installed copy at `modus/0.3.0` is byte-identical to source now, so a review
dispatched through the installed skill reads the same text — and stops doing so the
moment step 8 is edited, at which point such a review verifies the pre-change text
and returns a pass that says nothing about the change.

## Residuals, each with a destination

Applying C5's reading to this boundary itself.

| Residual | Destination |
| --- | --- |
| the decision-falsifiability check | `domestique-37o` |
| which check `docs/refinement-loop.md` attributes to step 8 | `domestique-crl`; OB-5 fixes only the count |
| the review's return shape and a per-entry verdict row | gh-172 |
| `boundary-prose.md`'s enforcement table crediting a script with the word caps and banned words | `domestique-13n`, found at step 7 |
| W-1's production watch | `handoff` object on the entry: owner, trigger, verification method, evidence destination, failure transition |
| `CPL-6`, the eval that names nothing in step 8 | no obligation needed, and the edge is declared rather than omitted |
| `CPL-7`, gh-172 editing the same step | gh-172 |

Round one of step 8 rejected the first four rows of this table when they read "a
separate item", and rejected W-1 for naming no owner. A destination is an item or a
person, not a promise to file one. The three beads exist because the condition was
applied to this boundary rather than only asked of others.

## Deviations from the skill

Step 9b says to write the run into the highest-numbered `passN`, which is `pass9`
and belongs to gh-158 stage 2. Writing here instead: mixing two items in one pass
directory loses the record the step exists to keep.

The word caps and the banned-word list were verified by hand. `boundary-prose.md`
credits a script with both and no script checks either.
