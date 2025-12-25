#!/usr/bin/env node
/**
 * mantra status hook
 *
 * SessionStart: Shows which rules are loaded, resets counter
 * UserPromptSubmit: Shows prompt count as freshness indicator
 *
 * Does NOT inject context - that's handled by native .claude/rules/ loading.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const STATE_FILE = path.join(os.homedir(), '.claude', 'mantra-state.json');
const PLUGIN_ROOT = path.join(__dirname, '..');
const PLUGIN_RULES_DIR = path.join(PLUGIN_ROOT, 'rules');
const PLUGIN_CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const PLUGIN_STATUSLINE = path.join(PLUGIN_ROOT, 'scripts', 'statusline.js');

/**
 * Load state from file
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore errors, return default
  }
  return { count: 0 };
}

/**
 * Save state to file
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    // Ignore write errors
  }
}

/**
 * Compute MD5 hash of file content
 * @param {string} filePath - Path to file
 * @returns {string|null} MD5 hash hex string or null if file doesn't exist
 */
function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

/**
 * Compute content hash for a set of files
 * MD5 of concatenated MD5s (sorted by filename)
 */
function computeContentHash(dir, files) {
  const hashes = [];
  for (const file of files.sort()) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      hashes.push(`${file}:${hash}`);
    } catch (e) {
      // Skip unreadable files
    }
  }
  return crypto.createHash('md5').update(hashes.join('\n')).digest('hex');
}

/**
 * Check if project rules, context, or statusline are outdated compared to plugin
 * @returns {object} { rulesOutdated, contextOutdated, statuslineOutdated, reason }
 */
function checkOutdated(cwd) {
  const versionFile = path.join(cwd, '.claude', 'rules', '.mantra-version.json');

  // No version file = not initialized or old version
  if (!fs.existsSync(versionFile)) {
    return { rulesOutdated: false, contextOutdated: false, statuslineOutdated: false, reason: null };
  }

  try {
    const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    let rulesOutdated = false;
    let contextOutdated = false;
    let statuslineOutdated = false;

    // Check rules hash (supports both old contentHash and new rulesHash)
    const storedRulesHash = versionData.rulesHash || versionData.contentHash;
    if (storedRulesHash) {
      const pluginFiles = fs.readdirSync(PLUGIN_RULES_DIR)
        .filter(f => f.endsWith('.md'));

      if (pluginFiles.length > 0) {
        const currentRulesHash = computeContentHash(PLUGIN_RULES_DIR, pluginFiles);
        if (currentRulesHash !== storedRulesHash) {
          rulesOutdated = true;
        }
      }
    }

    // Check context hash
    if (versionData.contextHash && fs.existsSync(PLUGIN_CONTEXT_DIR)) {
      const pluginFiles = fs.readdirSync(PLUGIN_CONTEXT_DIR)
        .filter(f => f.endsWith('.md'));

      if (pluginFiles.length > 0) {
        const currentContextHash = computeContentHash(PLUGIN_CONTEXT_DIR, pluginFiles);
        if (currentContextHash !== versionData.contextHash) {
          contextOutdated = true;
        }
      }
    }

    // Check statusline hash
    const storedStatuslineHash = versionData.statuslineHash;
    if (storedStatuslineHash && fs.existsSync(PLUGIN_STATUSLINE)) {
      const currentStatuslineHash = computeFileHash(PLUGIN_STATUSLINE);
      if (currentStatuslineHash && currentStatuslineHash !== storedStatuslineHash) {
        statuslineOutdated = true;
      }
    }

    const reason = rulesOutdated || contextOutdated || statuslineOutdated ? 'plugin updated' : null;
    return { rulesOutdated, contextOutdated, statuslineOutdated, reason };
  } catch (e) {
    return { rulesOutdated: false, contextOutdated: false, statuslineOutdated: false, reason: null };
  }
}

/**
 * Check if project rules are outdated compared to plugin
 * @deprecated Use checkOutdated instead
 */
function checkRulesOutdated(cwd) {
  const result = checkOutdated(cwd);
  return { outdated: result.rulesOutdated, reason: result.reason };
}

/**
 * Estimate token count for content
 */
function estimateTokens(content) {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const longWords = words.filter(w => w.length > 10).length;
  const punctuation = (content.match(/[.,;:!?()[\]{}'"]/g) || []).length;
  return Math.ceil(words.length + longWords + punctuation * 0.5);
}

/**
 * Get list of rule files and their token counts
 */
function getRulesStatus(cwd) {
  const rulesDir = path.join(cwd, '.claude', 'rules');

  if (!fs.existsSync(rulesDir)) {
    return { loaded: false, files: [], tokens: 0 };
  }

  const files = fs.readdirSync(rulesDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    return { loaded: false, files: [], tokens: 0 };
  }

  let totalTokens = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
      totalTokens += estimateTokens(content);
    } catch (e) {
      // Skip unreadable files
    }
  }

  return { loaded: true, files, tokens: totalTokens };
}

// Thresholds for warnings
const STARTUP_BLOAT_THRESHOLD = 35; // Warn if >35% context used at startup

/**
 * Handle SessionStart - show full status, reset counter
 * @param {string} cwd - Current working directory
 * @param {string} source - Why SessionStart fired: "startup", "compact", "resume"
 * @param {object} contextWindow - Token usage data from Claude Code
 */
function handleSessionStart(cwd, source, contextWindow) {
  const status = getRulesStatus(cwd);
  const outdatedCheck = checkOutdated(cwd);
  const state = { count: 0 };
  saveState(state);

  // Calculate initial context usage
  const contextPercent = calculateContextPercentage(contextWindow);

  // Determine reload reason indicator
  let reloadIndicator = '';
  if (source === 'compact') {
    reloadIndicator = ' (reloaded after compaction)';
  } else if (source === 'resume') {
    reloadIndicator = ' (resumed)';
  }

  // Check for outdated rules, context, or statusline
  let warnings = [];
  const outdatedParts = [];
  if (outdatedCheck.rulesOutdated) outdatedParts.push('rules');
  if (outdatedCheck.contextOutdated) outdatedParts.push('context');
  if (outdatedCheck.statuslineOutdated) outdatedParts.push('statusline');

  if (outdatedParts.length > 0) {
    const parts = outdatedParts.length === 1
      ? outdatedParts[0].charAt(0).toUpperCase() + outdatedParts[0].slice(1)
      : outdatedParts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') + ' and ' + outdatedParts[outdatedParts.length - 1];
    warnings.push(`⚠️  ${parts} outdated - run /mantra:init --force to update`);
  }

  // Check for startup bloat (too much context at start)
  let startupBloat = false;
  if (contextPercent !== null && contextPercent > STARTUP_BLOAT_THRESHOLD && source === 'startup') {
    warnings.push(`⚠️  High initial context (${contextPercent}%) - consider trimming CLAUDE.md or rules`);
    startupBloat = true;
  }

  const warningText = warnings.length > 0 ? '\n' + warnings.join('\n') : '';

  let statusLine;
  if (status.loaded) {
    const fileList = status.files.map(f => f.replace('.md', '')).join(', ');
    const contextInfo = contextPercent !== null ? ` @ ${contextPercent}%` : '';
    statusLine = `📍 Mantra: ${status.files.length} rules (~${status.tokens} tokens)${contextInfo}${reloadIndicator} | ${fileList}${warningText}`;
  } else {
    statusLine = `📍 Mantra: no rules loaded${reloadIndicator} (run /mantra:init)${warningText}`;
  }

  return {
    systemMessage: statusLine,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: statusLine,
      rulesLoaded: status.loaded,
      ruleCount: status.files.length,
      estimatedTokens: status.tokens,
      source: source || 'startup',
      rulesOutdated: outdatedCheck.rulesOutdated,
      contextOutdated: outdatedCheck.contextOutdated,
      statuslineOutdated: outdatedCheck.statuslineOutdated,
      contextPercentage: contextPercent,
      startupBloat
    }
  };
}

/**
 * Get current context token count from context_window data
 */
function getCurrentContextTokens(contextWindow) {
  if (!contextWindow?.current_usage) {
    return null;
  }

  const usage = contextWindow.current_usage;
  return (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0);
}

/**
 * Calculate context usage percentage from actual token data
 * Uses context_window data provided by Claude Code statusline
 */
function calculateContextPercentage(contextWindow) {
  if (!contextWindow?.context_window_size) {
    return null;
  }

  const currentTokens = getCurrentContextTokens(contextWindow);
  if (currentTokens === null) {
    return null;
  }

  const percent = Math.round((currentTokens / contextWindow.context_window_size) * 100);
  return Math.min(percent, 99); // Cap at 99%
}

// Threshold for drift warning
const DRIFT_WARNING_THRESHOLD = 70; // Warn about potential drift above 70% context

/**
 * Handle UserPromptSubmit - show freshness indicator with context usage
 * @param {string} cwd - Current working directory
 * @param {object} contextWindow - Token usage data from Claude Code
 */
function handleUserPromptSubmit(cwd, contextWindow) {
  const status = getRulesStatus(cwd);
  const state = loadState();

  // Increment counter
  state.count = (state.count || 0) + 1;
  saveState(state);

  // Calculate actual context usage percentage
  const contextPercent = calculateContextPercentage(contextWindow);

  // Build status line
  let statusLine;
  const contextPart = contextPercent !== null ? `${contextPercent}% ctx` : `#${state.count}`;

  // Add drift warning at high context usage
  let driftWarning = '';
  if (contextPercent !== null && contextPercent >= DRIFT_WARNING_THRESHOLD) {
    driftWarning = ' ⚠️ drift';
  }

  if (status.loaded) {
    statusLine = `📍 Mantra: ${contextPart}${driftWarning} ✓`;
  } else {
    statusLine = `📍 Mantra: ${contextPart}${driftWarning} (no rules)`;
  }

  return {
    systemMessage: statusLine,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: statusLine,
      promptCount: state.count,
      rulesLoaded: status.loaded,
      contextPercentage: contextPercent,
      driftWarning: contextPercent !== null && contextPercent >= DRIFT_WARNING_THRESHOLD
    }
  };
}

/**
 * Main hook handler
 */
function main() {
  let input = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input);
      const cwd = data.cwd || process.cwd();

      if (data.hook_event_name === 'SessionStart') {
        // source can be "startup", "compact", or "resume"
        const source = data.source || 'startup';
        const result = handleSessionStart(cwd, source, data.context_window);
        console.log(JSON.stringify(result));
      } else if (data.hook_event_name === 'UserPromptSubmit') {
        const result = handleUserPromptSubmit(cwd, data.context_window);
        console.log(JSON.stringify(result));
      } else {
        console.log(JSON.stringify({ continue: true }));
      }
    } catch (e) {
      console.error('mantra status hook error:', e.message);
      console.log(JSON.stringify({ continue: true }));
    }
  });
}

main();
