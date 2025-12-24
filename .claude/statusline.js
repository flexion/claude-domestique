#!/usr/bin/env node
/**
 * mantra statusline script
 *
 * Outputs a status line showing rules, context, model, and cost.
 * Receives JSON data from Claude Code via stdin (Status event).
 *
 * Output format: "📍 Mantra: N rules @ X% | Model | $0.00"
 */

const fs = require('fs');
const path = require('path');

const DRIFT_WARNING_THRESHOLD = 70;

/**
 * Format cost as currency string
 * @param {number} costUsd - Cost in USD
 * @returns {string} Formatted cost (e.g., "$0.12" or "$1.23")
 */
function formatCost(costUsd) {
  if (costUsd === null || costUsd === undefined) {
    return null;
  }
  if (costUsd < 0.01) {
    return '$0.00';
  }
  if (costUsd < 1) {
    return `$${costUsd.toFixed(2)}`;
  }
  return `$${costUsd.toFixed(2)}`;
}

/**
 * Get short model name
 * @param {object} model - Model info from Claude Code
 * @returns {string|null} Short model name
 */
function getModelName(model) {
  if (!model) return null;
  // Prefer display_name, fall back to extracting from id
  if (model.display_name) {
    return model.display_name;
  }
  if (model.id) {
    // Extract model name from id like "claude-opus-4-1" -> "Opus"
    const match = model.id.match(/claude-(\w+)-/i);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
  }
  return null;
}

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
  const modelName = getModelName(data.model);
  const cost = formatCost(data.cost?.total_cost_usd);

  const contextPart = contextPercent !== null ? `${contextPercent}%` : '?';

  let driftWarning = '';
  if (contextPercent !== null && contextPercent >= DRIFT_WARNING_THRESHOLD) {
    driftWarning = ' \u26a0\ufe0f';
  }

  // Build status parts
  const parts = [];

  // Rules and context
  if (rulesCount > 0) {
    parts.push(`${rulesCount} rules @ ${contextPart}${driftWarning}`);
  } else {
    parts.push(`${contextPart}${driftWarning} (no rules)`);
  }

  // Model name
  if (modelName) {
    parts.push(modelName);
  }

  // Cost
  if (cost) {
    parts.push(cost);
  }

  return `\ud83d\udccd Mantra: ${parts.join(' | ')}`;
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
