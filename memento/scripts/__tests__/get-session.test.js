const fs = require('fs');
const path = require('path');

const { getSession } = require('../get-session.js');
const { createSession } = require('../create-session.js');
const { createTempDir, cleanupTempDir, setupGitRepo } = require('../../test-utils/test-helpers.js');

describe('get-session.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir('get-session-test-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getSession', () => {
    it('returns session info for existing session', () => {
      setupGitRepo(tempDir, 'issue/feature-123/test-feature');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.branch).toBe('issue/feature-123/test-feature');
      expect(result.sessionFile).toContain('123-test-feature.md');
      expect(result.status).toBe('in-progress');
      expect(result.type).toBe('feature');
      expect(result.issueId).toBe('#123');
    });

    it('returns session info with JSON format option', () => {
      setupGitRepo(tempDir, 'issue/feature-456/json-test');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true, json: true });

      expect(result.branch).toBe('issue/feature-456/json-test');
      expect(result.sessionFile).toContain('456-json-test.md');
      expect(result.status).toBe('in-progress');
      expect(result.type).toBe('feature');
      expect(result.issueId).toBe('#456');
      expect(result.platform).toBe('github');
    });

    it('returns session path with --path option', () => {
      setupGitRepo(tempDir, 'issue/feature-789/path-test');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true, path: true });

      expect(result.sessionFile.endsWith('789-path-test.md')).toBe(true);
    });

    it('returns error when no session exists', () => {
      setupGitRepo(tempDir, 'feature/no-session');

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('No session found');
    });

    it('returns error in quiet mode when no session', () => {
      setupGitRepo(tempDir, 'feature/quiet-test');

      const result = getSession({ cwd: tempDir, silent: true, quiet: true });

      expect(result.error).toContain('quiet mode');
    });

    it('works with Jira branch pattern', () => {
      setupGitRepo(tempDir, 'feature/PROJ-123/jira-test');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.platform).toBe('jira');
      expect(result.issueId).toBe('PROJ-123');
    });

    it('works with simple chore branch', () => {
      setupGitRepo(tempDir, 'chore/simple-test');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.type).toBe('chore');
      expect(result.issueId).toBe(null);
      expect(result.platform).toBe('none');
    });

    it('returns error when not in git repo', () => {
      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('git repository');
    });

    it('returns session content with --content option', () => {
      setupGitRepo(tempDir, 'issue/feature-111/content-test');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true, content: true });

      expect(result.error).toBeUndefined();
      expect(result.sessionFile).toContain('111-content-test.md');
    });

    it('includes metaFile in result when metadata exists', () => {
      setupGitRepo(tempDir, 'issue/feature-222/meta-test');
      createSession({ cwd: tempDir, silent: true });

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.metaFile).not.toBeNull();
      expect(result.metaFile).toContain('issue-feature-222-meta-test');
    });

    it('uses fallback session path when no metadata exists', () => {
      setupGitRepo(tempDir, 'feature/fallback-test');

      // Create session file manually without metadata
      const sessionsDir = path.join(tempDir, '.claude/sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsDir, 'feature-fallback-test.md'),
        '# Session: fallback-test\n## Session Log\n- Test'
      );

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.sessionFile).toContain('feature-fallback-test.md');
      expect(result.metaFile).toBeNull();
      expect(result.status).toBe('unknown');
    });

    it('outputs human-readable format when not silent', () => {
      setupGitRepo(tempDir, 'issue/feature-333/verbose-test');
      createSession({ cwd: tempDir, silent: true });

      // Call without silent to trigger console output branches
      const result = getSession({ cwd: tempDir });

      expect(result.branch).toBe('issue/feature-333/verbose-test');
      expect(result.issueId).toBe('#333');
    });

    it('outputs issue when present in human-readable format', () => {
      setupGitRepo(tempDir, 'chore/no-issue-test');
      createSession({ cwd: tempDir, silent: true });

      // Call without silent - no issue branch
      const result = getSession({ cwd: tempDir });

      expect(result.issueId).toBeNull();
    });

    it('handles metadata file without session field', () => {
      setupGitRepo(tempDir, 'feature/meta-no-session');

      // Create session file at expected path
      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsDir, 'feature-meta-no-session.md'),
        '# Session: meta-no-session\n## Session Log\n- Test'
      );
      // Create metadata WITHOUT session field
      fs.writeFileSync(
        path.join(branchesDir, 'feature-meta-no-session'),
        'status: in-progress\ntype: feature'
      );

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.sessionFile).toContain('feature-meta-no-session.md');
    });

    it('handles quiet mode with no session', () => {
      setupGitRepo(tempDir, 'feature/quiet-no-session');
      // Create .claude dirs but no session
      fs.mkdirSync(path.join(tempDir, '.claude/sessions'), { recursive: true });

      const result = getSession({ cwd: tempDir, silent: true, quiet: true });

      expect(result.error).toContain('quiet mode');
    });
  });
});
