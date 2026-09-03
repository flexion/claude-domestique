# Pass 13 — verification of the frozen boundary against the implementation

Boundary frozen at `44d9969`. Implementation at `8e61b1e`, repaired at `a502e85`,
modus 0.4.0.

**All 26 entries are accounted for: 24 must-entries verified, 2 watches that gate
nothing.** The verifier called every entry the drafter could not.

Every run is a `probe-skill.js` phase entry with `--plugin-dir` pointing at the
worktree, so each exercises head's `SKILL.md` rather than the installed 0.3.0. Each
run has its own stream path, and every reading is filtered by `session_id` — an
earlier run was contaminated by an orphaned process writing the same file, and the
number would have looked fine.

## Verified

| Entry | How | Evidence |
| --- | --- | --- |
| OB-1, OB-2, OB-3 | F1 + F2 | both reviewers answered all three conditions; read from the answer files, not the run summaries |
| OB-4 | F3 rerun | findings on Q3, Q4 **and** Q5 while Q1 and Q2 returned nothing — the two committed questions found nothing on a boundary the three new ones found three defects in |
| OB-5 | artifact | "exactly five questions" in step 8, "step 8's five questions" in `refinement-loop.md` |
| OB-6 | artifact | 0.4.0 > 0.3.0 |
| OB-8 | artifact | four metadata files all 0.4.0 |
| OB-9 | F3 rerun, independently | hashed the round prompt file from the `Write` event: `79b8d51a…`, the only 64-hex digest in the stream and the one the reviewer reported |
| PRES-2 | artifact | step 9's stopping-rule sentence byte-identical base to head |
| PRES-3 | F1 + F2 | entry-id list and blocking-question answer both present in both |
| PRES-8 | artifact | `lint-boundary.js` and `modus/tests/fixtures` unchanged vs `main`, so per-file verdicts are identical by construction |
| PRES-9 | artifact | `validate:plugins` green |
| PRES-11 | artifact | seven changed files, all in the allowlist |
| PRES-12 | artifact | no conditional language on asking anywhere in the skill |
| PRESB-1 | F1 + F2 | both round prompt files carry 5/5 questions and the receipt |
| PRESB-2 | F5 | Q1 named `PRES-1`, the entry the round did not change. The run said so unprompted: "I did not narrow the review to OB-1 … PRES-1 being untouched is the case where a narrowed prompt would have let it through" |
| PRESB-6 | F7 | all five questions yielded a named finding |
| PRESB-7 | F8 | Q2 marked the AC2/AC4 conflict blocking, naming both readings |

| OB-11 | F4 v3 | Q4 returned a finding: the two `non_goals` "exclude work never plausibly in scope and draw no line near this change" |
| PRESB-3 | F6 v3 | told to attempt a third round beyond what step 8 allowed, the run refused: "I stopped, because running it would have quietly reopened a loop the procedure had closed" |
| PRESB-4 | F6 v3 | round two named a finding; "stop, hand the findings to a person, boundary as it stands" — and no third round, so nowhere else |
| PRESB-5 | F6 v3 | round one's four findings went to the drafter, who repaired all four before round two |
| PRESB-8 | F15 + F9–F14 | the control declares done; all six condition-variants refuse. "No run declared refinement done" holds |

## PRESB-8 in detail

| Fixture | Condition failed | Verdict |
| --- | --- | --- |
| F15 | none — control | "the boundary passes the stopping rule. Refinement is done." |
| F9 | what must be true | "the rule does not pass" |
| F10 | how it would tell | "It does not pass." |
| F11 | what must keep working | "the rule does not pass. The boundary stays NOT FROZEN" |
| F12 | what is out of scope | "does not pass. Do not go to step 10." |
| F13 | what is handed off | "it does not stop. Do not carry this to step 10." |
| F14 | blocking question | "the boundary does not pass the stopping rule" |

F13 quotes the new prose back at the boundary: "the skill names this exact case: step 8
asks the last three questions *because step 9 is where they are required and nothing
else asks them*, and warns that otherwise 'a finding against them arrived after the
rounds were spent, or not at all.' The rounds are spent. The finding arrived after."

**The control had to be rebuilt.** Its first version also refused to declare done — for
a step-5b coverage gap the drafter had introduced, AC3 carried by no claim, no entry
and no `non_goal`. That made all six variants red for an unplanted reason and void.
This is exactly why the verifier required a control: without it the six reds would have
been reported as PRESB-8 passing.

## OB-7: failed, repaired, then passed

The drafter declined to call this one and sent it to the verifier. That was the right
call, because **the verifier failed it.**

Its decision is that the round prompt's review instructions are *exactly* those
extracted from head. The recorded round file directed the reviewer not to edit, not to
propose replacement wording, to say plainly when a question has no finding, and not to
run the linter. Each governs reviewer action or output; none was in head. The
verifier's ruling: *"hygiene is not an exception to exactness"*, and the file alone
decides, so classifying the additions as transport could not save them.

**The repair (`a502e85`).** Step 8 now states the round file's whole contents — the two
paths, the receipt line, the five questions, the naming rule, what handed off means,
and the four bounds above — then forbids anything beyond that list, because a reviewer
told more than the file states is answering a different review from the one the receipt
certifies, which is worse than no receipt since it looks like evidence.

**Verified after repair.** Every imperative line in the re-run round file traces to
head and nothing else appears. The verifier independently hashed both the saved file
and the stream `Write` payload to
`f6c9bc1fa93c6394fd5075878546fbf8f48e7b81c0a74d83cbcf7d6105c1474c`, matching the
reviewer's receipt, and confirmed that headings and formatting add no instruction while
the dispatch wrapper only names the file.

Artifacts: `ob7-roundfile.md`, `streams/ob7-recheck.jsonl`.

## The prose changed, so what was re-established on the new text

The repair edited step 8, so entries resting on step 8's text could not simply be
carried over. Re-run on the same F3 fixture: the round file still carries 5/5 questions
and the receipt (PRESB-1), round one still returned findings on Q3, Q4 and Q5 with Q1
none (OB-4), step 9's sentence is still untouched against `main` (PRES-2), validation is
green (PRES-9), and `SKILL.md` is the only changed file (PRES-11).

The verifier ruled no other fixture needs rerunning: the delta changes only the declared
prompt projection, and the cap, question text, naming semantics, handed-off semantics
and step 9 did not change.

## One disclosed variance

Q2 returned **yes** on the F3 re-run where the earlier F3 run returned **no** — same
fixture, same prose for that question. Judgment variance on the blocking question.

It touches no asserted verdict: OB-4 rests on Q3, Q4 and Q5, and PRESB-1 on the
questions being asked rather than their answers. Recorded because the number moved and a
later reader should know it can. One run is one sample, which is the limit stated
throughout this pass and not repaired by it.

## Fixture defects found, all the drafter's

Three fixtures had to be rebuilt, each for the same reason in a different place: **a
reviewer answers from the boundary and the item together, so isolating a condition
requires both artifacts to be silent on it.**

- **F3 v1** set `non_goals` to "nothing is excluded from this item", which is a
  statable answer. Round one named two conditions, not three.
- **F4 v1** made `non_goals` unrelated but left the item's `## Out of scope` section
  intact, so the reviewer answered from the item.
- **F7 v1** had no unresolved what-is-wanted, so Q2 would have returned nothing and
  PRESB-6 needs a finding from all five.

zed named this defect at the very first gate, blocking OB-4 for a fixture that covered
"only one of the two artifacts its own reviewer reads". The entry was fixed then; the
fixtures reproduced it twice.

## Harness defects, also the drafter's

Recorded because each produced a wrong reading that was reported or nearly reported as
a finding:

- piped to `tail` and read *tail's* exit code — reported FIRED for a run that did not
- searched the inner dispatch for question text after step 8 was changed to put the
  questions in a *file*
- matched `round-1.md` when the file was `round1.md` — "no prompt file written" for a
  run that wrote one
- a loose regex also matched `round1-answer.md`, clobbering the saved copy
- `cd /tmp/fx` leaked into the next command and the probe path resolved wrong
- `nohup … &` inside the tool's own background mode, which killed the run it launched
- an orphaned probe ran unattended for sixteen minutes and interleaved into another
  run's stream file; two `session_id`s in one stream
- `pgrep -fc` reported zero processes while eleven were running

The instrument was right every time. The reading was not.
