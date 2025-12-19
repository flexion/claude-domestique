#!/usr/bin/env node
/**
 * onus: Work item automation hook
 *
 * Runs on:
 * - SessionStart: Detect branch, extract issue number, inject work item context
 * - UserPromptSubmit: Track work progress, offer commit/PR suggestions
 *
 * Features:
 * 1. Extract issue numbers from branch names
 * 2. Cache work item details locally
 * 3. Inject work item context on session start
 * 4. Suggest commit message format based on issue
 * 5. Track which acceptance criteria may be addressed
 *
 * Integration:
 * - Works with memento for session persistence
 * - Works with mantra for context refresh
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find plugin root by navigating up from this script's location
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');

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
    // issue/feature-42/description -> 42
    /^issue\/(?:feature|bug|fix|chore)-(\d+)/,
    // feature/42-description -> 42
    /^(?:feature|bug|fix|hotfix)\/(\d+)/,
    // 42-description -> 42
    /^(\d+)-/,
    // PROJECT-123-description -> PROJECT-123
    /^([A-Z]+-\d+)/,
    // refs #42 in branch name
    /#(\d+)/
  ],
  commitFormat: '#{number} - {verb} {description}',
  branchFormat: 'issue/feature-{number}/{slug}'
};

// Platform configurations
const PLATFORM_CONFIG = {
  github: {
    name: 'GitHub Issues',
    issueUrlPattern: 'https://github.com/{owner}/{repo}/issues/{number}'
  },
  jira: {
    name: 'JIRA',
    issueUrlPattern: 'https://{host}/browse/{key}'
  },
  azure: {
    name: 'Azure DevOps',
    issueUrlPattern: 'https://dev.azure.com/{org}/{project}/_workitems/edit/{id}'
  }
};

/**
 * Ensure state directory exists
 */
function ensureStateDir() {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Load project config from .claude/config.json
 */
function loadProjectConfig(cwd, configFile) {
  const configPath = path.join(cwd, configFile);
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.onus || config.workItem || {};
    }
  } catch (e) {
    // Ignore errors, use defaults
  }
  return {};
}

/**
 * Load cached work items
 */
function loadWorkItemCache(cacheFile) {
  try {
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors
  }
  return { items: {}, lastUpdated: null };
}

/**
 * Save work item cache
 */
function saveWorkItemCache(cacheFile, cache) {
  try {
    ensureStateDir();
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Load plugin state
 */
function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors
  }
  return {
    currentIssue: null,
    currentBranch: null,
    sessionStart: null,
    lastPrompt: null
  };
}

/**
 * Save plugin state
 */
function saveState(stateFile, state) {
  try {
    ensureStateDir();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Get current git branch name
 */
function getCurrentBranch(cwd) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return branch;
  } catch (e) {
    return null;
  }
}

/**
 * Check if there are staged changes
 */
function hasStagedChanges(cwd) {
  try {
    const result = execSync('git diff --cached --name-only', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return result.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Extract issue number/key from branch name
 */
function extractIssueFromBranch(branch, patterns) {
  if (!branch) return null;

  for (const pattern of patterns) {
    const match = branch.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Detect platform from issue key format
 */
function detectPlatform(issueKey) {
  if (!issueKey) return 'github';

  // JIRA-style keys: PROJ-123
  if (/^[A-Z]+-\d+$/.test(issueKey)) {
    return 'jira';
  }

  // Numeric only: GitHub
  if (/^\d+$/.test(issueKey)) {
    return 'github';
  }

  return 'github';
}

/**
 * Find all .yml files in a directory
 */
function findYmlFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.yml'))
      .sort()
      .map(f => path.join(dirPath, f));
  } catch (e) {
    return [];
  }
}

/**
 * Find base context files from plugin root
 */
function findBaseContextFiles() {
  return findYmlFiles(BASE_CONTEXT_DIR);
}

/**
 * Read and concatenate context files with section headers
 */
function readContextFiles(files) {
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

/**
 * Get cached work item or null
 */
function getCachedWorkItem(cache, issueKey, platform) {
  const cacheKey = `${platform}:${issueKey}`;
  const item = cache.items[cacheKey];

  if (!item) return null;

  // Check if cache is stale (older than 1 hour)
  const cacheAge = Date.now() - (item.cachedAt || 0);
  const maxAge = 60 * 60 * 1000; // 1 hour

  if (cacheAge > maxAge) {
    return { ...item, stale: true };
  }

  return item;
}

/**
 * Create a placeholder work item (for when we can't fetch)
 */
function createPlaceholderWorkItem(issueKey, platform) {
  return {
    key: issueKey,
    platform,
    title: `Issue ${issueKey}`,
    description: null,
    status: 'unknown',
    type: 'unknown',
    acceptanceCriteria: [],
    labels: [],
    url: null,
    placeholder: true,
    cachedAt: Date.now()
  };
}

/**
 * Format work item context for injection
 */
function formatWorkItemContext(workItem, cfg) {
  if (!workItem) return null;

  const parts = [];

  parts.push(`## Current Work Item: ${workItem.key}`);

  if (workItem.placeholder) {
    parts.push(`⚠️ Issue details not yet fetched. Use \`/fetch ${workItem.key}\` to load details.`);
    parts.push('');
    parts.push('**Commit format reminder:**');
    parts.push(`\`${cfg.commitFormat.replace('{number}', workItem.key)}\``);
    return parts.join('\n');
  }

  if (workItem.title) {
    parts.push(`**Title:** ${workItem.title}`);
  }

  if (workItem.type && workItem.type !== 'unknown') {
    parts.push(`**Type:** ${workItem.type}`);
  }

  if (workItem.status && workItem.status !== 'unknown') {
    parts.push(`**Status:** ${workItem.status}`);
  }

  if (workItem.url) {
    parts.push(`**URL:** ${workItem.url}`);
  }

  if (workItem.description) {
    parts.push('');
    parts.push('**Description:**');
    // Truncate long descriptions
    const desc = workItem.description.length > 500
      ? workItem.description.substring(0, 500) + '...'
      : workItem.description;
    parts.push(desc);
  }

  if (workItem.acceptanceCriteria && workItem.acceptanceCriteria.length > 0) {
    parts.push('');
    parts.push('**Acceptance Criteria:**');
    for (const criterion of workItem.acceptanceCriteria) {
      parts.push(`- [ ] ${criterion}`);
    }
  }

  if (workItem.labels && workItem.labels.length > 0) {
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

/**
 * Build context content for injection
 */
function buildContextContent(cwd, cfg, workItem, reason) {
  const contextParts = [];

  // 1. Load base context from plugin root
  const baseFiles = findBaseContextFiles();
  if (baseFiles.length > 0) {
    const baseContent = readContextFiles(baseFiles);
    contextParts.push(baseContent);
  }

  // 2. Add work item context if available
  if (workItem) {
    const workItemContext = formatWorkItemContext(workItem, cfg);
    if (workItemContext) {
      contextParts.push(workItemContext);
    }
  }

  if (contextParts.length === 0) {
    return `\n---\n**Work Item Context** (${reason})\nNo work item detected. Working on branch without issue reference.`;
  }

  return `\n---\n**Work Item Context** (${reason})\n` + contextParts.join('\n\n');
}

/**
 * Generate session start message
 */
function generateSessionStartMessage(state, workItem) {
  if (!state.currentIssue) {
    return '📍 Onus: No issue detected';
  }

  if (workItem && !workItem.placeholder) {
    return `📍 Onus: #${workItem.key} - ${workItem.title || 'Untitled'}`;
  }

  return `📍 Onus: #${state.currentIssue} (not fetched)`;
}

/**
 * Generate prompt submit message
 */
function generatePromptSubmitMessage(state, workItem, hasStagedChanges, branchChanged = false) {
  const parts = [];

  if (state.currentIssue) {
    parts.push(`📍 Onus: #${state.currentIssue}`);
  } else {
    parts.push('📍 Onus: No issue');
  }

  if (branchChanged) {
    parts.push('branch switched');
  }

  if (hasStagedChanges) {
    parts.push('staged');
  }

  return parts.join(' | ');
}

/**
 * Process SessionStart hook
 */
function processSessionStart(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig, ...config };
  const source = input.source || 'startup';

  ensureStateDir();

  // Get current branch
  const branch = getCurrentBranch(cwd);

  // Extract issue from branch
  const issueKey = extractIssueFromBranch(branch, cfg.branchPatterns);
  const platform = detectPlatform(issueKey);

  // Load cache and state
  const cache = loadWorkItemCache(cfg.cacheFile);
  let workItem = null;

  if (issueKey) {
    workItem = getCachedWorkItem(cache, issueKey, platform);
    if (!workItem) {
      workItem = createPlaceholderWorkItem(issueKey, platform);
      // Save placeholder to cache
      const cacheKey = `${platform}:${issueKey}`;
      cache.items[cacheKey] = workItem;
      saveWorkItemCache(cfg.cacheFile, cache);
    }
  }

  // Update state
  const state = {
    currentIssue: issueKey,
    currentBranch: branch,
    platform,
    sessionStart: new Date().toISOString(),
    lastPrompt: null
  };
  saveState(cfg.stateFile, state);

  // Build context
  const reason = `session ${source}`;
  const contextContent = buildContextContent(cwd, cfg, workItem, reason);

  return {
    systemMessage: generateSessionStartMessage(state, workItem),
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: contextContent
    }
  };
}

/**
 * Process UserPromptSubmit hook
 */
function processUserPromptSubmit(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig, ...config };

  // Load current state
  const state = loadState(cfg.stateFile);
  state.lastPrompt = new Date().toISOString();

  // Check if branch changed since session start
  const currentBranch = getCurrentBranch(cwd);
  let branchChanged = false;
  if (currentBranch !== state.currentBranch) {
    branchChanged = true;
    // Re-detect issue from new branch
    const issueKey = extractIssueFromBranch(currentBranch, cfg.branchPatterns);
    const platform = detectPlatform(issueKey);
    state.currentBranch = currentBranch;
    state.currentIssue = issueKey;
    state.platform = platform;
  }

  // Check for staged changes
  const staged = hasStagedChanges(cwd);

  // Get cached work item if we have an issue
  let workItem = null;
  const cache = loadWorkItemCache(cfg.cacheFile);
  if (state.currentIssue) {
    workItem = getCachedWorkItem(cache, state.currentIssue, state.platform || 'github');
    // Create placeholder if branch changed and no cache exists
    if (!workItem && branchChanged) {
      workItem = createPlaceholderWorkItem(state.currentIssue, state.platform || 'github');
      const cacheKey = `${state.platform || 'github'}:${state.currentIssue}`;
      cache.items[cacheKey] = workItem;
      saveWorkItemCache(cfg.cacheFile, cache);
    }
  }

  // Save updated state
  saveState(cfg.stateFile, state);

  // Build minimal context for ongoing prompts
  const contextParts = [];

  // Always show current issue status
  if (state.currentIssue) {
    contextParts.push(`📋 Issue: ${state.currentIssue}`);
    if (workItem && workItem.title) {
      contextParts.push(`📌 ${workItem.title}`);
    }
  }

  // Hint about staged changes
  if (staged) {
    contextParts.push('');
    contextParts.push('💡 Staged changes detected. When ready to commit:');
    contextParts.push(`   \`${cfg.commitFormat.replace('{number}', state.currentIssue || 'N')}\``);
  }

  return {
    systemMessage: generatePromptSubmitMessage(state, workItem, staged, branchChanged),
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextParts.join('\n')
    }
  };
}

/**
 * Main hook entry point
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
  loadWorkItemCache,
  saveWorkItemCache,
  getCurrentBranch,
  hasStagedChanges,
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
  PLATFORM_CONFIG,
  PLUGIN_ROOT,
  BASE_CONTEXT_DIR,
  STATE_DIR
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
