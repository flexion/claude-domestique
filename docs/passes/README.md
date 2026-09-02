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

Raw `*.jsonl` event streams are committed, deliberately, and they are large —
200KB to 1.3MB a stage against 49KB for everything readable in a pass. They are
kept for forensics. A report says what a run concluded; the stream says what it
actually did, in order, with every tool call and its input. Every question worth
asking after the fact has turned out to need the second: which tool it was on when
it stalled, whether it wrote outside its own directory, how many review rounds it
dispatched and when.

The richer record is the session transcript Claude writes under
`~/.claude/projects`, which is not committed and not ours to commit. That is 19MB
for nine sessions and it is per-machine, so the streams here are the portable half.
`docs/plugin-evaluation.md` has the parse for both.

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
