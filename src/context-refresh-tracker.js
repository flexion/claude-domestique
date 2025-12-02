/**
 * Context Refresh Tracker
 *
 * Tracks interaction count and determines when periodic context refresh is needed.
 * State is persisted to file so it survives across hook invocations.
 *
 * @see agents/context-refresh.md for behavioral specification
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = '.claude/state/refresh-tracker.json';
const CONFIG_FILE = '.claude/config.json';

const DEFAULTS = {
  enabled: true,
  interval: 20,
  skipWindow: 10
};

/**
 * Read current tracker state from file
 * @returns {Object} State object with interaction_count and last_refresh_at
 */
function readState() {
  try {
    const content = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { interaction_count: 0, last_refresh_at: 0 };
  }
}

/**
 * Write tracker state to file
 * @param {Object} state - State object to persist
 */
function writeState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Read periodic refresh configuration from project config
 * @returns {Object} Config with enabled and interval properties
 */
function readConfig() {
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(content);
    return {
      enabled: config?.context?.periodicRefresh?.enabled ?? DEFAULTS.enabled,
      interval: config?.context?.periodicRefresh?.interval ?? DEFAULTS.interval
    };
  } catch {
    return { enabled: DEFAULTS.enabled, interval: DEFAULTS.interval };
  }
}

/**
 * Check if context refresh is needed and update state
 * @returns {Object} Result with action, interaction count, and next refresh info
 */
function checkRefresh() {
  const config = readConfig();

  // If disabled, don't track or refresh
  if (!config.enabled) {
    return { action: 'DISABLED' };
  }

  // Validate interval
  let interval = config.interval;
  if (typeof interval !== 'number' || interval <= 0) {
    interval = DEFAULTS.interval;
  }

  const state = readState();
  state.interaction_count++;

  const sinceRefresh = state.interaction_count - state.last_refresh_at;

  if (sinceRefresh >= interval) {
    // Time to refresh
    state.last_refresh_at = state.interaction_count;
    writeState(state);
    return {
      action: 'REFRESH_NEEDED',
      interaction: state.interaction_count,
      nextRefresh: state.interaction_count + interval
    };
  }

  // Not yet time to refresh
  writeState(state);
  return {
    action: 'NO_REFRESH',
    interaction: state.interaction_count,
    nextRefresh: state.last_refresh_at + interval
  };
}

/**
 * Reset tracker state (useful for testing or session start)
 */
function resetState() {
  writeState({ interaction_count: 0, last_refresh_at: 0 });
}

/**
 * Record a manual refresh (updates last_refresh_at without incrementing count)
 * Called when user manually says "refresh context"
 */
function recordManualRefresh() {
  const state = readState();
  state.last_refresh_at = state.interaction_count;
  writeState(state);
  return {
    action: 'MANUAL_REFRESH_RECORDED',
    interaction: state.interaction_count
  };
}

/**
 * Get current status without modifying state (for canary display)
 * @returns {Object} Status with interaction count and interactions until next refresh
 */
function getStatus() {
  const config = readConfig();

  if (!config.enabled) {
    return { enabled: false, untilRefresh: null };
  }

  let interval = config.interval;
  if (typeof interval !== 'number' || interval <= 0) {
    interval = DEFAULTS.interval;
  }

  const state = readState();
  const nextRefresh = state.last_refresh_at + interval;
  const untilRefresh = nextRefresh - state.interaction_count;

  return {
    enabled: true,
    interaction: state.interaction_count,
    untilRefresh: untilRefresh
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  let result;
  switch (command) {
    case 'check':
      result = checkRefresh();
      break;
    case 'status':
      result = getStatus();
      break;
    case 'reset':
      resetState();
      result = { action: 'RESET' };
      break;
    case 'manual':
      result = recordManualRefresh();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result));
}

module.exports = {
  checkRefresh,
  getStatus,
  readConfig,
  readState,
  writeState,
  resetState,
  recordManualRefresh,
  DEFAULTS,
  STATE_FILE,
  CONFIG_FILE
};
