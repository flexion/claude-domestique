const fs = require('fs');
const path = require('path');
const os = require('os');

const { initCommand, helpCommand, EXAMPLES_DIR, HOOKS_DIR, SETTINGS_FILE } = require('../cli');

describe('claude-mantra CLI', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    // Create isolated temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('initCommand', () => {
    it('creates .claude directory structure', () => {
      initCommand([]);

      expect(fs.existsSync(path.join(tmpDir, '.claude'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'context'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'hooks'))).toBe(true);
    });

    it('copies context yml files', () => {
      initCommand([]);

      const contextDir = path.join(tmpDir, '.claude', 'context');
      expect(fs.existsSync(path.join(contextDir, 'project.yml'))).toBe(true);
      expect(fs.existsSync(path.join(contextDir, 'behavior.yml'))).toBe(true);
      expect(fs.existsSync(path.join(contextDir, 'git.yml'))).toBe(true);
      expect(fs.existsSync(path.join(contextDir, 'testing.yml'))).toBe(true);
    });

    it('copies context md files (companion files)', () => {
      initCommand([]);

      const contextDir = path.join(tmpDir, '.claude', 'context');
      expect(fs.existsSync(path.join(contextDir, 'project.md'))).toBe(true);
      expect(fs.existsSync(path.join(contextDir, 'behavior.md'))).toBe(true);
      expect(fs.existsSync(path.join(contextDir, 'git.md'))).toBe(true);
      expect(fs.existsSync(path.join(contextDir, 'testing.md'))).toBe(true);
    });

    it('copies hook file with executable permissions', () => {
      initCommand([]);

      const hookPath = path.join(tmpDir, '.claude', 'hooks', 'context-refresh.js');
      expect(fs.existsSync(hookPath)).toBe(true);

      const stats = fs.statSync(hookPath);
      expect(stats.mode & 0o111).toBeTruthy(); // Check executable bits
    });

    it('copies settings.json', () => {
      initCommand([]);

      const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(content.hooks).toBeDefined();
      expect(content.hooks.SessionStart).toBeDefined();
      expect(content.hooks.UserPromptSubmit).toBeDefined();
    });

    it('does not overwrite existing files without --force', () => {
      // First init
      initCommand([]);

      // Modify a file
      const projectYml = path.join(tmpDir, '.claude', 'context', 'project.yml');
      fs.writeFileSync(projectYml, 'custom: content');

      // Second init without --force
      initCommand([]);

      // File should not be overwritten
      const content = fs.readFileSync(projectYml, 'utf8');
      expect(content).toBe('custom: content');
    });

    it('overwrites existing files with --force', () => {
      // First init
      initCommand([]);

      // Modify a file
      const projectYml = path.join(tmpDir, '.claude', 'context', 'project.yml');
      fs.writeFileSync(projectYml, 'custom: content');

      // Second init with --force
      initCommand(['--force']);

      // File should be overwritten
      const content = fs.readFileSync(projectYml, 'utf8');
      expect(content).not.toBe('custom: content');
      expect(content).toContain('Project Context');
    });

    it('yml files reference their companion md files', () => {
      initCommand([]);

      const contextDir = path.join(tmpDir, '.claude', 'context');

      const behaviorYml = fs.readFileSync(path.join(contextDir, 'behavior.yml'), 'utf8');
      expect(behaviorYml).toContain('behavior.md');

      const gitYml = fs.readFileSync(path.join(contextDir, 'git.yml'), 'utf8');
      expect(gitYml).toContain('git.md');

      const testingYml = fs.readFileSync(path.join(contextDir, 'testing.yml'), 'utf8');
      expect(testingYml).toContain('testing.md');

      const projectYml = fs.readFileSync(path.join(contextDir, 'project.yml'), 'utf8');
      expect(projectYml).toContain('project.md');
    });
  });

  describe('helpCommand', () => {
    it('runs without error', () => {
      expect(() => helpCommand()).not.toThrow();
    });

    it('outputs usage information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      helpCommand();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('claude-mantra');
      expect(output).toContain('init');
      expect(output).toContain('--force');

      consoleSpy.mockRestore();
    });
  });

  describe('source files exist', () => {
    it('has example context files', () => {
      expect(fs.existsSync(EXAMPLES_DIR)).toBe(true);
      expect(fs.existsSync(path.join(EXAMPLES_DIR, 'project.yml'))).toBe(true);
      expect(fs.existsSync(path.join(EXAMPLES_DIR, 'project.md'))).toBe(true);
    });

    it('has hook file', () => {
      expect(fs.existsSync(path.join(HOOKS_DIR, 'context-refresh.js'))).toBe(true);
    });

    it('has settings file', () => {
      expect(fs.existsSync(SETTINGS_FILE)).toBe(true);
    });
  });
});
