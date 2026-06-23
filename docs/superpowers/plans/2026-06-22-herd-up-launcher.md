# `up` Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `node "$H" up …` helper that creates a worktree and launches an N-agent herd in a single command, collapsing the multi-step `$()`-threaded recipe (5–9 permission prompts) into one.

**Architecture:** A new pure-orchestrator module `up.js` does the work via an injected command runner (`deps.run`), so it unit-tests with a fake. `herd.js` gains a thin `up` branch in `main()` that skips the stdin read, calls `up()`, and prints the JSON result. The existing stdin→JSON filter commands are untouched. SKILL.md recipes are rewritten around `up`.

**Tech Stack:** Node.js (CommonJS), Jest, herdr CLI.

## Global Constraints

- Plugin under change: **comitatus**. Bump its version before merge: `node scripts/bump-version.js comitatus minor` (0.1.4 → 0.2.0).
- Tests run with `cd comitatus && npm test` (Jest). Test files live in `comitatus/__tests__/`.
- `jest.config.js` ignores `/skills/` for coverage, so `up.js` and `herd.js` (both under `skills/`) do not count toward the 50%-line / 45%-branch thresholds — but they are still unit-tested here.
- Model → `{run argv, glyph}`: claude `{claude, ◆}`, codex `{codex, ◇}`, opencode `{opencode -m <model>, ⬨}`.
- Commit style: `chore - description`, HEREDOC, no attribution line in the subject; include the `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer.
- herdr JSON shapes (verified in `skills/herdr/reference/cli.md`):
  - `worktree create --json` → `result.worktree.path`, `result.worktree.open_workspace_id`, `result.root_pane.pane_id`, `result.tab.tab_id`.
  - `tab create` → `result.tab.tab_id`, `result.root_pane.pane_id`.
  - `agent list` → `result.agents[].name`.

## File Structure

- **Create** `comitatus/skills/herdr/scripts/up.js` — `parseArgs`, `makeAgent`, `up(argv, deps)`, `defaultRun`. The orchestrator. One responsibility: turn `up` flags into an ordered sequence of herdr/git calls and a result object.
- **Modify** `comitatus/skills/herdr/scripts/herd.js` — add the `up` branch to `main()`; require `up.js`. No change to existing pure functions.
- **Create** `comitatus/__tests__/up.test.js` — unit tests for parsing and orchestration (fake runner).
- **Modify** `comitatus/skills/herdr/SKILL.md` — rewrite quickstart + two composed flows around `up`; add a short `up` reference and a gotcha note.
- **Modify** `.claude-plugin/marketplace.json` + `comitatus/package.json` — via the bump-version script.

---

### Task 1: `up.js` argument parsing (`parseArgs`, `makeAgent`)

**Files:**
- Create: `comitatus/skills/herdr/scripts/up.js`
- Test: `comitatus/__tests__/up.test.js`

**Interfaces:**
- Produces:
  - `makeAgent(model, value) -> { model, handle, runArgv, glyph }`. `model` ∈ `{claude, codex, opencode}`. For `opencode`, `value` is `<handle>:<model>` (split on the **first** colon, so the model may itself contain colons, e.g. `ollama/qwen2.5:7b`); missing handle or model throws.
  - `parseArgs(argv) -> { branch, base, timeout, agents }`. `agents` is an array of `makeAgent` results in flag order. Defaults: `base='origin/main'`, `timeout=45000`. Throws on missing `--branch`, zero agents, duplicate handle, unknown flag, or a flag missing its value.

- [ ] **Step 1: Write the failing tests for `makeAgent` and `parseArgs`**

Create `comitatus/__tests__/up.test.js`:

```js
const { parseArgs, makeAgent } = require('../skills/herdr/scripts/up.js');

describe('makeAgent', () => {
  test('claude → ◆ glyph, "claude" argv', () => {
    expect(makeAgent('claude', 'sly'))
      .toEqual({ model: 'claude', handle: 'sly', runArgv: 'claude', glyph: '◆' });
  });
  test('codex → ◇ glyph, "codex" argv', () => {
    expect(makeAgent('codex', 'jay'))
      .toEqual({ model: 'codex', handle: 'jay', runArgv: 'codex', glyph: '◇' });
  });
  test('opencode splits handle:model into "opencode -m <model>" (model may contain colons)', () => {
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b')).toEqual({
      model: 'opencode', handle: 'bob',
      runArgv: 'opencode -m ollama/qwen2.5:7b', glyph: '⬨',
    });
  });
  test('opencode without :model throws', () => {
    expect(() => makeAgent('opencode', 'bob')).toThrow(/<handle>:<model>/);
  });
});

describe('parseArgs', () => {
  test('collects agents in flag order with defaults', () => {
    const cfg = parseArgs(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay']);
    expect(cfg.branch).toBe('chore/x');
    expect(cfg.base).toBe('origin/main');
    expect(cfg.timeout).toBe(45000);
    expect(cfg.agents.map((a) => a.handle)).toEqual(['sly', 'jay']);
  });
  test('--base and --timeout override defaults', () => {
    const cfg = parseArgs(['--branch', 'b', '--base', 'origin/dev', '--timeout', '9000', '--claude', 'sly']);
    expect(cfg.base).toBe('origin/dev');
    expect(cfg.timeout).toBe(9000);
  });
  test('missing --branch throws', () => {
    expect(() => parseArgs(['--claude', 'sly'])).toThrow(/--branch is required/);
  });
  test('zero agent flags throws', () => {
    expect(() => parseArgs(['--branch', 'b'])).toThrow(/at least one agent/);
  });
  test('duplicate handle throws', () => {
    expect(() => parseArgs(['--branch', 'b', '--claude', 'sly', '--codex', 'sly']))
      .toThrow(/duplicate handle/);
  });
  test('unknown flag throws', () => {
    expect(() => parseArgs(['--branch', 'b', '--bogus', 'x'])).toThrow(/unknown flag/);
  });
  test('flag missing its value throws', () => {
    expect(() => parseArgs(['--branch'])).toThrow(/missing value for --branch/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd comitatus && npx jest up.test.js`
Expected: FAIL — `Cannot find module '../skills/herdr/scripts/up.js'`.

- [ ] **Step 3: Implement `up.js` parsing**

Create `comitatus/skills/herdr/scripts/up.js`:

```js
#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

const MODELS = {
  claude: { glyph: '◆', argv: () => 'claude' },
  codex: { glyph: '◇', argv: () => 'codex' },
  opencode: { glyph: '⬨', argv: (model) => `opencode -m ${model}` },
};

function makeAgent(model, value) {
  if (model === 'opencode') {
    const i = value.indexOf(':');
    const handle = i >= 0 ? value.slice(0, i) : '';
    const ocModel = i >= 0 ? value.slice(i + 1) : '';
    if (!handle || !ocModel) {
      throw new Error(`--opencode needs <handle>:<model> (got "${value}")`);
    }
    return { model, handle, runArgv: MODELS.opencode.argv(ocModel), glyph: MODELS.opencode.glyph };
  }
  return { model, handle: value, runArgv: MODELS[model].argv(), glyph: MODELS[model].glyph };
}

function parseArgs(argv) {
  const out = { branch: undefined, base: 'origin/main', timeout: 45000, agents: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const need = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${flag}`);
      return v;
    };
    switch (flag) {
      case '--branch': out.branch = need(); break;
      case '--base': out.base = need(); break;
      case '--timeout': out.timeout = Number(need()); break;
      case '--claude': out.agents.push(makeAgent('claude', need())); break;
      case '--codex': out.agents.push(makeAgent('codex', need())); break;
      case '--opencode': out.agents.push(makeAgent('opencode', need())); break;
      default: throw new Error(`unknown flag: ${flag}`);
    }
  }
  if (!out.branch) throw new Error('--branch is required');
  if (out.agents.length === 0) {
    throw new Error('at least one agent flag is required (--claude/--codex/--opencode)');
  }
  const handles = out.agents.map((a) => a.handle);
  const dup = handles.find((h, i) => handles.indexOf(h) !== i);
  if (dup) throw new Error(`duplicate handle in request: ${dup}`);
  return out;
}

function defaultRun(file, args) {
  return execFileSync(file, args, { encoding: 'utf8' });
}

module.exports = { makeAgent, parseArgs, defaultRun };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd comitatus && npx jest up.test.js`
Expected: PASS (all `makeAgent` and `parseArgs` tests).

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/up.js comitatus/__tests__/up.test.js
git commit -F - <<'EOF'
chore - add up.js flag parsing for herd launcher

parseArgs + makeAgent: branch/base/timeout flags and repeatable
--claude/--codex/--opencode agent specs (opencode splits handle:model).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: `up.js` orchestration (`up`)

**Files:**
- Modify: `comitatus/skills/herdr/scripts/up.js`
- Test: `comitatus/__tests__/up.test.js`

**Interfaces:**
- Consumes: `parseArgs` (Task 1).
- Produces: `up(argv, deps) -> { worktree: { path, workspace_id }, agents: [{ handle, model, pane_id, tab }] }`.
  - `deps.run(file, argsArray) -> stdout string`. Called for every git/herdr invocation. A non-empty JSON stdout is parsed for `agent list`, `worktree create`, and `tab create`; `git fetch`, `tab rename`, `pane run`, `wait`, and `agent rename` return `''`.
  - Order of operations: `agent list` (pre-flight handle-collision check) → `git fetch origin <baseBranch>` (baseBranch = `base` with a leading `origin/` stripped) → `worktree create` → for each agent in order: agent[0] uses the worktree root pane/tab and a `tab rename`; agent[i>0] uses a fresh `tab create`; then `pane run`, `wait agent-status … idle`, `agent rename`.
  - Throws (before any worktree is created) if a requested handle already appears in `agent list`. Propagates any error thrown by `deps.run`.

- [ ] **Step 1: Write the failing tests for `up`**

Append to `comitatus/__tests__/up.test.js`:

```js
const { up } = require('../skills/herdr/scripts/up.js');

function fakeRunner(matchers) {
  const calls = [];
  const run = (file, args) => {
    calls.push([file, ...args]);
    for (const [pred, resp] of matchers) {
      if (pred(file, args)) {
        if (resp instanceof Error) throw resp;
        return resp;
      }
    }
    return ''; // fetch / tab rename / pane run / wait / agent rename print nothing
  };
  return { run, calls };
}

const AGENT_LIST = (names = []) =>
  JSON.stringify({ result: { agents: names.map((name) => ({ name })) } });
const WT = JSON.stringify({
  result: {
    worktree: { path: '/wt/x', open_workspace_id: 'wR' },
    root_pane: { pane_id: 'wR:p1' },
    tab: { tab_id: 'wR:t1' },
  },
});
const TAB2 = JSON.stringify({
  result: { tab: { tab_id: 'wR:t2' }, root_pane: { pane_id: 'wR:p2' } },
});

const matchers = (listResp = AGENT_LIST()) => [
  [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', listResp],
  [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', WT],
  [(f, a) => f === 'herdr' && a[0] === 'tab' && a[1] === 'create', TAB2],
];

describe('up', () => {
  test('single claude agent: exact call sequence and result', () => {
    const { run, calls } = fakeRunner(matchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly'], { run });

    expect(result).toEqual({
      worktree: { path: '/wt/x', workspace_id: 'wR' },
      agents: [{ handle: 'sly', model: 'claude', pane_id: 'wR:p1', tab: 'wR:t1' }],
    });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['git', 'fetch', 'origin', 'main'],
      ['herdr', 'worktree', 'create', '--branch', 'chore/x', '--base', 'origin/main', '--no-focus', '--json'],
      ['herdr', 'tab', 'rename', 'wR:t1', 'sly ◆'],
      ['herdr', 'pane', 'run', 'wR:p1', 'claude'],
      ['herdr', 'wait', 'agent-status', 'wR:p1', '--status', 'idle', '--timeout', '45000'],
      ['herdr', 'agent', 'rename', 'wR:p1', 'sly'],
    ]);
  });

  test('second agent gets a new tab and is renamed on its own pane', () => {
    const { run, calls } = fakeRunner(matchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay'], { run });

    expect(result.agents).toEqual([
      { handle: 'sly', model: 'claude', pane_id: 'wR:p1', tab: 'wR:t1' },
      { handle: 'jay', model: 'codex', pane_id: 'wR:p2', tab: 'wR:t2' },
    ]);
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus']);
    expect(calls).toContainEqual(['herdr', 'pane', 'run', 'wR:p2', 'codex']);
    expect(calls).toContainEqual(['herdr', 'agent', 'rename', 'wR:p2', 'jay']);
  });

  test('opencode agent runs "opencode -m <model>"', () => {
    const { run, calls } = fakeRunner(matchers());
    up(['--branch', 'b', '--opencode', 'bob:ollama/qwen2.5:7b'], { run });
    expect(calls).toContainEqual(['herdr', 'pane', 'run', 'wR:p1', 'opencode -m ollama/qwen2.5:7b']);
  });

  test('git fetch derives the branch from --base', () => {
    const { run, calls } = fakeRunner(matchers());
    up(['--branch', 'b', '--base', 'origin/dev', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['git', 'fetch', 'origin', 'dev']);
  });

  test('--timeout flows into the wait call', () => {
    const { run, calls } = fakeRunner(matchers());
    up(['--branch', 'b', '--timeout', '9000', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'wait', 'agent-status', 'wR:p1', '--status', 'idle', '--timeout', '9000']);
  });

  test('pre-flight rejects a globally taken handle without creating a worktree', () => {
    const { run, calls } = fakeRunner(matchers(AGENT_LIST(['sly'])));
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run })).toThrow(/already taken: sly/);
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'create')).toBe(false);
  });

  test('propagates a runner failure', () => {
    const failing = [
      [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', AGENT_LIST()],
      [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', new Error('worktree_create_failed')],
    ];
    const { run } = fakeRunner(failing);
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run })).toThrow(/worktree_create_failed/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd comitatus && npx jest up.test.js -t "up "`
Expected: FAIL — `up is not a function` (not yet exported).

- [ ] **Step 3: Implement `up` and export it**

In `comitatus/skills/herdr/scripts/up.js`, add the `up` function above `defaultRun` and add `up` to the exports:

```js
function up(argv, deps) {
  const run = deps.run;
  const cfg = parseArgs(argv);

  // pre-flight: reject a handle that already exists anywhere (herdr enforces
  // global uniqueness, but only after the worktree is built — fail early).
  const list = JSON.parse(run('herdr', ['agent', 'list']));
  const taken = ((list.result && list.result.agents) || [])
    .map((a) => a && a.name).filter(Boolean);
  for (const a of cfg.agents) {
    if (taken.includes(a.handle)) throw new Error(`handle already taken: ${a.handle}`);
  }

  // refresh the local base ref before worktree create resolves it
  const baseBranch = cfg.base.replace(/^origin\//, '');
  run('git', ['fetch', 'origin', baseBranch]);

  const wt = JSON.parse(run('herdr',
    ['worktree', 'create', '--branch', cfg.branch, '--base', cfg.base, '--no-focus', '--json']));
  const path = wt.result.worktree.path;
  const workspace = wt.result.worktree.open_workspace_id;
  const rootPane = wt.result.root_pane.pane_id;
  const rootTab = wt.result.tab.tab_id;

  const agents = [];
  cfg.agents.forEach((a, i) => {
    let pane;
    let tab;
    if (i === 0) {
      pane = rootPane;
      tab = rootTab;
      run('herdr', ['tab', 'rename', tab, `${a.handle} ${a.glyph}`]);
    } else {
      const tc = JSON.parse(run('herdr',
        ['tab', 'create', '--workspace', workspace, '--cwd', path,
          '--label', `${a.handle} ${a.glyph}`, '--no-focus']));
      pane = tc.result.root_pane.pane_id;
      tab = tc.result.tab.tab_id;
    }
    run('herdr', ['pane', 'run', pane, a.runArgv]);
    run('herdr', ['wait', 'agent-status', pane, '--status', 'idle', '--timeout', String(cfg.timeout)]);
    run('herdr', ['agent', 'rename', pane, a.handle]);
    agents.push({ handle: a.handle, model: a.model, pane_id: pane, tab });
  });

  return { worktree: { path, workspace_id: workspace }, agents };
}
```

Update the exports line:

```js
module.exports = { makeAgent, parseArgs, up, defaultRun };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd comitatus && npx jest up.test.js`
Expected: PASS (all parsing + orchestration tests).

- [ ] **Step 5: Commit**

```bash
git add comitatus/skills/herdr/scripts/up.js comitatus/__tests__/up.test.js
git commit -F - <<'EOF'
chore - implement up.js herd-launch orchestration

up(argv, deps): pre-flight handle check, git fetch, worktree create, then
per-agent tab/pane-run/wait/rename. All process calls go through an injected
runner; returns a JSON summary of the worktree and launched agents.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: Wire `up` into `herd.js` as a subcommand

**Files:**
- Modify: `comitatus/skills/herdr/scripts/herd.js:65-86` (the `main()` function and the require block)

**Interfaces:**
- Consumes: `up`, `defaultRun` from `up.js` (Task 2).
- Produces: CLI behavior — `node herd.js up <flags>` runs the launcher and prints the result JSON; bad flags print `herd up: <message>` to stderr and exit 1. Existing stdin-driven commands (`pane`/`status`/`members`/`field`) are unchanged and `up` does **not** read stdin.

- [ ] **Step 1: Add a failing CLI smoke test**

Append to `comitatus/__tests__/up.test.js`:

```js
const { execFileSync } = require('child_process');
const path = require('path');

const HERD = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'herd.js');

describe('herd.js up wiring', () => {
  test('node herd.js up with no flags errors on stderr and exits non-zero', () => {
    let err;
    try {
      execFileSync('node', [HERD, 'up'], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.status).toBe(1);
    expect(String(err.stderr)).toMatch(/herd up: --branch is required/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd comitatus && npx jest up.test.js -t "up wiring"`
Expected: FAIL — with no `up` branch, `main()` reads stdin (none) and runs `dispatch(['up'], {})`, which throws `unknown command: up` (message text won't match, or the process hangs waiting on stdin until the harness closes it). Either way the assertion on `/--branch is required/` fails.

- [ ] **Step 3: Add the `up` branch to `herd.js`**

At the top of `comitatus/skills/herdr/scripts/herd.js`, after `'use strict';`, add the require:

```js
const { up, defaultRun } = require('./up.js');
```

Then replace the start of `main()` (currently `const argv = process.argv.slice(2);` followed immediately by `const raw = await readStdin();`) so the `up` branch runs before any stdin read:

```js
async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'up') {
    try {
      const result = up(argv.slice(1), { run: defaultRun });
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (e) {
      process.stderr.write(`herd up: ${e.message}\n`);
      process.exit(1);
    }
    return;
  }
  const raw = await readStdin();
  // …unchanged from here…
```

- [ ] **Step 4: Run the smoke test and the full suite**

Run: `cd comitatus && npx jest up.test.js -t "up wiring"`
Expected: PASS.

Run: `cd comitatus && npm test`
Expected: PASS — all suites, including the existing `herd.test.js` (the stdin filter path is unchanged).

- [ ] **Step 5: Manually confirm the existing filter path still works**

Run: `echo '{"result":{"agents":[{"name":"sly","workspace_id":"w1"}]}}' | node comitatus/skills/herdr/scripts/herd.js members`
Expected output: `sly`

- [ ] **Step 6: Commit**

```bash
git add comitatus/skills/herdr/scripts/herd.js comitatus/__tests__/up.test.js
git commit -F - <<'EOF'
chore - wire up subcommand into herd.js

`node "$H" up <flags>` runs the launcher and prints the result JSON; the up
branch skips the stdin read, leaving the existing filter commands untouched.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: Rewrite SKILL.md recipes around `up`

**Files:**
- Modify: `comitatus/skills/herdr/SKILL.md` (quickstart §"quickstart - the 80% path" lines ~14-31; composed flows §"spin up a paired reviewer" and §"reassign a herd"; gotchas list)

**Interfaces:** None (documentation). The `up` flag surface and output shape are fixed by Tasks 1–2.

- [ ] **Step 1: Replace the quickstart block**

Replace the fenced `bash` block under `## quickstart - the 80% path` (the `H=…` / `OUT=$(…)` / `tab rename` / `pane run` / `wait` / `agent rename` recipe) with:

````markdown
```bash
H=...                                   # paste from your herdr orientation
node "$H" up --branch chore/my-slug --base origin/main \
  --claude fox                          # one worktree, one claude agent named "fox"
```

`up` does it all in one process — `git fetch`, `worktree create`, and per-agent
`pane run` + idle-wait + `agent rename` — and prints a JSON summary:

```json
{ "worktree": { "path": "…", "workspace_id": "wR" },
  "agents": [ { "handle": "fox", "model": "claude", "pane_id": "wR:p1", "tab": "wR:t1" } ] }
```

Add more agents by repeating the per-type flag; flag order is tab order:

```bash
node "$H" up --branch chore/my-slug --base origin/main \
  --claude sly --codex jay --opencode bob:ollama/qwen2.5:7b
```

| flag | runs | glyph |
|---|---|---|
| `--claude <handle>` | `claude` | ◆ |
| `--codex <handle>` | `codex` | ◇ |
| `--opencode <handle>:<model>` | `opencode -m <model>` | ⬨ |

`up` collapses the multi-step recipe (which threaded ids through `$(…)`
substitutions and tripped one permission prompt *per step*) into a single
command. Defaults: `--base origin/main`, `--timeout 45000` (ms, per agent's
idle-wait). Handles must be unique — `up` pre-checks `agent list` and refuses
before creating the worktree if one is taken. The lower-level building blocks
below remain for everything `up` does not cover (reattach, teardown, messaging).
```
````

- [ ] **Step 2: Point the building-blocks intro at `up`**

Under `### 1. new worktree on a new branch off fresh origin/main`, add this line immediately after the heading, before the existing prose:

```markdown
> For the common case — create a worktree and launch a herd — use `node "$H" up …` (see the quickstart). The steps below are the primitives `up` is built from; reach for them for the cases `up` does not cover.
```

- [ ] **Step 3: Replace the "spin up a paired reviewer" composed flow**

Replace the `bash` block under `### spin up a paired reviewer in a fresh worktree` with:

````markdown
```bash
node "$H" up --branch chore/review-x --base origin/main \
  --claude sly --codex jay          # sly = claude in tab 1, jay = codex in tab 2

# sly reviews; jay cross-checks (resolve panes from up's JSON or `agent list`)
herdr agent send sly "review the diff on this branch; jay is cross-checking"
herdr pane send-keys "$(herdr agent list | node "$H" pane sly)" Enter
```
````

- [ ] **Step 4: Simplify the "reassign a herd" rebuild block**

In `### reassign a herd to a different worktree`, replace the recipe block (the `git fetch` … `agent rename "$ROOT1" sly` … comment lines) with:

````markdown
```bash
herdr workspace close <old-herd-ws>   # take the OLD herd down first -> frees the handles

node "$H" up --branch chore/new-slug --base origin/main \
  --claude sly --codex jay            # rebuild the herd, reusing the SAME handles

git worktree remove --force <old-wt-path>; git branch -D chore/old-slug   # optional: clear the husk
```
````

Leave the surrounding prose (handles preserved, conversation/seeding not preserved, cold-agent re-seed) unchanged.

- [ ] **Step 5: Add a gotcha about the one-prompt behavior**

Add this bullet to the `## gotchas` list (after the `the herd.js helper path comes from your orientation` bullet):

```markdown
- **`up` is one command on purpose** - launching a herd through `node "$H" up …` instead of the step-by-step primitives keeps the whole flow in a single invocation, so it costs one permission approval instead of one per step. The step recipes still work; they just prompt more because each `$(…)`-threaded step is approved separately.
```

- [ ] **Step 6: Verify the doc reads correctly**

Run: `grep -n "node \"\$H\" up" comitatus/skills/herdr/SKILL.md`
Expected: matches in the quickstart, the paired-reviewer flow, and the reassign flow (at least 4 lines).

Read the changed sections once to confirm no dangling references to the deleted `OUT=$(…)` quickstart variables remain in those sections.

- [ ] **Step 7: Commit**

```bash
git add comitatus/skills/herdr/SKILL.md
git commit -F - <<'EOF'
chore - rewrite herdr recipes around the up launcher

Quickstart and the paired-reviewer / reassign composed flows now use
`node "$H" up …`; the step-by-step primitives stay as building blocks.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: Version bump

**Files:**
- Modify: `.claude-plugin/marketplace.json`, `comitatus/package.json` (both via the script)

**Interfaces:** None.

- [ ] **Step 1: Bump the comitatus version (minor)**

Run from the repo root: `node scripts/bump-version.js comitatus minor`
Expected: updates comitatus 0.1.4 → 0.2.0 in `package.json` and `marketplace.json`.

- [ ] **Step 2: Verify the new version**

Run: `node -e "console.log(require('./comitatus/package.json').version)"`
Expected: `0.2.0`

- [ ] **Step 3: Run the full comitatus suite one more time**

Run: `cd comitatus && npm test`
Expected: PASS (all suites).

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/marketplace.json comitatus/package.json
git commit -F - <<'EOF'
chore - bump comitatus to 0.2.0 for up launcher

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Self-Review

**Spec coverage:**
- Components (up.js module, herd.js branch, tests, SKILL.md, version bump) → Tasks 1–5. ✓
- CLI surface (flags, defaults, ≥1 agent, flag order, model→argv/glyph table) → Task 1 (parsing) + Task 4 (docs). ✓
- Sequence (pre-flight handle check, fetch, create, agent[0] root tab, agent[i] new tab, JSON output) → Task 2. ✓
- Error handling (abort on non-zero, pre-flight dup/taken, no auto-rollback) → Task 2 tests (`already taken`, runner failure) + Task 1 (`duplicate handle`). ✓
- Non-goals (reattach/teardown/seeding) → explicitly left as building blocks in Task 4 Step 1/2. ✓
- Risk note (one-prompt vs zero) → Task 4 Step 5 gotcha documents actual behavior without overpromising. ✓

**Placeholder scan:** No TBD/TODO; every code and doc step shows literal content. ✓

**Type consistency:** `makeAgent` returns `{model, handle, runArgv, glyph}` (Task 1) and `up` reads exactly those fields (Task 2). `up` result `{worktree:{path,workspace_id}, agents:[{handle,model,pane_id,tab}]}` matches the Task 2 test assertions and the Task 4 quickstart JSON. herdr field paths (`result.worktree.*`, `result.root_pane.pane_id`, `result.tab.tab_id`) match the verified cli.md shapes. ✓
