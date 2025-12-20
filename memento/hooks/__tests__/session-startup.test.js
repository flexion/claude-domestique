const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  extractLastLogEntry,
  extractNextSteps,
  buildSessionSummary,
  buildUpdatePrompt,
  processSessionStart,
  processUserPromptSubmit,
  processHook,
  loadState,
  saveState,
  loadProjectConfig,
  getSessionInfo,
  parseCliInput,
  DEFAULT_CONFIG
} = require('../session-startup.js');

describe('session-startup.js', () => {
  describe('extractLastLogEntry', () => {
    it('extracts last log entry from session content', () => {
      const content = `# Session: test
## Session Log
- Started implementation
- Added validation
- Fixed edge case bug
## Next Steps
`;
      const result = extractLastLogEntry(content);
      expect(result).toBe('Fixed edge case bug');
    });

    it('strips bullet markers from log entries', () => {
      const content = `## Session Log
* First entry
* Second entry
## Next Steps
`;
      const result = extractLastLogEntry(content);
      expect(result).toBe('Second entry');
    });

    it('returns null when no session log section exists', () => {
      const content = `# Session: test
## Next Steps
- Do something
`;
      const result = extractLastLogEntry(content);
      expect(result).toBe(null);
    });

    it('returns null when session log is empty', () => {
      const content = `## Session Log

## Next Steps
`;
      const result = extractLastLogEntry(content);
      expect(result).toBe(null);
    });

    it('skips empty bullet lines', () => {
      const content = `## Session Log
- Real entry
-
-
## Next Steps
`;
      const result = extractLastLogEntry(content);
      expect(result).toBe('Real entry');
    });
  });

  describe('extractNextSteps', () => {
    it('extracts next steps from session content', () => {
      const content = `## Session Log
- did stuff
## Next Steps
- First step
- Second step
- Third step
`;
      const result = extractNextSteps(content);
      expect(result).toContain('First step');
      expect(result).toContain('Second step');
    });

    it('returns null when no next steps section exists', () => {
      const content = `## Session Log
- did stuff
`;
      const result = extractNextSteps(content);
      expect(result).toBe(null);
    });
  });

  describe('buildSessionSummary', () => {
    it('returns displayMsg with Memento branding and session name', () => {
      const info = {
        branch: 'issue/feature-123/add-auth',
        branchInfo: { type: 'feature', issueId: '#123' },
        session: { path: '/project/.claude/sessions/123-add-auth.md' },
        status: 'in-progress',
        lastLogEntry: 'Implemented login endpoint',
        nextSteps: '- Add tests\n- Update docs'
      };
      const result = buildSessionSummary(info);
      expect(result.displayMsg).toContain('📍 Memento:');
      expect(result.displayMsg).toContain('123-add-auth');
    });

    it('shows branch and status in context', () => {
      const info = {
        branch: 'feature/new-dashboard',
        branchInfo: { type: 'feature', issueId: null },
        session: { path: '/project/.claude/sessions/feature-new-dashboard.md' },
        status: 'in-progress',
        lastLogEntry: null,
        nextSteps: null
      };
      const result = buildSessionSummary(info);
      expect(result.context).toContain('Branch: feature/new-dashboard');
      expect(result.context).toContain('Status: in-progress');
    });

    it('includes issue ID in context when present', () => {
      const info = {
        branch: 'issue/fix-456/login-bug',
        branchInfo: { type: 'fix', issueId: '#456' },
        session: { path: '/project/.claude/sessions/456-login-bug.md' },
        status: 'in-progress',
        lastLogEntry: null,
        nextSteps: null
      };
      const result = buildSessionSummary(info);
      expect(result.context).toContain('Issue: #456');
    });

    it('shows "Left off" in context when lastLogEntry exists', () => {
      const info = {
        branch: 'feature/test',
        branchInfo: { type: 'feature', issueId: null },
        session: { path: '/project/.claude/sessions/feature-test.md' },
        status: 'in-progress',
        lastLogEntry: 'Added user validation',
        nextSteps: '- Write tests'
      };
      const result = buildSessionSummary(info);
      expect(result.context).toContain('Left off: Added user validation');
    });

    it('shows "Next" in context when no lastLogEntry but nextSteps exists', () => {
      const info = {
        branch: 'feature/test',
        branchInfo: { type: 'feature', issueId: null },
        session: { path: '/project/.claude/sessions/feature-test.md' },
        status: 'in-progress',
        lastLogEntry: null,
        nextSteps: '- Implement feature\n- Add tests'
      };
      const result = buildSessionSummary(info);
      expect(result.context).toContain('Next: Implement feature');
    });
  });

  describe('processSessionStart', () => {
    let tempDir;
    let stateFile;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-test-'));
      stateFile = path.join(tempDir, 'state.json');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns Memento no-session message when no session exists', () => {
      const result = processSessionStart(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );

      expect(result.systemMessage).toContain('📍 Memento:');
      expect(result.systemMessage).toContain('No active session');
      expect(result.hookSpecificOutput.additionalContext).toContain('/session');
    });

    it('shows branch name when on feature branch without session', () => {
      // Create .claude directory but no session
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(path.join(claudeDir, 'sessions'), { recursive: true });

      // Initialize git on feature branch
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/no-session-test', { cwd: tempDir, stdio: 'pipe' });

      const result = processSessionStart(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );

      expect(result.systemMessage).toContain('No session for branch');
      expect(result.systemMessage).toContain('feature/no-session-test');
    });

    it('explains what sessions are for when no session exists', () => {
      const result = processSessionStart(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );

      expect(result.hookSpecificOutput.additionalContext).toContain('track work context');
      expect(result.hookSpecificOutput.additionalContext).toContain('resume where you left off');
    });

    it('resets interaction counter on session start', () => {
      // Pre-populate state with a count
      fs.writeFileSync(stateFile, JSON.stringify({ count: 5 }));

      processSessionStart(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(0);
    });

    it('returns session summary when session exists', () => {
      // Set up .claude directory structure with session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file
      const sessionContent = `# Session: add-auth
## Session Log
- Started work
## Next Steps
- Continue implementation
`;
      fs.writeFileSync(path.join(sessionsDir, '123-add-auth.md'), sessionContent);

      // Create branch metadata
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-add-auth'),
        'session: 123-add-auth.md\nstatus: in-progress'
      );

      // Mock git to return our branch name
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      // Initialize git repo with the branch (need a commit for HEAD to be valid)
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b issue/feature-123/add-auth', { cwd: tempDir, stdio: 'pipe' });

      try {
        const result = processSessionStart(
          { cwd: tempDir, hook_event_name: 'SessionStart' },
          { stateFile }
        );

        expect(result.systemMessage).toContain('📍 Memento:');
        expect(result.systemMessage).toContain('123-add-auth');
        expect(result.hookSpecificOutput.additionalContext).toContain('issue/feature-123/add-auth');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('buildUpdatePrompt', () => {
    it('includes session path in prompt', () => {
      const info = {
        session: { path: '/project/.claude/sessions/123-feature.md' }
      };
      const result = buildUpdatePrompt(info);
      expect(result).toContain('/project/.claude/sessions/123-feature.md');
    });

    it('mentions Session Log section', () => {
      const info = {
        session: { path: '/project/.claude/sessions/test.md' }
      };
      const result = buildUpdatePrompt(info);
      expect(result).toContain('Session Log');
    });

    it('mentions Files Changed section', () => {
      const info = {
        session: { path: '/project/.claude/sessions/test.md' }
      };
      const result = buildUpdatePrompt(info);
      expect(result).toContain('Files Changed');
    });

    it('mentions Next Steps section', () => {
      const info = {
        session: { path: '/project/.claude/sessions/test.md' }
      };
      const result = buildUpdatePrompt(info);
      expect(result).toContain('Next Steps');
    });
  });

  describe('loadProjectConfig', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-config-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns empty object when config file does not exist', () => {
      const result = loadProjectConfig(tempDir, '.claude/config.json');
      expect(result).toEqual({});
    });

    it('returns updateInterval from config when present', () => {
      const configDir = path.join(tempDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ session: { updateInterval: 15 } })
      );

      const result = loadProjectConfig(tempDir, '.claude/config.json');
      expect(result.updateInterval).toBe(15);
    });

    it('returns empty object when config has no session key', () => {
      const configDir = path.join(tempDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ other: 'value' })
      );

      const result = loadProjectConfig(tempDir, '.claude/config.json');
      expect(result).toEqual({});
    });

    it('returns empty object when config is invalid JSON', () => {
      const configDir = path.join(tempDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'config.json'), 'not valid json');

      const result = loadProjectConfig(tempDir, '.claude/config.json');
      expect(result).toEqual({});
    });
  });

  describe('loadState and saveState', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-state-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('loadState returns default when file does not exist', () => {
      const stateFile = path.join(tempDir, 'nonexistent.json');
      const result = loadState(stateFile);
      expect(result).toEqual({ count: 0 });
    });

    it('loadState returns default when file is invalid JSON', () => {
      const stateFile = path.join(tempDir, 'bad.json');
      fs.writeFileSync(stateFile, 'not json');
      const result = loadState(stateFile);
      expect(result).toEqual({ count: 0 });
    });

    it('saveState creates directory if needed', () => {
      const stateFile = path.join(tempDir, 'subdir', 'state.json');
      saveState(stateFile, { count: 5 });

      expect(fs.existsSync(stateFile)).toBe(true);
      const content = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(content.count).toBe(5);
    });

    it('loadState reads saved state', () => {
      const stateFile = path.join(tempDir, 'state.json');
      fs.writeFileSync(stateFile, JSON.stringify({ count: 7 }));

      const result = loadState(stateFile);
      expect(result.count).toBe(7);
    });
  });

  describe('processHook', () => {
    let tempDir;
    let stateFile;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-hook-test-'));
      stateFile = path.join(tempDir, 'state.json');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('routes SessionStart to processSessionStart', () => {
      const result = processHook(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('routes UserPromptSubmit to processUserPromptSubmit', () => {
      const result = processHook(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile }
      );
      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });

    it('defaults to UserPromptSubmit when no event name', () => {
      const result = processHook({ cwd: tempDir }, { stateFile });
      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });
  });

  describe('getSessionInfo', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-info-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns null when .claude directory does not exist', () => {
      const result = getSessionInfo(tempDir);
      expect(result).toBeNull();
    });

    it('returns null when on main branch', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      // Initialize git on main
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });

      const result = getSessionInfo(tempDir);
      expect(result).toBeNull();
    });

    it('returns null when session file does not exist', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(path.join(claudeDir, 'sessions'), { recursive: true });

      // Initialize git on feature branch
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      const result = getSessionInfo(tempDir);
      expect(result).toBeNull();
    });

    it('returns session via fallback path when no branch metadata exists', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      // Create session file at guessed path (no metadata)
      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session');

      // Initialize git on feature branch
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      const result = getSessionInfo(tempDir);
      expect(result).not.toBeNull();
      expect(result.session.path).toContain('feature-test.md');
      expect(result.session.meta).toBeNull(); // No metadata file exists
    });

    it('returns session via fallback path with meta when metadata exists but session field missing', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file at guessed path
      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session');

      // Create metadata without session field
      fs.writeFileSync(path.join(branchesDir, 'feature-test'), 'status: in-progress\n');

      // Initialize git on feature branch
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      const result = getSessionInfo(tempDir);
      expect(result).not.toBeNull();
      expect(result.session.path).toContain('feature-test.md');
      expect(result.session.meta).toBeDefined(); // Metadata exists but without session field
      expect(result.session.meta.status).toBe('in-progress');
    });
  });

  describe('processUserPromptSubmit', () => {
    let tempDir;
    let stateFile;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-prompt-test-'));
      stateFile = path.join(tempDir, 'state.json');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('increments interaction counter', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 0 }));

      processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(1);
    });

    it('wraps counter at updateInterval', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 9 }));

      processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(0);
    });

    it('returns no-session status when no session exists', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 0 }));

      const result = processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      // Should show Memento branding with no-session status (like other plugins)
      expect(result.systemMessage).toContain('Memento');
      expect(result.systemMessage).toContain('No session');
      expect(result.hookSpecificOutput.additionalContext).toBe('');
    });

    it('returns no-session status with branch name when on feature branch', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 0 }));

      // Set up .claude directory
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(path.join(claudeDir, 'sessions'), { recursive: true });

      // Initialize git on feature branch
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/my-feature', { cwd: tempDir, stdio: 'pipe' });

      const result = processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      // Should include branch name in no-session message
      expect(result.systemMessage).toContain('Memento');
      expect(result.systemMessage).toContain('No session');
      expect(result.systemMessage).toContain('feature/my-feature');
    });

    it('returns session guidance when not at update interval', () => {
      // Set up session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session\n## Session Log\n## Next Steps');
      fs.writeFileSync(path.join(branchesDir, 'feature-test'), 'session: feature-test.md');

      // Initialize git (need a commit for HEAD to be valid)
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      // Count at 5, interval at 10 - should not prompt for update but should include session guidance
      fs.writeFileSync(stateFile, JSON.stringify({ count: 5 }));

      const result = processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      // Should always include session path and resumption guidance
      expect(result.hookSpecificOutput.additionalContext).toContain('Session:');
      expect(result.hookSpecificOutput.additionalContext).toContain('feature-test.md');
      expect(result.hookSpecificOutput.additionalContext).toContain('Read session file FIRST');
      // Should NOT include update prompt since not at interval
      expect(result.hookSpecificOutput.additionalContext).not.toContain('Session Update Reminder');
    });

    it('returns update prompt when at update interval with session', () => {
      // Set up session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session\n## Session Log\n## Next Steps');
      fs.writeFileSync(path.join(branchesDir, 'feature-test'), 'session: feature-test.md');

      // Initialize git (need a commit for HEAD to be valid)
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      // Count at 9, interval at 10 - next call wraps to 0 and prompts
      fs.writeFileSync(stateFile, JSON.stringify({ count: 9 }));

      const result = processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      expect(result.hookSpecificOutput.additionalContext).toContain('Session Update Reminder');
      expect(result.hookSpecificOutput.additionalContext).toContain('feature-test.md');
    });
  });

  describe('parseCliInput', () => {
    it('parses valid JSON input', () => {
      const input = JSON.stringify({ cwd: '/test', hook_event_name: 'SessionStart' });
      const result = parseCliInput(input);
      expect(result.cwd).toBe('/test');
      expect(result.hook_event_name).toBe('SessionStart');
    });

    it('returns default on invalid JSON', () => {
      const result = parseCliInput('not valid json');
      expect(result.hook_event_name).toBe('SessionStart');
      expect(result.cwd).toBe(process.cwd());
    });

    it('returns default on empty string', () => {
      const result = parseCliInput('');
      expect(result.hook_event_name).toBe('SessionStart');
    });

    it('uses custom default event', () => {
      const result = parseCliInput('invalid', 'CustomEvent');
      expect(result.hook_event_name).toBe('CustomEvent');
    });
  });
});
