const fs = require('fs');
const path = require('path');
const os = require('os');

// Test only plugin-specific logic, not shared module functionality

describe('mantra session-monitor hook', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('hasProjectRules', () => {
    // Import after setup
    let hook;
    beforeEach(() => {
      jest.resetModules();
      hook = require('../session-monitor.js');
    });

    it('returns false when .claude/rules does not exist', () => {
      expect(hook.hasProjectRules(tmpDir)).toBe(false);
    });

    it('returns false when .claude/rules is empty', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude', 'rules'), { recursive: true });
      expect(hook.hasProjectRules(tmpDir)).toBe(false);
    });

    it('returns true when .claude/rules has md files', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\ntest: rule\n---');
      expect(hook.hasProjectRules(tmpDir)).toBe(true);
    });

    it('returns false when .claude/rules has only non-md files', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'test.txt'), 'not a rule');
      expect(hook.hasProjectRules(tmpDir)).toBe(false);
    });
  });

  describe('getContextPercentage', () => {
    let hook;
    beforeEach(() => {
      jest.resetModules();
      hook = require('../session-monitor.js');
    });

    it('returns null when no context_window data', () => {
      expect(hook.getContextPercentage({})).toBe(null);
    });

    it('returns null when missing current_usage', () => {
      expect(hook.getContextPercentage({
        context_window: { context_window_size: 200000 }
      })).toBe(null);
    });

    it('calculates percentage correctly', () => {
      expect(hook.getContextPercentage({
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 20000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      })).toBe(10);
    });

    it('includes cache tokens in calculation', () => {
      expect(hook.getContextPercentage({
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 5000,
            cache_read_input_tokens: 5000
          }
        }
      })).toBe(10);
    });
  });
});
