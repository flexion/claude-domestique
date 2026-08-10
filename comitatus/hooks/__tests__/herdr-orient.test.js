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

  test('direct Codex install uses the bundled helper without home provisioning', () => {
    const codexHome = tmpdir();
    const stableHomeDir = path.join(tmpdir(), 'stable');
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS,
      codexHome, stableHome: stableHomeDir, directCodex: true,
    });
    expect(r.hookSpecificOutput.additionalContext).toContain(HERD_JS);
    expect(fs.existsSync(path.join(codexHome, 'skills', 'herdr'))).toBe(false);
    expect(fs.existsSync(stableHomeDir)).toBe(false);
  });
});

describe('buildOrientation', () => {
  test('mentions the skill and the helper path', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/comitatus:herdr/);
    expect(c).toContain('/abs/herd.js');
  });

  test('steers to native herdr verbs by handle first', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/native/i);
    expect(c).toMatch(/herdr agent/);
  });

  test('has no shell-variable, guard, pipe, or stdin ceremony', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).not.toContain('H=');
    expect(c).not.toContain('${H:?');
    expect(c).not.toMatch(/pipe|stdin/i);
  });

  test('frames the path as stable + allowlistable, not version-pinned', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).toMatch(/stable/i);
    expect(c).toMatch(/allowlist|permission/i);
    expect(c).not.toMatch(/version-pinned/i);
  });

  test('shows a literal absolute-path invocation', () => {
    expect(hook.buildOrientation('/abs/herd.js')).toMatch(/node \/abs\/herd\.js/);
  });

  test('lists the composite verbs', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    for (const v of ['status', 'members', 'wait', 'send', 'send-wait-read', 'agent', 'up']) {
      expect(c).toContain(v);
    }
  });

  test('does not steer agents to the unset $CLAUDE_PLUGIN_ROOT', () => {
    const c = hook.buildOrientation('/abs/herd.js');
    expect(c).not.toContain('CLAUDE_PLUGIN_ROOT');
  });

  test('never points codex agents at a provisioned copy under $HOME/.codex', () => {
    for (const codexPlugin of [true, false, undefined]) {
      const c = hook.buildOrientation('/abs/herd.js', { codexPlugin });
      expect(c).not.toContain('.codex/skills');
    }
  });

  test('reports that codex peers can see the skill when the plugin is installed', () => {
    const c = hook.buildOrientation('/abs/herd.js', { codexPlugin: true });
    expect(c).toMatch(/installed as a Codex plugin/);
    expect(c).not.toMatch(/codex plugin add/);
  });

  test('reports the gap and the install command when it is not installed', () => {
    const c = hook.buildOrientation('/abs/herd.js', { codexPlugin: false });
    expect(c).toMatch(/NOT installed as a Codex plugin/);
    expect(c).toContain('codex plugin add comitatus@claude-domestique');
  });

  test('says status is unknown when detection could not run', () => {
    expect(hook.buildOrientation('/abs/herd.js', {})).toMatch(/unknown/i);
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

describe('Codex-install detection', () => {
  // Regression: directCodex was previously derived from process.env.PLUGIN_ROOT,
  // a variable neither host sets, so the guard never fired and a Codex-installed
  // comitatus still copied itself into $CODEX_HOME/skills. Detection is now
  // path-based, and these tests exercise the real derivation rather than passing
  // directCodex in directly.
  test('isCodexInstall is true only for a plugin running from the Codex cache', () => {
    const codexHome = tmpdir();
    const inCache = path.join(codexHome, 'plugins', 'cache', 'claude-domestique', 'comitatus', '0.6.0');
    expect(hook.isCodexInstall({ pluginRoot: inCache, codexHome })).toBe(true);
  });

  test('isCodexInstall is false for a Claude-cache install', () => {
    const codexHome = tmpdir();
    const claudeCache = path.join(tmpdir(), '.claude', 'plugins', 'cache', 'claude-domestique', 'comitatus', '0.6.0');
    expect(hook.isCodexInstall({ pluginRoot: claudeCache, codexHome })).toBe(false);
  });

  test('isCodexInstall is false for a path that merely shares a prefix', () => {
    const codexHome = tmpdir();
    const sibling = path.join(codexHome, 'plugins', 'cache-other', 'comitatus');
    expect(hook.isCodexInstall({ pluginRoot: sibling, codexHome })).toBe(false);
  });

  test('resolveCodexHome honours CODEX_HOME, else defaults to ~/.codex', () => {
    expect(hook.resolveCodexHome({ CODEX_HOME: '/custom/codex' }, '/home/u'))
      .toBe(path.resolve('/custom/codex'));
    expect(hook.resolveCodexHome({}, '/home/u')).toBe(path.join('/home/u', '.codex'));
  });

  test('the real derivation disables provisioning for a Codex-cache install', () => {
    const codexHome = tmpdir();
    const skillDir = makeFixtureSkill();
    const pluginRoot = path.join(codexHome, 'plugins', 'cache', 'claude-domestique', 'comitatus', '0.6.0');
    const stableHomeDir = path.join(tmpdir(), 'stable');

    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' },
      skillDir,
      herdJsPath: '/abs/herd.js',
      codexHome,
      stableHome: stableHomeDir,
      directCodex: hook.isCodexInstall({ pluginRoot, codexHome }),
    });

    expect(r).not.toBeNull();
    expect(fs.existsSync(path.join(codexHome, 'skills', 'herdr'))).toBe(false);
    expect(fs.existsSync(stableHomeDir)).toBe(false);
  });
});

describe('processSessionStart never writes into the codex home', () => {
  test('leaves an existing codex home untouched and reports "not installed"', () => {
    const codexHome = tmpdir();
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' },
      skillDir: makeFixtureSkill(),
      herdJsPath: '/abs/herd.js',
      codexHome,
      stableHome: path.join(tmpdir(), 'stable'),
    });
    expect(fs.readdirSync(codexHome)).toEqual([]);
    expect(r.systemMessage).toContain('(codex: not installed)');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/NOT installed as a Codex plugin/);
  });

  test('reports "installed" without writing when the plugin is present', () => {
    const codexHome = tmpdir();
    fs.mkdirSync(path.join(codexHome, 'plugins', 'cache', 'claude-domestique', 'comitatus', '0.6.0'), { recursive: true });
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' },
      skillDir: makeFixtureSkill(),
      herdJsPath: '/abs/herd.js',
      codexHome,
      stableHome: path.join(tmpdir(), 'stable'),
    });
    expect(fs.existsSync(path.join(codexHome, 'skills'))).toBe(false);
    expect(r.systemMessage).toContain('(codex: installed)');
    expect(r.hookSpecificOutput.additionalContext).toMatch(/installed as a Codex plugin/);
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

describe('provisionStable atomic swap hardening', () => {
  test('leaves no temp staging dir behind after provisioning', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    hook.provisionStable({ skillDir, home: codexHome });
    expect(tmpResidue(codexHome)).toEqual([]);
    expect(fs.readdirSync(path.join(codexHome, 'skills'))).toContain('herdr');
  });

  test('refresh swaps the whole dir in - stale files do not survive', () => {
    const skillDir = makeFixtureSkill();
    const codexHome = tmpdir();
    hook.provisionStable({ skillDir, home: codexHome });

    const dest = path.join(codexHome, 'skills', 'herdr');
    // A file present in the provisioned copy but absent from the new source.
    fs.writeFileSync(path.join(dest, 'STALE.md'), 'old\n');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# herdr v2\n');

    const r = hook.provisionStable({ skillDir, home: codexHome });
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
    hook.provisionStable({ skillDir, home: codexHome });          // first writer
    const r = hook.provisionStable({ skillDir, home: codexHome }); // identical content
    expect(r).toEqual({ provisioned: false, reason: 'current' });
    expect(fs.existsSync(path.join(dest, '.comitatus-hash'))).toBe(true);
    expect(tmpResidue(codexHome)).toEqual([]);
  });
});

describe('stable provisioning', () => {
  test('stableHome / stableHerdJs build the fixed paths', () => {
    expect(hook.stableHome('/Users/x')).toBe(path.join('/Users/x', '.claude', 'comitatus'));
    expect(hook.stableHerdJs('/h')).toBe(path.join('/h', 'skills', 'herdr', 'scripts', 'herd.js'));
  });
  test('provisionStable creates the home if absent, provisions, then no-ops', () => {
    const skillDir = makeFixtureSkill();
    const home = path.join(tmpdir(), 'claude-comitatus'); // does NOT exist yet
    expect(hook.provisionStable({ skillDir, home })).toEqual({ provisioned: true, reason: 'missing' });
    expect(fs.existsSync(hook.stableHerdJs(home))).toBe(true);
    expect(hook.provisionStable({ skillDir, home })).toEqual({ provisioned: false, reason: 'current' });
  });
});

describe('processSessionStart emits the stable path', () => {
  test('orientation contains the stable herd.js path when provisioning succeeds', () => {
    const stableHomeDir = path.join(tmpdir(), 'claude-comitatus');
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: SKILL_DIR, herdJsPath: HERD_JS,
      codexHome: '/nonexistent', stableHome: stableHomeDir,
    });
    expect(r.hookSpecificOutput.additionalContext).toContain(hook.stableHerdJs(stableHomeDir));
  });
  test('falls back to the plugin herd.js when the stable provision throws', () => {
    const r = hook.processSessionStart({
      env: { HERDR_ENV: '1' }, skillDir: '/definitely/not/here', herdJsPath: '/abs/herd.js',
      codexHome: '/nonexistent', stableHome: path.join(tmpdir(), 'claude-comitatus'),
    });
    expect(r.hookSpecificOutput.additionalContext).toContain('/abs/herd.js');
  });
});
