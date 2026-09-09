const b = require('../skills/herdr/scripts/fanin.js');

// Partition `fanin` of run fanout-comitatus. These are the contract; the module
// ships as a stub whose placeholder returns make every assertion below print the
// value it got.

const WRITING_GIT = ['merge', 'branch', 'checkout', 'reset', 'push', 'commit', 'rebase', 'switch'];

function isWrite(call) {
  if (call[0] !== 'git') return false;
  const verb = call[1];
  if (verb === 'branch') return call.includes('-D') || call.includes('-d') || call.includes('--delete');
  return WRITING_GIT.includes(verb);
}

// Responses are matched on the joined argv, so a test declares exactly the git
// surface it expects and anything else comes back empty.
function gitHerd(responses = {}, { onCall } = {}) {
  const calls = [];
  const run = (file, args) => {
    calls.push([file, ...args]);
    const key = [file, ...args].join(' ');
    if (onCall) {
      const hit = onCall(file, args);
      if (hit !== undefined) return hit;
    }
    for (const [pattern, resp] of Object.entries(responses)) {
      if (key === pattern) {
        if (resp instanceof Error) throw resp;
        return typeof resp === 'function' ? resp() : resp;
      }
    }
    return '';
  };
  return { run, calls };
}

function deps(over = {}) {
  return { env: {}, sleep: () => {}, now: () => 0, cwd: '/wt/task-r7', ...over };
}

const AGENTS = (status = 'idle') => JSON.stringify({
  result: {
    agents: [
      { name: 'arch', agent: 'claude', pane_id: 'wA:p1', workspace_id: 'wA', agent_status: status, cwd: '/wt/task-r7' },
    ],
  },
});

// ---------------------------------------------------------------------------
// criterion 10, 11: stateCmd + derivePhase
// ---------------------------------------------------------------------------

describe('derivePhase', () => {
  // The runbook's "What git holds" table, in order. Each row is a fact git
  // already answers; the phase is the highest one satisfied.
  test.each([
    [{ started: false }, 'absent'],
    [{ started: true, manifest: false }, 'started'],
    [{ started: true, manifest: true, partitions: [] }, 'partitioned'],
    [{ started: true, manifest: true, partitions: [{ name: 'auth', merged: false }] }, 'fanned-out'],
    [{
      started: true, manifest: true,
      partitions: [{ name: 'auth', merged: true }, { name: 'ui', merged: false }],
    }, 'fanned-out'],
    [{
      started: true, manifest: true,
      partitions: [{ name: 'auth', merged: true }, { name: 'ui', merged: true }],
    }, 'fanned-in'],
    [{ started: true, manifest: true, partitions: [], logRow: true }, 'finished'],
  ])('%j -> %s', (facts, phase) => {
    expect(b.derivePhase(facts)).toBe(phase);
  });

  test('PHASES is the ordered vocabulary derivePhase draws from', () => {
    expect(b.PHASES).toEqual(
      ['absent', 'started', 'partitioned', 'fanned-out', 'fanned-in', 'finished']);
  });
});

describe('stateCmd', () => {
  test('--run is required', () => {
    expect(() => b.stateCmd([], deps({ run: gitHerd().run }))).toThrow(/--run/);
  });

  test('an unstarted run reports absent without inspecting anything else', () => {
    const herd = gitHerd({
      'git rev-parse --verify --quiet task/r7': new Error('not a ref'),
    });
    expect(b.stateCmd(['--run', 'r7'], deps({ run: herd.run })))
      .toEqual({ run: 'r7', started: false, manifest: false, partitions: [], logRow: false, phase: 'absent' });
  });

  test('derives the whole table off refs: manifest, per-partition blocked/probe/merged, log row', () => {
    const herd = gitHerd({
      'git rev-parse --verify --quiet task/r7': 'abc123\n',
      'git ls-tree -r --name-only task/r7 -- .pipeline/runs/r7':
        '.pipeline/runs/r7/manifest.md\n.pipeline/runs/r7/task.md\n',
      'git branch --list task/r7-* --format=%(refname:short)': 'task/r7-auth\ntask/r7-ui\n',
      'git branch --merged task/r7 --list task/r7-* --format=%(refname:short)': 'task/r7-auth\n',
      'git ls-tree -r --name-only task/r7-auth -- .pipeline/runs/r7':
        '.pipeline/runs/r7/manifest.md\n',
      'git ls-tree -r --name-only task/r7-ui -- .pipeline/runs/r7':
        '.pipeline/runs/r7/manifest.md\n.pipeline/runs/r7/BLOCKED-ui.md\n',
      'git show task/r7:.pipeline/log.md': '| id | type |\n| r0 | feature |\n',
    });
    expect(b.stateCmd(['--run', 'r7'], deps({ run: herd.run }))).toEqual({
      run: 'r7',
      started: true,
      manifest: true,
      partitions: [
        { name: 'auth', branch: 'task/r7-auth', merged: true, blocked: false, probe: false },
        { name: 'ui', branch: 'task/r7-ui', merged: false, blocked: true, probe: false },
      ],
      logRow: false,
      phase: 'fanned-out',
    });
  });

  test('a committed probe-<n>.md on a hypothesis branch is reported as probe', () => {
    const herd = gitHerd({
      'git rev-parse --verify --quiet task/r7': 'abc123\n',
      'git ls-tree -r --name-only task/r7 -- .pipeline/runs/r7': '.pipeline/runs/r7/manifest.md\n',
      'git branch --list task/r7-* --format=%(refname:short)': 'task/r7-h1\n',
      'git branch --merged task/r7 --list task/r7-* --format=%(refname:short)': '',
      'git ls-tree -r --name-only task/r7-h1 -- .pipeline/runs/r7': '.pipeline/runs/r7/probe-1.md\n',
      'git show task/r7:.pipeline/log.md': '',
    });
    const out = b.stateCmd(['--run', 'r7'], deps({ run: herd.run }));
    expect(out.partitions).toEqual([
      { name: 'h1', branch: 'task/r7-h1', merged: false, blocked: false, probe: true },
    ]);
  });

  test('a log.md row for this run reports finished', () => {
    const herd = gitHerd({
      'git rev-parse --verify --quiet task/r7': 'abc123\n',
      'git ls-tree -r --name-only task/r7 -- .pipeline/runs/r7': '.pipeline/runs/r7/manifest.md\n',
      'git branch --list task/r7-* --format=%(refname:short)': '',
      'git branch --merged task/r7 --list task/r7-* --format=%(refname:short)': '',
      'git show task/r7:.pipeline/log.md': '| id | type |\n| r7 | feature | 2 |\n',
    });
    const out = b.stateCmd(['--run', 'r7'], deps({ run: herd.run }));
    expect(out.logRow).toBe(true);
    expect(out.phase).toBe('finished');
  });

  // A verb the operator runs to find out where they are cannot be a verb that
  // moves them. Paired with the read assertion so a no-op stub cannot pass it.
  test('reads refs and issues no writing git command', () => {
    const herd = gitHerd({
      'git rev-parse --verify --quiet task/r7': 'abc123\n',
      'git ls-tree -r --name-only task/r7 -- .pipeline/runs/r7': '.pipeline/runs/r7/manifest.md\n',
      'git branch --list task/r7-* --format=%(refname:short)': '',
      'git branch --merged task/r7 --list task/r7-* --format=%(refname:short)': '',
      'git show task/r7:.pipeline/log.md': '',
    });
    b.stateCmd(['--run', 'r7'], deps({ run: herd.run }));
    expect(herd.calls).toContainEqual(['git', 'rev-parse', '--verify', '--quiet', 'task/r7']);
    expect(herd.calls.filter(isWrite)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// criterion 12, 13, 14: faninCmd
// ---------------------------------------------------------------------------

describe('parseFanin', () => {
  test('defaults: settle arch, 300000ms, live run', () => {
    expect(b.parseFanin(['--run', 'r7', '--partitions', 'auth,ui'])).toEqual({
      run: 'r7',
      partitions: ['auth', 'ui'],
      waitHandle: 'arch',
      timeout: 300000,
      dryRun: false,
    });
  });

  test('--run and --partitions are required', () => {
    expect(() => b.parseFanin(['--partitions', 'a'])).toThrow(/--run/);
    expect(() => b.parseFanin(['--run', 'r7'])).toThrow(/--partitions/);
  });

  test('--timeout rejects non-finite and negative values', () => {
    for (const timeout of ['wat', 'Infinity', '-1']) {
      expect(() => b.parseFanin(
        ['--run', 'r7', '--partitions', 'auth', '--timeout', timeout]))
        .toThrow(/--timeout.*non-negative/);
    }
  });
});

describe('faninCmd', () => {
  const onTaskBranch = { 'git rev-parse --abbrev-ref HEAD': 'task/r7\n' };

  // `arch` owns the task branch. Merging from a partition worktree is the
  // runbook's prohibition, and the branch name is the only check available.
  test('refuses when HEAD is not the task branch, naming what it found', () => {
    const herd = gitHerd({ 'git rev-parse --abbrev-ref HEAD': 'task/r7-auth\n' });
    expect(() => b.faninCmd(['--run', 'r7', '--partitions', 'auth'], deps({ run: herd.run })))
      .toThrow(/task\/r7-auth/);
    expect(herd.calls.filter(isWrite)).toEqual([]);
  });

  // Merging under a running agent rewrites the tree it is living in - the same
  // hazard as diffing under one.
  test('settles the architect before the first merge', () => {
    const herd = gitHerd({
      ...onTaskBranch,
      'herdr agent list': AGENTS('idle'),
      'git merge --no-edit task/r7-auth': 'Fast-forward\n',
    });
    b.faninCmd(['--run', 'r7', '--partitions', 'auth'], deps({ run: herd.run }));
    const listAt = herd.calls.findIndex((c) => c[1] === 'agent' && c[2] === 'list');
    const mergeAt = herd.calls.findIndex((c) => c[1] === 'merge');
    expect(listAt).toBeGreaterThanOrEqual(0);
    expect(mergeAt).toBeGreaterThan(listAt);
  });

  test('refuses to merge at all when the architect never settles', () => {
    let t = 0;
    const herd = gitHerd({
      ...onTaskBranch,
      'herdr agent list': AGENTS('working'),
    });
    expect(() => b.faninCmd(['--run', 'r7', '--partitions', 'auth', '--timeout', '1000'],
      deps({ run: herd.run, now: () => (t += 600) }))).toThrow(/arch/);
    expect(herd.calls.filter((c) => c[1] === 'merge')).toEqual([]);
  });

  test('merges in the order given - manifest order, not alphabetical', () => {
    const herd = gitHerd({
      ...onTaskBranch,
      'herdr agent list': AGENTS('idle'),
      'git merge --no-edit task/r7-ui': 'Merge made\n',
      'git merge --no-edit task/r7-auth': 'Merge made\n',
    });
    const out = b.faninCmd(['--run', 'r7', '--partitions', 'ui,auth'], deps({ run: herd.run }));
    expect(out).toEqual({
      run: 'r7',
      merged: ['task/r7-ui', 'task/r7-auth'],
      conflict: undefined,
    });
    expect(herd.calls.filter((c) => c[1] === 'merge').map((c) => c[3]))
      .toEqual(['task/r7-ui', 'task/r7-auth']);
  });

  // Merging past a conflict buries which partition caused it, and the conflict
  // is left in the tree because resolving it is the implementer's turn.
  test('stops at the first conflict, names the partition and the U paths', () => {
    const herd = gitHerd({
      ...onTaskBranch,
      'herdr agent list': AGENTS('idle'),
      'git merge --no-edit task/r7-auth': 'Merge made\n',
      'git merge --no-edit task/r7-ui': (() => {
        const e = new Error('Command failed');
        e.status = 1;
        e.stdout = 'CONFLICT (content): Merge conflict in comitatus/skills/herdr/scripts/herd.js\n';
        return e;
      })(),
      'git diff --name-only --diff-filter=U': 'comitatus/skills/herdr/scripts/herd.js\n',
    });
    const out = b.faninCmd(['--run', 'r7', '--partitions', 'auth,ui,extra'], deps({ run: herd.run }));
    expect(out.merged).toEqual(['task/r7-auth']);
    expect(out.conflict).toEqual({
      partition: 'ui',
      branch: 'task/r7-ui',
      files: ['comitatus/skills/herdr/scripts/herd.js'],
    });
    expect(herd.calls.filter((c) => c[1] === 'merge').map((c) => c[3]))
      .toEqual(['task/r7-auth', 'task/r7-ui']);
    expect(herd.calls.filter((c) => c[1] === 'merge' && c[2] === '--abort')).toEqual([]);
  });

  test('--dry-run reports the planned order and merges nothing', () => {
    const herd = gitHerd({ ...onTaskBranch, 'herdr agent list': AGENTS('idle') });
    const out = b.faninCmd(['--run', 'r7', '--partitions', 'auth,ui', '--dry-run'],
      deps({ run: herd.run }));
    expect(out).toEqual({
      run: 'r7',
      plan: ['task/r7-auth', 'task/r7-ui'],
      dryRun: true,
    });
    expect(herd.calls.filter(isWrite)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// criterion 15, 16, 17: teardownCmd
// ---------------------------------------------------------------------------

describe('parseTeardown', () => {
  test('destruction is opt-in: yes defaults to false', () => {
    expect(b.parseTeardown(['--run', 'r7', '--partitions', 'auth,ui'])).toEqual({
      run: 'r7',
      partitions: ['auth', 'ui'],
      yes: false,
    });
    expect(b.parseTeardown(['--run', 'r7', '--partitions', 'auth', '--yes']).yes).toBe(true);
  });

  test('--run and --partitions are required', () => {
    expect(() => b.parseTeardown(['--partitions', 'a'])).toThrow(/--run/);
    expect(() => b.parseTeardown(['--run', 'r7'])).toThrow(/--partitions/);
  });
});

describe('teardownCmd', () => {
  const WORKTREES = JSON.stringify({
    result: {
      worktrees: [
        { branch: 'task/r7-auth', path: '/wt/task-r7-auth', open_workspace_id: 'wAuth' },
        { branch: 'task/r7-ui', path: '/wt/task-r7-ui', open_workspace_id: 'wUi' },
      ],
    },
  });
  const clean = {
    'herdr worktree list --json': WORKTREES,
    'git branch --merged task/r7 --list task/r7-* --format=%(refname:short)': 'task/r7-auth\ntask/r7-ui\n',
    'git -C /wt/task-r7-auth status --porcelain -- .pipeline': '',
    'git -C /wt/task-r7-ui status --porcelain -- .pipeline': '',
    'git ls-tree -r --name-only task/r7-auth -- .pipeline/runs/r7': '.pipeline/runs/r7/manifest.md\n',
    'git ls-tree -r --name-only task/r7-ui -- .pipeline/runs/r7': '.pipeline/runs/r7/manifest.md\n',
  };

  test('without --yes it destroys nothing and returns the plan', () => {
    const herd = gitHerd(clean);
    const out = b.teardownCmd(['--run', 'r7', '--partitions', 'auth,ui'], deps({ run: herd.run }));
    expect(out).toEqual([
      { partition: 'auth', branch: 'task/r7-auth', workspace: 'wAuth', action: 'planned', reason: undefined },
      { partition: 'ui', branch: 'task/r7-ui', workspace: 'wUi', action: 'planned', reason: undefined },
    ]);
    expect(herd.calls.filter(isWrite)).toEqual([]);
    expect(herd.calls.filter((c) => c[1] === 'worktree' && c[2] === 'remove')).toEqual([]);
  });

  // `worktree remove` does not delete the branch, and a branch still checked
  // out cannot be deleted - so remove first, then delete.
  test('--yes removes the worktree then deletes the branch, in that order', () => {
    const herd = gitHerd({
      ...clean,
      'herdr worktree remove --workspace wAuth --force --json': JSON.stringify({ result: { type: 'ok' } }),
    });
    const out = b.teardownCmd(['--run', 'r7', '--partitions', 'auth', '--yes'],
      deps({ run: herd.run }));
    expect(out).toEqual([
      { partition: 'auth', branch: 'task/r7-auth', workspace: 'wAuth', action: 'removed', reason: undefined },
    ]);
    const removeAt = herd.calls.findIndex((c) => c[1] === 'worktree' && c[2] === 'remove');
    const deleteAt = herd.calls.findIndex((c) => c[1] === 'branch' && c.includes('-D'));
    expect(herd.calls[removeAt]).toEqual(
      ['herdr', 'worktree', 'remove', '--workspace', 'wAuth', '--force', '--json']);
    expect(herd.calls[deleteAt]).toEqual(['git', 'branch', '-D', 'task/r7-auth']);
    expect(deleteAt).toBeGreaterThan(removeAt);
  });

  // `--force` discards uncommitted files without warning, and BLOCKED-*.md is
  // the trial's evidence base.
  test('skips a partition with an UNCOMMITTED BLOCKED file, giving the reason', () => {
    const herd = gitHerd({
      ...clean,
      'git -C /wt/task-r7-ui status --porcelain -- .pipeline':
        '?? .pipeline/runs/r7/BLOCKED-ui.md\n',
    });
    const out = b.teardownCmd(['--run', 'r7', '--partitions', 'auth,ui', '--yes'],
      deps({ run: herd.run }));
    expect(out[1]).toEqual({
      partition: 'ui',
      branch: 'task/r7-ui',
      workspace: 'wUi',
      action: 'skipped',
      reason: 'uncommitted BLOCKED-ui.md',
    });
    expect(herd.calls.filter((c) => c[1] === 'branch' && c.includes('-D')).map((c) => c[3]))
      .toEqual(['task/r7-auth']);
  });

  // Committed is not safe either: `git branch -D` discards the commit, and a
  // BLOCKED file committed on a branch about to be deleted is still lost.
  test('skips a partition whose BLOCKED file is committed but not merged into the task branch', () => {
    const herd = gitHerd({
      ...clean,
      'git branch --merged task/r7 --list task/r7-* --format=%(refname:short)': 'task/r7-auth\n',
      'git ls-tree -r --name-only task/r7-ui -- .pipeline/runs/r7':
        '.pipeline/runs/r7/manifest.md\n.pipeline/runs/r7/BLOCKED-ui.md\n',
    });
    const out = b.teardownCmd(['--run', 'r7', '--partitions', 'auth,ui', '--yes'],
      deps({ run: herd.run }));
    expect(out[1]).toEqual({
      partition: 'ui',
      branch: 'task/r7-ui',
      workspace: 'wUi',
      action: 'skipped',
      reason: 'unmerged BLOCKED-ui.md',
    });
    expect(herd.calls.filter((c) => c[1] === 'worktree' && c[2] === 'remove').map((c) => c[4]))
      .toEqual(['wAuth']);
  });

  test('a partition with no live worktree is reported, not silently dropped', () => {
    const herd = gitHerd({
      ...clean,
      'herdr worktree list --json': JSON.stringify({
        result: {
          worktrees: [{ branch: 'task/r7-auth', path: '/wt/task-r7-auth', open_workspace_id: 'wAuth' }],
        },
      }),
    });
    const out = b.teardownCmd(['--run', 'r7', '--partitions', 'auth,ui'], deps({ run: herd.run }));
    expect(out[1]).toEqual({
      partition: 'ui',
      branch: 'task/r7-ui',
      workspace: undefined,
      action: 'skipped',
      reason: 'no live worktree',
    });
  });
});
