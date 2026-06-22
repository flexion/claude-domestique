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
