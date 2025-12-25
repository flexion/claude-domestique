#!/usr/bin/env node
/**
 * onus: Work item automation hook
 *
 * Delegates to shared hook handler with custom work item tracking.
 * Context injection via hooks - zero configuration required.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use bundled shared module (for installed plugins) or workspace module (for development)
let shared;
try {
  shared = require('../lib/shared');
} catch {
  shared = require('../../shared');
}

const PLUGIN_ROOT = path.resolve(__dirname, '..');

// State and cache locations
const STATE_DIR = path.join(process.env.HOME || '/tmp', '.claude', 'onus');
const WORK_ITEM_CACHE_FILE = path.join(STATE_DIR, 'work-item-cache.json');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

// Default configuration
const DEFAULT_CONFIG = {
  stateFile: STATE_FILE,
  cacheFile: WORK_ITEM_CACHE_FILE,
  configFile: '.claude/config.json',
  branchPatterns: [
    /^issue\/(?:feature|bug|fix|chore)-(\d+)/,
    /^(?:feature|bug|fix|hotfix)\/(\d+)/,
    /^(\d+)-/,
    /^([A-Z]+-\d+)/,
    /#(\d+)/
  ],
  commitFormat: '#{number} - {verb} {description}',
  branchFormat: 'issue/feature-{number}/{slug}'
};

// Platform configurations
const PLATFORM_CONFIG = {
  github: { name: 'GitHub Issues' },
  jira: { name: 'JIRA' },
  azure: { name: 'Azure DevOps' }
};

// ============================================================================
// Git Helpers
// ============================================================================

function getCurrentBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
}

function getGitRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
}

function hasStagedChanges(cwd) {
  try {
    const result = execSync('git diff --cached --name-only', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return result.length > 0;
  } catch { return false; }
}

// ============================================================================
// Issue Detection
// ============================================================================

function extractIssueFromBranch(branch, patterns) {
  if (!branch) return null;
  for (const pattern of patterns) {
    const match = branch.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function detectPlatform(issueKey) {
  if (!issueKey) return 'github';
  if (/^[A-Z]+-\d+$/.test(issueKey)) return 'jira';
  return 'github';
}

// ============================================================================
// Work Item Cache
// ============================================================================

function ensureStateDir() {
  shared.ensureDir(STATE_DIR);
}

function loadWorkItemCache(cacheFile) {
  try {
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
  } catch { /* ignore */ }
  return { items: {}, lastUpdated: null };
}

function saveWorkItemCache(cacheFile, cache) {
  try {
    ensureStateDir();
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } catch { /* ignore */ }
}

function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch { /* ignore */ }
  return { currentIssue: null, currentBranch: null };
}

function saveState(stateFile, state) {
  try {
    ensureStateDir();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

function getCachedWorkItem(cache, issueKey, platform) {
  const cacheKey = `${platform}:${issueKey}`;
  const item = cache.items[cacheKey];
  if (!item) return null;

  const cacheAge = Date.now() - (item.cachedAt || 0);
  const maxAge = 60 * 60 * 1000; // 1 hour
  if (cacheAge > maxAge) return { ...item, stale: true };
  return item;
}

function createPlaceholderWorkItem(issueKey, platform) {
  return {
    key: issueKey,
    platform,
    title: `Issue ${issueKey}`,
    placeholder: true,
    cachedAt: Date.now()
  };
}

// ============================================================================
// Project Config
// ============================================================================

function loadProjectConfig(cwd, configFile) {
  const configPath = path.join(cwd, configFile);
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.onus || config.workItem || {};
    }
  } catch { /* ignore */ }
  return {};
}

// ============================================================================
// Context Formatting
// ============================================================================

function formatWorkItemContext(workItem, cfg) {
  if (!workItem) return null;

  const parts = [`## Current Work Item: ${workItem.key}`];

  if (workItem.placeholder) {
    parts.push(`⚠️ Issue details not yet fetched. Use \`/fetch ${workItem.key}\` to load details.`);
    parts.push('');
    parts.push('**Commit format reminder:**');
    parts.push(`\`${cfg.commitFormat.replace('{number}', workItem.key)}\``);
    return parts.join('\n');
  }

  if (workItem.title) parts.push(`**Title:** ${workItem.title}`);
  if (workItem.type && workItem.type !== 'unknown') parts.push(`**Type:** ${workItem.type}`);
  if (workItem.status && workItem.status !== 'unknown') parts.push(`**Status:** ${workItem.status}`);
  if (workItem.url) parts.push(`**URL:** ${workItem.url}`);

  if (workItem.description) {
    parts.push('');
    parts.push('**Description:**');
    const desc = workItem.description.length > 500
      ? workItem.description.substring(0, 500) + '...'
      : workItem.description;
    parts.push(desc);
  }

  if (workItem.acceptanceCriteria?.length > 0) {
    parts.push('');
    parts.push('**Acceptance Criteria:**');
    for (const criterion of workItem.acceptanceCriteria) {
      parts.push(`- [ ] ${criterion}`);
    }
  }

  if (workItem.labels?.length > 0) {
    parts.push('');
    parts.push(`**Labels:** ${workItem.labels.join(', ')}`);
  }

  parts.push('');
  parts.push('**Commit format:**');
  parts.push(`\`${cfg.commitFormat.replace('{number}', workItem.key)}\``);

  if (workItem.stale) {
    parts.push('');
    parts.push('⚠️ Cached data may be stale. Use `/fetch` to refresh.');
  }

  return parts.join('\n');
}

// ============================================================================
// Hook Callbacks
// ============================================================================

function onSessionStart(input, base) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig };
  const source = input.source || 'startup';

  ensureStateDir();

  const branch = getCurrentBranch(cwd);
  const issueKey = extractIssueFromBranch(branch, cfg.branchPatterns);
  const platform = detectPlatform(issueKey);

  // Load cache and get/create work item
  const cache = loadWorkItemCache(cfg.cacheFile);
  let workItem = null;
  let isNewIssue = false;

  if (issueKey) {
    workItem = getCachedWorkItem(cache, issueKey, platform);
    if (!workItem) {
      workItem = createPlaceholderWorkItem(issueKey, platform);
      isNewIssue = true;
      const cacheKey = `${platform}:${issueKey}`;
      cache.items[cacheKey] = workItem;
      saveWorkItemCache(cfg.cacheFile, cache);
    }
  }

  // Update state
  saveState(cfg.stateFile, {
    currentIssue: issueKey,
    currentBranch: branch,
    platform,
    sessionStart: new Date().toISOString()
  });

  // Build status line
  let statusLine;
  if (!issueKey) {
    statusLine = '📍 Onus: no issue';
  } else {
    const issueRef = workItem && !workItem.placeholder
      ? `#${workItem.key} - ${workItem.title || 'Untitled'}`
      : `#${issueKey}`;
    statusLine = isNewIssue
      ? `📍 Onus: NEW → ${issueRef}`
      : `📍 Onus: ${issueRef}`;
  }

  // Build context - append work item info to base context
  let context = base.additionalContext || '';
  if (workItem) {
    const workItemContext = formatWorkItemContext(workItem, cfg);
    if (workItemContext) {
      context += `\n\n${workItemContext}`;
    }
  }

  return {
    statusLine,
    additionalContext: context,
    extra: { currentIssue: issueKey, platform, source }
  };
}

function onUserPromptSubmit(input, base) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig };

  const state = loadState(cfg.stateFile);
  const currentBranch = getCurrentBranch(cwd);

  // Detect branch change
  let branchChanged = false;
  if (currentBranch !== state.currentBranch) {
    branchChanged = true;
    const issueKey = extractIssueFromBranch(currentBranch, cfg.branchPatterns);
    const platform = detectPlatform(issueKey);
    state.currentBranch = currentBranch;
    state.currentIssue = issueKey;
    state.platform = platform;
    saveState(cfg.stateFile, state);
  }

  const staged = hasStagedChanges(cwd);

  // Get cached work item
  let workItem = null;
  if (state.currentIssue) {
    const cache = loadWorkItemCache(cfg.cacheFile);
    workItem = getCachedWorkItem(cache, state.currentIssue, state.platform || 'github');
  }

  // Build minimal context
  let context = base.additionalContext || '';
  if (state.currentIssue) {
    context += `\n📋 Issue: ${state.currentIssue}`;
  }
  if (staged) {
    context += `\n💡 Staged changes detected. Commit format: \`${cfg.commitFormat.replace('{number}', state.currentIssue || 'N')}\``;
  }

  return {
    additionalContext: context,
    extra: { currentIssue: state.currentIssue, branchChanged, staged }
  };
}

// ============================================================================
// Direct Processing (for testing)
// ============================================================================

function processHook(input, config = {}) {
  const hookConfig = {
    pluginName: 'Onus',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit,
    ...config
  };
  return shared.processHook(hookConfig, input);
}

function processSessionStart(input, config = {}) {
  return processHook({ ...input, hook_event_name: 'SessionStart' }, config);
}

function processUserPromptSubmit(input, config = {}) {
  return processHook({ ...input, hook_event_name: 'UserPromptSubmit' }, config);
}

// ============================================================================
// Main Entry Point
// ============================================================================

if (require.main === module) {
  shared.runHook({
    pluginName: 'Onus',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  });
}

// ============================================================================
// Exports (for testing)
// ============================================================================

module.exports = {
  processHook,
  processSessionStart,
  processUserPromptSubmit,
  loadState,
  saveState,
  loadProjectConfig,
  loadWorkItemCache,
  saveWorkItemCache,
  getCurrentBranch,
  getGitRoot,
  hasStagedChanges,
  extractIssueFromBranch,
  detectPlatform,
  getCachedWorkItem,
  createPlaceholderWorkItem,
  formatWorkItemContext,
  ensureStateDir,
  DEFAULT_CONFIG,
  PLATFORM_CONFIG,
  PLUGIN_ROOT,
  STATE_DIR
};
