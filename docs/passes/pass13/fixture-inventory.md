# Pass 13 — fixture inventory for the frozen boundary

`boundary/gh-173.yaml` is frozen at `44d9969`. Fourteen of its twenty-six entries
observe a run. This is what those runs need, before any prose is written.

The boundary says what to observe. It does not say what to observe it on, and that is
deliberate — fixtures are implementation. This file is that implementation, and it is
written first so the step 8 prose is written against the tests rather than the tests
against the prose.

## The phase-entry pilot, which corrected this file's first version

The first version of this inventory asserted that **every review fixture must replay
steps 1 to 7**, because step 8's review happens inside a refinement run. That was the
drafter's assumption, not the boundary's requirement — the frozen observations say
"run a review under head", not "rerun refinement from step 1" — and it was wrong. It
also made four fixtures unreachable, since F3, F6, F7 and F8 all plant defects that
step 1b terminates on before step 8 is ever reached.

zed blocked it and asked for a pilot. Prompt at `pilot-prompt.txt`, sha256
`ff76d70f670a3281984bfec3ba8cdde10665b451a2d49d92253f564a901b7f82`, 3120 bytes. It
supplies an item and a boundary, says to resume at step 8, and **deliberately does not
say what step 8 requires**.

Four results, all of which change this file:

**1. Phase entry works.** The skill fired, resumed at step 8, did not restart from step
1, and did not redraft the boundary. So the step-1b-terminal fixtures are reachable
after all, and no fixture needs steps 1 to 7 replayed.

**2. The self-dispatch property holds.** The prompt supplied no questions; the run
asked the two questions `SKILL.md` states and dispatched two fresh reviewers itself —
`invoked: Skill, Bash, Agent, Agent`. The skill drove its own review, which is exactly
what PRESB-1 requires and what a hand-assembled prompt cannot establish.

**3. A review run costs about two and a half minutes.** 146115 ms, 6 turns, $0.82. So
thirteen runs is roughly half an hour and about eleven dollars. The earlier "four
minutes is the floor" came from `pass8/notes.md` and describes a *full refinement*, not
a step-8 entry. PRESB-8's six runs are full refinements and remain the expensive part.

**4. It found a real defect in the pilot boundary**, unprompted: `OB-2`'s decision "the
output is acceptable" names no property its observation produces. Both rounds named it
independently. The instrument works.

## Step-9 entry works, and PRESB-8 needs a control

Second pilot, `pilot9-prompt.txt`, sha256
`32d0632cff9de7842e5f6566ade60376fe6053159360766d58be27a6cf6af756`. It supplies an item
and boundary and says the review came back clean, resumes at step 9, and deliberately
states neither what step 9 requires nor what its result should be.

53721 ms, 3 turns, $0.39. The run applied step 9's six conditions independently and
**did not declare done** — so the stopping decision is exercisable at step 9 entry,
which is what PRESB-8 needs and what six full refinements could not guarantee, since a
full run can stop or repair before the planted failure ever reaches step 9.

**And it found a defect nobody planted.** The fixture was built to fail one condition —
a deferred non-goal with no destination, so "what is handed off" is unstatable. The run
instead named AC3 as having no entry, no claim and no non-goal: a step 5b coverage gap
the drafter introduced by accident.

That is the fixture-design lesson for F9 to F14. PRESB-8 requires "only that condition
failing", and a fixture with a second, unnoticed defect makes a failing run prove
nothing about the condition under test. **Each variant needs a passing control**: the
same fixture with no planted defect, confirmed to declare done, before any variant is
trusted. Without the control, a red result is unattributable.

## Fixtures

Each is a repository directory containing a boundary and an item, driven with:

```bash
node scripts/probe-skill.js --plugin modus --expect modus:agent-work-item \
  --prompt "<prompt>" --cwd <fixture> --stream docs/passes/pass13/<fixture>.jsonl
```

`--cwd` requires a clean tree, so each fixture directory is its own committed
repository. Exit 1 means the skill did not fire and exit 2 means the run failed; a
check that treats both as failure conflates a real negative with a broken tool.

**Each prompt is its own file, and the file is the record.** `--stream` is the run
transcript and does **not** carry the outer invocation prompt. Verified twice: the
trivial smoke prompt appears zero times in its stream, and the pilot prompt appears in
its stream only at lines 38-45 and 67-74, inside the skill's own subagent dispatches —
it is there because the skill quoted the item onward, not because the invocation was
recorded. A fixture whose skill summarized rather than quoted would leave no trace at
all.

So the prompt file's digest is the dispatch record, and `--stream` is separate evidence
of what ran. This is the same dispatch-by-reference discipline pass 11 used, and the
reason is the same: a payload nobody can re-digest is not a record.

**But the outer prompt is the wrong prompt for OB-7 and OB-9.** Both entries concern
"the prompt recorded for that round" — a *review round*, which is an inner dispatch the
skill composes, not the outer resume prompt the harness sends. `pilot-prompt.txt`'s
digest satisfies neither.

The inner half is solved. Extracting each `Agent` `tool_use` prompt from the stream
yields the recorded prompt file: the pilot produced two, both 4206 bytes, both sha256
`5275c5da72b77d34d29ece69d452ca3ab53afd748e5567675afba9256ef63b5f`, and both carry the
two questions `SKILL.md` states. Identical digests across rounds is its own useful
signal — the skill sent both reviewers the same question set, which is the property
pass 10 failed at.

**OB-9's other half has no solution that does not change the skill. See the escalation
below.**

## Escalation: OB-9 is unevaluable under self-dispatch

OB-9's observation is "read the prompt digest **the reviewer reported**, then digest the
prompt file the dispatcher recorded for that round."

Under self-dispatch — which PRESB-1 requires, because a hand-assembled prompt means the
harness asked the questions rather than the skill — the dispatcher is the skill and the
reviewer is a subagent the skill spawned. The skill records no prompt file, and the
subagent reports no digest, because nothing asks it to. **Neither operand exists, so the
decision cannot return true or false.** That is the unevaluable-decision defect, in a
frozen entry.

Two ways out, and neither is the drafter's to choose:

1. **Satisfy it literally** — step 8's prose instructs each reviewer to report a digest
   of what it read. This makes OB-9 evaluable, and it puts a receipt instruction into
   the skill that gh-173 never asked for.
2. **Escalate the entry** — the stream already pairs each `tool_use` prompt with its
   `tool_result` answer, which binds prompt to answer *without trusting either party's
   self-report* and is strictly stronger than the reported digest OB-9 asks for. But
   OB-9's frozen text says "the reviewer reported", and step 10 forbids reinterpreting a
   frozen entry to suit the implementation.

The boundary is frozen, so this is stopped and handed to the operator rather than
resolved here. OB-7 is unaffected: extracting the inner prompt and comparing its review
instructions against head's satisfies it as written.

| # | Fixture | Serves | What it plants |
| --- | --- | --- | --- |
| F1 | frozen-marked boundary + item | OB-1, OB-2, OB-3, PRESB-1 | nothing defective; the freeze marking is the variable |
| F2 | unfrozen-marked boundary + item | OB-1, OB-2, OB-3, PRESB-1, PRES-3 | as F1, marked NOT FROZEN |
| F3 | pair stating none of the three conditions | OB-4 | boundary *and* item both omit what must keep working, what is out of scope, and what is handed off |
| F4 | non-goals addressing nothing the item raises | OB-11 | a non-empty `non_goals` whose bullets touch no criterion the item states |
| F5 | unevaluable decision in an unchanged entry | PRESB-2, PRESB-5 | a decision its own observation cannot answer, in an entry presented as unchanged since the last round |
| F6 | finding that survives a first-round repair | PRESB-3, PRESB-4 | see below — the hard one |
| F7 | defective against each question | PRESB-6 | union fixture: an unevaluable decision, an unresolved what-is-wanted choice, and all three conditions unstatable |
| F8 | pair leaving a what-is-wanted choice unresolved | PRESB-7 | two readings of what is wanted, each building materially different things, neither chosen |
| F9–F14 | six condition-variants, unfrozen-marked, entered at step 9 | PRESB-8 | one per step 9 condition, each failing only that condition |
| F15 | the clean base of F9–F14, nothing planted | PRESB-8 control | must declare done, or a red variant is unattributable |

**Fifteen artifacts, fifteen runs, none of them full refinements.** Every run is a
phase entry: step 8 for F1 to F8, step 9 for F9 to F15. Measured, not estimated — a
step-8 entry is 146 s and $0.82, a step-9 entry is 54 s and $0.39. So the whole set is
roughly twenty-five minutes and about nine dollars.

The earlier "roughly thirteen runs, six of them full refinements" is withdrawn. It
assumed PRESB-8 needed six full refinements, which the step-9 pilot disproved, and it
predated the control fixture.

## F6, and why the first construction was self-defeating

PRESB-3 and PRESB-4 need a finding that **survives a first-round repair**, because the
cap and the escalation are only observable on a second round that still names
something. A planted defect the drafter simply fixes produces a clean second round and
establishes nothing.

The first construction here was an item whose two criteria contradict. That cannot
work, and zed caught why: **a contradiction is a step 1b terminal, so the run ends
before round one and nothing survives into round two.** The defect has to be one the
review names, not one the gate refuses.

The pilot surfaced the other half of the problem. Told not to edit the boundary, the
run reported: "step 8 calls for fixing what round one named *before* round two, and you
told me not to edit the boundary. I didn't edit it. So round two was a second
independent sample of the unchanged document rather than a re-check of a fix." So a
fixture that forbids editing cannot exercise the cycle at all.

F6 therefore has to **allow** the repair and make the defect survive it. Two candidate
shapes, to be tried in order:

1. Resume at step 8 with editing permitted, planting a defect whose repair needs
   information neither the item nor the fixture repository contains — so the drafter
   attempts a fix, cannot complete it, and round two still names it.
2. Failing that, resume *after* round one with an unresolved finding already recorded,
   and let the skill choose the cap and the handoff.

Still the open risk in this inventory. If neither shape produces a second round that
names something, PRESB-3 and PRESB-4 are unverifiable as written, and that is grounds
to stop and escalate under step 10 rather than to quietly weaken them.

## What is not a fixture

Twelve entries observe artifacts rather than runs and need no fixture: OB-5 (the
question count in `refinement-loop.md`), OB-6 and OB-8 (version metadata), OB-7 and
OB-9 (the provenance chain, which reads the dispatch record and the reviewer receipt),
PRES-2 and PRES-12 (skill text), PRES-8 (fixture-corpus verdicts), PRES-9 (plugin
validation), PRES-11 (the changed-file allowlist), and the two watches W-1 and W-2,
which observe production and gate nothing.

## Order

1. Build F1 and F2 first and run one of them end to end. That sizes a real firing run,
   which the smoke test did not, and it exercises the whole instrument before thirteen
   more fixtures depend on it.
2. Build F3, F4, F5, F7, F8.
3. Attempt F6. Escalate if it cannot be built.
4. Build F15, the control, and confirm it declares done. Only then build F9 through
   F14 — six variants of one proven shape, entered at step 9, and the cheapest runs in
   the set rather than the most expensive.

## Evidence

Every empirical claim above is anchored to a preserved artifact in this directory,
because a measurement nobody can re-check is an assertion.

| Artifact | What it establishes |
| --- | --- |
| `pilot-prompt.txt`, 3120 bytes, `ff76d70f…` | the step-8 resume prompt, supplying state and withholding step 8's requirements |
| `pilot8-stream.jsonl`, `pilot8-output.txt` | phase entry at step 8; `invoked: Skill, Bash, Agent, Agent`; 146115 ms, 6 turns, $0.82 |
| `pilot9-prompt.txt`, 4036 bytes, `32d0632c…` | the step-9 resume prompt, withholding step 9's rule and result |
| `pilot9-stream.jsonl`, `pilot9-output.txt` | the stopping decision exercised and refused; 53721 ms, 3 turns, $0.39 |
| `inner-prompts/round1.txt`, `round2.txt` | both 4206 bytes, both `5275c5da…`, both carrying the two questions `SKILL.md` states |

The two `--stream` files are also the evidence for the claim that `--stream` does not
record the outer prompt: it appears zero times in the step-8 smoke case and only inside
`Agent` dispatches in the pilots.
