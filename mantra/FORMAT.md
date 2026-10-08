# Compact rule authoring

This is the authoring convention used by [make-rule](skills/make-rule/SKILL.md).
Mantra's current hook injects a fixed reminder; it does not parse, validate, or
refresh rule files. Claude Code natively loads project rules from `.claude/rules/`;
start a new session to apply new or edited instructions. Path-scoped rules apply
when Claude reads, writes, or edits a matching file. Other hosts have their own
instruction-loading conventions.

## Rule and companion

Keep the actionable guidance in one compact file. Put examples and rationale in
a companion only when they help apply the rule. Avoid duplicating the rule in
both files.

For Claude Code projects, a rule can live at `.claude/rules/<topic>.md`, with its
companion at `.claude/context/<topic>.md`. Mantra ships skills and on-demand
references, not a `rules/` directory. Other plugins may ship their own rules.

Put behavioral instructions in the Markdown body. Claude Code reads `paths` as
rule frontmatter metadata and removes frontmatter before loading the rule;
other frontmatter fields do not supply behavioral instructions. See the
[host rule documentation](https://code.claude.com/docs/en/memory#rule-frontmatter-reference).

```markdown
# Assessment
check: correctness, architecture, alternatives, material-risks
stance: evidence-responsive
accept: sound-proposals
revise: evidence-or-reasoning

Details: .claude/context/assessment.md (project-root relative)
```

For a file-scoped rule, add host-supported frontmatter:

```markdown
---
paths:
  - "src/api/**"
---
# API contracts
required: check unsettled external contracts against authoritative references
```

Keep a `paths` block valid YAML: if it fails to parse, Claude Code ignores the
frontmatter and loads the rule without path scoping.

The key-value lines, arrows, alternatives, and headings in the body are notation
for the agent, not a schema executed by Mantra. A companion path should state
where it resolves from; Mantra does not load it automatically.

## Notation

| Pattern | Intended reading |
|---------|------------------|
| `a, b, c` | Items in a list |
| `a → b → c` | Ordered steps |
| `a > b > c` | Priority |
| `a \| b` | Alternatives |
| `no:`, `skip:`, `never:` | Prohibitions within the stated scope |

Use explicit triggers and scope. Reserve blocking language for actual required
permissions or constraints; do not turn routine choices into approval gates.
Verify compliance through observable actions or results, not quoted private
reasoning. See [rule-design](context/rule-design.md).

## Efficiency and validation

Remove filler, redundant rules, and stale guidance before abbreviating. Keep
negations, triggers, and exceptions understandable. There is no guaranteed token
reduction or line-count limit: character counts are only text-size measurements,
and token counts depend on the tokenizer.

Before using a rule, check its paths, consistency with project instructions, and
whether a fresh agent applies it to representative cases. If another tool parses
its frontmatter, validate with that tool as well. The repository's
`npm run validate:plugins` checks plugin metadata and skill frontmatter; it does
not certify arbitrary project-rule syntax or behavior.
