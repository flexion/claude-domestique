# Stilus — Writing Plugin Design

**Date:** 2026-06-18
**Status:** Approved design, pending implementation plan
**Repo:** claude-domestique (new marketplace plugin)

## Overview

Stilus is a new plugin for the claude-domestique marketplace that turns the existing
`deslop` agent and the patterns behind a personal voice skill into a reusable,
distributable writing pipeline. It separates two layers of the writing craft that
overlap heavily today:

- **Subtractive (deslop):** changes how prose is said, never what; output is shorter;
  voice-neutral. Owns the slop catalog and density budgets.
- **Additive (voice):** produces prose in a project's own register and persona.
  Voice-bearing, but supplied by the consuming project rather than baked into the plugin.

The plugin runs these as an adaptive, on-demand pipeline of four phase contracts and
escalates depth to match what a piece is worth.

## Decisions

These forks were settled during brainstorming and drive the design:

1. **Two layers, generic voice.** Ship deslop as the subtractive base plus a configurable
   voice layer with no personal specifics baked in.
2. **Project-extension voice.** A project supplies its voice as a `.claude/rules/voice.md`
   that `extends: stilus/voice.md`, following the same convention `azure-devops.md` uses to
   extend `onus/work-items.md`. Scan order is project then user then plugin base, project
   winning.
3. **On-demand only.** No hooks, no global injection. The pipeline runs when the user is
   writing or editing, costing zero context budget otherwise.
4. **Adaptive escalation.** All four phase contracts exist; the orchestrator picks depth by
   artifact stakes. Default is write→edit→revise; it drops to write→edit for short or casual
   text and adds review for published or high-stakes work. Explicit user phrases override.
5. **Name: stilus.** Latin for the writing instrument and the root of "style"; fits the
   memento/mantra/onus/artifex family.
6. **Personal-skill migration is a separate follow-up,** not part of this spec.

## The four phase contracts

Each phase is a worker with an explicit "may / may not" so boundaries stay clean and each
can run as an isolated subagent.

- **Write** — additive, voice layer. Drafts from facts, notes, or an outline in the project's
  voice. Owns register and persona. The only phase that originates text. Runs in the
  orchestrator's own context, where the facts and intent live.
- **Edit** — subtractive, deslop. Removes slop line by line. Changes how, never what; output
  is shorter; never reorders the argument or adds. Deliberately cut-biased. This is the
  existing deslop agent, shipped essentially unchanged.
- **Revise** — adjudicate and restructure. The counterweight to deslop's aggression: restores
  load-bearing material that edit cut, fixes the thesis and ordering so the piece leads with
  the point, and addresses completeness. May change what is said and may reorder. Makes
  minimal additions and re-cleans anything it adds.
- **Review** — independent, read-only judge. The prose analog of `/mantra:assess` and code
  review. Does not edit. Judges against purpose and audience, flags surviving AI tells and
  density-budget violations, verifies no invented specifics (accuracy over precision),
  confirms register match. Emits a verdict plus findings; a fail loops back to revise.

### Ordering rationale (edit before revise)

Edit runs before revise because deslop is cut-biased. Edit strips to the skeleton, then
revise adjudicates on the lean draft and selectively restores. Revise is a selective undo
plus a structural pass, not a fresh rewrite. The risk that revise reintroduces prose needing
cleanup is held in check by keeping revise's additions minimal and re-desloping them.

## Component layout

```
stilus/
├── .claude-plugin/plugin.json     # manifest (author: Flexion; keywords)
├── README.md
├── skills/
│   └── write/SKILL.md             # Write phase + adaptive orchestrator (entry point;
│                                  #   auto-triggers on writing/editing tasks)
├── agents/
│   ├── deslop.md                  # Edit phase — subtractive. Owns the slop catalog (SSOT)
│   ├── reviser.md                 # Revise phase — adjudicate + restructure
│   └── reviewer.md                # Review phase — independent, read-only judge
├── rules/
│   └── voice.md                   # Generic voice BASE: profile schema + neutral defaults
│                                  #   (projects `extends:` this)
└── context/
    └── authoring-a-voice.md       # Companion: how to write a project voice profile
```

The orchestrator skill owns Write and dispatches Edit, Revise, and Review to the three
subagents as the chosen depth requires. This keeps each phase's editing churn out of the main
context and keeps Review genuinely independent of the author.

Optional thin commands (`/stilus:deslop <file>`, `/stilus:review`) for explicit single-phase
invocation are out of scope for v1.

## Voice profile: schema and scan order

`rules/voice.md` is the generic base. It defines the sections a project fills in, with neutral
defaults and nothing personal:

- **persona/identity** — default: neutral technical author, no personality.
- **registers** — the concept; a project names its own; default: one neutral analytical register.
- **preferred/elevated vocabulary** — default: plain.
- **mode guidance** — email, Slack, document, article skeletons.
- **additive craft** — register-driven generation, specificity (use the specific number,
  date, or name), equip the reader to act, analogy as translation.

The base defers two things to deslop by cross-reference, never restating either: the entire
subtractive and banned-construction catalog, and the shared craft deslop already owns (lead
with the point, sentence rhythm, accuracy over precision).

A project supplies its voice with a `.claude/rules/voice.md`:

```yaml
---
extends: stilus/voice.md
domain: voice
---
```

The orchestrator's preamble scans `.claude/rules` and matches by `domain: voice` or
`extends: stilus/voice.md`, the same way onus commands match project rules. Scan and
precedence order:

1. project `.claude/rules/voice.md`
2. user `~/.claude/rules/voice.md` (optional personal default that follows the user across repos)
3. plugin `rules/voice.md` base

Project overrides user overrides base.

## Orchestrator behavior

The `write` skill runs the pipeline on demand:

1. **Load voice.** Scan project, user, then base; announce which loaded ("Using voice from
   `.claude/rules/voice.md`" or "No project voice, using base"), mirroring how onus announces
   project rules.
2. **Classify and choose depth.** Infer mode (Slack, email, document, article, white paper)
   and stakes. Default write→edit→revise; drop to write→edit for short or casual text; add
   review for published, external, or high-stakes work. Explicit user phrases override
   ("just draft," "edit only," "full review," "critique only").
3. **Write** in the resolved voice.
4. **Edit.** Dispatch deslop; it returns edited text plus its report (cuts per category,
   before/after density rates).
5. **Revise** (depth ≥ 3). Dispatch reviser; it adjudicates deslop's cuts, fixes
   thesis/ordering/completeness, makes minimal additions and re-cleans them.
6. **Review** (depth = 4). Dispatch reviewer for a verdict plus findings. On fail, loop back
   to revise once (bounded, to avoid churn). On pass, deliver.

I/O contract matches deslop today: edit a file in place when given a path, return text when
given raw input, plus a compact provenance line stating which phases ran and what changed.

## Single source of truth

No phase restates another's catalog. This applies the project's existing Context Ownership
rule to the new plugin.

| Concept | Owner | References it |
|---|---|---|
| Subtractive catalog + shared craft (lead with the point, sentence rhythm, accuracy over precision, earned roughness, hidden work) | deslop | reviser, reviewer, voice base |
| Additive craft (register-driven generation, specificity, equip the reader, analogy) + profile schema (persona, registers, vocabulary, modes) | voice base | write, reviser, reviewer |
| Whole-piece judgment rubric (purpose/audience, surviving tells, register match) | reviewer | — |

deslop ships essentially as-is. The orchestrator never invokes its standalone drafting path,
because Write owns drafting.

## Marketplace, versioning, tests

- **Marketplace.** Add a `stilus` entry to `marketplace.json` and a `plugin.json` (author
  Flexion; keywords: writing, editing, prose, voice, deslop). Start at version 0.1.0, like
  agent-artifex.
- **Tests.** None. Like agent-artifex, stilus is pure skills, agents, and markdown with no JS
  hooks, so there is no Jest suite to add. Revisit only if the optional commands introduce JS.
- **Docs.** Update `CLAUDE.md` (Context Ownership table, the version-bump plugin list, repo
  structure) and the marketplace root.

## Out of scope

- Migrating the personal `writing` skill into a `~/.claude/rules/voice.md` profile. Separate
  follow-up once the plugin is proven.
- Optional single-phase commands (`/stilus:deslop`, `/stilus:review`).
- Any always-on hook or global injection.

## Open items to resolve in the implementation plan

- **bump-version.js with a package-less plugin.** The script updates `package.json` and
  `marketplace.json`, but agent-artifex ships no `package.json`. The plan must confirm whether
  bump-version handles a package-less plugin or whether stilus seeds its initial 0.1.0 version
  directly in `marketplace.json`.
- **Exact reviser and reviewer prompts.** Author these so their contracts hold and so they
  reference deslop and the voice base rather than restating either.
- **Depth-classification heuristics.** Pin the signals the orchestrator uses to infer mode and
  stakes, and the override vocabulary.
