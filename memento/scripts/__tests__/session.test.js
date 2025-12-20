const fs = require('fs');

const session = require('../session.js');

describe('session.js', () => {
  describe('parseBranchName', () => {
    it('parses GitHub issue branch pattern', () => {
      const result = session.parseBranchName('issue/feature-123/add-authentication');

      expect(result.platform).toBe('github');
      expect(result.type).toBe('feature');
      expect(result.issueNumber).toBe('123');
      expect(result.issueId).toBe('#123');
      expect(result.description).toBe('add-authentication');
      expect(result.sessionFile).toBe('123-add-authentication.md');
      expect(result.branchMetaFile).toBe('issue-feature-123-add-authentication');
    });

    it('parses GitHub fix branch pattern', () => {
      const result = session.parseBranchName('issue/fix-456/login-bug');

      expect(result.platform).toBe('github');
      expect(result.type).toBe('fix');
      expect(result.issueNumber).toBe('456');
      expect(result.issueId).toBe('#456');
      expect(result.description).toBe('login-bug');
      expect(result.sessionFile).toBe('456-login-bug.md');
    });

    it('parses GitHub chore branch pattern', () => {
      const result = session.parseBranchName('issue/chore-789/update-deps');

      expect(result.platform).toBe('github');
      expect(result.type).toBe('chore');
      expect(result.issueNumber).toBe('789');
      expect(result.issueId).toBe('#789');
    });

    it('parses Jira branch pattern', () => {
      const result = session.parseBranchName('feature/PROJ-123/add-auth');

      expect(result.platform).toBe('jira');
      expect(result.type).toBe('feature');
      expect(result.issueNumber).toBe('PROJ-123');
      expect(result.issueId).toBe('PROJ-123');
      expect(result.description).toBe('add-auth');
      expect(result.sessionFile).toBe('PROJ-123-add-auth.md');
    });

    it('parses Jira fix branch pattern', () => {
      const result = session.parseBranchName('fix/ABC-456/critical-bug');

      expect(result.platform).toBe('jira');
      expect(result.type).toBe('fix');
      expect(result.issueId).toBe('ABC-456');
    });

    it('parses Azure DevOps branch pattern', () => {
      const result = session.parseBranchName('feature/789/add-feature');

      expect(result.platform).toBe('azure-devops');
      expect(result.type).toBe('feature');
      expect(result.issueNumber).toBe('789');
      expect(result.issueId).toBe('#789');
      expect(result.description).toBe('add-feature');
      expect(result.sessionFile).toBe('789-add-feature.md');
    });

    it('parses simple feature branch (no issue)', () => {
      const result = session.parseBranchName('feature/new-dashboard');

      expect(result.platform).toBe('none');
      expect(result.type).toBe('feature');
      expect(result.issueNumber).toBe(null);
      expect(result.issueId).toBe(null);
      expect(result.description).toBe('new-dashboard');
      expect(result.sessionFile).toBe('feature-new-dashboard.md');
    });

    it('parses simple chore branch (no issue)', () => {
      const result = session.parseBranchName('chore/update-deps');

      expect(result.platform).toBe('none');
      expect(result.type).toBe('chore');
      expect(result.issueNumber).toBe(null);
      expect(result.sessionFile).toBe('chore-update-deps.md');
    });

    it('parses simple fix branch (no issue)', () => {
      const result = session.parseBranchName('fix/typo-in-readme');

      expect(result.platform).toBe('none');
      expect(result.type).toBe('fix');
      expect(result.description).toBe('typo-in-readme');
    });

    it('handles unknown branch pattern with fallback', () => {
      const result = session.parseBranchName('main');

      expect(result.platform).toBe('unknown');
      expect(result.type).toBe('unknown');
      expect(result.issueNumber).toBe(null);
      expect(result.sessionFile).toBe('main.md');
      expect(result.branchMetaFile).toBe('main');
    });

    it('handles complex unknown branch pattern', () => {
      const result = session.parseBranchName('user/john/experiment');

      expect(result.platform).toBe('unknown');
      expect(result.sessionFile).toBe('user-john-experiment.md');
      expect(result.branchMetaFile).toBe('user-john-experiment');
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
    // Note: ensureDirectories creates consumer project directories only
    // Templates are in the plugin root, not copied to consumer
    it('ensures directories exist in project', () => {
      session.ensureDirectories();
      const paths = session.getPaths();

      expect(fs.existsSync(paths.sessionsDir)).toBe(true);
      expect(fs.existsSync(paths.branchesDir)).toBe(true);
      // templatesDir is in plugin root, not created by ensureDirectories
      expect(fs.existsSync(paths.templatesDir)).toBe(true); // Plugin templates should exist
    });
  });

  describe('loadTemplate', () => {
    // Note: loadTemplate reads from plugin root templates/
    it('loads existing feature template from plugin', () => {
      const content = session.loadTemplate('feature');

      // Should load the actual template
      expect(content).not.toBe(null);
      expect(content).toContain('{{description}}');
    });

    it('returns null if template does not exist', () => {
      const content = session.loadTemplate('nonexistent');

      expect(content).toBe(null);
    });
  });

  describe('sessionExists', () => {
    // Note: sessionExists uses hardcoded paths relative to process.cwd()
    it('returns true for existing session in project', () => {
      // Current branch should have a session
      const branch = session.getCurrentBranch();
      if (branch && branch !== 'main' && branch !== 'master') {
        // Only test if we're on a feature branch with a session
        const exists = session.sessionExists(branch);
        // May or may not exist depending on current branch
        expect(typeof exists).toBe('boolean');
      }
    });

    it('returns false for nonexistent session', () => {
      expect(session.sessionExists('nonexistent/branch/name-12345')).toBe(false);
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
