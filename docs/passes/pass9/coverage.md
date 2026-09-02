# Coverage of gh-158 by `boundary.yaml` — pass 9

Step 5b. Every part of the item, and the entry that covers it. A criterion with no
entry is either a non-goal or an obligation nobody wrote, and this table says
which.

The linter never checks this. It checks whether the manifest is internally
consistent. `boundary/gh-158.yaml` left six of seven criteria uncovered and linted
clean; `docs/passes/pass6/boundary.yaml` left two and linted clean.

## Criteria

| Item part | Entry | What it covers |
| --- | --- | --- |
| AC1 — a person is asked | `OB-1` | one request to draft is recorded |
| AC1 — nothing drafted until they agree | `OB-2` | no boundary while the request is unanswered |
| AC1 — asked once per item | `OB-3` | a second run records no second request |
| AC2 | `OB-5` | the reviewer's returned list is empty |
| AC2 — falsification guard | `OB-6` | a draft that ignores its input is caught mechanically |
| AC3 — one blocker per missing thing | `OB-7` | blocker count equals missing-condition count |
| AC3 — no boundary is produced | `OB-8` | a run that records blockers writes no file |
| AC4 — names the criterion or the question | `OB-9` | reviewer names no blocker that names neither |
| AC4 — resolvable independently | `OB-10` | one at a time, once per blocker |
| AC5 — produces a new boundary | `OB-11` | a boundary file exists after the last blocker |
| AC5 — without being asked again | `OB-4` | the post-blocker path specifically |
| AC6 | `OB-12` | hand-written step list is a subset of the drafted one |
| AC6 — mechanical half | `OB-13` | the boundary files already here still lint |
| AC7 — approval recorded at the freeze | `OB-14` | the record names the approving person |
| AC7 — merge approval does not satisfy it | `OB-15` | the approval is inside the frozen bundle |

All seven criteria carry an obligation. Nothing was moved to `non_goals` to avoid
writing one.

## Parts with no entry, and why

| Item part | Disposition |
| --- | --- |
| `description#1` | motivation. "That holds for a couple of items and not for a sprint" states why the work is worth doing and asserts no obligation. Pass 2 reclassified it from requirement to motivation and the item has read that way since |
| `Problem` | reconstructed as `problem.statement` and `C1`. Its second half — the patience claim — is `C2`, `stated_unverified`, and grounds nothing |
| `Goal` | reconstructed as `goal.statement`. Every entry descends from it |
| `description#13` | the three out-of-scope bullets, carried verbatim as the first three `non_goals` |
| `description#4`, `description#12` | headings |

## Entries with no criterion behind them

The three places this boundary names something the item does not. Each traces a
coupling edge or the claim its guard belongs to.

| Entry | Why it exists |
| --- | --- |
| `OB-6` | a static, well-formed, gh-158-shaped manifest that ignores its input satisfies every other mechanical entry here. `OB-5` might catch it; this catches it every run |
| `OB-16` | the drafted manifest has to lint under the linter this repository already ships. The item never mentions linting |
| `OB-17` | omitting the part list makes every `item_locator` check exempt itself, and the draft then lints clean with citations pointing at nothing. That is how `boundary/gh-158.yaml` kept three dead citations and still printed `ok` |

## Coupling edges

| Edge | Covered by |
| --- | --- |
| `CPL-1` `agent-work-item` skill | `OB-12` |
| `CPL-2` `human-work-item` returned-item mode | `OB-9` |
| `CPL-3` `lint-boundary.js` | `OB-16` |
| `CPL-4` the specified freeze | `OB-14` |
| `CPL-5` `refinement-loop.md` pass procedure | **uncovered** |
| `CPL-6` the boundary files already here | `OB-13` |

`CPL-5` is declared uncovered rather than papered over. A drafter existing changes
how a pass runs stage 2 — the document says "The loop runs the stages that exist"
— and no obligation here constrains that document.
