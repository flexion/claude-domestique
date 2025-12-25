const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock child_process before requiring the module
const mockExecSync = jest.fn();
jest.mock('child_process', () => ({
  execSync: mockExecSync
}));

// Test only plugin-specific logic, not shared module functionality

describe('memento session-startup hook', () => {
  let hook;
  let tmpDir;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-test-'));
    // Re-require the module to get fresh instance with mocks
    jest.resetModules();
    // Re-mock after reset
    jest.doMock('child_process', () => ({
      execSync: mockExecSync
    }));
    hook = require('../session-startup.js');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getBranch', () => {
    it('returns branch name', () => {
      mockExecSync.mockReturnValue('feature/test\n');
      expect(hook.getBranch('/test')).toBe('feature/test');
    });

    it('returns null on error', () => {
      mockExecSync.mockImplementation(() => { throw new Error(); });
      expect(hook.getBranch('/test')).toBe(null);
    });
  });

  describe('getGitRoot', () => {
    it('returns git root path', () => {
      mockExecSync.mockReturnValue('/project\n');
      expect(hook.getGitRoot('/project/sub')).toBe('/project');
    });

    it('returns null on error', () => {
      mockExecSync.mockImplementation(() => { throw new Error(); });
      expect(hook.getGitRoot('/test')).toBe(null);
    });
  });

  describe('getSessionPath', () => {
    it('sanitizes branch name by replacing slashes with dashes', () => {
      expect(hook.getSessionPath('/p', 'a/b/c')).toBe('/p/.claude/sessions/a-b-c.md');
    });

    it('handles simple branch names', () => {
      expect(hook.getSessionPath('/p', 'main')).toBe('/p/.claude/sessions/main.md');
    });
  });

  describe('createSession', () => {
    it('creates directory and file', () => {
      const sessionPath = path.join(tmpDir, '.claude', 'sessions', 'test.md');
      hook.createSession(sessionPath, 'feature/test');
      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('includes branch type in template', () => {
      const sessionPath = path.join(tmpDir, '.claude', 'sessions', 'test.md');
      hook.createSession(sessionPath, 'fix/bug');
      const content = fs.readFileSync(sessionPath, 'utf8');
      expect(content).toContain('**Type**: fix');
    });

    it('handles chore type', () => {
      const sessionPath = path.join(tmpDir, '.claude', 'sessions', 'test.md');
      hook.createSession(sessionPath, 'chore/update');
      const content = fs.readFileSync(sessionPath, 'utf8');
      expect(content).toContain('**Type**: chore');
    });

    it('handles unknown type', () => {
      const sessionPath = path.join(tmpDir, '.claude', 'sessions', 'test.md');
      hook.createSession(sessionPath, 'random/branch');
      const content = fs.readFileSync(sessionPath, 'utf8');
      expect(content).toContain('**Type**: unknown');
    });

    it('includes branch name in template', () => {
      const sessionPath = path.join(tmpDir, '.claude', 'sessions', 'test.md');
      hook.createSession(sessionPath, 'feature/my-feature');
      const content = fs.readFileSync(sessionPath, 'utf8');
      expect(content).toContain('**Branch**: feature/my-feature');
    });
  });
});
