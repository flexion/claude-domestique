/**
 * Tests for onus init module
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const {
  init,
  migrate,
  readLegacyConfig,
  detectGitRemote,
  buildDefaultConfig,
  hasExistingConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE,
  LEGACY_CONFIG_FILE,
  PLATFORMS
} = require('../init.js');

describe('onus init', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onus-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeLegacy(value) {
    const text = JSON.stringify(value, null, 4) + '\n';
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), text);
    return text;
  }

  function writeNew(text) {
    fs.mkdirSync(path.join(tmpDir, '.onus'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), text);
  }

  function readNew() {
    return JSON.parse(fs.readFileSync(path.join(tmpDir, CONFIG_FILE), 'utf8'));
  }

  describe('detectGitRemote', () => {
    it('detects owner/repo from GitHub SSH remote', () => {
      const mockExec = jest.fn().mockReturnValue('git@github.com:flexion/claude-domestique.git');
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toEqual({
        owner: 'flexion',
        repo: 'claude-domestique'
      });
    });

    it('detects owner/repo from GitHub HTTPS remote', () => {
      const mockExec = jest.fn().mockReturnValue('https://github.com/anthropics/claude-code.git');
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'claude-code'
      });
    });

    it('detects owner/repo from GitHub HTTPS remote without .git suffix', () => {
      const mockExec = jest.fn().mockReturnValue('https://github.com/owner/repo');
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo'
      });
    });

    it('detects owner/repo from GitHub Enterprise SSH remote', () => {
      const mockExec = jest.fn().mockReturnValue('git@github.company.com:myorg/myrepo.git');
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toEqual({
        owner: 'myorg',
        repo: 'myrepo'
      });
    });

    it('detects owner/repo from GitHub Enterprise HTTPS remote', () => {
      const mockExec = jest.fn().mockReturnValue('https://github.enterprise.com/team/project.git');
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toEqual({
        owner: 'team',
        repo: 'project'
      });
    });

    it('returns null when git command fails', () => {
      const mockExec = jest.fn().mockImplementation(() => {
        throw new Error('not a git repository');
      });
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toBeNull();
    });

    it('returns null for empty remote URL', () => {
      const mockExec = jest.fn().mockReturnValue('');
      const result = detectGitRemote(tmpDir, { execSync: mockExec });

      expect(result).toBeNull();
    });
  });

  describe('buildDefaultConfig', () => {
    it('builds top-level config for github platform with detected repo', () => {
      const detected = { owner: 'flexion', repo: 'claude-domestique' };
      const config = buildDefaultConfig('github', detected);

      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        platform: 'github',
        github: { owner: 'flexion', repo: 'claude-domestique' }
      });
    });

    it('builds config for jira platform with overrides', () => {
      const overrides = { jiraHost: 'company.atlassian.net', jiraProject: 'PROJ' };
      const config = buildDefaultConfig('jira', null, overrides);

      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        platform: 'jira',
        jiraHost: 'company.atlassian.net',
        jiraProject: 'PROJ',
        jira: { host: 'company.atlassian.net', project: 'PROJ' }
      });
    });

    it('builds config for azure platform with overrides', () => {
      const overrides = { azureOrg: 'myorg', azureProject: 'myproject' };
      const config = buildDefaultConfig('azure', null, overrides);

      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        platform: 'azure',
        azureOrg: 'myorg',
        azureProject: 'myproject',
        azure: { org: 'myorg', project: 'myproject' }
      });
    });

    it('applies custom commit format override', () => {
      const detected = { owner: 'test', repo: 'repo' };
      const overrides = { commitFormat: 'custom: {description}' };
      const config = buildDefaultConfig('github', detected, overrides);

      expect(config.commitFormat).toBe('custom: {description}');
    });

    it('defaults to github platform when not specified', () => {
      const config = buildDefaultConfig(null, null);

      expect(config.platform).toBe('github');
    });

    it('includes defaults when no detection or overrides', () => {
      const config = buildDefaultConfig('github', null);

      expect(config.commitFormat).toBe(DEFAULT_CONFIG.commitFormat);
      expect(config.branchFormat).toBe(DEFAULT_CONFIG.branchFormat);
      expect(config.onus).toBeUndefined();
    });
  });

  describe('hasExistingConfig', () => {
    it('targets .onus/config.json', () => {
      expect(CONFIG_FILE).toBe('.onus/config.json');
      expect(LEGACY_CONFIG_FILE).toBe('.claude/config.json');
    });

    it('returns false when .onus/config.json does not exist', () => {
      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('returns false when only a legacy onus section exists', () => {
      writeLegacy({ onus: { platform: 'github' } });

      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('returns true when .onus/config.json exists', () => {
      writeNew(JSON.stringify({ platform: 'github' }));

      expect(hasExistingConfig(tmpDir)).toBe(true);
    });

    it('returns true for an invalid .onus/config.json', () => {
      writeNew('not valid json');

      expect(hasExistingConfig(tmpDir)).toBe(true);
    });
  });

  describe('readLegacyConfig', () => {
    it('reports a missing legacy file', () => {
      expect(readLegacyConfig(tmpDir)).toEqual({ exists: false });
    });

    it('prefers the onus section over workItem', () => {
      writeLegacy({ workItem: { platform: 'azure' }, onus: { platform: 'jira' } });

      expect(readLegacyConfig(tmpDir)).toEqual({ exists: true, key: 'onus', section: { platform: 'jira' } });
    });

    it('falls back to the workItem section', () => {
      writeLegacy({ workItem: { platform: 'azure' } });

      expect(readLegacyConfig(tmpDir).key).toBe('workItem');
    });

    it('reports invalid JSON', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), '{');

      expect(readLegacyConfig(tmpDir).error).toContain('could not be parsed');
    });
  });

  describe('init', () => {
    it('creates .onus/config.json with github platform by default', () => {
      const mockExec = jest.fn().mockReturnValue('git@github.com:flexion/claude-domestique.git');
      const result = init(tmpDir, {}, { execSync: mockExec });

      expect(result.created).toBe(true);
      expect(result.platform).toBe('github');
      expect(result.path).toBe(path.join(tmpDir, '.onus', 'config.json'));
      expect(result.detected).toEqual({
        owner: 'flexion',
        repo: 'claude-domestique'
      });

      const config = readNew();
      expect(config.platform).toBe('github');
      expect(config.github.owner).toBe('flexion');
      expect(config.onus).toBeUndefined();
      expect(fs.existsSync(path.join(tmpDir, LEGACY_CONFIG_FILE))).toBe(false);
    });

    it('creates config with explicit jira platform', () => {
      const result = init(tmpDir, {
        platform: 'jira',
        overrides: { jiraHost: 'company.atlassian.net', jiraProject: 'PROJ' }
      });

      expect(result.created).toBe(true);
      expect(result.platform).toBe('jira');
      expect(result.config.jira.host).toBe('company.atlassian.net');
      expect(result.config.jira.project).toBe('PROJ');
    });

    it('creates config with explicit azure platform', () => {
      const result = init(tmpDir, {
        platform: 'azure',
        overrides: { azureOrg: 'myorg', azureProject: 'myproj' }
      });

      expect(result.created).toBe(true);
      expect(result.platform).toBe('azure');
      expect(result.config.azure.org).toBe('myorg');
      expect(result.config.azure.project).toBe('myproj');
    });

    it('rejects invalid platform', () => {
      const result = init(tmpDir, { platform: 'invalid' });

      expect(result.created).toBe(false);
      expect(result.error).toContain('Invalid platform');
      expect(result.error).toContain('github, jira, azure');
    });

    it('skips if .onus/config.json already exists', () => {
      writeNew(JSON.stringify({ platform: 'github' }));

      const result = init(tmpDir);

      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);
      expect(readNew()).toEqual({ platform: 'github' });
    });

    it('skips an invalid .onus/config.json without --force', () => {
      writeNew('not json');

      const result = init(tmpDir);

      expect(result.skipped).toBe(true);
      expect(fs.readFileSync(path.join(tmpDir, CONFIG_FILE), 'utf8')).toBe('not json');
    });

    it('skips and points to --migrate when legacy onus settings exist', () => {
      const legacyText = writeLegacy({ onus: { platform: 'jira', commitFormat: 'custom' } });

      const result = init(tmpDir);

      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.message).toContain('--migrate');
      expect(hasExistingConfig(tmpDir)).toBe(false);
      expect(fs.readFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), 'utf8')).toBe(legacyText);
    });

    it('creates config when the legacy file has no onus section', () => {
      const legacyText = writeLegacy({ context: { refresh: true } });

      const result = init(tmpDir, { platform: 'github' });

      expect(result.created).toBe(true);
      expect(result.config.context).toBeUndefined();
      expect(fs.readFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), 'utf8')).toBe(legacyText);
    });

    it('writes defaults with --force despite legacy settings, leaving the legacy file untouched', () => {
      const legacyText = writeLegacy({ onus: { platform: 'jira' }, other: 1 });

      const result = init(tmpDir, { platform: 'github', force: true });

      expect(result.created).toBe(true);
      expect(readNew().platform).toBe('github');
      expect(fs.readFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), 'utf8')).toBe(legacyText);
    });

    it('merges over an existing valid config with --force', () => {
      writeNew(JSON.stringify({ platform: 'github', custom: 'kept' }));

      const result = init(tmpDir, { platform: 'jira', force: true });

      expect(result.created).toBe(true);
      expect(result.config.platform).toBe('jira');
      expect(readNew().custom).toBe('kept');
    });

    it('repairs an invalid .onus/config.json with --force', () => {
      writeNew('[1, 2');

      const result = init(tmpDir, { platform: 'github', force: true });

      expect(result.created).toBe(true);
      expect(readNew().platform).toBe('github');
    });

    it('replaces a non-object .onus/config.json with --force', () => {
      writeNew('[]');

      const result = init(tmpDir, { platform: 'github', force: true });

      expect(result.created).toBe(true);
      expect(readNew().platform).toBe('github');
    });

    it('applies overrides to config', () => {
      const result = init(tmpDir, {
        platform: 'github',
        overrides: { commitFormat: 'fix: {description}' }
      });

      expect(result.created).toBe(true);
      expect(result.config.commitFormat).toBe('fix: {description}');
    });

    it('creates .onus directory if missing', () => {
      const result = init(tmpDir, { platform: 'github' });

      expect(result.created).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.onus'))).toBe(true);
    });

    it('returns error when directory creation fails', () => {
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(false),
        mkdirSync: jest.fn().mockImplementation(() => {
          throw new Error('permission denied');
        })
      };

      const result = init(tmpDir, { platform: 'github' }, { fs: mockFs });

      expect(result.created).toBe(false);
      expect(result.error).toContain('Failed to create config directory');
    });

    it('returns error when the write fails', () => {
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(false),
        mkdirSync: jest.fn(),
        writeFileSync: jest.fn().mockImplementation(() => {
          throw new Error('disk full');
        })
      };

      const result = init(tmpDir, { platform: 'github' }, { fs: mockFs });

      expect(result.created).toBe(false);
      expect(result.error).toContain('Failed to write config');
    });
  });

  describe('migrate', () => {
    it('copies the onus section verbatim and leaves the legacy file byte-identical', () => {
      const section = {
        platform: 'jira',
        jira: { host: 'co.atlassian.net', project: 'PROJ' },
        commitFormat: { issue: '[{number}] {description}', chore: 'chore: {description}' },
        custom: [1, 2]
      };
      const legacyText = '{"context":{"refresh":true},  "onus": ' + JSON.stringify(section) + ', "other": "x"}\n';
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), legacyText);

      const result = migrate(tmpDir);

      expect(result.created).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.from).toBe('onus');
      expect(readNew()).toEqual(section);
      expect(fs.readFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), 'utf8')).toBe(legacyText);
      expect(result.message).toContain('was not modified');
    });

    it('migrates a workItem section', () => {
      writeLegacy({ workItem: { platform: 'azure' } });

      const result = migrate(tmpDir);

      expect(result.from).toBe('workItem');
      expect(readNew()).toEqual({ platform: 'azure' });
    });

    it('errors when the legacy file is missing', () => {
      const result = migrate(tmpDir);

      expect(result.created).toBe(false);
      expect(result.error).toContain('not found');
      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('errors when the legacy file has no onus section', () => {
      writeLegacy({ other: true });

      const result = migrate(tmpDir);

      expect(result.error).toContain('no onus or workItem section');
      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('errors when the legacy file is invalid JSON', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), '{"onus":');

      const result = migrate(tmpDir);

      expect(result.error).toContain('could not be parsed');
      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('refuses to replace an existing .onus/config.json without --force', () => {
      writeLegacy({ onus: { platform: 'jira' } });
      writeNew(JSON.stringify({ platform: 'github' }));

      const result = migrate(tmpDir);

      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);
      expect(readNew()).toEqual({ platform: 'github' });
    });

    it('replaces an existing .onus/config.json with --force', () => {
      writeLegacy({ onus: { platform: 'jira' } });
      writeNew('not json');

      const result = migrate(tmpDir, { force: true });

      expect(result.created).toBe(true);
      expect(readNew()).toEqual({ platform: 'jira' });
    });
  });

  describe('CLI', () => {
    const script = path.join(__dirname, '..', 'init.js');
    const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: tmpDir, encoding: 'utf8' });

    it('migrates with --migrate', () => {
      const legacyText = writeLegacy({ onus: { platform: 'jira' } });

      const result = run(['--migrate']);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('.onus/config.json');
      expect(readNew()).toEqual({ platform: 'jira' });
      expect(fs.readFileSync(path.join(tmpDir, LEGACY_CONFIG_FILE), 'utf8')).toBe(legacyText);
    });

    it('writes to the git root when run from a nested directory', () => {
      spawnSync('git', ['init', '-q'], { cwd: tmpDir });
      const nested = path.join(tmpDir, 'nested');
      fs.mkdirSync(nested);
      writeLegacy({ onus: { platform: 'jira' } });

      const result = spawnSync(process.execPath, [script, '--migrate'], { cwd: nested, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(readNew()).toEqual({ platform: 'jira' });
      expect(fs.existsSync(path.join(nested, '.onus'))).toBe(false);
    });

    it('exits 1 when there is nothing to migrate', () => {
      const result = run(['--migrate']);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Nothing to migrate');
    });
  });

  describe('PLATFORMS', () => {
    it('includes all supported platforms', () => {
      expect(PLATFORMS).toEqual(['github', 'jira', 'azure']);
    });
  });
});
