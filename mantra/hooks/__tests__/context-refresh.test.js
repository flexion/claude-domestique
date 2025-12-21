const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');

const {
  processHook,
  loadState,
  saveState,
  findYmlFiles,
  readContextFiles,
  estimateTokens,
  calculateDirTokens,
  calculateTokens,
  loadAllContextContent,
  formatTokens,
  statusLine,
  readInstalledPluginsRegistry,
  getMarketplaceFromPluginId,
  getOwnMarketplace,
  findSiblingContextDirs,
  readStdin,
  parseInput,
  main,
  REFRESH_INTERVAL,
  _setDepsForTesting,
  _resetDeps,
  _setPathsForTesting,
  _resetPaths
} = require('../context-refresh');

describe('context-refresh hook', () => {
  let tmpDir;
  let stateFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-test-'));
    stateFile = path.join(tmpDir, 'state.json');
  });

  afterEach(() => {
    _resetDeps();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('REFRESH_INTERVAL', () => {
    it('is hardcoded to 5', () => {
      expect(REFRESH_INTERVAL).toBe(5);
    });
  });

  describe('loadState', () => {
    it('returns default state when file does not exist', () => {
      const state = loadState(path.join(tmpDir, 'nonexistent.json'));
      expect(state).toEqual({ count: 0 });
    });

    it('loads existing state from file', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 3 }));
      const state = loadState(stateFile);
      expect(state).toEqual({ count: 3 });
    });

    it('returns default state on invalid JSON', () => {
      fs.writeFileSync(stateFile, 'not valid json');
      const state = loadState(stateFile);
      expect(state).toEqual({ count: 0 });
    });
  });

  describe('saveState', () => {
    it('saves state to file', () => {
      saveState(stateFile, { count: 4 });
      const content = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(content).toEqual({ count: 4 });
    });

    it('creates parent directories if needed', () => {
      const nestedStateFile = path.join(tmpDir, 'nested', 'dir', 'state.json');
      saveState(nestedStateFile, { count: 2 });
      expect(fs.existsSync(nestedStateFile)).toBe(true);
    });
  });

  describe('findYmlFiles', () => {
    it('returns empty array when directory does not exist', () => {
      const files = findYmlFiles(path.join(tmpDir, 'nonexistent'));
      expect(files).toEqual([]);
    });

    it('finds .yml files in directory', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'test: true');
      fs.writeFileSync(path.join(contextDir, 'b.yml'), 'test: false');
      fs.writeFileSync(path.join(contextDir, 'readme.md'), '# Readme');

      const files = findYmlFiles(contextDir);
      expect(files).toHaveLength(2);
      expect(files.every(f => f.endsWith('.yml'))).toBe(true);
    });

    it('returns sorted file paths', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'z.yml'), 'z');
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'a');

      const files = findYmlFiles(contextDir);
      expect(path.basename(files[0])).toBe('a.yml');
      expect(path.basename(files[1])).toBe('z.yml');
    });

    it('returns empty array on read error', () => {
      // Create a file (not directory) to cause readdirSync to fail
      const notADir = path.join(tmpDir, 'not-a-dir');
      fs.writeFileSync(notADir, 'content');

      const files = findYmlFiles(notADir);
      expect(files).toEqual([]);
    });
  });

  describe('estimateTokens', () => {
    it('returns 0 for empty or null text', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens(null)).toBe(0);
    });

    it('counts words as tokens', () => {
      expect(estimateTokens('one two three')).toBe(3);
    });

    it('adds extra token for long words', () => {
      // "verylongwordhere" is >10 chars, so counts as 2 tokens
      expect(estimateTokens('verylongwordhere')).toBe(2);
    });

    it('counts punctuation as half tokens', () => {
      // "hello, world!" = 2 words + 2 punct = 2 + 1 = 3 tokens
      expect(estimateTokens('hello, world!')).toBe(3);
    });
  });

  describe('calculateDirTokens', () => {
    it('returns 0 when directory does not exist', () => {
      const tokens = calculateDirTokens(path.join(tmpDir, 'nonexistent'));
      expect(tokens).toBe(0);
    });

    it('calculates total tokens of yml files', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'one two three'); // 3 tokens
      fs.writeFileSync(path.join(contextDir, 'b.yml'), 'four five'); // 2 tokens

      const tokens = calculateDirTokens(contextDir);
      expect(tokens).toBe(5);
    });

    it('ignores non-yml files', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'one two three'); // 3 tokens
      fs.writeFileSync(path.join(contextDir, 'b.md'), 'should be ignored');

      const tokens = calculateDirTokens(contextDir);
      expect(tokens).toBe(3);
    });

    it('handles read errors gracefully', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), 'one two');
      const tokens = calculateDirTokens(contextDir);
      expect(tokens).toBe(2);
    });
  });

  describe('readContextFiles', () => {
    it('reads and formats yml file contents', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const files = [path.join(contextDir, 'test.yml')];
      const content = readContextFiles(files);
      expect(content).toContain('### test.yml');
      expect(content).toContain('key: value');
    });

    it('skips unreadable files gracefully', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'good.yml'), 'good: content');

      const files = [
        path.join(contextDir, 'good.yml'),
        path.join(contextDir, 'nonexistent.yml')  // This file doesn't exist
      ];
      const content = readContextFiles(files);
      expect(content).toContain('good.yml');
      expect(content).toContain('good: content');
      expect(content).not.toContain('nonexistent');
    });

    it('returns empty string for empty file list', () => {
      const content = readContextFiles([]);
      expect(content).toBe('');
    });
  });

  describe('calculateTokens', () => {
    it('returns empty object when no context exists', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      _setPathsForTesting({ baseContextDir: emptyDir });

      const sizes = calculateTokens(tmpDir);
      expect(sizes).toEqual({});
    });

    it('calculates base context tokens', () => {
      const baseDir = path.join(tmpDir, 'base-context');
      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'behavior.yml'), 'one two three four five'); // 5 tokens

      _setPathsForTesting({ baseContextDir: baseDir });

      const tokens = calculateTokens(tmpDir);
      expect(tokens.base).toBe(5);
    });

    it('calculates project context tokens', () => {
      const emptyBase = path.join(tmpDir, 'empty-base');
      fs.mkdirSync(emptyBase, { recursive: true });
      _setPathsForTesting({ baseContextDir: emptyBase });

      const projectDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'project.yml'), 'one two three four five six seven eight nine ten'); // 10 tokens

      const tokens = calculateTokens(tmpDir);
      expect(tokens.project).toBe(10);
    });
  });

  describe('loadAllContextContent', () => {
    it('loads project context content', () => {
      const emptyBase = path.join(tmpDir, 'empty-base');
      fs.mkdirSync(emptyBase, { recursive: true });
      _setPathsForTesting({ baseContextDir: emptyBase });

      const projectDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'project.yml'), 'key: project-value');

      const content = loadAllContextContent(tmpDir);
      expect(content).toContain('project.yml');
      expect(content).toContain('key: project-value');
    });

    it('loads sibling plugin context', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownContextDir = path.join(ownPluginDir, 'context');
      fs.mkdirSync(ownContextDir, { recursive: true });
      fs.writeFileSync(path.join(ownContextDir, 'own.yml'), 'own: value');

      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      const siblingContextDir = path.join(siblingDir, 'context');
      fs.mkdirSync(siblingContextDir, { recursive: true });
      fs.writeFileSync(path.join(siblingContextDir, 'sibling.yml'), 'sibling: content');

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ projectPath: tmpDir, installPath: ownPluginDir }],
          'memento@claude-domestique': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir,
        baseContextDir: ownContextDir
      });

      const content = loadAllContextContent(tmpDir);
      expect(content).toContain('sibling.yml');
      expect(content).toContain('sibling: content');
    });
  });

  describe('formatTokens', () => {
    it('returns "no context" when sizes is empty', () => {
      expect(formatTokens({})).toBe('no context');
    });

    it('formats base tokens', () => {
      expect(formatTokens({ base: 100 })).toBe('base(~100 tokens)');
    });

    it('formats multiple token counts', () => {
      expect(formatTokens({ base: 100, sibling: 50, project: 25 }))
        .toBe('base(~100 tokens) sibling(~50 tokens) project(~25 tokens)');
    });

    it('omits zero values', () => {
      expect(formatTokens({ base: 100, project: 0 })).toBe('base(~100 tokens)');
    });
  });

  describe('statusLine', () => {
    it('shows count without marker when not refreshed', () => {
      expect(statusLine(3, { base: 100 }, false))
        .toBe('📍 Mantra: 3/5 | base(~100 tokens)');
    });

    it('shows checkmark when refreshed', () => {
      expect(statusLine(0, { base: 100 }, true))
        .toBe('📍 Mantra: 0/5 ✅ | base(~100 tokens)');
    });

    it('shows no context when sizes is empty', () => {
      expect(statusLine(2, {}, false))
        .toBe('📍 Mantra: 2/5 | no context');
    });
  });

  describe('processHook', () => {
    beforeEach(() => {
      const emptyBase = path.join(tmpDir, 'empty-base');
      fs.mkdirSync(emptyBase, { recursive: true });
      _setPathsForTesting({ baseContextDir: emptyBase });
    });

    it('increments counter on UserPromptSubmit', () => {
      const config = { stateFile };
      processHook({ cwd: tmpDir }, config);
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(1);
    });

    it('resets counter on SessionStart', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 3 }));
      const config = { stateFile };
      processHook({ cwd: tmpDir, hook_event_name: 'SessionStart' }, config);
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(0);
    });

    it('shows refreshDue when counter reaches interval', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 })); // Next will be 5 % 5 = 0
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.refreshDue).toBe(true);
      expect(result.systemMessage).toContain('✅'); // context injected marker
    });

    it('returns tokens in hookSpecificOutput', () => {
      const projectDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'test.yml'), 'one two three four five'); // 5 tokens

      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.tokens.project).toBe(5);
    });

    it('includes refresh reason on SessionStart with context', () => {
      // Create context file to inject
      const baseDir = path.join(tmpDir, 'base-context');
      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'test.yml'), 'test: value');
      _setPathsForTesting({ baseContextDir: baseDir });

      const config = { stateFile };
      const result = processHook({
        cwd: tmpDir,
        hook_event_name: 'SessionStart',
        source: 'startup'
      }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('session startup');
      expect(result.hookSpecificOutput.additionalContext).toContain('test.yml');
    });

    it('includes refresh reason periodic when counter hits 0', () => {
      // Create context file to inject
      const baseDir = path.join(tmpDir, 'base-context');
      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'test.yml'), 'test: value');
      _setPathsForTesting({ baseContextDir: baseDir });

      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('periodic');
    });

    it('injects context content on refresh', () => {
      // Create context file to inject
      const baseDir = path.join(tmpDir, 'base-context');
      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'behavior.yml'), 'rule: be-helpful');
      _setPathsForTesting({ baseContextDir: baseDir });

      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('behavior.yml');
      expect(result.hookSpecificOutput.additionalContext).toContain('rule: be-helpful');
    });

    it('shows checkmark in status when refresh happens', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.systemMessage).toContain('✅');
    });

    it('shows no checkmark when not refreshing', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 1 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.systemMessage).not.toContain('✅');
    });
  });

  describe('sibling plugin discovery', () => {
    it('getMarketplaceFromPluginId extracts marketplace', () => {
      expect(getMarketplaceFromPluginId('mantra@claude-domestique')).toBe('claude-domestique');
      expect(getMarketplaceFromPluginId('memento@flexion')).toBe('flexion');
    });

    it('getMarketplaceFromPluginId returns null for invalid inputs', () => {
      expect(getMarketplaceFromPluginId('no-at-sign')).toBeNull();
      expect(getMarketplaceFromPluginId('')).toBeNull();
      expect(getMarketplaceFromPluginId(null)).toBeNull();
    });

    it('findSiblingContextDirs returns empty when no registry', () => {
      const dirs = findSiblingContextDirs('/nonexistent/path');
      expect(dirs).toEqual([]);
    });

    it('getOwnMarketplace returns null when registry has plugins but none match installPath', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Registry has plugins but with different installPaths
      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ projectPath: tmpDir, installPath: '/some/other/path' }],
          'memento@claude-domestique': [{ projectPath: tmpDir, installPath: '/another/path' }]
        }
      }));

      const ownPluginDir = path.join(tmpDir, 'my-plugin');
      fs.mkdirSync(ownPluginDir, { recursive: true });

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir // This doesn't match any installPath
      });

      expect(getOwnMarketplace()).toBeNull();
    });

    it('findSiblingContextDirs finds same-marketplace siblings', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      fs.mkdirSync(ownPluginDir, { recursive: true });

      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.writeFileSync(path.join(siblingDir, 'context', 'sibling.yml'), 'test');

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ projectPath: tmpDir, installPath: ownPluginDir }],
          'memento@claude-domestique': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const dirs = findSiblingContextDirs(tmpDir);
      expect(dirs).toHaveLength(1);
      expect(dirs[0].pluginId).toBe('memento@claude-domestique');
    });

    it('findSiblingContextDirs excludes different marketplace', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      fs.mkdirSync(ownPluginDir, { recursive: true });

      const otherDir = path.join(tmpDir, 'other-plugin');
      fs.mkdirSync(path.join(otherDir, 'context'), { recursive: true });

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ projectPath: tmpDir, installPath: ownPluginDir }],
          'other@different-marketplace': [{ projectPath: tmpDir, installPath: otherDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const dirs = findSiblingContextDirs(tmpDir);
      expect(dirs).toEqual([]);
    });

    it('findSiblingContextDirs includes user-scoped plugins', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      fs.mkdirSync(ownPluginDir, { recursive: true });

      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.writeFileSync(path.join(siblingDir, 'context', 'sessions.yml'), 'test');

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ scope: 'user', installPath: ownPluginDir }],
          'memento@claude-domestique': [{ scope: 'user', installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const dirs = findSiblingContextDirs(tmpDir);
      expect(dirs).toHaveLength(1);
    });

    it('findSiblingContextDirs excludes project-scoped plugins for different projects', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      fs.mkdirSync(ownPluginDir, { recursive: true });

      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.writeFileSync(path.join(siblingDir, 'context', 'sessions.yml'), 'test');

      // Project-scoped plugin for different project
      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ projectPath: tmpDir, installPath: ownPluginDir }],
          'memento@claude-domestique': [{ projectPath: '/different/project', installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const dirs = findSiblingContextDirs(tmpDir);
      expect(dirs).toEqual([]); // Excluded because projectPath doesn't match
    });

    it('findSiblingContextDirs excludes siblings without context directory', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      fs.mkdirSync(ownPluginDir, { recursive: true });

      // Sibling exists but has no context directory
      const siblingDir = path.join(tmpDir, 'sibling-no-context');
      fs.mkdirSync(siblingDir, { recursive: true });

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@claude-domestique': [{ projectPath: tmpDir, installPath: ownPluginDir }],
          'memento@claude-domestique': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const dirs = findSiblingContextDirs(tmpDir);
      expect(dirs).toEqual([]); // Excluded because no context dir
    });

    it('readInstalledPluginsRegistry handles parse errors', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');
      fs.writeFileSync(registryFile, 'invalid json {{{');

      _setPathsForTesting({ installedPluginsFile: registryFile });

      const registry = readInstalledPluginsRegistry();
      expect(registry).toBeNull();
    });
  });

  describe('CLI functions', () => {
    describe('readStdin', () => {
      it('reads data from stream', async () => {
        const mockStream = Readable.from(['{"test": ', '"value"}']);
        const result = await readStdin(mockStream);
        expect(result).toBe('{"test": "value"}');
      });

      it('returns empty string for empty stream', async () => {
        const mockStream = Readable.from([]);
        const result = await readStdin(mockStream);
        expect(result).toBe('');
      });
    });

    describe('parseInput', () => {
      it('parses valid JSON', () => {
        const result = parseInput('{"cwd": "/test", "hook_event_name": "SessionStart"}');
        expect(result).toEqual({ cwd: '/test', hook_event_name: 'SessionStart' });
      });

      it('returns default when data is empty', () => {
        const result = parseInput('');
        expect(result).toHaveProperty('cwd');
      });

      it('returns default when data is falsy', () => {
        const result = parseInput(null);
        expect(result).toHaveProperty('cwd');
      });
    });

    describe('main', () => {
      beforeEach(() => {
        const emptyBase = path.join(tmpDir, 'empty-base');
        fs.mkdirSync(emptyBase, { recursive: true });
        _setPathsForTesting({ baseContextDir: emptyBase });
      });

      it('processes input from stream and outputs JSON', async () => {
        const input = JSON.stringify({ cwd: tmpDir, hook_event_name: 'SessionStart' });
        const mockStream = Readable.from([input]);
        let output = '';
        const mockOutput = (data) => { output = data; };

        await main(mockStream, mockOutput);

        const result = JSON.parse(output);
        expect(result).toHaveProperty('systemMessage');
        expect(result).toHaveProperty('hookSpecificOutput');
      });

      it('handles empty input', async () => {
        const mockStream = Readable.from([]);
        let output = '';
        const mockOutput = (data) => { output = data; };

        await main(mockStream, mockOutput);

        const result = JSON.parse(output);
        expect(result).toHaveProperty('systemMessage');
      });
    });
  });

  describe('error handling with mocked fs', () => {
    it('loadState handles JSON parse errors', () => {
      const mockFs = {
        existsSync: () => true,
        readFileSync: () => 'invalid json {{{'
      };
      _setDepsForTesting({ fs: mockFs });

      const state = loadState('/fake/state.json');
      expect(state).toEqual({ count: 0 });
    });

    it('saveState handles write errors silently', () => {
      const mockFs = {
        existsSync: () => false,
        mkdirSync: () => { throw new Error('Permission denied'); },
        writeFileSync: () => { throw new Error('Permission denied'); }
      };
      _setDepsForTesting({ fs: mockFs });

      // Should not throw
      expect(() => saveState('/fake/state.json', { count: 1 })).not.toThrow();
    });

    it('findYmlFiles handles readdirSync errors', () => {
      const mockFs = {
        existsSync: () => true,
        readdirSync: () => { throw new Error('Permission denied'); }
      };
      _setDepsForTesting({ fs: mockFs });

      const files = findYmlFiles('/fake/dir');
      expect(files).toEqual([]);
    });

    it('calculateDirTokens handles readFileSync errors', () => {
      const mockFs = {
        existsSync: () => true,
        readdirSync: () => ['a.yml', 'b.yml'],
        readFileSync: (f) => {
          if (f.includes('a.yml')) return 'one two three'; // 3 tokens
          throw new Error('File not found');
        }
      };
      _setDepsForTesting({ fs: mockFs, paths: { baseContextDir: '/fake/base' } });

      const tokens = calculateDirTokens('/fake/base');
      expect(tokens).toBe(3); // Only a.yml counted, b.yml error handled
    });

    it('readInstalledPluginsRegistry handles read errors', () => {
      const mockFs = {
        existsSync: () => true,
        readFileSync: () => { throw new Error('Permission denied'); }
      };
      _setDepsForTesting({ fs: mockFs, paths: { installedPluginsFile: '/fake/registry.json' } });

      const registry = readInstalledPluginsRegistry();
      expect(registry).toBeNull();
    });

    it('getMarketplaceFromPluginId handles edge case with trailing @', () => {
      expect(getMarketplaceFromPluginId('plugin@')).toBeNull();
    });
  });
});
