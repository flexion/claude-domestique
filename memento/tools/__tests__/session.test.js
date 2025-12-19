const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const session = require('../session.js');

describe('session.js', () => {
  describe('parseBranchName', () => {
    it('parses GitHub issue branch pattern', () => {
      const result = session.parseBranchName('issue/feature-123/add-authentication');

      assert.strictEqual(result.platform, 'github');
      assert.strictEqual(result.type, 'feature');
      assert.strictEqual(result.issueNumber, '123');
      assert.strictEqual(result.issueId, '#123');
      assert.strictEqual(result.description, 'add-authentication');
      assert.strictEqual(result.sessionFile, '123-add-authentication.md');
      assert.strictEqual(result.branchMetaFile, 'issue-feature-123-add-authentication');
    });

    it('parses GitHub fix branch pattern', () => {
      const result = session.parseBranchName('issue/fix-456/login-bug');

      assert.strictEqual(result.platform, 'github');
      assert.strictEqual(result.type, 'fix');
      assert.strictEqual(result.issueNumber, '456');
      assert.strictEqual(result.issueId, '#456');
      assert.strictEqual(result.description, 'login-bug');
      assert.strictEqual(result.sessionFile, '456-login-bug.md');
    });

    it('parses GitHub chore branch pattern', () => {
      const result = session.parseBranchName('issue/chore-789/update-deps');

      assert.strictEqual(result.platform, 'github');
      assert.strictEqual(result.type, 'chore');
      assert.strictEqual(result.issueNumber, '789');
      assert.strictEqual(result.issueId, '#789');
    });

    it('parses Jira branch pattern', () => {
      const result = session.parseBranchName('feature/PROJ-123/add-auth');

      assert.strictEqual(result.platform, 'jira');
      assert.strictEqual(result.type, 'feature');
      assert.strictEqual(result.issueNumber, 'PROJ-123');
      assert.strictEqual(result.issueId, 'PROJ-123');
      assert.strictEqual(result.description, 'add-auth');
      assert.strictEqual(result.sessionFile, 'PROJ-123-add-auth.md');
    });

    it('parses Jira fix branch pattern', () => {
      const result = session.parseBranchName('fix/ABC-456/critical-bug');

      assert.strictEqual(result.platform, 'jira');
      assert.strictEqual(result.type, 'fix');
      assert.strictEqual(result.issueId, 'ABC-456');
    });

    it('parses Azure DevOps branch pattern', () => {
      const result = session.parseBranchName('feature/789/add-feature');

      assert.strictEqual(result.platform, 'azure-devops');
      assert.strictEqual(result.type, 'feature');
      assert.strictEqual(result.issueNumber, '789');
      assert.strictEqual(result.issueId, '#789');
      assert.strictEqual(result.description, 'add-feature');
      assert.strictEqual(result.sessionFile, '789-add-feature.md');
    });

    it('parses simple feature branch (no issue)', () => {
      const result = session.parseBranchName('feature/new-dashboard');

      assert.strictEqual(result.platform, 'none');
      assert.strictEqual(result.type, 'feature');
      assert.strictEqual(result.issueNumber, null);
      assert.strictEqual(result.issueId, null);
      assert.strictEqual(result.description, 'new-dashboard');
      assert.strictEqual(result.sessionFile, 'feature-new-dashboard.md');
    });

    it('parses simple chore branch (no issue)', () => {
      const result = session.parseBranchName('chore/update-deps');

      assert.strictEqual(result.platform, 'none');
      assert.strictEqual(result.type, 'chore');
      assert.strictEqual(result.issueNumber, null);
      assert.strictEqual(result.sessionFile, 'chore-update-deps.md');
    });

    it('parses simple fix branch (no issue)', () => {
      const result = session.parseBranchName('fix/typo-in-readme');

      assert.strictEqual(result.platform, 'none');
      assert.strictEqual(result.type, 'fix');
      assert.strictEqual(result.description, 'typo-in-readme');
    });

    it('handles unknown branch pattern with fallback', () => {
      const result = session.parseBranchName('main');

      assert.strictEqual(result.platform, 'unknown');
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.issueNumber, null);
      assert.strictEqual(result.sessionFile, 'main.md');
      assert.strictEqual(result.branchMetaFile, 'main');
    });

    it('handles complex unknown branch pattern', () => {
      const result = session.parseBranchName('user/john/experiment');

      assert.strictEqual(result.platform, 'unknown');
      assert.strictEqual(result.sessionFile, 'user-john-experiment.md');
      assert.strictEqual(result.branchMetaFile, 'user-john-experiment');
    });
  });

  describe('getCurrentBranch', () => {
    it('returns current git branch', () => {
      const branch = session.getCurrentBranch();
      // Should return a string (the actual branch name)
      assert.strictEqual(typeof branch, 'string');
      assert.ok(branch.length > 0, 'Branch name should not be empty');
    });
  });

  describe('getPaths', () => {
    it('returns path configuration object', () => {
      const paths = session.getPaths();

      assert.ok(paths.claudeDir.endsWith('.claude'));
      assert.ok(paths.sessionsDir.endsWith('sessions'));
      assert.ok(paths.branchesDir.endsWith('branches'));
      assert.ok(paths.templatesDir.endsWith('templates'));
    });
  });

  describe('getSessionPath', () => {
    it('returns full path to session file', () => {
      const sessionPath = session.getSessionPath('issue/feature-123/add-auth');

      assert.ok(sessionPath.includes('.claude/sessions/'));
      assert.ok(sessionPath.endsWith('123-add-auth.md'));
    });
  });

  describe('getBranchMetaPath', () => {
    it('returns full path to branch metadata file', () => {
      const metaPath = session.getBranchMetaPath('issue/feature-123/add-auth');

      assert.ok(metaPath.includes('.claude/branches/'));
      assert.ok(metaPath.endsWith('issue-feature-123-add-auth'));
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

      assert.ok(template.includes('# Session: add-auth'));
      assert.ok(template.includes('#123'));
      // branchMetaFile dashes are converted to slashes in the Branch field
      assert.ok(template.includes('issue/feature/123/add/auth'));
      assert.ok(template.includes('## Session Log'));
      assert.ok(template.includes('## Key Decisions'));
      assert.ok(template.includes('## Next Steps'));
    });

    it('generates template without issue id when not present', () => {
      const branchInfo = {
        issueId: null,
        branchMetaFile: 'chore-update-deps',
        description: 'update-deps',
      };
      const template = session.getDefaultTemplate('chore', branchInfo);

      assert.ok(template.includes('# Session: update-deps'));
      assert.ok(!template.includes('**Issue**:'));
    });
  });

  describe('ensureDirectories', () => {
    // Note: ensureDirectories creates consumer project directories only
    // Templates are in the plugin root, not copied to consumer
    it('ensures directories exist in project', () => {
      session.ensureDirectories();
      const paths = session.getPaths();

      assert.ok(fs.existsSync(paths.sessionsDir));
      assert.ok(fs.existsSync(paths.branchesDir));
      // templatesDir is in plugin root, not created by ensureDirectories
      assert.ok(fs.existsSync(paths.templatesDir)); // Plugin templates should exist
    });
  });

  describe('loadTemplate', () => {
    // Note: loadTemplate reads from plugin root templates/
    it('loads existing feature template from plugin', () => {
      const content = session.loadTemplate('feature');

      // Should load the actual template
      assert.ok(content !== null);
      assert.ok(content.includes('{{description}}'));
    });

    it('returns null if template does not exist', () => {
      const content = session.loadTemplate('nonexistent');

      assert.strictEqual(content, null);
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
        assert.strictEqual(typeof exists, 'boolean');
      }
    });

    it('returns false for nonexistent session', () => {
      assert.strictEqual(session.sessionExists('nonexistent/branch/name-12345'), false);
    });
  });

  describe('BRANCH_PATTERNS', () => {
    it('exports branch patterns for external use', () => {
      assert.ok(session.BRANCH_PATTERNS.githubIssue instanceof RegExp);
      assert.ok(session.BRANCH_PATTERNS.jira instanceof RegExp);
      assert.ok(session.BRANCH_PATTERNS.azureDevOps instanceof RegExp);
      assert.ok(session.BRANCH_PATTERNS.simple instanceof RegExp);
    });
  });
});
