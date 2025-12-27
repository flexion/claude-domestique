---
# Rule Design - Compact Reference
companion: context/rule-design.md

MANDATORY-REREAD: before-writing-rules, before-creating-context-files (use-thinking-block)

## CORE INSIGHT
goal: rules-trigger-action (not-inform)
effective: "You MUST" + "STOP" + thinking-block-verification
less-effective: impersonal-compact-format

## RULE STRUCTURE (BLOCKING REQUIREMENT)
components: TRIGGER, PRIORITY, STEPS, VERIFY, CONSEQUENCE
trigger: natural-language (match-user-prompts)
priority: BLOCKING | MANDATORY | RECOMMENDED
steps: numbered, atomic, ordered
verify: exact-phrase-for-thinking-block
consequence: what-breaks-if-skipped

## COMPACT FORMAT
include: parsing-instructions-at-top
require: verify-field (thinking-block-phrase)
operators: → (flow), > (priority), | (alternatives)
brevity: no-articles, no-prose, key:value

## COMPANION DOCS
structure: why-exists, walkthrough, examples, edge-cases
examples: correct + incorrect (explain-both)
naming: same-name-different-directory

## KEY PRINCIPLES
direct-address: "You MUST" > "must:"
natural-triggers: match-user-language (not-abstract)
auditable-verification: exact-phrase-in-thinking-block
consequences: state-what-breaks
blocking: literal-STOP (before-action, not-after)
numbered-steps: explicit-order, atomic
examples: correct + incorrect (prevent-misinterpretation)

## ANTI-PATTERNS
never: impersonal-rules, no-verification, abstract-triggers
never: dense-format-without-guide, buried-priority, no-consequences

## FILE ORGANIZATION
rules/: compact (always-loaded)
context/: companion-docs (on-demand)
convention: same-name-both-directories

## CHECKLIST
require: TRIGGER (natural-language), PRIORITY (marked), direct-address
require: STEPS (numbered), VERIFY (exact-phrase), CONSEQUENCE
require: companion-doc-with-examples
---
