const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Import the module to be tested AFTER mocking
const verifySession = require('../verify-session.js');

// Destructure for convenience (these are the actual implementations for pure function tests)
const {
  isAllowedPath,
  isFeatureBranch,
  parseCliInput,
  ALLOWED_PATHS
} = verifySession;

describe('verify-session.js', () => {
  describe('isFeatureBranch', () => {
    it.each([
      ['main', false],
      ['master', false],
      ['HEAD', false],
      [null, false],
      ['feature/add-auth', true],
      ['issue/fix-123/bug', true],
      ['chore/update-deps', true],
    ])('isFeatureBranch(%s) returns %s', (branch, expected) => {
      expect(isFeatureBranch(branch)).toBe(expected);
    });
  });

  describe('isAllowedPath', () => {
    const cwd = '/project';

    it.each([
      ['/project/.claude/sessions/123-auth.md', true, 'session files'],
      ['/project/.claude/branches/feature-auth', true, 'branch metadata files'],
      ['/project/.claude/context/project.yml', true, 'context files'],
      ['/project/CLAUDE.md', true, 'CLAUDE.md'],
      ['/project/package.json', true, 'package.json'],
      ['/project/README.md', true, 'README.md'],
      ['/project/.gitignore', true, '.gitignore'],
      ['/project/docs/README.md', true, 'README.md in subdirectories'],
      ['/project/packages/core/package.json', true, 'package.json in subdirectories'],
      ['/project/src/index.js', false, 'source files'],
      ['/project/tools/session.js', false, 'tool files'],
      ['/project/tests/unit.test.js', false, 'test files'],
      ['/project/CLAUDE.txt', false, 'similar but not allowed files'],
      ['/project/src/package.json.bak', false, 'backup files'],
    ])('isAllowedPath(%s) returns %s (%s)', (filePath, expected) => {
      expect(isAllowedPath(filePath, cwd)).toBe(expected);
    });

    it('handles .claude/config correctly', () => {
      expect(isAllowedPath('/project/.claude/config', cwd)).toBe(true);
      expect(isAllowedPath('/project/.claude/config.json', cwd)).toBe(false);
    });
  });

  describe('parseCliInput', () => {
    it('parses valid JSON input', () => {
      const input = JSON.stringify({ cwd: '/test', tool_name: 'Edit' });
      const result = parseCliInput(input);
      expect(result.cwd).toBe('/test');
      expect(result.tool_name).toBe('Edit');
    });

    it('returns default on invalid JSON', () => {
      const result = parseCliInput('not valid json');
      expect(result.hook_event_name).toBe('PreToolUse');
      expect(result.cwd).toBe(process.cwd());
    });

    it('returns default on empty string', () => {
      const result = parseCliInput('');
      expect(result.hook_event_name).toBe('PreToolUse');
    });

    it('uses custom default event', () => {
      const result = parseCliInput('invalid', 'CustomEvent');
      expect(result.hook_event_name).toBe('CustomEvent');
    });
  });

  describe('sessionExists', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-verify-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns false when no session file exists', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(path.join(claudeDir, 'sessions'), { recursive: true });

      const branchInfo = {
        branchMetaFile: 'feature-test',
        sessionFile: 'feature-test.md'
      };

      expect(verifySession.sessionExists(tempDir, branchInfo)).toBe(false);
    });

    it('returns true when session file exists via metadata', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-auth'),
        'session: 123-auth.md\nstatus: in-progress'
      );

      const branchInfo = {
        branchMetaFile: 'issue-feature-123-auth',
        sessionFile: '123-auth.md'
      };

      expect(verifySession.sessionExists(tempDir, branchInfo)).toBe(true);
    });

    it('returns true when session file exists via fallback path', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session');

      const branchInfo = {
        branchMetaFile: 'feature-test',
        sessionFile: 'feature-test.md'
      };

      expect(verifySession.sessionExists(tempDir, branchInfo)).toBe(true);
    });

    it('creates branch metadata when session exists but metadata does not', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, 'feature-new.md'), '# Session');

      const branchInfo = {
        branchMetaFile: 'feature-new',
        sessionFile: 'feature-new.md'
      };

      expect(verifySession.sessionExists(tempDir, branchInfo)).toBe(true);

      const metaPath = path.join(branchesDir, 'feature-new');
      expect(fs.existsSync(metaPath)).toBe(true);
      const content = fs.readFileSync(metaPath, 'utf-8');
      expect(content).toContain('session: feature-new.md');
    });

    it('handles metadata file with invalid format lines', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const branchesDir = path.join(claudeDir, 'branches');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.mkdirSync(sessionsDir, { recursive: true });

      fs.writeFileSync(
        path.join(branchesDir, 'feature-test'),
        'session: test.md\ninvalid line without colon\nstatus: in-progress\n# comment line'
      );
      fs.writeFileSync(path.join(sessionsDir, 'test.md'), '# Session');

      const branchInfo = {
        branchMetaFile: 'feature-test',
        sessionFile: 'test.md'
      };

      expect(verifySession.sessionExists(tempDir, branchInfo)).toBe(true);
    });

    it('handles metadata pointing to non-existent session file', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const branchesDir = path.join(claudeDir, 'branches');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(branchesDir, { recursive: true });
      fs.mkdirSync(sessionsDir, { recursive: true });

      fs.writeFileSync(
        path.join(branchesDir, 'feature-missing'),
        'session: missing.md\nstatus: in-progress'
      );

      const branchInfo = {
        branchMetaFile: 'feature-missing',
        sessionFile: 'feature-missing.md'
      };

      expect(verifySession.sessionExists(tempDir, branchInfo)).toBe(false);
    });
  });

  describe('ensureBranchMeta', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-meta-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('does nothing when metadata already exists', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(branchesDir, { recursive: true });

      const metaPath = path.join(branchesDir, 'feature-existing');
      fs.writeFileSync(metaPath, 'session: existing.md\nstatus: complete');

      const branchInfo = {
        branchMetaFile: 'feature-existing',
        sessionFile: 'feature-existing.md'
      };

      verifySession.ensureBranchMeta(tempDir, branchInfo);

      const content = fs.readFileSync(metaPath, 'utf-8');
      expect(content).toContain('status: complete');
    });

    it('creates branches directory if needed', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const branchInfo = {
        branchMetaFile: 'feature-new',
        sessionFile: 'feature-new.md'
      };

      verifySession.ensureBranchMeta(tempDir, branchInfo);

      const branchesDir = path.join(claudeDir, 'branches');
      expect(fs.existsSync(branchesDir)).toBe(true);
    });

    it('creates metadata with correct content', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(branchesDir, { recursive: true });

      const branchInfo = {
        branchMetaFile: 'issue-feature-42-auth',
        sessionFile: '42-auth.md'
      };

      verifySession.ensureBranchMeta(tempDir, branchInfo);

      const metaPath = path.join(branchesDir, 'issue-feature-42-auth');
      const content = fs.readFileSync(metaPath, 'utf-8');
      expect(content).toContain('session: 42-auth.md');
      expect(content).toContain('status: in-progress');
    });
  });

  describe('processHook', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('routes PreToolUse to processPreToolUse', () => {
      // Mock to simulate not in git repo (execSync throws)
      execSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const result = verifySession.processHook({
        cwd: '/mock/project',
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: {}
      });

      expect(result.decision).toBe('approve');
    });

    it('approves unknown event types', () => {
      const result = verifySession.processHook({
        cwd: '/mock/project',
        hook_event_name: 'UnknownEvent'
      });
      expect(result.decision).toBe('approve');
    });
  });

  describe('processPreToolUse', () => {
    let tempDir;

    beforeEach(() => {
      jest.clearAllMocks();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-pretool-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('approves non-Edit/Write tools', () => {
      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: { file_path: '/project/src/index.js' }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves when no file_path in tool_input', () => {
      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {}
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit when no .claude directory exists', () => {
      // Mock git commands - on feature branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feature/test';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit when editing allowed paths', () => {
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Mock to simulate being on main - doesn't need session
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'main';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, '.claude/sessions/test.md') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit on main branch without session', () => {
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Mock git commands - on main branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'main';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit on feature branch with session', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-auth'),
        'session: 123-auth.md\nstatus: in-progress'
      );

      // Mock git commands - on feature branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'issue/feature-123/auth';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit on feature branch when memento not initialized', () => {
      // No .claude directory

      // Mock git commands - on feature branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feature/new-feature';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('blocks Edit on feature branch without session', () => {
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Mock git commands - on feature branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feature/new-feature';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Session Required');
      expect(result.reason).toContain('feature/new-feature');
      expect(result.reason).toContain('create-session.js');
    });

    it('blocks Write on feature branch without session', () => {
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Mock git commands - on feature branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feature/new-feature';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { file_path: path.join(tempDir, 'src/new-file.js') }
      });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Session Required');
    });

    it('includes helpful instructions in block message', () => {
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Mock git commands - on feature branch
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feature/test';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.reason).toContain('/session');
      expect(result.reason).toContain('work context is preserved');
    });
  });

  describe('getGitRoot', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns null when not in a git repo', () => {
      // Mock execSync to throw (simulating not being in a git repo)
      execSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const gitRoot = verifySession.getGitRoot('/some/path');
      expect(gitRoot).toBe(null);
    });

    it('returns git root path when in repo', () => {
      // Mock execSync to return a path
      execSync.mockReturnValue('/mock/repo\n');

      const gitRoot = verifySession.getGitRoot('/mock/repo/packages/core');
      expect(gitRoot).toBe('/mock/repo');
    });
  });

  describe('processPreToolUse with subdirectories', () => {
    let tempDir;

    beforeEach(() => {
      jest.clearAllMocks();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-subdir-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('finds session at git root when cwd is subdirectory', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, 'chore-update-deps.md'), '# Session');
      fs.writeFileSync(
        path.join(branchesDir, 'chore-update-deps'),
        'session: chore-update-deps.md\nstatus: in-progress'
      );

      const subDir = path.join(tempDir, 'packages', 'core');
      fs.mkdirSync(subDir, { recursive: true });

      // Mock git commands
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'chore/update-deps';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: subDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(subDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('blocks when no session exists even from subdirectory', () => {
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      const subDir = path.join(tempDir, 'packages', 'core');
      fs.mkdirSync(subDir, { recursive: true });

      // Mock git commands
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'feature/new-feature';
        if (cmd.includes('rev-parse --show-toplevel')) return tempDir;
        return '';
      });

      const result = verifySession.processPreToolUse({
        cwd: subDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(subDir, 'src/index.js') }
      });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Session Required');
    });
  });
});
