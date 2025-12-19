const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('get-session.js', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-session-test-'));

    // Initialize git repo in temp dir
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

    // Create initial commit
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
      path.join(originalCwd, 'tools/get-session.js'),
      path.join(toolsDir, 'get-session.js')
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

  describe('getSession', () => {
    it('returns session info in default format', () => {
      // Create branch and session
      execSync('git checkout -b issue/feature-123/test-feature', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      // Get session
      const output = execSync('node .claude/tools/get-session.js', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      assert.ok(output.includes('Branch: issue/feature-123/test-feature'));
      assert.ok(output.includes('Session:'));
      assert.ok(output.includes('123-test-feature.md'));
      assert.ok(output.includes('Status: in-progress'));
      assert.ok(output.includes('Type: feature'));
      assert.ok(output.includes('Issue: #123'));
    });

    it('returns session info in JSON format', () => {
      execSync('git checkout -b issue/feature-456/json-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --json', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const json = JSON.parse(output);
      assert.strictEqual(json.branch, 'issue/feature-456/json-test');
      assert.ok(json.sessionFile.includes('456-json-test.md'));
      assert.strictEqual(json.status, 'in-progress');
      assert.strictEqual(json.type, 'feature');
      assert.strictEqual(json.issueId, '#456');
      assert.strictEqual(json.platform, 'github');
    });

    it('returns just the path with --path flag', () => {
      execSync('git checkout -b issue/feature-789/path-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --path', {
        cwd: tempDir,
        encoding: 'utf-8',
      }).trim();

      assert.ok(output.endsWith('789-path-test.md'));
      assert.ok(!output.includes('Branch:'));
    });

    it('returns session content with --content flag', () => {
      execSync('git checkout -b issue/feature-111/content-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --content', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      assert.ok(output.includes('# Session: content-test'));
      assert.ok(output.includes('## Session Log'));
      assert.ok(output.includes('## Next Steps'));
    });

    it('fails when no session exists', () => {
      execSync('git checkout -b feature/no-session', { cwd: tempDir, stdio: 'pipe' });

      try {
        execSync('node .claude/tools/get-session.js', {
          cwd: tempDir,
          stdio: 'pipe',
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.strictEqual(error.status, 1);
      }
    });

    it('exits quietly with --quiet when no session', () => {
      execSync('git checkout -b feature/quiet-test', { cwd: tempDir, stdio: 'pipe' });

      try {
        execSync('node .claude/tools/get-session.js --quiet', {
          cwd: tempDir,
          stdio: 'pipe',
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.strictEqual(error.status, 1);
        // Should not have error output with --quiet
        assert.strictEqual(error.stderr.length, 0);
      }
    });

    it('works with Jira branch pattern', () => {
      execSync('git checkout -b feature/PROJ-123/jira-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --json', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const json = JSON.parse(output);
      assert.strictEqual(json.platform, 'jira');
      assert.strictEqual(json.issueId, 'PROJ-123');
    });

    it('works with simple chore branch', () => {
      execSync('git checkout -b chore/simple-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --json', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const json = JSON.parse(output);
      assert.strictEqual(json.type, 'chore');
      assert.strictEqual(json.issueId, null);
      assert.strictEqual(json.platform, 'none');
    });
  });
});
