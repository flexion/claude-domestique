'use strict';

/**
 * The subject here is the linter's ORACLE, not its rules.
 *
 * The spine slice reuses the pre-split filename, so after the split is committed
 * `HEAD:<that path>` resolves to a 288-line slice document. Read as source it raises no
 * error — it reports every slice as broken, because every declared range overshoots. That
 * is a constant oracle: it has no discriminating power and its output looks exactly like a
 * finding. It happened once for real before these tests existed.
 *
 * So these assert the two properties that keep the oracle honest: it recovers the pre-split
 * source from history on its own, and it refuses an explicitly named revision that is a
 * split document rather than silently measuring against it.
 */

const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { main, HISTORICAL_SOURCE_PATH, isShallow, EXIT_UNVERIFIABLE } = require('../lint-slice-headers');

// Every assertion below about resolving the pre-split source is an assertion about history.
// A shallow clone does not have that history — CI checks out at fetch-depth 1 by default —
// so these are unassertable there rather than failing. Gated with `describe.skip` so the
// reason is printed by the runner instead of a green tick standing for a check that a
// truncated clone silently could not perform.
const withHistory = isShallow() ? describe.skip : describe;

// Imported rather than restated. A second copy of this string is a second thing to forget
// during a directory rename, and the failure mode is silent: the linter finds no pre-split
// revision, reports nothing, and the tests still pass against their own stale duplicate.
const SOURCE_PATH = HISTORICAL_SOURCE_PATH;

function run(argv = []) {
  const out = [];
  const log = console.log;
  const err = console.error;
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try {
    const code = main(argv);
    return { code, text: out.join('\n') };
  } finally {
    console.log = log;
    console.error = err;
  }
}

// What HEAD currently holds at the historical source path. Three states are reachable and the
// linter must refuse the last two rather than measure against them:
//
//   'presplit' — before the split; HEAD legitimately is the 1118-line source.
//   'spine'    — after the split; HEAD is the 288-line slice document reusing the filename.
//   'absent'   — after the extraction into `modus/`; HEAD has no file at this path at all.
//
// The extraction moved this from 'spine' to 'absent'. `git show` exits non-zero for 'absent',
// so probing without catching turns a state change into a test-suite error.
const headSourceState = () => {
  let text;
  try {
    text = execFileSync('git', ['show', `HEAD:${SOURCE_PATH}`], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (_) {
    return 'absent';
  }
  return /^---\n[\s\S]*?\nslice:\s/.test(text) ? 'spine' : 'presplit';
};

withHistory('pre-split source resolution', () => {
  test('recovers the pre-split source from history rather than trusting HEAD', () => {
    const { text } = run([]);
    expect(text).toMatch(/^source: [0-9a-f]{8}:/);
    // The pre-split document is 1118 lines. A trailing newline yields a phantom final
    // element; counting it reports 1119 and puts every range check one off.
    expect(text).toMatch(/\(1118 lines\)/);
  });

  test('does not resolve to a document carrying slice frontmatter', () => {
    const { text } = run([]);
    const rev = text.match(/^source: ([0-9a-f]{8}):/)[1];
    const resolved = execFileSync('git', ['show', `${rev}:${SOURCE_PATH}`], { encoding: 'utf8' });
    expect(resolved).not.toMatch(/^---\n[\s\S]*?\nslice:\s/);
    expect(resolved).toMatch(/^# Autonomous work item to Ready for Merge/m);
  });

  // SOURCE_PATH is a repo-root-relative pathspec and git resolves pathspecs against the
  // working directory, so an unpinned `git log -- <path>` finds nothing when the caller is
  // anywhere but the root — which `npm test --workspace modus` always is. The linter then
  // reports "cannot resolve a pre-split source", identical to genuine history loss. Assert
  // the resolution is a property of the repository, not of where the caller stood.
  test.each([
    ['the plugin directory', path.join(__dirname, '..', '..')],
    ['the scripts directory', path.join(__dirname, '..')],
    ['a directory outside the repository', os.tmpdir()],
  ])('resolves the source when run from %s', (_label, dir) => {
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      const { text } = run([]);
      expect(text).toMatch(/^source: [0-9a-f]{8}:/);
      expect(text).toMatch(/\(1118 lines\)/);
    } finally {
      process.chdir(cwd);
    }
  });
});

withHistory('explicit --source is checked, not obeyed', () => {
  test('rejects --source HEAD once HEAD no longer holds the pre-split source', () => {
    const state = headSourceState();
    if (state === 'presplit') {
      // Before the split lands, HEAD is legitimately the pre-split source and there is
      // nothing to reject. Skip rather than assert a condition history does not yet meet.
      return;
    }
    const { code, text } = run(['--source', 'HEAD']);
    expect(code).toBe(1);
    // The reason differs by state; the refusal does not. 'spine' is caught by the frontmatter
    // check, 'absent' by the path missing from HEAD entirely.
    expect(text).toMatch(state === 'spine' ? /post-split slice document/ : /cannot resolve/);
    // It must refuse rather than measure: no findings, no coverage line.
    expect(text).not.toMatch(/source lines claimed/);
  });

  test('rejects a revision that predates the file entirely', () => {
    const root = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' })
      .trim().split('\n')[0];
    const stderr = [];
    const realWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk, ...rest) => { stderr.push(String(chunk)); return true; };
    let code;
    try { ({ code } = run(['--source', root])); } finally { process.stderr.write = realWrite; }
    expect(code).toBe(1);
    // Probing a revision that lacks the file is expected control flow, so git's own
    // `fatal:` chatter must not reach the caller's stderr.
    expect(stderr.join('')).not.toMatch(/fatal:/);
  });
});

withHistory('finding classes', () => {
  test('exit code counts only E_ findings, so a W_ cannot gate', () => {
    const { code, text } = run([]);
    const errs = (text.match(/^E_/gm) || []).length;
    expect(code).toBe(errs);
    // W_CONTENT_NOT_FOUND is review data: declared rewording is legitimate provenance.
    expect(text).toMatch(/\d+ error\(s\), \d+ warning\(s\)/);
  });
});

// This one must NOT be gated on history: it is the assertion that the unverifiable case
// announces itself. Skipping the provenance checks on a shallow clone only stops them
// reporting a false finding; it does nothing to stop a truncated clone being mistaken for a
// clean one. Runs the real CLI inside a real `--depth 1` clone, because the whole point is
// what git does, and a mocked isShallow() would assert the mock.
describe('a shallow clone is reported as unverifiable, not as a finding', () => {
  const fs = require('fs');
  const cp = require('child_process');
  let dir;
  let clone;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'modus-shallow-'));
    clone = path.join(dir, 'c');
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8', cwd: __dirname,
    }).trim();
    // --no-local forces the real transport; a local clone hardlinks the object store and
    // ignores --depth, which would hand us a full history wearing a shallow clone's name.
    cp.execFileSync('git', ['clone', '--depth', '1', '--no-local', `file://${root}`, 'c'], {
      cwd: dir, stdio: ['ignore', 'pipe', 'pipe'],
    });
    // The clone has no node_modules and the script needs js-yaml.
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(clone, 'node_modules'));
    // Clone the *repository* for its shallow history, but test THIS working tree's script.
    // The clone carries whatever is committed, so without this the test measures the last
    // commit rather than the change under test, and fails or passes for the wrong reason.
    fs.copyFileSync(
      path.join(__dirname, '..', 'lint-slice-headers.js'),
      path.join(clone, 'modus', 'scripts', 'lint-slice-headers.js'),
    );
  }, 120000);

  afterAll(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

  test('exits with a code distinct from both clean and findings', () => {
    expect(execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      encoding: 'utf8', cwd: clone,
    }).trim()).toBe('true');

    // The CLONE's copy of the script, not this tree's. `repoRoot()` and `isShallow()` anchor
    // on `__dirname` so the linter always reports on the repository it lives in — running
    // this tree's script with cwd set into the clone would read this tree's full history and
    // pass for the wrong reason.
    const cli = path.join(clone, 'modus', 'scripts', 'lint-slice-headers.js');
    const r = cp.spawnSync(process.execPath, [cli], { cwd: clone, encoding: 'utf8' });
    expect(r.status).toBe(EXIT_UNVERIFIABLE);
    expect(r.status).not.toBe(0);
    // The distinction that matters: it must not claim the source is missing.
    expect(r.stderr).toMatch(/PROVENANCE NOT VERIFIED/);
    expect(r.stderr).toMatch(/shallow clone/);
    expect(r.stderr).not.toMatch(/is genuinely missing/);
    // And it must not print a coverage line, which would read as a completed check.
    expect(r.stdout).not.toMatch(/source lines claimed/);
  }, 60000);
});
