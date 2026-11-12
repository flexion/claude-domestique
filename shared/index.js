/**
 * @claude-domestique/shared
 *
 * Unified hook handler for all plugins.
 *
 * Plugins provide:
 *   - pluginName: Display name (e.g., 'Mantra')
 *   - pluginRoot: Plugin root directory
 *   - onSessionStart: Optional callback to augment SessionStart response
 *   - onUserPromptSubmit: Optional callback to augment UserPromptSubmit response
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// File Discovery
// ============================================================================

function findFiles(dirPath, extension) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith(extension))
      .sort()
      .map(f => path.join(dirPath, f));
  } catch {
    return [];
  }
}

function findMdFiles(dirPath) {
  return findFiles(dirPath, '.md');
}

function findYmlFiles(dirPath) {
  return findFiles(dirPath, '.yml');
}

// ============================================================================
// Context Loading
// ============================================================================

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

function readContextFiles(files, options = {}) {
  const contents = [];
  for (const file of files) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      const basename = path.basename(file);

      if (options.frontmatterOnly && file.endsWith('.md')) {
        const frontmatter = extractFrontmatter(content);
        if (frontmatter) content = frontmatter;
      }

      contents.push(`### ${basename}\n${content}`);
    } catch {
      // Skip unreadable files
    }
  }
  return contents.join('\n\n');
}

/**
 * Load all context from a plugin's directories
 * @param {string} pluginRoot - Plugin root directory
 * @returns {object} { content, files, tokens, companionDir }
 */
function loadPluginContext(pluginRoot) {
  const rulesDir = path.join(pluginRoot, 'rules');
  const contextDir = path.join(pluginRoot, 'context');

  const ruleFiles = findMdFiles(rulesDir);
  const contextFiles = findYmlFiles(contextDir);

  // Build context content
  const contextParts = [];
  if (ruleFiles.length > 0) {
    contextParts.push(readContextFiles(ruleFiles, { frontmatterOnly: true }));
  }
  if (contextFiles.length > 0) {
    contextParts.push(readContextFiles(contextFiles));
  }

  let content = contextParts.join('\n\n');

  // Companion docs location
  let companionDir = null;
  if (fs.existsSync(contextDir) && findMdFiles(contextDir).length > 0) {
    companionDir = contextDir;
    content += `\n\n# Companion Docs\nDetailed examples: ${contextDir}`;
  }

  // Build file list
  const files = [...ruleFiles, ...contextFiles].map(f => path.basename(f).replace(/\.(md|yml)$/, ''));
  const tokens = estimateTokens(content);

  return { content, files, tokens, companionDir };
}

// ============================================================================
// State Management
// ============================================================================

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    // Ignore
  }
}

/**
 * Resolve a plugin's state file.
 *
 * `homeDir` is injectable so callers - tests especially - can redirect state
 * away from the real home directory, rather than reading and writing the
 * user's actual ~/.claude/<plugin>-state.json.
 *
 * `sessionId` separates concurrent agents. A single file per machine is shared
 * by every session on it, so the recorded branch belongs to whichever session
 * wrote last - which made memento announce a branch switch in worktrees that
 * had never changed branch. The hook input carries session_id; when it is
 * absent the unsuffixed path is still used, so hosts that send no id keep
 * working as before. Stale files are swept at session start by
 * [pruneStateFiles].
 *
 * @param {string} pluginName
 * @param {string} [homeDir] - Defaults to the current user's home directory
 * @param {string} [sessionId] - Hook input session_id, when the host sends one
 * @returns {string} Absolute path to the state file
 */
function getStateFile(pluginName, homeDir = os.homedir(), sessionId = null) {
  const suffix = sessionKey(sessionId);
  const name = `${pluginName.toLowerCase()}-state${suffix ? `-${suffix}` : ''}.json`;
  return path.join(homeDir, '.claude', name);
}

/**
 * Reduce a host session id to a filename-safe key, or null when unusable.
 * Any character outside [A-Za-z0-9_-] is dropped rather than escaped - dots
 * included, so no id can form a traversal or a hidden file. The key only has to
 * be stable and distinct per session, not reversible.
 */
function sessionKey(sessionId) {
  if (typeof sessionId !== 'string') return null;
  const key = sessionId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return key.length > 0 ? key : null;
}

// One state file per session means the directory grows by a file per plugin per
// agent launch, and a herd launches a lot of agents. Nothing else would ever
// remove them, so each session start sweeps the ones that have gone stale.
const STATE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function pruneStateFiles(directory, prefix, now = Date.now()) {
  let names;
  try {
    names = fs.readdirSync(directory);
  } catch {
    return; // No state directory yet.
  }

  for (const name of names) {
    if (!name.startsWith(prefix) || !name.endsWith('.json')) continue;
    const file = path.join(directory, name);
    try {
      if (now - fs.statSync(file).mtimeMs > STATE_RETENTION_MS) fs.unlinkSync(file);
    } catch {
      // A concurrent session may have removed or replaced it.
    }
  }
}

function loadState(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // Ignore
  }
  return defaultValue;
}

function saveState(filePath, state) {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch {
    // Ignore
  }
}

// ============================================================================
// Token Estimation
// ============================================================================

function estimateTokens(content) {
  if (!content) return 0;
  const words = content.split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length * 1.3);
}

// ============================================================================
// Unified Hook Handlers
// ============================================================================

const PRECEDENCE_REMINDER = 'Precedence: 1) project rules and AGENTS.md/CLAUDE.md, 2) plugin context, 3) default behavior.';

/**
 * Process SessionStart event
 * @param {object} config - Plugin config
 * @param {object} input - Hook input from stdin
 * @returns {object} Hook response
 */
function processSessionStart(config, input) {
  const { pluginName, pluginRoot, homeDir } = config;

  pruneStateFiles(path.join(homeDir || os.homedir(), '.claude'), `${pluginName.toLowerCase()}-state-`);

  // Load context from plugin
  const context = loadPluginContext(pluginRoot);

  // Build status line
  const source = input.source || 'startup';
  let statusLine = `📍 ${pluginName}: ${context.files.join(', ') || 'no files'} (~${context.tokens} tokens)`;

  if (source === 'compact') {
    statusLine += ' (reloaded)';
  } else if (source === 'resume') {
    statusLine += ' (resumed)';
  }

  // Base response
  let additionalContext = context.content;
  let extra = {};

  // Allow plugin to augment
  if (config.onSessionStart) {
    const augment = config.onSessionStart(input, {
      statusLine,
      additionalContext,
      files: context.files,
      tokens: context.tokens,
      companionDir: context.companionDir
    });
    if (augment) {
      if (augment.additionalContext) additionalContext = augment.additionalContext;
      if (augment.statusLine) statusLine = augment.statusLine;
      if (augment.extra) extra = augment.extra;
    }
  }

  // Precedence reminder: project guidance > plugin > defaults. Stated at the
  // start of the session, where the rules it orders are loaded, rather than
  // repeated on every prompt.
  additionalContext = `${PRECEDENCE_REMINDER}\n${additionalContext}`;

  return {
    systemMessage: statusLine,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
      files: context.files,
      tokens: context.tokens,
      source,
      ...extra
    }
  };
}

/**
 * Process UserPromptSubmit event
 * @param {object} config - Plugin config
 * @param {object} input - Hook input from stdin
 * @returns {object} Hook response
 */
// Rules are loaded once, at session start. They were also re-read and injected
// every tenth prompt, which restated memento's session rules and onus's git and
// work-item rules - nearly 900 words - in the middle of unrelated work. Each
// rule now travels with the action it governs: the skills that carry it out
// read their own rule file when they run.
// There was also a prompt counter here, written to disk and injected as
// "#7 ✓" on every prompt. Once the periodic refresh went, nothing read the
// count, so it was a file write and a line of context per prompt to report its
// own existence.
function processUserPromptSubmit(config, input) {
  const { pluginName } = config;
  const statusLine = `📍 ${pluginName} ✓`;

  let additionalContext = statusLine;
  let extra = {};

  // Allow plugin to augment
  if (config.onUserPromptSubmit) {
    const augment = config.onUserPromptSubmit(input, { statusLine, additionalContext });
    if (augment) {
      if (augment.additionalContext) additionalContext = augment.additionalContext;
      if (augment.extra) extra = augment.extra;
    }
  }

  return {
    systemMessage: statusLine,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
      ...extra
    }
  };
}

/**
 * Process any hook event
 * @param {object} config - Plugin config
 * @param {object} input - Hook input from stdin
 * @returns {object} Hook response
 */
function processHook(config, input) {
  const eventName = input.hook_event_name || 'UserPromptSubmit';

  if (eventName === 'SessionStart') {
    return processSessionStart(config, input);
  }

  return processUserPromptSubmit(config, input);
}

/**
 * Main entry point - reads stdin, processes hook, outputs response
 * @param {object} config - Plugin config
 */
// Codex validates hook stdout against a strict schema and rejects an unknown field
// inside hookSpecificOutput, reporting only "hook returned invalid session start
// JSON output". The plugin metadata the builders below attach — files, tokens,
// source, sessionPath, branchChanged, and each plugin's `extra` — is informational and
// has no runtime consumer, so it is stripped here at the point of emission rather
// than removed from the returned object, which the hooks' own tests read to observe
// behavior. Events not listed pass through untouched: checkpoint.js and
// herdr-orient.js already emit only the two legal fields.
const HOOK_OUTPUT_SCHEMA = {
  SessionStart: {
    top: ['systemMessage'],
    hookSpecific: ['hookEventName', 'additionalContext'],
  },
  UserPromptSubmit: {
    top: ['systemMessage'],
    hookSpecific: ['hookEventName', 'additionalContext'],
  },
};

function serializeHookOutput(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return {};
  const nested = result.hookSpecificOutput;
  if (!nested || typeof nested !== 'object') return result;

  const schema = HOOK_OUTPUT_SCHEMA[nested.hookEventName];
  if (!schema) return result;

  const output = {};
  for (const field of schema.top) {
    if (result[field] !== undefined) output[field] = result[field];
  }
  const hookSpecificOutput = {};
  for (const field of schema.hookSpecific) {
    if (nested[field] !== undefined) hookSpecificOutput[field] = nested[field];
  }
  output.hookSpecificOutput = hookSpecificOutput;
  return output;
}

async function runHook(config) {
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input;
  try {
    input = inputData ? JSON.parse(inputData) : { cwd: process.cwd() };
  } catch {
    input = { cwd: process.cwd() };
  }

  // Merge cwd into config
  config.cwd = input.cwd || process.cwd();

  const result = processHook(config, input);
  console.log(JSON.stringify(serializeHookOutput(result)));
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  serializeHookOutput,
  // Main entry points
  runHook,
  processHook,
  processSessionStart,
  processUserPromptSubmit,

  // Context loading
  loadPluginContext,
  findFiles,
  findMdFiles,
  findYmlFiles,
  extractFrontmatter,
  readContextFiles,

  // State management
  getStateFile,
  sessionKey,
  pruneStateFiles,
  ensureDir,
  loadState,
  saveState,

  // Utilities
  estimateTokens,

  // Constants
  PRECEDENCE_REMINDER
};
