# Pass directories

One directory per pass of the refinement loop. The procedure is in
[`../refinement-loop.md`](../refinement-loop.md); this file only says what the
directories hold.

```
passN/
  item.json          the issue as fetched at the start of the pass
  stage1-*.txt       what human-work-item said about it
  stage2-*.txt       what agent-work-item said about it
  boundary.yaml      the boundary, where stage 2 produced one
  stage2-review.md   what step 8 found
  notes.md           the session's evaluation of the pass
```

Both skills write here themselves, conditional on this directory existing. The
path belongs to this repository and not to either plugin, so the instruction is
inert in a checkout without it.

## Passes 1 to 6 predate the scheme

Their transcripts went to a temporary directory and are gone. What survives:

| | |
| --- | --- |
| `pass1/item.json` | the original placeholder issue, 302 characters |
| `pass3/item-superseded-unlabelled.json` | after definition, criteria not yet labelled |
| `pass3/item.json` | after labelling, and what passes 4 to 6 ran against |
| `pass6/boundary.yaml` | the first boundary derived from a refined item |
| `pass6/stage2-review.md` | the two review rounds that found four defects in it |

Losing the rest is why this directory exists. Every claim in the pass records and
in the commit messages for passes 1 to 6 rested on transcripts nobody can re-read.
