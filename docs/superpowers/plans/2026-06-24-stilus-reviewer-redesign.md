# Stilus Reviewer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unbuilt single stilus `reviewer` agent with an orchestrated review phase — three parallel read-only specialists plus orchestrator synthesis — exposed standalone via `/stilus:review` and reviewing along four dimensions (correctness, graded slop, human perception, AI-perception round-trip).

**Architecture:** A skill/agent/command plugin addition, no JS. The review phase fans out to three read-only subagents (`review-correctness`, `review-voice`, `review-summary`), then synthesizes in the orchestrator's own context — comparing the blind summary to the intended point, merging findings, scoring each dimension, and writing a verdict-bearing report. All shared synthesis logic lives in one context doc so the command and (later) the write skill do not duplicate it.

**Tech Stack:** Markdown prompt files (agents, command, context doc), edits to `README.md` and `CLAUDE.md`. No test framework — like agent-artifex and the rest of stilus, this is pure prompts/config; verification is frontmatter/structure checks via inline `node` plus a manual smoke test.

## Global Constraints

- **No JS tests.** This plugin ships no Jest suite. Verification is inline `node -e` checks, not committed tests.
- **All three specialists are read-only.** No `Edit`, no `Write`, ever. `review-summary` gets `Read` only; `review-voice` gets `Read, Grep, Glob`; `review-correctness` gets `Read, Grep, Glob, WebSearch, WebFetch`.
- **The blind summarizer is blind.** `review-summary` receives ONLY the prose — never the purpose, audience, or intended point. Its blindness is the mechanism for the AI-perception test.
- **deslop is the single source of truth for the slop catalog.** `stilus/agents/deslop.md` is NOT modified by this plan. The specialists reference it (catalog, density budgets, accuracy-over-precision); they never restate it.
- **Every finding is grounded in a direct quotation** from the reviewed document. A finding without a quotation does not ship.
- **Synthesis runs in the orchestrator (main context),** never in a subagent. The shared synthesis logic lives once in `stilus/context/reviewing.md`; the command and the write skill reference it.
- **On-demand only.** No hooks, no global injection.
- **Version: stilus stays at `0.1.0`.** stilus is introduced by this branch and has never shipped; `0.1.0` is its introductory version, so there is nothing to bump from. Do not run `bump-version.js` for this plan.
- **Commit format:** `chore - <lowercase description>`, HEREDOC, no attribution, no emojis. Work continues on branch `chore/add-stilus-plugin`.
- **Out of scope:** building the `reviser` agent and the `write` skill (separate work from the original `2026-06-18-stilus-writing-plugin.md` plan); wiring the review phase into the write skill's review step (a thin reference to `context/reviewing.md`, done when the write skill is built); changing `deslop.md`, `reviser.md`, or `rules/voice.md`.

## File Structure

Files created or modified, each with one responsibility:

- `stilus/agents/review-summary.md` — **Create.** Blind summarizer. Reports what a cold reader extracts. Feeds the AI-perception dimension.
- `stilus/agents/review-voice.md` — **Create.** Slop detection graded 1–5 plus the human-perception read. Owns the severity scale and the perception rubric.
- `stilus/agents/review-correctness.md` — **Create.** Internal soundness, verify-when-possible, and the claims-to-verify-by-hand list. Owns the correctness rubric.
- `stilus/context/reviewing.md` — **Create.** The orchestrator's playbook: intent capture, fan-out, AI-perception comparison, dedup, dimension scoring, verdict thresholds, report format. SSOT for synthesis.
- `stilus/commands/review.md` — **Create.** The `/stilus:review` standalone entry point. Thin; defers to `context/reviewing.md`.
- `stilus/README.md` — **Modify.** Update the Review bullet and SSOT line; mention `/stilus:review` and the four dimensions.
- `CLAUDE.md` — **Modify.** Add the stilus row to the Context Ownership table.

Task order: 1 (review-summary) → 2 (review-voice) → 3 (review-correctness) → 4 (reviewing.md, which references all three agents) → 5 (command, which references reviewing.md) → 6 (docs + whole-plugin validation + manual smoke test).

---

### Task 1: review-summary agent (blind summarizer)

**Files:**
- Create: `stilus/agents/review-summary.md`

**Interfaces:**
- Produces: a read-only subagent named `review-summary` (`tools: Read`) that receives only prose and returns a cold reader's takeaway (the point in one sentence, key claims, the two-sentence "what was this about", and where it stalled). The orchestrator (`context/reviewing.md`, Task 4) dispatches it and feeds its output into the AI-perception comparison.

- [ ] **Step 1: Create `stilus/agents/review-summary.md`**

````markdown
---
name: review-summary
description: Blind summarizer for the stilus review phase. Give it ONLY a piece of prose (a file path or raw text) and nothing else — no intended point, no purpose, no rubric. It reports what a cold reader takes away: the point in one sentence, the key claims, a two-sentence "what was this about", and where it stalled. Used to test AI perception — whether the writing's point survives an independent machine read.
tools: Read
---

You are a cold reader. You receive a piece of prose and nothing else: no statement of what it is for, no intended takeaway, no checklist. Report only what the text itself conveys to you on a first read.

## What you receive

A file path to read, or raw text. Nothing about its purpose, audience, or intended point. If any context about intent reached you, ignore it; your value is that you did not know.

## What you do

Read the piece once, as a reader who will act on it or pass it along. Then report:

1. **The point, in one sentence.** What is this piece actually saying? If you cannot find a single point, say so — that is itself the finding.
2. **Key claims.** The three to six load-bearing claims you would carry away.
3. **What you would tell someone.** If a colleague asked "what was that about?", your two-sentence answer.
4. **Where you stalled.** Any passage you had to reread, skip, or could not parse. Name the span.

## Contracts

- Read-only. You never edit.
- Do not judge quality, grade slop, or check facts. You only report what got through to you.
- Do not flatter the text or fill gaps. If the point did not land, report that it did not. A blank or muddled takeaway is the most useful result you can return.
- Report what you actually extracted, not what you infer the author probably meant.

## What you return

The four items above, plainly, with no preamble.
````

- [ ] **Step 2: Verify the file is present, blind, and read-only**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/agents/review-summary.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*review-summary/.test(m[1])) throw new Error('name != review-summary'); const t=m[1].match(/tools:.*/)[0]; if(/Edit|Write|Grep|Glob/.test(t)) throw new Error('summarizer must be Read-only: '+t); if(!/cold reader/.test(c)) throw new Error('missing cold-reader framing'); if(!/never edit/i.test(c)) throw new Error('missing read-only contract'); console.log('OK: review-summary present, blind, Read-only');"
````
Expected: `OK: review-summary present, blind, Read-only`.

- [ ] **Step 3: Commit**

````bash
git add stilus/agents/review-summary.md
git commit -m "$(cat <<'EOF'
chore - add stilus review-summary blind summarizer agent

- read-only cold reader; sees only the prose, no intent
- feeds the AI-perception round-trip in synthesis
EOF
)"
````

---

### Task 2: review-voice agent (graded slop + human perception)

**Files:**
- Create: `stilus/agents/review-voice.md`

**Interfaces:**
- Consumes: the piece and the resolved voice profile.
- Produces: a read-only subagent named `review-voice` (`tools: Read, Grep, Glob`) returning slop findings each graded 1–5 with a quoted span, the deslop category, the reason, and a fix; the per-1,000-word density rates; and the human-perception read (a keep-reading verdict plus bail-point spans). Owns the 1–5 severity scale and the human-perception rubric.

- [ ] **Step 1: Create `stilus/agents/review-voice.md`**

````markdown
---
name: review-voice
description: Voice critic for the stilus review phase. Give it a piece of prose plus the resolved voice profile. It detects AI slop independently against the deslop catalog, grades each finding 1-5 by severity, reports the density-budget rates, and judges human perception — whether a reader will bail on a wall of text, undefined jargon, filler, or a buried point. Read-only; returns graded, quotation-grounded findings, not edits.
tools: Read, Grep, Glob
---

You judge how prose reads — to a person. You detect AI slop and grade how badly each instance hurts, and you judge whether a human reader keeps going or bails. You do not edit, and you do not restate the slop catalog: the patterns, density budgets, and the accuracy-over-precision rule live in the deslop agent (`stilus/agents/deslop.md`), the single source of truth. You apply that catalog and add the severity scale and the human-perception read below.

## What you receive

- The piece: a file path or raw text.
- The resolved voice profile (project over user over base), so you grade against the intended register, not a generic one.

## What you do

### 1. Detect slop, independently

Run the deslop catalog over the piece yourself; do not assume a prior edit pass caught everything. Measure the density budgets deslop defines (contrast pivots, totalizing quantifiers, disguised lists, echoes) and report the per-1,000-word rates. Flag each instance with the catalog category it matches.

### 2. Grade each finding 1–5

Score every slop finding by how much it costs the reader. Anchor to these levels:

- **1 — Defensible.** A light tell, arguable in context. One stray style word ("robust"), a single mild hedge. Note it; lowest priority.
- **2 — Minor.** Cut on sight, harmless to meaning. A filler word ("really," "just"), an "in order to," a lone padding phrase.
- **3 — Noticeable.** A clear machine habit; the reader senses an AI wrote this. A relief structure ("the test suite is the safety net: it catches problems before they ship"), a participial summary tail ("...demonstrating its flexibility"), a tricolon riding for rhythm.
- **4 — Degrading.** Actively erodes trust or clarity. Stacked tells in one passage, booster register (every result "exciting," every approach "powerful"), a posture declarative standing in for a fact ("We treat both sections as binding").
- **5 — Reading-stopping.** Empty performance, a wall of words, or meaninglessness a reader bounces off. An overloaded sentence warehousing five facts, a paragraph of pure throat-clearing, a disguised list where every sentence is "thesis: a, b, and c," a point buried under so much scaffolding the reader leaves without it.

When a span fits two levels, grade the higher. Report the distribution (how many of each level).

### 3. Judge human perception

Will a human reader keep going, or bail? Cover:

- **Wall of text** — sentences or paragraphs so long the reader skips them. Name the spans.
- **Unnecessary jargon** — undefined terms or insider shorthand this audience will not parse.
- **Meaninglessness** — filler that signals value without delivering it; the reader gets nothing.
- **Buried or absent point** — a reader who stops early leaves without the takeaway.

Give a one-line "will they keep reading?" verdict and the specific spans that cause drop-off.

## Contracts

- Read-only. You never edit.
- The slop catalog, density budgets, and accuracy-over-precision rule live in deslop; reference them, do not restate them. The register lives in the voice profile.
- Ground every finding in a direct quotation from the piece. No quotation, no finding.

## What you return

1. The slop findings, each with: the quoted span, the deslop category, the 1–5 severity, why it costs the reader, and a concrete fix.
2. The slop severity distribution and the density-budget rates per 1,000 words.
3. The human-perception read: the keep-reading verdict plus the bail-point spans.
````

- [ ] **Step 2: Verify frontmatter, read-only tools, the 1–5 scale, and cross-reference discipline**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/agents/review-voice.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*review-voice/.test(m[1])) throw new Error('name != review-voice'); const t=m[1].match(/tools:.*/)[0]; if(/Edit|Write/.test(t)) throw new Error('review-voice must be read-only: '+t); for(const lvl of ['1 — Defensible','2 — Minor','3 — Noticeable','4 — Degrading','5 — Reading-stopping']) if(!c.includes(lvl)) throw new Error('missing severity level: '+lvl); if(!/human perception/i.test(c)) throw new Error('missing human-perception read'); if(!/do not restate/.test(c)) throw new Error('missing cross-reference discipline'); if(!/No quotation, no finding/.test(c)) throw new Error('missing quotation-grounding rule'); console.log('OK: review-voice valid (5-level scale, perception, read-only, cross-ref)');"
````
Expected: `OK: review-voice valid (5-level scale, perception, read-only, cross-ref)`.

- [ ] **Step 3: Commit**

````bash
git add stilus/agents/review-voice.md
git commit -m "$(cat <<'EOF'
chore - add stilus review-voice agent (graded slop + perception)

- detects slop against the deslop catalog, grades each finding 1-5
- adds the human-perception read; references deslop, does not restate it
EOF
)"
````

---

### Task 3: review-correctness agent

**Files:**
- Create: `stilus/agents/review-correctness.md`

**Interfaces:**
- Consumes: the piece and any codebase/domain context.
- Produces: a read-only subagent named `review-correctness` (`tools: Read, Grep, Glob, WebSearch, WebFetch`) returning soundness findings (quoted span, category, reason, fix), verification results with sources, and a separate "claims to verify by hand" list. Owns the correctness rubric.

- [ ] **Step 1: Create `stilus/agents/review-correctness.md`**

````markdown
---
name: review-correctness
description: Correctness critic for the stilus review phase. Give it a piece of prose (and any context about the codebase or domain it concerns). It checks internal soundness — claims supported by the piece's own evidence, no contradictions or unsupported leaps — verifies checkable claims against the codebase and the web, and returns a separate "claims to verify by hand" list for what it cannot confirm. Read-only; returns quotation-grounded findings, not edits.
tools: Read, Grep, Glob, WebSearch, WebFetch
---

You judge whether a piece is correct and whether its content holds together. You do not edit.

## What you receive

- The piece: a file path or raw text.
- Whatever context exists about the codebase, repo, or domain the piece concerns.

## What you do

### 1. Internal soundness

Read the argument as a skeptic. Flag:

- Claims the piece asserts but does not support with its own stated evidence.
- Contradictions — two passages that cannot both be true.
- Unsupported leaps — a conclusion that does not follow from what precedes it.
- Missing content the reader needs to act on the piece's own terms.

### 2. Verify what is checkable

When a claim is verifiable, verify it:

- **About this repo or codebase** — use Read, Grep, and Glob to confirm. Flag claims the code contradicts (a named file that does not exist, a described behavior the code does not have).
- **Public facts** — use WebSearch and WebFetch to confirm names, dates, figures, and citations where a quick check settles it. Flag what is wrong.

### 3. Flag for human

Build a separate "claims to verify by hand" list: external or factual claims you cannot confirm yourself (private data, unpublished facts, anything a search does not settle). List them so nothing factual passes silently.

### 4. Accuracy over precision

Flag specifics — numbers, dates, names, citations — that read as invented or unverifiable. This rule lives in the deslop agent (`stilus/agents/deslop.md`); reference it, do not restate it. A vague-but-true claim beats a precise-but-false one.

## Contracts

- Read-only. You never edit the piece.
- Ground every finding in a direct quotation from the piece. No quotation, no finding.
- Distinguish what you verified and disproved from what you could not check. Never present an unverified claim as confirmed either way.

## What you return

1. Soundness findings, each with: the quoted span, the category (unsupported / contradiction / leap / missing), why, and the fix.
2. Verification results: the claims you checked, what you found, and the source.
3. The "claims to verify by hand" list.
````

- [ ] **Step 2: Verify frontmatter, web tools, no-edit, and the flag-for-human list**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/agents/review-correctness.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/name:\s*review-correctness/.test(m[1])) throw new Error('name != review-correctness'); const t=m[1].match(/tools:.*/)[0]; if(/Edit|Write/.test(t)) throw new Error('review-correctness must not edit: '+t); if(!/WebSearch/.test(t)||!/WebFetch/.test(t)) throw new Error('needs WebSearch and WebFetch for verification'); if(!/claims to verify by hand/.test(c)) throw new Error('missing flag-for-human list'); if(!/do not restate/.test(c)) throw new Error('missing cross-reference discipline'); if(!/No quotation, no finding/.test(c)) throw new Error('missing quotation-grounding rule'); console.log('OK: review-correctness valid (verify + flag-for-human, read-only)');"
````
Expected: `OK: review-correctness valid (verify + flag-for-human, read-only)`.

- [ ] **Step 3: Commit**

````bash
git add stilus/agents/review-correctness.md
git commit -m "$(cat <<'EOF'
chore - add stilus review-correctness agent

- internal soundness, verify-when-possible via codebase/web
- separate claims-to-verify-by-hand list; references deslop accuracy rule
EOF
)"
````

---

### Task 4: reviewing.md (synthesis playbook)

**Files:**
- Create: `stilus/context/reviewing.md`

**Interfaces:**
- Consumes: the `review-correctness`, `review-voice`, and `review-summary` subagents (Tasks 1–3).
- Produces: the single source of truth for the review flow — intent capture, parallel fan-out, the AI-perception comparison, finding dedup, per-dimension scoring, verdict thresholds, and the report format. Consumed by the `/stilus:review` command (Task 5) and, later, the write skill's review step.

- [ ] **Step 1: Create `stilus/context/reviewing.md`**

`````markdown
# Reviewing — the stilus review phase

This document is the single source of truth for how stilus reviews a finished piece. The `/stilus:review` command and the write skill's review step both run this flow. It owns synthesis: how the review phase gathers intent, fans out to the specialist agents, compares the blind summary to the intended point, dedups and scores findings, assigns a verdict, and writes the report. The per-dimension rubrics live in the specialist agents, not here.

## The flow

### Step 1 — Gather intent

Establish three things before dispatching:

- **Purpose** — what the piece is for.
- **Audience** — who reads it.
- **Intended point** — the one thing the reader should take away.

In the pipeline these come from the drafting context. Standalone, ask the user for them in one prompt. If the user supplies none, proceed with intent unknown: the AI-perception step becomes a mirror (Step 3) rather than a pass/fail.

### Step 2 — Fan out (parallel, read-only)

Dispatch all three specialists on the same target in a single batch so they run concurrently. Each is read-only and independent.

- `review-correctness` — pass the piece and any codebase/domain context.
- `review-voice` — pass the piece and the resolved voice profile.
- `review-summary` — pass ONLY the piece. Do not pass the purpose, audience, or intended point. Its blindness is the point.

If the platform namespaces plugin agents, use the namespaced name; the names are unique within this plugin.

### Step 3 — AI perception (synthesis)

Compare `review-summary`'s blind takeaway to the intended point:

- **Intent known:** Did the point survive? Where the blind summary diverges from the intended point — wrong emphasis, missing the main claim, a misread — the prose failed to carry the point to a machine reader. Report the gap as a finding.
- **Intent unknown:** Present the blind takeaway to the user as a mirror: "An AI reading this cold took away: <summary>. Is that your point?" Do not score this case; surface it for confirmation.

### Step 4 — Merge and dedup

Combine the three findings sets. When two specialists flag the same span (for example, review-voice flags it as a disguised list and review-correctness flags the same span as an unsupported leap), merge into one finding that carries both lenses and the higher severity. Order findings by severity, highest first.

### Step 5 — Score and judge

Score each dimension:

- **Correctness** — PASS if no unsupported claims, contradictions, or disproven facts survive; FAIL if any do. Always attach the claims-to-verify-by-hand list regardless of score.
- **Voice** — PASS if no slop finding is 4 or 5 and all density budgets are within deslop's limits; CONCERN if the worst finding is 3 or a budget is mildly over; FAIL if any finding is 5 or budgets are well over.
- **Human perception** — PASS if a reader keeps going; CONCERN if there are isolated bail points; FAIL if the piece reads as a wall of words or the point is buried.
- **AI perception** — PASS if the blind takeaway matches the intended point; FAIL if it diverges; `mirror` if intent is unknown (unscored).

**Overall verdict:** FAIL if any dimension is FAIL; CONCERN if any is CONCERN and none is FAIL; otherwise PASS. A `mirror` AI-perception result does not by itself raise the verdict.

In the pipeline, a FAIL drives one bounded loop-back to the reviser, then deliver regardless of the second result. Standalone, the verdict is the assessment; never loop.

### Step 6 — Write the report

Use the format below.

## Report format

````
# Review — <piece>

Verdict: PASS | CONCERN | FAIL
- Correctness: <PASS/FAIL>
- Voice: <PASS/CONCERN/FAIL>  (slop: <n>x1 <n>x2 <n>x3 <n>x4 <n>x5)
- Human perception: <PASS/CONCERN/FAIL>
- AI perception: <PASS/FAIL/mirror>

## AI perception
Blind takeaway: <one sentence the cold reader extracted>
Intended point: <the stated point, or "not supplied">
<the gap, or "point survived", or the confirm-this-is-your-point prompt>

## Findings (highest severity first)
1. [voice - severity 4] "<exact quotation>"
   Why: <reason>
   Fix: <concrete fix>
2. [correctness - unsupported] "<exact quotation>"
   Why: <reason>
   Fix: <concrete fix>
...

## Claims to verify by hand
- "<quoted claim>" — <why it could not be confirmed>

## Density rates (per 1,000 words)
contrast pivots: <r> | totalizing quantifiers: <r> | disguised lists: <r> | echoes: <r>
````

Every finding cites a direct quotation from the piece. A finding without a quotation does not ship.
`````

- [ ] **Step 2: Verify the playbook references all three agents and defines flow, scoring, and format**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/context/reviewing.md','utf8'); for(const a of ['review-correctness','review-voice','review-summary']) if(!c.includes(a)) throw new Error('reviewing.md does not reference '+a); if(!/pass ONLY the piece/i.test(c)) throw new Error('missing blind-only instruction for summarizer'); if(!/Overall verdict:/.test(c)) throw new Error('missing verdict thresholds'); if(!/Merge and dedup/.test(c)) throw new Error('missing dedup step'); if(!/AI perception/.test(c)) throw new Error('missing AI-perception comparison'); if(!/Report format/.test(c)) throw new Error('missing report format'); if(!/single source of truth/i.test(c)) throw new Error('missing SSOT framing'); console.log('OK: reviewing.md references all three agents and defines flow/scoring/format');"
````
Expected: `OK: reviewing.md references all three agents and defines flow/scoring/format`.

- [ ] **Step 3: Commit**

````bash
git add stilus/context/reviewing.md
git commit -m "$(cat <<'EOF'
chore - add stilus reviewing.md synthesis playbook

- SSOT for the review flow: intent, fan-out, AI-perception, dedup
- per-dimension scoring, verdict thresholds, and the report format
EOF
)"
````

---

### Task 5: /stilus:review command

**Files:**
- Create: `stilus/commands/review.md`

**Interfaces:**
- Consumes: `stilus/context/reviewing.md` (Task 4) and the three specialist agents (Tasks 1–3).
- Produces: the `/stilus:review` command — the standalone entry point for reviewing existing or external prose.

- [ ] **Step 1: Create `stilus/commands/review.md`**

````markdown
---
description: Review a finished piece of prose — correctness, voice (graded slop), human perception, and whether an AI reader gets the point. Read-only; produces a scored report, never edits. Usage: /stilus:review <file-or-text>
---

# /stilus:review

Review the prose the user names — a file path or pasted text — and produce a scored report. You change nothing; this is a read-only assessment.

Run the review phase exactly as defined in this plugin's `context/reviewing.md`:

1. **Gather intent** (purpose, audience, intended point). Ask the user in one prompt; if they supply none, proceed with intent unknown.
2. **Fan out** to the three specialist agents in parallel — `review-correctness`, `review-voice`, and `review-summary` — following `context/reviewing.md`. Pass the blind summarizer ONLY the prose.
3. **Synthesize:** run the AI-perception comparison, merge and dedup findings, score each dimension, assign the verdict.
4. **Deliver** the report in the format from `context/reviewing.md`. Never loop back to revise in standalone mode.

The resolved voice profile, if any, comes from the same scan the write skill uses: project `.claude/rules/voice.md`, then user `~/.claude/rules/voice.md`, then this plugin's `rules/voice.md`.
````

- [ ] **Step 2: Verify the command frontmatter and that it defers to reviewing.md and names the agents**

Run:
````bash
node -e "const fs=require('fs'); const c=fs.readFileSync('stilus/commands/review.md','utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/); if(!m) throw new Error('no frontmatter'); if(!/description:/.test(m[1])) throw new Error('command needs a description'); if(!/context\/reviewing.md/.test(c)) throw new Error('command must defer to reviewing.md'); for(const a of ['review-correctness','review-voice','review-summary']) if(!c.includes(a)) throw new Error('command does not name '+a); if(!/ONLY the prose/.test(c)) throw new Error('command must preserve summarizer blindness'); console.log('OK: /stilus:review command valid and thin');"
````
Expected: `OK: /stilus:review command valid and thin`.

- [ ] **Step 3: Commit**

````bash
git add stilus/commands/review.md
git commit -m "$(cat <<'EOF'
chore - add /stilus:review standalone command

- thin entry point; defers the whole flow to context/reviewing.md
- fans out the three review specialists, never edits
EOF
)"
````

---

### Task 6: Docs, whole-plugin validation, and smoke test

**Files:**
- Modify: `stilus/README.md`
- Modify: `CLAUDE.md` (Context Ownership table)

**Interfaces:**
- Produces: documentation consistent with the orchestrated review phase, and a whole-plugin validation gate.

- [ ] **Step 1: Update the Review bullet in `stilus/README.md`**

Change:
````markdown
4. **Review** — an independent, read-only judge checks fit, surviving tells, accuracy, and register.
````
to:
````markdown
4. **Review** — an orchestrated phase: three parallel read-only specialists judge correctness, voice (slop graded 1–5 plus a human-perception read), and AI perception (whether a cold AI reader gets the point), and the orchestrator synthesizes a scored, quotation-grounded report. Run it standalone on any existing prose with `/stilus:review <file-or-text>`.
````

- [ ] **Step 2: Update the SSOT line in `stilus/README.md`**

Change:
````markdown
The slop catalog and shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the `deslop` agent. The voice layer, reviser, and reviewer reference them; they never restate them.
````
to:
````markdown
The slop catalog and shared craft (lead with the point, sentence rhythm, accuracy over precision) live in the `deslop` agent. The voice layer, reviser, and the review specialists reference them; they never restate them. The review flow and its scoring live once in `context/reviewing.md`, which the `/stilus:review` command and the write skill both run.
````

- [ ] **Step 3: Add the stilus row to the Context Ownership table in `CLAUDE.md`**

Change:
````markdown
| **comitatus** | herdr orchestration | `skills/herdr/SKILL.md` |
````
to:
````markdown
| **comitatus** | herdr orchestration | `skills/herdr/SKILL.md` |
| **stilus** | Prose drafting, editing, and review | `agents/deslop.md` (slop catalog), `rules/voice.md` (voice schema), `context/reviewing.md` (review flow + scoring), `agents/review-correctness.md`, `agents/review-voice.md`, `agents/review-summary.md` |
````

- [ ] **Step 4: Validate the whole review phase — frontmatter, read-only contracts, JSON, docs**

Run:
````bash
node -e "
const fs=require('fs');
// agents: frontmatter with a name; correct read-only tool sets
const agents={
  'stilus/agents/review-summary.md':{name:'review-summary',forbid:/Edit|Write|Grep|Glob/},
  'stilus/agents/review-voice.md':{name:'review-voice',forbid:/Edit|Write/},
  'stilus/agents/review-correctness.md':{name:'review-correctness',forbid:/Edit|Write/}
};
for(const [f,spec] of Object.entries(agents)){
  const c=fs.readFileSync(f,'utf8'); const m=c.match(/^---\n([\s\S]*?)\n---/);
  if(!m) throw new Error(f+': no frontmatter');
  if(!new RegExp('name:\\\\s*'+spec.name).test(m[1])) throw new Error(f+': wrong name');
  const t=m[1].match(/tools:.*/)[0]; if(spec.forbid.test(t)) throw new Error(f+': forbidden tool in '+t);
}
// command has a description, not a name
const cmd=fs.readFileSync('stilus/commands/review.md','utf8'); const cm=cmd.match(/^---\n([\s\S]*?)\n---/);
if(!cm||!/description:/.test(cm[1])) throw new Error('command: missing description frontmatter');
// reviewing.md ties it together
const r=fs.readFileSync('stilus/context/reviewing.md','utf8');
for(const a of ['review-correctness','review-voice','review-summary']) if(!r.includes(a)) throw new Error('reviewing.md missing '+a);
// marketplace JSON still valid and stilus still registered
const mk=JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json','utf8'));
if(!mk.plugins.find(p=>p.name==='stilus')) throw new Error('stilus missing from marketplace');
// docs updated
if(!/stilus:review/.test(fs.readFileSync('stilus/README.md','utf8'))) throw new Error('README not updated');
const cl=fs.readFileSync('CLAUDE.md','utf8');
if(!/\*\*stilus\*\* \| Prose drafting/.test(cl)) throw new Error('CLAUDE.md ownership row missing');
console.log('OK: review phase structure, tool contracts, JSON, and docs all valid');
"
````
Expected: `OK: review phase structure, tool contracts, JSON, and docs all valid`.

- [ ] **Step 5: Manual smoke test (requires a live Claude Code session; not automated)**

The deliverables are prompts, so behavior is verified by hand:

1. Reinstall/enable `stilus` from the local marketplace so the new command and agents register.
2. Run `/stilus:review <path>` on an existing prose file. Confirm:
   - it asks for purpose/audience/intended point (or proceeds with intent unknown if you decline),
   - it dispatches `review-correctness`, `review-voice`, and `review-summary`, and they run in parallel,
   - the `review-summary` dispatch received only the prose (no intent),
   - the report matches `context/reviewing.md`'s format: a verdict, per-dimension scores, the slop severity distribution, quotation-grounded findings, the claims-to-verify list, and the density rates.
3. Run it again with the intended point withheld. Confirm the AI-perception section becomes the mirror ("An AI reading this cold took away: … Is that your point?") and is unscored.
4. Confirm no file was modified (read-only).

Record the outcome in the PR description. If subagent dispatch needs a namespaced agent name on this platform, note the exact form.

- [ ] **Step 6: Commit**

````bash
git add stilus/README.md CLAUDE.md
git commit -m "$(cat <<'EOF'
chore - document stilus review phase

- README: orchestrated review, four dimensions, /stilus:review
- CLAUDE.md: add stilus Context Ownership row
EOF
)"
````

---

## Known limitations / follow-ups

- **Write-skill integration is deferred.** When the write skill is built (original `2026-06-18-stilus-writing-plugin.md` plan, Task 6), its review step becomes a thin reference to `context/reviewing.md` and dispatches the same three specialists. This plan deliberately ships the standalone review phase first; it is complete and testable on its own.
- **The reviser loop-back has no target yet.** `context/reviewing.md` describes the one bounded loop-back to the reviser for pipeline FAILs, but the `reviser` agent is built by the original plan (Task 4). Standalone review never loops, so this plan is unaffected.
- **Severity calibration will drift.** The 1–5 anchors are seeded with examples from deslop's named patterns; expect to tune them once real reviews accumulate.

## Self-Review

**Spec coverage.** Every section of `2026-06-24-stilus-reviewer-redesign-design.md` maps to a task: the three specialists → Tasks 1–3; the four dimensions → review-summary/AI-perception (T1 + T4 Step 3), voice+human (T2), correctness (T3); orchestrated synthesis, AI-perception comparison, dedup, scoring, verdict, report format → T4; the two entry points → the `/stilus:review` command (T5) and the deferred write-skill step (Known limitations); SSOT table → enforced by deslop staying unmodified (Global Constraints) and reviewing.md owning synthesis (T4); the spec's open items → resolved (severity scale in T2, verdict thresholds and dedup in T4, standalone intent capture in T4/T5); docs → T6.

**Placeholder scan.** No "TBD"/"TODO"/"handle edge cases". Every file is given in full. The only non-automated step (T6 Step 5) is labeled manual because prompt behavior has no unit-test harness, matching the rest of stilus.

**Type/name consistency.** Agent names are identical across the agent files, `reviewing.md`, the command, and the validation scripts: `review-correctness`, `review-voice`, `review-summary`. Tool sets are consistent: `review-summary` is `Read` only, `review-voice` is `Read, Grep, Glob`, `review-correctness` adds `WebSearch, WebFetch`; the whole-plugin check in T6 re-asserts each. The report dimensions (Correctness, Voice, Human perception, AI perception) and verdict vocabulary (PASS/CONCERN/FAIL/mirror) are identical between T4's scoring rules and its report format. `context/reviewing.md` is referenced by the same path in T5 and T6.
