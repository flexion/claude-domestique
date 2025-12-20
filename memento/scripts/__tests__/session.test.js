const fs = require('fs');
const path = require('path');
const os = require('os');

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
    it('returns current git branch', () => {
      const branch = session.getCurrentBranch();
      // Should return a string (the actual branch name)
      expect(typeof branch).toBe('string');
      expect(branch.length).toBeGreaterThan(0);
    });
  });

  describe('getPaths', () => {
    it('returns path configuration object', () => {
      const paths = session.getPaths();

      expect(paths.claudeDir.endsWith('.claude')).toBe(true);
      expect(paths.sessionsDir.endsWith('sessions')).toBe(true);
      expect(paths.branchesDir.endsWith('branches')).toBe(true);
      expect(paths.templatesDir.endsWith('templates')).toBe(true);
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
    // Note: This function uses hardcoded paths based on process.cwd()
    // Full integration testing would require source changes to support DI
    // We verify the directories exist after calling (they may already exist)
    it('ensures directories exist in project', () => {
      session.ensureDirectories();
      const paths = session.getPaths();

      expect(fs.existsSync(paths.sessionsDir)).toBe(true);
      expect(fs.existsSync(paths.branchesDir)).toBe(true);
    });

    it('plugin templates directory exists', () => {
      const paths = session.getPaths();
      expect(fs.existsSync(paths.templatesDir)).toBe(true);
    });
  });

  describe('loadTemplate', () => {
    // Note: Reads from plugin's templates directory (acceptable integration test)
    it('loads existing feature template from plugin', () => {
      const content = session.loadTemplate('feature');

      expect(content).not.toBe(null);
      expect(content).toContain('{{description}}');
    });

    it('returns null if template does not exist', () => {
      const content = session.loadTemplate('nonexistent');

      expect(content).toBe(null);
    });
  });

  describe('readBranchMeta', () => {
    // Note: Uses hardcoded paths based on process.cwd()
    // Only testing null case to avoid dependency on specific project state
    it('returns null for nonexistent branch metadata', () => {
      const result = session.readBranchMeta('nonexistent/branch/that-does-not-exist-12345');
      expect(result).toBe(null);
    });

    // Integration test: reads actual branch metadata if it exists
    it('returns object or null for current branch', () => {
      const branch = session.getCurrentBranch();
      if (branch && branch !== 'main' && branch !== 'master') {
        const meta = session.readBranchMeta(branch);
        // Should return either null or a valid metadata object
        if (meta !== null) {
          expect(typeof meta).toBe('object');
          expect(meta).toHaveProperty('session');
        }
      }
    });
  });

  describe('sessionExists', () => {
    // Note: Uses hardcoded paths based on process.cwd()
    it('returns false for nonexistent session', () => {
      expect(session.sessionExists('nonexistent/branch/name-12345')).toBe(false);
    });

    it('returns boolean for any branch name', () => {
      const branch = session.getCurrentBranch();
      if (branch) {
        const exists = session.sessionExists(branch);
        expect(typeof exists).toBe('boolean');
      }
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
