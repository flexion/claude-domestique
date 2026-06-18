# Stilus Writing Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `stilus` plugin to the claude-domestique marketplace that drafts prose in a project's voice and then removes AI slop, via an adaptive write/edit/revise/review pipeline.

**Architecture:** A skill-and-agent plugin (no JS hooks). The `write` skill is the on-demand orchestrator: it resolves a voice profile (project → user → plugin base), drafts in that voice, then dispatches three subagents — `deslop` (subtractive edit), `reviser` (adjudicate + restructure), `reviewer` (read-only judge) — escalating depth by the piece's stakes. deslop is the existing agent, shipped as-is, and is the single source of truth for the slop catalog; every other phase references it rather than restating it.

**Tech Stack:** Markdown prompt files (agents, skill, rules, context), JSON manifests (`plugin.json`, `package.json`, `marketplace.json`). Node only for the version/validation scripts already in the repo. No test framework — like agent-artifex, this plugin is pure prompts/config; verification is JSON validity plus structural/frontmatter checks plus a manual smoke test.

## Global Constraints

- **Initial version: `0.1.0`**, seeded in `stilus/package.json` and `.claude-plugin/marketplace.json`. `stilus/.claude-plugin/plugin.json` carries **no** version field (version is maintained at the marketplace/package level only).
- **No JS tests.** This plugin ships no Jest suite (agent-artifex precedent). Verification is inline commands, not committed tests.
- **deslop ships essentially as-is.** Copy the existing agent verbatim. The orchestrator never invokes its standalone drafting path.
- **On-demand only.** No hooks, no SessionStart/UserPromptSubmit injection, no global context.
- **Cross-reference, never restate.** The subtractive catalog + shared craft (lead with the point, sentence rhythm, accuracy over precision) live in `deslop`. The voice base, reviser, reviewer, and any project voice profile reference these; they do not restate them.
- **Voice scan order:** project `.claude/rules/voice.md` → user `~/.claude/rules/voice.md` → plugin `rules/voice.md` base. Higher tier overrides lower per section.
- **Commit format:** `chore - <lowercase description>`, HEREDOC, no attribution, no emojis (repo convention). Work happens on branch `chore/add-stilus-plugin` (already created).
- **Out of scope:** migrating the personal `writing` skill into a voice profile; optional `/stilus:deslop` and `/stilus:review` commands; fixing agent-artifex's missing package.json.

## File Structure

Files created/modified, each with one responsibility:

- `stilus/.claude-plugin/plugin.json` — plugin manifest (name, description, author, keywords). No version.
- `stilus/package.json` — version source of truth for `bump-version.js`. No deps, no tests.
- `stilus/README.md` — what the plugin is and how to use it.
- `stilus/agents/deslop.md` — Edit phase. Subtractive. Owns the slop catalog (copied verbatim from the source agent).
- `stilus/agents/reviser.md` — Revise phase. Adjudicates deslop's cuts and fixes structure.
- `stilus/agents/reviewer.md` — Review phase. Independent, read-only judge.
- `stilus/skills/write/SKILL.md` — Write phase + adaptive orchestrator. Entry point.
- `stilus/rules/voice.md` — Generic voice base: profile schema + neutral defaults.
- `stilus/context/authoring-a-voice.md` — Companion: how to author a project voice profile.
- `.claude-plugin/marketplace.json` — add the `stilus` entry (modify).
- `scripts/bump-version.js` — add `'stilus'` to the `PLUGINS` array (modify, line 16).
- `CLAUDE.md` — version-bump note, repo-structure tree, Context Ownership table (modify).

Task order: 1 (scaffold + registration) → 2 (deslop) → 3 (voice base + companion) → 4 (reviser) → 5 (reviewer) → 6 (orchestrator skill) → 7 (docs + final validation). Task 6 references the outputs of 2–5, so it comes after them.

---

### Task 1: Plugin scaffold, manifest, and marketplace registration

**Files:**
- Create: `stilus/.claude-plugin/plugin.json`
- Create: `stilus/package.json`
- Create: `stilus/README.md`
- Modify: `.claude-plugin/marketplace.json` (add `stilus` entry after `agent-artifex`)
- Modify: `scripts/bump-version.js:16` (add `'stilus'` to `PLUGINS`)

**Interfaces:**
- Produces: a registered plugin named `stilus` at source `./stilus`, version `0.1.0`, bumpable via `node scripts/bump-version.js stilus <type>`.

- [ ] **Step 1: Create `stilus/.claude-plugin/plugin.json`**

````json
{
  "name": "stilus",
  "description": "Stilus — adaptive writing pipeline: draft in a project's voice, then remove AI slop. Write, edit, revise, and review prose with deslop as the subtractive base and a project-supplied voice layer.",
  "author": {
    "name": "Flexion"
  },
  "repository": "https://github.com/flexion/claude-domestique",
  "homepage": "https://github.com/flexion/claude-domestique",
  "license": "MIT",
  "keywords": [
    "writing",
    "editing",
    "prose",
    "voice",
    "deslop",
    "flexion"
  ]
}
````

- [ ] **Step 2: Create `stilus/package.json`**

````json
{
  "name": "stilus",
  "version": "0.1.0",
  "description": "Stilus — adaptive writing pipeline (write/edit/revise/review) with deslop as the subtractive base",
  "private": true,
  "license": "MIT"
}
````

- [ ] **Step 3: Create `stilus/README.md`**

````markdown
# stilus

Adaptive writing pipeline for Claude Code. Draft prose in a project's voice, then remove AI slop.

Latin for the writing instrument and the root of "style."

## What it does

`stilus` runs prose through up to four phases, escalating depth to match what a piece is worth:

1. **Write** — draft in the project's voice (additive).
2. **Edit** — remove slop line by line with the `deslop` agent (subtractive; changes how, never what).
3. **Revise** — adjudicate deslop's cuts and fix structure so the piece leads with the point.
4. **Review** — an independent, read-only judge checks fit, surviving tells, accuracy, and register.

A Slack message gets write → edit. A document gets write → edit → revise. A white paper gets all four.

## On-demand only

`stilus` ships no hooks and injects no global context. The `write` skill triggers when you are drafting or editing prose to send or publish, and costs nothing otherwise.

## Voice profiles

`stilus` carries no personality. A project supplies its own voice in `.claude/rules/voice.md`:

```yaml
---
extends: stilus/voice.md
domain: voice
---
```

Fill in the sections from `rules/voice.md`. A personal default can live at `~/.claude/rules/voice.md` and follows you across repos. Precedence: project over user over the plugin base. See `context/authoring-a-voice.md`.

## Single source of truth

The slop catalog and shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the `deslop` agent. The voice layer, reviser, and reviewer reference them; they never restate them.
````

- [ ] **Step 4: Add the `stilus` entry to `.claude-plugin/marketplace.json`**

Insert this object as the last element of the `plugins` array, after the `agent-artifex` entry (add a comma after the `agent-artifex` closing brace):

````json
    {
      "name": "stilus",
      "source": "./stilus",
      "description": "Adaptive writing pipeline - draft in a project's voice, then remove AI slop via write/edit/revise/review phases",
      "version": "0.1.0"
    }
````

- [ ] **Step 5: Add `'stilus'` to the `PLUGINS` array in `scripts/bump-version.js`**

Change line 16 from:

````javascript
const PLUGINS = ['mantra', 'memento', 'onus', 'agent-artifex'];
````

to:

````javascript
const PLUGINS = ['mantra', 'memento', 'onus', 'agent-artifex', 'stilus'];
````

- [ ] **Step 6: Verify all JSON is valid and the registration is consistent**

Run:
````bash
node -e "JSON.parse(require('fs').readFileSync('stilus/.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('stilus/package.json','utf8')); const m=JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); const e=m.plugins.find(p=>p.name==='stilus'); if(!e) throw new Error('stilus missing from marketplace'); if(e.version!=='0.1.0') throw new Error('version != 0.1.0'); if(e.source!=='./stilus') throw new Error('bad source'); console.log('OK: plugin.json, package.json, marketplace entry valid');"
node -e "const s=require('fs').readFileSync('scripts/bump-version.js','utf8'); if(!/PLUGINS\s*=\s*\[[^\]]*'stilus'/.test(s)) throw new Error('stilus not in PLUGINS'); console.log('OK: stilus in bump-version PLUGINS');"
````
Expected: `OK: plugin.json, package.json, marketplace entry valid` then `OK: stilus in bump-version PLUGINS`.

- [ ] **Step 7: Commit**

````bash
git add stilus/.claude-plugin/plugin.json stilus/package.json stilus/README.md .claude-plugin/marketplace.json scripts/bump-version.js
git commit -m "$(cat <<'EOF'
chore - scaffold stilus plugin and register in marketplace

- add plugin.json, package.json, README
- register stilus 0.1.0 in marketplace.json
- add stilus to bump-version PLUGINS so it is bumpable
EOF
)"
````

---

### Task 2: deslop agent (Edit phase)

**Files:**
- Create: `stilus/agents/deslop.md` (verbatim copy of the existing agent)

**Interfaces:**
- Produces: a subagent named `deslop` (frontmatter `name: deslop`, `tools: Read, Edit, Write, Grep, Glob`) that the orchestrator dispatches for the Edit phase. Owns the slop catalog referenced by reviser, reviewer, and the voice base.

- [ ] **Step 1: Copy the source agent verbatim**

Run:
````bash
mkdir -p stilus/agents
cp /Users/dpuglielli/github/flexion/nucor-bar-mill-schedule/.claude/agents/deslop.md stilus/agents/deslop.md
````

If that source path no longer exists, the full content was read into the design conversation and is reproduced in the spec history; recreate `stilus/agents/deslop.md` from that content. The file must begin with frontmatter:
````
---
name: deslop
description: Use to remove AI slop from prose or to draft prose without it; ...
tools: Read, Edit, Write, Grep, Glob
---
````

- [ ] **Step 2: Verify the file is present, non-empty, and has valid frontmatter**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/agents/deslop.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*deslop/.test(m[1])) throw new Error('name != deslop'); if(!/tools:/.test(m[1])) throw new Error('no tools'); if(c.length < 2000) throw new Error('suspiciously short ('+c.length+' chars)'); console.log('OK: deslop agent present, '+c.length+' chars, frontmatter valid');"
````
Expected: `OK: deslop agent present, <N> chars, frontmatter valid` (N is several thousand).

- [ ] **Step 3: Commit**

````bash
git add stilus/agents/deslop.md
git commit -m "$(cat <<'EOF'
chore - add deslop agent as the stilus edit phase

- subtractive editor, shipped verbatim
- single source of truth for the slop catalog
EOF
)"
````

---

### Task 3: Voice base and companion doc

**Files:**
- Create: `stilus/rules/voice.md`
- Create: `stilus/context/authoring-a-voice.md`

**Interfaces:**
- Produces: `stilus/voice.md` as the `extends:` target for project profiles, defining the profile schema (persona, registers, vocabulary, mode guidance, additive craft) with neutral defaults. Consumed by the `write` skill (Task 6), reviser (Task 4), and reviewer (Task 5).

- [ ] **Step 1: Create `stilus/rules/voice.md`**

````markdown
---
name: voice-base
domain: voice
description: Generic voice base for the stilus writing pipeline. Projects extend this with their own register; the Write phase resolves and reads it.
---

# Voice (generic base)

This file defines the shape of a voice profile and supplies neutral defaults. It carries no personality. The Write phase of stilus reads the resolved voice — project profile over user profile over this base — and drafts in it.

## How a project supplies its voice

Create `.claude/rules/voice.md` in the project (or `~/.claude/rules/voice.md` for a personal default that follows you across repos) with this frontmatter:

```yaml
---
extends: stilus/voice.md
domain: voice
---
```

Fill in the sections below. A section you omit falls back to the default here. A section you supply overrides it. Precedence: project profile over user profile over this base.

## What this base does not define

The subtractive catalog (slop patterns, banned constructions, density budgets) and the craft that both drafting and editing share (lead with the point, sentence rhythm, accuracy over precision) live in the deslop agent. This base references them; it never restates them. A voice profile should not restate them either.

## Profile sections

### Persona

Who is writing, in one or two sentences: role, relationship to the audience, the stance the prose takes. Default: a neutral technical author with no personality, who states what a thing does and what it costs.

### Registers

The named registers the author moves between, each with its markers. A project may define one or several. Default: a single neutral analytical register — plain, ordered, unsentimental.

### Preferred and elevated vocabulary

The words this author reaches for, and the rule for when. Default: plain words; no elevated diction.

### Mode guidance

Per-medium conventions. Fill in only the modes that matter.

- Email — opener, body order, length, sign-off. Default: name the recipient, lead with the ask or the answer, keep it short.
- Slack — Default: one or two sentences, no greeting in active threads.
- Document or article — Default: topic sentences carry the argument; headers only when the length needs navigation.
- White paper or report — Default: short paragraphs, argument-driven, specific numbers.

### Additive craft

Positive moves this author makes that deslop does not own:

- Register-driven generation — produce text in the resolved register, not a generic one.
- Specificity — use the specific number, date, or name when it is available and true.
- Equip the reader to act — give the reader everything needed to decide without a follow-up round.
- Analogy as translation — when explaining across domains, map the structure, do not simplify.
````

- [ ] **Step 2: Create `stilus/context/authoring-a-voice.md`**

````markdown
# Authoring a voice profile

A voice profile teaches stilus to draft in your register instead of a generic one. It lives in `.claude/rules/voice.md` (per project) or `~/.claude/rules/voice.md` (personal default), and extends the plugin base at `stilus/voice.md`.

## What a profile is for

The profile is the additive layer. It says how this author sounds and what they reach for. It does not list banned words or slop patterns — those live in the deslop agent, and the edit phase applies them after drafting. Keep the profile to voice, not to bans.

## Skeleton

Copy this and fill it in. Delete any section you have no opinion on; the base default applies.

```markdown
---
extends: stilus/voice.md
domain: voice
companion: .claude/context/voice-notes.md
---

# Voice

## Persona
One or two sentences: who writes, to whom, with what stance.

## Registers
### <register name>
When it is used, and three to five concrete markers (sentence shapes, moves, tics this author owns).

## Preferred and elevated vocabulary
Words this author reaches for, and the test for when a word earns its place.

## Mode guidance
### Email
Opener, body order, length, sign-off.
### <other modes that matter>

## Additive craft
Moves specific to this author beyond the base defaults.
```

## How it resolves

When you run the write skill, stilus reads the project profile, then the user profile, then the base, and merges them section by section with the higher tier winning. It announces which profile it used. The `companion:` field, if present, points at a longer notes file in `.claude/context/` that stilus also reads.

## Keep it honest

Profiles describe a real voice. If you do not have a settled register for a mode, leave it out rather than invent one. The base default is neutral and safe.
````

- [ ] **Step 3: Verify both files exist and the base has valid frontmatter**

Run:
````bash
node -e "const fs=require('fs'); const v=fs.readFileSync('stilus/rules/voice.md','utf8'); const m=v.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('voice.md: no frontmatter'); if(!/domain:\s*voice/.test(m[1])) throw new Error('voice.md: domain != voice'); if(!/deslop/.test(v)) throw new Error('voice.md does not reference deslop'); fs.readFileSync('stilus/context/authoring-a-voice.md','utf8'); console.log('OK: voice base + companion present, base references deslop');"
````
Expected: `OK: voice base + companion present, base references deslop`.

- [ ] **Step 4: Commit**

````bash
git add stilus/rules/voice.md stilus/context/authoring-a-voice.md
git commit -m "$(cat <<'EOF'
chore - add stilus voice base and authoring guide

- generic voice schema with neutral defaults
- defers slop catalog and shared craft to deslop by reference
EOF
)"
````

---

### Task 4: reviser agent (Revise phase)

**Files:**
- Create: `stilus/agents/reviser.md`

**Interfaces:**
- Consumes: a deslopped draft, deslop's report (cuts per category, before/after density rates), and the resolved voice profile.
- Produces: a subagent named `reviser` (`tools: Read, Edit, Write, Grep, Glob`) that returns revised text plus notes on restorations, reordering, and additions.

- [ ] **Step 1: Create `stilus/agents/reviser.md`**

````markdown
---
name: reviser
description: Revise phase of the stilus pipeline. Adjudicates deslop's cuts and fixes structure. Give it a deslopped draft (with deslop's report) and the resolved voice profile; it restores load-bearing material deslop removed, fixes the thesis and ordering so the piece leads with the point, and addresses completeness. Changes what is said where the piece needs it; makes minimal additions and re-cleans them.
tools: Read, Edit, Write, Grep, Glob
---

You revise. You run after the deslop agent has stripped a draft to its skeleton. Your job is to adjudicate that strip and fix structure, not to re-edit line by line.

## What you receive

- The deslopped draft.
- deslop's report: cuts per category, and before/after density rates.
- The resolved voice profile (project over user over base).

## What you do

1. Adjudicate the cuts. Read deslop's report. deslop is cut-biased and sometimes removes a load-bearing fact, qualifier, or transition the piece needs. Restore only what the piece genuinely needs. Leave the rest cut.
2. Fix structure. Make the piece lead with the point at the document and the paragraph level. Reorder so the most important fact comes first. Strengthen a weak or non-refutable thesis.
3. Address completeness. Name anything the reader needs that is missing, and add it.

## Contracts

- You may change what is said and reorder. This is the phase that does.
- Keep additions minimal. Re-clean anything you add against the deslop catalog before returning. Do not reintroduce slop.
- The subtractive catalog and the shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the deslop agent and the voice base. Reference them; do not restate them.
- Stay in the resolved voice. Do not flatten the author's register or vocabulary.

## What you return

The revised text, edited in place if you were given a file path. Then a short note: which cuts you restored and why, what you reordered, and what you added.
````

- [ ] **Step 2: Verify frontmatter and the may/may-not contract are present**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/agents/reviser.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*reviser/.test(m[1])) throw new Error('name != reviser'); if(!/Edit/.test(m[1])) throw new Error('reviser needs Edit tool'); if(!/do not restate/.test(c)) throw new Error('missing cross-reference discipline'); console.log('OK: reviser agent valid');"
````
Expected: `OK: reviser agent valid`.

- [ ] **Step 3: Commit**

````bash
git add stilus/agents/reviser.md
git commit -m "$(cat <<'EOF'
chore - add reviser agent as the stilus revise phase

- adjudicates deslop cuts, fixes structure and completeness
- references the deslop catalog rather than restating it
EOF
)"
````

---

### Task 5: reviewer agent (Review phase)

**Files:**
- Create: `stilus/agents/reviewer.md`

**Interfaces:**
- Consumes: the piece (after write → edit → revise), its stated purpose and audience, and the resolved voice profile.
- Produces: a read-only subagent named `reviewer` (`tools: Read, Grep, Glob` — no Edit/Write) that returns a verdict (`PASS`/`FAIL`) plus a findings list. The orchestrator routes a `FAIL`'s findings back to `reviser`.

- [ ] **Step 1: Create `stilus/agents/reviewer.md`**

````markdown
---
name: reviewer
description: Review phase of the stilus pipeline. An independent, read-only judge of finished prose. Give it the piece, its purpose and audience, and the resolved voice profile; it judges fit, flags surviving AI tells and density-budget violations, verifies no invented specifics, and confirms register match. It does not edit. Returns a verdict and findings; a fail sends the piece back to revise.
tools: Read, Grep, Glob
---

You review. You judge a finished piece against what it is for. You do not edit. You produce a verdict and findings, and the orchestrator decides whether to send the piece back.

## What you receive

- The piece, after write, edit, and revise.
- Its stated purpose and audience.
- The resolved voice profile.

## What you check

1. Purpose and audience fit. Does the piece do its job for this reader? Does it lead with the point, so a reader who stops early still has it?
2. Surviving tells. Run the deslop catalog's density budgets over the piece: contrast pivots, totalizing quantifiers, disguised lists, echoes. Report the per-1,000-word rates and flag any over budget. Flag any banned construction that survived.
3. Accuracy over precision. Flag any specific (number, date, name, citation) that reads as invented or unverified. A vague-but-true claim beats a precise-but-false one.
4. Register match. Does the piece sound like the resolved voice profile, in the right register for the mode?

## Contracts

- Read-only. You have no Edit or Write tool. You never change the piece.
- The subtractive catalog and the density budgets live in the deslop agent; reference them, do not restate them. The register lives in the voice profile.

## What you return

A verdict, PASS or FAIL, and a findings list. For each finding: the span, the category, and the specific fix. On FAIL, the orchestrator routes your findings back to the revise phase.
````

- [ ] **Step 2: Verify the reviewer is read-only and has the rubric**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/agents/reviewer.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*reviewer/.test(m[1])) throw new Error('name != reviewer'); if(/Edit|Write/.test(m[1].match(/tools:.*/)[0])) throw new Error('reviewer must NOT have Edit/Write'); if(!/PASS|FAIL/.test(c)) throw new Error('no verdict format'); console.log('OK: reviewer agent valid and read-only');"
````
Expected: `OK: reviewer agent valid and read-only`.

- [ ] **Step 3: Commit**

````bash
git add stilus/agents/reviewer.md
git commit -m "$(cat <<'EOF'
chore - add reviewer agent as the stilus review phase

- read-only judge: fit, surviving tells, accuracy, register
- returns PASS/FAIL plus findings; fail loops back to revise
EOF
)"
````

---

### Task 6: Orchestrator skill (Write phase + pipeline)

**Files:**
- Create: `stilus/skills/write/SKILL.md`

**Interfaces:**
- Consumes: the voice base (`stilus/rules/voice.md`), and the `deslop`, `reviser`, and `reviewer` subagents from Tasks 2, 4, 5.
- Produces: the skill `stilus:write`, the plugin's on-demand entry point.

- [ ] **Step 1: Create `stilus/skills/write/SKILL.md`**

````markdown
---
name: stilus:write
description: Use when drafting, editing, polishing, or rewriting prose that will be sent or published — emails, Slack messages, documents, articles, white papers. Drafts in the project's voice, then runs an adaptive write/edit/revise/review pipeline. Do not use when the user wants information for themselves (research, debugging, brainstorming) and the output is not meant to be sent.
---

# Stilus — write

You run an adaptive writing pipeline. You draft in the project's voice, then escalate through edit, revise, and review as the piece warrants.

## Step 0 — Load the voice

Before drafting, resolve the voice profile:

1. Scan for a project voice:
   ```bash
   find .claude/rules -name '*.md' 2>/dev/null
   ```
2. Read any voice profile — match by frontmatter `domain: voice` or `extends: stilus/voice.md`, or by filename `voice.md`.
3. Read the user default at `~/.claude/rules/voice.md` if present.
4. Read the plugin base at this plugin's `rules/voice.md`.
5. Resolve precedence: project over user over base. A section present in a higher tier overrides the same section below it.
6. State the source: "Using voice from `<path>`" or "No project voice, using base."
7. Check for a companion: if a voice profile's frontmatter has a `companion:` field, read that file too.

## Step 1 — Classify and choose depth

Infer the mode (Slack, email, document, article, white paper) and the stakes.

- Default depth: write → edit → revise.
- Short or casual (Slack, a quick reply): write → edit.
- Published, external, or high-stakes (white paper, public post, anything sent to someone who matters): write → edit → revise → review.

Explicit user phrases override the default:

- "just draft" or "draft only" → write only.
- "edit only" or "deslop this" → edit only; the user supplied the text, so skip write.
- "full review" → force write → edit → revise → review.
- "critique only" → run deslop's critique phase, or the reviewer, without applying edits.

State the chosen depth in one line before proceeding.

## Step 2 — Write

Draft the piece in the resolved voice, here in this conversation, using the additive craft from the voice base. Do not restate the deslop catalog; the edit phase owns it.

## Step 3 — Edit (subtractive)

Launch the deslop subagent on the draft. It returns the edited text plus its report (cuts per category, before and after density rates). Keep the report; revise and review consume it.

## Step 4 — Revise (depth at least 3)

Launch the reviser subagent with the deslopped draft, deslop's report, and the resolved voice profile. It adjudicates the cuts, fixes structure, and addresses completeness, then returns revised text plus notes.

## Step 5 — Review (depth 4)

Launch the reviewer subagent with the piece, its purpose and audience, and the voice profile. It returns a verdict and findings.

- On PASS, deliver.
- On FAIL, route the findings back to the reviser once, then deliver. Do not loop more than once. Match effort to what the piece is worth.

## Subagents

Dispatch each phase to the matching agent shipped by this plugin: `deslop` (edit), `reviser` (revise), `reviewer` (review). If the platform namespaces plugin agents, use the namespaced name; the agent names are unique within this plugin.

## Output

Edit the file in place when given a path; return the text when given raw input. End with a one-line provenance note: which phases ran and what changed.
````

- [ ] **Step 2: Verify the skill frontmatter and that it references all three agents and the voice scan**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/skills/write/SKILL.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*stilus:write/.test(m[1])) throw new Error('name != stilus:write'); for(const a of ['deslop','reviser','reviewer']) if(!c.includes(a)) throw new Error('skill does not reference '+a); if(!/extends: stilus\/voice.md|domain: voice/.test(c)) throw new Error('no voice scan'); if(!/~\/.claude\/rules\/voice.md/.test(c)) throw new Error('no user-tier voice scan'); console.log('OK: orchestrator skill references all phases and the voice scan order');"
````
Expected: `OK: orchestrator skill references all phases and the voice scan order`.

- [ ] **Step 3: Commit**

````bash
git add stilus/skills/write/SKILL.md
git commit -m "$(cat <<'EOF'
chore - add stilus write skill as the adaptive orchestrator

- resolves voice (project > user > base), classifies depth
- dispatches deslop/reviser/reviewer; review loops to revise once
EOF
)"
````

---

### Task 7: Docs updates and final validation

**Files:**
- Modify: `CLAUDE.md` (version-bump note; repo-structure tree; Context Ownership table)

**Interfaces:**
- Produces: documentation consistent with the new plugin, and a whole-plugin validation gate.

- [ ] **Step 1: Add `stilus/` to the version-bump IMPORTANT note in `CLAUDE.md`**

Change:
````markdown
**IMPORTANT: Before completing work on any branch that modifies plugin files (mantra/, memento/, onus/, agent-artifex/), run `node scripts/bump-version.js <plugin> <patch|minor|major>` for each affected plugin. Do not merge without bumping.**
````
to:
````markdown
**IMPORTANT: Before completing work on any branch that modifies plugin files (mantra/, memento/, onus/, agent-artifex/, stilus/), run `node scripts/bump-version.js <plugin> <patch|minor|major>` for each affected plugin. Do not merge without bumping.**
````

- [ ] **Step 2: Update the Repository Structure tree in `CLAUDE.md`**

Change:
````markdown
claude-domestique/
├── .claude-plugin/          # Marketplace root plugin config
├── mantra/                  # Context refresh plugin
├── memento/                 # Session persistence plugin
└── onus/                    # Work item automation plugin
````
to:
````markdown
claude-domestique/
├── .claude-plugin/          # Marketplace root plugin config
├── mantra/                  # Context refresh plugin
├── memento/                 # Session persistence plugin
├── onus/                    # Work item automation plugin
├── agent-artifex/           # AI design & testing guidance plugin
└── stilus/                  # Writing pipeline plugin
````

- [ ] **Step 3: Add the `stilus` row to the Context Ownership table in `CLAUDE.md`**

Change:
````markdown
| **onus** | Git operations, work items | `rules/git.md`, `rules/work-items.md` |
````
to:
````markdown
| **onus** | Git operations, work items | `rules/git.md`, `rules/work-items.md` |
| **stilus** | Prose drafting and editing | `agents/deslop.md` (subtractive catalog), `rules/voice.md` (voice schema), `agents/reviser.md`, `agents/reviewer.md` |
````

- [ ] **Step 4: Validate the whole plugin's structure and JSON**

Run:
````bash
node -e "
const fs=require('fs'), path=require('path');
// JSON validity
JSON.parse(fs.readFileSync('stilus/.claude-plugin/plugin.json','utf8'));
JSON.parse(fs.readFileSync('stilus/package.json','utf8'));
const m=JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json','utf8'));
if(!m.plugins.find(p=>p.name==='stilus')) throw new Error('stilus missing from marketplace');
// every agent + skill has frontmatter with a name
const mdFiles=['stilus/agents/deslop.md','stilus/agents/reviser.md','stilus/agents/reviewer.md','stilus/skills/write/SKILL.md','stilus/rules/voice.md'];
for(const f of mdFiles){ const c=fs.readFileSync(f,'utf8'); const fm=c.match(/^---\n([\s\S]*?)\n---/); if(!fm) throw new Error(f+': no frontmatter'); if(!/name:/.test(fm[1])) throw new Error(f+': no name'); }
// plugin.json must NOT carry a version (marketplace-level only)
const pj=JSON.parse(fs.readFileSync('stilus/.claude-plugin/plugin.json','utf8'));
if('version' in pj) throw new Error('plugin.json must not carry a version');
// CLAUDE.md docs updated
const cm=fs.readFileSync('CLAUDE.md','utf8');
if(!/agent-artifex\/, stilus\//.test(cm)) throw new Error('version-bump note not updated');
if(!/\*\*stilus\*\* \| Prose drafting/.test(cm)) throw new Error('Context Ownership row missing');
console.log('OK: stilus plugin structure, JSON, and docs all valid');
"
````
Expected: `OK: stilus plugin structure, JSON, and docs all valid`.

- [ ] **Step 5: Manual smoke test (requires a live Claude Code session; not automated)**

This cannot be unit-tested — the deliverables are prompts. Verify behavior by hand:

1. Add the local marketplace if not already added, and install/enable `stilus`.
2. In a repo with no `.claude/rules/voice.md`, ask the skill to draft a short message. Confirm it announces "No project voice, using base" and runs write → edit (deslop).
3. Create a `.claude/rules/voice.md` with `extends: stilus/voice.md` and a distinctive register. Re-run. Confirm it announces "Using voice from `.claude/rules/voice.md`" and the draft reflects that register.
4. Ask for a "white paper" or say "full review." Confirm it escalates to write → edit → revise → review and that the reviewer returns a verdict.
5. Confirm the `deslop`, `reviser`, and `reviewer` agents are discoverable as subagents and that the orchestrator dispatches them.

Record the outcome in the PR description. If subagent dispatch needs a namespaced agent name on this platform, note the exact form.

- [ ] **Step 6: Commit**

````bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
chore - document stilus plugin in CLAUDE.md

- add stilus to version-bump note, repo structure, ownership table
EOF
)"
````

---

## Known limitations / optional follow-ups

- `bump-version.js` still reads the current version from `<plugin>/package.json`. stilus now has one, so it bumps correctly. agent-artifex still does not — a separate fix (give agent-artifex a `package.json`, or refactor `bump-version.js` to source the version from `marketplace.json`) is out of scope here.
- Optional `/stilus:deslop <file>` and `/stilus:review` commands for explicit single-phase invocation are deferred.
- Migrating the personal `writing` skill into a `~/.claude/rules/voice.md` profile is a separate task that also validates the abstraction.

## Self-Review

**Spec coverage.** Every spec section maps to a task: the four phase contracts → deslop (T2), reviser (T4), reviewer (T5), write/orchestrator (T6); component layout → all tasks; voice schema + scan order → T3 (base) and T6 (resolution); orchestrator behavior → T6; single source of truth → enforced by T2's catalog ownership and the cross-reference discipline in T3/T4/T5/T6; marketplace/versioning/tests → T1 and T7; the three spec open items → resolved (bump-version in T1; reviser/reviewer prompts in T4/T5; depth heuristics in T6 Step 1).

**Placeholder scan.** No "TBD"/"TODO"/"handle edge cases". The deslop copy names an exact source path plus a fallback. The only non-automated step (T7 Step 5) is explicitly labeled manual because prompt behavior has no unit-test harness.

**Type/name consistency.** Agent names are consistent across tasks and the orchestrator: `deslop`, `reviser`, `reviewer`. The skill name `stilus:write` matches its verification. The voice frontmatter contract (`extends: stilus/voice.md`, `domain: voice`) is identical in the base (T3), companion (T3), and the orchestrator's scan (T6). Version `0.1.0` is consistent across `package.json`, `marketplace.json`, and the validation in T7.
