const fs = require('fs');
const { execSync } = require('child_process');

jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const hook = require('../session-startup.js');

describe('session-startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default implementations
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation(() => { throw new Error(); });
  });

  describe('getBranch', () => {
    it('returns branch name', () => {
      execSync.mockReturnValue('feature/test\n');
      expect(hook.getBranch('/test')).toBe('feature/test');
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => { throw new Error(); });
      expect(hook.getBranch('/test')).toBe(null);
    });
  });

  describe('getGitRoot', () => {
    it('returns git root path', () => {
      execSync.mockReturnValue('/project\n');
      expect(hook.getGitRoot('/project/sub')).toBe('/project');
    });

    it('returns null on error', () => {
      execSync.mockImplementation(() => { throw new Error(); });
      expect(hook.getGitRoot('/test')).toBe(null);
    });
  });

  describe('getSessionPath', () => {
    it('sanitizes branch name', () => {
      expect(hook.getSessionPath('/p', 'a/b/c')).toBe('/p/.claude/sessions/a-b-c.md');
    });
  });

  describe('loadCount', () => {
    it('returns count from file', () => {
      fs.readFileSync.mockReturnValue('{"count": 5}');
      expect(hook.loadCount()).toBe(5);
    });

    it('returns 0 on error', () => {
      fs.readFileSync.mockImplementation(() => { throw new Error(); });
      expect(hook.loadCount()).toBe(0);
    });

    it('returns 0 when count missing', () => {
      fs.readFileSync.mockReturnValue('{}');
      expect(hook.loadCount()).toBe(0);
    });
  });

  describe('saveCount', () => {
    it('creates directory if needed', () => {
      fs.existsSync.mockReturnValue(false);
      hook.saveCount(5);
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('writes count to file', () => {
      fs.existsSync.mockReturnValue(true);
      hook.saveCount(5);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.any(String), '{"count":5}');
    });

    it('handles errors silently', () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementationOnce(() => { throw new Error(); });
      expect(() => hook.saveCount(5)).not.toThrow();
    });
  });

  describe('createSession', () => {
    it('creates directory and file', () => {
      hook.createSession('/p/.claude/sessions/test.md', 'feature/test');
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('includes branch type in template', () => {
      hook.createSession('/p/.claude/sessions/test.md', 'fix/bug');
      const content = fs.writeFileSync.mock.calls[0][1];
      expect(content).toContain('**Type**: fix');
    });

    it('handles chore type', () => {
      hook.createSession('/p/.claude/sessions/test.md', 'chore/update');
      const content = fs.writeFileSync.mock.calls[0][1];
      expect(content).toContain('**Type**: chore');
    });

    it('handles unknown type', () => {
      hook.createSession('/p/.claude/sessions/test.md', 'random/branch');
      const content = fs.writeFileSync.mock.calls[0][1];
      expect(content).toContain('**Type**: unknown');
    });
  });

  describe('processHook', () => {
    it('shows no session on main branch', () => {
      execSync.mockReturnValue('main\n');
      const result = hook.processHook({ cwd: '/test' });
      expect(result.systemMessage).toBe('📍 Memento: No session (main)');
    });

    it('shows no session on master branch', () => {
      execSync.mockReturnValue('master\n');
      const result = hook.processHook({ cwd: '/test' });
      expect(result.systemMessage).toBe('📍 Memento: No session (master)');
    });

    it('shows not a git repo when no git root', () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('show-toplevel')) throw new Error();
        return 'feature/test\n';
      });
      const result = hook.processHook({ cwd: '/test' });
      expect(result.systemMessage).toBe('📍 Memento: No session (not a git repo)');
    });

    it('shows not a git repo when no branch', () => {
      execSync.mockImplementation(() => { throw new Error(); });
      const result = hook.processHook({ cwd: '/test' });
      expect(result.systemMessage).toBe('📍 Memento: No session (not a git repo)');
    });

    it('creates session when missing', () => {
      execSync.mockImplementation((cmd) => 
        cmd.includes('show-toplevel') ? '/project\n' : 'feature/test\n'
      );
      fs.existsSync.mockReturnValue(false);

      const result = hook.processHook({ cwd: '/project', hook_event_name: 'SessionStart' });
      
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.systemMessage).toContain('Created session');
    });

    it('resets counter on SessionStart', () => {
      execSync.mockImplementation((cmd) => 
        cmd.includes('show-toplevel') ? '/project\n' : 'feature/test\n'
      );
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{"count": 5}');

      hook.processHook({ cwd: '/project', hook_event_name: 'SessionStart' });
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.any(String), '{"count":0}');
    });

    it('shows counter on UserPromptSubmit', () => {
      execSync.mockImplementation((cmd) => 
        cmd.includes('show-toplevel') ? '/project\n' : 'feature/test\n'
      );
      fs.existsSync.mockReturnValue(true);

      const result = hook.processHook({ cwd: '/project', hook_event_name: 'UserPromptSubmit' });
      
      expect(result.systemMessage).toMatch(/\d+\/10/);
    });

    it('shows update reminder when counter hits 0', () => {
      execSync.mockImplementation((cmd) => 
        cmd.includes('show-toplevel') ? '/project\n' : 'feature/test\n'
      );
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{"count": 9}');

      const result = hook.processHook({ cwd: '/project', hook_event_name: 'UserPromptSubmit' });
      
      expect(result.hookSpecificOutput.additionalContext).toContain('Update Reminder');
    });

    it('uses default cwd when not provided', () => {
      execSync.mockReturnValue('main\n');
      const result = hook.processHook({});
      expect(result.systemMessage).toBe('📍 Memento: No session (main)');
    });

    it('uses default event when not provided', () => {
      execSync.mockReturnValue('main\n');
      const result = hook.processHook({ cwd: '/test' });
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('shows new session message for new sessions', () => {
      execSync.mockImplementation((cmd) => 
        cmd.includes('show-toplevel') ? '/project\n' : 'feature/test\n'
      );
      fs.existsSync.mockReturnValue(false);

      const result = hook.processHook({ cwd: '/project', hook_event_name: 'SessionStart' });
      
      expect(result.hookSpecificOutput.additionalContext).toContain('New session created');
    });

    it('shows resumption message for existing sessions', () => {
      execSync.mockImplementation((cmd) => 
        cmd.includes('show-toplevel') ? '/project\n' : 'feature/test\n'
      );
      fs.existsSync.mockReturnValue(true);

      const result = hook.processHook({ cwd: '/project', hook_event_name: 'UserPromptSubmit' });
      
      expect(result.hookSpecificOutput.additionalContext).toContain('resumption');
    });
  });
});
