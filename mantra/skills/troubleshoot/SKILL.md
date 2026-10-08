---
name: troubleshoot
description: >-
  Use when diagnosing an error, bug, crash, stack trace, broken build, failing test,
  regression, or other unexpected technical behavior.
argument-hint: [error message or bug description]
---

# Troubleshoot

Diagnose the reported behavior using evidence relevant to the next action.

## Task

Use available evidence, uncertainty, consequences, and reversibility to choose
further investigation. A demonstrated local defect can proceed from local evidence
without an external source quota.

## Workflow

1. **Establish the behavior**
   Inspect the error, relevant source, reproduction, and tests. Gather environment
   or version details when they affect the diagnosis. Distinguish observed facts
   from hypotheses; a similar error elsewhere does not establish this cause.

2. **Choose the next evidence**
   Keep this decision inexpensive: name what remains uncertain and whether
   resolving it could change the next action. If a local reproduction and source
   inspection establish a deterministic defect, repair it and verify locally.
   Otherwise choose an investigation suited to the uncertainty and consequences:
   - Before implementing a change whose correctness depends on a format, protocol,
     or third-party API contract not established by available evidence, consult an
     applicable authoritative reference such as the specification, official
     documentation, or release notes.
     Recall or a local sample does not establish that contract.
   - Use issue reports or other documented cases when they help discriminate
     plausible causes. Cross-check when applicability is doubtful or sources
     conflict, rather than to reach a fixed number of sources.
   - Investigate or surface high-consequence unresolved uncertainty. Identify what
     is unknown and why it matters; do not silently guess through it.

3. **Act on the evidence**
   Explain why the diagnosis applies to this case. Reference the local evidence or
   external sources actually used. Make the supported repair and run the relevant
   checks. Further research or another review should address a named uncertainty
   that could change the next action, rather than continue searching without one.

Respect required permissions, user constraints, and project validation.

## Communication

Match the explanation to the decision. A deterministic local fix may need only the
cause, repair, and verification result. A consequential or unresolved diagnosis
should also state the uncertainty, evidence gathered, and what it means for the
next action. Do not fill a template with unused sources.

## When stuck

Identify the missing fact that prevents a supported next action. Choose a targeted
reproduction, source inspection, authoritative reference, or focused question that
could resolve it. If the evidence is unavailable, state the uncertainty and its
consequences rather than claiming a diagnosis. Missing an arbitrary source count
is not a reason to keep searching or ask the user for more context.

Avoid shotgun fixes, unsupported pattern matching, and presenting speculation as
fact. Local evidence is sufficient when it demonstrates the cause, not merely
because an error happened locally.
