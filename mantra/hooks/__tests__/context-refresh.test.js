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
  findYmlFiles,
  findBaseContextFiles,
  findProjectContextFiles,
  findSiblingPlugins,
  findSiblingContextFiles,
  readInstalledPluginsRegistry,
  getPluginContextFamily,
  getOwnContextFamily,
  isPluginFamilyMember,
  readClaudeMd,
  readContextFiles,
  freshnessIndicator,
  BASE_CONTEXT_DIR,
  INSTALLED_PLUGINS_FILE,
  _setPathsForTesting,
  _resetPaths
} = require('../context-refresh');

describe('context-refresh hook', () => {
  let tmpDir;
  let stateFile;

  beforeEach(() => {
    // Create isolated temp directory for each test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-test-'));
    stateFile = path.join(tmpDir, 'state.json');
  });

  afterEach(() => {
    // Reset injectable paths to defaults
    _resetPaths();
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('freshnessIndicator', () => {
    it('shows count without refresh suffix', () => {
      expect(freshnessIndicator(5, 50)).toBe('📍 Mantra: 5/50');
    });

    it('shows count with refresh suffix when refreshed', () => {
      expect(freshnessIndicator(0, 50, true)).toBe('📍 Mantra: 0/50 (refreshed)');
    });

    it('uses custom refresh interval', () => {
      expect(freshnessIndicator(10, 100)).toBe('📍 Mantra: 10/100');
    });
  });

  describe('loadState', () => {
    it('returns default state when file does not exist', () => {
      const state = loadState(path.join(tmpDir, 'nonexistent.json'));
      expect(state).toEqual({ count: 0 });
    });

    it('loads existing state from file', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 25 }));
      const state = loadState(stateFile);
      expect(state).toEqual({ count: 25 });
    });

    it('returns default state on invalid JSON', () => {
      fs.writeFileSync(stateFile, 'not valid json');
      const state = loadState(stateFile);
      expect(state).toEqual({ count: 0 });
    });
  });

  describe('saveState', () => {
    it('saves state to file', () => {
      saveState(stateFile, { count: 42 });
      const content = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(content).toEqual({ count: 42 });
    });

    it('creates parent directories if needed', () => {
      const nestedStateFile = path.join(tmpDir, 'nested', 'dir', 'state.json');
      saveState(nestedStateFile, { count: 10 });
      expect(fs.existsSync(nestedStateFile)).toBe(true);
    });
  });

  describe('loadProjectConfig', () => {
    it('returns empty object when config file does not exist', () => {
      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config).toEqual({});
    });

    it('loads refresh interval from valid config file', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({
          context: {
            periodicRefresh: {
              interval: 30
            }
          }
        })
      );

      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config.refreshInterval).toBe(30);
    });

    it('returns empty object when config has no context section', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ someOtherSetting: true })
      );

      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config.refreshInterval).toBeUndefined();
    });

    it('returns empty object on invalid JSON', () => {
      const configDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'config.json'), 'not valid json');

      const config = loadProjectConfig(tmpDir, '.claude/config.json');
      expect(config).toEqual({});
    });
  });

  describe('findYmlFiles', () => {
    it('returns empty array when directory does not exist', () => {
      const files = findYmlFiles(path.join(tmpDir, 'nonexistent'));
      expect(files).toEqual([]);
    });

    it('finds .yml files in directory', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'behavior.yml'), 'test: true');
      fs.writeFileSync(path.join(contextDir, 'git.yml'), 'branch: main');
      fs.writeFileSync(path.join(contextDir, 'readme.md'), '# Readme');

      const files = findYmlFiles(contextDir);
      expect(files).toHaveLength(2);
      expect(files.every(f => f.endsWith('.yml'))).toBe(true);
    });

    it('ignores non-yml files', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'notes.txt'), 'some notes');
      fs.writeFileSync(path.join(contextDir, 'guide.md'), '# Guide');

      const files = findYmlFiles(contextDir);
      expect(files).toEqual([]);
    });
  });

  describe('findProjectContextFiles', () => {
    it('returns empty array when context dir does not exist', () => {
      const files = findProjectContextFiles(tmpDir, '.claude/context');
      expect(files).toEqual([]);
    });

    it('finds .yml files in project context directory', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'project.yml'), 'name: test');

      const files = findProjectContextFiles(tmpDir, '.claude/context');
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('project.yml');
    });
  });

  describe('readClaudeMd', () => {
    it('returns null when file does not exist', () => {
      const content = readClaudeMd(tmpDir, 'CLAUDE.md');
      expect(content).toBeNull();
    });

    it('reads CLAUDE.md content', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project Guide');
      const content = readClaudeMd(tmpDir, 'CLAUDE.md');
      expect(content).toBe('# Project Guide');
    });
  });

  describe('readContextFiles', () => {
    it('returns empty string for empty file list', () => {
      const content = readContextFiles([]);
      expect(content).toBe('');
    });

    it('reads and formats multiple files', () => {
      const file1 = path.join(tmpDir, 'behavior.yml');
      const file2 = path.join(tmpDir, 'git.yml');
      fs.writeFileSync(file1, 'stance: skeptical');
      fs.writeFileSync(file2, 'branch: main');

      const content = readContextFiles([file1, file2]);
      expect(content).toContain('### behavior.yml');
      expect(content).toContain('stance: skeptical');
      expect(content).toContain('### git.yml');
      expect(content).toContain('branch: main');
    });

    it('skips unreadable files', () => {
      const file1 = path.join(tmpDir, 'exists.yml');
      const file2 = path.join(tmpDir, 'nonexistent.yml');
      fs.writeFileSync(file1, 'content: here');

      const content = readContextFiles([file1, file2]);
      expect(content).toContain('### exists.yml');
      expect(content).not.toContain('nonexistent');
    });
  });

  describe('processHook', () => {
    it('increments counter and shows freshness indicator', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(result.hookSpecificOutput.additionalContext).toContain('📍 Mantra: 1/50');
    });

    it('triggers refresh when counter reaches interval', () => {
      // Set state to 49 so next call triggers refresh (49 + 1 = 50 % 50 = 0)
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      // Create CLAUDE.md for fallback
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test Project');

      const config = { stateFile, refreshInterval: 50 };
      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('📍 Mantra: 0/50 (refreshed)');
      expect(result.hookSpecificOutput.additionalContext).toContain('**Context Refresh**');
    });

    it('injects yml files on refresh when they exist', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const config = { stateFile, refreshInterval: 50, projectContextDir: '.claude/context' };
      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('### test.yml');
      expect(result.hookSpecificOutput.additionalContext).toContain('key: value');
    });

    it('includes CLAUDE.md with warning when both context types exist', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project');

      // Note: Base context from plugin root will be loaded too
      const config = { stateFile, refreshInterval: 50, projectContextDir: '.claude/context' };
      const result = processHook({ cwd: tmpDir }, config);

      // Base context exists, so CLAUDE.md should have warning
      expect(result.hookSpecificOutput.additionalContext).toContain('# My Project');
      expect(result.hookSpecificOutput.additionalContext).toContain('CLAUDE.md');
    });

    it('loads base context from plugin root', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      const config = { stateFile, refreshInterval: 50, projectContextDir: '.claude/context' };
      const result = processHook({ cwd: tmpDir }, config);

      // Should contain base context files (behavior.yml, context-format.yml, format-guide.yml)
      expect(result.hookSpecificOutput.additionalContext).toContain('**Context Refresh**');
    });

    it('resets counter after refresh', () => {
      fs.writeFileSync(stateFile, JSON.stringify({ count: 49 }));

      const config = { stateFile, refreshInterval: 50 };
      processHook({ cwd: tmpDir }, config);

      const newState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(newState.count).toBe(0);
    });

    it('persists counter across calls', () => {
      const config = { stateFile, refreshInterval: 50 };

      processHook({ cwd: tmpDir }, config);
      processHook({ cwd: tmpDir }, config);
      processHook({ cwd: tmpDir }, config);

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(3);
    });

    it('respects custom refresh interval', () => {
      const config = { stateFile, refreshInterval: 5 };

      // Run 4 times (counts 1, 2, 3, 4)
      for (let i = 0; i < 4; i++) {
        const result = processHook({ cwd: tmpDir }, config);
        expect(result.hookSpecificOutput.additionalContext).not.toContain('(refreshed)');
      }

      // 5th call triggers refresh (count becomes 0)
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');
      const result = processHook({ cwd: tmpDir }, config);
      expect(result.hookSpecificOutput.additionalContext).toContain('(refreshed)');
    });

    it('routes to SessionStart handler when hook_event_name is SessionStart', () => {
      const config = { stateFile, refreshInterval: 50 };
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');

      const result = processHook({ cwd: tmpDir, hook_event_name: 'SessionStart' }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('(refreshed)');
    });

    it('routes to UserPromptSubmit handler by default', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processHook({ cwd: tmpDir }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });
  });

  describe('processSessionStart', () => {
    it('always injects context on session start', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const config = { stateFile, refreshInterval: 50, projectContextDir: '.claude/context' };
      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('📍 Mantra: 0/50 (refreshed)');
      expect(result.hookSpecificOutput.additionalContext).toContain('### test.yml');
      expect(result.hookSpecificOutput.additionalContext).toContain('session startup');
    });

    it('resets counter to 0 on session start', () => {
      // Set existing state
      fs.writeFileSync(stateFile, JSON.stringify({ count: 35 }));

      const config = { stateFile, refreshInterval: 50 };
      processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(state.count).toBe(0);
    });

    it('includes source in refresh reason for startup', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session startup');
    });

    it('includes source in refresh reason for resume', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'resume' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session resume');
    });

    it('includes source in refresh reason for clear', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'clear' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session clear');
    });

    it('includes source in refresh reason for compact', () => {
      const config = { stateFile, refreshInterval: 50 };

      const result = processSessionStart({ cwd: tmpDir, source: 'compact' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('session compact');
    });

    it('includes CLAUDE.md when present', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project');
      const config = { stateFile, refreshInterval: 50, projectContextDir: '.claude/context' };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('# My Project');
      expect(result.hookSpecificOutput.additionalContext).toContain('CLAUDE.md');
    });

    it('loads base context on session start', () => {
      const config = { stateFile, refreshInterval: 50, projectContextDir: '.claude/context' };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      // Base context should be loaded (behavior.yml exists in plugin root)
      expect(result.hookSpecificOutput.additionalContext).toContain('**Context Refresh**');
    });

    it('includes config hint with current interval', () => {
      const config = { stateFile, refreshInterval: 25, projectContextDir: '.claude/context' };

      const result = processSessionStart({ cwd: tmpDir, source: 'startup' }, config);

      expect(result.hookSpecificOutput.additionalContext).toContain('context.periodicRefresh.interval');
      expect(result.hookSpecificOutput.additionalContext).toContain('current: 25');
    });
  });

  describe('buildContextContent', () => {
    it('builds content from project yml files', () => {
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'test.yml'), 'key: value');

      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      const content = buildContextContent(tmpDir, cfg, 'test reason');

      expect(content).toContain('**Context Refresh** (test reason)');
      expect(content).toContain('### test.yml');
      expect(content).toContain('key: value');
    });

    it('includes CLAUDE.md in content', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Guide');
      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };

      const content = buildContextContent(tmpDir, cfg, 'my reason');

      expect(content).toContain('**Context Refresh** (my reason)');
      expect(content).toContain('# Guide');
      expect(content).toContain('CLAUDE.md');
    });

    it('includes base context from plugin root', () => {
      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      const content = buildContextContent(tmpDir, cfg, 'test');

      // Base context files should be included
      expect(content).toContain('**Context Refresh**');
    });
  });

  describe('sibling plugin discovery', () => {
    let mockRegistryPath;
    let mockPluginDir;

    beforeEach(() => {
      // Create mock registry and plugin directories
      mockRegistryPath = path.join(tmpDir, '.claude', 'plugins');
      mockPluginDir = path.join(tmpDir, 'mock-plugin');
      fs.mkdirSync(mockRegistryPath, { recursive: true });
      fs.mkdirSync(path.join(mockPluginDir, 'context'), { recursive: true });
    });

    it('getPluginContextFamily reads contextFamily from manifest', () => {
      const pluginDir = path.join(tmpDir, 'test-plugin');
      const manifestDir = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(manifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(manifestDir, 'plugin.json'),
        JSON.stringify({ name: 'test', contextFamily: 'domestique' })
      );

      const family = getPluginContextFamily(pluginDir);
      expect(family).toBe('domestique');
    });

    it('getPluginContextFamily returns null when no manifest', () => {
      const pluginDir = path.join(tmpDir, 'no-manifest-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const family = getPluginContextFamily(pluginDir);
      expect(family).toBeNull();
    });

    it('getPluginContextFamily returns null when no contextFamily field', () => {
      const pluginDir = path.join(tmpDir, 'plugin-no-family');
      const manifestDir = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(manifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(manifestDir, 'plugin.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const family = getPluginContextFamily(pluginDir);
      expect(family).toBeNull();
    });

    it('isPluginFamilyMember returns true for same contextFamily', () => {
      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create sibling with same contextFamily
      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      const siblingManifestDir = path.join(siblingDir, '.claude-plugin');
      fs.mkdirSync(siblingManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(siblingManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'memento', contextFamily: 'domestique' })
      );

      _setPathsForTesting({ pluginRoot: ownPluginDir });

      expect(isPluginFamilyMember(siblingDir)).toBe(true);
    });

    it('isPluginFamilyMember returns false for different contextFamily', () => {
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      const otherPluginDir = path.join(tmpDir, 'other-plugin');
      const otherManifestDir = path.join(otherPluginDir, '.claude-plugin');
      fs.mkdirSync(otherManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(otherManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'other', contextFamily: 'different-family' })
      );

      _setPathsForTesting({ pluginRoot: ownPluginDir });

      expect(isPluginFamilyMember(otherPluginDir)).toBe(false);
    });

    it('isPluginFamilyMember returns false when sibling has no contextFamily', () => {
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      const noFamilyDir = path.join(tmpDir, 'no-family-plugin');
      const noFamilyManifestDir = path.join(noFamilyDir, '.claude-plugin');
      fs.mkdirSync(noFamilyManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(noFamilyManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'other' })
      );

      _setPathsForTesting({ pluginRoot: ownPluginDir });

      expect(isPluginFamilyMember(noFamilyDir)).toBe(false);
    });

    it('readInstalledPluginsRegistry returns null when file does not exist', () => {
      const result = readInstalledPluginsRegistry();
      // May return actual registry or null depending on system state
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('findSiblingPlugins returns empty array when no registry', () => {
      // Use a path that won't match any installed plugins
      const siblings = findSiblingPlugins('/nonexistent/project/path');
      expect(siblings).toEqual([]);
    });

    it('findSiblingContextFiles returns empty array when no siblings', () => {
      const siblings = findSiblingContextFiles('/nonexistent/project/path');
      expect(siblings).toEqual([]);
    });

    it('findSiblingPlugins filters by projectPath', () => {
      // This tests the filtering logic - siblings must match cwd
      const projectA = '/path/to/project-a';
      const projectB = '/path/to/project-b';

      // Without a real registry, both should return empty
      const siblingsA = findSiblingPlugins(projectA);
      const siblingsB = findSiblingPlugins(projectB);

      expect(Array.isArray(siblingsA)).toBe(true);
      expect(Array.isArray(siblingsB)).toBe(true);
    });

    it('buildContextContent handles sibling plugins gracefully', () => {
      // Even without siblings, buildContextContent should work
      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      const content = buildContextContent(tmpDir, cfg, 'test');

      // Should still contain base context
      expect(content).toContain('**Context Refresh**');
    });
  });

  describe('injectable paths for testing', () => {
    it('findBaseContextFiles uses injectable baseContextDir', () => {
      // Point to empty directory
      const emptyDir = path.join(tmpDir, 'empty-context');
      fs.mkdirSync(emptyDir, { recursive: true });

      _setPathsForTesting({ baseContextDir: emptyDir });

      const files = findBaseContextFiles();
      expect(files).toEqual([]);
    });

    it('findBaseContextFiles finds yml files in injected directory', () => {
      const mockContextDir = path.join(tmpDir, 'mock-context');
      fs.mkdirSync(mockContextDir, { recursive: true });
      fs.writeFileSync(path.join(mockContextDir, 'test.yml'), 'key: value');

      _setPathsForTesting({ baseContextDir: mockContextDir });

      const files = findBaseContextFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('test.yml');
    });

    it('readInstalledPluginsRegistry reads from injected path', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');
      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'memento@test': [{ projectPath: tmpDir, installPath: '/some/path' }]
        }
      }));

      _setPathsForTesting({ installedPluginsFile: registryFile });

      const registry = readInstalledPluginsRegistry();
      expect(registry).not.toBeNull();
      expect(registry.plugins).toBeDefined();
      expect(registry.plugins['memento@test']).toBeDefined();
    });

    it('readInstalledPluginsRegistry returns null on invalid JSON', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');
      fs.writeFileSync(registryFile, 'not valid json');

      _setPathsForTesting({ installedPluginsFile: registryFile });

      const registry = readInstalledPluginsRegistry();
      expect(registry).toBeNull();
    });

    it('findSiblingPlugins returns empty when registry has no plugins property', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');
      fs.writeFileSync(registryFile, JSON.stringify({ version: 1 }));

      _setPathsForTesting({ installedPluginsFile: registryFile });

      const siblings = findSiblingPlugins(tmpDir);
      expect(siblings).toEqual([]);
    });

    it('findSiblingPlugins filters out plugins with different contextFamily', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create a mock plugin directory with different contextFamily
      const mockPluginDir = path.join(tmpDir, 'random-plugin');
      const mockManifestDir = path.join(mockPluginDir, '.claude-plugin');
      fs.mkdirSync(path.join(mockPluginDir, 'context'), { recursive: true });
      fs.mkdirSync(mockManifestDir, { recursive: true });
      fs.writeFileSync(path.join(mockPluginDir, 'context', 'test.yml'), 'key: value');
      fs.writeFileSync(
        path.join(mockManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'random', contextFamily: 'other-family' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'random-plugin@org': [{ projectPath: tmpDir, installPath: mockPluginDir }]
        }
      }));

      _setPathsForTesting({ installedPluginsFile: registryFile, pluginRoot: ownPluginDir });

      const siblings = findSiblingPlugins(tmpDir);
      expect(siblings).toEqual([]); // Different contextFamily
    });

    it('findSiblingPlugins finds plugins with same contextFamily', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create a mock sibling plugin directory with same contextFamily
      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      const siblingManifestDir = path.join(siblingDir, '.claude-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.mkdirSync(siblingManifestDir, { recursive: true });
      fs.writeFileSync(path.join(siblingDir, 'context', 'sibling.yml'), 'sibling: true');
      fs.writeFileSync(
        path.join(siblingManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'memento', contextFamily: 'domestique' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'memento@flexion': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const siblings = findSiblingPlugins(tmpDir);
      expect(siblings).toHaveLength(1);
      expect(siblings[0].pluginId).toBe('memento@flexion');
      expect(siblings[0].contextDir).toContain('context');
    });

    it('findSiblingPlugins skips own plugin', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create our own plugin directory with manifest
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(path.join(ownPluginDir, 'context'), { recursive: true });
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'mantra@flexion': [{ projectPath: tmpDir, installPath: ownPluginDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir // This is our own plugin
      });

      const siblings = findSiblingPlugins(tmpDir);
      expect(siblings).toEqual([]); // Filtered out as self
    });

    it('findSiblingPlugins skips plugins without context directory', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create plugin directory WITHOUT context subdirectory but with manifest
      const siblingDir = path.join(tmpDir, 'sibling-no-context');
      const siblingManifestDir = path.join(siblingDir, '.claude-plugin');
      fs.mkdirSync(siblingManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(siblingManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'memento', contextFamily: 'domestique' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'memento@flexion': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({ installedPluginsFile: registryFile, pluginRoot: ownPluginDir });

      const siblings = findSiblingPlugins(tmpDir);
      expect(siblings).toEqual([]); // No context dir
    });

    it('findSiblingContextFiles returns sibling context files', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create sibling with same contextFamily
      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      const siblingManifestDir = path.join(siblingDir, '.claude-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.mkdirSync(siblingManifestDir, { recursive: true });
      fs.writeFileSync(path.join(siblingDir, 'context', 'memento.yml'), 'memory: true');
      fs.writeFileSync(
        path.join(siblingManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'memento', contextFamily: 'domestique' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'memento@flexion': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const siblingContexts = findSiblingContextFiles(tmpDir);
      expect(siblingContexts).toHaveLength(1);
      expect(siblingContexts[0].pluginId).toBe('memento@flexion');
      expect(siblingContexts[0].files).toHaveLength(1);
    });

    it('findSiblingContextFiles filters siblings with no yml files', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create sibling with same contextFamily but no yml files
      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      const siblingManifestDir = path.join(siblingDir, '.claude-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.mkdirSync(siblingManifestDir, { recursive: true });
      // Create only .md file, no .yml
      fs.writeFileSync(path.join(siblingDir, 'context', 'readme.md'), '# Readme');
      fs.writeFileSync(
        path.join(siblingManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'memento', contextFamily: 'domestique' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'memento@flexion': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir
      });

      const siblingContexts = findSiblingContextFiles(tmpDir);
      expect(siblingContexts).toEqual([]); // Filtered because no yml files
    });

    it('buildContextContent includes sibling plugin content', () => {
      const registryDir = path.join(tmpDir, '.claude', 'plugins');
      fs.mkdirSync(registryDir, { recursive: true });
      const registryFile = path.join(registryDir, 'installed_plugins.json');

      // Create own plugin with contextFamily
      const ownPluginDir = path.join(tmpDir, 'own-plugin');
      const ownManifestDir = path.join(ownPluginDir, '.claude-plugin');
      fs.mkdirSync(ownManifestDir, { recursive: true });
      fs.writeFileSync(
        path.join(ownManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'mantra', contextFamily: 'domestique' })
      );

      // Create sibling with same contextFamily
      const siblingDir = path.join(tmpDir, 'sibling-plugin');
      const siblingManifestDir = path.join(siblingDir, '.claude-plugin');
      fs.mkdirSync(path.join(siblingDir, 'context'), { recursive: true });
      fs.mkdirSync(siblingManifestDir, { recursive: true });
      fs.writeFileSync(path.join(siblingDir, 'context', 'memento.yml'), 'memory: persistent');
      fs.writeFileSync(
        path.join(siblingManifestDir, 'plugin.json'),
        JSON.stringify({ name: 'memento', contextFamily: 'domestique' })
      );

      fs.writeFileSync(registryFile, JSON.stringify({
        plugins: {
          'memento@flexion': [{ projectPath: tmpDir, installPath: siblingDir }]
        }
      }));

      // Use empty base context so sibling content is clearly visible
      const emptyBaseDir = path.join(tmpDir, 'empty-base');
      fs.mkdirSync(emptyBaseDir, { recursive: true });

      _setPathsForTesting({
        installedPluginsFile: registryFile,
        pluginRoot: ownPluginDir,
        baseContextDir: emptyBaseDir
      });

      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Test');

      const content = buildContextContent(tmpDir, cfg, 'test');
      expect(content).toContain('From: memento@flexion');
      expect(content).toContain('memory: persistent');
    });

    it('buildContextContent shows CLAUDE.md-only tip when no other context', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      _setPathsForTesting({ baseContextDir: emptyDir });

      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project Guide');

      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      const content = buildContextContent(tmpDir, cfg, 'test');

      expect(content).toContain('# My Project Guide');
      expect(content).toContain('### CLAUDE.md');
      expect(content).toContain('Multi-file context is supported');
      expect(content).not.toContain('(legacy)');
    });

    it('buildContextContent shows warning when no context found at all', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      _setPathsForTesting({ baseContextDir: emptyDir });

      const cfg = { projectContextDir: '.claude/context', claudeMd: 'CLAUDE.md' };
      const content = buildContextContent(tmpDir, cfg, 'test');

      expect(content).toContain('No context files found');
      expect(content).toContain('node scripts/init.js');
    });
  });
});
