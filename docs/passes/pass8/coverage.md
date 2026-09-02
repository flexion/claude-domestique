# Coverage of the item — pass 8 boundary

`agent-work-item` step 5b, run against [`boundary.yaml`](boundary.yaml) before
review. Every criterion the item states, and the entry that covers it.

| Item criterion | Covered by |
| --- | --- |
| AC1 a person is asked, and nothing is drafted until they agree | `OB-3` asks, `OB-4` drafts nothing until answered |
| AC2 a reviewer names no entry they had to write themselves | `OB-5` |
| AC3 underivable criteria yield no boundary, each missing thing recorded | `OB-6` yields none, `OB-7` records each separately |
| AC4 a blocker names what is missing, and resolves independently | `OB-8` names, `OB-9` resolves independently |
| AC5 resolving the last blocker redrafts, unasked | `OB-10` redrafts, `OB-11` sends no new request |
| AC6 a hand-written boundary needs no step a drafted one does not | `OB-12` compares the procedures, `PRES-1` holds the gate it already passes |
| AC7 every frozen boundary carries a recorded approval | `OB-13` |

**No criterion is uncovered.** Five of the seven needed two entries, because five
state two separately falsifiable things each.

The three out-of-scope bullets are the first three `non_goals`, not entries.

## Four entries cover no criterion

Each traces a coupling the item does not mention. This is the check the refinement
loop's assessment asks — whether the boundary names what the item does not.

| Entry | Why it exists |
| --- | --- |
| `OB-1` a drafted boundary lints with no failures | `CPL-1`. The item never says the output has to be valid |
| `OB-2` every citation names a part the item carries | `CPL-6`. Zero failures with exempt checks reads as clean and is not |
| `PRES-2` the linter's verdicts on its corpus do not change | `CPL-2`. 32 hand-written manifests are the corpus, and changing the linter is a non-goal nothing else checks |
| `W-1` new items get drafted boundaries | The Goal's outcome, via `C2`. `stated_unverified`, so it grounds a watch and nothing that gates |

## One coupling edge is uncovered

`CPL-7` — `human-work-item`'s output is the drafter's input, and the four things
it must carry are stated in `modus/README.md`. No obligation here constrains that
shape, because out-of-scope bullet 3 places producing the refined criteria
upstream. Declared `uncovered` in `entails` rather than left out of `coupling`.

## What changed from pass 6

Pass 6's coverage table had no empty rows either. Three differences:

- Five criteria are split across two entries instead of two of them. AC5's
  "without anyone being asked again" had no entry in pass 6 — `OB-10`'s
  equivalent there passed for a drafter that asked and redrafted anyway.
- AC6 is covered mechanically as well as by review. Pass 6's `PRES-1` was a
  `mechanical` + `pass` entry whose observation enumerated freeze steps, which no
  script can do; its reviewer flagged the operand as asserted rather than
  obtained.
- `CPL-5` and `CPL-6` are new coupling edges: the specified freeze records no
  approval, and `lintBoundary` exempts every locator check when no part list is
  supplied.
