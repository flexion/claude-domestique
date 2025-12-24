const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('mantra statusline script', () => {
  let tmpDir;
  const scriptPath = path.join(__dirname, '..', 'statusline.js');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-statusline-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runStatusline(input) {
    const result = execSync(`node "${scriptPath}"`, {
      input: JSON.stringify(input),
      encoding: 'utf8',
      cwd: tmpDir
    });
    return result.trim();
  }

  describe('basic output', () => {
    it('outputs fallback when no input data', () => {
      const result = runStatusline({});
      expect(result).toContain('Mantra:');
      expect(result).toContain('?');
    });

    it('shows rules count when rules exist', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');
      fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('2 rules');
    });

    it('shows no rules indicator when rules missing', () => {
      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('no rules');
    });
  });

  describe('context percentage', () => {
    // Note: percentages include 22.5% autocompact buffer to match /context command
    it('calculates context percentage correctly (includes autocompact buffer)', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 50000, // 25% + 22.5% buffer = 48%
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('48%');
    });

    it('includes cache tokens in percentage calculation', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 20000,
            cache_read_input_tokens: 10000
          }
        }
      });

      // 10000 + 20000 + 10000 = 40000 / 200000 = 20% + 22.5% buffer = 43%
      expect(result).toContain('43%');
    });

    it('shows ? when no context_window data', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir
      });

      expect(result).toContain('?');
    });
  });

  describe('drift warning', () => {
    // Note: percentages include 22.5% autocompact buffer
    it('shows drift warning at 70% displayed context usage', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 95000, // 47.5% + 22.5% buffer = 70%
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('70%');
      expect(result).toContain('\u26a0\ufe0f'); // Warning emoji
    });

    it('does not show drift warning below 70%', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 90000, // 45% + 22.5% buffer = 68%
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('68%');
      expect(result).not.toContain('\u26a0\ufe0f');
    });
  });

  describe('model display', () => {
    it('shows model display_name', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        model: {
          id: 'claude-opus-4-1',
          display_name: 'Opus'
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('Opus');
    });

    it('extracts model name from id when display_name missing', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        model: {
          id: 'claude-sonnet-4-1'
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('Sonnet');
    });

    it('does not show model when not provided', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      // Should not have extra pipes for missing model
      expect(result).not.toMatch(/\| \|/);
    });
  });

  describe('cost display', () => {
    it('shows cost when provided', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        cost: {
          total_cost_usd: 0.25
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('$0.25');
    });

    it('shows $0.00 for very small costs', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        cost: {
          total_cost_usd: 0.001
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('$0.00');
    });

    it('formats costs over $1 correctly', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        cost: {
          total_cost_usd: 1.50
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('$1.50');
    });
  });

  describe('combined output', () => {
    it('shows all parts with pipes', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        cwd: tmpDir,
        model: {
          display_name: 'Opus'
        },
        cost: {
          total_cost_usd: 0.15
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000, // 5% + 22.5% buffer = 28%
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('1 rules @ 28%');
      expect(result).toContain('Opus');
      expect(result).toContain('$0.15');
      expect(result).toContain('|');
    });
  });

  describe('workspace handling', () => {
    it('uses workspace.current_dir when cwd not provided', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        workspace: {
          current_dir: tmpDir
        },
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 10000,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('1 rules');
    });
  });

  describe('Status hook event', () => {
    it('handles Status hook_event_name', () => {
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

      const result = runStatusline({
        hook_event_name: 'Status',
        cwd: tmpDir,
        context_window: {
          context_window_size: 200000,
          current_usage: {
            input_tokens: 20000, // 10% + 22.5% buffer = 33%
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      });

      expect(result).toContain('Mantra:');
      expect(result).toContain('33%');
    });
  });
});
