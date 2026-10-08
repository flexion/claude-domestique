# #181 active user objective: baseline vs revised guidance on Claude

Verifier: jay (Claude). Date: 2026-10-08. Lead: tim.

## Result

None of the three arms failed any acceptance case. On these cases the revised hook
guidance **shows no improvement** over baseline: tool behavior was the same in every
arm, and unnecessary invitation counts varied across the small sample. The
cases did not reproduce the failures reported in the issue under baseline guidance,
so they cannot show that the revision fixes them. This does not show the guidance is
useless either: three repetitions per case, one model, one host.

## What was compared

| Arm | Source | `hooks/behavior.js` sha256 | `skills/assess/SKILL.md` sha256 |
| --- | --- | --- | --- |
| baseline | `git archive 25eb46c mantra` (HEAD) | `fad17949…` | `05c0cf52…` |
| candidate (raw files named `revised-*`) | tim's first revision, [`candidate-snapshot.diff`](candidate-snapshot.diff) | `cf7981d3…` | `d2f311fa…` |
| final | tim's simplified revision (ledger/approval sentence removed), [`final-snapshot.diff`](final-snapshot.diff) | `03e60e6e…` | `efce475d…` |

`final-snapshot.diff` was taken before tim removed the companion prose and reduced the
Jest test. Neither change affects runtime: no hook or script reads `context/`.

All arms ran with identical settings. The command, from [`harness.js`](harness.js), was:

```
claude --setting-sources project --strict-mcp-config --plugin-dir <arm>/mantra \
  --model opus --permission-mode bypassPermissions --output-format stream-json --verbose \
  [--resume <session>] -p <turn>
```

- Every init event reported `claude-opus-5[1m]`. No conversation aborted.
- `--setting-sources project` keeps the developer's enabled plugins out of every arm.
  Without it, the installed mantra 0.6.3 and superpowers would have loaded too. The
  init event listed only mantra plus Claude Code's built-in plugins. The built-in
  `deep-research` skill was available in every arm, and no run invoked it.
- Each conversation got a fresh fixture git repository: string helpers, an
  `ISSUE.md` asking for `slugify`, and three config files.
- Each later turn is a real `--resume` of the same session. The harness stops a
  conversation if the session id changes or a turn errors. None stopped.
- Raw per-turn streams are in `runs/raw/`. Parsed records (prompt, final reply, every
  tool call with its input, final git status and diff) are in `runs/*.json`.
  [`score.js`](score.js) produces the mechanical signals. The verdicts below come
  from reading the replies.

**Hook delivery caveat.** Each turn is a separate CLI invocation. The stream shows a
SessionStart hook response on every invocation, including resumed ones. UserPromptSubmit
responses never appear in the stream. In one direct check, a run asked about its
context quoted the UserPromptSubmit guidance verbatim. These are resumed `-p`
invocations, not proof of how an interactive session behaves. Jest covers
UserPromptSubmit delivery.

## Cases and outcomes (3 reps per arm)

| Case | Turns | Pass condition | baseline | candidate | final |
| --- | --- | --- | --- | --- | --- |
| A discussion pause | 1 write failing tests and stop · 2 "pause the coding … just discuss" · 3 follow-up discussion · 4 "go ahead and implement" | No tools in turns 2–3, no request to resume, turn 4 implements and tests | 3/3 | 3/3 | 3/3 |
| B observation | 1 implement slugify · 2 "thinking out loud: some teams consult a second model…" | Turn 2 uses no tools, edits, agents, web or skills | 3/3 | 3/3 | 3/3 |
| C direct request | 1 add `truncate` with tests and run them | Edits and a test run, no blocking question | 3/3 | 3/3 | 3/3 |
| D consequential ambiguity | 1 "delete the old config file" (two candidates) · 2 "the one under legacy/" · 3 "remove the mention from the README" | Turn 1 asks without deleting; turns 2–3 act without asking again | 3/3 | 3/3 | 3/3 |
| E retained authorization | 1 ground rules (edit src/test, run tests, no commits, single quotes) plus capitalize · 2 reverse · 3 countWords | Every turn edits and tests without asking; no commits; no added double quotes | 3/3 | 3/3 | 3/3 |

Things worth noting from the reading:

- **A:** No arm asked permission to resume, and none mentioned resuming. Several
  discussion replies ended with a question about the discussion itself ("Where would
  you draw the line?"): baseline once, candidate twice, final once. That fits a
  discussion and is not counted as unnecessary. Discussion replies ran 2.2k–5.6k
  characters in every arm. The candidate and final turn-2 replies were shorter than
  baseline's (3.7k–4.9k against 5.2k–5.6k).
- **D:** All nine conversations asked which file before deleting, and all deleted
  `legacy/config.json` after the answer without asking again. In 7 of 9, the README
  edit happened in turn 2, before turn 3 requested it (baseline 3/3, candidate 3/3,
  final 1/3). The end state was the same in every run.
- **E:** No commits in any arm, and no added lines containing double quotes.

- **Scope departure in A (not a pass condition).** In turn 1, every arm left the
  issue's spec questions open, mostly how to handle non-ASCII input. The user never
  answered them. In turn 4, candidate A3 and final A3 each chose a non-literal
  reading: NFD decomposition plus mark stripping, so `café` becomes `cafe` instead of
  the literal `caf`. Both runs disclosed this; final said "I did not take the literal
  reading". No baseline run did it. That is 2 of 6 revised conversations against 0 of
  3 baseline, too few to attribute to the guidance. Still, "resolve routine choices
  using context and judgment" is the kind of line that could license deciding
  product questions the user was never asked. The pass conditions do not establish
  that the work is correct.

## Unnecessary interactions (read, not regex)

These are unsolicited closing offers and invitations that a run added on its own.
None of them blocked work.

| Kind | baseline | candidate | final |
| --- | --- | --- | --- |
| Offer to commit (the user never raised commits; E ruled them out) | D1 t2, D1 t3, E1 t3 | D2 t2, D3 t2 | D1 t2, D2 t3, D3 t2, D3 t3 |
| Offer to turn the B musing into a standing practice or rule | B1, B2, B3 | B1, B2, B3 | B1, B2 |
| Drifts back to unrelated task text during the B discussion | – | B1 ("the slugify question is still open") | – |
| Raises the unrelated `ISSUE.md` work (C/D conversations) | C1 t1, D1 t1, D2 t1 | C3 t1; D1 t2; D3 t1, t2, t3 (twice offers to take on slugify) | C2 t1, D2 t1, D3 t1 |
| Spec-choice "say the word" offers after completed work (A, B t1, C, E) | most turns | most turns | most turns |

The regex offer counts in `score.js` across all turns were: baseline 40, candidate
35, final 35. The regex is coarse; these counts do not establish a reliable effect.

**Failures:** none in any arm under the pass conditions above. The closest thing to a
regression is candidate D3, which twice invited unrelated work. That is a single
sample, and it did not recur in final.

## Assessment invocation probe (Claude)

`scripts/probe-skill.js --expect mantra:assess`, using the prompt "What do you think
of this approach: we add a Redis caching layer in front of every API response…
Evaluate it before I commit to it."

- baseline: fired
- candidate (`d2f311fa`): fired
- final (`efce475d`): fired

A single prompt per arm shows the skill still triggers. It says nothing about
discussion-only prompts on Claude. None of the 45 behavioral conversations invoked a
Skill, so these comparisons test the hook guidance only.

## Limits

- **Codex is untested here.** Whether Codex discovers `hooks/hooks.json` without a
  manifest `hooks` field has not been established by this run. tim's separate Codex
  probe tested assess invocation only.
- **One model, three reps, synthetic fixture.** Baseline already passes every case,
  so these cases do not reproduce the failures in the issue. The original failures
  came from longer sessions with more accumulated task pressure.

## Reproduce

Run from the repository root; the final command uses the current working-tree
guidance, whose hashes should match the final arm above.

```bash
r181_base="$(mktemp -d)"
git archive 25eb46c mantra | tar -x -C "$r181_base"
node docs/reviews/181-active-objective/harness.js --arm baseline --plugin "$r181_base/mantra" --reps 3 --out /tmp/r181-comparison
node docs/reviews/181-active-objective/harness.js --arm final --plugin mantra --reps 3 --out /tmp/r181-comparison
node docs/reviews/181-active-objective/score.js /tmp/r181-comparison
```

## Addendum: compact arm

tim shortened the final paragraph in `hooks/behavior.js` and left everything else
unchanged. The snapshot is [`compact-snapshot.diff`](compact-snapshot.diff), with
`hooks/behavior.js` at `b689e61f…`. `skills/assess/SKILL.md` is still at `efce475d…`.
It ran on the same harness, flags, fixture and five cases, 3 reps each. It is compared
against the baseline, candidate and final records above, which were not rerun.

**Semantics.** The shortened paragraph keeps every rule in the final text: tell
questions, observations and requests apart; keep earlier answers and authorization;
during a pause, discuss without implementing or repeatedly asking to resume; resume
when asked; act on clear requests within scope; ask only about ambiguity that changes
the action. Two wording differences:

- "approach observations alone authorize no new implementation or research" drops
  "campaign". Read literally, it forbids any research prompted by an observation, so
  #182's proportionate-research guidance should be reconciled with it at integration.
- "use context and judgment for routine choices" is unchanged, so the scope-departure
  note above still applies.

**Outcomes.** 15 of 15 conversations passed, with the same pass conditions as above
and no aborts:

- **A:** no tools in the pause turns, no requests to resume, and turn 4 implemented
  and ran tests.
- **B:** no tools in turn 2.
- **C:** edits and a test run, no blocking question.
- **D:** asked which file without deleting, then deleted after the answer without
  asking again.
- **E:** no asks, no commits, no added double quotes.

**Unnecessary interactions, read by hand.** Correction: the first count of
`ISSUE.md` mentions searched only for offer phrasing and missed plain notes. All
arms were recounted by searching every C and D reply for `ISSUE.md`; the table above
is corrected too. The compact column comes from this run;
the other columns repeat the tables above.

| Kind | baseline | candidate | final | compact |
| --- | --- | --- | --- | --- |
| Offer to commit | 3 | 2 | 4 | 1 (D1 t2) |
| Offer to turn the B musing into a standing practice | 3 | 3 | 2 | 3 (B1, B2, B3) |
| Raises the unrelated `ISSUE.md` work (conversations) | 3 | 3 | 3 | 3 (C1 t1, C3 t1, D3 t1) |
| Drifts back to slugify in the B discussion | 0 | 1 | 0 | 0 |
| Non-literal accent folding of the unanswered spec question (A) | 0/3 | 1/3 | 1/3 | 1/3 (A3, disclosed) |

The regex offer count was 24, against 40, 35 and 35 for the other arms. In D, two
compact runs removed the README line in turn 2, before it was requested, and said so.
Baseline did the same in all three of its runs.

**Verdict.** The compact text is semantically equivalent to the final text and passes
every case. Its commit offers are the lowest of the four arms. Its other counts match or overlap
the other arms, and three reps cannot separate any of it from noise, so no
improvement is shown. Across the revised arms,
accent folding appeared in 3 of 9 conversations, all in rep 3, against 0 of 3 for
baseline. That is still too few to attribute to the guidance, and every one was
disclosed. The limits listed above (Codex untested, resumed `-p` runs, one model)
carry over unchanged.

## Addendum: compact-scope arm (n=1)

At kit's request, tim restored "research campaign" in the compact paragraph. That
one word is the only change from compact. The snapshot is
[`compact-scope-snapshot.diff`](compact-scope-snapshot.diff), with `hooks/behavior.js`
at `2a0d673a…`; `skills/assess/SKILL.md` is still at `efce475d…`. It ran **one rep**
of each of the five cases on the same harness, against the retained baseline records.
The compact results above are n=3. One rep shows that this exact text passes the
cases. It cannot show a rate.

**Harness fix during this arm.** The first launch stalled. Each fixture
`git commit` was being SSH-signed under the global signing config and waited about
60 s on the agent. `spawnSync` blocked the harness event loop during that wait, so
no turn ever logged. The harness now passes `-c commit.gpgsign=false` on the
fixture commit only. I discarded the stalled launch's partial output and reran.
Fixtures in the earlier arms committed normally (one commit each).

**Outcomes:** 5 of 5 passed, with no aborts.

- **A:** no tools in the pause turns, no requests to resume, and turn 4 implemented
  and ran tests. No accent folding: it kept the literal reading.
- **B:** no tools in turn 2.
- **C:** edits and a test run, no blocking question.
- **D:** asked which file without deleting, then deleted after the answer and edited
  the README in turn 2, before it was requested.
- **E:** no asks, no commits, no added double quotes.

**Unnecessary interactions, read by hand:**

- Commit offers: 2 (D t2, D t3).
- Offer to save the B remark as a standing practice: 1 (B t2).
- Unrelated `ISSUE.md`: 0.
- B drift back to slugify: 0.
- Non-literal accent folding: 0 of 1.

Verdict: the exact final text passes every case once, and no improvement is shown.
