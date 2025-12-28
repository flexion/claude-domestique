const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock child_process before requiring the module
const mockExecSync = jest.fn();
jest.mock('child_process', () => ({
  execSync: mockExecSync
}));

describe('checkpoint.js', () => {
  let hook;
  let tmpDir;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-test-'));
    jest.resetModules();
    jest.doMock('child_process', () => ({
      execSync: mockExecSync
    }));
    hook = require('../checkpoint.js');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('validateSessionFile', () => {
    it('returns missing when file does not exist', () => {
      const result = hook.validateSessionFile('/nonexistent/path.md');
      expect(result).toEqual({ valid: false, issue: 'missing' });
    });

    it('returns missing when path is null', () => {
      const result = hook.validateSessionFile(null);
      expect(result).toEqual({ valid: false, issue: 'missing' });
    });

    it('detects [Describe the objective placeholder', () => {
      const sessionPath = path.join(tmpDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Goal
[Describe the objective here]

## Next Steps
1. First task
`);
      const result = hook.validateSessionFile(sessionPath);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('placeholders');
      expect(result.pattern).toContain('[Describe the objective');
    });

    it('detects [First task placeholder', () => {
      const sessionPath = path.join(tmpDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Goal
Implement feature X

## Next Steps
1. [First task here]
2. Second task
`);
      const result = hook.validateSessionFile(sessionPath);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('placeholders');
      expect(result.pattern).toContain('[First task');
    });

    it('detects Goal followed by bracket placeholder', () => {
      const sessionPath = path.join(tmpDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Goal

[Something here]

## Next Steps
1. Do the thing
`);
      const result = hook.validateSessionFile(sessionPath);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('placeholders');
    });

    it('returns valid for properly filled session', () => {
      const sessionPath = path.join(tmpDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session: chore/my-feature

**Branch:** chore/my-feature
**Type:** Chore
**Status:** in-progress

## Goal

Implement the session validation feature.

## Session Log

- Started work on the feature
- Added validateSessionFile function

## Next Steps

1. Add tests
2. Run test suite
3. Create PR
`);
      const result = hook.validateSessionFile(sessionPath);
      expect(result).toEqual({ valid: true });
    });

    it('detects [Record key architectural placeholder', () => {
      const sessionPath = path.join(tmpDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Key Decisions
[Record key architectural decisions here]

## Goal
Do something
`);
      const result = hook.validateSessionFile(sessionPath);
      expect(result.valid).toBe(false);
      expect(result.pattern).toContain('[Record key architectural');
    });
  });

  describe('buildCheckpointReminder for git commit', () => {
    beforeEach(() => {
      // Setup git mocks
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --show-toplevel')) return tmpDir + '\n';
        if (cmd.includes('rev-parse --abbrev-ref')) return 'feature/test\n';
        throw new Error('Unknown command');
      });
    });

    it('warns when no session file exists', () => {
      const input = {
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      };

      const result = hook.buildCheckpointReminder(input);
      expect(result).toContain('STOP');
      expect(result).toContain('No session file found');
    });

    it('warns when session has placeholders', () => {
      // Create session with placeholders
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsDir, 'feature-test.md'),
        '## Goal\n[Describe the objective here]'
      );

      const input = {
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      };

      const result = hook.buildCheckpointReminder(input);
      expect(result).toContain('STOP');
      expect(result).toContain('placeholder text');
      expect(result).toContain('[Describe the objective');
    });

    it('provides normal reminder when session is valid', () => {
      // Create properly filled session
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsDir, 'feature-test.md'),
        '## Goal\nImplement feature X\n\n## Next Steps\n1. First step'
      );

      const input = {
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      };

      const result = hook.buildCheckpointReminder(input);
      expect(result).toContain('Pre-Commit');
      expect(result).toContain('Session exists');
      expect(result).not.toContain('STOP');
    });

    it('returns null when on main branch', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --show-toplevel')) return tmpDir + '\n';
        if (cmd.includes('rev-parse --abbrev-ref')) return 'main\n';
        throw new Error('Unknown command');
      });

      const input = {
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      };

      const result = hook.buildCheckpointReminder(input);
      expect(result).toBe(null);
    });
  });
});
