const { parseArgs, makeAgent } = require('../skills/herdr/scripts/up.js');

describe('makeAgent', () => {
  test('claude → ◆ glyph, "claude" argv', () => {
    expect(makeAgent('claude', 'sly'))
      .toEqual({ model: 'claude', handle: 'sly', runArgv: 'claude', glyph: '◆' });
  });
  test('codex → ◇ glyph, "codex" argv', () => {
    expect(makeAgent('codex', 'jay'))
      .toEqual({ model: 'codex', handle: 'jay', runArgv: 'codex', glyph: '◇' });
  });
  test('opencode splits handle:model into "opencode -m <model>" (model may contain colons)', () => {
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b')).toEqual({
      model: 'opencode', handle: 'bob',
      runArgv: 'opencode -m ollama/qwen2.5:7b', glyph: '⬨',
    });
  });
  test('opencode without :model throws', () => {
    expect(() => makeAgent('opencode', 'bob')).toThrow(/<handle>:<model>/);
  });
});

describe('parseArgs', () => {
  test('collects agents in flag order with defaults', () => {
    const cfg = parseArgs(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay']);
    expect(cfg.branch).toBe('chore/x');
    expect(cfg.base).toBe('origin/main');
    expect(cfg.timeout).toBe(45000);
    expect(cfg.agents.map((a) => a.handle)).toEqual(['sly', 'jay']);
  });
  test('--base and --timeout override defaults', () => {
    const cfg = parseArgs(['--branch', 'b', '--base', 'origin/dev', '--timeout', '9000', '--claude', 'sly']);
    expect(cfg.base).toBe('origin/dev');
    expect(cfg.timeout).toBe(9000);
  });
  test('missing --branch throws', () => {
    expect(() => parseArgs(['--claude', 'sly'])).toThrow(/--branch is required/);
  });
  test('zero agent flags throws', () => {
    expect(() => parseArgs(['--branch', 'b'])).toThrow(/at least one agent/);
  });
  test('duplicate handle throws', () => {
    expect(() => parseArgs(['--branch', 'b', '--claude', 'sly', '--codex', 'sly']))
      .toThrow(/duplicate handle/);
  });
  test('unknown flag throws', () => {
    expect(() => parseArgs(['--branch', 'b', '--bogus', 'x'])).toThrow(/unknown flag/);
  });
  test('flag missing its value throws', () => {
    expect(() => parseArgs(['--branch'])).toThrow(/missing value for --branch/);
  });
});
