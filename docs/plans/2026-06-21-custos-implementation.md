# custos Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `custos`, a fifth claude-domestique plugin that packages the herdr agent-orchestration skill for claude, ships a Node roster/state helper, and auto-provisions the same skill into codex's skill path when running inside herdr.

**Architecture:** One plain-ASCII skill directory (`skills/herdr/`) serves both runtimes byte-for-byte. Claude gets it via the marketplace plugin install. A standalone SessionStart hook (`herdr-orient.js`) is silent unless `HERDR_ENV=1`; inside herdr it injects a lean orientation and content-hash-copies the skill dir into `~/.codex/skills/herdr/`. A Node CLI (`herd.js`) replaces the skill's inline `python3` JSON-parsing one-liners.

**Tech Stack:** Node.js (CommonJS), Jest (`jest@^30.2.0` + `jest-github-actions-reporter`), `fs.cpSync`, `crypto` (SHA-256). No runtime dependencies.

## Global Constraints

- **Node/CommonJS/Jest.** `"type": "commonjs"`; tests via `jest`; reporters `default` + `jest-github-actions-reporter` (match `onus/jest.config.js`).
- **Version only at marketplace level.** New plugin starts at `0.1.0` in `.claude-plugin/marketplace.json`. `plugin.json` carries **no** `version` field (matches agent-artifex).
- **Single plain-ASCII skill.** No decorative punctuation in prose (`—`→`-`, `→`→`->`, `…`→`...`, `≤`→`<=`, smart quotes→straight). **Preserve herdr's literal UI characters verbatim:** glyphs `◆ ◇ ⬨` and row separator `·`.
- **Hook silence + safety.** When `HERDR_ENV !== '1'`: emit nothing, write nothing. Provisioning only when `~/.codex/` exists; write **only** under `~/.codex/skills/herdr/`; **never** touch `~/.codex/hooks.json` or `~/.codex/herdr-agent-state.sh`; swallow all provisioning errors (never block session start or suppress orientation).
- **Executable bit required.** `herdr-orient.js` and `herd.js` need a shebang **and** `chmod +x` (a recent repo commit fixed a missing executable bit on a hook — do not repeat).
- **openai.yaml constraints (codex schema).** `interface.short_description` 25–64 chars; `interface.default_prompt` must reference the skill as `$herdr`.
- **Commits.** `chore - <lowercase description>`, HEREDOC, **no attribution / no Co-Authored-By** (per CLAUDE.md). Work happens on branch `chore/add-custos-plugin` (already created).

---

### Task 1: Scaffold and register the custos plugin

**Files:**
- Create: `custos/.claude-plugin/plugin.json`
- Create: `custos/package.json`
- Create: `custos/jest.config.js`
- Create: `custos/README.md`
- Modify: `package.json` (root — workspaces + test scripts)
- Modify: `.claude-plugin/marketplace.json` (add custos entry)
- Modify: `scripts/bump-version.js:14` (add custos to PLUGINS)
- Modify: `CLAUDE.md` (version-bump line, structure, ownership table)

**Interfaces:**
- Produces: a registered, installable plugin named `custos` at version `0.1.0`; `cd custos && npm install` succeeds.

- [ ] **Step 1: Create `custos/.claude-plugin/plugin.json`**

```json
{
  "name": "custos",
  "description": "herdr workflows - packages the herdr agent-orchestration skill for claude and codex, auto-injected inside herdr",
  "author": {
    "name": "Flexion"
  },
  "repository": "https://github.com/flexion/claude-domestique",
  "homepage": "https://github.com/flexion/claude-domestique/tree/main/custos",
  "license": "MIT",
  "keywords": [
    "herdr",
    "agents",
    "orchestration",
    "worktrees",
    "codex",
    "multiplexer"
  ],
  "skills": "./skills/"
}
```

- [ ] **Step 2: Create `custos/package.json`**

```json
{
  "name": "@claude-domestique/custos",
  "version": "0.1.0",
  "description": "herdr workflows plugin for Claude Code - packages the herdr skill, auto-injected inside herdr",
  "main": "hooks/herdr-orient.js",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/flexion/claude-domestique.git",
    "directory": "custos"
  },
  "keywords": [
    "claude",
    "claude-code",
    "plugin",
    "herdr",
    "agents",
    "codex"
  ],
  "author": "Flexion",
  "license": "MIT",
  "type": "commonjs",
  "bugs": {
    "url": "https://github.com/flexion/claude-domestique/issues"
  },
  "homepage": "https://github.com/flexion/claude-domestique/tree/main/custos#readme",
  "devDependencies": {
    "jest": "^30.2.0",
    "jest-github-actions-reporter": "^1.0.3"
  }
}
```

- [ ] **Step 3: Create `custos/jest.config.js`**

```javascript
module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/skills/',  // shipped skill content, not unit-tested here
  ],
  coverageThreshold: {
    global: {
      lines: 50,
      branches: 45,
    },
  },
};
```

- [ ] **Step 4: Create `custos/README.md`**

```markdown
# custos

Packages the [herdr](https://herdr.dev) agent-orchestration skill as a
claude-domestique plugin. `custos` is Latin for "keeper/guardian" — one who
tends and guards the herd.

## What it does

- Ships the `herdr` skill (invoked `custos:herdr`) for controlling herdr from
  inside it: worktrees, workspaces, tabs/panes, agents, messaging, waiting on
  state — all via the `herdr` CLI.
- A SessionStart hook that is silent unless you are inside herdr
  (`HERDR_ENV=1`). Inside herdr it injects a short orientation and, if codex is
  installed, copies the same skill into `~/.codex/skills/herdr/` so codex agents
  in the herd get it too.
- `herd.js`, a small Node helper for roster/state queries (pane by handle, herd
  members, agent status, JSON field extraction).

## Single source of truth

There is **one** skill under `skills/herdr/`, authored in plain ASCII. Codex
uses the identical files via the auto-provisioned copy. The codex manifest
`agents/openai.yaml` lives in the skill dir and is inert for claude.

## Provenance

Canonical herdr documentation lives upstream at herdr.dev. This plugin packages
a curated workflow skill over the `herdr` CLI; it does not reimplement herdr or
manage herdr's own codex integration (`~/.codex/herdr-agent-state.sh`).
```

- [ ] **Step 5: Add custos to root `package.json` workspaces and test scripts**

In `package.json`, change the `workspaces` array from:

```json
  "workspaces": [
    "shared",
    "mantra",
    "memento",
    "onus"
  ],
```

to:

```json
  "workspaces": [
    "shared",
    "mantra",
    "memento",
    "onus",
    "custos"
  ],
```

Then in `scripts`, change the `test` line and add a `test:custos` line:

```json
    "test": "npm run test:shared && npm run test:mantra && npm run test:memento && npm run test:onus && npm run test:custos",
```

Add after the `test:onus` line:

```json
    "test:custos": "cd custos && npm test",
```

And add after `test:coverage:onus`:

```json
    "test:coverage:custos": "cd custos && npm run test:coverage",
```

(Also append `&& npm run test:coverage:custos` to the `test:coverage` script.)

- [ ] **Step 6: Add custos to `.claude-plugin/marketplace.json`**

Append this object to the `plugins` array (after the `agent-artifex` entry):

```json
    {
      "name": "custos",
      "source": "./custos",
      "description": "herdr workflows - packages the herdr agent-orchestration skill for claude and codex, auto-injected inside herdr",
      "version": "0.1.0"
    }
```

(Add a comma after the preceding `agent-artifex` object's closing brace.)

- [ ] **Step 7: Add custos to `scripts/bump-version.js`**

Change line 14 from:

```javascript
const PLUGINS = ['mantra', 'memento', 'onus', 'agent-artifex'];
```

to:

```javascript
const PLUGINS = ['mantra', 'memento', 'onus', 'agent-artifex', 'custos'];
```

- [ ] **Step 8: Update `CLAUDE.md`**

(a) The IMPORTANT version-bump line — change:

```
**IMPORTANT: Before completing work on any branch that modifies plugin files (mantra/, memento/, onus/, agent-artifex/), run `node scripts/bump-version.js <plugin> <patch|minor|major>` for each affected plugin. Do not merge without bumping.**
```

to add `custos/`:

```
**IMPORTANT: Before completing work on any branch that modifies plugin files (mantra/, memento/, onus/, agent-artifex/, custos/), run `node scripts/bump-version.js <plugin> <patch|minor|major>` for each affected plugin. Do not merge without bumping.**
```

(b) In the "Repository Structure" tree, add `custos/` under the existing plugin dirs:

```
├── memento/                 # Session persistence plugin
├── onus/                    # Work item automation plugin
└── custos/                  # herdr workflows plugin
```

(c) In the "Context Ownership" table, add a row:

```
| **custos** | herdr orchestration | `skills/herdr/SKILL.md` |
```

- [ ] **Step 9: Install and verify registration**

Run: `cd /Users/dpuglielli/github/flexion/claude-domestique && npm install`
Expected: completes without error; `custos` linked as a workspace.

Run: `node -e "['custos/.claude-plugin/plugin.json','custos/package.json','.claude-plugin/marketplace.json'].forEach(f=>JSON.parse(require('fs').readFileSync(f,'utf8')));console.log('json ok')"`
Expected: `json ok`

Run: `node -e "const m=require('./.claude-plugin/marketplace.json');console.log(m.plugins.some(p=>p.name==='custos')?'registered':'MISSING')"`
Expected: `registered`

- [ ] **Step 10: Commit**

```bash
git add custos/.claude-plugin/plugin.json custos/package.json custos/jest.config.js custos/README.md package.json package-lock.json .claude-plugin/marketplace.json scripts/bump-version.js CLAUDE.md
git commit -m "$(cat <<'EOF'
chore - scaffold and register custos plugin
EOF
)"
```

---

### Task 2: herd.js roster/state helper

**Files:**
- Create: `custos/skills/herdr/scripts/herd.js`
- Test: `custos/__tests__/herd.test.js`

**Interfaces:**
- Produces: `herd.js` — a CLI reading herdr JSON on stdin. Exports pure functions `{ pane(data, handle), status(data, handleOrPane), members(data, workspaceId), field(data, dotPath), getField(obj, dotPath), dispatch(argv, data), format(value) }`. CLI usage: `herdr agent list | node herd.js pane <handle>`, `... members [--workspace <ws>]`, `... status <handle|pane>`, `<any herdr --json> | node herd.js field <dot.path>`.

- [ ] **Step 1: Write the failing test**

Create `custos/__tests__/herd.test.js`:

```javascript
const h = require('../skills/herdr/scripts/herd.js');

const AGENTS = {
  result: {
    agents: [
      { name: 'sly', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle' },
      { name: 'jay', pane_id: 'w1:p2', workspace_id: 'w1', agent_status: 'working' },
      { name: 'tim', pane_id: 'w2:p1', workspace_id: 'w2', agent_status: 'done' },
      { pane_id: 'w3:p1', workspace_id: 'w3', agent_status: 'idle' }, // unnamed
    ],
  },
};

const WORKTREE = {
  result: { worktree: { open_workspace_id: 'w7', path: '/wt/x' }, root_pane: { pane_id: 'w7:p1' } },
};

describe('pane', () => {
  test('returns pane_id for a handle', () => {
    expect(h.pane(AGENTS, 'jay')).toBe('w1:p2');
  });
  test('undefined for unknown handle', () => {
    expect(h.pane(AGENTS, 'nope')).toBeUndefined();
  });
});

describe('status', () => {
  test('by handle', () => { expect(h.status(AGENTS, 'tim')).toBe('done'); });
  test('by pane_id', () => { expect(h.status(AGENTS, 'w1:p1')).toBe('idle'); });
});

describe('members', () => {
  test('all named handles when no workspace', () => {
    expect(h.members(AGENTS).sort()).toEqual(['jay', 'sly', 'tim']);
  });
  test('filtered by workspace_id', () => {
    expect(h.members(AGENTS, 'w1').sort()).toEqual(['jay', 'sly']);
  });
});

describe('field', () => {
  test('extracts a dot path', () => {
    expect(h.field(WORKTREE, 'result.worktree.open_workspace_id')).toBe('w7');
  });
  test('nested', () => {
    expect(h.field(WORKTREE, 'result.root_pane.pane_id')).toBe('w7:p1');
  });
  test('undefined for missing path', () => {
    expect(h.field(WORKTREE, 'result.nope.x')).toBeUndefined();
  });
});

describe('format', () => {
  test('arrays join by newline', () => { expect(h.format(['a', 'b'])).toBe('a\nb'); });
  test('null/undefined -> empty string', () => {
    expect(h.format(undefined)).toBe('');
    expect(h.format(null)).toBe('');
  });
  test('scalars stringified', () => { expect(h.format('w7')).toBe('w7'); });
});

describe('dispatch', () => {
  test('routes members --workspace', () => {
    expect(h.dispatch(['members', '--workspace', 'w2'], AGENTS)).toEqual(['tim']);
  });
  test('throws on unknown command', () => {
    expect(() => h.dispatch(['bogus'], AGENTS)).toThrow(/unknown command/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd custos && npx jest herd.test.js`
Expected: FAIL — `Cannot find module '../skills/herdr/scripts/herd.js'`

- [ ] **Step 3: Write minimal implementation**

Create `custos/skills/herdr/scripts/herd.js`:

```javascript
#!/usr/bin/env node
'use strict';

function getField(obj, dotPath) {
  return String(dotPath).split('.').reduce(
    (o, k) => (o == null ? undefined : o[k]), obj);
}

function agentList(data) {
  return (data && data.result && data.result.agents) || [];
}

function pane(data, handle) {
  const a = agentList(data).find((x) => x && x.name === handle);
  return a ? a.pane_id : undefined;
}

function status(data, handleOrPane) {
  const a = agentList(data).find(
    (x) => x && (x.name === handleOrPane || x.pane_id === handleOrPane));
  return a ? a.agent_status : undefined;
}

function members(data, workspaceId) {
  return agentList(data)
    .filter((x) => x && x.name && (workspaceId ? x.workspace_id === workspaceId : true))
    .map((x) => x.name);
}

function field(data, dotPath) {
  return getField(data, dotPath);
}

function dispatch(argv, data) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'pane':
      return pane(data, rest[0]);
    case 'status':
      return status(data, rest[0]);
    case 'members': {
      const i = rest.indexOf('--workspace');
      return members(data, i >= 0 ? rest[i + 1] : undefined);
    }
    case 'field':
      return field(data, rest[0]);
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}

function format(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s;
}

async function main() {
  const argv = process.argv.slice(2);
  const raw = await readStdin();
  let data;
  try {
    data = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    process.stderr.write('herd: invalid JSON on stdin\n');
    process.exit(1);
  }
  let out;
  try {
    out = dispatch(argv, data);
  } catch (e) {
    process.stderr.write(`herd: ${e.message}\n`);
    process.exit(1);
  }
  const text = format(out);
  if (text) process.stdout.write(text + '\n');
}

if (require.main === module) main();

module.exports = { pane, status, members, field, getField, dispatch, format };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd custos && npx jest herd.test.js`
Expected: PASS (all suites green).

- [ ] **Step 5: Make herd.js executable and smoke-test the CLI**

Run: `chmod +x custos/skills/herdr/scripts/herd.js`
Run: `echo '{"result":{"agents":[{"name":"jay","pane_id":"w1:p2"}]}}' | node custos/skills/herdr/scripts/herd.js pane jay`
Expected: `w1:p2`

- [ ] **Step 6: Commit**

```bash
git add custos/skills/herdr/scripts/herd.js custos/__tests__/herd.test.js
git commit -m "$(cat <<'EOF'
chore - add custos herd.js roster/state helper
EOF
)"
```

---

### Task 3: Import and adapt the herdr skill content

**Files:**
- Create: `custos/skills/herdr/SKILL.md`
- Create: `custos/skills/herdr/reference/cli.md`
- Create: `custos/skills/herdr/reference/names.md`
- Create: `custos/skills/herdr/agents/openai.yaml`

**Interfaces:**
- Consumes: `herd.js` subcommands from Task 2 (the python one-liners are rewritten to call it).
- Produces: the shippable skill directory used verbatim by claude (plugin) and codex (provisioned copy).

**Source:** the origin skill on this machine at
`/Users/dpuglielli/github/nucor/Portal-D365-WebApp/.claude/skills/herdr/`
(SKILL.md, reference/cli.md, reference/names.md). Copy from there, then fold and rewrite.

- [ ] **Step 1: Copy the three markdown files and ASCII-fold prose typography**

```bash
SRC=/Users/dpuglielli/github/nucor/Portal-D365-WebApp/.claude/skills/herdr
DST=custos/skills/herdr
mkdir -p "$DST/reference" "$DST/agents"
fold() { sed -e 's/—/-/g' -e 's/–/-/g' -e 's/→/->/g' -e 's/←/<-/g' \
             -e 's/…/.../g' -e 's/≤/<=/g' -e 's/≥/>=/g' \
             -e 's/“/"/g' -e 's/”/"/g' -e "s/‘/'/g" -e "s/’/'/g" "$1"; }
fold "$SRC/SKILL.md"            > "$DST/SKILL.md"
fold "$SRC/reference/cli.md"    > "$DST/reference/cli.md"
fold "$SRC/reference/names.md"  > "$DST/reference/names.md"
```

Note: the fold set deliberately does **not** include herdr's glyphs `◆ ◇ ⬨` or the separator `·`, so they pass through unchanged (they are content, not typography).

- [ ] **Step 2: Verify decorative punctuation is gone but glyphs remain**

Run: `LC_ALL=C grep -nE '—|–|→|←|…|≤|≥|“|”|‘|’' custos/skills/herdr/SKILL.md custos/skills/herdr/reference/*.md; echo "exit:$?"`
Expected: no matches; `exit:1` (grep found nothing).

Run: `grep -c '◆\|◇\|⬨\|·' custos/skills/herdr/SKILL.md`
Expected: a non-zero count (glyphs preserved).

- [ ] **Step 3: Rewrite the python3 one-liners to call herd.js**

Edit `custos/skills/herdr/SKILL.md`. Define the helper path once near the top of the "building blocks" section (add this line just before the first recipe that parses JSON):

```bash
H="$CLAUDE_PLUGIN_ROOT/skills/herdr/scripts/herd.js"   # codex: H="$HOME/.codex/skills/herdr/scripts/herd.js"
```

Then replace each JSON-parsing one-liner. Apply these exact substitutions (the
left side is the current text after folding; the right side is the replacement):

| Current (folded) | Replacement |
|---|---|
| `python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["worktree"]["open_workspace_id"])'` | `node "$H" field result.worktree.open_workspace_id` |
| `python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["worktree"]["path"])'` | `node "$H" field result.worktree.path` |
| `python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["root_pane"]["pane_id"])'` | `node "$H" field result.root_pane.pane_id` |
| `herdr agent list \| python3 -c 'import sys,json; h=sys.argv[1]; d=json.load(sys.stdin); print(next(a["pane_id"] for a in d["result"]["agents"] if a.get("name")==h))' <HANDLE>` | `herdr agent list \| node "$H" pane <HANDLE>` |
| the `agent_status` poll one-liner (`...print(next((a["agent_status"] ... if a.get("pane_id")==p),"?"))...`) | `herdr agent list \| node "$H" status "$TO_PANE"` |
| the roster reconcile guidance "filter to your herd by **`workspace_id`**" example | `herdr agent list \| node "$H" members --workspace <WS>` |

For the two name-pool list one-liners in `reference/names.md` (taken member
handles / taken workspace labels), replace the **handles** one with
`herdr agent list | node "$H" members` and leave the **workspace-labels** one as
its existing `python3` one-liner (a sorted-label aggregation outside the helper's
four-subcommand scope) — add a trailing comment: `# (label list; helper covers handles)`.

- [ ] **Step 4: Verify no unconverted handle/field parsing remains**

Run: `grep -nE 'a\["pane_id"\] for a in|"open_workspace_id"|root_pane"\]\["pane_id' custos/skills/herdr/SKILL.md; echo "exit:$?"`
Expected: no matches; `exit:1`.

Run: `grep -c 'node "\$H"' custos/skills/herdr/SKILL.md`
Expected: a count of at least 5 (helper calls present).

- [ ] **Step 5: Create `custos/skills/herdr/agents/openai.yaml`**

```yaml
interface:
  display_name: "Herdr"
  short_description: "Control herdr worktrees, panes, agents, and messaging."
  default_prompt: "Use $herdr to start or coordinate agents, manage herdr worktrees, or send a push-first message by handle."
```

(Note: `short_description` is 52 chars — within the codex 25–64 range — and `default_prompt` references `$herdr`, per the codex schema.)

- [ ] **Step 6: Verify the SKILL.md frontmatter still gates on HERDR_ENV**

Run: `grep -n 'HERDR_ENV=1' custos/skills/herdr/SKILL.md | head -1`
Expected: a match (the self-gate line survived the fold).

- [ ] **Step 7: Commit**

```bash
git add custos/skills/herdr/SKILL.md custos/skills/herdr/reference custos/skills/herdr/agents
git commit -m "$(cat <<'EOF'
chore - import and adapt herdr skill (ascii, herd.js)
EOF
)"
```

---

### Task 4: Orientation hook (silence + HERDR_ENV gating)

**Files:**
- Create: `custos/hooks/herdr-orient.js`
- Create: `custos/hooks/hooks.json`
- Test: `custos/hooks/__tests__/herdr-orient.test.js`

**Interfaces:**
- Produces: `herdr-orient.js` exporting `{ buildOrientation(herdJsPath), provisionCodex(opts), processSessionStart({ env, skillDir, herdJsPath, codexHome }), hashDir(dir), copyDir(src, dest), EXCLUDE }`. `processSessionStart` returns `null` when `env.HERDR_ENV !== '1'`, else `{ systemMessage, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }`. In this task `provisionCodex` is a stub returning `{ provisioned: false, reason: 'skipped' }`; Task 5 implements it.

- [ ] **Step 1: Write the failing test**

Create `custos/hooks/__tests__/herdr-orient.test.js`:

```javascript
const path = require('path');
const hook = require('../herdr-orient.js');

const SKILL_DIR = path.resolve(__dirname, '../../skills/herdr');
const HERD_JS = path.join(SKILL_DIR, 'scripts', 'herd.js');

describe('processSessionStart gating', () => {
  test('silent when HERDR_ENV is unset', () => {
    const r = hook.processSessionStart({
      env: {}, skillDir: SKILL_DIR, herdJsPath: HERD_JS, codexHome: '/nonexistent',
    });
    expect(r).toBeNull();
  });

  test('silent when HERDR_ENV !== 1', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '0' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS, codexHome: '/nonexistent',
    });
    expect(r).toBeNull();
  });

  test('orients when HERDR_ENV=1', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS, codexHome: '/nonexistent',
    });
    expect(r).not.toBeNull();
    expect(r.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/custos:herdr/);
    expect(r.hookSpecificOutput.additionalContext).toContain(HERD_JS);
  });
});

describe('buildOrientation', () => {
  test('mentions the skill and the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/custos:herdr/);
    expect(c).toContain('/abs/herd.js');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd custos && npx jest herdr-orient.test.js`
Expected: FAIL — `Cannot find module '../herdr-orient.js'`

- [ ] **Step 3: Write minimal implementation**

Create `custos/hooks/herdr-orient.js`:

```javascript
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'herdr');
const HERD_JS = path.join(SKILL_DIR, 'scripts', 'herd.js');
const EXCLUDE = new Set(['__tests__', 'node_modules']);

function buildOrientation(herdJsPath) {
  return [
    '# herdr (custos)',
    '',
    'You are running inside herdr, a terminal-native agent multiplexer.',
    'Invoke the `custos:herdr` skill for worktree / herd / pane / agent workflows.',
    `Roster/state helper: \`node ${herdJsPath} <pane|members|status|field> ...\` (reads herdr --json on stdin).`,
  ].join('\n');
}

function hashDir(dir) {
  const h = crypto.createHash('sha256');
  (function walk(d, rel) {
    const entries = fs.readdirSync(d, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of entries) {
      if (EXCLUDE.has(e.name)) continue;
      const abs = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(abs, r);
      else {
        h.update(r);
        h.update('\0');
        h.update(fs.readFileSync(abs));
        h.update('\0');
      }
    }
  })(dir, '');
  return h.digest('hex');
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => !EXCLUDE.has(path.basename(s)),
  });
}

// Implemented in Task 5.
function provisionCodex() {
  return { provisioned: false, reason: 'skipped' };
}

function processSessionStart({ env, skillDir, herdJsPath, codexHome }) {
  if (env.HERDR_ENV !== '1') return null;

  let provision = { provisioned: false, reason: 'skipped' };
  try {
    provision = provisionCodex({ skillDir, codexHome });
  } catch (e) {
    provision = { provisioned: false, reason: 'error', error: String((e && e.message) || e) };
  }

  let additionalContext = buildOrientation(herdJsPath);
  if (provision.provisioned) {
    additionalContext += `\n\nProvisioned the herdr skill for codex at ${path.join(codexHome, 'skills', 'herdr')}.`;
  }

  return {
    systemMessage: `📍 custos: herdr${provision.provisioned ? ' (codex synced)' : ''}`,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  };
}

async function readStdin() {
  let s = '';
  try {
    for await (const chunk of process.stdin) s += chunk;
  } catch {
    /* ignore */
  }
  return s;
}

async function main() {
  await readStdin(); // drain stdin; input is unused
  const result = processSessionStart({
    env: process.env,
    skillDir: SKILL_DIR,
    herdJsPath: HERD_JS,
    codexHome: path.join(os.homedir(), '.codex'),
  });
  if (result) console.log(JSON.stringify(result));
}

if (require.main === module) main();

module.exports = {
  buildOrientation,
  hashDir,
  copyDir,
  provisionCodex,
  processSessionStart,
  EXCLUDE,
  PLUGIN_ROOT,
  SKILL_DIR,
  HERD_JS,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd custos && npx jest herdr-orient.test.js`
Expected: PASS.

- [ ] **Step 5: Create `custos/hooks/hooks.json`**

```json
{
  "description": "herdr orientation + codex skill provisioning when running inside herdr",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/herdr-orient.js",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 6: Make the hook executable and verify the silent/loud paths end-to-end**

Run: `chmod +x custos/hooks/herdr-orient.js`
Run: `echo '{}' | HERDR_ENV=0 node custos/hooks/herdr-orient.js; echo "exit:$?"`
Expected: no stdout; `exit:0` (silent).
Run: `echo '{}' | HERDR_ENV=1 node custos/hooks/herdr-orient.js`
Expected: a JSON line whose `hookSpecificOutput.additionalContext` mentions `custos:herdr`.

- [ ] **Step 7: Commit**

```bash
git add custos/hooks/herdr-orient.js custos/hooks/hooks.json custos/hooks/__tests__/herdr-orient.test.js
git commit -m "$(cat <<'EOF'
chore - add custos herdr-orient hook (orientation + gating)
EOF
)"
```

---

### Task 5: Codex provisioning in the hook

**Files:**
- Modify: `custos/hooks/herdr-orient.js` (replace the `provisionCodex` stub)
- Test: `custos/hooks/__tests__/herdr-orient.test.js` (add provisioning suite)

**Interfaces:**
- Consumes: `hashDir`, `copyDir`, `EXCLUDE` from Task 4.
- Produces: `provisionCodex({ skillDir, codexHome })` → `{ provisioned: boolean, reason: 'codex-absent'|'current'|'missing'|'stale' }`. Copies `skillDir` → `<codexHome>/skills/herdr` (excluding `__tests__`/`node_modules`), writes `<codexHome>/skills/herdr/.custos-hash`, and is a no-op when the hash matches. Never creates `<codexHome>/hooks.json`.

- [ ] **Step 1: Write the failing test (add to the existing test file)**

Append to `custos/hooks/__tests__/herdr-orient.test.js`:

```javascript
const fs = require('fs');

function tmpdir() {
  const base = path.join(require('os').tmpdir(), 'custos-test-' + process.pid + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function makeFixtureSkill() {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, 'reference'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# herdr\n');
  fs.writeFileSync(path.join(dir, 'reference', 'cli.md'), 'cli\n');
  fs.writeFileSync(path.join(dir, 'scripts', 'herd.js'), '// helper\n');
  fs.mkdirSync(path.join(dir, '__tests__'), { recursive: true });
  fs.writeFileSync(path.join(dir, '__tests__', 'skip.js'), 'nope\n');
  return dir;
}

describe('provisionCodex', () => {
  test('skips when codex home is absent', () => {
    const skillDir = makeFixtureSkill();
    const r = hook.provisionCodex({ skillDir, codexHome: path.join(tmpdir(), 'no-codex') });
    expect(r).toEqual({ provisioned: false, reason: 'codex-absent' });
  });

  test('provisions when missing, then no-ops when current', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir(); // exists
    const first = hook.provisionCodex({ skillDir, codexHome });
    expect(first).toEqual({ provisioned: true, reason: 'missing' });

    const dest = path.join(codexHome, 'skills', 'herdr');
    expect(fs.existsSync(path.join(dest, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'scripts', 'herd.js'))).toBe(true);
    expect(fs.existsSync(path.join(dest, '.custos-hash'))).toBe(true);
    expect(fs.existsSync(path.join(dest, '__tests__'))).toBe(false); // excluded
    expect(fs.existsSync(path.join(codexHome, 'hooks.json'))).toBe(false); // never written

    const second = hook.provisionCodex({ skillDir, codexHome });
    expect(second).toEqual({ provisioned: false, reason: 'current' });
  });

  test('refreshes when source changed', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    hook.provisionCodex({ skillDir, codexHome });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# herdr v2\n');
    const r = hook.provisionCodex({ skillDir, codexHome });
    expect(r).toEqual({ provisioned: true, reason: 'stale' });
    expect(fs.readFileSync(path.join(codexHome, 'skills', 'herdr', 'SKILL.md'), 'utf8')).toBe('# herdr v2\n');
  });
});

describe('processSessionStart is failure-tolerant', () => {
  test('still orients when provisioning throws (bad skillDir)', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' },
      skillDir: '/definitely/not/here',
      herdJsPath: '/abs/herd.js',
      codexHome: tmpdir(),
    });
    expect(r).not.toBeNull();
    expect(r.hookSpecificOutput.additionalContext).toMatch(/custos:herdr/);
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `cd custos && npx jest herdr-orient.test.js -t provisionCodex`
Expected: FAIL — current stub returns `{ provisioned: false, reason: 'skipped' }`, not the expected results.

- [ ] **Step 3: Replace the `provisionCodex` stub with the real implementation**

In `custos/hooks/herdr-orient.js`, replace:

```javascript
// Implemented in Task 5.
function provisionCodex() {
  return { provisioned: false, reason: 'skipped' };
}
```

with:

```javascript
function provisionCodex({ skillDir, codexHome }) {
  if (!fs.existsSync(codexHome)) {
    return { provisioned: false, reason: 'codex-absent' };
  }
  const destSkills = path.join(codexHome, 'skills', 'herdr');
  const hashFile = path.join(destSkills, '.custos-hash');
  const srcHash = hashDir(skillDir);

  let curHash = null;
  try {
    curHash = fs.readFileSync(hashFile, 'utf8').trim();
  } catch {
    /* not provisioned yet */
  }
  if (curHash === srcHash) {
    return { provisioned: false, reason: 'current' };
  }

  fs.rmSync(destSkills, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destSkills), { recursive: true });
  copyDir(skillDir, destSkills);
  fs.writeFileSync(hashFile, srcHash + '\n');
  return { provisioned: true, reason: curHash ? 'stale' : 'missing' };
}
```

- [ ] **Step 4: Run the full hook test suite to verify it passes**

Run: `cd custos && npx jest herdr-orient.test.js`
Expected: PASS (gating + buildOrientation + provisionCodex + failure-tolerance suites all green).

- [ ] **Step 5: Run the whole custos suite**

Run: `cd custos && npm test`
Expected: PASS — `herd.test.js` and `herdr-orient.test.js`, no failures.

- [ ] **Step 6: Commit**

```bash
git add custos/hooks/herdr-orient.js custos/hooks/__tests__/herdr-orient.test.js
git commit -m "$(cat <<'EOF'
chore - provision herdr skill into codex from custos hook
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**

| Spec requirement | Task |
|---|---|
| Fifth plugin `custos`, name/positioning, version 0.1.0 | Task 1 |
| One plain-ASCII `skills/herdr/` (SKILL.md + reference/ + openai.yaml) | Task 3 |
| `agents/openai.yaml` inert-for-claude, codex constraints | Task 3 (steps 5) |
| `herd.js` replacing python one-liners (pane/members/status/field) | Task 2 (helper), Task 3 (conversion) |
| SessionStart hook silent unless HERDR_ENV=1 | Task 4 |
| Lean orientation `additionalContext` + resolved helper path | Task 4 |
| Auto-provision codex copy, content-hash gated, codex-detection gated | Task 5 |
| Never touch `~/.codex/hooks.json` / `herdr-agent-state.sh`; failure-tolerant | Task 5 (tests assert no hooks.json), Task 4 (try/catch) |
| Executable bit on hook + helper | Task 2 (step 5), Task 4 (step 6) |
| marketplace.json entry; bump-version.js PLUGINS; CLAUDE.md tables | Task 1 |
| Jest tests for hook + helper | Tasks 2, 4, 5 |

No gaps found.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every code step shows full code; every command shows expected output. The `provisionCodex` stub in Task 4 is intentional and explicitly replaced in Task 5.

**3. Type consistency:** `processSessionStart({ env, skillDir, herdJsPath, codexHome })` signature is identical in Tasks 4 and 5. `provisionCodex({ skillDir, codexHome })` returns the same `{ provisioned, reason }` shape used by `processSessionStart` and asserted in tests. `hashDir`/`copyDir`/`EXCLUDE` defined in Task 4, consumed in Task 5. `herd.js` exports (`pane/status/members/field/getField/dispatch/format`) match the test imports.

## Notes / accepted residuals

- Two aggregate one-liners in `reference/names.md` (sorted **workspace-label** list) remain inline `python3` — they are list aggregations outside the four-subcommand helper scope; the **handle** list is converted to `herd.js members`. Called out in Task 3, Step 3.
- The codex copy is delivered by **copy** (not symlink), per the approved design — robust to plugin version churn and uninstall.
