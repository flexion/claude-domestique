const fs = require('fs');
const path = require('path');
const os = require('os');
const paths = require('../paths');

describe('memento paths', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-paths-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function writeConfig(value) {
    fs.mkdirSync(path.join(root, '.memento'), { recursive: true });
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    fs.writeFileSync(path.join(root, '.memento', 'config.json'), body);
  }

  function touch(rel, content = '# s\n') {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  describe('sanitizeBranch', () => {
    it('replaces every slash with a dash', () => {
      expect(paths.sanitizeBranch('issue/feature-42/auth')).toBe('issue-feature-42-auth');
    });
  });

  describe('resolveDirs', () => {
    it('defaults to .memento when there is no config file', () => {
      expect(paths.resolveDirs(root)).toEqual({
        sessionsDir: path.join(root, '.memento', 'sessions'),
        branchesDir: path.join(root, '.memento', 'branches'),
        warnings: []
      });
    });

    it('ignores unknown keys silently', () => {
      writeConfig({ somethingElse: true });
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, '.memento', 'sessions'));
      expect(dirs.warnings).toEqual([]);
    });

    it('does not read memento keys from .claude/config.json', () => {
      fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(root, '.claude', 'config.json'),
        JSON.stringify({ memento: { sessionsDir: 'work/sessions', branchesDir: 'work/b' } })
      );
      expect(paths.resolveDirs(root)).toEqual({
        sessionsDir: path.join(root, '.memento', 'sessions'),
        branchesDir: path.join(root, '.memento', 'branches'),
        warnings: []
      });
    });

    it('uses configured repo-relative directories', () => {
      writeConfig({ sessionsDir: 'work/sessions', branchesDir: 'work/sessions/.branches' });
      expect(paths.resolveDirs(root)).toEqual({
        sessionsDir: path.join(root, 'work', 'sessions'),
        branchesDir: path.join(root, 'work', 'sessions', '.branches'),
        warnings: []
      });
    });

    it('falls back per key when only one key is set', () => {
      writeConfig({ sessionsDir: 'notes' });
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, 'notes'));
      expect(dirs.branchesDir).toBe(path.join(root, '.memento', 'branches'));
    });

    it.each([
      ['absolute', '/etc/sessions'],
      ['escaping', '../outside'],
      ['escaping after normalising', 'work/../../outside'],
      ['the git root itself', '.'],
      ['empty', ''],
      ['whitespace', '   '],
      ['NUL-containing', 'work\u0000sessions'],
      ['non-string', 42]
    ])('rejects a %s sessionsDir and warns', (_label, value) => {
      writeConfig({ sessionsDir: value });
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, '.memento', 'sessions'));
      expect(dirs.warnings).toHaveLength(1);
      expect(dirs.warnings[0]).toContain('sessionsDir in .memento/config.json');
    });

    it('accepts a directory whose name starts with two dots', () => {
      writeConfig({ sessionsDir: '..notes' });
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, '..notes'));
      expect(dirs.warnings).toEqual([]);
    });

    it('rejects an invalid branchesDir independently', () => {
      writeConfig({ sessionsDir: 'notes', branchesDir: '/tmp/b' });
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, 'notes'));
      expect(dirs.branchesDir).toBe(path.join(root, '.memento', 'branches'));
      expect(dirs.warnings[0]).toContain('branchesDir in .memento/config.json');
    });

    it('falls back with one warning on malformed JSON', () => {
      writeConfig('{ not json');
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, '.memento', 'sessions'));
      expect(dirs.warnings).toHaveLength(1);
      expect(dirs.warnings[0]).toContain('.memento/config.json');
    });

    it.each([
      ['an array', '["work/sessions"]'],
      ['a string', '"work/sessions"'],
      ['null', 'null']
    ])('warns and falls back when the top level is %s', (_label, body) => {
      writeConfig(body);
      const dirs = paths.resolveDirs(root);
      expect(dirs.sessionsDir).toBe(path.join(root, '.memento', 'sessions'));
      expect(dirs.warnings).toHaveLength(1);
      expect(dirs.warnings[0]).toContain('.memento/config.json');
    });
  });

  describe('resolveSession', () => {
    const branch = 'issue/feature-42/auth';

    it('returns the configured path when no file exists anywhere', () => {
      const s = paths.resolveSession(root, branch);
      expect(s.sessionPath).toBe(path.join(root, '.memento', 'sessions', 'issue-feature-42-auth.md'));
      expect(s.configuredPath).toBe(s.sessionPath);
      expect(s.legacy).toBe(false);
      expect(s.branchMetadataPath).toBe(path.join(root, '.memento', 'branches', 'issue-feature-42-auth'));
    });

    it('falls back to the legacy file when only it exists', () => {
      const legacy = touch('.claude/sessions/issue-feature-42-auth.md');
      const s = paths.resolveSession(root, branch);
      expect(s.sessionPath).toBe(legacy);
      expect(s.legacyPath).toBe(legacy);
      expect(s.legacy).toBe(true);
      expect(s.configuredPath).toBe(path.join(root, '.memento', 'sessions', 'issue-feature-42-auth.md'));
    });

    it('prefers the configured file when both exist', () => {
      touch('.claude/sessions/issue-feature-42-auth.md');
      const current = touch('.memento/sessions/issue-feature-42-auth.md');
      const s = paths.resolveSession(root, branch);
      expect(s.sessionPath).toBe(current);
      expect(s.legacy).toBe(false);
    });

    it('has no legacy flag when the configured dir is the legacy dir', () => {
      writeConfig({ sessionsDir: '.claude/sessions' });
      const file = touch('.claude/sessions/issue-feature-42-auth.md');
      const s = paths.resolveSession(root, branch);
      expect(s.sessionPath).toBe(file);
      expect(s.legacy).toBe(false);
    });

    it('carries config warnings through', () => {
      writeConfig({ sessionsDir: '/abs' });
      expect(paths.resolveSession(root, branch).warnings).toHaveLength(1);
    });
  });

  describe('shellQuote', () => {
    it('single-quotes a plain path', () => {
      expect(paths.shellQuote('.memento/sessions/a.md')).toBe("'.memento/sessions/a.md'");
    });

    it('leaves $, backticks, double quotes, and spaces inert', () => {
      expect(paths.shellQuote('w $(rm -rf x) `id` "q".md')).toBe("'w $(rm -rf x) `id` \"q\".md'");
    });

    it('escapes embedded single quotes', () => {
      expect(paths.shellQuote("it's.md")).toBe("'it'\\''s.md'");
    });

    it('round-trips through a real shell unchanged', () => {
      const { execFileSync } = require('child_process');
      const nasty = "a b $(echo pwned) `echo pwned` \"d\" 'e' ;f|g&h.md";
      const out = execFileSync('/bin/sh', ['-c', `printf %s ${paths.shellQuote(nasty)}`], { encoding: 'utf8' });
      expect(out).toBe(nasty);
    });
  });

  describe('migrationCommand', () => {
    it('is null when the session is not legacy', () => {
      expect(paths.migrationCommand(root, paths.resolveSession(root, 'a/b'))).toBe(null);
    });

    it('is root-anchored and single-quoted for a legacy session', () => {
      touch('.claude/sessions/a-b.md');
      const command = paths.migrationCommand(root, paths.resolveSession(root, 'a/b'));
      expect(command).toBe(
        `mkdir -p -- '${path.join(root, '.memento', 'sessions')}'`
        + ` && git -C '${root}' mv -- '.claude/sessions/a-b.md' '.memento/sessions/a-b.md'`
      );
    });
  });

  describe('sessionSearchDirs', () => {
    it('lists configured dir first, then legacy', () => {
      const configured = path.join(root, '.memento', 'sessions');
      expect(paths.sessionSearchDirs(root, configured)).toEqual([
        configured,
        path.join(root, '.claude', 'sessions')
      ]);
    });

    it('deduplicates when configured dir is the legacy dir', () => {
      const legacy = path.join(root, '.claude', 'sessions');
      expect(paths.sessionSearchDirs(root, legacy)).toEqual([legacy]);
    });
  });
});
