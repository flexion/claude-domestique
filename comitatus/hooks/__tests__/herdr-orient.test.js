const fs = require('fs');
const os = require('os');
const path = require('path');
const hook = require('../herdr-orient.js');

function tmpdir() {
  const base = path.join(os.tmpdir(), 'comitatus-test-' + process.pid + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(base, { recursive: true });
  return base;
}

describe('processSessionStart gating', () => {
  test('silent when HERDR_ENV is unset', () => {
    expect(hook.processSessionStart({ env: {}, codexHome: '/nonexistent' })).toBeNull();
  });

  test('silent when HERDR_ENV !== 1', () => {
    expect(hook.processSessionStart({ env: { HERDR_ENV: '0' }, codexHome: '/nonexistent' })).toBeNull();
  });

  test('orients when HERDR_ENV=1', () => {
    const r = hook.processSessionStart({ env: { HERDR_ENV: '1' }, codexHome: '/nonexistent' });
    expect(r).not.toBeNull();
    expect(r.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/comitatus:herdr/);
  });
});

describe('buildOrientation', () => {
  test('mentions the skill', () => {
    expect(hook.buildOrientation()).toMatch(/comitatus:herdr/);
  });

  test('steers to native herdr verbs by handle, including prompt', () => {
    const c = hook.buildOrientation();
    expect(c).toMatch(/native/i);
    expect(c).toMatch(/herdr agent prompt <handle>/);
    expect(c).toMatch(/herdr agent list \| get \| read \| wait/);
  });

  // 2.0.0 removed herd.js and up.js. An orientation that still named a helper
  // path or its verbs would send agents to a file that no longer ships.
  test('names no helper script, helper path, or helper verb list', () => {
    const c = hook.buildOrientation({ codexPlugin: true });
    expect(c).not.toMatch(/herd\.js|up\.js|node /);
    expect(c).not.toMatch(/status\|members\|send/);
    expect(c).not.toMatch(/\/herd-setup/);
    expect(c).toMatch(/no helper script/);
  });

  test('has no shell-variable, guard, pipe, or stdin ceremony', () => {
    const c = hook.buildOrientation();
    expect(c).not.toContain('H=');
    expect(c).not.toContain('${H:?');
    expect(c).not.toMatch(/stdin/i);
  });

  test('does not steer agents to the unset $CLAUDE_PLUGIN_ROOT', () => {
    expect(hook.buildOrientation()).not.toContain('CLAUDE_PLUGIN_ROOT');
  });

  test('never points codex agents at a copy under $HOME/.codex', () => {
    for (const codexPlugin of [true, false, undefined]) {
      expect(hook.buildOrientation({ codexPlugin })).not.toContain('.codex/skills');
    }
  });

  test('reports that codex peers can see the skill when the plugin is installed', () => {
    const c = hook.buildOrientation({ codexPlugin: true });
    expect(c).toMatch(/installed as a Codex plugin/);
    expect(c).not.toMatch(/codex plugin add/);
  });

  test('reports the gap and the install command when it is not installed', () => {
    const c = hook.buildOrientation({ codexPlugin: false });
    expect(c).toMatch(/NOT installed as a Codex plugin/);
    expect(c).toContain('codex plugin add comitatus@claude-domestique');
  });

  test('says status is unknown when detection could not run', () => {
    expect(hook.buildOrientation({})).toMatch(/unknown/i);
  });
});

describe('codexPluginInstalled (report only, never copies)', () => {
  test('false when the codex home does not exist', () => {
    expect(hook.codexPluginInstalled({ codexHome: path.join(tmpdir(), 'no-codex') })).toBe(false);
  });

  test('false when the codex home has no plugin cache', () => {
    expect(hook.codexPluginInstalled({ codexHome: tmpdir() })).toBe(false);
  });

  test('true when a comitatus plugin is present in any marketplace', () => {
    const codexHome = tmpdir();
    fs.mkdirSync(path.join(codexHome, 'plugins', 'cache', 'claude-domestique', 'comitatus', '0.6.0'), { recursive: true });
    expect(hook.codexPluginInstalled({ codexHome })).toBe(true);
  });

  test('false when the cache holds only other plugins', () => {
    const codexHome = tmpdir();
    fs.mkdirSync(path.join(codexHome, 'plugins', 'cache', 'claude-domestique', 'agent-artifex', '0.2.1'), { recursive: true });
    expect(hook.codexPluginInstalled({ codexHome })).toBe(false);
  });

  test('never writes anything into the codex home', () => {
    const codexHome = tmpdir();
    hook.codexPluginInstalled({ codexHome });
    expect(fs.readdirSync(codexHome)).toEqual([]);
  });
});

describe('resolveCodexHome', () => {
  test('honours CODEX_HOME, else defaults to ~/.codex', () => {
    expect(hook.resolveCodexHome({ CODEX_HOME: '/custom/codex' }, '/home/u'))
      .toBe(path.resolve('/custom/codex'));
    expect(hook.resolveCodexHome({}, '/home/u')).toBe(path.join('/home/u', '.codex'));
  });
});

describe('processSessionStart writes nothing', () => {
  test('leaves an existing codex home untouched and reports "not installed"', () => {
    const codexHome = tmpdir();
    const r = hook.processSessionStart({ env: { HERDR_ENV: '1' }, codexHome });
    expect(fs.readdirSync(codexHome)).toEqual([]);
    expect(r.systemMessage).toContain('(codex: not installed)');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/NOT installed as a Codex plugin/);
  });

  test('reports "installed" without writing when the plugin is present', () => {
    const codexHome = tmpdir();
    fs.mkdirSync(path.join(codexHome, 'plugins', 'cache', 'claude-domestique', 'comitatus', '0.6.0'), { recursive: true });
    const r = hook.processSessionStart({ env: { HERDR_ENV: '1' }, codexHome });
    expect(fs.existsSync(path.join(codexHome, 'skills'))).toBe(false);
    expect(r.systemMessage).toContain('(codex: installed)');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/installed as a Codex plugin/);
  });

  // 2.0.0 stopped provisioning ~/.claude/comitatus. The module must not expose
  // or call any provisioning path, so an existing copy is left for the user.
  test('exposes no provisioning or stable-path functions', () => {
    for (const gone of ['provisionInto', 'provisionStable', 'stableHome', 'stableHerdJs', 'isCodexInstall', 'HERD_JS']) {
      expect(hook[gone]).toBeUndefined();
    }
  });

  test('the hook source references no fs write or remove call', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'herdr-orient.js'), 'utf8');
    expect(src).not.toMatch(/writeFile|mkdir|rmSync|renameSync|cpSync/);
  });
});
