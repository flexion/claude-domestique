const fs = require('fs');
const os = require('os');
const path = require('path');

const f = require('../skills/herdr/scripts/fanout.js');

// Partition `fanout` of run fanout-comitatus. These are the contract; the module
// ships as a stub whose placeholder returns make every assertion below print the
// value it got.

const TMP = [];
function tmpdir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fanout-test-'));
  TMP.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of TMP) fs.rmSync(dir, { recursive: true, force: true });
});

// A worktree that actually has the committed roles directory, because roleCmd
// resolves the role file against the recipient's cwd and the whole point of the
// check is that a role file present only in the operator's checkout is a
// failure the recipient cannot recover from.
function worktreeWithRoles(roles = ['implementer', 'architect']) {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, '.pipeline', 'roles'), { recursive: true });
  for (const r of roles) {
    fs.writeFileSync(path.join(dir, '.pipeline', 'roles', `${r}.md`), `# ${r}\n`);
  }
  return dir;
}

function agentList(agents) {
  return JSON.stringify({ result: { agents } });
}

// Stateful fake: the roster grows as agents launch, so a handle preflight sees
// what a real `herdr agent list` would see at that moment.
function fakeHerd({ agents = [], cwdOf = () => '/wt/task-x' } = {}) {
  const roster = agents.slice();
  const calls = [];
  let t = 1;
  let p = 1;
  const run = (file, args) => {
    calls.push([file, ...args]);
    if (file === 'herdr' && args[0] === 'agent' && args[1] === 'list') return agentList(roster);
    if (file === 'herdr' && args[0] === 'worktree' && args[1] === 'list') {
      return JSON.stringify({ result: { source: { source_workspace_id: 'wMain' }, worktrees: [] } });
    }
    if (file === 'herdr' && args[0] === 'worktree' && args[1] === 'create') {
      const branch = args[args.indexOf('--branch') + 1];
      return JSON.stringify({
        result: {
          worktree: { path: `/wt/${branch.replace(/\//g, '-')}`, open_workspace_id: `w-${branch}` },
          root_pane: { pane_id: 'wR:p1' },
          tab: { tab_id: 'wR:t1' },
        },
      });
    }
    if (file === 'herdr' && args[0] === 'tab' && args[1] === 'create') {
      return JSON.stringify({
        result: { tab: { tab_id: `t${++t}` }, root_pane: { pane_id: `pane${++p}` } },
      });
    }
    if (file === 'herdr' && args[0] === 'agent' && args[1] === 'start') {
      const name = args[2];
      const paneId = args[args.indexOf('--pane') + 1];
      roster.push({
        name, agent: 'codex', pane_id: paneId, workspace_id: 'wX',
        agent_status: 'idle', cwd: cwdOf(name),
      });
      return JSON.stringify({ result: { agent: { name, pane_id: paneId } } });
    }
    return '';
  };
  return { run, calls, roster };
}

function deps(over = {}) {
  return {
    lockDir: tmpdir(),
    env: {},
    sleep: () => {},
    now: () => 0,
    cwd: '/wt/task-x',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// criterion 1, 2: roleLine
// ---------------------------------------------------------------------------

describe('roleLine', () => {
  test('the architect form: role by path, then $RUN', () => {
    expect(f.roleLine({ role: 'architect', run: 'fanout-comitatus' }))
      .toBe('read .pipeline/roles/architect.md and follow it. $RUN is fanout-comitatus');
  });

  test('$PARTITION is appended after $RUN, comma separated', () => {
    expect(f.roleLine({ role: 'implementer', run: 'fanout-comitatus', partition: 'auth' }))
      .toBe('read .pipeline/roles/implementer.md and follow it. $RUN is fanout-comitatus, $PARTITION is auth');
  });

  test('$HYPOTHESIS is appended the same way, for the debug path', () => {
    expect(f.roleLine({ role: 'probe', run: 'bug-7', hypothesis: '2' }))
      .toBe('read .pipeline/roles/probe.md and follow it. $RUN is bug-7, $HYPOTHESIS is 2');
  });

  test('rolesDir is overridable for a repo that keeps the roles elsewhere', () => {
    expect(f.roleLine({
      role: 'architect', run: 'x', rolesDir: 'modus/skills/agent-work-item/roles',
    })).toBe('read modus/skills/agent-work-item/roles/architect.md and follow it. $RUN is x');
  });

  test('the default rolesDir is the runbook\'s .pipeline/roles', () => {
    expect(f.DEFAULT_ROLES_DIR).toBe('.pipeline/roles');
    expect(f.roleLine({ role: 'reviewer', run: 'x' }))
      .toContain(`read ${f.DEFAULT_ROLES_DIR}/reviewer.md`);
  });

  // A newline in a prompt submits the turn, so a two-line role assignment
  // delivers only its first half. Asserted as an exact single-line string
  // rather than a newline count, which a placeholder '' would satisfy.
  test('every form is exactly one line', () => {
    const lines = [
      f.roleLine({ role: 'architect', run: 'x' }),
      f.roleLine({ role: 'implementer', run: 'x', partition: 'p' }),
      f.roleLine({ role: 'probe', run: 'x', hypothesis: '1' }),
    ];
    expect(lines).toEqual([
      'read .pipeline/roles/architect.md and follow it. $RUN is x',
      'read .pipeline/roles/implementer.md and follow it. $RUN is x, $PARTITION is p',
      'read .pipeline/roles/probe.md and follow it. $RUN is x, $HYPOTHESIS is 1',
    ]);
  });

  test('a missing role or run is refused rather than interpolated as undefined', () => {
    expect(() => f.roleLine({ run: 'x' })).toThrow(/role/);
    expect(() => f.roleLine({ role: 'architect' })).toThrow(/run/i);
  });
});

// ---------------------------------------------------------------------------
// criterion 3, 4: roleCmd
// ---------------------------------------------------------------------------

describe('parseRole', () => {
  test('handle is positional; role, run, partition, hypothesis are named', () => {
    expect(f.parseRole(['impl1', '--role', 'implementer', '--run', 'r7',
      '--partition', 'auth', '--roles-dir', 'roles'])).toEqual({
      handle: 'impl1',
      role: 'implementer',
      run: 'r7',
      partition: 'auth',
      hypothesis: undefined,
      rolesDir: 'roles',
      from: undefined,
    });
  });

  test('--role and --run are both required', () => {
    expect(() => f.parseRole(['impl1', '--run', 'r7'])).toThrow(/--role/);
    expect(() => f.parseRole(['impl1', '--role', 'implementer'])).toThrow(/--run/);
  });
});

describe('roleCmd', () => {
  test('sends the composed line with --reply and reports the role and line back', () => {
    const cwd = worktreeWithRoles();
    const herd = fakeHerd();
    herd.roster.push({
      name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1',
      agent_status: 'idle', cwd,
    });
    const out = f.roleCmd(
      ['impl1', '--role', 'implementer', '--run', 'r7', '--partition', 'auth', '--from', 'arch'],
      deps({ run: herd.run }));

    expect(out.role).toBe('implementer');
    expect(out.line)
      .toBe('read .pipeline/roles/implementer.md and follow it. $RUN is r7, $PARTITION is auth');
    expect(out.delivery).toBe('observed');

    const prompt = herd.calls.find((c) => c[1] === 'agent' && c[2] === 'prompt');
    expect(prompt).toBeDefined();
    expect(prompt[4]).toMatch(
      /^\[from arch reply #[a-f0-9]+\] read \.pipeline\/roles\/implementer\.md and follow it\. \$RUN is r7, \$PARTITION is auth$/);
  });

  // The runbook's own named failure: a file that exists only in the operator's
  // main checkout. The recipient's cwd is the only place worth checking, and it
  // is on the agent list already.
  test('throws naming the path when the role file is absent from the RECIPIENT cwd', () => {
    const cwd = worktreeWithRoles(['architect']); // no implementer.md
    const herd = fakeHerd();
    herd.roster.push({
      name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1',
      agent_status: 'idle', cwd,
    });
    expect(() => f.roleCmd(['impl1', '--role', 'implementer', '--run', 'r7', '--from', 'arch'],
      deps({ run: herd.run })))
      .toThrow(new RegExp(path.join(cwd, '.pipeline/roles/implementer.md').replace(/[.\\]/g, '\\$&')));
  });

  test('a role file present in the operator cwd but not the recipient cwd still throws', () => {
    const operator = worktreeWithRoles();
    const recipient = tmpdir(); // bare worktree: nothing committed under .pipeline
    const herd = fakeHerd();
    herd.roster.push({
      name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1',
      agent_status: 'idle', cwd: recipient,
    });
    expect(() => f.roleCmd(['impl1', '--role', 'implementer', '--run', 'r7', '--from', 'arch'],
      deps({ run: herd.run, cwd: operator })))
      .toThrow(/implementer\.md/);
  });

  // Delivered by path. Reading the role file and inlining it would make the
  // assignment unauditable and blow past the one-line limit.
  test('the role file text is never read into the message', () => {
    const cwd = worktreeWithRoles();
    fs.writeFileSync(path.join(cwd, '.pipeline', 'roles', 'implementer.md'),
      'SECRET-ROLE-BODY do not paste me\n');
    const herd = fakeHerd();
    herd.roster.push({
      name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1',
      agent_status: 'idle', cwd,
    });
    const out = f.roleCmd(['impl1', '--role', 'implementer', '--run', 'r7', '--from', 'arch'],
      deps({ run: herd.run }));
    expect(out.line).toBe('read .pipeline/roles/implementer.md and follow it. $RUN is r7');
    expect(out.line).not.toContain('SECRET-ROLE-BODY');
  });

  test('an unknown handle throws before any prompt is typed', () => {
    const herd = fakeHerd();
    expect(() => f.roleCmd(['nobody', '--role', 'implementer', '--run', 'r7', '--from', 'arch'],
      deps({ run: herd.run }))).toThrow(/nobody/);
    expect(herd.calls.filter((c) => c[2] === 'prompt')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// criterion 5, 6, 7: fanoutCmd
// ---------------------------------------------------------------------------

describe('parseFanout', () => {
  test('defaults match the runbook: base task/<run>, codex, implementer, impl prefix', () => {
    expect(f.parseFanout(['--run', 'r7', '--partitions', 'auth,ui'])).toEqual({
      run: 'r7',
      partitions: ['auth', 'ui'],
      taskBranch: 'task/r7',
      partitionSep: '-',
      base: 'task/r7',
      kind: 'codex',
      selector: 'model=gpt-5.6-sol,effort=medium',
      role: 'implementer',
      prefix: 'impl',
      rolesDir: '.pipeline/roles',
      timeout: 45000,
    });
  });

  test('--run and --partitions are required', () => {
    expect(() => f.parseFanout(['--partitions', 'a,b'])).toThrow(/--run/);
    expect(() => f.parseFanout(['--run', 'r7'])).toThrow(/--partitions/);
  });

  test('a duplicate partition name is refused: two worktrees would collide on one branch', () => {
    expect(() => f.parseFanout(['--run', 'r7', '--partitions', 'auth,auth']))
      .toThrow(/duplicate/);
  });

  // run fanout-branch-naming. A throw names nothing and prints no value, so a
  // not-yet-supported flag is surfaced as a value the diff can show.
  const attempt = (args) => {
    try {
      return f.parseFanout(args);
    } catch (error) {
      return { threw: error.message };
    }
  };

  test('--task-branch becomes both the base and the partition branch stem', () => {
    const cfg = attempt(['--run', 'r7', '--partitions', 'api', '--task-branch', 'chore/make-new-readme']);
    expect(cfg.taskBranch).toBe('chore/make-new-readme');
    expect(cfg.base).toBe('chore/make-new-readme');
    expect(cfg.partitionSep).toBe('-');
  });

  // --base stays independent: fanning a partition off something other than the
  // task branch is still legal, and naming the task branch must not silently
  // repoint it.
  test('an explicit --base still wins over --task-branch', () => {
    const cfg = attempt(['--run', 'r7', '--partitions', 'api',
      '--task-branch', 'chore/make-new-readme', '--base', 'origin/main']);
    expect(cfg.base).toBe('origin/main');
    expect(cfg.taskBranch).toBe('chore/make-new-readme');
  });

  test('a / separator is refused with git\'s reason, not accepted and failed later', () => {
    const args = ['--run', 'r7', '--partitions', 'api', '--partition-sep', '/'];
    expect(() => f.parseFanout(args)).toThrow(/cannot|refs are files|exists/i);
  });
});

describe('fanoutCmd branch naming', () => {
  test.each([
    ['chore/make-new-readme', 'chore/make-new-readme-api', 'chore/make-new-readme-ui'],
    ['76632-create-new-thing', '76632-create-new-thing-api', '76632-create-new-thing-ui'],
  ])('%s: each partition worktree is created off the resolved branch', (taskBranch, apiBranch, uiBranch) => {
    const cwd = worktreeWithRoles();
    const herd = fakeHerd({ cwdOf: () => cwd });
    let rows;
    try {
      rows = f.fanoutCmd(['--run', 'r7', '--partitions', 'api,ui', '--task-branch', taskBranch],
        { run: herd.run, env: {}, sleep: () => {}, now: () => 0, cwd });
    } catch (error) {
      rows = [{ threw: error.message }];
    }
    expect(rows.map((r) => r.branch)).toEqual([apiBranch, uiBranch]);
    const created = herd.calls
      .filter((c) => c[1] === 'worktree' && c[2] === 'create')
      .map((c) => c[c.indexOf('--branch') + 1]);
    expect(created).toEqual([apiBranch, uiBranch]);
    const bases = herd.calls
      .filter((c) => c[1] === 'worktree' && c[2] === 'create')
      .map((c) => c[c.indexOf('--base') + 1]);
    expect(bases).toEqual([taskBranch, taskBranch]);
  });
});

describe('fanoutCmd', () => {
  test('one worktree and one implementer per partition, branched off the task branch', () => {
    const cwdByHandle = {};
    const herd = fakeHerd({
      agents: [{
        name: 'arch', agent: 'claude', pane_id: 'wA:p1', workspace_id: 'wA',
        agent_status: 'idle', cwd: '/wt/task-r7',
      }],
      cwdOf: (name) => cwdByHandle[name] || worktreeWithRoles(),
    });
    const out = f.fanoutCmd(['--run', 'r7', '--partitions', 'auth,ui'],
      deps({ run: herd.run, env: { HERDR_PANE_ID: 'wA:p1' } }));

    expect(out).toHaveLength(2);
    expect(out.map((r) => r.partition)).toEqual(['auth', 'ui']);
    expect(out.map((r) => r.handle)).toEqual(['impl1', 'impl2']);
    expect(out.map((r) => r.branch)).toEqual(['task/r7-auth', 'task/r7-ui']);

    const creates = herd.calls.filter((c) => c[1] === 'worktree' && c[2] === 'create');
    expect(creates).toHaveLength(2);
    expect(creates[0]).toEqual(expect.arrayContaining(
      ['--branch', 'task/r7-auth', '--base', 'task/r7']));
    expect(creates[1]).toEqual(expect.arrayContaining(
      ['--branch', 'task/r7-ui', '--base', 'task/r7']));

    const starts = herd.calls.filter((c) => c[1] === 'agent' && c[2] === 'start');
    expect(starts.map((c) => c[3])).toEqual(['impl1', 'impl2']);
    expect(starts[0]).toEqual(expect.arrayContaining(
      ['--kind', 'codex', '--', '--model', 'gpt-5.6-sol', '-c', 'model_reasoning_effort=medium']));
  });

  test('each implementer is sent its own $PARTITION role line', () => {
    const herd = fakeHerd({
      agents: [{
        name: 'arch', agent: 'claude', pane_id: 'wA:p1', workspace_id: 'wA',
        agent_status: 'idle', cwd: '/wt/task-r7',
      }],
      cwdOf: () => worktreeWithRoles(),
    });
    f.fanoutCmd(['--run', 'r7', '--partitions', 'auth,ui'],
      deps({ run: herd.run, env: { HERDR_PANE_ID: 'wA:p1' } }));

    const prompts = herd.calls
      .filter((c) => c[1] === 'agent' && c[2] === 'prompt')
      .map((c) => c[4].replace(/#[a-f0-9]+/, '#ID'));
    expect(prompts).toEqual([
      '[from arch reply #ID] read .pipeline/roles/implementer.md and follow it. $RUN is r7, $PARTITION is auth',
      '[from arch reply #ID] read .pipeline/roles/implementer.md and follow it. $RUN is r7, $PARTITION is ui',
    ]);
  });

  // "claim each one against a live `herdr agent list`". A handle collision
  // surfaces only at agent start, after the tab and the worktree exist, so the
  // preflight has to happen before the first create.
  test('a taken handle throws before any worktree is created', () => {
    const herd = fakeHerd({
      agents: [
        { name: 'arch', agent: 'claude', pane_id: 'wA:p1', workspace_id: 'wA', agent_status: 'idle', cwd: '/wt/task-r7' },
        { name: 'impl2', agent: 'codex', pane_id: 'wZ:p1', workspace_id: 'wZ', agent_status: 'idle', cwd: '/wt/stale' },
      ],
    });
    expect(() => f.fanoutCmd(['--run', 'r7', '--partitions', 'auth,ui'],
      deps({ run: herd.run, env: { HERDR_PANE_ID: 'wA:p1' } })))
      .toThrow(/impl2/);
    expect(herd.calls.filter((c) => c[1] === 'worktree' && c[2] === 'create')).toHaveLength(0);
  });

  // Width 2 with one dead partition should still leave the operator the other
  // one. An exception would cost them a worktree that came up fine.
  test('a partition that fails is reported and the rest still launch', () => {
    let creates = 0;
    const base = fakeHerd({
      agents: [{
        name: 'arch', agent: 'claude', pane_id: 'wA:p1', workspace_id: 'wA',
        agent_status: 'idle', cwd: '/wt/task-r7',
      }],
      cwdOf: () => worktreeWithRoles(),
    });
    const run = (file, args) => {
      if (file === 'herdr' && args[0] === 'worktree' && args[1] === 'create' && creates++ === 0) {
        throw new Error('worktree create: branch_exists');
      }
      return base.run(file, args);
    };
    const out = f.fanoutCmd(['--run', 'r7', '--partitions', 'auth,ui'],
      deps({ run, env: { HERDR_PANE_ID: 'wA:p1' } }));

    expect(out).toHaveLength(2);
    expect(out[0].partition).toBe('auth');
    expect(out[0].error).toMatch(/branch_exists/);
    expect(out[1].partition).toBe('ui');
    expect(out[1].error).toBeUndefined();
    expect(out[1].delivery).toBe('observed');
  });

  test('a delivery failure preserves the worktree and agent that were launched', () => {
    const recipient = tmpdir(); // launch succeeds, but this worktree has no role file
    const herd = fakeHerd({
      agents: [{
        name: 'arch', agent: 'claude', pane_id: 'wA:p1', workspace_id: 'wA',
        agent_status: 'idle', cwd: '/wt/task-r7',
      }],
      cwdOf: () => recipient,
    });

    const [row] = f.fanoutCmd(['--run', 'r7', '--partitions', 'auth'],
      deps({ run: herd.run, env: { HERDR_PANE_ID: 'wA:p1' } }));

    expect(row).toEqual(expect.objectContaining({
      partition: 'auth',
      handle: 'impl1',
      branch: 'task/r7-auth',
      worktree: { path: '/wt/task-r7-auth', workspace_id: 'w-task/r7-auth' },
      agent: expect.objectContaining({ handle: 'impl1', kind: 'codex' }),
      error: expect.stringMatching(/implementer\.md/),
    }));
  });
});

// ---------------------------------------------------------------------------
// criterion 8, 9: waitAllCmd
// ---------------------------------------------------------------------------

describe('parseWaitAll', () => {
  test('handles are one comma list; the runbook\'s defaults are idle,done / 900000', () => {
    expect(f.parseWaitAll(['impl1,impl2'])).toEqual({
      handles: ['impl1', 'impl2'],
      statuses: ['idle', 'done'],
      timeout: 900000,
      interval: 2000,
    });
    expect(f.DEFAULT_WAIT_TIMEOUT_MS).toBe(900000);
  });

  test('at least one handle is required', () => {
    expect(() => f.parseWaitAll([])).toThrow(/handle/);
    expect(() => f.parseWaitAll(['--status', 'idle'])).toThrow(/handle/);
  });
});

describe('waitAllCmd', () => {
  test('all handles settled: a row each, in the order given', () => {
    const herd = fakeHerd({
      agents: [
        { name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle', cwd: '/a' },
        { name: 'impl2', agent: 'codex', pane_id: 'w2:p1', workspace_id: 'w2', agent_status: 'done', cwd: '/b' },
      ],
    });
    expect(f.waitAllCmd(['impl2,impl1'], deps({ run: herd.run }))).toEqual([
      { handle: 'impl2', status: 'done', settled: true },
      { handle: 'impl1', status: 'idle', settled: true },
    ]);
  });

  // One `agent list` per round for the whole set. N native waits cost N sockets
  // and serialise on the slowest handle.
  test('one agent list per round, not one wait per handle', () => {
    let round = 0;
    const statuses = [
      { impl1: 'working', impl2: 'working' },
      { impl1: 'idle', impl2: 'working' },
      { impl1: 'idle', impl2: 'done' },
    ];
    const calls = [];
    const run = (file, args) => {
      calls.push([file, ...args]);
      if (file === 'herdr' && args[0] === 'agent' && args[1] === 'list') {
        const s = statuses[Math.min(round++, statuses.length - 1)];
        return agentList(Object.entries(s).map(([name, agent_status]) => ({
          name, agent: 'codex', pane_id: `${name}:p1`, workspace_id: name, agent_status, cwd: '/x',
        })));
      }
      return '';
    };
    const slept = [];
    const out = f.waitAllCmd(['impl1,impl2'],
      deps({ run, sleep: (ms) => slept.push(ms), now: () => 0 }));

    expect(out).toEqual([
      { handle: 'impl1', status: 'idle', settled: true },
      { handle: 'impl2', status: 'done', settled: true },
    ]);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'list')).toHaveLength(3);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'wait')).toHaveLength(0);
    expect(slept).toEqual([2000, 2000]);
  });

  // An exception reports the first failure and hides the rest. At width 2 that
  // is half the information the operator needs to decide what to re-send.
  test('a timeout does not throw and does not suppress the handles that settled', () => {
    const herd = fakeHerd({
      agents: [
        { name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle', cwd: '/a' },
        { name: 'impl2', agent: 'codex', pane_id: 'w2:p1', workspace_id: 'w2', agent_status: 'working', cwd: '/b' },
      ],
    });
    let t = 0;
    const out = f.waitAllCmd(['impl1,impl2', '--timeout', '1000'],
      deps({ run: herd.run, now: () => (t += 600) }));
    expect(out).toEqual([
      { handle: 'impl1', status: 'idle', settled: true },
      { handle: 'impl2', status: 'working', settled: false },
    ]);
  });

  test('an unknown handle reports undefined status rather than throwing', () => {
    const herd = fakeHerd({
      agents: [{ name: 'impl1', agent: 'codex', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle', cwd: '/a' }],
    });
    let t = 0;
    const out = f.waitAllCmd(['impl1,ghost', '--timeout', '1000'],
      deps({ run: herd.run, now: () => (t += 600) }));
    expect(out).toEqual([
      { handle: 'impl1', status: 'idle', settled: true },
      { handle: 'ghost', status: undefined, settled: false },
    ]);
  });
});
