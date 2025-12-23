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

  it('handles UserPromptSubmit with freshness and context estimate', () => {
    // Create rules
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\ntest: rule\n---');

    const result = runHook({
      hook_event_name: 'UserPromptSubmit',
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('Mantra:');
    expect(result.systemMessage).toContain('% ctx');
    expect(result.systemMessage).toContain('✓');
    expect(result.hookSpecificOutput.promptCount).toBeGreaterThan(0);
    expect(result.hookSpecificOutput.rulesLoaded).toBe(true);
    expect(result.hookSpecificOutput.estimatedContextFullness).toBeDefined();
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
      cwd: tmpDir
    });

    expect(result.systemMessage).toContain('no rules');
    expect(result.systemMessage).toContain('% ctx');
    expect(result.hookSpecificOutput.rulesLoaded).toBe(false);
    expect(result.hookSpecificOutput.estimatedContextFullness).toBeDefined();
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
});
