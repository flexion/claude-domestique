const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');

const {
  processHook,
  loadState,
  saveState,
  findYmlFiles,
  calculateDirSize,
  calculateSizes,
  formatSizes,
  statusLine,
  readInstalledPluginsRegistry,
  getMarketplaceFromPluginId,
  getOwnMarketplace,
  findSiblingContextDirs,
  readStdin,
  parseInput,
  main,
  REFRESH_INTERVAL,
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
    _resetPaths();
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

  describe('calculateDirSize', () => {
    it('returns 0 when directory does not exist', () => {
      const size = calculateDirSize(path.join(tmpDir, 'nonexistent'));
      expect(size).toBe(0);
    });

    it('calculates total size of yml files', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), '12345'); // 5 bytes
      fs.writeFileSync(path.join(contextDir, 'b.yml'), '1234567890'); // 10 bytes

      const size = calculateDirSize(contextDir);
      expect(size).toBe(15);
    });

    it('ignores non-yml files', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), '12345');
      fs.writeFileSync(path.join(contextDir, 'b.md'), '1234567890');

      const size = calculateDirSize(contextDir);
      expect(size).toBe(5);
    });

    it('handles stat errors gracefully', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'a.yml'), '12345');
      // Size should still work even if we can't stat some files
      const size = calculateDirSize(contextDir);
      expect(size).toBe(5);
    });
  });

  describe('calculateSizes', () => {
    it('returns empty object when no context exists', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      _setPathsForTesting({ baseContextDir: emptyDir });

      const sizes = calculateSizes(tmpDir);
      expect(sizes).toEqual({});
    });

    it('calculates base context size', () => {
      const baseDir = path.join(tmpDir, 'base-context');
      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'behavior.yml'), '12345');

      _setPathsForTesting({ baseContextDir: baseDir });

      const sizes = calculateSizes(tmpDir);
      expect(sizes.base).toBe(5);
    });

    it('calculates project context size', () => {
      const emptyBase = path.join(tmpDir, 'empty-base');
      fs.mkdirSync(emptyBase, { recursive: true });
      _setPathsForTesting({ baseContextDir: emptyBase });

      const projectDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'project.yml'), '1234567890');

      const sizes = calculateSizes(tmpDir);
      expect(sizes.project).toBe(10);
    });
  });

  describe('formatSizes', () => {
    it('returns "no context" when sizes is empty', () => {
      expect(formatSizes({})).toBe('no context');
    });

    it('formats base size', () => {
      expect(formatSizes({ base: 100 })).toBe('base(100)');
    });

    it('formats multiple sizes', () => {
      expect(formatSizes({ base: 100, sibling: 50, project: 25 }))
        .toBe('base(100) sibling(50) project(25)');
    });

    it('omits zero values', () => {
      expect(formatSizes({ base: 100, project: 0 })).toBe('base(100)');
    });
  });

  describe('statusLine', () => {
    it('shows count without marker when not refreshed', () => {
      expect(statusLine(3, false, { base: 100 }, false))
        .toBe('Mantra: 3/5 | base(100)');
    });

    it('shows pending marker when refresh due but not confirmed', () => {
      expect(statusLine(0, true, { base: 100 }, false))
        .toBe('Mantra: 0/5 ⏳ | base(100)');
    });

    it('shows confirmed marker when skill confirmed', () => {
      expect(statusLine(1, false, { base: 100 }, true))
        .toBe('Mantra: 1/5 ✅ | base(100)');
    });

    it('shows no context when sizes is empty', () => {
      expect(statusLine(2, false, {}, false))
        .toBe('Mantra: 2/5 | no context');
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
      expect(result.hookSpecificOutput.additionalContext).toContain('⏳'); // pending marker
    });

    it('returns sizes in hookSpecificOutput', () => {
      const projectDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'test.yml'), '12345');

      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.sizes.project).toBe(5);
    });

    it('includes refresh reason on SessionStart', () => {
      const config = { stateFile };
      const result = processHook({
        cwd: tmpDir,
        hook_event_name: 'SessionStart',
        source: 'startup'
      }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('session startup');
    });

    it('includes refresh reason periodic when counter hits 0', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('periodic');
    });

    it('mentions skill for context loading on refresh', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('context-refresh skill');
    });

    it('returns skillConfirmed false when not confirmed', () => {
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.skillConfirmed).toBe(false);
    });

    it('returns skillConfirmed true when state has skillConfirmed', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 1, skillConfirmed: true }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.skillConfirmed).toBe(true);
    });

    it('resets skillConfirmed on refresh', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 4, skillConfirmed: true }));
      const config = { stateFile };
      processHook({ cwd: tmpDir }, config); // triggers refresh
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.skillConfirmed).toBe(false);
      expect(state.refreshPending).toBe(true);
    });

    it('shows pending marker in status when refresh due', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 4 }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.systemMessage).toContain('⏳');
    });

    it('shows confirmed marker when skill has confirmed', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 1, skillConfirmed: true }));
      const config = { stateFile };
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.systemMessage).toContain('✅');
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
});
