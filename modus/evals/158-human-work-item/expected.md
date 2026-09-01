# Expected output: #158 refined

The accepted refined item is the current issue body, captured in
`input-gen2.json`. It is not copied here — there would then be two versions to
keep in step.

**The fixture is at a fixed point.** Generation 2 is both the input for the next
pass and the accepted output of pass 3. A pass over it should find nothing new
unless a skill improved in between. That is the condition to expect, not a
problem to fix.

## Generations

| File | updatedAt | State |
| --- | --- | --- |
| `input-gen0.json` | 2026-08-29T19:52:17Z | placeholder. 302 characters, no stated goal, no measure |
| `input-gen1.json` | 2026-09-01T14:16:25Z | defined. Seven criteria, scope stated, unlabelled |
| `input-gen2.json` | 2026-09-01T14:22:34Z | same wording, criteria labelled `AC1`-`AC7` |

Generation 2 changes no wording. It adds the labels that make each claim citable,
and it is kept as its own generation because generation 1 was on the issue and
could have been read.

## What was decided

All of it came from David Puglielli across passes 1 to 3. None was inferred from
the repository.

| | |
| --- | --- |
| human involvement | drafting ships, and a person approves every boundary before it freezes. Reducing that is a separate item |
| the measure of done | a reviewer names no entry they had to write themselves |
| "doesn't scale" | motivation, not a requirement. Needs no number |
| the drafter's input | the output of `agent-work-item`, not the raw ticket |
| must keep working | a boundary written or edited by hand, on the same terms as a drafted one, before the freeze |
| not protected | the boundary's shape. It may change to suit the agent stage |
| a rejected draft | records each missing thing on the issue separately, each resolvable on its own |
| after blockers resolve | the drafter produces a new boundary unasked |
| the first draft | a person is asked before anything is drafted |
| two human touchpoints | accepted for now, expected to reduce with maturity |

Two inferences were drawn rather than asked, and neither was contradicted:

- Hand editing is allowed where it is allowed today, which is before the freeze.
- Consent is asked once per item. The redraft does not ask again because the
  person already agreed to drafting for this item. The word "again" in the fifth
  criterion carries that.

## Proposed, not acted on

The item runs to seven criteria. Two describe what happens when the criteria are
not sufficient: blockers recorded, work stops, no boundary. A drafter handling
only good input would ship and be useful on its own, which makes that a separate
deliverable rather than error handling inside this one.

The split was proposed and not made. `human-work-item` proposes a split and
waits; the human splits.

## Citation targets

Nine, each holding one separately falsifiable claim:

```
Problem  Goal  AC1  AC2  AC3  AC4  AC5  AC6  AC7
```

Generation 1 had four addressable parts, because `agent-work-item` fell back to
paragraph numbers and a bullet list is one paragraph. All seven criteria were
`description#3`, so any entry tracing to any criterion cited the same id — worse
than generation 0, where the collapse was two claims rather than seven. Defining
the item well caused it, by putting more content in each paragraph.

Labels fix it and also survive editing. A paragraph index shifts when anything
above it changes, which lets a frozen boundary cite a different part with nothing
reporting the change.

Bead `domestique-3lf` is the open item on citation granularity. Both skills now
prefer a label and fall back to paragraph numbers, so an item that carries no
labels still works — it just cites less precisely.

## Superseded

The pass 1 finding list against generation 0 is in this file's git history. Eight
findings, plus the addressable-part hazard where the Problem sentence and the
Goal sentence shared `description#2` and four findings landed on that one id. It
described a version of the issue that no longer exists.
