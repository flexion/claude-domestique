const fs = require('fs');
const path = require('path');
const os = require('os');

const { getSession } = require('../get-session.js');
const session = require('../session.js');

// Mock the session module
jest.mock('../session.js');

// Mock console methods
let consoleLogSpy;
let consoleErrorSpy;

describe('get-session.js', () => {
  const mockCwd = '/mock/project';
  let tempDir;

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create temp dir for fs operations that need real files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-session-test-'));

    // Default mock implementations
    session.getCurrentBranch.mockReturnValue('issue/feature-123/test-feature');
    session.parseBranchName.mockReturnValue({
      platform: 'github',
      type: 'feature',
      issueNumber: '123',
      issueId: '#123',
      description: 'test-feature',
      sessionFile: '123-test-feature.md',
      branchMetaFile: 'issue-feature-123-test-feature',
    });
    session.getPaths.mockReturnValue({
      claudeDir: path.join(tempDir, '.claude'),
      sessionsDir: path.join(tempDir, '.claude/sessions'),
      branchesDir: path.join(tempDir, '.claude/branches'),
      pluginRoot: '/mock/plugin',
      templatesDir: '/mock/plugin/templates',
    });
    session.readBranchMeta.mockReturnValue({
      session: '123-test-feature.md',
      status: 'in-progress',
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getSession', () => {
    it('returns session info for existing session', () => {
      // Set up session files
      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '123-test-feature.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'issue-feature-123-test-feature'), 'session: 123-test-feature.md\nstatus: in-progress');

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.branch).toBe('issue/feature-123/test-feature');
      expect(result.sessionFile).toContain('123-test-feature.md');
      expect(result.status).toBe('in-progress');
      expect(result.type).toBe('feature');
      expect(result.issueId).toBe('#123');
    });

    it('returns session info with JSON format option', () => {
      session.getCurrentBranch.mockReturnValue('issue/feature-456/json-test');
      session.parseBranchName.mockReturnValue({
        platform: 'github',
        type: 'feature',
        issueNumber: '456',
        issueId: '#456',
        description: 'json-test',
        sessionFile: '456-json-test.md',
        branchMetaFile: 'issue-feature-456-json-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: '456-json-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '456-json-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'issue-feature-456-json-test'), 'session: 456-json-test.md\nstatus: in-progress');

      const result = getSession({ cwd: tempDir, silent: true, json: true });

      expect(result.branch).toBe('issue/feature-456/json-test');
      expect(result.sessionFile).toContain('456-json-test.md');
      expect(result.status).toBe('in-progress');
      expect(result.type).toBe('feature');
      expect(result.issueId).toBe('#456');
      expect(result.platform).toBe('github');
    });

    it('returns session path with --path option', () => {
      session.getCurrentBranch.mockReturnValue('issue/feature-789/path-test');
      session.parseBranchName.mockReturnValue({
        platform: 'github',
        type: 'feature',
        issueNumber: '789',
        issueId: '#789',
        description: 'path-test',
        sessionFile: '789-path-test.md',
        branchMetaFile: 'issue-feature-789-path-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: '789-path-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '789-path-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'issue-feature-789-path-test'), 'session: 789-path-test.md');

      const result = getSession({ cwd: tempDir, silent: true, path: true });

      expect(result.sessionFile.endsWith('789-path-test.md')).toBe(true);
    });

    it('returns error when no session exists', () => {
      session.getCurrentBranch.mockReturnValue('feature/no-session');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'feature',
        issueNumber: null,
        issueId: null,
        description: 'no-session',
        sessionFile: 'feature-no-session.md',
        branchMetaFile: 'feature-no-session',
      });
      session.readBranchMeta.mockReturnValue(null);

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('No session found');
    });

    it('returns error in quiet mode when no session', () => {
      session.getCurrentBranch.mockReturnValue('feature/quiet-test');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'feature',
        issueNumber: null,
        issueId: null,
        description: 'quiet-test',
        sessionFile: 'feature-quiet-test.md',
        branchMetaFile: 'feature-quiet-test',
      });
      session.readBranchMeta.mockReturnValue(null);

      const result = getSession({ cwd: tempDir, silent: true, quiet: true });

      expect(result.error).toContain('quiet mode');
    });

    it('works with Jira branch pattern', () => {
      session.getCurrentBranch.mockReturnValue('feature/PROJ-123/jira-test');
      session.parseBranchName.mockReturnValue({
        platform: 'jira',
        type: 'feature',
        issueNumber: 'PROJ-123',
        issueId: 'PROJ-123',
        description: 'jira-test',
        sessionFile: 'PROJ-123-jira-test.md',
        branchMetaFile: 'feature-PROJ-123-jira-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: 'PROJ-123-jira-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, 'PROJ-123-jira-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'feature-PROJ-123-jira-test'), 'session: PROJ-123-jira-test.md');

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.platform).toBe('jira');
      expect(result.issueId).toBe('PROJ-123');
    });

    it('works with simple chore branch', () => {
      session.getCurrentBranch.mockReturnValue('chore/simple-test');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'chore',
        issueNumber: null,
        issueId: null,
        description: 'simple-test',
        sessionFile: 'chore-simple-test.md',
        branchMetaFile: 'chore-simple-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: 'chore-simple-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, 'chore-simple-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'chore-simple-test'), 'session: chore-simple-test.md');

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.type).toBe('chore');
      expect(result.issueId).toBe(null);
      expect(result.platform).toBe('none');
    });

    it('returns error when not in git repo', () => {
      session.getCurrentBranch.mockReturnValue(null);

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.error).toContain('git repository');
    });

    it('returns session content with --content option', () => {
      session.getCurrentBranch.mockReturnValue('issue/feature-111/content-test');
      session.parseBranchName.mockReturnValue({
        platform: 'github',
        type: 'feature',
        issueNumber: '111',
        issueId: '#111',
        description: 'content-test',
        sessionFile: '111-content-test.md',
        branchMetaFile: 'issue-feature-111-content-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: '111-content-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '111-content-test.md'), '# Session Content');
      fs.writeFileSync(path.join(branchesDir, 'issue-feature-111-content-test'), 'session: 111-content-test.md');

      const result = getSession({ cwd: tempDir, silent: true, content: true });

      expect(result.error).toBeUndefined();
      expect(result.sessionFile).toContain('111-content-test.md');
    });

    it('includes metaFile in result when metadata exists', () => {
      session.getCurrentBranch.mockReturnValue('issue/feature-222/meta-test');
      session.parseBranchName.mockReturnValue({
        platform: 'github',
        type: 'feature',
        issueNumber: '222',
        issueId: '#222',
        description: 'meta-test',
        sessionFile: '222-meta-test.md',
        branchMetaFile: 'issue-feature-222-meta-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: '222-meta-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '222-meta-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'issue-feature-222-meta-test'), 'session: 222-meta-test.md');

      const result = getSession({ cwd: tempDir, silent: true });

      expect(result.metaFile).not.toBeNull();
      expect(result.metaFile).toContain('issue-feature-222-meta-test');
    });

    it('uses fallback session path when no metadata exists', () => {
      session.getCurrentBranch.mockReturnValue('feature/fallback-test');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'feature',
        issueNumber: null,
        issueId: null,
        description: 'fallback-test',
        sessionFile: 'feature-fallback-test.md',
        branchMetaFile: 'feature-fallback-test',
      });
      session.readBranchMeta.mockReturnValue(null);

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
      session.getCurrentBranch.mockReturnValue('issue/feature-333/verbose-test');
      session.parseBranchName.mockReturnValue({
        platform: 'github',
        type: 'feature',
        issueNumber: '333',
        issueId: '#333',
        description: 'verbose-test',
        sessionFile: '333-verbose-test.md',
        branchMetaFile: 'issue-feature-333-verbose-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: '333-verbose-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, '333-verbose-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'issue-feature-333-verbose-test'), 'session: 333-verbose-test.md');

      // Call without silent to trigger console output branches
      const result = getSession({ cwd: tempDir });

      expect(result.branch).toBe('issue/feature-333/verbose-test');
      expect(result.issueId).toBe('#333');
      // Verify console output was called
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Branch:'));
    });

    it('outputs issue when present in human-readable format', () => {
      session.getCurrentBranch.mockReturnValue('chore/no-issue-test');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'chore',
        issueNumber: null,
        issueId: null,
        description: 'no-issue-test',
        sessionFile: 'chore-no-issue-test.md',
        branchMetaFile: 'chore-no-issue-test',
      });
      session.readBranchMeta.mockReturnValue({
        session: 'chore-no-issue-test.md',
        status: 'in-progress',
      });

      const sessionsDir = path.join(tempDir, '.claude/sessions');
      const branchesDir = path.join(tempDir, '.claude/branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.writeFileSync(path.join(sessionsDir, 'chore-no-issue-test.md'), '# Session');
      fs.writeFileSync(path.join(branchesDir, 'chore-no-issue-test'), 'session: chore-no-issue-test.md');

      // Call without silent - no issue branch
      const result = getSession({ cwd: tempDir });

      expect(result.issueId).toBeNull();
      // Verify Issue: was not logged
      const issueLogCalls = consoleLogSpy.mock.calls.filter(
        call => call[0] && call[0].includes('Issue:')
      );
      expect(issueLogCalls).toHaveLength(0);
    });

    it('handles metadata file without session field', () => {
      session.getCurrentBranch.mockReturnValue('feature/meta-no-session');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'feature',
        issueNumber: null,
        issueId: null,
        description: 'meta-no-session',
        sessionFile: 'feature-meta-no-session.md',
        branchMetaFile: 'feature-meta-no-session',
      });
      // Metadata exists but without session field
      session.readBranchMeta.mockReturnValue({
        status: 'in-progress',
        type: 'feature',
      });

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
      session.getCurrentBranch.mockReturnValue('feature/quiet-no-session');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'feature',
        issueNumber: null,
        issueId: null,
        description: 'quiet-no-session',
        sessionFile: 'feature-quiet-no-session.md',
        branchMetaFile: 'feature-quiet-no-session',
      });
      session.readBranchMeta.mockReturnValue(null);

      // Create .claude dirs but no session
      fs.mkdirSync(path.join(tempDir, '.claude/sessions'), { recursive: true });

      const result = getSession({ cwd: tempDir, silent: true, quiet: true });

      expect(result.error).toContain('quiet mode');
    });
  });
});
