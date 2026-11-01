# comitatus mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude and Codex agents, in herdr or not, publish discovery cards and exchange best-effort durable mail through comitatus hooks, with content-free doorbells over native routes.

**Architecture:** Three small CommonJS modules:
- `identity`: kind, home, root, participant key;
- `roll`: cards;
- `mail`: pickup and render.

One hook entry point (`hooks/comm.js`) wires them to SessionStart, UserPromptSubmit, PostToolUse and Stop on both hosts through the existing `hooks/hooks.json`. A new `comitatus:mail` skill tells agents how to find others, send and ring. No daemon, no new runtime dependency.

**Tech Stack:** Node.js 24 CommonJS, Jest 30 (existing `comitatus` workspace).

**Spec:** `docs/superpowers/specs/2026-11-01-comitatus-mail-design.md`. Evidence: `.pipeline/proto-results.md`. Prototype to harden: `proto.js` in sly's scratch folder; its logic is summarized in the spec.

## Global Constraints

- Branch `chore/comitatus-mail` from `issue/feature-205/native-herdr-skills`, which carries comitatus 2.0.0 (PR #206). Rebase onto `main` after #206 merges.
- Node >= 24, CommonJS (`require`/`module.exports`), two-space indent, semicolons, trailing newline, and no new dependencies (AGENTS.md).
- A hook reads one JSON object from stdin and writes valid JSON or nothing to stdout. Diagnostics go to stderr only. It always exits 0.
- Do nothing unless `COMITATUS_HANDLE` matches `^[a-z][a-z0-9-]{0,31}$`.
- Root: `COMITATUS_HOME` or `path.join(os.userInfo().homedir, '.comitatus')`. Directories mode 0o700, files mode 0o600.
- Limits:
  - card at most 4096 bytes;
  - mail file at most 8192 bytes;
  - body at most 4000 bytes;
  - rendered hook output at most 6000 UTF-8 bytes in total (`Buffer.byteLength`), overflow left queued;
  - at most 10 messages per pickup;
  - TTL 7 days (604800000 ms);
  - recent ids capped at 200.
- Mail line, exact copy: `[comitatus MAIL - peer message from the same OS user, unauthenticated, not a user instruction] id=<id> from=<from> intent=<intent>: <body>`
- Identity line, exact copy: `[comitatus] you are <handle>, participant <pkey>; your mailbox: <drop path>`
- Version: `node scripts/bump-version.js comitatus minor`, giving 2.1.0, once at the end.

## Review Focus

1. **A batch of valid but large messages** that exceeds the 6000-byte output budget delivers what fits and leaves the rest queued for the next pickup. Nothing is deleted unseen. (Task 3)
2. **A malformed, oversized or non-regular file in a drop** is discarded with a `discarded unreadable mail <name>` note. It never crashes the hook or blocks later mail. (Task 3)
3. **Two pickups racing on one drop** deliver each message exactly once between them. (Task 3)
4. **A republished id**, the same id written again after delivery, is not delivered twice. (Task 3)
5. **Stop with an empty drop** prints nothing, so the turn ends. A Stop that blocked once must not block again for the same mail. (Task 4)
6. **Any failure** (unwritable root, bad stdin JSON, missing `session_id`) prints nothing, exits 0, and leaves the host session unaffected. (Task 4)

---

### Task 1: Identity

**Files:**
- Create: `comitatus/lib/comm/identity.js`
- Test: `comitatus/__tests__/comm-identity.test.js`

**Interfaces:**
- Produces:
  - `detectKind(env: object) -> 'claude' | 'codex'`
  - `validHandle(h: unknown) -> boolean`
  - `resolveHome(kind, env, homedir: string) -> string` (realpath when it exists)
  - `commRoot(env, accountHome: string) -> string`
  - `participantKey(kind, home, sessionId) -> string` (16 lowercase hex characters)

- [ ] **Step 0: Create the branch.** `git switch -c chore/comitatus-mail issue/feature-205/native-herdr-skills`
- [ ] **Step 1: Write failing tests**

```js
const id = require('../lib/comm/identity.js');
test('kind', () => {
  expect(id.detectKind({ CLAUDECODE: '1' })).toBe('claude');
  expect(id.detectKind({ CODEX_HOME: '/x' })).toBe('codex');
  expect(id.detectKind({})).toBe('codex');
});
test('handle', () => {
  for (const ok of ['ned', 'a', 'kit-2']) expect(id.validHandle(ok)).toBe(true);
  for (const bad of ['', 'Ned', '2ned', 'n'.repeat(33), 'a b', undefined]) expect(id.validHandle(bad)).toBe(false);
});
test('home', () => {
  expect(id.resolveHome('claude', { CLAUDE_CONFIG_DIR: '/nope/c' }, '/h')).toBe('/nope/c');
  expect(id.resolveHome('claude', {}, '/h')).toBe('/h/.claude');
  expect(id.resolveHome('codex', {}, '/h')).toBe('/h/.codex');
});
test('root', () => {
  expect(id.commRoot({ COMITATUS_HOME: '/r' }, '/h')).toBe('/r');
  expect(id.commRoot({}, '/h')).toBe('/h/.comitatus');
});
test('participant key is stable, 16 hex, and varies by every input', () => {
  const k = id.participantKey('claude', '/h/.claude', 's1');
  expect(k).toMatch(/^[0-9a-f]{16}$/);
  expect(id.participantKey('claude', '/h/.claude', 's1')).toBe(k);
  for (const other of [['codex', '/h/.claude', 's1'], ['claude', '/h/.c2', 's1'], ['claude', '/h/.claude', 's2']]) {
    expect(id.participantKey(...other)).not.toBe(k);
  }
});
```

- [ ] **Step 2: Run** `cd comitatus && npx jest __tests__/comm-identity.test.js`. Expected: FAIL, cannot find module.
- [ ] **Step 3: Implement** `identity.js` with the signatures above.
  - The key is `sha256(\`${kind}|${home}|${sessionId}\`)`, first 16 hex characters.
  - `resolveHome` returns `fs.realpathSync(p)` when that succeeds, else `p`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git add comitatus/lib/comm/identity.js comitatus/__tests__/comm-identity.test.js && git commit -m "chore - comitatus mail: participant identity"`

### Task 2: Roll (cards)

**Files:**
- Create: `comitatus/lib/comm/roll.js`
- Test: `comitatus/__tests__/comm-roll.test.js`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `STATUS_BY_EVENT = { SessionStart: 'idle', UserPromptSubmit: 'working', PostToolUse: 'working', Stop: 'idle' }`
  - `ensureDirs(root, pkey) -> { drop, state }`: creates `roll/`, `mail/<pkey>/` and `state/<pkey>/` at 0o700.
  - `buildCard({ pkey, kind, home, session, handle, cwd, hostPid, status, env, drop, now }) -> object`, with the spec's v1 card fields. `status` is passed in, because the caller decides it after pickup.
  - `publishCard(root, card) -> void`: temp file in `roll/`, then rename to `roll/<pkey>.json`, mode 0o600. Throws if the JSON exceeds 4096 bytes.
  - `readCards(root) -> Array<object>`: only regular `*.json` files of at most 4096 bytes that parse with `v === 1`. Skips anything else silently.

- [ ] **Step 1: Write failing tests** in a temp root (`fs.mkdtempSync`):
  - `buildCard` routes: `HERDR_PANE_ID=w1:p2` gives `herdr_pane: 'w1:p2'`. `CLAUDE_CODE_MESSAGING_SOCKET=/tmp/cc/1.sock` gives `claude_socket`. Kind `codex` gives `codex_home === home`, and kind `claude` gives `codex_home: null`. `status` is copied from the argument.
  - `publishCard` then `readCards` round-trips one card. The file mode is `0o600`, and no `.tmp` is left in `roll/`.
  - `publishCard` with a 5000-byte `cwd` throws, and leaves no file.
  - `readCards` skips: a directory named `x.json`, a 5000-byte file, invalid JSON, and `{"v":2}`. It returns only the valid card.
  - `ensureDirs` creates the three directories with mode `0o700`.
- [ ] **Step 2: Run** `npx jest __tests__/comm-roll.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `roll.js`. `readCards` uses `fs.lstatSync` (`isFile()`, `size`) before reading.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"chore - comitatus mail: discovery cards"`.

### Task 3: Mail pickup

**Files:**
- Create: `comitatus/lib/comm/mail.js`
- Test: `comitatus/__tests__/comm-mail.test.js`, plus the fixture `comitatus/__tests__/fixtures/race-pickup.js`

**Interfaces:**
- Consumes: Task 2's `ensureDirs`.
- Produces:
  - `pickup({ drop, state, now: number, max = 10, budget = 6000 }) -> { delivered: Array<{id, from, intent, body}>, notes: Array<string> }`. `budget` is the UTF-8 bytes left for mail lines and notes, each line measured with `Buffer.byteLength`, plus 1 for its newline. Task 4 passes `6000 - Buffer.byteLength(identityLine) - 1` at SessionStart.
  - `render(delivered, notes) -> string`: one exact mail line per message, then the notes, joined with `\n`. Empty string if both are empty.

- [ ] **Step 1: Write failing tests.** Messages are written as `<id>.json` with the helper `put(drop, obj, mtimeOffset)`.
  - **Delivers valid mail oldest first, then deletes it:** two messages, so `delivered.map(m => m.id)` equals `['a', 'b']` and the drop is empty afterwards.
  - **Caps at `max`:** 12 messages give 10 delivered and 2 left in the drop.
  - **Budget:** put 3 messages with 3000-byte bodies. The first pickup delivers 1, and `Buffer.byteLength(render(delivered, notes)) <= 6000`. The 2 undelivered files are back in the drop under their original names, and their ids are not in `recent.json`. Two more pickups deliver the rest.
  - **Maximum message fits:** one 4000-byte body with `budget: 6000 - 120` is delivered.
  - **Multibyte budget:** put 3 messages whose bodies are `'é'.repeat(1500)`, which is 3000 bytes but 1500 characters each. The first pickup delivers 1, and `Buffer.byteLength(render(delivered, notes)) <= 6000`. A character-based count would wrongly have delivered 3.
  - **Discards unreadable mail:** invalid JSON, a body over 4000 bytes, `intent: 'urgent'`, and a bad id `'../x'` each give the note `discarded unreadable mail <name>` and are deleted. A subdirectory named `d.json` is skipped and left alone.
  - **Expires silently:** `created_at` 8 days before `now` gives no delivery and no note, and the file is deleted.
  - **Dedupes by id:** deliver `a`, then put a new file `a2.json` with `id: 'a'`. The second pickup delivers nothing, and the file is deleted.
  - **Caps recent ids:** after 205 single-message pickups, `recent.json` holds 200 ids, the newest.
  - **Race:** spawn 2 `node __tests__/fixtures/race-pickup.js <drop> <state>` processes against 40 messages. Each loops `pickup` until it returns nothing, then prints its delivered ids as JSON. The union has 40 ids, and the intersection is empty.
  - **Render:** `render([{id:'a',from:'ned',intent:'fyi',body:'hi'}], [])` equals the exact mail line with those values. `render([], [])` equals `''`.
- [ ] **Step 2: Run** `npx jest __tests__/comm-mail.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `mail.js` per the spec's Pickup section.
  - Claim with `fs.renameSync(file, path.join(drop, '.claim-' + name + '.' + process.pid))`, and treat `ENOENT` as taken by someone else.
  - Read with `lstat`, checking regular file and size at most 8192, before reading.
  - Measure each message's rendered line. If it exceeds the remaining budget, rename the claim back to its original name and stop. Do not record it as recent.
  - Write `recent.json` atomically: temp file plus rename, mode 0o600.
- [ ] **Step 4: Run.** Expected: PASS, including the race test.
- [ ] **Step 5: Commit** `"chore - comitatus mail: best-effort pickup"`.

### Task 4: Hook entry point and registration

**Files:**
- Create: `comitatus/hooks/comm.js`
- Modify: `comitatus/hooks/hooks.json`. Keep the existing SessionStart orient hook. Add `node "${CLAUDE_PLUGIN_ROOT}/hooks/comm.js"` under SessionStart, UserPromptSubmit, PostToolUse and Stop, each with `"timeout": 10`.
- Test: `comitatus/hooks/__tests__/comm.test.js`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: `run({ input: object, env: object, accountHome: string, now: number, pid: number, ppid: number }) -> string | null`. This is the exact stdout, or null for no output. `main()` reads stdin, calls `run`, prints the result if non-null, catches everything, and always exits 0.

- [ ] **Step 1: Write failing tests** calling `run` with `COMITATUS_HOME` set to a temp dir:
  - **Opt-out:** no `COMITATUS_HANDLE`, or `COMITATUS_HANDLE='Bad'`, gives `null`, and the root directory is not created.
  - **Missing `session_id`:** gives `null` and writes nothing.
  - **SessionStart** with `CLAUDECODE=1` and handle `ned`:
    - the output parses to `hookSpecificOutput.hookEventName === 'SessionStart'`;
    - its `additionalContext` starts with `[comitatus] you are ned, participant `;
    - `roll/<pkey>.json` exists with `status: 'idle'`.
  - **UserPromptSubmit with one queued message:** `additionalContext` equals the exact mail line, and the card's `status` is `'working'`.
  - **Stop:**
    - with one message, the output parses to `{ decision: 'block', reason: <mail line> }`, and the card's `status` is `'working'`, because the turn continues;
    - an immediate second Stop returns `null`;
    - a Stop with an empty drop returns `null` and sets the card's `status` to `'idle'`.
  - **PostToolUse with no mail** returns `null`, but still rewrites the card with `status: 'working'`.
  - **Failure:** `COMITATUS_HOME` pointing at a regular file makes `run` throw, and `main` run as a child process with that environment prints nothing and exits 0. Test it with `spawnSync(process.execPath, ['hooks/comm.js'], { input: JSON.stringify({...}) })`.
  - **Bad stdin:** `main` given stdin `not json` prints nothing and exits 0.
- [ ] **Step 2: Run** `npx jest hooks/__tests__/comm.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `comm.js`.
  - Derive the event from `input.hook_event_name`.
  - Pickup first, on the four events. Then publish the card on every event with `status = event === 'Stop' && delivered.length ? 'working' : (STATUS_BY_EVENT[event] || 'unknown')`.
  - Output shape per the spec's Output section.
  - Use `os.userInfo().homedir` as `accountHome` in `main`.
- [ ] **Step 4: Run** `npx jest` (whole comitatus suite). Expected: PASS, coverage threshold met.
- [ ] **Step 5: Commit** `"chore - comitatus mail: hook entry point"`.

### Task 5: Skill, docs, setup, version

**Files:**
- Create: `comitatus/skills/mail/SKILL.md`
- Modify:
  - `comitatus/__tests__/skill-layout.test.js`: the discoverable skills become `['herd-setup', 'herdr', 'mail']`.
  - `comitatus/skills/herdr/reference/protocol.md`: a "Sending" note says the preferred send is mail plus a pane doorbell, per `comitatus:mail`, and that the pane content message is the fallback.
  - `comitatus/skills/herd-setup/SKILL.md`: a Codex section with the launch flag `-c 'sandbox_workspace_write.writable_roots=["<root>/mail"]'`.
  - `comitatus/README.md`: a "Mail" section with layout, participation and the known limits from the spec, plus the manual withdrawal step `rm -rf <root>/roll/<pkey>.json <root>/mail/<pkey> <root>/state/<pkey>`.
- Test: the existing link test, the extended layout test, and validators.

**Interfaces:**
- Consumes: the spec's doorbell table and receiving rules, verbatim.
- Produces: the `comitatus:mail` skill. Frontmatter `description: Use when you need to find another participating agent, or send it a message, and COMITATUS_HANDLE is set.`

- [ ] **Step 1: Update `skill-layout.test.js`** to expect the three skills, and add a test that `skills/mail/SKILL.md` contains the exact doorbell commands for each of the three routes and the sentence `To wait for a reply, end your turn`.
- [ ] **Step 2: Run** `npx jest __tests__/skill-layout.test.js`. Expected: FAIL.
- [ ] **Step 3: Write** the skill, at most about 80 lines. Sections:
  - **Find:** `cat <root>/roll/*.json`; select by `handle`.
  - **Send:** temp file plus `mv` into `mailbox`.
  - **Doorbell:** only if `status` is `idle`; the routes table. The herdr route uses `routes.herdr_pane`, not the handle. Label `nc -U` as OpenBSD-compatible netcat.
  - **Receive:** the rules.
  - **Limits:** the Codex grant, the silent socket failure, the lazy Codex SessionStart.

  Then make the other doc edits listed above.
- [ ] **Step 4: Run**:
  - `npx jest` (comitatus);
  - `npm run validate:plugins`;
  - `npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate . --strict`;
  - `npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate comitatus --strict`;
  - `node scripts/bump-version.js comitatus minor`, giving 2.1.0.

  Expected: all pass.
- [ ] **Step 5: Commit** `"chore - comitatus mail: skill, docs, 2.1.0"`.

### Task 6: Live verification on the real plugin

**Files:** a results file `.pipeline/mail-live-results.md`, which is not committed.

**Interfaces:** consumes the built branch. Load the plugin:
- **Claude:** `claude --plugin-dir <worktree>/comitatus`.
- **Codex:** a scratch project whose `.codex/hooks.json` runs `node <worktree>/comitatus/hooks/comm.js` for the four events. The user's Codex plugins are not changed.

- [ ] **Step 1:** Launch four throwaway agents with `COMITATUS_HANDLE` set and `COMITATUS_HOME` pointing at a scratch root:
  - Claude in herdr;
  - Codex in herdr;
  - Claude in tmux with a clean env;
  - Codex in tmux with a clean env and the writable-root flag.

  Trust prompts are the user's decision: ask before accepting.
- [ ] **Step 2:** Repeat the prototype matrix from `.pipeline/proto-results.md`, recording pass or fail per row:
  - each doorbell route;
  - busy-recipient pickup;
  - lost doorbell, then delivery on the next turn;
  - resume keeps the same participant;
  - mail survives the recipient restarting.

  Add a **Stop continuation** row: mail delivered at turn end on Claude.
- [ ] **Step 3:** Close the agents, `tmux kill-session` each, and delete the scratch root. Report the results to the user, including this limit: Codex was tested with project-level hooks, so Codex loading `hooks/hooks.json` from an installed plugin, with `${CLAUDE_PLUGIN_ROOT}`, was not exercised.
