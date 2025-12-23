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
 * Check if project rules are outdated compared to plugin
 */
function checkRulesOutdated(cwd) {
  const versionFile = path.join(cwd, '.claude', 'rules', '.mantra-version.json');

  // No version file = not initialized or old version
  if (!fs.existsSync(versionFile)) {
    return { outdated: false, reason: null };
  }

  try {
    const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    const storedHash = versionData.contentHash;

    if (!storedHash) {
      return { outdated: false, reason: null };
    }

    // Get current plugin files
    const pluginFiles = fs.readdirSync(PLUGIN_RULES_DIR)
      .filter(f => f.endsWith('.md'));

    if (pluginFiles.length === 0) {
      return { outdated: false, reason: null };
    }

    // Compute current hash
    const currentHash = computeContentHash(PLUGIN_RULES_DIR, pluginFiles);

    if (currentHash !== storedHash) {
      return { outdated: true, reason: 'plugin updated' };
    }

    return { outdated: false, reason: null };
  } catch (e) {
    return { outdated: false, reason: null };
  }
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

/**
 * Handle SessionStart - show full status, reset counter
 * @param {string} cwd - Current working directory
 * @param {string} source - Why SessionStart fired: "startup", "compact", "resume"
 */
function handleSessionStart(cwd, source) {
  const status = getRulesStatus(cwd);
  const outdatedCheck = checkRulesOutdated(cwd);
  const state = { count: 0 };
  saveState(state);

  // Determine reload reason indicator
  let reloadIndicator = '';
  if (source === 'compact') {
    reloadIndicator = ' (reloaded after compaction)';
  } else if (source === 'resume') {
    reloadIndicator = ' (resumed)';
  }

  // Check for outdated rules
  let outdatedWarning = '';
  if (outdatedCheck.outdated) {
    outdatedWarning = '\n⚠️  Rules outdated - run /mantra:init --force to update';
  }

  let statusLine;
  if (status.loaded) {
    const fileList = status.files.map(f => f.replace('.md', '')).join(', ');
    statusLine = `📍 Mantra: ${status.files.length} rules (~${status.tokens} tokens)${reloadIndicator} | ${fileList}${outdatedWarning}`;
  } else {
    statusLine = `📍 Mantra: no rules loaded${reloadIndicator} (run /mantra:init)`;
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
      rulesOutdated: outdatedCheck.outdated
    }
  };
}

// Rough estimation constants
const TOKENS_PER_TURN = 2000;  // Average tokens per prompt+response
const USABLE_CONTEXT = 100000; // Approx usable context before compaction

/**
 * Estimate context fullness percentage based on prompt count
 */
function estimateContextFullness(promptCount) {
  const estimated = (promptCount * TOKENS_PER_TURN) / USABLE_CONTEXT * 100;
  return Math.min(Math.round(estimated), 99); // Cap at 99% (100% = compaction)
}

/**
 * Handle UserPromptSubmit - show freshness indicator with context estimate
 */
function handleUserPromptSubmit(cwd) {
  const status = getRulesStatus(cwd);
  const state = loadState();

  // Increment counter
  state.count = (state.count || 0) + 1;
  saveState(state);

  // Estimate context fullness
  const fullness = estimateContextFullness(state.count);

  // Build status line
  let statusLine;
  if (status.loaded) {
    statusLine = `📍 Mantra: ${state.count} (~${fullness}% ctx) ✓`;
  } else {
    statusLine = `📍 Mantra: ${state.count} (~${fullness}% ctx) (no rules)`;
  }

  return {
    systemMessage: statusLine,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: statusLine,
      promptCount: state.count,
      rulesLoaded: status.loaded,
      estimatedContextFullness: fullness
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

      let result;
      if (data.hook_event_name === 'SessionStart') {
        // source can be "startup", "compact", or "resume"
        const source = data.source || 'startup';
        result = handleSessionStart(cwd, source);
      } else if (data.hook_event_name === 'UserPromptSubmit') {
        result = handleUserPromptSubmit(cwd);
      } else {
        result = { continue: true };
      }

      console.log(JSON.stringify(result));
    } catch (e) {
      console.error('mantra status hook error:', e.message);
      console.log(JSON.stringify({ continue: true }));
    }
  });
}

main();
