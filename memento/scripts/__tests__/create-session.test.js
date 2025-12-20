const fs = require('fs');
const path = require('path');

const { createSession } = require('../create-session.js');
const session = require('../session.js');

// Mock the session module
jest.mock('../session.js');

// Mock console methods
let consoleLogSpy;
let consoleErrorSpy;

describe('create-session.js', () => {
  const mockCwd = '/mock/project';

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock implementations
    session.getCurrentBranch.mockReturnValue('issue/feature-123/add-auth');
    session.parseBranchName.mockReturnValue({
      platform: 'github',
      type: 'feature',
      issueNumber: '123',
      issueId: '#123',
      description: 'add-auth',
      sessionFile: '123-add-auth.md',
      branchMetaFile: 'issue-feature-123-add-auth',
    });
    session.getPaths.mockReturnValue({
      claudeDir: path.join(mockCwd, '.claude'),
      sessionsDir: path.join(mockCwd, '.claude/sessions'),
      branchesDir: path.join(mockCwd, '.claude/branches'),
      pluginRoot: '/mock/plugin',
      templatesDir: '/mock/plugin/templates',
    });
    session.ensureDirectories.mockImplementation(() => {});
    session.loadTemplate.mockReturnValue(null);
    session.getDefaultTemplate.mockReturnValue('# Session: add-auth\n\n## Objective\n');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createSession', () => {
    it('creates session and metadata for GitHub issue branch', () => {
      // Mock fs.existsSync to return false (no existing session)
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.branchName).toBe('issue/feature-123/add-auth');
      expect(result.branchInfo.type).toBe('feature');
      expect(result.sessionPath).toContain('123-add-auth.md');

      // Verify files were written
      expect(writeFileSpy).toHaveBeenCalledTimes(2);

      fs.existsSync.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('creates session for simple chore branch', () => {
      session.getCurrentBranch.mockReturnValue('chore/update-deps');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'chore',
        issueNumber: null,
        issueId: null,
        description: 'update-deps',
        sessionFile: 'chore-update-deps.md',
        branchMetaFile: 'chore-update-deps',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.branchInfo.type).toBe('chore');

      fs.existsSync.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('creates session for Jira branch', () => {
      session.getCurrentBranch.mockReturnValue('feature/PROJ-456/new-feature');
      session.parseBranchName.mockReturnValue({
        platform: 'jira',
        type: 'feature',
        issueNumber: 'PROJ-456',
        issueId: 'PROJ-456',
        description: 'new-feature',
        sessionFile: 'PROJ-456-new-feature.md',
        branchMetaFile: 'feature-PROJ-456-new-feature',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toBeUndefined();
      expect(result.branchInfo.issueId).toBe('PROJ-456');

      fs.existsSync.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('returns error when not in git repo', () => {
      session.getCurrentBranch.mockReturnValue(null);

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toContain('git repository');
    });

    it('returns error on main branch', () => {
      session.getCurrentBranch.mockReturnValue('main');

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toContain('main/master');
    });

    it('returns error on master branch', () => {
      session.getCurrentBranch.mockReturnValue('master');

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toContain('main/master');
    });

    it('returns error if session already exists without --force', () => {
      // First call - session file exists
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = createSession({ cwd: mockCwd, silent: true });

      expect(result.error).toContain('already exists');

      fs.existsSync.mockRestore();
    });

    it('overwrites with --force flag', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = createSession({ cwd: mockCwd, force: true, silent: true });

      expect(result.error).toBeUndefined();
      expect(writeFileSpy).toHaveBeenCalled();

      fs.existsSync.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('uses template when available', () => {
      session.loadTemplate.mockReturnValue('# {{description}}\n\nBranch: {{branch}}\nIssue: {{issueId}}');

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      createSession({ cwd: mockCwd, silent: true });

      // Verify template placeholders were replaced
      const sessionContent = writeFileSpy.mock.calls[0][1];
      expect(sessionContent).toContain('# add-auth');
      expect(sessionContent).toContain('Branch: issue/feature-123/add-auth');
      expect(sessionContent).toContain('Issue: #123');

      fs.existsSync.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('handles branch without issue number in template', () => {
      session.getCurrentBranch.mockReturnValue('chore/cleanup');
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'chore',
        issueNumber: null,
        issueId: null,
        description: 'cleanup',
        sessionFile: 'chore-cleanup.md',
        branchMetaFile: 'chore-cleanup',
      });
      session.loadTemplate.mockReturnValue('Issue: {{issueId}}\nNumber: {{issueNumber}}');

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      createSession({ cwd: mockCwd, silent: true });

      const sessionContent = writeFileSpy.mock.calls[0][1];
      expect(sessionContent).toContain('Issue: N/A');
      expect(sessionContent).toContain('Number: ');

      fs.existsSync.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('logs issue ID when present', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      createSession({ cwd: mockCwd, silent: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Issue: #123'));

      fs.existsSync.mockRestore();
      fs.writeFileSync.mockRestore();
    });

    it('does not log issue ID when not present', () => {
      session.parseBranchName.mockReturnValue({
        platform: 'none',
        type: 'chore',
        issueNumber: null,
        issueId: null,
        description: 'cleanup',
        sessionFile: 'chore-cleanup.md',
        branchMetaFile: 'chore-cleanup',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      createSession({ cwd: mockCwd, silent: true });

      const issueLogCalls = consoleLogSpy.mock.calls.filter(
        call => call[0] && call[0].includes('Issue:')
      );
      expect(issueLogCalls).toHaveLength(0);

      fs.existsSync.mockRestore();
      fs.writeFileSync.mockRestore();
    });
  });
});
