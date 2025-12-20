const fs = require('fs');
const path = require('path');

const { createSession } = require('../create-session.js');
const { createTempDir, cleanupTempDir, setupGitRepo } = require('../../test-utils/test-helpers.js');

describe('create-session.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir('create-session-test-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('createSession', () => {
    it('creates session and metadata for GitHub issue branch', () => {
      setupGitRepo(tempDir, 'issue/feature-123/add-auth');

      const result = createSession({ cwd: tempDir, silent: true });

      // Verify no error
      expect(result.error).toBeUndefined();

      // Verify files created
      const sessionPath = path.join(tempDir, '.claude/sessions/123-add-auth.md');
      const metaPath = path.join(tempDir, '.claude/branches/issue-feature-123-add-auth');

      expect(fs.existsSync(sessionPath)).toBe(true);
      expect(fs.existsSync(metaPath)).toBe(true);

      // Verify session content
      const sessionContent = fs.readFileSync(sessionPath, 'utf-8');
      expect(sessionContent).toContain('# Session: add-auth');
      expect(sessionContent).toContain('#123');

      // Verify metadata content
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      expect(metaContent).toContain('branch: issue/feature-123/add-auth');
      expect(metaContent).toContain('session: 123-add-auth.md');
      expect(metaContent).toContain('type: feature');
      expect(metaContent).toContain('status: in-progress');
    });

    it('creates session for simple chore branch', () => {
      setupGitRepo(tempDir, 'chore/update-deps');

      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();

      const sessionPath = path.join(tempDir, '.claude/sessions/chore-update-deps.md');
      const metaPath = path.join(tempDir, '.claude/branches/chore-update-deps');

      expect(fs.existsSync(sessionPath)).toBe(true);
      expect(fs.existsSync(metaPath)).toBe(true);

      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      expect(metaContent).toContain('type: chore');
    });

    it('creates session for Jira branch', () => {
      setupGitRepo(tempDir, 'feature/PROJ-456/new-feature');

      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();

      const sessionPath = path.join(tempDir, '.claude/sessions/PROJ-456-new-feature.md');
      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('returns error on main branch', () => {
      setupGitRepo(tempDir);
      // We're on main after setup (initial commit)

      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('main/master');
    });

    it('returns error on master branch', () => {
      setupGitRepo(tempDir);
      // Rename main to master to test the master branch check
      const { execSync } = require('child_process');
      execSync('git branch -m main master', { cwd: tempDir, stdio: 'pipe' });

      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('main/master');
    });

    it('returns error if session already exists without --force', () => {
      setupGitRepo(tempDir, 'issue/feature-789/test');

      // Create session first time
      const firstResult = createSession({ cwd: tempDir, silent: true });
      expect(firstResult.error).toBeUndefined();

      // Try to create again without --force
      const secondResult = createSession({ cwd: tempDir, silent: true });
      expect(secondResult.error).toContain('already exists');
    });

    it('overwrites with --force flag', () => {
      setupGitRepo(tempDir, 'issue/feature-111/test');

      // Create session first time
      createSession({ cwd: tempDir, silent: true });

      // Modify the session file
      const sessionPath = path.join(tempDir, '.claude/sessions/111-test.md');
      fs.writeFileSync(sessionPath, 'modified content');

      // Create again with --force
      const result = createSession({ cwd: tempDir, force: true, silent: true });
      expect(result.error).toBeUndefined();

      // Verify it was overwritten
      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).toContain('# Session:');
      expect(content).not.toContain('modified content');
    });

    it('returns error when not in git repo', () => {
      // tempDir is not a git repo
      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('git repository');
    });

    it('returns branchInfo in result on success', () => {
      setupGitRepo(tempDir, 'issue/feature-42/api-endpoint');

      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.branchName).toBe('issue/feature-42/api-endpoint');
      expect(result.branchInfo.type).toBe('feature');
      expect(result.branchInfo.issueId).toBe('#42');
      expect(result.sessionPath).toContain('42-api-endpoint.md');
      expect(result.metaPath).toContain('issue-feature-42-api-endpoint');
    });

    it('uses default template for unknown branch types', () => {
      // Branch name that doesn't match any known pattern
      setupGitRepo(tempDir, 'random/something');

      const result = createSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.branchInfo.type).toBe('unknown');

      // Verify session file was created with default template
      const sessionPath = path.join(tempDir, '.claude/sessions/random-something.md');
      expect(fs.existsSync(sessionPath)).toBe(true);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).toContain('# Session:');
      expect(content).toContain('## Objective');
    });
  });
});
