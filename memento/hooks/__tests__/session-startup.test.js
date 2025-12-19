const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
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
      assert.strictEqual(result, 'Fixed edge case bug');
    });

    it('strips bullet markers from log entries', () => {
      const content = `## Session Log
* First entry
* Second entry
## Next Steps
`;
      const result = extractLastLogEntry(content);
      assert.strictEqual(result, 'Second entry');
    });

    it('returns null when no session log section exists', () => {
      const content = `# Session: test
## Next Steps
- Do something
`;
      const result = extractLastLogEntry(content);
      assert.strictEqual(result, null);
    });

    it('returns null when session log is empty', () => {
      const content = `## Session Log

## Next Steps
`;
      const result = extractLastLogEntry(content);
      assert.strictEqual(result, null);
    });

    it('skips empty bullet lines', () => {
      const content = `## Session Log
- Real entry
-
-
## Next Steps
`;
      const result = extractLastLogEntry(content);
      assert.strictEqual(result, 'Real entry');
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
      assert.ok(result.includes('First step'));
      assert.ok(result.includes('Second step'));
    });

    it('returns null when no next steps section exists', () => {
      const content = `## Session Log
- did stuff
`;
      const result = extractNextSteps(content);
      assert.strictEqual(result, null);
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
      assert.ok(result.displayMsg.includes('📍 Memento:'));
      assert.ok(result.displayMsg.includes('123-add-auth'));
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
      assert.ok(result.context.includes('Branch: feature/new-dashboard'));
      assert.ok(result.context.includes('Status: in-progress'));
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
      assert.ok(result.context.includes('Issue: #456'));
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
      assert.ok(result.context.includes('Left off: Added user validation'));
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
      assert.ok(result.context.includes('Next: Implement feature'));
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

      assert.ok(result.systemMessage.includes('📍 Memento:'));
      assert.ok(result.systemMessage.includes('No active session'));
      assert.ok(result.hookSpecificOutput.additionalContext.includes('/session'));
    });

    it('explains what sessions are for when no session exists', () => {
      const result = processSessionStart(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );

      assert.ok(result.hookSpecificOutput.additionalContext.includes('track work context'));
      assert.ok(result.hookSpecificOutput.additionalContext.includes('resume where you left off'));
    });

    it('resets interaction counter on session start', () => {
      // Pre-populate state with a count
      fs.writeFileSync(stateFile, JSON.stringify({ count: 5 }));

      processSessionStart(
        { cwd: tempDir, hook_event_name: 'SessionStart' },
        { stateFile }
      );

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      assert.strictEqual(state.count, 0);
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

        assert.ok(result.systemMessage.includes('📍 Memento:'));
        assert.ok(result.systemMessage.includes('123-add-auth'));
        assert.ok(result.hookSpecificOutput.additionalContext.includes('issue/feature-123/add-auth'));
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
      assert.ok(result.includes('/project/.claude/sessions/123-feature.md'));
    });

    it('mentions Session Log section', () => {
      const info = {
        session: { path: '/project/.claude/sessions/test.md' }
      };
      const result = buildUpdatePrompt(info);
      assert.ok(result.includes('Session Log'));
    });

    it('mentions Files Changed section', () => {
      const info = {
        session: { path: '/project/.claude/sessions/test.md' }
      };
      const result = buildUpdatePrompt(info);
      assert.ok(result.includes('Files Changed'));
    });

    it('mentions Next Steps section', () => {
      const info = {
        session: { path: '/project/.claude/sessions/test.md' }
      };
      const result = buildUpdatePrompt(info);
      assert.ok(result.includes('Next Steps'));
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
      assert.strictEqual(state.count, 1);
    });

    it('wraps counter at updateInterval', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 9 }));

      processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      assert.strictEqual(state.count, 0);
    });

    it('returns no-session status when no session exists', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 0 }));

      const result = processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      // Should show Memento branding with no-session status (like other plugins)
      assert.ok(result.systemMessage.includes('Memento'));
      assert.ok(result.systemMessage.includes('No session'));
      assert.strictEqual(result.hookSpecificOutput.additionalContext, '');
    });

    it('returns empty context when not at update interval', () => {
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

      // Count at 5, interval at 10 - should not prompt
      fs.writeFileSync(stateFile, JSON.stringify({ count: 5 }));

      const result = processUserPromptSubmit(
        { cwd: tempDir, hook_event_name: 'UserPromptSubmit' },
        { stateFile, updateInterval: 10 }
      );

      assert.strictEqual(result.hookSpecificOutput.additionalContext, '');
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

      assert.ok(result.hookSpecificOutput.additionalContext.includes('Session Update Reminder'));
      assert.ok(result.hookSpecificOutput.additionalContext.includes('feature-test.md'));
    });
  });
});
