#!/usr/bin/env node
/**
 * mantra: Minimal context refresh hook
 *
 * - Tracks interaction count
 * - Calculates context sizes by source
 * - Directly injects context content on refresh
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const STATE_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'mantra-state.json');
const INSTALLED_PLUGINS_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'plugins', 'installed_plugins.json');
const REFRESH_INTERVAL = 5;

// Injectable dependencies for testing
let _deps = {
  fs,
  paths: { pluginRoot: PLUGIN_ROOT, baseContextDir: BASE_CONTEXT_DIR, installedPluginsFile: INSTALLED_PLUGINS_FILE }
};

function _setDepsForTesting(overrides) {
  _deps = {
    fs: overrides.fs || _deps.fs,
    paths: { ..._deps.paths, ...overrides.paths }
  };
}

function _resetDeps() {
  _deps = {
    fs,
    paths: { pluginRoot: PLUGIN_ROOT, baseContextDir: BASE_CONTEXT_DIR, installedPluginsFile: INSTALLED_PLUGINS_FILE }
  };
}

// Legacy alias for backward compatibility
function _setPathsForTesting(overrides) { _setDepsForTesting({ paths: overrides }); }
function _resetPaths() { _resetDeps(); }

function loadState(stateFile = STATE_FILE) {
  try {
    return _deps.fs.existsSync(stateFile) ? JSON.parse(_deps.fs.readFileSync(stateFile, 'utf8')) : { count: 0 };
  } catch {
    return { count: 0 };
  }
}

function saveState(stateFile, state) {
  try {
    const dir = path.dirname(stateFile);
    if (!_deps.fs.existsSync(dir)) _deps.fs.mkdirSync(dir, { recursive: true });
    _deps.fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch {}
}

function findYmlFiles(dirPath) {
  try {
    if (!_deps.fs.existsSync(dirPath)) return [];
    return _deps.fs.readdirSync(dirPath).filter(f => f.endsWith('.yml')).sort().map(f => path.join(dirPath, f));
  } catch {
    return [];
  }
}

function readContextFiles(files) {
  const contents = [];
  for (const file of files) {
    try {
      const content = _deps.fs.readFileSync(file, 'utf8');
      const basename = path.basename(file);
      contents.push(`### ${basename}\n${content}`);
    } catch {
      // Skip unreadable files
    }
  }
  return contents.join('\n\n');
}

function calculateDirSize(dirPath) {
  const files = findYmlFiles(dirPath);
  return files.reduce((sum, f) => {
    try {
      return sum + _deps.fs.statSync(f).size;
    } catch {
      return sum;
    }
  }, 0);
}

function readInstalledPluginsRegistry() {
  try {
    if (_deps.fs.existsSync(_deps.paths.installedPluginsFile)) {
      return JSON.parse(_deps.fs.readFileSync(_deps.paths.installedPluginsFile, 'utf8'));
    }
  } catch {}
  return null;
}

function getMarketplaceFromPluginId(pluginId) {
  if (!pluginId || typeof pluginId !== 'string') return null;
  const atIndex = pluginId.indexOf('@');
  return atIndex === -1 ? null : (pluginId.slice(atIndex + 1) || null);
}

function getOwnMarketplace() {
  const registry = readInstalledPluginsRegistry();
  if (!registry?.plugins) return null;
  for (const [pluginId, installations] of Object.entries(registry.plugins)) {
    for (const inst of installations) {
      if (inst.installPath === _deps.paths.pluginRoot) return getMarketplaceFromPluginId(pluginId);
    }
  }
  return null;
}

function findSiblingContextDirs(cwd) {
  const registry = readInstalledPluginsRegistry();
  if (!registry?.plugins) return [];
  const ownMarketplace = getOwnMarketplace();
  const dirs = [];
  for (const [pluginId, installations] of Object.entries(registry.plugins)) {
    for (const inst of installations) {
      const isUserScoped = inst.scope === 'user';
      const isProjectMatch = inst.projectPath === cwd;
      if (!isUserScoped && !isProjectMatch) continue;
      if (inst.installPath === _deps.paths.pluginRoot) continue;
      const siblingMarketplace = getMarketplaceFromPluginId(pluginId);
      if (siblingMarketplace !== ownMarketplace) continue;
      const contextDir = path.join(inst.installPath, 'context');
      if (_deps.fs.existsSync(contextDir)) dirs.push({ pluginId, contextDir });
    }
  }
  return dirs;
}

function calculateSizes(cwd) {
  const sizes = {};

  // Base context
  const baseSize = calculateDirSize(_deps.paths.baseContextDir);
  if (baseSize > 0) sizes.base = baseSize;

  // Sibling plugins
  const siblings = findSiblingContextDirs(cwd);
  let siblingTotal = 0;
  for (const s of siblings) siblingTotal += calculateDirSize(s.contextDir);
  if (siblingTotal > 0) sizes.sibling = siblingTotal;

  // Project context
  const projectDir = path.join(cwd, '.claude', 'context');
  const projectSize = calculateDirSize(projectDir);
  if (projectSize > 0) sizes.project = projectSize;

  return sizes;
}

function loadAllContextContent(cwd) {
  const sections = [];

  // Base context
  const baseFiles = findYmlFiles(_deps.paths.baseContextDir);
  if (baseFiles.length > 0) {
    const baseContent = readContextFiles(baseFiles);
    sections.push(baseContent);
  }

  // Sibling plugins
  const siblings = findSiblingContextDirs(cwd);
  for (const s of siblings) {
    const siblingFiles = findYmlFiles(s.contextDir);
    if (siblingFiles.length > 0) {
      const siblingContent = readContextFiles(siblingFiles);
      sections.push(siblingContent);
    }
  }

  // Project context
  const projectDir = path.join(cwd, '.claude', 'context');
  const projectFiles = findYmlFiles(projectDir);
  if (projectFiles.length > 0) {
    const projectContent = readContextFiles(projectFiles);
    sections.push(projectContent);
  }

  return sections.join('\n\n');
}

function formatSizes(sizes) {
  const parts = [];
  if (sizes.base) parts.push(`base(${sizes.base})`);
  if (sizes.sibling) parts.push(`sibling(${sizes.sibling})`);
  if (sizes.project) parts.push(`project(${sizes.project})`);
  return parts.length > 0 ? parts.join(' ') : 'no context';
}

function statusLine(count, sizes, refreshed) {
  const sizeStr = formatSizes(sizes);
  // Show ✅ when context was injected this prompt
  const marker = refreshed ? ' ✅' : '';
  return `Mantra: ${count}/${REFRESH_INTERVAL}${marker} | ${sizeStr}`;
}

function processHook(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const stateFile = config.stateFile || STATE_FILE;
  const event = input.hook_event_name || 'UserPromptSubmit';
  const isStart = event === 'SessionStart';

  // State management
  let state = isStart ? { count: 0 } : loadState(stateFile);
  if (!isStart) state.count = (state.count + 1) % REFRESH_INTERVAL;
  const refreshDue = state.count === 0;
  const shouldRefresh = refreshDue || isStart;
  saveState(stateFile, state);

  // Calculate sizes
  const sizes = calculateSizes(cwd);

  // Build output
  const msg = statusLine(state.count, sizes, shouldRefresh);
  let context = msg;

  // Inject actual context content on refresh
  if (shouldRefresh) {
    const reason = isStart ? `session ${input.source || 'startup'}` : 'periodic';
    const content = loadAllContextContent(cwd);
    if (content) {
      context += `\n\n---\n**Context Refresh** (${reason})\n${content}`;
    }
  }

  return {
    systemMessage: msg,
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: context,
      refreshDue: shouldRefresh,
      sizes
    }
  };
}

async function readStdin(stream = process.stdin) {
  let data = '';
  for await (const chunk of stream) data += chunk;
  return data;
}

function parseInput(data) {
  return data ? JSON.parse(data) : { cwd: process.cwd() };
}

async function main(stream = process.stdin, output = console.log) {
  const data = await readStdin(stream);
  const input = parseInput(data);
  output(JSON.stringify(processHook(input)));
}

module.exports = {
  processHook,
  loadState,
  saveState,
  findYmlFiles,
  readContextFiles,
  calculateDirSize,
  calculateSizes,
  loadAllContextContent,
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
  _setDepsForTesting,
  _resetDeps,
  _setPathsForTesting,
  _resetPaths
};

if (require.main === module) main().catch(() => process.exit(1));
