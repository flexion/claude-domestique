# Does refine fire, and does it change the answer

The ticket is the shape modus exists for: it states a symptom, asserts the code is
dead without evidence, and names no way to tell when the work is finished.

## Passes

- The response treats defining "done" as the first action, before editing code.
- It says the ticket's own claim that the field is dead is unverified, and that
  reading the code is what settles it.
- It looks for what the ticket does not mention — a consumer, a constant, a test
  that does not exist.
- Any acceptance criteria it offers can be false. "The column is gone and the
  table still lines up" passes. "It works correctly" does not.

## Fails

- It starts editing, or proposes an implementation plan first.
- It accepts "dead code and safe to delete" without saying what would confirm it.
- It offers acceptance criteria that cannot fail.

## Note for the with-without arm

Firing is necessary and not sufficient. A run that invokes the skill and then
gives the same answer the baseline arm gave has demonstrated nothing. The delta
is the result; the invocation is only the indicator.
