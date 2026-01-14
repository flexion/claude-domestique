# Context Rule Design Guide

companion-for: rule authors and contributors

## Rule Types

Rules fall into two categories:

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| `actionable` | Blocking rules that trigger behavior | TRIGGER, PRIORITY, ACTION, VERIFY, CONSEQUENCE |
| `reference` | Informational context, no triggers | None (purely descriptive) |

Mark each rule file with `type: actionable` or `type: reference` in the frontmatter.

## Core Insight

Rules fail when they're treated as "background information" instead of "active instructions." The goal is to create rules that trigger action, not just inform.

## Rule Effectiveness Hierarchy

Most effective (system prompt patterns):
```
IMPORTANT: You MUST do X before Y. STOP and verify in your thinking block.
```

Less effective (current compact format):
```
required-before: Y
must-show: "doing X"
```

The difference: direct address + explicit STOP + verification requirement.

---

## Rule Format Recommendation

Structure each rule with four components:

```markdown
## RULE: [Name]

TRIGGER: [Natural language - when this applies]
PRIORITY: BLOCKING | MANDATORY | RECOMMENDED

IMPORTANT: You MUST [action]. STOP before proceeding.

STEPS:
1. [First action]
2. [Second action]
3. [Verification step]

VERIFY: Show in thinking block: "[exact phrase to quote]"

CONSEQUENCE: [Why this matters - what breaks if skipped]
```

### Example - Branch Creation

```markdown
## RULE: Branch Creation

TRIGGER: Creating a new branch, starting new work, beginning a chore or issue

PRIORITY: BLOCKING

IMPORTANT: You MUST branch from freshly fetched origin/main. STOP before any git checkout or git branch command.

STEPS:
1. Run: git fetch origin
2. Run: git checkout -b <branch-name> origin/main
3. Verify branch created from correct base

VERIFY: Show in thinking block: "Consulting git.md - branch-from: main (git-fetch-first, remote-main)"

CONSEQUENCE: Branching from wrong base causes merge conflicts and PR issues.
```

---

## Compact Format Guidelines

If using compact format, include parsing instructions:

```yaml
# FORMAT GUIDE
# trigger: natural language matching user intent
# priority: BLOCKING (stop), MANDATORY (must do), RECOMMENDED (should do)
# action: numbered steps in order
# verify: exact phrase to show in thinking block

rule: branch-creation
trigger: "create branch" | "start work" | "new chore" | "new issue"
priority: BLOCKING
action:
  1: git fetch origin
  2: git checkout -b <pattern> origin/main
verify: "branch-from: main (git-fetch-first, remote-main)"
```

Critical: Include a `verify:` field that specifies what must appear in thinking block.

---

## Companion Document Structure

```markdown
# [Topic] - Detailed Reference

companion-for: [rule-file.md]

## Why This Rule Exists
[Problem it solves, what goes wrong without it]

## Detailed Walkthrough
[Step-by-step with explanations]

## Examples

### Correct
```bash
# Situation: Starting work on issue #42
git fetch origin
git checkout -b issue/feature-42/add-auth origin/main
```
[Explain why this is correct]

### Incorrect
```bash
# WRONG - no fetch, branching from local
git checkout -b issue/feature-42/add-auth main
```
[Explain what breaks]

## Edge Cases
- [Scenario]: [How to handle]
- [Scenario]: [How to handle]

## Related Rules
- [Link to related rule and why]
```

---

## Key Principles

1. **Direct address increases compliance**
   - "You MUST" > "must:"
   - "STOP before" > "required-before:"

2. **Triggers should match user language**
   - "When creating a branch" matches "create a branch for this"
   - "required-before: git-operations" is abstract

3. **Verification must be auditable**
   - Specify exact phrase to show in thinking block
   - Makes compliance visible and checkable

4. **Consequences create stakes**
   - "Branching wrong causes merge conflicts" > implicit

5. **BLOCKING means literal stop**
   - Not "consider this" but "STOP, verify, then proceed"
   - Must appear before action, not after

6. **Numbered steps remove ambiguity**
   - Order matters, make it explicit
   - Each step should be atomic

7. **Examples prevent misinterpretation**
   - Show correct AND incorrect
   - Explain why each is right/wrong

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Impersonal rules | Treated as background | Use "You MUST" |
| No verification | No way to confirm compliance | Add VERIFY field |
| Abstract triggers | Don't match user prompts | Use natural language |
| Dense compact format without guide | Gets skimmed | Add parsing instructions |
| Buried priority markers | Missed during scanning | Put BLOCKING first |
| No consequences | No stakes for compliance | State what breaks |

---

## File Organization

```
.claude/
├── rules/                    # Compact rules (always loaded)
│   ├── git.md               # Git workflow rules
│   ├── testing.md           # TDD rules
│   └── behavior.md          # General behavior rules
├── context/                  # Companion docs (loaded on demand)
│   ├── git.md               # Detailed git examples
│   ├── testing.md           # Test patterns, edge cases
│   └── behavior.md          # Detailed behavior guidance
└── sessions/                 # Session files
```

**Naming convention:** Rule file and companion file share same name, different directory.

---

## Enforcement Checklist

For each rule, verify:
- [ ] Has explicit TRIGGER in natural language
- [ ] Has PRIORITY clearly marked (BLOCKING/MANDATORY/RECOMMENDED)
- [ ] Uses direct address ("You MUST")
- [ ] Has numbered STEPS in order
- [ ] Has VERIFY field with exact phrase
- [ ] Has CONSEQUENCE stating what breaks
- [ ] Companion doc has correct/incorrect examples
