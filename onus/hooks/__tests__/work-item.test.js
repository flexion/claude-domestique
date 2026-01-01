/**
 * Tests for onus work-item hook - plugin-specific logic only
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  loadState,
  saveState,
  loadProjectConfig,
  loadWorkItemCache,
  saveWorkItemCache,
  extractIssueFromBranch,
  detectPlatform,
  getCommitFormat,
  getCachedWorkItem,
  createPlaceholderWorkItem,
  formatWorkItemContext,
  DEFAULT_CONFIG,
  PLATFORM_CONFIG
} = require('../work-item.js');

describe('onus work-item hook', () => {
  let tmpDir;
  let stateFile;
  let cacheFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onus-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    cacheFile = path.join(tmpDir, 'cache.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractIssueFromBranch', () => {
    const patterns = DEFAULT_CONFIG.branchPatterns;

    it('extracts issue from issue/feature-N/description format', () => {
      expect(extractIssueFromBranch('issue/feature-42/user-login', patterns)).toBe('42');
      expect(extractIssueFromBranch('issue/bug-123/fix-crash', patterns)).toBe('123');
      expect(extractIssueFromBranch('issue/fix-99/hotfix', patterns)).toBe('99');
    });

    it('extracts issue from feature/N-description format', () => {
      expect(extractIssueFromBranch('feature/42-user-login', patterns)).toBe('42');
      expect(extractIssueFromBranch('bug/123-fix-crash', patterns)).toBe('123');
    });

    it('extracts issue from N-description format', () => {
      expect(extractIssueFromBranch('42-user-login', patterns)).toBe('42');
      expect(extractIssueFromBranch('123-fix-crash', patterns)).toBe('123');
    });

    it('extracts JIRA-style keys', () => {
      expect(extractIssueFromBranch('PROJ-123-description', patterns)).toBe('PROJ-123');
      expect(extractIssueFromBranch('ABC-1-short', patterns)).toBe('ABC-1');
    });

    it('extracts from #N references', () => {
      expect(extractIssueFromBranch('feature-with-#42-ref', patterns)).toBe('42');
    });

    it('returns null for branches without issue reference', () => {
      expect(extractIssueFromBranch('main', patterns)).toBeNull();
      expect(extractIssueFromBranch('develop', patterns)).toBeNull();
      expect(extractIssueFromBranch('feature/no-number', patterns)).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(extractIssueFromBranch(null, patterns)).toBeNull();
      expect(extractIssueFromBranch(undefined, patterns)).toBeNull();
    });
  });

  describe('detectPlatform', () => {
    it('detects JIRA from key format', () => {
      expect(detectPlatform('PROJ-123')).toBe('jira');
      expect(detectPlatform('ABC-1')).toBe('jira');
      expect(detectPlatform('LONGPROJ-99999')).toBe('jira');
    });

    it('detects GitHub from numeric format', () => {
      expect(detectPlatform('42')).toBe('github');
      expect(detectPlatform('123')).toBe('github');
      expect(detectPlatform('99999')).toBe('github');
    });

    it('defaults to GitHub for unknown formats', () => {
      expect(detectPlatform('unknown')).toBe('github');
      expect(detectPlatform('')).toBe('github');
    });

    it('returns github for null/undefined', () => {
      expect(detectPlatform(null)).toBe('github');
      expect(detectPlatform(undefined)).toBe('github');
    });
  });

  describe('getCommitFormat', () => {
    it('returns string format as-is', () => {
      expect(getCommitFormat('{number} - {description}')).toBe('{number} - {description}');
    });

    it('extracts issue format from object', () => {
      const objFormat = {
        issue: '{number} - {verb} {description}',
        chore: 'chore - {description}'
      };
      expect(getCommitFormat(objFormat, 'issue')).toBe('{number} - {verb} {description}');
      expect(getCommitFormat(objFormat, 'chore')).toBe('chore - {description}');
    });

    it('defaults to issue format when type not specified', () => {
      const objFormat = {
        issue: 'issue format',
        chore: 'chore format'
      };
      expect(getCommitFormat(objFormat)).toBe('issue format');
    });

    it('falls back to issue format when type not found in object', () => {
      const objFormat = { issue: 'issue format' };
      expect(getCommitFormat(objFormat, 'unknown')).toBe('issue format');
    });

    it('returns default format for null/undefined', () => {
      expect(getCommitFormat(null)).toBe('{number} - {verb} {description}');
      expect(getCommitFormat(undefined)).toBe('{number} - {verb} {description}');
    });
  });

  describe('loadState and saveState', () => {
    it('returns default state when file does not exist', () => {
      const state = loadState(stateFile);
      expect(state).toEqual({ currentIssue: null, currentBranch: null });
    });

    it('saves and loads state correctly', () => {
      const testState = {
        currentIssue: '42',
        currentBranch: 'feature/42-test',
        sessionStart: '2024-01-01T00:00:00Z'
      };

      saveState(stateFile, testState);
      const loaded = loadState(stateFile);
      expect(loaded).toEqual(testState);
    });

    it('handles corrupted state file gracefully', () => {
      fs.writeFileSync(stateFile, 'not json');
      const state = loadState(stateFile);
      expect(state).toEqual({ currentIssue: null, currentBranch: null });
    });
  });

  describe('loadWorkItemCache and saveWorkItemCache', () => {
    it('returns empty cache when file does not exist', () => {
      const cache = loadWorkItemCache(cacheFile);
      expect(cache).toEqual({ items: {}, lastUpdated: null });
    });

    it('saves and loads cache correctly', () => {
      const testCache = {
        items: {
          'github:42': {
            key: '42',
            title: 'Test issue',
            cachedAt: Date.now()
          }
        },
        lastUpdated: Date.now()
      };

      saveWorkItemCache(cacheFile, testCache);
      const loaded = loadWorkItemCache(cacheFile);
      expect(loaded).toEqual(testCache);
    });
  });

  describe('getCachedWorkItem', () => {
    it('returns null when item not in cache', () => {
      const cache = { items: {} };
      expect(getCachedWorkItem(cache, '42', 'github')).toBeNull();
    });

    it('returns item when in cache and fresh', () => {
      const cache = {
        items: {
          'github:42': {
            key: '42',
            title: 'Test',
            cachedAt: Date.now()
          }
        }
      };
      const item = getCachedWorkItem(cache, '42', 'github');
      expect(item.key).toBe('42');
      expect(item.stale).toBeUndefined();
    });

    it('marks item as stale when old', () => {
      const cache = {
        items: {
          'github:42': {
            key: '42',
            title: 'Test',
            cachedAt: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
          }
        }
      };
      const item = getCachedWorkItem(cache, '42', 'github');
      expect(item.stale).toBe(true);
    });
  });

  describe('createPlaceholderWorkItem', () => {
    it('creates placeholder with correct structure', () => {
      const item = createPlaceholderWorkItem('42', 'github');
      expect(item.key).toBe('42');
      expect(item.platform).toBe('github');
      expect(item.placeholder).toBe(true);
      expect(item.title).toBe('Issue 42');
      expect(item.cachedAt).toBeDefined();
    });

    it('works for JIRA keys', () => {
      const item = createPlaceholderWorkItem('PROJ-123', 'jira');
      expect(item.key).toBe('PROJ-123');
      expect(item.platform).toBe('jira');
      expect(item.title).toBe('Issue PROJ-123');
    });
  });

  describe('formatWorkItemContext', () => {
    const cfg = DEFAULT_CONFIG;

    it('returns null for null work item', () => {
      expect(formatWorkItemContext(null, cfg)).toBeNull();
    });

    it('formats placeholder correctly', () => {
      const item = createPlaceholderWorkItem('42', 'github');
      const formatted = formatWorkItemContext(item, cfg);
      expect(formatted).toContain('Issue details not yet fetched');
      expect(formatted).toContain('/fetch 42');
      expect(formatted).toContain('Commit format');
    });

    it('formats full work item correctly', () => {
      const item = {
        key: '42',
        title: 'User login feature',
        type: 'feature',
        status: 'In Progress',
        description: 'Implement user login',
        acceptanceCriteria: ['Login form', 'Validation'],
        labels: ['auth', 'priority:high'],
        url: 'https://github.com/org/repo/issues/42'
      };
      const formatted = formatWorkItemContext(item, cfg);
      expect(formatted).toContain('42');
      expect(formatted).toContain('User login feature');
      expect(formatted).toContain('feature');
      expect(formatted).toContain('In Progress');
      expect(formatted).toContain('Login form');
      expect(formatted).toContain('auth, priority:high');
    });

    it('truncates long descriptions', () => {
      const item = {
        key: '42',
        title: 'Test',
        description: 'a'.repeat(600)
      };
      const formatted = formatWorkItemContext(item, cfg);
      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(1000);
    });

    it('handles object-style commitFormat', () => {
      const objectCfg = {
        ...cfg,
        commitFormat: {
          issue: '{number} - {verb} {description}',
          chore: 'chore - {description}'
        }
      };
      const item = createPlaceholderWorkItem('42', 'github');
      const formatted = formatWorkItemContext(item, objectCfg);
      expect(formatted).toContain('42 - {verb} {description}');
    });
  });

  describe('loadProjectConfig', () => {
    it('returns empty object when config does not exist', () => {
      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config).toEqual({});
    });

    it('loads onus config from file', () => {
      const claudeDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(claudeDir, 'config.json'),
        JSON.stringify({
          onus: {
            platform: 'jira',
            commitFormat: 'custom format'
          }
        })
      );

      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config.platform).toBe('jira');
      expect(config.commitFormat).toBe('custom format');
    });

    it('handles corrupted config gracefully', () => {
      const claudeDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'config.json'), 'not json');

      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config).toEqual({});
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('has required fields', () => {
      expect(DEFAULT_CONFIG.stateFile).toBeDefined();
      expect(DEFAULT_CONFIG.cacheFile).toBeDefined();
      expect(DEFAULT_CONFIG.configFile).toBeDefined();
      expect(DEFAULT_CONFIG.branchPatterns).toBeInstanceOf(Array);
      expect(DEFAULT_CONFIG.commitFormat).toBeDefined();
      expect(DEFAULT_CONFIG.branchFormat).toBeDefined();
    });
  });

  describe('PLATFORM_CONFIG', () => {
    it('has configuration for all platforms', () => {
      expect(PLATFORM_CONFIG.github).toBeDefined();
      expect(PLATFORM_CONFIG.jira).toBeDefined();
      expect(PLATFORM_CONFIG.azure).toBeDefined();
    });
  });
});
