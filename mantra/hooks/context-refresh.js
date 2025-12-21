#!/usr/bin/env node
/**
 * mantra: Minimal context refresh hook
 *
 * - Tracks interaction count
 * - Calculates context sizes by source
 * - Hands off to skill for content loading/injection
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const STATE_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'mantra-state.json');
const INSTALLED_PLUGINS_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'plugins', 'installed_plugins.json');
const REFRESH_INTERVAL = 5;

// Injectable paths for testing
let _paths = { pluginRoot: PLUGIN_ROOT, baseContextDir: BASE_CONTEXT_DIR, installedPluginsFile: INSTALLED_PLUGINS_FILE };
function _setPathsForTesting(overrides) { _paths = { ..._paths, ...overrides }; }
function _resetPaths() { _paths = { pluginRoot: PLUGIN_ROOT, baseContextDir: BASE_CONTEXT_DIR, installedPluginsFile: INSTALLED_PLUGINS_FILE }; }

function loadState(stateFile = STATE_FILE) {
  try { return fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { count: 0 }; }
  catch { return { count: 0 }; }
}

function saveState(stateFile, state) {
  try {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch {}
}

function findYmlFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).filter(f => f.endsWith('.yml')).sort().map(f => path.join(dirPath, f));
  } catch { return []; }
}

function calculateDirSize(dirPath) {
  const files = findYmlFiles(dirPath);
  return files.reduce((sum, f) => {
    try { return sum + fs.statSync(f).size; } catch { return sum; }
  }, 0);
}

function readInstalledPluginsRegistry() {
  try {
    if (fs.existsSync(_paths.installedPluginsFile)) {
      return JSON.parse(fs.readFileSync(_paths.installedPluginsFile, 'utf8'));
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
      if (inst.installPath === _paths.pluginRoot) return getMarketplaceFromPluginId(pluginId);
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
      if (inst.installPath === _paths.pluginRoot) continue;
      const siblingMarketplace = getMarketplaceFromPluginId(pluginId);
      if (siblingMarketplace !== ownMarketplace) continue;
      const contextDir = path.join(inst.installPath, 'context');
      if (fs.existsSync(contextDir)) dirs.push({ pluginId, contextDir });
    }
  }
  return dirs;
}

function calculateSizes(cwd) {
  const sizes = {};

  // Base context
  const baseSize = calculateDirSize(_paths.baseContextDir);
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

function formatSizes(sizes) {
  const parts = [];
  if (sizes.base) parts.push(`base(${sizes.base})`);
  if (sizes.sibling) parts.push(`sibling(${sizes.sibling})`);
  if (sizes.project) parts.push(`project(${sizes.project})`);
  return parts.length > 0 ? parts.join(' ') : 'no context';
}

function statusLine(count, refreshed, sizes, skillConfirmed) {
  const sizeStr = formatSizes(sizes);
  // Show ✅ if skill confirmed, ⏳ if refresh pending, nothing otherwise
  let statusMarker = '';
  if (skillConfirmed) {
    statusMarker = ' ✅';
  } else if (refreshed) {
    statusMarker = ' ⏳';
  }
  return `Mantra: ${count}/${REFRESH_INTERVAL}${statusMarker} | ${sizeStr}`;
}

function processHook(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const stateFile = config.stateFile || STATE_FILE;
  const event = input.hook_event_name || 'UserPromptSubmit';
  const isStart = event === 'SessionStart';

  // State management
  let state = isStart ? { count: 0, refreshPending: false, skillConfirmed: false } : loadState(stateFile);
  if (!isStart) state.count = (state.count + 1) % REFRESH_INTERVAL;
  const refreshDue = state.count === 0;

  // Track skill confirmation status
  // If refresh is due, set pending. If skill ran, it will have set skillConfirmed.
  const skillConfirmed = state.skillConfirmed === true;
  if (refreshDue || isStart) {
    state.refreshPending = true;
    state.skillConfirmed = false; // Reset for new refresh cycle
  }
  saveState(stateFile, state);

  // Calculate sizes
  const sizes = calculateSizes(cwd);

  // Build output
  const msg = statusLine(state.count, refreshDue || isStart, sizes, skillConfirmed);
  let context = msg;

  if (refreshDue || isStart) {
    const reason = isStart ? `session ${input.source || 'startup'}` : 'periodic';
    context += `\n\n---\n**Context Refresh** (${reason})\n`;
    context += `Use context-refresh skill to load and inject context files.`;
    context += `\n\n**Skill Confirmation**: After loading context, skill should confirm by setting state.`;
  }

  return {
    systemMessage: msg,
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: context,
      refreshDue: refreshDue || isStart,
      skillConfirmed,
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
};

if (require.main === module) main().catch(() => process.exit(1));
