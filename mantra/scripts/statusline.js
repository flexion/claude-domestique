#!/usr/bin/env node
/**
 * mantra statusline script
 *
 * Outputs a status line showing rules count and context usage percentage.
 * Receives context_window data from Claude Code via stdin.
 *
 * Output format: "📍 Mantra: N rules @ X%" or with drift warning at 70%+
 */

const fs = require('fs');
const path = require('path');

const DRIFT_WARNING_THRESHOLD = 70;

/**
 * Get current context tokens from context_window data
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
 * Calculate context usage percentage
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
  return Math.min(percent, 99);
}

/**
 * Count rules in .claude/rules/
 */
function getRulesCount(cwd) {
  const rulesDir = path.join(cwd, '.claude', 'rules');

  if (!fs.existsSync(rulesDir)) {
    return 0;
  }

  try {
    return fs.readdirSync(rulesDir)
      .filter(f => f.endsWith('.md'))
      .length;
  } catch (e) {
    return 0;
  }
}

/**
 * Generate status line
 */
function generateStatusLine(data) {
  const cwd = data.cwd || data.workspace?.current_dir || process.cwd();
  const rulesCount = getRulesCount(cwd);
  const contextPercent = calculateContextPercentage(data.context_window);

  const contextPart = contextPercent !== null ? `${contextPercent}%` : '?';

  let driftWarning = '';
  if (contextPercent !== null && contextPercent >= DRIFT_WARNING_THRESHOLD) {
    driftWarning = ' \u26a0\ufe0f drift';
  }

  if (rulesCount > 0) {
    return `\ud83d\udccd Mantra: ${rulesCount} rules @ ${contextPart}${driftWarning}`;
  } else {
    return `\ud83d\udccd Mantra: ${contextPart}${driftWarning} (no rules)`;
  }
}

// Main
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    console.log(generateStatusLine(data));
  } catch (e) {
    console.log('\ud83d\udccd Mantra: ?');
  }
});
