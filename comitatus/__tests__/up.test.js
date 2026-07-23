const { parseArgs, makeAgent, startAgent, launchAgent, up } = require('../skills/herdr/scripts/up.js');

describe('makeAgent', () => {
  test('claude → ◆ glyph, claude kind, no extra args', () => {
    expect(makeAgent('claude', 'sly'))
      .toEqual({ model: 'claude', handle: 'sly', kind: 'claude', extraArgs: [], glyph: '◆' });
  });
  test('codex → ◇ glyph, codex kind, no extra args', () => {
    expect(makeAgent('codex', 'jay'))
      .toEqual({ model: 'codex', handle: 'jay', kind: 'codex', extraArgs: [], glyph: '◇' });
  });
  test('opencode splits handle:model into a -m selector (model may contain colons)', () => {
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b')).toEqual({
      model: 'opencode', handle: 'bob', kind: 'opencode',
      extraArgs: ['-m', 'ollama/qwen2.5:7b'], glyph: '⬨',
    });
  });
  test('opencode without :model throws', () => {
    expect(() => makeAgent('opencode', 'bob')).toThrow(/<handle>:<model>/);
  });
  test('opencode model with shell metacharacters is rejected', () => {
    expect(() => makeAgent('opencode', 'bob:x; curl evil|sh')).toThrow(/unsafe characters/);
    expect(() => makeAgent('opencode', 'bob:$(whoami)')).toThrow(/unsafe characters/);
    // a legitimate model with dots, slashes and a colon is still accepted
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b').extraArgs).toEqual(['-m', 'ollama/qwen2.5:7b']);
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
  test('--source-workspace is optional and captured when present', () => {
    expect(parseArgs(['--branch', 'b', '--claude', 'sly']).sourceWorkspace).toBeUndefined();
    expect(parseArgs(['--branch', 'b', '--source-workspace', 'w1Z', '--claude', 'sly']).sourceWorkspace).toBe('w1Z');
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

// Responses may be strings or (file, args) => string functions.
function fakeRunner(matchers) {
  const calls = [];
  const run = (file, args) => {
    calls.push([file, ...args]);
    for (const [pred, resp] of matchers) {
      if (pred(file, args)) {
        if (resp instanceof Error) throw resp;
        return typeof resp === 'function' ? resp(file, args) : resp;
      }
    }
    return '';
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
// `worktree list --cwd` resolves the repo's parent (main-checkout) workspace id.
const WL = JSON.stringify({ result: { source: { source_workspace_id: 'wMain' }, worktrees: [] } });

// Dynamic tab/pane ids so multi-agent sequences stay distinguishable:
// tab create -> t2/p2, t3/p4, ...; agent start takes over the tab's root pane
// (the --pane it is handed) and reports that same pane back.
function dynMatchers(listResp = AGENT_LIST()) {
  let t = 1;
  let p = 1;
  return [
    [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', listResp],
    [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'list', WL],
    [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', WT],
    [(f, a) => f === 'herdr' && a[0] === 'tab' && a[1] === 'create',
      () => JSON.stringify({ result: { tab: { tab_id: `wR:t${++t}` }, root_pane: { pane_id: `wR:p${++p}` } } })],
    [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'start',
      (f, a) => {
        const paneIdx = a.indexOf('--pane') + 1;
        return JSON.stringify({ result: { agent: { pane_id: a[paneIdx], name: a[2] } } });
      }],
  ];
}

describe('startAgent', () => {
  const AGENT = 'jay';
  const a = () => makeAgent('claude', AGENT);
  const busy = JSON.stringify({ error: { code: 'agent_pane_busy', message: 'not an available shell' } });
  const ok = JSON.stringify({ result: { agent: { pane_id: 'wR:p2', name: AGENT } } });

  // A fresh root pane returns agent_pane_busy for a few hundred ms (exit 0 with a
  // JSON error), then becomes an available shell. startAgent retries only that.
  function runner(responses) {
    const calls = [];
    let i = 0;
    const run = (f, args) => { calls.push([f, ...args]); return responses[Math.min(i++, responses.length - 1)]; };
    const slept = [];
    return { deps: { run, sleep: (ms) => slept.push(ms) }, calls, slept };
  }

  test('retries agent_pane_busy (JSON error envelope), then returns the started agent', () => {
    const { deps, calls, slept } = runner([busy, busy, ok]);
    const st = startAgent(a(), 'wR:p2', '45000', deps);
    expect(st.result.agent.name).toBe(AGENT);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'start')).toHaveLength(3);
    expect(slept).toEqual([400, 400]); // one wait between each busy response, none after success
  });

  // The real execFileSync path throws on the non-zero exit, with the error JSON
  // on e.stderr (empty stdout). readStart must recover the envelope from stderr.
  test('recovers the busy error from a thrown execFileSync-style error (JSON on stderr)', () => {
    const calls = [];
    let i = 0;
    const slept = [];
    const run = (f, args) => {
      calls.push([f, ...args]);
      if (i++ === 0) { const e = new Error('Command failed'); e.status = 1; e.stdout = ''; e.stderr = busy + '\n'; throw e; }
      return ok;
    };
    const st = startAgent(a(), 'wR:p2', '45000', { run, sleep: (ms) => slept.push(ms) });
    expect(st.result.agent.name).toBe(AGENT);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'start')).toHaveLength(2);
    expect(slept).toEqual([400]);
  });

  test('a thrown error with no JSON envelope (real spawn failure) propagates', () => {
    const run = () => { const e = new Error('spawn herdr ENOENT'); throw e; };
    expect(() => startAgent(a(), 'wR:p2', '45000', { run, sleep: () => {} })).toThrow(/ENOENT/);
  });

  // A nonempty but non-JSON stdout must not mask a valid envelope on stderr.
  test('recovers the busy envelope from stderr even when stdout is nonempty non-JSON', () => {
    const calls = [];
    let i = 0;
    const slept = [];
    const run = (f, args) => {
      calls.push([f, ...args]);
      if (i++ === 0) {
        const e = new Error('Command failed'); e.status = 1;
        e.stdout = 'warning: some noise\n'; e.stderr = busy + '\n'; throw e;
      }
      return ok;
    };
    const st = startAgent(a(), 'wR:p2', '45000', { run, sleep: (ms) => slept.push(ms) });
    expect(st.result.agent.name).toBe(AGENT);
    expect(slept).toEqual([400]);
  });

  test('does not retry a non-busy error - it throws immediately', () => {
    const err = JSON.stringify({ error: { code: 'agent_name_taken', message: 'handle taken' } });
    const { deps, calls } = runner([err]);
    expect(() => startAgent(a(), 'wR:p2', '45000', deps)).toThrow(/handle taken/);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'start')).toHaveLength(1);
  });

  test('opencode extra args ride after -- on the start call', () => {
    const { deps, calls } = runner([ok]);
    startAgent(makeAgent('opencode', 'bob:ollama/qwen2.5:7b'), 'wR:p2', '45000', deps);
    expect(calls[0]).toEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });
});

describe('launchAgent', () => {
  test('tab create -> agent start --kind/--pane (root pane) -> wait until idle', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const out = launchAgent(makeAgent('codex', 'jay'), { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(out).toEqual({ handle: 'jay', model: 'codex', pane_id: 'wR:p2', tab: 'wR:t2' });
    expect(calls).toEqual([
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus'],
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p2', '--timeout', '45000'],
      ['herdr', 'agent', 'wait', 'jay', '--until', 'idle', '--timeout', '45000'],
    ]);
  });
  test('label and timeout are overridable', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    launchAgent(makeAgent('claude', 'sly'), { workspace: 'wR', cwd: '/wt/x', label: 'x', timeout: 9000 }, { run });
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'x', '--no-focus']);
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '9000']);
  });
  test('opencode passes its -m selector after -- ', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    launchAgent(makeAgent('opencode', 'bob:ollama/qwen2.5:7b'), { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });
});

describe('up', () => {
  test('single claude agent: exact call sequence and result', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly'], { run, cwd: '/wt/here' });

    expect(result).toEqual({
      worktree: { path: '/wt/x', workspace_id: 'wR' },
      agents: [{ handle: 'sly', model: 'claude', pane_id: 'wR:p2', tab: 'wR:t2' }],
    });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['git', 'fetch', 'origin', 'main'],
      ['herdr', 'worktree', 'list', '--cwd', '/wt/here', '--json'], // resolve source workspace
      ['herdr', 'worktree', 'create', '--branch', 'chore/x', '--base', 'origin/main', '--no-focus', '--json',
        '--workspace', 'wMain'],
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'sly ◆', '--no-focus'],
      ['herdr', 'agent', 'start', 'sly', '--kind', 'claude', '--pane', 'wR:p2', '--timeout', '45000'],
      ['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '45000'],
      ['herdr', 'tab', 'close', 'wR:t1'], // the worktree's original root tab
    ]);
  });

  test('each agent gets its own tab; the worktree root tab closes last', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay'], { run });

    expect(result.agents).toEqual([
      { handle: 'sly', model: 'claude', pane_id: 'wR:p2', tab: 'wR:t2' },
      { handle: 'jay', model: 'codex', pane_id: 'wR:p3', tab: 'wR:t3' },
    ]);
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus']);
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p3', '--timeout', '45000']);
    expect(calls[calls.length - 1]).toEqual(['herdr', 'tab', 'close', 'wR:t1']);
  });

  test('opencode agent starts with its -m selector after --', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--opencode', 'bob:ollama/qwen2.5:7b'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });

  test('git fetch derives the branch from --base', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--base', 'origin/dev', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['git', 'fetch', 'origin', 'dev']);
  });

  test('--timeout flows into the readiness wait', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--timeout', '9000', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '9000']);
  });

  test('resolves the source workspace from cwd and forwards it to worktree create', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--claude', 'sly'], { run, cwd: '/some/linked/wt' });
    expect(calls).toContainEqual(['herdr', 'worktree', 'list', '--cwd', '/some/linked/wt', '--json']);
    expect(calls).toContainEqual(
      ['herdr', 'worktree', 'create', '--branch', 'b', '--base', 'origin/main', '--no-focus', '--json',
        '--workspace', 'wMain']);
  });

  test('--source-workspace overrides the cwd lookup (no worktree list call)', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--source-workspace', 'wOverride', '--claude', 'sly'], { run });
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'list')).toBe(false);
    expect(calls).toContainEqual(
      ['herdr', 'worktree', 'create', '--branch', 'b', '--base', 'origin/main', '--no-focus', '--json',
        '--workspace', 'wOverride']);
  });

  test('throws (does not silently omit --workspace) when the source workspace is unresolved', () => {
    const noSource = dynMatchers();
    // override the worktree-list matcher to return an envelope with no source id
    noSource[1] = [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'list',
      JSON.stringify({ result: { source: {}, worktrees: [] } })];
    const { run, calls } = fakeRunner(noSource);
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run, cwd: '/nowhere' }))
      .toThrow(/could not resolve a source workspace/);
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'create')).toBe(false);
  });

  test('pre-flight rejects a globally taken handle without creating a worktree', () => {
    const { run, calls } = fakeRunner(dynMatchers(AGENT_LIST(['sly'])));
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run })).toThrow(/already taken: sly/);
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'create')).toBe(false);
  });

  test('propagates a runner failure', () => {
    const failing = [
      [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', AGENT_LIST()],
      [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'list', WL],
      [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', new Error('worktree_create_failed')],
    ];
    const { run } = fakeRunner(failing);
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run })).toThrow(/worktree_create_failed/);
  });
});

const { execFileSync } = require('child_process');
const path = require('path');

const HERD = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'herd.js');
const UP = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'up.js');

describe('herd.js up wiring', () => {
  test('helper scripts parse under the active Node runtime', () => {
    execFileSync('node', ['--check', HERD], { encoding: 'utf8', stdio: 'pipe' });
    execFileSync('node', ['--check', UP], { encoding: 'utf8', stdio: 'pipe' });
  });

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
