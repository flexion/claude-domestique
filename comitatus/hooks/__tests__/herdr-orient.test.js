const path = require('path');
const hook = require('../herdr-orient.js');

const SKILL_DIR = path.resolve(__dirname, '../../skills/herdr');
const HERD_JS = path.join(SKILL_DIR, 'scripts', 'herd.js');

describe('processSessionStart gating', () => {
  test('silent when HERDR_ENV is unset', () => {
    const r = hook.processSessionStart({
      env: {}, skillDir: SKILL_DIR, herdJsPath: HERD_JS, codexHome: '/nonexistent',
    });
    expect(r).toBeNull();
  });

  test('silent when HERDR_ENV !== 1', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '0' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS, codexHome: '/nonexistent',
    });
    expect(r).toBeNull();
  });

  test('orients when HERDR_ENV=1', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS, codexHome: '/nonexistent',
    });
    expect(r).not.toBeNull();
    expect(r.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/comitatus:herdr/);
    expect(r.hookSpecificOutput.additionalContext).toContain(HERD_JS);
  });
});

describe('buildOrientation', () => {
  test('mentions the skill and the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/comitatus:herdr/);
    expect(c).toContain('/abs/herd.js');
  });

  test('emits a copy-pasteable H= assignment of the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toContain('H=/abs/herd.js');
  });

  test('emits a fail-fast guard for the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toContain(': "${H:?set H from the herdr orientation line before piping herdr JSON into node}"');
  });

  test('warns the path is version-pinned and must be re-read, not persisted', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/version-pinned/i);
    expect(c).toMatch(/do not persist|don't persist|re-read/i);
  });

  test('does not steer agents to the unset $CLAUDE_PLUGIN_ROOT', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).not.toContain('CLAUDE_PLUGIN_ROOT');
  });
});

const fs = require('fs');

function tmpdir() {
  const base = path.join(require('os').tmpdir(), 'comitatus-test-' + process.pid + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function makeFixtureSkill() {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, 'reference'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# herdr\n');
  fs.writeFileSync(path.join(dir, 'reference', 'cli.md'), 'cli\n');
  fs.writeFileSync(path.join(dir, 'scripts', 'herd.js'), '// helper\n');
  fs.mkdirSync(path.join(dir, '__tests__'), { recursive: true });
  fs.writeFileSync(path.join(dir, '__tests__', 'skip.js'), 'nope\n');
  return dir;
}

describe('provisionCodex', () => {
  test('skips when codex home is absent', () => {
    const skillDir = makeFixtureSkill();
    const r = hook.provisionCodex({ skillDir, codexHome: path.join(tmpdir(), 'no-codex') });
    expect(r).toEqual({ provisioned: false, reason: 'codex-absent' });
  });

  test('provisions when missing, then no-ops when current', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir(); // exists
    const first = hook.provisionCodex({ skillDir, codexHome });
    expect(first).toEqual({ provisioned: true, reason: 'missing' });

    const dest = path.join(codexHome, 'skills', 'herdr');
    expect(fs.existsSync(path.join(dest, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'scripts', 'herd.js'))).toBe(true);
    expect(fs.existsSync(path.join(dest, '.comitatus-hash'))).toBe(true);
    expect(fs.existsSync(path.join(dest, '__tests__'))).toBe(false); // excluded
    expect(fs.existsSync(path.join(codexHome, 'hooks.json'))).toBe(false); // never written

    const second = hook.provisionCodex({ skillDir, codexHome });
    expect(second).toEqual({ provisioned: false, reason: 'current' });
  });

  test('refreshes when source changed', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    hook.provisionCodex({ skillDir, codexHome });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# herdr v2\n');
    const r = hook.provisionCodex({ skillDir, codexHome });
    expect(r).toEqual({ provisioned: true, reason: 'stale' });
    expect(fs.readFileSync(path.join(codexHome, 'skills', 'herdr', 'SKILL.md'), 'utf8')).toBe('# herdr v2\n');
  });
});

describe('processSessionStart is failure-tolerant', () => {
  test('still orients when provisioning throws (bad skillDir)', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' },
      skillDir: '/definitely/not/here',
      herdJsPath: '/abs/herd.js',
      codexHome: tmpdir(),
    });
    expect(r).not.toBeNull();
    expect(r.hookSpecificOutput.additionalContext).toMatch(/comitatus:herdr/);
  });
});

function tmpResidue(codexHome) {
  return fs.readdirSync(path.join(codexHome, 'skills'))
    .filter((n) => n.startsWith('.herdr.tmp'));
}

describe('provisionCodex atomic swap hardening', () => {
  test('leaves no temp staging dir behind after provisioning', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    hook.provisionCodex({ skillDir, codexHome });
    expect(tmpResidue(codexHome)).toEqual([]);
    expect(fs.readdirSync(path.join(codexHome, 'skills'))).toContain('herdr');
  });

  test('refresh swaps the whole dir in - stale files do not survive', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    hook.provisionCodex({ skillDir, codexHome });

    const dest = path.join(codexHome, 'skills', 'herdr');
    // A file present in the provisioned copy but absent from the new source.
    fs.writeFileSync(path.join(dest, 'STALE.md'), 'old\n');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# herdr v2\n');

    const r = hook.provisionCodex({ skillDir, codexHome });
    expect(r).toEqual({ provisioned: true, reason: 'stale' });
    expect(fs.existsSync(path.join(dest, 'STALE.md'))).toBe(false);
    expect(fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8')).toBe('# herdr v2\n');
    expect(tmpResidue(codexHome)).toEqual([]);
  });

  test('accepts an in-place copy a concurrent writer already installed', () => {
    // Simulate the race tail: destSkills was created out-of-band with identical
    // content (matching hash) after we decided to provision. The swap must not
    // fail; the in-place copy is accepted and no temp residue is left.
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    const dest = path.join(codexHome, 'skills', 'herdr');
    hook.provisionCodex({ skillDir, codexHome });          // first writer
    const r = hook.provisionCodex({ skillDir, codexHome }); // identical content
    expect(r).toEqual({ provisioned: false, reason: 'current' });
    expect(fs.existsSync(path.join(dest, '.comitatus-hash'))).toBe(true);
    expect(tmpResidue(codexHome)).toEqual([]);
  });
});
