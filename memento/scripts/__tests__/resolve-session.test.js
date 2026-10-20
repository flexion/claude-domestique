const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const paths = require('../../lib/paths');

const SCRIPT = path.join(__dirname, '..', 'resolve-session.js');

// Every case runs the real script as a child process against a real git repo,
// with HOME pointed at an empty directory so any write to per-user state shows up.
describe('resolve-session.js', () => {
  let tmp;
  let home;

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'memento-resolve-')));
    home = path.join(tmp, 'home');
    fs.mkdirSync(home);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function git(repo, args) {
    // Per-command config keeps fixture commits deterministic: no inherited signing
    // (which needs an agent socket) and no global config mutation.
    return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  }

  function makeRepo(branch = 'issue/feature-42/auth', { commit = true } = {}) {
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    git(repo, ['init', '-q']);
    git(repo, ['checkout', '-q', '-b', branch]);
    if (commit) git(repo, ['commit', '-q', '--allow-empty', '-m', 'init']);
    return repo;
  }

  function write(repo, rel, content) {
    const full = path.join(repo, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  function listTree(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      out.push(path.relative(tmp, full));
      if (entry.isDirectory()) out.push(...listTree(full));
    }
    return out.sort();
  }

  function run(args, cwd) {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd, encoding: 'utf8', env: { ...process.env, HOME: home }
    });
    return { status: r.status, json: JSON.parse(r.stdout), stdout: r.stdout, stderr: r.stderr };
  }

  it('resolves the default location without creating anything', () => {
    const repo = makeRepo();
    const before = listTree(tmp);

    const r = run([], repo);

    expect(r.status).toBe(0);
    expect(r.stdout.trim().split('\n')).toHaveLength(1);
    expect(r.json).toEqual({
      ok: true,
      gitRoot: repo,
      branch: 'issue/feature-42/auth',
      sanitizedBranch: 'issue-feature-42-auth',
      sessionPath: path.join(repo, '.memento', 'sessions', 'issue-feature-42-auth.md'),
      sessionExists: false,
      legacy: false,
      configuredPath: path.join(repo, '.memento', 'sessions', 'issue-feature-42-auth.md'),
      branchMetadataPath: path.join(repo, '.memento', 'branches', 'issue-feature-42-auth'),
      sessionsDir: path.join(repo, '.memento', 'sessions'),
      branchesDir: path.join(repo, '.memento', 'branches'),
      configFile: path.join(repo, '.memento', 'config.json'),
      migrationCommand: null,
      warnings: []
    });
    expect(listTree(tmp)).toEqual(before);
    expect(fs.readdirSync(home)).toEqual([]);
  });

  it('uses a configured sessionsDir and reports an existing session', () => {
    const repo = makeRepo();
    write(repo, '.memento/config.json', JSON.stringify({ sessionsDir: 'work/sessions' }));
    const session = write(repo, 'work/sessions/issue-feature-42-auth.md', '# s\n');

    const r = run([], repo);

    expect(r.status).toBe(0);
    expect(r.json.sessionPath).toBe(session);
    expect(r.json.sessionExists).toBe(true);
    expect(r.json.warnings).toEqual([]);
  });

  it('falls back to the default and reports a warning for invalid config', () => {
    const repo = makeRepo();
    write(repo, '.memento/config.json', JSON.stringify({ sessionsDir: '/abs' }));

    const r = run([], repo);

    expect(r.status).toBe(0);
    expect(r.json.sessionsDir).toBe(path.join(repo, '.memento', 'sessions'));
    expect(r.json.warnings).toEqual([
      'sessionsDir in .memento/config.json must be relative to the git root; using .memento/sessions'
    ]);
  });

  it('reports a legacy session with the shared migration command and moves nothing', () => {
    const repo = makeRepo();
    const legacy = write(repo, '.claude/sessions/issue-feature-42-auth.md', '# notes\n');
    const before = listTree(tmp);

    const r = run([], repo);

    expect(r.status).toBe(0);
    expect(r.json.legacy).toBe(true);
    expect(r.json.sessionPath).toBe(legacy);
    expect(r.json.sessionExists).toBe(true);
    expect(r.json.migrationCommand).toBe(
      paths.migrationCommand(repo, paths.resolveSession(repo, 'issue/feature-42/auth'))
    );
    expect(r.json.migrationCommand).toContain(` mv -- '.claude/sessions/issue-feature-42-auth.md' `);
    expect(listTree(tmp)).toEqual(before);
  });

  it('resolves a branch that has no commits yet', () => {
    const repo = makeRepo('chore/new', { commit: false });

    const r = run([], repo);

    expect(r.status).toBe(0);
    expect(r.json.branch).toBe('chore/new');
    expect(r.json.sessionPath).toBe(path.join(repo, '.memento', 'sessions', 'chore-new.md'));
  });

  it('resolves from a nested directory and via --cwd', () => {
    const repo = makeRepo();
    const nested = path.join(repo, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    expect(run([], nested).json.gitRoot).toBe(repo);
    expect(run(['--cwd', nested], tmp).json.gitRoot).toBe(repo);
  });

  it('exits 1 with no-branch on a detached HEAD', () => {
    const repo = makeRepo();
    git(repo, ['checkout', '-q', '--detach']);

    const r = run([], repo);

    expect(r.status).toBe(1);
    expect(r.json).toEqual({ ok: false, reason: 'no-branch', warnings: [] });
  });

  it('exits 1 with not-a-git-repo outside a repository', () => {
    const plain = path.join(tmp, 'plain');
    fs.mkdirSync(plain);

    const r = run([], plain);

    expect(r.status).toBe(1);
    expect(r.json).toEqual({ ok: false, reason: 'not-a-git-repo', warnings: [] });
  });

  it.each([
    [['--bogus']],
    [['--cwd']],
    [['extra']]
  ])('exits 2 with a usage error for %j', args => {
    const r = run(args, tmp);

    expect(r.status).toBe(2);
    expect(r.json.ok).toBe(false);
    expect(r.json.reason).toBe('usage');
    expect(typeof r.json.message).toBe('string');
  });
});
