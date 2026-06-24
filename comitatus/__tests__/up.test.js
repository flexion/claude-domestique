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
