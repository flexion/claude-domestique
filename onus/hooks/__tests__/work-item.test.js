/**
 * Tests for claude-onus work-item hook
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  processHook,
  processSessionStart,
  processUserPromptSubmit,
  buildContextContent,
  loadState,
  saveState,
  loadProjectConfig,
  loadWorkItemCache,
  saveWorkItemCache,
  extractIssueFromBranch,
  detectPlatform,
  findYmlFiles,
  findBaseContextFiles,
  readContextFiles,
  getCachedWorkItem,
  createPlaceholderWorkItem,
  formatWorkItemContext,
  generateSessionStartMessage,
  generatePromptSubmitMessage,
  ensureStateDir,
  DEFAULT_CONFIG,
  PLATFORM_CONFIG
} = require('../work-item.js');

describe('work-item hook', () => {
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

  describe('loadState and saveState', () => {
    it('returns default state when file does not exist', () => {
      const state = loadState(stateFile);
      expect(state).toEqual({
        currentIssue: null,
        currentBranch: null,
        sessionStart: null,
        lastPrompt: null
      });
    });

    it('saves and loads state correctly', () => {
      const testState = {
        currentIssue: '42',
        currentBranch: 'feature/42-test',
        sessionStart: '2024-01-01T00:00:00Z',
        lastPrompt: '2024-01-01T01:00:00Z'
      };

      saveState(stateFile, testState);
      const loaded = loadState(stateFile);
      expect(loaded).toEqual(testState);
    });

    it('handles corrupted state file gracefully', () => {
      fs.writeFileSync(stateFile, 'not json');
      const state = loadState(stateFile);
      expect(state).toEqual({
        currentIssue: null,
        currentBranch: null,
        sessionStart: null,
        lastPrompt: null
      });
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
  });

  describe('generateSessionStartMessage', () => {
    it('shows no issue message when no issue detected', () => {
      const state = { currentIssue: null };
      const msg = generateSessionStartMessage(state, null);
      expect(msg).toContain('No issue detected');
    });

    it('shows issue with title when available', () => {
      const state = { currentIssue: '42' };
      const workItem = { key: '42', title: 'User login' };
      const msg = generateSessionStartMessage(state, workItem);
      expect(msg).toContain('42');
      expect(msg).toContain('User login');
    });

    it('shows issue without title for placeholder', () => {
      const state = { currentIssue: '42' };
      const workItem = createPlaceholderWorkItem('42', 'github');
      const msg = generateSessionStartMessage(state, workItem);
      expect(msg).toContain('42');
      expect(msg).toContain('not fetched');
    });
  });

  describe('generatePromptSubmitMessage', () => {
    it('shows no issue when none detected', () => {
      const state = { currentIssue: null };
      const msg = generatePromptSubmitMessage(state, null, false);
      expect(msg).toContain('Onus: No issue');
    });

    it('shows issue number when present', () => {
      const state = { currentIssue: '42' };
      const msg = generatePromptSubmitMessage(state, null, false);
      expect(msg).toContain('Onus: #42');
    });

    it('shows staged changes indicator', () => {
      const state = { currentIssue: '42' };
      const msg = generatePromptSubmitMessage(state, null, true);
      expect(msg).toContain('staged');
    });
  });

  describe('findYmlFiles', () => {
    it('returns empty array for non-existent directory', () => {
      const files = findYmlFiles('/nonexistent/path');
      expect(files).toEqual([]);
    });

    it('finds yml files in directory', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir);
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'a: 1');
      fs.writeFileSync(path.join(contextDir, 'b.yml'), 'b: 2');
      fs.writeFileSync(path.join(contextDir, 'c.txt'), 'not yml');

      const files = findYmlFiles(contextDir);
      expect(files).toHaveLength(2);
      expect(files[0]).toContain('a.yml');
      expect(files[1]).toContain('b.yml');
    });

    it('returns sorted files', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir);
      fs.writeFileSync(path.join(contextDir, 'z.yml'), 'z');
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'a');
      fs.writeFileSync(path.join(contextDir, 'm.yml'), 'm');

      const files = findYmlFiles(contextDir);
      expect(path.basename(files[0])).toBe('a.yml');
      expect(path.basename(files[1])).toBe('m.yml');
      expect(path.basename(files[2])).toBe('z.yml');
    });
  });

  describe('readContextFiles', () => {
    it('reads and concatenates files with headers', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir);
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'content: a');
      fs.writeFileSync(path.join(contextDir, 'b.yml'), 'content: b');

      const files = [
        path.join(contextDir, 'a.yml'),
        path.join(contextDir, 'b.yml')
      ];
      const content = readContextFiles(files);

      expect(content).toContain('### a.yml');
      expect(content).toContain('content: a');
      expect(content).toContain('### b.yml');
      expect(content).toContain('content: b');
    });

    it('skips unreadable files', () => {
      const files = ['/nonexistent/file.yml'];
      const content = readContextFiles(files);
      expect(content).toBe('');
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

  describe('processHook', () => {
    it('routes to SessionStart handler', () => {
      const input = {
        hook_event_name: 'SessionStart',
        cwd: tmpDir,
        source: 'startup'
      };
      const config = { stateFile, cacheFile };

      const result = processHook(input, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.systemMessage).toBeDefined();
    });

    it('routes to UserPromptSubmit handler', () => {
      const input = {
        hook_event_name: 'UserPromptSubmit',
        cwd: tmpDir
      };
      const config = { stateFile, cacheFile };

      const result = processHook(input, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });

    it('defaults to UserPromptSubmit for unknown event', () => {
      const input = { cwd: tmpDir };
      const config = { stateFile, cacheFile };

      const result = processHook(input, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });
  });

  describe('processSessionStart', () => {
    it('resets state on session start', () => {
      // Pre-populate state
      saveState(stateFile, {
        currentIssue: 'old-42',
        lastPrompt: '2024-01-01'
      });

      const input = {
        hook_event_name: 'SessionStart',
        cwd: tmpDir,
        source: 'startup'
      };
      const config = { stateFile, cacheFile };

      processSessionStart(input, config);

      const state = loadState(stateFile);
      expect(state.sessionStart).toBeDefined();
      // Branch detection will fail in tmpDir, so issue should be null
      expect(state.currentBranch).toBeNull();
    });

    it('returns context content', () => {
      const input = {
        hook_event_name: 'SessionStart',
        cwd: tmpDir,
        source: 'startup'
      };
      const config = { stateFile, cacheFile };

      const result = processSessionStart(input, config);

      expect(result.hookSpecificOutput.additionalContext).toBeDefined();
      expect(result.systemMessage).toBeDefined();
    });
  });

  describe('processUserPromptSubmit', () => {
    it('updates lastPrompt timestamp', () => {
      const input = {
        hook_event_name: 'UserPromptSubmit',
        cwd: tmpDir
      };
      const config = { stateFile, cacheFile };

      processUserPromptSubmit(input, config);

      const state = loadState(stateFile);
      expect(state.lastPrompt).toBeDefined();
    });

    it('returns minimal context for prompts', () => {
      const input = {
        hook_event_name: 'UserPromptSubmit',
        cwd: tmpDir
      };
      const config = { stateFile, cacheFile };

      const result = processUserPromptSubmit(input, config);

      expect(result.hookSpecificOutput.additionalContext).toBeDefined();
      expect(result.systemMessage).toBeDefined();
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

    it('has URL patterns for all platforms', () => {
      expect(PLATFORM_CONFIG.github.issueUrlPattern).toBeDefined();
      expect(PLATFORM_CONFIG.jira.issueUrlPattern).toBeDefined();
      expect(PLATFORM_CONFIG.azure.issueUrlPattern).toBeDefined();
    });
  });
});
