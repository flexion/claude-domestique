#!/usr/bin/env node
/**
 * mantra: Periodic context refresh hook
 *
 * Runs on:
 * - SessionStart: Inject context immediately on new/resumed sessions
 * - UserPromptSubmit: Track interaction count, refresh periodically
 *
 * Features:
 * 1. Track interaction count
 * 2. Show freshness indicator every prompt
 * 3. Inject context files on refresh (every N interactions or session start)
 *
 * Context Loading Order:
 * 1. Base context from this plugin (context/*.yml)
 * 2. Sibling plugin context (from other plugins installed in same project)
 * 3. Project extensions from cwd (.claude/context/*.yml)
 * 4. CLAUDE.md (if present, with warning about potential confusion)
 */

const fs = require('fs');
const path = require('path');

// Find plugin root by navigating up from this script's location
// Hook is at: <plugin-root>/hooks/context-refresh.js
// So plugin root is: __dirname/../
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');

// Installed plugins registry location
const INSTALLED_PLUGINS_FILE = path.join(
  process.env.HOME || '/tmp',
  '.claude',
  'plugins',
  'installed_plugins.json'
);

// Injectable paths for testing (defaults to constants above)
let _paths = {
  pluginRoot: PLUGIN_ROOT,
  baseContextDir: BASE_CONTEXT_DIR,
  installedPluginsFile: INSTALLED_PLUGINS_FILE
};

/**
 * Override paths for testing purposes
 * @param {Object} overrides - Path overrides
 */
function _setPathsForTesting(overrides) {
  _paths = { ..._paths, ...overrides };
}

/**
 * Reset paths to defaults
 */
function _resetPaths() {
  _paths = {
    pluginRoot: PLUGIN_ROOT,
    baseContextDir: BASE_CONTEXT_DIR,
    installedPluginsFile: INSTALLED_PLUGINS_FILE
  };
}

// Default configuration
const DEFAULT_CONFIG = {
  refreshInterval: 20,
  stateFile: path.join(process.env.HOME || '/tmp', '.claude', 'mantra-state.json'),
  projectContextDir: '.claude/context',
  claudeMd: 'CLAUDE.md',
  configFile: '.claude/config.json'
};

// Load project config from .claude/config.json
function loadProjectConfig(cwd, configFile) {
  const configPath = path.join(cwd, configFile);
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // Extract mantra-relevant settings (only if defined)
      const result = {};
      const interval = config.context?.periodicRefresh?.interval;
      if (interval !== undefined) {
        result.refreshInterval = interval;
      }
      return result;
    }
  } catch (e) {
    // Ignore errors, use defaults
  }
  return {};
}

// Load state from file
function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors, return default
  }
  return { count: 0 };
}

// Save state to file
function saveState(stateFile, state) {
  try {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch (e) {
    // Ignore save errors
  }
}

/**
 * Find all .yml files in a directory (absolute path)
 * @param {string} dirPath - Absolute path to directory
 * @returns {string[]} - Array of absolute file paths
 */
function findYmlFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.yml'))
      .sort() // Consistent ordering
      .map(f => path.join(dirPath, f));
  } catch (e) {
    return [];
  }
}

/**
 * Find base context files from plugin root
 * @returns {string[]} - Array of absolute file paths
 */
function findBaseContextFiles() {
  return findYmlFiles(_paths.baseContextDir);
}

/**
 * Read the installed plugins registry
 * @returns {Object|null} - Parsed registry or null if not found/invalid
 */
function readInstalledPluginsRegistry() {
  try {
    if (fs.existsSync(_paths.installedPluginsFile)) {
      return JSON.parse(fs.readFileSync(_paths.installedPluginsFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors, return null
  }
  return null;
}

// Known plugin family - only load context from these siblings
const PLUGIN_FAMILY = [
  'mantra',
  'memento',
  'onus'
];

/**
 * Check if a plugin ID belongs to the known plugin family
 * @param {string} pluginId - Plugin ID (e.g., "memento@flexion-memento")
 * @returns {boolean} - True if plugin is in the family
 */
function isPluginFamilyMember(pluginId) {
  return PLUGIN_FAMILY.some(name => pluginId.startsWith(name));
}

/**
 * Find sibling plugins installed in the same project
 * Only includes plugins from the known family (mantra, memento, onus)
 * @param {string} cwd - Current working directory (project path)
 * @returns {Array<{pluginId: string, installPath: string, contextDir: string}>} - Sibling plugins with context
 */
function findSiblingPlugins(cwd) {
  const registry = readInstalledPluginsRegistry();
  if (!registry || !registry.plugins) {
    return [];
  }

  const siblings = [];

  for (const [pluginId, installations] of Object.entries(registry.plugins)) {
    // Only include plugins from the known family
    if (!isPluginFamilyMember(pluginId)) {
      continue;
    }

    for (const installation of installations) {
      // Only include plugins installed for the same project
      if (installation.projectPath === cwd) {
        const contextDir = path.join(installation.installPath, 'context');
        // Only include if plugin has a context directory
        if (fs.existsSync(contextDir)) {
          // Skip our own plugin (avoid duplicate loading)
          if (installation.installPath !== _paths.pluginRoot) {
            siblings.push({
              pluginId,
              installPath: installation.installPath,
              contextDir
            });
          }
        }
      }
    }
  }

  return siblings;
}

/**
 * Find context files from sibling plugins
 * @param {string} cwd - Current working directory
 * @returns {Array<{pluginId: string, files: string[]}>} - Sibling plugins and their context files
 */
function findSiblingContextFiles(cwd) {
  const siblings = findSiblingPlugins(cwd);
  return siblings.map(sibling => ({
    pluginId: sibling.pluginId,
    files: findYmlFiles(sibling.contextDir)
  })).filter(s => s.files.length > 0);
}

/**
 * Find project context files from cwd
 * @param {string} cwd - Current working directory
 * @param {string} contextDir - Relative path to context directory
 * @returns {string[]} - Array of absolute file paths
 */
function findProjectContextFiles(cwd, contextDir) {
  const contextPath = path.join(cwd, contextDir);
  return findYmlFiles(contextPath);
}

// Read CLAUDE.md file
function readClaudeMd(cwd, claudeMdFile) {
  const claudePath = path.join(cwd, claudeMdFile);
  try {
    if (fs.existsSync(claudePath)) {
      return fs.readFileSync(claudePath, 'utf8');
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

/**
 * Read and concatenate context files with section headers
 * @param {string[]} files - Array of file paths
 * @param {string} sectionLabel - Label for this section (e.g., "Base", "Project")
 * @returns {string} - Concatenated content
 */
function readContextFiles(files, sectionLabel = '') {
  const contents = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const basename = path.basename(file);
      contents.push(`### ${basename}\n${content}`);
    } catch (e) {
      // Skip unreadable files
    }
  }
  return contents.join('\n\n');
}

// Build freshness indicator
function freshnessIndicator(count, refreshInterval, refreshed = false) {
  const suffix = refreshed ? ' (refreshed)' : '';
  return `📍 Mantra: ${count}/${refreshInterval}${suffix}`;
}

/**
 * Build context content for injection
 * Loading order: base context -> sibling plugins -> project extensions -> CLAUDE.md
 * @param {string} cwd - Current working directory
 * @param {Object} cfg - Configuration
 * @param {string} reason - Reason for refresh (e.g., "session start", "periodic")
 * @returns {string} - Context content to inject
 */
function buildContextContent(cwd, cfg, reason) {
  const contextParts = [];
  let hasContext = false;

  // 1. Load base context from plugin root
  const baseFiles = findBaseContextFiles();
  if (baseFiles.length > 0) {
    const baseContent = readContextFiles(baseFiles, 'Base');
    contextParts.push(baseContent);
    hasContext = true;
  }

  // 2. Load sibling plugin context (plugins installed in same project)
  const siblingContexts = findSiblingContextFiles(cwd);
  for (const sibling of siblingContexts) {
    const siblingContent = readContextFiles(sibling.files, sibling.pluginId);
    if (siblingContent) {
      contextParts.push(`## From: ${sibling.pluginId}\n${siblingContent}`);
      hasContext = true;
    }
  }

  // 3. Load project extensions
  const projectFiles = findProjectContextFiles(cwd, cfg.projectContextDir);
  if (projectFiles.length > 0) {
    const projectContent = readContextFiles(projectFiles, 'Project');
    contextParts.push(projectContent);
    hasContext = true;
  }

  // 4. Handle CLAUDE.md
  const claudeMd = readClaudeMd(cwd, cfg.claudeMd);
  if (claudeMd) {
    if (hasContext) {
      // Both modular context and CLAUDE.md exist - warn about confusion
      contextParts.push(`### CLAUDE.md (legacy)\n${claudeMd}`);
      contextParts.push('\n⚠️ **Warning**: Both `.claude/context/` and `CLAUDE.md` exist. Consider migrating CLAUDE.md content to modular context files to avoid confusion.');
    } else {
      // Only CLAUDE.md exists - use it as primary context
      contextParts.push(`### CLAUDE.md\n${claudeMd}`);
      contextParts.push('\n💡 **Tip**: Multi-file context is supported in `.claude/context/`. Run `node scripts/init.js` to set up modular context.');
    }
    hasContext = true;
  }

  // No context found at all
  if (!hasContext) {
    return `\n---\n**Context Refresh** (${reason})\n⚠️ No context files found. Run \`node scripts/init.js\` to set up context, or create \`.claude/context/*.yml\` files.`;
  }

  return `\n---\n**Context Refresh** (${reason})\n` + contextParts.join('\n\n');
}

/**
 * Process SessionStart hook - inject context immediately
 * @param {Object} input - Hook input from stdin
 * @param {Object} config - Configuration overrides
 * @returns {Object} - Hook output for stdout
 */
function processSessionStart(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig, ...config };
  const source = input.source || 'startup';

  // Reset counter on session start
  const state = { count: 0 };
  saveState(cfg.stateFile, state);

  // Build output
  const contextParts = [];

  // Freshness indicator shows reset state
  contextParts.push(freshnessIndicator(0, cfg.refreshInterval, true));

  // Config hint for new sessions
  contextParts.push(`💡 Adjust refresh interval in .claude/config.json: \`context.periodicRefresh.interval\` (current: ${cfg.refreshInterval})`);

  // Always inject context on session start
  const reason = `session ${source}`;
  contextParts.push(buildContextContent(cwd, cfg, reason));

  return {
    systemMessage: freshnessIndicator(0, cfg.refreshInterval, true),
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: contextParts.join('\n')
    }
  };
}

/**
 * Process UserPromptSubmit hook - track count, refresh periodically
 * @param {Object} input - Hook input from stdin
 * @param {Object} config - Configuration overrides
 * @returns {Object} - Hook output for stdout
 */
function processUserPromptSubmit(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig, ...config };

  // Load and increment state
  const state = loadState(cfg.stateFile);
  state.count = (state.count + 1) % cfg.refreshInterval;
  const shouldRefresh = state.count === 0;

  // Build output
  const contextParts = [];

  // Always add freshness indicator
  contextParts.push(freshnessIndicator(state.count, cfg.refreshInterval, shouldRefresh));

  // On refresh, inject context
  if (shouldRefresh) {
    contextParts.push(buildContextContent(cwd, cfg, 'periodic'));
  }

  // Save updated state
  saveState(cfg.stateFile, state);

  return {
    systemMessage: freshnessIndicator(state.count, cfg.refreshInterval, shouldRefresh),
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextParts.join('\n')
    }
  };
}

/**
 * Core hook logic - routes to appropriate handler based on event type
 * @param {Object} input - Hook input from stdin
 * @param {Object} config - Configuration overrides
 * @returns {Object} - Hook output for stdout
 */
function processHook(input, config = {}) {
  const eventName = input.hook_event_name || 'UserPromptSubmit';

  if (eventName === 'SessionStart') {
    return processSessionStart(input, config);
  }

  return processUserPromptSubmit(input, config);
}

// Main CLI wrapper
async function main() {
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input;
  try {
    input = JSON.parse(inputData);
  } catch (e) {
    process.exit(0);
  }

  const output = processHook(input);
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Export for testing
module.exports = {
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
  isPluginFamilyMember,
  readClaudeMd,
  readContextFiles,
  freshnessIndicator,
  DEFAULT_CONFIG,
  PLUGIN_ROOT,
  BASE_CONTEXT_DIR,
  INSTALLED_PLUGINS_FILE,
  PLUGIN_FAMILY,
  // Testing helpers
  _setPathsForTesting,
  _resetPaths
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
