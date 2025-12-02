/**
 * Tests for Context Refresh Tracker
 */

const fs = require('fs');
const path = require('path');
const {
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
} = require('./context-refresh-tracker');

// Test utilities
function cleanupState() {
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
}

function cleanupConfig() {
  try {
    fs.unlinkSync(CONFIG_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
}

function setupConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Tests
describe('context-refresh-tracker', () => {
  beforeEach(() => {
    cleanupState();
  });

  afterAll(() => {
    cleanupState();
    cleanupConfig();
  });

  describe('checkRefresh', () => {
    test('does not refresh before interval reached', () => {
      for (let i = 1; i < DEFAULTS.interval; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
        expect(result.interaction).toBe(i);
      }
    });

    test('refreshes at interval', () => {
      // Run to interval - 1
      for (let i = 1; i < DEFAULTS.interval; i++) {
        checkRefresh();
      }
      // 20th should trigger refresh
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(DEFAULTS.interval);
      expect(result.nextRefresh).toBe(DEFAULTS.interval * 2);
    });

    test('refreshes again at next interval', () => {
      // First refresh cycle
      for (let i = 1; i <= DEFAULTS.interval; i++) {
        checkRefresh();
      }
      // Second cycle - should not refresh until interval * 2
      for (let i = DEFAULTS.interval + 1; i < DEFAULTS.interval * 2; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
      }
      // Should refresh at interval * 2
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(DEFAULTS.interval * 2);
    });

    test('reports correct nextRefresh value', () => {
      const result = checkRefresh();
      expect(result.nextRefresh).toBe(DEFAULTS.interval);

      // After refresh, nextRefresh should be double
      for (let i = 2; i <= DEFAULTS.interval; i++) {
        checkRefresh();
      }
      const refreshResult = checkRefresh();
      expect(refreshResult.nextRefresh).toBe(DEFAULTS.interval * 2);
    });
  });

  describe('configuration', () => {
    beforeEach(() => {
      cleanupConfig();
    });

    test('respects disabled config', () => {
      setupConfig({
        context: { periodicRefresh: { enabled: false } }
      });

      const result = checkRefresh();
      expect(result.action).toBe('DISABLED');
    });

    test('respects custom interval', () => {
      const customInterval = 5;
      setupConfig({
        context: { periodicRefresh: { enabled: true, interval: customInterval } }
      });

      // Should not refresh before custom interval
      for (let i = 1; i < customInterval; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
      }

      // Should refresh at custom interval
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(customInterval);
    });

    test('uses defaults when config missing', () => {
      const config = readConfig();
      expect(config.enabled).toBe(DEFAULTS.enabled);
      expect(config.interval).toBe(DEFAULTS.interval);
    });

    test('uses defaults for invalid interval', () => {
      setupConfig({
        context: { periodicRefresh: { enabled: true, interval: -5 } }
      });

      // Should use default interval despite invalid config
      for (let i = 1; i < DEFAULTS.interval; i++) {
        checkRefresh();
      }
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
    });

    test('uses defaults for non-numeric interval', () => {
      setupConfig({
        context: { periodicRefresh: { enabled: true, interval: 'invalid' } }
      });

      for (let i = 1; i < DEFAULTS.interval; i++) {
        checkRefresh();
      }
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
    });
  });

  describe('state management', () => {
    test('persists state across calls', () => {
      checkRefresh();
      checkRefresh();

      const state = readState();
      expect(state.interaction_count).toBe(2);
    });

    test('resetState clears state', () => {
      checkRefresh();
      checkRefresh();
      resetState();

      const state = readState();
      expect(state.interaction_count).toBe(0);
      expect(state.last_refresh_at).toBe(0);
    });

    test('readState returns defaults when file missing', () => {
      cleanupState();
      const state = readState();
      expect(state.interaction_count).toBe(0);
      expect(state.last_refresh_at).toBe(0);
    });
  });

  describe('recordManualRefresh', () => {
    test('updates last_refresh_at without incrementing count', () => {
      // Run some interactions
      checkRefresh(); // count = 1
      checkRefresh(); // count = 2
      checkRefresh(); // count = 3

      // Record manual refresh
      const result = recordManualRefresh();
      expect(result.action).toBe('MANUAL_REFRESH_RECORDED');
      expect(result.interaction).toBe(3);

      const state = readState();
      expect(state.interaction_count).toBe(3);
      expect(state.last_refresh_at).toBe(3);
    });

    test('delays next automatic refresh after manual refresh', () => {
      // Run 15 interactions
      for (let i = 1; i <= 15; i++) {
        checkRefresh();
      }

      // Manual refresh at interaction 15
      recordManualRefresh();

      // Next 4 interactions should not trigger refresh
      for (let i = 16; i <= 19; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
      }

      // But we still need 20 more from last refresh (at 15)
      // So refresh should happen at 15 + 20 = 35
      // Currently at 19, need to go to 35
      for (let i = 20; i < 35; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
      }

      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(35);
    });
  });

  describe('getStatus', () => {
    test('returns correct untilRefresh at start', () => {
      const status = getStatus();
      expect(status.enabled).toBe(true);
      expect(status.interaction).toBe(0);
      expect(status.untilRefresh).toBe(DEFAULTS.interval);
    });

    test('returns decreasing untilRefresh as interactions increase', () => {
      checkRefresh(); // count = 1
      checkRefresh(); // count = 2
      checkRefresh(); // count = 3

      const status = getStatus();
      expect(status.enabled).toBe(true);
      expect(status.interaction).toBe(3);
      expect(status.untilRefresh).toBe(DEFAULTS.interval - 3);
    });

    test('resets untilRefresh after refresh', () => {
      // Run to refresh point
      for (let i = 1; i <= DEFAULTS.interval; i++) {
        checkRefresh();
      }

      const status = getStatus();
      expect(status.untilRefresh).toBe(DEFAULTS.interval);
    });

    test('does not modify state', () => {
      checkRefresh(); // count = 1
      const stateBefore = readState();

      getStatus();
      getStatus();
      getStatus();

      const stateAfter = readState();
      expect(stateAfter.interaction_count).toBe(stateBefore.interaction_count);
    });

    test('returns disabled when config disabled', () => {
      setupConfig({
        context: { periodicRefresh: { enabled: false } }
      });

      const status = getStatus();
      expect(status.enabled).toBe(false);
      expect(status.untilRefresh).toBe(null);
    });
  });
});
