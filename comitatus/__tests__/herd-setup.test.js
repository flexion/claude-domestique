const s = require('../scripts/herd-setup.js');

describe('SAFE_ALLOW', () => {
  test('includes the native read, messaging and lifecycle verbs + read-only git', () => {
    expect(s.SAFE_ALLOW).toEqual(expect.arrayContaining([
      'Bash(herdr agent list)', 'Bash(herdr agent prompt:*)', 'Bash(herdr pane wait-output:*)',
      'Bash(herdr agent get:*)', 'Bash(herdr agent read:*)', 'Bash(herdr agent wait:*)',
      'Bash(herdr agent explain:*)', 'Bash(herdr tab list:*)', 'Bash(herdr pane list:*)',
      'Bash(herdr tab create:*)', 'Bash(herdr worktree create:*)', 'Bash(herdr worktree remove:*)',
      'Bash(git fetch:*)', 'Bash(git remote)', 'Bash(git branch)',
    ]));
  });

  test('NEVER includes arbitrary-exec, launch, destructive, or removed rules', () => {
    for (const bad of ['Bash(herdr pane run:*)', 'Bash(herdr pane send-keys:*)',
      'Bash(herdr agent send-keys:*)', 'Bash(herdr agent start:*)', 'Bash(sleep:*)',
      'Bash(herdr agent send:*)', 'Bash(herdr wait:*)', // removed in herdr 0.7.5
      'Bash(git branch:*)', 'Bash(git reset:*)', 'Bash(git checkout:*)',
      'Bash(git push:*)', 'Bash(git worktree remove:*)', 'Bash(git merge:*)']) {
      expect(s.SAFE_ALLOW).not.toContain(bad);
    }
  });

  // 2.0.0 removed herd.js. A leftover helper rule would allow a file that no
  // longer ships, and a `node` rule of any kind is an interpreter grant.
  test('contains only native herdr and git rules - no node, helper, or interpreter rule', () => {
    for (const rule of s.SAFE_ALLOW) {
      expect(rule).toMatch(/^Bash\((herdr|git) /);
      expect(rule).not.toMatch(/node|herd\.js|up\.js|python|bash -c|sh -c/);
    }
  });

  test('has no duplicates', () => {
    expect(new Set(s.SAFE_ALLOW).size).toBe(s.SAFE_ALLOW.length);
  });
});

describe('mergeAllow', () => {
  test('dedupes and preserves order, appends new', () => {
    expect(s.mergeAllow(['Bash(a)', 'Bash(b)'], ['Bash(b)', 'Bash(c)']))
      .toEqual(['Bash(a)', 'Bash(b)', 'Bash(c)']);
  });
});

describe('applySettings', () => {
  test('adds every safe rule to an empty file', () => {
    const { json, added } = s.applySettings({ raw: '' });
    expect(JSON.parse(json).permissions.allow).toEqual([...s.SAFE_ALLOW]);
    expect(added).toEqual([...s.SAFE_ALLOW]);
  });

  test('preserves unrelated settings + existing entries; idempotent', () => {
    const first = s.applySettings({ raw: '' }).json;
    const withExtra = JSON.parse(first);
    withExtra.model = 'opus';
    withExtra.permissions.allow.unshift('Bash(ls:*)');
    const second = s.applySettings({ raw: JSON.stringify(withExtra) });
    const parsed = JSON.parse(second.json);
    expect(parsed.model).toBe('opus');
    expect(parsed.permissions.allow[0]).toBe('Bash(ls:*)');
    expect(second.added).toEqual([]);
  });

  // Rules an older herd-setup added for the retired helper are the user's
  // settings now; this script never removes anything it finds.
  test('leaves existing helper rules in place rather than deleting them', () => {
    const old = 'Bash(node /Users/x/.claude/comitatus/skills/herdr/scripts/herd.js send:*)';
    const { json } = s.applySettings({ raw: JSON.stringify({ permissions: { allow: [old] } }) });
    expect(JSON.parse(json).permissions.allow).toContain(old);
  });
});

describe('findConflicts', () => {
  test('flags an addition that is also denied or asked', () => {
    const json = { permissions: { deny: ['Bash(herdr agent list)'], ask: ['Bash(git fetch:*)'] } };
    const c = s.findConflicts(json, ['Bash(herdr agent list)', 'Bash(git fetch:*)', 'Bash(sleep:*)']);
    expect(c).toEqual([
      { rule: 'Bash(herdr agent list)', in: 'deny' },
      { rule: 'Bash(git fetch:*)', in: 'ask' },
    ]);
  });
});
