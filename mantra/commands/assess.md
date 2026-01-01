---
description: Perform structured critical assessment of a proposal or approach
argument-hint: [proposal or context]
---

# Critical Assessment

Perform a structured evaluation of a proposal, approach, or solution before implementation.

## Task

**IMPORTANT: This skill implements the CRITICAL ASSESSMENT rule from behavior.md**

When the user presents a proposal, solution, or asks for agreement on an approach, you MUST assess before agreeing.

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

Structure your response as:

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
User: /mantra:assess I think we should add a caching layer using Redis for all API responses

Claude: ## Assessment: Add Redis caching for all API responses

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
