const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const {
  processPreToolUse,
  processHook,
  sessionExists,
  ensureBranchMeta,
  isAllowedPath,
  isFeatureBranch,
  getGitRoot,
  parseCliInput,
  ALLOWED_PATHS
} = require('../verify-session.js');

describe('verify-session.js', () => {
  describe('isFeatureBranch', () => {
    it('returns false for main branch', () => {
      expect(isFeatureBranch('main')).toBe(false);
    });

    it('returns false for master branch', () => {
      expect(isFeatureBranch('master')).toBe(false);
    });

    it('returns false for HEAD (detached)', () => {
      expect(isFeatureBranch('HEAD')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isFeatureBranch(null)).toBe(false);
    });

    it('returns true for feature branches', () => {
      expect(isFeatureBranch('feature/add-auth')).toBe(true);
      expect(isFeatureBranch('issue/fix-123/bug')).toBe(true);
      expect(isFeatureBranch('chore/update-deps')).toBe(true);
    });
  });

  describe('isAllowedPath', () => {
    const cwd = '/project';

    it('allows session files', () => {
      expect(isAllowedPath('/project/.claude/sessions/123-auth.md', cwd)).toBe(true);
    });

    it('allows branch metadata files', () => {
      expect(isAllowedPath('/project/.claude/branches/feature-auth', cwd)).toBe(true);
    });

    it('allows context files', () => {
      expect(isAllowedPath('/project/.claude/context/project.yml', cwd)).toBe(true);
    });

    it('allows CLAUDE.md', () => {
      expect(isAllowedPath('/project/CLAUDE.md', cwd)).toBe(true);
    });

    it('allows package.json', () => {
      expect(isAllowedPath('/project/package.json', cwd)).toBe(true);
    });

    it('allows README.md', () => {
      expect(isAllowedPath('/project/README.md', cwd)).toBe(true);
    });

    it('blocks source files', () => {
      expect(isAllowedPath('/project/src/index.js', cwd)).toBe(false);
      expect(isAllowedPath('/project/tools/session.js', cwd)).toBe(false);
    });

    it('blocks test files', () => {
      expect(isAllowedPath('/project/tests/unit.test.js', cwd)).toBe(false);
    });

    it('allows README.md in subdirectories', () => {
      expect(isAllowedPath('/project/docs/README.md', cwd)).toBe(true);
    });

    it('allows package.json in subdirectories', () => {
      expect(isAllowedPath('/project/packages/core/package.json', cwd)).toBe(true);
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

      expect(sessionExists(tempDir, branchInfo)).toBe(false);
    });

    it('returns true when session file exists via metadata', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file
      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');

      // Create branch metadata pointing to session
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-auth'),
        'session: 123-auth.md\nstatus: in-progress'
      );

      const branchInfo = {
        branchMetaFile: 'issue-feature-123-auth',
        sessionFile: '123-auth.md'
      };

      expect(sessionExists(tempDir, branchInfo)).toBe(true);
    });

    it('returns true when session file exists via fallback path', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      // Create session file (no metadata)
      fs.writeFileSync(path.join(sessionsDir, 'feature-test.md'), '# Session');

      const branchInfo = {
        branchMetaFile: 'feature-test',
        sessionFile: 'feature-test.md'
      };

      expect(sessionExists(tempDir, branchInfo)).toBe(true);
    });

    it('creates branch metadata when session exists but metadata does not', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file without metadata
      fs.writeFileSync(path.join(sessionsDir, 'feature-new.md'), '# Session');

      const branchInfo = {
        branchMetaFile: 'feature-new',
        sessionFile: 'feature-new.md'
      };

      // Call sessionExists which should create metadata
      expect(sessionExists(tempDir, branchInfo)).toBe(true);

      // Check metadata was created
      const metaPath = path.join(branchesDir, 'feature-new');
      expect(fs.existsSync(metaPath)).toBe(true);
      const content = fs.readFileSync(metaPath, 'utf-8');
      expect(content).toContain('session: feature-new.md');
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

      // Pre-create metadata
      const metaPath = path.join(branchesDir, 'feature-existing');
      fs.writeFileSync(metaPath, 'session: existing.md\nstatus: complete');

      const branchInfo = {
        branchMetaFile: 'feature-existing',
        sessionFile: 'feature-existing.md'
      };

      ensureBranchMeta(tempDir, branchInfo);

      // Verify original content unchanged
      const content = fs.readFileSync(metaPath, 'utf-8');
      expect(content).toContain('status: complete');
    });

    it('creates branches directory if needed', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      // Note: not creating branches dir

      const branchInfo = {
        branchMetaFile: 'feature-new',
        sessionFile: 'feature-new.md'
      };

      ensureBranchMeta(tempDir, branchInfo);

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

      ensureBranchMeta(tempDir, branchInfo);

      const metaPath = path.join(branchesDir, 'issue-feature-42-auth');
      const content = fs.readFileSync(metaPath, 'utf-8');
      expect(content).toContain('session: 42-auth.md');
      expect(content).toContain('status: in-progress');
    });
  });

  describe('processHook', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-hook-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('routes PreToolUse to processPreToolUse', () => {
      const result = processHook({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: {}
      });
      expect(result.decision).toBe('approve');
    });

    it('approves unknown event types', () => {
      const result = processHook({
        cwd: tempDir,
        hook_event_name: 'UnknownEvent'
      });
      expect(result.decision).toBe('approve');
    });
  });

  describe('processPreToolUse', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-pretool-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('approves non-Edit/Write tools', () => {
      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: { file_path: '/project/src/index.js' }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves when no file_path in tool_input', () => {
      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {}
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit when no .claude directory exists', () => {
      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit when editing allowed paths', () => {
      // Set up .claude directory
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, '.claude/sessions/test.md') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit on main branch without session', () => {
      // Set up .claude directory
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on main
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit on feature branch with session', () => {
      // Set up .claude directory with session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create session file
      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');

      // Create branch metadata
      fs.writeFileSync(
        path.join(branchesDir, 'issue-feature-123-auth'),
        'session: 123-auth.md\nstatus: in-progress'
      );

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b issue/feature-123/auth', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.decision).toBe('approve');
    });

    it('approves Edit on feature branch when memento not initialized', () => {
      // Do NOT create .claude directory - memento not initialized
      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/new-feature', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      // Should approve because memento isn't initialized (no .claude dir)
      expect(result.decision).toBe('approve');
    });

    it('blocks Edit on feature branch without session', () => {
      // Set up .claude directory (no session)
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/new-feature', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
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
      // Set up .claude directory (no session)
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/new-feature', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { file_path: path.join(tempDir, 'src/new-file.js') }
      });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Session Required');
    });

    it('includes helpful instructions in block message', () => {
      // Set up .claude directory (no session)
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

      // Initialize git on feature branch
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git checkout -b feature/test', { cwd: tempDir, stdio: 'pipe' });

      const result = processPreToolUse({
        cwd: tempDir,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result.reason).toContain('/session');
      expect(result.reason).toContain('work context is preserved');
    });
  });
});

describe('getGitRoot', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-gitroot-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns git root from subdirectory', () => {
    // Initialize git at tempDir
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

    // Create subdirectory
    const subDir = path.join(tempDir, 'packages', 'core');
    fs.mkdirSync(subDir, { recursive: true });

    // Get git root from subdirectory
    const gitRoot = getGitRoot(subDir);

    expect(fs.realpathSync(gitRoot)).toBe(fs.realpathSync(tempDir));
  });

  it('returns null when not in a git repo', () => {
    const gitRoot = getGitRoot(tempDir);
    expect(gitRoot).toBe(null);
  });
});

describe('processPreToolUse with subdirectories', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-subdir-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('finds session at git root when cwd is subdirectory', () => {
    // Set up .claude directory with session at root
    const claudeDir = path.join(tempDir, '.claude');
    const sessionsDir = path.join(claudeDir, 'sessions');
    const branchesDir = path.join(claudeDir, 'branches');
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.mkdirSync(branchesDir, { recursive: true });

    // Create session file
    fs.writeFileSync(path.join(sessionsDir, 'chore-update-deps.md'), '# Session');

    // Create branch metadata
    fs.writeFileSync(
      path.join(branchesDir, 'chore-update-deps'),
      'session: chore-update-deps.md\nstatus: in-progress'
    );

    // Create subdirectory (simulating monorepo package)
    const subDir = path.join(tempDir, 'packages', 'core');
    fs.mkdirSync(subDir, { recursive: true });

    // Initialize git on feature branch
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
    execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git checkout -b chore/update-deps', { cwd: tempDir, stdio: 'pipe' });

    // Call from subdirectory - should find session at git root
    const result = processPreToolUse({
      cwd: subDir,  // subdirectory, not git root
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: path.join(subDir, 'src/index.js') }
    });

    expect(result.decision).toBe('approve');
  });

  it('blocks when no session exists even from subdirectory', () => {
    // Set up .claude directory at root (no session)
    fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });

    // Create subdirectory
    const subDir = path.join(tempDir, 'packages', 'core');
    fs.mkdirSync(subDir, { recursive: true });

    // Initialize git on feature branch
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
    execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git checkout -b feature/new-feature', { cwd: tempDir, stdio: 'pipe' });

    // Call from subdirectory - should still block (no session at git root)
    const result = processPreToolUse({
      cwd: subDir,
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: path.join(subDir, 'src/index.js') }
    });

    expect(result.decision).toBe('block');
    expect(result.reason).toContain('Session Required');
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
