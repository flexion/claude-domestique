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

      expect(output).toContain('Branch: issue/feature-123/test-feature');
      expect(output).toContain('Session:');
      expect(output).toContain('123-test-feature.md');
      expect(output).toContain('Status: in-progress');
      expect(output).toContain('Type: feature');
      expect(output).toContain('Issue: #123');
    });

    it('returns session info in JSON format', () => {
      execSync('git checkout -b issue/feature-456/json-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --json', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const json = JSON.parse(output);
      expect(json.branch).toBe('issue/feature-456/json-test');
      expect(json.sessionFile).toContain('456-json-test.md');
      expect(json.status).toBe('in-progress');
      expect(json.type).toBe('feature');
      expect(json.issueId).toBe('#456');
      expect(json.platform).toBe('github');
    });

    it('returns just the path with --path flag', () => {
      execSync('git checkout -b issue/feature-789/path-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --path', {
        cwd: tempDir,
        encoding: 'utf-8',
      }).trim();

      expect(output.endsWith('789-path-test.md')).toBe(true);
      expect(output).not.toContain('Branch:');
    });

    it('returns session content with --content flag', () => {
      execSync('git checkout -b issue/feature-111/content-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --content', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      expect(output).toContain('# Session: content-test');
      expect(output).toContain('## Session Log');
      expect(output).toContain('## Next Steps');
    });

    it('fails when no session exists', () => {
      execSync('git checkout -b feature/no-session', { cwd: tempDir, stdio: 'pipe' });

      expect(() => {
        execSync('node .claude/tools/get-session.js', {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('exits quietly with --quiet when no session', () => {
      execSync('git checkout -b feature/quiet-test', { cwd: tempDir, stdio: 'pipe' });

      let error;
      try {
        execSync('node .claude/tools/get-session.js --quiet', {
          cwd: tempDir,
          stdio: 'pipe',
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.status).toBe(1);
      // Should not have error output with --quiet
      expect(error.stderr.length).toBe(0);
    });

    it('works with Jira branch pattern', () => {
      execSync('git checkout -b feature/PROJ-123/jira-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --json', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const json = JSON.parse(output);
      expect(json.platform).toBe('jira');
      expect(json.issueId).toBe('PROJ-123');
    });

    it('works with simple chore branch', () => {
      execSync('git checkout -b chore/simple-test', { cwd: tempDir, stdio: 'pipe' });
      execSync('node .claude/tools/create-session.js', { cwd: tempDir, stdio: 'pipe' });

      const output = execSync('node .claude/tools/get-session.js --json', {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const json = JSON.parse(output);
      expect(json.type).toBe('chore');
      expect(json.issueId).toBe(null);
      expect(json.platform).toBe('none');
    });
  });
});
