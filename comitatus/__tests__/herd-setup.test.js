const s = require('../scripts/herd-setup.js');

describe('SAFE_ALLOW', () => {
  test('includes safe read/lifecycle verbs + read-only git', () => {
    expect(s.SAFE_ALLOW).toEqual(expect.arrayContaining([
      'Bash(herdr agent list)', 'Bash(herdr agent prompt:*)', 'Bash(herdr pane wait-output:*)',
      'Bash(herdr agent get:*)', 'Bash(herdr agent read:*)', 'Bash(herdr agent wait:*)',
      'Bash(herdr worktree remove:*)', 'Bash(git fetch:*)', 'Bash(git branch)',
    ]));
  });
  test('NEVER includes arbitrary-exec, destructive, or removed 0.7.5 rules', () => {
    for (const bad of ['Bash(herdr pane run:*)', 'Bash(herdr pane send-keys:*)',
      'Bash(herdr agent start:*)', 'Bash(sleep:*)',
      'Bash(herdr agent send:*)', 'Bash(herdr wait:*)', // removed in herdr 0.7.5
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
    expect(rules).toContain(`Bash(node ${base} up:*)`); // the quickstart verb
    expect(rules).not.toContain(`Bash(node ${base}:*)`); // no blanket
    expect(rules).not.toContain(`Bash(node ${base} pane:*)`); // verb removed with stdin piping
    expect(rules).not.toContain(`Bash(node ${base} submit-keys:*)`); // internal to send now
  });

  test('the herd-lifecycle verbs are allowed too', () => {
    const rules = s.bakedHerdRules('/Users/x');
    const base = '/Users/x/.claude/comitatus/skills/herdr/scripts/herd.js';
    for (const verb of ['seed', 'broadcast', 'sync', 'withdraw']) {
      expect(rules).toContain(`Bash(node ${base} ${verb}:*)`);
    }
  });

  // An agent that hits a permission prompt mid-protocol stalls the herd, and a
  // stalled lead strands everyone downstream. A verb the helper dispatches but
  // /herd-setup never allows is exactly that trap, so the two lists must agree.
  test('every dispatchable verb has an allow rule', () => {
    const herd = require('../skills/herdr/scripts/herd.js');
    const dispatchable = herd.usage()
      .split('\n')
      .map((line) => /^ {2}(\S+)/.exec(line))
      .filter(Boolean)
      .map((m) => m[1]);
    expect(dispatchable.length).toBeGreaterThan(0);
    expect([...s.HELPER_VERBS].sort()).toEqual(dispatchable.sort());
  });

  // The skill's verb line is what an agent reads to learn the surface exists.
  // A verb missing there is invisible in practice however well it is allowed.
  test('SKILL.md advertises exactly the verbs the helper dispatches', () => {
    const fs = require('fs');
    const path = require('path');
    const skill = fs.readFileSync(
      path.join(__dirname, '..', 'skills', 'herdr', 'SKILL.md'), 'utf8');
    const line = skill.split('\n').find((l) => l.startsWith('helper verbs:'));
    expect(line).toBeDefined();
    const advertised = /`([^`]+)`/.exec(line)[1].split('|').map((v) => v.trim());
    expect(advertised.sort()).toEqual([...s.HELPER_VERBS].sort());
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
