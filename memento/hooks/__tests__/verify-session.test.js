const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const {
  processPreToolUse,
  sessionExists,
  isAllowedPath,
  isFeatureBranch,
  ALLOWED_PATHS
} = require('../verify-session.js');

describe('verify-session.js', () => {
  describe('isFeatureBranch', () => {
    it('returns false for main branch', () => {
      assert.strictEqual(isFeatureBranch('main'), false);
    });

    it('returns false for master branch', () => {
      assert.strictEqual(isFeatureBranch('master'), false);
    });

    it('returns false for HEAD (detached)', () => {
      assert.strictEqual(isFeatureBranch('HEAD'), false);
    });

    it('returns false for null', () => {
      assert.strictEqual(isFeatureBranch(null), false);
    });

    it('returns true for feature branches', () => {
      assert.strictEqual(isFeatureBranch('feature/add-auth'), true);
      assert.strictEqual(isFeatureBranch('issue/fix-123/bug'), true);
      assert.strictEqual(isFeatureBranch('chore/update-deps'), true);
    });
  });

  describe('isAllowedPath', () => {
    const cwd = '/project';

    it('allows session files', () => {
      assert.strictEqual(isAllowedPath('/project/.claude/sessions/123-auth.md', cwd), true);
    });

    it('allows branch metadata files', () => {
      assert.strictEqual(isAllowedPath('/project/.claude/branches/feature-auth', cwd), true);
    });

    it('allows context files', () => {
      assert.strictEqual(isAllowedPath('/project/.claude/context/project.yml', cwd), true);
    });

    it('allows CLAUDE.md', () => {
      assert.strictEqual(isAllowedPath('/project/CLAUDE.md', cwd), true);
    });

    it('allows package.json', () => {
      assert.strictEqual(isAllowedPath('/project/package.json', cwd), true);
    });

    it('allows README.md', () => {
      assert.strictEqual(isAllowedPath('/project/README.md', cwd), true);
    });

    it('blocks source files', () => {
      assert.strictEqual(isAllowedPath('/project/src/index.js', cwd), false);
      assert.strictEqual(isAllowedPath('/project/tools/session.js', cwd), false);
    });

    it('blocks test files', () => {
      assert.strictEqual(isAllowedPath('/project/tests/unit.test.js', cwd), false);
    });
  });

  describe('sessionExists', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-verify-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns false when no session file exists', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(path.join(claudeDir, 'sessions'), { recursive: true });

      const branchInfo = {
        branchMetaFile: 'feature-test',
        sessionFile: 'feature-test.md'
      };

      assert.strictEqual(sessionExists(tempDir, branchInfo), false);
    });

    it('returns true when session file exists via metadata', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file
      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');

      // Create branch metadata pointing to session
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-auth'),
        'session: 123-auth.md\nstatus: in-progress'
      );

      const branchInfo = {
        branchMetaFile: 'issue-feature-123-auth',
        sessionFile: '123-auth.md'
      };

      assert.strictEqual(sessionExists(tempDir, branchInfo), true);
    });

    it('returns true when session file exists via fallback path', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      // Create session file (no metadata)
      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session');

      const branchInfo = {
        branchMetaFile: 'feature-test',
        sessionFile: 'feature-test.md'
      };

      assert.strictEqual(sessionExists(tempDir, branchInfo), true);
    });
  });

  describe('processPreToolUse', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-pretool-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('approves non-Edit/Write tools', () => {
      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: { file_path: '/project/src/index.js' }
      });

      assert.strictEqual(result.decision, 'approve');
    });

    it('approves Edit when no .claude directory exists', () => {
      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      assert.strictEqual(result.decision, 'approve');
    });

    it('approves Edit when editing allowed paths', () => {
      // Set up .claude directory
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, '.claude/sessions/test.md') }
      });

      assert.strictEqual(result.decision, 'approve');
    });

    it('approves Edit on main branch without session', () => {
      // Set up .claude directory
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on main
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      assert.strictEqual(result.decision, 'approve');
    });

    it('approves Edit on feature branch with session', () => {
      // Set up .claude directory with session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file
      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');

      // Create branch metadata
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-auth'),
        'session: 123-auth.md\nstatus: in-progress'
      );

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b issue/feature-123/auth', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      assert.strictEqual(result.decision, 'approve');
    });

    it('blocks Edit on feature branch without session', () => {
      // Set up .claude directory (no session)
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/new-feature', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      assert.strictEqual(result.decision, 'block');
      assert.ok(result.reason.includes('Session Required'));
      assert.ok(result.reason.includes('feature/new-feature'));
      assert.ok(result.reason.includes('create-session.js'));
    });

    it('blocks Write on feature branch without session', () => {
      // Set up .claude directory (no session)
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/new-feature', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { file_path: path.join(tempDir, 'src/new-file.js') }
      });

      assert.strictEqual(result.decision, 'block');
      assert.ok(result.reason.includes('Session Required'));
    });

    it('includes helpful instructions in block message', () => {
      // Set up .claude directory (no session)
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      assert.ok(result.reason.includes('/session'));
      assert.ok(result.reason.includes('work context is preserved'));
    });
  });
});
