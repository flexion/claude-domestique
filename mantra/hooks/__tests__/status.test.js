const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('mantra status hook', () => {
  let tmpDir;
  const hookPath = path.join(__dirname, '..', 'status.js');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-status-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runHook(input) {
    const result = execSync(`node "${hookPath}"`, {
      input: JSON.stringify(input),
      encoding: 'utf8',
      cwd: tmpDir
    });
    return JSON.parse(result.trim());
  }

  it('reports no rules when .claude/rules does not exist', () => {
    const result = runHook({
      hook_event_name: 'SessionStart',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('no rules loaded');
    expect(result.hookSpecificOutput.rulesLoaded).toBe(false);
  });

  it('reports rules when .claude/rules has md files', () => {
    // Create rules directory with a rule file
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(rulesDir, 'behavior.md'),
      '---\ntest: rule\n---'
    );

    const result = runHook({
      hook_event_name: 'SessionStart',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('1 rules');
    expect(result.systemMessage).toContain('behavior');
    expect(result.hookSpecificOutput.rulesLoaded).toBe(true);
    expect(result.hookSpecificOutput.ruleCount).toBe(1);
  });

  it('counts multiple rule files', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\na: 1\n---');
    fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\nb: 2\n---');
    fs.writeFileSync(path.join(rulesDir, 'git.md'), '---\nc: 3\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      cwd: tmpDir
    });

    expect(result.hookSpecificOutput.ruleCount).toBe(3);
    expect(result.systemMessage).toContain('behavior, git, test');
  });

  it('handles UserPromptSubmit with context_window data', () => {
    // Create rules
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
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

    expect(result.systemMessage).toContain('Mantra:');
    expect(result.systemMessage).toContain('5% ctx'); // 10000/200000 = 5%
    expect(result.systemMessage).toContain('✓');
    expect(result.hookSpecificOutput.promptCount).toBeGreaterThan(0);
    expect(result.hookSpecificOutput.rulesLoaded).toBe(true);
    expect(result.hookSpecificOutput.contextPercentage).toBe(5);
  });

  it('falls back to prompt count when no context_window data', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('Mantra:');
    expect(result.systemMessage).toMatch(/#\d+/); // Falls back to #N format
    expect(result.systemMessage).toContain('✓');
    expect(result.hookSpecificOutput.contextPercentage).toBeNull();
  });

  it('increments counter on each UserPromptSubmit', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\na: 1\n---');

    // First prompt
    const result1 = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir
    });

    // Second prompt
    const result2 = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir
    });

    expect(result2.hookSpecificOutput.promptCount).toBe(
      result1.hookSpecificOutput.promptCount + 1
    );
  });

  it('resets counter on SessionStart', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\na: 1\n---');

    // Simulate some prompts
    runHook({ hook_event_name: 'UserPromptSubmit', cwd: tmpDir });
    runHook({ hook_event_name: 'UserPromptSubmit', cwd: tmpDir });

    // Session start should reset
    runHook({ hook_event_name: 'SessionStart', cwd: tmpDir });

    // Next prompt should be 1
    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir
    });

    expect(result.hookSpecificOutput.promptCount).toBe(1);
  });

  it('shows no rules indicator on UserPromptSubmit when rules missing', () => {
    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir,
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 20000,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0
        }
      }
    });

    expect(result.systemMessage).toContain('no rules');
    expect(result.systemMessage).toContain('10% ctx'); // 20000/200000 = 10%
    expect(result.hookSpecificOutput.rulesLoaded).toBe(false);
    expect(result.hookSpecificOutput.contextPercentage).toBe(10);
  });

  it('shows compaction indicator when source is compact', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      source: 'compact',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('reloaded after compaction');
    expect(result.hookSpecificOutput.source).toBe('compact');
  });

  it('shows resume indicator when source is resume', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      source: 'resume',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('resumed');
    expect(result.hookSpecificOutput.source).toBe('resume');
  });

  it('shows no indicator for normal startup', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      source: 'startup',
      cwd: tmpDir
    });

    expect(result.systemMessage).not.toContain('reloaded');
    expect(result.systemMessage).not.toContain('resumed');
    expect(result.hookSpecificOutput.source).toBe('startup');
  });

  it('detects outdated rules when content hash differs', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    // Write a version file with a different hash
    fs.writeFileSync(
      path.join(rulesDir, '.mantra-version.json'),
      JSON.stringify({
        version: '0.1.0',
        contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0', // Different hash
        copiedAt: new Date().toISOString(),
        files: ['behavior.md']
      })
    );

    const result = runHook({
      hook_event_name: 'SessionStart',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('outdated');
    expect(result.systemMessage).toContain('/mantra:init --force');
    expect(result.hookSpecificOutput.rulesOutdated).toBe(true);
  });

  it('does not warn when content hash matches', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    // Write a version file - rulesOutdated should be false since no plugin rules to compare
    fs.writeFileSync(
      path.join(rulesDir, '.mantra-version.json'),
      JSON.stringify({
        version: '0.2.0',
        copiedAt: new Date().toISOString(),
        files: ['behavior.md']
        // No contentHash = no outdated check
      })
    );

    const result = runHook({
      hook_event_name: 'SessionStart',
      cwd: tmpDir
    });

    expect(result.systemMessage).not.toContain('outdated');
    expect(result.hookSpecificOutput.rulesOutdated).toBe(false);
  });

  it('warns about startup bloat when initial context >35%', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      source: 'startup',
      cwd: tmpDir,
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 80000, // 40% - above threshold
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0
        }
      }
    });

    expect(result.systemMessage).toContain('High initial context');
    expect(result.systemMessage).toContain('40%');
    expect(result.hookSpecificOutput.startupBloat).toBe(true);
    expect(result.hookSpecificOutput.contextPercentage).toBe(40);
  });

  it('does not warn about bloat on resume or compact', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      source: 'resume',
      cwd: tmpDir,
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 80000, // 40% - would trigger on startup
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0
        }
      }
    });

    expect(result.systemMessage).not.toContain('High initial context');
    expect(result.hookSpecificOutput.startupBloat).toBe(false);
  });

  it('shows context percentage on SessionStart', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'SessionStart',
      cwd: tmpDir,
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 20000, // 10%
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0
        }
      }
    });

    expect(result.systemMessage).toContain('@ 10%');
    expect(result.hookSpecificOutput.contextPercentage).toBe(10);
  });

  it('warns about drift when context usage >=70%', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir,
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 150000, // 75%
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0
        }
      }
    });

    expect(result.systemMessage).toContain('75% ctx');
    expect(result.systemMessage).toContain('drift');
    expect(result.hookSpecificOutput.driftWarning).toBe(true);
  });

  it('does not warn about drift when context usage <70%', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir,
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 100000, // 50%
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0
        }
      }
    });

    expect(result.systemMessage).toContain('50% ctx');
    expect(result.systemMessage).not.toContain('drift');
    expect(result.hookSpecificOutput.driftWarning).toBe(false);
  });
});
