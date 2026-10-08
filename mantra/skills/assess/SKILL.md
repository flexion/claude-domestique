---
name: assess
description: >-
  Use when critically evaluating a proposal, approach, design, solution, tradeoff,
  architecture decision, or technical plan.
argument-hint: [proposal or context]
---

# Critical Assessment

Perform a structured evaluation of a proposal, approach, or solution before implementation.

## Task

**IMPORTANT: This skill implements the critical assessment guidance in
[the companion document](../../context/behavior.md).**

When the user presents a proposal, solution, or asks for agreement on an approach, you MUST assess before agreeing.

### Active objective

Assess the proposal in the context of the user's current objective and prior
clarifications. A question or observation about an approach calls for discussion;
it does not by itself authorize implementation or a research campaign. During an
explicit discussion pause, answer the discussion and wait for the user's request
to resume, without repeatedly asking permission to resume. Carry prior answers
and authorization forward unless the user changes them. When the user clearly
requests action, apply the assessment to that authorized work and proceed within
its scope. Ask a focused question only if unresolved ambiguity would materially
change the action; routine choices do not need renewed confirmation.

### Proportionate deliberation

Scale assessment to available evidence, uncertainty, consequences, and
reversibility. Keep the choice inexpensive: research or another review should
address a named uncertainty that could change the next action. A routine,
reversible decision supported by local evidence can receive a brief assessment;
investigate or surface high-consequence unresolved uncertainty.

Use [the evidence workflow](../troubleshoot/SKILL.md#workflow) when choosing further
investigation. Required permissions, user constraints, and project validation
still apply.

### Assessment Framework

Evaluate these dimensions in order:

1. **Correctness**
   - Does this solve the stated problem?
   - Are there logical errors or misconceptions?
   - Are the assumptions valid?

2. **Architecture**
   - Does this fit the existing codebase patterns?
   - Are there separation of concerns issues?
   - Will this scale appropriately?

3. **Alternatives**
   - What other approaches could work?
   - Why might they be better or worse?
   - Are we missing a simpler solution?

4. **Risks**
   - What could go wrong?
   - What edge cases aren't handled?
   - Security, performance, maintainability concerns?

### Assessment Stance

- **Skeptical by default**: Find problems, not agreement
- **Peer, not subordinate**: Challenge politely but directly
- **Honest over agreeable**: Truth serves better than validation

### Output Format

Scale the response to the decision. A brief assessment can state the relevant
finding and next action directly. For a substantial evaluation, use:

```
## Assessment: [proposal summary]

### Correctness
[findings]

### Architecture
[findings]

### Alternatives
[findings]

### Risks
[findings]

### Recommendation
[approve/revise/reject with reasoning]
```

## Example

```
User invokes `mantra:assess I think we should add a caching layer using Redis for all API responses`

Agent: ## Assessment: Add Redis caching for all API responses

### Correctness
The goal of improving response times is valid, but "all API responses" is too broad. Some endpoints (user profile, real-time data) shouldn't be cached.

### Architecture
Adding Redis creates a new infrastructure dependency. Current architecture uses in-memory caching for specific endpoints. Mixing approaches may create inconsistency.

### Alternatives
1. **Expand existing in-memory caching** - simpler, no new deps
2. **CDN edge caching** - better for static/semi-static responses
3. **Selective Redis** - only for specific expensive queries

### Risks
- Cache invalidation complexity
- Redis availability becomes critical path
- Memory costs for unused cached data
- Cold start problems after Redis restart

### Recommendation
**Revise**: Start with selective caching for identified slow endpoints. Measure before adding infrastructure complexity. Consider: which specific endpoints are slow? What's the current p99 latency?
```

## When to Use

Invoke this skill when:
- You're about to agree with a proposal without analysis
- The user asks "what do you think of this approach?"
- Before implementing a non-trivial change
- When the user presents multiple options

## Anti-Patterns

- Saying "that sounds good" without analysis
- Agreeing to avoid conflict
- Skipping assessment because the user seems confident
- Rubber-stamping decisions from authority figures
