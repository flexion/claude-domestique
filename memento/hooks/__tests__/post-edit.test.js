const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const {
  getGitRoot,
  getCurrentBranch,
  findSessionFile,
  shouldTrackFile,
  updateFilesChanged,
  processPostToolUse,
  processHook,
} = require('../post-edit.js');

describe('post-edit.js', () => {
  describe('shouldTrackFile', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-shouldtrack-test-'));
      // Create test directories and files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'lib'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.claude', 'sessions'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.claude', 'branches'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src', 'index.js'), '');
      fs.writeFileSync(path.join(tempDir, 'lib', 'utils.js'), '');
      fs.writeFileSync(path.join(tempDir, 'tests', 'unit.test.js'), '');
      fs.writeFileSync(path.join(tempDir, '.claude', 'sessions', 'test.md'), '');
      fs.writeFileSync(path.join(tempDir, '.claude', 'branches', 'feature-x'), '');
      fs.writeFileSync(path.join(tempDir, '.claude', 'config.json'), '{}');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns true for source files', () => {
      expect(shouldTrackFile(path.join(tempDir, 'src/index.js'), tempDir)).toBe(true);
      expect(shouldTrackFile(path.join(tempDir, 'lib/utils.js'), tempDir)).toBe(true);
    });

    it('returns true for test files', () => {
      expect(shouldTrackFile(path.join(tempDir, 'tests/unit.test.js'), tempDir)).toBe(true);
    });

    it('returns false for .claude internal files', () => {
      expect(shouldTrackFile(path.join(tempDir, '.claude/sessions/test.md'), tempDir)).toBe(false);
      expect(shouldTrackFile(path.join(tempDir, '.claude/branches/feature-x'), tempDir)).toBe(false);
      expect(shouldTrackFile(path.join(tempDir, '.claude/config.json'), tempDir)).toBe(false);
    });
  });

  describe('updateFilesChanged', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-post-edit-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('adds file to existing Files Changed section', () => {
      const sessionPath = path.join(tempDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Files Changed
- existing-file.js

## Next Steps
- [ ] Do something
`);

      const result = updateFilesChanged(sessionPath, 'src/new-file.js');
      expect(result).toBe(true);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).toContain('- existing-file.js');
      expect(content).toContain('- src/new-file.js');
    });

    it('does not duplicate existing file entries', () => {
      const sessionPath = path.join(tempDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Files Changed
- src/index.js

## Next Steps
- [ ] Do something
`);

      const result = updateFilesChanged(sessionPath, 'src/index.js');
      expect(result).toBe(false);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      const matches = content.match(/- src\/index\.js/g);
      expect(matches.length).toBe(1);
    });

    it('replaces placeholder text with first file', () => {
      const sessionPath = path.join(tempDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Files Changed
- [List modified files]

## Next Steps
- [ ] Do something
`);

      const result = updateFilesChanged(sessionPath, 'src/new-file.js');
      expect(result).toBe(true);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).not.toContain('[List modified files]');
      expect(content).toContain('- src/new-file.js');
    });

    it('replaces "None yet" placeholder', () => {
      const sessionPath = path.join(tempDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Files Changed
- None yet

## Next Steps
- [ ] Do something
`);

      const result = updateFilesChanged(sessionPath, 'src/new-file.js');
      expect(result).toBe(true);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).not.toContain('None yet');
      expect(content).toContain('- src/new-file.js');
    });

    it('creates Files Changed section if missing', () => {
      const sessionPath = path.join(tempDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Learnings
- Some learning

## Next Steps
- [ ] Do something
`);

      const result = updateFilesChanged(sessionPath, 'src/new-file.js');
      expect(result).toBe(true);

      const content = fs.readFileSync(sessionPath, 'utf-8');
      expect(content).toContain('## Files Changed');
      expect(content).toContain('- src/new-file.js');
      // Files Changed should appear before Next Steps
      const filesChangedIndex = content.indexOf('## Files Changed');
      const nextStepsIndex = content.indexOf('## Next Steps');
      expect(filesChangedIndex).toBeLessThan(nextStepsIndex);
    });

    it('handles file with description already listed', () => {
      const sessionPath = path.join(tempDir, 'session.md');
      fs.writeFileSync(sessionPath, `# Session

## Files Changed
- README.md (added AI-Managed Files section)

## Next Steps
- [ ] Do something
`);

      const result = updateFilesChanged(sessionPath, 'README.md');
      expect(result).toBe(false);
    });
  });

  describe('findSessionFile', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-find-session-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('finds session via branch metadata', () => {
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

      const sessionPath = findSessionFile(tempDir, 'issue/feature-123/auth');
      expect(sessionPath).toBeTruthy();
      expect(sessionPath.endsWith('123-auth.md')).toBe(true);
    });

    it('finds session via fallback path', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), '# Session');

      const sessionPath = findSessionFile(tempDir, 'issue/feature-123/auth');
      expect(sessionPath).toBeTruthy();
      expect(sessionPath.endsWith('123-auth.md')).toBe(true);
    });

    it('returns null when session does not exist', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(path.join(claudeDir, 'sessions'), { recursive: true });

      const sessionPath = findSessionFile(tempDir, 'issue/feature-999/missing');
      expect(sessionPath).toBe(null);
    });
  });

  describe('processPostToolUse', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-posttool-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('ignores non-Edit/Write tools', () => {
      const result = processPostToolUse({
        cwd: tempDir,
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
        tool_input: { file_path: '/project/src/index.js' }
      });

      expect(result).toEqual({});
    });

    it('ignores .claude internal files', () => {
      // Set up .claude directory with session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), `# Session

## Files Changed
- None yet
`);
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

      const result = processPostToolUse({
        cwd: tempDir,
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, '.claude/sessions/123-auth.md') }
      });

      // Should not update because it's a .claude file
      expect(result).toEqual({});
    });

    it('does nothing on main branch', () => {
      // Initialize git on main
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
      execSync('git add .gitkeep', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });

      const result = processPostToolUse({
        cwd: tempDir,
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      expect(result).toEqual({});
    });

    it('handles missing session gracefully', () => {
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

      const result = processPostToolUse({
        cwd: tempDir,
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/index.js') }
      });

      // Should not throw, just return empty
      expect(result).toEqual({});
    });

    it('updates session file on Edit', () => {
      // Set up .claude directory with session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create the source file that will be "edited"
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'auth.js'), '// auth code');

      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), `# Session

## Files Changed
- None yet

## Next Steps
- [ ] Implement auth
`);
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

      const result = processPostToolUse({
        cwd: tempDir,
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tempDir, 'src/auth.js') }
      });

      // Check that it returned context
      expect(result.hookSpecificOutput).toBeTruthy();
      expect(result.hookSpecificOutput.additionalContext).toContain('src/auth.js');

      // Check that session file was updated
      const sessionContent = fs.readFileSync(path.join(sessionsDir, '123-auth.md'), 'utf-8');
      expect(sessionContent).toContain('- src/auth.js');
      expect(sessionContent).not.toContain('None yet');
    });

    it('updates session file on Write', () => {
      // Set up .claude directory with session
      const claudeDir = path.join(tempDir, '.claude');
      const sessionsDir = path.join(claudeDir, 'sessions');
      const branchesDir = path.join(claudeDir, 'branches');
      fs.mkdirSync(sessionsDir, { recursive: true });
      fs.mkdirSync(branchesDir, { recursive: true });

      // Create the source file that will be "written"
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'new-file.js'), '// new file');

      fs.writeFileSync(path.join(sessionsDir, '123-auth.md'), `# Session

## Files Changed
- existing.js

## Next Steps
- [ ] Implement auth
`);
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

      const result = processPostToolUse({
        cwd: tempDir,
        hook_event_name: 'PostToolUse',
        tool_name: 'Write',
        tool_input: { file_path: path.join(tempDir, 'src/new-file.js') }
      });

      // Check that it returned context
      expect(result.hookSpecificOutput).toBeTruthy();

      // Check that session file was updated
      const sessionContent = fs.readFileSync(path.join(sessionsDir, '123-auth.md'), 'utf-8');
      expect(sessionContent).toContain('- existing.js');
      expect(sessionContent).toContain('- src/new-file.js');
    });
  });

  describe('processHook', () => {
    it('routes PostToolUse events correctly', () => {
      const result = processHook({
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
        cwd: '/tmp'
      });

      // Read tool should be ignored
      expect(result).toEqual({});
    });

    it('returns empty for unknown events', () => {
      const result = processHook({
        hook_event_name: 'UnknownEvent',
        cwd: '/tmp'
      });

      expect(result).toEqual({});
    });
  });
});
