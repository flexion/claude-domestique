/**
 * Tests for shared module
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const shared = require('../index.js');

describe('shared module', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('findFiles', () => {
    it('returns empty array for non-existent directory', () => {
      expect(shared.findFiles('/nonexistent', '.md')).toEqual([]);
    });

    it('finds files with specified extension', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.md'), 'content');
      fs.writeFileSync(path.join(tmpDir, 'b.md'), 'content');
      fs.writeFileSync(path.join(tmpDir, 'c.txt'), 'content');

      const files = shared.findFiles(tmpDir, '.md');
      expect(files).toHaveLength(2);
      expect(files[0]).toContain('a.md');
      expect(files[1]).toContain('b.md');
    });

    it('returns sorted files', () => {
      fs.writeFileSync(path.join(tmpDir, 'z.md'), 'content');
      fs.writeFileSync(path.join(tmpDir, 'a.md'), 'content');

      const files = shared.findFiles(tmpDir, '.md');
      expect(path.basename(files[0])).toBe('a.md');
      expect(path.basename(files[1])).toBe('z.md');
    });
  });

  describe('findMdFiles', () => {
    it('finds markdown files', () => {
      fs.writeFileSync(path.join(tmpDir, 'test.md'), 'content');
      const files = shared.findMdFiles(tmpDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('test.md');
    });
  });

  describe('findYmlFiles', () => {
    it('finds yaml files', () => {
      fs.writeFileSync(path.join(tmpDir, 'test.yml'), 'content');
      const files = shared.findYmlFiles(tmpDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('test.yml');
    });
  });

  describe('extractFrontmatter', () => {
    it('extracts frontmatter from content', () => {
      const content = '---\nkey: value\n---\n\nBody content';
      expect(shared.extractFrontmatter(content)).toBe('key: value');
    });

    it('returns null for content without frontmatter', () => {
      const content = 'Just some text';
      expect(shared.extractFrontmatter(content)).toBeNull();
    });
  });

  describe('readContextFiles', () => {
    it('reads and concatenates files with headers', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.yml'), 'content: a');
      fs.writeFileSync(path.join(tmpDir, 'b.yml'), 'content: b');

      const files = [
        path.join(tmpDir, 'a.yml'),
        path.join(tmpDir, 'b.yml')
      ];
      const content = shared.readContextFiles(files);

      expect(content).toContain('### a.yml');
      expect(content).toContain('content: a');
      expect(content).toContain('### b.yml');
      expect(content).toContain('content: b');
    });

    it('extracts frontmatter only when option is set', () => {
      fs.writeFileSync(path.join(tmpDir, 'test.md'), '---\nfrontmatter: yes\n---\n\nBody');

      const files = [path.join(tmpDir, 'test.md')];
      const content = shared.readContextFiles(files, { frontmatterOnly: true });

      expect(content).toContain('frontmatter: yes');
      expect(content).not.toContain('Body');
    });

    it('skips unreadable files', () => {
      const files = ['/nonexistent/file.yml'];
      const content = shared.readContextFiles(files);
      expect(content).toBe('');
    });
  });

  describe('loadPluginContext', () => {
    it('loads rules and context files', () => {
      // Create rules
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir);
      fs.writeFileSync(path.join(rulesDir, 'behavior.md'), '---\nrule: test\n---');

      // Create context
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir);
      fs.writeFileSync(path.join(contextDir, 'git.yml'), 'git: config');

      const result = shared.loadPluginContext(tmpDir);

      expect(result.files).toContain('behavior');
      expect(result.files).toContain('git');
      expect(result.content).toContain('rule: test');
      expect(result.content).toContain('git: config');
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('returns empty content when no files exist', () => {
      const result = shared.loadPluginContext(tmpDir);

      expect(result.files).toHaveLength(0);
      expect(result.content).toBe('');
      expect(result.tokens).toBe(0);
    });

    it('includes companion dir when context md files exist', () => {
      const contextDir = path.join(tmpDir, 'context');
      fs.mkdirSync(contextDir);
      fs.writeFileSync(path.join(contextDir, 'example.md'), 'detailed content');

      const result = shared.loadPluginContext(tmpDir);

      expect(result.companionDir).toBe(contextDir);
      expect(result.content).toContain('Companion Docs');
    });
  });

  describe('state management', () => {
    it('getStateFile returns correct path', () => {
      const stateFile = shared.getStateFile('TestPlugin');
      expect(stateFile).toContain('.claude');
      expect(stateFile).toContain('testplugin-state.json');
    });

    it('getStateFile honours an injected home directory', () => {
      expect(shared.getStateFile('TestPlugin', tmpDir))
        .toBe(path.join(tmpDir, '.claude', 'testplugin-state.json'));
    });

    it('getStateFile defaults to the real home when none is injected', () => {
      expect(shared.getStateFile('TestPlugin'))
        .toBe(path.join(os.homedir(), '.claude', 'testplugin-state.json'));
    });

    it('getStateFile separates sessions by session_id', () => {
      expect(shared.getStateFile('TestPlugin', tmpDir, 'abc-123'))
        .toBe(path.join(tmpDir, '.claude', 'testplugin-state-abc-123.json'));
      expect(shared.getStateFile('TestPlugin', tmpDir, 'abc-123'))
        .not.toBe(shared.getStateFile('TestPlugin', tmpDir, 'def-456'));
    });

    it('getStateFile keeps a session id from escaping the state directory', () => {
      const stateFile = shared.getStateFile('TestPlugin', tmpDir, '../../etc/passwd');
      expect(path.dirname(stateFile)).toBe(path.join(tmpDir, '.claude'));
      expect(stateFile).not.toContain('..');
    });

    // One file per session per plugin, with a herd launching agents all day and
    // nothing else ever deleting them.
    it('pruneStateFiles removes stale state and keeps recent and unrelated files', () => {
      const directory = path.join(tmpDir, '.claude');
      fs.mkdirSync(directory, { recursive: true });
      const stale = path.join(directory, 'test-state-old.json');
      const recent = path.join(directory, 'test-state-new.json');
      const other = path.join(directory, 'other-plugin-state-old.json');
      const unrelated = path.join(directory, 'settings.json');
      for (const file of [stale, recent, other, unrelated]) fs.writeFileSync(file, '{}');

      const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      for (const file of [stale, other, unrelated]) fs.utimesSync(file, past, past);

      shared.pruneStateFiles(directory, 'test-state-');

      expect(fs.existsSync(stale)).toBe(false);
      expect(fs.existsSync(recent)).toBe(true);
      expect(fs.existsSync(other)).toBe(true);
      expect(fs.existsSync(unrelated)).toBe(true);
    });

    it('pruneStateFiles tolerates a directory that does not exist', () => {
      expect(() => shared.pruneStateFiles(path.join(tmpDir, 'absent'), 'test-state-')).not.toThrow();
    });

    it('a session start sweeps the plugin own stale state', () => {
      const directory = path.join(tmpDir, '.claude');
      fs.mkdirSync(directory, { recursive: true });
      const stale = path.join(directory, 'test-state-gone.json');
      fs.writeFileSync(stale, '{}');
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      fs.utimesSync(stale, past, past);

      shared.processSessionStart({ pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir }, { cwd: tmpDir });

      expect(fs.existsSync(stale)).toBe(false);
    });

    it('sessionKey rejects ids that carry no usable characters', () => {
      expect(shared.sessionKey(null)).toBeNull();
      expect(shared.sessionKey('')).toBeNull();
      expect(shared.sessionKey('///')).toBeNull();
      expect(shared.sessionKey(42)).toBeNull();
      expect(shared.sessionKey('a'.repeat(200))).toHaveLength(64);
    });

    it('loadState returns default when file does not exist', () => {
      const stateFile = path.join(tmpDir, 'state.json');
      const state = shared.loadState(stateFile, { count: 0 });
      expect(state).toEqual({ count: 0 });
    });

    it('saveState and loadState work together', () => {
      const stateFile = path.join(tmpDir, 'state.json');
      shared.saveState(stateFile, { count: 5, data: 'test' });

      const loaded = shared.loadState(stateFile, {});
      expect(loaded).toEqual({ count: 5, data: 'test' });
    });
  });

  describe('estimateTokens', () => {
    it('returns 0 for empty content', () => {
      expect(shared.estimateTokens('')).toBe(0);
      expect(shared.estimateTokens(null)).toBe(0);
    });

    it('estimates tokens based on word count', () => {
      const content = 'one two three four five'; // 5 words
      const tokens = shared.estimateTokens(content);
      expect(tokens).toBe(7); // 5 * 1.3 = 6.5, rounded up to 7
    });
  });

  describe('processSessionStart', () => {
    it('loads context and returns structured response', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir);
      fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\nrule: yes\n---');

      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      const input = { cwd: tmpDir, source: 'startup' };

      const result = shared.processSessionStart(config, input);

      expect(result.systemMessage).toContain('Test:');
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.files).toContain('test');
    });

    it('calls onSessionStart callback when provided', () => {
      const config = {
        pluginName: 'Test',
        pluginRoot: tmpDir,
        homeDir: tmpDir,
        onSessionStart: (input, base) => ({
          statusLine: 'Custom status',
          additionalContext: 'Custom context'
        })
      };
      const input = { cwd: tmpDir };

      const result = shared.processSessionStart(config, input);

      expect(result.systemMessage).toBe('Custom status');
      expect(result.hookSpecificOutput.additionalContext).toContain('Custom context');
    });

    it('states the precedence reminder once, at session start', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };

      const started = shared.processSessionStart(config, { cwd: tmpDir });
      const prompted = shared.processUserPromptSubmit(config, { cwd: tmpDir });

      expect(started.hookSpecificOutput.additionalContext).toContain('Precedence:');
      expect(prompted.hookSpecificOutput.additionalContext).not.toContain('Precedence:');
    });

    it('adds reloaded indicator for compact source', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      const input = { cwd: tmpDir, source: 'compact' };

      const result = shared.processSessionStart(config, input);

      expect(result.systemMessage).toContain('reloaded');
    });

    it('adds resumed indicator for resume source', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      const input = { cwd: tmpDir, source: 'resume' };

      const result = shared.processSessionStart(config, input);

      expect(result.systemMessage).toContain('resumed');
    });
  });

  describe('processUserPromptSubmit', () => {
    // A prompt no longer touches any state file: the counter that needed one
    // was removed once nothing read it.
    it('writes nothing to disk', () => {
      const realStateFile = shared.getStateFile('Test');
      const before = fs.existsSync(realStateFile)
        ? fs.readFileSync(realStateFile, 'utf8')
        : null;

      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      shared.processUserPromptSubmit(config, { cwd: tmpDir });

      const after = fs.existsSync(realStateFile)
        ? fs.readFileSync(realStateFile, 'utf8')
        : null;
      expect(after).toBe(before);
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'test-state.json'))).toBe(false);
    });

    it('returns a status line that carries no counter', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };

      const first = shared.processUserPromptSubmit(config, { cwd: tmpDir });
      const second = shared.processUserPromptSubmit(config, { cwd: tmpDir });

      expect(first.systemMessage).toBe('📍 Test ✓');
      expect(second.systemMessage).toBe(first.systemMessage);
      expect(first.hookSpecificOutput).not.toHaveProperty('promptCount');
      expect(first.hookSpecificOutput.additionalContext).not.toMatch(/#\d/);
    });

    it('calls onUserPromptSubmit callback when provided', () => {
      const config = {
        pluginName: 'Test',
        pluginRoot: tmpDir,
        homeDir: tmpDir,
        onUserPromptSubmit: (input, base) => ({
          additionalContext: 'Custom prompt context',
          extra: { custom: true }
        })
      };
      const input = { cwd: tmpDir };

      const result = shared.processUserPromptSubmit(config, input);

      expect(result.hookSpecificOutput.additionalContext).toContain('Custom prompt context');
      expect(result.hookSpecificOutput.custom).toBe(true);
    });

    // The rule files were re-read and re-injected every tenth prompt. #213
    // removed that: rules load at session start and again from the skill that
    // acts on them.
    it('never re-injects the rule files, however many prompts arrive', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'test.md'), '---\nrule: do the thing\n---');

      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };

      for (let prompt = 1; prompt <= 25; prompt += 1) {
        const result = shared.processUserPromptSubmit(config, { cwd: tmpDir });
        expect(result.hookSpecificOutput.additionalContext).toBe('📍 Test ✓');
      }
    });
  });

  describe('processHook', () => {
    it('routes SessionStart to correct handler', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      const input = { hook_event_name: 'SessionStart', cwd: tmpDir };

      const result = shared.processHook(config, input);

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('routes UserPromptSubmit to correct handler', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      const input = { hook_event_name: 'UserPromptSubmit', cwd: tmpDir };

      const result = shared.processHook(config, input);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });

    it('defaults to UserPromptSubmit for unknown events', () => {
      const config = { pluginName: 'Test', pluginRoot: tmpDir, homeDir: tmpDir };
      const input = { cwd: tmpDir };

      const result = shared.processHook(config, input);

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    });
  });

  describe('PRECEDENCE_REMINDER', () => {
    it('is exported and orders project guidance above plugin context', () => {
      expect(shared.PRECEDENCE_REMINDER).toContain('AGENTS.md/CLAUDE.md');
      expect(shared.PRECEDENCE_REMINDER).toContain('plugin context');
    });
  });
});

// Codex validates hook stdout against a strict schema and rejects an unknown field
// inside hookSpecificOutput, reporting only "hook returned invalid session start
// JSON output". Memento and Onus both emitted plugin metadata there and both
// failed on Codex while Mantra, which builds its own minimal envelope, passed.
describe('serializeHookOutput', () => {
  const { serializeHookOutput } = require('../index');

  const SESSION_START = {
    systemMessage: '📍 Memento: issue-feature-42-auth.md',
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'context',
      files: ['sessions'],
      tokens: 42,
      source: 'startup',
      sessionPath: '/abs/.claude/sessions/x.md',
      isNew: false,
    },
  };

  const USER_PROMPT_SUBMIT = {
    systemMessage: '📍 Onus: #42',
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: 'context',
      promptCount: 3,
      refreshed: true,
      currentIssue: '42',
      platform: 'github',
      branchChanged: true,
    },
  };

  test('emits only hookEventName and additionalContext for SessionStart', () => {
    const output = serializeHookOutput(SESSION_START);
    expect(Object.keys(output.hookSpecificOutput).sort())
      .toEqual(['additionalContext', 'hookEventName']);
    expect(output.systemMessage).toBe('📍 Memento: issue-feature-42-auth.md');
    expect(Object.keys(output).sort()).toEqual(['hookSpecificOutput', 'systemMessage']);
  });

  test('emits only hookEventName and additionalContext for UserPromptSubmit', () => {
    const output = serializeHookOutput(USER_PROMPT_SUBMIT);
    expect(Object.keys(output.hookSpecificOutput).sort())
      .toEqual(['additionalContext', 'hookEventName']);
    expect(Object.keys(output).sort()).toEqual(['hookSpecificOutput', 'systemMessage']);
  });

  // Named individually because each one was observed in a failing payload.
  test.each([
    'files', 'tokens', 'source', 'currentIssue', 'platform',
    'promptCount', 'refreshed', 'sessionPath', 'branchChanged', 'isNew',
  ])('strips the unsupported field %s', field => {
    for (const result of [SESSION_START, USER_PROMPT_SUBMIT]) {
      expect(serializeHookOutput(result).hookSpecificOutput).not.toHaveProperty(field);
    }
  });

  test('a plugin extra cannot reintroduce an unknown field', () => {
    const output = serializeHookOutput({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: 'c',
        somethingNewAPluginAdds: 'x',
      },
    });
    expect(Object.keys(output.hookSpecificOutput)).toEqual(['hookEventName', 'additionalContext']);
  });

  test('the returned object keeps its metadata for the hooks own tests', () => {
    const before = JSON.stringify(SESSION_START);
    serializeHookOutput(SESSION_START);
    expect(JSON.stringify(SESSION_START)).toBe(before);
  });

  // checkpoint.js and herdr-orient.js already build minimal envelopes for these.
  test('passes through events it does not constrain', () => {
    const preToolUse = { hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'c' } };
    expect(serializeHookOutput(preToolUse)).toEqual(preToolUse);
  });

  test('tolerates an empty or malformed result', () => {
    expect(serializeHookOutput({})).toEqual({});
    expect(serializeHookOutput(null)).toEqual({});
    expect(serializeHookOutput([])).toEqual({});
    expect(serializeHookOutput({ hookSpecificOutput: null })).toEqual({ hookSpecificOutput: null });
  });
});
