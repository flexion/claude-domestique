# comitatus Retro Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the comitatus-ownable bug and behavior issues surfaced by a live herdr-session retro: the broken `herd.js` helper-path recipe, plus three documentation clarifications.

**Architecture:** comitatus ships three things — the `herdr` skill docs (`skills/herdr/SKILL.md`, `reference/*.md`), a roster/state helper (`skills/herdr/scripts/herd.js`), and a SessionStart orientation hook (`hooks/herdr-orient.js`). It does **not** ship the `herdr` binary, so any fix that needs a new `herdr` subcommand or a new JSON field is upstream-herdr and out of scope (see Appendix A). The one code change here is in the orientation hook: make it emit the helper path as a copy-pasteable, clearly-non-persistable `H=` assignment, since `$CLAUDE_PLUGIN_ROOT` (what the docs currently tell agents to use) is **not set** in the agent's shell. The remaining changes clarify already-true behavior in `SKILL.md`.

**Tech Stack:** Node.js (CommonJS), Jest. Docs are Markdown.

## Global Constraints

- **Version bump before merge:** `node scripts/bump-version.js comitatus patch` (0.1.3 -> 0.1.4; updates `comitatus/package.json` and `.claude-plugin/marketplace.json`). Run as the final task. — verbatim from CLAUDE.md.
- **Commits:** `chore - <description>`, lowercase, HEREDOC body, **no attribution**. — verbatim from CLAUDE.md Git Conventions.
- **Prose stays plain ASCII**, except the established model glyphs `◆` (claude) / `◇` (codex) / `⬨` (opencode), which are real label characters used throughout `SKILL.md`. Do not introduce other non-ASCII.
- **Single source of truth for the helper path:** the orientation hook (`buildOrientation`) is the only place that emits the current `herd.js` path; docs reference "the path from your orientation," never a reconstructed one.
- **Do not touch `herd.js` runtime behavior, the codex provisioning logic, or `reference/cli.md`'s command surface** — none are implicated by these fixes.
- Run the comitatus suite with `npx jest` from the `comitatus/` directory (jest is a devDependency; `npm install` first if `node_modules` is absent). All 25 existing tests must stay green; Task 1 adds tests.

**Verified facts (from this session, do not re-litigate):**
- `echo "[$CLAUDE_PLUGIN_ROOT]"` in the agent shell prints `[]` — the variable is unset, so the SKILL recipe `H="$CLAUDE_PLUGIN_ROOT/skills/herdr/scripts/herd.js"` produces the broken path `/skills/herdr/scripts/herd.js`. This is the root bug for Task 1/Task 2.
- The orientation hook already resolves and injects the correct absolute `herd.js` path (`HERD_JS`), version-pinned under `~/.claude/plugins/cache/claude-domestique/comitatus/<version>/...`.
- Executable bits on `herdr-orient.js` and `herd.js` are correct (`100755`) — the #132-class bug does **not** apply; no fix needed.
- The only `$CLAUDE_PLUGIN_ROOT` reference under `skills/` is `SKILL.md:105`. `reference/cli.md` does not use it.

---

### Task 1: Orientation hook emits an assignable, non-persistable `H=` (Fix A — code)

**Files:**
- Modify: `comitatus/hooks/herdr-orient.js` — `buildOrientation()` (currently lines 14-22)
- Test: `comitatus/hooks/__tests__/herdr-orient.test.js` — `describe('buildOrientation')` block (currently lines 33-39)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildOrientation(herdJsPath: string): string` — unchanged signature. New guarantees on the returned string: contains the literal `H=<herdJsPath>`; contains the word `version-pinned`; contains `re-read` and/or `do not persist`; does **not** contain `CLAUDE_PLUGIN_ROOT`. Still contains `comitatus:herdr` and the raw `herdJsPath` (relied on by `processSessionStart` tests).

- [ ] **Step 1: Write the failing tests**

In `comitatus/hooks/__tests__/herdr-orient.test.js`, replace the `describe('buildOrientation', ...)` block with:

```javascript
describe('buildOrientation', () => {
  test('mentions the skill and the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/comitatus:herdr/);
    expect(c).toContain('/abs/herd.js');
  });

  test('emits a copy-pasteable H= assignment of the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toContain('H=/abs/herd.js');
  });

  test('warns the path is version-pinned and must be re-read, not persisted', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/version-pinned/i);
    expect(c).toMatch(/do not persist|don't persist|re-read/i);
  });

  test('does not steer agents to the unset $CLAUDE_PLUGIN_ROOT', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).not.toContain('CLAUDE_PLUGIN_ROOT');
  });
});
```

- [ ] **Step 2: Run the tests to verify the three new ones fail**

Run: `cd comitatus && npx jest hooks -t buildOrientation`
Expected: FAIL — `emits a copy-pasteable H=` (current text is `node /abs/herd.js ...`, no `H=`), `warns the path is version-pinned` (no such wording), both fail. The existing `mentions the skill` and the `does not steer` test pass (current text has no `CLAUDE_PLUGIN_ROOT`). Confirm the failures are assertion mismatches, not load errors.

- [ ] **Step 3: Write the minimal implementation**

In `comitatus/hooks/herdr-orient.js`, replace `buildOrientation` with the following. Note: the warning intentionally avoids the literal token `CLAUDE_PLUGIN_ROOT` (the `does not steer` test forbids it) — it says "an env var" instead.

```javascript
function buildOrientation(herdJsPath) {
  return [
    '# herdr (comitatus)',
    '',
    'You are running inside herdr, a terminal-native agent multiplexer.',
    'Invoke the `comitatus:herdr` skill for worktree / herd / pane / agent workflows.',
    '',
    'Roster/state helper - capture the path into `H`, then use `$H` in the skill recipes',
    '(it reads `herdr ... --json` on stdin; commands: pane|members|status|field):',
    '',
    `    H=${herdJsPath}`,
    '',
    'This path is version-pinned (it moves on every comitatus update), so re-read `H`',
    'from this orientation each session - do not persist it, and do not rebuild it from an',
    'env var (none is set in your shell). codex agents use the stable',
    '`$HOME/.codex/skills/herdr/scripts/herd.js` instead.',
  ].join('\n');
}
```

- [ ] **Step 4: Run the full hook suite to verify green**

Run: `cd comitatus && npx jest hooks`
Expected: PASS — all `buildOrientation` tests pass, and the `processSessionStart` tests (which assert `additionalContext` contains `HERD_JS` and matches `comitatus:herdr`) still pass.

- [ ] **Step 5: Run the whole comitatus suite**

Run: `cd comitatus && npx jest`
Expected: PASS — 2 suites, 28 tests (25 prior + 3 new).

- [ ] **Step 6: Commit**

```bash
git add comitatus/hooks/herdr-orient.js comitatus/hooks/__tests__/herdr-orient.test.js
git commit -m "$(cat <<'EOF'
chore - emit assignable herd.js path in herdr orientation

$CLAUDE_PLUGIN_ROOT is unset in the agent shell, so the old recipe
H="$CLAUDE_PLUGIN_ROOT/.../herd.js" resolved to a broken path. The
orientation now prints a copy-pasteable `H=<abs>` and warns the path is
version-pinned (re-read each session, do not persist).
EOF
)"
```

---

### Task 2: Route `SKILL.md` recipes to the orientation-provided `H` (Fix A — docs)

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md` — line 105 (the `H=` recipe) and the gotchas list (~line 341)

**Interfaces:** none (docs). Depends on Task 1's orientation wording so the cross-reference is accurate.

- [ ] **Step 1: Replace the broken helper-path recipe**

Find (SKILL.md line 105):

```
H="$CLAUDE_PLUGIN_ROOT/skills/herdr/scripts/herd.js"   # codex: H="$HOME/.codex/skills/herdr/scripts/herd.js"
```

Replace with:

```
# H = the herd.js helper. take it from your herdr orientation's `H=...` line; it is
# version-pinned on the claude side, so re-read it each session and don't persist it.
# codex agents use the stable path: H="$HOME/.codex/skills/herdr/scripts/herd.js"
H="${H:?set H from your herdr orientation (the 'Roster/state helper' line)}"
```

Rationale: the `${H:?...}` guard turns the old *silent* failure (broken path, empty results) into a *loud* one with a fix hint — directly addressing the retro footgun.

- [ ] **Step 2: Add a gotcha bullet**

Find (SKILL.md ~line 341):

```
- **decorated labels are manual** - `sly ◆` style labels are set with `tab rename`, not auto-derived. renaming the handle does not update the tab label; re-`tab rename` to keep them in sync.
```

Insert immediately **after** it:

```
- **the herd.js helper path comes from your orientation, not an env var** - `$CLAUDE_PLUGIN_ROOT` is not set in your shell, so don't build the path from it (it silently yields a broken `/skills/.../herd.js`). copy `H` from the `H=...` line in your herdr orientation. the claude-side path is version-pinned and moves on every comitatus update, so re-read it each session - a persisted path breaks after an upgrade. codex agents use the stable `$HOME/.codex/skills/herdr/scripts/herd.js`.
```

- [ ] **Step 3: Verify the broken token is gone and the guidance is present**

Run:
```bash
cd comitatus && \
  ! grep -q 'CLAUDE_PLUGIN_ROOT/skills' skills/herdr/SKILL.md && \
  grep -q 'set H from your herdr orientation' skills/herdr/SKILL.md && \
  grep -q 'helper path comes from your orientation' skills/herdr/SKILL.md && \
  echo OK
```
Expected: prints `OK` (the broken `CLAUDE_PLUGIN_ROOT/skills` recipe is gone; both new strings present). Note `CLAUDE_PLUGIN_ROOT` still appears once inside the new gotcha as a *warning*, which is intended.

- [ ] **Step 4: Confirm tests unaffected**

Run: `cd comitatus && npx jest`
Expected: PASS — 28 tests (no test asserts SKILL.md content; doc edits don't break it).

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -m "$(cat <<'EOF'
chore - point herd.js recipes at the orientation-provided path

Replace the broken H="$CLAUDE_PLUGIN_ROOT/.../herd.js" recipe (the var is
unset in the agent shell) with H sourced from the herdr orientation, guarded
so an unset H fails loudly instead of producing a broken path. Add a gotcha.
EOF
)"
```

---

### Task 3: Add a quickstart to `SKILL.md` (Fix B — docs)

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md` — insert a section between the intro (ends line 13) and `## concepts` (line 14)

**Interfaces:** none. Uses `node "$H"` (the Task 2 convention) and the `fox ◆` glyph label.

- [ ] **Step 1: Insert the quickstart section**

Find (SKILL.md lines 12-14):

```
if you need the raw protocol, read the [socket api docs](https://herdr.dev/docs/socket-api/). for the full flag-by-flag command surface, see [reference/cli.md](reference/cli.md).

## concepts
```

Replace with (inserts the quickstart before `## concepts`, preserving the existing two lines):

```
if you need the raw protocol, read the [socket api docs](https://herdr.dev/docs/socket-api/). for the full flag-by-flag command surface, see [reference/cli.md](reference/cli.md).

## quickstart - the 80% path

create a worktree and put one claude agent on it. `H` is the herd.js helper path from your herdr orientation (the `H=...` line); concepts, naming, and the rest are below.

```bash
H=...                                   # paste from your herdr orientation
git fetch origin main                   # --base origin/main is a local ref; refresh it first
OUT=$(herdr worktree create --branch chore/my-slug --base origin/main --no-focus --json)
WS=$(echo "$OUT"   | node "$H" field result.worktree.open_workspace_id)
ROOT=$(echo "$OUT" | node "$H" field result.root_pane.pane_id)

herdr tab rename "${WS}:t1" "fox ◆"     # the only label you set: handle + model glyph
herdr pane run "$ROOT" "claude"
herdr wait agent-status "$ROOT" --status idle --timeout 40000
herdr agent rename "$ROOT" fox          # fox is now addressable: herdr agent send fox "..."
```

that is one worktree, one agent. add more agents (a tab each), message them, and tear down with the building blocks below.

## concepts
```

- [ ] **Step 2: Verify the section landed and ordering is correct**

Run:
```bash
cd comitatus && \
  grep -n '## quickstart - the 80% path' skills/herdr/SKILL.md && \
  awk '/## quickstart - the 80% path/{q=NR} /## concepts/{c=NR} END{exit !(q>0 && c>q)}' skills/herdr/SKILL.md && \
  echo OK
```
Expected: prints the matching line and `OK` (quickstart appears before `## concepts`).

- [ ] **Step 3: Confirm tests unaffected**

Run: `cd comitatus && npx jest`
Expected: PASS — 28 tests.

- [ ] **Step 4: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -m "$(cat <<'EOF'
chore - add an 80% quickstart to the top of the herdr skill

SKILL.md front-loaded concepts/naming/ids before the common recipe. Add a
6-line "worktree + one agent" quickstart up top to cut time-to-first-agent.
EOF
)"
```

---

### Task 4: Call out solo->herd promotion in seeding (Fix C — docs)

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md` — the `**seeding (required):**` paragraph (line 282)

**Interfaces:** none.

- [ ] **Step 1: Extend the seeding paragraph**

Find (SKILL.md line 282):

```
**seeding (required):** a cold agent knows neither this protocol nor its own handle. before relying on it, message each agent once with its handle, the teammate handles, and this protocol. they are not born knowing it.
```

Replace with:

```
**seeding (required):** a cold agent knows neither this protocol nor its own handle. before relying on it, message each agent once with its handle, the teammate handles, and this protocol. they are not born knowing it. **promoting a solo agent into a herd counts as cold:** an agent you started alone - no handle, no protocol - does not become a herd member just because you added a second agent next to it. the moment a herd forms, seed the incumbent too (handle, roster, protocol), not only the newcomer, then announce both with `[herd +<handle>]`. "it was already running" is not "it knows the protocol."
```

- [ ] **Step 2: Verify**

Run:
```bash
cd comitatus && grep -q 'promoting a solo agent into a herd counts as cold' skills/herdr/SKILL.md && echo OK
```
Expected: prints `OK`.

- [ ] **Step 3: Confirm tests unaffected**

Run: `cd comitatus && npx jest`
Expected: PASS — 28 tests.

- [ ] **Step 4: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -m "$(cat <<'EOF'
chore - note that promoting a solo agent into a herd needs seeding

A solo-started agent has no handle or protocol; growing it into a herd must
re-seed the incumbent, not just the newcomer. Spell that out in the seeding
section so the from/to protocol does not silently break on promotion.
EOF
)"
```

---

### Task 5: Document `pane read --source recent` lagging while fresh (Fix D — docs)

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md` — the `**read vs wait**` gotcha (line 345)

**Interfaces:** none.

- [ ] **Step 1: Expand the read-vs-wait gotcha**

Find (SKILL.md line 345):

```
- **read vs wait** - `pane read` for output that already exists; `wait output` for output you expect next.
```

Replace with:

```
- **read vs wait, and `recent` can lag** - `pane read` for output that already exists; `wait output` for output you expect next. `pane read --source recent` can come back **empty while a pane is still freshly producing output** (the scrollback render has not caught up); fall back to `--source visible` (the live viewport) or `wait output --match <text>` for the line you expect - do not read an empty `recent` as "nothing is there."
```

- [ ] **Step 2: Verify**

Run:
```bash
cd comitatus && grep -q 'recent. can lag' skills/herdr/SKILL.md && grep -q 'still freshly producing output' skills/herdr/SKILL.md && echo OK
```
Expected: prints `OK`.

- [ ] **Step 3: Confirm tests unaffected**

Run: `cd comitatus && npx jest`
Expected: PASS — 28 tests.

- [ ] **Step 4: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -m "$(cat <<'EOF'
chore - note pane read --source recent can lag while a pane is fresh

recent scrollback can render empty while output is still arriving; document
the fallback to --source visible or wait output instead of reading empty as
"nothing there."
EOF
)"
```

---

### Task 6: Make `agent send`'s typed-vs-submitted gap explicit, with a name-based send helper (Fix E — docs)

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md` — step 5 "message another agent by handle" (lines 148-157), the from/to "delivery reliability" list (first bullet, line 300), and the `agent send` gotcha (line 331)

**Interfaces:** none. Uses `node "$H" pane <handle>` (existing herd.js capability) and the Task 2 `H` convention.

**Context:** `herdr agent send` types text into the recipient's input but does **not** submit it, yet returns `{"result":{"type":"ok"}}`. Callers read `ok` as "delivered" and the message sits unsubmitted. Submitting it (`pane send-keys <pane> Enter`), the per-agent-type submit gesture, and a typed-vs-delivered JSON result are the `herdr` binary's to fix (Appendix A). comitatus's job: (a) stop the docs implying `ok` == delivered, and (b) keep the submit recipe at the handle level so callers don't abandon name-based targeting.

- [ ] **Step 1: Strengthen step 5 and add the `hsend` wrapper**

Find (SKILL.md lines 148-157):

````
### 5. message another agent by handle

`agent send` writes literal text and does **not** press Enter. send, then submit - the recipient's reply confirms it landed:

```bash
PANE=$(herdr agent list | node "$H" pane jay)
herdr agent send jay "please rerun the failing test in src/api/"
herdr pane send-keys "$PANE" Enter
```

the Enter is dropped only if `jay` was mid-generation (`working`); if no reply comes back, resend. for replies, seeding, roster, and how to handle no-reply messages, see the from/to protocol below.
````

Replace with:

````
### 5. message another agent by handle

`agent send` writes literal text and returns `{"result":{"type":"ok"}}` once the text is *typed* - that ack is **not** *submitted*. the message sits in the recipient's input buffer until you press Enter, so always send **and** submit; the recipient's reply confirms it landed:

```bash
PANE=$(herdr agent list | node "$H" pane jay)
herdr agent send jay "please rerun the failing test in src/api/"
herdr pane send-keys "$PANE" Enter
```

prefer a reusable wrapper so you stay name-based (no hand-resolved pane id). define it once in your pane shell, then `hsend jay "..."`:

```bash
hsend() {  # hsend <handle> <one-line-message>
  local pane; pane=$(herdr agent list | node "$H" pane "$1") || return 1
  [ -n "$pane" ] || { echo "hsend: no agent '$1'" >&2; return 1; }
  herdr agent send "$1" "$2" && herdr pane send-keys "$pane" Enter
}
```

the Enter is dropped only if `jay` was mid-generation (`working`); if no reply comes back, resend. for replies, seeding, roster, and how to handle no-reply messages, see the from/to protocol below.
````

- [ ] **Step 2: Add a "typed, not delivered" bullet to delivery reliability**

Find (SKILL.md line 300):

```
- **the reply, or its absence, is the signal.** push the message and let the reply confirm it - a `[from <to>]` turn landing in your pane means it arrived; nothing landing means the Enter dropped (the recipient was `working`), so resend. you don't pre-check the recipient for reply-expecting messages.
```

Replace with (prepends a new bullet):

```
- **`agent send` returns `ok` for *typed*, not *delivered*.** the `{"result":{"type":"ok"}}` ack means the text reached the recipient's input buffer; it does **not** mean the agent saw it. submitting is the separate `pane send-keys <pane> Enter` step (or the `hsend` helper) - until then the message sits unsubmitted in the prompt. treat the reply, not the `ok`, as proof of delivery.
- **the reply, or its absence, is the signal.** push the message and let the reply confirm it - a `[from <to>]` turn landing in your pane means it arrived; nothing landing means the Enter dropped (the recipient was `working`), so resend. you don't pre-check the recipient for reply-expecting messages.
```

- [ ] **Step 3: Strengthen the `agent send` gotcha**

Find (SKILL.md line 331):

```
- **`agent send` has no Enter, and the Enter drops only while the target is `working`** - send + `pane send-keys <pane> Enter` and let the reply confirm it landed (resend on silence); only for a no-reply message poll until the target is not `working` first, or verify by reading its pane. don't blindly double-tap. (full recipe in the from/to protocol section.)
```

Replace with:

```
- **`agent send` returns `ok` for *typed*, not *submitted*, and sends no Enter** - the `ok` ack only means the text reached the input buffer; the message sits unsubmitted until you press Enter (`pane send-keys <pane> Enter`, dropped only while the target is `working`). pair every send with the Enter - or use the `hsend` helper (step 5) - and let the reply confirm it landed (resend on silence); only for a no-reply message poll until the target is not `working` first, or verify by reading its pane. don't blindly double-tap. (full recipe in the from/to protocol section.)
```

- [ ] **Step 4: Verify the three edits landed**

Run:
```bash
cd comitatus && \
  grep -q "returns .ok. for .typed., not .delivered" skills/herdr/SKILL.md && \
  grep -q 'hsend()' skills/herdr/SKILL.md && \
  grep -q 'not .submitted., and sends no Enter' skills/herdr/SKILL.md && \
  echo OK
```
Expected: prints `OK`.

- [ ] **Step 5: Confirm tests unaffected**

Run: `cd comitatus && npx jest`
Expected: PASS — 28 tests (doc-only change).

- [ ] **Step 6: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -m "$(cat <<'EOF'
chore - clarify agent send returns ok for typed not delivered

herdr agent send returns {"result":{"type":"ok"}} once the text is typed, not
submitted - callers read ok as delivered and the message sits unsubmitted.
Reframe the from/to docs and ship an hsend send-and-submit-by-handle wrapper so
callers stay name-based. Submit-by-default and a typed-vs-delivered ack remain
upstream-herdr (see the plan's Appendix A).
EOF
)"
```

---

### Task 7: Version bump and final verification

**Files:**
- Modify (via script): `comitatus/package.json`, `.claude-plugin/marketplace.json`

**Interfaces:** none.

- [ ] **Step 1: Bump the patch version**

Run: `node scripts/bump-version.js comitatus patch`
Expected: comitatus `0.1.3 -> 0.1.4` in both `comitatus/package.json` and `.claude-plugin/marketplace.json`.

- [ ] **Step 2: Verify the bump**

Run:
```bash
grep '"version"' comitatus/package.json && grep -A1 '"name": "comitatus"' .claude-plugin/marketplace.json | grep -o '0\.1\.4'
```
Expected: `0.1.4` in both.

- [ ] **Step 3: Final full-suite run**

Run: `cd comitatus && npx jest`
Expected: PASS — 2 suites, 28 tests.

- [ ] **Step 4: Commit**

```bash
git add comitatus/package.json .claude-plugin/marketplace.json
git commit -m "$(cat <<'EOF'
chore - bump comitatus 0.1.3 -> 0.1.4
EOF
)"
```

- [ ] **Step 5: Finish the branch**

Use superpowers:finishing-a-development-branch to choose merge/PR. PR title: `chore - comitatus retro fast-follow fixes`. PR body must include Appendix A (the upstream-herdr items) so the owner can route them.

---

## Appendix A: Forwarded to herdr (NOT fixed here)

These retro items require the `herdr` binary or new JSON fields; comitatus only ships docs + `herd.js` + the orientation hook, so it cannot implement them. Record them in the PR body:

- **Composite `herdr agent attach`** — one call to create the tab, launch the model, wait for detection, and assign the handle (collapse the 4-call attach dance).
- **`herdr agent send` should submit, not just type** (full bug report: "agent send delivers text but never submits it") — `agent send` types into the recipient's buffer and returns `{"result":{"type":"ok"}}` without pressing Enter, so the message is never delivered, yet the caller sees success. Preferred upstream fix: submit by default with `--no-submit` to opt out (or a separate `agent submit <target>`), using the per-agent-type submit gesture (claude/codex/opencode differ), and make the JSON result distinguish "typed" from "delivered/submitted". comitatus mitigates on the doc side in **Task 6** (reframes `ok`, ships the `hsend` send-and-submit-by-handle helper) but cannot change the binary's ack or default behavior.
- **Auto-claim handle / `herdr agent next-handle`** — claim the next free pool handle atomically (remove the manual, racy diff against `agent list`).
- **`herdr herd seed <ws>`** — idempotently broadcast protocol + roster to every member on any membership change.
- **`blocked_reason` field on agent status** — distinguish "human typing" vs "permission prompt" without reading the pane.
- **`pane read --source recent` auto-fallback** — fall back to `visible` when `recent` is empty-but-fresh (comitatus documents the manual fallback in Task 5; the auto-behavior is the binary's).
- **PATH shim for the helper** — fold `pane|members|status|field` into `herdr` proper or ship a PATH shim (comitatus mitigates via the orientation `H=` in Tasks 1-2; a true shim is upstream).

## Appendix B: Not a bug (verified, no action)

- Executable bits on `herdr-orient.js` / `herd.js` are `100755` — the #132-class bug does not apply.
- `herd.js` runtime functions (`pane`/`status`/`members`/`field`/`format`) behave correctly for the documented recipes; no change.
