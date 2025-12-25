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

// Mock the package.json require
jest.mock('../../package.json', () => ({
  version: '1.0.0'
}), { virtual: true });

const { init, computeContentHash, computeFileHash } = require('../init.js');

describe('init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('directory creation', () => {
    it('creates all required directories', () => {
      fs.existsSync.mockReturnValue(false);
      fs.readdirSync.mockReturnValue([]);

      init('/project', { force: false });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/rules'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/context'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/templates'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/sessions'),
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/branches'),
        { recursive: true }
      );
    });

    it('skips directory creation when directories exist', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);

      init('/project', { force: false });

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('file copying', () => {
    it('copies rule files to project when they do not exist', () => {
      // Mock: directories exist, but destination files don't
      fs.existsSync.mockImplementation((p) => {
        // Plugin rules dir exists
        if (p.includes('memento/rules') && !p.includes('.md')) return true;
        // Project .claude dirs exist
        if (p.includes('project/.claude/rules') && !p.includes('.md')) return true;
        if (p.includes('project/.claude/context') && !p.includes('.md')) return true;
        if (p.includes('project/.claude/templates') && !p.includes('.md')) return true;
        if (p.includes('project/.claude/sessions')) return true;
        if (p.includes('project/.claude/branches')) return true;
        // Destination files don't exist (so they get copied)
        if (p.includes('/project/.claude/') && p.endsWith('.md')) return false;
        return false;
      });
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['sessions.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('test content');

      init('/project', { force: false });

      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it('skips existing files without force', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['sessions.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('same content');

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
        if (dir.includes('rules')) return ['sessions.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('content');

      init('/project', { force: true });

      expect(fs.copyFileSync).toHaveBeenCalled();
    });
  });

  describe('version file', () => {
    it('writes version file with correct structure', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['sessions.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('content');

      init('/project', { force: true });

      const versionWriteCall = fs.writeFileSync.mock.calls.find(
        call => call[0].includes('.memento-version.json')
      );

      expect(versionWriteCall).toBeDefined();
      const versionData = JSON.parse(versionWriteCall[1].trim());
      expect(versionData).toHaveProperty('version');
      expect(versionData).toHaveProperty('copiedAt');
      expect(versionData).toHaveProperty('files');
      expect(versionData).toHaveProperty('rulesHash');
      expect(versionData).toHaveProperty('contextHash');
      expect(versionData).toHaveProperty('templatesHash');
    });
  });

  describe('return value', () => {
    it('returns success true on successful init', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('rules')) return ['sessions.md'];
        return [];
      });
      fs.readFileSync.mockReturnValue('content');

      const result = init('/project', { force: true });

      expect(result.success).toBe(true);
    });

    it('returns error when rules dir not found', () => {
      fs.existsSync.mockImplementation((p) => {
        if (p.includes('memento/rules')) return false;
        return true;
      });

      const result = init('/project', { force: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});

describe('computeFileHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns MD5 hash of file content', () => {
    fs.readFileSync.mockReturnValue('test content');

    const hash = computeFileHash('/test/file.md');

    expect(hash).toBe('9473fdd0d880a43c21b7778d34872157'); // MD5 of 'test content'
  });

  it('returns null on read error', () => {
    // Save and restore the mock to avoid affecting other tests
    const originalMock = fs.readFileSync.getMockImplementation();
    fs.readFileSync.mockImplementation((p) => {
      if (p === '/nonexistent/file.md') {
        throw new Error('Read error');
      }
      return 'content';
    });

    const hash = computeFileHash('/nonexistent/file.md');

    expect(hash).toBeNull();

    // Restore
    if (originalMock) fs.readFileSync.mockImplementation(originalMock);
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
    expect(hash.length).toBe(32); // MD5 hex length
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
