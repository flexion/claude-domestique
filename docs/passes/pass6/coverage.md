# Coverage of the item — pass 6 boundary

`agent-work-item` step 5b, run after the fact against
[`boundary.yaml`](boundary.yaml). Every criterion the item states, and the entry
that covers it.

| Item criterion | Covered by |
| --- | --- |
| AC1 a person is asked before drafting | `AC-11` asks, `AC-3` drafts nothing until answered |
| AC2 reviewer writes no entry | `AC-4` |
| AC3 insufficient criteria yield no boundary, each missing thing recorded | `AC-5` yields none, `AC-6` records each separately |
| AC4 a blocker names what is missing and resolves independently | `AC-7` names, `AC-10` resolves independently |
| AC5 resolving the last blocker redrafts unasked | `AC-8` |
| AC6 a hand-written boundary needs no extra step | `PRES-1` |
| AC7 a frozen boundary carries a recorded approval | `AC-9` |

No criterion is uncovered.

Three entries cover no criterion, and each traces to a coupling the item does not
mention rather than to the item's text:

| Entry | Why it exists |
| --- | --- |
| `AC-1` a drafted boundary lints without failures | `CPL-1`. The item never says the output has to be valid |
| `AC-2` every citation resolves to a label the item carries | `CPL-1`. Zero failures with exempt checks reads as clean and is not |
| `PRES-2` the linter's verdicts on its corpus do not change | `CPL-2`. 32 hand-written manifests are the corpus |

## What this check would have caught

Two of the seven were uncovered before review: AC4's independence clause, and
AC1's asking. `AC-10` and `AC-11` were added because a reviewer named them. Step
5b exists so the author names them first.

Run against the superseded `boundary/gh-158.yaml`, this table would have had six
empty rows.
