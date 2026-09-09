# modus

> *Est modus in rebus.* — There is a measure in things.

Latin `modus`: the due measure, the proper limit — the point past which more effort stops being
worth it. Horace's line (*Satires* 1.1.106) continues *sunt certi denique fines*: there are, in the
end, definite boundaries. That is the job. It sits beside its sibling plugin `onus`, which carries
the load of a work item; `modus` is the measure of when that load has been discharged.

modus helps an agent carry a work item through to working behavior and recognize when it is
finished — neither stopping short of the requested outcome nor expanding past it.

## The problem

An agentic review loop has two failure modes and they are the same failure.

A reviewer asked "what is wrong with this code?" is answering a search question, and search questions
have a near-zero "nothing found" base rate — so the reviewer manufactures findings to justify itself.
The implementer then treats every finding as an obligation, because nothing in the loop distinguishes
a finding from a work item. Goal drift follows mechanically: the goal sits in the context window,
findings accumulate in the context window, and by the third round most of the recent context is
trivia about naming conventions. The model is faithfully serving what is in front of it.

The other direction is the same shape inverted: an agent that declares victory on a passing test it
wrote to pass, having never established that the requested behavior works.

## What it does

`agent-work-item` states what completion means and what evidence supports it, in four areas where
judgment usually fails:

| | |
| --- | --- |
| **Tests** | a test is evidence when it distinguishes a relevant incorrect implementation from a correct one |
| **Deterministic tools** | a check that could not run has not passed, and a check that ran can still measure the wrong thing |
| **Refactoring** | earns its place by making *this* change simpler to make or verify, not by anticipating a future one |
| **Review** | a finding needs a supported reason to act; repairs are verified, and a fresh unrestricted search needs a reason |

It requires no separate artifact. There is nothing to author before starting, nothing to approve,
and nothing to certify afterwards that the guidance was followed.

## The skills

Two, and they take the same item at different points. Both ship to Claude Code and to Codex from
`skills/`.

| Skill | Reader of its output | Produces |
| --- | --- | --- |
| `human-work-item` | a person | the item rewritten, plus acceptance criteria in bullets |
| `agent-work-item` | an autonomous agent | the implemented change and the evidence for it |

`human-work-item` runs first. It finds what the item does not say, settles each finding with a human
one question at a time, and never guesses — an unanswered gap becomes an open question with a name
against it. It adds no implementation and it does not split the item; it proposes the split and
stops. Use it when a person needs the item made readable. It is not a prerequisite:
`agent-work-item` works from the item as it stands.

Neither skill fires reliably because its description reads well. See
[`docs/plugin-evaluation.md`](../docs/plugin-evaluation.md) for why static validation cannot answer
that question, and `scripts/probe-skill.js` for the probe that can.

## Status

**This is an untested hypothesis.** The guidance in `agent-work-item` has not been compared against
the obvious baseline: an ordinary agent, given the same work item, with no skill loaded at all.
Until that comparison runs, "modus helps" is a claim and not a result. Removing the plugin entirely
remains a legitimate outcome.

The comparison worth running starts from the original work item — not from any artifact a prior
stage produced — and reads delivered behavior, missed requirements, unnecessary changes, and how
often a human had to intervene. Each of the four areas above should be evaluated separately, so the
ones that change nothing can be dropped.

## What changed in 0.5.0

Through 0.4.x, modus derived a per-item definition of done — a linted, human-approved YAML boundary
frozen before implementation — and verified against exactly that. It was retired, along with its
linters, fixtures, mutation baseline, and the seven slice documents that specified it.

The mechanism relocated the problem rather than solving it. Before implementing, the agent had to
establish that its own definition of done was complete, correct, and sufficiently verified, which
takes most of the judgment the boundary was supposed to supply. In practice the authoring stage
absorbed the effort and the frozen artifact still did not carry the run to completion.

The research that motivated the boundary is kept in full under `docs/research/`, including the
satisficing briefing and its reference corpus. It documents a real problem; it did not establish
that a frozen artifact was the remedy.

## Validating changes

modus ships skills and documentation only — no JavaScript, no package manifest, no test suite. From
the repository root:

```bash
npm run validate:plugins            # metadata and skill frontmatter
node scripts/probe-skill.js --plugin modus --expect modus:agent-work-item --prompt "..."
```

The probe loads the plugin directory directly on a fresh agent, so an edit takes effect without
installing or version-bumping anything.

## Relationship to onus

`onus` carries a work item through the mechanics of delivery: fetching it, updating it, writing the
commit and the pull request. `modus` decides what would make that item *done* and whether it is. They
compose — onus handles the load, modus sets its limit — but neither depends on the other.

## History

This work was developed under `context-emendator/` and extracted into its own plugin. That name
belongs to a different product — an auditor for agent workflow configuration — and the two had been
sharing a directory. The research, docs, scripts, and tests moved here unchanged; the scripts and
tests were removed in 0.5.0.
