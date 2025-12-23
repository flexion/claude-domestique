const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const { initCommand, helpCommand, RULES_DIR } = require('../cli');

describe('mantra CLI', () => {
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
    it('creates .claude/rules directory structure', () => {
      initCommand([]);

      expect(fs.existsSync(path.join(tmpDir, '.claude'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'rules'))).toBe(true);
    });

    it('copies rule files from plugin rules directory', () => {
      initCommand([]);

      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      expect(fs.existsSync(path.join(rulesDir, 'behavior.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'test.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'format-guide.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'context-format.md'))).toBe(true);
    });

    it('rule files have frontmatter format', () => {
      initCommand([]);

      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      const behaviorContent = fs.readFileSync(path.join(rulesDir, 'behavior.md'), 'utf8');

      // Should start with frontmatter delimiter
      expect(behaviorContent.startsWith('---')).toBe(true);
      // Should end with frontmatter delimiter (frontmatter-only)
      expect(behaviorContent.trim().endsWith('---')).toBe(true);
      // Should have companion reference
      expect(behaviorContent).toContain('companion:');
    });

    it('does not overwrite existing files without --force', () => {
      // First init
      initCommand([]);

      // Modify a file
      const behaviorMd = path.join(tmpDir, '.claude', 'rules', 'behavior.md');
      fs.writeFileSync(behaviorMd, 'custom: content');

      // Second init without --force
      initCommand([]);

      // File should not be overwritten
      const content = fs.readFileSync(behaviorMd, 'utf8');
      expect(content).toBe('custom: content');
    });

    it('overwrites existing files with --force', () => {
      // First init
      initCommand([]);

      // Modify a file
      const behaviorMd = path.join(tmpDir, '.claude', 'rules', 'behavior.md');
      fs.writeFileSync(behaviorMd, 'custom: content');

      // Second init with --force
      initCommand(['--force']);

      // File should be overwritten
      const content = fs.readFileSync(behaviorMd, 'utf8');
      expect(content).not.toBe('custom: content');
      expect(content).toContain('companion:');
    });

    it('detects legacy .claude/context directory and warns', () => {
      // Create legacy structure
      const contextDir = path.join(tmpDir, '.claude', 'context');
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(contextDir, 'old.yml'), 'old: stuff');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      initCommand([]);

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('legacy');

      consoleSpy.mockRestore();
    });

    it('detects old hooks in settings.json and warns', () => {
      // Create old settings with hook
      const settingsDir = path.join(tmpDir, '.claude');
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(
        path.join(settingsDir, 'settings.json'),
        JSON.stringify({
          hooks: {
            SessionStart: [{ command: 'context-refresh.js' }]
          }
        })
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      initCommand([]);

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('hook');

      consoleSpy.mockRestore();
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
      expect(output).toContain('mantra');
      expect(output).toContain('init');
      expect(output).toContain('--force');

      consoleSpy.mockRestore();
    });
  });

  describe('source files exist', () => {
    it('has rules directory with md files', () => {
      expect(fs.existsSync(RULES_DIR)).toBe(true);

      const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));
      expect(ruleFiles.length).toBeGreaterThan(0);
    });

    it('rule files contain valid frontmatter', () => {
      const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));

      for (const file of ruleFiles) {
        const content = fs.readFileSync(path.join(RULES_DIR, file), 'utf8');
        expect(content.startsWith('---')).toBe(true);
        expect(content.trim().endsWith('---')).toBe(true);
      }
    });
  });

  describe('error paths', () => {
    it('exits when rules source directory does not exist', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        initCommand([], { rulesSourceDir: '/nonexistent/path' });
      }).toThrow('process.exit called');

      expect(errorSpy).toHaveBeenCalledWith(
        'ERROR: Rules directory not found at:',
        '/nonexistent/path'
      );

      mockExit.mockRestore();
      errorSpy.mockRestore();
    });

    it('warns when rules directory has no md files', () => {
      // Create an empty source directory
      const emptySourceDir = path.join(tmpDir, 'empty-source');
      fs.mkdirSync(emptySourceDir, { recursive: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      initCommand([], { rulesSourceDir: emptySourceDir });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('WARNING: No rule files found');

      consoleSpy.mockRestore();
    });
  });

  describe('helpCommand', () => {
    it('displays documentation URL', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      helpCommand();

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('https://github.com/flexion/claude-domestique');

      consoleSpy.mockRestore();
    });
  });

  describe('CLI main function', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');

    it('runs init command via CLI', () => {
      const result = execSync(`node "${cliPath}" init`, {
        encoding: 'utf8',
        cwd: tmpDir
      });

      expect(result).toContain('Initializing mantra');
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'rules'))).toBe(true);
    });

    it('runs help command via CLI', () => {
      const result = execSync(`node "${cliPath}" help`, {
        encoding: 'utf8',
        cwd: tmpDir
      });

      expect(result).toContain('mantra - Behavioral rules');
      expect(result).toContain('npx mantra');
    });

    it('defaults to help when no command given', () => {
      const result = execSync(`node "${cliPath}"`, {
        encoding: 'utf8',
        cwd: tmpDir
      });

      expect(result).toContain('mantra - Behavioral rules');
    });

    it('shows error for unknown command', () => {
      try {
        execSync(`node "${cliPath}" unknown`, {
          encoding: 'utf8',
          cwd: tmpDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        fail('Expected command to exit with error');
      } catch (e) {
        expect(e.stderr.toString()).toContain('Unknown command: unknown');
      }
    });
  });
});
