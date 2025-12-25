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

  describe('findPossibleSessions', () => {
    it('returns empty array when sessions directory does not exist', () => {
      const result = hook.findPossibleSessions(tmpDir, 'issue/feature-42/test');
      expect(result).toEqual([]);
    });

    it('finds sessions matching issue number', () => {
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '42-old-name.md'), '# test');
      fs.writeFileSync(path.join(sessionsDir, 'unrelated.md'), '# other');

      const result = hook.findPossibleSessions(tmpDir, 'issue/feature-42/new-name');
      expect(result.length).toBe(1);
      expect(result[0].file).toBe('42-old-name.md');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('finds sessions matching description words', () => {
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, 'auth-feature.md'), '# test');

      const result = hook.findPossibleSessions(tmpDir, 'issue/feature-99/authentication');
      // 'authentication' contains 'auth' - should match
      expect(result.some(r => r.file === 'auth-feature.md')).toBe(true);
    });

    it('returns max 3 results sorted by score', () => {
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '42-a.md'), '');
      fs.writeFileSync(path.join(sessionsDir, '42-b.md'), '');
      fs.writeFileSync(path.join(sessionsDir, '42-c.md'), '');
      fs.writeFileSync(path.join(sessionsDir, '42-d.md'), '');

      const result = hook.findPossibleSessions(tmpDir, 'issue/feature-42/test');
      expect(result.length).toBe(3);
    });
  });

  describe('detectMismatch', () => {
    it('returns null when exact session exists', () => {
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      const sessionPath = path.join(sessionsDir, 'issue-feature-42-test.md');
      fs.writeFileSync(sessionPath, '# test');

      const result = hook.detectMismatch(tmpDir, 'issue/feature-42/test', sessionPath);
      expect(result).toBe(null);
    });

    it('detects misnamed session that references the branch', () => {
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      // Session with wrong name but correct branch reference
      fs.writeFileSync(
        path.join(sessionsDir, 'old-name.md'),
        '# Session\n**Branch**: issue/feature-42/test\n'
      );

      const sessionPath = path.join(sessionsDir, 'issue-feature-42-test.md');
      const result = hook.detectMismatch(tmpDir, 'issue/feature-42/test', sessionPath);

      expect(result).not.toBe(null);
      expect(result.currentName).toBe('old-name.md');
      expect(result.expectedName).toBe('issue-feature-42-test.md');
    });

    it('returns null when no session references the branch', () => {
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsDir, 'other.md'),
        '# Session\n**Branch**: different/branch\n'
      );

      const sessionPath = path.join(sessionsDir, 'issue-feature-42-test.md');
      const result = hook.detectMismatch(tmpDir, 'issue/feature-42/test', sessionPath);
      expect(result).toBe(null);
    });
  });

  describe('buildSwitchContext', () => {
    it('builds context for existing session', () => {
      const context = hook.buildSwitchContext('/path/session.md', true, [], 'feature/test');
      expect(context).toContain('Branch Switch Detected');
      expect(context).toContain('Session found');
    });

    it('builds context for mismatch', () => {
      const mismatch = { currentName: 'old.md', expectedName: 'new.md', path: '/path/old.md' };
      const context = hook.buildSwitchContext('/path/new.md', false, [], 'feature/test', mismatch);
      expect(context).toContain('Mismatch Detected');
      expect(context).toContain('old.md');
      expect(context).toContain('new.md');
    });

    it('builds context for possible sessions', () => {
      const possibles = [{ file: 'maybe.md', score: 5 }];
      const context = hook.buildSwitchContext('/path/session.md', false, possibles, 'feature/test');
      expect(context).toContain('maybe.md');
      expect(context).toContain('Possible matches');
    });

    it('builds context when no session found', () => {
      const context = hook.buildSwitchContext('/path/session.md', false, [], 'feature/test');
      expect(context).toContain('No session found');
      expect(context).toContain('create a new session');
    });
  });

  describe('detectSessionTriggers', () => {
    it('detects todo changes', () => {
      const triggers = hook.detectSessionTriggers({ toolsUsed: ['TodoWrite'] });
      expect(triggers).toContainEqual({ type: 'todos_changed' });
    });

    it('detects plan approved', () => {
      const triggers = hook.detectSessionTriggers({ toolsUsed: ['ExitPlanMode'] });
      expect(triggers).toContainEqual({ type: 'plan_approved' });
    });

    it('detects context checkpoint', () => {
      const triggers = hook.detectSessionTriggers({ contextUsage: 0.85 });
      expect(triggers).toContainEqual({ type: 'context_checkpoint', usage: 85 });
    });

    it('returns empty array when no triggers', () => {
      const triggers = hook.detectSessionTriggers({});
      expect(triggers).toEqual([]);
    });

    it('detects multiple triggers', () => {
      const triggers = hook.detectSessionTriggers({
        toolsUsed: ['TodoWrite', 'ExitPlanMode'],
        contextUsage: 0.9
      });
      expect(triggers.length).toBe(3);
    });
  });

  describe('buildTriggerContext', () => {
    it('returns empty string when no triggers', () => {
      const context = hook.buildTriggerContext([], '/path/session.md');
      expect(context).toBe('');
    });

    it('builds context for todos changed', () => {
      const triggers = [{ type: 'todos_changed' }];
      const context = hook.buildTriggerContext(triggers, '/path/session.md');
      expect(context).toContain('Todos changed');
      expect(context).toContain('Session Log');
    });

    it('builds context for plan approved', () => {
      const triggers = [{ type: 'plan_approved' }];
      const context = hook.buildTriggerContext(triggers, '/path/session.md');
      expect(context).toContain('Plan approved');
      expect(context).toContain('IMMEDIATELY');
      expect(context).toContain('Approach');
    });

    it('builds context for context checkpoint', () => {
      const triggers = [{ type: 'context_checkpoint', usage: 85 }];
      const context = hook.buildTriggerContext(triggers, '/path/session.md');
      expect(context).toContain('85%');
      expect(context).toContain('compaction');
    });
  });
});
