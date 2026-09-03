# Pass 11 — dispatch provenance

zed's condition, adopted: byte identity is not certified from the frozen file alone.
This file records how the dispatched bytes are derived, what the wrapper says
verbatim, and what receipt evidence each round must produce. It is written **before**
either round is dispatched so the wrapper is inspected rather than pre-approved
unseen.

## Dispatch is by reference, not by value

Neither round is sent a pasted copy of the questions. Both are sent a path. The bytes
each reviewer answers are therefore the bytes of one file, which any third party can
digest, and the failure mode pass 10 had — a drafter rewording the questions between
rounds, visible only to the drafter — has no room to occur.

## Extraction and the trim rule

`round-prompt.txt` is produced programmatically from `review-questions.md`, never
retyped. The rule:

1. Slice from the line `## The prompt given to each reviewer` to the line
   `## Why Q6 is worded this way`, exclusive of the second.
2. Drop the leading heading line.
3. Drop a trailing `---` delimiter line if present.
4. Trim surrounding whitespace and append exactly one newline.

**The trim rule matters and zed found why.** The extracted text is content-identical
to the marked range but not literally byte-identical to it: the raw range carries a
blank line before the closing section marker, which step 4 removes. `round-prompt.txt`
is the canonical dispatched artifact. `review-questions.md` is its source and its
rationale. The frozen file is **not** edited to make the two byte-identical — mutating
a frozen artifact to simplify a check is the defect, not the fix.

## Digests

| File | sha256 | bytes |
| --- | --- | --- |
| `round-prompt.txt` | `dbc5557245509aec9642710083808faca44ba86794e31e9b913239863ae23fe5` | 3324 |
| `review-questions.md` | `e5af5b092a80e8e47041706e837c0f8550fc5cf12a3f8e925a7a05f6d43ce8e1` | — |

Re-digest both before and after each round rather than trusting these strings. Any
change between rounds stops the pass.

## The wrapper, verbatim

Identical for both rounds except the word `one`/`two` in the first line, which names
the round and asks nothing. This is the whole of what the drafter types:

```
This is round <N> of two. Read docs/passes/pass11/round-prompt.txt and follow it
exactly. Reading that file is permitted and is not part of "the rest of the
repository" it tells you not to read; every other limit it states applies unchanged.

Work from /Users/dpuglielli/.herdr/worktrees/claude-domestique/issue-feature-173-review-establishes-stopping-conditions.

Before your six answers, print one line giving the sha256 of
docs/passes/pass11/round-prompt.txt as you read it and its byte count. That line is
receipt evidence for a third party. It is not one of the questions and no question
depends on it.

Add nothing else.
```

The wrapper adds no question, no ordering, and no softening. It names a path, permits
reading it, fixes the working directory, and requires receipt.

## Receipt evidence

Each round's answer must open with the digest and byte count of `round-prompt.txt` as
that reviewer read it. A round whose reported digest does not match the table above is
not accepted, and neither is a round that reports none: receipt is not inferred from
the drafter's own digest of the file, because that establishes what was on disk and
not what was read.

## The residual limit

The wrapper text above is typed by the drafter into a tool call, and no filesystem
artifact proves the call carried exactly these bytes. Two things reduce that to a
narrow risk and neither eliminates it: the wrapper carries no review content, so
drift in it cannot change what is asked; and the reported digest establishes which
question file was actually read. Stated rather than certified.
