/**
 * Tests for onus init module
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  init,
  detectGitRemote,
  buildDefaultConfig,
  hasExistingConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE,
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
    it('builds config for github platform with detected repo', () => {
      const detected = { owner: 'flexion', repo: 'claude-domestique' };
      const config = buildDefaultConfig('github', detected);

      expect(config).toEqual({
        onus: {
          ...DEFAULT_CONFIG,
          platform: 'github',
          github: { owner: 'flexion', repo: 'claude-domestique' }
        }
      });
    });

    it('builds config for jira platform with overrides', () => {
      const overrides = { jiraHost: 'company.atlassian.net', jiraProject: 'PROJ' };
      const config = buildDefaultConfig('jira', null, overrides);

      expect(config).toEqual({
        onus: {
          ...DEFAULT_CONFIG,
          platform: 'jira',
          jiraHost: 'company.atlassian.net',
          jiraProject: 'PROJ',
          jira: { host: 'company.atlassian.net', project: 'PROJ' }
        }
      });
    });

    it('builds config for azure platform with overrides', () => {
      const overrides = { azureOrg: 'myorg', azureProject: 'myproject' };
      const config = buildDefaultConfig('azure', null, overrides);

      expect(config).toEqual({
        onus: {
          ...DEFAULT_CONFIG,
          platform: 'azure',
          azureOrg: 'myorg',
          azureProject: 'myproject',
          azure: { org: 'myorg', project: 'myproject' }
        }
      });
    });

    it('applies custom commit format override', () => {
      const detected = { owner: 'test', repo: 'repo' };
      const overrides = { commitFormat: 'custom: {description}' };
      const config = buildDefaultConfig('github', detected, overrides);

      expect(config.onus.commitFormat).toBe('custom: {description}');
    });

    it('defaults to github platform when not specified', () => {
      const config = buildDefaultConfig(null, null);

      expect(config.onus.platform).toBe('github');
    });

    it('includes defaults when no detection or overrides', () => {
      const config = buildDefaultConfig('github', null);

      expect(config.onus.commitFormat).toBe(DEFAULT_CONFIG.commitFormat);
      expect(config.onus.branchFormat).toBe(DEFAULT_CONFIG.branchFormat);
    });
  });

  describe('hasExistingConfig', () => {
    it('returns false when config does not exist', () => {
      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('returns false when config exists but has no onus section', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ other: 'stuff' })
      );

      expect(hasExistingConfig(tmpDir)).toBe(false);
    });

    it('returns true when config has onus section', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ onus: { platform: 'github' } })
      );

      expect(hasExistingConfig(tmpDir)).toBe(true);
    });

    it('returns true when config has workItem section (legacy)', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ workItem: { platform: 'github' } })
      );

      expect(hasExistingConfig(tmpDir)).toBe(true);
    });

    it('returns false for invalid JSON', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        'not valid json'
      );

      expect(hasExistingConfig(tmpDir)).toBe(false);
    });
  });

  describe('init', () => {
    it('creates config with github platform by default', () => {
      const mockExec = jest.fn().mockReturnValue('git@github.com:flexion/claude-domestique.git');
      const result = init(tmpDir, {}, { execSync: mockExec });

      expect(result.created).toBe(true);
      expect(result.platform).toBe('github');
      expect(result.detected).toEqual({
        owner: 'flexion',
        repo: 'claude-domestique'
      });

      const configPath = path.join(tmpDir, CONFIG_FILE);
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.onus.platform).toBe('github');
      expect(config.onus.github.owner).toBe('flexion');
    });

    it('creates config with explicit jira platform', () => {
      const result = init(tmpDir, {
        platform: 'jira',
        overrides: { jiraHost: 'company.atlassian.net', jiraProject: 'PROJ' }
      });

      expect(result.created).toBe(true);
      expect(result.platform).toBe('jira');
      expect(result.config.onus.jira.host).toBe('company.atlassian.net');
      expect(result.config.onus.jira.project).toBe('PROJ');
    });

    it('creates config with explicit azure platform', () => {
      const result = init(tmpDir, {
        platform: 'azure',
        overrides: { azureOrg: 'myorg', azureProject: 'myproj' }
      });

      expect(result.created).toBe(true);
      expect(result.platform).toBe('azure');
      expect(result.config.onus.azure.org).toBe('myorg');
      expect(result.config.onus.azure.project).toBe('myproj');
    });

    it('rejects invalid platform', () => {
      const result = init(tmpDir, { platform: 'invalid' });

      expect(result.created).toBe(false);
      expect(result.error).toContain('Invalid platform');
      expect(result.error).toContain('github, jira, azure');
    });

    it('skips if config already exists', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ onus: { platform: 'github' } })
      );

      const result = init(tmpDir);

      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('overwrites existing config with force option', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ onus: { platform: 'github' } })
      );

      const result = init(tmpDir, { platform: 'jira', force: true });

      expect(result.created).toBe(true);
      expect(result.config.onus.platform).toBe('jira');
    });

    it('merges with existing config sections', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ context: { refresh: true } })
      );

      const result = init(tmpDir, { platform: 'github' });

      expect(result.created).toBe(true);
      expect(result.config.context).toEqual({ refresh: true });
      expect(result.config.onus.platform).toBe('github');
    });

    it('applies overrides to config', () => {
      const result = init(tmpDir, {
        platform: 'github',
        overrides: { commitFormat: 'fix: {description}' }
      });

      expect(result.created).toBe(true);
      expect(result.config.onus.commitFormat).toBe('fix: {description}');
    });

    it('creates .claude directory if missing', () => {
      const result = init(tmpDir, { platform: 'github' });

      expect(result.created).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.claude'))).toBe(true);
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
  });

  describe('PLATFORMS', () => {
    it('includes all supported platforms', () => {
      expect(PLATFORMS).toEqual(['github', 'jira', 'azure']);
    });
  });
});
