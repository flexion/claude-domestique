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

  describe('getSessionPath', () => {
    it('returns null without a git root or branch', () => {
      expect(hook.getSessionPath(null, 'a')).toBe(null);
      expect(hook.getSessionPath(tmpDir, null)).toBe(null);
    });

    it('defaults to .memento/sessions', () => {
      expect(hook.getSessionPath(tmpDir, 'a/b')).toBe(path.join(tmpDir, '.memento', 'sessions', 'a-b.md'));
    });
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

  // The check used to fire on any command whose text contained "git commit",
  // including a grep searching for those words. It now requires a command
  // position. It is a shape test for an advisory reminder, not a shell parser,
  // and the bounds that follow are the deliberate cost of that.
  describe('invokesGitCommit', () => {
    it.each([
      'git commit -m "test"',
      'git commit',
      '  git   commit  --amend',
      'git -C /repo commit -m "x"',
      'git -c user.name=someone commit',
      'git --no-pager commit',
      '/usr/bin/git commit -m "x"',
      'GIT_AUTHOR_NAME=someone git commit',
      'npm test && git commit -m "x"',
      'git add . ; git commit -m "x"',
      'git status | cat && git commit',
      'git \\\n  commit -m "x"',
      'git commit -m "$(cat <<EOF\nmessage body\nEOF\n)"',
      'git commit -m "document git commit format"',
      'git commit -m "don\'t break"'
    ])('recognizes %s', command => {
      expect(hook.invokesGitCommit(command)).toBe(true);
    });

    it.each([
      "grep -rn 'git commit' .",
      'grep -rn "git commit" docs/',
      'echo "run git commit next"',
      'rg "git commit" --files-with-matches',
      'git log --grep="git commit"',
      'git commit-tree HEAD^{tree}',
      'git status',
      'cat notes.md # git commit',
      // Regression: a separator inside quotes is not a command position. The
      // grep that prompted this change was an alternation, and the suite passed
      // while the detector still fired on it - every grep case here had been
      // written without a `|`.
      'grep -n "additionalContext\\|git commit\\|remind" file.js',
      'grep -E "push|git commit|merge" notes.md',
      "rg -e 'push|git commit' .",
      'echo "a | git commit | b"',
      '',
      undefined,
      null
    ])('does not fire on %s', command => {
      expect(hook.invokesGitCommit(command)).toBe(false);
    });

    // Bounds, recorded so a later change notices if it crosses them. Each costs
    // one unwritten note on a commit that is still free to proceed.
    it.each([
      ['a sudo wrapper', 'sudo git commit'],
      ['an env wrapper', 'env GIT_AUTHOR_NAME=someone git commit'],
      ['a shell keyword', 'if true; then git commit; fi'],
      ['a quoted substitution', 'echo "$(git commit -m x)"']
    ])('does not see a commit launched behind %s', (_label, command) => {
      expect(hook.invokesGitCommit(command)).toBe(false);
    });

    // And the other direction: a command position inside data still reads as
    // one. The cost is an ignored line.
    it.each([
      ['a heredoc body', 'cat <<EOF > notes.md\ngit commit -m "example"\nEOF'],
      ['a trailing comment', 'echo ok # docs; git commit example']
    ])('fires on the words written at a line start inside %s', (_label, command) => {
      expect(hook.invokesGitCommit(command)).toBe(true);
    });
  });

  describe('buildCheckpointReminder for git commit', () => {
    it('does not warn when a grep merely searches for the words', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --show-toplevel')) return tmpDir + '\n';
        if (cmd.includes('rev-parse --abbrev-ref')) return 'feature/test\n';
        throw new Error('Unknown command');
      });

      expect(hook.buildCheckpointReminder({
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: "grep -rn 'git commit' ." },
        cwd: tmpDir
      })).toBeNull();
    });

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
      expect(result).toContain('no session file');
      expect(result).toContain('memento:session create');
      // Plainly conditional, not an order: the commit may legitimately proceed.
      expect(result).not.toMatch(/STOP|MUST/);
    });

    it('finds a session in the default .memento location', () => {
      const dir = path.join(tmpDir, '.memento', 'sessions');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'feature-test.md'), '## Goal\nShip it\n');

      const result = hook.buildCheckpointReminder({
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      });
      // A session that exists and is filled in needs nothing said about it.
      // Silence here is what distinguishes found from missing: a missing
      // session still reports itself.
      expect(result).toBeNull();
    });

    it('finds a session in a configured sessionsDir', () => {
      fs.mkdirSync(path.join(tmpDir, '.memento'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.memento', 'config.json'),
        JSON.stringify({ sessionsDir: 'work/sessions' })
      );
      const dir = path.join(tmpDir, 'work', 'sessions');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'feature-test.md'), '## Goal\nShip it\n');

      const result = hook.buildCheckpointReminder({
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      });
      expect(result).toBeNull();
    });

    it('finds a legacy-only session instead of reporting it missing', () => {
      const dir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'feature-test.md'), '## Goal\nShip it\n');

      const result = hook.buildCheckpointReminder({
        tool_name: 'Bash',
        hook_event_name: 'PreToolUse',
        tool_input: { command: 'git commit -m "test"' },
        cwd: tmpDir
      });
      expect(result).toBeNull();
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
      expect(result).toContain('placeholder text');
      expect(result).toContain('[Describe the objective');
      expect(result).not.toMatch(/STOP|MUST/);
    });

    it('says nothing when the session is valid', () => {
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

      // A filled-in session at a commit is the expected case. It used to inject
      // "Pre-Commit: Session exists. Verify it's updated" on every commit, which
      // told the agent nothing it could act on.
      expect(hook.buildCheckpointReminder(input)).toBeNull();
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

    it('recognizes Codex exec_command input', () => {
      const input = {
        tool_name: 'exec_command',
        hook_event_name: 'PreToolUse',
        tool_input: { cmd: 'git commit -m "test"' },
        cwd: tmpDir
      };
      expect(hook.buildCheckpointReminder(input)).toContain('no session file');
    });

    it('emits the portable hook response envelope', () => {
      const input = {
        tool_name: 'exec_command',
        hook_event_name: 'PreToolUse',
        tool_input: { cmd: 'git commit -m "test"' },
        cwd: tmpDir
      };
      const result = hook.buildHookResponse(input);
      expect(result.hookSpecificOutput.hookEventName).toBe('PreToolUse');
      expect(result.hookSpecificOutput.additionalContext).toContain('no session file');
      expect(result.additionalContext).toBeUndefined();
    });
  });

  describe('Codex tool aliases', () => {
    beforeEach(() => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --show-toplevel')) return tmpDir + '\n';
        if (cmd.includes('rev-parse --abbrev-ref')) return 'feature/test\n';
        throw new Error('Unknown command');
      });
      const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsDir, 'feature-test.md'),
        '## Goal\nImplement feature X\n\n## Next Steps\n1. First step'
      );
    });

    it('recognizes update_plan as a todo checkpoint', () => {
      const result = hook.buildCheckpointReminder({
        tool_name: 'update_plan', hook_event_name: 'PostToolUse', cwd: tmpDir
      });
      expect(result).toContain('Todos updated');
    });

    it('recognizes spawn_agent planning work', () => {
      const result = hook.buildCheckpointReminder({
        tool_name: 'spawn_agent',
        hook_event_name: 'PostToolUse',
        tool_input: { task_name: 'explore' },
        cwd: tmpDir
      });
      expect(result).toContain('agent completed');
    });

    it('recognizes apply_patch as a change checkpoint', () => {
      const result = hook.buildCheckpointReminder({
        tool_name: 'apply_patch', hook_event_name: 'PostToolUse', cwd: tmpDir
      });
      expect(result).toContain('Files changed');
    });
  });
});
