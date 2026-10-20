/**
 * Tests for onus project config resolution
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const {
  resolveProjectConfig,
  findProjectRoot,
  legacySection,
  CONFIG_FILE,
  LEGACY_CONFIG_FILE
} = require('../config.js');

describe('onus config resolution', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onus-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(file, text) {
    fs.mkdirSync(path.dirname(path.join(tmpDir, file)), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, file), text);
  }

  it('returns source none with empty config when neither file exists', () => {
    expect(resolveProjectConfig(tmpDir)).toEqual({ source: 'none', path: null, config: {}, error: null });
  });

  it('reads top-level keys from .onus/config.json', () => {
    write(CONFIG_FILE, JSON.stringify({ platform: 'jira', commitFormat: 'x' }));

    const result = resolveProjectConfig(tmpDir);

    expect(result.source).toBe('onus');
    expect(result.path).toBe(path.join(tmpDir, CONFIG_FILE));
    expect(result.config).toEqual({ platform: 'jira', commitFormat: 'x' });
    expect(result.error).toBeNull();
  });

  it('prefers .onus/config.json over the legacy section', () => {
    write(CONFIG_FILE, JSON.stringify({ platform: 'github' }));
    write(LEGACY_CONFIG_FILE, JSON.stringify({ onus: { platform: 'jira', commitFormat: 'legacy' } }));

    const result = resolveProjectConfig(tmpDir);

    expect(result.source).toBe('onus');
    expect(result.config).toEqual({ platform: 'github' });
  });

  it('accepts an empty object in .onus/config.json without consulting legacy', () => {
    write(CONFIG_FILE, '{}');
    write(LEGACY_CONFIG_FILE, JSON.stringify({ onus: { platform: 'jira' } }));

    expect(resolveProjectConfig(tmpDir)).toMatchObject({ source: 'onus', config: {}, error: null });
  });

  it.each([
    ['invalid JSON', '{"platform":', 'could not be parsed'],
    ['an empty file', '', 'could not be parsed'],
    ['an array', '[]', 'must contain a JSON object'],
    ['null', 'null', 'must contain a JSON object'],
    ['a string', '"github"', 'must contain a JSON object']
  ])('reports %s in .onus/config.json instead of falling back to legacy', (_label, text, message) => {
    write(CONFIG_FILE, text);
    write(LEGACY_CONFIG_FILE, JSON.stringify({ onus: { platform: 'jira' } }));

    const result = resolveProjectConfig(tmpDir);

    expect(result.source).toBe('onus');
    expect(result.config).toEqual({});
    expect(result.error).toContain(CONFIG_FILE);
    expect(result.error).toContain(message);
  });

  it('reports an unreadable .onus/config.json', () => {
    fs.mkdirSync(path.join(tmpDir, CONFIG_FILE), { recursive: true });

    const result = resolveProjectConfig(tmpDir);

    expect(result.source).toBe('onus');
    expect(result.error).toContain('could not be parsed');
  });

  it('falls back to the legacy onus section when .onus/config.json is absent', () => {
    write(LEGACY_CONFIG_FILE, JSON.stringify({ onus: { platform: 'jira' }, other: true }));

    const result = resolveProjectConfig(tmpDir);

    expect(result.source).toBe('legacy');
    expect(result.path).toBe(path.join(tmpDir, LEGACY_CONFIG_FILE));
    expect(result.config).toEqual({ platform: 'jira' });
  });

  it('falls back to the legacy workItem section', () => {
    write(LEGACY_CONFIG_FILE, JSON.stringify({ workItem: { platform: 'azure' } }));

    expect(resolveProjectConfig(tmpDir)).toMatchObject({ source: 'legacy', config: { platform: 'azure' } });
  });

  it('ignores an invalid legacy file, as before', () => {
    write(LEGACY_CONFIG_FILE, 'not json');

    expect(resolveProjectConfig(tmpDir)).toEqual({ source: 'none', path: null, config: {}, error: null });
  });

  it('ignores a legacy file without an onus section', () => {
    write(LEGACY_CONFIG_FILE, JSON.stringify({ context: {} }));

    expect(resolveProjectConfig(tmpDir).source).toBe('none');
  });

  describe('git root', () => {
    function gitInit() {
      spawnSync('git', ['init', '-q'], { cwd: tmpDir });
      fs.mkdirSync(path.join(tmpDir, 'nested', 'deeper'), { recursive: true });
      return fs.realpathSync(tmpDir);
    }

    it('uses the directory itself outside a git repository', () => {
      expect(findProjectRoot(tmpDir)).toBe(tmpDir);
    });

    it('finds the git top-level from a nested directory', () => {
      const root = gitInit();

      expect(findProjectRoot(path.join(tmpDir, 'nested', 'deeper'))).toBe(root);
    });

    it('resolves .onus/config.json from a nested directory', () => {
      const root = gitInit();
      write(CONFIG_FILE, JSON.stringify({ platform: 'jira' }));

      const result = resolveProjectConfig(path.join(tmpDir, 'nested', 'deeper'));

      expect(result).toMatchObject({ source: 'onus', path: path.join(root, CONFIG_FILE), config: { platform: 'jira' } });
    });

    it('reports an unusable root .onus/config.json from a nested directory', () => {
      gitInit();
      write(CONFIG_FILE, '{');
      write(LEGACY_CONFIG_FILE, JSON.stringify({ onus: { platform: 'jira' } }));

      expect(resolveProjectConfig(path.join(tmpDir, 'nested')).error).toContain('could not be parsed');
    });

    it('resolves the legacy section from a nested directory', () => {
      gitInit();
      write(LEGACY_CONFIG_FILE, JSON.stringify({ workItem: { platform: 'azure' } }));

      expect(resolveProjectConfig(path.join(tmpDir, 'nested'))).toMatchObject({ source: 'legacy', config: { platform: 'azure' } });
    });

    it('ignores config files in the nested directory itself', () => {
      gitInit();
      write(path.join('nested', CONFIG_FILE), JSON.stringify({ platform: 'jira' }));

      expect(resolveProjectConfig(path.join(tmpDir, 'nested')).source).toBe('none');
    });
  });

  describe('legacySection', () => {
    it('prefers onus, then workItem, and skips non-object sections', () => {
      expect(legacySection({ onus: { a: 1 }, workItem: { b: 2 } })).toEqual({ key: 'onus', section: { a: 1 } });
      expect(legacySection({ onus: 'bad', workItem: { b: 2 } })).toEqual({ key: 'workItem', section: { b: 2 } });
      expect(legacySection({ onus: [] })).toBeNull();
      expect(legacySection(null)).toBeNull();
    });
  });

  describe('CLI', () => {
    const script = path.join(__dirname, '..', 'config.js');

    it('prints the resolution as JSON and exits 0', () => {
      write(CONFIG_FILE, JSON.stringify({ platform: 'jira' }));

      const result = spawnSync(process.execPath, [script, tmpDir], { encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ source: 'onus', config: { platform: 'jira' }, error: null });
    });

    it('defaults to the current directory', () => {
      write(LEGACY_CONFIG_FILE, JSON.stringify({ onus: { platform: 'azure' } }));

      const result = spawnSync(process.execPath, [script], { cwd: tmpDir, encoding: 'utf8' });

      expect(JSON.parse(result.stdout)).toMatchObject({ source: 'legacy', config: { platform: 'azure' } });
    });

    it('exits 1 with valid JSON when .onus/config.json is unusable', () => {
      write(CONFIG_FILE, '[');

      const result = spawnSync(process.execPath, [script, tmpDir], { encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout).error).toContain('could not be parsed');
    });
  });
});
