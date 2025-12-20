const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  realpathSync: jest.fn((p) => p),
}));

const session = require('../session.js');

describe('session.js', () => {
  describe('parseBranchName', () => {
    // Table-driven tests for branch parsing
    const branchTestCases = [
      // GitHub issue patterns
      {
        name: 'GitHub feature branch',
        input: 'issue/feature-123/add-authentication',
        expected: {
          platform: 'github',
          type: 'feature',
          issueNumber: '123',
          issueId: '#123',
          description: 'add-authentication',
          sessionFile: '123-add-authentication.md',
          branchMetaFile: 'issue-feature-123-add-authentication',
        },
      },
      {
        name: 'GitHub fix branch',
        input: 'issue/fix-456/login-bug',
        expected: {
          platform: 'github',
          type: 'fix',
          issueNumber: '456',
          issueId: '#456',
          description: 'login-bug',
          sessionFile: '456-login-bug.md',
        },
      },
      {
        name: 'GitHub chore branch',
        input: 'issue/chore-789/update-deps',
        expected: {
          platform: 'github',
          type: 'chore',
          issueNumber: '789',
          issueId: '#789',
        },
      },
      // Jira patterns
      {
        name: 'Jira feature branch',
        input: 'feature/PROJ-123/add-auth',
        expected: {
          platform: 'jira',
          type: 'feature',
          issueNumber: 'PROJ-123',
          issueId: 'PROJ-123',
          description: 'add-auth',
          sessionFile: 'PROJ-123-add-auth.md',
        },
      },
      {
        name: 'Jira fix branch',
        input: 'fix/ABC-456/critical-bug',
        expected: {
          platform: 'jira',
          type: 'fix',
          issueId: 'ABC-456',
        },
      },
      // Azure DevOps patterns
      {
        name: 'Azure DevOps feature branch',
        input: 'feature/789/add-feature',
        expected: {
          platform: 'azure-devops',
          type: 'feature',
          issueNumber: '789',
          issueId: '#789',
          description: 'add-feature',
          sessionFile: '789-add-feature.md',
        },
      },
      // Simple patterns (no issue number)
      {
        name: 'simple feature branch',
        input: 'feature/new-dashboard',
        expected: {
          platform: 'none',
          type: 'feature',
          issueNumber: null,
          issueId: null,
          description: 'new-dashboard',
          sessionFile: 'feature-new-dashboard.md',
        },
      },
      {
        name: 'simple chore branch',
        input: 'chore/update-deps',
        expected: {
          platform: 'none',
          type: 'chore',
          issueNumber: null,
          sessionFile: 'chore-update-deps.md',
        },
      },
      {
        name: 'simple fix branch',
        input: 'fix/typo-in-readme',
        expected: {
          platform: 'none',
          type: 'fix',
          description: 'typo-in-readme',
        },
      },
      // Fallback patterns
      {
        name: 'unknown branch (main)',
        input: 'main',
        expected: {
          platform: 'unknown',
          type: 'unknown',
          issueNumber: null,
          sessionFile: 'main.md',
          branchMetaFile: 'main',
        },
      },
      {
        name: 'unknown branch (complex path)',
        input: 'user/john/experiment',
        expected: {
          platform: 'unknown',
          sessionFile: 'user-john-experiment.md',
          branchMetaFile: 'user-john-experiment',
        },
      },
    ];

    it.each(branchTestCases)('parses $name: $input', ({ input, expected }) => {
      const result = session.parseBranchName(input);

      Object.entries(expected).forEach(([key, value]) => {
        expect(result[key]).toBe(value);
      });
    });
  });

  describe('getCurrentBranch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns current git branch', () => {
      execSync.mockReturnValue('feature/test-branch\n');

      const branch = session.getCurrentBranch();

      expect(branch).toBe('feature/test-branch');
      expect(execSync).toHaveBeenCalledWith(
        'git rev-parse --abbrev-ref HEAD',
        expect.objectContaining({ encoding: 'utf-8' })
      );
    });

    it('returns null when not in a git repo', () => {
      execSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const branch = session.getCurrentBranch('/tmp');

      expect(branch).toBe(null);
    });

    it('trims whitespace from branch name', () => {
      execSync.mockReturnValue('  main  \n');

      const branch = session.getCurrentBranch();

      expect(branch).toBe('main');
    });
  });

  describe('getPaths', () => {
    it('returns path configuration object', () => {
      const paths = session.getPaths('/mock/project');

      expect(paths.claudeDir).toBe('/mock/project/.claude');
      expect(paths.sessionsDir).toBe('/mock/project/.claude/sessions');
      expect(paths.branchesDir).toBe('/mock/project/.claude/branches');
      expect(paths.templatesDir).toContain('templates');
    });

    it('uses process.cwd() when cwd not provided', () => {
      const paths = session.getPaths();

      expect(paths.claudeDir).toContain('.claude');
      expect(paths.sessionsDir).toContain('sessions');
    });
  });

  describe('getProjectPaths', () => {
    it('uses process.cwd() when cwd not provided', () => {
      const paths = session.getProjectPaths();

      expect(paths.claudeDir).toContain('.claude');
      expect(paths.sessionsDir).toContain('sessions');
      expect(paths.branchesDir).toContain('branches');
    });
  });

  describe('getSessionPath', () => {
    it('returns full path to session file', () => {
      const sessionPath = session.getSessionPath('issue/feature-123/add-auth');

      expect(sessionPath).toContain('.claude/sessions/');
      expect(sessionPath.endsWith('123-add-auth.md')).toBe(true);
    });
  });

  describe('getBranchMetaPath', () => {
    it('returns full path to branch metadata file', () => {
      const metaPath = session.getBranchMetaPath('issue/feature-123/add-auth');

      expect(metaPath).toContain('.claude/branches/');
      expect(metaPath.endsWith('issue-feature-123-add-auth')).toBe(true);
    });
  });

  describe('getDefaultTemplate', () => {
    it('generates template with branch info', () => {
      const branchInfo = {
        issueId: '#123',
        branchMetaFile: 'issue-feature-123-add-auth',
        description: 'add-auth',
      };
      const template = session.getDefaultTemplate('feature', branchInfo);

      expect(template).toContain('# Session: add-auth');
      expect(template).toContain('#123');
      // branchMetaFile dashes are converted to slashes in the Branch field
      expect(template).toContain('issue/feature/123/add/auth');
      expect(template).toContain('## Session Log');
      expect(template).toContain('## Key Decisions');
      expect(template).toContain('## Next Steps');
    });

    it('generates template without issue id when not present', () => {
      const branchInfo = {
        issueId: null,
        branchMetaFile: 'chore-update-deps',
        description: 'update-deps',
      };
      const template = session.getDefaultTemplate('chore', branchInfo);

      expect(template).toContain('# Session: update-deps');
      expect(template).not.toContain('**Issue**:');
    });
  });

  describe('ensureDirectories', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates sessions and branches directories when they do not exist', () => {
      fs.existsSync.mockReturnValue(false);

      session.ensureDirectories('/mock/project');

      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/mock/project/.claude/sessions',
        { recursive: true }
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/mock/project/.claude/branches',
        { recursive: true }
      );
    });

    it('does nothing when directories already exist', () => {
      fs.existsSync.mockReturnValue(true);

      session.ensureDirectories('/mock/project');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('uses process.cwd() when cwd not provided', () => {
      fs.existsSync.mockReturnValue(true);

      session.ensureDirectories();

      expect(fs.existsSync).toHaveBeenCalled();
    });
  });

  describe('loadTemplate', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('loads existing template', () => {
      fs.readFileSync.mockReturnValue('# {{description}}\n\nTemplate content');

      const content = session.loadTemplate('feature');

      expect(content).toBe('# {{description}}\n\nTemplate content');
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('templates/feature.md'),
        'utf-8'
      );
    });

    it('returns null if template does not exist', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const content = session.loadTemplate('nonexistent');

      expect(content).toBe(null);
    });
  });

  describe('readBranchMeta', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns null for nonexistent branch metadata', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = session.readBranchMeta('nonexistent/branch/name', '/mock/project');

      expect(result).toBe(null);
    });

    it('parses metadata file correctly', () => {
      const metaContent = `session: test-session.md
status: in-progress
type: feature
created: 2025-01-01`;
      fs.readFileSync.mockReturnValue(metaContent);

      const meta = session.readBranchMeta('feature/test-branch', '/mock/project');

      expect(meta).not.toBe(null);
      expect(meta.session).toBe('test-session.md');
      expect(meta.status).toBe('in-progress');
      expect(meta.type).toBe('feature');
      expect(meta.created).toBe('2025-01-01');
    });

    it('ignores invalid lines in metadata', () => {
      const metaContent = `session: valid.md
invalid line without colon
status: complete
# comment line`;
      fs.readFileSync.mockReturnValue(metaContent);

      const meta = session.readBranchMeta('chore/cleanup', '/mock/project');

      expect(meta.session).toBe('valid.md');
      expect(meta.status).toBe('complete');
      expect(Object.keys(meta)).toHaveLength(2);
    });

    it('uses process.cwd() when cwd not provided', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = session.readBranchMeta('feature/test');

      expect(result).toBe(null);
    });
  });

  describe('sessionExists', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns false when neither session nor meta file exists', () => {
      fs.existsSync.mockReturnValue(false);

      const exists = session.sessionExists('feature/test-branch', '/mock/project');

      expect(exists).toBe(false);
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('returns true when session file exists', () => {
      // First call (session path) returns true
      fs.existsSync.mockReturnValueOnce(true);

      const exists = session.sessionExists('issue/feature-123/add-auth', '/mock/project');

      expect(exists).toBe(true);
    });

    it('returns true when only meta file exists', () => {
      // First call (session path) returns false, second call (meta path) returns true
      fs.existsSync
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const exists = session.sessionExists('chore/update-deps', '/mock/project');

      expect(exists).toBe(true);
    });

    it('uses process.cwd() when cwd not provided', () => {
      fs.existsSync.mockReturnValue(false);

      const exists = session.sessionExists('feature/test');

      expect(exists).toBe(false);
    });
  });

  describe('BRANCH_PATTERNS', () => {
    it('exports branch patterns for external use', () => {
      expect(session.BRANCH_PATTERNS.githubIssue instanceof RegExp).toBe(true);
      expect(session.BRANCH_PATTERNS.jira instanceof RegExp).toBe(true);
      expect(session.BRANCH_PATTERNS.azureDevOps instanceof RegExp).toBe(true);
      expect(session.BRANCH_PATTERNS.simple instanceof RegExp).toBe(true);
    });
  });
});
