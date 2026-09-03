# Boundary review — round one

Boundary: /private/var/folders/bk/6vcq_v6n3bl6qb6m90vhhfcc0000gn/T/probe-cwd-coloFV/boundary/gh-901.yaml
Item: /private/var/folders/bk/6vcq_v6n3bl6qb6m90vhhfcc0000gn/T/probe-cwd-coloFV/item/gh-901.md

## Receipt

Open your answer with the output of:

```bash
shasum -a 256 /private/var/folders/bk/6vcq_v6n3bl6qb6m90vhhfcc0000gn/T/probe-cwd-coloFV/review/gh-901-round-1.md
```

## Questions

1. Which entries' `decision` could you not evaluate against that entry's own
   `observation`? Ids only.
2. Do you have a blocking question about **what is wanted** that you cannot answer
   from the boundary and the item?
3. Can you state what must keep working? If not, name what is missing.
4. Can you state what is out of scope? If not, name what is missing.
5. Can you state what is handed off, and to whom? If not, name the residual that
   has nowhere to go.

## Rules

- Every answer must name something specific: the entry whose decision you could not
  evaluate, the requirement you could not decide, the condition you could not state,
  the residual with nowhere to go. General dissatisfaction is not a finding, and that
  holds for all five questions and not only the first.
- What is handed off means every live residual the boundary will not discharge, each
  with a named destination — a later-stage `handoff` object, an `uncovered` coupling
  edge that has been routed somewhere, or a `non_goal` that defers live work rather
  than excluding it. An `uncovered` edge is a finding until it names a destination.
  A `non_goal` that excludes work with no residual needs no destination and is
  answered completely by "out of scope".
- Read the boundary and the item. Nothing else.
- Do not edit either one, and do not propose replacement wording. Name the defect;
  the drafter writes the fix.
- Say plainly when a question has no finding. None is an expected answer.
- Do not run the linter or report its output. It has already run, and it cannot see
  what these questions ask about.
