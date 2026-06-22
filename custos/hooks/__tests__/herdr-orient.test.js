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
    expect(r.hookSpecificOutput.additionalContext).toMatch(/custos:herdr/);
    expect(r.hookSpecificOutput.additionalContext).toContain(HERD_JS);
  });
});

describe('buildOrientation', () => {
  test('mentions the skill and the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/custos:herdr/);
    expect(c).toContain('/abs/herd.js');
  });
});
