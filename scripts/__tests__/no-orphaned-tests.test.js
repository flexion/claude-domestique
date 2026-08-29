'use strict';

/**
 * Every test file in this repository must be reachable by the root `npm test` chain.
 *
 * The chain is a hand-maintained list: two named suites under `scripts/__tests__/`, then one
 * `test:<workspace>` script per workspace. Nothing enumerates test files, so a suite in a
 * directory that is not a workspace — or in a workspace with no `test:` entry — simply never
 * runs, and the chain still reports every test it did run as passing.
 *
 * That happened. Extracting `context-emendator/` into `modus/` left stale copies of a script
 * and its suite behind at the old path. They were committed, merged, and broken (4 of their 5
 * tests failed), and CI stayed green through all of it, because the chain never looks there.
 *
 * This is the same defect class the modus README names: an oracle that cannot tell "I checked
 * and it is fine" from "I could not check". A green chain that silently skipped a suite is a
 * false green, so the reachability of the suites is itself asserted here rather than assumed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', 'coverage', '.git']);

function testFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      testFiles(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.test.js')) {
      out.push(path.relative(ROOT, path.join(dir, entry.name)));
    }
  }
  return out;
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Workspaces the root chain actually invokes, not merely those declared. A workspace listed in
// `workspaces` but absent from the `test` script is exactly the gap being guarded against.
const invoked = new Set(
  (pkg.workspaces || []).filter((w) => {
    const script = pkg.scripts[`test:${w}`];
    return script && pkg.scripts.test.includes(`npm run test:${w}`);
  }),
);

// The two suites the chain names directly, parsed out of the script rather than restated.
const named = new Set(
  (pkg.scripts['test:scripts'].match(/scripts\/__tests__\/[\w.-]+\.test\.js/g) || []),
);

const reachable = (file) => {
  if (named.has(file)) return true;
  const top = file.split(path.sep)[0];
  return invoked.has(top);
};

describe('no orphaned test files', () => {
  test('every test file is reachable by the root npm test chain', () => {
    const orphans = testFiles(ROOT).filter((f) => !reachable(f));
    expect(orphans).toEqual([]);
  });

  test('the guard can actually fail', () => {
    // A reachability check that cannot report unreachable is the thing it is guarding against.
    expect(reachable(path.join('some-removed-plugin', '__tests__', 'x.test.js'))).toBe(false);
    expect(reachable(path.join('modus', 'scripts', '__tests__', 'lint-boundary.test.js'))).toBe(true);
    expect(reachable(path.join('scripts', '__tests__', 'validate-plugins.test.js'))).toBe(true);
  });
});
