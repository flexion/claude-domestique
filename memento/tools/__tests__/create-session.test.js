const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('create-session.js', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-session-test-'));

    // Initialize git repo in temp dir
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

    // Create initial commit so we can create branches
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });

    // Copy tools to temp dir (from plugin root tools/ to consumer's .claude/tools/)
    const toolsDir = path.join(tempDir, '.claude/tools');
    fs.mkdirSync(toolsDir, { recursive: true });
    fs.copyFileSync(
      path.join(originalCwd, 'tools/session.js'),
      path.join(toolsDir, 'session.js')
    );
    fs.copyFileSync(
      path.join(originalCwd, 'tools/create-session.js'),
      path.join(toolsDir, 'create-session.js')
    );

    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createSession', () => {
    it('creates session and metadata for GitHub issue branch', () => {
      // Create and checkout feature branch
      execSync('git checkout -b issue/feature-123/add-auth', { cwd: tempDir, stdio: 'pipe' });

      // Run create-session
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      // Verify files created
      const sessionPath = path.join(tempDir, '.claude/sessions/123-add-auth.md');
      const metaPath = path.join(tempDir, '.claude/branches/issue-feature-123-add-auth');

      assert.ok(fs.existsSync(sessionPath), 'Session file should exist');
      assert.ok(fs.existsSync(metaPath), 'Branch metadata should exist');

      // Verify session content
      const sessionContent = fs.readFileSync(sessionPath, 'utf-8');
      assert.ok(sessionContent.includes('# Session: add-auth'));
      assert.ok(sessionContent.includes('#123'));

      // Verify metadata content
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      assert.ok(metaContent.includes('branch: issue/feature-123/add-auth'));
      assert.ok(metaContent.includes('session: 123-add-auth.md'));
      assert.ok(metaContent.includes('type: feature'));
      assert.ok(metaContent.includes('status: in-progress'));
    });

    it('creates session for simple chore branch', () => {
      execSync('git checkout -b chore/update-deps', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const sessionPath = path.join(tempDir, '.claude/sessions/chore-update-deps.md');
      const metaPath = path.join(tempDir, '.claude/branches/chore-update-deps');

      assert.ok(fs.existsSync(sessionPath), 'Session file should exist');
      assert.ok(fs.existsSync(metaPath), 'Branch metadata should exist');

      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      assert.ok(metaContent.includes('type: chore'));
    });

    it('creates session for Jira branch', () => {
      execSync('git checkout -b feature/PROJ-456/new-feature', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const sessionPath = path.join(tempDir, '.claude/sessions/PROJ-456-new-feature.md');
      assert.ok(fs.existsSync(sessionPath), 'Session file should exist');
    });

    it('fails on main/master branch', () => {
      // Get current default branch (could be main or master)
      const defaultBranch = execSync('git branch --show-current', {
        cwd: tempDir,
        encoding: 'utf-8',
      }).trim();

      // Make sure we're on the default branch
      execSync(`git checkout ${defaultBranch}`, { cwd: tempDir, stdio: 'pipe' });

      try {
        execSync('node .claude/tools/create-session.js', {
          cwd: tempDir,
          stdio: 'pipe',
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.status === 1);
      }
    });

    it('fails if session already exists without --force', () => {
      execSync('git checkout -b issue/feature-789/test', { cwd: tempDir, stdio: 'pipe' });

      // Create session first time
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      // Try to create again without --force
      try {
        execSync('node .claude/tools/create-session.js', {
          cwd: tempDir,
          stdio: 'pipe',
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.status === 1);
      }
    });

    it('overwrites with --force flag', () => {
      execSync('git checkout -b issue/feature-111/test', { cwd: tempDir, stdio: 'pipe' });

      // Create session first time
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      // Modify the session file
      const sessionPath = path.join(tempDir, '.claude/sessions/111-test.md');
      fs.writeFileSync(sessionPath, 'modified content');

      // Create again with --force
      execSync('node .claude/tools/create-session.js --force', { cwd: tempDir, stdio: 'pipe' });

      // Verify it was overwritten
      const content = fs.readFileSync(sessionPath, 'utf-8');
      assert.ok(content.includes('# Session:'), 'Should be regenerated template');
      assert.ok(!content.includes('modified content'), 'Should not have old content');
    });
  });
});
