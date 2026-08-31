# Session: draft-boundary-from-ticket

## Details
- **Issue**: gh-158 (bead: domestique-3z5)
- **Branch**: issue/feature-158/draft-boundary-from-ticket
- **Type**: feature
- **Created**: 2026-08-31
- **Status**: in-progress — boundary frozen, implementation not started

## Objective

An agent drafts the boundary rather than a human writing it, and a human approves before freeze.

## The frozen boundary

`boundary/gh-158.yaml`, frozen at `cfbc53c`. Nine entries. **It is the standard now.** If
implementation makes it look wrong, stop and escalate — do not edit it.

`modus/prompts/boundary-prose.md` froze in the same commit because AC-6 and AC-7 name it.

Implementation notes are in `boundary/gh-158.sketch.md`, marked non-normative and deliberately
not part of the boundary. The change surface is a next-phase concern; refinement states only what
must be true.

## How refinement stopped

Not by running out of findings. By a rule, agreed with the operator:

> A fresh agent can say what must be true, how it would tell, what must keep working, what is out
> of scope, and what is handed off — and has no blocking question about *what is wanted*.
> Questions about *how or where to build* do not block. Stop at the first draft that passes.
> A reviewer must name a specific undecidable requirement, not express general dissatisfaction.

Four review rounds with an independent agent, each finding a real defect:

| Round | Finding |
| --- | --- |
| 1 | would refuse to implement — unbounded change surface; two gameable obligations; a `non_goals` contradiction |
| 2 | the mechanism sketch was normative but unenforced, and unreadable to a YAML consumer |
| 3 | a watch entry with no truth condition; `boundary-prose.md` bound nothing |
| 4 | AC-7's observation named two of three banned categories, against an open list |

Severity fell each round. The final check returned an empty list and "no blocking question."

## Key decisions

- **The mechanism sketch came out of the boundary.** Refinement is the "what". The change surface
  is the "how" and belongs to the next phase. This resolved a deadlock rather than working around
  it: the sketch was normative, the schema has no field for it, and `non_goals` forbade the schema
  change that would have made it enforceable.
- **`boundary-prose.md` lives in modus, not borrowed from `stilus`.** README constraint 1: nothing
  here may depend on a sibling plugin, and should duplicate rather than couple.
- **Only the checkable half of the prose rules gates.** Word caps and the closed banned list are
  AC-6 and AC-7. One-claim-per-field is AC-8, a reviewer's job, because a conjunction check
  false-positives on a disjunctive predicate. The author's tells are enforced by nothing, and that
  is recorded as a limit rather than claimed as a check.

## Learnings

- Fluent prose in an acceptance criterion is not a style problem. "Judged usable" cannot be false,
  so an agent cannot tell whether it met it. Writing the rules down caught defects that reading
  the file three times had not.
- A reviewer asked "would you implement from this" answers a different question than "can you
  evaluate these decisions." The first one invited a refusal about the wrong phase.

## The refine skill and the probe — 2026-08-31

gh-158's drafter is not built. What was built instead is the thing that makes any of
it reachable: `modus/skills/refine/`. modus had no skills, rules, hooks or context, so
installing it changed no agent behaviour at all.

**Bootstrap technique, operator's idea and it worked.** Write enough of the skill to be
followed, follow it, and the output is both a boundary and evidence the skill teaches
something. It produced `boundary/refine-skill.yaml` (item: bead `domestique-5bl`), which
passed an independent reviewer's stopping-rule check on its first draft — and found
three consumers the item never mentioned, plus one thing the item got wrong about
itself.

**`scripts/probe-skill.js`** launches a fresh Claude or Codex, loads the plugin from
source, and reports which skills fired and what was said. It exists because every other
check here is static. `refine` passed every validator and **did not fire** on the first
realistic prompt; a sibling skill won. Rewriting the description fixed that and then
failed `validate:plugins`, because the wording that triggered used banned
output-summary language. Only a real run surfaces that.

Host differences are in `docs/plugin-evaluation.md`. The one that bites: **Codex has no
`Skill` tool** — it reads `SKILL.md` via a shell command — so detecting invocation by
tool name reports a fired skill as unfired. The first version of the probe did exactly
that and would have shipped a false negative.

**The uncomfortable result.** `--baseline` runs the same prompt with no plugin. On the
first prompt tried, the skill fired and the baseline arm reached the same conclusions
unaided: same refusal to start, same demand for measurable criteria, same
remedy-versus-requirement observation. Firing is an indicator, not a result. Whether
the skill earns its place is still open, and AC-9 is the entry that will answer it.

`claude plugin eval` is the first-party evaluator and is better than the probe — a
baseline arm, repeated runs, scoring, a CI threshold. It is gated behind
organisation-scoped early access and refuses to run here, so it is deferred.
`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` in `~/.claude/settings.json` is one of the
settings that blocks the flag fetch that would enable it.

## Next Steps

1. **Discharge `boundary/refine-skill.yaml`.** It is a draft and says `NOT FROZEN`. AC-3,
   AC-4 and AC-9 are outstanding and all three need an agent that has not seen this work
   to draft a boundary for `domestique-5bl`, then check it against the record. The probe
   does this now. AC-9 is the one that matters: it fails if the drafter only restates the
   ticket, and it is the entry that can say this was not worth building.
2. Get a human to approve that boundary, then freeze it.
3. gh-158's own drafter, against the boundary frozen at `074ebd5` and nothing else:
   `modus/prompts/author-boundary.md`, `modus/scripts/draft-boundary.js`, and its tests.
   Notes in `boundary/gh-158.sketch.md`, non-normative.
4. gh-158's AC-4 needs a sensitivity probe as a stage-5 evidence edge — an adversarial
   fixture emitting a fixed manifest, which must fail every perturbation case.

Open beads from this run: the lint CLI cannot accept a part list, so locator resolution
is unreachable from the documented command; modus ships no `bin`, so the skill resolves
the linter with a path search; the author's tells in `boundary-prose.md` are enforced by
nothing.

## Blockers

None technical. `boundary/refine-skill.yaml` waits on a human approval it has not had.
