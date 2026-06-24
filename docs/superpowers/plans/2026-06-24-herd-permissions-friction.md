# herdr Permissions Friction Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut Claude Code permission prompts for herdr workflows by (a) adding composite `herd` wrapper verbs that self-exec herdr (no pipes, loops, or `$H` variable), (b) provisioning the helper at a stable, version-independent path so an allow-rule survives upgrades, (c) shipping a `/herd-setup` command that bakes a SAFE, per-verb allowlist, and (d) tightening the agent-to-agent protocol so every message states whether a reply is required.

**Architecture:** Three coordinated pieces. **herd.js** gains self-executing verbs (`status`, `pane`, `members`, `wait`, `send`, `send-wait-read`, `agent`) that run `herdr` themselves instead of reading a piped `herdr ... --json`, using the same injected-`run` pattern as `up`. **herdr-orient.js** provisions a copy of the skill into a fixed `~/.claude/comitatus/` (reusing the existing atomic-swap provisioner) and emits *that* stable `herd.js` path in the orientation. **`/herd-setup`** (backed by `scripts/herd-setup.js`) merges a curated allowlist into `settings.json` — the safe read/lifecycle herdr verbs plus **per-verb** `Bash(node <stable>/herd.js <verb>:*)` rules — deliberately excluding arbitrary-exec primitives (`herdr pane run`/`send-keys`) and destructive git verbs, which keep prompting.

**Tech Stack:** Node.js (CommonJS), Jest, dependency injection for `run`/`sleep`/`now`/`fs`/home-dir (matches the existing `up.js` and `herdr-orient.js` test seams).

## Global Constraints

- Skill files (`skills/herdr/**`) are authored in plain ASCII — no smart quotes, no non-ASCII except the existing model glyphs `◆ ◇ ⬨`. (Source: README "Single source of truth".)
- All new logic is unit-tested with injected dependencies; no test may spawn a real `herdr`, write to a real `~/.claude`, or sleep on a real clock.
- Back-compat: the existing stdin forms (`herdr agent list | node "$H" status jay`, `... pane`, `... members`, `... field`) MUST keep working unchanged — `__tests__/herd.test.js` asserts them.
- **No arbitrary-exec in the allowlist.** `SAFE_ALLOW` MUST NOT contain `Bash(herdr pane run:*)` or `Bash(herdr pane send-keys:*)` (raw shell / keystroke injection). Their only legitimate uses are encapsulated by the `send`/`send-wait-read`/`agent` verbs, which constrain them to fixed argv.
- **Per-verb helper rules, never a blanket `herd.js:*`.** A blanket rule would auto-bless any verb added later. Bake one rule per known safe verb.
- **The machine-specific baked rule is user/local scope only.** The baked `Bash(node /Users/<you>/...)` rule embeds an absolute home path and MUST NOT be written into a committed (`--project`) settings file.
- Never auto-allow a destructive git verb: no `Bash(git branch:*)`, `Bash(git reset:*)`, `Bash(git checkout:*)`, `Bash(git push:*)`, `Bash(git worktree remove:*)`, or any `--hard`/`-D`/`--force` rule. (`herdr worktree remove:*` IS allowed — it tears down a herdr worktree, not git history. `--force` there can discard uncommitted changes in that worktree: a deliberate, accepted trade.)
- Before merging, run `node scripts/bump-version.js comitatus minor` (Task 13) — required for any branch touching plugin files.
- Run the comitatus suite after each JS task: `cd comitatus && npx jest --runInBand`.

---

### Task 1: Self-exec the data verbs (`status`/`pane`/`members`) with stdin fallback

Make the three read-only verbs run `herdr agent list` themselves when no JSON is piped, while still consuming piped JSON when present (back-compat).

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js`
- Test: `comitatus/__tests__/herd.test.js`

**Interfaces:**
- Consumes: `pane(data, handle)`, `status(data, handleOrPane)`, `members(data, workspaceId)` (existing pure fns), `defaultRun(file, args)` from `up.js`.
- Produces: `loadAgentList(data, deps)` → returns `data` if it already holds `result.agents`, else parses `run('herdr', ['agent','list'])`. `dispatch(argv, data, deps)` now accepts a third `deps` arg `{ run, sleep, now }` (all optional for the pure paths).

- [ ] **Step 1: Write the failing test**

Add to `comitatus/__tests__/herd.test.js`:

```js
describe('loadAgentList (self-exec fallback)', () => {
  test('uses piped data when present, never calling run (TTY/no-fetch path)', () => {
    let called = false;
    const deps = { run: () => { called = true; return '{}'; } };
    expect(h.loadAgentList(AGENTS, deps)).toBe(AGENTS);
    expect(called).toBe(false);
  });
  test('runs `herdr agent list` when stdin data is empty (no-stdin path)', () => {
    const calls = [];
    const deps = { run: (f, a) => { calls.push([f, ...a]); return JSON.stringify(AGENTS); } };
    const out = h.loadAgentList({}, deps);
    expect(calls).toEqual([['herdr', 'agent', 'list']]);
    expect(h.pane(out, 'jay')).toBe('w1:p2');
  });
  test('with neither stdin nor a runner, returns the input untouched', () => {
    expect(h.loadAgentList({}, undefined)).toEqual({});
  });
});

describe('dispatch self-exec', () => {
  test('status with empty stdin fetches the list via run', () => {
    const deps = { run: () => JSON.stringify(AGENTS) };
    expect(h.dispatch(['status', 'tim'], {}, deps)).toBe('done');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd.test -t "self-exec"`
Expected: FAIL — `h.loadAgentList is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `comitatus/skills/herdr/scripts/herd.js`, after `field(...)` and before `dispatch(...)`, add:

```js
function hasAgents(data) {
  return !!(data && data.result && Array.isArray(data.result.agents));
}

function loadAgentList(data, deps) {
  if (hasAgents(data)) return data;
  if (deps && deps.run) return JSON.parse(deps.run('herdr', ['agent', 'list']));
  return data; // no stdin, no runner: leave as-is (pure callers)
}
```

Replace `dispatch` with a `deps`-aware version (keep `field` stdin-only):

```js
function dispatch(argv, data, deps) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'pane':
      return pane(loadAgentList(data, deps), rest[0]);
    case 'status':
      return status(loadAgentList(data, deps), rest[0]);
    case 'members': {
      const i = rest.indexOf('--workspace');
      return members(loadAgentList(data, deps), i >= 0 ? rest[i + 1] : undefined);
    }
    case 'field':
      return field(data, rest[0]);
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}
```

Add `loadAgentList` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herd.test`
Expected: PASS — including the pre-existing `dispatch routes members --workspace` test (2-arg call; `deps` is `undefined`, `loadAgentList` returns the supplied `AGENTS`).

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/herd.test.js
git commit -m "chore - herd.js: self-exec status/pane/members with stdin fallback"
```

---

### Task 2: `wait` verb — poll for one of several statuses

Add `herd wait <handle> --status idle,done --timeout 45000`, replacing the `while [ "$(... status)" = working ]; do sleep; done` loops. Unlike `herdr wait agent-status` (one exact state), this accepts a comma list — the "free to receive = idle OR done" case.

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js`
- Test: `comitatus/__tests__/herd.test.js`

**Interfaces:**
- Consumes: `status(data, handle)`, `loadAgentList`, injected `deps = { run, sleep, now }`.
- Produces: `parseWait(args)` → `{ handle, statuses[], timeout, interval }`; `waitCmd(args, deps)` → resolves to the matched status string, throws `wait timeout: ...` past the deadline.

- [ ] **Step 1: Write the failing test**

```js
describe('parseWait', () => {
  test('defaults: idle, 45s, 1s interval', () => {
    expect(h.parseWait(['jay'])).toEqual({ handle: 'jay', statuses: ['idle'], timeout: 45000, interval: 1000 });
  });
  test('comma statuses and overrides', () => {
    expect(h.parseWait(['jay', '--status', 'idle,done', '--timeout', '9000', '--interval', '250']))
      .toEqual({ handle: 'jay', statuses: ['idle', 'done'], timeout: 9000, interval: 250 });
  });
});

describe('waitCmd', () => {
  test('returns as soon as the status matches one of the set', () => {
    const seq = ['working', 'working', 'done']; let i = 0;
    const deps = {
      run: () => JSON.stringify({ result: { agents: [{ name: 'jay', agent_status: seq[i++] }] } }),
      sleep: () => {}, now: () => 0,
    };
    expect(h.waitCmd(['jay', '--status', 'idle,done', '--interval', '1'], deps)).toBe('done');
  });
  test('throws on timeout, reporting the last seen status', () => {
    let t = 0;
    const deps = {
      run: () => JSON.stringify({ result: { agents: [{ name: 'jay', agent_status: 'working' }] } }),
      sleep: () => {}, now: () => (t += 1000),
    };
    expect(() => h.waitCmd(['jay', '--timeout', '1500', '--interval', '1'], deps))
      .toThrow(/wait timeout: jay is working, want idle/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd.test -t "waitCmd"`
Expected: FAIL — `h.waitCmd is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
function parseWait(args) {
  const out = { handle: args[0], statuses: ['idle'], timeout: 45000, interval: 1000 };
  for (let i = 1; i < args.length; i++) {
    const v = () => args[++i];
    if (args[i] === '--status') out.statuses = v().split(',').filter(Boolean);
    else if (args[i] === '--timeout') out.timeout = Number(v());
    else if (args[i] === '--interval') out.interval = Number(v());
  }
  return out;
}

function waitCmd(args, deps) {
  const cfg = parseWait(args);
  const deadline = deps.now() + cfg.timeout;
  for (;;) {
    const st = status(loadAgentList({}, deps), cfg.handle);
    if (cfg.statuses.includes(st)) return st;
    if (deps.now() >= deadline) {
      throw new Error(`wait timeout: ${cfg.handle} is ${st}, want ${cfg.statuses.join(',')}`);
    }
    deps.sleep(cfg.interval);
  }
}
```

Add `parseWait`, `waitCmd` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herd.test -t "Wait"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/herd.test.js
git commit -m "chore - herd.js: add wait verb (poll for one of N statuses)"
```

---

### Task 3: `send` verb — message + submit, with the reply/fyi protocol flag

Add `herd send <handle> <message> [--reply|--fyi] [--from <self>] [--codex]`. It resolves the recipient pane, sends, and presses Enter (twice for `--codex`). When `--reply`/`--fyi` is given it stamps the compact protocol header `[from <self> reply]` / `[from <self> fyi]`, resolving `<self>` from the focused agent unless `--from` overrides. This is what makes every outgoing message state whether a reply is required (see the protocol update in Task 12).

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js`
- Test: `comitatus/__tests__/herd.test.js`

**Interfaces:**
- Consumes: `pane(data, handle)`, `loadAgentList`, `agentList(data)` (existing module-internal), injected `deps = { run }`.
- Produces: `resolveSelf(data, override)` → the override, else the focused agent's `name`, else `undefined`; `stampPrefix(message, self, flag)` → leaves an already-`[from ...]`-prefixed message untouched; `sendCmd(args, deps)` → `{ result: { type: 'ok' }, pane, sent }`; throws `no agent: <handle>`.

- [ ] **Step 1: Write the failing test**

```js
describe('sendCmd', () => {
  const list = (focused) => JSON.stringify({ result: { agents: [
    { name: 'jay', pane_id: 'w1:p2' },
    { name: 'sly', pane_id: 'w1:p1', focused: !!focused },
  ] } });
  function runner(focused) {
    const calls = [];
    const run = (f, a) => { calls.push([f, ...a]); return (a[0] === 'agent' && a[1] === 'list') ? list(focused) : ''; };
    return { run, calls };
  }

  test('plain send: resolve pane, send, one Enter', () => {
    const { run, calls } = runner();
    expect(h.sendCmd(['jay', 'rerun the test'], { run }))
      .toEqual({ result: { type: 'ok' }, pane: 'w1:p2', sent: 'rerun the test' });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['herdr', 'agent', 'send', 'jay', 'rerun the test'],
      ['herdr', 'pane', 'send-keys', 'w1:p2', 'Enter'],
    ]);
  });

  test('--reply --from stamps the compact protocol header', () => {
    const { run, calls } = runner();
    const out = h.sendCmd(['jay', 'status?', '--reply', '--from', 'sly'], { run });
    expect(out.sent).toBe('[from sly reply] status?');
    expect(calls).toContainEqual(['herdr', 'agent', 'send', 'jay', '[from sly reply] status?']);
  });

  test('--fyi resolves <self> from the focused agent when --from is omitted', () => {
    const { run } = runner(true); // sly is focused
    expect(h.sendCmd(['jay', 'heads up', '--fyi'], { run }).sent).toBe('[from sly fyi] heads up');
  });

  test('does not double-prefix an already [from ...] message', () => {
    const { run } = runner(true);
    expect(h.sendCmd(['jay', '[from sly reply] hi', '--reply'], { run }).sent).toBe('[from sly reply] hi');
  });

  test('--codex adds a second Enter for the bracketed-paste gotcha', () => {
    const { run, calls } = runner();
    h.sendCmd(['jay', 'hello', '--codex'], { run });
    expect(calls.filter((c) => c[1] === 'pane' && c[2] === 'send-keys')).toEqual([
      ['herdr', 'pane', 'send-keys', 'w1:p2', 'Enter'],
      ['herdr', 'pane', 'send-keys', 'w1:p2', 'Enter'],
    ]);
  });

  test('throws on unknown handle', () => {
    const { run } = runner();
    expect(() => h.sendCmd(['ghost', 'hi'], { run })).toThrow(/no agent: ghost/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd.test -t "sendCmd"`
Expected: FAIL — `h.sendCmd is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
function resolveSelf(data, override) {
  if (override) return override;
  const a = agentList(data).find((x) => x && x.focused && x.name);
  return a ? a.name : undefined;
}

function stampPrefix(message, self, flag) {
  if (/^\s*\[from /.test(message)) return message; // caller already prefixed
  return `[from ${self} ${flag}] ${message}`;
}

function sendCmd(args, deps) {
  const handle = args[0];
  const message = args[1];
  const codex = args.includes('--codex');
  const reply = args.includes('--reply');
  const fyi = args.includes('--fyi');
  const fromI = args.indexOf('--from');
  const fromOverride = fromI >= 0 ? args[fromI + 1] : undefined;

  const data = loadAgentList({}, deps);
  const p = pane(data, handle);
  if (!p) throw new Error(`no agent: ${handle}`);

  let body = message;
  if (reply || fyi) {
    const self = resolveSelf(data, fromOverride);
    if (!self) throw new Error('cannot resolve sender handle (pass --from <self>)');
    body = stampPrefix(message, self, reply ? 'reply' : 'fyi');
  }

  deps.run('herdr', ['agent', 'send', handle, body]);
  deps.run('herdr', ['pane', 'send-keys', p, 'Enter']);
  if (codex) deps.run('herdr', ['pane', 'send-keys', p, 'Enter']);
  return { result: { type: 'ok' }, pane: p, sent: body };
}
```

Add `resolveSelf`, `stampPrefix`, `sendCmd` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herd.test -t "sendCmd"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/herd.test.js
git commit -m "chore - herd.js: add send verb with reply/fyi protocol flag"
```

---

### Task 4: `send-wait-read` verb — one-call operator round-trip

Add `herd send-wait-read <handle> <message> [--timeout ms] [--lines N] [--reply|--fyi] [--from <self>] [--codex]`: send, wait until the recipient is no longer `working`, then read its recent pane output and return it. This collapses the send -> poll -> read loop the operator drive pattern repeats constantly.

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js`
- Test: `comitatus/__tests__/herd.test.js`

**Interfaces:**
- Consumes: `sendCmd`, `waitCmd`, injected `deps = { run, sleep, now }`.
- Produces: `sendWaitReadCmd(args, deps)` → the recipient pane's recent text (string).

- [ ] **Step 1: Write the failing test**

```js
describe('sendWaitReadCmd', () => {
  function runner() {
    const calls = [];
    const seq = ['working', 'done'];
    let i = 0;
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: [
          { name: 'gus', pane_id: 'w1:p2', agent_status: seq[Math.min(i++, seq.length - 1)] },
          { name: 'sly', pane_id: 'w1:p1', focused: true },
        ] } });
      }
      if (a[0] === 'pane' && a[1] === 'read') return 'REVIEW: looks good\n';
      return '';
    };
    return { run, calls, deps: { run, sleep: () => {}, now: () => 0 } };
  }

  test('sends, waits for not-working, reads recent, returns the text', () => {
    const { calls, deps } = runner();
    const out = h.sendWaitReadCmd(['gus', 'review please', '--reply', '--from', 'sly', '--lines', '50'], deps);
    expect(out).toBe('REVIEW: looks good\n');
    expect(calls).toContainEqual(['herdr', 'agent', 'send', 'gus', '[from sly reply] review please']);
    expect(calls).toContainEqual(['herdr', 'pane', 'read', 'w1:p2', '--source', 'recent', '--lines', '50']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd.test -t "sendWaitReadCmd"`
Expected: FAIL — `h.sendWaitReadCmd is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
function sendWaitReadCmd(args, deps) {
  const handle = args[0];
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
  const timeout = String(Number(opt('--timeout', '60000')));
  const lines = String(Number(opt('--lines', '40')));

  const { pane: p } = sendCmd(args, deps); // sendCmd parses handle/message/--reply/--fyi/--from/--codex itself
  waitCmd([handle, '--status', 'idle,done', '--timeout', timeout], deps);
  return deps.run('herdr', ['pane', 'read', p, '--source', 'recent', '--lines', lines]);
}
```

Add `sendWaitReadCmd` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herd.test -t "sendWaitReadCmd"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/herd.test.js
git commit -m "chore - herd.js: add send-wait-read verb (operator round-trip)"
```

---

### Task 5: `agent` verb — spawn one agent into an existing worktree (with handle preflight)

Add `herd agent <model> <handle> --workspace <ws> --cwd <dir> [--label L] [--timeout ms]`: the "each additional agent" recipe (tab create -> resolve root pane -> pane run -> wait idle -> rename) as one call, with the same global handle-collision preflight `up` does.

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js`
- Test: `comitatus/__tests__/herd.test.js`

**Interfaces:**
- Consumes: `makeAgent(model, value)` from `up.js`, `members(data)`, `loadAgentList`, injected `deps = { run }`.
- Produces: `agentCmd(args, deps)` → `{ handle, model, pane_id, tab }`; throws `--workspace and --cwd are required` and `handle already taken: <handle>`.

- [ ] **Step 1: Write the failing test**

```js
describe('agentCmd', () => {
  const TAB = JSON.stringify({ result: { tab: { tab_id: 'wR:t2' }, root_pane: { pane_id: 'wR:p2' } } });
  function runner(existing = []) {
    const calls = [];
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: existing.map((name) => ({ name })) } });
      }
      return (a[0] === 'tab' && a[1] === 'create') ? TAB : '';
    };
    return { run, calls };
  }

  test('codex agent: preflight, tab create -> run -> wait -> rename', () => {
    const { run, calls } = runner();
    const out = h.agentCmd(['codex', 'jay', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(out).toEqual({ handle: 'jay', model: 'codex', pane_id: 'wR:p2', tab: 'wR:t2' });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus'],
      ['herdr', 'pane', 'run', 'wR:p2', 'codex'],
      ['herdr', 'wait', 'agent-status', 'wR:p2', '--status', 'idle', '--timeout', '45000'],
      ['herdr', 'agent', 'rename', 'wR:p2', 'jay'],
    ]);
  });

  test('preflight rejects a globally taken handle without creating a tab', () => {
    const { run, calls } = runner(['jay']);
    expect(() => h.agentCmd(['codex', 'jay', '--workspace', 'wR', '--cwd', '/wt/x'], { run }))
      .toThrow(/handle already taken: jay/);
    expect(calls.some((c) => c[1] === 'tab' && c[2] === 'create')).toBe(false);
  });

  test('--timeout overrides the idle wait', () => {
    const { run, calls } = runner();
    h.agentCmd(['claude', 'sly', '--workspace', 'wR', '--cwd', '/wt/x', '--timeout', '9000'], { run });
    expect(calls).toContainEqual(['herdr', 'wait', 'agent-status', 'wR:p2', '--status', 'idle', '--timeout', '9000']);
  });

  test('missing --cwd throws', () => {
    const { run } = runner();
    expect(() => h.agentCmd(['claude', 'sly', '--workspace', 'wR'], { run }))
      .toThrow(/--workspace and --cwd are required/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd.test -t "agentCmd"`
Expected: FAIL — `h.agentCmd is not a function`.

- [ ] **Step 3: Write minimal implementation**

At the top of `herd.js`, extend the existing import:

```js
const { up, defaultRun, makeAgent } = require('./up.js');
```

Add the verb:

```js
function agentCmd(args, deps) {
  const [model, handleVal] = args;
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
  const ws = opt('--workspace');
  const cwd = opt('--cwd');
  if (!ws || !cwd) throw new Error('--workspace and --cwd are required');
  const timeout = String(Number(opt('--timeout', '45000')));
  const a = makeAgent(model, handleVal); // validates model / opencode handle:model

  // preflight: herdr enforces global handle uniqueness, but only after the tab
  // is built. Fail before creating anything.
  if (members(loadAgentList({}, deps)).includes(a.handle)) {
    throw new Error(`handle already taken: ${a.handle}`);
  }

  const label = opt('--label', `${a.handle} ${a.glyph}`);
  const tc = JSON.parse(deps.run('herdr',
    ['tab', 'create', '--workspace', ws, '--cwd', cwd, '--label', label, '--no-focus']));
  const pane = tc.result.root_pane.pane_id;
  const tab = tc.result.tab.tab_id;
  deps.run('herdr', ['pane', 'run', pane, a.runArgv]);
  deps.run('herdr', ['wait', 'agent-status', pane, '--status', 'idle', '--timeout', timeout]);
  deps.run('herdr', ['agent', 'rename', pane, a.handle]);
  return { handle: a.handle, model: a.model, pane_id: pane, tab };
}
```

Add `agentCmd` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herd.test -t "agentCmd"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/herd.test.js
git commit -m "chore - herd.js: add agent verb with handle-collision preflight"
```

---

### Task 6: Wire the new verbs into `dispatch`/`main` with real default deps

Route `wait`/`send`/`send-wait-read`/`agent` through `dispatch`, and give `main()` real `run`/`sleep`/`now`.

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js`
- Test: `comitatus/__tests__/herd.test.js`

**Interfaces:**
- Consumes: `waitCmd`, `sendCmd`, `sendWaitReadCmd`, `agentCmd`, `defaultRun`.
- Produces: `defaultDeps()` → `{ run: defaultRun, sleep, now }`; `dispatch` routes the four action verbs; `main()` passes `defaultDeps()` into `dispatch`.

- [ ] **Step 1: Write the failing test**

```js
describe('dispatch routes action verbs', () => {
  test('routes wait through waitCmd', () => {
    const deps = {
      run: () => JSON.stringify({ result: { agents: [{ name: 'jay', agent_status: 'idle' }] } }),
      sleep: () => {}, now: () => 0,
    };
    expect(h.dispatch(['wait', 'jay'], {}, deps)).toBe('idle');
  });
  test('unknown verb still throws', () => {
    expect(() => h.dispatch(['bogus'], {}, {})).toThrow(/unknown command/);
  });
});

describe('herd.js send wiring (child process)', () => {
  test('unknown verb path exits non-zero with a stderr diagnostic', () => {
    const { execFileSync } = require('child_process');
    let err;
    try {
      execFileSync('node', [HERD, 'send', 'ghost', 'hi'], { encoding: 'utf8', stdio: 'pipe', input: '' });
    } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.status).toBe(1);
    expect(String(err.stderr)).toMatch(/^herd: /m);
  });
});
```

(`HERD` is already defined near the bottom of the file by the existing `herd.js up wiring` block: `const HERD = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'herd.js');` — reuse it; do not redeclare.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd.test -t "action verbs"`
Expected: FAIL — `dispatch(['wait', ...])` falls through to `unknown command: wait`.

- [ ] **Step 3: Write minimal implementation**

Add to `dispatch` (before `default:`):

```js
    case 'wait':
      return waitCmd(rest, deps);
    case 'send':
      return sendCmd(rest, deps);
    case 'send-wait-read':
      return sendWaitReadCmd(rest, deps);
    case 'agent':
      return agentCmd(rest, deps);
```

Add `defaultDeps`:

```js
function defaultDeps() {
  return {
    run: defaultRun,
    sleep: (ms) => { try { require('child_process').execFileSync('sleep', [String(ms / 1000)]); } catch { /* noop */ } },
    now: () => Date.now(),
  };
}
```

In `main()`, change the dispatch call:

```js
  try {
    out = dispatch(argv, data, defaultDeps());
  } catch (e) {
    process.stderr.write(`herd: ${e.message}\n`);
    process.exit(1);
  }
```

Add `defaultDeps` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest`
Expected: PASS — full comitatus suite green.

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/herd.test.js
git commit -m "chore - herd.js: route wait/send/send-wait-read/agent verbs"
```

---

### Task 7: Provision the helper at a stable `~/.claude/comitatus/` path

Generalize the codex provisioner so it can also install the skill into a fixed Claude-side home (created if absent). Keep `provisionCodex`'s observable behavior identical so its tests stay green.

**Files:**
- Modify: `comitatus/hooks/herdr-orient.js`
- Test: `comitatus/hooks/__tests__/herdr-orient.test.js`

**Interfaces:**
- Consumes: existing `hashDir`, `copyDir`, `readHash`, atomic-swap body, `HASH_FILE`, `tmpCounter`.
- Produces: `provisionInto({ skillDir, home })` (shared core), `provisionStable({ skillDir, home })` (mkdir-then-provision), `stableHome(homedir)` → `<homedir>/.claude/comitatus`, `stableHerdJs(home)` → `<home>/skills/herdr/scripts/herd.js`.

- [ ] **Step 1: Write the failing test**

```js
describe('stable provisioning', () => {
  test('stableHome / stableHerdJs build the fixed paths', () => {
    expect(hook.stableHome('/Users/x')).toBe(path.join('/Users/x', '.claude', 'comitatus'));
    expect(hook.stableHerdJs('/h')).toBe(path.join('/h', 'skills', 'herdr', 'scripts', 'herd.js'));
  });
  test('provisionStable creates the home if absent, provisions, then no-ops', () => {
    const skillDir = makeFixtureSkill();
    const home = path.join(tmpdir(), 'claude-comitatus'); // does NOT exist yet
    expect(hook.provisionStable({ skillDir, home })).toEqual({ provisioned: true, reason: 'missing' });
    expect(fs.existsSync(hook.stableHerdJs(home))).toBe(true);
    expect(hook.provisionStable({ skillDir, home })).toEqual({ provisioned: false, reason: 'current' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herdr-orient -t "stable provisioning"`
Expected: FAIL — `hook.provisionStable is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `herdr-orient.js`, extract the swap body shared by both provisioners. Replace the current `provisionCodex` with a generic core plus wrappers:

```js
function provisionInto({ skillDir, home }) {
  const skillsDir = path.join(home, 'skills');
  const destSkills = path.join(skillsDir, 'herdr');
  const srcHash = hashDir(skillDir);

  const curHash = readHash(path.join(destSkills, HASH_FILE));
  if (curHash === srcHash) return { provisioned: false, reason: 'current' };

  fs.mkdirSync(skillsDir, { recursive: true });
  tmpCounter += 1;
  const tmpDir = path.join(skillsDir, `.herdr.tmp.${process.pid}.${tmpCounter}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    copyDir(skillDir, tmpDir);
    fs.writeFileSync(path.join(tmpDir, HASH_FILE), srcHash + '\n');
    try {
      fs.rmSync(destSkills, { recursive: true, force: true });
      fs.renameSync(tmpDir, destSkills);
    } catch (e) {
      if (readHash(path.join(destSkills, HASH_FILE)) !== srcHash) throw e;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return { provisioned: true, reason: curHash ? 'stale' : 'missing' };
}

function provisionCodex({ skillDir, codexHome }) {
  if (!fs.existsSync(codexHome)) return { provisioned: false, reason: 'codex-absent' };
  return provisionInto({ skillDir, home: codexHome });
}

function provisionStable({ skillDir, home }) {
  fs.mkdirSync(home, { recursive: true });
  return provisionInto({ skillDir, home });
}

function stableHome(homedir) { return path.join(homedir, '.claude', 'comitatus'); }
function stableHerdJs(home) { return path.join(home, 'skills', 'herdr', 'scripts', 'herd.js'); }
```

Add `provisionInto`, `provisionStable`, `stableHome`, `stableHerdJs` to `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herdr-orient`
Expected: PASS — new block AND the untouched `provisionCodex` blocks (`codex-absent`, `missing`, `current`, `stale`, atomic-swap hardening).

- [ ] **Step 5: Commit**

```bash
git add comitatus/hooks/herdr-orient.js comitatus/hooks/__tests__/herdr-orient.test.js
git commit -m "chore - orient: provision helper to a stable ~/.claude/comitatus path"
```

---

### Task 8: Emit the stable path in the orientation

Provision the stable copy on SessionStart and put its path in the orientation, replacing the version-pinned framing with stable-path + allowlist guidance. Fall back to the plugin's own `herd.js` if the stable provision fails.

**Files:**
- Modify: `comitatus/hooks/herdr-orient.js`
- Test: `comitatus/hooks/__tests__/herdr-orient.test.js`

**Interfaces:**
- Consumes: `provisionStable`, `stableHome`, `stableHerdJs`, `buildOrientation`.
- Produces: `buildOrientation(herdJsPath)` emits stable-path + permissions wording + the absolute-path rule; `processSessionStart` provisions the stable home and passes `helperPath = stable on success else herdJsPath`.

- [ ] **Step 1: Write the failing test**

Replace the three `buildOrientation` content assertions that pin the old wording with:

```js
describe('buildOrientation (stable path)', () => {
  test('emits a copy-pasteable H= of the helper path', () => {
    expect(hook.buildOrientation('/abs/herd.js')).toContain('H=/abs/herd.js');
  });
  test('frames the path as stable + allowlistable, not version-pinned', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/stable/i);
    expect(c).toMatch(/allowlist|permission/i);
    expect(c).not.toMatch(/version-pinned/i);
  });
  test('tells the agent to call the literal path (not the $H variable)', () => {
    expect(hook.buildOrientation('/abs/herd.js')).toMatch(/node \/abs\/herd\.js/);
  });
});

describe('processSessionStart emits the stable path', () => {
  test('orientation contains the stable herd.js path when provisioning succeeds', () => {
    const stableHomeDir = path.join(tmpdir(), 'claude-comitatus');
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS,
      codexHome: '/nonexistent', stableHome: stableHomeDir,
    });
    expect(r.hookSpecificOutput.additionalContext).toContain(hook.stableHerdJs(stableHomeDir));
  });
  test('falls back to the plugin herd.js when the stable provision throws', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: '/definitely/not/here', herdJsPath: '/abs/herd.js',
      codexHome: '/nonexistent', stableHome: path.join(tmpdir(), 'claude-comitatus'),
    });
    expect(r.hookSpecificOutput.additionalContext).toContain('/abs/herd.js');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herdr-orient -t "stable path"`
Expected: FAIL — old wording says "version-pinned"; `processSessionStart` ignores `stableHome`.

- [ ] **Step 3: Write minimal implementation**

Rewrite `buildOrientation`:

```js
function buildOrientation(herdJsPath) {
  return [
    '# herdr (comitatus)',
    '',
    'You are running inside herdr, a terminal-native agent multiplexer.',
    'Invoke the `comitatus:herdr` skill for worktree / herd / pane / agent workflows.',
    '',
    'Roster/state + composite helper. Capture the path into `H`:',
    '',
    `    H=${herdJsPath}`,
    '',
    'verbs: status|pane|members|field|wait|send|send-wait-read|agent (status/pane/',
    'members also read `herdr ... --json` on stdin). This path is STABLE across',
    'comitatus updates, so it can be allowlisted once with `/herd-setup`.',
    '',
    'To run WITHOUT a permission prompt, call the helper by this absolute path, e.g.',
    `\`node ${herdJsPath} status jay\` - NOT \`node "$H" ...\`: the permission matcher`,
    'cannot see through the `$H` variable, so a variable call still prompts.',
  ].join('\n');
}
```

Update `processSessionStart` (add `stableHome` param and the provision/select):

```js
function processSessionStart({ env, skillDir, herdJsPath, codexHome, stableHome }) {
  if (env.HERDR_ENV !== '1') return null;

  let provision = { provisioned: false, reason: 'skipped' };
  try { provision = provisionCodex({ skillDir, codexHome }); }
  catch (e) { provision = { provisioned: false, reason: 'error', error: String((e && e.message) || e) }; }

  let helperPath = herdJsPath; // fallback: the plugin's own copy
  if (stableHome) {
    try { provisionStable({ skillDir, home: stableHome }); helperPath = stableHerdJs(stableHome); }
    catch { /* keep fallback */ }
  }

  let additionalContext = buildOrientation(helperPath);
  if (provision.provisioned) {
    additionalContext += `\n\nProvisioned the herdr skill for codex at ${path.join(codexHome, 'skills', 'herdr')}.`;
  }

  return {
    systemMessage: `📍 comitatus: herdr${provision.provisioned ? ' (codex synced)' : ''}`,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
  };
}
```

In `main()`, pass the stable home:

```js
  const result = processSessionStart({
    env: process.env,
    skillDir: SKILL_DIR,
    herdJsPath: HERD_JS,
    codexHome: path.join(os.homedir(), '.codex'),
    stableHome: stableHome(os.homedir()),
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herdr-orient`
Expected: PASS. The existing `processSessionStart gating` tests call without `stableHome` (undefined) — the `if (stableHome)` guard keeps them on the fallback, so they still `toContain(HERD_JS)`.

- [ ] **Step 5: Commit**

```bash
git add comitatus/hooks/herdr-orient.js comitatus/hooks/__tests__/herdr-orient.test.js
git commit -m "chore - orient: emit the stable helper path with allowlist guidance"
```

---

### Task 9: `herd-setup.js` — merge a SAFE, per-verb allowlist into settings.json

A node script that idempotently merges the curated rules into a target settings file: the safe read/lifecycle herdr verbs + read-only git, plus one **per-verb** baked rule per helper verb. It excludes arbitrary-exec primitives, keeps the machine-specific baked rules out of `--project` scope, reports deny/ask conflicts, and provisions the stable copy so the baked rules have a target.

**Files:**
- Create: `comitatus/scripts/herd-setup.js`
- Test: `comitatus/__tests__/herd-setup.test.js`

**Interfaces:**
- Consumes: `stableHome`, `stableHerdJs`, `provisionStable` from `../hooks/herdr-orient.js`; injected `{ raw, homedir, scope }` (no real fs in tests).
- Produces:
  - `SAFE_ALLOW` — frozen array (no `pane run`/`send-keys`).
  - `HELPER_VERBS` — the safe verb names.
  - `bakedHerdRules(homedir)` → one `Bash(node <stable> <verb>:*)` per verb (NO blanket `herd.js:*`).
  - `mergeAllow(existing, additions)` → deduped union, order preserved.
  - `findConflicts(json, additions)` → additions also present in `permissions.deny`/`ask`.
  - `applySettings({ raw, homedir, scope })` → `{ json, added, conflicts }`; omits the baked rules when `scope === 'project'`.

- [ ] **Step 1: Write the failing test**

```js
const s = require('../scripts/herd-setup.js');

describe('SAFE_ALLOW', () => {
  test('includes safe read/lifecycle verbs + read-only git', () => {
    expect(s.SAFE_ALLOW).toEqual(expect.arrayContaining([
      'Bash(herdr agent list)', 'Bash(herdr agent send:*)', 'Bash(herdr wait:*)',
      'Bash(herdr worktree remove:*)', 'Bash(git fetch:*)', 'Bash(git branch)', 'Bash(sleep:*)',
    ]));
  });
  test('NEVER includes arbitrary-exec or destructive rules', () => {
    for (const bad of ['Bash(herdr pane run:*)', 'Bash(herdr pane send-keys:*)',
      'Bash(git branch:*)', 'Bash(git reset:*)', 'Bash(git checkout:*)',
      'Bash(git push:*)', 'Bash(git worktree remove:*)']) {
      expect(s.SAFE_ALLOW).not.toContain(bad);
    }
  });
});

describe('bakedHerdRules', () => {
  test('one rule per verb, targeting the stable path, NO blanket rule', () => {
    const rules = s.bakedHerdRules('/Users/x');
    const base = '/Users/x/.claude/comitatus/skills/herdr/scripts/herd.js';
    expect(rules).toContain(`Bash(node ${base} send:*)`);
    expect(rules).toContain(`Bash(node ${base} wait:*)`);
    expect(rules).toContain(`Bash(node ${base} send-wait-read:*)`);
    expect(rules).not.toContain(`Bash(node ${base}:*)`); // no blanket
  });
});

describe('mergeAllow', () => {
  test('dedupes and preserves order, appends new', () => {
    expect(s.mergeAllow(['Bash(a)', 'Bash(b)'], ['Bash(b)', 'Bash(c)']))
      .toEqual(['Bash(a)', 'Bash(b)', 'Bash(c)']);
  });
});

describe('applySettings scope handling', () => {
  test('user scope adds the baked machine rules', () => {
    const { json } = s.applySettings({ raw: '', homedir: '/Users/x', scope: 'user' });
    expect(JSON.parse(json).permissions.allow).toContain(s.bakedHerdRules('/Users/x')[0]);
  });
  test('project scope omits the machine-specific baked rules', () => {
    const { json } = s.applySettings({ raw: '', homedir: '/Users/x', scope: 'project' });
    const allow = JSON.parse(json).permissions.allow;
    expect(allow).toContain('Bash(herdr agent list)');
    for (const r of s.bakedHerdRules('/Users/x')) expect(allow).not.toContain(r);
  });
  test('preserves unrelated settings + existing entries; idempotent', () => {
    const first = s.applySettings({ raw: '', homedir: '/Users/x', scope: 'user' }).json;
    const withExtra = JSON.parse(first);
    withExtra.model = 'opus';
    withExtra.permissions.allow.unshift('Bash(ls:*)');
    const second = s.applySettings({ raw: JSON.stringify(withExtra), homedir: '/Users/x', scope: 'user' });
    const parsed = JSON.parse(second.json);
    expect(parsed.model).toBe('opus');
    expect(parsed.permissions.allow[0]).toBe('Bash(ls:*)');
    expect(second.added).toEqual([]);
  });
});

describe('findConflicts', () => {
  test('flags an addition that is also denied or asked', () => {
    const json = { permissions: { deny: ['Bash(herdr agent list)'], ask: ['Bash(git fetch:*)'] } };
    const c = s.findConflicts(json, ['Bash(herdr agent list)', 'Bash(git fetch:*)', 'Bash(sleep:*)']);
    expect(c).toEqual([
      { rule: 'Bash(herdr agent list)', in: 'deny' },
      { rule: 'Bash(git fetch:*)', in: 'ask' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd comitatus && npx jest herd-setup`
Expected: FAIL — `Cannot find module '../scripts/herd-setup.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `comitatus/scripts/herd-setup.js`:

```js
#!/usr/bin/env node
'use strict';

const { stableHome, stableHerdJs, provisionStable } = require('../hooks/herdr-orient.js');

const SAFE_ALLOW = Object.freeze([
  // herdr: read / inspect
  'Bash(herdr agent list)',
  'Bash(herdr pane list)',
  'Bash(herdr pane read:*)',
  'Bash(herdr workspace list)',
  'Bash(herdr worktree list:*)',
  'Bash(herdr integration status)',
  // herdr: messaging + lifecycle (NOT pane run / send-keys - those are arbitrary
  // exec/injection and are reachable only through the gated composite verbs)
  'Bash(herdr agent send:*)',
  'Bash(herdr agent rename:*)',
  'Bash(herdr wait:*)',
  'Bash(herdr tab create:*)',
  'Bash(herdr tab rename:*)',
  'Bash(herdr tab focus:*)',
  'Bash(herdr tab close:*)',
  'Bash(herdr workspace create:*)',
  'Bash(herdr workspace close:*)',
  'Bash(herdr worktree create:*)',
  'Bash(herdr worktree open:*)',
  'Bash(herdr worktree remove:*)',
  // git: read-only + the safe fetch `up` uses
  'Bash(git fetch:*)',
  'Bash(git status:*)',
  'Bash(git branch)',
  'Bash(git branch --show-current:*)',
  // misc
  'Bash(sleep:*)',
]);

// One rule per known-safe verb - never a blanket `herd.js:*`, so a verb added
// later is not auto-allowed. `field` is omitted: it is only used piped (a pipe
// can't be allowlisted anyway).
const HELPER_VERBS = Object.freeze([
  'status', 'pane', 'members', 'wait', 'send', 'send-wait-read', 'agent',
]);

function bakedHerdRules(homedir) {
  const base = stableHerdJs(stableHome(homedir));
  return HELPER_VERBS.map((v) => `Bash(node ${base} ${v}:*)`);
}

function mergeAllow(existing, additions) {
  const out = existing.slice();
  for (const rule of additions) if (!out.includes(rule)) out.push(rule);
  return out;
}

function findConflicts(json, additions) {
  const deny = (json.permissions && json.permissions.deny) || [];
  const ask = (json.permissions && json.permissions.ask) || [];
  const out = [];
  for (const rule of additions) {
    if (deny.includes(rule)) out.push({ rule, in: 'deny' });
    else if (ask.includes(rule)) out.push({ rule, in: 'ask' });
  }
  return out;
}

function applySettings({ raw, homedir, scope = 'user' }) {
  const json = raw && raw.trim() ? JSON.parse(raw) : {};
  if (!json.permissions || typeof json.permissions !== 'object') json.permissions = {};
  if (!Array.isArray(json.permissions.allow)) json.permissions.allow = [];

  const additions = scope === 'project'
    ? SAFE_ALLOW.slice() // committed file: no machine-specific home path
    : mergeAllow(SAFE_ALLOW.slice(), bakedHerdRules(homedir));

  const conflicts = findConflicts(json, additions);
  const before = json.permissions.allow.slice();
  json.permissions.allow = mergeAllow(before, additions);
  const added = json.permissions.allow.filter((r) => !before.includes(r));
  return { json: JSON.stringify(json, null, 2) + '\n', added, conflicts };
}

function main() {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const scope = process.argv.includes('--project') ? 'project'
    : process.argv.includes('--local') ? 'local' : 'user';
  const homedir = os.homedir();
  const target = scope === 'project'
    ? path.join(process.cwd(), '.claude', 'settings.json')
    : path.join(homedir, '.claude', scope === 'local' ? 'settings.local.json' : 'settings.json');

  // ensure the baked rules have a real target before we point at it
  try {
    provisionStable({
      skillDir: path.join(__dirname, '..', 'skills', 'herdr'),
      home: stableHome(homedir),
    });
  } catch (e) { process.stderr.write(`herd-setup: stable provision skipped (${e.message})\n`); }

  let raw = '';
  try { raw = fs.readFileSync(target, 'utf8'); } catch { /* new file */ }
  const { json, added, conflicts } = applySettings({ raw, homedir, scope });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json);

  process.stdout.write(`herd-setup: wrote ${target} (${scope} scope)\n`);
  process.stdout.write(added.length
    ? `added ${added.length} rule(s):\n${added.map((r) => '  ' + r).join('\n')}\n`
    : 'no new rules (already current)\n');
  if (conflicts.length) {
    process.stdout.write('WARNING: these rules are shadowed by an existing deny/ask entry:\n');
    for (const c of conflicts) process.stdout.write(`  ${c.rule}  (in ${c.in})\n`);
  }
}

if (require.main === module) main();

module.exports = { SAFE_ALLOW, HELPER_VERBS, bakedHerdRules, mergeAllow, findConflicts, applySettings };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd comitatus && npx jest herd-setup`
Expected: PASS — all blocks.

- [ ] **Step 5: Commit**

```bash
git add comitatus/scripts/herd-setup.js comitatus/__tests__/herd-setup.test.js
git commit -m "chore - add herd-setup.js (safe per-verb allowlist, scope-aware)"
```

---

### Task 10: `/herd-setup` slash command

A command doc that runs `herd-setup.js`, resolving the plugin install path the way `onus/commands/init.md` does, and documenting scope.

**Files:**
- Create: `comitatus/commands/herd-setup.md`

- [ ] **Step 1: Write the command file**

Create `comitatus/commands/herd-setup.md`:

```markdown
---
description: Allowlist the safe herdr/git verbs to cut permission prompts
argument-hint: "[--local | --project]"
---

# herd-setup

Merge a curated allow-list of safe herdr workflow commands into your Claude Code
`settings.json`, so routine herdr driving and the `herd.js` composite verbs stop
prompting. Arbitrary-exec primitives (`herdr pane run`, `herdr pane send-keys`)
and destructive git verbs (`git branch -D`, `reset`, force-push) are deliberately
left OUT and keep prompting.

## Run it

Default = **user** scope (`~/.claude/settings.json`), recommended (herdr is used
across repos, and the baked helper-path rule is machine-specific):

\`\`\`bash
node "$(node -p "require(process.env.HOME + '/.claude/plugins/installed_plugins.json').plugins['comitatus@claude-domestique'][0].installPath")/scripts/herd-setup.js"
\`\`\`

Add `--local` for `~/.claude/settings.local.json` (machine, gitignored), or
`--project` for `.claude/settings.json` (committed, team-wide).

## What it adds

- Safe herdr verbs: `agent list/send/rename`, `pane read`, `wait`, and the
  `tab`/`workspace`/`worktree` lifecycle (including `worktree remove`).
- `git fetch`, read-only `git status`/`git branch`.
- One rule **per helper verb** at the stable path, e.g.
  `Bash(node <home>/.claude/comitatus/skills/herdr/scripts/herd.js send:*)` -
  so `status`/`wait`/`send`/`send-wait-read`/`agent` run prompt-free, but ONLY
  when you call the helper by its **absolute path** (the value after `H=` in your
  herdr orientation), not via the `$H` variable.

## What it will NOT add

- `herdr pane run` / `herdr pane send-keys` - raw shell / keystroke injection. The
  composite verbs cover their legitimate uses with fixed arguments.
- `git branch -D`, `git reset`, `git checkout`, `git push`, `git worktree remove`
  - irreversible or history-changing.
- A blanket `node .../herd.js:*` - rules are per-verb, so a future verb is not
  auto-allowed.
- The machine-specific baked rules under `--project` (they embed your home path).

Re-running is safe and idempotent. It warns if any rule it would add is shadowed
by an existing `deny`/`ask` entry.
```

- [ ] **Step 2: Verify the resolver matches the existing pattern**

Run: `grep -n "installed_plugins.json" onus/commands/init.md comitatus/commands/herd-setup.md`
Expected: both show the same `require(...).plugins[...][0].installPath` shape (only the plugin key differs: `comitatus@claude-domestique`).

- [ ] **Step 3: Commit**

```bash
git add comitatus/commands/herd-setup.md
git commit -m "chore - add /herd-setup command (safe herdr allowlist)"
```

---

### Task 11: README — permissions section

Document the friction problem, the `/herd-setup` fix, the absolute-path requirement, and the carve-outs. README is the only surface the human installer reads (SKILL.md body is model-only).

**Files:**
- Modify: `comitatus/README.md`

- [ ] **Step 1: Add the section**

Insert a new `## Permissions` section immediately before `## Single source of truth`:

```markdown
## Permissions (cutting prompt friction)

Driving a herd means many small `herdr` calls, and several recipes capture ids
with `$(...)`, pipe into `node "$H" ...`, or poll in a loop - shapes Claude Code
cannot statically analyze, so each one prompts. Two things reduce this to near
zero:

1. **Composite verbs.** `herd.js` exposes `status`, `pane`, `members`, `wait`,
   `send`, `send-wait-read`, and `agent` verbs that run `herdr` themselves - one
   static command instead of a pipe or a `while` loop. (`up` already does this
   for spinning up a whole worktree.)
2. **`/herd-setup`.** Run it once to merge a safe allow-list into your
   `settings.json` (user scope by default; `--local` or `--project` to change).
   It allows the safe herdr verbs, `git fetch`, read-only `git status`/`branch`,
   and one rule **per helper verb** at the stable path.

**Call the helper by its absolute path.** The allow-rule matches
`node /Users/you/.claude/comitatus/skills/herdr/scripts/herd.js send ...` - the
exact path your orientation prints after `H=`. A call written as `node "$H" ...`
still prompts, because the matcher cannot see through the `$H` variable.

**What stays prompting, on purpose.** `/herd-setup` never allows `herdr pane run`
or `herdr pane send-keys` (raw shell / keystroke injection - the composite verbs
cover their safe uses), nor `git branch -D`, `git reset`, `git checkout`,
`git push`, or `git worktree remove`. It never bakes a blanket `herd.js:*` rule
(so a future verb is not auto-allowed), and it keeps the machine-specific baked
rules out of committed (`--project`) settings. (`herdr worktree remove` *is*
allowed: it tears down a herdr worktree, not git history.) Re-running is
idempotent and warns on `deny`/`ask` conflicts.
```

- [ ] **Step 2: Verify no new non-ASCII**

Run: `LC_ALL=C grep -n '[^[:print:][:space:]]' comitatus/README.md`
Expected: only pre-existing decorative characters; the new section is plain ASCII.

- [ ] **Step 3: Commit**

```bash
git add comitatus/README.md
git commit -m "chore - README: document herd permissions and /herd-setup"
```

---

### Task 12: SKILL.md — verbs, stable path, honest recipes, and the reply/fyi protocol

Teach the agent the composite verbs and the absolute-path rule; convert the highest-friction recipes; **preserve the existing `${H:?}` guard and the send-keys/Enter submit pattern**; and tighten the from/to protocol so every message states whether a reply is required.

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md`

- [ ] **Step 1: Update the helper-path framing (quickstart ~line 16 and step 3 ~lines 147-150)**

Keep the `H="${H:?set H from your herdr orientation ...}"` guard line verbatim. Replace the surrounding prose so both places say the path is **stable and allowlistable**, list the full verb set, and state the absolute-path rule:

```text
`H` is the herd.js helper from your orientation's `H=...` line. It is STABLE
across comitatus updates and can be allowlisted once with `/herd-setup`.
verbs: status | pane | members | field | wait | send | send-wait-read | agent
(status/pane/members also accept `herdr ... --json` on stdin). To run WITHOUT a
prompt, call it by the absolute path from your orientation - `node /abs/.../herd.js
send jay "..."`, NOT `node "$H" ...` (the matcher can't see through `$H`).
```

- [ ] **Step 2: Convert recipe 5 (message a teammate) to `herd send`**

Replace the step-5 send block and the `hsend` wrapper with (keep the surrounding "the reply, not the ok, is delivery" prose):

```bash
# send + submit in one allowlisted call (resolves the pane, presses Enter):
node "$H" send jay "please rerun the failing test in src/api/" --reply
# a long codex message may need the extra Enter (bracketed paste):
node "$H" send jay "..." --reply --codex
```

- [ ] **Step 3: Convert recipe 3 (additional agent) to `herd agent`** (keep the `${H:?}` guard above it)

```bash
# each additional agent: one allowlisted call (preflight + tab create -> run -> wait -> rename)
node "$H" agent codex jay --workspace "$WS" --cwd "$WT"   # claude|codex|opencode handle[:model]
```

- [ ] **Step 4: Convert the status poll (protocol section ~line 305) to `herd wait`**

Replace the `while [ "$(... status ...)" = working ]; do sleep 1; done` loop with:

```bash
# wait until the recipient is free to receive (idle OR done):
node "$H" wait "$TO" --status idle,done --timeout 30000
```

- [ ] **Step 5: Tighten the from/to protocol — mandate the reply/fyi flag**

In the "agent-to-agent protocol (from/to)" section, change the message-format definition to:

```text
**message format - one line, with a mandatory reply flag:**

    [from <self> reply] <body>     # a one-line reply IS required
    [from <self> fyi]   <body>     # no reply expected - do NOT reply

`<self>` is your handle; reply to `<self>` with `[from <you> ...] <answer>`. A
newline submits early, so keep it one line. The `send` / `send-wait-read` verbs
stamp this flag for you: `--reply` -> `[from <self> reply]`, `--fyi` ->
`[from <self> fyi]`.
```

Update the **seeding** paragraph to require the literal send-back instruction once for a cold agent (handle + the `[from <you> reply|fyi]` format + "submit with Enter / use `node "$H" send`"), since a cold agent cannot infer it.

- [ ] **Step 6: Replace the version-pinned gotcha (~line 373)**

```text
- **the herd.js helper path is stable and allowlistable** - it comes from your
  orientation's `H=...` line (a fixed `~/.claude/comitatus/...` path, refreshed
  each session by the comitatus hook). Run `/herd-setup` once to allowlist its
  verbs. Call it by the absolute path for prompt-free runs; `node "$H" ...` still
  prompts (the matcher can't resolve the variable). codex agents use the stable
  `$HOME/.codex/skills/herdr/scripts/herd.js`.
```

- [ ] **Step 7: Verify ASCII, new verbs, protocol flag, and the preserved guard**

Run these and eyeball:
```bash
LC_ALL=C grep -n '[^[:print:][:space:]]' comitatus/skills/herdr/SKILL.md      # only ◆ ◇ ⬨
grep -nE 'node "\$H" (send|agent|wait)' comitatus/skills/herdr/SKILL.md        # new recipes present
grep -n 'from <self> reply' comitatus/skills/herdr/SKILL.md                    # protocol flag present
grep -n '\${H:?' comitatus/skills/herdr/SKILL.md                               # guard preserved
```
Expected: each returns the expected matches.

- [ ] **Step 8: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -m "chore - SKILL: composite verbs, stable path, reply/fyi protocol"
```

---

### Task 13: Version bump

Bump comitatus (new verbs + new command + protocol change = a feature → `minor`), per the CLAUDE.md merge gate.

**Files:**
- Modify (via script): `comitatus/package.json`, `comitatus/.claude-plugin/plugin.json` (if versioned there), `.claude-plugin/marketplace.json`

- [ ] **Step 1: Run the bump**

Run: `node scripts/bump-version.js comitatus minor`
Expected: prints the new version (0.2.0 → 0.3.0) and the files it updated.

- [ ] **Step 2: Verify the full suite is green**

Run: `cd comitatus && npx jest`
Expected: PASS — herd, up, orient, herd-setup suites.

- [ ] **Step 3: Commit**

```bash
git add comitatus/package.json comitatus/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore - bump comitatus to 0.3.0 (herd verbs + /herd-setup + protocol)"
```

---

## Self-Review

**1. Spec coverage:**
- Safe allowlist, no arbitrary exec → Task 9 `SAFE_ALLOW` + tests (excludes `pane run`/`send-keys`).
- Per-verb baked rules, no blanket → Task 9 `bakedHerdRules` + test.
- Baked rule out of committed scope → Task 9 `applySettings` project-scope test.
- Composite "herd wrapper commands" → Tasks 1–6 (`status`/`pane`/`members`/`wait`/`send`/`send-wait-read`/`agent`).
- `send-wait-read` round-trip (gus #9) → Task 4.
- Handle-collision preflight (gus #6) → Task 5.
- TTY/no-stdin coverage (gus #7) → Task 1.
- `/herd-setup` provisions the stable copy (gus #5) → Task 9 `main()`.
- Deny/ask conflict report (gus #8) → Task 9 `findConflicts`.
- Stable path (option 2) → Tasks 7–8.
- Honest literal-path recipes + preserve `${H:?}` guard (gus #4) → Task 12 steps 1/3/7.
- Reply/fyi protocol (compact form) → Task 3 (`--reply`/`--fyi`) + Task 12 step 5.
- Docs placement (README human, SKILL agent, command mechanism) → Tasks 10/11/12.
- Version bump gate → Task 13.

**2. Placeholder scan:** No `TBD`/"add error handling"/"similar to Task N" — every code step carries full code; SKILL.md edits give exact replacement text.

**3. Type consistency:**
- `deps` shape `{ run, sleep, now }` is consistent across `waitCmd`/`sendCmd`/`sendWaitReadCmd`/`agentCmd`/`defaultDeps`/`dispatch` (Tasks 2–6). `sendCmd` needs only `run`; `waitCmd`/`sendWaitReadCmd` need `run`+`sleep`+`now` — `defaultDeps` supplies all three.
- `sendCmd` parses its own flags, and `sendWaitReadCmd` forwards the same `args` array to it (Task 4) — so `--reply`/`--fyi`/`--from`/`--codex` are parsed once, in one place.
- `loadAgentList(data, deps)` fixed in Task 1, reused unchanged in Tasks 2/3/5.
- `provisionStable`/`stableHome`/`stableHerdJs` defined in Task 7, consumed in Task 8 (orientation) AND Task 9 (`herd-setup` imports them) — single source, no drift.

> **Consistency check to honor during execution:** the orientation's emitted path (Task 8 = `stableHerdJs(stableHome(os.homedir()))`) and the baked allow-rules (Task 9 = `bakedHerdRules(os.homedir())`, built from the SAME `stableHerdJs(stableHome(homedir))`) MUST produce the identical absolute base string, or the rules won't match the path the agent is told to call. Because Task 9 imports `stableHome`/`stableHerdJs` from the Task 7 hook rather than re-deriving them, they are guaranteed equal by construction — keep it that way (do not hardcode the path string in `herd-setup.js`).
