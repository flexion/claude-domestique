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
    test('returns FIRST_INTERACTION on first call', () => {
      const result = checkRefresh();
      expect(result.action).toBe('FIRST_INTERACTION');
      expect(result.interaction).toBe(1);
      expect(result.nextRefresh).toBe(1 + DEFAULTS.interval);
    });

    test('does not refresh before interval reached after first interaction', () => {
      checkRefresh(); // First interaction
      for (let i = 2; i <= DEFAULTS.interval; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
        expect(result.interaction).toBe(i);
      }
    });

    test('refreshes at interval after first interaction', () => {
      // First interaction sets last_refresh_at = 1
      checkRefresh();
      // Run to interval (1 + interval - 1 more calls)
      for (let i = 2; i <= DEFAULTS.interval; i++) {
        checkRefresh();
      }
      // Next call (interval + 1) should trigger refresh
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(DEFAULTS.interval + 1);
      expect(result.nextRefresh).toBe(DEFAULTS.interval + 1 + DEFAULTS.interval);
    });

    test('refreshes again at next interval', () => {
      // First interaction
      checkRefresh();
      // Run to first periodic refresh
      for (let i = 2; i <= DEFAULTS.interval + 1; i++) {
        checkRefresh();
      }
      // Now at interval + 1, next refresh at (interval + 1) + interval = 2*interval + 1
      for (let i = DEFAULTS.interval + 2; i <= DEFAULTS.interval * 2; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
      }
      // Should refresh at 2*interval + 1
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(DEFAULTS.interval * 2 + 1);
    });

    test('reports correct nextRefresh value', () => {
      // First interaction sets last_refresh_at = 1, so next refresh at 1 + interval = 21
      const result = checkRefresh();
      expect(result.action).toBe('FIRST_INTERACTION');
      expect(result.nextRefresh).toBe(1 + DEFAULTS.interval);

      // Run until just before refresh (interaction 21)
      for (let i = 2; i <= DEFAULTS.interval; i++) {
        const r = checkRefresh();
        expect(r.action).toBe('NO_REFRESH');
        expect(r.nextRefresh).toBe(1 + DEFAULTS.interval);
      }

      // Interaction 21 should trigger refresh
      const refreshResult = checkRefresh();
      expect(refreshResult.action).toBe('REFRESH_NEEDED');
      expect(refreshResult.interaction).toBe(DEFAULTS.interval + 1);
      expect(refreshResult.nextRefresh).toBe(DEFAULTS.interval + 1 + DEFAULTS.interval);
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

      // First interaction
      const first = checkRefresh();
      expect(first.action).toBe('FIRST_INTERACTION');

      // Should not refresh before custom interval
      for (let i = 2; i <= customInterval; i++) {
        const result = checkRefresh();
        expect(result.action).toBe('NO_REFRESH');
      }

      // Should refresh at custom interval + 1
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
      expect(result.interaction).toBe(customInterval + 1);
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

      // First interaction
      checkRefresh();
      // Should use default interval despite invalid config
      for (let i = 2; i <= DEFAULTS.interval; i++) {
        checkRefresh();
      }
      const result = checkRefresh();
      expect(result.action).toBe('REFRESH_NEEDED');
    });

    test('uses defaults for non-numeric interval', () => {
      setupConfig({
        context: { periodicRefresh: { enabled: true, interval: 'invalid' } }
      });

      // First interaction
      checkRefresh();
      for (let i = 2; i <= DEFAULTS.interval; i++) {
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
      // Run some interactions (first is FIRST_INTERACTION)
      checkRefresh(); // count = 1 (FIRST_INTERACTION, sets last_refresh_at = 1)
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
      // Run 15 interactions (first is FIRST_INTERACTION)
      for (let i = 1; i <= 15; i++) {
        checkRefresh();
      }

      // Manual refresh at interaction 15
      recordManualRefresh();

      // Next interactions should not trigger refresh until 15 + 20 = 35
      for (let i = 16; i < 35; i++) {
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
      checkRefresh(); // count = 1 (FIRST_INTERACTION, sets last_refresh_at = 1)
      checkRefresh(); // count = 2
      checkRefresh(); // count = 3

      // Next refresh at 1 + 20 = 21, current at 3, so untilRefresh = 21 - 3 = 18
      const status = getStatus();
      expect(status.enabled).toBe(true);
      expect(status.interaction).toBe(3);
      expect(status.untilRefresh).toBe(1 + DEFAULTS.interval - 3);
    });

    test('resets untilRefresh after refresh', () => {
      // First interaction sets last_refresh_at = 1
      checkRefresh();
      // Run to first periodic refresh at interaction 21
      for (let i = 2; i <= DEFAULTS.interval + 1; i++) {
        checkRefresh();
      }

      // Now at interaction 21, last_refresh_at = 21, next at 21 + 20 = 41
      // untilRefresh = 41 - 21 = 20
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
