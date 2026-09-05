---
name: agent-work-item
description: >-
  Use when about to write code for an issue, ticket, bug, or work item, or when
  asked how to start, how far to take it, or whether the work is finished.
---

# agent-work-item

Exercise sound judgment about when the requested work is finished, with the least
additional instruction necessary.

## Completion

Carry the requested outcome through to working behavior. Use the request, repository
context, and observed results to decide what remains necessary. Resolve consequential
defects and run relevant checks. Once the outcome is achieved and the evidence
supports it, finish. Further work should address a concrete gap in the requested
outcome or a regression caused by the change. Exercise judgment on routine
uncertainties; ask when a consequential decision requires the user.

## Tests

Test observable behavior against an expectation derived from the requirement. The
test should distinguish a relevant incorrect implementation from a correct one.

"Falsifiable" alone is insufficient: a test comparing source text against a snapshot
can fail while telling you little about correctness. For a bug fix, demonstrate that
the regression test catches the original failure. For refactoring, existing behavior
tests should pass before and after. Do not derive an expected result from the same
production logic under test, and do not mock away the behavior at issue.

## Deterministic tools

Use existing executable checks for properties they can establish reliably. Use
judgment to interpret their relevance and limitations.

The project supplies its test, lint, type-check, formatting, and build commands.
Search and filter programmatically, inspect focused output, and run focused checks
during development; run the required broader checks before completion, and repeat a
passing check when its relevant inputs change. A check that could not run has not
passed, and a deterministic check can still measure the wrong thing. Prefer an
existing tool over constructing a bespoke validation system for the current task.

## Refactoring

Refactor when it makes the current change materially simpler, easier to verify, or
easier to maintain. Preserve intended behavior and keep the extent proportionate to
that benefit.

Separating calculation from I/O to make important behavior testable earns its place
immediately. Adding extension machinery for hypothetical future requirements
generally does not. The smallest diff is not necessarily the simplest solution.

## Review

Identify consequential problems in the requested behavior, correctness,
maintainability, and verification. Explain the affected condition and consequence.
Distinguish necessary changes from optional improvements.

A finding needs a supported reason to act; it need not always have an executable
reproduction, and architectural defects can be real. Conversely, a reviewer's
preferred implementation is not automatically an obligation.

After repairs, verify the repairs and their plausible effects. Reopen broader review
when new evidence or substantial changes justify it. Finish when the requested
outcome is supported and no known material issue remains.

A round cap can limit expenditure, but reaching it cannot turn unresolved defects
into a successful completion.

## Out of scope

No boundary artifact, no approval stage, and no document certifying that these
instructions were followed. Project-specific commands and conventions stay in the
project; deeper technique references load on a demonstrated need.
