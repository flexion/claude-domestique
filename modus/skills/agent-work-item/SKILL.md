---
name: agent-work-item
description: >-
  Use when about to write code for an issue, ticket, bug, or work item, or when
  asked what to do first, how to start, how to approach it, or where to begin.
  Also use when an item has to be made ready for an autonomous agent to work
  from, or when a definition of done has to be frozen before implementation.
---

# agent-work-item

Produce one boundary: the per-item definition of done. Freeze it before writing code.

The point is not documentation. It is that after the freeze, a finding is either
blocking or noise, and the target cannot drift toward whatever the implementation
happened to produce.

## Procedure

**1. Get the item's parts.** Cite a label the item carries where it has one:
`Problem`, `Goal`, `AC4`. Where it has none, address parts `<field>#<n>`,
one-based, paragraph-level within a field: `description#1`, `comment#4`. Do not
invent parts, split sentences, or reorder them. Every claim you make will cite one
of these.

Prefer the label. A paragraph index shifts when anything above it is edited, so a
frozen boundary can end up citing a different part with nothing reporting it. A
label does not move. It also means something to a reader: `traces: [AC4]` names
the criterion, `traces: [description#7]` names a position.

A bullet list is one paragraph. Seven criteria in one list are one part, and every
entry tracing to any of them cites the same id — a citation carrying no
information. Where an item is laid out that way and you cannot get it labelled,
say so. That is a defect in the item, not something to work around quietly.

Read the whole item, not what someone pasted you. Description, acceptance-criteria
field, comments. A tracker's UI and its API can return different content for the
same item.

An item that has been through `human-work-item` already states its goal, its
problem, and criteria a person can check. Cite that text the same way. It is still
an item, and it can still be wrong about the repository.

**1b. Refuse criteria that cannot yield a boundary.** Before reading anything
else, check that the item states all four:

- an outcome, so an entry has something to be true about
- a criterion per obligation you would write, each able to be false
- what must keep working, not only what must change
- what is out of scope
- no two criteria that contradict each other

Any one of the first four missing and you cannot derive obligations, only invent
them. Stop and say which is absent.

The fifth is separate and easy to miss, because an item can hold all four and
still be underivable. Two criteria that cannot both hold force you to choose which
one wins, and nothing records that you chose. Stop and name the pair. Which one is
current is a decision, not a drafting problem. Do not draft a partial boundary and do not fill the
gap from the repository — the repository can supply a fact, and none of these four
is a fact.

This is the gate. An item whose goal is undecided produces a boundary whose
entries were chosen by whoever drafted it, and it will lint clean:
`boundary/gh-158.yaml` was drafted this way and five of its nine entries are about
a design the item never mentions.

**2. Read what the item names.** This is the expensive step and it is the one that
matters. Find what the item does not say: the consumer that breaks, the constant
that must change, the test that does not exist. An item describes a symptom.

**Bound it by the item, not by the repository.** Read the things the item names —
its files, its components, its behaviours — and the direct consumers of those.
Stop when every named thing has been read once.

Without a bound this is a search with no floor. Search questions have a near-zero
found-nothing rate, which is why a reviewer asked what is wrong with this code
manufactures findings; see constraint 3 in the modus README. The same shape
applies here. A run of this step against a whole repository passed eighteen
minutes and returned nothing.

**3. Write the interpretation.** Goal, problem, and one entry per claim. Declare
provenance for each:

| | |
| --- | --- |
| `stated` | the item says it and the repo corroborates it |
| `stated_unverified` | the item says it and nothing settles it either way |
| `inferred` | the repo, logs, or history supply it; the item is silent |
| `contradicted` | the item asserts it and the repo shows otherwise |

A `contradicted` claim needs a correction saying what the repo shows instead, and
`moves_surface: true` if correcting it changes what gets built. That is a terminal:
the run stops and a human decides. It is the right outcome, not a failure.

A `stated_unverified` claim cannot ground a `must`.

**4. Find the coupling.** What consumes the thing being changed. Every coupling edge
maps in `entails` to an obligation or the literal `uncovered`.

**5. Write the entries.** Each needs `statement`, `observation`, `decision`,
`verifier`, `verification_stage`, `obligation`, `mandate`, `traces`, `quantitative`.
A `mechanical` + `pre_merge` + `must` also needs `test_role` and `baseline`: a
`change` test fails on base, a `preservation` test passes on both.

A preservation entry needs a probe that would make it fail. Without one, `pass` on
base and head is satisfied by `assert True`.

**5b. Check coverage of the item.** List the item's criteria. Against each, name
the entry that covers it. Then name every criterion with no entry.

A criterion with no entry is one of two things, and you have to say which: out of
scope, in which case it belongs in `non_goals`; or an obligation nobody wrote.

This is the failure that has actually happened, twice, and a reviewer caught it
both times. `boundary/gh-158.yaml` left six of the item's seven criteria with no
obligation. `docs/passes/pass6/boundary.yaml` left two. Both linted clean first:
the linter checks whether the manifest is internally consistent and never checks
whether it covers the item.

**6. Apply the prose rules** in `${CLAUDE_PLUGIN_ROOT}/prompts/boundary-prose.md`.
Every `decision` must be able to be false. Word caps are enforced.

**7. Lint it, twice.**

First locate the linter. It ships in the modus plugin at `scripts/lint-boundary.js`.
Do not use `${CLAUDE_PLUGIN_ROOT}` — that is a config-time template variable
expanded in `hooks.json`, and it is unset in a shell on both Claude Code and Codex.

```bash
# working inside the modus repository
LINT=modus/scripts/lint-boundary.js

# installed as a plugin. CODEX_HOME defaults to ~/.codex when unset; expanding it
# bare yields /plugins/cache, an absolute path from root that matches nothing.
[ -f "$LINT" ] || LINT=$(find \
  "$HOME/.claude/plugins/cache" \
  "${CODEX_HOME:-$HOME/.codex}/plugins/cache" \
  -path '*/modus/*/scripts/lint-boundary.js' 2>/dev/null | tail -1)
```

If that finds nothing, locate `scripts/lint-boundary.js` inside the modus plugin
yourself rather than adding another case here. `find` is used instead of a glob
because an unmatched glob fails outright under zsh.

The CLI checks everything except whether your citations point at real parts of the
item:

```bash
node "$LINT" boundary/<item>.yaml
```

It takes file paths and `--evidence` only. There is no flag for the part list, so
run this second form as well — it is the check that catches a citation pointing at
nothing, and it found a real error the first time this skill was used:

```bash
node -e '
const L = require(require("path").resolve(process.argv[1]));
const r = L.lintBoundary(L.load(process.argv[2]), {
  itemParts: ["description#1", "description#2"]   // every part id the item has
});
console.log("failures:", L.failures(r).map(f => f.code));
console.log("warnings:", L.warnings(r).map(f => f.code));
console.log("exempt:  ", r.filter(x => x.outcome === "exempt").length);
' "$LINT" boundary/<item>.yaml
```

`failures` must be empty. Warnings are recorded, not gating. **`exempt` must be
zero** — a non-zero count means a check declared it had no domain and did not run,
which is not the same as passing.

Omitting `itemParts` makes every `item_locator` check exempt itself. The boundary
then looks clean while its citations are unverified.

**8. Have it reviewed by someone who did not write it.** Ask exactly two questions:

- Which entries' `decision` could you not evaluate against that entry's own
  `observation`? Ids only.
- Do you have a blocking question about **what is wanted** that you cannot answer
  from the boundary and the item?

Do not ask "would you implement from this". That invites answers about how and
where to build, which is the next phase and will send you in circles.

**9. Stop by the rule, not by running out of findings.** Refinement is done when a
fresh agent can say what must be true, how it would tell, what must keep working,
what is out of scope, and what is handed off — and has no blocking question about
what is wanted. Questions about how or where to build do not block.

Stop at the first draft that passes. Structure added past that point is cost with
no return.

A reviewer must name a specific undecidable requirement. General dissatisfaction is
not a finding.

**9b. Write the run out where it can be re-read.** If a `docs/passes/` directory
exists, find the highest-numbered `passN` inside it and write your boundary and
your review answers there. Elsewhere, do nothing — the directory is this
repository's, not part of the plugin.

A boundary that passed review holds no record of what review found. Pass 6's
boundary passed both lint forms and then failed review on four counts, and the
only account of that is the file it was written to.

**10. A human approves, then freeze.** The freeze is the commit. After it, the
boundary is the standard: if implementation makes it look wrong, stop and escalate
rather than edit it.

## Failure modes

Observed in real drafted boundaries. Check for each before review.

| Defect | Looks like |
| --- | --- |
| unevaluable decision | "judged usable", "works correctly" — nothing that can be false |
| status label as a decision | `recorded, not gated` on a watch entry, which states no condition |
| two claims in one field | an `and` joining two separately falsifiable things |
| open list | a check that references "hedges and so on" and cannot return a definite answer |
| gameable obligation | schema-valid output that ignores its input entirely |
| a reason in a field | fields state the obligation; reasons go in a comment |
| decision the observation cannot answer | the observation collects a population and the decision names one case, so nothing aggregates the two |
| statement and decision disagree | one states containment in the opposite direction from the other; both read well alone |

## Out of scope

Do not implement anything. Do not approve or freeze on the human's behalf. Do not
edit a frozen boundary.
