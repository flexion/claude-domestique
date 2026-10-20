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

  describe('session location', () => {
    const branch = 'issue/feature-42/auth';

    function mockGit() {
      mockExecSync.mockImplementation(command =>
        command.includes('--show-toplevel') ? `${tmpDir}\n` : `${branch}\n`
      );
    }

    function start() {
      return hook.processHook(
        { hook_event_name: 'SessionStart', cwd: tmpDir },
        { homeDir: path.join(tmpDir, 'home') }
      );
    }

    function contextOf(result) {
      return result.hookSpecificOutput.additionalContext;
    }

    it('creates a new session under .memento/sessions by default', () => {
      mockGit();
      start();
      expect(fs.existsSync(path.join(tmpDir, '.memento', 'sessions', 'issue-feature-42-auth.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'sessions'))).toBe(false);
    });

    it('creates the session in the configured sessionsDir', () => {
      mockGit();
      fs.mkdirSync(path.join(tmpDir, '.memento'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.memento', 'config.json'),
        JSON.stringify({ sessionsDir: 'work/sessions' })
      );
      start();
      expect(fs.existsSync(path.join(tmpDir, 'work', 'sessions', 'issue-feature-42-auth.md'))).toBe(true);
    });

    it('does not create a duplicate when a legacy session exists', () => {
      mockGit();
      const legacy = path.join(tmpDir, '.claude', 'sessions', 'issue-feature-42-auth.md');
      fs.mkdirSync(path.dirname(legacy), { recursive: true });
      fs.writeFileSync(legacy, '# real notes\n');

      const context = contextOf(start());

      expect(fs.existsSync(path.join(tmpDir, '.memento', 'sessions', 'issue-feature-42-auth.md'))).toBe(false);
      expect(fs.readFileSync(legacy, 'utf8')).toBe('# real notes\n');
      expect(context).toContain(`📂 Session: ${legacy}`);
      expect(context).toContain('legacy location');
      expect(context).toContain(`git -C '${tmpDir}' mv -- `);
      expect(context).toContain('(offer this command verbatim; do not run it unasked)');
    });

    it('injects the branch metadata path', () => {
      mockGit();
      const context = contextOf(start());
      expect(context).toContain(
        `🗂️ Branch metadata: ${path.join(tmpDir, '.memento', 'branches', 'issue-feature-42-auth')}`
      );
    });

    it('injects a warning and uses the default for an invalid config', () => {
      mockGit();
      fs.mkdirSync(path.join(tmpDir, '.memento'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.memento', 'config.json'),
        JSON.stringify({ sessionsDir: '../escape' })
      );
      const context = contextOf(start());
      expect(context).toContain('⚠️ memento: sessionsDir in .memento/config.json must stay inside the repository');
      expect(fs.existsSync(path.join(tmpDir, '.memento', 'sessions', 'issue-feature-42-auth.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '..', 'escape'))).toBe(false);
    });

    it('reports the legacy session on UserPromptSubmit without creating one', () => {
      mockGit();
      const legacy = path.join(tmpDir, '.claude', 'sessions', 'issue-feature-42-auth.md');
      fs.mkdirSync(path.dirname(legacy), { recursive: true });
      fs.writeFileSync(legacy, '# real notes\n');
      const homeDir = path.join(tmpDir, 'home');
      fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(homeDir, '.claude', 'memento-state.json'),
        JSON.stringify({ branch })
      );

      const result = hook.processHook(
        { hook_event_name: 'UserPromptSubmit', cwd: tmpDir, prompt: 'hi' },
        { homeDir }
      );

      expect(contextOf(result)).toContain(`📂 Session: ${legacy}`);
      expect(fs.existsSync(path.join(tmpDir, '.memento', 'sessions'))).toBe(false);
    });

    function seedState(homeDir, savedBranch) {
      fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(homeDir, '.claude', 'memento-state.json'),
        JSON.stringify({ branch: savedBranch })
      );
    }

    it('repeats config warnings on a same-branch UserPromptSubmit', () => {
      mockGit();
      fs.mkdirSync(path.join(tmpDir, '.memento'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.memento', 'config.json'),
        JSON.stringify({ branchesDir: '/abs' })
      );
      const homeDir = path.join(tmpDir, 'home');
      seedState(homeDir, branch);

      const context = contextOf(hook.processHook(
        { hook_event_name: 'UserPromptSubmit', cwd: tmpDir, prompt: 'hi' },
        { homeDir }
      ));

      expect(context).toContain('⚠️ memento: branchesDir in .memento/config.json must be relative to the git root');
      expect(context).not.toContain('🗂️ Branch metadata:');
    });

    it('emits the current session path and metadata path on a branch switch', () => {
      mockGit();
      const homeDir = path.join(tmpDir, 'home');
      seedState(homeDir, 'chore/previous');

      const context = contextOf(hook.processHook(
        { hook_event_name: 'UserPromptSubmit', cwd: tmpDir, prompt: 'hi' },
        { homeDir }
      ));

      expect(context).toContain('Branch Switch Detected');
      expect(context).toContain(
        `📂 Session: ${path.join(tmpDir, '.memento', 'sessions', 'issue-feature-42-auth.md')}`
      );
      expect(context).toContain(
        `🗂️ Branch metadata: ${path.join(tmpDir, '.memento', 'branches', 'issue-feature-42-auth')}`
      );
    });

    it.each([
      ['the git root', '.'],
      ['a nested directory', path.join('src', 'deep')]
    ])('offers a migration command that is quoted and works when run from %s', (_label, relCwd) => {
      // Metacharacters in both the git root and the configured dir must stay inert
      const root = path.join(tmpDir, "repo $(touch PWNED3) 'r'");
      const nastyDir = "work/a b $(touch PWNED) `touch PWNED2` \"q\" it's";
      mockExecSync.mockImplementation(command =>
        command.includes('--show-toplevel') ? `${root}\n` : 'issue/feature-42/auth\n'
      );
      fs.mkdirSync(path.join(root, '.memento'), { recursive: true });
      fs.writeFileSync(
        path.join(root, '.memento', 'config.json'),
        JSON.stringify({ sessionsDir: nastyDir })
      );
      const legacy = path.join(root, '.claude', 'sessions', 'issue-feature-42-auth.md');
      fs.mkdirSync(path.dirname(legacy), { recursive: true });
      fs.writeFileSync(legacy, '# real notes\n');

      const context = contextOf(hook.processHook(
        { hook_event_name: 'SessionStart', cwd: root },
        { homeDir: path.join(tmpDir, 'home') }
      ));
      const command = context.match(/Offer to move it: `(.+)`/)[1];
      expect(command).toContain(' mv -- ');

      // Execute the offered command for real, in a real git repo, from the given cwd
      const real = jest.requireActual('child_process');
      real.execFileSync('git', ['init', '-q'], { cwd: root });
      real.execFileSync('git', ['add', '--', '.claude/sessions/issue-feature-42-auth.md'], { cwd: root });
      const runFrom = path.join(root, relCwd);
      fs.mkdirSync(runFrom, { recursive: true });
      real.execFileSync('/bin/sh', ['-c', command], { cwd: runFrom });

      expect(fs.existsSync(path.join(root, nastyDir, 'issue-feature-42-auth.md'))).toBe(true);
      expect(fs.existsSync(legacy)).toBe(false);
      if (relCwd !== '.') expect(fs.existsSync(path.join(runFrom, 'work'))).toBe(false);
      for (const dir of [tmpDir, root, runFrom]) {
        for (const marker of ['PWNED', 'PWNED2', 'PWNED3']) {
          expect(fs.existsSync(path.join(dir, marker))).toBe(false);
        }
      }
    });
  });

  describe('session search across locations', () => {
    it('finds possible sessions in both the configured and legacy dirs', () => {
      const configured = path.join(tmpDir, '.memento', 'sessions');
      const legacy = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(configured, { recursive: true });
      fs.mkdirSync(legacy, { recursive: true });
      fs.writeFileSync(path.join(configured, '42-new.md'), '');
      fs.writeFileSync(path.join(legacy, '42-old.md'), '');

      const result = hook.findPossibleSessions(tmpDir, 'issue/feature-42/x', configured);
      expect(result.map(r => r.location).sort()).toEqual([
        path.join('.claude', 'sessions', '42-old.md'),
        path.join('.memento', 'sessions', '42-new.md')
      ]);
    });

    it('deduplicates search dirs when configured dir is the legacy dir', () => {
      const legacy = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(legacy, { recursive: true });
      fs.writeFileSync(path.join(legacy, '42-old.md'), '');

      const result = hook.findPossibleSessions(tmpDir, 'issue/feature-42/x', legacy);
      expect(result).toHaveLength(1);
    });

    it('detects a misnamed legacy session from the configured location', () => {
      const legacy = path.join(tmpDir, '.claude', 'sessions');
      fs.mkdirSync(legacy, { recursive: true });
      fs.writeFileSync(path.join(legacy, 'old-name.md'), '**Branch**: issue/feature-42/test\n');
      const expected = path.join(tmpDir, '.memento', 'sessions', 'issue-feature-42-test.md');

      const result = hook.detectMismatch(tmpDir, 'issue/feature-42/test', expected);
      expect(result.currentName).toBe('old-name.md');
      expect(result.path).toBe(path.join(legacy, 'old-name.md'));
    });

    it('labels possible matches with their location in switch context', () => {
      const context = hook.buildSwitchContext(
        '/r/.memento/sessions/x.md', false,
        [{ file: '42-old.md', location: '.claude/sessions/42-old.md', score: 10 }],
        'issue/feature-42/x'
      );
      expect(context).toContain('.claude/sessions/42-old.md (score: 10)');
    });
  });

  describe('isolated state paths', () => {
    it('threads an injected home through shared counters and branch state', () => {
      const defaultHome = path.join(tmpDir, 'default-home');
      const isolatedHome = path.join(tmpDir, 'isolated-home');
      const homedir = jest.spyOn(os, 'homedir').mockReturnValue(defaultHome);
      jest.resetModules();
      jest.doMock('child_process', () => ({ execSync: mockExecSync }));
      hook = require('../session-startup.js');
      mockExecSync.mockImplementation(command =>
        command.includes('--show-toplevel') ? `${tmpDir}\n` : 'issue/feature-42/auth\n'
      );
      const session = path.join(tmpDir, '.claude', 'sessions', 'issue-feature-42-auth.md');
      fs.mkdirSync(path.dirname(session), { recursive: true });
      fs.writeFileSync(session, '# existing\n');

      hook.processHook(
        { hook_event_name: 'SessionStart', cwd: tmpDir },
        { homeDir: isolatedHome }
      );

      expect(JSON.parse(fs.readFileSync(
        path.join(isolatedHome, '.claude', 'memento-state.json'),
        'utf8'
      ))).toEqual({ count: 0, branch: 'issue/feature-42/auth' });
      expect(fs.existsSync(path.join(defaultHome, '.claude', 'memento-state.json'))).toBe(false);
      homedir.mockRestore();
    });
  });
});
