# modus

> *Est modus in rebus.* — There is a measure in things.

Latin `modus`: the due measure, the proper limit — the point past which more effort stops being
worth it. Horace's line (*Satires* 1.1.106) continues *sunt certi denique fines*: there are, in the
end, definite boundaries. That is the job. It sits beside its sibling plugin `onus`, which carries
the load of a work item; `modus` is the measure of when that load has been discharged.

modus refines a vague work item into a per-item definition of done, implements against it, verifies
against exactly that, and hands off whatever cannot be verified here.

The novelty is in where the standard comes from. A definition of done is normally a static checklist
the team wrote once and applies to everything. Here it is **derived for the individual work item**
and **frozen before implementation begins**. Deriving it per item means it can be specific enough to
actually decide anything; freezing it before implementation means the thing being satisfied cannot
drift toward whatever the implementation happened to produce.

**Status: design phase.** One component is implemented — the reference linter under `scripts/`, with
its fixture corpus and a measured mutation baseline. Everything under `lib/` named in the slice
documents is still `*planned*`. See [The slices](#the-slices).

## Three constraints on anything added here

**1. modus is self-contained.** This is a build constraint, not a description. The sibling plugins
are installed and in use; this one has no users yet. So nothing here may require a change to another
plugin in order to work — a slice that depends on `mantra`'s rule injection or `comitatus`'s review
fan-out is a slice that cannot ship, and should do the thing itself even where that duplicates a
sibling. Duplication is reversible by deleting code; a premature coupling is reversible only by
regressing a plugin someone else depends on. Redistributing this work across plugins is a live option
for later, once the design has earned it.

**2. Every check must be able to say "I could not check."** Give it three outcomes, not two:

| Exit | Meaning |
| --- | --- |
| `0` | ran, found nothing |
| `1` | ran, found something |
| `2` | could not run — says so in its own words, and names the cause |

`0` and `1` are a two-valued answer to a three-valued question. A check whose inputs are missing has
not passed, and if it reports `0` it has produced a false green; if it reports `1` it has produced a
false finding, and after that is dismissed once nobody reads it again. Both failures are worse than
the honest third answer, and neither is visible from the outside — that is what makes this class
expensive.

This is not a hypothetical. Building the tooling in this directory produced the same defect three
independent times, and every instance was green:

- A reconcile of the seven-way document split compared the declared ranges **to each other** rather
  than to the documents claiming them. Two reviewers both certified "no duplicates, all clean."
  Three material omissions and three mis-attributions survived it. That is why
  `scripts/lint-slice-headers.js` exists.
- That linter then read history through a repo-root-relative pathspec without pinning `cwd`. Run
  from anywhere but the root it found nothing and reported `cannot resolve a pre-split source` —
  its sentence for *the source is genuinely gone*.
- With that fixed, CI hit the same wall from the other side: `actions/checkout` defaults to
  `fetch-depth: 1`, so there was no history to walk, and the message was again identical to real
  provenance loss.

Every one of them was an oracle that could not distinguish **"I checked and it is fine"** from
**"I could not check."** The generalising fix is the table above: make the unverifiable case
announce itself in its own words and give it its own exit code. Anything added under `scripts/` is
expected to follow it.

**3. A metric that cannot express the defect is not evidence about the defect** — however true the
number is.

The extraction that created this plugin was reported, by the person who did it and confirmed by two
reviewers, as *109 files rename-detected, 96 of them at R100*. That was accurate. It was also not
evidence of what it was being used for. Rename detection can only describe files that moved; it has
no way to say anything about files that were **added**, and the defect was two stale copies restored
at the old path by a mistaken `git checkout HEAD -- <old-path>`. The renames were clean because the
moves really did happen. The additions sat on a different line of the same summary, and the number
everyone was looking at could not have gone up or down in response to them.

The check that would have settled it in one line — `git ls-tree -r --name-only HEAD | grep
'^context-emendator/'` — asks about the state that was actually claimed, which is that the old path
is gone. So before a number is offered as evidence, establish that the defect being ruled out is
inside the range of things that number could report. A metric outside that range is decoration, and
it is more dangerous than no metric, because it survives review.

## The problem

An agentic review loop has two failure modes and they are the same failure.

A reviewer asked "what is wrong with this code?" is answering a search question, and search questions
have a near-zero "nothing found" base rate — so the reviewer manufactures findings to justify itself.
The implementer then treats every finding as an obligation, because nothing in the loop distinguishes
a finding from a work item. Goal drift follows mechanically: the goal sits in the context window,
findings accumulate in the context window, and by the third round most of the recent context is
trivia about naming conventions. The model is faithfully serving what is in front of it.

Both halves need the same missing object: an immutable artifact that says what this item has to
achieve, written down before the work starts, against which a finding is either blocking or noise.

## What it does

1. **Reconstruct.** Work items are unrefined, incorrect, and incomplete. Recover the goal, the
   problem, and the obligations the item is actually asking for, anchored to the item's own text.
2. **Author and freeze.** Turn that reconstruction into a boundary bundle — the per-item definition
   of done — review it adversarially, then freeze it. After the freeze it is the standard; it is not
   renegotiated because the implementation turned out to be inconvenient.
3. **Discharge.** Implement, then prove each obligation against the frozen bundle and nothing else.
4. **Stop honestly.** Reach a named stop state. Anything that cannot be verified here is handed off
   as an explicit request naming what a human is being asked to do — not silently dropped, and not
   papered over with a passing summary.

## The slices

The design is seven vertical slices, each shippable and independently testable. Each document
carries YAML frontmatter declaring what it ships, its gating test, and what it depends on.

| Slice | Job |
| --- | --- |
| [`autonomous-workitem-workflow`](docs/autonomous-workitem-workflow.md) | the index and spine: orchestrator, eligibility screen, code registries, stop states |
| [`walking-skeleton`](docs/walking-skeleton.md) | one thin end-to-end run that proves the integration |
| [`tracker-and-forge-ports`](docs/tracker-and-forge-ports.md) | the port interface, one concrete adapter, the run record |
| [`reconstructing-the-item`](docs/reconstructing-the-item.md) | recover what the item is for — the highest-risk slice |
| [`the-boundary-bundle`](docs/the-boundary-bundle.md) | author, review, and freeze the boundary |
| [`discharging-the-boundary`](docs/discharging-the-boundary.md) | implement, prove, review, hand off |
| [`the-reference-implementation`](docs/the-reference-implementation.md) | make the linter trustworthy, and measure whether it is |

## Running the checks

```
npm test --workspace modus          # 183 tests
node modus/scripts/lint-boundary.js modus/tests/fixtures/*.yaml
node modus/scripts/lint-slice-headers.js
```

`lint-slice-headers` verifies slice provenance: for every source line a slice document claims, it
checks that the line's content is actually present in the document claiming it. It reads the
pre-split source out of git history rather than the working tree, so its source path is deliberately
a historical one — see the note on `HISTORICAL_SOURCE_PATH` in that script before changing it.

Because it reads history, **it needs a full clone.** In a shallow one it exits `2` and prints
`PROVENANCE NOT VERIFIED` rather than guessing, per the rule above. CI sets `fetch-depth: 0` so the
check actually runs; if that is ever reverted the check does not silently pass, it announces that it
was skipped.

## Relationship to onus

`onus` carries a work item through the mechanics of delivery: fetching it, updating it, writing the
commit and the pull request. `modus` decides what would make that item *done* and whether it is. They
compose — onus handles the load, modus sets its limit — but neither depends on the other, and modus
is deliberately tracker-agnostic behind the ports slice.

## History

This work was developed under `context-emendator/` and extracted into its own plugin. That name
belongs to a different product — an auditor for agent workflow configuration — and the two had been
sharing a directory. The research, docs, scripts, and tests moved here unchanged.

One consequence is visible in the tooling: `lint-slice-headers` addresses the pre-split specification
at `70e2687:context-emendator/docs/autonomous-workitem-workflow.md`, and that path stays spelled the
old way because it names a revision in history, not a file on disk.
