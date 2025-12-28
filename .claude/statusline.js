#!/usr/bin/env node
/**
 * Project statusline script
 *
 * Outputs a status line showing git branch, context utilization, model, and cost.
 * Receives JSON data from Claude Code via stdin (Status event).
 *
 * Context utilization thresholds:
 *   0-69%:  Green  - Good, rules are being followed
 *   70-79%: Yellow - Warning, consider wrapping up current task
 *   80-89%: Orange - Strong warning, update session file, consider /compact
 *   90%+:  Red    - Critical, save context NOW, start fresh conversation
 *
 * High utilization risk: Claude may disregard project rules and drift to base training.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Context utilization thresholds
const THRESHOLD_WARNING = 70;        // Yellow
const THRESHOLD_STRONG_WARNING = 80; // Orange
const THRESHOLD_CRITICAL = 90;       // Red

// ANSI color codes
const COLORS = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

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
 * Calculate context usage percentage (matching /context command)
 * Includes autocompact buffer reservation (~22.5% of context window)
 */
function calculateContextPercentage(contextWindow) {
  if (!contextWindow?.context_window_size) {
    return null;
  }

  const currentTokens = getCurrentContextTokens(contextWindow);
  if (currentTokens === null) {
    return null;
  }

  // Add autocompact buffer (22.5% of context window) to match /context display
  const autocompactBuffer = Math.round(contextWindow.context_window_size * 0.225);
  const totalUsed = currentTokens + autocompactBuffer;

  const percent = Math.round((totalUsed / contextWindow.context_window_size) * 100);
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
 * Get current git branch name
 */
function getGitBranch(cwd) {
  try {
    const branch = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch || null;
  } catch (e) {
    return null;
  }
}

/**
 * Extract work item ID from branch name
 * Matches patterns like: 120677-description, issue/feature-120677/desc
 */
function extractWorkItemId(branch) {
  if (!branch) return null;

  // Match 5-6 digit numbers (Azure DevOps work item IDs)
  const match = branch.match(/(\d{5,6})/);
  return match ? match[1] : null;
}

/**
 * Check if session file exists for current branch
 */
function hasSessionFile(cwd, branch) {
  if (!branch) return false;

  // Sanitize branch name for filename (replace / with -)
  const sanitized = branch.replace(/\//g, '-');
  const sessionPath = path.join(cwd, '.claude', 'sessions', `${sanitized}.md`);

  return fs.existsSync(sessionPath);
}

/**
 * Get color and status for context utilization percentage
 */
function getContextStatus(percent) {
  if (percent === null) {
    return { color: COLORS.dim, status: '', advice: '' };
  }

  if (percent >= THRESHOLD_CRITICAL) {
    return {
      color: COLORS.red,
      status: '🔴',
      advice: 'CRITICAL: Save to session, start new conversation',
    };
  }
  if (percent >= THRESHOLD_STRONG_WARNING) {
    return {
      color: COLORS.orange,
      status: '🟠',
      advice: 'Update session file NOW, consider /compact',
    };
  }
  if (percent >= THRESHOLD_WARNING) {
    return {
      color: COLORS.yellow,
      status: '🟡',
      advice: 'Consider wrapping up current task',
    };
  }
  return {
    color: COLORS.green,
    status: '🟢',
    advice: 'Project rules active, context healthy',
  };
}

/**
 * Get session filename for branch
 */
function getSessionFileName(branch) {
  if (!branch) return null;
  // Sanitize branch name for filename (replace / with -)
  return branch.replace(/\//g, '-') + '.md';
}

/**
 * Generate status line
 */
function generateStatusLine(data) {
  const cwd = data.cwd || data.workspace?.current_dir || process.cwd();
  const rulesCount = getRulesCount(cwd);
  const contextPercent = calculateContextPercentage(data.context_window);
  const branch = getGitBranch(cwd);
  const contextStatus = getContextStatus(contextPercent);
  const workItemId = extractWorkItemId(branch);
  const sessionExists = hasSessionFile(cwd, branch);
  const sessionFileName = getSessionFileName(branch);

  // Build status parts
  const parts = [];

  // Branch name
  if (branch) {
    parts.push(`${COLORS.dim}${branch}${COLORS.reset}`);
  }

  // Work item ID or "chore"
  if (workItemId) {
    parts.push(`#${workItemId}`);
  } else if (branch) {
    parts.push('chore');
  }

  // Session file name (colored based on existence)
  if (sessionFileName) {
    const sessionPart = sessionExists
      ? `${COLORS.green}${sessionFileName}${COLORS.reset}`
      : `${COLORS.yellow}${sessionFileName}?${COLORS.reset}`;
    parts.push(sessionPart);
  }

  // Context utilization with color-coded status
  const contextPart = contextPercent !== null ? `${contextPercent}%` : '?';
  const coloredContext = `${contextStatus.color}${contextPart}${COLORS.reset}`;

  if (rulesCount > 0) {
    parts.push(`${contextStatus.status} ${coloredContext}`);
  } else {
    parts.push(`${contextStatus.status} ${coloredContext} (no rules)`);
  }

  // Add advice if context is high
  let adviceLine = '';
  if (contextStatus.advice) {
    adviceLine = `\n  ${contextStatus.color}↳ ${contextStatus.advice}${COLORS.reset}`;
  }

  // Add session warning if missing
  if (!sessionExists && branch && !branch.startsWith('main')) {
    adviceLine += `\n  ${COLORS.yellow}↳ No session file - run /memento:session to create${COLORS.reset}`;
  }

  return `${parts.join(' | ')}${adviceLine}`;
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
    console.log('? | ?');
  }
});
