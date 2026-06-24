const s = require('../scripts/herd-setup.js');

describe('SAFE_ALLOW', () => {
  test('includes safe read/lifecycle verbs + read-only git', () => {
    expect(s.SAFE_ALLOW).toEqual(expect.arrayContaining([
      'Bash(herdr agent list)', 'Bash(herdr agent send:*)', 'Bash(herdr wait:*)',
      'Bash(herdr worktree remove:*)', 'Bash(git fetch:*)', 'Bash(git branch)', 'Bash(sleep:*)',
    ]));
  });
  test('NEVER includes arbitrary-exec or destructive rules', () => {
    for (const bad of ['Bash(herdr pane run:*)', 'Bash(herdr pane send-keys:*)',
      'Bash(git branch:*)', 'Bash(git reset:*)', 'Bash(git checkout:*)',
      'Bash(git push:*)', 'Bash(git worktree remove:*)']) {
      expect(s.SAFE_ALLOW).not.toContain(bad);
    }
  });
});

describe('bakedHerdRules', () => {
  test('one rule per verb, targeting the stable path, NO blanket rule', () => {
    const rules = s.bakedHerdRules('/Users/x');
    const base = '/Users/x/.claude/comitatus/skills/herdr/scripts/herd.js';
    expect(rules).toContain(`Bash(node ${base} send:*)`);
    expect(rules).toContain(`Bash(node ${base} wait:*)`);
    expect(rules).toContain(`Bash(node ${base} send-wait-read:*)`);
    expect(rules).not.toContain(`Bash(node ${base}:*)`); // no blanket
  });
});

describe('mergeAllow', () => {
  test('dedupes and preserves order, appends new', () => {
    expect(s.mergeAllow(['Bash(a)', 'Bash(b)'], ['Bash(b)', 'Bash(c)']))
      .toEqual(['Bash(a)', 'Bash(b)', 'Bash(c)']);
  });
});

describe('applySettings scope handling', () => {
  test('user scope adds the baked machine rules', () => {
    const { json } = s.applySettings({ raw: '', homedir: '/Users/x', scope: 'user' });
    expect(JSON.parse(json).permissions.allow).toContain(s.bakedHerdRules('/Users/x')[0]);
  });
  test('project scope omits the machine-specific baked rules', () => {
    const { json } = s.applySettings({ raw: '', homedir: '/Users/x', scope: 'project' });
    const allow = JSON.parse(json).permissions.allow;
    expect(allow).toContain('Bash(herdr agent list)');
    for (const r of s.bakedHerdRules('/Users/x')) expect(allow).not.toContain(r);
  });
  test('preserves unrelated settings + existing entries; idempotent', () => {
    const first = s.applySettings({ raw: '', homedir: '/Users/x', scope: 'user' }).json;
    const withExtra = JSON.parse(first);
    withExtra.model = 'opus';
    withExtra.permissions.allow.unshift('Bash(ls:*)');
    const second = s.applySettings({ raw: JSON.stringify(withExtra), homedir: '/Users/x', scope: 'user' });
    const parsed = JSON.parse(second.json);
    expect(parsed.model).toBe('opus');
    expect(parsed.permissions.allow[0]).toBe('Bash(ls:*)');
    expect(second.added).toEqual([]);
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
