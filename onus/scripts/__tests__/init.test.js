const fs = require('fs');
const path = require('path');

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  copyFileSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock the package.json require
jest.mock('../../package.json', () => ({
  version: '1.0.0'
}), { virtual: true });

const { init, detectGitRemote, buildDefaultConfig, loadExistingConfig, computeContentHash, computeFileHash } = require('../init.js');
const { execSync } = require('child_process');

describe('init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('directory creation', () => {
    it('creates required directories', () => {
      fs.existsSync.mockReturnValue(false);
      fs.readdirSync.mockReturnValue([]);
      execSync.mockReturnValue('');

      init('/project', { force: false });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/rules'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/context'),
        { recursive: true }
      );
    });

    it('skips directory creation when directories exist', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);
      execSync.mockReturnValue('');

      init('/project', { force: false });

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('file copying', () => {
    it('copies rule files to project when they do not exist', () => {
      fs.existsSync.mockImplementation((p) => {
        // Plugin rules/context dirs exist
        if (p.includes('onus/rules') && !p.includes('.md')) return true;
        if (p.includes('onus/context') && !p.includes('.md')) return true;
        // Project .claude dirs exist
        if (p.includes('project/.claude/rules') && !p.includes('.md')) return true;
        if (p.includes('project/.claude/context') && !p.includes('.md')) return true;
        if (p.includes('project/.claude') && !p.includes('/rules') && !p.includes('/context') && !p.includes('.md')) return true;
        // Destination files don't exist (so they get copied)
        if (p.includes('/project/.claude/') && p.endsWith('.md')) return false;
        // Config file doesn't exist
        if (p.includes('config.json')) return false;
        return false;
      });
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['git.md', 'work-items.md'];
        if (dir.includes('context')) return ['git.md', 'work-items.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('test content');
      execSync.mockReturnValue('');

      init('/project', { force: false });

      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it('skips existing files without force', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['git.md'];
        if (dir.includes('context')) return ['git.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('same content');
      execSync.mockReturnValue('');

      init('/project', { force: false });

      // copyFileSync should not be called for unchanged files
      const copyCallsForRules = fs.copyFileSync.mock.calls.filter(
        call => call[1].includes('rules')
      );
      expect(copyCallsForRules.length).toBe(0);
    });

    it('overwrites files with force flag', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['git.md'];
        if (dir.includes('context')) return ['git.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('content');
      execSync.mockReturnValue('');

      init('/project', { force: true });

      expect(fs.copyFileSync).toHaveBeenCalled();
    });
  });

  describe('version file', () => {
    it('writes version file with correct structure', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['git.md'];
        if (dir.includes('context')) return ['git.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('content');
      execSync.mockReturnValue('');

      init('/project', { force: true });

      const versionWriteCall = fs.writeFileSync.mock.calls.find(
        call => call[0].includes('.onus-version.json')
      );

      expect(versionWriteCall).toBeDefined();
      const versionData = JSON.parse(versionWriteCall[1].trim());
      expect(versionData).toHaveProperty('version');
      expect(versionData).toHaveProperty('copiedAt');
      expect(versionData).toHaveProperty('files');
      expect(versionData).toHaveProperty('rulesHash');
      expect(versionData).toHaveProperty('contextHash');
    });
  });

  describe('config file', () => {
    it('creates config with detected platform', () => {
      fs.existsSync.mockImplementation((p) => {
        if (p.includes('onus/rules') && !p.includes('.md')) return true;
        if (p.includes('project/.claude')) return true;
        if (p.includes('config.json')) return false;
        return false;
      });
      fs.readdirSync.mockReturnValue(['git.md']);
      fs.readFileSync.mockReturnValue('content');
      execSync.mockReturnValue('git@github.com:myorg/myrepo.git');

      init('/project', { force: false });

      const configWriteCall = fs.writeFileSync.mock.calls.find(
        call => call[0].includes('config.json')
      );

      expect(configWriteCall).toBeDefined();
      const configData = JSON.parse(configWriteCall[1]);
      expect(configData.onus).toBeDefined();
      expect(configData.onus.platform).toBe('github');
      expect(configData.onus.github.owner).toBe('myorg');
      expect(configData.onus.github.repo).toBe('myrepo');
    });

    it('preserves existing config when not forcing', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['git.md']);
      fs.readFileSync.mockImplementation((p) => {
        if (p.includes('config.json')) {
          return JSON.stringify({ onus: { platform: 'jira' }, other: 'data' });
        }
        return 'content';
      });
      execSync.mockReturnValue('');

      init('/project', { force: false });

      // Should not write config when onus already exists
      const configWriteCall = fs.writeFileSync.mock.calls.find(
        call => call[0].includes('config.json')
      );
      expect(configWriteCall).toBeUndefined();
    });
  });

  describe('return value', () => {
    it('returns success true on successful init', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['git.md']);
      fs.readFileSync.mockReturnValue('content');
      execSync.mockReturnValue('');

      const result = init('/project', { force: true });

      expect(result.success).toBe(true);
    });
  });
});

describe('detectGitRemote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects GitHub SSH remote', () => {
    execSync.mockReturnValue('git@github.com:flexion/onus.git');

    const result = detectGitRemote('/project');

    expect(result).toEqual({
      platform: 'github',
      owner: 'flexion',
      repo: 'onus'
    });
  });

  it('detects GitHub HTTPS remote', () => {
    execSync.mockReturnValue('https://github.com/myorg/myrepo.git');

    const result = detectGitRemote('/project');

    expect(result).toEqual({
      platform: 'github',
      owner: 'myorg',
      repo: 'myrepo'
    });
  });

  it('detects Azure DevOps SSH remote', () => {
    execSync.mockReturnValue('git@ssh.dev.azure.com:v3/myorg/myproject/myrepo');

    const result = detectGitRemote('/project');

    expect(result).toEqual({
      platform: 'azure',
      org: 'myorg',
      project: 'myproject',
      repo: 'myrepo'
    });
  });

  it('detects Azure DevOps HTTPS remote', () => {
    execSync.mockReturnValue('https://dev.azure.com/myorg/myproject/_git/myrepo');

    const result = detectGitRemote('/project');

    expect(result).toEqual({
      platform: 'azure',
      org: 'myorg',
      project: 'myproject',
      repo: 'myrepo'
    });
  });

  it('detects Bitbucket as JIRA', () => {
    execSync.mockReturnValue('git@bitbucket.org:myorg/myrepo.git');

    const result = detectGitRemote('/project');

    expect(result).toEqual({
      platform: 'jira',
      owner: 'myorg',
      repo: 'myrepo'
    });
  });

  it('returns null for unknown remote', () => {
    execSync.mockReturnValue('git@gitlab.com:myorg/myrepo.git');

    const result = detectGitRemote('/project');

    expect(result).toBeNull();
  });

  it('returns null on error', () => {
    execSync.mockImplementation(() => {
      throw new Error('Not a git repository');
    });

    const result = detectGitRemote('/project');

    expect(result).toBeNull();
  });
});

describe('buildDefaultConfig', () => {
  it('builds GitHub config', () => {
    const result = buildDefaultConfig({ platform: 'github', owner: 'org', repo: 'repo' });

    expect(result.platform).toBe('github');
    expect(result.github.owner).toBe('org');
    expect(result.github.repo).toBe('repo');
    expect(result.commitFormat).toBeDefined();
    expect(result.branchFormat).toBeDefined();
  });

  it('builds Azure config', () => {
    const result = buildDefaultConfig({ platform: 'azure', org: 'myorg', project: 'myproj' });

    expect(result.platform).toBe('azure');
    expect(result.azure.org).toBe('myorg');
    expect(result.azure.project).toBe('myproj');
  });

  it('builds JIRA config', () => {
    const result = buildDefaultConfig({ platform: 'jira' });

    expect(result.platform).toBe('jira');
    expect(result.jira.host).toBe('your-company.atlassian.net');
    expect(result.jira.project).toBe('PROJ');
  });

  it('defaults to GitHub when no detection', () => {
    const result = buildDefaultConfig(null);

    expect(result.platform).toBe('github');
  });
});

describe('loadExistingConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('returns empty object when file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    const result = loadExistingConfig('/project/.claude/config.json');

    expect(result).toEqual({});
  });

  it('loads and parses existing config', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ onus: { platform: 'github' } }));

    const result = loadExistingConfig('/project/.claude/config.json');

    expect(result).toEqual({ onus: { platform: 'github' } });
  });

  it('returns empty object on parse error', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('invalid json');

    const result = loadExistingConfig('/project/.claude/config.json');

    expect(result).toEqual({});
  });
});

describe('computeFileHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns MD5 hash of file content', () => {
    fs.readFileSync.mockReturnValue('test content');

    const hash = computeFileHash('/test/file.md');

    expect(hash).toBe('9473fdd0d880a43c21b7778d34872157');
  });

  it('returns null on read error', () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error('Read error');
    });

    const hash = computeFileHash('/nonexistent/file.md');

    expect(hash).toBeNull();
  });
});

describe('computeContentHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('combines hashes of multiple files', () => {
    fs.readFileSync.mockReturnValue('content');

    const hash = computeContentHash('/dir', ['a.md', 'b.md']);

    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(32);
  });

  it('sorts files for consistent hashing', () => {
    fs.readFileSync.mockReturnValue('content');

    const hash1 = computeContentHash('/dir', ['b.md', 'a.md']);
    const hash2 = computeContentHash('/dir', ['a.md', 'b.md']);

    expect(hash1).toBe(hash2);
  });

  it('skips unreadable files', () => {
    fs.readFileSync.mockImplementation((p) => {
      if (p.includes('bad.md')) throw new Error('Read error');
      return 'content';
    });

    const hash = computeContentHash('/dir', ['good.md', 'bad.md']);

    expect(typeof hash).toBe('string');
  });
});
